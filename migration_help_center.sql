-- 1. Tabela para sugestões internas da escola (Professores/Secretários -> Diretor)
CREATE TABLE IF NOT EXISTS public.school_suggestions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL, -- ID do Diretor/Dono da escola
  sender_name text NOT NULL,
  sender_role text NOT NULL,
  category text NOT NULL,
  content text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'read', 'archived')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilita segurança RLS para sugestões
ALTER TABLE public.school_suggestions ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para school_suggestions
DROP POLICY IF EXISTS "Allow read for owner and secretary" ON public.school_suggestions;
CREATE POLICY "Allow read for owner and secretary" ON public.school_suggestions
  FOR SELECT USING (auth.uid() = user_id OR public.is_secretary_of(user_id));

DROP POLICY IF EXISTS "Allow update for owner and secretary" ON public.school_suggestions;
CREATE POLICY "Allow update for owner and secretary" ON public.school_suggestions
  FOR UPDATE USING (auth.uid() = user_id OR public.is_secretary_of(user_id))
  WITH CHECK (auth.uid() = user_id OR public.is_secretary_of(user_id));

DROP POLICY IF EXISTS "Allow delete for owner" ON public.school_suggestions;
CREATE POLICY "Allow delete for owner" ON public.school_suggestions
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.school_suggestions;
CREATE POLICY "Allow insert for authenticated users" ON public.school_suggestions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 2. Tabela para chamados técnicos de suporte (Diretores -> DanceFlow Admin)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL, -- ID de quem abriu o chamado (Diretor)
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilita segurança RLS para chamados técnicos
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para support_tickets
DROP POLICY IF EXISTS "Allow read/manage own tickets" ON public.support_tickets;
CREATE POLICY "Allow read/manage own tickets" ON public.support_tickets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
