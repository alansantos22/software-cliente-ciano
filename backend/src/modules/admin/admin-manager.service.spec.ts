import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AdminManagerService } from './admin-manager.service';
import { User } from '../users/entities/user.entity';
import { QuotaTransaction } from '../quotas/entities/quota-transaction.entity';
import { QuotaSystemState } from '../quotas/entities/quota-system-state.entity';
import { Earning } from '../earnings/entities/earning.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { GlobalFinancialSettings } from './entities/global-financial-settings.entity';
import { BonusCalculatorService } from '../../core/bonus/bonus-calculator.service';
import { SplitEngineService } from '../../core/split/split-engine.service';
import { TitleCalculatorService } from '../../core/title/title-calculator.service';
import { PartnerLevel } from '../../shared/interfaces/enums';

jest.mock('argon2', () => ({
  hash: jest.fn(async () => 'mgr-hash'),
  verify: jest.fn(async () => true),
}));

const makeUser = (over: Partial<User> = {}): User =>
  ({
    id: 'u1',
    name: 'User',
    purchasedQuotas: 0,
    adminGrantedQuotas: 0,
    splitQuotas: 0,
    quotaBalance: 0,
    sponsorId: null,
    isActive: false,
    partnerLevel: PartnerLevel.SOCIO,
    ...over,
  }) as unknown as User;

describe('AdminManagerService', () => {
  let service: AdminManagerService;
  let userRepo: any;
  let txnRepo: any;
  let stateRepo: any;
  let earningRepo: any;
  let payoutRepo: any;
  let settingsRepo: any;
  let bonusCalc: any;
  let splitEngine: any;
  let titleCalc: any;

  beforeEach(async () => {
    userRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn(async (u) => u),
      update: jest.fn().mockResolvedValue(undefined),
      increment: jest.fn().mockResolvedValue(undefined),
      decrement: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    txnRepo = {
      create: jest.fn((x) => ({ id: 'txn-1', ...x })),
      save: jest.fn(async (x) => x),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
      })),
    };
    stateRepo = { findOne: jest.fn(), save: jest.fn(async (x) => x) };
    earningRepo = { delete: jest.fn().mockResolvedValue({ affected: 0 }) };
    payoutRepo = { delete: jest.fn().mockResolvedValue({ affected: 0 }) };
    settingsRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, managerPasswordHash: 'mgr-hash' }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    bonusCalc = {
      calculateFirstPurchaseBonus: jest.fn().mockResolvedValue(undefined),
      calculateRepurchaseBonus: jest.fn().mockResolvedValue(undefined),
    };
    splitEngine = {
      getState: jest.fn().mockResolvedValue({ currentQuotaPrice: 2500 }),
      incrementQuotasSold: jest.fn().mockResolvedValue(undefined),
      checkAndProcess: jest.fn().mockResolvedValue(undefined),
    };
    titleCalc = {
      recalculateTitle: jest.fn().mockResolvedValue(undefined),
      recalculateTitleToRoot: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminManagerService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(QuotaTransaction), useValue: txnRepo },
        { provide: getRepositoryToken(QuotaSystemState), useValue: stateRepo },
        { provide: getRepositoryToken(Earning), useValue: earningRepo },
        { provide: getRepositoryToken(PayoutRequest), useValue: payoutRepo },
        { provide: getRepositoryToken(GlobalFinancialSettings), useValue: settingsRepo },
        { provide: BonusCalculatorService, useValue: bonusCalc },
        { provide: SplitEngineService, useValue: splitEngine },
        { provide: TitleCalculatorService, useValue: titleCalc },
      ],
    }).compile();

    service = module.get<AdminManagerService>(AdminManagerService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('manager password', () => {
    it('hasPassword should reflect whether a hash is set', async () => {
      settingsRepo.findOne.mockResolvedValue({ managerPasswordHash: 'x' });
      expect(await service.hasPassword()).toEqual({ hasPassword: true });

      settingsRepo.findOne.mockResolvedValue({ managerPasswordHash: null });
      expect(await service.hasPassword()).toEqual({ hasPassword: false });
    });

    it('setPassword should hash and persist', async () => {
      await service.setPassword('secret');
      expect(argon2.hash).toHaveBeenCalledWith('secret');
      expect(settingsRepo.update).toHaveBeenCalledWith(1, { managerPasswordHash: 'mgr-hash' });
    });

    it('setPassword should create the row when id=1 is missing (update no-op)', async () => {
      settingsRepo.update.mockResolvedValue({ affected: 0 });
      await service.setPassword('secret');
      expect(settingsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, managerPasswordHash: 'mgr-hash' }),
      );
    });

    it('verifyPassword should throw when no manager password is configured', async () => {
      settingsRepo.findOne.mockResolvedValue({ managerPasswordHash: null });
      await expect(service.verifyPassword('x')).rejects.toThrow('não configurada');
    });

    it('verifyPassword should throw when the password is invalid', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      await expect(service.verifyPassword('wrong')).rejects.toThrow('inválida');
    });

    it('verifyPassword should resolve valid on success', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      expect(await service.verifyPassword('right')).toEqual({ valid: true });
    });
  });

  describe('addQuotas', () => {
    it('should throw when the user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.addQuotas('u1', 5, 'pw')).rejects.toThrow('não encontrado');
    });

    it('should grant quotas, recompute the balance and log a transaction', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ purchasedQuotas: 10, adminGrantedQuotas: 2, splitQuotas: 1 }),
      );

      const result = await service.addQuotas('u1', 5, 'pw', 'bonus');

      // adminGranted 2 -> 7, balance = 10 + 7 + 1 = 18
      expect(result.newBalance).toBe(18);
      expect(txnRepo.save).toHaveBeenCalled();
      const txn = txnRepo.create.mock.calls[0][0];
      expect(txn.quotasAffected).toBe(5);
    });
  });

  describe('removeQuotas', () => {
    it('should reject removing more admin quotas than available', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ adminGrantedQuotas: 2 }));
      await expect(service.removeQuotas('u1', 5, 'pw')).rejects.toThrow('Disponível: 2');
    });

    it('should remove admin quotas and recompute the balance', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ purchasedQuotas: 10, adminGrantedQuotas: 5, splitQuotas: 0 }),
      );

      const result = await service.removeQuotas('u1', 3, 'pw');

      // admin 5 -> 2, balance = 10 + 2 + 0 = 12
      expect(result.newBalance).toBe(12);
    });

    it('should support removing split quotas via the source flag', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ purchasedQuotas: 0, adminGrantedQuotas: 0, splitQuotas: 4 }),
      );

      const result = await service.removeQuotas('u1', 2, 'pw', undefined, 'split');

      expect(result.newBalance).toBe(2); // 0 + 0 + 2
    });
  });

  describe('changeSponsor', () => {
    it('should reject self-sponsorship', async () => {
      userRepo.findOne.mockImplementation(({ where }: any) =>
        Promise.resolve(makeUser({ id: where.id })),
      );
      await expect(service.changeSponsor('u1', 'u1', 'pw')).rejects.toThrow('próprio patrocinador');
    });

    it('should reject when the new sponsor does not exist', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(makeUser({ id: 'u1', sponsorId: 'old' })) // user
        .mockResolvedValueOnce(null); // new sponsor
      await expect(service.changeSponsor('u1', 'new', 'pw')).rejects.toThrow('Novo patrocinador não encontrado');
    });

    it('should reparent the user and recalculate titles up all affected chains', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(makeUser({ id: 'u1', sponsorId: 'old' })) // user
        .mockResolvedValueOnce(makeUser({ id: 'new' })); // new sponsor

      await service.changeSponsor('u1', 'new', 'pw');

      expect(userRepo.decrement).toHaveBeenCalledWith({ id: 'old' }, 'directCount', 1);
      expect(userRepo.increment).toHaveBeenCalledWith({ id: 'new' }, 'directCount', 1);
      expect(titleCalc.recalculateTitleToRoot).toHaveBeenCalledWith('u1');
      expect(titleCalc.recalculateTitleToRoot).toHaveBeenCalledWith('old');
      expect(titleCalc.recalculateTitleToRoot).toHaveBeenCalledWith('new');
    });
  });

  describe('setUserActive', () => {
    it('should toggle the active flag', async () => {
      const user = makeUser({ id: 'u1', isActive: false });
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.setUserActive('u1', true, 'pw');

      expect(user.isActive).toBe(true);
      expect(result.isActive).toBe(true);
    });
  });

  describe('deleteUser', () => {
    it('should soft-delete and reparent downlines to the user sponsor', async () => {
      const user = makeUser({ id: 'u1', sponsorId: 'sp' });
      userRepo.findOne.mockResolvedValue(user);
      userRepo.find.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }]);

      const result = await service.deleteUser('u1', 'pw');

      expect(userRepo.update).toHaveBeenCalledWith({ sponsorId: 'u1' }, { sponsorId: 'sp' });
      expect(userRepo.increment).toHaveBeenCalledWith({ id: 'sp' }, 'directCount', 2);
      expect(user.deletedAt).toBeInstanceOf(Date);
      expect(result.reparentedDownlines).toBe(2);
    });

    it('should soft-delete a leaf user without reparenting', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ id: 'u1', sponsorId: 'sp' }));
      userRepo.find.mockResolvedValue([]); // no downlines

      const result = await service.deleteUser('u1', 'pw');

      expect(userRepo.update).not.toHaveBeenCalled();
      expect(result.reparentedDownlines).toBe(0);
    });
  });

  describe('restoreUser', () => {
    it('should throw when the user is not in the trash', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.restoreUser('u1', 'pw')).rejects.toThrow('lixeira');
    });

    it('should clear deletedAt on restore', async () => {
      const user = makeUser({ id: 'u1', deletedAt: new Date() } as any);
      userRepo.findOne.mockResolvedValue(user);

      await service.restoreUser('u1', 'pw');

      expect(user.deletedAt).toBeNull();
      expect(userRepo.save).toHaveBeenCalledWith(user);
    });
  });

  describe('simulatePurchase', () => {
    it('should apply a first purchase: bonus, level, counters and price check', async () => {
      const user = makeUser({ id: 'u1', purchasedQuotas: 0, sponsorId: 'sp' });
      userRepo.findOne.mockResolvedValue(user);
      splitEngine.getState.mockResolvedValue({ currentQuotaPrice: 2500 });

      const result = await service.simulatePurchase('u1', 2, 'pw');

      expect(result.totalAmount).toBe(5000); // 2500 * 2
      expect(bonusCalc.calculateFirstPurchaseBonus).toHaveBeenCalled();
      expect(bonusCalc.calculateRepurchaseBonus).not.toHaveBeenCalled();
      expect(splitEngine.incrementQuotasSold).toHaveBeenCalledWith(2);
      expect(splitEngine.checkAndProcess).toHaveBeenCalled();
      expect(titleCalc.recalculateTitle).toHaveBeenCalledWith('sp');
      expect(user.isActive).toBe(true);
      expect(result.simulated).toBe(true);
    });

    it('should use the repurchase bonus path when the user already owns quotas', async () => {
      const user = makeUser({ id: 'u1', purchasedQuotas: 5 });
      userRepo.findOne.mockResolvedValue(user);

      await service.simulatePurchase('u1', 1, 'pw');

      expect(bonusCalc.calculateRepurchaseBonus).toHaveBeenCalled();
      expect(bonusCalc.calculateFirstPurchaseBonus).not.toHaveBeenCalled();
    });

    it('should promote the partner level based on accumulated quotas', async () => {
      const user = makeUser({ id: 'u1', purchasedQuotas: 19 });
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.simulatePurchase('u1', 1, 'pw'); // -> 20 quotas

      expect(result.partnerLevel).toBe(PartnerLevel.VIP);
    });
  });

  describe('purgeTestData', () => {
    const ORIGINAL_ENV = process.env.NODE_ENV;
    afterEach(() => {
      process.env.NODE_ENV = ORIGINAL_ENV;
    });

    it('should refuse to run in production', async () => {
      process.env.NODE_ENV = 'production';
      await expect(service.purgeTestData()).rejects.toThrow(ForbiddenException);
    });

    it('should be a no-op when there are no test users', async () => {
      process.env.NODE_ENV = 'test';
      userRepo.find.mockResolvedValue([]);

      const result = await service.purgeTestData();

      expect(result.deletedUsers).toBe(0);
      expect(txnRepo.delete).not.toHaveBeenCalled();
    });

    it('should delete test data and correct the global quota counter', async () => {
      process.env.NODE_ENV = 'test';
      userRepo.find.mockResolvedValue([{ id: 't1' }, { id: 't2' }]);
      txnRepo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '7' }),
      });
      txnRepo.delete.mockResolvedValue({ affected: 4 });
      earningRepo.delete.mockResolvedValue({ affected: 3 });
      payoutRepo.delete.mockResolvedValue({ affected: 1 });
      const state = { totalQuotasSold: 100 };
      stateRepo.findOne.mockResolvedValue(state);

      const result = await service.purgeTestData();

      expect(result).toEqual({
        deletedUsers: 2,
        deletedTransactions: 4,
        deletedEarnings: 3,
        deletedPayouts: 1,
      });
      expect(state.totalQuotasSold).toBe(93); // 100 - 7
      expect(stateRepo.save).toHaveBeenCalledWith(state);
    });
  });
});
