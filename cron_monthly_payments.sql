-- 1. Cria a função que gera as mensalidades para todas as escolas cadastradas
CREATE OR REPLACE FUNCTION generate_monthly_payments_for_all_schools()
RETURNS void AS $$
DECLARE
  current_month text := to_char(now(), 'YYYY-MM');
  due_date date := (date_trunc('month', now()) + interval '9 days')::date; -- Vencimento dia 10
BEGIN
  INSERT INTO public.monthly_payments (user_id, student_id, amount, due_date, status, reference_month)
  SELECT 
    s.user_id,
    s.id,
    s.monthly_fee,
    due_date,
    'pending',
    current_month
  FROM public.students s
  WHERE s.status = 'active'
    AND s.monthly_fee > 0
    -- Só insere se a mensalidade deste aluno para este mês ainda NÃO existir
    AND NOT EXISTS (
      SELECT 1 FROM public.monthly_payments p
      WHERE p.student_id = s.id
        AND p.reference_month = current_month
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Habilita a extensão de Cron do PostgreSQL (caso não esteja habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Agenda a execução da função para todo dia 1º do mês, à meia-noite e um minuto
SELECT cron.schedule(
  'generate-monthly-payments', -- Nome do agendamento
  '1 0 1 * *',                 -- Expressão Cron (Todo dia 1º à 00:01)
  'SELECT generate_monthly_payments_for_all_schools();'
);
