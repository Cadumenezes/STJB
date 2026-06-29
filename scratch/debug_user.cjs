const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbethqzlthjlmxhxicxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZXRocXpsdGhqbG14aHhpY3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODY4ODksImV4cCI6MjA5NDM2Mjg4OX0.KQpErYld0xL9Y0s7rCVv_u4kIxQSuprMrMoPoNkjiCA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Tentando fazer login...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'teste@flow.com.br',
    password: '251303'
  });

  if (authError) {
    console.error('Erro no login do Supabase:', authError);
    return;
  }

  const user = authData.user;
  console.log('Login efetuado com sucesso para o usuário:', user.id);
  console.log('User metadata:', user.user_metadata);

  // Verificando se há um profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id);

  if (profileError) {
    console.error('Erro ao buscar perfil:', profileError);
  } else {
    console.log('Perfil encontrado para o ID:', profile);
  }

  // Vamos ver se o RLS está nos bloqueando
  const { data: allProfiles, error: allProfilesError } = await supabase
    .from('profiles')
    .select('*');

  if (allProfilesError) {
    console.error('Erro ao buscar todos os perfis:', allProfilesError);
  } else {
    console.log('Todos os perfis acessíveis:', allProfiles);
  }
}

main();
