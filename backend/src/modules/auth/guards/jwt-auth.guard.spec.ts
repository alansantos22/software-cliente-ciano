import { JwtAuthGuard } from './jwt-auth.guard';

const makeContext = () =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as any;

describe('JwtAuthGuard', () => {
  let reflector: any;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(reflector);
  });

  it('allows public routes without invoking the passport guard', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('delegates to the passport AuthGuard for protected routes', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    // Stub the super.canActivate so we don't bootstrap passport in a unit test.
    const superSpy = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockReturnValue('delegated');

    expect(guard.canActivate(makeContext())).toBe('delegated');
    expect(superSpy).toHaveBeenCalled();
    superSpy.mockRestore();
  });
});
