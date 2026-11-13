import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (request) => {
  const expected = Deno.env.get('WORKFLOW_SCHEDULER_SECRET');
  if (!expected || request.headers.get('x-workflow-scheduler-secret') !== expected) return new Response('Unauthorized', { status: 401 });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc('activate_eligible_tenancies');
  if (error) return new Response('Activation check failed', { status: 500 });
  return Response.json({ activated: data });
});
