/**
 * 缺参追问的最终回复 schema（无业务执行函数）。
 *
 * 对外：export CLARIFY_REPLY_SCHEMA、ClarifyReply。
 * 说明：订单 / 文学 Agent 发现订单号或 URL 仍缺失时，经 toolStrategy 选用。
 */
import { z } from 'zod';

// ====== 最终回复 Schema ======

/**
 * 缺必要参数时的追问形状；不要臆造订单号或 URL。
 */
export const CLARIFY_REPLY_SCHEMA = z
  .object({
    // z.enum 生成 enum；z.literal 会生成 const，Gemini 函数声明不认 const
    kind: z.enum(['clarify']).describe('固定为 clarify，表示需要用户补充信息'),
    question: z.string().describe('向用户追问的简短问题'),
  })
  .describe(
    '缺必要参数时的追问。文学任务缺文档 URL/路径，或订单任务缺订单号时使用；question 向用户追问，不要臆造订单号或 URL。',
  );

export type ClarifyReply = z.infer<typeof CLARIFY_REPLY_SCHEMA>;
