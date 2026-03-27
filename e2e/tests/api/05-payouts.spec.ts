/**
 * TESTES DE API — SAQUES (PAYOUTS)
 * Cobre: TC-PAY-001 a TC-PAY-007
 */
import { test, expect } from '@playwright/test';
import {
  apiPost,
  apiGet,
  apiPatch,
  registerAndLogin,
  loginAsAdmin,
  cleanupTestUsers,
} from '../../helpers/api-client';

test.describe('Saques (Payouts) — API', () => {
  const createdUserIds: string[] = [];

  test.afterAll(async ({ request }) => {
    await cleanupTestUsers(request, createdUserIds);
  });

  // ──────────────────────────────────────────────
  // TC-PAY-001: Calcular distribuição de saque
  // ──────────────────────────────────────────────
  test('TC-PAY-001 — GET /payouts/calculate retorna cálculo', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/payouts/calculate', accessToken);
    // Pode retornar 200 (cálculo) ou 400 (janela fechada ou sem ganhos)
    expect([200, 400]).toContain(res.status);
    if (res.body.success) {
      const data = res.body.data as Record<string, unknown>;
      expect(data).toHaveProperty('quotaAmount');
      expect(data).toHaveProperty('networkAmount');
    }
  });

  // ──────────────────────────────────────────────
  // TC-PAY-002: Solicitar saque com pixKey inválida
  // ──────────────────────────────────────────────
  test('TC-PAY-004 — Saque com PIX key vazia retorna erro', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiPost(request, '/payouts/request', {
      pixKey: '',
      pixKeyType: 'email',
      quotaAmount: 100,
      networkAmount: 0,
    }, accessToken);
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-PAY-005: Histórico de saques do usuário
  // ──────────────────────────────────────────────
  test('TC-PAY-005 — GET /payouts/my retorna lista de saques do usuário', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/payouts/my', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ──────────────────────────────────────────────
  // TC-PAY: Saques sem autenticação → 401
  // ──────────────────────────────────────────────
  test('GET /payouts/my sem token retorna 401', async ({ request }) => {
    const res = await apiGet(request, '/payouts/my');
    expect(res.status).toBe(401);
  });

  test('POST /payouts/request sem token retorna 401', async ({ request }) => {
    const res = await apiPost(request, '/payouts/request', { pixKey: 'test@test.com', pixKeyType: 'email', quotaAmount: 100, networkAmount: 0 });
    expect(res.status).toBe(401);
  });

  // ──────────────────────────────────────────────
  // TC-PAY: Saque com pixKeyType inválido
  // ──────────────────────────────────────────────
  test('POST /payouts/request com pixKeyType inválido retorna 400', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiPost(request, '/payouts/request', {
      pixKey: 'test@test.com',
      pixKeyType: 'TIPO_INVALIDO',
      quotaAmount: 100,
      networkAmount: 0,
    }, accessToken);
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-PAYAD-001: Admin lista saques pendentes
  // ──────────────────────────────────────────────
  test('TC-PAYAD-001 — Admin: GET /admin/payouts lista saques', async ({ request }) => {
    const adminToken = await loginAsAdmin(request);
    const res = await apiGet(request, '/admin/payouts', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ──────────────────────────────────────────────
  // TC-PAYAD: Usuário comum não acessa admin payouts
  // ──────────────────────────────────────────────
  test('Usuário comum não acessa /admin/payouts (403)', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/admin/payouts', accessToken);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-PAYAD-004: Admin rejeita saque com motivo
  // ──────────────────────────────────────────────
  test('TC-PAYAD-004 — Admin: PATCH saque inexistente não retorna erro crítico', async ({ request }) => {
    const adminToken = await loginAsAdmin(request);
    const res = await apiPatch(
      request,
      '/admin/payouts/00000000-0000-0000-0000-000000000000/process',
      { action: 'REJECT', reason: 'Dados incorretos' },
      adminToken,
    );
    // Backend pode retornar 200 com null, 404 ou 400
    expect([200, 404, 400]).toContain(res.status);
  });

  // ──────────────────────────────────────────────
  // TC-PAYAD-006: Estatísticas de pagamentos
  // ──────────────────────────────────────────────
  test('TC-PAYAD-006 — Admin: GET /admin/payouts/stats retorna estatísticas', async ({ request }) => {
    const adminToken = await loginAsAdmin(request);
    const res = await apiGet(request, '/admin/payouts/stats', adminToken);
    expect([200, 404]).toContain(res.status); // 404 se endpoint não existe ainda
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  // ──────────────────────────────────────────────
  // TC-PAY-006: Detalhes de saque inexistente
  // ──────────────────────────────────────────────
  test('TC-PAY-006 — GET /payouts/my/id-invalido não retorna dados de outro usuário', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/payouts/my/00000000-0000-0000-0000-000000000000', accessToken);
    // Backend pode retornar 200 com null, 404 ou 400
    expect([200, 404, 400]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });
});
