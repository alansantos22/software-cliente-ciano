import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class PurchaseQuotaDto {
  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
}
