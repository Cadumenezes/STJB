const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbethqzlthjlmxhxicxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZXRocXpsdGhqbG14aHhpY3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODY4ODksImV4cCI6MjA5NDM2Mjg4OX0.KQpErYld0xL9Y0s7rCVv_u4kIxQSuprMrMoPoNkjiCA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    const { data: exams, error: examsErr } = await supabase.from('exams').select('*').limit(1);
    console.log('Exams table access:', examsErr ? `Error: ${examsErr.message}` : 'Success!');
    if (exams) console.log('Exams:', exams);

    const { data: grades, error: gradesErr } = await supabase.from('exam_grades').select('*').limit(1);
    console.log('Exam Grades table access:', gradesErr ? `Error: ${gradesErr.message}` : 'Success!');
    if (grades) console.log('Exam Grades:', grades);
  } catch (e) {
    console.error(e);
  }
}

check();
