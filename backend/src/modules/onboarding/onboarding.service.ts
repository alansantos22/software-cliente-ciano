import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../users/entities/user.entity';
import { generateRandomCode } from '../../shared/utils/helpers';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async registerUser(
    sponsorId: string,
    data: {
      fullName: string;
      cpf: string;
      email: string;
      ddd: string;
      phone: string;
      city: string;
      state: string;
      pixType: string;
      pixKey: string;
      quotaCount?: number;
      quotaType?: string;
    },
  ) {
    // Check existing
    const existingEmail = await this.userRepo.findOne({ where: { email: data.email } });
    if (existingEmail) throw new BadRequestException('Email já cadastrado');

    const existingCpf = await this.userRepo.findOne({ where: { cpf: data.cpf } });
    if (existingCpf) throw new BadRequestException('CPF já cadastrado');

    // Generate temporary password (user should reset)
    const tempPassword = generateRandomCode();
    const passwordHash = await argon2.hash(tempPassword);

    const referralCode = `CIANO-${generateRandomCode()}`;

    const quotaCount = data.quotaCount || 0;
    const isSplit = data.quotaType === 'split';

    const user = this.userRepo.create({
      name: data.fullName,
      cpf: data.cpf,
      email: data.email,
      phone: `${data.ddd}${data.phone}`,
      city: data.city,
      state: data.state,
      pixKey: data.pixKey,
      pixKeyType: data.pixType as any,
      passwordHash,
      referralCode,
      sponsorId,
      purchasedQuotas: isSplit ? 0 : quotaCount,
      splitQuotas: isSplit ? quotaCount : 0,
      quotaBalance: quotaCount,
      isActive: quotaCount > 0,
      lastPurchaseDate: quotaCount > 0 && !isSplit ? new Date() : undefined,
    });

    await this.userRepo.save(user);

    // Increment sponsor's direct count
    await this.userRepo.increment({ id: sponsorId }, 'directCount', 1);

    this.logger.log(`👤 New member registered by sponsor ${sponsorId}: ${data.fullName}`);

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      referralCode: user.referralCode,
      temporaryPassword: tempPassword,
    };
  }
}
