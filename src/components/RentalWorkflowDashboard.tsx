import React, { useCallback, useEffect, useState } from 'react';
import { callWorkflowRpc, createPrivateDocumentLink, invokeWorkflow, listWorkflowNotifications, markWorkflowNotificationRead, uploadExternalPaymentEvidence, uploadHandoverPhoto, WorkflowNotification } from '../services/supabaseWorkflow';
import { UserProfile } from '../types';

type WorkflowRow = Record<string, unknown>;

interface Props { user: UserProfile; role: 'landlord' | 'renter' | 'reviewer'; }

const field = (row: WorkflowRow, key: string) => row[key] == null ? '' : String(row[key]);
const money = (amount: unknown, currency: unknown) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: String(currency || 'NGN') }).format(Number(amount || 0) / 100);
const statusClass = 'rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900';

export const RentalWorkflowDashboard: React.FC<Props> = ({ user, role }) => {
  const [rows, setRows] = useState<WorkflowRow[]>([]);
  const [occupancy, setOccupancy] = useState<WorkflowRow[]>([]);
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState('');
  const [startDates, setStartDates] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [result, occupancyResult, notificationResult] = await Promise.all([
        callWorkflowRpc<WorkflowRow[]>(role === 'landlord' ? 'landlord_onboarding_dashboard' : role === 'reviewer' ? 'admin_external_payment_queue' : 'renter_onboarding_dashboard'),
        role === 'landlord' ? callWorkflowRpc<WorkflowRow[]>('landlord_property_occupancy') : Promise.resolve([]),
        listWorkflowNotifications(),
      ]);
      setRows(Array.isArray(result) ? result : []);
      setOccupancy(Array.isArray(occupancyResult) ? occupancyResult : []);
      setNotifications(Array.isArray(notificationResult) ? notificationResult : []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load the shared rental dashboard'); }
    finally { setLoading(false); }
  }, [role]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('reference');
    if (role !== 'renter' || !reference) return;
    setWorking(reference);
    void invokeWorkflow('verify-rent-payment', { reference }).then(() => {
      const url = new URL(window.location.href); url.searchParams.delete('reference'); url.searchParams.delete('trxref'); window.history.replaceState({}, '', url);
      return refresh();
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Payment verification failed')).finally(() => setWorking(''));
  }, [role, refresh]);

  const run = async (key: string, action: () => Promise<unknown>) => {
    setWorking(key); setError('');
    try { await action(); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The requested workflow action failed'); }
    finally { setWorking(''); }
  };

  const approve = (row: WorkflowRow) => run(field(row, 'application_id'), () => invokeWorkflow('approve-application', { applicationId: field(row, 'application_id') }));
  const updateApplication = (row: WorkflowRow, status: 'under_review' | 'rejected' | 'withdrawn') => run(field(row, 'application_id'), () => invokeWorkflow('update-application-status', { applicationId: field(row, 'application_id'), status }));

  const finalize = (row: WorkflowRow) => {
    const id = field(row, 'agreement_id');
    const leaseStart = startDates[id] || field(row, 'desired_move_in') || new Date().toISOString().slice(0, 10);
    const end = new Date(`${leaseStart}T12:00:00`); end.setFullYear(end.getFullYear() + 1);
    const leaseEnd = end.toISOString().slice(0, 10);
    return run(id, () => invokeWorkflow('finalize-agreement', { agreementId: id, leaseStart, leaseEnd, paymentDueDay: 1, fees: [], additionalTerms: {} }));
  };

  const confirmHandover = async (row: WorkflowRow, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const agreementId = field(row, 'agreement_id'); const moveInId = field(row, 'move_in_id');
    const photo = form.get('conditionPhoto');
    await run(agreementId, async () => {
      let photoPath = '';
      if (photo instanceof File && photo.size) photoPath = await uploadHandoverPhoto(moveInId, photo);
      const meterReadings = Object.fromEntries(['electricity', 'water', 'gas'].map((meter) => [meter, String(form.get(`${meter}Reading`) || '').trim()]).filter(([, reading]) => reading));
      return invokeWorkflow('record-move-in', { agreementId, moveInDate: form.get('moveInDate'), keysHandedOver: form.get('keysHandedOver') === 'on', meterReadings, outstandingIssues: String(form.get('issues') || ''), handoverItems: [
        { item_key: 'keys_handed_over', completed: form.get('keysHandedOver') === 'on', notes: '' },
        { item_key: 'property_condition', completed: form.get('conditionConfirmed') === 'on', notes: String(form.get('issues') || '') },
        { item_key: 'condition_photos', completed: Boolean(photoPath), photo_path: photoPath, notes: '' },
      ] });
    });
  };

  const recordExternalPayment = async (row: WorkflowRow, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const obligationId = String(form.get('obligationId') || '');
    const amountMajor = Number(form.get('amountMajor'));
    const evidence = form.get('evidence');
    await run(obligationId, async () => {
      if (!Number.isFinite(amountMajor) || amountMajor <= 0 || !(evidence instanceof File) || evidence.size === 0) throw new Error('Enter the amount received and attach proof');
      const evidencePath = await uploadExternalPaymentEvidence(obligationId, evidence);
      return invokeWorkflow('record-external-payment', { obligationId, amountMinor: Math.round(amountMajor * 100), evidencePath });
    });
  };

  const pay = (obligationId: string) => run(obligationId, async () => {
    const result = await invokeWorkflow<{ authorizationUrl: string }>('initiate-rent-payment', { obligationId });
    window.location.assign(result.authorizationUrl);
  });

  const metrics = role === 'landlord' ? [
    ['Applications', rows.length],
    ['Approved', rows.filter((row) => field(row, 'application_status') === 'approved').length],
    ['Upcoming move-ins', rows.filter((row) => ['pending', 'scheduled', 'handover_pending'].includes(field(row, 'move_in_status'))).length],
    ['Active tenants', rows.filter((row) => field(row, 'tenancy_status') === 'active').length],
    ['Property occupancy', occupancy.length ? `${occupancy.reduce((sum, row) => sum + Number(row.occupied_units || 0), 0)} / ${occupancy.reduce((sum, row) => sum + Number(row.total_units || 0), 0)} units` : '0 units'],
  ] : [
    ['Applications', rows.length],
    ['Approved', rows.filter((row) => field(row, 'application_status') === 'approved').length],
    ['Payments', rows.filter((row) => field(row, 'payment_receipt')).length],
    ['Active tenancies', rows.filter((row) => field(row, 'tenancy_status') === 'active').length],
  ];

  const openLease = async (path: string) => {
    try { const url = await createPrivateDocumentLink(path); window.open(url, '_blank', 'noopener,noreferrer'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the private lease document'); }
  };

  const openPrivateFile = async (path: string) => {
    try { const url = await createPrivateDocumentLink(path); window.open(url, '_blank', 'noopener,noreferrer'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open the private evidence'); }
  };

  const openNotification = async (notification: WorkflowNotification) => {
    try {
      if (!notification.read_at) await markWorkflowNotificationRead(notification.id);
      setNotifications((previous) => previous.map((item) => item.id === notification.id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item));
      if (notification.action_path) window.location.assign(notification.action_path);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not open notification'); }
  };

  const activeTenant = role === 'renter' && rows.some((row) => field(row, 'tenancy_status') === 'active');

  if (role === 'reviewer') return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#9C7C3E]">Authorized review</p><h1 className="mt-1 font-heading text-3xl font-bold text-[#142D4E]">External payment verification</h1><p className="mt-2 text-sm text-slate-600">Review submitted evidence before recording a payment as verified.</p></div><button onClick={() => void refresh()} className="rounded-xl border border-[#E4DFD3] px-4 py-2 text-sm font-semibold">Refresh</button></div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {loading ? <p className="rounded-2xl border border-[#E4DFD3] bg-white p-6 text-sm">Loading pending evidence…</p> : rows.length === 0 ? <div className="rounded-2xl border border-[#E4DFD3] bg-white p-8 text-center"><h2 className="font-heading text-xl font-bold text-[#142D4E]">No external payments to review</h2></div> : <div className="space-y-3">{rows.map((row) => <article key={field(row, 'payment_id')} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E4DFD3] bg-white p-5"><div><h2 className="font-semibold text-[#142D4E]">{field(row, 'property_address')}</h2><p className="mt-1 text-xs text-slate-500">{field(row, 'payer_name')} · {money(row.amount_minor, row.currency)} · submitted {new Date(field(row, 'created_at')).toLocaleString()}</p></div><div className="flex gap-2"><button onClick={() => void openPrivateFile(field(row, 'external_evidence_path'))} className="rounded-xl border border-[#E4DFD3] px-3 py-2 text-xs font-semibold">Review evidence</button><button disabled={!!working} onClick={() => void run(field(row, 'payment_id'), () => invokeWorkflow('verify-external-payment', { paymentId: field(row, 'payment_id') }))} className="rounded-xl bg-[#142D4E] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{working === field(row, 'payment_id') ? 'Verifying…' : 'Verify payment'}</button></div></article>)}</div>}
  </div>;

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#9C7C3E]">Connected rental workspace</p><h1 className="mt-1 font-heading text-3xl font-bold text-[#142D4E]">{role === 'landlord' ? 'Landlord dashboard' : activeTenant ? 'Tenant dashboard' : 'Renter dashboard'}</h1><p className="mt-2 text-sm text-slate-600">Shared applications, lease onboarding, payments, and move-in progress for {user.name}.</p></div><button onClick={() => void refresh()} className="rounded-xl border border-[#E4DFD3] px-4 py-2 text-sm font-semibold text-[#142D4E]">Refresh</button></div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {!loading && notifications.length > 0 && <section className="mb-5 rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Notifications <span className="ml-2 rounded-full bg-[#F7F5F0] px-2 py-0.5 text-xs">{notifications.filter((item) => !item.read_at).length} unread</span></h2><div className="mt-3 space-y-2">{notifications.slice(0, 5).map((notification) => <button key={notification.id} onClick={() => void openNotification(notification)} className={`block w-full rounded-lg p-3 text-left ${notification.read_at ? 'bg-white' : 'bg-[#F7F5F0]'}`}><span className="flex justify-between gap-3 text-sm font-semibold text-[#142D4E]"><span>{notification.title}</span><span className="text-[10px] text-slate-500">{new Date(notification.created_at).toLocaleString()}</span></span><span className="mt-1 block text-xs text-slate-600">{notification.body}</span></button>)}</div></section>}
    {!loading && (rows.length > 0 || occupancy.length > 0) && <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{metrics.map(([label, value]) => <div key={label} className="rounded-2xl border border-[#E4DFD3] bg-white p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 font-heading text-2xl font-bold text-[#142D4E]">{value}</p></div>)}</div>}
    {role === 'landlord' && !loading && occupancy.length > 0 && <section className="mb-5 rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Property occupancy</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{occupancy.map((property) => <p key={field(property, 'property_id')} className="flex justify-between rounded-lg bg-[#F7F5F0] px-3 py-2 text-sm"><span>{field(property, 'property_address')}</span><strong>{field(property, 'occupied_units')} / {field(property, 'total_units')} occupied</strong></p>)}</div></section>}
    {loading ? <p className="rounded-2xl border border-[#E4DFD3] bg-white p-6 text-sm text-slate-500">Loading your shared rental records…</p> : rows.length === 0 ? <section className="rounded-2xl border border-[#E4DFD3] bg-white p-8 text-center"><h2 className="font-heading text-xl font-bold text-[#142D4E]">No applications yet</h2><p className="mt-2 text-sm text-slate-500">Submitted applications and tenancy onboarding will appear here.</p></section> : <div className="space-y-4">{rows.map((row, index) => {
      const appId = field(row, 'application_id'); const agreementId = field(row, 'agreement_id');
      const property = field(row, 'property_address') || 'Rental property';
      const agreementStatus = field(row, 'agreement_status');
      const paymentHistory = Array.isArray(row.payment_history) ? row.payment_history as WorkflowRow[] : [];
      return <article key={`${appId}-${field(row, 'payment_obligation_id') || index}`} className="rounded-2xl border border-[#E4DFD3] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-heading text-lg font-bold text-[#142D4E]">{property}{field(row, 'unit_label') ? ` · ${field(row, 'unit_label')}` : ''}</h2><p className="mt-1 text-xs text-slate-500">{role === 'landlord' ? `${field(row, 'applicant_name')} · ${field(row, 'applicant_email')}` : 'Your application'}{field(row, 'desired_move_in') ? ` · Preferred move-in ${field(row, 'desired_move_in')}` : ''}</p></div><span className={statusClass}>Application: {field(row, 'application_status') || 'pending'}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-[#F7F5F0] p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Rent / deposit</p><p className="mt-1 text-sm font-semibold text-[#142D4E]">{money(row.rent_amount_minor, row.currency)} / {money(row.deposit_amount_minor, row.currency)}</p></div><div className="rounded-xl bg-[#F7F5F0] p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Agreement</p><p className="mt-1 text-sm font-semibold text-[#142D4E]">{agreementStatus || 'Not started'}</p>{role === 'landlord' && agreementStatus && <p className="mt-1 text-[11px] text-slate-500">Signatures: landlord {field(row, 'landlord_signature_status') || 'pending'} · renter {field(row, 'renter_signature_status') || 'pending'}</p>}{role === 'renter' && field(row, 'lease_start') && <p className="mt-1 text-[11px] text-slate-500">Lease: {field(row, 'lease_start')} – {field(row, 'lease_end')}</p>}</div><div className="rounded-xl bg-[#F7F5F0] p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Initial payments</p><p className="mt-1 text-sm font-semibold text-[#142D4E]">{field(row, 'payment_status') || 'pending'}{row.payment_paid_minor != null ? ` · ${money(row.payment_paid_minor, row.currency)} paid` : ''}</p>{role === 'renter' && field(row, 'payment_description') && <p className="mt-1 text-[11px] text-slate-500">{field(row, 'payment_description')} · due {field(row, 'payment_due_date') || 'per agreement'}</p>}{role === 'renter' && paymentHistory.map((payment, paymentIndex) => <p key={`${field(payment, 'receipt_number')}-${paymentIndex}`} className="mt-1 text-[11px] text-slate-600">{field(payment, 'status')} · {money(payment.amount_minor, row.currency)}{field(payment, 'receipt_number') ? ` · receipt ${field(payment, 'receipt_number')}` : ''}</p>)}</div><div className="rounded-xl bg-[#F7F5F0] p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Move-in / tenancy</p><p className="mt-1 text-sm font-semibold text-[#142D4E]">{field(row, 'move_in_status') || 'not scheduled'}{field(row, 'tenancy_status') ? ` · ${field(row, 'tenancy_status')}` : ''}</p>{role === 'landlord' && field(row, 'move_in_date') && <p className="mt-1 text-[11px] text-slate-500">Move-in {field(row, 'move_in_date')}</p>}</div></div>
        {role === 'landlord' && <div className="mt-4 flex flex-wrap items-center gap-3">{['submitted', 'under_review', 'additional_information_required'].includes(field(row, 'application_status')) && <><button disabled={!!working} onClick={() => void updateApplication(row, 'under_review')} className="rounded-xl border border-[#E4DFD3] px-4 py-2.5 text-sm font-semibold text-[#142D4E] disabled:opacity-50">Mark under review</button><button disabled={!!working} onClick={() => void approve(row)} className="rounded-xl bg-[#142D4E] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{working === appId ? 'Approving…' : 'Approve application'}</button><button disabled={!!working} onClick={() => void updateApplication(row, 'rejected')} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50">Decline</button></>}{field(row, 'application_status') === 'approved' && (agreementStatus === 'landlord_review' || agreementStatus === 'draft') && <><label className="text-xs font-semibold text-slate-600">Lease starts<input type="date" value={startDates[agreementId] || field(row, 'desired_move_in')} onChange={(event) => setStartDates((prev) => ({ ...prev, [agreementId]: event.target.value }))} className="ml-2 rounded-lg border border-[#E4DFD3] p-2" /></label><button disabled={!!working} onClick={() => void finalize(row)} className="rounded-xl bg-[#C5A46D] px-4 py-2.5 text-sm font-bold text-[#142D4E] disabled:opacity-50">{working === agreementId ? 'Sending…' : 'Finalize & send for signature'}</button></>}{agreementStatus === 'signed' && field(row, 'move_in_id') && <MoveInForm onSubmit={(event) => void confirmHandover(row, event)} moveDate={field(row, 'move_in_date')} working={working === agreementId} />}{agreementStatus === 'signed' && Array.isArray(row.payment_breakdown) && <div className="w-full rounded-xl border border-[#E4DFD3] p-4"><p className="mb-2 text-sm font-bold text-[#142D4E]">Payment breakdown & external payments</p>{(row.payment_breakdown as WorkflowRow[]).map((obligation) => <div key={field(obligation, 'obligation_id')} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4DFD3] py-3"><p className="text-xs text-slate-600">{field(obligation, 'description')} · {money(obligation.amount_minor, row.currency)} · paid {money(obligation.paid_minor, row.currency)} · due {field(obligation, 'due_date')} · {field(obligation, 'payment_status')}</p>{Number(obligation.outstanding_minor || 0) > 0 && field(obligation, 'payment_status') !== 'external_review' && <form onSubmit={(event) => void recordExternalPayment(row, event)} className="flex flex-wrap items-center gap-2"><input type="hidden" name="obligationId" value={field(obligation, 'obligation_id')} /><input name="amountMajor" type="number" min="0.01" step="0.01" max={Number(obligation.outstanding_minor) / 100} required placeholder={`Amount (${field(row, 'currency')})`} className="w-32 rounded-lg border border-[#E4DFD3] p-2 text-xs" /><input name="evidence" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required className="max-w-48 text-xs" /><button disabled={!!working} className="rounded-lg bg-[#142D4E] px-3 py-2 text-xs font-bold text-white">Record for verification</button></form>}</div>)}</div>}</div>}
        {role === 'renter' && <div className="mt-4 flex flex-wrap items-center gap-3">{field(row, 'signed_document_path') && <button onClick={() => void openLease(field(row, 'signed_document_path'))} className="rounded-xl border border-[#E4DFD3] px-4 py-2.5 text-sm font-semibold text-[#142D4E]">View signed lease</button>}{agreementStatus === 'pending_signature' || agreementStatus === 'partially_signed' ? <p className="text-sm text-slate-600">Review and sign using the link sent by the e-signature provider.</p> : null}{field(row, 'payment_obligation_id') && field(row, 'payment_status') !== 'success' && field(row, 'payment_status') !== 'verified_external' && agreementStatus === 'signed' && <button disabled={!!working} onClick={() => void pay(field(row, 'payment_obligation_id'))} className="rounded-xl bg-[#142D4E] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Pay {money(row.payment_amount_minor, row.currency)}</button>}{['submitted', 'under_review', 'additional_information_required'].includes(field(row, 'application_status')) && <button disabled={!!working} onClick={() => void updateApplication(row, 'withdrawn')} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50">Withdraw application</button>}{field(row, 'move_in_id') && field(row, 'tenancy_status') !== 'active' && agreementStatus === 'signed' && <MoveInForm onSubmit={(event) => void confirmHandover(row, event)} moveDate={field(row, 'move_in_date')} working={working === agreementId} />}</div>}
      </article>;
    })}</div>}
    <p className="mt-6 text-xs text-slate-500">Approval alone does not activate a tenancy. Both signatures, verified required payments, confirmed handover and the lease start date are required.</p>
  </div>;
};

const MoveInForm: React.FC<{ onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; moveDate: string; working: boolean }> = ({ onSubmit, moveDate, working }) => <form onSubmit={onSubmit} className="mt-3 w-full rounded-xl border border-[#E4DFD3] bg-[#F7F5F0] p-4"><p className="mb-3 text-sm font-bold text-[#142D4E]">Confirm property handover</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Move-in date<input required name="moveInDate" type="date" min={new Date().toISOString().slice(0, 10)} defaultValue={moveDate || ''} className="mt-1 block rounded-lg border border-[#E4DFD3] p-2" /></label><label className="text-xs font-semibold">Electricity meter reading<input name="electricityReading" className="mt-1 block rounded-lg border border-[#E4DFD3] p-2" /></label><label className="text-xs font-semibold">Water meter reading<input name="waterReading" className="mt-1 block rounded-lg border border-[#E4DFD3] p-2" /></label><label className="text-xs font-semibold">Gas meter reading<input name="gasReading" className="mt-1 block rounded-lg border border-[#E4DFD3] p-2" /></label><label className="text-xs font-semibold">Condition photos<input name="conditionPhoto" type="file" accept="image/png,image/jpeg,image/webp" required className="mt-1 block max-w-full text-xs" /></label><label className="text-xs font-semibold">Outstanding issues<textarea name="issues" rows={2} className="mt-1 block w-full rounded-lg border border-[#E4DFD3] p-2" /></label></div><div className="mt-3 flex flex-wrap gap-4 text-xs"><label><input name="keysHandedOver" type="checkbox" className="mr-1" /> Keys handed over</label><label><input name="conditionConfirmed" type="checkbox" required className="mr-1" /> Property condition reviewed</label></div><button disabled={working} className="mt-3 rounded-lg bg-[#142D4E] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{working ? 'Saving…' : 'Confirm my handover'}</button></form>;
