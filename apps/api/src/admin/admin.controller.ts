import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { AdminService } from "./admin.service";
import {
  AdminUpdateScoreDto,
  AdminUpdateUserDto,
  ListUsersDto,
  UpsertCharityDto,
} from "./dto";

@ApiTags("admin")
@Roles(Role.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("users")
  users(@Query() q: ListUsersDto) {
    return this.admin.listUsers(q);
  }

  @Patch("users/:id")
  updateUser(
    @CurrentUser() admin: AuthUser,
    @Param("id") id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.admin.updateUser(admin.id, id, dto);
  }

  @Patch("scores/:id")
  updateScore(
    @CurrentUser() admin: AuthUser,
    @Param("id") id: string,
    @Body() dto: AdminUpdateScoreDto,
  ) {
    return this.admin.updateScore(admin.id, id, dto);
  }
}

@ApiTags("admin — charities")
@Roles(Role.ADMIN)
@Controller("admin/charities")
export class AdminCharitiesController {
  constructor(private readonly admin: AdminService) {}

  @Post()
  create(@Body() dto: UpsertCharityDto) {
    return this.admin.createCharity(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpsertCharityDto) {
    return this.admin.updateCharity(id, dto);
  }

  @Post(":id/deactivate")
  deactivate(@Param("id") id: string) {
    return this.admin.setCharityActive(id, false);
  }
}
