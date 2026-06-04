-- Migration: Fix students status check constraint to include scholarship, partial_scholarship and locked
--
-- Como rodar:
-- Abra o painel do seu Supabase, vá na aba "SQL Editor", clique em "New Query", 
-- cole o conteúdo abaixo e clique em "Run" (Executar).

-- 1. Remove a restrição antiga se ela existir
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_status_check;

-- 2. Adiciona a nova restrição atualizada contendo todos os status válidos do aplicativo
ALTER TABLE public.students ADD CONSTRAINT students_status_check CHECK (status IN ('active', 'inactive', 'scholarship', 'partial_scholarship', 'locked'));
