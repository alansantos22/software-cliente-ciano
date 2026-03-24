import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from '../../shared/interfaces/enums';
import { generateRandomCode } from '../../shared/utils/helpers';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken) private readonly resetRepo: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Conta desativada');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async register(dto: RegisterDto) {
    const existingEmail = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingEmail) {
      throw new ConflictException('Email já cadastrado');
    }

    const existingCpf = await this.userRepo.findOne({ where: { cpf: dto.cpf } });
    if (existingCpf) {
      throw new ConflictException('CPF já cadastrado');
    }

    let sponsor: User | null = null;
    if (dto.referralCode) {
      sponsor = await this.userRepo.findOne({ where: { referralCode: dto.referralCode } });
      if (!sponsor) {
        throw new BadRequestException('Código de indicação inválido');
      }
    }

    const referralCode = `CIANO-${generateRandomCode(6)}`;

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash: await argon2.hash(dto.password),
      name: dto.name,
      cpf: dto.cpf,
      phone: dto.phone,
      city: dto.city,
      state: dto.state,
      pixKey: dto.pixKey,
      referralCode,
      sponsorId: sponsor?.id || null,
      role: UserRole.USER,
    });

    await this.userRepo.save(user);

    // Update sponsor's direct count
    if (sponsor) {
      await this.userRepo.increment({ id: sponsor.id }, 'directCount', 1);
    }

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const storedToken = await this.refreshRepo.findOne({
      where: { token: dto.refreshToken, revokedAt: IsNull() },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    // Revoke old token
    storedToken.revokedAt = new Date();
    await this.refreshRepo.save(storedToken);

    // Generate new tokens
    const tokens = await this.generateTokens(storedToken.user);

    return {
      ...tokens,
      user: this.sanitizeUser(storedToken.user),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'Se o email existir, um link de recuperação será enviado' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const resetToken = this.resetRepo.create({
      userId: user.id,
      token,
      expiresAt,
    });

    await this.resetRepo.save(resetToken);

    // TODO: Integrate real email service
    this.logger.warn(`🔑 [DEV] Password reset token for ${user.email}: ${token}`);

    return { message: 'Se o email existir, um link de recuperação será enviado' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await this.resetRepo.findOne({
      where: { token: dto.token, usedAt: IsNull() },
    });

    if (!resetToken) {
      throw new BadRequestException('Token inválido ou já utilizado');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Token expirado');
    }

    const user = await this.userRepo.findOne({ where: { id: resetToken.userId } });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    user.passwordHash = await argon2.hash(dto.newPassword);
    await this.userRepo.save(user);

    resetToken.usedAt = new Date();
    await this.resetRepo.save(resetToken);

    // Revoke all refresh tokens for this user
    await this.refreshRepo.update(
      { userId: user.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    return { message: 'Senha redefinida com sucesso' };
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return this.sanitizeUser(user);
  }

  async logout(refreshToken: string) {
    const stored = await this.refreshRepo.findOne({
      where: { token: refreshToken, revokedAt: IsNull() },
    });

    if (stored) {
      stored.revokedAt = new Date();
      await this.refreshRepo.save(stored);
    }

    return { message: 'Logout realizado com sucesso' };
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.accessExpiration') || '15m',
    } as any);

    const refreshTokenValue = crypto.randomBytes(40).toString('hex');
    const refreshExpDays = parseInt(
      (this.configService.get<string>('jwt.refreshExpiration') || '7d').replace('d', ''),
      10,
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpDays);

    const refreshToken = this.refreshRepo.create({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt,
    });

    await this.refreshRepo.save(refreshToken);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: refreshExpDays * 86400,
    };
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      fullName: user.name,
      email: user.email,
      cpf: user.cpf,
      phone: user.phone,
      city: user.city,
      state: user.state,
      pixKey: user.pixKey,
      role: user.role,
      referralCode: user.referralCode,
      isActive: user.isActive,
      lastPurchaseDate: user.lastPurchaseDate,
      title: user.title,
      partnerLevel: user.partnerLevel,
      purchasedQuotas: user.purchasedQuotas,
      splitQuotas: user.splitQuotas,
    };
  }
}
