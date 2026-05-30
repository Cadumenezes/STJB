-- Adiciona as novas colunas à tabela de participantes de eventos
alter table public.event_participants 
add column if not exists choreography_count integer default 0,
add column if not exists clothes_cost numeric(10,2) default 0,
add column if not exists installments jsonb default '[]'::jsonb;
