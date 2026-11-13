-- Restore renter notification settings when the recorded core migration did
-- not create this relation in the connected database.
create table if not exists public.tenant_preferences (
  renter_id uuid primary key references public.profiles(id) on delete cascade,
  email_notifications boolean not null default true,
  payment_reminders boolean not null default true,
  maintenance_updates boolean not null default true,
  message_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.tenant_preferences enable row level security;
drop policy if exists "renter manages own preferences" on public.tenant_preferences;
create policy "renter manages own preferences" on public.tenant_preferences for all to authenticated
  using (renter_id=auth.uid()) with check (renter_id=auth.uid());

revoke all on public.tenant_preferences from anon, authenticated;
grant select, insert, update on public.tenant_preferences to authenticated;

notify pgrst, 'reload schema';
