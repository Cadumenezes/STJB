import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fbethqzlthjlmxhxicxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZXRocXpsdGhqbG14aHhpY3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODY4ODksImV4cCI6MjA5NDM2Mjg4OX0.KQpErYld0xL9Y0s7rCVv_u4kIxQSuprMrMoPoNkjiCA';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

test.describe('DanceFlow Evaluations Screenshots', () => {
  test.setTimeout(120000); // 2 minutes

  test('Generate evaluations screenshots', async ({ page }) => {
    // 0. Vincular alunos à primeira turma via API para garantir dados na tabela
    console.log('Autenticando no Supabase para preparar dados...');
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: 'teste@flow.com.br',
      password: '251303'
    });
    if (authErr) {
      console.error('Erro de autenticação no Supabase:', authErr.message);
    } else {
      console.log('Autenticado com sucesso. Vinculando alunos à primeira turma...');
      const { data: classes } = await supabase.from('dance_classes').select('id').order('name');
      const { data: students } = await supabase.from('students').select('id');
      
      if (classes && classes.length > 0 && students && students.length > 0) {
        const classId = classes[0].id;
        console.log(`Vinculando alunos à turma: ${classId}`);
        // Vincular os 3 primeiros alunos à primeira turma
        const studentIds = students.slice(0, 3).map(s => s.id);
        const { error: updateErr } = await supabase
          .from('students')
          .update({ class_ids: [classId] })
          .in('id', studentIds);
          
        if (updateErr) {
          console.error('Erro ao vincular alunos:', updateErr.message);
        } else {
          console.log('Alunos vinculados com sucesso!');
        }
      } else {
        console.log('Não foi possível vincular alunos: Turmas ou Alunos vazios.');
      }
    }

    // Configurar localStorage para evitar onboarding
    await page.addInitScript(() => {
      window.localStorage.setItem('danceflow_tour_completed', 'true');
    });

    const artifactDir = 'C:\\Users\\alziro\\.gemini\\antigravity\\brain\\8a565fbd-b674-4931-8003-87968a9733af\\';

    // 1. Fazer Login no painel
    console.log('Realizando login no painel...');
    await page.goto('/auth');
    await page.getByPlaceholder('Seu e-mail').fill('teste@flow.com.br');
    await page.getByPlaceholder('Sua senha').fill('251303');
    await page.getByRole('button', { name: /Acessar Conta/i }).click();

    // Esperar carregar o painel / dashboard
    await page.waitForURL('**/');
    await expect(page.getByText(/Visão Geral/i).first()).toBeVisible({ timeout: 15000 });
    console.log('Login efetuado com sucesso!');

    // 2. Navegar para a página de Avaliações
    console.log('Navegando para a aba de Avaliações...');
    await page.getByRole('link', { name: 'Avaliações' }).click();
    await page.waitForTimeout(2000);

    // 3. Gerenciar Provas: Criar uma Prova de teste
    console.log('Acessando Gerenciar Provas...');
    await page.getByRole('button', { name: 'Gerenciar Provas' }).click();
    await page.waitForTimeout(1000);

    // Clicar em Nova Avaliação
    await page.getByRole('button', { name: 'Nova Avaliação' }).click();
    await page.waitForTimeout(1000);

    // Preencher Modal
    console.log('Preenchendo nova avaliação...');
    await page.getByPlaceholder('Ex: Prova Semestral de Ballet - Módulo 1').fill('Exame Prático de Jazz - 1º Semestre');
    
    // Selecionar a primeira turma disponível no formulário do modal
    const classSelect = page.locator('form select').first();
    await classSelect.selectOption({ index: 1 }); // Seleciona a primeira turma cadastrada (index 1)
    
    await page.locator('input[type="date"]').fill('2026-06-25');
    await page.getByPlaceholder('Descreva as técnicas avaliadas ou observações importantes sobre esta prova...').fill('Avaliação prática de coordenação motora, saltos transversais e expressão corporal no Jazz.');

    await page.waitForTimeout(1000);
    
    // Salvar Prova
    await page.getByRole('button', { name: 'Salvar Avaliação' }).click();
    await page.waitForTimeout(2500);

    // Tirar screenshot da listagem de exames
    console.log('Tirando screenshot de Gerenciar Provas...');
    await page.screenshot({ path: `${artifactDir}14_evaluations_manage.png`, fullPage: false });

    // 4. Lançar Notas
    console.log('Acessando Lançar Notas...');
    await page.getByRole('button', { name: 'Lançar Notas' }).click();
    await page.waitForTimeout(1500);

    // Selecionar a turma (forçar onChange selecionando primeiro o vazio)
    const gradesClassSelect = page.locator('select').first();
    await gradesClassSelect.selectOption({ value: '' });
    await page.waitForTimeout(500);
    await gradesClassSelect.selectOption({ index: 1 });
    await page.waitForTimeout(2000);

    // Selecionar a prova criada
    const gradesExamSelect = page.locator('select').nth(1);
    // Esperar a opção index 1 estar anexada ao DOM
    await expect(gradesExamSelect.locator('option').nth(1)).toBeAttached({ timeout: 10000 });
    await gradesExamSelect.selectOption({ index: 1 });
    await page.waitForTimeout(2000);

    // Listar alunos e preencher notas
    console.log('Preenchendo notas fictícias...');
    
    // Pegar as linhas dos alunos na tabela
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    console.log(`Linhas de alunos encontradas: ${rowCount}`);
    
    if (rowCount > 0) {
      // Preencher o primeiro aluno
      const firstRow = rows.first();
      await firstRow.locator('input[type="number"]').fill('9.5');
      await firstRow.locator('select').selectOption('Excelente');
      await firstRow.locator('input[type="text"]').fill('Excelente flexibilidade nos saltos e altíssimo nível de concentração durante o exame.');

      if (rowCount > 1) {
        // Preencher o segundo aluno
        const secondRow = rows.nth(1);
        await secondRow.locator('input[type="number"]').fill('8.0');
        await secondRow.locator('select').selectOption('Bom');
        await secondRow.locator('input[type="text"]').fill('Boa execução de movimentos, mas precisa trabalhar mais o alinhamento postural nos giros.');
      }

      await page.waitForTimeout(1000);
      
      // Clicar em salvar notas para persistir e ativar botão de impressão
      console.log('Salvando notas da turma...');
      await page.getByRole('button', { name: 'Salvar Notas da Turma' }).click();
      await page.waitForTimeout(2500);

      // Tirar screenshot da aba Lançar Notas com a tabela preenchida
      console.log('Tirando screenshot de Lançar Notas...');
      await page.screenshot({ path: `${artifactDir}14_evaluations_grades.png`, fullPage: false });

      // 5. Impressão do Boletim
      console.log('Tirando screenshot do Boletim de Impressão...');
      
      // Mockar window.print
      await page.evaluate(() => {
        window.print = () => { console.log('Mocked window.print called!'); };
      });

      // Clicar no botão de impressão do primeiro aluno (em mídia screen)
      const printButton = page.locator('tbody tr').first().locator('button');
      await printButton.click();
      
      // Agora sim, emular mídia como print para mostrar a div do portal e aplicar estilos CSS
      await page.emulateMedia({ media: 'print' });
      await page.waitForTimeout(400);

      // Capturar a div específica de impressão em A4
      const printContainer = page.locator('#printable-evaluation-report');
      await printContainer.screenshot({ path: `${artifactDir}14_evaluations_print.png` });

      // Restaurar mídia original
      await page.emulateMedia({ media: 'screen' });
    } else {
      console.error('Nenhum aluno encontrado na turma selecionada!');
    }
    
    console.log('Todas as screenshots foram tiradas com sucesso!');
  });
});
