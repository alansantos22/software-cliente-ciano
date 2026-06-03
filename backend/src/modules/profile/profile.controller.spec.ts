import { ProfileController } from './profile.controller';
import { User } from '../users/entities/user.entity';

describe('ProfileController', () => {
  let controller: ProfileController;
  let service: any;
  const user = { id: 'u1' } as User;

  beforeEach(() => {
    service = {
      getProfile: jest.fn().mockResolvedValue('profile'),
      updateProfile: jest.fn().mockResolvedValue('updated'),
      updatePassword: jest.fn().mockResolvedValue('password'),
      updatePix: jest.fn().mockResolvedValue('pix'),
    };
    controller = new ProfileController(service);
  });

  it('getProfile delegates the user id', async () => {
    expect(await controller.getProfile(user)).toBe('profile');
    expect(service.getProfile).toHaveBeenCalledWith('u1');
  });

  it('updateProfile delegates user id and DTO', async () => {
    const dto = { name: 'New' } as any;
    await controller.updateProfile(user, dto);
    expect(service.updateProfile).toHaveBeenCalledWith('u1', dto);
  });

  it('updatePassword forwards current and new passwords', async () => {
    await controller.updatePassword(user, { currentPassword: 'a', newPassword: 'b' } as any);
    expect(service.updatePassword).toHaveBeenCalledWith('u1', 'a', 'b');
  });

  it('updatePix forwards the PIX key type and value', async () => {
    await controller.updatePix(user, { pixKeyType: 'cpf', pixKey: '123' } as any);
    expect(service.updatePix).toHaveBeenCalledWith('u1', 'cpf', '123');
  });
});
