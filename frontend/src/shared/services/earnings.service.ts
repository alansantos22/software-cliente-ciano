import api from './api';

export const earningsService = {
  list(page = 1, pageSize = 20, month?: string) {
    return api.get('/earnings', { params: { page, pageSize, month } });
  },

  overview() {
    return api.get('/earnings/overview');
  },

  monthly(month: string) {
    return api.get(`/earnings/monthly/${month}`);
  },

  byType(bonusType: string) {
    return api.get(`/earnings/by-type/${bonusType}`);
  },
};
