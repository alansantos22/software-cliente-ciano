import { SplitCheckJob } from './split-check.job';
import { TitleRecalculationJob } from './title-recalculation.job';
import { TrashPurgeJob } from './trash-purge.job';
import { InactivityCheckJob } from './inactivity-check.job';
import { MonthlyCloseJob } from './monthly-close.job';

// Silence the loggers so error-path tests don't spam the console.
jest.spyOn(require('@nestjs/common').Logger.prototype, 'log').mockImplementation(() => undefined);
jest.spyOn(require('@nestjs/common').Logger.prototype, 'warn').mockImplementation(() => undefined);
jest.spyOn(require('@nestjs/common').Logger.prototype, 'error').mockImplementation(() => undefined);

describe('SplitCheckJob', () => {
  it('applies pending events', async () => {
    const splitEngine = { applyPendingEvent: jest.fn().mockResolvedValue(undefined) } as any;
    await new SplitCheckJob(splitEngine).handleSplitCheck();
    expect(splitEngine.applyPendingEvent).toHaveBeenCalled();
  });

  it('swallows errors from the split engine', async () => {
    const splitEngine = { applyPendingEvent: jest.fn().mockRejectedValue(new Error('boom')) } as any;
    await expect(new SplitCheckJob(splitEngine).handleSplitCheck()).resolves.toBeUndefined();
  });
});

describe('TitleRecalculationJob', () => {
  it('recalculates on startup', async () => {
    const titleCalc = { recalculateAllTitles: jest.fn().mockResolvedValue(undefined) } as any;
    await new TitleRecalculationJob(titleCalc).onApplicationBootstrap();
    expect(titleCalc.recalculateAllTitles).toHaveBeenCalled();
  });

  it('recalculates on the daily cron', async () => {
    const titleCalc = { recalculateAllTitles: jest.fn().mockResolvedValue(undefined) } as any;
    await new TitleRecalculationJob(titleCalc).handleTitleRecalculation();
    expect(titleCalc.recalculateAllTitles).toHaveBeenCalled();
  });

  it('swallows errors on the cron path', async () => {
    const titleCalc = { recalculateAllTitles: jest.fn().mockRejectedValue(new Error('x')) } as any;
    await expect(new TitleRecalculationJob(titleCalc).handleTitleRecalculation()).resolves.toBeUndefined();
  });
});

describe('TrashPurgeJob', () => {
  it('permanently removes users deleted more than 30 days ago', async () => {
    const expired = [{ id: 'u1' }, { id: 'u2' }];
    const userRepo = {
      find: jest.fn().mockResolvedValue(expired),
      remove: jest.fn().mockResolvedValue(undefined),
    } as any;

    await new TrashPurgeJob(userRepo).handleTrashPurge();

    expect(userRepo.remove).toHaveBeenCalledTimes(2);
  });

  it('logs a clean trash when nothing is expired', async () => {
    const userRepo = { find: jest.fn().mockResolvedValue([]), remove: jest.fn() } as any;
    await new TrashPurgeJob(userRepo).handleTrashPurge();
    expect(userRepo.remove).not.toHaveBeenCalled();
  });

  it('swallows errors', async () => {
    const userRepo = { find: jest.fn().mockRejectedValue(new Error('db')), remove: jest.fn() } as any;
    await expect(new TrashPurgeJob(userRepo).handleTrashPurge()).resolves.toBeUndefined();
  });
});

describe('InactivityCheckJob', () => {
  it('marks long-inactive active users as inactive', async () => {
    const users = [{ id: 'u1', isActive: true }, { id: 'u2', isActive: true }];
    const userRepo = {
      find: jest.fn().mockResolvedValue(users),
      save: jest.fn().mockResolvedValue(undefined),
    } as any;

    await new InactivityCheckJob(userRepo).handleInactivityCheck();

    expect(users[0].isActive).toBe(false);
    expect(userRepo.save).toHaveBeenCalledTimes(2);
  });

  it('does nothing when all users are active', async () => {
    const userRepo = { find: jest.fn().mockResolvedValue([]), save: jest.fn() } as any;
    await new InactivityCheckJob(userRepo).handleInactivityCheck();
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('swallows errors', async () => {
    const userRepo = { find: jest.fn().mockRejectedValue(new Error('db')), save: jest.fn() } as any;
    await expect(new InactivityCheckJob(userRepo).handleInactivityCheck()).resolves.toBeUndefined();
  });
});

describe('MonthlyCloseJob', () => {
  const setup = (overrides: any = {}) => {
    const configRepo = {
      findOne: jest.fn().mockResolvedValue({ isLocked: false }),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides.configRepo,
    };
    const titleCalc = { recalculateAllTitles: jest.fn().mockResolvedValue(undefined) };
    const snapshot = { captureMonth: jest.fn().mockResolvedValue({ skipped: false, created: 5 }) };
    return { configRepo, titleCalc, snapshot };
  };

  it('locks config, recalculates titles and captures the snapshot', async () => {
    const { configRepo, titleCalc, snapshot } = setup();
    await new MonthlyCloseJob(configRepo as any, titleCalc as any, snapshot as any).handleMonthlyClose();

    expect(configRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isLocked: true }));
    expect(titleCalc.recalculateAllTitles).toHaveBeenCalled();
    expect(snapshot.captureMonth).toHaveBeenCalled();
  });

  it('handles a skipped (already existing) snapshot', async () => {
    const { configRepo, titleCalc, snapshot } = setup();
    snapshot.captureMonth.mockResolvedValue({ skipped: true });
    await new MonthlyCloseJob(configRepo as any, titleCalc as any, snapshot as any).handleMonthlyClose();
    expect(snapshot.captureMonth).toHaveBeenCalled();
  });

  it('proceeds when there is no month config to lock', async () => {
    const { configRepo, titleCalc, snapshot } = setup({ configRepo: { findOne: jest.fn().mockResolvedValue(null) } });
    await new MonthlyCloseJob(configRepo as any, titleCalc as any, snapshot as any).handleMonthlyClose();
    expect(configRepo.save).not.toHaveBeenCalled();
    expect(titleCalc.recalculateAllTitles).toHaveBeenCalled();
  });

  it('swallows errors', async () => {
    const { configRepo, titleCalc, snapshot } = setup();
    titleCalc.recalculateAllTitles.mockRejectedValue(new Error('boom'));
    await expect(
      new MonthlyCloseJob(configRepo as any, titleCalc as any, snapshot as any).handleMonthlyClose(),
    ).resolves.toBeUndefined();
  });
});
