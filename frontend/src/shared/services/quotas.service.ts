import api from './api';

export const quotasService = {
  getConfig() {
    return api.get('/quotas/config');
  },

  getBalance() {
    return api.get('/quotas/balance');
  },

  getTransactions() {
    return api.get('/quotas/transactions');
  },

  getPresentation() {
    return api.get('/quotas/presentation');
  },

  getPartnerLevels() {
    return api.get('/quotas/partner-levels');
  },

  // TEST_PAYMENT_5_REAIS — REMOVER ANTES DE PRODUÇÃO: o parâmetro `testMode`
  // só existe para forçar o valor cobrado na InfinitePay para R$5,00.
  purchase(quantity: number, testMode = false) {
    // A forma de pagamento é escolhida na página da InfinitePay.
    return api.post('/checkout/purchase', { quantity, testMode });
  },

  getConfirmation(transactionId: string) {
    return api.get(`/checkout/confirmation/${transactionId}`);
  },

  getPaymentStatus(transactionId: string) {
    return api.get(`/checkout/status/${transactionId}`);
  },
};
