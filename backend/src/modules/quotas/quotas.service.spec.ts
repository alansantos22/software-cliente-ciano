import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuotasService } from './quotas.service';
import { QuotaTransaction } from './entities/quota-transaction.entity';
import { QuotaSystemState } from './entities/quota-system-state.entity';
import { SplitEvent } from './entities/split-event.entity';
import { User } from '../users/entities/user.entity';
import { GlobalFinancialSettings } from '../admin/entities/global-financial-settings.entity';
import { PartnerLevelRequirement } from '../admin/entities/partner-level-requirement.entity';
import { BonusCalculatorService } from '../../core/bonus/bonus-calculator.service';
import { SplitEngineService } from '../../core/split/split-engine.service';
import { TitleCalculatorService } from '../../core/title/title-calculator.service';
import { InfinitePayService } from '../payments/infinitepay.service';
import { TransactionStatus, TransactionType } from '../../shared/interfaces/enums';

const mockState = {
  id: 1,
  currentQuotaPrice: 2000,
  totalQuotasSold: 0,
  splitCount: 0,
  currentPhase: 0,
  nextEventTarget: 50,
  nextEventLabel: 'Aumento de Preço',
  totalSplitQuotas: 0,
};

const mockSettings = {
  id: 1,
  minQuotas: 1,
  maxQuotasPerUser: 200,
  totalQuotasAvailable: 10000,
  presentationMetrics: { estimatedYieldPerQuota: 200 },
};

const mockUser: Partial<User> = {
  id: 'user-1',
  name: 'João Silva',
  email: 'joao@example.com',
  purchasedQuotas: 0,
  splitQuotas: 0,
  quotaBalance: 0,
  isActive: true,
  sponsorId: null,
  lastPurchaseDate: null,
  partnerLevel: 'socio' as any,
};

describe('QuotasService', () => {
  let service: QuotasService;
  let txnRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock; findAndCount: jest.Mock };
  let stateRepo: { findOne: jest.Mock };
  let splitEventRepo: { create: jest.Mock; save: jest.Mock };
  let userRepo: { findOne: jest.Mock; save: jest.Mock; increment: jest.Mock };
  let settingsRepo: { findOne: jest.Mock };
  let partnerReqRepo: { find: jest.Mock };
  let bonusCalc: { calculateFirstPurchaseBonus: jest.Mock; calculateRepurchaseBonus: jest.Mock };
  let splitEngine: { getState: jest.Mock; incrementQuotasSold: jest.Mock; checkAndProcess: jest.Mock };
  let titleCalc: { recalculateTitle: jest.Mock };
  let infinitePay: { createCheckout: jest.Mock };

  beforeEach(async () => {
    txnRepo = {
      // create devolve um objeto mutável (purchase grava gatewayCheckoutId/paymentUrl nele).
      create: jest.fn().mockImplementation((data) => ({
        id: 'txn-1',
        type: TransactionType.PURCHASE,
        ...data,
      })),
      save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    stateRepo = { findOne: jest.fn() };
    splitEventRepo = { create: jest.fn(), save: jest.fn() };
    userRepo = {
      findOne: jest.fn().mockResolvedValue({ ...mockUser }),
      save: jest.fn().mockResolvedValue(mockUser),
      increment: jest.fn().mockResolvedValue(undefined),
    };
    settingsRepo = { findOne: jest.fn().mockResolvedValue(mockSettings) };
    partnerReqRepo = { find: jest.fn().mockResolvedValue([]) };
    bonusCalc = {
      calculateFirstPurchaseBonus: jest.fn().mockResolvedValue(undefined),
      calculateRepurchaseBonus: jest.fn().mockResolvedValue(undefined),
    };
    splitEngine = {
      getState: jest.fn().mockResolvedValue({ ...mockState }),
      incrementQuotasSold: jest.fn().mockResolvedValue(undefined),
      checkAndProcess: jest.fn().mockResolvedValue(undefined),
    };
    titleCalc = { recalculateTitle: jest.fn().mockResolvedValue(undefined) };
    infinitePay = {
      createCheckout: jest.fn().mockResolvedValue({
        checkoutId: 'CHEC_123',
        paymentUrl: 'https://checkout.infinitepay.io/CHEC_123',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotasService,
        { provide: getRepositoryToken(QuotaTransaction), useValue: txnRepo },
        { provide: getRepositoryToken(QuotaSystemState), useValue: stateRepo },
        { provide: getRepositoryToken(SplitEvent), useValue: splitEventRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(GlobalFinancialSettings), useValue: settingsRepo },
        { provide: getRepositoryToken(PartnerLevelRequirement), useValue: partnerReqRepo },
        { provide: BonusCalculatorService, useValue: bonusCalc },
        { provide: SplitEngineService, useValue: splitEngine },
        { provide: TitleCalculatorService, useValue: titleCalc },
        { provide: InfinitePayService, useValue: infinitePay },
      ],
    }).compile();

    service = module.get<QuotasService>(QuotasService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getConfig ───────────────────────────────────────────────────────────────

  describe('getConfig', () => {
    it('should return quota system configuration', async () => {
      const result = await service.getConfig();

      expect(result).toHaveProperty('currentPrice', 2000);
      expect(result).toHaveProperty('minQuotas', 1);
      expect(result).toHaveProperty('maxQuotasPerUser', 200);
      expect(result).toHaveProperty('estimatedYieldPerQuota', 200);
    });

    it('should default estimatedYieldPerQuota to 200 when not in settings', async () => {
      settingsRepo.findOne.mockResolvedValue({ ...mockSettings, presentationMetrics: null });
      const result = await service.getConfig();
      expect(result.estimatedYieldPerQuota).toBe(200);
    });
  });

  // ─── getBalance ──────────────────────────────────────────────────────────────

  describe('getBalance', () => {
    it('should return user quota balance', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, purchasedQuotas: 5, splitQuotas: 2, quotaBalance: 7 });

      const result = await service.getBalance('user-1');

      expect(result.purchasedQuotas).toBe(5);
      expect(result.splitQuotas).toBe(2);
      expect(result.estimatedPatrimony).toBe(7 * 2000);
    });

    it('should throw BadRequestException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getBalance('nonexistent')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── purchase ────────────────────────────────────────────────────────────────

  describe('purchase', () => {
    it('should create a WAITING_PAYMENT transaction and open an InfinitePay checkout', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, purchasedQuotas: 0 });

      const result = await service.purchase('user-1', 5);

      // Cria a transação aguardando pagamento e chama o gateway.
      expect(txnRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.WAITING_PAYMENT, gateway: 'infinitepay' }),
      );
      expect(infinitePay.createCheckout).toHaveBeenCalledWith(
        expect.objectContaining({ referenceId: 'txn-1', quantity: 5, amount: 5 * 2000 }),
      );
      expect(result.quantity).toBe(5);
      expect(result.totalAmount).toBe(5 * 2000);
      expect(result.paymentUrl).toBe('https://checkout.infinitepay.io/CHEC_123');
      expect(result.status).toBe(TransactionStatus.WAITING_PAYMENT);
    });

    it('should NOT credit quotas or compute bonuses at purchase time', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, purchasedQuotas: 0 });

      await service.purchase('user-1', 5);

      // O crédito só acontece em confirmPayment (via webhook).
      expect(userRepo.save).not.toHaveBeenCalled();
      expect(bonusCalc.calculateFirstPurchaseBonus).not.toHaveBeenCalled();
      expect(bonusCalc.calculateRepurchaseBonus).not.toHaveBeenCalled();
      expect(splitEngine.incrementQuotasSold).not.toHaveBeenCalled();
      expect(splitEngine.checkAndProcess).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.purchase('nonexistent', 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if quantity below minimum', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      settingsRepo.findOne.mockResolvedValue({ ...mockSettings, minQuotas: 5 });

      await expect(service.purchase('user-1', 2)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if total exceeds maximum per user', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, purchasedQuotas: 195 });
      settingsRepo.findOne.mockResolvedValue({ ...mockSettings, maxQuotasPerUser: 200 });

      await expect(service.purchase('user-1', 10)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── confirmPayment ──────────────────────────────────────────────────────────

  describe('confirmPayment', () => {
    const waitingTxn = () => ({
      id: 'txn-1',
      userId: 'user-1',
      type: TransactionType.PURCHASE,
      status: TransactionStatus.WAITING_PAYMENT,
      amount: 5 * 2000,
      quotasAffected: 5,
    });

    it('should credit quotas, bonuses and split when confirming a first purchase', async () => {
      txnRepo.findOne.mockResolvedValue(waitingTxn());
      userRepo.findOne.mockResolvedValue({ ...mockUser, purchasedQuotas: 0 });

      await service.confirmPayment('txn-1', 'ORDE_999');

      expect(txnRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.COMPLETED, gatewayOrderId: 'ORDE_999' }),
      );
      expect(userRepo.save).toHaveBeenCalled();
      expect(bonusCalc.calculateFirstPurchaseBonus).toHaveBeenCalled();
      expect(splitEngine.incrementQuotasSold).toHaveBeenCalledWith(5);
      expect(splitEngine.checkAndProcess).toHaveBeenCalled();
    });

    it('should call repurchase bonus when user already has quotas', async () => {
      txnRepo.findOne.mockResolvedValue(waitingTxn());
      userRepo.findOne.mockResolvedValue({ ...mockUser, purchasedQuotas: 3 });

      await service.confirmPayment('txn-1');

      expect(bonusCalc.calculateRepurchaseBonus).toHaveBeenCalled();
      expect(bonusCalc.calculateFirstPurchaseBonus).not.toHaveBeenCalled();
    });

    it('should be idempotent: ignore an already COMPLETED transaction', async () => {
      txnRepo.findOne.mockResolvedValue({ ...waitingTxn(), status: TransactionStatus.COMPLETED });

      await service.confirmPayment('txn-1');

      expect(userRepo.save).not.toHaveBeenCalled();
      expect(bonusCalc.calculateFirstPurchaseBonus).not.toHaveBeenCalled();
      expect(splitEngine.incrementQuotasSold).not.toHaveBeenCalled();
    });

    it('should do nothing when the transaction does not exist', async () => {
      txnRepo.findOne.mockResolvedValue(null);

      await service.confirmPayment('missing');

      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('should recalculate sponsor title when the buyer has a sponsor', async () => {
      txnRepo.findOne.mockResolvedValue(waitingTxn());
      userRepo.findOne.mockResolvedValue({ ...mockUser, purchasedQuotas: 0, sponsorId: 'sponsor-id' });

      await service.confirmPayment('txn-1');

      expect(titleCalc.recalculateTitle).toHaveBeenCalledWith('sponsor-id');
    });
  });

  // ─── markFailed ──────────────────────────────────────────────────────────────

  describe('markFailed', () => {
    it('should set the failed status on a waiting transaction', async () => {
      txnRepo.findOne.mockResolvedValue({
        id: 'txn-1',
        status: TransactionStatus.WAITING_PAYMENT,
      });

      await service.markFailed('txn-1', TransactionStatus.DECLINED);

      expect(txnRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.DECLINED }),
      );
    });

    it('should NOT override an already completed transaction (late notification)', async () => {
      txnRepo.findOne.mockResolvedValue({
        id: 'txn-1',
        status: TransactionStatus.COMPLETED,
      });

      await service.markFailed('txn-1', TransactionStatus.EXPIRED);

      expect(txnRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── getTransactions ─────────────────────────────────────────────────────────

  describe('getTransactions', () => {
    it('should return user transactions ordered by date DESC', async () => {
      const fakeTxns = [{ id: 'txn-1' }, { id: 'txn-2' }];
      txnRepo.find.mockResolvedValue(fakeTxns);

      const result = await service.getTransactions('user-1');

      expect(result).toEqual(fakeTxns);
      expect(txnRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  // ─── getConfirmation ─────────────────────────────────────────────────────────

  describe('getConfirmation', () => {
    it('should return transaction when found', async () => {
      const txn = { id: 'txn-1', userId: 'user-1' };
      txnRepo.findOne.mockResolvedValue(txn);

      const result = await service.getConfirmation('txn-1', 'user-1');

      expect(result).toEqual(txn);
    });

    it('should throw BadRequestException when transaction not found', async () => {
      txnRepo.findOne.mockResolvedValue(null);

      await expect(service.getConfirmation('bad-id', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getPartnerLevels ────────────────────────────────────────────────────────

  describe('getPartnerLevels', () => {
    it('should return partner levels ordered by minQuotas ASC', async () => {
      const levels = [{ minQuotas: 1, name: 'socio' }, { minQuotas: 10, name: 'platinum' }];
      partnerReqRepo.find.mockResolvedValue(levels);

      const result = await service.getPartnerLevels();

      expect(result).toEqual(levels);
      expect(partnerReqRepo.find).toHaveBeenCalledWith({ order: { minQuotas: 'ASC' } });
    });
  });
});
