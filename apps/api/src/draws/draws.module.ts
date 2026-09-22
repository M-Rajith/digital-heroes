import { Module } from "@nestjs/common";
import { DrawsController, AdminDrawsController } from "./draws.controller";
import { DrawsService } from "./draws.service";
import { PrizesModule } from "../prizes/prizes.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";

@Module({
  imports: [PrizesModule, SubscriptionsModule],
  controllers: [DrawsController, AdminDrawsController],
  providers: [DrawsService],
  exports: [DrawsService],
})
export class DrawsModule {}
