import { createClient } from 'npm:@supabase/supabase-js@2';

async function hmacSha256(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
  return btoa(String.fromCharCode(...bytes));
}

function constantTimeEqual(left: string, right: string) {
  let mismatch = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) mismatch |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  return mismatch === 0;
}

Deno.serve(async (request) => {
  const apiKey = Deno.env.get('DROPBOX_SIGN_API_KEY');
  if (!apiKey) return new Response('Signature provider not configured', { status: 503 });
  try {
    const form = await request.formData();
    const encoded = form.get('json');
    if (typeof encoded !== 'string') return new Response('Missing event payload', { status: 400 });
    const payload = JSON.parse(encoded);
    const event = payload.event;
    const expectedHash = await hmacSha256(apiKey, `${event.event_time}${event.event_type}`);
    if (!constantTimeEqual(expectedHash, event.event_hash ?? '')) return new Response('Invalid event signature', { status: 401 });

    const requestId = payload.signature_request?.signature_request_id;
    if (!requestId) return new Response('Missing signature request id', { status: 400 });
    const url = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const eventKey = String(event.event_hash ?? `${event.event_time}:${event.event_type}`);
    const { data: priorEvent } = await admin.from('integration_webhook_events').select('processed_at').eq('provider','dropbox_sign').eq('event_key',eventKey).maybeSingle();
    if (priorEvent?.processed_at) return new Response('Hello API Event Received', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    await admin.from('integration_webhook_events').upsert({ provider:'dropbox_sign', event_key:eventKey }, { onConflict:'provider,event_key', ignoreDuplicates:true });
    const { data: agreement } = await admin.from('rental_agreements').select('id,application_id').eq('provider_request_id', requestId).single();
    if (!agreement) return new Response('Unknown agreement', { status: 404 });

    const signers = payload.signature_request?.signatures ?? [];
    for (const signer of signers) {
      if (signer.status_code !== 'signed' || !signer.signer_email_address) continue;
      const { data: profile } = await admin.from('profiles').select('id').eq('email', signer.signer_email_address).single();
      if (profile) await admin.from('agreement_signatures').update({ status: 'signed', signed_at: signer.signed_at ? new Date(signer.signed_at * 1000).toISOString() : new Date().toISOString(), provider_signature_id: signer.signature_id }).eq('agreement_id', agreement.id).eq('signer_id', profile.id);
    }
    const { data: signatures } = await admin.from('agreement_signatures').select('status').eq('agreement_id', agreement.id);
    const allSigned = !!signatures?.length && signatures.every((signature) => signature.status === 'signed');
    if (event.event_type === 'signature_request_declined' || event.event_type === 'signature_request_canceled' || event.event_type === 'signature_request_expired') {
      await admin.from('rental_agreements').update({ status: event.event_type === 'signature_request_declined' ? 'declined' : 'cancelled' }).eq('id', agreement.id);
    } else if (allSigned) {
      await admin.from('rental_agreements').update({ status: 'signed' }).eq('id', agreement.id);
    } else if ((signatures ?? []).some((signature) => signature.status === 'signed')) {
      await admin.from('rental_agreements').update({ status: 'partially_signed' }).eq('id', agreement.id);
    }

    if (event.event_type === 'signature_request_downloadable' && allSigned) {
      const download = await fetch(`https://api.hellosign.com/v3/signature_request/files/${requestId}?file_type=pdf`, {
        headers: { Authorization: `Basic ${btoa(`${apiKey}:`)}` },
      });
      if (!download.ok) return new Response('Signed file is not ready', { status: 503 });
      const path = `agreements/${agreement.id}/signed.pdf`;
      const { error: uploadError } = await admin.storage.from('rental-documents').upload(path, await download.arrayBuffer(), { contentType: 'application/pdf', upsert: true });
      if (uploadError) return new Response('Could not securely store signed agreement', { status: 500 });
      await admin.from('rental_agreements').update({ status: 'signed', signed_document_path: path, signed_document_ready_at: new Date().toISOString() }).eq('id', agreement.id);
      const { error: tenancyError } = await admin.rpc('create_pending_tenancy', { p_agreement_id: agreement.id });
      if (tenancyError) return new Response('Could not create tenancy onboarding record', { status: 500 });
    }
    await admin.from('integration_webhook_events').update({ processed_at: new Date().toISOString() }).eq('provider','dropbox_sign').eq('event_key',eventKey);
    return new Response('Hello API Event Received', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  } catch {
    return new Response('Webhook processing failed', { status: 500 });
  }
});
