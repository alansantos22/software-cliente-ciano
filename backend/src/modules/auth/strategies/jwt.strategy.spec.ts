import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let userRepo: any;
  let strategy: JwtStrategy;

  beforeEach(() => {
    userRepo = { findOne: jest.fn() };
    const configService = { get: jest.fn().mockReturnValue('test-secret') } as any;
    strategy = new JwtStrategy(configService, userRepo);
  });

  it('returns the active user matching the token subject', async () => {
    const user = { id: 'u1', isActive: true };
    userRepo.findOne.mockResolvedValue(user);

    const result = await strategy.validate({ sub: 'u1', email: 'a@b.com', role: 'user' });

    expect(result).toBe(user);
    expect(userRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'u1', isActive: true }) }),
    );
  });

  it('throws Unauthorized when the user is missing or inactive', async () => {
    userRepo.findOne.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'gone', email: 'a@b.com', role: 'user' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
