# Grabit

Checklist app: lists, templates, items. SvelteKit 3 (server-rendered) + Postgres.

## Stack

- **SvelteKit 3**, Svelte 5 runes, TypeScript 6, Tailwind v4, `@sveltejs/adapter-node`
- **Drizzle ORM** with `postgres.js`; SQL migrations in `drizzle/`
- **Better Auth** (email + password)
- **Node LTS**, pinned in `mise.toml`; npm

## SvelteKit 3 is not SvelteKit 2

It was released on 2026-10-01 and differs from most examples you know. Check
<https://svelte.dev/docs/kit/migrating-to-sveltekit-3> before writing Kit code.

- There is no `svelte.config.js`; Kit options live in `vite.config.ts`.
- Import app code as `#lib/...` **with the file extension** (`#lib/server/auth.ts`), not `$lib`.
- Use `$app/env` and `$app/env/private`, not `$app/environment` or `$env/*`.
- `$app/stores` is gone; use `$app/state`.
- Remote functions are experimental. Do not use them.

## Architecture rules

- **Server-rendered.** Never set `ssr = false`. Pages load data in `+page.server.ts`.
- **Mutations are form actions** that work without JavaScript; `use:enhance` adds optimistic UI on top.
- `/api/v1` (REST) and `/mcp` are for agents and scripts, not for the UI.
- Every operation is defined once in `src/lib/server/operations/`; pages, REST and MCP all call it.
- No module-level state that holds user data (it would leak between requests under SSR).

## Testing rules

- **No unit tests.** End-to-end tests only, with Playwright, in `e2e/`.
- **Every test is cataloged in `E2E.md`.** Add, change or remove its row in the same commit as the spec.
- E2E tests run against a throwaway local Postgres (`compose.test.yaml`), never the dev database.
  The Playwright global setup refuses any database whose name does not end in `_test`.

## Commands

```sh
npm run dev          # dev server (uses .env)
npm run check        # svelte-check
npm run lint         # prettier + eslint
npm run format       # prettier --write
npm run db:generate  # generate a SQL migration from the Drizzle schema
npm run db:migrate   # apply migrations to DATABASE_URL
npm run test:db      # start the throwaway test Postgres
npm run test:e2e     # build, then run Playwright against the test database
```

## Auth schema

After changing Better Auth plugins, regenerate the Drizzle schema and a migration:

```sh
set -a; . ./.env.test; set +a
mv src/service-worker/tsconfig.json /tmp/   # the auth CLI cannot resolve its "extends"
npm run auth:schema
mv /tmp/tsconfig.json src/service-worker/
npm run format && npm run db:generate -- --name <what-changed>
```

## Secrets

`.env` is untracked and holds real credentials. Never print it, commit it, or copy
values out of it. `.env.example` lists the variable names only.

## Cloud sessions

Sessions started from claude.ai/code or the mobile app run on a fresh VM cloned from
GitHub. The `SessionStart` hook in `.claude/settings.json` runs `scripts/cloud-session.sh`
there, which installs the pinned Node, the npm dependencies and the test browser, and
starts the test services, so `npm run check`, `npm run lint` and `npm run test:e2e` work
as they do locally. The script does nothing outside a cloud session.

The cloud environment needs one setting the repository cannot carry: network access
**Custom**, with the default domains included, plus `cdn.playwright.dev` and
`playwright.download.prss.microsoft.com` (the test browser download).

There is no `.env` in a cloud session and none is needed: use the placeholder values
from `.github/workflows/ci.yml` for `npm run check`; the tests read `.env.test`.

## Working agreement

- Never leave work only on the machine it was written on. Push the branch and open a
  pull request, or a draft if it is unfinished, before the session ends.

## Pull requests

Every pull request body uses these five headings, in this order, at the top level, and
no others. Never drop one: if a section has nothing in it, say so in a line.

```
## Why
## What
## How to test
## Risk / rollout
## Follow-ups
```

- **Why**: the reason the change exists (task or ticket id when there is one, and what
  was wrong or missing). Not a restatement of the diff.
- **What**: what changed, and the decisions a reviewer would otherwise have to
  reverse-engineer: trade-offs made, options rejected.
- **How to test**: the exact commands in a code block, then one line per result with
  the numbers from the run (counts, timings), not "tests pass". Say plainly what could
  not be tested and why.
- **Risk / rollout**: what could break, how the change reaches an environment, how it
  is undone. "None." is a complete answer.
- **Follow-ups**: what is deliberately left out, and what this makes newly worth doing.
  "None." is a complete answer.

Keep it short: aim for 150 words, never past 250; three or four lines per section; no
tables unless the data is tabular. Detail that does not fit belongs in code comments or
the commit message.
