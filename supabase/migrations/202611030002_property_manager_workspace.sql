-- Assignment-scoped property manager access and operational records.
-- Recover the core table if the earlier onboarding migration is recorded as
-- applied in Supabase but this relation is missing from that project's schema.
-- Restore the descriptive columns expected by the connected property workflows.
alter table public.properties add column if not exists title text;
alter table public.properties add column if not exists property_type text;
alter table public.properties add column if not exists neighborhood text;
alter table public.properties add column if not exists city text;
alter table public.properties add column if not exists country text;
alter table public.properties add column if not exists description text not null default '';
alter table public.properties add column if not exists bedrooms smallint not null default 0;
alter table public.properties add column if not exists bathrooms smallint not null default 0;
alter table public.properties add column if not exists image_urls text[] not null default '{}';
do $$
declare v_source_column text;
begin
  select column_name into v_source_column
  from information_schema.columns
  where table_schema='public' and table_name='properties'
    and column_name in ('property_title','property_name','name')
  order by case column_name when 'property_title' then 1 when 'property_name' then 2 else 3 end
  limit 1;
  if v_source_column is not null then
    execute format('update public.properties set title=nullif(btrim(%I::text), '''') where title is null', v_source_column);
  end if;
  update public.properties set title=nullif(btrim(address::text), '') where title is null;
  update public.properties set title='Rental property' where title is null;
end;
$$;
alter table public.properties alter column title set default 'Rental property';
alter table public.properties alter column title set not null;

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete restrict,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  title text not null,
  category text not null check (category in ('plumbing','electrical','structural','security','appliance','general','other')),
  description text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'submitted' check (status in ('submitted','under_review','assigned','in_progress','resolved','rejected')),
  attachment_path text,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.maintenance_requests enable row level security;
create or replace function public.can_access_maintenance_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.maintenance_requests m where m.id=p_request_id and (m.requested_by=auth.uid() or m.assigned_to=auth.uid() or public.can_access_tenancy(m.tenancy_id))); $$;
revoke all on function public.can_access_maintenance_request(uuid) from public, anon;
grant execute on function public.can_access_maintenance_request(uuid) to authenticated;
drop policy if exists "participants read maintenance requests" on public.maintenance_requests;
create policy "participants read maintenance requests" on public.maintenance_requests for select to authenticated
  using (public.can_access_maintenance_request(id));
drop policy if exists "active tenant submits maintenance requests" on public.maintenance_requests;
create policy "active tenant submits maintenance requests" on public.maintenance_requests for insert to authenticated
  with check (requested_by=auth.uid() and exists(select 1 from public.tenancies t where t.id=tenancy_id and t.tenant_id=auth.uid() and t.status='active' and t.property_id=maintenance_requests.property_id));
drop policy if exists "tenant attaches maintenance evidence" on public.maintenance_requests;
create policy "tenant attaches maintenance evidence" on public.maintenance_requests for update to authenticated
  using (requested_by=auth.uid()) with check (requested_by=auth.uid());
revoke all on public.maintenance_requests from anon, authenticated;
grant select, insert on public.maintenance_requests to authenticated;
grant update (attachment_path) on public.maintenance_requests to authenticated;

-- Restore tenancy messaging if the recorded core migration predates this table.
create table if not exists public.rental_messages (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.rental_messages enable row level security;
drop policy if exists "message participants read messages" on public.rental_messages;
create policy "message participants read messages" on public.rental_messages for select to authenticated
  using (sender_id=auth.uid() or recipient_id=auth.uid());
drop policy if exists "tenancy participants send messages" on public.rental_messages;
create policy "tenancy participants send messages" on public.rental_messages for insert to authenticated
  with check (sender_id=auth.uid() and exists(select 1 from public.tenancies t where t.id=tenancy_id and t.status in ('pending_activation','active') and ((sender_id=t.tenant_id and recipient_id=t.landlord_id) or (sender_id=t.landlord_id and recipient_id=t.tenant_id))));
drop policy if exists "message recipients update read status" on public.rental_messages;
create policy "message recipients update read status" on public.rental_messages for update to authenticated
  using (recipient_id=auth.uid()) with check (recipient_id=auth.uid());
revoke all on public.rental_messages from anon, authenticated;
grant select, insert on public.rental_messages to authenticated;
grant update (read_at) on public.rental_messages to authenticated;

create table public.property_manager_assignments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  manager_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  status text not null default 'active' check (status in ('active','ended')),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index property_manager_one_active_assignment on public.property_manager_assignments(property_id,manager_id) where status='active';
create index property_manager_assignments_manager_idx on public.property_manager_assignments(manager_id,status);

create or replace function public.can_manage_property(p_property_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select public.has_role('property_manager') and exists(select 1 from public.property_manager_assignments a where a.property_id=p_property_id and a.manager_id=auth.uid() and a.status='active'); $$;

create table public.property_inspections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.property_units(id) on delete set null,
  tenancy_id uuid references public.tenancies(id) on delete set null,
  manager_id uuid not null references public.profiles(id),
  inspection_type text not null check (inspection_type in ('routine','move_in','move_out','maintenance','safety','special')),
  status text not null default 'scheduled' check (status in ('scheduled','confirmed','in_progress','completed','rescheduled','cancelled')),
  scheduled_at timestamptz not null,
  notes text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  outcome text,
  report_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_complaints (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  category text not null check (category in ('noise','security','water','electricity','neighbour','shared_area','general','other')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  title text not null,
  description text not null,
  status text not null default 'new' check (status in ('new','under_review','action_required','awaiting_response','resolved','closed')),
  manager_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.complaint_internal_notes (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.tenant_complaints(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  note text not null check (length(trim(note)) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table public.property_expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  category text not null check (category in ('maintenance','repairs','cleaning','security','utilities','waste_management','inspection','administrative','other')),
  description text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'NGN',
  expense_date date not null default current_date,
  receipt_path text,
  approval_status text not null default 'submitted' check (approval_status in ('submitted','pending_approval','approved','rejected','paid')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.property_manager_assignments enable row level security;
alter table public.property_inspections enable row level security;
alter table public.tenant_complaints enable row level security;
alter table public.complaint_internal_notes enable row level security;
alter table public.property_expenses enable row level security;

create policy "managers and owners read property assignments" on public.property_manager_assignments for select to authenticated
  using (manager_id=auth.uid() or exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid()) or public.has_role('admin') or public.has_role('super_admin'));
create policy "owners assign property managers" on public.property_manager_assignments for insert to authenticated
  with check (assigned_by=auth.uid() and exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid()) and public.has_role('property_manager') and exists(select 1 from public.profile_roles r where r.profile_id=manager_id and r.role='property_manager'));
create policy "owners end property manager assignments" on public.property_manager_assignments for update to authenticated
  using (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid()) or public.has_role('admin') or public.has_role('super_admin'))
  with check (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid()) or public.has_role('admin') or public.has_role('super_admin'));

create policy "assigned managers read properties" on public.properties for select to authenticated using (public.can_manage_property(id));
create policy "assigned managers read property units" on public.property_units for select to authenticated using (public.can_manage_property(property_id));
create policy "assigned managers read rental listings" on public.rental_listings for select to authenticated using (public.can_manage_property(property_id));
create policy "assigned managers read tenancies" on public.tenancies for select to authenticated using (public.can_manage_property(property_id));
create policy "assigned managers read notifications for own account" on public.notifications for select to authenticated using (recipient_id=auth.uid());

create or replace function public.can_access_application(p_application_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.rental_applications a join public.rental_listings l on l.id=a.listing_id join public.properties p on p.id=l.property_id where a.id=p_application_id and (a.applicant_id=auth.uid() or p.owner_id=auth.uid() or public.can_manage_property(p.id) or public.has_role('admin') or public.has_role('super_admin'))); $$;
create or replace function public.can_access_tenancy(p_tenancy_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.tenancies t where t.id=p_tenancy_id and (t.tenant_id=auth.uid() or t.landlord_id=auth.uid() or public.can_manage_property(t.property_id) or public.has_role('admin') or public.has_role('super_admin'))); $$;

create policy "assigned managers read inspections" on public.property_inspections for select to authenticated using (public.can_manage_property(property_id) or public.has_role('admin') or public.has_role('super_admin'));
create policy "assigned managers schedule inspections" on public.property_inspections for insert to authenticated with check (manager_id=auth.uid() and public.can_manage_property(property_id) and (unit_id is null or exists(select 1 from public.property_units u where u.id=unit_id and u.property_id=property_inspections.property_id)) and (tenancy_id is null or exists(select 1 from public.tenancies t where t.id=tenancy_id and t.property_id=property_inspections.property_id)));
create policy "assigned managers update inspections" on public.property_inspections for update to authenticated using (manager_id=auth.uid() and public.can_manage_property(property_id)) with check (manager_id=auth.uid() and public.can_manage_property(property_id) and (unit_id is null or exists(select 1 from public.property_units u where u.id=unit_id and u.property_id=property_inspections.property_id)) and (tenancy_id is null or exists(select 1 from public.tenancies t where t.id=tenancy_id and t.property_id=property_inspections.property_id)));
create policy "tenants read own complaints" on public.tenant_complaints for select to authenticated using (requested_by=auth.uid() or public.can_access_tenancy(tenancy_id));
create policy "tenants submit own complaints" on public.tenant_complaints for insert to authenticated with check (requested_by=auth.uid() and exists(select 1 from public.tenancies t where t.id=tenancy_id and t.tenant_id=auth.uid() and t.status='active'));
create policy "assigned managers respond to complaints" on public.tenant_complaints for update to authenticated using (public.can_access_tenancy(tenancy_id) and exists(select 1 from public.tenancies t where t.id=tenancy_id and public.can_manage_property(t.property_id))) with check (public.can_access_tenancy(tenancy_id) and exists(select 1 from public.tenancies t where t.id=tenancy_id and public.can_manage_property(t.property_id)));
create policy "assigned managers read internal complaint notes" on public.complaint_internal_notes for select to authenticated using (exists(select 1 from public.tenant_complaints c join public.tenancies t on t.id=c.tenancy_id where c.id=complaint_id and public.can_manage_property(t.property_id)) or public.has_role('admin') or public.has_role('super_admin'));
create policy "assigned managers add internal complaint notes" on public.complaint_internal_notes for insert to authenticated with check (author_id=auth.uid() and exists(select 1 from public.tenant_complaints c join public.tenancies t on t.id=c.tenancy_id where c.id=complaint_id and public.can_manage_property(t.property_id)));
create policy "assigned managers read property expenses" on public.property_expenses for select to authenticated using (public.can_manage_property(property_id) or public.has_role('admin') or public.has_role('super_admin'));
create policy "assigned managers submit expenses" on public.property_expenses for insert to authenticated with check (submitted_by=auth.uid() and public.can_manage_property(property_id));
create policy "owners and admins review expenses" on public.property_expenses for update to authenticated using (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid()) or public.has_role('admin') or public.has_role('super_admin')) with check (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid()) or public.has_role('admin') or public.has_role('super_admin'));

create policy "assigned managers read rental applications" on public.rental_applications for select to authenticated using (public.can_access_application(id) and exists(select 1 from public.rental_listings l where l.id=listing_id and public.can_manage_property(l.property_id)));
create policy "assigned managers read rental agreements" on public.rental_agreements for select to authenticated using (public.can_access_application(application_id) and exists(select 1 from public.rental_applications a join public.rental_listings l on l.id=a.listing_id where a.id=application_id and public.can_manage_property(l.property_id)));
create policy "assigned managers read payments" on public.payments for select to authenticated using (exists(select 1 from public.payment_obligations o join public.rental_agreements g on g.id=o.agreement_id join public.rental_applications a on a.id=g.application_id join public.rental_listings l on l.id=a.listing_id where o.id=obligation_id and public.can_manage_property(l.property_id)));
create policy "assigned managers read maintenance requests" on public.maintenance_requests for select to authenticated using (exists(select 1 from public.tenancies t where t.id=tenancy_id and public.can_manage_property(t.property_id)));
create policy "assigned managers update maintenance workflow" on public.maintenance_requests for update to authenticated using (exists(select 1 from public.tenancies t where t.id=tenancy_id and public.can_manage_property(t.property_id))) with check (exists(select 1 from public.tenancies t where t.id=tenancy_id and public.can_manage_property(t.property_id)));
create policy "assigned managers read maintenance attachments" on storage.objects for select to authenticated using (bucket_id='rental-documents' and split_part(name,'/',1)='maintenance' and exists(select 1 from public.maintenance_requests m join public.tenancies t on t.id=m.tenancy_id where m.id=split_part(name,'/',2)::uuid and public.can_manage_property(t.property_id)));
create policy "assigned managers read agreement documents" on storage.objects for select to authenticated using (bucket_id='rental-documents' and split_part(name,'/',1)='agreements' and exists(select 1 from public.rental_agreements g join public.rental_applications a on a.id=g.application_id join public.rental_listings l on l.id=a.listing_id where g.id=split_part(name,'/',2)::uuid and public.can_manage_property(l.property_id)));
create policy "assigned managers read inspection reports" on storage.objects for select to authenticated using (bucket_id='rental-documents' and split_part(name,'/',1)='inspections' and exists(select 1 from public.property_inspections i where i.id=split_part(name,'/',2)::uuid and public.can_manage_property(i.property_id)));
create policy "assigned managers upload inspection reports" on storage.objects for insert to authenticated with check (bucket_id='rental-documents' and split_part(name,'/',1)='inspections' and exists(select 1 from public.property_inspections i where i.id=split_part(name,'/',2)::uuid and i.manager_id=auth.uid() and public.can_manage_property(i.property_id)) and coalesce(metadata->>'mimetype','') in ('application/pdf','image/jpeg','image/png','image/webp'));
create policy "assigned managers read expense receipts" on storage.objects for select to authenticated using (bucket_id='rental-documents' and split_part(name,'/',1)='expenses' and exists(select 1 from public.property_expenses e where e.id=split_part(name,'/',2)::uuid and (e.submitted_by=auth.uid() or public.can_manage_property(e.property_id))));
create policy "assigned managers upload expense receipts" on storage.objects for insert to authenticated with check (bucket_id='rental-documents' and split_part(name,'/',1)='expenses' and exists(select 1 from public.property_expenses e where e.id=split_part(name,'/',2)::uuid and e.submitted_by=auth.uid() and public.can_manage_property(e.property_id)) and coalesce(metadata->>'mimetype','') in ('application/pdf','image/jpeg','image/png','image/webp'));

create or replace function public.property_manager_overview()
returns table(assigned_properties bigint, active_listings bigint, occupied_units bigint, vacant_units bigint, active_tenants bigint, outstanding_minor bigint, overdue_minor bigint, open_maintenance bigint, urgent_maintenance bigint, upcoming_inspections bigint, active_tenancies bigint)
language sql stable security definer set search_path=public
as $$
with assigned as (select p.id from public.properties p join public.property_manager_assignments a on a.property_id=p.id where a.manager_id=auth.uid() and a.status='active' and public.has_role('property_manager')),
units as (select u.id,u.availability from public.property_units u join assigned a on a.id=u.property_id),
active_t as (select t.* from public.tenancies t join assigned a on a.id=t.property_id where t.status='active'),
obligations as (select o.amount_minor,o.due_date,coalesce(sum(pay.amount_minor) filter(where pay.status in ('success','verified_external') and pay.verified_at is not null),0) paid from public.payment_obligations o join public.rental_agreements g on g.id=o.agreement_id join public.rental_applications ra on ra.id=g.application_id join public.rental_listings l on l.id=ra.listing_id join assigned a on a.id=l.property_id left join public.payments pay on pay.obligation_id=o.id where o.required group by o.id),
maint as (select m.status,m.priority from public.maintenance_requests m join public.tenancies t on t.id=m.tenancy_id join assigned a on a.id=t.property_id)
select (select count(*) from assigned),
 (select count(*) from public.rental_listings l join assigned a on a.id=l.property_id where l.status='published'),
 (select count(*) from units where availability='rented') + (select count(*) from public.rental_listings l join assigned a on a.id=l.property_id where l.status='rented' and l.unit_id is null and not exists(select 1 from public.property_units u where u.property_id=l.property_id)),
 (select count(*) from units where availability='available') + (select count(*) from public.rental_listings l join assigned a on a.id=l.property_id where l.status='published' and l.unit_id is null and not exists(select 1 from public.property_units u where u.property_id=l.property_id)),
 (select count(distinct tenant_id) from active_t),
 coalesce((select sum(greatest(amount_minor-paid,0)) from obligations),0),
 coalesce((select sum(greatest(amount_minor-paid,0)) from obligations where due_date<current_date and amount_minor>paid),0),
 (select count(*) from maint where status not in ('resolved','rejected')),
 (select count(*) from maint where priority='urgent' and status not in ('resolved','rejected')),
 (select count(*) from public.property_inspections i join assigned a on a.id=i.property_id where i.status in ('scheduled','confirmed') and i.scheduled_at>=now()),
 (select count(*) from active_t);
$$;

create or replace function public.property_manager_properties()
returns table(property_id uuid,title text,address text,property_type text,image_urls text[],owner_name text,assignment_date timestamptz,total_units bigint,occupied_units bigint,active_tenants bigint,open_maintenance bigint)
language sql stable security definer set search_path=public
as $$
select p.id,p.title,p.address,p.property_type,p.image_urls,owner.full_name,a.assigned_at,
 case when exists(select 1 from public.property_units u where u.property_id=p.id) then (select count(*) from public.property_units u where u.property_id=p.id) else (select count(*) from public.rental_listings l where l.property_id=p.id and l.status in ('published','rented')) end,
 case when exists(select 1 from public.property_units u where u.property_id=p.id) then (select count(*) from public.property_units u where u.property_id=p.id and u.availability='rented') else (select count(*) from public.rental_listings l where l.property_id=p.id and l.status='rented') end,
 (select count(distinct t.tenant_id) from public.tenancies t where t.property_id=p.id and t.status='active'),
 (select count(*) from public.maintenance_requests m join public.tenancies t on t.id=m.tenancy_id where t.property_id=p.id and m.status not in ('resolved','rejected'))
from public.property_manager_assignments a join public.properties p on p.id=a.property_id join public.profiles owner on owner.id=p.owner_id
where a.manager_id=auth.uid() and a.status='active' and public.has_role('property_manager') order by p.title;
$$;

create or replace function public.property_manager_tenants()
returns table(tenancy_id uuid,tenant_id uuid,tenant_name text,tenant_email text,tenant_phone text,property_id uuid,property_title text,property_address text,unit_label text,lease_start date,lease_end date,rent_amount_minor bigint,currency char(3),tenancy_status text,agreement_status text)
language sql stable security definer set search_path=public
as $$
select t.id,t.tenant_id,r.full_name,r.email,r.phone,p.id,p.title,p.address,u.unit_label,g.lease_start,g.lease_end,g.rent_amount_minor,l.currency,t.status::text,g.status::text
from public.tenancies t join public.properties p on p.id=t.property_id join public.property_manager_assignments a on a.property_id=p.id and a.manager_id=auth.uid() and a.status='active' and public.has_role('property_manager') join public.profiles r on r.id=t.tenant_id join public.rental_agreements g on g.id=t.agreement_id join public.rental_applications ra on ra.id=t.application_id join public.rental_listings l on l.id=ra.listing_id left join public.property_units u on u.id=t.unit_id
where t.status in ('pending_activation','active','ended') order by t.end_date;
$$;

revoke all on public.property_manager_assignments,public.property_inspections,public.tenant_complaints,public.complaint_internal_notes,public.property_expenses from anon,authenticated;
revoke insert,update,delete on public.property_manager_assignments from anon,authenticated;
revoke update,delete on public.property_inspections,public.tenant_complaints,public.complaint_internal_notes,public.property_expenses from anon,authenticated;
grant select on public.property_manager_assignments,public.property_inspections,public.tenant_complaints,public.complaint_internal_notes,public.property_expenses to authenticated;
grant insert,update on public.property_manager_assignments to authenticated;
grant insert on public.property_inspections,public.tenant_complaints,public.complaint_internal_notes,public.property_expenses to authenticated;
grant update (status,notes,checklist,outcome,report_path,scheduled_at,updated_at) on public.property_inspections to authenticated;
grant update (status,manager_response,updated_at) on public.tenant_complaints to authenticated;
grant update (approval_status,reviewed_by,reviewed_at) on public.property_expenses to authenticated;
grant update (status,resolution_notes,updated_at) on public.maintenance_requests to authenticated;
grant update (full_name,phone,profile_photo_path) on public.profiles to authenticated;

grant execute on function public.property_manager_overview() to authenticated;
grant execute on function public.property_manager_properties() to authenticated;
grant execute on function public.property_manager_tenants() to authenticated;
create policy "owners and admins respond to complaints" on public.tenant_complaints for update to authenticated
  using (exists(select 1 from public.tenancies t join public.properties p on p.id=t.property_id where t.id=tenancy_id and p.owner_id=auth.uid()) or public.has_role('admin') or public.has_role('super_admin'))
  with check (exists(select 1 from public.tenancies t join public.properties p on p.id=t.property_id where t.id=tenancy_id and p.owner_id=auth.uid()) or public.has_role('admin') or public.has_role('super_admin'));
create policy "assigned managers read rental messages" on public.rental_messages for select to authenticated
  using (exists(select 1 from public.tenancies t where t.id=tenancy_id and public.can_manage_property(t.property_id)));
create policy "assigned managers message tenancy participants" on public.rental_messages for insert to authenticated
  with check (sender_id=auth.uid() and exists(select 1 from public.tenancies t where t.id=tenancy_id and t.status in ('pending_activation','active') and public.can_manage_property(t.property_id) and recipient_id in (t.tenant_id,t.landlord_id)));
create policy "tenancy participants reply to assigned managers" on public.rental_messages for insert to authenticated
  with check (sender_id=auth.uid() and exists(select 1 from public.tenancies t where t.id=tenancy_id and t.status in ('pending_activation','active') and ((sender_id=t.tenant_id and recipient_id in (select a.manager_id from public.property_manager_assignments a where a.property_id=t.property_id and a.status='active' and exists(select 1 from public.profile_roles r where r.profile_id=a.manager_id and r.role='property_manager'))) or (sender_id=t.landlord_id and recipient_id in (select a.manager_id from public.property_manager_assignments a where a.property_id=t.property_id and a.status='active' and exists(select 1 from public.profile_roles r where r.profile_id=a.manager_id and r.role='property_manager'))))));
create policy "assigned managers create maintenance coordination requests" on public.maintenance_requests for insert to authenticated
  with check (requested_by=auth.uid() and exists(select 1 from public.tenancies t where t.id=tenancy_id and t.property_id=maintenance_requests.property_id and public.can_manage_property(t.property_id)));

create or replace function public.property_manager_rent_records()
returns table(obligation_id uuid,tenancy_id uuid,tenant_id uuid,tenant_name text,property_id uuid,property_title text,unit_label text,description text,amount_minor bigint,paid_minor bigint,outstanding_minor bigint,currency char(3),due_date date,payment_status text,last_payment_at timestamptz,payment_method text)
language sql stable security definer set search_path=public
as $$
select o.id,t.id,t.tenant_id,r.full_name,p.id,p.title,u.unit_label,o.description,o.amount_minor,
 coalesce(sum(pay.amount_minor) filter(where pay.status in ('success','verified_external') and pay.verified_at is not null),0)::bigint,
 greatest(o.amount_minor-coalesce(sum(pay.amount_minor) filter(where pay.status in ('success','verified_external') and pay.verified_at is not null),0),0)::bigint,
 l.currency,o.due_date,
 case when coalesce(sum(pay.amount_minor) filter(where pay.status in ('success','verified_external') and pay.verified_at is not null),0)>=o.amount_minor then 'paid'
      when latest.status='failed' then 'failed'
      when latest.status='pending' or latest.status='external_review' then 'pending'
      when coalesce(sum(pay.amount_minor) filter(where pay.status in ('success','verified_external') and pay.verified_at is not null),0)>0 then 'partially_paid'
      when o.due_date<current_date then 'overdue' else 'upcoming' end,
 latest.created_at,latest.provider
from public.payment_obligations o join public.rental_agreements g on g.id=o.agreement_id join public.rental_applications ra on ra.id=g.application_id
join public.rental_listings l on l.id=ra.listing_id join public.properties p on p.id=l.property_id
join public.property_manager_assignments a on a.property_id=p.id and a.manager_id=auth.uid() and a.status='active' and public.has_role('property_manager')
join public.tenancies t on t.agreement_id=g.id join public.profiles r on r.id=t.tenant_id left join public.property_units u on u.id=t.unit_id
left join public.payments pay on pay.obligation_id=o.id
left join lateral (select pp.status,pp.created_at,pp.provider from public.payments pp where pp.obligation_id=o.id order by pp.created_at desc limit 1) latest on true
where o.required and public.has_role('property_manager')
group by o.id,t.id,t.tenant_id,r.full_name,p.id,p.title,u.unit_label,o.description,o.amount_minor,l.currency,o.due_date,latest.status,latest.created_at,latest.provider
order by o.due_date;
$$;

revoke all on function public.can_manage_property(uuid) from public;
grant execute on function public.can_manage_property(uuid) to authenticated;
grant execute on function public.property_manager_rent_records() to authenticated;
create or replace function public.prevent_tenant_maintenance_status_changes()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid()=old.requested_by and not public.can_manage_property(old.property_id) and not public.has_role('admin') and not public.has_role('super_admin') then
    if new.tenancy_id is distinct from old.tenancy_id or new.property_id is distinct from old.property_id or new.requested_by is distinct from old.requested_by or new.assigned_to is distinct from old.assigned_to or new.title is distinct from old.title or new.category is distinct from old.category or new.description is distinct from old.description or new.priority is distinct from old.priority or new.status is distinct from old.status or new.resolution_notes is distinct from old.resolution_notes then
      raise exception 'Tenants may only attach evidence to their maintenance request';
    end if;
  end if;
  return new;
end;
$$;
create trigger prevent_tenant_maintenance_status_changes before update on public.maintenance_requests
  for each row execute function public.prevent_tenant_maintenance_status_changes();

revoke update on public.property_manager_assignments from authenticated;
grant update (status,ended_at) on public.property_manager_assignments to authenticated;
create or replace function public.assign_property_manager(p_property_id uuid,p_manager_id uuid)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_assignment uuid; v_owner uuid;
begin
  select owner_id into v_owner from public.properties where id=p_property_id;
  if v_owner is null then raise exception 'Property not found'; end if;
  if auth.uid() is distinct from v_owner and not public.has_role('admin') and not public.has_role('super_admin') then raise exception 'Only the property owner or an administrator can assign a manager'; end if;
  if not exists(select 1 from public.profile_roles where profile_id=p_manager_id and role='property_manager') then raise exception 'Selected profile is not a property manager'; end if;
  insert into public.property_manager_assignments(property_id,manager_id,assigned_by,status)
  values(p_property_id,p_manager_id,auth.uid(),'active') returning id into v_assignment;
  insert into public.notifications(recipient_id,title,body,action_path)
  values(p_manager_id,'Property assigned','A property has been assigned to your management portfolio.','/dashboard');
  return v_assignment;
end;
$$;
create or replace function public.end_property_manager_assignment(p_assignment_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
  update public.property_manager_assignments a set status='ended',ended_at=now()
  where a.id=p_assignment_id and a.status='active'
    and (exists(select 1 from public.properties p where p.id=a.property_id and p.owner_id=auth.uid()) or public.has_role('admin') or public.has_role('super_admin'));
  if not found then raise exception 'Assignment not found or not authorized'; end if;
end;
$$;
revoke all on function public.assign_property_manager(uuid,uuid) from public;
revoke all on function public.end_property_manager_assignment(uuid) from public;
grant execute on function public.assign_property_manager(uuid,uuid),public.end_property_manager_assignment(uuid) to authenticated;
create or replace function public.notify_manager_operational_event()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_property uuid; v_tenant uuid; v_owner uuid;
begin
  if tg_table_name='tenant_complaints' then
    select t.property_id,t.tenant_id into v_property,v_tenant from public.tenancies t where t.id=new.tenancy_id;
    insert into public.notifications(recipient_id,title,body,action_path)
      select a.manager_id,'New tenant complaint',new.title || ' · ' || new.priority,'/dashboard'
      from public.property_manager_assignments a where a.property_id=v_property and a.status='active';
  elsif tg_table_name='property_inspections' then
    if new.tenancy_id is not null then
      select tenant_id into v_tenant from public.tenancies where id=new.tenancy_id;
      insert into public.notifications(recipient_id,title,body,action_path) values(v_tenant,'Property inspection scheduled','An inspection is scheduled for ' || new.scheduled_at::date::text || '.','/renter-dashboard');
    end if;
  elsif tg_table_name='property_expenses' then
    select owner_id into v_owner from public.properties where id=new.property_id;
    if tg_op='INSERT' then
      insert into public.notifications(recipient_id,title,body,action_path) values(v_owner,'Property expense submitted',new.description || ' · ' || new.approval_status,'/manage-rentals');
    elsif old.approval_status is distinct from new.approval_status then
      insert into public.notifications(recipient_id,title,body,action_path) values(new.submitted_by,'Expense review updated',new.description || ' · ' || new.approval_status,'/dashboard');
    end if;
  elsif tg_table_name='maintenance_requests' and tg_op='UPDATE' and old.status is distinct from new.status then
    insert into public.notifications(recipient_id,title,body,action_path) values(new.requested_by,'Maintenance request updated',new.title || ' · ' || new.status,'/renter-dashboard?section=maintenance');
  end if;
  return new;
end;
$$;
create trigger manager_complaint_notification after insert on public.tenant_complaints
  for each row execute function public.notify_manager_operational_event();
create trigger manager_inspection_notification after insert on public.property_inspections
  for each row execute function public.notify_manager_operational_event();
create trigger manager_expense_insert_notification after insert on public.property_expenses
  for each row execute function public.notify_manager_operational_event();
create trigger manager_expense_update_notification after update of approval_status on public.property_expenses
  for each row execute function public.notify_manager_operational_event();
create trigger manager_maintenance_status_notification after update of status on public.maintenance_requests
  for each row execute function public.notify_manager_operational_event();
revoke all on function public.property_manager_overview() from public;
revoke all on function public.property_manager_properties() from public;
revoke all on function public.property_manager_tenants() from public;
revoke all on function public.property_manager_rent_records() from public;
revoke all on function public.prevent_tenant_maintenance_status_changes() from public;
revoke all on function public.notify_manager_operational_event() from public;
grant execute on function public.property_manager_overview(),public.property_manager_properties(),public.property_manager_tenants(),public.property_manager_rent_records() to authenticated;
