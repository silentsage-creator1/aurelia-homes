# Property manager data gap and minimum schema proposal

Inspected the current schema before implementation. Existing shared sources are `profiles`, `profile_roles`, `properties`, `property_units`, `rental_listings`, `rental_applications`, `rental_agreements`, `payment_obligations`, `payments`, `tenancies`, `maintenance_requests`, `rental_messages`, and `notifications`.

The current schema has no property-to-manager assignment relation or manager-specific RLS. Therefore a manager cannot safely query the existing property, tenant, payment, or maintenance records today. It also has no inspections, tenant complaints, or property expense records.

The smallest useful backend addition is an assignment table plus a `can_manage_property` authorization helper and manager read policies for existing tenancy/payment/maintenance records; dedicated inspections, complaints, and expenses tables with tenant/manager/owner policies; and a manager dashboard RPC that aggregates only assigned property data. Payment verification and tenancy activation continue using the existing backend workflows. Agent assignment, commission, and manager approval limits are not inferred or added.

## Assignment and rollout

Apply migrations in timestamp order, including `202611020001_rental_onboarding.sql`, `202611030001_tenancy_requests.sql`, and `202611030002_property_manager_workspace.sql`. Then an authenticated property owner (or admin/super-admin) can call `assign_property_manager(property_id, manager_profile_id)` to assign an existing `property_manager` role account. `end_property_manager_assignment(assignment_id)` ends access. The management assignment is intentionally separate from property ownership.

The dashboard does not add controls to grant roles or approve external payments/expenses. Those decisions remain with the existing owner/admin approval permissions.
