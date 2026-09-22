import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import Stripe from "stripe";
import { PrismaService } from "../common/prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2024-06-20" });

  constructor(
    private readonly prisma: PrismaService,
    private readonly subs: SubscriptionsService,
  ) {}

  async handleWebhook(payload: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET ?? "",
      );
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException("WEBHOOK_INVALID_SIGNATURE");
    }

    // Idempotency: Stripe may deliver the same event more than once.
    const seen = await this.prisma.webhookEvent.findUnique({ where: { id: event.id } });
    if (seen) return { received: true, duplicate: true };
    await this.prisma.webhookEvent.create({
      data: { id: event.id, type: event.type },
    });

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await this.subs.syncFromStripe(event.data.object as Stripe.Subscription);
        break;
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await this.stripe.subscriptions.retrieve(
            session.subscription as string,
          );
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
        this.logger.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }
}
