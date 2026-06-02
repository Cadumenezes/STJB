-- Script para habilitar o sistema de kits em eventos e espetáculos
-- Rode este código no "SQL Editor" do painel do seu Supabase!

-- 1. Adiciona as colunas has_kit e kit_price na tabela de eventos
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS has_kit boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS kit_price numeric(10,2) DEFAULT 0;
