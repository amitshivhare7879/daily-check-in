-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Households Table
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null, -- references auth.users (cannot set FK here yet to avoid chicken-and-egg issues or we can set it to auth.users)
  invite_code text unique not null,
  billing_start_day integer default 1 not null check (billing_start_day >= 1 and billing_start_day <= 28),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add Foreign Key to auth.users for households
alter table public.households add constraint fk_households_created_by foreign key (created_by) references auth.users(id) on delete cascade;

-- 2. Profiles Table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  household_id uuid references public.households(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Item Rates Table (stores historical rates for accurate calculation)
create table public.item_rates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade not null,
  item_type text not null check (item_type in ('milk', 'water_can')),
  rate numeric(10, 2) not null check (rate >= 0),
  unit_label text not null, -- 'liter' or 'can'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Daily Entries Table
create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete set null not null,
  date date not null,
  milk_qty numeric(10, 2) default 0.00 not null check (milk_qty >= 0),
  water_can_qty integer default 0 not null check (water_can_qty >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  -- Ensure only one entry per household per day
  constraint unique_household_date unique (household_id, date)
);

-- Enable Row Level Security (RLS) on all tables
alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.item_rates enable row level security;
alter table public.daily_entries enable row level security;

-- Helper Function to get current user's household_id without recursion
create or replace function public.current_user_household()
returns uuid as $$
  select household_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- Triggers for automatic profile creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to link user to household immediately upon creation
create or replace function public.handle_new_household()
returns trigger as $$
begin
  update public.profiles
  set household_id = new.id
  where id = new.created_by;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_household_created
  after insert on public.households
  for each row execute procedure public.handle_new_household();

-- Join household RPC function (for safe cross-linking with invite code)
create or replace function public.join_household(code text)
returns json as $$
declare
  h_id uuid;
  h_name text;
begin
  select id, name into h_id, h_name from public.households where upper(invite_code) = upper(code);
  if h_id is null then
    raise exception 'Invalid invite code';
  end if;
  
  update public.profiles
  set household_id = h_id
  where id = auth.uid();
  
  return json_build_object('household_id', h_id, 'name', h_name);
end;
$$ language plpgsql security definer;

-- Leave household RPC function
create or replace function public.leave_household()
returns void as $$
begin
  update public.profiles
  set household_id = null
  where id = auth.uid();
end;
$$ language plpgsql security definer;

-- ================= RLS POLICIES =================

-- Profiles Policies
create policy "Users can view profiles in the same household or their own"
  on public.profiles for select
  using (id = auth.uid() or household_id = public.current_user_household());

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Households Policies
create policy "Users can view their own household"
  on public.households for select
  using (id = public.current_user_household() or created_by = auth.uid());

create policy "Authenticated users can create households"
  on public.households for insert
  with check (auth.uid() is not null);

create policy "Household creators can update household"
  on public.households for update
  using (id = public.current_user_household() or created_by = auth.uid());

-- Item Rates Policies
create policy "Users can view rates for their household"
  on public.item_rates for select
  using (household_id = public.current_user_household());

create policy "Users can insert rates for their household"
  on public.item_rates for insert
  with check (household_id = public.current_user_household());

create policy "Users can update rates for their household"
  on public.item_rates for update
  using (household_id = public.current_user_household());

-- Daily Entries Policies
create policy "Users can view daily entries for their household"
  on public.daily_entries for select
  using (household_id = public.current_user_household());

create policy "Users can insert daily entries for their household"
  on public.daily_entries for insert
  with check (household_id = public.current_user_household());

create policy "Users can update daily entries for their household"
  on public.daily_entries for update
  using (household_id = public.current_user_household());

create policy "Users can delete daily entries for their household"
  on public.daily_entries for delete
  using (household_id = public.current_user_household());

-- Enable Realtime for daily_entries and item_rates
-- Run this in the Supabase editor to add tables to the publication
-- alter publication supabase_realtime add table public.daily_entries;
-- alter publication supabase_realtime add table public.item_rates;
-- alter publication supabase_realtime add table public.profiles;

-- 6. App Settings Table for Auto-Update Checks
create table public.app_settings (
  key text primary key,
  value jsonb not null
);

-- Insert initial version record
insert into public.app_settings (key, value)
values ('latest_version', '{"version_code": 1, "version_name": "1.0.0", "apk_url": "https://your-download-link.com", "force_update": false, "changelog": "Initial launch with Indian currency & billing cycles."}'::jsonb)
on conflict (key) do nothing;

-- Enable RLS
alter table public.app_settings enable row level security;

-- Create read policy for anyone
create policy "Allow public read access to app_settings"
  on public.app_settings for select
  using (true);
