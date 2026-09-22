import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

/**
 * Prize pool math — PRD §07.
 *
 *   pool = active_subscribers × monthly_price × PRIZE_POOL_RATE + carried_jackpot
 *
 *   5-number match → 40% (jackpot, rolls forward when unclaimed)
 *   4-number match → 35%
 *   3-number match → 25%
 *
 * Winners in the same tier split equally. All math in Decimal (never float).
 */
export const TIER_SHARES = { 5: 0.4, 4: 0.35, 3: 0.25 } as const;

export interface Pool {
  total: Prisma.Decimal;
  tier5: Prisma.Decimal;
  tier4: Prisma.Decimal;
  tier3: Prisma.Decimal;
}

export interface TierWinners {
  winnersByTier: Record<5 | 4 | 3, { userId: string; matchCount: number; amount: Prisma.Decimal }[]>;
  tier5Unclaimed: Prisma.Decimal;
}

@Injectable()
export class PrizeEngineService {
  private rate(): Prisma.Decimal {
    return new Prisma.Decimal(process.env.PRIZE_POOL_RATE ?? "0.20");
  }
  private monthlyPrice(): Prisma.Decimal {
    return new Prisma.Decimal(process.env.MONTHLY_PRICE_CENTS ?? "999").div(100);
  }

  poolEstimate(activeSubscribers: number) {
    const carryIn = new Prisma.Decimal(0);
    return { ...this.computePool(activeSubscribers, carryIn), carryIn };
  }

  computePool(activeSubscribers: number, carryIn: Prisma.Decimal): Pool {
    const contributions = this.monthlyPrice().mul(this.rate()).mul(activeSubscribers);
    const total = contributions.plus(carryIn);
    return {
      total,
      tier5: total.mul(TIER_SHARES[5]),
      tier4: total.mul(TIER_SHARES[4]),
      tier3: total.mul(TIER_SHARES[3]),
    };
  }

  /** Jackpot carried in from the most recent published cycle with an unclaimed 5-match. */
  async carriedJackpot(
    tx: Prisma.TransactionClient,
    currentCycleKey: string,
  ): Promise<Prisma.Decimal> {
    const prev = await tx.draw.findFirst({
      where: { status: "PUBLISHED", cycleKey: { lt: currentCycleKey }, jackpotRollover: { gt: 0 } },
      orderBy: { cycleKey: "desc" },
    });
    return prev?.jackpotRollover ?? new Prisma.Decimal(0);
  }

  allocate(
    pool: Pool,
    tally: Record<5 | 4 | 3, { userId: string; matchCount: number }[]>,
  ): TierWinners {
    const winnersByTier: TierWinners["winnersByTier"] = { 5: [], 4: [], 3: [] };

    for (const tier of [5, 4, 3] as const) {
      const pot = pool[`tier${tier}` as "tier5" | "tier4" | "tier3"];
      const winners = tally[tier];
      if (winners.length === 0) {
        if (tier === 5) continue; // jackpot unclaimed → rolls
        continue; // unclaimed lower tier stays in pool accounting (redistribution handled next cycle)
      }
      const share = pot.div(winners.length);
      for (const w of winners) {
        winnersByTier[tier].push({ ...w, amount: share });
      }
    }

    return {
      winnersByTier,
      tier5Unclaimed: tally[5].length === 0 ? pool.tier5 : new Prisma.Decimal(0),
    };
  }

  projectedPayouts(poolTotal: Prisma.Decimal, matches: { tier5: number; tier4: number; tier3: number }) {
    const pool = {
      total: poolTotal,
      tier5: poolTotal.mul(TIER_SHARES[5]),
      tier4: poolTotal.mul(TIER_SHARES[4]),
      tier3: poolTotal.mul(TIER_SHARES[3]),
    };
    return {
      tier5PerWinner: matches.tier5 ? pool.tier5.div(matches.tier5) : null,
      tier4PerWinner: matches.tier4 ? pool.tier4.div(matches.tier4) : null,
      tier3PerWinner: matches.tier3 ? pool.tier3.div(matches.tier3) : null,
    };
  }
}
