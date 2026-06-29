const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fbethqzlthjlmxhxicxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZXRocXpsdGhqbG14aHhpY3hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODY4ODksImV4cCI6MjA5NDM2Mjg4OX0.KQpErYld0xL9Y0s7rCVv_u4kIxQSuprMrMoPoNkjiCA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Tentando fazer login com o usuário de teste...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'teste@flow.com.br',
    password: '251303'
  });

  if (authError) {
    console.error('Erro ao autenticar:', authError);
    return;
  }

  const user = authData.user;
  console.log('Autenticado com ID:', user.id);

  // Limpando o flag de cancelamento
  console.log('Limpando flag de cancelamento no perfil...');
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ cancel_at_period_end: false })
    .eq('id', user.id);

  if (updateError) {
    console.error('Erro ao atualizar o perfil:', updateError);
  } else {
    console.log('Flag cancel_at_period_end redefinido com sucesso para false!');
  }

  // Opcional: remover os feedbacks de cancelamento criados pelo teste automatizado para manter a listagem limpa no admin
  console.log('Removendo feedbacks de cancelamento de teste...');
  const { error: deleteError } = await supabase
    .from('cancellation_feedbacks')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Erro ao deletar feedbacks de teste:', deleteError);
  } else {
    console.log('Feedbacks de teste limpos do banco com sucesso!');
  }
}

main();
