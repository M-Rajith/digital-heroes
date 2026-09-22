# Digital Heroes — Golf Performance · Charity · Monthly Draw Platform

Production-grade implementation of the Digital Heroes PRD (Level 1, 2026 Edition):
subscription-driven golf performance tracking, charity giving, and a monthly
draw-based prize engine with jackpot rollover and winner verification.

## Monorepo layout

```
digital-heroes/
├── apps/
│   ├── web/          # Next.js 14 frontend (public site + subscriber portal + admin portal)
│   └── api/          # NestJS modular monolith (REST API, draw engine, Stripe webhooks)
│       └── prisma/   # schema copy used by `prisma generate` (source of truth: packages/database)
├── packages/
│   └── database/     # Prisma schema + RLS policies + seed
├── docs/             # Architecture, API contract, testing checklist
├── docker-compose.yml
└── .env.example
```

## Quick start — local dev (no Docker required)

**Prerequisites:** Node 20+, a free Supabase project (Postgres + Storage).

1. **Database** — Supabase dashboard → create project. Project Settings → Database →
   copy the connection strings (use the session pooler, port 5432, for `db push`).
2. **Configure env** — copy `.env.example` to `packages/database/.env` AND `apps/api/.env`.
   Set `DATABASE_URL` / `DIRECT_URL` (session pooler URI, `?connect_timeout=15` recommended)
   and a long random `JWT_SECRET` in both files. In `apps/api/.env` also set
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (the `sb_secret_...` key from
   Project Settings → API Keys) and create a **public** Storage bucket named `winner-proofs`.
3. **Schema + seed:**
   ```bash
   cd packages/database && npm install
   npx prisma db push && npx prisma db seed
   ```
4. **API:**
   ```bash
   cd apps/api && npm install
   npm run prisma:generate   # uses apps/api/prisma/schema.prisma
   npm run start:dev         # http://localhost:4000/api/docs
   ```
5. **Web:**
   ```bash
   cd apps/web && npm install && npm run dev   # http://localhost:3000
   ```

## Quick start — Docker (if your machine supports it)

```bash
cp .env.example .env && mkdir -p apps/web/public
docker compose up --build
```

## Demo credentials (from seed)

| Role      | Email                     | Password      |
|-----------|---------------------------|---------------|
| Admin     | admin@digitalheroes.co.in | Admin#12345!  |
| Subscriber| demo@digitalheroes.co.in  | User#12345!   |

## Verified working

Auth + RBAC (JWT, sub→id mapping) · subscription-gated score entry · rolling 5-score
window (1–45, one-per-date) · charity selection (≥10%) · RANDOM + WEIGHTED monthly
draws with simulation-before-publish · transactional publish (freeze → match → 40/35/25
allocation → winners) · jackpot rollover + carry-in · winner proof upload to Supabase
Storage → admin approve/reject → payout states · admin analytics · audit logging ·
Stripe checkout + signature-verified idempotent webhook (activates with Stripe keys).

Run `npx jest` in `apps/api` for unit tests covering the draw engine, prize math
(splits, rollover), score rolling window, and webhook idempotency.

See `docs/TESTING.md` for the full PRD §16 verification checklist.
