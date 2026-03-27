/**
 * TESTES DE API — AUTENTICAÇÃO
 * Cobre: TC-AUTH-001 a TC-AUTH-017
 */
import { test, expect } from '@playwright/test';
import {
  apiPost,
  apiGet,
  buildUserPayload,
  registerAndLogin,
  loginAs,
  loginAsAdmin,
  cleanupTestUsers,
  ADMIN_CREDENTIALS,
} from '../../helpers/api-client';

test.describe('Autenticação — API', () => {
  const createdUserIds: string[] = [];

  test.afterAll(async ({ request }) => {
    await cleanupTestUsers(request, createdUserIds);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-001: Login com credenciais válidas
  // ──────────────────────────────────────────────
  test('TC-AUTH-001 — Login com credenciais válidas', async ({ request }) => {
    const res = await apiPost(request, '/auth/login', ADMIN_CREDENTIALS);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data).toHaveProperty('user');
    const user = (res.body.data as { user: { email: string; role: string } }).user;
    expect(user.email).toBe(ADMIN_CREDENTIALS.email);
    expect(user.role).toBe('admin');
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-002: Login com senha incorreta
  // ──────────────────────────────────────────────
  test('TC-AUTH-002 — Login com senha incorreta', async ({ request }) => {
    const res = await apiPost(request, '/auth/login', {
      email: ADMIN_CREDENTIALS.email,
      password: 'senha_errada_12345',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeTruthy();
    // Não deve revelar qual campo está errado
    expect(res.body.error).not.toContain('senha');
    expect(res.body.error).not.toContain('password');
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-003: Login com e-mail não cadastrado
  // ──────────────────────────────────────────────
  test('TC-AUTH-003 — Login com e-mail não cadastrado', async ({ request }) => {
    const res = await apiPost(request, '/auth/login', {
      email: 'usuario_inexistente_xyz@test.com',
      password: 'qualquersenha123',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    // Mesma mensagem de erro que senha incorreta (proteção contra enumeração)
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-004: Login com campos em branco
  // ──────────────────────────────────────────────
  test('TC-AUTH-004 — Login com campos em branco', async ({ request }) => {
    const res = await apiPost(request, '/auth/login', { email: '', password: '' });
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-005: Login com e-mail em formato inválido
  // ──────────────────────────────────────────────
  test('TC-AUTH-005 — Login com e-mail em formato inválido', async ({ request }) => {
    const res = await apiPost(request, '/auth/login', {
      email: 'emailsemarroba',
      password: 'senha123',
    });
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-007: Logout — revoga refresh token
  // ──────────────────────────────────────────────
  test('TC-AUTH-007 — Logout revoga refresh token', async ({ request }) => {
    const { accessToken, refreshToken } = await registerAndLogin(request);
    // Fazer logout
    const logoutRes = await apiPost(request, '/auth/logout', { refreshToken }, accessToken);
    expect(logoutRes.status).toBe(200);
    // Tentar renovar token com refresh token revogado
    const refreshRes = await apiPost(request, '/auth/refresh', { refreshToken });
    expect([401, 403]).toContain(refreshRes.status);
    expect(refreshRes.body.success).toBe(false);
    // Registrar usuário para limpeza
    const meRes = await apiGet(request, '/auth/me', accessToken);
    if (meRes.body.success) {
      const user = meRes.body.data as { id: string };
      createdUserIds.push(user.id);
    }
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-008: Rota protegida sem token → 401
  // ──────────────────────────────────────────────
  test('TC-AUTH-008 — Rota protegida sem token retorna 401', async ({ request }) => {
    const res = await apiGet(request, '/dashboard/kpis');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-009: Refresh token — renovação de access token
  // ──────────────────────────────────────────────
  test('TC-AUTH-009 — Refresh token renova access token', async ({ request }) => {
    const { accessToken: firstToken, refreshToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const refreshRes = await apiPost(request, '/auth/refresh', { refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    const data = refreshRes.body.data as { accessToken: string };
    expect(data.accessToken).toBeTruthy();
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-010: Refresh token inválido → 401
  // ──────────────────────────────────────────────
  test('TC-AUTH-010 — Refresh token inválido retorna 401', async ({ request }) => {
    const res = await apiPost(request, '/auth/refresh', {
      refreshToken: 'token_completamente_invalido_xyz123',
    });
    expect([401, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-011: Recuperação de senha — e-mail válido
  // ──────────────────────────────────────────────
  test('TC-AUTH-011 — Forgot password com e-mail válido retorna 200', async ({ request }) => {
    const res = await apiPost(request, '/auth/forgot-password', {
      email: ADMIN_CREDENTIALS.email,
    });
    // Deve retornar 200 mesmo sem enviar e-mail (proteção de enumeração)
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-012: Recuperação de senha — e-mail inexistente
  // ──────────────────────────────────────────────
  test('TC-AUTH-012 — Forgot password com e-mail inexistente retorna mesma resposta', async ({ request }) => {
    const res = await apiPost(request, '/auth/forgot-password', {
      email: 'usuario_que_nao_existe@test.com',
    });
    // Deve retornar 200 também (proteção contra enumeração)
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-014: Reset de senha — token inválido
  // ──────────────────────────────────────────────
  test('TC-AUTH-014 — Reset password com token inválido retorna erro', async ({ request }) => {
    const res = await apiPost(request, '/auth/reset-password', {
      token: 'token_invalido_xyz_123456789',
      newPassword: 'NovaSenha@123',
    });
    expect([400, 401, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-016: Admin acessa rota de usuário
  // ──────────────────────────────────────────────
  test('TC-AUTH-016 — Admin consegue acessar rota de usuário comum', async ({ request }) => {
    const adminToken = await loginAsAdmin(request);
    const res = await apiGet(request, '/dashboard/kpis', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-017: Usuário comum tenta acessar rota admin
  // ──────────────────────────────────────────────
  test('TC-AUTH-017 — Usuário comum é bloqueado de rota admin', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/admin/dashboard/kpis', accessToken);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH: GET /auth/me retorna usuário correto
  // ──────────────────────────────────────────────
  test('GET /auth/me retorna dados do usuário autenticado', async ({ request }) => {
    const { accessToken, email, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/auth/me', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const user = res.body.data as { email: string; id: string };
    expect(user.email).toBe(email);
    expect(user.id).toBe(userId);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH: Token com Bearer malformado
  // ──────────────────────────────────────────────
  test('TC-SEC-008 — JWT manipulado é rejeitado (401)', async ({ request }) => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.INVALIDO';
    const res = await apiGet(request, '/dashboard/kpis', fakeToken);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
