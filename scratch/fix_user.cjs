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

  // Agora que estamos autenticados, o RLS nos permitirá atualizar o perfil do próprio usuário
  console.log('Atualizando o perfil...');
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 2); // 2 anos no futuro

  const { data, error } = await supabase
    .from('profiles')
    .update({
      status: 'active',
      expires_at: futureDate.toISOString()
    })
    .eq('id', user.id)
    .select();

  if (error) {
    console.error('Erro ao atualizar o perfil:', error);
  } else {
    console.log('Perfil atualizado com sucesso:', data);
  }
}

main();
