import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { WinnersService } from "./winners.service";
import { VerifyWinnerDto } from "./dto";

@ApiTags("winners")
@Controller("winners")
export class WinnersController {
  constructor(private readonly winners: WinnersService) {}

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.winners.forUser(user.id);
  }

  @Post(":id/proof")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async uploadProof(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new ForbiddenException("file is required");
    return this.winners.uploadProof(user.id, id, file);
  }
}

@ApiTags("admin — winners")
@Roles(Role.ADMIN)
@Controller("admin/winners")
export class AdminWinnersController {
  constructor(private readonly winners: WinnersService) {}

  @Get()
  all() {
    return this.winners.all();
  }

  @Post(":id/verify")
  verify(
    @CurrentUser() admin: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: VerifyWinnerDto,
  ) {
    return this.winners.verify(admin.id, id, dto);
  }

  @Post(":id/payout")
  markPaid(@CurrentUser() admin: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.winners.markPaid(admin.id, id);
  }
}
