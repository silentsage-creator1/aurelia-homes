-- Restore profile fields used by the renter and staff workspaces when the
-- connected database predates the current profile schema.
alter table public.profiles
  add column if not exists residential_address text,
  add column if not exists profile_photo_path text,
  add column if not exists identity_verification_status text not null default 'not_started';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_identity_verification_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_identity_verification_status_check
      check (identity_verification_status in ('not_started','pending','verified','rejected'));
  end if;
end;
$$;

grant update (full_name, phone, residential_address, profile_photo_path) on public.profiles to authenticated;

notify pgrst, 'reload schema';
