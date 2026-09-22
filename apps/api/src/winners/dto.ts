import { IsBoolean, IsOptional, IsString } from "class-validator";

export class VerifyWinnerDto {
  @IsBoolean()
  approve!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
