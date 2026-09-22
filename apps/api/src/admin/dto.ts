import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class ListUsersDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() status?: string; // active | lapsed | all
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}

export class AdminUpdateUserDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() role?: "USER" | "ADMIN";
}

export class AdminUpdateScoreDto {
  @IsOptional() @IsInt() @Min(1) @Max(45) value?: number;
  @IsOptional() @IsDateString() date?: string;
}

export class UpsertCharityDto {
  @IsString() @MaxLength(120) name!: string;
  @IsString() @MaxLength(160) slug!: string;
  @IsString() description!: string;
  @IsOptional() @IsUrl({ require_tld: false }) imageUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false }) website?: string;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
