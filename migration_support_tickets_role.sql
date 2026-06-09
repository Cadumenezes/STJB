-- Adiciona a coluna sender_role na tabela public.support_tickets se não existir
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS sender_role text;

-- Comentário da coluna para fins de documentação do schema
COMMENT ON COLUMN public.support_tickets.sender_role IS 'O papel (role) do remetente que abriu o chamado para fins de filtragem de notificações';
