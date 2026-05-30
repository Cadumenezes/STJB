const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbethqzlthjlmxhxicxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZXRocXpsdGhqbG14aHhpY3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODY4ODksImV4cCI6MjA5NDM2Mjg4OX0.KQpErYld0xL9Y0s7rCVv_u4kIxQSuprMrMoPoNkjiCA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const tables = ['students', 'dance_classes', 'attendance', 'team_members', 'school_settings', 'profiles'];

async function checkTable(table) {
  const url = `${supabaseUrl}/rest/v1/${table}?select=user_id&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: supabaseAnonKey
    }
  });
  const data = await res.json();
  return {
    table,
    status: res.status,
    message: data.message || 'OK'
  };
}

async function main() {
  console.log('Checking user_id existence across tables...');
  const results = [];
  for (const table of tables) {
    const result = await checkTable(table);
    results.push(result);
  }
  console.table(results);
}

main();
