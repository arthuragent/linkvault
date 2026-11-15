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

## Captions-first YouTube transcription (2026-11-15)

- The existing transcription action first tries YouTube captions using `yt-dlp`.
- Original-language human captions are preferred, then original automatic captions;
  available human captions are a fallback. Auto-translated tracks are not selected.
- Caption text is saved in the same `transcript_text` field and exposed through the
  existing transcript page, TXT download and category export. This path does not
  download audio or start a MegaScribe job.
- Missing captions, blocked access, invalid responses or extraction failures fall
  back to the existing MegaScribe API. Metadata extraction is limited to 18 seconds,
  caption download to 5 seconds, and each payload to 4 MiB. The route budget is 60 seconds.
- Completed saved transcripts and active provider jobs are reused on repeated POSTs.
- `npm run build` installs the SHA-256-pinned standalone Linux `yt-dlp` binary;
  Next.js includes `vendor/yt-dlp` in the transcription function's deployment trace.
  It embeds Python. The build fails if downloading or verifying the binary fails.
- Local non-Linux development: use `npm run dev` and set `YT_DLP_PATH` to an installed
  executable. Production build targets Linux x64/arm64.
- To upgrade, update the version and platform checksums in `scripts/install-yt-dlp.mjs`
  from the official yt-dlp release. Do not commit the binary or credentials.
- Verification: `node --experimental-strip-types lib/youtube-captions.test.ts`,
  `node scripts/transcription-route.test.mjs`, and `npm run build`.
- Live probe from the development server encountered YouTube's bot challenge;
  successful live extraction is not established by fixture tests. The fallback
  remains necessary and a deployment can also encounter provider IP restrictions.
- Do not use session history as canonical truth if this KB or live source says otherwise.
