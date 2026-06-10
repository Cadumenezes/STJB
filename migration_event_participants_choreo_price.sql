-- Migration: Add choreography_price to event_participants table
-- This allows setting a custom choreography fee per student instead of a flat rate.

ALTER TABLE public.event_participants 
ADD COLUMN IF NOT EXISTS choreography_price numeric(10,2) DEFAULT 0;

COMMENT ON COLUMN public.event_participants.choreography_price IS 'Preço total customizado das coreografias do participante';
