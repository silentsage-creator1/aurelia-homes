-- Repair deployments where the renter onboarding schema was only partially applied.
create table if not exists public.saved_rentals (
  renter_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.rental_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (renter_id, listing_id)
);

alter table public.saved_rentals enable row level security;

drop policy if exists "renter reads own saved rentals" on public.saved_rentals;
create policy "renter reads own saved rentals" on public.saved_rentals
  for select to authenticated using (renter_id = auth.uid());

drop policy if exists "renter saves own published rentals" on public.saved_rentals;
create policy "renter saves own published rentals" on public.saved_rentals
  for insert to authenticated with check (
    renter_id = auth.uid()
    and exists (select 1 from public.rental_listings l where l.id = listing_id and l.status = 'published')
  );

drop policy if exists "renter removes own saved rentals" on public.saved_rentals;
create policy "renter removes own saved rentals" on public.saved_rentals
  for delete to authenticated using (renter_id = auth.uid());

revoke all on public.saved_rentals from anon, authenticated;
grant select, insert, delete on public.saved_rentals to authenticated;

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
