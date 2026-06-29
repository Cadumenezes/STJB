const { chromium } = require('playwright');

async function main() {
  console.log('Iniciando o navegador para capturar telas de LGPD...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Ajustar o tamanho da tela para uma visualização bonita
  await page.setViewportSize({ width: 1280, height: 720 });

  // Ir para a página de autenticação/login
  console.log('Navegando para /auth...');
  await page.goto('http://localhost:5173/auth');
  await page.waitForTimeout(2000);

  // 1. Tirar print com o banner de cookies no rodapé
  const cookieImage = 'c:\\Users\\alziro\\danceflow\\public\\screenshots\\real_lgpd_cookies.png';
  console.log('Tirando print do Cookie Banner...');
  await page.screenshot({ path: cookieImage });
  console.log(`Print salvo com sucesso em: ${cookieImage}`);

  // 2. Clicar no link de política para abrir o modal de privacidade (singular: "Política de Privacidade")
  console.log('Abrindo o modal de Política de Privacidade...');
  await page.getByRole('button', { name: /Política de Privacidade/i }).first().click();
  await page.waitForTimeout(1500);

  // Tirar print do modal aberto
  const policiesImage = 'c:\\Users\\alziro\\danceflow\\public\\screenshots\\real_lgpd_policies.png';
  console.log('Tirando print do modal de Políticas...');
  await page.screenshot({ path: policiesImage });
  console.log(`Print salvo com sucesso em: ${policiesImage}`);

  await browser.close();
  console.log('Capturas de LGPD concluídas!');
}

main().catch(console.error);
