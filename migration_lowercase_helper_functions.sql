-- 1. Sincronização robusta de Professor (is_teacher_of) com e-mail em minúsculo
create or replace function public.is_teacher_of(school_id uuid)
returns boolean as $$
  select exists (
    select 1 
    from public.team_members tm
    join public.profiles p on lower(p.email) = lower(tm.email)
    where p.id = auth.uid() 
      and tm.user_id = school_id 
      and (tm.role = 'instructor' or tm.role = 'Professor')
      and tm.status = 'active'
  );
$$ language sql security definer;

-- 2. Sincronização robusta de Secretário (is_secretary_of) com e-mail em minúsculo
create or replace function public.is_secretary_of(school_id uuid)
returns boolean as $$
  select exists (
    select 1 
    from public.team_members tm
    join public.profiles p on lower(p.email) = lower(tm.email)
    where p.id = auth.uid() 
      and tm.user_id = school_id 
      and (tm.role = 'Secretário' or tm.role = 'secretary') 
      and tm.status = 'active'
  );
$$ language sql security definer;

-- 3. Sincronização robusta de Coordenador (is_coordinator_of) com e-mail em minúsculo
create or replace function public.is_coordinator_of(school_id uuid)
returns boolean as $$
  select exists (
    select 1 
    from public.team_members tm
    join public.profiles p on lower(p.email) = lower(tm.email)
    where p.id = auth.uid() 
      and tm.user_id = school_id 
      and (tm.role = 'Coordenador' or tm.role = 'coordinator') 
      and tm.status = 'active'
  );
$$ language sql security definer;

-- 4. Sincronização robusta de Diretor Financeiro (is_financial_director_of) com e-mail em minúsculo
create or replace function public.is_financial_director_of(school_id uuid)
returns boolean as $$
  select exists (
    select 1 
    from public.team_members tm
    join public.profiles p on lower(p.email) = lower(tm.email)
    where p.id = auth.uid() 
      and tm.user_id = school_id 
      and (tm.role = 'Diretor Financeiro' or tm.role = 'financial_director' or tm.role = 'Gestor Financeiro') 
      and tm.status = 'active'
  );
$$ language sql security definer;
