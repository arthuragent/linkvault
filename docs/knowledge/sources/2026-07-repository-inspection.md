---
type: Source
title: Linkvault Repository Inspection — 2026-07-01
description: Initial source notes from inspecting repository metadata, README/package files, and top-level structure for linkvault.
source_type: repository_inspection
status: processed
tags: [linkvault, project, nextjs, source, repository-inspection]
timestamp: 2026-07-01
---

# Inspected files/directories

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

# Extracted durable knowledge

- Repo path is `/home/hermes/projects/linkvault`.
- Branch/status at setup: `## main...origin/main`.
- Repository description from inspected files: Personal link saver. One-click capture, colorful nested categories, optional AI summaries.
- Initial stack signals: Next.js, React, Drizzle ORM, Neon Postgres, Auth.js / NextAuth, Tailwind CSS.
- Available package scripts: dev, build, start, lint, db:generate, db:push, db:studio.

# Caveat

This source note is based on repository inspection only. It does not prove production deployment, runtime credentials, database state, or external provider behavior.
