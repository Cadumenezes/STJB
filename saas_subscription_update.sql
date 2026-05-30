-- 1. Adiciona as colunas de controle de plano na tabela de perfis
alter table public.profiles
add column if not exists plan text default 'gratis' check (plan in ('starter', 'pro', 'gratis', 'prata', 'ouro', 'diamante')),
add column if not exists expires_at date;

-- 2. Atualiza a trigger para colocar os usuários novos automaticamente no 'gratis' (caso precisem)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, phone, role, status, plan)
  values (new.id, new.email, new.raw_user_meta_data->>'phone', 'user', 'pending', 'gratis');
  return new;
end;
$$ language plpgsql security definer;

-- 3. Define que o seu usuário Admin nunca expira e é sempre Pro!
update public.profiles
set plan = 'pro', expires_at = '2099-12-31'
where role = 'admin';
