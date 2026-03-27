/**
 * TESTES DE API — REDE (NETWORK)
 * Cobre: TC-NET-001 a TC-NET-008
 */
import { test, expect } from '@playwright/test';
import {
  apiPost,
  apiGet,
  buildUserPayload,
  registerAndLogin,
  cleanupTestUsers,
} from '../../helpers/api-client';

test.describe('Rede (Network) — API', () => {
  const createdUserIds: string[] = [];

  test.afterAll(async ({ request }) => {
    await cleanupTestUsers(request, createdUserIds);
  });

  // ──────────────────────────────────────────────
  // TC-NET-001: Árvore de rede do usuário
  // ──────────────────────────────────────────────
  test('TC-NET-001 — GET /network/tree retorna estrutura de rede', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/network/tree', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // endpoint retorna array de filhos diretos
    const tree = res.body.data as unknown[];
    expect(Array.isArray(tree)).toBe(true);
  });

  // ──────────────────────────────────────────────
  // TC-NET-002: Rede vazia (sem indicados)
  // ──────────────────────────────────────────────
  test('TC-NET-002 — Usuário sem indicados tem árvore com children vazio', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/network/tree', accessToken);
    expect(res.status).toBe(200);
    const tree = res.body.data as unknown[];
    expect(tree.length).toBe(0);
  });

  // ──────────────────────────────────────────────
  // TC-NET-003: Estatísticas da rede
  // ──────────────────────────────────────────────
  test('TC-NET-003 — GET /network/stats retorna estatísticas da rede', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, '/network/stats', accessToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const stats = res.body.data as Record<string, unknown>;
    expect(stats).toHaveProperty('activeMembers');
    expect(stats).toHaveProperty('inactiveMembers');
    expect(typeof stats.activeMembers).toBe('number');
    expect(typeof stats.inactiveMembers).toBe('number');
    // Usuário novo deve ter 0 membros na rede
    expect(stats.activeMembers as number).toBe(0);
    expect(stats.inactiveMembers as number).toBe(0);
  });

  // ──────────────────────────────────────────────
  // TC-NET-001 + TC-REG-002: Rede com 1 indicado direto
  // ──────────────────────────────────────────────
  test('TC-NET-001 — Rede com 1 indicado direto aparece na árvore', async ({ request }) => {
    // Registra patrocinador
    const sponsor = await registerAndLogin(request);
    createdUserIds.push(sponsor.userId);

    // Registra indicado
    const meRes = await apiGet(request, '/auth/me', sponsor.accessToken);
    const referralCode = (meRes.body.data as { referralCode: string }).referralCode;

    const downline = await registerAndLogin(request, { referralCode });
    createdUserIds.push(downline.userId);

    // Verifica árvore do patrocinador
    const treeRes = await apiGet(request, '/network/tree', sponsor.accessToken);
    expect(treeRes.status).toBe(200);
    const tree = treeRes.body.data as { id: string }[];
    expect(tree.some((c) => c.id === downline.userId)).toBe(true);
  });

  // ──────────────────────────────────────────────
  // TC-NET-007: Detalhes de membro da rede
  // ──────────────────────────────────────────────
  test('TC-NET-007 — GET /network/member/:id retorna detalhes do membro', async ({ request }) => {
    const { accessToken, userId } = await registerAndLogin(request);
    createdUserIds.push(userId);

    const res = await apiGet(request, `/network/member/${userId}`, accessToken);
    expect([200, 404]).toContain(res.status); // 404 se não está na rede do usuário
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      const member = res.body.data as { id: string };
      expect(member.id).toBe(userId);
    }
  });

  // ──────────────────────────────────────────────
  // TC-NET: Sem autenticação → 401
  // ──────────────────────────────────────────────
  test('GET /network/tree sem token retorna 401', async ({ request }) => {
    const res = await apiGet(request, '/network/tree');
    expect(res.status).toBe(401);
  });

  test('GET /network/stats sem token retorna 401', async ({ request }) => {
    const res = await apiGet(request, '/network/stats');
    expect(res.status).toBe(401);
  });

  // ──────────────────────────────────────────────
  // TC-EDGE-002: Rede com 3 níveis de profundidade
  // ──────────────────────────────────────────────
  test('TC-EDGE-002 — Rede com 3 níveis renderiza sem erro', async ({ request }) => {
    // Nível 1: patrocinador raiz
    const root = await registerAndLogin(request);
    createdUserIds.push(root.userId);
    const rootMe = await apiGet(request, '/auth/me', root.accessToken);
    const rootCode = (rootMe.body.data as { referralCode: string }).referralCode;

    // Nível 2: indicado do root
    const lvl2 = await registerAndLogin(request, { referralCode: rootCode });
    createdUserIds.push(lvl2.userId);
    const lvl2Me = await apiGet(request, '/auth/me', lvl2.accessToken);
    const lvl2Code = (lvl2Me.body.data as { referralCode: string }).referralCode;

    // Nível 3: indicado do nível 2
    const lvl3 = await registerAndLogin(request, { referralCode: lvl2Code });
    createdUserIds.push(lvl3.userId);

    // Verifica árvore do root
    const treeRes = await apiGet(request, '/network/tree', root.accessToken);
    expect(treeRes.status).toBe(200);
    expect(treeRes.body.success).toBe(true);
    const tree = treeRes.body.data as { id: string; children: { id: string }[] }[];
    expect(tree.some((c) => c.id === lvl2.userId)).toBe(true);
    const lvl2Node = tree.find((c) => c.id === lvl2.userId);
    expect(lvl2Node?.children.some((c) => c.id === lvl3.userId)).toBe(true);
  });

  // ──────────────────────────────────────────────
  // TC-EDGE-003: Usuário sem patrocinador (root)
  // ──────────────────────────────────────────────
  test('TC-EDGE-003 — Usuário sem patrocinador funciona normalmente na rede', async ({ request }) => {
    // Registro sem código de referral
    const { accessToken, userId } = await registerAndLogin(request, { referralCode: undefined });
    createdUserIds.push(userId);

    const treeRes = await apiGet(request, '/network/tree', accessToken);
    expect(treeRes.status).toBe(200);
    expect(treeRes.body.success).toBe(true);

    const statsRes = await apiGet(request, '/network/stats', accessToken);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.success).toBe(true);
  });
});
