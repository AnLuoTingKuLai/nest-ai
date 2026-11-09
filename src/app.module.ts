/**
 * 应用根模块：挂载观测，并自动加载 modules 下的功能模块。
 *
 * 约定：modules/<name>/<name>.module.js 导出 <Name>Module。
 * 例如 modules/ai/ai.module.js 导出 AiModule；新增模块不用再改本文件的 import。
 */
import { readdir } from 'node:fs/promises';

import { Module, type Type } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

// ====== 模块自动加载 ======

/**
 * 目录名转 Nest 模块类名。
 * ai → AiModule；query-order → QueryOrderModule。
 * @param folderName modules 下的目录名
 */
function toModuleClassName(folderName: string): string {
  const pascalName = folderName
    .split(/[-_]/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return `${pascalName}Module`;
}

/**
 * 扫描 modules 子目录，动态导入 <name>.module.js 并取出 <Name>Module。
 * 编译后路径相对 dist/app.module.js，因此这里写 .js 后缀。
 */
async function loadFeatureModules(): Promise<Array<Type>> {
  const entries = await readdir(new URL('./modules/', import.meta.url), {
    withFileTypes: true,
  });
  // 固定顺序，避免目录读取顺序变化导致模块注册顺序抖动
  const folderNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const featureModules: Array<Type> = [];

  for (const folderName of folderNames) {
    const imported = (await import(
      `./modules/${folderName}/${folderName}.module.js`
    )) as Record<string, Type | undefined>;
    const className = toModuleClassName(folderName);
    const featureModule = imported[className];

    if (!featureModule) {
      throw new Error(
        `modules/${folderName}/${folderName}.module.js 未导出 ${className}`,
      );
    }

    featureModules.push(featureModule);
  }

  return featureModules;
}

const featureModules = await loadFeatureModules();

// ====== 根模块 ======

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'nest-ai-demo',
    }),
    ...featureModules,
  ],
})
export class AppModule {}
