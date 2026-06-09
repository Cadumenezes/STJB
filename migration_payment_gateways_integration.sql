-- Script para adicionar colunas de integração de gateways de pagamento na tabela de mensalidades
-- Execute este script no SQL Editor do seu painel do Supabase

ALTER TABLE public.monthly_payments
ADD COLUMN IF NOT EXISTS gateway_id text,
ADD COLUMN IF NOT EXISTS payment_url text,
ADD COLUMN IF NOT EXISTS pix_code text,
ADD COLUMN IF NOT EXISTS barcode text;

-- Habilitar leitura pública para essas colunas nas políticas RLS se necessário,
-- mas como a tabela de mensalidades já possui RLS configurado, os acessos padrão de leitura
-- para diretores e secretários já se aplicam automaticamente.
