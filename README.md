# nest-ai

NestJS + LangChain / LangGraph 后端：为前端翻译助手提供 AI HTTP 接口与静态资源。

默认端口：`3333`（可用 `PORT` 覆盖）。

## 技术栈

| 端 | 技术 |
|----|------|
| 前端 | Vue 3 + Vite + Arco Design Vue + Pinia + Axios + Less |
| 后端 | NestJS + LangChain + LangGraph |
| 本地 AI | Ollama + `deepseek-r1:8b` |

## 仓库

| 项目 | 地址 |
|------|------|
| 前端 | https://github.com/AnLuoTingKuLai/langchain-app |
| 服务端 | https://github.com/AnLuoTingKuLai/nest-ai |

## 接口

| 接口 | 说明 | 模型策略 |
|------|------|----------|
| `POST /ai/translate` | 初译 + 长文润色，返回两份译文 | 固定本地 Ollama |
| `POST /ai/query-order` | 按订单号查询状态（演示占位） | 主 Gemini，失败回退 DeepSeek |
| `POST /ai/literary-analysis` | 拉取 URL/路径文本并做文学/文档分析 | 主 Gemini，失败回退 DeepSeek |

静态资源示例：`GET /great-gatsby-excerpt.txt`（`public/`）。

## 启动

需本机 Ollama 已启动并拉取 `deepseek-r1:8b`。

```bash
cp .env.example .env.develop
yarn install
yarn start:dev
```

| 变量 | 说明 |
|------|------|
| `DEFAULT_MODEL` | 默认模型映射名（如 `ollama`） |
| `OLLAMA_BASE_URL` | 本地 Ollama 地址，默认 `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama 模型名 |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` | DeepSeek 云端 |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Google Gemini |
| `PORT` | HTTP 端口，默认 `3333` |
| `PUBLIC_BASE_URL` | 相对路径拉文本基址；默认 `http://127.0.0.1:$PORT` |

加载顺序：先 `.env.develop`，再 `.env`（develop 优先）。

默认开启 CORS，供 Vite 前端（`http://localhost:5173`）跨域调用。

## 常用脚本

```bash
yarn start:dev    # 开发监听
yarn start:debug  # 调试
yarn build && yarn start:prod  # 生产
yarn lint         # Oxlint
yarn test         # 单元测试
```
