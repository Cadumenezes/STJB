-- Migration: Add seats column to event_participants table
alter table public.event_participants add column if not exists seats text[] default null;
