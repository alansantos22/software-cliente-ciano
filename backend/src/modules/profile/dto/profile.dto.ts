import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PixKeyType } from '../../../shared/interfaces/enums';

export class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() avatarUrl?: string;
}

export class UpdatePasswordDto {
  @IsString() currentPassword: string;
  @IsString() newPassword: string;
}

export class UpdatePixDto {
  @IsEnum(PixKeyType) pixKeyType: PixKeyType;
  @IsString() pixKey: string;
}
