import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { PrizeEngineService } from "../prizes/prize-engine.service";

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prizes: PrizeEngineService,
  ) {}

  async overview() {
    const [totalUsers, activeSubs, lapsedSubs, totalRevenue, drawsPublished, pendingWinners, verifiedWinners, paidWinners] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.subscription.count({ where: { status: "ACTIVE" } }),
        this.prisma.subscription.count({ where: { status: { in: ["PAST_DUE", "CANCELED"] } } }),
        this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "succeeded" } }),
        this.prisma.draw.count({ where: { status: { in: ["PUBLISHED", "SETTLED"] } } }),
        this.prisma.winner.count({ where: { status: "PENDING_VERIFICATION" } }),
        this.prisma.winner.count({ where: { status: "VERIFIED" } }),
        this.prisma.winner.count({ where: { status: "PAID" } }),
      ]);

    const pool = this.prizes.poolEstimate(activeSubs);
    const carryIn = await this.prizes.carriedJackpot(this.prisma, "9999-12");

    // Charity contribution totals: active subs × their chosen percentage × monthly price
    const monthlyPrice = new Prisma.Decimal(process.env.MONTHLY_PRICE_CENTS ?? "999").div(100);
    const selections = await this.prisma.charitySelection.findMany({
      include: { charity: { select: { id: true, name: true } } },
    });
    const charityTotals = selections.map((s) => ({
      charity: s.charity,
      subscribers: 1,
      percentage: s.percentage,
      monthlyContribution: monthlyPrice.mul(s.percentage).div(100),
    }));

    const totalWon = await this.prisma.winner.aggregate({ _sum: { amount: true } });

    return {
      totals: { totalUsers, activeSubscribers: activeSubs, lapsedSubscriptions: lapsedSubs },
      revenue: { totalCollected: totalRevenue._sum.amount ?? 0, currency: "usd" },
      prizePool: { currentEstimated: pool.total, carriedJackpot: carryIn },
      draws: { published: drawsPublished },
      winners: { pending: pendingWinners, verified: verifiedWinners, paid: paidWinners, totalPaidOut: totalWon._sum.amount ?? 0 },
      charityTotals,
      generatedAt: new Date().toISOString(),
    };
  }
}
