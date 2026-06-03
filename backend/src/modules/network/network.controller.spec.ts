import { NetworkController } from './network.controller';
import { User } from '../users/entities/user.entity';
import { UserTitle } from '../../shared/interfaces/enums';

describe('NetworkController', () => {
  let controller: NetworkController;
  let networkService: any;
  let titleCalc: any;
  const user = { id: 'u1' } as User;

  beforeEach(() => {
    networkService = {
      getTree: jest.fn().mockResolvedValue('tree'),
      getStats: jest.fn().mockResolvedValue('stats'),
      getMember: jest.fn().mockResolvedValue('member'),
    };
    titleCalc = { recalculateTitle: jest.fn().mockResolvedValue(UserTitle.GOLD) };
    controller = new NetworkController(networkService, titleCalc);
  });

  it('getTree delegates the user id', async () => {
    expect(await controller.getTree(user)).toBe('tree');
    expect(networkService.getTree).toHaveBeenCalledWith('u1');
  });

  it('getStats delegates the user id', async () => {
    expect(await controller.getStats(user)).toBe('stats');
    expect(networkService.getStats).toHaveBeenCalledWith('u1');
  });

  it('recalculateMyTitle returns the recalculated title', async () => {
    const result = await controller.recalculateMyTitle(user);
    expect(result).toEqual({ title: UserTitle.GOLD });
    expect(titleCalc.recalculateTitle).toHaveBeenCalledWith('u1');
  });

  it('getMember delegates target id and requesting id', async () => {
    await controller.getMember(user, 'member-id');
    expect(networkService.getMember).toHaveBeenCalledWith('member-id', 'u1');
  });
});
