import { IsString, IsEmail, IsOptional, IsInt, IsEnum, Min, Length } from 'class-validator';

export class OnboardingRegisterDto {
  @IsString() fullName: string;

  @IsString() @Length(11, 14) cpf: string;

  @IsEmail() email: string;

  @IsString() ddd: string;

  @IsString() phone: string;

  @IsString() city: string;

  @IsString() @Length(2, 2) state: string;

  @IsString() pixType: string;

  @IsString() pixKey: string;

  @IsOptional() @IsInt() @Min(0) quotaCount?: number;

  @IsOptional() @IsString() quotaType?: string; // 'purchased' | 'split'
}
