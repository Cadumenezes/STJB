-- 1. Atualiza a função que sincroniza a criação de novo usuário no Supabase Auth com a tabela profiles
create or replace function public.handle_new_user()
returns trigger as $$
declare
  member_role text;
begin
  -- Busca o cargo do membro da equipe pelo email
  select role into member_role
  from public.team_members
  where email = new.email
  limit 1;

  if member_role = 'Secretário' or member_role = 'secretary' then
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'secretary', 'active', 'gratis');
  elsif member_role = 'instructor' or member_role = 'Professor' or member_role = 'teacher' then
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'teacher', 'active', 'gratis');
  elsif member_role = 'Coordenador' or member_role = 'coordinator' then
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'coordinator', 'active', 'gratis');
  elsif member_role = 'Diretor Financeiro' or member_role = 'financial_director' then
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'financial_director', 'active', 'gratis');
  else
    -- Default para diretores/donos que se cadastram pelo site
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'user', 'pending', 'gratis');
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- 2. Atualiza a função de gatilho para sincronizar TODOS os cargos possíveis da tabela team_members para a tabela profiles
create or replace function public.sync_team_member_role_to_profile()
returns trigger as $$
begin
  if new.email is not null then
    if new.role = 'Secretário' or new.role = 'secretary' then
      update public.profiles 
      set role = 'secretary', status = 'active'
      where email = new.email;
    elsif new.role = 'instructor' or new.role = 'Professor' or new.role = 'teacher' then
      update public.profiles 
      set role = 'teacher', status = 'active'
      where email = new.email;
    elsif new.role = 'Coordenador' or new.role = 'coordinator' then
      update public.profiles 
      set role = 'coordinator', status = 'active'
      where email = new.email;
    elsif new.role = 'Diretor Financeiro' or new.role = 'financial_director' then
      update public.profiles 
      set role = 'financial_director', status = 'active'
      where email = new.email;
    elsif new.role = 'Diretor' or new.role = 'admin' or new.role = 'user' then
      update public.profiles 
      set role = 'user', status = 'active'
      where email = new.email;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 3. Cria a função de gatilho para suspender automaticamente a conta do ex-funcionário quando ele for excluído da equipe
create or replace function public.on_team_member_deleted_suspend_profile()
returns trigger as $$
begin
  if old.email is not null then
    update public.profiles
    set status = 'suspended'
    where email = old.email;
  end if;
  return old;
end;
$$ language plpgsql security definer;

-- 4. Associa a função de exclusão ao gatilho da tabela team_members
drop trigger if exists on_team_member_deleted on public.team_members;
create trigger on_team_member_deleted
  after delete on public.team_members
  for each row execute procedure public.on_team_member_deleted_suspend_profile();
