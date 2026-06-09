const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbethqzlthjlmxhxicxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZXRocXpsdGhqbG14aHhpY3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODY4ODksImV4cCI6MjA5NDM2Mjg4OX0.KQpErYld0xL9Y0s7rCVv_u4kIxQSuprMrMoPoNkjiCA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  try {
    console.log('--- FETCHING STUDENTS ---');
    const { data: students, error: studErr } = await supabase.from('students').select('id, name, user_id').limit(5);
    if (studErr) console.error('Students error:', studErr);
    else console.log('Students:', students);

    console.log('\n--- FETCHING SCHOOL SETTINGS ---');
    const { data: settings, error: settErr } = await supabase.from('school_settings').select('id, user_id, school_name');
    if (settErr) console.error('Settings error:', settErr);
    else console.log('School Settings:', settings);

    console.log('\n--- FETCHING PROFILES ---');
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, role, email');
    if (profErr) console.error('Profiles error:', profErr);
    else console.log('Profiles:', profiles);

  } catch (err) {
    console.error('Fatal error:', err);
  }
}

main();
