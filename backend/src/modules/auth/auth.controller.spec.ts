import { AuthController } from './auth.controller';
import { User } from '../users/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(() => {
    authService = {
      login: jest.fn().mockResolvedValue('login'),
      register: jest.fn().mockResolvedValue('register'),
      refresh: jest.fn().mockResolvedValue('refresh'),
      forgotPassword: jest.fn().mockResolvedValue('forgot'),
      resetPassword: jest.fn().mockResolvedValue('reset'),
      getMe: jest.fn().mockResolvedValue('me'),
      logout: jest.fn().mockResolvedValue('logout'),
    };
    controller = new AuthController(authService);
  });

  it('login should delegate the DTO to the service', async () => {
    const dto = { email: 'a@b.com', password: 'x' } as any;
    expect(await controller.login(dto)).toBe('login');
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('register should delegate the DTO', async () => {
    const dto = { email: 'a@b.com' } as any;
    expect(await controller.register(dto)).toBe('register');
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('refresh should delegate the DTO', async () => {
    const dto = { refreshToken: 't' } as any;
    expect(await controller.refresh(dto)).toBe('refresh');
    expect(authService.refresh).toHaveBeenCalledWith(dto);
  });

  it('forgotPassword should delegate the DTO', async () => {
    const dto = { email: 'a@b.com' } as any;
    expect(await controller.forgotPassword(dto)).toBe('forgot');
    expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
  });

  it('resetPassword should delegate the DTO', async () => {
    const dto = { token: 't', password: 'x' } as any;
    expect(await controller.resetPassword(dto)).toBe('reset');
    expect(authService.resetPassword).toHaveBeenCalledWith(dto);
  });

  it('getMe should delegate the current user id', async () => {
    expect(await controller.getMe({ id: 'u1' } as User)).toBe('me');
    expect(authService.getMe).toHaveBeenCalledWith('u1');
  });

  it('logout should delegate the refresh token', async () => {
    expect(await controller.logout({ refreshToken: 'rt' })).toBe('logout');
    expect(authService.logout).toHaveBeenCalledWith('rt');
  });
});
