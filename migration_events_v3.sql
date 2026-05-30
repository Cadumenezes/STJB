-- Adiciona colunas para os valores base dos eventos
alter table public.events 
add column if not exists base_choreography_price numeric(10,2) default 0,
add column if not exists base_clothes_cost numeric(10,2) default 0;
