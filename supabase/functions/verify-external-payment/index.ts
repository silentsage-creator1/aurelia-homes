import { clients, corsHeaders, json, requireUser } from '../_shared/clients.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, admin } = clients(request);
    const reviewer = await requireUser(user);
    const { paymentId } = await request.json();
    const { data: roles } = await admin.from('profile_roles').select('role').eq('profile_id', reviewer.id).in('role', ['admin', 'super_admin']);
    if (!roles?.length) return json({ error: 'Only an administrator can verify external payment evidence' }, 403);
    const { data: payment } = await admin.from('payments').select('id,amount_minor,payer_id,obligation_id,external_evidence_path,status').eq('id', paymentId).single();
    if (!payment || payment.status !== 'external_review' || !payment.external_evidence_path) return json({ error: 'External payment is not awaiting verification' }, 409);
    const { data: proof, error: proofError } = await admin.storage.from('rental-documents').download(payment.external_evidence_path);
    if (proofError || !proof) return json({ error: 'Payment evidence could not be retrieved' }, 409);
    // An authorized human reviewer confirms the evidence before this endpoint is called.
    const receiptNumber = `RCP-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${payment.id.slice(0,8).toUpperCase()}`;
    const { error: updateError } = await admin.from('payments').update({ status: 'verified_external', verified_at: new Date().toISOString(), external_verified_by: reviewer.id, receipt_number: receiptNumber }).eq('id', payment.id).eq('status', 'external_review');
    if (updateError) return json({ error: 'Could not finalize payment verification' }, 500);
    await admin.from('workflow_audit_events').insert({ actor_id: reviewer.id, entity_type: 'payment', entity_id: payment.id, action: 'external_payment_verified', details: { receipt_number: receiptNumber, amount_minor: payment.amount_minor } });
    const { data: obligation } = await admin.from('payment_obligations').select('agreement_id').eq('id', payment.obligation_id).single();
    const { data: agreement } = await admin.from('rental_agreements').select('application_id').eq('id', obligation.agreement_id).single();
    const { data: app } = await admin.from('rental_applications').select('applicant_id,listing_id').eq('id', agreement.application_id).single();
    const { data: listing } = await admin.from('rental_listings').select('property_id').eq('id', app.listing_id).single();
    const { data: property } = await admin.from('properties').select('owner_id').eq('id', listing.property_id).single();
    await admin.from('notifications').insert([
      { recipient_id: payment.payer_id, title: 'External payment verified', body: `Your payment evidence was verified. Receipt ${receiptNumber}.`, action_path: '/renter-dashboard' },
      { recipient_id: property.owner_id, title: 'External payment verified', body: `The recorded payment was verified by an administrator. Receipt ${receiptNumber}.`, action_path: '/manage-rentals' },
    ]);
    return json({ paymentId: payment.id, status: 'verified_external', receiptNumber });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'External payment verification failed' }, 400);
  }
});
