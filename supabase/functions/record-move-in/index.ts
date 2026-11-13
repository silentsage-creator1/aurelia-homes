import { clients, corsHeaders, json, requireUser } from '../_shared/clients.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user } = clients(request);
    await requireUser(user);
    const body = await request.json();
    const { data: moveInId, error } = await user.rpc('record_move_in_confirmation', {
      p_agreement_id: body.agreementId, p_move_in_date: body.moveInDate,
      p_keys_handed_over: body.keysHandedOver === true, p_meter_readings: body.meterReadings ?? {},
      p_outstanding_issues: body.outstandingIssues ?? '', p_handover_items: body.handoverItems ?? [],
    });
    if (error) return json({ error: error.message }, 403);
    return json({ moveInId, status: 'saved' });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not save move-in confirmation' }, 400);
  }
});
