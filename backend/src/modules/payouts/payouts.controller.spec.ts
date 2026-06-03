import { PayoutsController } from './payouts.controller';
import { User } from '../users/entities/user.entity';

describe('PayoutsController', () => {
  let controller: PayoutsController;
  let service: any;
  const user = { id: 'u1' } as User;

  beforeEach(() => {
    service = {
      calculateDistribution: jest.fn().mockResolvedValue('calc'),
      requestPayout: jest.fn().mockResolvedValue('request'),
      getMyPayouts: jest.fn().mockResolvedValue('my'),
      getMyPayoutDetails: jest.fn().mockResolvedValue('details'),
      getPendingPayouts: jest.fn().mockResolvedValue('pending'),
      processPayout: jest.fn().mockResolvedValue('processed'),
      markAsPaid: jest.fn().mockResolvedValue('paid'),
      getMonthSummary: jest.fn().mockResolvedValue('summary'),
    };
    controller = new PayoutsController(service);
  });

  it('calculateDistribution delegates the user id', async () => {
    expect(await controller.calculateDistribution(user)).toBe('calc');
    expect(service.calculateDistribution).toHaveBeenCalledWith('u1');
  });

  it('requestPayout spreads the DTO fields into the service call', async () => {
    const dto = { quotaAmount: 100, networkAmount: 50, pixKeyType: 'cpf', pixKey: 'k' } as any;
    await controller.requestPayout(user, dto);
    expect(service.requestPayout).toHaveBeenCalledWith('u1', 100, 50, 'cpf', 'k');
  });

  it('getMyPayouts delegates the user id', async () => {
    expect(await controller.getMyPayouts(user)).toBe('my');
    expect(service.getMyPayouts).toHaveBeenCalledWith('u1');
  });

  it('getMyPayoutDetails delegates payout id and user id', async () => {
    await controller.getMyPayoutDetails(user, 'p1');
    expect(service.getMyPayoutDetails).toHaveBeenCalledWith('p1', 'u1');
  });

  it('getPendingPayouts delegates', async () => {
    expect(await controller.getPendingPayouts()).toBe('pending');
  });

  it('processPayout forwards DTO fields and the admin user id', async () => {
    const dto = { payoutRequestId: 'p1', action: 'approve', rejectionReason: 'r' } as any;
    await controller.processPayout(user, dto);
    expect(service.processPayout).toHaveBeenCalledWith('p1', 'approve', 'u1', 'r');
  });

  it('markAsPaid forwards payout id and admin id', async () => {
    await controller.markAsPaid(user, 'p1');
    expect(service.markAsPaid).toHaveBeenCalledWith('p1', 'u1');
  });

  it('getMonthSummary uses the provided month', async () => {
    await controller.getMonthSummary('2025-03');
    expect(service.getMonthSummary).toHaveBeenCalledWith('2025-03');
  });

  it('getMonthSummary defaults to the current month when none is given', async () => {
    await controller.getMonthSummary(undefined as any);
    const arg = service.getMonthSummary.mock.calls[0][0];
    expect(arg).toMatch(/^\d{4}-\d{2}$/);
  });
});
