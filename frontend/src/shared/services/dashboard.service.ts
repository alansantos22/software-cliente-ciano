import api from './api';

export const dashboardService = {
  getKpis() {
    return api.get('/dashboard/kpis');
  },

  getPaymentWindow() {
    return api.get('/dashboard/payment-window');
  },

  getQuotaChart() {
    return api.get('/dashboard/quota-chart');
  },

  getRecentActivity() {
    return api.get('/dashboard/recent-activity');
  },

  getNotifications() {
    return api.get('/dashboard/notifications');
  },

  getTopEarners() {
    return api.get('/dashboard/top-earners');
  },
};
