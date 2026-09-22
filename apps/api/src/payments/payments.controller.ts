import { BadRequestException, Controller, Headers, Post, RawBodyRequest, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Public } from "../common/decorators/public.decorator";
import { PaymentsService } from "./payments.service";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * Payment provider webhook — the SOURCE OF TRUTH for subscription state.
   * Provider is detected by which signature header arrives:
   *   paypal-transmission-sig  -> PayPal (verified via PayPal's verify API)
   *   x-razorpay-signature     -> Razorpay (HMAC-SHA256)
   *   stripe-signature         -> Stripe
   * Delivery is at-least-once; events are deduplicated by provider event id.
   */
  @Public()
  @Post("webhook")
  async webhook(@Req() req: RawBodyRequest<Request>) {
    if (!req.rawBody) throw new BadRequestException("Invalid webhook payload");
    const h = req.headers as Record<string, string | undefined>;
    return this.payments.handleWebhook(req.rawBody, {
      "paypal-transmission-sig": h["paypal-transmission-sig"],
      "paypal-auth-algo": h["paypal-auth-algo"],
      "paypal-cert-url": h["paypal-cert-url"],
      "paypal-transmission-id": h["paypal-transmission-id"],
      "paypal-transmission-time": h["paypal-transmission-time"],
      "x-razorpay-signature": h["x-razorpay-signature"],
      "stripe-signature": h["stripe-signature"],
    });
  }
}
