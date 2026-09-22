import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../common/prisma/prisma.service";
import { DrawsService } from "../draws/draws.service";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Monthly draw job — 1st of the month 00:05 UTC.
 * Creates the cycle if missing, freezes participants, simulates (audit),
 * then publishes and notifies. Admin can re-run any step from the dashboard.
 */
@Injectable()
export class DrawScheduler {
  private readonly logger = new Logger(DrawScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly draws: DrawsService,
    private readonly notify: NotificationsService,
  ) {}

  @Cron("5 0 1 * *")
  async runMonthlyDraw() {
    const cycleKey = new Date().toISOString().slice(0, 7); // "2026-09"
    this.logger.log(`Monthly draw job started for ${cycleKey}`);

    let draw = await this.prisma.draw.findUnique({ where: { cycleKey } });
    if (!draw) {
      draw = await this.prisma.draw.create({ data: { cycleKey, type: "RANDOM" } });
    }
    if (draw.status === "PUBLISHED") {
      this.logger.log(`Draw ${cycleKey} already published — skipping.`);
      return;
    }

    const simulation = await this.draws.simulate(draw.id);
    this.logger.log(`Simulation: ${JSON.stringify(simulation.matches)}`);

    const result = await this.draws.publish(draw.id);
    await this.notify.drawPublished(cycleKey, result.winners.length);
    this.logger.log(`Draw ${cycleKey} published with ${result.winners.length} winner(s).`);
  }

  /** Hourly: surface lapsed subscriptions for ops follow-up. */
  @Cron("0 * * * *")
  async reconcileSubscriptions() {
    const lapsed = await this.prisma.subscription.findMany({
      where: { status: { in: ["PAST_DUE", "CANCELED"] }, cancelAtPeriodEnd: false },
      include: { user: { select: { email: true } } },
      take: 50,
    });
    for (const sub of lapsed) {
      await this.notify.subscriptionLapsed(sub.user.email);
    }
  }
}
