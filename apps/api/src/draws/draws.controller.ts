import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { DrawsService } from "./draws.service";
import { CreateDrawDto, SimulateDrawDto } from "./dto";

@ApiTags("draws")
@Controller("draws")
export class DrawsController {
  constructor(private readonly draws: DrawsService) {}

  @Public()
  @Get("current")
  current() {
    return this.draws.currentCycle();
  }

  @Public()
  @Get("history")
  history() {
    return this.draws.history();
  }

  @Get("my-entries")
  myEntries(@CurrentUser() user: AuthUser) {
    return this.draws.myEntries(user.id);
  }
}

@ApiTags("admin — draws")
@Roles(Role.ADMIN)
@Controller("admin/draws")
export class AdminDrawsController {
  constructor(private readonly draws: DrawsService) {}

  @Post()
  create(@Body() dto: CreateDrawDto) {
    return this.draws.create(dto);
  }

  @Post(":id/freeze")
  freeze(@Param("id") id: string) {
    return this.draws.freezeParticipants(id);
  }

  @Post(":id/simulate")
  simulate(@Param("id") id: string, @Body() dto: SimulateDrawDto) {
    return this.draws.simulate(id, dto.seed);
  }

  @Post(":id/publish")
  publish(@Param("id") id: string, @Body() dto: SimulateDrawDto, @CurrentUser() user: AuthUser) {
    return this.draws.publish(id, dto.seed, user.id);
  }
}
