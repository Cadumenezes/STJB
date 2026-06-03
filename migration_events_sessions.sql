-- Migration: Add sessions support to events and per-session seat allocation
-- sessions: array of { id, name, datetime, seating_map: { rows_count, seats_per_row, exceptions } }
alter table public.events 
  add column if not exists sessions jsonb default '[]'::jsonb;

-- seats_by_session: { session_id: ["A1", "A2"], ... }
alter table public.event_participants 
  add column if not exists seats_by_session jsonb default '{}'::jsonb;
