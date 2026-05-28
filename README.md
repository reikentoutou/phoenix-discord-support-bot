# PHOENIX Discord Support Bot

PHOENIX Esports Cafe 的三语 Discord 自动客服 Bot。

Bot 在公开频道提供中文、日本語、English 三个咨询入口，为每位客人创建独立 private thread，并根据 Markdown 知识库用用户选择的语言回答常见问题。知识库外的问题不会编造答案，只会提示“不清楚，是否转人工”。用户点击转人工后，Bot 会通知员工频道，并让 Staff 成员接手对应 thread。

## Features

- 公开入口按钮：`/setup-entry` 发布中文、日本語、English 三个入口按钮。
- 入服欢迎卡片：新用户加入服务器时，在配置的 welcome 频道发送 Discord embed 小卡片。
- 独立 ticket：每位用户一个 private thread，避免多人对话混在同一频道。
- 三语回答：用户开始咨询时选择语言，后续只使用对应语言知识库。
- 知识库限定：只回答 `knowledge/` 中已有内容，不确定时询问是否转人工。
- 人工接手：用户点击「转人工」后，员工频道收到摘要和「接手」按钮。
- 知识库热重载：管理员可用 `/reload-kb` 重新加载 Markdown。
- 自动关闭：长时间无响应的 ticket 会自动关闭并归档。
- 安全限制：禁用 Bot 输出 `@everyone`、限制输入/输出长度、限制每小时 AI 回复次数，并防止重复创建 ticket。
- 状态管理：SQLite 保存 ticket、消息记录、AI/人工/关闭状态。
- 本地部署：适合店内电脑 24 小时运行，也可迁移到 VPS 或云服务。

## Requirements

- Node.js 22+
- npm 10+
- Discord Bot Token
- DeepSeek API Key，或其他 OpenAI-compatible Chat API Key
- Discord Developer Portal 开启 `MESSAGE CONTENT INTENT`
- Discord Developer Portal 开启 `SERVER MEMBERS INTENT`，用于监听新成员加入并发送欢迎卡片

Bot 邀请时需要的权限：

- View Channels
- Send Messages
- Create Private Threads
- Send Messages in Threads
- Manage Threads
- Read Message History
- Use Slash Commands
- Embed Links

如果关闭 ticket 时无法归档 thread，再给 Bot 补充 `Manage Channels`。

## Setup

```bash
npm install
cp .env.example .env
```

填写 `.env`。不要把 `.env` 上传到 GitHub。

```bash
DISCORD_TOKEN=replace-me
DISCORD_CLIENT_ID=replace-me
DISCORD_GUILD_ID=replace-me
DISCORD_ENTRY_CHANNEL_ID=replace-me
DISCORD_STAFF_CHANNEL_ID=replace-me
DISCORD_STAFF_ROLE_ID=replace-me
OPENAI_API_KEY=replace-me
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-v4-flash
SQLITE_PATH=./data/bot.sqlite
KNOWLEDGE_DIR=./knowledge
```

注册 Discord slash commands。

```bash
npm run register-commands
```

构建并运行。

```bash
npm run build
npm start
```

开发模式：

```bash
npm run dev
```

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `DISCORD_TOKEN` | Yes | Discord Developer Portal 的 Bot token |
| `DISCORD_CLIENT_ID` | Yes | Discord application ID |
| `DISCORD_GUILD_ID` | Yes | Discord server ID |
| `DISCORD_ENTRY_CHANNEL_ID` | Yes | 公开咨询入口频道 ID |
| `DISCORD_STAFF_CHANNEL_ID` | Yes | 员工通知频道 ID |
| `DISCORD_STAFF_ROLE_ID` | Yes | 可接手 ticket 的 Staff 角色 ID |
| `WELCOME_CHANNEL_ID` | No | 入服欢迎卡片频道 ID；留空则不发送欢迎卡片 |
| `OPENAI_API_KEY` | Yes | DeepSeek 或 OpenAI-compatible API key |
| `OPENAI_BASE_URL` | Yes | DeepSeek 使用 `https://api.deepseek.com` |
| `OPENAI_MODEL` | Yes | 默认 `deepseek-v4-flash` |
| `SQLITE_PATH` | No | SQLite 文件路径，默认 `./data/bot.sqlite` |
| `KNOWLEDGE_DIR` | No | 知识库目录，默认 `./knowledge` |
| `MIN_RETRIEVAL_SCORE` | No | 本地检索最低分，默认 `0.25` |
| `MAX_CONTEXT_CHUNKS` | No | 每次传给 AI 的知识片段数量，默认 `4` |
| `TICKET_AUTO_CLOSE_HOURS` | No | ticket 无新消息自动关闭小时数，默认 `12`，设为 `0` 可关闭 |
| `TICKET_AUTO_CLOSE_CHECK_MINUTES` | No | 自动关闭检查间隔，默认 `10` |
| `USER_MESSAGE_COOLDOWN_SECONDS` | No | 用户在 AI 状态下连续提问冷却秒数，默认 `0` |
| `START_TICKET_COOLDOWN_SECONDS` | No | 用户连续点击入口按钮冷却秒数，默认 `5` |
| `MAX_USER_MESSAGE_CHARS` | No | 单条用户消息最大字符数，默认 `1000` |
| `MAX_AI_ANSWER_CHARS` | No | 单条 AI 回复最大字符数，默认 `1600` |
| `MAX_AI_ANSWERS_PER_USER_PER_HOUR` | No | 每个用户每小时最多 AI 回复数，默认 `30`，设为 `0` 可关闭 |

## Discord Flow

1. 管理员在公开咨询入口频道运行 `/setup-entry`。
2. 用户点击「中文」「日本語」或「English」。
3. Bot 创建 private thread，并把用户加入。
4. 用户在 thread 内正常发消息。
5. Bot 使用用户开始时选择的语言，只检索对应语言知识库。
6. 找不到可靠答案时，Bot 只提示“不清楚，是否转人工”。
7. 用户点击「转人工」后，Bot 通知员工频道。
8. Staff 角色成员点击「接手」进入 thread。
9. 用户或员工点击「已解决 / Close」关闭 ticket。

## Knowledge Base

知识库在 `knowledge/`。三语文件需要相同 `id`：

```text
knowledge/zh/esports-cafe-faq.md
knowledge/ja/esports-cafe-faq.md
knowledge/en/esports-cafe-faq.md
```

每个文件使用 frontmatter：

```yaml
---
id: esports-cafe-faq
title: 电竞馆常见问题
tags: [faq, support, equipment, games, cafe]
store: all
updated_at: 2026-05-27
---
```

维护规则：

- 同一个主题在三种语言中使用相同 `id`。
- Bot 检测到用户语言后，只读取对应语言目录。
- 如果某语言没有对应知识库，Bot 不会自动翻译其他语言内容。
- 更新知识库后重启 Bot，或执行 `/reload-kb`，让新 Markdown 生效。

## Commands

- `/setup-entry`：在当前频道发布公开咨询入口。
- `/ticket-status`：查看当前 ticket 状态。
- `/ticket-close`：关闭当前 ticket。
- `/reload-kb`：重新加载 Markdown 知识库，不需要重启 Bot。

## Welcome Card

如果配置了 `WELCOME_CHANNEL_ID`，Bot 会在新用户加入服务器时发送一张小卡片到该频道。这个功能依赖 Discord Developer Portal 的 `SERVER MEMBERS INTENT`。

欢迎频道里 Bot 需要这些权限：

- View Channel
- Send Messages
- Embed Links

## 店内电脑 pm2 运行

```bash
npm install -g pm2
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

`pm2 startup` 会输出一条需要复制执行的命令，用来配置开机自启。

## Checks And Tests

```bash
npm run check
```

`npm run check` 会执行 TypeScript build 和 Vitest 测试。

## Security

- 不要提交 `.env`、SQLite 数据库、日志文件或任何 API key。
- `.gitignore` 已排除 `.env`、`data/`、`dist/`、`node_modules/` 和数据库文件。
- 如果 Discord token 或 API key 曾经出现在聊天、截图或终端记录中，应立即去对应平台重置。
- GitHub 仓库建议保持 private，除非确认知识库内容可以公开。
- Bot 发送消息默认禁用普通 mention，避免被诱导 `@everyone` 或 `@here`。
- 用户输入、AI 输出和每小时 AI 回复次数都有上限，用来控制滥用和 API 费用。

## Troubleshooting

### Slash command 注册失败：`Missing Access`

通常是 `DISCORD_GUILD_ID` 填错，或邀请 Bot 时没有勾选 `applications.commands` scope。确认 Bot 实际加入的 server ID 后重新运行：

```bash
npm run register-commands
```

### 点击入口提示不是配置频道

确认 `.env` 里的 `DISCORD_ENTRY_CHANNEL_ID` 和实际发布入口按钮的频道 ID 一致，然后重启 Bot。

### 无法创建 private thread

确认 Bot 在入口频道拥有：

- Create Private Threads
- Manage Threads
- Send Messages in Threads
- Read Message History

### Bot 不回复 thread 里的普通消息

确认 Discord Developer Portal 的 Bot 页面已开启 `MESSAGE CONTENT INTENT`，并重启 Bot。
