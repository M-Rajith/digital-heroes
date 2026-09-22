import { Module } from "@nestjs/common";
import { AdminController, AdminCharitiesController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({ controllers: [AdminController, AdminCharitiesController], providers: [AdminService] })
export class AdminModule {}
