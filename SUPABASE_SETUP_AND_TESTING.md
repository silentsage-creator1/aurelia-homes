# Rental approval workflow setup and test guide

## Current state

The repository contains the Supabase schema/RLS migration and Edge Functions for application submission, approval, agreement signing, Paystack payments, external payment review, move-in confirmation and tenancy activation. With Supabase configured, login, renter application submission and the landlord/renter onboarding dashboard now use the shared database. Provider callbacks, schema migration, provider accounts and secrets still need to be configured and validated in your own project before the end-to-end workflow can run.

## Services selected

- Supabase Auth, Postgres, RLS, private Storage and Edge Functions.
- Paystack for Nigerian checkout and server-side verification.
- Dropbox Sign (HelloSign API) for two-party agreement signatures.
- Resend for optional email notifications.

## Configure a development project

1. Create a Supabase project and save its project URL, publishable/anon key, and database password.
2. Install the Supabase CLI, authenticate, link the project, then apply the migration:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   Review `supabase/migrations/202611020001_rental_onboarding.sql` in the SQL editor first. This is a new schema migration and has not been executed against a hosted database in this workspace.

3. Create a private Storage bucket named `rental-documents` (no public access). The migration includes participant-aware object policies.
4. In Supabase Auth, set the local app URL and email confirmation settings. Copy `.env.example` to `.env.local`, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Project Settings → API. Never put a service-role key or provider secret in a `VITE_` variable.
5. Add Edge Function secrets in Supabase, not in the browser:

   ```powershell
   npx supabase secrets set PAYSTACK_SECRET_KEY=... DROPBOX_SIGN_API_KEY=... DROPBOX_SIGN_TEMPLATE_ID=... DROPBOX_SIGN_TEST_MODE=true RESEND_API_KEY=... RESEND_FROM_EMAIL=... APP_URL=http://localhost:3000 WORKFLOW_SCHEDULER_SECRET=...
   ```

   `RESEND_*` may be omitted to disable email. Create a Dropbox Sign template with the `Landlord` and `Renter` signer roles and fields matching the names in `finalize-agreement/index.ts`. Use test mode until signing behavior is verified.

6. Deploy the functions:

   ```powershell
   npx supabase functions deploy submit-rental-application
   npx supabase functions deploy approve-application
   npx supabase functions deploy update-application-status
   npx supabase functions deploy finalize-agreement
   npx supabase functions deploy signature-webhook
   npx supabase functions deploy initiate-rent-payment
   npx supabase functions deploy verify-rent-payment
   npx supabase functions deploy paystack-webhook
   npx supabase functions deploy record-external-payment
   npx supabase functions deploy verify-external-payment
   npx supabase functions deploy record-move-in
   npx supabase functions deploy activate-tenancies
   ```

7. Configure provider callbacks:
   - Paystack webhook: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook`
   - Dropbox Sign event callback: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/signature-webhook`
   - Configure Dropbox Sign event notifications and test the signature callback. Do not disable signature verification.
8. Schedule `activate-tenancies` to run every few minutes using a trusted scheduler. Send `x-workflow-scheduler-secret: <WORKFLOW_SCHEDULER_SECRET>` to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/activate-tenancies`. This is required to activate a tenancy whose move-in checklist is already complete but whose start date is in the future.
9. Run the local UI with `npm run dev`. `npm run lint` checks app TypeScript; `npm run build` creates the Vite production bundle. Edge Functions use Deno and should be checked/deployed with the Supabase CLI, not the app TypeScript command.

## Prepare test users and a listing

1. Register a renter through the app. New signups receive only the renter role.
2. Register a second account for the landlord, then grant the landlord role from a trusted SQL editor/admin process. Do not expose role assignment to normal client requests:

   ```sql
   insert into public.profile_roles(profile_id, role)
   select id, 'landlord'::public.account_role from public.profiles where email = 'landlord@example.test'
   on conflict do nothing;
   ```

   For payment evidence review, grant `admin` to a separate reviewer account in the same trusted way.

   To test the other role dashboards against real Supabase accounts, register one account per role and assign only the roles needed for your test. These grants are for development only and must be performed by a trusted database administrator:

   ```sql
   insert into public.profile_roles(profile_id, role)
   select p.id, r.role::public.account_role
   from (values
     ('tenant.preview@example.test', 'tenant'),
     ('agent.preview@example.test', 'agent'),
     ('manager.preview@example.test', 'property_manager'),
     ('contractor.preview@example.test', 'contractor'),
     ('admin.preview@example.test', 'admin'),
     ('superadmin.preview@example.test', 'super_admin')
   ) as r(email, role)
   join public.profiles p on p.email = r.email
   on conflict do nothing;
   ```

   Tenant access is normally granted by successful tenancy activation; assigning it manually is only for a dashboard preview.
3. Create a property and published listing for the landlord in the Supabase SQL editor. Replace the email/address/card key as needed. Set `external_key` to the property card ID the app submits (for example `prop-5`). Rent and deposit use minor units (kobo; ₦100,000 is `10000000`).

   ```sql
   with new_property as (
     insert into public.properties(owner_id, address, currency)
     select id, '12 Test Street, Lagos', 'NGN'
     from public.profiles where email = 'landlord@example.test'
     returning id
   )
   insert into public.rental_listings(external_key, property_id, status, rent_amount_minor, deposit_amount_minor, currency)
   select 'prop-5', id, 'published', 10000000, 10000000, 'NGN'
   from new_property;
   ```

   Use a different `external_key` if your intended property card has a different ID. The app's sample marketplace data is not automatically imported into Supabase.
4. Existing applications approved before Supabase was connected remain local to that browser and are not imported. After configuring Supabase, submit a fresh application for a card whose key has a matching published listing. If that old demo application was the one you approved, it will not appear in this connected dashboard.

## Workflow acceptance checklist

Use separate browser profiles for landlord and renter and check each item:

1. Renter submits for the published listing; application is `submitted` and landlord gets an in-app notification (and email if configured).
2. Landlord approves; application becomes `approved`, an agreement enters `landlord_review`, and the renter is **not** yet a tenant.
3. Landlord finalizes dates/fees; Dropbox Sign sends the agreement. Confirm landlord and renter signatures separately. The signed PDF should exist only in the private bucket.
4. Verify the generated deposit/initial-rent obligations and attempt Paystack test checkout. Confirm a successful callback is verified server-side, duplicate webhook delivery is idempotent, a failed transaction remains unpaid, and a receipt is issued only after verification.
5. Record any external payment with evidence from the landlord dashboard; confirm it remains `external_review` until an admin reviews the evidence from `/dashboard` and verifies it.
6. Arrange move-in. Upload condition photos, record meter readings and keys, then have both users confirm. Before the agreed start date the tenancy remains pending; after the date and all prerequisites it becomes active.
7. Confirm the existing applicant account gains tenant access, no duplicate auth user exists, the applicable unit/listing becomes rented, and unrelated units/listings remain available.
8. Test declined/expired signing, withdrawn/cancelled applications, abandoned/failed payment, incomplete checklist and overdue move-in. None should activate a tenancy.

The connected dashboards expose application review, agreement finalization, notifications, payment breakdowns/receipts, Paystack checkout, external payment evidence and review, property occupancy, and two-party move-in confirmations. The database migration and provider webhooks must still be validated in your project before relying on these results.

In local demo mode, the login page also offers preview accounts for Tenant, Agent, Property Manager, Technician/Contractor, Admin, and Super Admin dashboards. Those role dashboards are UI previews with no real records or privileged backend access. Use separately role-assigned Supabase accounts to test authenticated access.

Do not test with live payments, real identity documents, or an unverified signature template. Use provider sandbox/test settings and synthetic accounts.
