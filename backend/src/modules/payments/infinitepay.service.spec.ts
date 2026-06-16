import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { InfinitePayService } from './infinitepay.service';
import { TransactionStatus } from '../../shared/interfaces/enums';

describe('InfinitePayService', () => {
  let service: InfinitePayService;
  let http: { post: jest.Mock };
  const configValues: Record<string, unknown> = {
    'infinitepay.baseUrl': 'https://api.checkout.infinitepay.io',
    'infinitepay.handle': 'ciano',
    'infinitepay.sandbox': true,
    'infinitepay.frontendUrl': 'https://app.ciano.com',
    'infinitepay.webhookUrl': 'https://api.ciano.com/api/payments/webhook/infinitepay',
  };

  beforeEach(async () => {
    http = { post: jest.fn() };
    const config = { get: jest.fn((key: string) => configValues[key]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InfinitePayService,
        { provide: HttpService, useValue: http },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<InfinitePayService>(InfinitePayService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createCheckout', () => {
    const params = {
      referenceId: 'txn-1',
      amount: 5000,
      quantity: 2,
      unitAmount: 2500,
      description: 'Compra de 2 cota(s)',
      customer: { name: 'João', email: 'joao@x.com', cpf: '123.456.789-09', phone: '11999998888' },
    };

    it('posts to /links and returns the payment url', async () => {
      http.post.mockReturnValue(
        of({ data: { invoice_slug: 'INV_1', url: 'https://checkout.infinitepay.io/INV_1' } }),
      );

      const result = await service.createCheckout(params);

      expect(result).toEqual({ checkoutId: 'INV_1', paymentUrl: 'https://checkout.infinitepay.io/INV_1' });

      const [url, body, options] = http.post.mock.calls[0];
      expect(url).toBe('https://api.checkout.infinitepay.io/links');
      // Não há header de autenticação: a conta é identificada pelo handle no corpo.
      expect(options.headers.Authorization).toBeUndefined();
      // Sandbox liga o header Env: mock.
      expect(options.headers.Env).toBe('mock');
      // Valor unitário convertido para centavos.
      expect(body.items[0].price).toBe(250000);
      expect(body.items[0].quantity).toBe(2);
      // order_nsu propagado e handle do lojista enviado.
      expect(body.order_nsu).toBe('txn-1');
      expect(body.handle).toBe('ciano');
      // Telefone apenas dígitos, no campo que a InfinitePay espera.
      expect(body.customer.phone_number).toBe('11999998888');
    });

    it('forces a R$5 item in test mode', async () => {
      http.post.mockReturnValue(of({ data: { invoice_slug: 'INV_2', url: 'https://pay/INV_2' } }));

      await service.createCheckout({ ...params, testMode: true });

      const [, body] = http.post.mock.calls[0];
      expect(body.items).toHaveLength(1);
      expect(body.items[0].price).toBe(500);
      expect(body.items[0].quantity).toBe(1);
    });

    it('throws when the response has no payment url', async () => {
      http.post.mockReturnValue(of({ data: { invoice_slug: 'INV_1' } }));

      await expect(service.createCheckout(params)).rejects.toThrow(InternalServerErrorException);
    });

    it('wraps HTTP errors in InternalServerErrorException', async () => {
      http.post.mockReturnValue(throwError(() => ({ response: { data: { error: 'bad' } } })));

      await expect(service.createCheckout(params)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('mapStatus', () => {
    it('maps a fully-paid webhook to COMPLETED', () => {
      expect(service.mapStatus({ amount: 5000, paid_amount: 5000 })).toBe(TransactionStatus.COMPLETED);
    });

    it('returns null when nothing was paid', () => {
      expect(service.mapStatus({ amount: 5000, paid_amount: 0 })).toBeNull();
    });

    it('returns null when the paid amount is short', () => {
      expect(service.mapStatus({ amount: 5000, paid_amount: 1000 })).toBeNull();
    });
  });

  describe('confirmActiveStatus', () => {
    const webhook = { order_nsu: 'txn-1', transaction_nsu: 'NSU_1', invoice_slug: 'INV_1' };

    it('consulta /payment_check e confirma quando a API diz pago', async () => {
      http.post.mockReturnValue(of({ data: { paid: true, amount: 5000, paid_amount: 5000 } }));

      await expect(service.confirmActiveStatus(webhook)).resolves.toBe(true);

      const [url, body, options] = http.post.mock.calls[0];
      expect(url).toBe('https://api.checkout.infinitepay.io/payment_check');
      expect(body).toEqual({
        handle: 'ciano',
        order_nsu: 'txn-1',
        transaction_nsu: 'NSU_1',
        slug: 'INV_1',
      });
      // Sem header de autenticação (a conta é identificada pelo handle no corpo).
      expect(options.headers.Authorization).toBeUndefined();
    });

    it('NÃO confia no payload do webhook: usa o valor da resposta da API', async () => {
      // Webhook afirma pago, mas a API diz que não cobre o valor → recusa.
      http.post.mockReturnValue(of({ data: { paid: true, amount: 5000, paid_amount: 1000 } }));

      await expect(
        service.confirmActiveStatus({ ...webhook, amount: 5000, paid_amount: 5000 }),
      ).resolves.toBe(false);
    });

    it('recusa quando a API marca paid=false mesmo com valor', async () => {
      http.post.mockReturnValue(of({ data: { paid: false, amount: 5000, paid_amount: 5000 } }));

      await expect(service.confirmActiveStatus(webhook)).resolves.toBe(false);
    });

    it('recusa (sem consultar) quando o webhook não traz identificadores', async () => {
      await expect(service.confirmActiveStatus({ amount: 5000, paid_amount: 5000 })).resolves.toBe(false);
      expect(http.post).not.toHaveBeenCalled();
    });

    it('recusa quando a consulta à API falha (não credita sobre webhook forjado)', async () => {
      http.post.mockReturnValue(throwError(() => ({ response: { data: { error: 'down' } } })));

      await expect(service.confirmActiveStatus(webhook)).resolves.toBe(false);
    });
  });
});
