const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbethqzlthjlmxhxicxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZXRocXpsdGhqbG14aHhpY3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODY4ODksImV4cCI6MjA5NDM2Mjg4OX0.KQpErYld0xL9Y0s7rCVv_u4kIxQSuprMrMoPoNkjiCA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('--- DIAGNOSTIC DATA ---');
  
  const { data: members, error: err1 } = await supabase.from('team_members').select('*');
  if (err1) {
    console.error('Error fetching team_members:', err1);
  } else {
    console.log('TEAM MEMBERS (in database):');
    members.forEach(m => {
      console.log(`- Name: ${m.name}, Email: ${m.email}, Role: ${m.role}, Status: ${m.status}`);
    });
  }

  const { data: profiles, error: err2 } = await supabase.from('profiles').select('*');
  if (err2) {
    console.error('Error fetching profiles:', err2);
  } else {
    console.log('\nPROFILES (in database):');
    profiles.forEach(p => {
      console.log(`- Email: ${p.email}, Role: ${p.role}, Status: ${p.status}, ExpiresAt: ${p.expires_at}`);
    });
  }
}

main();
