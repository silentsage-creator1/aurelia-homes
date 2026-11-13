import { clients, corsHeaders, json, requireUser } from '../_shared/clients.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const { user, admin } = clients(request);
    const actor = await requireUser(user);
    const { applicationId } = await request.json();
    if (typeof applicationId !== 'string') return json({ error: 'applicationId is required' }, 400);
    const { data: agreementId, error } = await user.rpc('approve_rental_application', { p_application_id: applicationId });
    if (error) return json({ error: error.message }, 403);

    const { data: application } = await admin.from('rental_applications').select('id, applicant_id, rental_listings(properties(address))').eq('id', applicationId).single();
    if (application?.applicant_id) {
      const { data: recipient } = await admin.auth.admin.getUserById(application.applicant_id);
      const apiKey = Deno.env.get('RESEND_API_KEY');
      const from = Deno.env.get('RESEND_FROM_EMAIL');
      if (apiKey && from && recipient.user?.email) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: recipient.user.email, subject: 'Rental application approved',
            text: 'Your rental application was approved. The landlord is preparing your agreement. Approval does not activate a tenancy.' }),
        });
      }
    }
    return json({ agreementId, applicationStatus: 'approved', tenancyStatus: 'pending_activation' });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Approval failed' }, 400);
  }
});
