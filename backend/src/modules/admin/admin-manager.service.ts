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
import { BonusCalculatorService } from '../../core/bonus/bonus-calculator.service';
import { SplitEngineService } from '../../core/split/split-engine.service';
import { TitleCalculatorService } from '../../core/title/title-calculator.service';
import { TransactionType, TransactionStatus, PartnerLevel } from '../../shared/interfaces/enums';
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
    private readonly bonusCalc: BonusCalculatorService,
    private readonly splitEngine: SplitEngineService,
    private readonly titleCalc: TitleCalculatorService,
  ) {}

  private async verifyManagerPassword(password: string): Promise<void> {
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings?.managerPasswordHash) {
      this.logger.warn(
        `🔐 verifyManagerPassword: hash AUSENTE (settings row ${settings ? 'existe' : 'NÃO existe'})`,
      );
      throw new BadRequestException('Senha de gerente não configurada');
    }

    const valid = await argon2.verify(settings.managerPasswordHash, password);
    if (!valid) {
      this.logger.warn('🔐 verifyManagerPassword: hash presente mas senha NÃO confere');
      throw new BadRequestException('Senha de gerente inválida');
    }
  }

  async hasPassword(): Promise<{ hasPassword: boolean }> {
    const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    return { hasPassword: !!settings?.managerPasswordHash };
  }

  async setPassword(password: string) {
    const hash = await argon2.hash(password);

    // `update(1, ...)` é um no-op silencioso quando a linha id=1 não existe
    // (afeta 0 linhas e retorna 201) — o hash nunca era persistido e a senha
    // "configurada" voltava como não configurada. `save` cria-ou-atualiza.
    const result = await this.settingsRepo.update(1, { managerPasswordHash: hash });
    if (!result.affected) {
      await this.settingsRepo.save(
        this.settingsRepo.create({ id: 1, managerPasswordHash: hash }),
      );
    }

    // Relê do banco para confirmar que o hash REALMENTE persistiu. Se isto
    // logar "hash NÃO persistiu" mesmo com 201, a coluna não existe no schema
    // de produção (synchronize não aplicou) — o update grava num campo fantasma.
    const check = await this.settingsRepo.findOne({ where: { id: 1 } });
    this.logger.warn(
      `🔐 setPassword: update.affected=${result.affected ?? 0}, ` +
        `hash ${check?.managerPasswordHash ? 'PERSISTIU ✅' : 'NÃO persistiu ❌'}`,
    );

    return { message: 'Senha de gerente definida com sucesso' };
  }

  async verifyPassword(password: string) {
    await this.verifyManagerPassword(password);
    return { valid: true };
  }

  async getUsers() {
    // Inclui o admin na listagem (além dos usuários comuns). O admin aparece
    // apenas para receber/retirar cotas — as demais ações são bloqueadas no
    // servidor (ver ASSERT_NOT_ADMIN abaixo) e ocultas na UI via `role`.
    return this.userRepo.find({
      where: [
        { role: 'user' as any, deletedAt: IsNull() },
        { role: 'admin' as any, deletedAt: IsNull() },
      ],
      order: { createdAt: 'DESC' },
      select: ['id', 'name', 'email', 'cpf', 'title', 'partnerLevel', 'role', 'quotaBalance', 'purchasedQuotas', 'adminGrantedQuotas', 'splitQuotas', 'sponsorId', 'isActive', 'createdAt'],
    });
  }

  /**
   * Garante que a ação não é aplicada sobre uma conta admin. Usado nas
   * operações que não fazem sentido para o admin (patrocinador, ativação,
   * exclusão, simulação de compra). Apenas add/remove de cotas são permitidas.
   */
  private assertNotAdmin(user: { role?: string }) {
    if (user.role === 'admin') {
      throw new BadRequestException('Esta operação não é permitida para a conta admin');
    }
  }

  async addQuotas(userId: string, quantity: number, managerPassword: string, reason?: string) {
    await this.verifyManagerPassword(managerPassword);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    user.adminGrantedQuotas = (user.adminGrantedQuotas ?? 0) + quantity;
    user.quotaBalance = user.purchasedQuotas + user.adminGrantedQuotas + user.splitQuotas;
    await this.userRepo.save(user);

    const txn = this.txnRepo.create({
      userId: user.id,
      type: TransactionType.ADMIN_GRANT,
      amount: 0,
      quotasAffected: quantity,
      description: `Concessão admin: +${quantity} cota(s)${reason ? ` — ${reason}` : ''}`,
      status: TransactionStatus.COMPLETED,
      referenceMonth: getCurrentPeriod(),
      completedAt: new Date(),
    });
    await this.txnRepo.save(txn);

    this.logger.warn(`⚙️ Admin granted ${quantity} quota(s) to user ${userId}`);
    return { message: `${quantity} cotas concedidas`, newBalance: user.quotaBalance };
  }

  async removeQuotas(userId: string, quantity: number, managerPassword: string, reason?: string, source?: 'admin' | 'split') {
    await this.verifyManagerPassword(managerPassword);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');

    const field = source === 'split' ? 'splitQuotas' : 'adminGrantedQuotas';
    const label = source === 'split' ? 'split' : 'admin';
    const available = (user[field] as number) ?? 0;
    if (available < quantity) {
      throw new BadRequestException(
        `Somente cotas de ${label} podem ser removidas por esta operação. Disponível: ${available} cota(s).`,
      );
    }

    (user as any)[field] = available - quantity;
    user.quotaBalance = user.purchasedQuotas + (user.adminGrantedQuotas ?? 0) + user.splitQuotas;
    await this.userRepo.save(user);

    const txn = this.txnRepo.create({
      userId: user.id,
      type: TransactionType.ADMIN_GRANT,
      amount: 0,
      quotasAffected: -quantity,
      description: `Remoção ${label}: -${quantity} cota(s)${reason ? ` — ${reason}` : ''}`,
      status: TransactionStatus.COMPLETED,
      referenceMonth: getCurrentPeriod(),
      completedAt: new Date(),
    });
    await this.txnRepo.save(txn);

    this.logger.warn(`⚙️ Admin removed ${quantity} ${label} quota(s) from user ${userId}`);
    return { message: `${quantity} cotas removidas`, newBalance: user.quotaBalance };
  }

  async changeSponsor(userId: string, newSponsorId: string, managerPassword: string) {
    await this.verifyManagerPassword(managerPassword);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');
    this.assertNotAdmin(user);

    const newSponsor = await this.userRepo.findOne({ where: { id: newSponsorId } });
    if (!newSponsor) throw new BadRequestException('Novo patrocinador não encontrado');

    // Prevent circular references
    if (newSponsorId === userId) throw new BadRequestException('Usuário não pode ser seu próprio patrocinador');

    const oldSponsorId = user.sponsorId;

    // Decrement old sponsor's direct count
    if (oldSponsorId) {
      await this.userRepo.decrement({ id: oldSponsorId }, 'directCount', 1);
    }

    user.sponsorId = newSponsorId;
    await this.userRepo.save(user);

    // Increment new sponsor's direct count
    await this.userRepo.increment({ id: newSponsorId }, 'directCount', 1);

    // Recalcular títulos: o próprio user, a antiga upline (perdeu downline)
    // e a nova upline (ganhou downline) — propagando até a raiz.
    await this.titleCalc.recalculateTitleToRoot(userId);
    if (oldSponsorId) {
      await this.titleCalc.recalculateTitleToRoot(oldSponsorId);
    }
    await this.titleCalc.recalculateTitleToRoot(newSponsorId);

    this.logger.warn(`⚙️ Admin changed sponsor of ${userId} to ${newSponsorId}`);
    return { message: 'Patrocinador alterado com sucesso' };
  }

  async setUserActive(userId: string, isActive: boolean, managerPassword: string) {
    await this.verifyManagerPassword(managerPassword);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');
    this.assertNotAdmin(user);

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
    this.assertNotAdmin(user);

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

  async simulatePurchase(userId: string, quantity: number, managerPassword: string, reason?: string) {
    await this.verifyManagerPassword(managerPassword);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuário não encontrado');
    this.assertNotAdmin(user);

    const state = await this.splitEngine.getState();
    const price = Number(state.currentQuotaPrice);
    const totalAmount = price * quantity;
    const month = getCurrentPeriod();
    const isFirstPurchase = user.purchasedQuotas === 0;
    const label = reason ? ` — ${reason}` : '';

    // 1. Criar transação marcada como simulada
    const txn = this.txnRepo.create({
      userId: user.id,
      type: TransactionType.PURCHASE,
      amount: totalAmount,
      quotasAffected: quantity,
      description: `[SIMULADO] Compra de ${quantity} cota(s) a R$${price.toFixed(2)}${label}`,
      status: TransactionStatus.COMPLETED,
      referenceMonth: month,
      completedAt: new Date(),
    });
    await this.txnRepo.save(txn);

    // 2. Atualizar cotas e nível do usuário
    user.purchasedQuotas += quantity;
    user.quotaBalance = user.purchasedQuotas + (user.adminGrantedQuotas ?? 0) + user.splitQuotas;
    user.lastPurchaseDate = new Date();
    user.isActive = true;

    if (user.purchasedQuotas >= 60) user.partnerLevel = PartnerLevel.IMPERIAL;
    else if (user.purchasedQuotas >= 20) user.partnerLevel = PartnerLevel.VIP;
    else if (user.purchasedQuotas >= 10) user.partnerLevel = PartnerLevel.PLATINUM;
    else user.partnerLevel = PartnerLevel.SOCIO;

    await this.userRepo.save(user);

    // 3. Calcular bônus para upline (igualzinho uma compra real)
    if (isFirstPurchase) {
      await this.bonusCalc.calculateFirstPurchaseBonus(user, totalAmount, new Date());
    } else {
      await this.bonusCalc.calculateRepurchaseBonus(user, totalAmount, new Date());
    }

    // 4. Atualizar contador global de cotas vendidas
    await this.splitEngine.incrementQuotasSold(quantity);

    // 5. Verificar aumento de preço / split
    await this.splitEngine.checkAndProcess();

    // 6. Recalcular título do patrocinador na upline
    if (user.sponsorId) {
      await this.titleCalc.recalculateTitle(user.sponsorId);
    }

    this.logger.warn(`🧪 Admin SIMULOU compra de ${quantity} cota(s) para ${user.name} (R$${totalAmount})`);

    return {
      transactionId: txn.id,
      quantity,
      totalAmount,
      unitPrice: price,
      newBalance: user.quotaBalance,
      partnerLevel: user.partnerLevel,
      simulated: true,
    };
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
