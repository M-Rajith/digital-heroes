import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { CharitiesService } from "./charities.service";
import { SelectCharityDto } from "./dto";

@ApiTags("charities")
@Controller("charities")
export class CharitiesController {
  constructor(private readonly charities: CharitiesService) {}

  @Public()
  @Get()
  directory(@Query("q") q?: string, @Query("featured") featured?: string) {
    return this.charities.directory(q, featured === "true");
  }

  @Public()
  @Get(":slug")
  detail(@Param("slug") slug: string) {
    return this.charities.detail(slug);
  }

  @Put("selection")
  select(@CurrentUser() user: AuthUser, @Body() dto: SelectCharityDto) {
    return this.charities.select(user.id, dto);
  }
}
