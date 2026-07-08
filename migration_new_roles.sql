-- 1. Permite os novos cargos 'coordinator' e 'financial_director' na tabela de perfis
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'user', 'teacher', 'secretary', 'coordinator', 'financial_director'));

-- 2. Cria a função de segurança para verificar se o usuário é coordenador ativo de uma escola
create or replace function public.is_coordinator_of(school_id uuid)
returns boolean as $$
  select exists (
    select 1 
    from public.team_members tm
    join public.profiles p on p.email = tm.email
    where p.id = auth.uid() 
      and tm.user_id = school_id 
      and (tm.role = 'Coordenador' or tm.role = 'coordinator') 
      and tm.status = 'active'
  );
$$ language sql security definer;

-- 3. Cria a função de segurança para verificar se o usuário é diretor/gestor financeiro ativo de uma escola
create or replace function public.is_financial_director_of(school_id uuid)
returns boolean as $$
  select exists (
    select 1 
    from public.team_members tm
    join public.profiles p on p.email = tm.email
    where p.id = auth.uid() 
      and tm.user_id = school_id 
      and (tm.role = 'Diretor Financeiro' or tm.role = 'financial_director' or tm.role = 'Gestor Financeiro') 
      and tm.status = 'active'
  );
$$ language sql security definer;

-- 4. Atualiza a trigger handle_new_user para promover Coordenadores e Diretores Financeiros automaticamente no cadastro
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
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'secretary', 'active', 'gratis');
  elsif member_role = 'instructor' or member_role = 'Professor' then
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'teacher', 'active', 'gratis');
  elsif member_role = 'Coordenador' or member_role = 'coordinator' then
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'coordinator', 'active', 'gratis');
  elsif member_role = 'Diretor Financeiro' or member_role = 'financial_director' or member_role = 'Gestor Financeiro' then
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'financial_director', 'active', 'gratis');
  else
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'user', 'pending', 'gratis');
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- 5. Atualiza as políticas RLS para conceder acesso aos novos cargos

-- A. Alunos (students)
drop policy if exists "Users and staff can view students" on public.students;
create policy "Users and staff can view students" on public.students
  for select using (
    auth.uid() = user_id 
    or public.is_teacher_of(user_id) 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id) 
    or public.is_financial_director_of(user_id)
  );

drop policy if exists "Users and secretaries can manage students" on public.students;
drop policy if exists "Users and staff can manage students" on public.students;
create policy "Users and staff can manage students" on public.students
  for all using (
    auth.uid() = user_id 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id) 
    or public.is_financial_director_of(user_id)
  )
  with check (
    auth.uid() = user_id 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id) 
    or public.is_financial_director_of(user_id)
  );

-- B. Experimentais (trial_classes)
drop policy if exists "Users and secretaries can manage trial classes" on public.trial_classes;
drop policy if exists "Users and staff can manage trial classes" on public.trial_classes;
create policy "Users and staff can manage trial classes" on public.trial_classes
  for all using (
    auth.uid() = user_id 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id) 
    or public.is_financial_director_of(user_id)
  )
  with check (
    auth.uid() = user_id 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id) 
    or public.is_financial_director_of(user_id)
  );

-- C. Turmas (dance_classes)
drop policy if exists "Users and staff can view classes" on public.dance_classes;
create policy "Users and staff can view classes" on public.dance_classes
  for select using (
    auth.uid() = user_id 
    or public.is_teacher_of(user_id) 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id) 
    or public.is_financial_director_of(user_id)
  );

drop policy if exists "Users and secretaries can manage classes" on public.dance_classes;
drop policy if exists "Users and staff can manage classes" on public.dance_classes;
create policy "Users and staff can manage classes" on public.dance_classes
  for all using (
    auth.uid() = user_id 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id)
  )
  with check (
    auth.uid() = user_id 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id)
  );

-- D. Chamadas (attendance)
drop policy if exists "Users and staff can manage attendance" on public.attendance;
create policy "Users and staff can manage attendance" on public.attendance
  for all using (
    auth.uid() = user_id 
    or public.is_teacher_of(user_id) 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id)
  )
  with check (
    auth.uid() = user_id 
    or public.is_teacher_of(user_id) 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id)
  );

-- E. Financeiro (financial_entries)
-- Secretário pode apenas lançar novos registros (insert), sem ver/editar os demais.
-- Diretor financeiro tem acesso total de leitura e escrita.
drop policy if exists "Secretaries can insert financial entries" on public.financial_entries;
create policy "Secretaries can insert financial entries" on public.financial_entries
  for insert with check (public.is_secretary_of(user_id));

drop policy if exists "Financial directors can manage financial entries" on public.financial_entries;
create policy "Financial directors can manage financial entries" on public.financial_entries
  for all using (
    auth.uid() = user_id 
    or public.is_financial_director_of(user_id)
  )
  with check (
    auth.uid() = user_id 
    or public.is_financial_director_of(user_id)
  );

-- F. Membros da Equipe (team_members)
drop policy if exists "Users and staff can view team" on public.team_members;
create policy "Users and staff can view team" on public.team_members
  for select using (
    auth.uid() = user_id 
    or email = (select email from public.profiles where id = auth.uid()) 
    or public.is_coordinator_of(user_id) 
    or public.is_financial_director_of(user_id)
  );

drop policy if exists "Users can manage their own team members" on public.team_members;
drop policy if exists "Users and financial_directors can manage team" on public.team_members;
create policy "Users and financial_directors can manage team" on public.team_members
  for all using (
    auth.uid() = user_id 
    or public.is_financial_director_of(user_id)
  )
  with check (
    auth.uid() = user_id 
    or public.is_financial_director_of(user_id)
  );

-- G. Configurações da Escola (school_settings)
drop policy if exists "Users and staff can view settings" on public.school_settings;
create policy "Users and staff can view settings" on public.school_settings
  for select using (
    auth.uid() = id 
    or public.is_teacher_of(id) 
    or public.is_secretary_of(id) 
    or public.is_coordinator_of(id) 
    or public.is_financial_director_of(id)
  );
