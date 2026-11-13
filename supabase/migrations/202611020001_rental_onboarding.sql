-- Shared rental onboarding records. Apply to a Supabase project after creating
-- the private `rental-documents` Storage bucket.
create extension if not exists pgcrypto;

create type public.account_role as enum ('buyer', 'renter', 'tenant', 'landlord', 'agent', 'property_manager', 'contractor', 'admin', 'super_admin');
create type public.application_status as enum ('submitted', 'under_review', 'additional_information_required', 'approved', 'rejected', 'withdrawn', 'cancelled');
create type public.agreement_status as enum ('draft', 'landlord_review', 'pending_signature', 'partially_signed', 'signed', 'declined', 'cancelled');
create type public.payment_status as enum ('pending', 'partially_paid', 'paid', 'failed', 'refunded', 'external_review');
create type public.move_in_status as enum ('pending', 'scheduled', 'handover_pending', 'confirmed', 'cancelled', 'overdue');
create type public.tenancy_status as enum ('pending_activation', 'active', 'ended', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  residential_address text,
  profile_photo_path text,
  identity_verification_status text not null default 'not_started' check (identity_verification_status in ('not_started','pending','verified','rejected')),
  created_at timestamptz not null default now()
);

create table public.profile_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.account_role not null,
  primary key (profile_id, role)
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  owner_id uuid not null references public.profiles(id),
  title text not null default 'Rental property',
  address text not null,
  neighborhood text,
  city text,
  country text,
  property_type text,
  description text not null default '',
  bedrooms smallint not null default 0,
  bathrooms smallint not null default 0,
  image_urls text[] not null default '{}',
  currency char(3) not null default 'NGN',
  created_at timestamptz not null default now()
);

create table public.property_units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_label text not null,
  availability text not null default 'available' check (availability in ('available','reserved','rented','unavailable')),
  unique(property_id, unit_label)
);

create table public.rental_listings (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid references public.property_units(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','pending_review','published','rejected','rented','withdrawn')),
  rent_amount_minor bigint not null check (rent_amount_minor > 0),
  rent_frequency text not null default 'monthly' check (rent_frequency in ('weekly','monthly','quarterly','annually')),
  deposit_amount_minor bigint not null default 0 check (deposit_amount_minor >= 0),
  currency char(3) not null default 'NGN',
  created_at timestamptz not null default now()
);

create table public.rental_applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.rental_listings(id) on delete restrict,
  applicant_id uuid not null references public.profiles(id) on delete restrict,
  status public.application_status not null default 'submitted',
  desired_move_in date not null,
  occupation text not null,
  message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(occupation)) > 0)
);

create unique index one_open_application_per_listing_and_applicant
 on public.rental_applications(listing_id, applicant_id)
 where status not in ('rejected','withdrawn','cancelled');

create table public.rental_agreements (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.rental_applications(id) on delete restrict,
  status public.agreement_status not null default 'draft',
  terms jsonb not null default '{}'::jsonb,
  lease_start date not null,
  lease_end date not null,
  payment_due_day smallint not null default 1 check (payment_due_day between 1 and 28),
  rent_amount_minor bigint not null check (rent_amount_minor > 0),
  deposit_amount_minor bigint not null default 0 check (deposit_amount_minor >= 0),
  fees jsonb not null default '[]'::jsonb,
  landlord_finalized_at timestamptz,
  provider_request_id text unique,
  unsigned_document_path text,
  signed_document_path text,
  signed_document_ready_at timestamptz,
  created_at timestamptz not null default now(),
  check (lease_end > lease_start)
);

create table public.agreement_signatures (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.rental_agreements(id) on delete cascade,
  signer_id uuid not null references public.profiles(id),
  signer_role text not null check (signer_role in ('landlord','renter')),
  status text not null default 'pending' check (status in ('pending','signed','declined')),
  signed_at timestamptz,
  provider_signature_id text,
  unique(agreement_id, signer_id)
);

create table public.payment_obligations (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.rental_agreements(id) on delete cascade,
  description text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  due_date date not null,
  required boolean not null default true
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references public.payment_obligations(id) on delete restrict,
  payer_id uuid not null references public.profiles(id),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  status text not null default 'pending' check (status in ('pending','success','failed','reversed','external_review','verified_external')),
  provider text not null check (provider in ('paystack','external')),
  provider_reference text unique,
  receipt_number text unique,
  verified_at timestamptz,
  external_evidence_path text,
  external_verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.move_ins (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null unique references public.rental_agreements(id) on delete cascade,
  status public.move_in_status not null default 'pending',
  move_in_date date,
  landlord_confirmed_at timestamptz,
  renter_confirmed_at timestamptz,
  overdue_notified_at timestamptz,
  keys_handed_over boolean not null default false,
  meter_readings jsonb not null default '{}'::jsonb,
  outstanding_issues text not null default '',
  created_at timestamptz not null default now()
);

create table public.handover_items (
  id uuid primary key default gen_random_uuid(),
  move_in_id uuid not null references public.move_ins(id) on delete cascade,
  item_key text not null,
  completed boolean not null default false,
  notes text not null default '',
  photo_path text,
  unique(move_in_id, item_key)
);

create table public.tenancies (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null unique references public.rental_agreements(id) on delete restrict,
  application_id uuid not null unique references public.rental_applications(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_id uuid references public.property_units(id) on delete restrict,
  landlord_id uuid not null references public.profiles(id),
  tenant_id uuid not null references public.profiles(id),
  status public.tenancy_status not null default 'pending_activation',
  start_date date not null,
  end_date date not null,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index one_open_tenancy_per_unit on public.tenancies(unit_id)
where unit_id is not null and status in ('pending_activation','active');
create unique index one_open_whole_property_tenancy on public.tenancies(property_id)
where unit_id is null and status in ('pending_activation','active');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  action_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.saved_rentals (
  renter_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.rental_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (renter_id, listing_id)
);

create table public.tenant_preferences (
  renter_id uuid primary key references public.profiles(id) on delete cascade,
  email_notifications boolean not null default true,
  payment_reminders boolean not null default true,
  maintenance_updates boolean not null default true,
  message_notifications boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.maintenance_requests (
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

create table public.rental_messages (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (length(trim(body)) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.workflow_audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.integration_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('paystack','dropbox_sign')),
  event_key text not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider,event_key)
);

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
 insert into public.profiles(id, full_name, email)
 values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email)
 on conflict(id) do update set email = excluded.email;
 -- Self-registration can only grant the least-privileged applicant role.
 insert into public.profile_roles(profile_id, role) values(new.id, 'renter') on conflict do nothing;
 return new;
end;
$$;

create trigger on_auth_user_created
 after insert on auth.users for each row execute procedure public.handle_new_auth_user();

create index rental_applications_applicant_idx on public.rental_applications(applicant_id, created_at desc);
create index rental_applications_listing_idx on public.rental_applications(listing_id, status);
create index payments_obligation_status_idx on public.payments(obligation_id, status);
create index notifications_recipient_idx on public.notifications(recipient_id, created_at desc);

-- Common authorization helpers. Role grants live in a server-managed table;
-- users cannot assign themselves privileged roles.
create or replace function public.has_role(p_role public.account_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profile_roles where profile_id = auth.uid() and role = p_role); $$;

create or replace function public.can_access_application(p_application_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
 select exists (
  select 1 from public.rental_applications a
  join public.rental_listings l on l.id = a.listing_id
  join public.properties p on p.id = l.property_id
  where a.id = p_application_id and (a.applicant_id = auth.uid() or p.owner_id = auth.uid() or public.has_role('admin') or public.has_role('super_admin'))
 );
$$;

create or replace function public.can_access_agreement(p_agreement_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.can_access_application((select application_id from public.rental_agreements where id = p_agreement_id)); $$;

create or replace function public.can_access_move_in(p_move_in_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.can_access_agreement((select agreement_id from public.move_ins where id = p_move_in_id)); $$;

create or replace function public.can_access_obligation(p_obligation_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.can_access_agreement((select agreement_id from public.payment_obligations where id = p_obligation_id)); $$;

-- Break the properties/listings RLS policy cycle by evaluating access through
-- a narrowly-scoped SECURITY DEFINER helper owned by the migration role.
create or replace function public.can_read_property(p_property_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
 select exists (
  select 1 from public.properties p where p.id = p_property_id and (
   p.owner_id = auth.uid() or public.has_role('admin') or public.has_role('super_admin') or
   exists (select 1 from public.rental_listings l where l.property_id = p.id and l.status = 'published') or
   exists (select 1 from public.rental_applications a join public.rental_listings l on l.id = a.listing_id where l.property_id = p.id and a.applicant_id = auth.uid())
  )
 );
$$;

create or replace function public.can_access_tenancy(p_tenancy_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.tenancies t where t.id=p_tenancy_id and (t.tenant_id=auth.uid() or t.landlord_id=auth.uid() or public.has_role('admin') or public.has_role('super_admin'))); $$;

create or replace function public.can_access_maintenance_request(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.maintenance_requests m where m.id=p_request_id and (m.requested_by=auth.uid() or m.assigned_to=auth.uid() or public.can_access_tenancy(m.tenancy_id))); $$;

alter table public.profiles enable row level security;
alter table public.profile_roles enable row level security;
alter table public.properties enable row level security;
alter table public.property_units enable row level security;
alter table public.rental_listings enable row level security;
alter table public.rental_applications enable row level security;
alter table public.rental_agreements enable row level security;
alter table public.agreement_signatures enable row level security;
alter table public.payment_obligations enable row level security;
alter table public.payments enable row level security;
alter table public.move_ins enable row level security;
alter table public.handover_items enable row level security;
alter table public.tenancies enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_rentals enable row level security;
alter table public.tenant_preferences enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.rental_messages enable row level security;
alter table public.workflow_audit_events enable row level security;
alter table public.integration_webhook_events enable row level security;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('rental-documents','rental-documents',false,15728640,array['application/pdf','image/jpeg','image/png','image/webp','video/mp4'])
on conflict (id) do update set public = false;

create policy "profiles visible to self and related parties"
on public.profiles
for select
to authenticated
using (
  profiles.id = auth.uid()
  or public.has_role('admin')
  or public.has_role('super_admin')
  or exists (
    select 1
    from public.rental_applications a
    join public.rental_listings l
      on l.id = a.listing_id
    join public.properties p
      on p.id = l.property_id
    where
      (
        a.applicant_id = auth.uid()
        and p.owner_id = profiles.id
      )
      or
      (
        p.owner_id = auth.uid()
        and a.applicant_id = profiles.id
      )
  )
);
create policy "profile owner can edit contact fields" on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());
create policy "users read own roles" on public.profile_roles for select to authenticated using (profile_id = auth.uid());
create policy "public listings are readable" on public.rental_listings for select to anon, authenticated
using (status = 'published' or public.can_read_property(property_id));
create policy "property owner or related applicant can read property" on public.properties for select to anon, authenticated
using (public.can_read_property(id));
create policy "owners read units" on public.property_units for select to authenticated
using (exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or public.has_role('admin') or public.has_role('super_admin'))));
create policy "participants read applications" on public.rental_applications for select to authenticated using (public.can_access_application(id));
create policy "applicants submit own applications" on public.rental_applications for insert to authenticated
with check (applicant_id = auth.uid() and status = 'submitted' and exists (select 1 from public.rental_listings l where l.id = listing_id and l.status = 'published'));
create policy "participants read agreements" on public.rental_agreements for select to authenticated using (public.can_access_application(application_id));
create policy "participants read signatures" on public.agreement_signatures for select to authenticated using (public.can_access_application((select application_id from public.rental_agreements where id = agreement_id)));
create policy "participants read payment obligations" on public.payment_obligations for select to authenticated using (public.can_access_application((select application_id from public.rental_agreements where id = agreement_id)));
create policy "participants read payments" on public.payments for select to authenticated using (exists (select 1 from public.payment_obligations o join public.rental_agreements g on g.id = o.agreement_id where o.id = obligation_id and public.can_access_application(g.application_id)));
create policy "participants read move in" on public.move_ins for select to authenticated using (public.can_access_application((select application_id from public.rental_agreements where id = agreement_id)));
create policy "participants read handover" on public.handover_items for select to authenticated using (exists (select 1 from public.move_ins m join public.rental_agreements g on g.id = m.agreement_id where m.id = move_in_id and public.can_access_application(g.application_id)));
create policy "participants read tenancies" on public.tenancies for select to authenticated using (landlord_id = auth.uid() or tenant_id = auth.uid() or public.has_role('admin') or public.has_role('super_admin'));
create policy "recipients read own notifications" on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy "recipients update own notifications" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "renter reads own saved rentals" on public.saved_rentals for select to authenticated using (renter_id=auth.uid());
create policy "renter saves own published rentals" on public.saved_rentals for insert to authenticated with check (renter_id=auth.uid() and exists(select 1 from public.rental_listings l where l.id=listing_id and l.status='published'));
create policy "renter removes own saved rentals" on public.saved_rentals for delete to authenticated using (renter_id=auth.uid());
create policy "renter manages own preferences" on public.tenant_preferences for all to authenticated using (renter_id=auth.uid()) with check (renter_id=auth.uid());
create policy "participants read maintenance requests" on public.maintenance_requests for select to authenticated using (public.can_access_maintenance_request(id));
create policy "active tenant submits maintenance requests" on public.maintenance_requests for insert to authenticated with check (requested_by=auth.uid() and exists(select 1 from public.tenancies t where t.id=tenancy_id and t.tenant_id=auth.uid() and t.status='active' and t.property_id=maintenance_requests.property_id));
create policy "tenant attaches maintenance evidence" on public.maintenance_requests for update to authenticated using (requested_by=auth.uid()) with check (requested_by=auth.uid());
create policy "message participants read messages" on public.rental_messages for select to authenticated using (sender_id=auth.uid() or recipient_id=auth.uid());
create policy "tenancy participants send messages" on public.rental_messages for insert to authenticated with check (sender_id=auth.uid() and exists(select 1 from public.tenancies t where t.id=tenancy_id and t.status in ('pending_activation','active') and ((sender_id=t.tenant_id and recipient_id=t.landlord_id) or (sender_id=t.landlord_id and recipient_id=t.tenant_id))));
create policy "message recipients update read status" on public.rental_messages for update to authenticated using (recipient_id=auth.uid()) with check (recipient_id=auth.uid());
create policy "participants read audit events" on public.workflow_audit_events for select to authenticated using (public.has_role('admin') or public.has_role('super_admin'));

create or replace function public.notify_new_maintenance_request()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_owner uuid;
begin
 select owner_id into v_owner from public.properties where id=new.property_id;
 insert into public.notifications(recipient_id,title,body,action_path)
 values(v_owner,'New maintenance request',new.title || ' · ' || new.priority,'/manage-rentals');
 return new;
end;
$$;
create trigger maintenance_request_notification after insert on public.maintenance_requests
for each row execute procedure public.notify_new_maintenance_request();

create or replace function public.notify_new_rental_message()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_tenant uuid; v_action text;
begin
 select tenant_id into v_tenant from public.tenancies where id=new.tenancy_id;
 v_action := case when new.recipient_id=v_tenant then '/renter-dashboard?section=messages' else '/manage-rentals' end;
 insert into public.notifications(recipient_id,title,body,action_path)
 values(new.recipient_id,'New rental message',left(new.body,160),v_action);
 return new;
end;
$$;
create trigger rental_message_notification after insert on public.rental_messages
for each row execute procedure public.notify_new_rental_message();

create policy "participants read private agreement files" on storage.objects for select to authenticated
using (bucket_id='rental-documents' and split_part(name,'/',1)='agreements' and split_part(name,'/',2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and public.can_access_agreement(split_part(name,'/',2)::uuid));
create policy "participants read private handover files" on storage.objects for select to authenticated
using (bucket_id='rental-documents' and split_part(name,'/',1)='move-ins' and split_part(name,'/',2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and public.can_access_move_in(split_part(name,'/',2)::uuid));
create policy "participants upload handover photos" on storage.objects for insert to authenticated
with check (bucket_id='rental-documents' and split_part(name,'/',1)='move-ins' and split_part(name,'/',2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and public.can_access_move_in(split_part(name,'/',2)::uuid) and coalesce(metadata->>'mimetype','') like 'image/%');
create policy "tenant reads private maintenance evidence" on storage.objects for select to authenticated
using (bucket_id='rental-documents' and split_part(name,'/',1)='maintenance' and split_part(name,'/',2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and public.can_access_maintenance_request(split_part(name,'/',2)::uuid));
create policy "tenant uploads private maintenance evidence" on storage.objects for insert to authenticated
with check (bucket_id='rental-documents' and split_part(name,'/',1)='maintenance' and split_part(name,'/',2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and exists(select 1 from public.maintenance_requests m where m.id=split_part(name,'/',2)::uuid and m.requested_by=auth.uid()) and coalesce(metadata->>'mimetype','') in ('image/jpeg','image/png','image/webp','video/mp4'));
create policy "participants read external payment evidence" on storage.objects for select to authenticated
using (bucket_id='rental-documents' and split_part(name,'/',1)='external-payments' and split_part(name,'/',2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and public.can_access_obligation(split_part(name,'/',2)::uuid));
create policy "landlords upload external payment evidence" on storage.objects for insert to authenticated
with check (bucket_id='rental-documents' and split_part(name,'/',1)='external-payments' and split_part(name,'/',2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and public.can_access_obligation(split_part(name,'/',2)::uuid) and coalesce(metadata->>'mimetype','') in ('application/pdf','image/jpeg','image/png','image/webp'));

-- Never allow client-side role/status/financial mutation. Workflow mutations
-- go through server-owned functions and signed provider webhooks.
revoke all on public.profiles, public.profile_roles, public.properties, public.property_units, public.rental_listings,
 public.rental_applications, public.rental_agreements, public.agreement_signatures, public.payment_obligations,
 public.payments, public.move_ins, public.handover_items, public.tenancies, public.notifications,
 public.workflow_audit_events, public.integration_webhook_events, public.saved_rentals, public.tenant_preferences,
 public.maintenance_requests, public.rental_messages from anon, authenticated;
revoke insert, update, delete on public.profile_roles, public.properties, public.property_units, public.rental_listings,
 public.rental_agreements, public.agreement_signatures, public.payment_obligations, public.payments,
 public.move_ins, public.handover_items, public.tenancies, public.workflow_audit_events from anon, authenticated;
revoke update, delete on public.rental_applications from anon, authenticated;
grant select on public.profiles, public.profile_roles, public.properties, public.property_units, public.rental_listings,
 public.rental_applications, public.rental_agreements, public.agreement_signatures, public.payment_obligations,
 public.payments, public.move_ins, public.handover_items, public.tenancies, public.notifications,
 public.saved_rentals, public.tenant_preferences, public.maintenance_requests, public.rental_messages to authenticated;
grant update (full_name,phone,residential_address) on public.profiles to authenticated;
grant select on public.rental_listings, public.properties to anon;
grant insert on public.rental_applications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant insert, delete on public.saved_rentals to authenticated;
grant insert, update on public.tenant_preferences to authenticated;
grant insert on public.maintenance_requests to authenticated;
grant update (attachment_path) on public.maintenance_requests to authenticated;
grant insert on public.rental_messages to authenticated;
grant update (read_at) on public.rental_messages to authenticated;

-- Approval only starts onboarding. It creates an agreement draft and an
-- in-app notification; it does not create or activate a tenancy.
create or replace function public.approve_rental_application(p_application_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_app public.rental_applications; v_listing public.rental_listings; v_property public.properties; v_agreement_id uuid;
begin
 select * into v_app from public.rental_applications where id = p_application_id for update;
 if not found then raise exception 'Application not found'; end if;
 select * into v_listing from public.rental_listings where id = v_app.listing_id;
 select * into v_property from public.properties where id = v_listing.property_id;
 if v_property.owner_id <> auth.uid() and not public.has_role('admin') and not public.has_role('super_admin') then raise exception 'Not authorized'; end if;
 if v_app.status not in ('submitted','under_review','additional_information_required') then raise exception 'Application cannot be approved from its current status'; end if;
 update public.rental_applications set status = 'approved', updated_at = now() where id = v_app.id;
 insert into public.rental_agreements(application_id, status, lease_start, lease_end, rent_amount_minor, deposit_amount_minor, terms)
 values(v_app.id,'landlord_review',v_app.desired_move_in,(v_app.desired_move_in + interval '1 year')::date,v_listing.rent_amount_minor,v_listing.deposit_amount_minor,
 jsonb_build_object('property_address',v_property.address,'currency',v_listing.currency,'rent_frequency',v_listing.rent_frequency))
 on conflict(application_id) do update set status = 'landlord_review'
 returning id into v_agreement_id;
 insert into public.notifications(recipient_id,title,body,action_path)
 values(v_app.applicant_id,'Rental application approved','Your application was approved. The landlord is preparing your rental agreement. Approval does not activate a tenancy.','/renter-dashboard');
 insert into public.workflow_audit_events(actor_id,entity_type,entity_id,action) values(auth.uid(),'rental_application',v_app.id,'approved');
 return v_agreement_id;
end;
$$;

create or replace function public.update_rental_application_status(p_application_id uuid, p_status public.application_status)
returns void language plpgsql security definer set search_path = public
as $$
declare v_app public.rental_applications; v_owner uuid;
begin
 select a.* into v_app from public.rental_applications a where a.id=p_application_id for update;
 if not found then raise exception 'Application not found'; end if;
 select p.owner_id into v_owner from public.rental_listings l join public.properties p on p.id=l.property_id where l.id=v_app.listing_id;
 if p_status='withdrawn' then
  if auth.uid() <> v_app.applicant_id then raise exception 'Only the applicant can withdraw this application'; end if;
 elsif auth.uid() <> v_owner and not public.has_role('admin') and not public.has_role('super_admin') then
  raise exception 'Not authorized';
 end if;
 if p_status not in ('under_review','additional_information_required','rejected','withdrawn','cancelled') then raise exception 'Use the dedicated approval action for this status'; end if;
 if v_app.status in ('approved','rejected','withdrawn','cancelled') then raise exception 'Application is already closed'; end if;
 update public.rental_applications set status=p_status, updated_at=now() where id=p_application_id;
 insert into public.notifications(recipient_id,title,body,action_path)
 values(case when p_status='withdrawn' then v_owner else v_app.applicant_id end,'Rental application updated',
  'Your rental application status changed to ' || p_status::text || '.','/renter-dashboard');
 insert into public.workflow_audit_events(actor_id,entity_type,entity_id,action) values(auth.uid(),'rental_application',p_application_id,p_status::text);
end;
$$;

create or replace function public.record_external_payment(p_obligation_id uuid,p_amount_minor bigint,p_evidence_path text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_app public.rental_applications; v_listing public.rental_listings; v_property public.properties; v_agreement public.rental_agreements; v_id uuid; v_remaining bigint;
begin
 select g.* into v_agreement from public.payment_obligations o join public.rental_agreements g on g.id=o.agreement_id where o.id=p_obligation_id;
 if not found then raise exception 'Payment obligation not found'; end if;
 select a.* into v_app from public.rental_applications a where a.id=v_agreement.application_id;
 select l.* into v_listing from public.rental_listings l where l.id=v_app.listing_id;
 select p.* into v_property from public.properties p where p.id=v_listing.property_id;
 if v_property.owner_id <> auth.uid() then raise exception 'Only the landlord can record an external payment'; end if;
 if v_agreement.status <> 'signed' or v_agreement.signed_document_ready_at is null then raise exception 'Agreement must be signed first'; end if;
 if p_amount_minor <= 0 or p_evidence_path not like 'external-payments/' || p_obligation_id::text || '/%' then raise exception 'Valid amount and private evidence path are required'; end if;
 select o.amount_minor - coalesce(sum(p.amount_minor) filter(where p.status not in ('failed','reversed')),0) into v_remaining from public.payment_obligations o left join public.payments p on p.obligation_id=o.id where o.id=p_obligation_id group by o.amount_minor;
 if p_amount_minor > v_remaining then raise exception 'Amount exceeds the unpaid obligation'; end if;
 insert into public.payments(obligation_id,payer_id,amount_minor,currency,status,provider,external_evidence_path)
 values(p_obligation_id,v_app.applicant_id,p_amount_minor,v_listing.currency,'external_review','external',p_evidence_path) returning id into v_id;
 insert into public.workflow_audit_events(actor_id,entity_type,entity_id,action) values(auth.uid(),'payment',v_id,'external_payment_submitted_for_verification');
 insert into public.notifications(recipient_id,title,body,action_path)
 select r.profile_id,'External payment needs review','A landlord recorded an external payment. Verify the evidence before treating it as paid.','/dashboard'
 from public.profile_roles r where r.role in ('admin','super_admin');
 return v_id;
end;
$$;

create or replace function public.landlord_onboarding_dashboard()
returns table(
 application_id uuid, application_status text, applicant_id uuid, applicant_name text, applicant_email text,
 applicant_phone text, occupation text, desired_move_in date, property_id uuid, property_address text,
 unit_id uuid, unit_label text, rent_amount_minor bigint, deposit_amount_minor bigint, currency char(3),
 agreement_id uuid, agreement_status text, landlord_signature_status text, renter_signature_status text,
 payment_status text, payment_total_minor bigint, payment_paid_minor bigint, payment_breakdown jsonb, move_in_id uuid, move_in_status text,
 move_in_date date, tenancy_status text
)
language sql stable security definer set search_path = public
as $$
 select a.id, a.status::text, a.applicant_id, renter.full_name, renter.email, renter.phone, a.occupation, a.desired_move_in,
  p.id, p.address, u.id, u.unit_label, l.rent_amount_minor, l.deposit_amount_minor, l.currency,
  g.id, g.status::text,
  coalesce((select s.status from public.agreement_signatures s where s.agreement_id=g.id and s.signer_role='landlord'),'pending'),
  coalesce((select s.status from public.agreement_signatures s where s.agreement_id=g.id and s.signer_role='renter'),'pending'),
  case when g.id is null then 'not_started'
       when coalesce((select sum(o.amount_minor) from public.payment_obligations o where o.agreement_id=g.id and o.required),0)=0 then 'pending'
       when coalesce((select sum(pmt.amount_minor) from public.payment_obligations o join public.payments pmt on pmt.obligation_id=o.id where o.agreement_id=g.id and o.required and pmt.status in ('success','verified_external') and pmt.verified_at is not null),0) >= (select sum(o.amount_minor) from public.payment_obligations o where o.agreement_id=g.id and o.required) then 'paid'
       when coalesce((select sum(pmt.amount_minor) from public.payment_obligations o join public.payments pmt on pmt.obligation_id=o.id where o.agreement_id=g.id and o.required and pmt.status in ('success','verified_external') and pmt.verified_at is not null),0)>0 then 'partially_paid'
       when exists(select 1 from public.payment_obligations o join public.payments pmt on pmt.obligation_id=o.id where o.agreement_id=g.id and pmt.status='failed') then 'failed' else 'pending' end,
  coalesce((select sum(o.amount_minor) from public.payment_obligations o where o.agreement_id=g.id and o.required),0)::bigint,
  coalesce((select sum(pmt.amount_minor) from public.payment_obligations o join public.payments pmt on pmt.obligation_id=o.id where o.agreement_id=g.id and o.required and pmt.status in ('success','verified_external') and pmt.verified_at is not null),0)::bigint,
  coalesce((select jsonb_agg(jsonb_build_object('obligation_id',o.id,'description',o.description,'amount_minor',o.amount_minor,'paid_minor',coalesce((select sum(pay.amount_minor) from public.payments pay where pay.obligation_id=o.id and pay.status in ('success','verified_external') and pay.verified_at is not null),0),'outstanding_minor',greatest(o.amount_minor-coalesce((select sum(pay.amount_minor) from public.payments pay where pay.obligation_id=o.id and pay.status in ('success','verified_external') and pay.verified_at is not null),0),0),'due_date',o.due_date,'payment_status',coalesce(latest.status,'pending'),'receipt_number',latest.receipt_number) order by o.due_date)
   from public.payment_obligations o left join lateral (select p.status,p.receipt_number from public.payments p where p.obligation_id=o.id order by p.created_at desc limit 1) latest on true where o.agreement_id=g.id),'[]'::jsonb),
  m.id, m.status::text, m.move_in_date, t.status::text
 from public.rental_applications a
 join public.rental_listings l on l.id=a.listing_id
 join public.properties p on p.id=l.property_id
 join public.profiles renter on renter.id=a.applicant_id
 left join public.property_units u on u.id=l.unit_id
 left join public.rental_agreements g on g.application_id=a.id
 left join public.move_ins m on m.agreement_id=g.id
 left join public.tenancies t on t.agreement_id=g.id
 where (p.owner_id=auth.uid() and public.has_role('landlord')) or public.has_role('admin') or public.has_role('super_admin')
 order by a.created_at desc;
$$;

create or replace function public.renter_onboarding_dashboard()
returns table(
 application_id uuid, application_status text, desired_move_in date, occupation text, message text,
 application_created_at timestamptz, application_updated_at timestamptz,
 property_id uuid, property_address text, unit_label text, currency char(3), rent_amount_minor bigint,
 deposit_amount_minor bigint, agreement_id uuid, agreement_status text, unsigned_document_path text,
 signed_document_path text, signed_document_ready_at timestamptz, lease_start date, lease_end date,
 landlord_signature_status text, renter_signature_status text,
 payment_obligation_id uuid, payment_description text, payment_amount_minor bigint, payment_due_date date,
 payment_status text, payment_receipt text, payment_history jsonb, move_in_id uuid, move_in_status text, move_in_date date,
 keys_handed_over boolean, meter_readings jsonb, outstanding_issues text, tenancy_id uuid, tenancy_status text,
 landlord_id uuid, landlord_name text, landlord_email text, landlord_phone text, property_title text,
 property_type text, bedrooms smallint, bathrooms smallint, image_urls text[]
)
language sql stable security definer set search_path = public
as $$
 select a.id,a.status::text,a.desired_move_in,a.occupation,a.message,a.created_at,a.updated_at,p.id,p.address,u.unit_label,l.currency,l.rent_amount_minor,l.deposit_amount_minor,
  g.id,g.status::text,g.unsigned_document_path,g.signed_document_path,g.signed_document_ready_at,g.lease_start,g.lease_end,
  coalesce((select s.status from public.agreement_signatures s where s.agreement_id=g.id and s.signer_role='landlord'),'pending'),
  coalesce((select s.status from public.agreement_signatures s where s.agreement_id=g.id and s.signer_role='renter'),'pending'),
  o.id,o.description,o.amount_minor,o.due_date,coalesce(pmt.status,'pending'),pmt.receipt_number,
  coalesce((select jsonb_agg(jsonb_build_object('status',q.status,'amount_minor',q.amount_minor,'receipt_number',q.receipt_number,'created_at',q.created_at) order by q.created_at desc) from public.payments q where q.obligation_id=o.id),'[]'::jsonb),
  m.id,m.status::text,m.move_in_date,m.keys_handed_over,m.meter_readings,m.outstanding_issues,t.id,t.status::text,
  landlord.id,landlord.full_name,landlord.email,landlord.phone,p.title,p.property_type,p.bedrooms,p.bathrooms,p.image_urls
 from public.rental_applications a
 join public.rental_listings l on l.id=a.listing_id join public.properties p on p.id=l.property_id
 join public.profiles landlord on landlord.id=p.owner_id
 left join public.property_units u on u.id=l.unit_id left join public.rental_agreements g on g.application_id=a.id
 left join public.move_ins m on m.agreement_id=g.id left join public.tenancies t on t.agreement_id=g.id
 left join public.payment_obligations o on o.agreement_id=g.id left join lateral (
   select q.status,q.receipt_number from public.payments q where q.obligation_id=o.id order by q.created_at desc limit 1
 ) pmt on true
 where a.applicant_id=auth.uid() order by a.created_at desc, o.due_date;
$$;

create or replace function public.landlord_property_occupancy()
returns table(property_id uuid, property_address text, total_units bigint, occupied_units bigint)
language sql stable security definer set search_path = public
as $$
 select p.id, p.address,
  case when count(distinct u.id)=0 then count(distinct l.id) else count(distinct u.id) end::bigint,
  case when count(distinct u.id)=0 then count(distinct l.id) filter (where l.status='rented') else count(distinct u.id) filter (where u.availability='rented') end::bigint
 from public.properties p
 join public.rental_listings l on l.property_id=p.id and l.status in ('published','rented')
 left join public.property_units u on u.property_id=p.id
 where p.owner_id=auth.uid() or public.has_role('admin') or public.has_role('super_admin')
 group by p.id,p.address order by p.address;
$$;

create or replace function public.admin_external_payment_queue()
returns table(payment_id uuid, agreement_id uuid, property_address text, payer_name text, amount_minor bigint, currency char(3), external_evidence_path text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
 select pay.id,g.id,p.address,renter.full_name,pay.amount_minor,pay.currency,pay.external_evidence_path,pay.created_at
 from public.payments pay
 join public.payment_obligations o on o.id=pay.obligation_id
 join public.rental_agreements g on g.id=o.agreement_id
 join public.rental_applications a on a.id=g.application_id
 join public.rental_listings l on l.id=a.listing_id
 join public.properties p on p.id=l.property_id
 join public.profiles renter on renter.id=pay.payer_id
 where pay.status='external_review' and (public.has_role('admin') or public.has_role('super_admin'))
 order by pay.created_at;
$$;

create or replace function public.finalize_rental_agreement(
 p_agreement_id uuid,
 p_lease_start date,
 p_lease_end date,
 p_payment_due_day smallint,
 p_fees jsonb,
 p_additional_terms jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_agreement public.rental_agreements; v_app public.rental_applications; v_listing public.rental_listings; v_property public.properties;
begin
 select * into v_agreement from public.rental_agreements where id = p_agreement_id for update;
 if not found then raise exception 'Agreement not found'; end if;
 select * into v_app from public.rental_applications where id = v_agreement.application_id;
 select * into v_listing from public.rental_listings where id = v_app.listing_id;
 select * into v_property from public.properties where id = v_listing.property_id;
 if v_property.owner_id <> auth.uid() then raise exception 'Only the property owner can finalize this agreement'; end if;
 if v_app.status <> 'approved' or v_agreement.status <> 'landlord_review' then raise exception 'Application must be approved and agreement under landlord review'; end if;
 if p_lease_start < current_date or p_lease_end <= p_lease_start then raise exception 'Invalid lease dates'; end if;
 if jsonb_typeof(p_fees) <> 'array' then raise exception 'Fees must be an array'; end if;
 update public.rental_agreements set lease_start = p_lease_start, lease_end = p_lease_end,
  payment_due_day = p_payment_due_day, fees = p_fees,
  terms = terms || coalesce(p_additional_terms, '{}'::jsonb), status = 'pending_signature', landlord_finalized_at = now()
 where id = p_agreement_id;
 insert into public.agreement_signatures(agreement_id, signer_id, signer_role)
 values(p_agreement_id, v_property.owner_id, 'landlord'), (p_agreement_id, v_app.applicant_id, 'renter')
 on conflict(agreement_id, signer_id) do update set status = 'pending', signed_at = null;
 delete from public.payment_obligations where agreement_id = p_agreement_id;
 insert into public.payment_obligations(agreement_id, description, amount_minor, due_date)
 values(p_agreement_id, 'Initial rent', v_agreement.rent_amount_minor, p_lease_start);
 if v_agreement.deposit_amount_minor > 0 then
  insert into public.payment_obligations(agreement_id, description, amount_minor, due_date)
  values(p_agreement_id, 'Security deposit', v_agreement.deposit_amount_minor, p_lease_start);
 end if;
 insert into public.payment_obligations(agreement_id, description, amount_minor, due_date)
 select p_agreement_id, coalesce(f.description,'Agreed charge'), (f.amount_minor)::bigint, p_lease_start
 from jsonb_to_recordset(coalesce(p_fees,'[]'::jsonb)) as f(description text, amount_minor numeric)
 where f.amount_minor > 0;
 insert into public.notifications(recipient_id,title,body,action_path)
 values(v_app.applicant_id,'Rental agreement ready','The landlord finalized your agreement. Review and sign it to continue onboarding.','/renter-dashboard');
 insert into public.workflow_audit_events(actor_id,entity_type,entity_id,action)
 values(auth.uid(),'rental_agreement',p_agreement_id,'finalized');
 return p_agreement_id;
end;
$$;

create or replace function public.create_pending_tenancy(p_agreement_id uuid)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_agreement public.rental_agreements; v_app public.rental_applications; v_listing public.rental_listings; v_property public.properties; v_tenancy_id uuid;
begin
 select * into v_agreement from public.rental_agreements where id = p_agreement_id;
 if not found or v_agreement.status <> 'signed' or v_agreement.signed_document_ready_at is null then raise exception 'Signed agreement document is not ready'; end if;
 if not exists(select 1 from public.agreement_signatures where agreement_id = p_agreement_id and signer_role='landlord' and status='signed') or
    not exists(select 1 from public.agreement_signatures where agreement_id = p_agreement_id and signer_role='renter' and status='signed') then
   raise exception 'Both parties must sign';
 end if;
 select * into v_app from public.rental_applications where id = v_agreement.application_id;
 if v_app.status <> 'approved' then raise exception 'Application is not approved'; end if;
 select * into v_listing from public.rental_listings where id = v_app.listing_id;
 select * into v_property from public.properties where id = v_listing.property_id;
 insert into public.tenancies(agreement_id, application_id, property_id, unit_id, landlord_id, tenant_id, status, start_date, end_date)
 values(p_agreement_id, v_app.id, v_property.id, v_listing.unit_id, v_property.owner_id, v_app.applicant_id, 'pending_activation', v_agreement.lease_start, v_agreement.lease_end)
 on conflict(agreement_id) do update set status='pending_activation'
 returning id into v_tenancy_id;
 insert into public.move_ins(agreement_id,status,move_in_date)
 values(p_agreement_id,'pending',v_agreement.lease_start) on conflict(agreement_id) do nothing;
 insert into public.notifications(recipient_id,title,body,action_path)
 values(v_app.applicant_id,'Agreement signed','The signed agreement is ready. Complete the required payments and move-in handover to activate your tenancy.','/renter-dashboard'),
       (v_property.owner_id,'Agreement signed','Both parties signed the rental agreement. Complete payment and move-in steps before tenancy activation.','/manage-rentals');
 return v_tenancy_id;
end;
$$;

create or replace function public.record_move_in_confirmation(
 p_agreement_id uuid,
 p_move_in_date date,
 p_keys_handed_over boolean,
 p_meter_readings jsonb,
 p_outstanding_issues text,
 p_handover_items jsonb
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_app public.rental_applications; v_property public.properties; v_move_in_id uuid; v_is_landlord boolean;
begin
 select a.* into v_app from public.rental_agreements g
 join public.rental_applications a on a.id = g.application_id where g.id = p_agreement_id;
 if not found then raise exception 'Agreement not found'; end if;
 select p.* into v_property from public.rental_agreements g join public.rental_applications a on a.id = g.application_id
 join public.rental_listings l on l.id = a.listing_id join public.properties p on p.id = l.property_id where g.id = p_agreement_id;
 v_is_landlord := v_property.owner_id = auth.uid();
 if not v_is_landlord and v_app.applicant_id <> auth.uid() then raise exception 'Not authorized'; end if;
 if p_move_in_date is null or p_move_in_date < current_date then raise exception 'Move-in date must be today or later'; end if;
 if not exists(select 1 from public.rental_agreements g where g.id=p_agreement_id and g.status='signed' and g.signed_document_ready_at is not null) then raise exception 'Signed agreement is required before move-in'; end if;
 if exists(select 1 from public.payment_obligations o where o.agreement_id=p_agreement_id and o.required and not exists(select 1 from public.payments p where p.obligation_id=o.id and p.status in ('success','verified_external') and p.verified_at is not null)) then raise exception 'All required payments must be verified before handover'; end if;
 insert into public.move_ins(agreement_id, status, move_in_date, keys_handed_over, meter_readings, outstanding_issues,
  landlord_confirmed_at, renter_confirmed_at)
 values(p_agreement_id,'handover_pending',p_move_in_date,p_keys_handed_over,coalesce(p_meter_readings,'{}'::jsonb),coalesce(p_outstanding_issues,''),
  case when v_is_landlord then now() end, case when not v_is_landlord then now() end)
 on conflict(agreement_id) do update set status = 'handover_pending', move_in_date = excluded.move_in_date,
  keys_handed_over = excluded.keys_handed_over, meter_readings = coalesce(public.move_ins.meter_readings,'{}'::jsonb) || coalesce(excluded.meter_readings,'{}'::jsonb), outstanding_issues = excluded.outstanding_issues,
  landlord_confirmed_at = case when v_is_landlord then now() else public.move_ins.landlord_confirmed_at end,
  renter_confirmed_at = case when not v_is_landlord then now() else public.move_ins.renter_confirmed_at end
 returning id into v_move_in_id;
 delete from public.handover_items where move_in_id = v_move_in_id;
 insert into public.handover_items(move_in_id,item_key,completed,notes,photo_path)
 select v_move_in_id, x.item_key, x.completed, coalesce(x.notes,''), x.photo_path
 from jsonb_to_recordset(coalesce(p_handover_items,'[]'::jsonb)) as x(item_key text, completed boolean, notes text, photo_path text);
 update public.move_ins m set status = case when m.landlord_confirmed_at is not null and m.renter_confirmed_at is not null and m.keys_handed_over
   and exists(select 1 from public.handover_items h where h.move_in_id=m.id and h.item_key='condition_photos' and h.completed and h.photo_path is not null)
   and exists(select 1 from public.handover_items h where h.move_in_id=m.id and h.item_key='property_condition' and h.completed)
   then 'confirmed'::public.move_in_status else 'handover_pending'::public.move_in_status end
 where m.id = v_move_in_id;
 insert into public.workflow_audit_events(actor_id,entity_type,entity_id,action)
 values(auth.uid(),'move_in',v_move_in_id,case when v_is_landlord then 'landlord_handover_confirmed' else 'renter_handover_confirmed' end);
 if exists(select 1 from public.move_ins where id=v_move_in_id and status='confirmed') then
  insert into public.notifications(recipient_id,title,body,action_path)
  values(v_property.owner_id,'Handover confirmed','Both parties confirmed the property handover. Tenancy activation will run when the lease start date is reached and all payments are verified.','/manage-rentals'),
        (v_app.applicant_id,'Handover confirmed','Both parties confirmed the property handover. Tenancy activation will run when the lease start date is reached and all payments are verified.','/renter-dashboard');
 end if;
 perform public.activate_eligible_tenancies();
 return v_move_in_id;
end;
$$;

-- A tenancy can only be activated after signed-file webhook confirmation,
-- verified required obligations, both handover confirmations, and start date.
create or replace function public.activate_eligible_tenancies()
returns integer language plpgsql security definer set search_path = public
as $$
declare v_count integer;
begin
 with eligible as (
  select t.id, t.application_id, t.property_id, t.unit_id, t.landlord_id, t.tenant_id, t.start_date
  from public.tenancies t
  join public.rental_agreements g on g.id = t.agreement_id
  join public.move_ins m on m.agreement_id = g.id
  where t.status = 'pending_activation'
   and t.start_date <= current_date
   and g.status = 'signed' and g.signed_document_ready_at is not null
   and exists(select 1 from public.agreement_signatures s where s.agreement_id = g.id and s.signer_role = 'landlord' and s.status = 'signed')
   and exists(select 1 from public.agreement_signatures s where s.agreement_id = g.id and s.signer_role = 'renter' and s.status = 'signed')
   and not exists(select 1 from public.payment_obligations o where o.agreement_id = g.id and o.required and not exists(select 1 from public.payments p where p.obligation_id = o.id and p.status in ('success','verified_external') and p.verified_at is not null))
   and m.status = 'confirmed' and m.landlord_confirmed_at is not null and m.renter_confirmed_at is not null and m.keys_handed_over
 ), activated as (
  update public.tenancies t set status = 'active', activated_at = now() from eligible e where t.id = e.id returning t.*
 )
 select count(*) into v_count from activated;
 update public.rental_listings l set status = 'rented'
 where exists(select 1 from public.tenancies t where t.status = 'active' and t.property_id = l.property_id and
   ((l.unit_id is not null and t.unit_id = l.unit_id) or (l.unit_id is null and t.unit_id is null)));
 update public.property_units u set availability = 'rented'
 where exists(select 1 from public.tenancies t where t.status = 'active' and t.unit_id = u.id);
 with overdue as (
  update public.move_ins set status='overdue', overdue_notified_at=now()
  where status in ('pending','scheduled','handover_pending') and move_in_date < current_date
  returning agreement_id
 )
 insert into public.notifications(recipient_id,title,body,action_path)
 select distinct t.tenant_id,'Move-in date overdue','The agreed move-in date passed before handover was confirmed. Contact the landlord to reschedule.','/renter-dashboard'
 from overdue m join public.tenancies t on t.agreement_id=m.agreement_id;
 insert into public.notifications(recipient_id,title,body,action_path)
 select x.tenant_id,'Tenancy active','Your tenancy is active. Your Tenant Dashboard is ready.','/renter-dashboard' from public.tenancies x where x.status = 'active' and x.activated_at >= now() - interval '1 minute';
 insert into public.profile_roles(profile_id,role) select tenant_id,'renter'::public.account_role from public.tenancies where status='active' and activated_at >= now() - interval '1 minute' on conflict do nothing;
 insert into public.profile_roles(profile_id,role) select tenant_id,'tenant'::public.account_role from public.tenancies where status='active' and activated_at >= now() - interval '1 minute' on conflict do nothing;
 return v_count;
end;
$$;

revoke all on function public.approve_rental_application(uuid) from public;
grant execute on function public.approve_rental_application(uuid) to authenticated;
revoke all on function public.update_rental_application_status(uuid,public.application_status) from public;
grant execute on function public.update_rental_application_status(uuid,public.application_status) to authenticated;
revoke all on function public.finalize_rental_agreement(uuid,date,date,smallint,jsonb,jsonb) from public;
grant execute on function public.finalize_rental_agreement(uuid,date,date,smallint,jsonb,jsonb) to authenticated;
revoke all on function public.record_move_in_confirmation(uuid,date,boolean,jsonb,text,jsonb) from public;
grant execute on function public.record_move_in_confirmation(uuid,date,boolean,jsonb,text,jsonb) to authenticated;
revoke all on function public.record_external_payment(uuid,bigint,text) from public;
grant execute on function public.record_external_payment(uuid,bigint,text) to authenticated;
revoke all on function public.landlord_onboarding_dashboard() from public;
grant execute on function public.landlord_onboarding_dashboard() to authenticated;
revoke all on function public.renter_onboarding_dashboard() from public;
grant execute on function public.renter_onboarding_dashboard() to authenticated;
revoke all on function public.landlord_property_occupancy() from public;
grant execute on function public.landlord_property_occupancy() to authenticated;
revoke all on function public.admin_external_payment_queue() from public;
grant execute on function public.admin_external_payment_queue() to authenticated;
revoke all on function public.can_read_property(uuid) from public;
grant execute on function public.can_read_property(uuid) to anon, authenticated;
revoke all on function public.can_access_tenancy(uuid) from public;
grant execute on function public.can_access_tenancy(uuid) to authenticated;
revoke all on function public.can_access_maintenance_request(uuid) from public;
grant execute on function public.can_access_maintenance_request(uuid) to authenticated;
revoke all on function public.create_pending_tenancy(uuid) from public, anon, authenticated;
grant execute on function public.create_pending_tenancy(uuid) to service_role;
revoke all on function public.activate_eligible_tenancies() from public, anon, authenticated;
grant execute on function public.activate_eligible_tenancies() to service_role;

-- Set up a private bucket in Dashboard/Storage named `rental-documents` with
-- authenticated access granted only by participant-aware policies after review.
