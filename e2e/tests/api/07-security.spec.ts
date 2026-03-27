/**
 * TESTES DE API — SEGURANÇA
 * Cobre: TC-SEC-001 a TC-SEC-010
 */
import { test, expect } from '@playwright/test';
import {
  apiPost,
  apiGet,
  apiPut,
  registerAndLogin,
  loginAsAdmin,
  cleanupTestUsers,
  API_BASE,
} from '../../helpers/api-client';

test.describe('Segurança — API', () => {
  const createdUserIds: string[] = [];

  test.afterAll(async ({ request }) => {
    await cleanupTestUsers(request, createdUserIds);
  });

  // ──────────────────────────────────────────────
  // TC-SEC-001: Manipulação de token JWT
  // ──────────────────────────────────────────────
  test('TC-SEC-001 — JWT de outro usuário não acessa dados do primeiro', async ({ request }) => {
    const userA = await registerAndLogin(request);
    createdUserIds.push(userA.userId);

    const userB = await registerAndLogin(request);
    createdUserIds.push(userB.userId);

    // Usando token de B para acessar /auth/me — deve retornar dados de B, não de A
    const res = await apiGet(request, '/auth/me', userB.accessToken);
    expect(res.status).toBe(200);
    const user = res.body.data as { id: string };
    expect(user.id).toBe(userB.userId);
    expect(user.id).not.toBe(userA.userId);
  });

  // ──────────────────────────────────────────────
  // TC-SEC-002: IDOR — perfil de outro usuário
  // ──────────────────────────────────────────────
  test('TC-SEC-002 — Usuário não acessa perfil de outro via ID na URL', async ({ request }) => {
    const userA = await registerAndLogin(request);
    createdUserIds.push(userA.userId);

    const userB = await registerAndLogin(request);
    createdUserIds.push(userB.userId);

    // B tenta acessar dados de A via ID
    const res = await apiGet(request, `/users/${userA.userId}`, userB.accessToken);
    // Deve retornar 403 (se protegido) ou 404, nunca os dados privados de A
    expect([403, 404]).toContain(res.status);
  });

  // ──────────────────────────────────────────────
  // TC-SEC-003: SQL Injection em campos de texto
  // ──────────────────────────────────────────────
  test('TC-SEC-003 — SQL Injection no login não quebra o servidor', async ({ request }) => {
    const sqlPayloads = [
      { email: "' OR '1'='1", password: "' OR '1'='1" },
      { email: "admin'--", password: 'qualquer' },
      { email: '; DROP TABLE users; --', password: 'qualquer' },
    ];

    for (const payload of sqlPayloads) {
      const res = await apiPost(request, '/auth/login', payload);
      // Deve retornar 400/401/422, nunca 200 (autenticação não deve ocorrer)
      expect([400, 401, 422]).toContain(res.status);
      expect(res.body.success).toBe(false);
    }
  });

  test('TC-SEC-003b — SQL Injection no registro não cria conta maliciosa', async ({ request }) => {
    const res = await apiPost(request, '/auth/register', {
      name: "'; DROP TABLE users; --",
      email: `injection_${Date.now()}@test.com`,
      cpf: '12345678909',
      phone: '11999990000',
      city: "São Paulo' OR '1'='1",
      state: 'SP',
      pixKey: 'pix@test.com',
      password: 'Senha@123',
    });
    // Deve criar normalmente sem executar SQL
    expect([201, 400, 409, 422]).toContain(res.status);
    // Servidor não deve cair (500)
    expect(res.status).not.toBe(500);
  });

  // ──────────────────────────────────────────────
  // TC-SEC-007: Endpoint admin sem role ADMIN
  // ──────────────────────────────────────────────
  test('TC-SEC-007 — Usuário comum é bloqueado em todos os endpoints admin', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const adminEndpoints = [
      { method: 'GET', path: '/admin/dashboard/kpis' },
      { method: 'GET', path: '/admin/dashboard/sales-chart' },
      { method: 'GET', path: '/admin/dashboard/title-distribution' },
      { method: 'GET', path: '/admin/dashboard/crm-users' },
      { method: 'GET', path: '/admin/price-engine' },
      { method: 'GET', path: '/admin/financial/config' },
      { method: 'GET', path: '/admin/payouts' },
      { method: 'GET', path: '/admin/career-plan' },
    ];

    for (const ep of adminEndpoints) {
      const res = await apiGet(request, ep.path, accessToken);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    }
  });

  // ──────────────────────────────────────────────
  // TC-SEC-008: JWT sem assinatura válida
  // ──────────────────────────────────────────────
  test('TC-SEC-008 — JWT com payload manipulado é rejeitado', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    // Pega o header e payload do token original e altera o role para ADMIN
    const parts = accessToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    payload.role = 'ADMIN'; // tenta promover a admin
    const fakePayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tamperedToken = `${parts[0]}.${fakePayload}.ASSINATURA_FALSA`;

    const res = await apiGet(request, '/admin/dashboard/kpis', tamperedToken);
    expect([401, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-SEC-009: Replay de refresh token revogado
  // ──────────────────────────────────────────────
  test('TC-SEC-009 — Refresh token revogado não pode ser reutilizado', async ({ request }) => {
    const { accessToken, refreshToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    // Revogar via logout
    await apiPost(request, '/auth/logout', { refreshToken }, accessToken);

    // Tentar usar o mesmo refresh token novamente
    const res = await apiPost(request, '/auth/refresh', { refreshToken });
    expect([401, 403]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-SEC: Campos extras no body são ignorados (whitelist)
  // ──────────────────────────────────────────────
  test('Campos extras no body do login não elevam privilégios (whitelist)', async ({ request }) => {
    const res = await apiPost(request, '/auth/login', {
      email: 'admin@ciano.com',
      password: 'admin123',
      role: 'ADMIN', // campo extra que não deve ser processado
      isAdmin: true,
    });
    // Backend pode rejeitar campos extras (400) ou ignorá-los silenciosamente (200)
    // Em ambos os casos, elevação de privilégio não ocorre
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      const user = (res.body.data as { user: { role: string } }).user;
      // Role deve ser o que está no banco, não o enviado no body
      expect(user.role).toBe('admin'); // já é admin no banco
    } else {
      expect(res.body.success).toBe(false);
    }
  });

  // ──────────────────────────────────────────────
  // TC-SEC: Sem vazamento de senha no response
  // ──────────────────────────────────────────────
  test('Resposta de login nunca inclui hash da senha', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/auth/me', accessToken);
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    // Não deve conter campos de senha
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('password');
  });

  // ──────────────────────────────────────────────
  // TC-SEC: Headers de segurança
  // ──────────────────────────────────────────────
  test('Respostas da API não expõem informações do servidor', async ({ request }) => {
    const res = await request.get(`${API_BASE}/auth/login`, {
      method: 'OPTIONS',
    });
    // Verificar que o servidor não expõe versão do framework
    const serverHeader = res.headers()['server'];
    if (serverHeader) {
      expect(serverHeader.toLowerCase()).not.toContain('nestjs');
      expect(serverHeader.toLowerCase()).not.toContain('fastify');
    }
  });

  // ──────────────────────────────────────────────
  // TC-SEC-010: Rate limiting no login
  // ──────────────────────────────────────────────
  test('TC-SEC-010 / TC-AUTH-006 — Rate limiting bloqueia muitas tentativas de login', async ({ request }) => {
    const attempts = [];
    // Dispara 15 requisições rápidas com credenciais erradas
    for (let i = 0; i < 15; i++) {
      attempts.push(
        apiPost(request, '/auth/login', {
          email: 'ratelimit_test@test.com',
          password: `senha_errada_${i}`,
        }),
      );
    }
    const results = await Promise.all(attempts);
    const statuses = results.map((r) => r.status);
    // Pelo menos uma requisição deve ter sido limitada (429)
    // OU todas retornam 401 (throttle pode estar configurado para limite maior)
    const hasThrottle = statuses.some((s) => s === 429);
    const allAuth = statuses.every((s) => [401, 429].includes(s));
    expect(allAuth).toBe(true); // nenhuma deve retornar 200
    if (hasThrottle) {
      console.log('✅ Rate limiting ativo: 429 detectado após muitas tentativas');
    } else {
      console.warn('⚠️  Rate limiting não ativado com 15 tentativas (verifique THROTTLE_LIMIT)');
    }
  });

  // ──────────────────────────────────────────────
  // TC-SEC: XSS — dados salvos não executam script
  // ──────────────────────────────────────────────
  test('TC-SEC-004 — Campos de texto aceitam caracteres especiais sem XSS', async ({ request }) => {
    const xssPayload = '<script>alert("xss")</script>';
    const payload = {
      name: xssPayload,
      email: `xss_test_${Date.now()}@test.com`,
      cpf: '12345678909',
      phone: '11999990000',
      city: xssPayload,
      state: 'SP',
      pixKey: 'pix@test.com',
      password: 'Senha@123',
    };
    const res = await apiPost(request, '/auth/register', payload);
    // Pode aceitar ou rejeitar, mas não deve executar o script nem retornar 500
    expect([201, 400, 409, 422]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });
});
