import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PlanInterval, Prisma, SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";
import { PrismaService } from "../common/prisma/prisma.service";
import { AuthUser } from "../common/decorators/current-user.decorator";

/**
 * Payment provider auto-selection (PRD §04: "Stripe or equivalent"):
 *   RAZORPAY_KEY_ID  -> Razorpay hosted subscriptions
 *   PAYPAL_CLIENT_ID -> PayPal Orders (sandbox/live via PAYPAL_ENV)
 *   otherwise        -> Stripe Checkout
 * Every path funnels into the same subscription state machine.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2024-06-20" });

  constructor(private readonly prisma: PrismaService) {}

  private paypalBase() {
    return (process.env.PAYPAL_ENV ?? "sandbox") === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  }

  async paypalToken(): Promise<string> {
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
    ).toString("base64");
    const res = await fetch(`${this.paypalBase()}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new BadRequestException(`PayPal auth failed: ${res.status}`);
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

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
    if (process.env.PAYPAL_CLIENT_ID) return this.createPaypalCheckout(user, plan);
    return this.createStripeCheckout(user, plan);
  }

  // ---------------- PayPal (instant sandbox, no KYC wall) ----------------

  private async createPaypalCheckout(user: AuthUser, plan: "monthly" | "yearly") {
    const token = await this.paypalToken();
    const origin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
    const res = await fetch(`${this.paypalBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: `${user.id}:${plan}`, // returns with the order — our source of mapping
            description: `Digital Heroes ${plan} plan`,
            amount: {
              currency_code: "USD",
              value: plan === "monthly" ? "9.99" : "99.90",
            },
          },
        ],
        application_context: {
          brand_name: "Digital Heroes",
          user_action: "PAY_NOW",
          return_url: `${origin}/dashboard/subscription?paypal=success`,
          cancel_url: `${origin}/pricing?canceled=1`,
        },
      }),
    });
    if (!res.ok) throw new BadRequestException(`PayPal order failed: ${(await res.text()).slice(0, 200)}`);
    const order = (await res.json()) as { id: string; links: { rel: string; href: string }[] };
    const approve = order.links.find((l) => l.rel === "approve");
    if (!approve) throw new BadRequestException("PayPal approval link missing");
    return { checkoutUrl: approve.href };
  }

  /**
   * Capture an approved PayPal order — called by the client after redirect.
   * The capture response comes from an authenticated api-m.paypal.com call,
   * so it is trusted. Activates the subscription in one transaction.
   */
  async capturePaypalOrder(userId: string, orderId: string) {
    const token = await this.paypalToken();
    const res = await fetch(`${this.paypalBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as {
      status: string;
      purchase_units?: {
        reference_id?: string;
        payments?: { captures?: { id: string; amount?: { value?: string; currency_code?: string } }[] };
      }[];
    };
    if (data.status !== "COMPLETED") {
      throw new BadRequestException(`PayPal capture status: ${data.status}`);
    }

    const unit = data.purchase_units?.[0];
    const [refUserId, plan] = (unit?.reference_id ?? ":").split(":");
    if (refUserId !== userId) throw new NotFoundException("Order does not belong to this user");
    if (plan !== "monthly" && plan !== "yearly") throw new BadRequestException("Unknown plan");

    const capture = unit?.payments?.captures?.[0];
    const periodEnd = new Date(Date.now() + (plan === "monthly" ? 30 : 365) * 86400_000);

    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.upsert({
        where: { stripeSubscriptionId: orderId }, // provider-neutral unique key
        update: { status: "ACTIVE", plan: plan.toUpperCase() as PlanInterval, currentPeriodEnd: periodEnd },
        create: {
          userId,
          stripeCustomerId: null,
          stripeSubscriptionId: orderId,
          plan: plan.toUpperCase() as PlanInterval,
          status: "ACTIVE",
          currentPeriodEnd: periodEnd,
        },
      });
      if (capture?.id) {
        await tx.payment.upsert({
          where: { stripePaymentId: capture.id },
          update: {},
          create: {
            userId,
            stripePaymentId: capture.id,
            amount: capture.amount?.value ?? (plan === "monthly" ? "9.99" : "99.90"),
            currency: (capture.amount?.currency_code ?? "USD").toLowerCase(),
            status: "succeeded",
          },
        });
      }
      return subscription;
    });
  }

  // ---------------- Razorpay ----------------

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
        notes: { userId: user.id, plan },
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

  /** Called ONLY from a verified Stripe webhook. Transactional. */
  async syncFromStripe(sub: Stripe.Subscription): Promise<void> {
    const userId = sub.metadata?.userId;
    if (!userId) {
      this.logger.warn(`Subscription ${sub.id} has no userId metadata; skipping`);
      return;
    }
    const status = this.mapStatus(sub.status);
    const item = sub.items.data[0];
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
