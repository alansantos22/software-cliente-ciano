import api from './api';

export const networkService = {
  getTree() {
    return api.get('/network/tree');
  },

  getStats() {
    return api.get('/network/stats');
  },

  getMember(userId: string) {
    return api.get(`/network/member/${userId}`);
  },

  recalculateTitle() {
    return api.post<{ title: string }>('/network/recalculate-title');
  },
};
