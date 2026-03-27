import { request } from '@playwright/test';
import { API_BASE, ADMIN_CREDENTIALS } from './api-client';

async function globalSetup() {
  const ctx = await request.newContext({ baseURL: 'http://localhost:3000' });

  const loginRes = await ctx.post(`${API_BASE}/auth/login`, {
    data: ADMIN_CREDENTIALS,
    headers: { 'Content-Type': 'application/json' },
  });

  if (!loginRes.ok()) {
    console.warn('⚠️  Global setup: não foi possível logar como admin. Limpeza de dados de teste ignorada.');
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
    console.log(`🧹 [setup] Dados de teste anteriores removidos:`, result);
  }

  await ctx.dispose();
}

export default globalSetup;
