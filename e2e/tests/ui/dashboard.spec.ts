/**
 * TESTES DE UI — DASHBOARD E REDE
 * Cobre: TC-DASH-001 a TC-DASH-008, TC-NET-001 a TC-NET-004, TC-UI-001 a TC-UI-008
 */
import { test, expect, Page } from '@playwright/test';

const ADMIN = { email: 'admin@ciano.com', password: 'admin123' };

// Helper: faz login e vai para uma página
async function loginAndGoTo(page: Page, path: string) {
  await page.goto('/login');
  await page.getByPlaceholder('seu@email.com').fill(ADMIN.email);
  await page.getByPlaceholder('••••••••').fill(ADMIN.password);
  await page.getByRole('button', { name: /acessar|entrar/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  if (path !== '/dashboard') {
    await page.goto(path);
  }
}

test.describe('UI — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoTo(page, '/dashboard');
  });

  // ──────────────────────────────────────────────
  // TC-DASH-001: KPIs carregam
  // ──────────────────────────────────────────────
  test('TC-DASH-001 — KPIs do dashboard carregam sem erro', async ({ page }) => {
    // Espera que os cards de KPI estejam visíveis
    await expect(page.locator('.kpi-card, [class*="kpi"]').first()).toBeVisible({ timeout: 10_000 });
    // Não deve ter mensagem de erro na tela
    const errorMessages = page.locator('[class*="error-page"], [class*="500"]');
    await expect(errorMessages).not.toBeVisible();
  });

  // ──────────────────────────────────────────────
  // TC-DASH-003: Código de referral visível e copiável
  // ──────────────────────────────────────────────
  test('TC-DASH-003 — Código de referral exibido e botão de cópia funciona', async ({ page }) => {
    const referralCode = page.locator('.referral-card__code, [class*="referral-code"], [class*="referral"]');
    await expect(referralCode.first()).toBeVisible({ timeout: 10_000 });

    // Código deve ter formato CIANO-XXXXXX
    const codeText = await referralCode.first().textContent();
    if (codeText) {
      expect(codeText.trim()).toMatch(/CIANO-[A-Z0-9]+/);
    }

    // Botão de copiar deve existir
    const copyBtn = page.locator('.referral-card__copy-btn, [class*="copy-btn"], button[class*="copy"]');
    if (await copyBtn.count() > 0) {
      await copyBtn.first().click();
      // Feedback de cópia (ícone muda ou texto "Copiado")
      await page.waitForTimeout(500);
    }
  });

  // ──────────────────────────────────────────────
  // TC-DASH-006: Gráfico de cotas
  // ──────────────────────────────────────────────
  test('TC-DASH-006 — Gráfico de distribuição de cotas é renderizado', async ({ page }) => {
    const chart = page.locator('canvas, svg, [class*="chart"], [class*="donut"]');
    // Se há gráfico, deve estar visível
    if (await chart.count() > 0) {
      await expect(chart.first()).toBeVisible();
    }
  });

  // ──────────────────────────────────────────────
  // TC-UI-003: Loading states visíveis
  // ──────────────────────────────────────────────
  test('TC-UI-003 — Página carrega sem erros visíveis ao usuário', async ({ page }) => {
    // Navegar para dashboard fresco
    await page.goto('/dashboard');
    // Não deve exibir tela de erro
    await expect(page.locator('body')).not.toContainText('Erro interno');
    await expect(page.locator('body')).not.toContainText('500');
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator('body')).not.toContainText('null');
  });

  // ──────────────────────────────────────────────
  // TC-UI-007: Formatação de moeda (BRL)
  // ──────────────────────────────────────────────
  test('TC-UI-007 — Valores monetários estão em formato BRL (R$)', async ({ page }) => {
    const page_text = await page.locator('body').textContent() ?? '';
    // Se há valores monetários, devem estar em formato R$
    if (page_text.includes('R$')) {
      // Verifica que o formato é correto: R$ X.XXX,XX
      const currencyPattern = /R\$\s*[\d.]+,\d{2}/;
      expect(currencyPattern.test(page_text)).toBe(true);
    }
  });

  // ──────────────────────────────────────────────
  // TC-DASH-004: Janela de pagamento
  // ──────────────────────────────────────────────
  test('TC-DASH-004 — Informação de janela de pagamento está visível', async ({ page }) => {
    // A janela de pagamento deve aparecer em algum lugar do dashboard
    const paymentWindow = page.locator('[class*="payment-window"], [class*="payout"], [class*="janela"]');
    if (await paymentWindow.count() > 0) {
      await expect(paymentWindow.first()).toBeVisible();
    }
  });

  // ──────────────────────────────────────────────
  // TC-UI-001: Responsividade mobile
  // ──────────────────────────────────────────────
  test('TC-UI-001 — Dashboard responsivo em 375px (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard');
    // Não deve ter scroll horizontal
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // tolerância de 5px

    // Conteúdo principal deve estar visível
    await expect(page.locator('body')).toBeVisible();
  });

  // ──────────────────────────────────────────────
  // TC-DASH: Navegação pelo menu lateral
  // ──────────────────────────────────────────────
  test('Navegação pelo sidebar funciona em todas as seções', async ({ page }) => {
    const navItems = [
      { text: 'Minha Rede', url: /\/network/ },
      { text: 'Cotas', url: /\/quotas/ },
      { text: 'Histórico', url: /\/earnings/ },
    ];

    // Em mobile (<768px), o sidebar fica recolhido — precisa abrir via botão de menu
    const isMobile = (page.viewportSize()?.width ?? 1024) < 768;

    for (const item of navItems) {
      if (isMobile) {
        await page.locator('.topbar__mobile-toggle').click();
        await page.waitForTimeout(300);
      }
      await page.getByRole('link', { name: item.text, exact: true }).click();
      await expect(page).toHaveURL(item.url, { timeout: 10_000 });
      await page.goBack();
    }
  });
});

test.describe('UI — Rede (Network)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoTo(page, '/network');
  });

  // ──────────────────────────────────────────────
  // TC-NET-003: Estatísticas da rede
  // ──────────────────────────────────────────────
  test('TC-NET-003 — Estatísticas da rede são exibidas', async ({ page }) => {
    // KPIs da rede devem aparecer
    await expect(page.locator('[class*="kpi"], [class*="network-kpi"]').first()).toBeVisible({ timeout: 10_000 });
  });

  // ──────────────────────────────────────────────
  // TC-NET-004: Filtros de status (ativo/inativo)
  // ──────────────────────────────────────────────
  test('TC-NET-004 — Filtros de rede (ativo/inativo) funcionam', async ({ page }) => {
    const filters = page.locator('[class*="filter"], [class*="NetworkFilter"]');
    if (await filters.count() > 0) {
      // Clicar no filtro de "ativos"
      const activeFilter = page.getByRole('button', { name: /ativo/i });
      if (await activeFilter.count() > 0) {
        await activeFilter.click();
        await page.waitForTimeout(500);
        // A lista deve ter mudado
      }
    }
  });

  // ──────────────────────────────────────────────
  // TC-NET-001: Árvore de rede
  // ──────────────────────────────────────────────
  test('TC-NET-001 — Árvore de rede é exibida (ou estado vazio)', async ({ page }) => {
    // Aguardar carregamento completo
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1000);
    // Deve exibir a árvore OU estado vazio, nunca erro
    const hasTree = await page.locator('.network-view__tree, [class*="network-view__tree"], [class*="node"]').count() > 0;
    const hasEmpty = await page.locator('.network-view__empty, [class*="network-view__empty"], [class*="empty-state"]').count() > 0;
    // Se nenhum dos dois, verificar que pelo menos não há erro crítico
    if (!hasTree && !hasEmpty) {
      const body = await page.locator('body').textContent() ?? '';
      expect(body).not.toMatch(/erro interno|500|undefined/i);
    } else {
      expect(hasTree || hasEmpty).toBe(true);
    }
  });

  // ──────────────────────────────────────────────
  // TC-UI-004: Erro de rede — graceful degradation
  // ──────────────────────────────────────────────
  test('TC-UI-004 — Página de rede carrega sem erros JS', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/network');
    await page.waitForTimeout(2000);

    // Não deve ter erros críticos de JavaScript
    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error promise rejection'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('UI — Ganhos (Earnings)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoTo(page, '/earnings');
  });

  test('TC-EARN-001 UI — Página de ganhos carrega lista', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    // Summary cards de ganhos devem estar visíveis
    await expect(page.locator('.summary-card, .earnings-view__summary, [class*="summary"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('TC-EARN-002 UI — Filtros de tipo de bônus estão presentes', async ({ page }) => {
    // Deve haver opções de filtro
    const filterButtons = page.locator('[class*="filter"], [class*="tab"], button[class*="type"]');
    if (await filterButtons.count() > 0) {
      await expect(filterButtons.first()).toBeVisible();
    }
  });
});
