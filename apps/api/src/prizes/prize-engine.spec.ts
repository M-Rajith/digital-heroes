import { Prisma } from "@prisma/client";
import { PrizeEngineService, TIER_SHARES } from "./prize-engine.service";

describe("prize-engine", () => {
  const engine = new PrizeEngineService();

  it("computes pool as subscribers × price × rate, plus carried jackpot", () => {
    process.env.MONTHLY_PRICE_CENTS = "1000"; // $10.00
    process.env.PRIZE_POOL_RATE = "0.20";
    const pool = engine.computePool(100, new Prisma.Decimal(50));
    // 100 × 10 × 0.20 = 200, + 50 carry = 250
    expect(pool.total.toString()).toBe("250");
    expect(pool.tier5.toString()).toBe("100"); // 40%
    expect(pool.tier4.toString()).toBe("87.5"); // 35%
    expect(pool.tier3.toString()).toBe("62.5"); // 25%
  });

  it("splits each tier equally among multiple winners", () => {
    process.env.MONTHLY_PRICE_CENTS = "1000";
    process.env.PRIZE_POOL_RATE = "0.20";
    const pool = engine.computePool(100, new Prisma.Decimal(0)); // total 200
    const result = engine.allocate(pool, {
      5: [{ userId: "a", matchCount: 5 }],
      4: [
        { userId: "b", matchCount: 4 },
        { userId: "c", matchCount: 4 },
      ],
      3: [{ userId: "d", matchCount: 3 }],
    });
    expect(result.winnersByTier[5][0].amount.toString()).toBe("80");
    expect(result.winnersByTier[4][0].amount.toString()).toBe("35");
    expect(result.winnersByTier[4][1].amount.toString()).toBe("35");
    expect(result.winnersByTier[3][0].amount.toString()).toBe("50");
  });

  it("rolls the full 5-match tier forward when unclaimed", () => {
    const pool = engine.computePool(100, new Prisma.Decimal(0));
    const result = engine.allocate(pool, { 5: [], 4: [], 3: [] });
    expect(result.tier5Unclaimed.toString()).toBe(pool.tier5.toString());
    expect(result.winnersByTier[5]).toHaveLength(0);
  });

  it("shares sum to 1.0", () => {
    expect(TIER_SHARES[5] + TIER_SHARES[4] + TIER_SHARES[3]).toBeCloseTo(1);
  });
});
