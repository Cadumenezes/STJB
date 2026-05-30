-- Script para adicionar a cor do menu personalizado
-- Rode este código no "SQL Editor" do painel do seu Supabase.

ALTER TABLE public.school_settings 
ADD COLUMN IF NOT EXISTS bg_menu text DEFAULT '#1a1a2e';

-- Re-executa as políticas para garantir que o RLS funcione perfeitamente
DROP POLICY IF EXISTS "Users and active teachers can view settings" ON public.school_settings;
CREATE POLICY "Users and active teachers can view settings" ON public.school_settings
  FOR SELECT USING (auth.uid() = id OR public.is_teacher_of(id));

DROP POLICY IF EXISTS "Users can manage their own settings" ON public.school_settings;
CREATE POLICY "Users can manage their own settings" ON public.school_settings
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
