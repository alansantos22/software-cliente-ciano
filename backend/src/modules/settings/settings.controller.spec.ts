import { SettingsController } from './settings.controller';
import { User } from '../users/entities/user.entity';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: any;
  const user = { id: 'u1' } as User;

  beforeEach(() => {
    service = {
      getSettings: jest.fn().mockResolvedValue('settings'),
      updateSettings: jest.fn().mockResolvedValue('updated'),
    };
    controller = new SettingsController(service);
  });

  it('getSettings delegates the user id', async () => {
    expect(await controller.getSettings(user)).toBe('settings');
    expect(service.getSettings).toHaveBeenCalledWith('u1');
  });

  it('updateSettings delegates user id and DTO', async () => {
    const dto = { theme: 'dark' } as any;
    await controller.updateSettings(user, dto);
    expect(service.updateSettings).toHaveBeenCalledWith('u1', dto);
  });
});
