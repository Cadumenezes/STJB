const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbethqzlthjlmxhxicxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZXRocXpsdGhqbG14aHhpY3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODY4ODksImV4cCI6MjA5NDM2Mjg4OX0.KQpErYld0xL9Y0s7rCVv_u4kIxQSuprMrMoPoNkjiCA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('--- BUSCANDO PROFESSORES ---');
  const { data: members, error: mError } = await supabase.from('team_members').select('*');
  if (mError) {
    console.error('Erro ao buscar team_members:', mError);
    return;
  }
  
  for (const member of members) {
    console.log(`\nID: ${member.id} | Nome: ${member.name} | Cargo: ${member.role}`);
    
    // Classes
    const { data: classes, error: cError } = await supabase
      .from('dance_classes')
      .select('*')
      .eq('instructor_id', member.id);
    
    if (classes && classes.length > 0) {
      console.log('  Aulas cadastradas:');
      classes.forEach(c => {
        console.log(`    - ${c.name} | Horário: ${c.schedule}`);
      });
    }

    // Frequência em Junho de 2026
    const { data: attendance, error: aError } = await supabase
      .from('attendance')
      .select('*')
      .eq('instructor_id', member.id)
      .eq('type', 'instructor')
      .eq('status', 'present')
      .gte('date', '2026-06-01')
      .lte('date', '2026-06-30');
      
    if (attendance && attendance.length > 0) {
      console.log('  Presenças registradas em Junho/2026 (attendance):');
      attendance.forEach(att => {
        console.log(`    - Data: ${att.date} | Aula ID: ${att.class_id} | Status: ${att.status}`);
      });
    } else {
      console.log('  Nenhuma presença registrada em Junho/2026 na tabela attendance.');
    }

    // Frequência de equipe (team_attendance) em Junho de 2026
    const { data: teamAtt, error: tError } = await supabase
      .from('team_attendance')
      .select('*')
      .eq('member_id', member.id)
      .gte('date', '2026-06-01')
      .lte('date', '2026-06-30');

    if (tError) {
      console.log('  Erro ao buscar team_attendance:', tError.message);
    } else if (teamAtt && teamAtt.length > 0) {
      console.log('  Registros em team_attendance (Junho/2026):');
      teamAtt.forEach(ta => {
        console.log(`    - Data: ${ta.date} | Status: ${ta.status}`);
      });
    } else {
      console.log('  Nenhum registro em team_attendance.');
    }
  }
}

main();
