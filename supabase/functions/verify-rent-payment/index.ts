import { clients, corsHeaders, json, requireUser } from '../_shared/clients.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, admin } = clients(request);
    const payer = await requireUser(user);
    const { reference } = await request.json();
    if (typeof reference !== 'string') return json({ error: 'Payment reference is required' }, 400);
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!secret) return json({ error: 'Payment provider is not configured' }, 503);
    const { data: payment } = await admin.from('payments').select('id,amount_minor,currency,payer_id,obligation_id,status,receipt_number').eq('provider_reference',reference).eq('provider','paystack').single();
    if (!payment || payment.payer_id !== payer.id) return json({ error: 'Payment attempt not found' }, 404);
    if (payment.status === 'success') return json({ status: 'success', receiptNumber: payment.receipt_number });

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` } });
    const result = await response.json();
    if (!response.ok || !result.status) return json({ error: 'Payment verification is temporarily unavailable' }, 502);
    const gatewayStatus = result.data?.status;
    if (gatewayStatus !== 'success') {
      const mappedStatus = gatewayStatus === 'reversed' ? 'reversed' : gatewayStatus === 'failed' || gatewayStatus === 'abandoned' ? 'failed' : 'pending';
      await admin.from('payments').update({ status: mappedStatus }).eq('id',payment.id).eq('status','pending');
      return json({ status: mappedStatus, retryAllowed: mappedStatus === 'failed' });
    }
    if (result.data.amount !== payment.amount_minor || result.data.currency !== payment.currency) return json({ error: 'Verified payment amount or currency does not match the agreement' }, 409);
    const receiptNumber = `RCP-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${payment.id.slice(0,8).toUpperCase()}`;
    const { error: updateError } = await admin.from('payments').update({ status:'success', verified_at:new Date().toISOString(), receipt_number:receiptNumber }).eq('id',payment.id).eq('status','pending');
    if (updateError) return json({ error: 'Could not record verified payment' }, 500);
    const { data: obligation } = await admin.from('payment_obligations').select('agreement_id').eq('id',payment.obligation_id).single();
    const { data: agreement } = await admin.from('rental_agreements').select('application_id').eq('id',obligation.agreement_id).single();
    const { data: app } = await admin.from('rental_applications').select('listing_id').eq('id',agreement.application_id).single();
    const { data: listing } = await admin.from('rental_listings').select('property_id').eq('id',app.listing_id).single();
    const { data: property } = await admin.from('properties').select('owner_id').eq('id',listing.property_id).single();
    await admin.from('notifications').insert([
      { recipient_id:payer.id,title:'Payment verified',body:`Your payment was verified. Receipt ${receiptNumber} is ready.`,action_path:'/renter-dashboard' },
      { recipient_id:property.owner_id,title:'Rent payment verified',body:`A required payment was verified. Receipt ${receiptNumber}.`,action_path:'/manage-rentals' },
    ]);
    return json({ status:'success', receiptNumber });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Payment verification failed' }, 400);
  }
});
