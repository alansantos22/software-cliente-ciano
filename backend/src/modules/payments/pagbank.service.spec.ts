import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { createHash } from 'crypto';
import { PagBankService } from './pagbank.service';
import { TransactionStatus } from '../../shared/interfaces/enums';

describe('PagBankService', () => {
  let service: PagBankService;
  let http: { post: jest.Mock };
  const configValues: Record<string, string> = {
    'pagbank.baseUrl': 'https://sandbox.api.pagseguro.com',
    'pagbank.token': 'TEST_TOKEN',
    'pagbank.webhookToken': 'WH_SECRET',
    'pagbank.softDescriptor': 'CIANO COTAS',
    'pagbank.frontendUrl': 'https://app.ciano.com',
    'pagbank.notificationUrl': 'https://api.ciano.com/api/payments/webhook/pagbank',
  };

  beforeEach(async () => {
    http = { post: jest.fn() };
    const config = { get: jest.fn((key: string) => configValues[key]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagBankService,
        { provide: HttpService, useValue: http },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<PagBankService>(PagBankService);
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

    it('should post to /checkouts and return the PAY link', async () => {
      http.post.mockReturnValue(
        of({
          data: {
            id: 'CHEC_1',
            links: [
              { rel: 'SELF', href: 'https://api/checkouts/CHEC_1' },
              { rel: 'PAY', href: 'https://pay/CHEC_1' },
            ],
          },
        }),
      );

      const result = await service.createCheckout(params);

      expect(result).toEqual({ checkoutId: 'CHEC_1', paymentUrl: 'https://pay/CHEC_1' });

      const [url, body, options] = http.post.mock.calls[0];
      expect(url).toBe('https://sandbox.api.pagseguro.com/checkouts');
      expect(options.headers.Authorization).toBe('Bearer TEST_TOKEN');
      // Valor unitário convertido para centavos.
      expect(body.items[0].unit_amount).toBe(250000);
      // CPF apenas dígitos.
      expect(body.customer.tax_id).toBe('12345678909');
      // Telefone quebrado em DDD + número.
      expect(body.customer.phones[0]).toEqual({ country: '55', area: '11', number: '999998888' });
      // reference_id propagado e métodos PIX + cartão.
      expect(body.reference_id).toBe('txn-1');
      expect(body.payment_methods).toEqual([{ type: 'PIX' }, { type: 'CREDIT_CARD' }]);
    });

    it('omits tax_id when the CPF is invalid (lets the customer fill it on PagBank)', async () => {
      http.post.mockReturnValue(
        of({ data: { id: 'CHEC_2', links: [{ rel: 'PAY', href: 'https://pay/CHEC_2' }] } }),
      );

      await service.createCheckout({
        ...params,
        customer: { ...params.customer, cpf: '123.456.789-00' }, // dígito verificador inválido
      });

      const [, body] = http.post.mock.calls[0];
      expect(body.customer.tax_id).toBeUndefined();
      // Cliente pode preencher o documento na própria tela do PagBank.
      expect(body.customer_modifiable).toBe(true);
    });

    it('sends tax_id when the CPF is valid', async () => {
      http.post.mockReturnValue(
        of({ data: { id: 'CHEC_3', links: [{ rel: 'PAY', href: 'https://pay/CHEC_3' }] } }),
      );

      await service.createCheckout(params); // cpf 123.456.789-09 é válido

      const [, body] = http.post.mock.calls[0];
      expect(body.customer.tax_id).toBe('12345678909');
    });

    it('should throw when the response has no PAY link', async () => {
      http.post.mockReturnValue(of({ data: { id: 'CHEC_1', links: [{ rel: 'SELF', href: 'x' }] } }));

      await expect(service.createCheckout(params)).rejects.toThrow(InternalServerErrorException);
    });

    it('should wrap HTTP errors in InternalServerErrorException', async () => {
      http.post.mockReturnValue(throwError(() => ({ response: { data: { error: 'bad' } } })));

      await expect(service.createCheckout(params)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('mapStatus', () => {
    it('maps PAID to COMPLETED', () => {
      expect(service.mapStatus({ charges: [{ status: 'PAID' }] })).toBe(TransactionStatus.COMPLETED);
    });

    it('maps DECLINED to DECLINED', () => {
      expect(service.mapStatus({ status: 'DECLINED' })).toBe(TransactionStatus.DECLINED);
    });

    it('maps CANCELED to CANCELLED', () => {
      expect(service.mapStatus({ status: 'CANCELED' })).toBe(TransactionStatus.CANCELLED);
    });

    it('returns null for non-terminal statuses', () => {
      expect(service.mapStatus({ status: 'IN_ANALYSIS' })).toBeNull();
      expect(service.mapStatus({ status: 'AUTHORIZED' })).toBeNull();
    });

    it('prefers the charge status over the order status', () => {
      expect(service.mapStatus({ status: 'AUTHORIZED', charges: [{ status: 'PAID' }] })).toBe(
        TransactionStatus.COMPLETED,
      );
    });
  });

  describe('verifyWebhookSignature', () => {
    it('accepts a valid SHA256 signature', () => {
      const body = '{"reference_id":"txn-1"}';
      const sig = createHash('sha256').update(`WH_SECRET-${body}`).digest('hex');
      expect(service.verifyWebhookSignature(body, sig)).toBe(true);
    });

    it('rejects an invalid signature', () => {
      expect(service.verifyWebhookSignature('{"a":1}', 'deadbeef')).toBe(false);
    });

    it('rejects when signature is missing', () => {
      expect(service.verifyWebhookSignature('{"a":1}', undefined)).toBe(false);
    });
  });
});
