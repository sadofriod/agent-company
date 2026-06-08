# Agents Team

[中文文档](README.zh-CN.md)

![Node](https://img.shields.io/badge/node-%3E%3D22-3C873A)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10-F69220)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6)
![License](https://img.shields.io/badge/license-not%20set-lightgrey)

A pnpm monorepo for building and running a multi-agent collaboration platform, including:

- Backend service (`@agents-team/service`) for runtime orchestration, team schema validation, and agent markdown management
- Web editor (`@agents-team/team-schema-editor`) for team schema editing
- Project docs for PRD, requirements, implementation plans, and API contracts

## Highlights

- Monorepo managed by `pnpm-workspace`
- TypeScript-based backend and frontend
- PostgreSQL + pgvector support for service persistence
- Auto route registration in backend (`packages/service/src/routes`)
- Unified API response envelope (`ok/data` and `ok/error`)
- Built-in team schema and runtime session related APIs

## Tech Stack

- Runtime: Node.js 22+
- Package manager: pnpm 10+
- Backend: Express 5, Prisma, Zod
- Frontend: React 19, Vite, MUI
- Database: PostgreSQL 17 + pgvector
- Build tools: TypeScript, SWC, tsx

## Architecture

```mermaid
flowchart LR
  U[User / Client] --> E[Team Schema Editor\nVite + React]
  U --> S[Service API\nExpress + TypeScript]
  E --> S
  S --> P[(PostgreSQL 17 + pgvector)]
  S --> A[Agent Markdown Storage\nlocal / Vercel Blob]
  D[Project Docs + Schemas] --> E
  D --> S
```

## Repository Structure

```text
.
├── docker-compose.dev.yml
├── docker/
├── docs/
├── packages/
│   ├── agents/                # Agent markdown source
│   ├── service/               # Backend service
│   └── team-schema-editor/    # Frontend schema editor
└── package.json
```

## Prerequisites

- Node.js `>= 22`
- pnpm `>= 10`
- Docker + Docker Compose (recommended for one-command local environment)

## Quick Start

### Option A: Docker (recommended)

```bash
pnpm dev:docker
```

This starts:

- Service: http://127.0.0.1:3000
- Team schema editor: http://127.0.0.1:5173
- PostgreSQL: `localhost:5432`

The compose setup will install dependencies (if needed), run DB bootstrap, then launch service + editor in dev mode.

### Option B: Local development

1. Install dependencies

```bash
pnpm install
```

2. Start PostgreSQL (you can use your own local/Postgres container)

3. Configure environment variables (see Environment Variables)

4. Run DB bootstrap for service

```bash
pnpm --filter @agents-team/service db:bootstrap
```

5. Start both service and editor

```bash
pnpm dev
```

Or run each app separately:

```bash
pnpm dev:service
pnpm dev:editor
```

## Environment Variables

Service-related variables:

- `DATABASE_URL` (required)
  - Example: `postgresql://agents_team:agents_team@127.0.0.1:5432/agents_team`
- `PORT` (optional, default `3000`)
- `NODE_ENV` (optional)
- `AGENT_MARKDOWN_STORAGE` (optional: `local` | `vercel_blob`)
- `AGENT_MARKDOWN_BLOB_PREFIX` (optional)

Editor-related variable:

- `VITE_EDITOR_EXPOSE_HOST` (optional, used by docker dev setup)

## Common Commands

At repository root:

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm dev
pnpm dev:docker
pnpm dev:service
pnpm dev:editor
```

Service package commands:

```bash
pnpm --filter @agents-team/service dev
pnpm --filter @agents-team/service build
pnpm --filter @agents-team/service typecheck
pnpm --filter @agents-team/service db:bootstrap
pnpm --filter @agents-team/service prisma:migrate:dev
pnpm --filter @agents-team/service prisma:migrate:deploy
pnpm --filter @agents-team/service seed:init
```

## API Overview

Service API base URL:

- `http://127.0.0.1:3000`

Health check:

- `GET /health`

Main functional route groups:

- `/agent-markdown`
- `/team`
- `/runtime-plan`
- `/runtime`
- `/agent-gateway`

For detailed request/response contracts, see:

- `docs/service-api.md`

## API Smoke Test

Run service first, then test with curl:

```bash
curl -s http://127.0.0.1:3000/health | jq
```

Expected response shape:

```json
{
  "ok": true,
  "data": {
    "status": "ok"
  }
}
```

Validate a team schema payload:

```bash
curl -s -X POST http://127.0.0.1:3000/team/validate \
  -H 'Content-Type: application/json' \
  --data @docs/examples/software-delivery-team.json | jq
```

## Database

- Prisma schema: `packages/service/prisma/schema.prisma`
- Migration directory: `packages/service/prisma/migrations`
- Init SQL (pgvector): `docker/postgres/init/01-pgvector.sql`

## Documentation

- PRD docs: `docs/PRDs`
- Requirements docs: `docs/requirements`
- Implementation docs: `docs/implementation`
- Team schema JSON schema: `docs/schemas/team.schema.json`

## Development Notes

- Backend routes are registered from files under `packages/service/src/routes`.
- Runtime/session and schema validation behavior should follow current `packages/service/src` implementation.
- Keep API behavior and `docs/service-api.md` aligned when endpoints change.

## Production Notes

- Set `NODE_ENV=production` in production environments.
- Use a managed PostgreSQL instance and secure credentials.
- For agent markdown persistence, prefer `AGENT_MARKDOWN_STORAGE=vercel_blob` in production.
- Put the service behind a reverse proxy/API gateway and configure logging/monitoring.

### Minimal container deployment example

Run only the backend service and Postgres on a cloud VM:

```bash
docker compose up -d postgres
pnpm install --frozen-lockfile
pnpm --filter @agents-team/service db:bootstrap
pnpm --filter @agents-team/service build
pnpm --filter @agents-team/service start
```

Recommended production environment variables:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db>
AGENT_MARKDOWN_STORAGE=vercel_blob
AGENT_MARKDOWN_BLOB_PREFIX=agents-team
```

If you need full containerized production, create a dedicated compose file (for example `docker-compose.prod.yml`) with:

- service image/build pinned to an immutable version
- non-root runtime user
- persistent storage strategy for logs and backups
- secure secret injection (do not hardcode credentials in compose)

## Typical Development Workflow

1. Pull latest code and install dependencies.

```bash
git pull
pnpm install
```

2. Start local dependencies and apps.

```bash
pnpm dev:docker
```

3. Modify schema, routes, or runtime logic.

- Team schema source: `docs/schemas/team.schema.json`
- Service routes: `packages/service/src/routes`
- Runtime logic: `packages/service/src/runtime`

4. Validate API behavior quickly.

```bash
curl -s http://127.0.0.1:3000/health | jq
curl -s -X POST http://127.0.0.1:3000/team/validate \
  -H 'Content-Type: application/json' \
  --data @docs/examples/software-delivery-team.json | jq
```

5. Run quality checks before commit.

```bash
pnpm typecheck
pnpm build
```

6. Commit and open PR.

```bash
git add .
git commit -m "feat: <short description>"
```

## Troubleshooting

- If Prisma client is missing after pulling latest changes:

```bash
pnpm --filter @agents-team/service prisma:generate
```

- If local DB schema is out of sync in development:

```bash
pnpm --filter @agents-team/service prisma:migrate:dev
```

- If Docker startup fails due to stale volumes, remove related volumes and restart compose.

## CI Status

No GitHub Actions workflow is currently configured under `.github/workflows`.
If you add CI later, you can include build/typecheck/test badges in this section.

## Contributing

1. Create a feature branch.
2. Keep changes scoped and type-safe.
3. Run type checks and relevant builds before opening PR.
4. Update docs when API or behavior changes.

## License

No license file is currently included in this repository. Add a `LICENSE` file if you plan to open source this project.
