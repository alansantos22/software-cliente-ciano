/**
 * TESTES DE API — COTAS E CHECKOUT
 * Cobre: TC-QUOT-001 a TC-QUOT-014
 */
import { test, expect } from '@playwright/test';
import {
  apiPost,
  apiGet,
  registerAndLogin,
  loginAsAdmin,
  cleanupTestUsers,
} from '../../helpers/api-client';

test.describe('Cotas e Checkout — API', () => {
  const createdUserIds: string[] = [];

  test.afterAll(async ({ request }) => {
    await cleanupTestUsers(request, createdUserIds);
  });

  // ──────────────────────────────────────────────
  // TC-QUOT-001: Configuração de cotas (pública)
  // ──────────────────────────────────────────────
  test('TC-QUOT-001 — GET /quotas/config retorna estado atual do sistema', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/quotas/config', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as Record<string, unknown>;
    // Campos esperados
    expect(data).toHaveProperty('currentPrice');
    expect(data).toHaveProperty('totalQuotasSold');
    expect(data).toHaveProperty('estimatedYieldPerQuota');
    expect(typeof data.currentPrice).toBe('number');
    expect((data.currentPrice as number)).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────
  // TC-QUOT-002: Níveis de parceiro
  // ──────────────────────────────────────────────
  test('TC-QUOT-002 — GET /quotas/partner-levels retorna níveis de parceiro', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/quotas/partner-levels', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const levels = res.body.data as unknown[];
    expect(Array.isArray(levels)).toBe(true);
    expect(levels.length).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────
  // TC-QUOT: Saldo de cotas do usuário novo é zero
  // ──────────────────────────────────────────────
  test('GET /quotas/balance — usuário recém-criado tem saldo zero', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/quotas/balance', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const balance = res.body.data as { purchasedQuotas: number; splitQuotas: number; quotaBalance: number };
    expect(balance.purchasedQuotas).toBe(0);
    expect(balance.splitQuotas).toBe(0);
    expect(balance.quotaBalance).toBe(0);
  });

  // ──────────────────────────────────────────────
  // TC-QUOT-003: Compra com quantidade mínima válida
  // ──────────────────────────────────────────────
  test('TC-QUOT-003 — POST /quotas/purchase com 1 cota cria transação PENDING', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiPost(request, '/checkout/purchase', { quantity: 1, paymentMethod: 'PIX' }, accessToken);
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    const tx = res.body.data as { transactionId: string; status: string; quantity: number };
    expect(tx.transactionId).toBeTruthy();
    expect(tx.status).toBeTruthy();
    expect(tx.quantity).toBe(1);
  });

  // ──────────────────────────────────────────────
  // TC-QUOT-005: Compra com quantidade zero
  // ──────────────────────────────────────────────
  test('TC-QUOT-005 — POST /quotas/purchase com 0 cotas retorna erro', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiPost(request, '/checkout/purchase', { quantity: 0, paymentMethod: 'PIX' }, accessToken);
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('TC-QUOT-005b — POST /quotas/purchase com quantidade negativa retorna erro', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiPost(request, '/checkout/purchase', { quantity: -5, paymentMethod: 'PIX' }, accessToken);
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-QUOT-004: Compra acima do máximo permitido
  // ──────────────────────────────────────────────
  test('TC-QUOT-004 — POST /quotas/purchase acima do limite retorna erro', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    // Tentar comprar 9999 cotas (acima de qualquer maxQuotasPerUser razoável)
    const res = await apiPost(request, '/checkout/purchase', { quantity: 9999, paymentMethod: 'PIX' }, accessToken);
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-QUOT: Histórico de transações
  // ──────────────────────────────────────────────
  test('GET /quotas/transactions retorna lista de transações do usuário', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/quotas/transactions', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ──────────────────────────────────────────────
  // TC-QUOT-010: Confirmação com ID inválido retorna 404
  // ──────────────────────────────────────────────
  test('TC-QUOT-010 — GET /quotas/confirmation/id-invalido retorna 404', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/checkout/confirmation/00000000-0000-0000-0000-000000000000', accessToken);
    expect([404, 400]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-QUOT-011: IDOR — confirmação de outro usuário
  // ──────────────────────────────────────────────
  test('TC-QUOT-011 — Usuário não acessa transação de outro usuário', async ({ request }) => {
    const userA = await registerAndLogin(request);
    createdUserIds.push(userA.userId);

    const userB = await registerAndLogin(request);
    createdUserIds.push(userB.userId);

    // Usuário A cria uma transação
    const purchaseRes = await apiPost(request, '/checkout/purchase', { quantity: 1, paymentMethod: 'PIX' }, userA.accessToken);
    if (!purchaseRes.body.success) {
      test.skip(); // pula se compra não é possível neste ambiente
      return;
    }
    const txId = (purchaseRes.body.data as { transactionId: string }).transactionId;

    // Usuário B tenta acessar a transação de A
    const res = await apiGet(request, `/checkout/confirmation/${txId}`, userB.accessToken);
    // Deve retornar 400, 403 ou 404, não os dados de A
    expect([400, 403, 404]).toContain(res.status);
  });

  // ──────────────────────────────────────────────
  // TC-QUOT: Compra sem autenticação → 401
  // ──────────────────────────────────────────────
  test('POST /quotas/purchase sem token retorna 401', async ({ request }) => {
    const res = await apiPost(request, '/checkout/purchase', { quantity: 1, paymentMethod: 'PIX' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-QUOT: Métricas de apresentação
  // ──────────────────────────────────────────────
  test('TC-QUOT-013 — GET /quotas/presentation retorna métricas de apresentação', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/quotas/presentation', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ──────────────────────────────────────────────
  // TC-EDGE-015: Decimal em campo de quantidade
  // ──────────────────────────────────────────────
  test('TC-EDGE-015 — Compra com quantidade decimal é rejeitada ou arredondada', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiPost(request, '/checkout/purchase', { quantity: 1.5, paymentMethod: 'PIX' }, accessToken);
    // Deve rejeitar ou aceitar somente inteiros
    if (res.body.success) {
      const tx = res.body.data as { quantity: number };
      expect(Number.isInteger(tx.quantity)).toBe(true);
    } else {
      expect([400, 422]).toContain(res.status);
    }
  });
});
