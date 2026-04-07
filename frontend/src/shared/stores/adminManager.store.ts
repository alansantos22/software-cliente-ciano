// ============================================================
// STORE: Admin Manager — Área de Gestão Protegida
// Operações críticas protegidas por senha gerente (server-side).
// ============================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { adminService } from '@/shared/services/admin.service';

export interface ManagerUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  purchasedQuotas: number;
  splitQuotas: number;
  quotaBalance: number;
  sponsorId: string | null;
  pixKey?: string;
  [key: string]: unknown;
}

export interface TrashUser extends ManagerUser {
  deletedAt: string;
}

export const useAdminManagerStore = defineStore('adminManager', () => {
  // ── State ──────────────────────────────────────────────────
  const users = ref<ManagerUser[]>([]);
  const trashUsers = ref<TrashUser[]>([]);
  const hasPassword = ref(false);

  // ── Load Data ──────────────────────────────────────────────
  async function loadUsers(): Promise<void> {
    try {
      const res = await adminService.getUsers();
      if (res.data && Array.isArray(res.data)) {
        users.value = res.data;
      }
    } catch { /* fail silently */ }
  }

  async function loadTrash(): Promise<void> {
    try {
      const res = await adminService.getTrash();
      if (res.data && Array.isArray(res.data)) {
        trashUsers.value = res.data;
      }
    } catch { /* fail silently */ }
  }

  // ── Password ───────────────────────────────────────────────
  async function checkPasswordExists(): Promise<void> {
    try {
      const res = await adminService.hasManagerPassword();
      hasPassword.value = res.data?.hasPassword === true;
    } catch { /* fail silently */ }
  }

  async function setPassword(password: string): Promise<void> {
    await adminService.setManagerPassword({ password });
    hasPassword.value = true;
  }

  async function verifyPassword(password: string): Promise<boolean> {
    try {
      const res = await adminService.verifyManagerPassword({ password, operation: 'verify' });
      return res.data?.valid === true;
    } catch {
      return false;
    }
  }

  // ── Helpers ────────────────────────────────────────────────
  function getDaysRemaining(deletedAt: string): number {
    const ms = Date.now() - new Date(deletedAt).getTime();
    return Math.max(0, 30 - Math.floor(ms / 86_400_000));
  }

  function getSponsorName(sponsorId: string | null): string {
    if (!sponsorId) return '—';
    return users.value.find(u => u.id === sponsorId)?.name ?? '—';
  }

  function getSponsorOptions(excludeId: string): ManagerUser[] {
    return users.value.filter(u => u.id !== excludeId);
  }

  // ── Actions ────────────────────────────────────────────────
  async function addQuotas(
    userId: string,
    qty: number,
    pwd: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await adminService.addQuotas(userId, { quantity: qty, managerPassword: pwd });
      await loadUsers();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.message || 'Erro ao adicionar cotas.' };
    }
  }

  async function removeQuotas(
    userId: string,
    qty: number,
    pwd: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await adminService.removeQuotas(userId, { quantity: qty, managerPassword: pwd });
      await loadUsers();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.message || 'Erro ao retirar cotas.' };
    }
  }

  async function setUserActive(
    userId: string,
    isActive: boolean,
    pwd: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await adminService.setUserActive(userId, { isActive, managerPassword: pwd });
      await loadUsers();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.message || 'Erro ao alterar status do usuário.' };
    }
  }

  async function changeSponsor(
    userId: string,
    newSponsorId: string,
    pwd: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await adminService.changeSponsor(userId, { newSponsorId, managerPassword: pwd });
      await loadUsers();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.message || 'Erro ao alterar patrocinador.' };
    }
  }

  async function deleteUser(
    userId: string,
    pwd: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await adminService.deleteUser(userId, { managerPassword: pwd });
      await loadUsers();
      await loadTrash();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.message || 'Erro ao excluir usuário.' };
    }
  }

  async function restoreUser(
    userId: string,
    pwd: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      await adminService.restoreUser(userId, { managerPassword: pwd });
      await loadUsers();
      await loadTrash();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.response?.data?.message || 'Erro ao restaurar usuário.' };
    }
  }

  return {
    users,
    trashUsers,
    hasPassword,
    loadUsers,
    loadTrash,
    checkPasswordExists,
    setPassword,
    verifyPassword,
    getDaysRemaining,
    getSponsorName,
    getSponsorOptions,
    addQuotas,
    removeQuotas,
    setUserActive,
    changeSponsor,
    deleteUser,
    restoreUser,
  };
});
