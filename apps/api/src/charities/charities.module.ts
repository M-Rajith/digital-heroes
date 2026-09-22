import { Module } from "@nestjs/common";
import { CharitiesController } from "./charities.controller";
import { CharitiesService } from "./charities.service";

@Module({ controllers: [CharitiesController], providers: [CharitiesService], exports: [CharitiesService] })
export class CharitiesModule {}
