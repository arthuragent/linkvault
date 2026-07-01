---
type: Decision
title: Add Linkvault as Project-Local KB Pilot
description: linkvault is added to the project-local knowledge base rollout under the Zloto OKF architecture.
status: accepted
date: 2026-07-01
tags: [linkvault, project, nextjs, knowledge-base, okf, pilot]
source:
  - /docs/knowledge/sources/2026-07-repository-inspection.md
---

# Decision

`linkvault` has a project-local KB under `docs/knowledge/`.

# Rationale

The repo is part of the Zloto project workspace. Durable project facts, boundaries, key files, and operational checks should be discoverable by Arthur before project work begins.

# Consequences

- Project-local durable knowledge lives under `docs/knowledge/`.
- Global cross-project discovery lives in `/home/hermes/projects/zloto-knowledge-base`.
- Arthur should use `project_context.py linkvault` before work on this repo.
