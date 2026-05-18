import api from './api';

/**
 * Pagamentos do usuário (lotes gerados pelo admin).
 *
 * O modelo é admin-driven: o usuário não solicita saque — ele apenas
 * acompanha os lotes que o admin gerou. Um lote PENDING/PROCESSING é um
 * valor "a receber"; ao concluir (COMPLETED) entra nos ganhos da vida.
 */
export const payoutsService = {
  /** Todos os pagamentos do usuário (mais recentes primeiro). */
  myPayouts() {
    return api.get('/payouts/my');
  },

  /** Detalhe de um pagamento específico. */
  details(payoutId: string) {
    return api.get(`/payouts/my/${payoutId}`);
  },

  /** Resumo do que o usuário tem a receber (lotes pendentes/processando). */
  receivables() {
    return api.get('/payouts/calculate');
  },
};
