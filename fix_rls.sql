-- Script para habilitar RLS (Segurança a Nível de Linha) em TODAS as tabelas
-- Copie este código e rode no "SQL Editor" do seu painel do Supabase.

-- 1. Garante que todas as tabelas mais recentes tenham a coluna user_id
alter table if exists public.fixed_bill_months add column if not exists user_id uuid references auth.users(id) default auth.uid();

-- 2. Habilita o RLS em todas as tabelas (Se já estiver habilitado, não tem problema, o comando apenas garante)
alter table public.students enable row level security;
alter table public.monthly_payments enable row level security;
alter table public.dance_classes enable row level security;
alter table public.attendance enable row level security;
alter table public.financial_entries enable row level security;
alter table public.products enable row level security;
alter table public.team_members enable row level security;
alter table public.school_settings enable row level security;
alter table public.fixed_bills enable row level security;
alter table if exists public.fixed_bill_months enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;

-- 3. Cria as Políticas (Policies) para garantir que ninguém de fora acesse seus dados
-- Como as policies podem já existir, usamos blocos DO para não dar erro se já existirem

DO $$ 
BEGIN
  -- fixed_bill_months
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own fixed bill months' AND tablename = 'fixed_bill_months') THEN
    execute 'create policy "Users can manage their own fixed bill months" on public.fixed_bill_months for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  END IF;

  -- events
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own events' AND tablename = 'events') THEN
    execute 'create policy "Users can manage their own events" on public.events for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  END IF;

  -- event_participants
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own event participants' AND tablename = 'event_participants') THEN
    execute 'create policy "Users can manage their own event participants" on public.event_participants for all using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  END IF;
END $$;
