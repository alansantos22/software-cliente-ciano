import { IsEnum, IsOptional, IsString, IsNumber, IsUUID, Min } from 'class-validator';
import { PixKeyType } from '../../../shared/interfaces/enums';

export class RequestPayoutDto {
  @IsNumber()
  @Min(0)
  quotaAmount: number;

  @IsNumber()
  @Min(0)
  networkAmount: number;

  @IsEnum(PixKeyType)
  pixKeyType: PixKeyType;

  @IsString()
  pixKey: string;
}

export class ProcessPayoutDto {
  @IsUUID()
  payoutRequestId: string;

  @IsString()
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class GenerateBatchDto {
  @IsString()
  month: string; // YYYY-MM
}
