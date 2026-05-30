-- 1. Remove a restrição de plano antiga da tabela de perfis
alter table public.profiles drop constraint if exists profiles_plan_check;

-- 2. Adiciona a nova restrição atualizada para permitir todos os planos válidos
alter table public.profiles add constraint profiles_plan_check check (plan in ('starter', 'pro', 'gratis', 'prata', 'ouro', 'diamante'));

-- 3. Define o valor padrão da coluna plan para 'gratis'
alter table public.profiles alter column plan set default 'gratis';

-- 4. Atualiza os perfis que estão atualmente como 'starter' para 'gratis'
update public.profiles
set plan = 'gratis'
where plan = 'starter';

-- 5. Atualiza a função do trigger para registrar novos usuários com o plano padrão 'gratis' em vez de 'starter'
create or replace function public.handle_new_user()
returns trigger as $$
declare
  member_role text;
begin
  -- Verifica se o e-mail cadastrado pertence a algum membro ativo da equipe
  select role from public.team_members 
  where email = new.email and status = 'active'
  limit 1
  into member_role;

  -- Se for um Secretário ou Professor, cria o perfil correspondente já ativo com o plano padrão 'gratis'
  if member_role = 'Secretário' or member_role = 'secretary' then
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'secretary', 'active', 'gratis');
  elsif member_role = 'instructor' or member_role = 'Professor' then
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'teacher', 'active', 'gratis');
  else
    -- Usuário comum (escola nova) inicia pendente com o plano padrão 'gratis'
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'user', 'pending', 'gratis');
  end if;
  
  return new;
end;
$$ language plpgsql security definer;
