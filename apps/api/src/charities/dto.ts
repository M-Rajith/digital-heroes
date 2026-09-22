import { IsInt, IsString, Max, Min } from "class-validator";

export class SelectCharityDto {
  @IsString()
  charityId!: string;

  /** PRD minimum: 10% of subscription fee; may be increased voluntarily. */
  @IsInt()
  @Min(10)
  @Max(100)
  percentage!: number;
}
