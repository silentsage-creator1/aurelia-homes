import { clients, corsHeaders, json, requireUser } from '../_shared/clients.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, admin } = clients(request);
    const renter = await requireUser(user);
    const { obligationId } = await request.json();
    if (typeof obligationId !== 'string') return json({ error: 'obligationId is required' }, 400);
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!secret) return json({ error: 'Payment provider is not configured' }, 503);

    const { data: obligation, error } = await admin.from('payment_obligations').select('id,amount_minor,due_date,agreement_id,rental_agreements!inner(id,status,signed_document_ready_at,application_id,applications:rental_applications!inner(applicant_id,listing:rental_listings!inner(currency)))').eq('id', obligationId).single();
    if (error || !obligation) return json({ error: 'Payment obligation not found' }, 404);
    const agreement = obligation.rental_agreements as any;
    if (agreement.applications.applicant_id !== renter.id) return json({ error: 'Only the applicant can pay this obligation' }, 403);
    if (agreement.status !== 'signed' || !agreement.signed_document_ready_at) return json({ error: 'Both parties must sign before payment' }, 409);
    const currency = String(agreement.applications.listing.currency || 'NGN').trim().toUpperCase();

    const { data: profile } = await admin.from('profiles').select('email').eq('id', renter.id).single();
    if (!profile?.email) return json({ error: 'Renter email is missing' }, 400);
    const reference = `rent_${crypto.randomUUID().replaceAll('-', '')}`;
    const { data: payment, error: insertError } = await admin.from('payments').insert({ obligation_id: obligation.id, payer_id: renter.id, amount_minor: obligation.amount_minor, currency, status: 'pending', provider: 'paystack', provider_reference: reference }).select('id').single();
    if (insertError) return json({ error: 'Could not create payment attempt' }, 500);

    const callbackUrl = Deno.env.get('APP_URL');
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: profile.email, amount: obligation.amount_minor, currency, reference, callback_url: callbackUrl,
        metadata: { payment_id: payment.id, obligation_id: obligation.id } }),
    });
    const result = await response.json();
    if (!response.ok || !result.status || !result.data?.authorization_url) {
      await admin.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      return json({ error: 'Payment could not be initialized' }, 502);
    }
    return json({ paymentId: payment.id, reference, authorizationUrl: result.data.authorization_url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Payment initialization failed' }, 400);
  }
});
