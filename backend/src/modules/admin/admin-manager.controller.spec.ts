import { AdminManagerController } from './admin-manager.controller';

describe('AdminManagerController', () => {
  let controller: AdminManagerController;
  let service: any;

  beforeEach(() => {
    service = {
      hasPassword: jest.fn().mockResolvedValue({ hasPassword: true }),
      setPassword: jest.fn().mockResolvedValue('set'),
      verifyPassword: jest.fn().mockResolvedValue({ valid: true }),
      getUsers: jest.fn().mockResolvedValue('users'),
      addQuotas: jest.fn().mockResolvedValue('added'),
      removeQuotas: jest.fn().mockResolvedValue('removed'),
      changeSponsor: jest.fn().mockResolvedValue('changed'),
      setUserActive: jest.fn().mockResolvedValue('active'),
      deleteUser: jest.fn().mockResolvedValue('deleted'),
      restoreUser: jest.fn().mockResolvedValue('restored'),
      getTrash: jest.fn().mockResolvedValue('trash'),
      simulatePurchase: jest.fn().mockResolvedValue('simulated'),
      purgeTestData: jest.fn().mockResolvedValue('purged'),
    };
    controller = new AdminManagerController(service);
  });

  it('hasPassword delegates', async () => {
    expect(await controller.hasPassword()).toEqual({ hasPassword: true });
  });

  it('setPassword forwards the password', async () => {
    await controller.setPassword({ password: 'pw' } as any);
    expect(service.setPassword).toHaveBeenCalledWith('pw');
  });

  it('verifyPassword forwards the manager password', async () => {
    await controller.verifyPassword({ managerPassword: 'pw' } as any);
    expect(service.verifyPassword).toHaveBeenCalledWith('pw');
  });

  it('getUsers delegates', async () => {
    expect(await controller.getUsers()).toBe('users');
  });

  it('addQuotas forwards id, quantity, password and reason', async () => {
    await controller.addQuotas('u1', { quantity: 5, managerPassword: 'pw', reason: 'r' } as any);
    expect(service.addQuotas).toHaveBeenCalledWith('u1', 5, 'pw', 'r');
  });

  it('removeQuotas forwards id, quantity, password, reason and source', async () => {
    await controller.removeQuotas('u1', { quantity: 2, managerPassword: 'pw', reason: 'r', source: 'split' } as any);
    expect(service.removeQuotas).toHaveBeenCalledWith('u1', 2, 'pw', 'r', 'split');
  });

  it('changeSponsor forwards id, new sponsor and password', async () => {
    await controller.changeSponsor('u1', { newSponsorId: 'sp', managerPassword: 'pw' } as any);
    expect(service.changeSponsor).toHaveBeenCalledWith('u1', 'sp', 'pw');
  });

  it('setUserActive forwards id, flag and password', async () => {
    await controller.setUserActive('u1', { isActive: false, managerPassword: 'pw' } as any);
    expect(service.setUserActive).toHaveBeenCalledWith('u1', false, 'pw');
  });

  it('deleteUser forwards id and password', async () => {
    await controller.deleteUser('u1', { managerPassword: 'pw' } as any);
    expect(service.deleteUser).toHaveBeenCalledWith('u1', 'pw');
  });

  it('restoreUser forwards id and password', async () => {
    await controller.restoreUser('u1', { managerPassword: 'pw' } as any);
    expect(service.restoreUser).toHaveBeenCalledWith('u1', 'pw');
  });

  it('getTrash delegates', async () => {
    expect(await controller.getTrash()).toBe('trash');
  });

  it('simulatePurchase forwards id, quantity, password and reason', async () => {
    await controller.simulatePurchase('u1', { quantity: 3, managerPassword: 'pw', reason: 'r' } as any);
    expect(service.simulatePurchase).toHaveBeenCalledWith('u1', 3, 'pw', 'r');
  });

  it('purgeTestData delegates', async () => {
    expect(await controller.purgeTestData()).toBe('purged');
  });
});
