import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  const makeHost = () => {
    const send = jest.fn();
    const status = jest.fn(() => ({ send }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/test', method: 'GET' }),
      }),
    } as any;
    return { host, status, send };
  };

  it('maps an HttpException with an object response', () => {
    const { host, status, send } = makeHost();
    filter.catch(new BadRequestException('campo inválido'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 400, message: 'campo inválido', path: '/test' }),
    );
  });

  it('maps an HttpException with a string response', () => {
    const { host, status, send } = makeHost();
    filter.catch(new HttpException('teapot', HttpStatus.I_AM_A_TEAPOT), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.I_AM_A_TEAPOT);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ message: 'teapot' }));
  });

  it('falls back to 500 for a plain Error', () => {
    const { host, status, send } = makeHost();
    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom', statusCode: 500 }));
  });

  it('falls back to a generic message for a non-Error throw', () => {
    const { host, status, send } = makeHost();
    filter.catch('weird string', host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ message: 'Internal server error' }));
  });
});
