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
   * Stripe webhook — the SOURCE OF TRUTH for subscription state.
   * Signature verified; delivery is at-least-once so events are deduplicated.
   */
  @Public()
  @Post("webhook")
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    if (!req.rawBody || !signature) throw new BadRequestException("Invalid webhook payload");
    return this.payments.handleWebhook(req.rawBody, signature);
  }
}
