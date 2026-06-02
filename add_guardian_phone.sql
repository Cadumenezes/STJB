-- Adiciona a coluna de telefone do responsável na tabela de alunos
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS guardian_phone TEXT;
