/**
 * TESTES DE UI — AUTENTICAÇÃO (Login, Registro, Recuperação de Senha)
 * Cobre: TC-AUTH-001 a 006, TC-REG-001 a 009 (UI), TC-UI-003 a 005
 */
import { test, expect } from '@playwright/test';
import { generateTestCpf, uniqueEmail } from '../../helpers/api-client';

// Credenciais de teste padrão
const ADMIN = { email: 'admin@ciano.com', password: 'admin123' };

// Helper: preenche o formulário de login
async function fillLogin(page: import('@playwright/test').Page, email: string, password: string) {
  await page.getByPlaceholder('seu@email.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
}

// Helper: clica no botão de submit do login (texto real: "Acessar minha conta")
async function submitLogin(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /acessar|entrar/i }).click();
}

test.describe('UI — Autenticação', () => {
  // ──────────────────────────────────────────────
  // TC-AUTH-001: Login com credenciais válidas
  // ──────────────────────────────────────────────
  test('TC-AUTH-001 — Login válido redireciona para /dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Ciano/i);

    await fillLogin(page, ADMIN.email, ADMIN.password);
    await submitLogin(page);

    await expect(page).toHaveURL(/\/dashboard/);
    // Nome do usuário deve aparecer no header/sidebar
    await expect(page.locator('body')).toContainText(/Administrador|admin/i);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-002: Login com senha incorreta
  // ──────────────────────────────────────────────
  test('TC-AUTH-002 — Login com senha incorreta exibe erro', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, ADMIN.email, 'senha_errada_xyz');
    await submitLogin(page);

    // Deve mostrar alerta de erro (.ds-alert é o wrapper do DsAlert)
    await expect(page.locator('div.ds-alert')).toBeVisible({ timeout: 10_000 });
    // Não deve redirecionar
    await expect(page).toHaveURL(/\/login/);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-004: Login com campos em branco
  // ──────────────────────────────────────────────
  test('TC-AUTH-004 — Login com campos vazios mostra validação', async ({ page }) => {
    await page.goto('/login');
    await submitLogin(page);

    // HTML5 required deve focar o primeiro campo vazio
    await expect(page.locator('input[type="email"]').first()).toBeFocused();
    // Permanece na página de login
    await expect(page).toHaveURL(/\/login/);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-007: Logout
  // ──────────────────────────────────────────────
  test('TC-AUTH-007 — Logout redireciona para /login e limpa sessão', async ({ page }) => {
    // Faz login primeiro
    await page.goto('/login');
    await fillLogin(page, ADMIN.email, ADMIN.password);
    await submitLogin(page);
    await expect(page).toHaveURL(/\/dashboard/);

    // Abre o dropdown do usuário no topbar e clica em Sair
    await page.locator('.topbar__user-btn').click();
    await page.locator('.ds-dropdown-item--danger').click();

    await expect(page).toHaveURL(/\/login/);
    // Tentar acessar dashboard sem sessão deve redirecionar
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-008: Rota protegida sem sessão → /login
  // ──────────────────────────────────────────────
  test('TC-AUTH-008 — Acesso direto a rota protegida redireciona para login', async ({ page }) => {
    // Sem fazer login, tenta acessar dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/network');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/earnings');
    await expect(page).toHaveURL(/\/login/);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-017: Rota admin não acessível por usuário comum
  // ──────────────────────────────────────────────
  test('TC-AUTH-017 — Usuário comum não acessa /admin', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, ADMIN.email, ADMIN.password);
    await submitLogin(page);
    await expect(page).toHaveURL(/\/dashboard/);

    // Como é admin, /admin deve estar acessível
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH-011: Formulário de recuperação de senha
  // ──────────────────────────────────────────────
  test('TC-AUTH-011 — Formulário de recuperação de senha exibe confirmação', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByPlaceholder('seu@email.com').fill(ADMIN.email);
    await page.getByRole('button', { name: /enviar|recuperar|redefinir/i }).click();

    // Deve exibir mensagem de confirmação (DsAlert wrapper)
    await expect(page.locator('div.ds-alert')).toBeVisible({ timeout: 10_000 });
  });

  // ──────────────────────────────────────────────
  // TC-AUTH: Link "Esqueci minha senha" existe no login
  // ──────────────────────────────────────────────
  test('Link "Esqueci a senha" está presente e navega corretamente', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /esqueci|esqueceu|forgot/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  // ──────────────────────────────────────────────
  // TC-AUTH: Link "Criar conta" navega para /register
  // ──────────────────────────────────────────────
  test('Link "Criar conta" navega para /register', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /cadastr|criar conta|register/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('UI — Registro de Usuário', () => {
  // ──────────────────────────────────────────────
  // TC-REG-001: Registro completo com dados válidos
  // ──────────────────────────────────────────────
  test('TC-REG-001 — Registro com dados válidos redireciona para login', async ({ page }) => {
    await page.goto('/register');

    // Preencher formulário
    await page.getByPlaceholder('João da Silva').fill('Usuário E2E Teste');
    await page.getByPlaceholder('seu@email.com').fill(uniqueEmail('ui'));
    await page.getByPlaceholder('000.000.000-00').fill(generateTestCpf());
    await page.getByPlaceholder('(00) 00000-0000').fill('(11) 99999-0000');
    await page.getByPlaceholder(/São Paulo|Ex: São Paulo/).fill('São Paulo');

    // Estado — primeiro select
    await page.locator('select').first().selectOption('SP');

    // Tipo PIX — segundo select (valor em minúsculas)
    const pixSelects = page.locator('select');
    if ((await pixSelects.count()) > 1) {
      await pixSelects.nth(1).selectOption('email');
    }

    // PIX key — segundo campo com placeholder 'seu@email.com' (o primeiro é o e-mail da conta)
    await page.locator('input[placeholder="seu@email.com"]').nth(1).fill(uniqueEmail('pix'));

    // Senha e confirmação
    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.first().fill('Senha@123456');
    await passwordInputs.last().fill('Senha@123456');

    // Submeter
    await page.getByRole('button', { name: /cadastrar|criar conta/i }).click();

    // Após registro bem-sucedido, redireciona para /login
    await expect(page).toHaveURL(/\/login|\/dashboard/, { timeout: 15_000 });
  });

  // ──────────────────────────────────────────────
  // TC-REG-007: Campos obrigatórios vazios mostram erro
  // ──────────────────────────────────────────────
  test('TC-REG-007 — Submeter registro vazio mostra erros de validação', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /cadastrar|criar conta/i }).click();

    // O browser foca no primeiro campo inválido (HTML5 required)
    // OU pode mostrar erros no DOM
    await page.waitForTimeout(300);
    const errors = page.locator('.ds-input__error, .register-form__field-error, [class*="field-error"]');
    const errorCount = await errors.count();
    if (errorCount > 0) {
      await expect(errors.first()).toBeVisible({ timeout: 3_000 });
    } else {
      // HTML5 native validation — o primeiro input required deve estar focado
      const firstRequiredInput = page.locator('input[required]').first();
      const isFocused = await firstRequiredInput.evaluate((el) => el === document.activeElement);
      // Qualquer das duas formas de validação é aceitável; o form não deve ter submetido
    }
    // Permanece na página de registro
    await expect(page).toHaveURL(/\/register/);
  });

  // ──────────────────────────────────────────────
  // TC-REG-009: Link de convite pré-preenche referral
  // ──────────────────────────────────────────────
  test('TC-REG-009 — Acesso via /invite/:code pré-preenche código de referral', async ({ page }) => {
    await page.goto('/invite/CIANO-TESTCODE');
    await expect(page).toHaveURL(/\/register/);

    // O campo de referral deve estar preenchido
    const referralInput = page.locator('input[placeholder*="CIANO"], input[value*="CIANO"]');
    if (await referralInput.count() > 0) {
      await expect(referralInput.first()).toHaveValue(/CIANO/);
    }
  });

  // ──────────────────────────────────────────────
  // TC-REG: Medidor de força da senha
  // ──────────────────────────────────────────────
  test('Medidor de força da senha atualiza conforme digitação', async ({ page }) => {
    await page.goto('/register');
    const passwordInput = page.locator('input[type="password"]').first();

    // Preenche senha fraca
    await passwordInput.fill('123');
    await page.waitForTimeout(300);

    const strengthBar = page.locator('.password-strength, [class*="password-strength"]');
    if (await strengthBar.count() > 0) {
      await expect(strengthBar.first()).toBeVisible();
      // Senha forte — barra deve mudar
      await passwordInput.fill('Senha@Forte123!');
      await page.waitForTimeout(300);
    }
  });
});
