-- Create Event Expenses Table
create table public.event_expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  event_id uuid references public.events(id) on delete cascade not null,
  description text not null,
  amount numeric(10,2) not null,
  expense_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.event_expenses enable row level security;

-- Policies
create policy "Users can manage their own event expenses" on public.event_expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
