import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../users/entities/user.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { GlobalFinancialSettings } from './entities/global-financial-settings.entity';
import { TransactionType, TransactionStatus } from '../../shared/interfaces/enums';
import { getCurrentPeriod, generateRandomCode } from '../../shared/utils/helpers';

@Injectable()
export class AdminManagerService {
  private readonly logger = new Logger(AdminManagerService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(QuotaTransaction) private readonly txnRepo: Repository<QuotaTransaction>,
    @InjectRepository(GlobalFinancialSettings) private readonly settingsRepo: Repository<GlobalFinancialSettings>,
  ) {}

  private async verifyManagerPassword(password: string): Promise<void> {
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings?.managerPasswordHash) {
      throw new BadRequestException('Senha de gerente não configurada');
    }

    const valid = await argon2.verify(settings.managerPasswordHash, password);
    if (!valid) {
      throw new BadRequestException('Senha de gerente inválida');
    }
  }

  async setPassword(password: string) {
    const hash = await argon2.hash(password);
    await this.settingsRepo.update(1, { managerPasswordHash: hash });
    return { message: 'Senha de gerente definida com sucesso' };
  }

  async verifyPassword(password: string) {
    await this.verifyManagerPassword(password);
    return { valid: true };
  }

  async getUsers() {
    return this.userRepo.find({
      where: { role: 'user' as any, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      select: ['id', 'name', 'email', 'cpf', 'title', 'partnerLevel', 'quotaBalance', 'isActive', 'createdAt'],
    });
  }

  async addQuotas(userId: string, quantity: number, managerPassword: string, reason?: string) {
    await this.verifyManagerPassword(managerPassword);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    user.purchasedQuotas += quantity;
    user.quotaBalance = user.purchasedQuotas + user.splitQuotas;
    await this.userRepo.save(user);

    const txn = this.txnRepo.create({
      userId: user.id,
      type: TransactionType.ADJUSTMENT,
      amount: 0,
      quotasAffected: quantity,
      description: `Ajuste admin: +${quantity} cotas${reason ? ` — ${reason}` : ''}`,
      status: TransactionStatus.COMPLETED,
      referenceMonth: getCurrentPeriod(),
      completedAt: new Date(),
    });
    await this.txnRepo.save(txn);

    this.logger.warn(`⚙️ Admin added ${quantity} quotas to user ${userId}`);
    return { message: `${quantity} cotas adicionadas`, newBalance: user.quotaBalance };
  }

  async removeQuotas(userId: string, quantity: number, managerPassword: string, reason?: string) {
    await this.verifyManagerPassword(managerPassword);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    if (user.purchasedQuotas < quantity) {
      throw new BadRequestException('Usuário não possui cotas suficientes');
    }

    user.purchasedQuotas -= quantity;
    user.quotaBalance = user.purchasedQuotas + user.splitQuotas;
    await this.userRepo.save(user);

    const txn = this.txnRepo.create({
      userId: user.id,
      type: TransactionType.ADJUSTMENT,
      amount: 0,
      quotasAffected: -quantity,
      description: `Ajuste admin: -${quantity} cotas${reason ? ` — ${reason}` : ''}`,
      status: TransactionStatus.COMPLETED,
      referenceMonth: getCurrentPeriod(),
      completedAt: new Date(),
    });
    await this.txnRepo.save(txn);

    this.logger.warn(`⚙️ Admin removed ${quantity} quotas from user ${userId}`);
    return { message: `${quantity} cotas removidas`, newBalance: user.quotaBalance };
  }

  async changeSponsor(userId: string, newSponsorId: string, managerPassword: string) {
    await this.verifyManagerPassword(managerPassword);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const newSponsor = await this.userRepo.findOne({ where: { id: newSponsorId } });
    if (!newSponsor) throw new BadRequestException('Novo patrocinador não encontrado');

    // Prevent circular references
    if (newSponsorId === userId) throw new BadRequestException('Usuário não pode ser seu próprio patrocinador');

    // Decrement old sponsor's direct count
    if (user.sponsorId) {
      await this.userRepo.decrement({ id: user.sponsorId }, 'directCount', 1);
    }

    user.sponsorId = newSponsorId;
    await this.userRepo.save(user);

    // Increment new sponsor's direct count
    await this.userRepo.increment({ id: newSponsorId }, 'directCount', 1);

    this.logger.warn(`⚙️ Admin changed sponsor of ${userId} to ${newSponsorId}`);
    return { message: 'Patrocinador alterado com sucesso' };
  }

  async deleteUser(userId: string, managerPassword: string) {
    await this.verifyManagerPassword(managerPassword);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    user.deletedAt = new Date();
    await this.userRepo.save(user);

    this.logger.warn(`⚙️ Admin soft-deleted user ${userId}`);
    return { message: 'Usuário movido para lixeira' };
  }

  async restoreUser(userId: string, managerPassword: string) {
    await this.verifyManagerPassword(managerPassword);

    const user = await this.userRepo.findOne({
      where: { id: userId, deletedAt: Not(IsNull()) },
      withDeleted: true,
    });
    if (!user) throw new BadRequestException('Usuário não encontrado na lixeira');

    user.deletedAt = null as unknown as Date;
    await this.userRepo.save(user);

    this.logger.warn(`⚙️ Admin restored user ${userId}`);
    return { message: 'Usuário restaurado com sucesso' };
  }

  async getTrash() {
    return this.userRepo.find({
      where: { deletedAt: Not(IsNull()) },
      withDeleted: true,
      order: { deletedAt: 'DESC' },
      select: ['id', 'name', 'email', 'deletedAt'],
    });
  }
}
