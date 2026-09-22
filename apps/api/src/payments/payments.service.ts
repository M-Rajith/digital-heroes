import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import { createHmac, timingSafeEqual } from "crypto";
import Stripe from "stripe";
import { PrismaService } from "../common/prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

interface RazorpaySubscriptionEntity {
  id: string;
  status: string;
  plan_id: string;
  current_start?: number | null;
  current_end?: number | null;
  notes?: { userId?: string; plan?: string };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2024-06-20" });

  constructor(
    private readonly prisma: PrismaService,
    private readonly subs: SubscriptionsService,
  ) {}

  /**
   * Payment webhook — the SOURCE OF TRUTH for subscription state.
   * Detects the provider from the signature header present on the request.
   */
  async handleWebhook(payload: Buffer, stripeSignature?: string, razorpaySignature?: string) {
    if (razorpaySignature) return this.handleRazorpay(payload, razorpaySignature);
    if (stripeSignature) return this.handleStripe(payload, stripeSignature);
    throw new BadRequestException("No webhook signature header present");
  }

  // ---------------- Razorpay ----------------

  private async handleRazorpay(payload: Buffer, signature: string) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      this.logger.warn("Razorpay webhook signature verification failed");
      throw new BadRequestException("WEBHOOK_INVALID_SIGNATURE");
    }

    const event = JSON.parse(payload.toString()) as {
      id: string;
      event: string;
      payload?: { subscription?: { entity: RazorpaySubscriptionEntity } };
    };

    // Idempotency: Razorpay may deliver the same event more than once.
    const seen = await this.prisma.webhookEvent.findUnique({ where: { id: event.id } });
    if (seen) return { received: true, duplicate: true };
    await this.prisma.webhookEvent.create({ data: { id: event.id, type: event.event } });

    const sub = event.payload?.subscription?.entity;
    if (!sub) return { received: true };

    const userId = sub.notes?.userId;
    if (!userId) {
      this.logger.warn(`Razorpay subscription ${sub.id} has no userId note; skipping`);
      return { received: true };
    }

    const plan: "MONTHLY" | "YEARLY" =
      sub.plan_id === process.env.RAZORPAY_PLAN_MONTHLY ? "MONTHLY" : "YEARLY";
    const statusMap: Record<string, SubscriptionStatus> = {
      active: "ACTIVE",
      authenticated: "ACTIVE",
      pending: "INCOMPLETE",
      halted: "PAST_DUE",
      cancelled: "CANCELED",
      paused: "ACTIVE",
      completed: "ACTIVE",
    };
    const status = statusMap[sub.status] ?? "INCOMPLETE";
    const periodEnd = sub.current_end
      ? new Date(sub.current_end * 1000)
      : new Date(Date.now() + (plan === "MONTHLY" ? 30 : 365) * 86400_000);

    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.upsert({
        where: { stripeSubscriptionId: sub.id },
        update: { status, plan, currentPeriodEnd: periodEnd },
        create: {
          userId,
          stripeCustomerId: null,
          stripeSubscriptionId: sub.id, // provider-neutral unique key
          plan,
          status,
          currentPeriodEnd: periodEnd,
        },
      });

      if (event.event === "subscription.charged") {
        const amount = new Prisma.Decimal(process.env.MONTHLY_PRICE_CENTS ?? "999").div(100);
        await tx.payment.create({
          data: { userId, amount, currency: "inr", status: "succeeded" },
        });
      }
    });

    this.logger.log(`Razorpay ${event.event} -> ${sub.id} (${status})`);
    return { received: true };
  }

  // ---------------- Stripe ----------------

  private async handleStripe(payload: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET ?? "",
      );
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException("WEBHOOK_INVALID_SIGNATURE");
    }

    const seen = await this.prisma.webhookEvent.findUnique({ where: { id: event.id } });
    if (seen) return { received: true, duplicate: true };
    await this.prisma.webhookEvent.create({ data: { id: event.id, type: event.type } });

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await this.subs.syncFromStripe(event.data.object as Stripe.Subscription);
        break;
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await this.stripe.subscriptions.retrieve(session.subscription as string);
          await this.subs.syncFromStripe(sub);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        this.logger.warn(`Payment failed for customer ${invoice.customer}`);
        break;
      }
      default:
        this.logger.log(`Unhandled Stripe event type ${event.type}`);
    }

    return { received: true };
  }
}
