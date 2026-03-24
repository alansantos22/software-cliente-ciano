import { IsOptional, IsString, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class NotificationSettingsDto {
  @IsOptional() @IsBoolean() payments?: boolean;
  @IsOptional() @IsBoolean() network?: boolean;
  @IsOptional() @IsBoolean() promotions?: boolean;
  @IsOptional() @IsBoolean() system?: boolean;
}

export class UpdateSettingsDto {
  @IsOptional() @IsString() theme?: string;
  @IsOptional() @IsString() language?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notifications?: NotificationSettingsDto;
}
