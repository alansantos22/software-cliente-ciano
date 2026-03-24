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

  purchase(quantity: number, paymentMethod: string) {
    return api.post('/checkout/purchase', { quantity, paymentMethod });
  },

  getConfirmation(transactionId: string) {
    return api.get(`/checkout/confirmation/${transactionId}`);
  },
};
