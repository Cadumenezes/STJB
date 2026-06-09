import { test, expect } from '@playwright/test';

test.describe('DanceFlow User Journey', () => {
  test.setTimeout(120000); // 2 minutes timeout

  test('Simulate full journey and take screenshots', async ({ page }) => {
    // 0. Evitar que o modal de onboarding (tour) apareça
    await page.addInitScript(() => {
      window.localStorage.setItem('danceflow_tour_completed', 'true');
    });

    const timestamp = Date.now();
    const profName = `Professor Teste ${timestamp}`;
    const profEmail = `prof.teste.${timestamp}@flow.com.br`;
    const secName = `Secretária Teste ${timestamp}`;
    const secEmail = `sec.teste.${timestamp}@flow.com.br`;
    const productName = `Camisa DanceFlow ${timestamp}`;
    const theaterName = `Teatro Teste ${timestamp}`;
    const eventName = `Festival de Inverno ${timestamp}`;
    const className = `Turma Iniciante ${timestamp}`;
    const student1Name = `João Teste ${timestamp}`;
    const student1Email = `joao.teste.${timestamp}@flow.com.br`;
    const student2Name = `Maria Teste ${timestamp}`;
    const student2Email = `maria.teste.${timestamp}@flow.com.br`;
    const visitorName = `Visitante Teste ${timestamp}`;
    const fixedBillDesc = `Aluguel da Sala ${timestamp}`;

    // Unique CPF format to avoid unique constraint errors
    const student1Cpf = `123.456.789-${String(timestamp % 100).padStart(2, '0')}`;
    const student2Cpf = `987.654.321-${String((timestamp + 1) % 100).padStart(2, '0')}`;

    // 1. Acesso Inicial e Login
    console.log('Iniciando o login...');
    await page.goto('/auth');
    await page.getByPlaceholder('Seu e-mail').fill('teste@flow.com.br');
    await page.getByPlaceholder('Sua senha').fill('251303');
    await page.getByRole('button', { name: /Acessar Conta/i }).click();

    // Espera carregar o painel / dashboard
    await page.waitForURL('**/');
    await expect(page.getByText(/Visão Geral/i).first()).toBeVisible({ timeout: 15000 });
    
    // 2. Configurações
    console.log('Acessando Configurações...');
    await page.getByRole('link', { name: 'Configurações' }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/01_settings.png', fullPage: true });

    // 3. Equipe (Cadastrar Professor e Secretário)
    console.log('Acessando Equipe...');
    await page.getByRole('link', { name: 'Equipe' }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/02_team_initial.png', fullPage: true });
    
    // Cadastrar Professor
    console.log(`Cadastrando Professor: ${profName}...`);
    try {
      await page.getByRole('button', { name: 'Novo Membro' }).click();
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Nome Completo") + input').fill(profName);
      await page.locator('label:has-text("Cargo / Função") + select').selectOption('Professor');
      await page.locator('label:has-text("E-mail de Contato") + input').fill(profEmail);
      await page.locator('label:has-text("Telefone / WhatsApp") + input').fill('11999999999');
      await page.locator('label:has-text("Hora Aula") + input').fill('50.00');
      await page.getByRole('button', { name: 'CADASTRAR MEMBRO' }).click();
      await page.waitForTimeout(1500);
    } catch(e) { 
      console.log('Erro ao cadastrar professor:', e);
    }

    // Cadastrar Secretário
    console.log(`Cadastrando Secretário: ${secName}...`);
    try {
      await page.getByRole('button', { name: 'Novo Membro' }).click();
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Nome Completo") + input').fill(secName);
      await page.locator('label:has-text("Cargo / Função") + select').selectOption('Secretário');
      await page.locator('label:has-text("E-mail de Contato") + input').fill(secEmail);
      await page.locator('label:has-text("Telefone / WhatsApp") + input').fill('11988888888');
      await page.getByRole('button', { name: 'CADASTRAR MEMBRO' }).click();
      await page.waitForTimeout(1500);
    } catch(e) { 
      console.log('Erro ao cadastrar secretário:', e);
    }
    await page.screenshot({ path: 'screenshots/03_team_after_inserts.png', fullPage: true });

    // 4. Estoque (Cadastrar Camisa)
    console.log('Acessando Estoque...');
    await page.getByRole('link', { name: 'Estoque' }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/04_inventory_initial.png', fullPage: true });

    console.log(`Cadastrando Camisa no Estoque: ${productName}...`);
    try {
      await page.getByRole('button', { name: 'Novo Produto' }).click();
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Nome *") + input').fill(productName);
      await page.locator('label:has-text("Preço Custo") + input').fill('20.00');
      await page.locator('label:has-text("Preço Venda") + input').fill('50.00');
      await page.locator('label:has-text("Quantidade *") + input').fill('10');
      await page.locator('label:has-text("Categoria") + input').fill('Uniformes');
      await page.getByRole('button', { name: 'Cadastrar' }).click();
      await page.waitForTimeout(1500);
    } catch(e) { 
      console.log('Erro ao cadastrar produto:', e);
    }
    await page.screenshot({ path: 'screenshots/04_inventory.png', fullPage: true });

    // 5. Teatros
    console.log('Acessando Teatros...');
    await page.getByRole('link', { name: 'Teatros' }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/05_theaters_initial.png', fullPage: true });

    console.log(`Cadastrando Teatro: ${theaterName}...`);
    try {
      await page.getByRole('button', { name: 'Novo Teatro' }).click();
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Nome do Teatro") + input').fill(theaterName);
      await page.locator('label:has-text("Fileiras") + input').fill('10');
      await page.locator('label:has-text("Poltronas/Fileira") + input').fill('20');
      await page.getByRole('button', { name: 'Cadastrar Teatro' }).click();
      await page.waitForTimeout(1500);
    } catch(e) { 
      console.log('Erro ao cadastrar teatro:', e);
    }
    await page.screenshot({ path: 'screenshots/05_theaters.png', fullPage: true });

    // 6. Eventos
    console.log('Acessando Eventos...');
    await page.getByRole('link', { name: 'Eventos' }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/06_events_initial.png', fullPage: true });

    console.log(`Cadastrando Evento: ${eventName}...`);
    try {
      await page.getByRole('button', { name: 'Novo Evento' }).click();
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Nome do Evento") + input').fill(eventName);
      await page.locator('label:has-text("Data") + input').fill('2026-07-15');
      try {
        await page.locator('label:has-text("Local (Teatro)") + select').selectOption({ label: new RegExp(theaterName) });
      } catch(selectErr) {
        await page.locator('label:has-text("Nome do Local") + input').fill(theaterName);
      }
      await page.getByRole('button', { name: 'Criar Evento' }).click();
      await page.waitForTimeout(1500);
    } catch(e) { 
      console.log('Erro ao cadastrar evento:', e);
    }
    await page.screenshot({ path: 'screenshots/06_events.png', fullPage: true });

    // 7. Turmas
    console.log('Acessando Turmas...');
    await page.getByRole('link', { name: 'Turmas' }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/07_classes_initial.png', fullPage: true });

    console.log(`Cadastrando Turma: ${className}...`);
    try {
      await page.getByRole('button', { name: 'Nova Turma' }).click();
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Nome da Turma") + input').fill(className);
      await page.locator('label:has-text("Horário das Aulas") + input').fill('19:00 - 20:00');
      await page.getByRole('button', { name: 'Cadastrar Turma' }).click();
      await page.waitForTimeout(1500);
    } catch(e) { 
      console.log('Erro ao cadastrar turma:', e);
    }
    await page.screenshot({ path: 'screenshots/07_classes.png', fullPage: true });

    // 8. Alunos (Cadastrar dois alunos com todos os campos obrigatórios)
    console.log('Acessando Alunos...');
    await page.getByRole('link', { name: 'Alunos' }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/08_students_initial.png', fullPage: true });

    // Aluno 1
    console.log(`Cadastrando Aluno 1: ${student1Name}...`);
    try {
      await page.getByRole('button', { name: 'Novo Aluno' }).click();
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Nome do Aluno") + input').fill(student1Name);
      await page.locator('label:has-text("Nome do Responsável") + input').fill('Responsável João');
      await page.locator('label:has-text("Telefone do Responsável") + input').fill('11977777777');
      await page.locator('label:has-text("Email *") + input').fill(student1Email);
      await page.locator('label:has-text("Data de Nascimento") + input').fill('01/01/2015');
      await page.locator('label:has-text("CPF do Responsável") + input').fill(student1Cpf);
      await page.locator('label:has-text("Endereço *") + input').fill('Rua do João, 123');
      await page.getByRole('button', { name: 'Cadastrar Aluno' }).click();
      await page.waitForTimeout(1500);
    } catch(e) { 
      console.log('Erro ao cadastrar aluno 1:', e);
    }

    // Aluno 2
    console.log(`Cadastrando Aluno 2: ${student2Name}...`);
    try {
      await page.getByRole('button', { name: 'Novo Aluno' }).click();
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Nome do Aluno") + input').fill(student2Name);
      await page.locator('label:has-text("Nome do Responsável") + input').fill('Responsável Maria');
      await page.locator('label:has-text("Telefone do Responsável") + input').fill('11988888888');
      await page.locator('label:has-text("Email *") + input').fill(student2Email);
      await page.locator('label:has-text("Data de Nascimento") + input').fill('02/02/2016');
      await page.locator('label:has-text("CPF do Responsável") + input').fill(student2Cpf);
      await page.locator('label:has-text("Endereço *") + input').fill('Rua da Maria, 456');
      await page.getByRole('button', { name: 'Cadastrar Aluno' }).click();
      await page.waitForTimeout(1500);
    } catch(e) { 
      console.log('Erro ao cadastrar aluno 2:', e);
    }
    await page.screenshot({ path: 'screenshots/08_students.png', fullPage: true });

    // 8.5. Adicionar alunos como participantes no Evento
    console.log('Voltando ao Eventos para adicionar participantes...');
    await page.getByRole('link', { name: 'Eventos' }).click();
    await page.waitForTimeout(1500);
    
    // Clicar na aba do evento criado
    try {
      await page.getByRole('button', { name: eventName, exact: true }).click();
      await page.waitForTimeout(1000);
    } catch(e) {
      console.log('Não foi possível clicar na aba do evento:', e);
    }

    // Adicionar João
    console.log(`Adicionando ${student1Name} ao evento...`);
    try {
      await page.locator('select#addStudentSelect').selectOption({ label: student1Name });
      await page.locator('select#addStudentSelect + button').click();
      await page.waitForTimeout(1500);
    } catch(e) {
      console.log('Erro ao adicionar João como participante:', e);
    }

    // Adicionar Maria
    console.log(`Adicionando ${student2Name} ao evento...`);
    try {
      await page.locator('select#addStudentSelect').selectOption({ label: student2Name });
      await page.locator('select#addStudentSelect + button').click();
      await page.waitForTimeout(1500);
    } catch(e) {
      console.log('Erro ao adicionar Maria como participante:', e);
    }

    await page.screenshot({ path: 'screenshots/08b_event_participants.png', fullPage: true });

    // Acessar sub-aba Mapa de Assentos
    console.log('Visualizando mapa de assentos...');
    try {
      await page.getByRole('button', { name: 'Mapa de Assentos' }).click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/08c_event_seating_map.png', fullPage: true });
    } catch(e) {
      console.log('Erro ao acessar sub-aba mapa de assentos:', e);
    }

    // 9. Experimentais
    console.log('Acessando Experimentais...');
    await page.getByRole('link', { name: 'Experimentais' }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/09_trials_initial.png', fullPage: true });

    console.log(`Agendando Aula Experimental para ${visitorName}...`);
    try {
      await page.getByRole('button', { name: 'Agendar Aula' }).click();
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Nome do Interessado") + input').fill(visitorName);
      await page.locator('label:has-text("Telefone (WhatsApp)") + input').fill('11966666666');
      await page.locator('label:has-text("Data Agendada") + input').fill('2026-06-20');
      await page.getByRole('button', { name: 'Confirmar Agendamento' }).click();
      await page.waitForTimeout(1500);
    } catch(e) { 
      console.log('Erro ao cadastrar aula experimental:', e);
    }
    await page.screenshot({ path: 'screenshots/09_trials.png', fullPage: true });

    // 10. Financeiro (Sub-abas e cadastrar conta fixa)
    console.log('Acessando Financeiro...');
    await page.getByRole('link', { name: 'Financeiro' }).click();
    await page.waitForTimeout(2000);
    
    // Sub-aba: Fluxo de Caixa (já deve abrir por padrão)
    console.log('Visualizando Fluxo de Caixa...');
    await page.screenshot({ path: 'screenshots/10a_financial_flow.png', fullPage: true });

    // Sub-aba: Contas Fixas
    console.log('Acessando Contas Fixas...');
    try {
      await page.getByRole('button', { name: 'Contas Fixas' }).click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/10b_financial_fixed_bills.png', fullPage: true });

      // Cadastrar Conta Fixa
      console.log(`Cadastrando Conta Fixa: ${fixedBillDesc}...`);
      await page.getByRole('button', { name: 'Configurar Conta Fixa' }).click();
      await page.waitForTimeout(500);
      await page.locator('label:has-text("Descrição da Conta") + input').fill(fixedBillDesc);
      await page.locator('label:has-text("Valor Mensal") + input').fill('1200.00');
      await page.locator('label:has-text("Dia do Vencimento") + input').fill('10');
      await page.locator('label:has-text("Categoria") + input').fill('Instalações');
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/10c_financial_fixed_after_insert.png', fullPage: true });
    } catch(e) {
      console.log('Erro ao cadastrar conta fixa no financeiro:', e);
    }

    // Sub-aba: Pagamentos Equipe
    console.log('Acessando Pagamentos Equipe...');
    try {
      await page.getByRole('button', { name: 'Pagamentos Equipe' }).click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/10d_financial_payroll.png', fullPage: true });
    } catch(e) {
      console.log('Erro ao acessar pagamentos de equipe:', e);
    }

    // 11. Agenda
    console.log('Acessando Agenda...');
    await page.getByRole('link', { name: 'Agenda' }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/11_schedule.png', fullPage: true });

    // 12. Visão Geral (Dashboard final com dados atualizados)
    console.log('Voltando à Visão Geral...');
    await page.getByRole('link', { name: 'Visão geral' }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/12_dashboard_final.png', fullPage: true });

    console.log('Jornada do usuário concluída com sucesso!');
  });
});
