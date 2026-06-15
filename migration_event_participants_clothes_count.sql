-- Migration: Add clothes_count column to event_participants table
ALTER TABLE public.event_participants 
ADD COLUMN IF NOT EXISTS clothes_count integer DEFAULT 0;
