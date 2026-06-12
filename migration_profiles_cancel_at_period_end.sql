-- 1. Adiciona a coluna cancel_at_period_end na tabela profiles se não existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;

-- 2. Cria a tabela cancellation_feedbacks para coletar respostas de cancelamento (churn survey)
CREATE TABLE IF NOT EXISTS public.cancellation_feedbacks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  reason text NOT NULL,
  comments text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilita RLS (Row Level Security) na nova tabela
ALTER TABLE public.cancellation_feedbacks ENABLE ROW LEVEL SECURITY;

-- 4. Cria políticas de acesso seguras
-- Permite que usuários autenticados cadastrem seus próprios feedbacks de cancelamento
CREATE POLICY "Users can insert own cancellation feedback" ON public.cancellation_feedbacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permite que administradores visualizem todos os feedbacks recebidos
CREATE POLICY "Admins can view all cancellation feedbacks" ON public.cancellation_feedbacks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
