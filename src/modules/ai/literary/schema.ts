/**
 * 文学分析最终结构化回复 schema。
 *
 * 对外：export LITERARY_REPLY_SCHEMA。
 * 说明：模型在调用 fetch_text_from_url 并完成统计后，用 toolStrategy 填此形状。
 */
import { z } from 'zod';

/**
 * 本工具对应的最终结构化回复。
 * 模型在调用 fetch_text_from_url 并完成统计后，用 toolStrategy 填此形状。
 */
export const LITERARY_REPLY_SCHEMA = z
  .object({
    // z.enum 生成 enum；z.literal 会生成 const，Gemini 函数声明不认 const
    kind: z.enum(['literary']).describe('固定为 literary，表示文学分析结果'),
    gatsbyLineCount: z
      .number()
      .describe('包含子串 Gatsby 的行数（同行多次只计 1）'),
    // nullable 会生成 type 数组，Gemini 的 type 只能是单个类型；未找到时省略字段
    daisyFirstLine: z
      .number()
      .optional()
      .describe('第一个包含 Daisy 的行号（从 1 起）；未找到则不要输出该字段'),
    summary: z.string().describe('两句中性语言概要'),
    // 面向用户展示的 Markdown；与上方结构化字段并存，页面优先渲染此字段
    markdown: z
      .string()
      .describe(
        '面向用户的 Markdown 正文：含行数、行号与概要，可用标题/列表，勿塞原始 JSON',
      ),
  })
  .describe(
    '文学/文档分析结果。仅在调用了 fetch_text_from_url 并完成统计后使用。',
  );
