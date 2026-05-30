-- 0. Garante que todas as tabelas principais tenham a coluna user_id para isolamento de dados (Multi-SaaS)
alter table public.team_members add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.students add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.dance_classes add column if not exists user_id uuid references auth.users(id) default auth.uid();
alter table public.attendance add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- 1. Permite o cargo 'teacher' na tabela de perfis
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'user', 'teacher'));

-- 2. Cria a função de segurança para verificar se o usuário atual é professor ativo de uma escola
create or replace function public.is_teacher_of(school_id uuid)
returns boolean as $$
  select exists (
    select 1 
    from public.team_members tm
    join public.profiles p on p.email = tm.email
    where p.id = auth.uid() 
      and tm.user_id = school_id 
      and tm.role = 'instructor' 
      and tm.status = 'active'
  );
$$ language sql security definer;

-- 3. Atualiza a trigger de novos cadastros para promover e ativar professores na hora!
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_instructor boolean;
begin
  -- Checa se o e-mail do novo usuário já foi cadastrado na lista de instrutores
  select exists (
    select 1 from public.team_members where email = new.email and role = 'instructor' and status = 'active'
  ) into is_instructor;

  if is_instructor then
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'teacher', 'active', 'starter');
  else
    insert into public.profiles (id, email, phone, role, status, plan)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'user', 'pending', 'starter');
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- 4. Atualiza as Políticas RLS (Segurança de Linha) das tabelas principais

-- A. Alunos (students)
drop policy if exists "Users can manage their own students" on public.students;
create policy "Users and teachers can view students" on public.students
  for select using (auth.uid() = user_id or public.is_teacher_of(user_id));
create policy "Users can manage their own students" on public.students
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- B. Turmas (dance_classes)
drop policy if exists "Users can manage their own classes" on public.dance_classes;
create policy "Users and teachers can view classes" on public.dance_classes
  for select using (auth.uid() = user_id or public.is_teacher_of(user_id));
create policy "Users can manage their own classes" on public.dance_classes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- C. Chamadas (attendance)
drop policy if exists "Users can manage their own attendance" on public.attendance;
create policy "Users and active teachers can manage attendance" on public.attendance
  for all using (auth.uid() = user_id or public.is_teacher_of(user_id))
  with check (auth.uid() = user_id or public.is_teacher_of(user_id));

-- D. Membros da Equipe (team_members)
drop policy if exists "Users can manage their own team members" on public.team_members;
create policy "Users and active teachers can view team" on public.team_members
  for select using (auth.uid() = user_id or email = (select email from public.profiles where id = auth.uid()));
create policy "Users can manage their own team members" on public.team_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- E. Configurações da Escola (school_settings)
drop policy if exists "Users can manage their own settings" on public.school_settings;
create policy "Users and active teachers can view settings" on public.school_settings
  for select using (auth.uid() = id or public.is_teacher_of(id));
create policy "Users can manage their own settings" on public.school_settings
  for all using (auth.uid() = id) with check (auth.uid() = id);
