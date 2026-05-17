# AuraAI

Production-ready AI API proxy platform (Next.js 15 + PostgreSQL + Prisma + Redis) with:

- user cabinet, auth, sessions, roles, bans
- `aura_live_...` API keys (hash-only storage)
- OpenAI-compatible API (`/v1/*`)
- provider routing (OpenAI / OpenRouter / Anthropic / Gemini)
- billing in internal tokens
- request logs + admin panel
- Codex compatibility (`/icw`, `/backend-api/codex`, `WS /backend-api/codex/ws`)

## 1. Stack

- Frontend: Next.js 15, TypeScript, TailwindCSS, Framer Motion, Recharts
- Backend: Next.js Route Handlers, Prisma ORM, JWT, bcrypt
- DB: PostgreSQL in production, automatic SQLite dev DB locally
- Cache/Limits: Redis in production, in-memory fallback locally
- Deploy: Docker, docker-compose, amvera.yml

## 2. Quick start (local)

```bash
npm install
npm run dev
```

Local dev does not require PostgreSQL, Redis, or a `.env` file. `npm run dev` prepares `prisma/dev.db`, generates a SQLite-compatible Prisma client, runs the idempotent seed, then starts the custom Next/WebSocket server.

App will run on:

- `http://localhost:3000`

Useful local database commands:

```bash
npm run prisma:migrate      # prepare SQLite schema without seed
npm run prisma:dev          # prepare SQLite schema and run seed
npm run prisma:dev -- --reset
```

## 3. Environment

Use `.env.example` as template.

Local development can run with defaults. For real AI proxy calls, fill at least one provider key:

- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

Production / Amvera required:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `NEXT_PUBLIC_APP_URL`
- at least one provider key

Recommended:

- `REDIS_URL`

## 4. Database setup

### Local dev SQLite

```bash
npm run prisma:dev
```

### Local PostgreSQL, if needed

```bash
docker compose up -d postgres redis
npm run prisma:generate
npm run prisma:pg:migrate
npm run prisma:seed
```

### Production PostgreSQL

```bash
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
```

Seed creates:

- admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- providers
- model aliases:
  - `gpt-5.3-codex`
  - `gpt-5.4`
  - `gpt-5.4-mini`
  - `gpt-5.5`
  - `gpt-image-2`

## 5. Run commands

```bash
npm run dev       # local dev with automatic SQLite DB + custom ws server
npm run build     # production build
npm run start     # production start
```

## 6. API check

### Models

```bash
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer aura_live_xxx"
```

### Chat completion

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer aura_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.4",
    "messages": [{"role":"user","content":"Hello"}]
  }'
```

### Responses

```bash
curl http://localhost:3000/v1/responses \
  -H "Authorization: Bearer aura_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.4",
    "input": "Hello"
  }'
```

## 7. Admin access

1. Register/login normally or use seeded admin credentials.
2. Seeded admin creds from `.env`:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
3. Open `/admin`.

Admin panel supports:

- users list, grant tokens, ban/unban, soft delete
- API keys view + revoke
- request logs and stats
- model configs
- providers

## 8. API keys

User creates keys in dashboard.

Key format:

- `aura_live_xxxxxxxxxxxxxxxxx`

Security:

- only hash stored in DB (`keyHash`)
- plaintext shown only once (create/reset response)

## 9. Codex support

Implemented endpoints:

- `GET /icw` - PowerShell bootstrap script
- `GET /backend-api/codex`
- `POST /backend-api/codex`
- `WS /backend-api/codex/ws`

### Bootstrap usage (Windows PowerShell)

```powershell
$env:AURAAI_API_KEY='aura_live_xxx'; iex(irm 'https://my-domain.com/icw')
```

Script behavior:

- validates key via backend
- updates Codex config (`~/.codex/config.toml`)
- creates backup (`config.toml.auraai.<timestamp>.bak`)
- supports restore mode (`-Restore`)
- can run local bridge mode (`-UseBridge`)
- sets user env vars for AuraAI/OpenAI-compatible usage

## 10. Deploy to Amvera

### Option A: Dockerfile only

Amvera will detect `Dockerfile` automatically.

### Option B: with config file

`amvera.yml` is included and sets container port to `3000`.

### Typical deploy steps

1. Push repository to Amvera Git remote.
2. Set all env variables in Amvera panel.
3. Build and deploy.
4. Verify:
   - `/api/health`
   - `/v1/models`
   - `/icw`

## 11. Deploy with docker-compose (self-host)

```bash
docker compose up -d --build
```

The container startup command runs `prisma migrate deploy` and the idempotent seed before `node server.js`.
Seed creates missing providers/model aliases and creates the admin account only if it does not exist.

## 12. Project structure

```text
src/
  app/
    (pages) login register dashboard image instructions settings admin pricing api-docs
    api/
      auth, keys, dashboard, settings, image, admin, transactions, health
    v1/
      models, chat/completions, responses, embeddings, images/generations
    backend-api/codex
    icw
  components/
    ui, auth, dashboard, image, settings, admin, layout
  lib/
    auth, api-keys, gateway, billing, providers, prisma, validators, rate-limit, logs
prisma/
  schema.prisma
  seed.ts
  migrations/
server.js
Dockerfile
docker-compose.yml
amvera.yml
.env.example
```

## 13. Notes

- `docker-compose.yml` is for local/self-host only.
- Amvera cloud runtime uses `Dockerfile` / `amvera.yml`.
- For stable billing accuracy keep upstream models with usage support enabled.
