-- Reading-list schema. Run this in the Supabase SQL editor.
-- Constraints mirror the API's DTO validation (defense in depth).
-- Re-running this file drops and recreates the table (demo data is disposable;
-- no migration tooling by design).

drop table if exists books;

create table books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  author text,
  status text not null default 'to_read',
  rating int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint books_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint books_author_length check (author is null or char_length(author) <= 200),
  constraint books_status_valid check (status in ('to_read', 'reading', 'finished')),
  constraint books_rating_range check (rating is null or rating between 1 and 5)
);

create index books_user_id_idx on books (user_id);

-- Keep updated_at current on every update.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_set_updated_at on books;
create trigger books_set_updated_at
  before update on books
  for each row
  execute function set_updated_at();

-- Deny-by-default: RLS enabled with no policies. Only the API's service-role
-- key (which bypasses RLS) can access this table; a leaked anon key grants nothing.
alter table books enable row level security;
