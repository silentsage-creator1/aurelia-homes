import { clients, corsHeaders, json, requireUser } from '../_shared/clients.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, admin } = clients(request);
    const applicant = await requireUser(user);
    const body = await request.json();
    if ((typeof body.listingId !== 'string' && typeof body.propertyKey !== 'string') || !body.desiredMoveIn || typeof body.occupation !== 'string' || body.occupation.trim().length < 2) return json({ error: 'Complete the required application fields' }, 400);
    const desiredMoveIn = new Date(`${body.desiredMoveIn}T00:00:00Z`);
    if (Number.isNaN(desiredMoveIn.valueOf()) || desiredMoveIn < new Date(new Date().toISOString().slice(0,10))) return json({ error: 'Choose a valid future move-in date' }, 400);
    let listingQuery = admin.from('rental_listings').select('id,property_id,properties!inner(owner_id)').eq('status','published');
    listingQuery = typeof body.listingId === 'string' ? listingQuery.eq('id', body.listingId) : listingQuery.eq('external_key', body.propertyKey);
    const { data: listing } = await listingQuery.single();
    if (!listing) return json({ error: 'This rental listing is not connected to the shared database or is unavailable' }, 404);
    const property = (listing as any).properties;
    if (property.owner_id === applicant.id) return json({ error: 'You cannot apply to your own property' }, 403);
    await user.from('profiles').update({ phone: String(body.phone ?? '').slice(0,30) }).eq('id',applicant.id);
    const { data: application, error } = await admin.from('rental_applications').insert({ listing_id:listing.id, applicant_id:applicant.id,
      desired_move_in:body.desiredMoveIn, occupation:body.occupation.trim().slice(0,100), message:String(body.message ?? '').slice(0,1000), status:'submitted' }).select('id').single();
    if (error) return json({ error: error.code === '23505' ? 'You already have an application for this rental' : 'Could not save the application' }, error.code === '23505' ? 409 : 500);
    await admin.from('notifications').insert({ recipient_id:property.owner_id,title:'New rental application',body:'A renter submitted an application for one of your listings.',action_path:'/manage-rentals' });
    const { data: owner } = await admin.from('profiles').select('email,full_name').eq('id',property.owner_id).single();
    const apiKey = Deno.env.get('RESEND_API_KEY'); const from = Deno.env.get('RESEND_FROM_EMAIL');
    if (apiKey && from && owner?.email) await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:owner.email,subject:'New rental application',text:'A renter submitted an application for one of your rental listings. Sign in to review it.'})});
    return json({ applicationId:application.id, status:'submitted' },201);
  } catch (error) {
    return json({ error:error instanceof Error ? error.message:'Application submission failed' },400);
  }
});
