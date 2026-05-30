-- 1. Permite o cargo 'secretary' na tabela de perfis
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'user', 'teacher', 'secretary'));

-- 2. Remove restrições antigas de cargo na tabela de membros da equipe para suportar cargos customizados unissex
alter table public.team_members drop constraint if exists team_members_role_check;

-- 3. Cria a função de segurança para verificar se o usuário é secretário ativo de uma escola
create or replace function public.is_secretary_of(school_id uuid)
returns boolean as $$
  select exists (
    select 1 
    from public.team_members tm
    join public.profiles p on p.email = tm.email
    where p.id = auth.uid() 
      and tm.user_id = school_id 
      and (tm.role = 'Secretário' or tm.role = 'secretary') 
      and tm.status = 'active'
  );
$$ language sql security definer;

-- 4. Cria a tabela de Chamada Diária da Equipe (Ponto)
create table if not exists public.team_attendance (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  member_id uuid references public.team_members(id) on delete cascade not null,
  date date not null,
  status text not null check (status in ('present', 'absent', 'late')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(member_id, date)
);

-- Habilita RLS na chamada da equipe
alter table public.team_attendance enable row level security;

-- Políticas para chamada da equipe
drop policy if exists "Users can manage their own team attendance" on public.team_attendance;
create policy "Users can manage their own team attendance" on public.team_attendance
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Secretaries can view/manage team attendance" on public.team_attendance;
create policy "Secretaries can view/manage team attendance" on public.team_attendance
  for all using (public.is_secretary_of(user_id)) with check (public.is_secretary_of(user_id));

-- 5. Atualiza as Políticas RLS das tabelas principais para dar acesso ao Secretário

-- A. Alunos (students)
drop policy if exists "Users and teachers can view students" on public.students;
create policy "Users and staff can view students" on public.students
  for select using (auth.uid() = user_id or public.is_teacher_of(user_id) or public.is_secretary_of(user_id));

drop policy if exists "Users can manage their own students" on public.students;
create policy "Users and secretaries can manage students" on public.students
  for all using (auth.uid() = user_id or public.is_secretary_of(user_id))
  with check (auth.uid() = user_id or public.is_secretary_of(user_id));

-- B. Experimentais (trial_classes)
alter table if exists public.trial_classes enable row level security;
drop policy if exists "Users can manage their own trial classes" on public.trial_classes;
create policy "Users and secretaries can manage trial classes" on public.trial_classes
  for all using (auth.uid() = user_id or public.is_secretary_of(user_id))
  with check (auth.uid() = user_id or public.is_secretary_of(user_id));

-- C. Turmas (dance_classes)
drop policy if exists "Users and teachers can view classes" on public.dance_classes;
create policy "Users and staff can view classes" on public.dance_classes
  for select using (auth.uid() = user_id or public.is_teacher_of(user_id) or public.is_secretary_of(user_id));

drop policy if exists "Users can manage their own classes" on public.dance_classes;
create policy "Users and secretaries can manage classes" on public.dance_classes
  for all using (auth.uid() = user_id or public.is_secretary_of(user_id))
  with check (auth.uid() = user_id or public.is_secretary_of(user_id));

-- D. Chamada de Alunos (attendance)
drop policy if exists "Users and active teachers can manage attendance" on public.attendance;
create policy "Users and staff can manage attendance" on public.attendance
  for all using (auth.uid() = user_id or public.is_teacher_of(user_id) or public.is_secretary_of(user_id))
  with check (auth.uid() = user_id or public.is_teacher_of(user_id) or public.is_secretary_of(user_id));

-- E. Financeiro (financial_entries)
-- Secretário pode apenas lançar novos registros (insert), sem ver/editar os demais
drop policy if exists "Secretaries can insert financial entries" on public.financial_entries;
create policy "Secretaries can insert financial entries" on public.financial_entries
  for insert with check (public.is_secretary_of(user_id));

-- F. Produtos / Estoque / Loja (products)
-- Secretário pode visualizar produtos e atualizar quantidade (ao vender)
drop policy if exists "Users and staff can view products" on public.products;
create policy "Users and staff can view products" on public.products
  for select using (auth.uid() = user_id or public.is_secretary_of(user_id));

drop policy if exists "Users and staff can update products" on public.products;
create policy "Users and staff can update products" on public.products
  for update using (auth.uid() = user_id or public.is_secretary_of(user_id))
  with check (auth.uid() = user_id or public.is_secretary_of(user_id));

-- G. Eventos & Participantes (events / event_participants)
-- Secretário pode ver eventos e atualizar participantes
drop policy if exists "Users and staff can view events" on public.events;
create policy "Users and staff can view events" on public.events
  for select using (auth.uid() = user_id or public.is_secretary_of(user_id));

drop policy if exists "Users and staff can view event participants" on public.event_participants;
create policy "Users and staff can view event participants" on public.event_participants
  for select using (auth.uid() = user_id or public.is_secretary_of(user_id));

drop policy if exists "Users and staff can update event participants" on public.event_participants;
create policy "Users and staff can update event participants" on public.event_participants
  for update using (auth.uid() = user_id or public.is_secretary_of(user_id))
  with check (auth.uid() = user_id or public.is_secretary_of(user_id));

-- H. Configurações da Escola (school_settings)
drop policy if exists "Users and active teachers can view settings" on public.school_settings;
create policy "Users and staff can view settings" on public.school_settings
  for select using (auth.uid() = id or public.is_teacher_of(id) or public.is_secretary_of(id));

-- 6. Atualiza o trigger `handle_new_user` para promover Secretários e Professores no cadastro
create or replace function public.handle_new_user()
returns trigger as $$
declare
  member_role text;
begin
  select role from public.team_members 
  where email = new.email and status = 'active'
  limit 1
  into member_role;

  if member_role = 'Secretário' or member_role = 'secretary' then
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'secretary', 'active', 'starter');
  elsif member_role = 'instructor' or member_role = 'Professor' then
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'teacher', 'active', 'starter');
  else
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'user', 'pending', 'starter');
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- 7. Cria o trigger de sincronização automática de perfil quando o administrador altera o cargo de um membro da equipe
create or replace function public.sync_team_member_role_to_profile()
returns trigger as $$
begin
  if new.email is not null then
    if new.role = 'Secretário' or new.role = 'secretary' then
      update public.profiles 
      set role = 'secretary', status = 'active'
      where email = new.email;
    elsif new.role = 'instructor' or new.role = 'Professor' then
      update public.profiles 
      set role = 'teacher', status = 'active'
      where email = new.email;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_team_member_role_sync on public.team_members;
create trigger on_team_member_role_sync
  after insert or update of role on public.team_members
  for each row execute procedure public.sync_team_member_role_to_profile();
