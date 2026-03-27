import api from './api';

export interface AppNotification {
  id: string;
  type: 'payment' | 'network' | 'warning' | 'error';
  icon: string;
  title: string;
  description: string;
  referenceKey: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsService = {
  getAll(): Promise<AppNotification[]> {
    return api.get('/notifications').then(r => r.data);
  },

  getUnreadCount(): Promise<number> {
    return api.get('/notifications/unread-count').then(r => r.data);
  },

  markRead(id: string): Promise<void> {
    return api.patch(`/notifications/${id}/read`).then(r => r.data);
  },

  markAllRead(): Promise<void> {
    return api.patch('/notifications/read-all').then(r => r.data);
  },
};
