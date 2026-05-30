-- 1. Events Table
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  name text not null,
  date date not null,
  location text,
  description text,
  ticket_price numeric(10,2) default 0,
  cost numeric(10,2) default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.events enable row level security;

create policy "Users can manage their own events" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Event Participants Table
create table public.event_participants (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  event_id uuid references public.events(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade not null,
  has_ticket boolean default false,
  ticket_quantity integer default 0,
  total_value numeric(10,2) default 0,
  amount_paid numeric(10,2) default 0,
  kit boolean default false,
  payment_method text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (event_id, student_id)
);

alter table public.event_participants enable row level security;

create policy "Users can manage their own event participants" on public.event_participants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
