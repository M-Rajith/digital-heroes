import { Module } from "@nestjs/common";
import { WinnersController, AdminWinnersController } from "./winners.controller";
import { WinnersService } from "./winners.service";

@Module({
  controllers: [WinnersController, AdminWinnersController],
  providers: [WinnersService],
  exports: [WinnersService],
})
export class WinnersModule {}
