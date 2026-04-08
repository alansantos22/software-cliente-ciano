import { IsString, IsOptional, IsNumber, IsEnum, IsInt, IsArray, IsBoolean, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ClosingDayMode, PixKeyType } from '../../../shared/interfaces/enums';

// ─── Financial Config DTOs ────────────────────────────

export class UpdateGlobalConfigDto {
  @IsOptional() @IsNumber() quotaValue?: number;
  @IsOptional() @IsInt() @Min(1) minQuotas?: number;
  @IsOptional() @IsInt() @Min(1) maxQuotasPerUser?: number;
  @IsOptional() @IsInt() @Min(1) totalQuotasAvailable?: number;
  @IsOptional() @IsEnum(ClosingDayMode) closingDayMode?: ClosingDayMode;
  @IsOptional() @IsInt() @Min(1) @Max(31) closingDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(28) paymentDay?: number;
}

export class UpdateMonthlyConfigDto {
  @IsOptional() @IsNumber() @Min(0) @Max(100) firstPurchaseBonus?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) repurchaseBonusL1?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) repurchaseBonusL2to6?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) teamBonus?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) dividendPoolPercent?: number;
}

export class UpdatePresentationMetricsDto {
  @IsOptional() metrics?: Record<string, any>;
}

export class UpdateCareerPlanDto {
  @IsOptional() @IsInt() reqQuantity?: number;
  @IsOptional() @IsString() reqType?: string;
  @IsOptional() @IsString() reqLevel?: string;
  @IsOptional() @IsInt() repurchaseLevels?: number;
  @IsOptional() @IsInt() teamLevels?: number;
  @IsOptional() @IsNumber() leadershipPercent?: number;
  @IsOptional() @IsNumber() minNetworkMovement?: number;
  @IsOptional() @IsInt() networkLevelsDepth?: number;
}

// ─── Payout Distribution DTOs ─────────────────────────

export class CalculateDistributionDto {
  @IsString() profitMonth: string;      // YYYY-MM
  @IsNumber() @Min(0) netProfit: number;
}

export class GenerateBatchDto {
  @IsString() profitMonth: string;
  @IsNumber() @Min(0) netProfit: number;
  // dividendPool is computed server-side from GlobalFinancialSettings
}

export class ProcessPayoutActionDto {
  @IsString() action: 'processing' | 'completed' | 'failed';
  @IsOptional() @IsString() transactionId?: string;
  @IsOptional() @IsString() failureReason?: string;
}

export class BulkPayoutActionDto {
  @IsArray() payoutIds: string[];
  @IsString() action: 'processing' | 'completed';
  @IsOptional() @IsString() transactionId?: string;
}

// ─── Price Engine DTOs ────────────────────────────────

export class UpdatePriceEngineDto {
  @IsOptional() forceSplit?: boolean;
  @IsOptional() @IsNumber() adjustConstant?: number;
}

// ─── Manager DTOs ─────────────────────────────────────

export class SetManagerPasswordDto {
  @IsString() password: string;
}

export class ManagerOperationDto {
  @IsString() managerPassword: string;
}

export class AddQuotasDto extends ManagerOperationDto {
  @IsInt() @Min(1) quantity: number;
  @IsOptional() @IsString() reason?: string;
}

export class RemoveQuotasDto extends ManagerOperationDto {
  @IsInt() @Min(1) quantity: number;
  @IsOptional() @IsString() reason?: string;
}

export class ChangeSponsorDto extends ManagerOperationDto {
  @IsString() newSponsorId: string;
}

export class SetUserActiveDto extends ManagerOperationDto {
  @IsBoolean() isActive: boolean;
}

export class DeleteUserDto extends ManagerOperationDto {}

export class RestoreUserDto extends ManagerOperationDto {}

export class SimulatePurchaseDto extends ManagerOperationDto {
  @IsInt() @Min(1) quantity: number;
  @IsOptional() @IsString() reason?: string;
}
