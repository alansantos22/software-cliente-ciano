import { Reflector } from '@nestjs/core';
import { Roles, Role, ROLES_KEY } from './roles.decorator';
import { Public, IS_PUBLIC_KEY } from './public.decorator';

describe('metadata decorators', () => {
  const reflector = new Reflector();

  it('Roles attaches the given roles under ROLES_KEY', () => {
    class Ctrl {
      @Roles(Role.ADMIN)
      handler() {}
    }
    const roles = reflector.get(ROLES_KEY, Ctrl.prototype.handler);
    expect(roles).toEqual([Role.ADMIN]);
  });

  it('Roles supports multiple roles', () => {
    class Ctrl {
      @Roles(Role.ADMIN, Role.USER)
      handler() {}
    }
    expect(reflector.get(ROLES_KEY, Ctrl.prototype.handler)).toEqual([Role.ADMIN, Role.USER]);
  });

  it('Public marks the handler as public', () => {
    class Ctrl {
      @Public()
      handler() {}
    }
    expect(reflector.get(IS_PUBLIC_KEY, Ctrl.prototype.handler)).toBe(true);
  });
});
