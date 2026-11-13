-- Clear test/sample property and workflow records while preserving user accounts,
-- profile records, role assignments, tenant preferences, and schema.
-- Run this once in the Supabase SQL Editor for the linked production project.
-- The statements are idempotent and skip tables absent from a partially applied schema.
-- This clears database rows only; it intentionally leaves Storage files and profile photos intact.
begin;
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'complaint_internal_notes',
    'maintenance_activity',
    'handover_items',
    'tenancy_requests',
    'payments',
    'rental_messages',
    'maintenance_requests',
    'tenant_complaints',
    'property_inspections',
    'property_expenses',
    'agreement_signatures',
    'move_ins',
    'tenancies',
    'payment_obligations',
    'rental_agreements',
    'rental_applications',
    'saved_rentals',
    'notifications',
    'workflow_audit_events',
    'integration_webhook_events',
    'viewing_requests',
    'viewings',
    'viewing_bookings',
    'property_manager_assignments',
    'rental_listings',
    'property_units',
    'properties'
  ] loop
    if to_regclass('public.' || quote_ident(v_table)) is not null then
      execute format('delete from public.%I', v_table);
    end if;
  end loop;
end
$$;
commit;
