import {
  QuotasController,
  CheckoutController,
  PaymentsWebhookController,
} from './quotas.controller';
import { User } from '../users/entities/user.entity';
import { TransactionStatus } from '../../shared/interfaces/enums';

describe('QuotasController', () => {
  let controller: QuotasController;
  let service: any;
  const user = { id: 'u1' } as User;

  beforeEach(() => {
    service = {
      getConfig: jest.fn().mockResolvedValue('config'),
      getBalance: jest.fn().mockResolvedValue('balance'),
      getTransactions: jest.fn().mockResolvedValue('transactions'),
      getPresentation: jest.fn().mockResolvedValue('presentation'),
      getPartnerLevels: jest.fn().mockResolvedValue('levels'),
    };
    controller = new QuotasController(service);
  });

  it('getConfig delegates', async () => {
    expect(await controller.getConfig()).toBe('config');
  });

  it('getBalance delegates the user id', async () => {
    expect(await controller.getBalance(user)).toBe('balance');
    expect(service.getBalance).toHaveBeenCalledWith('u1');
  });

  it('getTransactions delegates the user id', async () => {
    await controller.getTransactions(user);
    expect(service.getTransactions).toHaveBeenCalledWith('u1');
  });

  it('getPresentation delegates', async () => {
    expect(await controller.getPresentation()).toBe('presentation');
  });

  it('getPartnerLevels delegates', async () => {
    expect(await controller.getPartnerLevels()).toBe('levels');
  });
});

describe('CheckoutController', () => {
  let controller: CheckoutController;
  let service: any;
  const user = { id: 'u1' } as User;

  beforeEach(() => {
    service = {
      purchase: jest.fn().mockResolvedValue('purchase'),
      getConfirmation: jest.fn().mockResolvedValue('confirmation'),
      getStatus: jest.fn().mockResolvedValue('status'),
    };
    controller = new CheckoutController(service);
  });

  it('purchase forwards the quantity from the DTO', async () => {
    await controller.purchase(user, { quantity: 3 } as any);
    expect(service.purchase).toHaveBeenCalledWith('u1', 3);
  });

  it('getConfirmation forwards transaction id and user id', async () => {
    await controller.getConfirmation(user, 'txn-1');
    expect(service.getConfirmation).toHaveBeenCalledWith('txn-1', 'u1');
  });

  it('getStatus forwards transaction id and user id', async () => {
    await controller.getStatus(user, 'txn-1');
    expect(service.getStatus).toHaveBeenCalledWith('txn-1', 'u1');
  });
});

describe('PaymentsWebhookController', () => {
  let controller: PaymentsWebhookController;
  let quotasService: any;
  let pagBank: any;

  beforeEach(() => {
    quotasService = {
      confirmPayment: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };
    pagBank = {
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      mapStatus: jest.fn(),
    };
    controller = new PaymentsWebhookController(quotasService, pagBank);
  });

  const req = { rawBody: Buffer.from('{}') };

  it('ignores a payload with an invalid signature', async () => {
    pagBank.verifyWebhookSignature.mockReturnValue(false);
    const result = await controller.handlePagBankWebhook(req, { reference_id: 'r1' } as any, 'sig');
    expect(result).toEqual({ received: true });
    expect(quotasService.confirmPayment).not.toHaveBeenCalled();
  });

  it('ignores a payload without a reference_id', async () => {
    const result = await controller.handlePagBankWebhook(req, {} as any, 'sig');
    expect(result).toEqual({ received: true });
    expect(pagBank.mapStatus).not.toHaveBeenCalled();
  });

  it('confirms payment when the mapped status is COMPLETED', async () => {
    pagBank.mapStatus.mockReturnValue(TransactionStatus.COMPLETED);
    await controller.handlePagBankWebhook(
      req,
      { reference_id: 'r1', id: 'order-1' } as any,
      'sig',
    );
    expect(quotasService.confirmPayment).toHaveBeenCalledWith('r1', 'order-1');
  });

  it('marks failed when the mapped status is terminal-negative', async () => {
    pagBank.mapStatus.mockReturnValue(TransactionStatus.DECLINED);
    await controller.handlePagBankWebhook(req, { reference_id: 'r1' } as any, 'sig');
    expect(quotasService.markFailed).toHaveBeenCalledWith('r1', TransactionStatus.DECLINED);
  });

  it('takes no action for a non-terminal status', async () => {
    pagBank.mapStatus.mockReturnValue(TransactionStatus.PENDING);
    await controller.handlePagBankWebhook(req, { reference_id: 'r1' } as any, 'sig');
    expect(quotasService.confirmPayment).not.toHaveBeenCalled();
    expect(quotasService.markFailed).not.toHaveBeenCalled();
  });

  it('falls back to JSON.stringify when there is no raw body', async () => {
    pagBank.mapStatus.mockReturnValue(TransactionStatus.PENDING);
    await controller.handlePagBankWebhook({}, { reference_id: 'r1' } as any, 'sig');
    expect(pagBank.verifyWebhookSignature).toHaveBeenCalledWith('{"reference_id":"r1"}', 'sig');
  });
});
