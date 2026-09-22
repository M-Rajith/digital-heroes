import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { SubscriptionsService } from "./subscriptions.service";
import { CheckoutDto } from "./dto";

@ApiTags("subscriptions")
@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.subs.mySubscription(user.id);
  }

  @Post("checkout")
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CheckoutDto) {
    return this.subs.createCheckoutSession(user, dto.plan);
  }
}
