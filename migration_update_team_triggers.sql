-- 1. Atualiza a função de gatilho para sincronizar TODOS os cargos possíveis da tabela team_members para a tabela profiles
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

-- 2. Cria a função de gatilho para suspender automaticamente a conta do ex-funcionário quando ele for excluído da equipe
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

-- 3. Associa a função de exclusão ao gatilho da tabela team_members
drop trigger if exists on_team_member_deleted on public.team_members;
create trigger on_team_member_deleted
  after delete on public.team_members
  for each row execute procedure public.on_team_member_deleted_suspend_profile();
