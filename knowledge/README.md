# Knowledge Base

Maintain the same document `id` in all three language folders:

- `knowledge/zh/*.md`
- `knowledge/ja/*.md`
- `knowledge/en/*.md`

Each document needs frontmatter:

```yaml
---
id: esports-cafe-faq
title: 电竞馆常见问题
tags: [faq, support, equipment, games, cafe]
store: all
updated_at: 2026-05-27
---
```

Rules:

- Keep one topic per file.
- Use the same `id` across Chinese, Japanese, and English files.
- The bot answers only from the detected language folder.
- If a translation is missing, the bot warns on startup and will not auto-translate.
- Restart the bot after editing knowledge files.
