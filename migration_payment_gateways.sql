-- Adiciona colunas para controle e credenciais de meio de pagamento em school_settings
ALTER TABLE public.school_settings 
ADD COLUMN IF NOT EXISTS gateway_type TEXT DEFAULT 'none' CHECK (gateway_type IN ('none', 'asaas', 'cora')),
ADD COLUMN IF NOT EXISTS gateway_api_key TEXT,
ADD COLUMN IF NOT EXISTS cora_client_id TEXT,
ADD COLUMN IF NOT EXISTS cora_client_secret TEXT;
