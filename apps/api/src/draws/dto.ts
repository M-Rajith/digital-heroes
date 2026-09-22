import { IsIn, IsOptional, IsString } from "class-validator";

export class CreateDrawDto {
  @IsString()
  cycleKey!: string; // "2026-09"

  @IsIn(["RANDOM", "WEIGHTED"])
  type!: "RANDOM" | "WEIGHTED";

  @IsOptional()
  seed?: number;
}

export class SimulateDrawDto {
  @IsOptional()
  seed?: number;
}
