-- Script para adicionar configurações de feriado no DanceFlow
-- Rode este código no "SQL Editor" do painel do seu Supabase para atualizar as tabelas do banco de dados!

-- 1. Adiciona as colunas nas configurações da escola para controle de feriados
ALTER TABLE public.school_settings 
ADD COLUMN IF NOT EXISTS pay_on_holidays boolean DEFAULT true;

ALTER TABLE public.school_settings 
ADD COLUMN IF NOT EXISTS open_on_holidays boolean DEFAULT false;
