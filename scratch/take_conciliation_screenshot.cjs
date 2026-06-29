const { chromium } = require('playwright');

async function main() {
  console.log('Iniciando o navegador para capturar a tela de conciliação bancária...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Ajustar o tamanho da tela para uma visualização ampla
  await page.setViewportSize({ width: 1280, height: 800 });

  // Configurar localStorage para evitar tutoriais
  await page.addInitScript(() => {
    window.localStorage.setItem('danceflow_tour_completed', 'true');
  });

  // Fazer login
  console.log('Navegando para /auth e realizando login...');
  await page.goto('http://localhost:5173/auth');
  await page.getByPlaceholder('Seu e-mail').fill('teste@flow.com.br');
  await page.getByPlaceholder('Sua senha').fill('251303');
  await page.getByRole('button', { name: /Acessar Conta/i }).click();

  // Esperar carregar
  console.log('Aguardando redirecionamento para o dashboard...');
  await page.waitForURL('**/');
  await page.waitForTimeout(2000);

  // Navegar para o Financeiro
  console.log('Navegando para o Financeiro...');
  await page.getByRole('link', { name: 'Financeiro' }).click();
  await page.waitForTimeout(2500);

  // Clicar na aba de Conciliação por Extrato
  console.log('Acessando a aba "Conciliação por Extrato"...');
  await page.getByRole('button', { name: 'Conciliação por Extrato' }).click();
  await page.waitForTimeout(1500);

  // Clicar no botão do simulador para preencher a tela de correspondência de pagamentos
  console.log('Simulando a importação de um extrato bancário...');
  await page.getByRole('button', { name: /Gerar Extrato de Teste/i }).click();
  await page.waitForTimeout(2000);

  // Tirar print da tela de Conciliação
  const destPath = 'c:\\Users\\alziro\\danceflow\\public\\screenshots\\real_financial_conciliation.png';
  const assetPath = 'c:\\Users\\alziro\\danceflow\\src\\assets\\financial_dashboard_mockup.png';
  
  console.log('Capturando tela real da Conciliação Bancária...');
  await page.screenshot({ path: destPath, fullPage: false });
  console.log(`Imagem salva em: ${destPath}`);

  // Copiar também para a pasta de assets da Landing Page
  console.log('Copiando a imagem para a Landing Page...');
  await page.screenshot({ path: assetPath, fullPage: false });
  console.log(`Imagem de asset da Landing Page atualizada em: ${assetPath}`);

  await browser.close();
  console.log('Processo de captura concluído com sucesso!');
}

main().catch(console.error);
