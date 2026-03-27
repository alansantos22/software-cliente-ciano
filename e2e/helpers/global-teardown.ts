import { request } from '@playwright/test';
import { API_BASE, ADMIN_CREDENTIALS } from './api-client';

async function globalTeardown() {
  const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });

  const loginRes = await ctx.post(`${API_BASE}/auth/login`, {
    data: ADMIN_CREDENTIALS,
    headers: { 'Content-Type': 'application/json' },
  });

  if (!loginRes.ok()) {
    console.warn('⚠️  Global teardown: não foi possível logar como admin. Dados de teste podem ter ficado no banco.');
    await ctx.dispose();
    return;
  }

  const { data } = await loginRes.json();
  const token = data?.accessToken;

  const purgeRes = await ctx.delete(`${API_BASE}/admin/manager/test-cleanup`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (purgeRes.ok()) {
    const result = await purgeRes.json();
    console.log(`🧹 [teardown] Dados de teste removidos:`, result);
  } else {
    console.warn('⚠️  Global teardown: falha ao remover dados de teste.');
  }

  await ctx.dispose();
}

export default globalTeardown;
