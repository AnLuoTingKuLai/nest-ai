/**
 * AI HTTP 接口：翻译、查询订单、文学分析。
 */
import { Body, Controller, Post } from '@nestjs/common';

import { AiService } from './ai.service.js';

// ====== 类型定义 ======

/** POST /ai/translate 请求体 */
interface TranslateBody {
  language: string;
  text: string;
}

/** POST /ai/query-order 请求体 */
interface QueryOrderBody {
  content: string;
}

/** POST /ai/literary-analysis 请求体 */
interface LiteraryAnalysisBody {
  content: string;
}

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * 翻译：返回初译与润色两份正文。
   */
  @Post('translate')
  translate(@Body() body: TranslateBody) {
    debugger
    return this.aiService.translate({
      language: body.language,
      text: body.text,
    });
  }

  /**
   * 查询订单：返回结构化回复与可展示文本。
   */
  @Post('query-order')
  queryOrder(@Body() body: QueryOrderBody) {
    return this.aiService.queryOrder({
      content: body.content,
    });
  }

  /**
   * 文学分析：按提示词跑文学/文档分析，返回结构化回复与可展示文本。
   */
  @Post('literary-analysis')
  literaryAnalysis(@Body() body: LiteraryAnalysisBody) {
    return this.aiService.literaryAnalysis({
      content: body.content,
    });
  }
}
