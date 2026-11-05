/**
 * 文学分析：按用户问题中的 URL/路径拉取文本，统计并摘要，返回结构化结果与 Markdown。
 *
 * 对外：export runLiteraryAnalysis、fetchTextFromUrl、LITERARY_SYSTEM_PROMPT、LITERARY_REPLY_SCHEMA。
 * 约束：拉文本失败时返回错误串（不抛错），交给模型自行说明限制。
 * 说明：主模型 Gemini，单次失败再换 DeepSeek；缺 URL/路径时走 clarify 追问。
 */
import type { BaseMessage } from '@langchain/core/messages';
import type { AgentResult } from '../types.js';
import type { LiteraryInput } from './types.js';

import { z } from 'zod';
import { MemorySaver } from '@langchain/langgraph';
import {
  createAgent,
  modelFallbackMiddleware,
  tool,
  toolStrategy,
} from 'langchain';

import { createLlm } from '../main.js';
import { toAgentResult } from '../shared/agentResult.js';
import { CLARIFY_REPLY_SCHEMA } from '../shared/clarifyReply.js';
import { LITERARY_REPLY_SCHEMA } from './schema.js';

export type { LiteraryInput, LiteraryReply } from './types.js';
export { LITERARY_REPLY_SCHEMA } from './schema.js';

/** invoke 原始返回值：上层经 toAgentResult 整理 */
interface LiteraryAgentInvokeResult {
  structuredResponse?: unknown;
  messages?: BaseMessage[];
}

// ====== 常量 / 配置 ======

/** fetch 超时（毫秒）；大文本或慢网时避免一直挂起 */
const FETCH_TIMEOUT_MS = 120_000;

/** 文学接口主模型；单次调用失败后再换 FALLBACK_LLM_NAME */
const PRIMARY_LLM_NAME = 'gemini-3-flash-preview';

/** Gemini 单次调用失败后的备用模型 */
const FALLBACK_LLM_NAME = 'deepseek-flash';

/** 本接口 checkpointer 线程，与订单接口分开，避免串状态 */
const LITERARY_THREAD_ID = 'literary-analysis';

/**
 * 文学分析 createAgent 的 system prompt（提示词）。
 * 只描述这一支：拉用户给出的那一个文本，再填 literary；缺路径时改走 clarify。
 */
export const LITERARY_SYSTEM_PROMPT = `你负责文学/文档分析。调用 fetch_text_from_url 取用户给出的文本，然后用 literary 结构化回复作答。

- 只对用户给出的那一个 URL/路径调用一次工具；不要探测其它路径。
- 工具返回的全文即为完整语料：按换行切分后统计，直接给出数字。
- 找不到目标子串时不要输出 daisyFirstLine。
- 禁止臆造未在工具结果中出现的行数或行号。
- literary 含 gatsbyLineCount、daisyFirstLine、summary、markdown。
- markdown 必须写面向用户的 Markdown 正文（可含标题、列表），内容与结构化字段一致；不要把 JSON 原文塞进 markdown。
- 缺少文档 URL 或路径时改用 clarify，question 向用户追问，不要臆造路径。
- 最终不要用自由散文代替结构化回复。
- 不要输出工具调用流水或过程报告。`;

// ====== 工具执行 ======

/**
 * 把相对路径收成可 fetch 的绝对 URL。
 * 相对路径（如 /great-gatsby-excerpt.txt）默认指向本服务 public 静态资源。
 * @param url 用户或模型给出的路径/URL
 */
function resolveFetchUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const port = process.env.PORT ?? '3333';
  const base = process.env.PUBLIC_BASE_URL ?? `http://127.0.0.1:${port}`;
  return new URL(trimmed, base).toString();
}

/**
 * 按路径/URL 拉取纯文本；失败时返回错误串，交给模型自行说明限制。
 * 相对路径会解析到本服务静态目录（public/）。
 */
export const fetchTextFromUrl = tool(
  async ({ url }: { url: string }): Promise<string> => {
    const resolvedUrl = resolveFetchUrl(url);
    console.log('[ai] fetch_text_from_url 开始', { url, resolvedUrl });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const resp = await fetch(resolvedUrl, {
        signal: controller.signal,
      });

      if (!resp.ok) {
        const failed = `Fetch failed: HTTP ${resp.status} ${resp.statusText}`;
        console.log('[ai] fetch_text_from_url 完成', {
          url,
          resolvedUrl,
          failed,
        });
        return failed;
      }

      const text = await resp.text();
      console.log('[ai] fetch_text_from_url 完成', {
        url,
        resolvedUrl,
        textLength: text.length,
      });
      return text;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const failed = `Fetch failed: ${msg}`;
      console.log('[ai] fetch_text_from_url 完成', {
        url,
        resolvedUrl,
        failed,
      });
      return failed;
    } finally {
      clearTimeout(timeoutId);
    }
  },
  {
    name: 'fetch_text_from_url',
    description:
      '从路径或 URL 拉取文档纯文本，供文学/文档统计、摘要、按行检索。相对路径（如 /great-gatsby-excerpt.txt）由本服务 public 提供。只对用户给出的那一个 URL/路径调用一次，不要探测其它路径；用户未给出路径时不要调用。',
    schema: z.object({ url: z.string().min(1) }),
  },
);

// ====== 分支执行 ======

/**
 * 跑文学分析 Agent：只挂 fetch_text_from_url，Gemini 优先，失败后同一轮改走 DeepSeek。
 * 每次运行新建 MemorySaver，不把上一问的工具过程留到下一次。
 * @param content 用户原问题
 * @returns createAgent 的 invoke 结果
 */
async function invokeAgent(
  content: string,
): Promise<LiteraryAgentInvokeResult> {
  console.log('[ai] literary.invokeAgent 开始', {
    contentLength: content.length,
    primary: PRIMARY_LLM_NAME,
    fallback: FALLBACK_LLM_NAME,
  });
  const primaryModel = await createLlm(PRIMARY_LLM_NAME);
  const fallbackModel = await createLlm(FALLBACK_LLM_NAME);
  const agent = createAgent({
    model: primaryModel,
    tools: [fetchTextFromUrl],
    systemPrompt: LITERARY_SYSTEM_PROMPT,
    responseFormat: toolStrategy([
      LITERARY_REPLY_SCHEMA,
      CLARIFY_REPLY_SCHEMA,
    ]),
    middleware: [modelFallbackMiddleware(fallbackModel)],
    checkpointer: new MemorySaver(),
  });

  const agentResult = await agent.invoke(
    { messages: [{ role: 'user', content }] },
    {
      configurable: {
        // LangGraph checkpointer 约定字段名为 thread_id
        // eslint-disable-next-line camelcase -- LangGraph API 固定字段
        thread_id: LITERARY_THREAD_ID,
      },
    },
  );
  console.log('[ai] literary.invokeAgent 完成', {
    messageCount: agentResult.messages?.length ?? 0,
    kind:
      agentResult.structuredResponse &&
      typeof agentResult.structuredResponse === 'object'
        ? ((agentResult.structuredResponse as { kind?: string }).kind ?? null)
        : null,
  });
  return agentResult;
}

// ====== 对外接口 ======

/**
 * 文学分析：根据用户问题中的文档 URL/路径做统计与摘要。
 * @param input content 为用户原问题
 */
export async function runLiteraryAnalysis(
  input: LiteraryInput,
): Promise<AgentResult> {
  console.log('[ai] runLiteraryAnalysis 开始', {
    contentLength: input.content.length,
  });
  const agentResult = await invokeAgent(input.content);
  const result = toAgentResult(agentResult);
  console.log('[ai] runLiteraryAnalysis 完成', {
    kind: result.structuredResponse?.kind ?? null,
    outputLength: result.agentOutput.length,
  });
  return result;
}
