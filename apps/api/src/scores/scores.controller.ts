import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { ScoresService } from "./scores.service";
import { CreateScoreDto, UpdateScoreDto } from "./dto";

@ApiTags("scores")
@Controller("scores")
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.scores.latestFive(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateScoreDto) {
    return this.scores.create(user.id, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateScoreDto) {
    return this.scores.update(user.id, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.scores.remove(user.id, id);
  }
}
