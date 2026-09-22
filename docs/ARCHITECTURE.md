# Architecture — Digital Heroes

## 1. Layering decisions

| Layer | Tech | Responsibility |
|---|---|---|
| Presentation | Next.js 14 (App Router, Vercel) | Public site, subscriber portal, admin portal |
| API | NestJS modular monolith | Business logic, validation, RBAC, draw/prize engines |
| Data | PostgreSQL via Prisma (Supabase) | Transactional data; RLS as defense-in-depth |
| Payments | Stripe Checkout + webhooks | Sole payment authority |
| Files | Supabase Storage | Winner proof uploads (never in Postgres) |
| Jobs | @nestjs/schedule | Monthly draw, renewal reconciliation, notifications |

Why a modular monolith and not microservices: the PRD scope (single team,
selection assignment) rewards correct domain boundaries over distributed
complexity. Modules are independently testable and extractable later.

## 2. Module map (apps/api/src)

```
auth/           JWT issue/verify, login, signup
users/          profile management
subscriptions/  Stripe state mirrored locally; access control
scores/         rolling 5-score window, 1..45 Stableford, one-per-date
charities/      directory, selection, contribution %
draws/          cycle lifecycle, freeze, simulate, publish
prizes/         pool calc (40/35/25), equal split, jackpot rollover
winners/        verification states, proof upload review
payments/       checkout sessions + Stripe webhook (idempotent)
admin/          operational surface over all domains
analytics/      totals, pool, draw stats, charity contributions
notifications/  email hooks (draw published, winner, payout)
common/         guards, decorators, filters, prisma service, config
```

## 3. Draw engine state machine

```
DRAFT ──freeze──> ELIGIBILITY CHECK ──simulate──> SIMULATED ──publish──> PUBLISHED ──verify/settle──> SETTLED
```

Publishing runs inside **one database transaction**:
freeze participants → generate result → match entries →
calculate pools (40/35/25 + carried jackpot) → split equally per tier →
create winners (PENDING_VERIFICATION) → mark draw PUBLISHED. Any failure
rolls back completely.

### Algorithms
- `RANDOM`: uniform sampling of 5 numbers from 1..45.
- `WEIGHTED`: sampling weighted by number frequency across subscribers'
  score-derived entry lines ("weighted by score frequency" per PRD §06).

### Prize pool
`pool = active_subscribers × monthly_price × PRIZE_POOL_RATE + carried_jackpot`

| Match | Share | Rollover |
|---|---|---|
| 5-number | 40% | Yes — carried jackpot |
| 4-number | 35% | No — redistributed next cycle* |
| 3-number | 25% | No — redistributed next cycle* |

\* Unclaimed lower tiers return to the pool of the next cycle (config flag
`REDISTRIBUTE_UNCLAIMED=true`). The 5-match jackpot always rolls per PRD.

## 4. Payments truth flow

```
Pricing page → POST /payments/checkout → Stripe Checkout
Stripe → webhook (signature verified) → idempotency check →
DB transaction updates subscription → user gains access
```

The success redirect page is UX only. **The webhook is the source of truth.**

## 5. Authorization

```
Supabase/DB accounts → JWT → JwtAuthGuard → RolesGuard → handler
                              └──▶ Prisma queries scoped by userId
                              └──▶ RLS policies enforce at DB level (Supabase)
```

Roles: `USER`, `ADMIN`. Every authenticated request re-checks subscription
status where the PRD demands real-time access control (score entry, draws).

## 6. Auditability

Every sensitive admin mutation writes an `audit_logs` row
(actor, action, entity, old/new value, IP). Winner verification, score edits,
draw publishing and payout marks are fully traceable.

## 7. Background jobs

| Job | Schedule | Action |
|---|---|---|
| draw.close | 1st of month 00:05 | Freeze entries, run draw, publish, notify |
| subs.reconcile | hourly | Sync lapsed/canceled subs from Stripe |
| winners.remind | daily | Notify winners with pending verification |

## 8. Scaling notes

- Draw engine is pure & deterministic-given-seed → horizontally safe.
- Webhook idempotency via unique `stripe_event_id`.
- Pool math uses DB decimals, never floats.
- Hot paths indexed: `scores(user_id, date)`, `draw_entries(draw_id)`,
  `subscriptions(user_id, status)`.
- Next step if needed: move jobs to a queue (BullMQ), cache charity directory.
