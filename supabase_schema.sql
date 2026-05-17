-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Students Table
create table public.students (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  name text not null,
  email text,
  phone text,
  birth_date date,
  cpf text,
  address text,
  guardian_name text not null,
  photo_url text,
  class_id uuid,
  status text default 'active' check (status in ('active', 'inactive')),
  monthly_fee numeric(10,2) default 0,
  enrollment_fee numeric(10,2) default 0 check (enrollment_fee >= 0 and enrollment_fee <= 2000),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Monthly Payments Table
create table public.monthly_payments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  student_id uuid references public.students(id) on delete cascade not null,
  amount numeric(10,2) not null,
  due_date date not null,
  paid_date date,
  status text default 'pending' check (status in ('paid', 'pending', 'overdue')),
  reference_month text not null,
  payment_method text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Dance Classes Table
create table public.dance_classes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  name text not null,
  description text,
  instructor_id uuid,
  schedule text,
  max_students integer default 20,
  style text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Attendance Table
create table public.attendance (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  class_id uuid references public.dance_classes(id) on delete cascade not null,
  student_id uuid references public.students(id) on delete cascade,
  instructor_id uuid,
  date date not null,
  status text not null check (status in ('present', 'absent', 'late')),
  type text not null check (type in ('student', 'instructor')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Financial Entries Table
create table public.financial_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  type text not null check (type in ('income', 'expense')),
  category text,
  description text not null,
  amount numeric(10,2) not null,
  date date not null,
  is_fixed boolean default false,
  fixed_bill_id uuid references public.fixed_bills(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Products / Inventory Table
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  cost_price numeric(10,2) default 0,
  quantity integer default 0,
  category text,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Team Members Table
create table public.team_members (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  name text not null,
  email text,
  phone text,
  role text not null check (role in ('instructor', 'staff', 'admin')),
  specialty text,
  photo_url text,
  salary numeric(10,2) default 0,
  hourly_rate numeric(10,2) default 0,
  daily_transport numeric(10,2) default 0,
  hire_date date,
  status text default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. School Settings Table
create table public.school_settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  school_name text not null default 'DanceFlow',
  logo_url text,
  bg_color text default '#0a0a0f',
  text_color text default '#f0f0ff',
  accent_color text default '#8b5cf6',
  bg_card text default '#1a1a2e',
  title_font_size integer default 32,
  subtitle_font_size integer default 16,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on all tables
alter table public.students enable row level security;
alter table public.monthly_payments enable row level security;
alter table public.dance_classes enable row level security;
alter table public.attendance enable row level security;
alter table public.financial_entries enable row level security;
alter table public.products enable row level security;
alter table public.team_members enable row level security;
alter table public.school_settings enable row level security;

-- Create Policies for each table
create policy "Users can manage their own students" on public.students
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own payments" on public.monthly_payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own classes" on public.dance_classes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own attendance" on public.attendance
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own financial entries" on public.financial_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own products" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own team members" on public.team_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their own settings" on public.school_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 9. Fixed Bills Table (Templates for recurring expenses)
create table public.fixed_bills (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) default auth.uid(),
  description text not null,
  amount numeric(10,2) not null,
  category text,
  due_day integer check (due_day >= 1 and due_day <= 31),
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.fixed_bills enable row level security;

create policy "Users can manage their own fixed bills" on public.fixed_bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
