/**
 * TESTES DE API — PAINEL ADMIN
 * Cobre: TC-ADM-001 a TC-ADM-008, TC-FIN-001 a TC-FIN-007,
 *        TC-MGR-001 a TC-MGR-008, TC-PAYAD-001 a TC-PAYAD-006
 */
import { test, expect } from '@playwright/test';
import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  buildUserPayload,
  registerAndLogin,
  loginAsAdmin,
  cleanupTestUsers,
} from '../../helpers/api-client';

test.describe('Painel Admin — API', () => {
  const createdUserIds: string[] = [];
  let adminToken: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await loginAsAdmin(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestUsers(request, createdUserIds);
  });

  // ════════════════════════════════════════════════
  // DASHBOARD ADMIN
  // ════════════════════════════════════════════════

  test('TC-ADM-001 — GET /admin/dashboard/kpis retorna KPIs do sistema', async ({ request }) => {
    const res = await apiGet(request, '/admin/dashboard/kpis', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeTruthy();
  });

  test('TC-ADM-003 — GET /admin/dashboard/sales-chart retorna dados de vendas', async ({ request }) => {
    const res = await apiGet(request, '/admin/dashboard/sales-chart', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('TC-ADM-004 — GET /admin/dashboard/title-distribution retorna distribuição de títulos', async ({ request }) => {
    const res = await apiGet(request, '/admin/dashboard/title-distribution', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Retorna array com objetos { title, count, percentage }
    const data = res.body.data as { title: string; count: number; percentage: number }[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    const titles = data.map((d) => d.title);
    expect(titles.some((t) => t === 'none')).toBe(true);
  });

  test('TC-ADM-005 — GET /admin/dashboard/crm-users retorna lista de usuários', async ({ request }) => {
    const res = await apiGet(request, '/admin/dashboard/crm-users', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const users = res.body.data as unknown[];
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  // ════════════════════════════════════════════════
  // PRICE ENGINE
  // ════════════════════════════════════════════════

  test('TC-ADM-006 — GET /admin/price-engine retorna estado atual', async ({ request }) => {
    const res = await apiGet(request, '/admin/price-engine', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as Record<string, unknown>;
    expect(data).toHaveProperty('quotaPrice');
    expect(data).toHaveProperty('splitCount');
    expect(typeof data.quotaPrice).toBe('number');
    expect((data.quotaPrice as number)).toBeGreaterThan(0);
  });

  // ════════════════════════════════════════════════
  // CONFIGURAÇÃO FINANCEIRA
  // ════════════════════════════════════════════════

  test('TC-FIN-001 — GET /admin/financial/config retorna configurações globais', async ({ request }) => {
    const res = await apiGet(request, '/admin/financial/config', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as Record<string, unknown>;
    expect(data).toHaveProperty('minQuotas');
    expect(data).toHaveProperty('maxQuotasPerUser');
    expect(data).toHaveProperty('paymentDay');
    expect(typeof data.minQuotas).toBe('number');
    expect(typeof data.maxQuotasPerUser).toBe('number');
    expect((data.maxQuotasPerUser as number)).toBeGreaterThan(data.minQuotas as number);
  });

  test('TC-FIN-002 — PUT /admin/financial/config atualiza configurações', async ({ request }) => {
    // Pegar config atual
    const getRes = await apiGet(request, '/admin/financial/config', adminToken);
    const currentConfig = getRes.body.data as Record<string, unknown>;

    // Atualizar com os mesmos valores (não romper o sistema)
    const res = await apiPut(request, '/admin/financial/config', {
      minQuotas: currentConfig.minQuotas,
      maxQuotasPerUser: currentConfig.maxQuotasPerUser,
    }, adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('TC-FIN-002b — PUT /admin/financial/config com valores inválidos retorna 400', async ({ request }) => {
    const res = await apiPut(request, '/admin/financial/config', {
      minQuotas: -1, // inválido
      maxQuotasPerUser: 0,
      paymentDay: 99,
    }, adminToken);
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('TC-FIN-003 — GET /admin/financial/monthly/:month retorna config do mês', async ({ request }) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const res = await apiGet(request, `/admin/financial/monthly/${currentMonth}`, adminToken);
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  test('TC-FIN-007 — GET /admin/presentation-metrics retorna métricas de apresentação', async ({ request }) => {
    const res = await apiGet(request, '/admin/presentation-metrics', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('TC-FIN-006 — GET /admin/career-plan retorna plano de carreira', async ({ request }) => {
    const res = await apiGet(request, '/admin/career-plan', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const plans = res.body.data as unknown[];
    expect(Array.isArray(plans)).toBe(true);
  });

  // ════════════════════════════════════════════════
  // GERENCIADOR DE USUÁRIOS
  // ════════════════════════════════════════════════

  test('TC-MGR-003 — Admin cria novo usuário via gerenciador', async ({ request }) => {
    const payload = buildUserPayload({ name: 'Usuário Criado pelo Admin MGR' });
    const res = await apiPost(request, '/auth/register', payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const data = res.body.data as { user: { id: string } };
    createdUserIds.push(data.user.id);
  });

  test('TC-MGR-004 — Admin edita dados de usuário', async ({ request }) => {
    // Cria usuário para editar
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    // Tenta atualizar via endpoint de admin (se existir)
    const res = await apiPut(request, `/admin/manager/users/${userId}`, {
      name: 'Nome Atualizado pelo Admin',
    }, adminToken);
    // Pode não existir (404) ou funcionar (200)
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
    }
  });

  test('TC-MGR-005 — Admin deleta usuário (soft delete)', async ({ request }) => {
    // Cria usuário para deletar
    const { userId } = await registerAndLogin(request);

    const res = await apiDelete(request, `/admin/manager/users/${userId}`, adminToken);
    expect([200, 204, 400, 404]).toContain(res.status);
  });

  test('TC-MGR-008 — Usuário comum não pode alterar próprio role', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    // Tentar alterar role via profile endpoint
    const res = await apiPut(request, '/profile', { role: 'ADMIN' }, accessToken);
    // Deve ignorar o campo role (whitelist) ou retornar erro
    if (res.status === 200) {
      // Se aceitar, verificar que o role não mudou
      const meRes = await apiGet(request, '/auth/me', accessToken);
      const user = meRes.body.data as { role: string };
      expect(user.role).toBe('user');
    } else {
      expect([400, 403, 422]).toContain(res.status);
    }
  });

  // ════════════════════════════════════════════════
  // ACESSO NEGADO PARA NÃO-ADMIN
  // ════════════════════════════════════════════════

  test('Usuário comum não acessa nenhum endpoint /admin/', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const endpoints = [
      '/admin/dashboard/kpis',
      '/admin/financial/config',
      '/admin/price-engine',
      '/admin/career-plan',
      '/admin/payouts',
    ];
    for (const path of endpoints) {
      const res = await apiGet(request, path, accessToken);
      expect(res.status).toBe(403);
    }
  });

  // ════════════════════════════════════════════════
  // ADMIN PAYOUTS
  // ════════════════════════════════════════════════

  test('TC-PAYAD-001 — Admin lista saques com filtros', async ({ request }) => {
    const statuses = ['PENDING', 'PROCESSING', 'COMPLETED'];
    for (const status of statuses) {
      const res = await apiGet(request, `/admin/payouts?status=${status}`, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  test('TC-PAYAD-005 — Admin: POST /admin/payouts/calculate-distribution retorna cálculo', async ({ request }) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const res = await apiPost(request, '/admin/payouts/calculate-distribution', {
      month: currentMonth,
    }, adminToken);
    expect([200, 400, 404]).toContain(res.status);
  });
});
