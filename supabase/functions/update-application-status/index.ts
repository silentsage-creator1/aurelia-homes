import { clients, corsHeaders, json, requireUser } from '../_shared/clients.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user } = clients(request);
    await requireUser(user);
    const { applicationId, status } = await request.json();
    const { error } = await user.rpc('update_rental_application_status',{p_application_id:applicationId,p_status:status});
    if (error) return json({error:error.message},403);
    return json({applicationId,status});
  } catch (error) { return json({error:error instanceof Error?error.message:'Status update failed'},400); }
});
