-- 1. Adiciona as colunas status e admin_notes na tabela cancellation_feedbacks se não existirem
ALTER TABLE public.cancellation_feedbacks ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.cancellation_feedbacks ADD COLUMN IF NOT EXISTS admin_notes text;

-- 2. Cria políticas de UPDATE e DELETE para os administradores se não existirem
DROP POLICY IF EXISTS "Admins can update cancellation feedbacks" ON public.cancellation_feedbacks;
CREATE POLICY "Admins can update cancellation feedbacks" ON public.cancellation_feedbacks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete cancellation feedbacks" ON public.cancellation_feedbacks;
CREATE POLICY "Admins can delete cancellation feedbacks" ON public.cancellation_feedbacks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
