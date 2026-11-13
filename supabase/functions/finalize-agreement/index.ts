import { clients, corsHeaders, json, requireUser } from '../_shared/clients.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, admin } = clients(request);
    await requireUser(user);
    const body = await request.json();
    const { agreementId, leaseStart, leaseEnd, paymentDueDay, fees = [], additionalTerms = {} } = body;
    if (!agreementId || !leaseStart || !leaseEnd || !Number.isInteger(paymentDueDay)) return json({ error: 'Agreement terms are incomplete' }, 400);
    const apiKey = Deno.env.get('DROPBOX_SIGN_API_KEY');
    const templateId = Deno.env.get('DROPBOX_SIGN_TEMPLATE_ID');
    if (!apiKey || !templateId) return json({ error: 'E-signature provider is not configured; agreement was not sent' }, 503);

    const { data: id, error } = await user.rpc('finalize_rental_agreement', {
      p_agreement_id: agreementId, p_lease_start: leaseStart, p_lease_end: leaseEnd,
      p_payment_due_day: paymentDueDay, p_fees: fees, p_additional_terms: additionalTerms,
    });
    if (error) return json({ error: error.message }, 403);

    const { data: agreement } = await admin.from('rental_agreements').select('id, rent_amount_minor, deposit_amount_minor, fees, terms, application_id').eq('id', id).single();
    const { data: application } = await admin.from('rental_applications').select('applicant_id, listing_id').eq('id', agreement.application_id).single();
    const { data: listing } = await admin.from('rental_listings').select('property_id, currency').eq('id', application.listing_id).single();
    const { data: property } = await admin.from('properties').select('owner_id,address').eq('id', listing.property_id).single();
    const [{ data: landlord }, { data: renter }, { data: landlordProfile }, { data: renterProfile }] = await Promise.all([
      admin.auth.admin.getUserById(property.owner_id), admin.auth.admin.getUserById(application.applicant_id),
      admin.from('profiles').select('full_name,email,phone').eq('id',property.owner_id).single(),
      admin.from('profiles').select('full_name,email,phone').eq('id',application.applicant_id).single(),
    ]);
    if (!landlord.user?.email || !renter.user?.email) return json({ error: 'Both signers need verified email addresses' }, 400);

    const form = new FormData();
    form.append('template_ids[]', templateId);
    form.append('title', `Rental agreement - ${property.address}`);
    form.append('subject', 'Please review and sign your rental agreement');
    form.append('message', 'Review all terms carefully. Contact the landlord if any term is incorrect.');
    form.append('signers[0][role]', Deno.env.get('DROPBOX_SIGN_LANDLORD_ROLE') ?? 'Landlord');
    form.append('signers[0][name]', landlord.user.user_metadata?.full_name ?? landlord.user.email);
    form.append('signers[0][email_address]', landlord.user.email);
    form.append('signers[1][role]', Deno.env.get('DROPBOX_SIGN_RENTER_ROLE') ?? 'Renter');
    form.append('signers[1][name]', renter.user.user_metadata?.full_name ?? renter.user.email);
    form.append('signers[1][email_address]', renter.user.email);
    form.append('metadata[agreement_id]', agreement.id);
    form.append('test_mode', Deno.env.get('DROPBOX_SIGN_TEST_MODE') === 'false' ? '0' : '1');
    const formatMoney = (minor: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: listing.currency }).format(minor / 100);
    const fields: [string, string][] = [
      ['Property address', property.address],
      ['Landlord name', landlordProfile?.full_name ?? landlord.user.user_metadata?.full_name ?? landlord.user.email],
      ['Landlord email', landlordProfile?.email ?? landlord.user.email],
      ['Tenant name', renterProfile?.full_name ?? renter.user.user_metadata?.full_name ?? renter.user.email],
      ['Tenant email', renterProfile?.email ?? renter.user.email],
      ['Tenant phone', renterProfile?.phone ?? ''],
      ['Rent amount', formatMoney(agreement.rent_amount_minor)],
      ['Payment frequency', agreement.terms?.rent_frequency ?? 'monthly'],
      ['Security deposit', formatMoney(agreement.deposit_amount_minor)],
      ['Lease start date', leaseStart],
      ['Lease end date', leaseEnd],
      ['Payment due day', String(paymentDueDay)],
      ['Additional fees', (fees as { description?: string; amount_minor: number }[]).map((fee) => `${fee.description ?? 'Agreed charge'}: ${formatMoney(fee.amount_minor)}`).join('; ') || 'None'],
      ['Additional terms', JSON.stringify(additionalTerms)],
    ];
    fields.forEach(([name, value], index) => {
      form.append(`custom_fields[${index}][name]`, name);
      form.append(`custom_fields[${index}][value]`, value);
    });
    const response = await fetch('https://api.hellosign.com/v3/signature_request/send_with_template', {
      method: 'POST', headers: { Authorization: `Basic ${btoa(`${apiKey}:`)}` }, body: form,
    });
    const result = await response.json();
    if (!response.ok || !result.signature_request?.signature_request_id) {
      await admin.from('rental_agreements').update({ status: 'landlord_review', landlord_finalized_at: null }).eq('id', agreement.id);
      return json({ error: 'Signature provider rejected the agreement request', detail: result.error?.error_msg ?? 'Check template signer roles and fields' }, 502);
    }
    await admin.from('rental_agreements').update({ provider_request_id: result.signature_request.signature_request_id }).eq('id', agreement.id);
    for (const signature of result.signature_request.signatures ?? []) {
      const profileId = signature.signer_email_address?.toLowerCase() === landlord.user.email.toLowerCase() ? property.owner_id
        : signature.signer_email_address?.toLowerCase() === renter.user.email.toLowerCase() ? application.applicant_id : null;
      if (profileId && signature.signature_id) await admin.from('agreement_signatures').update({ provider_signature_id: signature.signature_id }).eq('agreement_id', agreement.id).eq('signer_id', profileId);
    }
    return json({ agreementId: agreement.id, status: 'pending_signature', providerRequestId: result.signature_request.signature_request_id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Agreement finalization failed' }, 400);
  }
});
