import api from './api';

export const adminService = {
  // ── Dashboard ──
  getKpis() {
    return api.get('/admin/dashboard/kpis');
  },

  getSalesChart() {
    return api.get('/admin/dashboard/sales-chart');
  },

  getTitleDistribution() {
    return api.get('/admin/dashboard/title-distribution');
  },

  getCrmUsers() {
    return api.get('/admin/dashboard/crm-users');
  },

  // ── Price Engine ──
  getPriceEngine() {
    return api.get('/admin/price-engine');
  },

  updatePriceEngine(payload: Record<string, unknown>) {
    return api.put('/admin/price-engine', payload);
  },

  // ── Financial Config ──
  getFinancialConfig() {
    return api.get('/admin/financial/config');
  },

  updateFinancialConfig(payload: Record<string, unknown>) {
    return api.put('/admin/financial/config', payload);
  },

  // ── Payouts ──
  calculateDistribution(payload: { profitMonth: string; netProfit: number; allowFutureMonth?: boolean }) {
    return api.post('/admin/payouts/calculate-distribution', payload);
  },

  generateBatch(payload: { profitMonth: string; netProfit: number; allowFutureMonth?: boolean }) {
    return api.post('/admin/payouts/generate-batch', payload);
  },

  getPayouts(params?: { status?: string; month?: string }) {
    return api.get('/admin/payouts', { params });
  },

  getPayoutStats() {
    return api.get('/admin/payouts/stats');
  },

  processPayout(payoutId: string) {
    return api.patch(`/admin/payouts/${payoutId}/process`);
  },

  confirmPayout(payoutId: string, payload: { transactionId?: string; action: string; failureReason?: string; allowEarly?: boolean }) {
    return api.patch(`/admin/payouts/${payoutId}/confirm`, payload);
  },

  /** Marca apenas a parte de bônus do lote como paga. `allowEarly` libera o pagamento antes do mês de vencimento (modo de testes). */
  payBonus(payoutId: string, allowEarly = false) {
    return api.patch(`/admin/payouts/${payoutId}/pay-bonus`, { allowEarly });
  },

  /** Marca apenas a parte de dividendos do lote como paga. `allowEarly` libera o pagamento antes do mês de vencimento (modo de testes). */
  payDividend(payoutId: string, allowEarly = false) {
    return api.patch(`/admin/payouts/${payoutId}/pay-dividend`, { allowEarly });
  },

  bulkPayoutAction(payload: { payoutIds: string[]; action: string }) {
    return api.post('/admin/payouts/bulk-action', payload);
  },

  /**
   * Cancela o lote de um mês de competência: apaga payout_requests +
   * bônus derivados (dividendo/equipe/liderança) e limpa processed_at dos
   * bônus persistentes (primeira compra/recompra). Permite re-gerar o lote.
   */
  voidBatch(profitMonth: string) {
    return api.delete(`/admin/payouts/batch/${profitMonth}`);
  },

  // ── Manager ──
  hasManagerPassword() {
    return api.get('/admin/manager/has-password');
  },

  setManagerPassword(payload: { password: string }) {
    return api.post('/admin/manager/set-password', payload);
  },

  verifyManagerPassword(payload: { managerPassword: string }) {
    return api.post('/admin/manager/verify-password', payload);
  },

  getUsers() {
    return api.get('/admin/manager/users');
  },

  addQuotas(userId: string, payload: { quantity: number; managerPassword: string }) {
    return api.post(`/admin/manager/users/${userId}/add-quotas`, payload);
  },

  removeQuotas(
    userId: string,
    payload: { quantity: number; managerPassword: string; source?: 'admin' | 'split' },
  ) {
    return api.post(`/admin/manager/users/${userId}/remove-quotas`, payload);
  },

  setUserActive(userId: string, payload: { isActive: boolean; managerPassword: string }) {
    return api.patch(`/admin/manager/users/${userId}/set-active`, payload);
  },

  changeSponsor(userId: string, payload: { newSponsorId: string; managerPassword: string }) {
    return api.patch(`/admin/manager/users/${userId}/sponsor`, payload);
  },

  deleteUser(userId: string, payload: { managerPassword: string }) {
    return api.delete(`/admin/manager/users/${userId}`, { data: payload });
  },

  restoreUser(userId: string, payload: { managerPassword: string }) {
    return api.post(`/admin/manager/users/${userId}/restore`, payload);
  },

  getTrash() {
    return api.get('/admin/manager/trash');
  },

  simulatePurchase(userId: string, payload: { quantity: number; managerPassword: string; reason?: string }) {
    return api.post(`/admin/manager/users/${userId}/simulate-purchase`, payload);
  },

  // ── Audit Log ──
  getTransactionLog(params?: { type?: string; userId?: string; month?: string; page?: number; limit?: number }) {
    return api.get('/admin/audit/transactions', { params });
  },

  getUserExtract(userId: string) {
    return api.get(`/admin/users/${userId}/extract`);
  },

  // ── Presentation Metrics ──
  getPresentationMetrics() {
    return api.get('/admin/presentation-metrics');
  },

  updatePresentationMetrics(metrics: unknown) {
    return api.put('/admin/presentation-metrics', { metrics });
  },

  // ── Career Plan ──
  getCareerPlan() {
    return api.get('/admin/career-plan');
  },

  updateCareerPlan(titleId: number, data: Record<string, unknown>) {
    return api.put(`/admin/career-plan/${titleId}`, data);
  },

  // ── Monthly Config ──
  getMonthlyConfig(month: string) {
    return api.get(`/admin/financial/monthly/${month}`);
  },

  updateMonthlyConfig(month: string, data: Record<string, unknown>) {
    return api.put(`/admin/financial/monthly/${month}`, data);
  },
};
