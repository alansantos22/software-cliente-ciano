/**
 * TESTES DE API — GANHOS (EARNINGS)
 * Cobre: TC-EARN-001 a TC-EARN-012
 */
import { test, expect } from '@playwright/test';
import {
  apiGet,
  registerAndLogin,
  cleanupTestUsers,
} from '../../helpers/api-client';

test.describe('Ganhos (Earnings) — API', () => {
  const createdUserIds: string[] = [];

  test.afterAll(async ({ request }) => {
    await cleanupTestUsers(request, createdUserIds);
  });

  // ──────────────────────────────────────────────
  // TC-EARN-001: Listagem paginada de ganhos
  // ──────────────────────────────────────────────
  test('TC-EARN-001 — GET /earnings retorna lista paginada', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/earnings?page=1&limit=10', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as { items: unknown[]; total: number; page: number | string; pageSize: number };
    expect(Array.isArray(data.items)).toBe(true);
    expect(typeof data.total).toBe('number');
    expect(Number(data.page)).toBe(1);
    expect(typeof data.pageSize).toBe('number');
  });

  // ──────────────────────────────────────────────
  // TC-EARN-002: Filtro por tipo de bônus
  // ──────────────────────────────────────────────
  test('TC-EARN-002 — GET /earnings?type=FIRST_PURCHASE filtra por tipo', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const types = ['FIRST_PURCHASE', 'REPURCHASE', 'TEAM', 'LEADERSHIP', 'DIVIDEND'];
    for (const type of types) {
      const res = await apiGet(request, `/earnings?type=${type}`, accessToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data as { items: { bonusType: string }[] };
      // Se há items, todos devem ser do tipo filtrado
      for (const item of data.items) {
        expect(item.bonusType).toBe(type);
      }
    }
  });

  // ──────────────────────────────────────────────
  // TC-EARN-004: Overview de ganhos
  // ──────────────────────────────────────────────
  test('TC-EARN-004 — GET /earnings/overview retorna métricas de resumo', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/earnings/overview', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as Record<string, unknown>;
    // Campos esperados no overview
    expect(data).toHaveProperty('totalEarned');
    expect(data).toHaveProperty('pendingEarnings');
    // Valores devem ser números
    expect(typeof data.totalEarned).toBe('number');
    expect(typeof data.pendingEarnings).toBe('number');
    // Usuário novo não deve ter ganhos negativos
    expect(data.totalEarned as number).toBeGreaterThanOrEqual(0);
    expect(data.pendingEarnings as number).toBeGreaterThanOrEqual(0);
  });

  // ──────────────────────────────────────────────
  // TC-EARN-003: Resumo mensal
  // ──────────────────────────────────────────────
  test('TC-EARN-003 — GET /earnings/monthly/:month retorna resumo do mês', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const res = await apiGet(request, `/earnings/monthly/${currentMonth}`, accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as Record<string, unknown>;
    // Deve ter breakdown por tipo
    expect(data).toHaveProperty('firstPurchase');
    expect(data).toHaveProperty('repurchase');
    expect(data).toHaveProperty('team');
    expect(data).toHaveProperty('leadership');
    expect(data).toHaveProperty('dividend');
  });

  // ──────────────────────────────────────────────
  // TC-EARN: Ganhos sem autenticação → 401
  // ──────────────────────────────────────────────
  test('GET /earnings sem token retorna 401', async ({ request }) => {
    const res = await apiGet(request, '/earnings');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-EARN: Paginação com limite grande
  // ──────────────────────────────────────────────
  test('GET /earnings com limit=100 não quebra o servidor', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/earnings?page=1&limit=100', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ──────────────────────────────────────────────
  // TC-EARN: Paginação na página 999 (sem dados)
  // ──────────────────────────────────────────────
  test('GET /earnings na página 999 retorna lista vazia', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/earnings?page=999&limit=10', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as { items: unknown[]; total: number; page: number | string };
    expect(data.items.length).toBe(0);
  });

  // ──────────────────────────────────────────────
  // TC-EARN-006: Mês com formato inválido
  // ──────────────────────────────────────────────
  test('GET /earnings/monthly/formato-invalido — não quebra o servidor', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/earnings/monthly/99-99', accessToken);
    // Pode retornar 400 (validação) ou 200 com dados zerados
    expect([200, 400, 422]).toContain(res.status);
  });

  // ──────────────────────────────────────────────
  // TC-EARN: Isolamento — usuário só vê seus próprios ganhos
  // ──────────────────────────────────────────────
  test('Usuário só acessa seus próprios ganhos (não de outro usuário)', async ({ request }) => {
    const userA = await registerAndLogin(request);
    createdUserIds.push(userA.userId);

    const userB = await registerAndLogin(request);
    createdUserIds.push(userB.userId);

    // Usuário B tenta acessar earnings como se fosse A
    // (o endpoint usa o token para identificar o usuário, não um ID na URL)
    const resB = await apiGet(request, '/earnings', userB.accessToken);
    const resA = await apiGet(request, '/earnings', userA.accessToken);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    // Os dados são independentes (não podemos verificar diretamente,
    // mas verificamos que a autenticação por token funciona)
    const dataA = resA.body.data as { items: { userId?: string }[] };
    const dataB = resB.body.data as { items: { userId?: string }[] };
    // Se há userId nos items, deve ser do usuário correto
    for (const item of dataA.items) {
      if (item.userId) expect(item.userId).toBe(userA.userId);
    }
    for (const item of dataB.items) {
      if (item.userId) expect(item.userId).toBe(userB.userId);
    }
  });
});
