import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { PayoutRequest } from './entities/payout-request.entity';
import { MonthlyPayoutSummary } from './entities/monthly-payout-summary.entity';
import { AdminPaymentCheck } from '../admin/entities/admin-payment-check.entity';
import { User } from '../users/entities/user.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { GlobalFinancialSettings } from '../admin/entities/global-financial-settings.entity';
import { PayoutStatus } from '../../shared/interfaces/enums';

describe('PayoutsService', () => {
  let service: PayoutsService;
  let payoutRepo: any;
  let checkRepo: any;
  let userRepo: any;
  let settingsRepo: any;

  beforeEach(async () => {
    payoutRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    checkRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    userRepo = { findOne: jest.fn().mockResolvedValue(null) };
    settingsRepo = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: getRepositoryToken(PayoutRequest), useValue: payoutRepo },
        { provide: getRepositoryToken(MonthlyPayoutSummary), useValue: {} },
        { provide: getRepositoryToken(AdminPaymentCheck), useValue: checkRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Earning), useValue: {} },
        { provide: getRepositoryToken(GlobalFinancialSettings), useValue: settingsRepo },
      ],
    }).compile();

    service = module.get<PayoutsService>(PayoutsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('calculateDistribution', () => {
    it('should sum unpaid network and quota amounts across pending batches', async () => {
      payoutRepo.find.mockResolvedValue([
        { networkAmount: 100, quotaAmount: 200, bonusPaidAt: null, dividendPaidAt: null, paymentMonth: '2025-03' },
        { networkAmount: 50, quotaAmount: 30, bonusPaidAt: null, dividendPaidAt: null, paymentMonth: '2025-04' },
      ]);

      const result = await service.calculateDistribution('u1');

      expect(result.networkEarnings).toBe(150);
      expect(result.quotaEarnings).toBe(230);
      expect(result.estimatedPayout).toBe(380);
      expect(result.pendingBatches).toBe(2);
      expect(result.nextPaymentMonth).toBe('2025-03');
    });

    it('should ignore already-paid portions of a batch', async () => {
      payoutRepo.find.mockResolvedValue([
        { networkAmount: 100, quotaAmount: 200, bonusPaidAt: new Date(), dividendPaidAt: null, paymentMonth: '2025-03' },
      ]);

      const result = await service.calculateDistribution('u1');

      expect(result.networkEarnings).toBe(0); // bonus already paid
      expect(result.quotaEarnings).toBe(200);
    });

    it('should return zero and null next month when nothing is receivable', async () => {
      payoutRepo.find.mockResolvedValue([]);

      const result = await service.calculateDistribution('u1');

      expect(result.estimatedPayout).toBe(0);
      expect(result.nextPaymentMonth).toBeNull();
      expect(result.pendingBatches).toBe(0);
    });
  });

  describe('requestPayout', () => {
    const baseArgs = ['u1', 100, 50, 'cpf', '12345678900'] as const;

    it('should throw when the payment window is closed', async () => {
      settingsRepo.findOne.mockResolvedValue({ id: 1, paymentDay: 1 });
      // Force "today" to day 28 so it's after paymentDay
      jest.useFakeTimers().setSystemTime(new Date('2025-03-28T10:00:00Z'));

      await expect(service.requestPayout(...baseArgs)).rejects.toThrow(BadRequestException);

      jest.useRealTimers();
    });

    it('should throw when total amount is not positive', async () => {
      settingsRepo.findOne.mockResolvedValue({ id: 1, paymentDay: 28 });
      jest.useFakeTimers().setSystemTime(new Date('2025-03-05T10:00:00Z'));

      await expect(service.requestPayout('u1', 0, 0, 'cpf', 'k')).rejects.toThrow('maior que zero');

      jest.useRealTimers();
    });

    it('should throw when the user does not exist', async () => {
      settingsRepo.findOne.mockResolvedValue({ id: 1, paymentDay: 28 });
      jest.useFakeTimers().setSystemTime(new Date('2025-03-05T10:00:00Z'));
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.requestPayout(...baseArgs)).rejects.toThrow('não encontrado');

      jest.useRealTimers();
    });

    it('should throw when a pending request already exists for the month', async () => {
      settingsRepo.findOne.mockResolvedValue({ id: 1, paymentDay: 28 });
      jest.useFakeTimers().setSystemTime(new Date('2025-03-05T10:00:00Z'));
      userRepo.findOne.mockResolvedValue({ id: 'u1', name: 'A' });
      payoutRepo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(service.requestPayout(...baseArgs)).rejects.toThrow('Já existe uma solicitação pendente');

      jest.useRealTimers();
    });

    it('should create and persist a pending payout on the happy path', async () => {
      settingsRepo.findOne.mockResolvedValue({ id: 1, paymentDay: 28 });
      jest.useFakeTimers().setSystemTime(new Date('2025-03-05T10:00:00Z'));
      userRepo.findOne.mockResolvedValue({ id: 'u1', name: 'Alice' });
      payoutRepo.findOne.mockResolvedValue(null);

      const result = await service.requestPayout(...baseArgs);

      expect(payoutRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({
        userId: 'u1',
        userName: 'Alice',
        amount: 150,
        status: PayoutStatus.PENDING,
      });

      jest.useRealTimers();
    });
  });

  describe('processPayout', () => {
    it('should throw when payout is not found', async () => {
      payoutRepo.findOne.mockResolvedValue(null);
      await expect(service.processPayout('p1', 'approve', 'admin')).rejects.toThrow('não encontrada');
    });

    it('should throw when payout is not pending', async () => {
      payoutRepo.findOne.mockResolvedValue({ id: 'p1', status: PayoutStatus.COMPLETED });
      await expect(service.processPayout('p1', 'approve', 'admin')).rejects.toThrow('não está pendente');
    });

    it('should move to PROCESSING on approve', async () => {
      const payout: any = { id: 'p1', status: PayoutStatus.PENDING };
      payoutRepo.findOne.mockResolvedValue(payout);

      const result = await service.processPayout('p1', 'approve', 'admin');

      expect(result.status).toBe(PayoutStatus.PROCESSING);
      expect(result.processedAt).toBeInstanceOf(Date);
    });

    it('should move to FAILED with a reason on reject', async () => {
      const payout: any = { id: 'p1', status: PayoutStatus.PENDING };
      payoutRepo.findOne.mockResolvedValue(payout);

      const result = await service.processPayout('p1', 'reject', 'admin', 'bad pix');

      expect(result.status).toBe(PayoutStatus.FAILED);
      expect(result.failureReason).toBe('bad pix');
    });
  });

  describe('markAsPaid', () => {
    it('should throw when payout is not found', async () => {
      payoutRepo.findOne.mockResolvedValue(null);
      await expect(service.markAsPaid('p1', 'admin')).rejects.toThrow('não encontrada');
    });

    it('should throw when payout is not in PROCESSING', async () => {
      payoutRepo.findOne.mockResolvedValue({ id: 'p1', status: PayoutStatus.PENDING });
      await expect(service.markAsPaid('p1', 'admin')).rejects.toThrow('aprovado primeiro');
    });

    it('should complete the payout and record an admin check', async () => {
      const payout: any = { id: 'p1', status: PayoutStatus.PROCESSING, referenceMonth: '2025-03' };
      payoutRepo.findOne.mockResolvedValue(payout);

      const result = await service.markAsPaid('p1', 'admin-1');

      expect(result.status).toBe(PayoutStatus.COMPLETED);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(checkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ payoutId: 'p1', checkedBy: 'admin-1' }),
      );
      expect(checkRepo.save).toHaveBeenCalled();
    });
  });

  describe('getMonthSummary', () => {
    it('should aggregate counts and totals by status', async () => {
      payoutRepo.find.mockResolvedValue([
        { amount: 100, status: PayoutStatus.PENDING },
        { amount: 200, status: PayoutStatus.PROCESSING },
        { amount: 300, status: PayoutStatus.COMPLETED },
        { amount: 50, status: PayoutStatus.FAILED },
      ]);

      const result = await service.getMonthSummary('2025-03');

      expect(result.totalRequests).toBe(4);
      expect(result.totalRequested).toBe(650);
      // processing total includes PROCESSING + COMPLETED
      expect(result.totalProcessing).toBe(500);
      expect(result.totalCompleted).toBe(300);
      expect(result.pending).toBe(1);
      expect(result.processing).toBe(1);
      expect(result.completed).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
