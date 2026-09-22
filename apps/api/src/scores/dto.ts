import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, Max, Min } from "class-validator";

export class CreateScoreDto {
  @IsInt()
  @Min(1, { message: "SCORE_OUT_OF_RANGE" })
  @Max(45, { message: "SCORE_OUT_OF_RANGE" })
  value!: number;

  @IsDateString()
  date!: string;
}

export class UpdateScoreDto {
  @IsOptional()
  @IsInt()
  @Min(1, { message: "SCORE_OUT_OF_RANGE" })
  @Max(45, { message: "SCORE_OUT_OF_RANGE" })
  value?: number;

  @IsOptional()
  @IsDateString()
  date?: string;
}
