/**
 * 订单查询最终结构化回复 schema。
 *
 * 对外：export QUERY_ORDER_REPLY_SCHEMA。
 * 说明：模型在调用 query_order 后，用 toolStrategy 填此形状。
 */
import { z } from 'zod';

/**
 * 本工具对应的最终结构化回复。
 * 模型在调用 query_order 后，用 toolStrategy 填此形状。
 */
export const QUERY_ORDER_REPLY_SCHEMA = z
  .object({
    // z.enum 生成 enum；z.literal 会生成 const，Gemini 函数声明不认 const
    kind: z.enum(['order']).describe('固定为 order，表示订单查询结果'),
    orderId: z.string().describe('订单编号'),
    status: z.string().describe('订单状态文案，如已发货'),
    // 面向用户展示的 Markdown；与上方结构化字段并存，页面优先渲染此字段
    markdown: z
      .string()
      .describe(
        '面向用户的 Markdown 正文：说明订单号与状态，可用简短段落或列表，勿塞原始 JSON',
      ),
  })
  .describe('订单查询结果。仅在调用了 query_order 后使用。');
