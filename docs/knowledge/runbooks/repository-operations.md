---
type: Runbook
title: Linkvault Repository Operations
description: Baseline operating runbook for safe work in the linkvault repository.
status: active
tags: [linkvault, project, nextjs, operations]
last_verified: 2026-07-01
source:
  - /docs/knowledge/sources/2026-07-repository-inspection.md
---

# When to use

Use before making code, content, deployment, or configuration changes in `linkvault`.

# Intake checklist

```bash
git status --short --branch
git remote -v
git branch --show-current
```

If unrelated local changes exist, do not modify or revert them. Stage only intended paths.

# Known scripts from initial inspection

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:studio`

# Safe workflow

1. Read `docs/knowledge/index.md` and `docs/knowledge/overview.md`.
2. Inspect current source files directly before relying on this KB.
3. Make the smallest scoped change.
4. Run the relevant verification command(s).
5. Run `git diff --check`.
6. Commit and push according to Roi/Arthur operating rules.

# Do not do

- Do not store secrets, env values, tokens, API keys, cookies, or database URLs in this KB.
- Do not claim live production behavior from repository inspection alone.
- Do not use session history as canonical truth if this KB or live source says otherwise.
