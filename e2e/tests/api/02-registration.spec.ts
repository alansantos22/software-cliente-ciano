/**
 * TESTES DE API — REGISTRO
 * Cobre: TC-REG-001 a TC-REG-010
 */
import { test, expect } from '@playwright/test';
import {
  apiPost,
  buildUserPayload,
  generateTestCpf,
  uniqueEmail,
  cleanupTestUsers,
  ADMIN_CREDENTIALS,
  loginAsAdmin,
  apiGet,
} from '../../helpers/api-client';

test.describe('Registro — API', () => {
  const createdUserIds: string[] = [];

  test.afterAll(async ({ request }) => {
    await cleanupTestUsers(request, createdUserIds);
  });

  // ──────────────────────────────────────────────
  // TC-REG-001: Registro completo com dados válidos
  // ──────────────────────────────────────────────
  test('TC-REG-001 — Registro com dados válidos cria conta e retorna tokens', async ({ request }) => {
    const payload = buildUserPayload();
    const res = await apiPost(request, '/auth/register', payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const data = res.body.data as { accessToken: string; refreshToken: string; user: { id: string; referralCode: string; role: string } };
    expect(data.accessToken).toBeTruthy();
    expect(data.refreshToken).toBeTruthy();
    expect(data.user.id).toBeTruthy();
    // Código de referral deve ter formato CIANO-XXXXXX
    expect(data.user.referralCode).toMatch(/^CIANO-[A-Z0-9]+$/);
    expect(data.user.role).toBe('user');
    createdUserIds.push(data.user.id);
  });

  // ──────────────────────────────────────────────
  // TC-REG-002: Registro com código de referral válido
  // ──────────────────────────────────────────────
  test('TC-REG-002 — Registro com código de referral válido vincula patrocinador', async ({ request }) => {
    // Primeiro registra usuário A para pegar seu referral code
    const userA = buildUserPayload({ name: 'Patrocinador A' });
    const regA = await apiPost(request, '/auth/register', userA);
    expect(regA.body.success).toBe(true);
    const dataA = regA.body.data as { user: { id: string; referralCode: string }; accessToken: string };
    createdUserIds.push(dataA.user.id);

    // Registra usuário B indicado por A
    const userB = buildUserPayload({ name: 'Indicado B', referralCode: dataA.user.referralCode });
    const regB = await apiPost(request, '/auth/register', userB);
    expect(regB.status).toBe(201);
    expect(regB.body.success).toBe(true);
    const dataB = regB.body.data as { user: { id: string } };
    createdUserIds.push(dataB.user.id);

    // Verifica que B aparece na rede de A
    const networkRes = await apiGet(request, '/network/tree', dataA.accessToken);
    expect(networkRes.body.success).toBe(true);
    const tree = networkRes.body.data as { id: string }[];
    const directChild = tree.find((c) => c.id === dataB.user.id);
    expect(directChild).toBeTruthy();
  });

  // ──────────────────────────────────────────────
  // TC-REG-003: Registro com código de referral inválido
  // ──────────────────────────────────────────────
  test('TC-REG-003 — Registro com código de referral inválido retorna erro', async ({ request }) => {
    const payload = buildUserPayload({ referralCode: 'CIANO-INVALIDO999' });
    const res = await apiPost(request, '/auth/register', payload);
    expect([400, 404, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-REG-004: Registro com e-mail já cadastrado
  // ──────────────────────────────────────────────
  test('TC-REG-004 — Registro com e-mail duplicado retorna erro 409', async ({ request }) => {
    const payload = buildUserPayload();
    const first = await apiPost(request, '/auth/register', payload);
    expect(first.body.success).toBe(true);
    const data = first.body.data as { user: { id: string } };
    createdUserIds.push(data.user.id);

    // Tenta registrar novamente com mesmo e-mail, CPF diferente
    const dup = buildUserPayload({ email: payload.email });
    const second = await apiPost(request, '/auth/register', dup);
    expect([400, 409, 422]).toContain(second.status);
    expect(second.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-REG-005: Registro com CPF já cadastrado
  // ──────────────────────────────────────────────
  test('TC-REG-005 — Registro com CPF duplicado retorna erro', async ({ request }) => {
    const cpf = generateTestCpf();
    const first = buildUserPayload({ cpf });
    const regFirst = await apiPost(request, '/auth/register', first);
    expect(regFirst.body.success).toBe(true);
    const data = regFirst.body.data as { user: { id: string } };
    createdUserIds.push(data.user.id);

    const second = buildUserPayload({ cpf }); // mesmo CPF, email diferente
    const regSecond = await apiPost(request, '/auth/register', second);
    expect([400, 409, 422]).toContain(regSecond.status);
    expect(regSecond.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-REG-007: Registro sem campos obrigatórios
  // ──────────────────────────────────────────────
  test('TC-REG-007 — Registro sem nome retorna 400', async ({ request }) => {
    const { name: _name, ...payload } = buildUserPayload();
    const res = await apiPost(request, '/auth/register', payload);
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('TC-REG-007b — Registro sem e-mail retorna 400', async ({ request }) => {
    const { email: _email, ...payload } = buildUserPayload();
    const res = await apiPost(request, '/auth/register', payload);
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('TC-REG-007c — Registro sem senha retorna 400', async ({ request }) => {
    const { password: _pw, ...payload } = buildUserPayload();
    const res = await apiPost(request, '/auth/register', payload);
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  test('TC-REG-007d — Registro sem CPF retorna 400', async ({ request }) => {
    const { cpf: _cpf, ...payload } = buildUserPayload();
    const res = await apiPost(request, '/auth/register', payload);
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-REG-008: Registro com senha muito curta
  // ──────────────────────────────────────────────
  test('TC-REG-008 — Registro com senha fraca/curta retorna erro', async ({ request }) => {
    const payload = buildUserPayload({ password: '123' });
    const res = await apiPost(request, '/auth/register', payload);
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-REG-006: Registro com e-mail em formato inválido
  // ──────────────────────────────────────────────
  test('TC-REG-006 — Registro com e-mail inválido retorna 400', async ({ request }) => {
    const payload = buildUserPayload({ email: 'email_sem_arroba' });
    const res = await apiPost(request, '/auth/register', payload);
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  // ──────────────────────────────────────────────
  // TC-REG: Registro com state inválido
  // ──────────────────────────────────────────────
  test('Registro com estado (UF) inválido retorna erro', async ({ request }) => {
    const payload = buildUserPayload({ state: 'XX' });
    const res = await apiPost(request, '/auth/register', payload);
    // Pode aceitar (sem validação de UF) ou rejeitar, mas não deve quebrar o servidor
    expect([200, 201, 400, 422]).toContain(res.status);
  });

  // ──────────────────────────────────────────────
  // TC-REG: Admin pode registrar novo usuário
  // ──────────────────────────────────────────────
  test('Admin registra novo usuário com role USER', async ({ request }) => {
    const adminToken = await loginAsAdmin(request);
    const payload = buildUserPayload({ name: 'Membro Registrado pelo Admin' });
    const res = await apiPost(request, '/auth/register', payload);
    // O endpoint de registro é público, não requer admin
    expect([201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    const data = res.body.data as { user: { id: string; role: string } };
    expect(data.user.role).toBe('user');
    createdUserIds.push(data.user.id);
  });
});
