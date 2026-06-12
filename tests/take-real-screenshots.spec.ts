import { test, expect } from '@playwright/test';

test.describe('DanceFlow Real Screenshots for Help Center', () => {
  test.setTimeout(120000); // 2 minutes timeout

  test('Generate E2E real screenshots', async ({ page }) => {
    // 0. Configurar localStorage para evitar onboarding e outros tutoriais
    await page.addInitScript(() => {
      window.localStorage.setItem('danceflow_tour_completed', 'true');
    });

    const artifactDir = 'C:\\Users\\alziro\\.gemini\\antigravity\\brain\\8a565fbd-b674-4931-8003-87968a9733af\\';

    // 1. Fazer Login
    console.log('Realizando login...');
    await page.goto('/auth');
    await page.getByPlaceholder('Seu e-mail').fill('teste@flow.com.br');
    await page.getByPlaceholder('Sua senha').fill('251303');
    await page.getByRole('button', { name: /Acessar Conta/i }).click();

    // Esperar carregar o painel / dashboard
    await page.waitForURL('**/');
    await expect(page.getByText(/Visão Geral/i).first()).toBeVisible({ timeout: 15000 });
    console.log('Login efetuado com sucesso!');

    // 2. Capturar Contas Fixas no Financeiro
    console.log('Navegando para a aba financeira...');
    await page.getByRole('link', { name: 'Financeiro' }).click();
    await page.waitForTimeout(2000);
    
    // Clicar na aba Contas Fixas
    await page.getByRole('button', { name: 'Contas Fixas' }).click();
    await page.waitForTimeout(1500);

    // Tirar screenshot da tela financeira de contas fixas compactas
    console.log('Tirando screenshot das Contas Fixas...');
    await page.screenshot({ path: `${artifactDir}real_financial_fixed_bills.png`, fullPage: false });

    // 3. Configurações - Aba de Faturamento/Assinatura
    console.log('Navegando para Configurações...');
    await page.getByRole('link', { name: 'Configurações' }).click();
    await page.waitForTimeout(2000);

    // Clicar na nova aba de Assinatura & Plano
    await page.getByRole('button', { name: 'Assinatura & Plano' }).click();
    await page.waitForTimeout(1500);

    // Tirar screenshot do painel inicial de faturamento do diretor
    console.log('Tirando screenshot da aba de faturamento (ativo)...');
    await page.screenshot({ path: `${artifactDir}real_settings_billing_tab.png`, fullPage: false });

    // 4. Executar fluxo de cancelamento para gerar feedback e ver alerta na tela
    console.log('Simulando o cancelamento...');
    await page.getByRole('button', { name: 'Cancelar Assinatura' }).click();
    await page.waitForTimeout(1000);

    // Preencher a pesquisa de cancelamento (churn survey)
    await page.locator('select').selectOption('preço_alto');
    await page.locator('textarea').fill('Teste automatizado: Preço está um pouco acima do orçamento neste mês.');
    
    // Confirmar cancelamento
    await page.getByRole('button', { name: 'Confirmar Cancelamento' }).click();
    
    // Capturar o alerta nativo e aceitar
    page.once('dialog', dialog => {
      console.log('Dialog message:', dialog.message());
      dialog.accept();
    });
    await page.waitForTimeout(2000);

    // Tirar screenshot do painel de faturamento indicando cancelamento programado
    console.log('Tirando screenshot com cancelamento programado ativo...');
    await page.screenshot({ path: `${artifactDir}real_settings_billing_cancelled.png`, fullPage: false });

    // 5. Painel Admin - Verificar Churn feedbacks e tag amarela
    console.log('Navegando para o painel Admin...');
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    // Tirar screenshot da lista de clientes contendo a tag amarela "Cancelamento Programado"
    console.log('Tirando screenshot da lista de clientes do Admin com a tag...');
    await page.screenshot({ path: `${artifactDir}real_admin_clients_tag.png`, fullPage: false });

    // Mudar para a aba de Motivos de Cancelamento
    await page.getByRole('button', { name: 'Motivos de Cancelamento' }).click();
    await page.waitForTimeout(1500);

    // Tirar screenshot da tabela de feedbacks de cancelamento
    console.log('Tirando screenshot da tabela de motivos de cancelamento no Admin...');
    await page.screenshot({ path: `${artifactDir}real_admin_churn_feedbacks.png`, fullPage: false });

    // 6. Voltar nas configurações para Reativar Assinatura do usuário (limpar estado de teste)
    console.log('Limpando estado de teste: Reativando assinatura...');
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: 'Assinatura & Plano' }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Reativar Assinatura' }).click();
    
    page.once('dialog', dialog => {
      dialog.accept();
    });
    await page.waitForTimeout(2000);
    console.log('Assinatura reativada e banco limpo com sucesso!');
  });
});
