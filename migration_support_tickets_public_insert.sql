-- 1. Remover a restrição NOT NULL da coluna user_id para permitir chamados anônimos (Landing Page)
ALTER TABLE public.support_tickets ALTER COLUMN user_id DROP NOT NULL;

-- 2. Política de acesso para habilitar inserção pública (anônima) na tabela support_tickets.
-- Isso é necessário para permitir que visitantes da Landing Page entrem em contato (Trabalhe Conosco / Suporte).
DROP POLICY IF EXISTS "Allow public insert tickets" ON public.support_tickets;

CREATE POLICY "Allow public insert tickets" ON public.support_tickets
  FOR INSERT
  WITH CHECK (true);
