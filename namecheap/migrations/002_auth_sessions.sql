-- Authentication sessions for the Namecheap API.
-- Run once against the Namecheap database after 001_initial_schema.sql.
create table public.auth_sessions (
  id uuid primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  access_token_hash char(64) not null unique,
  refresh_token_hash char(64) not null unique,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index auth_sessions_account_expiry_idx
  on public.auth_sessions(account_id, refresh_expires_at);
