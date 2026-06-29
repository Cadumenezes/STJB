const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbethqzlthjlmxhxicxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZXRocXpsdGhqbG14aHhpY3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODY4ODksImV4cCI6MjA5NDM2Mjg4OX0.KQpErYld0xL9Y0s7rCVv_u4kIxQSuprMrMoPoNkjiCA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    // Fazer login
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'teste@flow.com.br',
      password: '251303'
    });
    if (authErr) throw authErr;
    console.log('Auth success for:', authData.user.email);

    // Listar turmas
    const { data: classes, error: classesErr } = await supabase.from('dance_classes').select('id, name');
    if (classesErr) throw classesErr;
    console.log('Classes count:', classes.length);

    // Listar alunos e suas turmas
    const { data: students, error: studentsErr } = await supabase.from('students').select('id, name, class_ids');
    if (studentsErr) throw studentsErr;
    console.log('Students count:', students.length);

    // Mapear turmas para a contagem de alunos
    const classCounts = {};
    for (const c of classes) {
      classCounts[c.id] = { id: c.id, name: c.name, count: 0 };
    }

    for (const s of students) {
      if (s.class_ids && Array.isArray(s.class_ids)) {
        for (const cid of s.class_ids) {
          if (classCounts[cid]) {
            classCounts[cid].count++;
          }
        }
      }
    }

    console.table(Object.values(classCounts));
  } catch (e) {
    console.error(e);
  }
}

check();
