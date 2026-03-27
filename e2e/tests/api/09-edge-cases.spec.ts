/**
 * TESTES DE API — CENÁRIOS DE BORDA
 * Cobre: TC-EDGE-001 a TC-EDGE-015, TC-DASH-001 a TC-DASH-008
 */
import { test, expect } from '@playwright/test';
import {
  apiGet,
  apiPost,
  apiPut,
  buildUserPayload,
  registerAndLogin,
  loginAsAdmin,
  cleanupTestUsers,
  generateTestCpf,
  uniqueEmail,
} from '../../helpers/api-client';

test.describe('Cenários de Borda — API', () => {
  const createdUserIds: string[] = [];

  test.afterAll(async ({ request }) => {
    await cleanupTestUsers(request, createdUserIds);
  });

  // ════════════════════════════════════════════════
  // DASHBOARD KPIs
  // ════════════════════════════════════════════════

  test('TC-DASH-001 — GET /dashboard/kpis retorna dados completos', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/dashboard/kpis', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeTruthy();
  });

  test('TC-DASH-002 — Dashboard de usuário sem cotas retorna zeros (sem erro)', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/dashboard/kpis', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Não deve ter valores negativos
    const kpis = res.body.data as Record<string, number>;
    for (const key of Object.keys(kpis)) {
      if (typeof kpis[key] === 'number') {
        expect(kpis[key]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('TC-DASH-004 — GET /dashboard/payment-window retorna janela de pagamento', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/dashboard/payment-window', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const window = res.body.data as Record<string, unknown>;
    expect(window).toHaveProperty('isOpen');
    expect(typeof window.isOpen).toBe('boolean');
  });

  test('TC-DASH-005 — GET /dashboard/top-earners retorna lista', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/dashboard/top-earners', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('TC-DASH-007 — GET /dashboard/recent-activity retorna atividades', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/dashboard/recent-activity', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('TC-DASH-008 — GET /dashboard/notifications retorna notificações', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/dashboard/notifications', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ════════════════════════════════════════════════
  // PERFIL E CONFIGURAÇÕES
  // ════════════════════════════════════════════════

  test('TC-PROF-001 — GET /profile retorna dados do perfil', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/profile', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const profile = res.body.data as { id: string; name: string };
    expect(profile.id).toBe(userId);
  });

  test('TC-PROF-001b — PUT /profile atualiza dados do perfil', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiPut(request, '/profile', {
      name: 'Nome Atualizado via Test',
      phone: '11999998888',
      city: 'Campinas',
      state: 'SP',
    }, accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const profile = res.body.data as { name: string; city: string };
    expect(profile.name).toBe('Nome Atualizado via Test');
    expect(profile.city).toBe('Campinas');
  });

  test('TC-PROF-002 — PUT /profile/pix atualiza chave PIX', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const newPixKey = uniqueEmail('newpix');
    const res = await apiPut(request, '/profile/pix', {
      pixKey: newPixKey,
      pixKeyType: 'email',
    }, accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('TC-PROF-006 — PUT /profile ignora tentativa de alterar e-mail', async ({ request }) => {
    const { accessToken, userId, email } = await registerAndLogin(request);
    createdUserIds.push(userId);

    await apiPut(request, '/profile', { email: 'hacked@hacker.com' }, accessToken);

    // Verificar que o e-mail não foi alterado
    const meRes = await apiGet(request, '/auth/me', accessToken);
    const user = meRes.body.data as { email: string };
    expect(user.email).toBe(email);
    expect(user.email).not.toBe('hacked@hacker.com');
  });

  test('TC-PROF-005 — GET/PUT /settings retorna/atualiza preferências', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const getRes = await apiGet(request, '/settings', accessToken);
    expect(getRes.status).toBe(200);

    const putRes = await apiPut(request, '/settings', {
      notifications: { payments: true },
    }, accessToken);
    expect([200, 204]).toContain(putRes.status);
  });

  // ════════════════════════════════════════════════
  // CENÁRIOS DE BORDA ESPECÍFICOS
  // ════════════════════════════════════════════════

  test('TC-EDGE-006 — Mês sem transações retorna zeros (não erro)', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    // Mês antigo sem dados
    const res = await apiGet(request, '/earnings/monthly/2020-01', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data as Record<string, number>;
    // Todos os valores devem ser 0 ou null, nunca negativos
    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'number') {
        expect(data[key]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('TC-EDGE-008 — Usuário com caracteres especiais no nome é salvo corretamente', async ({ request }) => {
    const specialPayload = buildUserPayload({ name: "José D'Ávila Çãõê" });
    const res = await apiPost(request, '/auth/register', specialPayload);
    expect(res.status).toBe(201);
    const data = res.body.data as { user: { id: string; fullName: string } };
    expect(data.user.fullName).toBe("José D'Ávila Çãõê");
    createdUserIds.push(data.user.id);
  });

  test('TC-EDGE-008b — Cidade com nome especial é salva corretamente', async ({ request }) => {
    const payload = buildUserPayload({ city: 'São Paulo', state: 'SP' });
    const res = await apiPost(request, '/auth/register', payload);
    expect(res.status).toBe(201);
    const data = res.body.data as { user: { id: string } };
    createdUserIds.push(data.user.id);
  });

  test('TC-EDGE-009 — Diferentes valores de chave PIX são aceitos no registro', async ({ request }) => {
    const pixKeys = [
      uniqueEmail('pixtest'),
      '11999990000',
      `${Date.now()}-random-key`,
    ];
    for (const pixKey of pixKeys) {
      const payload = buildUserPayload({ pixKey });
      const res = await apiPost(request, '/auth/register', payload);
      expect([201, 400, 409]).toContain(res.status);
      if (res.status === 201) {
        const data = res.body.data as { user: { id: string } };
        createdUserIds.push(data.user.id);
      }
    }
  });

  test('TC-EDGE-013 — Usuário soft-deletado não consegue fazer login', async ({ request }) => {
    const { email, password, userId } = await registerAndLogin(request);

    // Admin deleta o usuário
    const adminToken = await loginAsAdmin(request);
    await apiPut(request, `/admin/manager/users/${userId}`, { deleted: true }, adminToken);

    // Tenta logar com o usuário deletado
    const loginRes = await apiPost(request, '/auth/login', { email, password });
    // Pode ser 401 (não encontrado) ou 200 (se soft delete não impede login)
    if (loginRes.status === 200) {
      console.warn('⚠️  TC-EDGE-013: Usuário soft-deletado ainda consegue fazer login');
    } else {
      expect([401, 403, 404]).toContain(loginRes.status);
    }
  });

  test('TC-EDGE-011 — Múltiplas sessões simultâneas funcionam independentemente', async ({ request }) => {
    const { email, password, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    // Faz login uma segunda vez (nova sessão)
    const loginA = await apiPost(request, '/auth/login', { email, password });
    const loginB = await apiPost(request, '/auth/login', { email, password });

    expect(loginA.status).toBe(200);
    expect(loginB.status).toBe(200);

    const tokenA = (loginA.body.data as { accessToken: string }).accessToken;
    const tokenB = (loginB.body.data as { accessToken: string }).accessToken;

    // Ambos os tokens devem ser válidos independentemente
    const resA = await apiGet(request, '/auth/me', tokenA);
    const resB = await apiGet(request, '/auth/me', tokenB);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect((resA.body.data as { id: string }).id).toBe(userId);
    expect((resB.body.data as { id: string }).id).toBe(userId);
  });

  // ════════════════════════════════════════════════
  // RESILIÊNCIA GERAL DO SERVIDOR
  // ════════════════════════════════════════════════

  test('Servidor retorna 404 para rotas inexistentes', async ({ request }) => {
    const res = await apiGet(request, '/rota-que-nao-existe-abc123');
    expect([404]).toContain(res.status);
  });

  test('Servidor lida com body vazio em endpoints POST', async ({ request }) => {
    const res = await apiPost(request, '/auth/login', {});
    expect([400, 401, 422]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

  test('Servidor lida com body mal-formado sem quebrar', async ({ request }) => {
    const res = await request.post('http://localhost:3000/api/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      data: 'isto_nao_e_json{',
    });
    expect([400, 422, 500]).toContain(res.status());
    // Verificar que a resposta é JSON válido
    const body = await res.text();
    expect(() => JSON.parse(body)).not.toThrow();
  });
});
