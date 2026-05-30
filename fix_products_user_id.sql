-- SQL MIGRATION: Adiciona coluna user_id na tabela products, cria a função is_secretary_of e configura as políticas RLS.
-- Rode este script no "SQL Editor" do painel do seu Supabase para corrigir o erro.

-- 1. Cria a função de segurança is_secretary_of se ela não existir
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

-- 2. Adiciona a coluna user_id na tabela products se ela não existir
alter table public.products 
add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- 3. Habilita a segurança RLS na tabela de produtos
alter table public.products enable row level security;

-- 4. Remove políticas antigas para evitar duplicidade ou conflitos
drop policy if exists "Users can manage their own products" on public.products;
drop policy if exists "Users and staff can view products" on public.products;
drop policy if exists "Users and staff can update products" on public.products;

-- 5. Cria a política para os donos/diretores gerenciarem seus próprios produtos
create policy "Users can manage their own products" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Cria a política de leitura para a equipe (secretários e diretores)
create policy "Users and staff can view products" on public.products
  for select using (auth.uid() = user_id or public.is_secretary_of(user_id));

-- 7. Cria a política de atualização de estoque para a equipe (necessário para realizar vendas na loja)
create policy "Users and staff can update products" on public.products
  for update using (auth.uid() = user_id or public.is_secretary_of(user_id))
  with check (auth.uid() = user_id or public.is_secretary_of(user_id));

-- 8. Força a atualização do cache de esquemas do PostgREST
notify pgrst, 'reload schema';
