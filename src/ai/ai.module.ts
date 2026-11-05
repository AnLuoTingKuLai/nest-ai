/**
 * AI 模块：注册翻译、查询订单、文学分析相关 Controller / Service。
 */
import { Module } from '@nestjs/common';

import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';

@Module({
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
