const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbethqzlthjlmxhxicxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZXRocXpsdGhqbG14aHhpY3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODY4ODksImV4cCI6MjA5NDM2Mjg4OX0.KQpErYld0xL9Y0s7rCVv_u4kIxQSuprMrMoPoNkjiCA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data: member } = await supabase.from('team_members').select('*').limit(1);
  console.log('team_members columns:', member ? Object.keys(member[0] || {}) : 'No data');

  const { data: ev } = await supabase.from('events').select('*').limit(1);
  console.log('events columns:', ev ? Object.keys(ev[0] || {}) : 'No data');
}

main();
