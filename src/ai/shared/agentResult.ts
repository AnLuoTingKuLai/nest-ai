/**
 * Agent 结果整理：把 createAgent 的 invoke 结果收成结构化回复 + 可展示文本。
 *
 * 对外：export toAgentResult、isAgentStructuredResponse。
 * 说明：订单与文学两个接口共用同一套展示规则。
 */
import type { BaseMessage } from '@langchain/core/messages';

import { AIMessage } from '@langchain/core/messages';

import type {
  AgentResult,
  AgentStructuredResponse,
} from '../types.js';

// ====== 消息 / 结果解析 ======

/**
 * 从消息中取出可展示正文。
 * DeepSeek 等模型的 contentBlocks 常含 reasoning + text；只展示 text，避免整段 JSON。
 */
function getMessageDisplayText(message: BaseMessage): string {
  const fromText = message.text?.trim();
  if (fromText) {
    return fromText;
  }

  if (typeof message.content === 'string') {
    return message.content;
  }

  return '';
}

/**
 * 取最后一条有正文的 AI 回复（跳过仅含 tool_calls 的中间轮）。
 * @param messages invoke 返回的 messages 数组
 */
function formatLastMessageContent(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!AIMessage.isInstance(message)) {
      continue;
    }

    const text = getMessageDisplayText(message);
    if (text) {
      return text;
    }
  }

  return '';
}

/**
 * 把结构化回复转成可展示文本。
 * literary / order 优先用模型填的 markdown；clarify 用 question；否则回退 JSON 代码块。
 * @param structuredResponse toolStrategy 产出的对象
 */
function formatStructuredResponse(
  structuredResponse: AgentStructuredResponse,
): string {
  if (
    structuredResponse.kind === 'literary' ||
    structuredResponse.kind === 'order'
  ) {
    const markdown = structuredResponse.markdown.trim();
    if (markdown) {
      return markdown;
    }
  }

  if (structuredResponse.kind === 'clarify') {
    return structuredResponse.question;
  }

  return `\`\`\`json\n${JSON.stringify(structuredResponse, null, 2)}\n\`\`\``;
}

/**
 * 判断对象是否为订单 / 文学 / 追问结构化回复（有 kind 判别字段）。
 */
export function isAgentStructuredResponse(
  value: unknown,
): value is AgentStructuredResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const kind = (value as { kind?: unknown }).kind;
  return kind === 'literary' || kind === 'order' || kind === 'clarify';
}

/**
 * 把分支 invoke 结果收成对外返回值。
 * 有结构化回复时优先用它生成展示文本；没有时退回最后一条 AI 正文。
 * @param agentResult createAgent 的 invoke 结果
 */
export function toAgentResult(agentResult: {
  structuredResponse?: unknown;
  messages?: BaseMessage[];
}): AgentResult {
  const rawStructured = agentResult.structuredResponse;
  const structuredResponse = isAgentStructuredResponse(rawStructured)
    ? rawStructured
    : null;

  const agentOutput = structuredResponse
    ? formatStructuredResponse(structuredResponse)
    : formatLastMessageContent(agentResult.messages ?? []);

  console.log('[ai] toAgentResult', {
    kind: structuredResponse?.kind ?? null,
    outputLength: agentOutput.length,
  });

  return {
    structuredResponse,
    agentOutput,
  };
}
