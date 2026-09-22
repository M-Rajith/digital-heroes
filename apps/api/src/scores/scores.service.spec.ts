import { ConflictException } from "@nestjs/common";
import { ScoresService, MAX_RETAINED_SCORES } from "./scores.service";

interface Row { id: string; userId: string; value: number; date: Date; createdAt: Date; }

/** Minimal in-memory stub of the Prisma scores delegate. */
function makePrisma(initial: Row[] = []) {
  let rows: Row[] = [...initial];
  let seq = 1;

  const score = {
    findUnique: async ({ where }: any) => {
      if (where.userId_date) {
        return rows.find(
          (r) => r.userId === where.userId_date.userId &&
                 r.date.getTime() === where.userId_date.date.getTime(),
        ) ?? null;
      }
      return rows.find((r) => r.id === where.id) ?? null;
    },
    findMany: async ({ take }: any) => {
      const sorted = [...rows].sort((a, b) => b.date.getTime() - a.date.getTime());
      return (take ? sorted.slice(0, take) : sorted).map((r) => ({ ...r }));
    },
    create: async ({ data }: any) => {
      const row: Row = { id: `score_${seq++}`, createdAt: new Date(), ...data };
      rows.push(row);
      return { ...row };
    },
    deleteMany: async ({ where }: any) => {
      rows = rows.filter((r) => !where.id.in.includes(r.id));
    },
    delete: async ({ where }: any) => {
      rows = rows.filter((r) => r.id !== where.id);
    },
    update: async ({ where, data }: any) => {
      const row = rows.find((r) => r.id === where.id)!;
      Object.assign(row, data);
      return { ...row };
    },
  };

  const prisma: any = { score };
  // ScoresService calls prisma.$transaction(fn) — pass the same delegate.
  prisma.$transaction = async (fn: any) => fn(score);
  return { prisma, rows: () => rows };
}

function makeService(initial: Row[] = []) {
  const { prisma, rows } = makePrisma(initial);
  const subs = { assertActive: jest.fn().mockResolvedValue(undefined) } as any;
  const service = new ScoresService(prisma, subs);
  return { service, rows };
}

const row = (userId: string, d: number, value: number): Row => ({
  id: `s${d}`, userId, value, date: new Date(2026, 8, d), createdAt: new Date(2026, 8, d),
});

describe("scores-service rolling window", () => {
  it("rejects a duplicate date for the same user", async () => {
    const { service } = makeService([row("u1", 1, 30)]);
    await expect(
      service.create("u1", { value: 33, date: new Date(2026, 8, 1).toISOString() }),
    ).rejects.toThrow(ConflictException);
  });

  it("6th score evicts the oldest — exactly 5 retained", async () => {
    const initial = [1, 2, 3, 4, 5].map((d) => row("u1", d, 20 + d));
    const { service, rows } = makeService(initial);
    await service.create("u1", { value: 40, date: new Date(2026, 8, 6).toISOString() });

    const remaining = rows();
    expect(remaining).toHaveLength(MAX_RETAINED_SCORES);
    const values = remaining.map((r) => r.value).sort((a, b) => a - b);
    expect(values).toEqual([22, 23, 24, 25, 40]); // day-1 (value 21) evicted
  });

  it("latestFive returns reverse chronological order", async () => {
    const initial = [3, 1, 2].map((d) => row("u1", d, 20 + d));
    const { service } = makeService(initial);
    const latest = await service.latestFive("u1");
    expect(latest.map((s) => s.date.getDate())).toEqual([3, 2, 1]);
  });

  it("requires an active subscription to enter scores", async () => {
    const { prisma } = makePrisma();
    const subs = { assertActive: jest.fn().mockRejectedValue(new Error("SUBSCRIPTION_REQUIRED")) } as any;
    const service = new ScoresService(prisma, subs);
    await expect(
      service.create("u1", { value: 30, date: new Date(2026, 8, 1).toISOString() }),
    ).rejects.toThrow("SUBSCRIPTION_REQUIRED");
  });
});
