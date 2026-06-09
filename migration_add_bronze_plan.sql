-- 1. Remove a restrição antiga se ela existir
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;

-- 2. Adiciona a nova restrição atualizada para permitir o plano bronze
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('starter', 'pro', 'gratis', 'bronze', 'prata', 'ouro', 'diamante'));

-- Comentário para documentar o schema
COMMENT ON CONSTRAINT profiles_plan_check ON public.profiles IS 'Restringe os planos válidos permitidos para os perfis das escolas no SaaS';
