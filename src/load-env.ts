/**
 * 在业务模块加载前读入环境变量，保证 createLlm 能读到密钥与基址。
 * 先加载 .env.develop（本机凭证），再加载 .env 补齐未定义项。
 * Node loadEnvFile 不会覆盖已有 process.env，因此 develop 优先。
 */
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

if (existsSync('.env.develop')) {
  loadEnvFile('.env.develop');
}

if (existsSync('.env')) {
  loadEnvFile('.env');
}
