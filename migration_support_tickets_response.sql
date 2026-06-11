-- 1. Adicionar colunas de resposta do administrador na tabela support_tickets se não existirem
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS admin_response text;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS responded_at timestamp with time zone;

-- 2. Criar política RLS para permitir que o Admin Geral (role = 'admin') possa visualizar e responder todos os chamados
DROP POLICY IF EXISTS "Allow admin to manage all tickets" ON public.support_tickets;
CREATE POLICY "Allow admin to manage all tickets" ON public.support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
