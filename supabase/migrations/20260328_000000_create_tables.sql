-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Check-ins table
create table if not exists check_ins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transcript text not null,
  parsed_activities jsonb,
  created_at timestamp with time zone default now()
);

-- Time entries table
create table if not exists time_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_name text not null,
  category text,
  duration_minutes integer not null check (duration_minutes > 0),
  start_time timestamp with time zone not null,
  check_in_id uuid references check_ins(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Journal entries table
create table if not exists journal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  created_at timestamp with time zone default now()
);

-- Chat messages table
create table if not exists chat_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  response text not null,
  created_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists idx_check_ins_user_id on check_ins(user_id);
create index if not exists idx_time_entries_user_id on time_entries(user_id);
create index if not exists idx_time_entries_start_time on time_entries(start_time);
create index if not exists idx_journal_entries_user_id on journal_entries(user_id);
create index if not exists idx_chat_messages_user_id on chat_messages(user_id);

-- Enable RLS on all tables
alter table check_ins enable row level security;
alter table time_entries enable row level security;
alter table journal_entries enable row level security;
alter table chat_messages enable row level security;

-- RLS Policies for check_ins
create policy "Users can view their own check-ins"
on check_ins for select
using (auth.uid() = user_id);

create policy "Users can create their own check-ins"
on check_ins for insert
with check (auth.uid() = user_id);

create policy "Users can update their own check-ins"
on check_ins for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own check-ins"
on check_ins for delete
using (auth.uid() = user_id);

-- RLS Policies for time_entries
create policy "Users can view their own time entries"
on time_entries for select
using (auth.uid() = user_id);

create policy "Users can create their own time entries"
on time_entries for insert
with check (auth.uid() = user_id);

create policy "Users can update their own time entries"
on time_entries for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own time entries"
on time_entries for delete
using (auth.uid() = user_id);

-- RLS Policies for journal_entries
create policy "Users can view their own journal entries"
on journal_entries for select
using (auth.uid() = user_id);

create policy "Users can create their own journal entries"
on journal_entries for insert
with check (auth.uid() = user_id);

create policy "Users can update their own journal entries"
on journal_entries for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own journal entries"
on journal_entries for delete
using (auth.uid() = user_id);

-- RLS Policies for chat_messages
create policy "Users can view their own chat messages"
on chat_messages for select
using (auth.uid() = user_id);

create policy "Users can create their own chat messages"
on chat_messages for insert
with check (auth.uid() = user_id);

create policy "Users can update their own chat messages"
on chat_messages for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own chat messages"
on chat_messages for delete
using (auth.uid() = user_id);
