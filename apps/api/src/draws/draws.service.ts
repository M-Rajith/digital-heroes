import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { PrizeEngineService } from "../prizes/prize-engine.service";
import {
  entryWeight,
  lineFromScores,
  matchCount,
  mulberry32,
  sampleUnique,
  NUMBER_MAX,
  NUMBER_MIN,
  PICK_COUNT,
} from "./draw-engine";

@Injectable()
export class DrawsService {
  private readonly logger = new Logger(DrawsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subs: SubscriptionsService,
    private readonly prizes: PrizeEngineService,
  ) {}

  async currentCycle() {
    const draw = await this.prisma.draw.findFirst({
      where: { status: { in: ["DRAFT", "SIMULATED", "PUBLISHED"] } },
      orderBy: { cycleKey: "desc" },
      include: { prizePool: true, _count: { select: { entries: true, winners: true } } },
    });
    const activeSubs = await this.prisma.subscription.count({ where: { status: "ACTIVE" } });
    const estimate = this.prizes.poolEstimate(activeSubs);
    const lastPublished = await this.prisma.draw.findFirst({
      where: { status: { in: ["PUBLISHED", "SETTLED"] } },
      orderBy: { cycleKey: "desc" },
    });
    return {
      draw,
      activeSubscribers: activeSubs,
      estimatedPool: estimate.total,
      jackpot: estimate.carryIn.plus(lastPublished?.jackpotRollover ?? new Prisma.Decimal(0)),
    };
  }

  history() {
    return this.prisma.draw.findMany({
      where: { status: { in: ["PUBLISHED", "SETTLED"] } },
      orderBy: { cycleKey: "desc" },
      include: {
        prizePool: true,
        winners: { select: { tier: true, amount: true, status: true } },
      },
    });
  }

  async myEntries(userId: string) {
    return this.prisma.drawEntry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        draw: { select: { cycleKey: true, status: true, winningNumbers: true } },
      },
    });
  }

  async create(dto: { cycleKey: string; type: "RANDOM" | "WEIGHTED" }) {
    const existing = await this.prisma.draw.findUnique({ where: { cycleKey: dto.cycleKey } });
    if (existing) throw new ConflictException("DRAW_CYCLE_EXISTS");
    return this.prisma.draw.create({ data: { cycleKey: dto.cycleKey, type: dto.type } });
  }

  async freezeParticipants(drawId: string) {
    const draw = await this.getDraw(drawId);
    if (draw.entries.length > 0) return { frozen: draw.entries.length, alreadyFrozen: true };

    const subs = await this.prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { userId: true },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      let count = 0;
      for (const { userId } of subs) {
        const scores = await tx.score.findMany({
          where: { userId },
          orderBy: { date: "desc" },
          take: 5,
          select: { value: true },
        });
        const line = lineFromScores(scores.map((s) => s.value));
        const avg = scores.length ? scores.reduce((a, s) => a + s.value, 0) / scores.length : 0;
        await tx.drawEntry.upsert({
          where: { drawId_userId: { drawId, userId } },
          update: {},
          create: { drawId, userId, numbers: line, weight: entryWeight(avg) },
        });
        count++;
      }
      return count;
    });
    return { frozen: created };
  }

  async simulate(drawId: string, seed?: number) {
    const draw = await this.getDraw(drawId);
    if (draw.status === "PUBLISHED") throw new BadRequestException("DRAW_ALREADY_PUBLISHED");

    await this.freezeParticipants(drawId);
    const entries = await this.prisma.drawEntry.findMany({ where: { drawId } });
    const numbers = this.generateNumbers(draw.type, entries, seed);

    const outcome = this.computeOutcome(entries, numbers);
    await this.prisma.draw.update({
      where: { id: drawId },
      data: { simulatedNumbers: numbers, status: "SIMULATED" },
    });

    const pool = this.prizes.poolEstimate(await this.activeSubscriberCount());
    return {
      cycleKey: draw.cycleKey,
      type: draw.type,
      simulatedNumbers: numbers,
      entrants: entries.length,
      matches: outcome,
      projectedPool: pool.total,
      projectedPayouts: this.prizes.projectedPayouts(pool.total, outcome),
    };
  }

  async publish(drawId: string, seed?: number, actorId?: string) {
    const draw = await this.getDraw(drawId);
    if (draw.status === "PUBLISHED") throw new BadRequestException("DRAW_ALREADY_PUBLISHED");

    return this.prisma.$transaction(async (tx) => {
      const subCount = await tx.subscription.count({ where: { status: "ACTIVE" } });
      const existing = await tx.drawEntry.count({ where: { drawId } });
      if (existing === 0) {
        const subs = await tx.subscription.findMany({
          where: { status: "ACTIVE" },
          select: { userId: true },
        });
        for (const { userId } of subs) {
          const scores = await tx.score.findMany({
            where: { userId },
            orderBy: { date: "desc" },
            take: 5,
            select: { value: true },
          });
          await tx.drawEntry.create({
            data: {
              drawId,
              userId,
              numbers: lineFromScores(scores.map((s) => s.value)),
              weight: entryWeight(
                scores.length ? scores.reduce((a, s) => a + s.value, 0) / scores.length : 0,
              ),
            },
          });
        }
      }

      const entries = await tx.drawEntry.findMany({ where: { drawId } });
      const numbers = this.generateNumbers(draw.type, entries, seed);

      const matched = entries
        .map((e) => ({ userId: e.userId, count: matchCount(e.numbers, numbers) }))
        .filter((m) => m.count >= 3);

      const carryIn = await this.prizes.carriedJackpot(tx, draw.cycleKey);
      const pool = this.prizes.computePool(subCount, carryIn);
      const payouts = this.prizes.allocate(pool, this.tally(matched));

      await tx.draw.update({
        where: { id: drawId },
        data: {
          winningNumbers: numbers,
          status: "PUBLISHED",
          publishedAt: new Date(),
          jackpotCarryIn: carryIn,
          jackpotRollover: payouts.tier5Unclaimed,
        },
      });
      await tx.prizePool.upsert({
        where: { drawId },
        update: { tier5: pool.tier5, tier4: pool.tier4, tier3: pool.tier3 },
        create: { drawId, tier5: pool.tier5, tier4: pool.tier4, tier3: pool.tier3 },
      });

      const winners: unknown[] = [];
      for (const tier of [5, 4, 3] as const) {
        for (const w of payouts.winnersByTier[tier]) {
          winners.push(
            await tx.winner.create({
              data: {
                drawId,
                userId: w.userId,
                tier,
                matchCount: w.matchCount,
                amount: w.amount,
                status: "PENDING_VERIFICATION",
              },
            }),
          );
        }
      }

      if (actorId) {
        await tx.auditLog.create({
          data: {
            actorId,
            action: "draw.publish",
            entityType: "draw",
            entityId: drawId,
            newValue: JSON.parse(
              JSON.stringify({ numbers, pool, winners: winners.length }),
            ) as Prisma.InputJsonValue,
          },
        });
      }

      return { drawId, numbers, pool, winners, rolledJackpot: payouts.tier5Unclaimed };
    });
  }

  async activeSubscriberCount(): Promise<number> {
    return this.prisma.subscription.count({ where: { status: "ACTIVE" } });
  }

  private generateNumbers(
    type: "RANDOM" | "WEIGHTED",
    entries: { numbers: number[]; weight: unknown }[],
    seed?: number,
  ): number[] {
    const rng = mulberry32(seed ?? Date.now());
    if (type === "RANDOM") {
      return sampleUnique(PICK_COUNT, NUMBER_MIN, NUMBER_MAX, rng);
    }
    const freq = new Map<number, number>();
    for (const e of entries) {
      for (const n of e.numbers) {
        freq.set(n, (freq.get(n) ?? 0) + Number(e.weight));
      }
    }
    return sampleUnique(PICK_COUNT, NUMBER_MIN, NUMBER_MAX, rng, (n) => freq.get(n) ?? 0.000001);
  }

  private tally(matched: { userId: string; count: number }[]) {
    const tally: Record<5 | 4 | 3, { userId: string; matchCount: number }[]> = { 5: [], 4: [], 3: [] };
    for (const m of matched) {
      if (m.count >= 5) tally[5].push({ userId: m.userId, matchCount: m.count });
      else if (m.count === 4) tally[4].push({ userId: m.userId, matchCount: 4 });
      else tally[3].push({ userId: m.userId, matchCount: 3 });
    }
    return tally;
  }

  private computeOutcome(entries: { numbers: number[] }[], numbers: number[]) {
    const outcome = { tier5: 0, tier4: 0, tier3: 0 };
    for (const e of entries) {
      const c = matchCount(e.numbers, numbers);
      if (c >= 5) outcome.tier5++;
      else if (c === 4) outcome.tier4++;
      else if (c === 3) outcome.tier3++;
    }
    return outcome;
  }

  private async getDraw(drawId: string) {
    const draw = await this.prisma.draw.findUnique({
      where: { id: drawId },
      include: { entries: { select: { id: true } } },
    });
    if (!draw) throw new NotFoundException("Draw not found");
    return draw;
  }
}
