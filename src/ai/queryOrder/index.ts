/**
 * 订单查询：按用户问题中的订单号调用 query_order，返回结构化状态与 Markdown。
 *
 * 对外：export runQueryOrder、queryOrder、ORDER_SYSTEM_PROMPT、QUERY_ORDER_REPLY_SCHEMA。
 * 约束：当前为演示占位实现，工具返回固定文案；实际项目中替换成订单数据库查询。
 * 说明：主模型 Gemini，单次失败再换 DeepSeek；缺订单号时走 clarify 追问。
 */
import type { BaseMessage } from '@langchain/core/messages';
import type { AgentResult } from '../types.js';
import type { QueryOrderInput } from './types.js';

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
import { QUERY_ORDER_REPLY_SCHEMA } from './schema.js';

export type { QueryOrderInput, QueryOrderReply } from './types.js';
export { QUERY_ORDER_REPLY_SCHEMA } from './schema.js';

/** invoke 原始返回值：上层经 toAgentResult 整理 */
interface OrderAgentInvokeResult {
  structuredResponse?: unknown;
  messages?: BaseMessage[];
}

// ====== 常量 / 配置 ======

/** 订单接口主模型；单次调用失败后再换 FALLBACK_LLM_NAME */
const PRIMARY_LLM_NAME = 'gemini-3-flash-preview';

/** Gemini 单次调用失败后的备用模型 */
const FALLBACK_LLM_NAME = 'deepseek-flash';

/** 本接口 checkpointer 线程，与文学接口分开，避免串状态 */
const ORDER_THREAD_ID = 'query-order';

/**
 * 订单查询 createAgent 的 system prompt。
 * 只描述这一支：按订单号查询，再填 order；缺订单号时改走 clarify。
 */
export const ORDER_SYSTEM_PROMPT = `你负责订单查询。调用 query_order 查询用户给出的订单，然后用 order 结构化回复作答。

- 用户提到订单号、物流、发货、订单状态时使用 query_order。
- order 含 orderId、status、markdown。
- markdown 必须写面向用户的 Markdown 正文（可含标题、列表），说明订单号与状态，内容与结构化字段一致；不要把 JSON 原文塞进 markdown。
- 缺少订单号时改用 clarify，question 向用户追问，不要臆造订单号。
- 最终不要用自由散文代替结构化回复。
- 不要输出工具调用流水或过程报告。`;

// ====== 工具执行 ======

/**
 * 根据订单编号查询订单状态；用户询问订单进度时由 Agent 调用。
 */
export const queryOrder = tool(
  async ({ orderId }: { orderId: string }): Promise<string> => {
    console.log('[ai] query_order 开始', { orderId });
    // 实际项目中替换成订单数据库查询
    const result = `订单 ${orderId} 的状态：已发货`;
    console.log('[ai] query_order 完成', { orderId, result });
    return result;
  },
  {
    name: 'query_order',
    description:
      '根据订单编号查询订单状态（发货/物流等）。仅在用户给出订单号或询问订单进度时使用；没有订单号时不要调用。',
    schema: z.object({
      orderId: z.string().describe('订单编号'),
    }),
  },
);

// ====== 分支执行 ======

/**
 * 跑订单查询 Agent：只挂 query_order，Gemini 优先，失败后同一轮改走 DeepSeek。
 * 每次运行新建 MemorySaver，不把上一问的工具过程留到下一次。
 * @param content 用户原问题
 * @returns createAgent 的 invoke 结果
 */
async function invokeAgent(content: string): Promise<OrderAgentInvokeResult> {
  console.log('[ai] queryOrder.invokeAgent 开始', {
    contentLength: content.length,
    primary: PRIMARY_LLM_NAME,
    fallback: FALLBACK_LLM_NAME,
  });
  const primaryModel = await createLlm(PRIMARY_LLM_NAME);
  const fallbackModel = await createLlm(FALLBACK_LLM_NAME);
  const agent = createAgent({
    model: primaryModel,
    tools: [queryOrder],
    systemPrompt: ORDER_SYSTEM_PROMPT,
    responseFormat: toolStrategy([
      QUERY_ORDER_REPLY_SCHEMA,
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
        thread_id: ORDER_THREAD_ID,
      },
    },
  );
  console.log('[ai] queryOrder.invokeAgent 完成', {
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
 * 查询订单：根据用户问题中的订单号返回状态与 Markdown。
 * @param input content 为用户原问题
 */
export async function runQueryOrder(
  input: QueryOrderInput,
): Promise<AgentResult> {
  console.log('[ai] runQueryOrder 开始', {
    contentLength: input.content.length,
  });
  const agentResult = await invokeAgent(input.content);
  const result = toAgentResult(agentResult);
  console.log('[ai] runQueryOrder 完成', {
    kind: result.structuredResponse?.kind ?? null,
    outputLength: result.agentOutput.length,
  });
  return result;
}
