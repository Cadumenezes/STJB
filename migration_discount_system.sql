-- Script para habilitar o sistema de descontos condicionais
-- Rode este código no "SQL Editor" do painel do seu Supabase para atualizar as tabelas do banco de dados!

-- 1. Adiciona a coluna para armazenar o valor com desconto do aluno
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS discount_monthly_fee numeric(10,2) DEFAULT 0;

-- 2. Adiciona a coluna para armazenar o dia limite de desconto nas configurações da escola
ALTER TABLE public.school_settings 
ADD COLUMN IF NOT EXISTS discount_due_day integer DEFAULT 10;

-- 3. Garante que a tabela de mensalidades (monthly_payments) tenha a coluna user_id para isolamento SaaS
ALTER TABLE public.monthly_payments 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

-- 4. Atualiza as políticas de RLS para a tabela de mensalidades (monthly_payments) para dar acesso ao secretário e professores
DROP POLICY IF EXISTS "Users can manage their own payments" ON public.monthly_payments;
CREATE POLICY "Users and secretaries can manage payments" ON public.monthly_payments
  FOR ALL USING (auth.uid() = user_id OR public.is_secretary_of(user_id))
  WITH CHECK (auth.uid() = user_id OR public.is_secretary_of(user_id));


