-- SQL MIGRATION: Adiciona coluna user_id na tabela financial_entries, habilita RLS e configura as políticas para Diretor e Secretária.
-- Rode este script no "SQL Editor" do painel do seu Supabase para corrigir o erro.

-- 1. Garante que a função de segurança is_secretary_of existe
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

-- 2. Adiciona a coluna user_id na tabela financial_entries se ela não existir
alter table public.financial_entries 
add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- 3. Habilita a segurança RLS na tabela de lançamentos financeiros
alter table public.financial_entries enable row level security;

-- 4. Remove políticas antigas para evitar duplicidade ou conflitos
drop policy if exists "Users can manage their own financial entries" on public.financial_entries;
drop policy if exists "Secretaries can insert financial entries" on public.financial_entries;

-- 5. Cria a política para os donos/diretores gerenciarem seus próprios lançamentos financeiros
create policy "Users can manage their own financial entries" on public.financial_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Cria a política para as secretárias inserirem novos lançamentos (necessário ao lançar mensalidades e vendas)
create policy "Secretaries can insert financial entries" on public.financial_entries
  for insert with check (public.is_secretary_of(user_id));

-- 7. Força a atualização do cache de esquemas do PostgREST
notify pgrst, 'reload schema';
