import { clients, corsHeaders, json, requireUser } from '../_shared/clients.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user } = clients(request);
    await requireUser(user);
    const { obligationId, amountMinor, evidencePath } = await request.json();
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || typeof evidencePath !== 'string') return json({ error: 'Amount and evidence are required' }, 400);
    const { data, error } = await user.rpc('record_external_payment', { p_obligation_id: obligationId, p_amount_minor: amountMinor, p_evidence_path: evidencePath });
    if (error) return json({ error: error.message }, 403);
    return json({ paymentId: data, status: 'external_review' });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not record external payment' }, 400);
  }
});
