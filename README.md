# nest-ai-demo

NestJS + LangChain / LangGraph 后端演示项目，为前端翻译助手（`my-langchain-app`）提供 AI HTTP 接口与静态资源。

默认监听端口：`3333`（可用环境变量 `PORT` 覆盖）。

## 功能概览

| 接口 | 说明 | 模型策略 |
|------|------|----------|
| `POST /ai/translate` | 初译 + 长文润色，返回两份译文 | 固定本地 Ollama |
| `POST /ai/query-order` | 按订单号查询状态（演示占位），结构化回复 | 主 Gemini，失败回退 DeepSeek |
| `POST /ai/literary-analysis` | 拉取 URL/路径文本并做文学/文档分析 | 主 Gemini，失败回退 DeepSeek |

静态资源：`public/` 目录通过 Nest 静态托管，例如文学分析示例文本：

```text
GET /great-gatsby-excerpt.txt
```

## 技术栈

- NestJS 12（ESM）
- LangChain / LangGraph
- 模型：Ollama（本地）、DeepSeek、Google Gemini
- Zod（结构化输出校验）
- Vitest + Oxlint

## 目录结构

```text
src/
  main.ts                 # 启动入口：CORS、静态资源、端口
  load-env.ts             # 加载 .env.develop / .env
  app.module.ts           # 根模块（含 Observe）
  ai/
    ai.controller.ts      # HTTP 路由
    ai.service.ts         # 业务转发
    main.ts               # createLlm 多模型启动器
    translate/            # 翻译 LangGraph（初译 → 长文润色）
    queryOrder/           # 订单查询 Agent + tool
    literary/             # 文学分析 Agent + fetch 工具
    shared/               # Agent 结果整理、clarify 追问
public/                   # 静态文本资源
```

## 环境变量

1. 复制示例配置：

```bash
cp .env.example .env.develop
```

2. 在 `.env.develop` 中填写本机凭证（该文件不提交）。可提交的模板见 `.env.example`。

| 变量 | 说明 |
|------|------|
| `DEFAULT_MODEL` | `createLlm()` 未传模型名时的默认映射名（如 `ollama`） |
| `OLLAMA_BASE_URL` | 本地 Ollama 地址，默认 `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama 模型名（示例配置） |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` | DeepSeek 云端 |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Google Gemini |
| `PORT` | HTTP 端口，默认 `3333` |
| `PUBLIC_BASE_URL` | 相对路径拉文本时的基址（文学分析）；默认 `http://127.0.0.1:$PORT` |

加载顺序：先 `.env.develop`，再 `.env`（已存在的变量不会被覆盖，develop 优先）。

本地翻译依赖 Ollama，需先启动并拉取对应模型（如 `deepseek-r1:8b`）。

## 安装与启动

```bash
yarn install

# 开发（监听）
yarn start:dev

# 调试（watch + debug）
yarn start:debug

# 生产
yarn build
yarn start:prod
```

## API

### 翻译

```http
POST /ai/translate
Content-Type: application/json

{
  "language": "中文",
  "text": "Hello, world."
}
```

响应：

```json
{
  "translation": "……",
  "polished": "……"
}
```

原文超过长度阈值时会走润色节点；短文 `polished` 可能为空串。

### 查询订单

```http
POST /ai/query-order
Content-Type: application/json

{
  "content": "帮我查一下订单 ORD-12345 的物流"
}
```

响应：`{ structuredResponse, agentOutput }`。缺订单号时 `structuredResponse.kind` 为 `clarify`。

> 当前 `query_order` 工具为演示占位，固定返回「已发货」文案，接入真实订单库时替换工具实现即可。

### 文学分析

```http
POST /ai/literary-analysis
Content-Type: application/json

{
  "content": "请分析 /great-gatsby-excerpt.txt"
}
```

相对路径会解析到本服务 `public` 静态资源；也可传完整 `http(s)` URL。

## 常用脚本

| 命令 | 说明 |
|------|------|
| `yarn start:dev` | 开发监听 |
| `yarn start:debug` | 调试模式 |
| `yarn lint` | Oxlint |
| `yarn test` | 单元测试 |
| `yarn test:e2e` | E2E |
| `yarn test:cov` | 覆盖率 |

## 与前端协作

本服务默认开启 CORS，供 Vite 前端（如 `http://localhost:5173`）跨域调用。前端项目见同级目录 `my-langchain-app`。

## License

UNLICENSED（私有演示项目）
