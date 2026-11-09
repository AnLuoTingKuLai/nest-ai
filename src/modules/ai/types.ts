/**
 * ai 模块跨业务链公共类型。
 * Agent 结果形态（订单 / 文学 / 追问）与流式可选配置放这里；
 * 各链专属入参出参仍放对应子目录的 types.ts。
 */
import type { ClarifyReply } from './shared/clarifyReply.js';
import type { LiteraryReply } from './literary/types.js';
import type { QueryOrderReply } from './queryOrder/types.js';

/** 流式调用通用可选配置（各链可按需扩展） */
export interface StreamCallConfig {
  /** 取消信号 */
  signal?: AbortSignal;
}

/** Agent 最终结构化回复（订单 / 文学 / 缺参追问三选一） */
export type AgentStructuredResponse =
  | LiteraryReply
  | QueryOrderReply
  | ClarifyReply;

/** createAgent 运行结果：结构化回复 + 可展示文本 */
export interface AgentResult {
  /** toolStrategy 校验后的结构化对象；未产出时为 null */
  structuredResponse: AgentStructuredResponse | null;
  /** 便于直接展示的文本（literary/order 优先用 markdown 字段） */
  agentOutput: string;
}
