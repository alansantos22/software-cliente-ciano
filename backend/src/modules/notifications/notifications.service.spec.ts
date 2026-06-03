import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { PayoutRequest } from '../payouts/entities/payout-request.entity';
import { QuotaSystemState } from '../quotas/entities/quota-system-state.entity';
import { PayoutStatus, SplitEventType } from '../../shared/interfaces/enums';

const makeDeleteQB = () => {
  const qb: any = {
    delete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  };
  return qb;
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notifRepo: any;
  let userRepo: any;
  let payoutRepo: any;
  let stateRepo: any;

  beforeEach(async () => {
    notifRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      createQueryBuilder: jest.fn(() => makeDeleteQB()),
    };
    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };
    payoutRepo = { find: jest.fn().mockResolvedValue([]) };
    stateRepo = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: notifRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(PayoutRequest), useValue: payoutRepo },
        { provide: getRepositoryToken(QuotaSystemState), useValue: stateRepo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getUnreadCount', () => {
    it('should count unread notifications for the user', async () => {
      notifRepo.count.mockResolvedValue(4);

      const count = await service.getUnreadCount('u1');

      expect(count).toBe(4);
      expect(notifRepo.count).toHaveBeenCalledWith({ where: { userId: 'u1', isRead: false } });
    });
  });

  describe('markRead / markAllRead', () => {
    it('markRead should update the single notification scoped to the user', async () => {
      await service.markRead('n1', 'u1');
      expect(notifRepo.update).toHaveBeenCalledWith({ id: 'n1', userId: 'u1' }, { isRead: true });
    });

    it('markAllRead should update all notifications for the user', async () => {
      await service.markAllRead('u1');
      expect(notifRepo.update).toHaveBeenCalledWith({ userId: 'u1' }, { isRead: true });
    });
  });

  describe('getAll (sync + fetch)', () => {
    it('should return persisted notifications ordered by createdAt DESC', async () => {
      const stored = [{ id: 'n1' }, { id: 'n2' }];
      // first find() call is the stale-cleanup scan inside sync(); final find() returns stored
      notifRepo.find.mockResolvedValueOnce([]).mockResolvedValueOnce(stored);

      const result = await service.getAll('u1');

      expect(result).toEqual(stored);
      expect(notifRepo.find).toHaveBeenLastCalledWith({
        where: { userId: 'u1' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should create a new notification for an inactive account (expired)', async () => {
      const expired = new Date();
      expired.setMonth(expired.getMonth() - 12); // > 6 months ago → daysLeft <= 0
      userRepo.findOne.mockResolvedValue({ id: 'u1', lastPurchaseDate: expired, name: 'A' });
      notifRepo.findOne.mockResolvedValue(null); // not existing yet

      await service.getAll('u1');

      expect(notifRepo.save).toHaveBeenCalled();
      const created = notifRepo.create.mock.calls.find(
        (c: any[]) => c[0].referenceKey === 'account_expiry',
      );
      expect(created).toBeDefined();
      expect(created[0].type).toBe('error');
    });

    it('should emit an expiry warning when within 30 days', async () => {
      const soon = new Date();
      soon.setMonth(soon.getMonth() - 6);
      soon.setDate(soon.getDate() + 15); // ~15 days left
      userRepo.findOne.mockResolvedValue({ id: 'u1', lastPurchaseDate: soon, name: 'A' });

      await service.getAll('u1');

      const created = notifRepo.create.mock.calls.find(
        (c: any[]) => c[0].referenceKey === 'account_expiry',
      );
      expect(created[0].type).toBe('warning');
    });

    it('should update an existing notification instead of recreating it', async () => {
      const expired = new Date();
      expired.setMonth(expired.getMonth() - 12);
      userRepo.findOne.mockResolvedValue({ id: 'u1', lastPurchaseDate: expired, name: 'A' });
      notifRepo.findOne.mockResolvedValue({ id: 'existing', referenceKey: 'account_expiry' });

      await service.getAll('u1');

      expect(notifRepo.update).toHaveBeenCalledWith(
        'existing',
        expect.objectContaining({ type: 'error' }),
      );
    });

    it('should generate a pending split-event notification from system state', async () => {
      stateRepo.findOne.mockResolvedValue({ id: 1, pendingEventType: SplitEventType.SPLIT });

      await service.getAll('u1');

      const created = notifRepo.create.mock.calls.find((c: any[]) =>
        String(c[0].referenceKey).startsWith('pending_event_'),
      );
      expect(created).toBeDefined();
      expect(created[0].icon).toBe('bolt');
    });

    it('should generate a payout notification for recent completed payouts', async () => {
      payoutRepo.find.mockResolvedValue([
        {
          id: 'p1',
          amount: 1000,
          referenceMonth: '2025-03',
          status: PayoutStatus.COMPLETED,
          completedAt: new Date(), // recent
        },
      ]);

      await service.getAll('u1');

      const created = notifRepo.create.mock.calls.find(
        (c: any[]) => c[0].referenceKey === 'payout_p1',
      );
      expect(created).toBeDefined();
      expect(created[0].type).toBe('payment');
    });

    it('should skip payouts completed more than 3 months ago', async () => {
      const old = new Date();
      old.setMonth(old.getMonth() - 6);
      payoutRepo.find.mockResolvedValue([
        { id: 'pOld', amount: 1000, referenceMonth: '2024-12', completedAt: old },
      ]);

      await service.getAll('u1');

      const created = notifRepo.create.mock.calls.find(
        (c: any[]) => c[0].referenceKey === 'payout_pOld',
      );
      expect(created).toBeUndefined();
    });

    it('should delete stale notifications no longer relevant', async () => {
      const qb = makeDeleteQB();
      notifRepo.createQueryBuilder.mockReturnValue(qb);
      // sync's stale-scan find() returns a notif whose key is not in currentKeys
      notifRepo.find
        .mockResolvedValueOnce([{ id: 'stale', referenceKey: 'gone_key' }])
        .mockResolvedValueOnce([]);

      await service.getAll('u1');

      expect(qb.delete).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('id IN (:...ids)', { ids: ['stale'] });
      expect(qb.execute).toHaveBeenCalled();
    });
  });
});
