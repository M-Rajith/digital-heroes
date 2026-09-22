import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PlanInterval, SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthUser } from "../common/decorators/current-user.decorator";

/**
 * Payment provider is selected by env vars:
 *   RAZORPAY_KEY_ID set  -> Razorpay hosted subscriptions (India-friendly)
 *   otherwise            -> Stripe Checkout + webhooks
 * Both paths end in the same DB state; the webhook is the source of truth.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2024-06-20" });

  constructor(private readonly prisma: PrismaService) {}

  async mySubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Real-time access check used by score entry & draws (PRD: validate on every request). */
  async assertActive(userId: string): Promise<void> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    const now = new Date();
    const valid = sub && (!sub.currentPeriodEnd || sub.currentPeriodEnd > now);
    if (!valid) throw new BadRequestException("SUBSCRIPTION_REQUIRED");
  }

  async isActive(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    return !!sub && (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());
  }

  async createCheckoutSession(user: AuthUser, plan: "monthly" | "yearly") {
    if (process.env.RAZORPAY_KEY_ID) return this.createRazorpayCheckout(user, plan);
    return this.createStripeCheckout(user, plan);
  }

  // ---------------- Razorpay (equivalent PCI-compliant provider) ----------------

  private async createRazorpayCheckout(user: AuthUser, plan: "monthly" | "yearly") {
    const planId = plan === "monthly" ? process.env.RAZORPAY_PLAN_MONTHLY : process.env.RAZORPAY_PLAN_YEARLY;
    if (!planId) throw new BadRequestException("Razorpay plan not configured");

    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new BadRequestException("User not found");

    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
    ).toString("base64");

    const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        plan_id: planId,
        total_count: plan === "monthly" ? 24 : 5,
        customer_notify: 1,
        notes: { userId: user.id, plan }, // travels back in the webhook payload
      }),
    });
    if (!res.ok) {
      throw new BadRequestException(`Razorpay error: ${(await res.text()).slice(0, 200)}`);
    }
    const data = (await res.json()) as { id: string; short_url: string };
    return { checkoutUrl: data.short_url };
  }

  // ---------------- Stripe ----------------

  private async createStripeCheckout(user: AuthUser, plan: "monthly" | "yearly") {
    const priceId =
      plan === "monthly" ? process.env.STRIPE_PRICE_MONTHLY : process.env.STRIPE_PRICE_YEARLY;
    if (!priceId) throw new BadRequestException("Stripe price not configured");

    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) throw new BadRequestException("User not found");

    let customerId = (
      await this.prisma.subscription.findFirst({ where: { userId: user.id, stripeCustomerId: { not: null } } })
    )?.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({ email: dbUser.email, metadata: { userId: user.id } });
      customerId = customer.id;
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CORS_ORIGIN ?? "http://localhost:3000"}/dashboard/subscription?success=1`,
      cancel_url: `${process.env.CORS_ORIGIN ?? "http://localhost:3000"}/pricing?canceled=1`,
      metadata: { userId: user.id, plan },
    });

    return { checkoutUrl: session.url };
  }

  /** Called ONLY from a verified payment webhook. Transactional. */
  async syncFromStripe(sub: Stripe.Subscription): Promise<void> {
    const userId = sub.metadata?.userId;
    if (!userId) {
      this.logger.warn(`Subscription ${sub.id} has no userId metadata; skipping`);
      return;
    }
    const status = this.mapStatus(sub.status);
    const item = sub.items.data[0];
    // Stripe API 2025+: period bounds live on the subscription object, not the item
    const periodEnd = new Date(
      Number((sub as unknown as Record<string, unknown>).current_period_end ??
        (item as unknown as Record<string, unknown>)?.current_period_end ?? 0) * 1000,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { stripeSubscriptionId: sub.id },
        update: {
          status,
          plan: item?.price?.recurring?.interval === "year" ? PlanInterval.YEARLY : PlanInterval.MONTHLY,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
        create: {
          userId,
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          stripeSubscriptionId: sub.id,
          plan: item?.price?.recurring?.interval === "year" ? PlanInterval.YEARLY : PlanInterval.MONTHLY,
          status,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      });

      const latestInvoice = sub.latest_invoice;
      if (typeof latestInvoice === "string") {
        const invoice = await this.stripe.invoices.retrieve(latestInvoice);
        if (invoice.status === "paid" && invoice.amount_paid > 0) {
          await tx.payment.upsert({
            where: { stripePaymentId: invoice.id },
            update: {},
            create: {
              userId,
              stripePaymentId: invoice.id,
              amount: (invoice.amount_paid / 100).toFixed(2),
              currency: invoice.currency,
              status: "succeeded",
            },
          });
        }
      }
    });
  }

  private mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case "active":
      case "trialing":
        return "ACTIVE";
      case "past_due":
      case "unpaid":
        return "PAST_DUE";
      case "canceled":
      case "incomplete_expired":
        return "CANCELED";
      default:
        return "INCOMPLETE";
    }
  }
}
