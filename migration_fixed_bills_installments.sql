-- Adiciona a coluna installments (para quantidade de parcelas) na tabela fixed_bills se não existir
ALTER TABLE public.fixed_bills ADD COLUMN IF NOT EXISTS installments integer;
