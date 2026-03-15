-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  username text not null unique,
  password_hash text not null, -- Stores the bcrypt hash of the password
  
  -- Basic Info
  class_name text,
  race text,
  title text,
  level integer default 1,
  xp integer default 0,
  alignment integer default 0,
  reputation integer default 0,
  
  -- Economy
  money integer default 0,
  bank_balance integer default 0,
  datarii integer default 0,
  
  -- Location
  location_id text,
  
  -- Complex Data (JSONB)
  stats jsonb default '{}'::jsonb,           -- { str, agi, int, con, hp, statPoints }
  inventory_data jsonb default '{}'::jsonb,  -- { items: [], equipment: {} }
  quests_data jsonb default '{}'::jsonb,     -- { quests: {}, daily: [] }
  force_data jsonb default '{}'::jsonb,      -- { points, unlocked: [], activeSkill }
  reputation_votes jsonb default '{}'::jsonb, -- { "player_name": "up"|"down" }
  ship_data jsonb default '{}'::jsonb,       -- { id, ... }
  appearance jsonb default '{}'::jsonb,      -- { avatar }
  buffs jsonb default '{}'::jsonb,           -- Active buffs
  job_data jsonb default '{}'::jsonb,        -- { activeJob, jobEndTime, viewingJobBoard, jobNotified }
  
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

-- Allow all access to service_role (which our server uses)
create policy "Enable all for service role" on profiles
    for all
    to service_role
    using (true)
    with check (true);

-- Allow public read access (for leaderboards/inspect)
create policy "Enable read access for all users" on profiles
    for select
    using (true);
