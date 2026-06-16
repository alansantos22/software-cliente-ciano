import {
  QuotasController,
  CheckoutController,
  PaymentsWebhookController,
} from './quotas.controller';
import { User } from '../users/entities/user.entity';

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

  it('purchase forwards the quantity and testMode from the DTO', async () => {
    await controller.purchase(user, { quantity: 3 } as any);
    expect(service.purchase).toHaveBeenCalledWith('u1', 3, undefined);
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
  let infinitePay: any;

  beforeEach(() => {
    quotasService = {
      confirmPayment: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
    };
    infinitePay = {
      // Confirmação ativa: webhook não é assinado, validamos via API/valor.
      confirmActiveStatus: jest.fn().mockResolvedValue(false),
    };
    controller = new PaymentsWebhookController(quotasService, infinitePay);
  });

  const ack = { success: true, message: null };

  it('always returns the InfinitePay ack shape', async () => {
    const result = await controller.handleInfinitePayWebhook({ order_nsu: 'r1' } as any);
    expect(result).toEqual(ack);
  });

  it('ignores a payload without an order_nsu', async () => {
    const result = await controller.handleInfinitePayWebhook({} as any);
    expect(result).toEqual(ack);
    expect(infinitePay.confirmActiveStatus).not.toHaveBeenCalled();
    expect(quotasService.confirmPayment).not.toHaveBeenCalled();
  });

  it('confirms payment when the active confirmation succeeds', async () => {
    infinitePay.confirmActiveStatus.mockResolvedValue(true);
    await controller.handleInfinitePayWebhook({
      order_nsu: 'r1',
      transaction_nsu: 'nsu-1',
    } as any);
    expect(quotasService.confirmPayment).toHaveBeenCalledWith('r1', 'nsu-1');
  });

  it('takes no action when the active confirmation fails', async () => {
    infinitePay.confirmActiveStatus.mockResolvedValue(false);
    await controller.handleInfinitePayWebhook({ order_nsu: 'r1' } as any);
    expect(quotasService.confirmPayment).not.toHaveBeenCalled();
  });
});
