/**
 * 文学分析链相关类型。
 */
import { z } from 'zod';

import { LITERARY_REPLY_SCHEMA } from './schema.js';

/** 文学分析入参：用户原问题（含文档 URL/路径时可直接分析） */
export interface LiteraryInput {
  /** 用户问题，例如「分析这篇小说 https://example.com/gatsby.txt」 */
  content: string;
}

/** 文学分析结构化回复 */
export type LiteraryReply = z.infer<typeof LITERARY_REPLY_SCHEMA>;
