import { clients } from '../_shared/clients.ts';

async function hmacSha512(secret: string, body: ArrayBuffer) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, body));
  return [...signature].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) return new Response('Payment provider not configured', { status: 503 });
  const raw = await request.arrayBuffer();
  const expected = await hmacSha512(secret, raw);
  const supplied = request.headers.get('x-paystack-signature') ?? '';
  let mismatch = expected.length ^ supplied.length;
  for (let i = 0; i < Math.max(expected.length, supplied.length); i++) mismatch |= (expected.charCodeAt(i) || 0) ^ (supplied.charCodeAt(i) || 0);
  if (mismatch !== 0) return new Response('Invalid signature', { status: 401 });

  try {
    const event = JSON.parse(new TextDecoder().decode(raw));
    if (event.event !== 'charge.success') return new Response('ok', { status: 200 });
    const reference = event.data?.reference;
    if (typeof reference !== 'string') return new Response('Missing reference', { status: 400 });
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` } });
    const verified = await verifyResponse.json();
    if (!verifyResponse.ok || !verified.status || verified.data?.status !== 'success') return new Response('Payment not verified', { status: 409 });

    const { admin } = clients(request);
    const eventKey = `charge.success:${reference}`;
    const { data: priorEvent } = await admin.from('integration_webhook_events').select('processed_at').eq('provider','paystack').eq('event_key',eventKey).maybeSingle();
    if (priorEvent?.processed_at) return new Response('ok', { status: 200 });
    await admin.from('integration_webhook_events').upsert({ provider:'paystack', event_key:eventKey }, { onConflict:'provider,event_key', ignoreDuplicates:true });
    const { data: payment } = await admin.from('payments').select('id,amount_minor,currency,payer_id,obligation_id,status').eq('provider_reference', reference).single();
    if (!payment) return new Response('Unknown payment reference', { status: 404 });
    if (payment.status === 'success') return new Response('ok', { status: 200 });
    if (verified.data.amount !== payment.amount_minor || verified.data.currency !== payment.currency) return new Response('Amount or currency mismatch', { status: 409 });
    const receiptNumber = `RCP-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${payment.id.slice(0,8).toUpperCase()}`;
    const { error: updateError } = await admin.from('payments').update({ status: 'success', verified_at: new Date().toISOString(), receipt_number: receiptNumber }).eq('id', payment.id).eq('status', 'pending');
    if (updateError) return new Response('Could not record verified payment', { status: 500 });

    const { data: obligation } = await admin.from('payment_obligations').select('agreement_id').eq('id', payment.obligation_id).single();
    const { data: agreement } = await admin.from('rental_agreements').select('application_id').eq('id', obligation.agreement_id).single();
    const { data: app } = await admin.from('rental_applications').select('applicant_id,listing_id').eq('id', agreement.application_id).single();
    const { data: listing } = await admin.from('rental_listings').select('property_id').eq('id', app.listing_id).single();
    const { data: property } = await admin.from('properties').select('owner_id').eq('id', listing.property_id).single();
    await admin.from('notifications').insert([
      { recipient_id: payment.payer_id, title: 'Payment verified', body: `Your payment was verified. Receipt ${receiptNumber} is ready.`, action_path: '/renter-dashboard' },
      { recipient_id: property.owner_id, title: 'Initial rent payment received', body: `A required payment was verified. Receipt ${receiptNumber}.`, action_path: '/manage-rentals' },
    ]);
    await admin.from('integration_webhook_events').update({ processed_at: new Date().toISOString() }).eq('provider','paystack').eq('event_key',eventKey);
    return new Response('ok', { status: 200 });
  } catch {
    return new Response('Webhook processing failed', { status: 500 });
  }
});
