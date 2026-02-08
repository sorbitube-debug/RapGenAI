
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (Extends Supabase Auth)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  credits int default 100,
  owned_plugins text[] default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PROJECTS TABLE (Stores Lyrics, Analysis, Settings)
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null, -- The lyrics
  style text,
  ai_analysis text,
  last_modified bigint, -- Timestamp for sorting
  comments jsonb default '[]'::jsonb, -- Store comments as JSONB
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. ACTIVITY LOGS TABLE (History)
create table public.activity_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action_type text not null, -- e.g., 'generate', 'purchase', 'save'
  description text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.activity_logs enable row level security;

-- POLICIES

-- Profiles: Users can view and update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Projects: Users can full access their own projects
create policy "Users can CRUD own projects" on public.projects
  for all using (auth.uid() = user_id);

-- Activity Logs: Users can view and insert their own logs
create policy "Users can view own logs" on public.activity_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert own logs" on public.activity_logs
  for insert with check (auth.uid() = user_id);

-- TRIGGER: Automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, credits, owned_plugins)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    100, -- Default free credits
    '{}'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
