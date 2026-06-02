-- Script para habilitar múltiplos diretores e regras adicionais de RLS para co-proprietários
-- Rode este código no "SQL Editor" do painel do seu Supabase!

-- 1. Cria a função de segurança para verificar se o usuário é diretor ativo de uma escola
CREATE OR REPLACE FUNCTION public.is_admin_of(school_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.team_members tm
    JOIN public.profiles p ON p.email = tm.email
    WHERE p.id = auth.uid() 
      AND tm.user_id = school_id 
      AND (tm.role = 'Diretor' OR tm.role = 'admin') 
      AND tm.status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Atualiza os triggers para promover automaticamente novos membros com cargo 'Diretor' a 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  member_role text;
begin
  SELECT role FROM public.team_members 
  WHERE email = new.email AND status = 'active'
  LIMIT 1
  INTO member_role;

  IF member_role = 'Diretor' OR member_role = 'admin' THEN
    INSERT INTO public.profiles (id, email, phone, role, status, plan)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'phone', 'admin', 'active', 'gratis');
  ELSIF member_role = 'Secretário' OR member_role = 'secretary' THEN
    INSERT INTO public.profiles (id, email, phone, role, status, plan)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'phone', 'secretary', 'active', 'gratis');
  ELSIF member_role = 'instructor' OR member_role = 'Professor' THEN
    INSERT INTO public.profiles (id, email, phone, role, status, plan)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'phone', 'teacher', 'active', 'gratis');
  ELSE
    INSERT INTO public.profiles (id, email, phone, role, status, plan)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'phone', 'user', 'pending', 'gratis');
  END IF;
  
  return new;
end;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_team_member_role_to_profile()
RETURNS trigger AS $$
begin
  IF new.email IS NOT NULL THEN
    IF new.role = 'Diretor' OR new.role = 'admin' THEN
      UPDATE public.profiles 
      SET role = 'admin', status = 'active'
      WHERE email = new.email;
    ELSIF new.role = 'Secretário' OR new.role = 'secretary' THEN
      UPDATE public.profiles 
      SET role = 'secretary', status = 'active'
      WHERE email = new.email;
    ELSIF new.role = 'instructor' OR new.role = 'Professor' THEN
      UPDATE public.profiles 
      SET role = 'teacher', status = 'active'
      WHERE email = new.email;
    END IF;
  END IF;
  return new;
end;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atualiza as Políticas RLS das tabelas principais para permitir acesso aos Co-Diretores
-- Alunos
DROP POLICY IF EXISTS "Users and staff can view students" ON public.students;
CREATE POLICY "Users and staff can view students" ON public.students
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_of(user_id) OR public.is_teacher_of(user_id) OR public.is_secretary_of(user_id));

DROP POLICY IF EXISTS "Users and secretaries can manage students" ON public.students;
CREATE POLICY "Users and secretaries can manage students" ON public.students
  FOR ALL USING (auth.uid() = user_id OR public.is_admin_of(user_id) OR public.is_secretary_of(user_id))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_of(user_id) OR public.is_secretary_of(user_id));

-- Mensalidades
DROP POLICY IF EXISTS "Users and secretaries can manage payments" ON public.monthly_payments;
CREATE POLICY "Users and secretaries can manage payments" ON public.monthly_payments
  FOR ALL USING (auth.uid() = user_id OR public.is_admin_of(user_id) OR public.is_secretary_of(user_id))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_of(user_id) OR public.is_secretary_of(user_id));

-- Eventos
DROP POLICY IF EXISTS "Users and staff can view events" ON public.events;
CREATE POLICY "Users and staff can view events" ON public.events
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_of(user_id) OR public.is_secretary_of(user_id));

DROP POLICY IF EXISTS "Users can manage their own events" ON public.events;
CREATE POLICY "Admins can manage events" ON public.events
  FOR ALL USING (auth.uid() = user_id OR public.is_admin_of(user_id))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_of(user_id));

-- Participantes de Eventos
DROP POLICY IF EXISTS "Users and staff can view event participants" ON public.event_participants;
CREATE POLICY "Users and staff can view event participants" ON public.event_participants
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin_of(user_id) OR public.is_secretary_of(user_id));

DROP POLICY IF EXISTS "Users and staff can update event participants" ON public.event_participants;
CREATE POLICY "Users and staff can update event participants" ON public.event_participants
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_of(user_id) OR public.is_secretary_of(user_id))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_of(user_id) OR public.is_secretary_of(user_id));

DROP POLICY IF EXISTS "Users can manage their own event participants" ON public.event_participants;
CREATE POLICY "Admins can manage event participants" ON public.event_participants
  FOR ALL USING (auth.uid() = user_id OR public.is_admin_of(user_id))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_of(user_id));

-- Financeiro
DROP POLICY IF EXISTS "Users can manage their own financial entries" ON public.financial_entries;
CREATE POLICY "Admins can manage financial entries" ON public.financial_entries
  FOR ALL USING (auth.uid() = user_id OR public.is_admin_of(user_id))
  WITH CHECK (auth.uid() = user_id OR public.is_admin_of(user_id));

-- Configurações
DROP POLICY IF EXISTS "Users and staff can view settings" ON public.school_settings;
CREATE POLICY "Users and staff can view settings" ON public.school_settings
  FOR SELECT USING (auth.uid() = id OR public.is_admin_of(id) OR public.is_teacher_of(id) OR public.is_secretary_of(id));

DROP POLICY IF EXISTS "Users can manage their own settings" ON public.school_settings;
CREATE POLICY "Users can manage their own settings" ON public.school_settings
  FOR ALL USING (auth.uid() = id OR public.is_admin_of(id))
  WITH CHECK (auth.uid() = id OR public.is_admin_of(id));
