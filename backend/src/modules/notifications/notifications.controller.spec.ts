import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: any;
  const req = { user: { id: 'u1' } };

  beforeEach(() => {
    service = {
      getAll: jest.fn().mockResolvedValue('all'),
      getUnreadCount: jest.fn().mockResolvedValue(3),
      markAllRead: jest.fn().mockResolvedValue(undefined),
      markRead: jest.fn().mockResolvedValue(undefined),
    };
    controller = new NotificationsController(service);
  });

  it('getAll delegates the user id from the request', async () => {
    expect(await controller.getAll(req)).toBe('all');
    expect(service.getAll).toHaveBeenCalledWith('u1');
  });

  it('getUnreadCount delegates the user id', async () => {
    expect(await controller.getUnreadCount(req)).toBe(3);
    expect(service.getUnreadCount).toHaveBeenCalledWith('u1');
  });

  it('markAllRead delegates the user id', async () => {
    await controller.markAllRead(req);
    expect(service.markAllRead).toHaveBeenCalledWith('u1');
  });

  it('markRead delegates id and user id', async () => {
    await controller.markRead('n1', req);
    expect(service.markRead).toHaveBeenCalledWith('n1', 'u1');
  });
});
