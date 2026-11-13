-- Tenant self-service renewal and termination requests.
create table if not exists public.tenancy_requests (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  request_type text not null check (request_type in ('renewal','termination')),
  reason text not null check (length(trim(reason)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending','reviewing','approved','declined','cancelled')),
  response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenancy_requests enable row level security;
create policy "tenancy participants read requests" on public.tenancy_requests
  for select to authenticated using (public.can_access_tenancy(tenancy_id));
create policy "active tenants create own tenancy requests" on public.tenancy_requests
  for insert to authenticated with check (
    requested_by = auth.uid() and exists (
      select 1 from public.tenancies t where t.id=tenancy_id and t.tenant_id=auth.uid() and t.status='active'
    )
  );
create policy "landlord reviews tenancy requests" on public.tenancy_requests
  for update to authenticated using (
    exists (select 1 from public.tenancies t where t.id=tenancy_id and t.landlord_id=auth.uid())
  ) with check (
    exists (select 1 from public.tenancies t where t.id=tenancy_id and t.landlord_id=auth.uid())
  );

grant select, insert on public.tenancy_requests to authenticated;
grant update (status,response,updated_at) on public.tenancy_requests to authenticated;

create or replace function public.notify_tenancy_request()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_landlord uuid; v_kind text;
begin
  select landlord_id into v_landlord from public.tenancies where id=new.tenancy_id;
  v_kind := case when new.request_type='renewal' then 'lease renewal' else 'tenancy termination' end;
  insert into public.notifications(recipient_id,title,body,action_path)
  values(v_landlord,'Tenant requested ' || v_kind,'A tenant submitted a ' || v_kind || ' request. Review it in the landlord dashboard.','/manage-rentals');
  return new;
end;
$$;
create trigger tenancy_request_notification after insert on public.tenancy_requests
  for each row execute function public.notify_tenancy_request();
-- Private tenant profile photos in the existing rental document bucket.
alter table public.profiles
add column if not exists profile_photo_path text;

grant update (profile_photo_path) on public.profiles to authenticated;
create policy "users read own private profile photo" on storage.objects for select to authenticated
  using (bucket_id='rental-documents' and split_part(name,'/',1)='profiles' and split_part(name,'/',2)=auth.uid()::text);
create policy "users upload own private profile photo" on storage.objects for insert to authenticated
  with check (bucket_id='rental-documents' and split_part(name,'/',1)='profiles' and split_part(name,'/',2)=auth.uid()::text and coalesce(metadata->>'mimetype','') in ('image/jpeg','image/png','image/webp'));
