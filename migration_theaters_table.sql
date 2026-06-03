-- Migration: Create theaters table and link to events
create table if not exists public.theaters (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  rows_count integer not null default 10,
  seats_per_row integer not null default 12,
  exceptions jsonb not null default '{}'::jsonb,
  user_id uuid default auth.uid() references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.theaters enable row level security;

-- RLS Policy
create policy "Users can manage their own theaters" on public.theaters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Link events to theaters table
alter table public.events add column if not exists theater_id uuid references public.theaters(id);
