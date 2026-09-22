# Testing checklist (PRD §16 mapping)

## Backend unit (Jest)
- ✓ score range 1..45 enforced (400 `SCORE_OUT_OF_RANGE`)
- ✓ duplicate date rejected (409 `SCORE_DUPLICATE_DATE`)
- ✓ 6th score evicts oldest (rolling window of 5)
- ✓ inactive subscriber cannot enter scores (402/403)
- ✓ RANDOM draw: 5 unique numbers in 1..45
- ✓ WEIGHTED draw: deterministic given seed; favors frequent numbers
- ✓ tiers 40/35/25 split equally among multiple winners
- ✓ unclaimed 5-match jackpot rolls to next cycle
- ✓ webhook replay / duplicate event ignored (idempotency)

## API integration (Supertest)
- ✓ unauthorized admin endpoints → 403/401
- ✓ subscription webhook updates access in real time
- ✓ publish runs in transaction (failure → rollback)

## E2E (Playwright)
- signup → subscribe (Stripe test card) → enter 5 scores →
  select charity ≥10% → appear in draw → win → upload proof →
  admin verifies → payout marked.

## Manual
- responsive mobile/desktop, empty/edge states, lapsed-subscription banner.
