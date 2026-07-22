<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:git-commit-message -->
# Git Commit Message Format

When creating a git commit, use this message structure. Prefer **bilingual** (English first, then Chinese).

## Structure

1. **Summary** (1–2 sentences): Summarize the change based on the actual file diff — why this commit exists.
2. **Feature list**: Bullet list of added / adjusted / deleted items. Each item should be clear and concise, and include:
   - What changed
   - Background or motivation
   - Why it was adjusted or removed (when applicable)

## Template

```
<English summary grounded in the file changes.>

- Added: <what> — <background/why>
- Adjusted: <what> — <reason>
- Removed: <what> — <reason>

<基于本次文件变动的中文总结。>

- 新增：<内容> — <背景/原因>
- 调整：<内容> — <原因>
- 删除：<内容> — <原因>
```

## Example

```
Unify auth middleware error responses so API clients get consistent JSON errors.

- Adjusted: auth middleware — map unauthorized/forbidden to a shared error shape for frontend handling
- Removed: ad-hoc string error bodies in login routes — duplicated and inconsistent with other endpoints

统一鉴权中间件错误响应，让 API 客户端拿到一致的 JSON 错误。

- 调整：鉴权中间件 — 将未授权/禁止访问映射为统一错误结构，便于前端处理
- 删除：登录路由中的临时字符串错误体 — 与其他接口不一致且重复
```

## Rules

- Base the summary on staged/unstaged file changes, not on intent alone
- Keep list items short; put background and reasons in the same bullet
- Prefer bilingual when practical; English block above Chinese block
- Only commit when the user explicitly asks
<!-- END:git-commit-message -->
