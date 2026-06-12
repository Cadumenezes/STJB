import { test, expect } from '@playwright/test';

test.describe('DanceFlow Landing Page and Plans Suite', () => {
  test('Verify Landing Page testimonials and pricing values', async ({ page }) => {
    // Acessa a Landing Page
    await page.goto('/');

    // 1. Validar depoimentos
    const testimonials = [
      'Carolina Souza',
      'Ricardo Mendes',
      'Juliana Kapor',
      'Alziro Menezes',
      'Mariana Dias',
      'Gustavo Lins'
    ];

    for (const name of testimonials) {
      await expect(page.getByText(name)).toBeVisible();
    }

    // Verificar se as imagens dos depoimentos estão sendo renderizadas
    const imgs = page.locator('section:has-text("Histórias de sucesso de quem usa") img');
    await expect(imgs).toHaveCount(6); // Os 6 depoimentos possuem suas respectivas imagens

    // 2. Validar Preços e Limites da Landing Page
    // Bronze: R$ 39,99/mês, até 25 alunos
    await expect(page.locator('section:has-text("Planos transparentes")').getByText('Plano Bronze')).toBeVisible();
    await expect(page.locator('section:has-text("Planos transparentes")').getByText('R$ 39,99')).toBeVisible();
    await expect(page.locator('section:has-text("Planos transparentes")').getByText('Limite de até 25 Alunos')).toBeVisible();

    // Prata: R$ 69,99/mês, até 50 alunos
    await expect(page.locator('section:has-text("Planos transparentes")').getByText('Plano Prata')).toBeVisible();
    await expect(page.locator('section:has-text("Planos transparentes")').getByText('R$ 69,99')).toBeVisible();
    await expect(page.locator('section:has-text("Planos transparentes")').getByText('Limite de até 50 Alunos')).toBeVisible();

    // Ouro: R$ 109,99/mês, até 100 alunos
    await expect(page.locator('section:has-text("Planos transparentes")').getByText('Plano Ouro')).toBeVisible();
    await expect(page.locator('section:has-text("Planos transparentes")').getByText('R$ 109,99')).toBeVisible();
    await expect(page.locator('section:has-text("Planos transparentes")').getByText('Limite de até 100 Alunos')).toBeVisible();

    // Diamante: R$ 209,99/mês, alunos ilimitados
    await expect(page.locator('section:has-text("Planos transparentes")').getByText('Plano Diamante')).toBeVisible();
    await expect(page.locator('section:has-text("Planos transparentes")').getByText('R$ 209,99')).toBeVisible();
    await expect(page.locator('section:has-text("Planos transparentes")').getByText('Alunos Ilimitados (Sem Limites)')).toBeVisible();
  });

  test('Verify Checkout and Settings page plans details', async ({ page }) => {
    // Bypassar o tour de onboarding
    await page.addInitScript(() => {
      window.localStorage.setItem('danceflow_tour_completed', 'true');
    });

    // Fazer login seguro
    await page.goto('/auth');
    await page.getByPlaceholder('Seu e-mail').fill('teste@flow.com.br');
    await page.getByPlaceholder('Sua senha').fill('251303');
    await page.getByRole('button', { name: /Acessar Conta/i }).click();

    // Esperar painel de visão geral
    await page.waitForURL('**/');

    // Acessar tela de Checkout
    await page.goto('/checkout');
    await page.waitForTimeout(1000);

    // Validar preços e limites no Checkout
    await expect(page.getByText('Plano Bronze')).toBeVisible();
    await expect(page.getByText('R$ 39,99')).toBeVisible();
    await expect(page.getByText('Limite de até 25 Alunos')).toBeVisible();

    await expect(page.getByText('Plano Prata')).toBeVisible();
    await expect(page.getByText('R$ 69,99')).toBeVisible();
    await expect(page.getByText('Limite de até 50 Alunos')).toBeVisible();

    await expect(page.getByText('Plano Ouro')).toBeVisible();
    await expect(page.getByText('R$ 109,99')).toBeVisible();
    await expect(page.getByText('Limite de até 100 Alunos')).toBeVisible();

    await expect(page.getByText('Plano Diamante')).toBeVisible();
    await expect(page.getByText('R$ 209,99')).toBeVisible();
    await expect(page.getByText('Alunos Ilimitados (Sem Limites)')).toBeVisible();

    // Acessar Configurações e verificar preço do plano atual (Bronze)
    await page.goto('/settings');
    await page.waitForTimeout(1500);

    // Clicar na aba Assinatura & Plano
    await page.getByRole('button', { name: /Assinatura & Plano/i }).click();
    await page.waitForTimeout(1000);

    // Como a conta de teste pode estar em qualquer plano no banco local, validamos de forma adaptativa.
    const planText = await page.locator('h4:has-text("Plano") + div h4, h4.capitalize').first().innerText();
    console.log(`Plano ativo no teste: ${planText}`);
    
    if (planText.includes('Grátis') || planText.toLowerCase().includes('gratis')) {
      await expect(page.getByText('(R$ 0,00)')).toBeVisible();
    } else if (planText.includes('Bronze')) {
      await expect(page.getByText('(R$ 39,99/mês)')).toBeVisible();
    } else if (planText.includes('Prata')) {
      await expect(page.getByText('(R$ 69,99/mês)')).toBeVisible();
    } else if (planText.includes('Ouro')) {
      await expect(page.getByText('(R$ 109,99/mês)')).toBeVisible();
    } else if (planText.includes('Diamante')) {
      await expect(page.getByText('(R$ 209,99/mês)')).toBeVisible();
    }
  });
});
