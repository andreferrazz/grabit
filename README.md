# Grabit

Checklists you can reuse: lists, templates, and items you check off. Built with
SvelteKit 3 (server-rendered) and Postgres, with a REST API and an MCP server for
AI agents.

## Requirements

- Node LTS (see `mise.toml`; `mise install` sets it up)
- A Postgres database
- Docker, for the end-to-end test database

## Setup

```sh
npm install
cp .env.example .env   # then fill in the values
npm run db:migrate
npm run dev
```

## Tests

End-to-end only. Every test is listed in [E2E.md](E2E.md).

```sh
npm run test:db    # start the throwaway test Postgres (port 5433)
npm run test:e2e
```

## Checks

```sh
npm run check
npm run lint
```
