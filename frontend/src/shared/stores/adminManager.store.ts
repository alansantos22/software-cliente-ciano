// ============================================================
// STORE: Admin Manager — Área de Gestão Protegida
// Operações críticas protegidas por senha gerente separada.
// Senha armazenada como SHA-256 no localStorage (mock).
// Em produção: verificação server-side via bcrypt.
// ============================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { mockUsers, type MockUser } from '@/mocks';

export interface TrashUser extends MockUser {
  /** ISO timestamp de quando o usuário foi excluído */
  deletedAt: string;
}

const HASH_KEY = 'ciano_mgr_hash';

/** Hash SHA-256 com salt fixo (mock). Produção usa bcrypt no server. */
async function sha256(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text + '__ciano_mgr_salt_v1__'),
  );
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const useAdminManagerStore = defineStore('adminManager', () => {
  // ── State ──────────────────────────────────────────────────
  const passwordHash = ref<string | null>(localStorage.getItem(HASH_KEY));

  /** Usuários ativos (excluindo admin) */
  const users = ref<MockUser[]>(
    mockUsers.filter(u => u.role !== 'admin').map(u => ({ ...u })),
  );

  /** Usuários excluídos aguardando purge de 30 dias */
  const trashUsers = ref<TrashUser[]>([]);

  // ── Getters ────────────────────────────────────────────────
  /** Se a senha gerente já foi cadastrada */
  const hasPassword = computed(() => !!passwordHash.value);

  // ── Password ───────────────────────────────────────────────
  async function setPassword(password: string): Promise<void> {
    const hash = await sha256(password);
    localStorage.setItem(HASH_KEY, hash);
    passwordHash.value = hash;
  }

  async function verifyPassword(password: string): Promise<boolean> {
    if (!passwordHash.value) return false;
    return (await sha256(password)) === passwordHash.value;
  }

  // ── Helpers ────────────────────────────────────────────────
  /** Dias restantes antes da purge permanente */
  function getDaysRemaining(deletedAt: string): number {
    const ms = Date.now() - new Date(deletedAt).getTime();
    return Math.max(0, 30 - Math.floor(ms / 86_400_000));
  }

  /** Retorna nome do patrocinador a partir do id */
  function getSponsorName(sponsorId: string | null): string {
    if (!sponsorId) return '—';
    const all: MockUser[] = [
      ...users.value,
      ...mockUsers.filter(u => u.role === 'admin'),
    ];
    return all.find(u => u.id === sponsorId)?.name ?? '—';
  }

  /** Lista de usuários disponíveis como patrocinador (exclui o próprio) */
  function getSponsorOptions(excludeId: string): MockUser[] {
    const adminUsers = mockUsers.filter(u => u.role === 'admin');
    return [...adminUsers, ...users.value].filter(u => u.id !== excludeId);
  }

  // ── Actions ────────────────────────────────────────────────
  async function addQuotas(
    userId: string,
    qty: number,
    pwd: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!(await verifyPassword(pwd))) return { ok: false, error: 'Senha gerente incorreta.' };
    const u = users.value.find(u => u.id === userId);
    if (!u) return { ok: false, error: 'Usuário não encontrado.' };
    u.purchasedQuotas += qty;
    u.quotaBalance += qty;
    return { ok: true };
  }

  async function removeQuotas(
    userId: string,
    qty: number,
    pwd: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!(await verifyPassword(pwd))) return { ok: false, error: 'Senha gerente incorreta.' };
    const u = users.value.find(u => u.id === userId);
    if (!u) return { ok: false, error: 'Usuário não encontrado.' };
    if (u.purchasedQuotas < qty)
      return { ok: false, error: `Usuário possui apenas ${u.purchasedQuotas} cota(s) comprada(s).` };
    u.purchasedQuotas -= qty;
    u.quotaBalance -= qty;
    return { ok: true };
  }

  async function changeSponsor(
    userId: string,
    newSponsorId: string,
    pwd: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!(await verifyPassword(pwd))) return { ok: false, error: 'Senha gerente incorreta.' };
    if (!newSponsorId) return { ok: false, error: 'Selecione um patrocinador.' };
    const u = users.value.find(u => u.id === userId);
    if (!u) return { ok: false, error: 'Usuário não encontrado.' };
    if (userId === newSponsorId)
      return { ok: false, error: 'Um usuário não pode ser seu próprio patrocinador.' };
    u.sponsorId = newSponsorId;
    return { ok: true };
  }

  async function deleteUser(
    userId: string,
    pwd: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!(await verifyPassword(pwd))) return { ok: false, error: 'Senha gerente incorreta.' };
    const idx = users.value.findIndex(u => u.id === userId);
    if (idx === -1) return { ok: false, error: 'Usuário não encontrado.' };
    const [deleted] = users.value.splice(idx, 1);
    trashUsers.value.push({ ...deleted, deletedAt: new Date().toISOString() });
    return { ok: true };
  }

  async function restoreUser(
    userId: string,
    pwd: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!(await verifyPassword(pwd))) return { ok: false, error: 'Senha gerente incorreta.' };
    const idx = trashUsers.value.findIndex(u => u.id === userId);
    if (idx === -1) return { ok: false, error: 'Usuário não encontrado na lixeira.' };
    const [{ deletedAt: _dt, ...item }] = trashUsers.value.splice(idx, 1);
    users.value.push(item);
    return { ok: true };
  }

  return {
    users,
    trashUsers,
    hasPassword,
    setPassword,
    verifyPassword,
    getDaysRemaining,
    getSponsorName,
    getSponsorOptions,
    addQuotas,
    removeQuotas,
    changeSponsor,
    deleteUser,
    restoreUser,
  };
});
