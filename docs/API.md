# API Contract — `/api/v1`

Auth header: `Authorization: Bearer <jwt>` for subscriber/admin routes.

## Auth
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | /auth/signup | public | Creates user; optional charity selection |
| POST | /auth/login | public | Returns JWT |

## Users
| GET | /users/me | user | Profile + subscription + charity summary |

## Subscriptions
| GET | /subscriptions/me | user | Status, renewal date, plan |
| POST | /subscriptions/checkout | user | Body `{plan: monthly\|yearly}` → Stripe session URL |

## Scores
| GET | /scores | user | Latest 5, reverse chronological |
| POST | /scores | active subscriber | `{value: 1..45, date}` — one per date |
| PATCH | /scores/:id | owner | Edit value/date (uniqueness preserved) |
| DELETE | /scores/:id | owner | Remove entry |

## Charities
| GET | /charities | public | Directory + search/filter |
| GET | /charities/:slug | public | Detail |
| PUT | /charities/selection | user | `{charityId, percentage >= 10}` |

## Draws
| GET | /draws/current | public | Active cycle, pool estimate, jackpot |
| GET | /draws/history | public | Published results |
| GET | /draws/my-entries | user | Own participation |
| POST | /admin/draws | admin | Create cycle |
| POST | /admin/draws/:id/simulate | admin | Dry-run result |
| POST | /admin/draws/:id/publish | admin | Finalize + allocate prizes |

## Winners
| GET | /winners/me | user | Own winnings + status |
| POST | /winners/:id/proof | user (multipart) | Upload screenshot |
| GET | /admin/winners | admin | All winners |
| POST | /admin/winners/:id/verify | admin | approve/reject proof |
| POST | /admin/winners/:id/payout | admin | mark PAID |

## Payments
| POST | /payments/webhook | Stripe | Signature-verified, idempotent |

## Admin
| GET | /admin/users?q=&status= | admin |
| PATCH | /admin/users/:id | admin | Edit profile/subscription notes |
| PATCH | /admin/scores/:id | admin | Edit any score (audited) |
| GET | /admin/analytics | admin | totals, pool, draw stats, charity $ |
| CRUD | /admin/charities | admin |

## Errors
`{ statusCode, message, error, code? }` — e.g. `SCORE_DUPLICATE_DATE`,
`SCORE_OUT_OF_RANGE`, `SUBSCRIPTION_REQUIRED`, `DRAW_ALREADY_PUBLISHED`,
`WEBHOOK_INVALID_SIGNATURE`.
