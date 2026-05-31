import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SnapshotService } from './snapshot.service';
import { User } from '../../modules/users/entities/user.entity';
import { MonthlyUserSnapshot } from '../../modules/users/entities/monthly-user-snapshot.entity';
import { TitleRequirement } from '../../modules/admin/entities/title-requirement.entity';
import { QuotaTransaction } from '../../modules/quotas/entities/quota-transaction.entity';
import { SplitEvent } from '../../modules/quotas/entities/split-event.entity';

describe('SnapshotService.captureMonth (idempotência vs force)', () => {
  let service: SnapshotService;
  let snapshotRepo: any;
  let userRepo: any;

  beforeEach(async () => {
    snapshotRepo = {
      count: jest.fn(),
      delete: jest.fn().mockResolvedValue({}),
      create: jest.fn((d) => d),
      save: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockResolvedValue([]),
    };
    userRepo = { find: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnapshotService,
        { provide: getRepositoryToken(MonthlyUserSnapshot), useValue: snapshotRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(TitleRequirement), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: getRepositoryToken(QuotaTransaction), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: getRepositoryToken(SplitEvent), useValue: { find: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    service = module.get(SnapshotService);
  });

  it('pula quando já existe e NÃO é force (mês fechado → imutável)', async () => {
    snapshotRepo.count.mockResolvedValue(5);

    const res = await service.captureMonth('2026-06');

    expect(res.skipped).toBe(true);
    expect(snapshotRepo.delete).not.toHaveBeenCalled();
    expect(snapshotRepo.save).not.toHaveBeenCalled();
  });

  it('recaptura quando já existe e É force (mês aberto → reflete rede atual)', async () => {
    snapshotRepo.count.mockResolvedValue(5);

    const res = await service.captureMonth('2026-06', { force: true });

    expect(snapshotRepo.delete).toHaveBeenCalledWith({ month: '2026-06' });
    expect(res.skipped).toBe(false);
    expect(snapshotRepo.save).toHaveBeenCalled();
  });
});
