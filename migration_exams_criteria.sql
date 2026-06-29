-- SQL MIGRATION: Add custom criteria columns to exams and exam_grades tables
-- Execute this script in the SQL Editor of your Supabase dashboard.

-- 1. Add criteria column to exams table (stores list of things to evaluate)
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS criteria text[] DEFAULT '{}';

-- 2. Add criteria_grades column to exam_grades table (stores key-value map of grades per criterion)
ALTER TABLE public.exam_grades 
ADD COLUMN IF NOT EXISTS criteria_grades jsonb DEFAULT '{}'::jsonb;
