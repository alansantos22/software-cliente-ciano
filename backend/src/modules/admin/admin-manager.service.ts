import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, Like, In } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../users/entities/user.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { QuotaSystemState } from '../quotas/entities/quota-system-state.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { GlobalFinancialSettings } from './entities/global-financial-settings.entity';
import { TransactionType, TransactionStatus } from '../../shared/interfaces/enums';
import { getCurrentPeriod, generateRandomCode } from '../../shared/utils/helpers';

@Injectable()
export class AdminManagerService {
  private readonly logger = new Logger(AdminManagerService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(QuotaTransaction) private readonly txnRepo: Repository<QuotaTransaction>,
    @InjectRepository(QuotaSystemState) private readonly stateRepo: Repository<QuotaSystemState>,
    @InjectRepository(Earning) private readonly earningRepo: Repository<Earning>,
    @InjectRepository(PayoutRequest) private readonly payoutRepo: Repository<PayoutRequest>,
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

  async hasPassword(): Promise<{ hasPassword: boolean }> {
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    return { hasPassword: !!settings?.managerPasswordHash };
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

  async setUserActive(userId: string, isActive: boolean, managerPassword: string) {
    await this.verifyManagerPassword(managerPassword);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    user.isActive = isActive;
    await this.userRepo.save(user);

    const action = isActive ? 'ativado' : 'desativado';
    this.logger.warn(`⚙️ Admin ${action} user ${userId}`);
    return { message: `Usuário ${action} com sucesso`, isActive };
  }

  async deleteUser(userId: string, managerPassword: string) {
    await this.verifyManagerPassword(managerPassword);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    // Sobe os downlines diretos para o patrocinador do usuário deletado
    const downlines = await this.userRepo.find({ where: { sponsorId: userId } });
    if (downlines.length > 0) {
      await this.userRepo.update({ sponsorId: userId }, { sponsorId: user.sponsorId });

      if (user.sponsorId) {
        await this.userRepo.increment({ id: user.sponsorId }, 'directCount', downlines.length);
      }

      this.logger.warn(`⚙️ Reparented ${downlines.length} downline(s) from ${userId} to sponsor ${user.sponsorId ?? 'root'}`);
    }

    user.deletedAt = new Date();
    await this.userRepo.save(user);

    this.logger.warn(`⚙️ Admin soft-deleted user ${userId}`);
    return { message: 'Usuário movido para lixeira', reparentedDownlines: downlines.length };
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

  async purgeTestData(): Promise<{ deletedUsers: number; deletedTransactions: number; deletedEarnings: number; deletedPayouts: number }> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Operação não permitida em produção');
    }

    const testUsers = await this.userRepo.find({
      where: { email: Like('e2e_test_%') },
      withDeleted: true,
      select: ['id'],
    });

    if (testUsers.length === 0) {
      return { deletedUsers: 0, deletedTransactions: 0, deletedEarnings: 0, deletedPayouts: 0 };
    }

    const ids = testUsers.map(u => u.id);

    // Soma as cotas de compra dos usuários de teste para subtrair do contador global
    const testQuotasRow = await this.txnRepo
      .createQueryBuilder('t')
      .select('SUM(t.quotas_affected)', 'total')
      .where('t.userId IN (:...ids)', { ids })
      .andWhere('t.type = :type', { type: TransactionType.PURCHASE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne();
    const testQuotas = parseInt(testQuotasRow?.total || '0', 10);

    const { affected: deletedTransactions = 0 } = await this.txnRepo.delete({ userId: In(ids) });
    const { affected: deletedEarnings = 0 } = await this.earningRepo.delete({ userId: In(ids) });
    const { affected: deletedPayouts = 0 } = await this.payoutRepo.delete({ userId: In(ids) });
    await this.userRepo.delete({ id: In(ids) });

    // Corrige o contador global de cotas vendidas
    if (testQuotas > 0) {
      const state = await this.stateRepo.findOne({ where: { id: 1 } });
      if (state) {
        state.totalQuotasSold = Math.max(0, state.totalQuotasSold - testQuotas);
        await this.stateRepo.save(state);
      }
    }

    this.logger.warn(`🧹 Test data purged: ${testUsers.length} users, ${deletedTransactions} txns, ${deletedEarnings} earnings, ${deletedPayouts} payouts`);

    return {
      deletedUsers: testUsers.length,
      deletedTransactions: deletedTransactions ?? 0,
      deletedEarnings: deletedEarnings ?? 0,
      deletedPayouts: deletedPayouts ?? 0,
    };
  }
}
