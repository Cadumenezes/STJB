-- SQL MIGRATION: Criação das tabelas de provas e avaliações escolares, e configuração das políticas RLS.
-- Execute este script no editor SQL do painel do seu Supabase.

-- 1. Criação da Tabela de Provas (exams)
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  class_id uuid REFERENCES public.dance_classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Criação da Tabela de Notas e Avaliações dos Alunos (exam_grades)
CREATE TABLE IF NOT EXISTS public.exam_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  exam_id uuid REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  grade numeric, -- Nota numérica opcional (ex: 0 a 10)
  concept text, -- Conceito qualitativo (Excelente, Bom, Regular, Insuficiente)
  feedback text, -- Observações/Feedback qualitativo do professor
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_grades_unique_student_exam UNIQUE (exam_id, student_id)
);

-- 3. Habilitação de RLS (Row Level Security)
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_grades ENABLE ROW LEVEL SECURITY;

-- 4. Criação de Políticas RLS para public.exams
DROP POLICY IF EXISTS "Users can manage their own exams" ON public.exams;
CREATE POLICY "Users can manage their own exams" ON public.exams
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers and secretaries can view exams" ON public.exams;
CREATE POLICY "Teachers and secretaries can view exams" ON public.exams
  FOR SELECT USING (public.is_teacher_of(user_id) OR public.is_secretary_of(user_id));

-- 5. Criação de Políticas RLS para public.exam_grades
DROP POLICY IF EXISTS "Users can manage their own exam grades" ON public.exam_grades;
CREATE POLICY "Users can manage their own exam grades" ON public.exam_grades
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers and secretaries can manage exam grades" ON public.exam_grades;
CREATE POLICY "Teachers and secretaries can manage exam grades" ON public.exam_grades
  FOR ALL USING (public.is_teacher_of(user_id) OR public.is_secretary_of(user_id))
  WITH CHECK (public.is_teacher_of(user_id) OR public.is_secretary_of(user_id));
