import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Roles } from "../common/decorators/roles.decorator";
import { AnalyticsService } from "./analytics.service";

@ApiTags("admin — analytics")
@Roles(Role.ADMIN)
@Controller("admin/analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  overview() {
    return this.analytics.overview();
  }
}
