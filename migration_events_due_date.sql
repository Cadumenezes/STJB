-- Adiciona coluna de vencimento padrao do boleto na tabela de eventos
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS due_date DATE;
