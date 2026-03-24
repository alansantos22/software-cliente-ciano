import api from './api';

export const earningsService = {
  list(page = 1, pageSize = 20) {
    return api.get('/earnings', { params: { page, pageSize } });
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
