/**
 * Nest 侧 AI 业务封装：转发 translate / queryOrder / literary 三项能力。
 */
import { Injectable } from '@nestjs/common';

import { streamTranslate } from './translate/index.js';
import { runQueryOrder } from './queryOrder/index.js';
import { runLiteraryAnalysis } from './literary/index.js';
import type { TranslateInput, TranslateResult } from './translate/types.js';
import type { QueryOrderInput } from './queryOrder/types.js';
import type { LiteraryInput } from './literary/types.js';
import type { AgentResult } from './types.js';

@Injectable()
export class AiService {
  /**
   * 翻译：初译 + 长文润色。
   * @param input language 为目标语；text 为原文
   */
  translate(input: TranslateInput): Promise<TranslateResult> {
    return streamTranslate(input);
  }

  /**
   * 查询订单：按用户问题中的订单号查状态。
   * @param input content 为用户原问题
   */
  queryOrder(input: QueryOrderInput): Promise<AgentResult> {
    return runQueryOrder(input);
  }

  /**
   * 文学分析：按用户问题中的 URL/路径拉文本并统计摘要。
   * @param input content 为用户原问题
   */
  literaryAnalysis(input: LiteraryInput): Promise<AgentResult> {
    return runLiteraryAnalysis(input);
  }
}
