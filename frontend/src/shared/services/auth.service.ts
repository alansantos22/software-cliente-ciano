import api from './api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  pixKey: string;
  password: string;
  referralCode?: string;
}

export const authService = {
  login(payload: LoginPayload) {
    return api.post('/auth/login', payload);
  },

  register(payload: RegisterPayload) {
    return api.post('/auth/register', payload);
  },

  refresh(refreshToken: string) {
    return api.post('/auth/refresh', { refreshToken });
  },

  forgotPassword(email: string) {
    return api.post('/auth/forgot-password', { email });
  },

  resetPassword(token: string, newPassword: string) {
    return api.post('/auth/reset-password', { token, newPassword });
  },

  logout(refreshToken: string) {
    return api.post('/auth/logout', { refreshToken });
  },

  me() {
    return api.get('/auth/me');
  },
};
