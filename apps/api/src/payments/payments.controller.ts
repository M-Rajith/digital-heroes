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
   *   stripe-signature        -> Stripe
   *   x-razorpay-signature    -> Razorpay (HMAC-SHA256, verified against raw body)
   * Delivery is at-least-once; events are deduplicated by provider event id.
   */
  @Public()
  @Post("webhook")
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") stripeSignature: string | undefined,
    @Headers("x-razorpay-signature") razorpaySignature: string | undefined,
  ) {
    if (!req.rawBody) throw new BadRequestException("Invalid webhook payload");
    return this.payments.handleWebhook(req.rawBody, stripeSignature, razorpaySignature);
  }
}
