import './load-env.js';

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule, ObserveInstrument } from './app.module.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  // 前端 Vite（如 :5173）跨域调用本服务
  app.enableCors();
  // 文学分析示例文本等静态资源：GET /great-gatsby-excerpt.txt
  app.useStaticAssets(join(__dirname, '..', 'public'));
  await app.listen(process.env.PORT ?? 3388);
}
await bootstrap();
