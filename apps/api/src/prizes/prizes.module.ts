import { Module } from "@nestjs/common";
import { PrizeEngineService } from "./prize-engine.service";

@Module({ providers: [PrizeEngineService], exports: [PrizeEngineService] })
export class PrizesModule {}
