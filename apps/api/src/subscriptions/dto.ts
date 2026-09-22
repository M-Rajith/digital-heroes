import { IsIn, IsString, MaxLength } from "class-validator";

export class CheckoutDto {
  @IsIn(["monthly", "yearly"])
  plan!: "monthly" | "yearly";
}

export class PaypalCaptureDto {
  @IsString()
  @MaxLength(40)
  orderId!: string;
}
