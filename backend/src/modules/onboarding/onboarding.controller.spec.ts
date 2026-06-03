import { OnboardingController } from './onboarding.controller';
import { User } from '../users/entities/user.entity';

describe('OnboardingController', () => {
  let controller: OnboardingController;
  let service: any;

  beforeEach(() => {
    service = { registerUser: jest.fn().mockResolvedValue('registered') };
    controller = new OnboardingController(service);
  });

  it('registerUser delegates the sponsor id and DTO', async () => {
    const dto = { fullName: 'Alice' } as any;
    const result = await controller.registerUser({ id: 'sponsor-1' } as User, dto);
    expect(result).toBe('registered');
    expect(service.registerUser).toHaveBeenCalledWith('sponsor-1', dto);
  });
});
