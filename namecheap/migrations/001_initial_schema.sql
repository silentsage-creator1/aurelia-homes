-- Aurelia Homes schema for a standalone Namecheap PostgreSQL database.
-- Run this only against the NEW Namecheap database. It creates tables and indexes; it does not delete data.
-- Authentication, row-level authorization, API routes, payment/webhook logic, and private file storage must run in the Node API.
-- This schema intentionally avoids Supabase auth.uid(), auth.users, RLS policies, and Storage schemas.
begin;

create table public.accounts (
  id uuid primary key,
  email text not null unique,
  password_hash text,
  email_verified_at timestamptz,
  status text not null default 'active' check (status in ('active','disabled','pending_verification','password_reset_required')),
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'active' or password_hash is not null)
);

create type public.account_role as enum ('buyer', 'renter', 'tenant', 'landlord', 'agent', 'property_manager', 'contractor', 'admin', 'super_admin');
create type public.application_status as enum ('submitted', 'under_review', 'additional_information_required', 'approved', 'rejected', 'withdrawn', 'cancelled');
create type public.agreement_status as enum ('draft', 'landlord_review', 'pending_signature', 'partially_signed', 'signed', 'declined', 'cancelled');
create type public.payment_status as enum ('pending', 'partially_paid', 'paid', 'failed', 'refunded', 'external_review');
create type public.move_in_status as enum ('pending', 'scheduled', 'handover_pending', 'confirmed', 'cancelled', 'overdue');
create type public.tenancy_status as enum ('pending_activation', 'active', 'ended', 'cancelled');

create table public.profiles (
  id uuid primary key references public.accounts(id) on delete cascade,
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
  id uuid primary key,
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

create table public.viewing_requests (
  id uuid primary key,
  property_id uuid references public.properties(id) on delete set null,
  property_external_key text,
  property_title text not null,
  property_address text not null,
  property_price text not null default '',
  property_image text,
  viewing_type text not null check (viewing_type in ('in-person','virtual-360')),
  requested_date date not null,
  time_slot text not null,
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  notes text not null default '',
  agent_name text not null default 'Aurelia Senior Private Client Advisor',
  status text not null default 'pending' check (status in ('pending','confirmed','completed','rescheduled','cancelled')),
  created_at timestamptz not null default now()
);

create table public.property_units (
  id uuid primary key,
    property_id uuid not null references public.properties(id) on delete cascade,
    unit_label text not null,
    availability text not null default 'available' check (availability in ('available','reserved','rented','unavailable')),
    unique(property_id, unit_label)
);
create table public.rental_listings (
  id uuid primary key,
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
  id uuid primary key,
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
create table public.rental_agreements (
  id uuid primary key,
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
  id uuid primary key,
    agreement_id uuid not null references public.rental_agreements(id) on delete cascade,
    signer_id uuid not null references public.profiles(id),
    signer_role text not null check (signer_role in ('landlord','renter')),
    status text not null default 'pending' check (status in ('pending','signed','declined')),
    signed_at timestamptz,
    provider_signature_id text,
    unique(agreement_id, signer_id)
);
create table public.payment_obligations (
  id uuid primary key,
    agreement_id uuid not null references public.rental_agreements(id) on delete cascade,
    description text not null,
    amount_minor bigint not null check (amount_minor >= 0),
    due_date date not null,
    required boolean not null default true
);
create table public.payments (
  id uuid primary key,
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
  id uuid primary key,
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
  id uuid primary key,
    move_in_id uuid not null references public.move_ins(id) on delete cascade,
    item_key text not null,
    completed boolean not null default false,
    notes text not null default '',
    photo_path text,
    unique(move_in_id, item_key)
);
create table public.tenancies (
  id uuid primary key,
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
create table public.notifications (
  id uuid primary key,
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
  id uuid primary key,
    tenancy_id uuid not null references public.tenancies(id) on delete cascade,
    property_id uuid not null references public.properties(id) on delete restrict,
    requested_by uuid not null references public.profiles(id) on delete restrict,
    assigned_to uuid references public.profiles(id) on delete set null,
    title text not null,
    category text not null check (category in ('plumbing','electrical','structural','security','appliance','general','other')),
    description text not null,
    priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
    status text not null default 'submitted' check (status in ('submitted','under_review','assigned','accepted','scheduled','in_progress','awaiting_materials','pending_verification','resolved','rejected_for_rework','rejected','cancelled')),
    attachment_path text,
    resolution_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    scheduled_at timestamptz,
    completion_notes text,
    materials_used text,
    labour_hours numeric(7,2),
    after_attachment_path text,
    assignment_response text,
    assignment_responded_at timestamptz
);
create table public.rental_messages (
  id uuid primary key,
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
create table public.tenancy_requests (
  id uuid primary key,
    tenancy_id uuid not null references public.tenancies(id) on delete cascade,
    requested_by uuid not null references public.profiles(id) on delete restrict,
    request_type text not null check (request_type in ('renewal','termination')),
    reason text not null check (length(trim(reason)) between 10 and 2000),
    status text not null default 'pending' check (status in ('pending','reviewing','approved','declined','cancelled')),
    response text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create table public.property_manager_assignments (
  id uuid primary key,
    property_id uuid not null references public.properties(id) on delete cascade,
    manager_id uuid not null references public.profiles(id) on delete cascade,
    assigned_by uuid not null references public.profiles(id),
    status text not null default 'active' check (status in ('active','ended')),
    assigned_at timestamptz not null default now(),
    ended_at timestamptz
);
create table public.property_inspections (
  id uuid primary key,
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
  id uuid primary key,
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
  id uuid primary key,
    complaint_id uuid not null references public.tenant_complaints(id) on delete cascade,
    author_id uuid not null references public.profiles(id),
    note text not null check (length(trim(note)) between 1 and 3000),
    created_at timestamptz not null default now()
);
create table public.property_expenses (
  id uuid primary key,
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
create table public.maintenance_activity (
  id uuid primary key,
    request_id uuid not null references public.maintenance_requests(id) on delete cascade,
    actor_id uuid not null references public.profiles(id),
    activity_type text not null,
    note text not null default '',
    created_at timestamptz not null default now()
);

-- Core lookup indexes.
create index rental_applications_applicant_idx on public.rental_applications(applicant_id, created_at desc);
create index rental_applications_listing_idx on public.rental_applications(listing_id, status);
create index payments_obligation_status_idx on public.payments(obligation_id, status);
create index notifications_recipient_idx on public.notifications(recipient_id, created_at desc);
create unique index one_open_application_per_listing_and_applicant on public.rental_applications(listing_id, applicant_id) where status not in ('rejected','withdrawn','cancelled');
create unique index one_open_tenancy_per_unit on public.tenancies(unit_id) where unit_id is not null and status in ('pending_activation','active');
create unique index one_open_whole_property_tenancy on public.tenancies(property_id) where unit_id is null and status in ('pending_activation','active');
create unique index property_manager_one_active_assignment on public.property_manager_assignments(property_id,manager_id) where status='active';
create index property_manager_assignments_manager_idx on public.property_manager_assignments(manager_id,status);
create index maintenance_activity_request_idx on public.maintenance_activity(request_id,created_at desc);
create index workflow_audit_actor_idx on public.workflow_audit_events(actor_id, created_at desc);
create index properties_owner_idx on public.properties(owner_id);
create index viewing_requests_property_status_idx on public.viewing_requests(property_id, status, requested_date);
create index rental_listings_status_idx on public.rental_listings(status, created_at desc);
create index tenancies_tenant_status_idx on public.tenancies(tenant_id, status);

commit;

