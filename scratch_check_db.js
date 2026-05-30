const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbethqzlthjlmxhxicxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZXRocXpsdGhqbG14aHhpY3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODY4ODksImV4cCI6MjA5NDM2Mjg4OX0.KQpErYld0xL9Y0s7rCVv_u4kIxQSuprMrMoPoNkjiCA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data, error } = await supabase.from('team_members').select('*').limit(1);
  if (error) {
    console.error('Error fetching team_members:', error);
  } else {
    console.log('Success! team_members sample:', data);
    
    // Let's try to fetch school_settings to see its columns
    const { data: settings, error: err2 } = await supabase.from('school_settings').select('*').limit(1);
    console.log('school_settings sample:', settings);
  }
}

main();
