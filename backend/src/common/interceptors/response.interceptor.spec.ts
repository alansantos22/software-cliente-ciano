import { of, lastValueFrom } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();

  const run = async (returned: any) => {
    const next = { handle: () => of(returned) } as any;
    return lastValueFrom(interceptor.intercept({} as any, next));
  };

  it('wraps the handler payload in the standard envelope', async () => {
    const result = await run({ id: 'x' });
    expect(result).toMatchObject({ success: true, data: { id: 'x' }, error: null });
    expect(typeof result.timestamp).toBe('string');
  });

  it('coerces undefined data to null', async () => {
    const result = await run(undefined);
    expect(result.data).toBeNull();
  });
});
