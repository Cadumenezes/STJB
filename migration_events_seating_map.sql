-- Migration: Add seating_map column to events table
alter table public.events add column if not exists seating_map jsonb default null;
