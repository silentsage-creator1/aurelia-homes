-- Keep renter self-registration least-privileged while saving its contact phone.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
 insert into public.profiles(id, full_name, email, phone)
 values(
   new.id,
   coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
   new.email,
   nullif(trim(new.raw_user_meta_data->>'phone'), '')
 )
 on conflict(id) do update set
   email = excluded.email,
   phone = coalesce(excluded.phone, public.profiles.phone);
 insert into public.profile_roles(profile_id, role) values(new.id, 'renter') on conflict do nothing;
 return new;
end;
$$;
