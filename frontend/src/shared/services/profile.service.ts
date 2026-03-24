import api from './api';

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  city?: string;
  state?: string;
  avatarUrl?: string;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdatePixPayload {
  pixKeyType: string;
  pixKey: string;
}

export const profileService = {
  get() {
    return api.get('/profile');
  },

  update(payload: UpdateProfilePayload) {
    return api.put('/profile', payload);
  },

  changePassword(payload: UpdatePasswordPayload) {
    return api.put('/profile/password', payload);
  },

  updatePix(payload: UpdatePixPayload) {
    return api.put('/profile/pix', payload);
  },
};
