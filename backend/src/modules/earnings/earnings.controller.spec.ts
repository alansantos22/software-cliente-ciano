import { EarningsController } from './earnings.controller';
import { User } from '../users/entities/user.entity';
import { BonusType } from '../../shared/interfaces/enums';

describe('EarningsController', () => {
  let controller: EarningsController;
  let service: any;
  const user = { id: 'u1' } as User;

  beforeEach(() => {
    service = {
      getEarnings: jest.fn().mockResolvedValue('earnings'),
      getOverview: jest.fn().mockResolvedValue('overview'),
      getMonthlySummary: jest.fn().mockResolvedValue('monthly'),
      getByType: jest.fn().mockResolvedValue('byType'),
    };
    controller = new EarningsController(service);
  });

  it('getEarnings coerces query params and forwards them', async () => {
    await controller.getEarnings(user, '2' as any, '10' as any, '2025-03', '3');
    expect(service.getEarnings).toHaveBeenCalledWith('u1', 2, 10, '2025-03', 3);
  });

  it('getEarnings treats an empty level as undefined', async () => {
    await controller.getEarnings(user, 1, 20, undefined, '');
    expect(service.getEarnings).toHaveBeenCalledWith('u1', 1, 20, undefined, undefined);
  });

  it('getOverview delegates the user id', async () => {
    expect(await controller.getOverview(user)).toBe('overview');
    expect(service.getOverview).toHaveBeenCalledWith('u1');
  });

  it('getMonthlySummary delegates user id and month', async () => {
    await controller.getMonthlySummary(user, '2025-03');
    expect(service.getMonthlySummary).toHaveBeenCalledWith('u1', '2025-03');
  });

  it('getByType delegates user id and bonus type', async () => {
    await controller.getByType(user, BonusType.DIVIDEND);
    expect(service.getByType).toHaveBeenCalledWith('u1', BonusType.DIVIDEND);
  });
});
