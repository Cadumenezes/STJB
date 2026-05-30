-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  phone text,
  role text default 'user' check (role in ('admin', 'user')),
  status text default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table public.profiles enable row level security;

-- 3. Create RLS Policies
-- Usuário pode ver apenas seu próprio perfil
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Adiciona a função segura para checar se é admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Admins podem ler todos os perfis
create policy "Admins can view all profiles" on public.profiles
  for select using (public.is_admin());

-- Admins podem atualizar perfis (para aprovar/suspender)
create policy "Admins can update all profiles" on public.profiles
  for update using (public.is_admin());

-- 4. Create trigger for new users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, phone, role, status)
  values (new.id, new.email, new.raw_user_meta_data->>'phone', 'user', 'pending');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Garante que os usuários existentes que você já criou ganhem acesso automático!
insert into public.profiles (id, email, role, status)
select id, email, 'user', 'active'
from auth.users
where id not in (select id from public.profiles);

-- 6. Transforma você no Super Admin (o Chefão do sistema)
update public.profiles
set role = 'admin', status = 'active'
where email = 'alzirocarloseduardo@gmail.com';
