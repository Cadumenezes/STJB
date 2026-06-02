-- Adiciona colunas para templates customizados na tabela school_settings
ALTER TABLE public.school_settings 
ADD COLUMN IF NOT EXISTS tax_declaration_template text,
ADD COLUMN IF NOT EXISTS activity_declaration_template text;
