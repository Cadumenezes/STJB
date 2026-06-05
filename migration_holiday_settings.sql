-- Script para adicionar configurações e tabela de feriados no DanceFlow
-- Rode este código no "SQL Editor" do painel do seu Supabase para atualizar as tabelas do banco de dados!

-- 1. Adiciona as colunas nas configurações da escola para controle de feriados
ALTER TABLE public.school_settings 
ADD COLUMN IF NOT EXISTS pay_on_holidays boolean DEFAULT true;

ALTER TABLE public.school_settings 
ADD COLUMN IF NOT EXISTS open_on_holidays boolean DEFAULT false;

-- 2. Cria a tabela para armazenar feriados municipais/estaduais customizados
CREATE TABLE IF NOT EXISTS public.school_holidays (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  name text NOT NULL,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Habilita segurança em nível de linha (RLS)
ALTER TABLE public.school_holidays ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Users can manage their own school holidays" ON public.school_holidays;
CREATE POLICY "Users can manage their own school holidays" ON public.school_holidays
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Secretaries can view/manage school holidays" ON public.school_holidays;
CREATE POLICY "Secretaries can view/manage school holidays" ON public.school_holidays
  FOR ALL USING (public.is_secretary_of(user_id)) WITH CHECK (public.is_secretary_of(user_id));
