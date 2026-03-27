import { APIRequestContext } from '@playwright/test';

export const API_BASE = 'http://localhost:3000/api';

// Credenciais padrão de teste
export const ADMIN_CREDENTIALS = {
  email: 'admin@ciano.com',
  password: 'admin123',
};

// Prefixo único para dados de teste (facilita limpeza)
export const TEST_PREFIX = 'e2e_test_';

// Gera email único por execução de teste
export function uniqueEmail(tag = 'user'): string {
  return `${TEST_PREFIX}${tag}_${Date.now()}@test.com`;
}

// Gera CPF de teste válido (somente dígitos, sem formatação)
export function generateTestCpf(): string {
  const n = (max: number) => Math.floor(Math.random() * max);
  const digits = Array.from({ length: 9 }, () => n(9));
  const sum1 = digits.reduce((acc, d, i) => acc + d * (10 - i), 0);
  const d1 = (sum1 * 10) % 11 >= 10 ? 0 : (sum1 * 10) % 11;
  const sum2 = [...digits, d1].reduce((acc, d, i) => acc + d * (11 - i), 0);
  const d2 = (sum2 * 10) % 11 >= 10 ? 0 : (sum2 * 10) % 11;
  const all = [...digits, d1, d2];
  return all.join('');
}

// Dados de registro padrão para testes
export function buildUserPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Usuário Teste E2E',
    email: uniqueEmail(),
    cpf: generateTestCpf(),
    phone: '11999990000',
    city: 'São Paulo',
    state: 'SP',
    pixKey: uniqueEmail('pix'),
    password: 'Senha@123',
    ...overrides,
  };
}

// Wrapper tipado para respostas da API Ciano
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error: string | null;
}

// Helper: faz POST e retorna a resposta parseada
export async function apiPost<T = unknown>(
  request: APIRequestContext,
  path: string,
  body: unknown,
  token?: string,
): Promise<{ status: number; body: ApiResponse<T> }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await request.post(`${API_BASE}${path}`, { data: body, headers });
  return { status: res.status(), body: await res.json() };
}

// Helper: faz GET e retorna a resposta parseada
export async function apiGet<T = unknown>(
  request: APIRequestContext,
  path: string,
  token?: string,
): Promise<{ status: number; body: ApiResponse<T> }> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await request.get(`${API_BASE}${path}`, { headers });
  return { status: res.status(), body: await res.json() };
}

// Helper: faz PATCH e retorna a resposta parseada
export async function apiPatch<T = unknown>(
  request: APIRequestContext,
  path: string,
  body: unknown,
  token?: string,
): Promise<{ status: number; body: ApiResponse<T> }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await request.patch(`${API_BASE}${path}`, { data: body, headers });
  return { status: res.status(), body: await res.json() };
}

// Helper: faz PUT e retorna a resposta parseada
export async function apiPut<T = unknown>(
  request: APIRequestContext,
  path: string,
  body: unknown,
  token?: string,
): Promise<{ status: number; body: ApiResponse<T> }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await request.put(`${API_BASE}${path}`, { data: body, headers });
  return { status: res.status(), body: await res.json() };
}

// Helper: faz DELETE e retorna a resposta parseada
export async function apiDelete<T = unknown>(
  request: APIRequestContext,
  path: string,
  token?: string,
): Promise<{ status: number; body: ApiResponse<T> }> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await request.delete(`${API_BASE}${path}`, { headers });
  return { status: res.status(), body: await res.json() };
}

// Registra um usuário e retorna tokens + dados
export async function registerAndLogin(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {},
): Promise<{ accessToken: string; refreshToken: string; userId: string; email: string; password: string }> {
  const payload = buildUserPayload(overrides);
  const reg = await apiPost(request, '/auth/register', payload);
  if (!reg.body.success) throw new Error(`Registro falhou: ${JSON.stringify(reg.body)}`);
  const data = reg.body.data as { accessToken: string; refreshToken: string; user: { id: string } };
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userId: data.user.id,
    email: payload.email as string,
    password: payload.password as string,
  };
}

// Faz login e retorna tokens
export async function loginAs(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await apiPost(request, '/auth/login', { email, password });
  if (!res.body.success) throw new Error(`Login falhou: ${JSON.stringify(res.body)}`);
  const data = res.body.data as { accessToken: string; refreshToken: string };
  return { accessToken: data.accessToken, refreshToken: data.refreshToken };
}

// Faz login como admin e retorna token
export async function loginAsAdmin(
  request: APIRequestContext,
): Promise<string> {
  const res = await loginAs(request, ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
  return res.accessToken;
}

// Limpa usuários de teste criados (soft delete via admin)
export async function cleanupTestUsers(
  request: APIRequestContext,
  userIds: string[],
): Promise<void> {
  try {
    const adminToken = await loginAsAdmin(request);
    for (const id of userIds) {
      await apiDelete(request, `/admin/manager/users/${id}`, adminToken);
    }
  } catch {
    console.warn('⚠️  Não foi possível limpar usuários de teste. Limpe manualmente.');
  }
}
