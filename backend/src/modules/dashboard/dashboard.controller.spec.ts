import { DashboardController } from './dashboard.controller';
import { User } from '../users/entities/user.entity';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: any;
  const user = { id: 'u1' } as User;

  beforeEach(() => {
    service = {
      getKpis: jest.fn().mockResolvedValue('kpis'),
      getPaymentWindow: jest.fn().mockResolvedValue('window'),
      getQuotaChart: jest.fn().mockResolvedValue('chart'),
      getRecentActivity: jest.fn().mockResolvedValue('activity'),
      getNotifications: jest.fn().mockResolvedValue('notifs'),
      getTopEarners: jest.fn().mockResolvedValue('earners'),
    };
    controller = new DashboardController(service);
  });

  it('getKpis delegates the user id', async () => {
    expect(await controller.getKpis(user)).toBe('kpis');
    expect(service.getKpis).toHaveBeenCalledWith('u1');
  });

  it('getPaymentWindow delegates', async () => {
    expect(await controller.getPaymentWindow()).toBe('window');
  });

  it('getQuotaChart delegates the user id', async () => {
    expect(await controller.getQuotaChart(user)).toBe('chart');
    expect(service.getQuotaChart).toHaveBeenCalledWith('u1');
  });

  it('getRecentActivity delegates the user id', async () => {
    expect(await controller.getRecentActivity(user)).toBe('activity');
    expect(service.getRecentActivity).toHaveBeenCalledWith('u1');
  });

  it('getNotifications delegates the user id', async () => {
    expect(await controller.getNotifications(user)).toBe('notifs');
    expect(service.getNotifications).toHaveBeenCalledWith('u1');
  });

  it('getTopEarners delegates', async () => {
    expect(await controller.getTopEarners()).toBe('earners');
  });
});
