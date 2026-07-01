---
type: Project
title: Linkvault
description: Personal link saver. One-click capture, colorful nested categories, optional AI summaries.
status: active
tags: [linkvault, project, nextjs]
resource: /home/hermes/projects/linkvault
last_verified: 2026-07-01
source:
  - /docs/knowledge/sources/2026-07-repository-inspection.md
related:
  - /docs/knowledge/runbooks/repository-operations.md
  - /docs/knowledge/decisions/2026-07-project-local-kb-pilot.md
---

# Current Truth

`linkvault` is an active project repository under `/home/hermes/projects`.

Repository-inspected description:

> Personal link saver. One-click capture, colorful nested categories, optional AI summaries.

# Initial stack signals

- Next.js
- React
- Drizzle ORM
- Neon Postgres
- Auth.js / NextAuth
- Tailwind CSS

# Current branch/status at KB setup

```text
## main...origin/main
```

# Key files/directories observed

- `README.md`
- `package.json`
- `AGENTS.md`
- `CLAUDE.md`
- `next.config.ts`
- `drizzle.config.ts`
- `app`
- `lib`
- `scripts`
- `docs`
- `auth.config.ts`
- `auth.ts`
- `middleware.ts`
- `next-env.d.ts`

# Verification commands

For KB-only changes:

```bash
python3 /home/hermes/projects/zloto-knowledge-base/scripts/validate_okf.py docs/knowledge
```

For code/product changes, start from the repo's available scripts:

```bash
npm run lint
npm run build
```

# Caveat

This is an initial project-local KB based on repository inspection. It is not live production verification. Current deploy state, credentials, databases, analytics, or external provider state must be checked from the source system when operationally relevant.
