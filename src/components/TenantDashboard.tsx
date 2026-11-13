import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Building2, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, CreditCard, FileText, Heart, Home, KeyRound, LogOut, MapPin, MessageCircle, Search, Settings, ShieldCheck, UserRound, Wrench } from 'lucide-react';
import { UserProfile } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { callWorkflowRpc, createPrivateDocumentLink, deleteWorkflowRows, insertWorkflowRow, invokeWorkflow, listWorkflowNotifications, markWorkflowNotificationRead, patchWorkflowRows, selectWorkflowRows, upsertWorkflowRow, uploadHandoverPhoto, uploadMaintenanceAttachment, uploadTenantProfilePhoto, WorkflowNotification } from '../services/supabaseWorkflow';

type Row = Record<string, any>;
type Page = 'overview' | 'find' | 'saved' | 'applications' | 'tenancy' | 'payments' | 'agreement' | 'maintenance' | 'messages' | 'notifications' | 'profile' | 'settings';
interface ListingRow { id: string; external_key: string; rent_amount_minor: number; rent_frequency: string; deposit_amount_minor: number; currency: string; status: string; properties: { title: string; address: string; neighborhood: string; city: string; country: string; description: string; image_urls: string[]; owner_id: string; property_type: string; bedrooms: number; bathrooms: number }; }
const NAV: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Dashboard', icon: Home }, { id: 'find', label: 'Find a House', icon: Search }, { id: 'saved', label: 'Saved Properties', icon: Heart },
  { id: 'applications', label: 'My Applications', icon: ClipboardList }, { id: 'tenancy', label: 'My Tenancy', icon: KeyRound },
  { id: 'payments', label: 'Rent & Payments', icon: CreditCard }, { id: 'agreement', label: 'Rental Agreement', icon: FileText },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench }, { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'notifications', label: 'Notifications', icon: Bell }, { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'settings', label: 'Settings', icon: Settings },
];
const txt = (value: unknown) => value == null ? '' : String(value);
const fmtMoney = (minor: unknown, currency: unknown) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: txt(currency) || 'NGN', maximumFractionDigits: 2 }).format(Number(minor || 0) / 100);
const shortDate = (value: unknown) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'â€”';
const formatDateTime = (value: unknown) => value ? new Date(String(value)).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'â€”';
const paymentDueLabel = (dueDate: unknown, status: unknown) => {
  const state = txt(status);
  if (state === 'external_review') return 'Pending verification';
  if (state === 'failed') return 'Payment failed';
  if (!dueDate) return 'Upcoming';
  const due = new Date(`${String(dueDate).slice(0, 10)}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  return days < 0 ? 'Overdue' : days === 0 ? 'Due today' : days <= 7 ? 'Due soon' : 'Upcoming';
};
const badge = 'inline-flex items-center rounded-full bg-[#F7F5F0] px-2.5 py-1 text-[11px] font-semibold capitalize text-[#142D4E]';

export const TenantDashboard: React.FC<{ user: UserProfile; onSignOut: () => void; onBrowseRentals: () => void }> = ({ user, onSignOut, onBrowseRentals }) => {
  const [page, setPage] = useState<Page>('overview');
  const [applications, setApplications] = useState<Row[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [maintenance, setMaintenance] = useState<Row[]>([]);
  const [tenancyRequests, setTenancyRequests] = useState<Row[]>([]);
  const [messages, setMessages] = useState<Row[]>([]);
  const [profile, setProfile] = useState<Row>({});
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [preferences, setPreferences] = useState<Row>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [minRent, setMinRent] = useState('');
  const [minBeds, setMinBeds] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [selectedListing, setSelectedListing] = useState<ListingRow | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Row | null>(null);
  const [applicationListing, setApplicationListing] = useState<ListingRow | null>(null);
  const [messageText, setMessageText] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const listingQuery = new URLSearchParams({ select: 'id,external_key,rent_amount_minor,rent_frequency,deposit_amount_minor,currency,status,properties!inner(title,address,neighborhood,city,country,description,image_urls,owner_id,property_type,bedrooms,bathrooms)', status: 'eq.published', order: 'created_at.desc' });
      const savedQuery = new URLSearchParams({ select: 'listing_id', renter_id: `eq.${user.id}` });
      const maintenanceQuery = new URLSearchParams({ select: '*,properties(title,address)', order: 'created_at.desc' });
      const tenancyRequestQuery = new URLSearchParams({ select: 'id,tenancy_id,request_type,reason,status,created_at', order: 'created_at.desc' });
      const messagesQuery = new URLSearchParams({ select: 'id,tenancy_id,sender_id,recipient_id,body,read_at,created_at,sender:profiles!rental_messages_sender_id_fkey(full_name),recipient:profiles!rental_messages_recipient_id_fkey(full_name)', order: 'created_at.asc' });
      const profileQuery = new URLSearchParams({ select: 'full_name,email,phone,residential_address,identity_verification_status,profile_photo_path', id: `eq.${user.id}`, limit: '1' });
      const preferenceQuery = new URLSearchParams({ select: '*', renter_id: `eq.${user.id}`, limit: '1' });
      const [appRows, listingRows, savedRows, noticeRows, maintenanceRows, tenancyRequestRows, messageRows, profileRows, preferenceRows] = await Promise.all([
        callWorkflowRpc<Row[]>('renter_onboarding_dashboard'),
        selectWorkflowRows<ListingRow>('rental_listings', listingQuery),
        selectWorkflowRows<Row>('saved_rentals', savedQuery),
        listWorkflowNotifications(),
        selectWorkflowRows<Row>('maintenance_requests', maintenanceQuery),
        selectWorkflowRows<Row>('tenancy_requests', tenancyRequestQuery),
        selectWorkflowRows<Row>('rental_messages', messagesQuery),
        selectWorkflowRows<Row>('profiles', profileQuery),
        selectWorkflowRows<Row>('tenant_preferences', preferenceQuery),
      ]);
      setApplications(appRows || []); setListings(listingRows || []); setSavedIds((savedRows || []).map((row) => String(row.listing_id)));
      setNotifications(noticeRows || []); setMaintenance(maintenanceRows || []); setTenancyRequests(tenancyRequestRows || []); setMessages(messageRows || []);
      setProfile(profileRows?.[0] || {}); setPreferences(preferenceRows?.[0] || { email_notifications: true, payment_reminders: true, maintenance_updates: true, message_notifications: true });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load your tenant workspace'); }
    finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let cancelled = false;
    if (!profile.profile_photo_path) { setProfilePhotoUrl(''); return; }
    void createPrivateDocumentLink(profile.profile_photo_path).then((url) => { if (!cancelled) setProfilePhotoUrl(url); }).catch(() => { if (!cancelled) setProfilePhotoUrl(''); });
    return () => { cancelled = true; };
  }, [profile.profile_photo_path]);
  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('reference');
    if (!reference) return;
    setBusy(true);
    void invokeWorkflow('verify-rent-payment', { reference }).then((result: any) => {
      setSuccess(result.status === 'success' ? `Payment verified. Receipt ${result.receiptNumber}.` : `Payment status: ${result.status}.`);
      const url = new URL(window.location.href); url.searchParams.delete('reference'); url.searchParams.delete('trxref'); window.history.replaceState({}, '', url);
      return load();
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Payment verification failed')).finally(() => setBusy(false));
  }, [load]);

  const uniqueApplications = useMemo(() => Array.from(new Map(applications.map((row) => [String(row.application_id), row])).values()), [applications]);
  const activeTenancy = applications.find((row) => row.tenancy_status === 'active');
  const onboarding = applications.find((row) => row.application_status === 'approved' && row.tenancy_status !== 'active');
  const stage = activeTenancy ? 'moved_in' : onboarding ? 'approved' : 'searching';
  const outstandingFor = (row: Row) => {
    const paid = Array.isArray(row.payment_history) ? row.payment_history.filter((payment: Row) => ['success','verified_external'].includes(txt(payment.status))).reduce((subtotal: number, payment: Row) => subtotal + Number(payment.amount_minor || 0), 0) : 0;
    return Math.max(0, Number(row.payment_amount_minor || 0) - paid);
  };
  const canConfirmHandover = (row: Row) => {
    const obligations = applications.filter((item) => item.application_id === row.application_id && item.payment_obligation_id);
    return obligations.length > 0 && obligations.every((item) => outstandingFor(item) === 0);
  };
  const upcoming = applications.find((row) => row.payment_obligation_id && row.agreement_status === 'signed' && outstandingFor(row) > 0);
  const filteredListings = listings.filter((listing) => {
    const property = listing.properties;
    const haystack = `${property.title} ${property.address} ${property.neighborhood} ${property.city} ${property.country}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (!city || `${property.city} ${property.neighborhood}`.toLowerCase().includes(city.toLowerCase())) && (!maxRent || listing.rent_amount_minor <= Number(maxRent) * 100) && (!minRent || listing.rent_amount_minor >= Number(minRent) * 100) && (!minBeds || property.bedrooms >= Number(minBeds)) && (!propertyType || property.property_type === propertyType);
  });
  const savedListings = listings.filter((listing) => savedIds.includes(listing.id));
  const tenancy = activeTenancy || onboarding;
  const activeTenancies = applications.filter((row) => row.tenancy_status === 'active');
  const outstandingMinor = applications.reduce((sum, row) => {
    return sum + outstandingFor(row);
  }, 0);
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const tenantName = profile.full_name || user.name;
  const summaryTargets: Record<string, Page> = { 'Active tenancy': 'tenancy', Applications: 'applications', 'Outstanding rent': 'payments', Maintenance: 'maintenance' };

  const action = async (callback: () => Promise<unknown>, message?: string) => {
    setBusy(true); setError(''); setSuccess('');
    try { await callback(); if (message) setSuccess(message); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'That action could not be completed'); }
    finally { setBusy(false); }
  };

  const apply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!applicationListing) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setSuccess('');
    try {
      await invokeWorkflow('submit-rental-application', { listingId: applicationListing.id, desiredMoveIn: form.get('desiredMoveIn'), occupation: form.get('occupation'), phone: form.get('phone'), message: form.get('message') });
      await load(); setSuccess('Application submitted to the landlord.'); setApplicationListing(null); setPage('applications');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not submit your application'); }
    finally { setBusy(false); }
  };

  const confirmRenterHandover = async (row: Row, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const photo = form.get('conditionPhoto');
    setBusy(true); setError(''); setSuccess('');
    try {
      if (!row.agreement_id || !row.move_in_id) throw new Error('The landlord must finalize the agreement before move-in can be arranged.');
      if (!(photo instanceof File) || !photo.size || photo.size > 15 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) throw new Error('Attach a JPG, PNG or WebP property-condition photo smaller than 15 MB.');
      const photoPath = await uploadHandoverPhoto(row.move_in_id, photo);
      const meterReadings = Object.fromEntries(['electricity', 'water', 'gas'].map((meter) => [meter, String(form.get(`${meter}Reading`) || '').trim()]).filter(([, reading]) => reading));
      await invokeWorkflow('record-move-in', { agreementId: row.agreement_id, moveInDate: form.get('moveInDate'), keysHandedOver: form.get('keysHandedOver') === 'on', meterReadings, outstandingIssues: String(form.get('issues') || '').trim(), handoverItems: [
        { item_key: 'keys_handed_over', completed: form.get('keysHandedOver') === 'on', notes: '' },
        { item_key: 'property_condition', completed: form.get('conditionConfirmed') === 'on', notes: String(form.get('issues') || '').trim() },
        { item_key: 'condition_photos', completed: true, photo_path: photoPath, notes: '' },
      ] });
      await load(); setSuccess('Your move-in date and handover details were sent. The landlord must confirm their side of the handover.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the move-in handover'); }
    finally { setBusy(false); }
  };

  const toggleSave = (listing: ListingRow) => action(async () => {
    if (savedIds.includes(listing.id)) {
      await deleteWorkflowRows('saved_rentals', new URLSearchParams({ renter_id: `eq.${user.id}`, listing_id: `eq.${listing.id}` }));
      setSavedIds((ids) => ids.filter((id) => id !== listing.id));
    } else {
      await insertWorkflowRow('saved_rentals', { renter_id: user.id, listing_id: listing.id });
      setSavedIds((ids) => [...ids, listing.id]);
    }
  });

  const pay = (obligationId: string) => action(async () => {
    const result = await invokeWorkflow<{ authorizationUrl: string }>('initiate-rent-payment', { obligationId });
    window.location.assign(result.authorizationUrl);
  });

  const openDocument = (path: string) => action(async () => {
    const url = await createPrivateDocumentLink(path); window.open(url, '_blank', 'noopener,noreferrer');
  });

  const markAllRead = () => action(async () => {
    const unread = notifications.filter((item) => !item.read_at);
    await Promise.all(unread.map((item) => markWorkflowNotificationRead(item.id)));
    setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
  }, 'All notifications marked as read.');

  const submitMaintenance = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!activeTenancy) return;
    const form = new FormData(event.currentTarget); const file = form.get('attachment');
    if (file instanceof File && file.size && (file.size > 15 * 1024 * 1024 || !['image/jpeg','image/png','image/webp','video/mp4'].includes(file.type))) {
      setError('Attach a JPG, PNG, WebP or MP4 file smaller than 15 MB.'); return;
    }
    void action(async () => {
      const request = await insertWorkflowRow<Row>('maintenance_requests', { tenancy_id: activeTenancy.tenancy_id, property_id: activeTenancy.property_id, requested_by: user.id, title: form.get('title'), category: form.get('category'), description: form.get('description'), priority: form.get('priority') });
      if (file instanceof File && file.size) {
        if (file.size > 15 * 1024 * 1024) throw new Error('Attachments must be smaller than 15 MB');
        const path = await uploadMaintenanceAttachment(request.id, file);
        await patchWorkflowRows('maintenance_requests', new URLSearchParams({ id: `eq.${request.id}` }), { attachment_path: path });
      }
    }, 'Maintenance request submitted.');
    event.currentTarget.reset();
  };

  const submitTenancyRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!activeTenancy) return;
    const form = new FormData(event.currentTarget);
    void action(() => insertWorkflowRow('tenancy_requests', { tenancy_id: activeTenancy.tenancy_id, requested_by: user.id, request_type: form.get('request_type'), reason: form.get('reason') }), 'Your request was sent to the landlord.');
    event.currentTarget.reset();
  };

  const sendMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!activeTenancy || !activeTenancy.landlord_id || !messageText.trim()) return;
    void action(() => insertWorkflowRow('rental_messages', { tenancy_id: activeTenancy.tenancy_id, sender_id: user.id, recipient_id: activeTenancy.landlord_id, body: messageText.trim() }));
    setMessageText('');
  };

  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void action(() => patchWorkflowRows('profiles', new URLSearchParams({ id: `eq.${user.id}` }), { full_name: form.get('full_name'), phone: form.get('phone'), residential_address: form.get('residential_address') }), 'Profile updated.');
  };

  const saveProfilePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP photo smaller than 5 MB.'); event.target.value = ''; return; }
    void action(async () => {
      const path = await uploadTenantProfilePhoto(user.id, file);
      await patchWorkflowRows('profiles', new URLSearchParams({ id: `eq.${user.id}` }), { profile_photo_path: path });
      setProfile((current) => ({ ...current, profile_photo_path: path }));
    }, 'Profile photo updated.');
    event.target.value = '';
  };

  const savePreferences = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const values = { renter_id: user.id, email_notifications: form.get('email_notifications') === 'on', payment_reminders: form.get('payment_reminders') === 'on', maintenance_updates: form.get('maintenance_updates') === 'on', message_notifications: form.get('message_notifications') === 'on', updated_at: new Date().toISOString() };
    void action(() => upsertWorkflowRow('tenant_preferences', values, 'renter_id'), 'Notification preferences saved.');
  };

  const openNotification = (notification: WorkflowNotification) => action(async () => {
    if (!notification.read_at) await markWorkflowNotificationRead(notification.id);
    if (notification.action_path?.startsWith('/')) {
      const section = new URL(notification.action_path, window.location.origin).searchParams.get('section');
      const destinations: Record<string, Page> = { applications: 'applications', agreement: 'agreement', payments: 'payments', tenancy: 'tenancy', maintenance: 'maintenance', messages: 'messages' };
      setPage(destinations[section || ''] || 'overview');
    }
  });

  const title = NAV.find((item) => item.id === page)?.label || 'Dashboard';
  const propertyImage = (row: Row) => Array.isArray(row.image_urls) ? row.image_urls[0] : '';
  const summaryCards: { label: string; value: string; icon: React.ElementType }[] = stage === 'moved_in' ? [
    { label: 'Active tenancy', value: String(applications.filter((row) => row.tenancy_status === 'active').length), icon: KeyRound },
    { label: 'Applications', value: String(uniqueApplications.length), icon: ClipboardList },
    { label: 'Outstanding rent', value: fmtMoney(outstandingMinor, tenancy?.currency), icon: CreditCard },
    { label: 'Open maintenance', value: String(maintenance.filter((item) => !['resolved', 'rejected'].includes(item.status)).length), icon: Wrench },
  ] : stage === 'approved' ? [
    { label: 'Application', value: 'Approved', icon: CheckCircle2 },
    { label: 'Agreement', value: txt(onboarding?.agreement_status).replaceAll('_', ' ') || 'In progress', icon: FileText },
    { label: 'Initial payments', value: txt(onboarding?.payment_status).replaceAll('_', ' ') || 'Pending', icon: CreditCard },
    { label: 'Move-in', value: txt(onboarding?.move_in_status).replaceAll('_', ' ') || 'To arrange', icon: CalendarDays },
  ] : [
    { label: 'Applications', value: String(uniqueApplications.length), icon: ClipboardList },
    { label: 'Saved homes', value: String(savedIds.length), icon: Heart },
    { label: 'Available rentals', value: String(listings.length), icon: Building2 },
    { label: 'Unread notifications', value: String(notifications.filter((item) => !item.read_at).length), icon: Bell },
  ];

  const recentActivity = [
    ...uniqueApplications.map((row) => ({ id: `application-${row.application_id}`, title: `Application ${txt(row.application_status).replaceAll('_', ' ')}`, detail: row.property_title || row.property_address, date: row.application_updated_at || row.application_created_at })),
    ...maintenance.map((row) => ({ id: `maintenance-${row.id}`, title: `Maintenance ${txt(row.status).replaceAll('_', ' ')}`, detail: row.title, date: row.updated_at || row.created_at })),
    ...applications.flatMap((row) => Array.isArray(row.payment_history) ? row.payment_history.filter((payment: Row) => ['success','verified_external'].includes(txt(payment.status))).map((payment: Row, index: number) => ({ id: `payment-${row.payment_obligation_id}-${index}`, title: 'Payment confirmed', detail: `${row.property_title || row.property_address} · ${fmtMoney(payment.amount_minor, row.currency)}`, date: payment.created_at })) : []),
    ...notifications.map((note) => ({ id: `notification-${note.id}`, title: note.title, detail: note.body, date: note.created_at })),
  ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 5);

  return <div className="min-h-[calc(100vh-80px)] bg-[#F7F5F0]">
    <div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
        <aside className="h-fit rounded-2xl border border-[#E4DFD3] bg-white p-3 lg:sticky lg:top-24">
          <div className="mb-2 border-b border-[#E4DFD3] px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9C7C3E]">Aurelia Homes</p><p className="mt-1 text-sm font-bold text-[#142D4E]">Tenant workspace</p></div>
          <nav aria-label="Tenant dashboard" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">{NAV.map(({ id, label, icon: Icon }) => { const count = id === 'notifications' ? notifications.filter((item) => !item.read_at).length : id === 'messages' ? messages.filter((message) => message.recipient_id === user.id && !message.read_at).length : 0; return <button key={id} onClick={() => { setPage(id); setApplicationListing(null); }} aria-current={page === id ? 'page' : undefined} className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors lg:w-full ${page === id ? 'bg-[#142D4E] text-white' : 'text-slate-600 hover:bg-[#F7F5F0]'}`}><Icon className={`h-4 w-4 ${page === id ? 'text-[#D8BD8C]' : 'text-[#9C7C3E]'}`} />{label}{count > 0 && <span className="ml-auto rounded-full bg-[#F3E8D2] px-1.5 py-0.5 text-[10px] text-[#142D4E]">{count}</span>}</button>; })}</nav>
          <button onClick={onSignOut} className="mt-3 flex w-full items-center gap-2 rounded-xl border-t border-[#E4DFD3] px-3 py-3 text-left text-xs font-semibold text-slate-600 hover:text-rose-700"><LogOut className="h-4 w-4" />Log out</button>
          <p className="hidden border-t border-[#E4DFD3] px-3 pt-3 text-[10px] text-slate-500 lg:block">Signed in as {user.name}</p>
        </aside>
        <main className="min-w-0 space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9C7C3E]">Tenant portal</p><h1 className="mt-1 font-heading text-3xl font-bold text-[#142D4E]">{page === 'overview' ? `${greeting}, ${tenantName.split(' ')[0]}` : title}</h1><p className="mt-1 text-sm text-slate-500">Manage your rental activities and updates in one place.</p></div><div className="flex items-center gap-2"><button onClick={() => setPage('notifications')} aria-label={`Notifications${notifications.filter((item) => !item.read_at).length ? `, ${notifications.filter((item) => !item.read_at).length} unread` : ''}`} className="relative rounded-xl border border-[#E4DFD3] bg-white p-2.5 text-[#142D4E]"><Bell className="h-4 w-4"/>{notifications.some((item) => !item.read_at) && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-600"/>}</button><button onClick={() => setPage('profile')} aria-label="My profile" className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#E4DFD3] bg-white text-[#142D4E]">{profilePhotoUrl ? <ImageWithFallback src={profilePhotoUrl} alt="Profile" className="h-full w-full object-cover"/> : <UserRound className="h-5 w-5"/>}</button><button onClick={() => void load()} className="rounded-xl border border-[#E4DFD3] bg-white px-4 py-2 text-xs font-bold text-[#142D4E]">Refresh</button></div></header>
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}{success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div>}
          {loading ? <div className="rounded-2xl border border-[#E4DFD3] bg-white p-8 text-sm text-slate-500">Loading your private tenant recordsâ€¦</div> : <>
            {page === 'overview' && <>
              <section className="overflow-hidden rounded-3xl bg-[#142D4E] p-6 text-white shadow-sm sm:p-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D8BD8C]">{stage === 'moved_in' ? 'Your home' : stage === 'approved' ? 'Next steps' : 'Your rental journey'}</p><h2 className="mt-2 font-heading text-3xl font-bold">{stage === 'moved_in' ? `Welcome home, ${user.name.split(' ')[0]}.` : stage === 'approved' ? 'Your application is approved.' : `Find your next home, ${user.name.split(' ')[0]}.`}</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">{stage === 'moved_in' ? 'Your lease, payments, maintenance and landlord messages are available here.' : stage === 'approved' ? 'Complete agreement signing, initial payments and the move-in checklist to activate your tenancy.' : 'Explore rentals, save your favourites, and keep track of every application.'}</p></div><button onClick={() => setPage(stage === 'moved_in' ? 'tenancy' : stage === 'approved' ? 'agreement' : 'find')} className="rounded-xl bg-[#C5A46D] px-5 py-3 text-sm font-bold text-[#142D4E]">{stage === 'moved_in' ? 'View my tenancy' : stage === 'approved' ? 'Continue onboarding' : 'Find a house'}</button></div></section>
              {stage === 'approved' && onboarding && <ProgressCard row={onboarding} onAgreement={() => setPage('agreement')} onPayment={() => setPage('payments')} />}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{summaryCards.map(({ label, value, icon: Icon }) => <button key={label} onClick={() => setPage(summaryTargets[label])} className="rounded-2xl border border-[#E4DFD3] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Icon className="h-4 w-4 text-[#9C7C3E]" />{label}</div><p className="mt-3 font-heading text-2xl font-bold capitalize text-[#142D4E]">{value}</p><p className="mt-1 text-[11px] text-slate-500">{label === 'Active tenancy' ? 'Currently rented properties' : label === 'Applications' ? 'Submitted applications' : label === 'Outstanding rent' ? 'Unpaid rental balance' : 'Open requests'}</p></button>)}</div>
              <section className="flex flex-wrap gap-2 rounded-2xl border border-[#E4DFD3] bg-white p-4"><button onClick={() => setPage('find')} className="rounded-xl bg-[#142D4E] px-4 py-2.5 text-xs font-bold text-white">Find a House</button><button onClick={() => setPage('applications')} className="rounded-xl border border-[#E4DFD3] px-4 py-2.5 text-xs font-bold text-[#142D4E]">View Applications</button>{stage === 'moved_in' && upcoming && <button onClick={() => setPage('payments')} className="rounded-xl border border-[#E4DFD3] px-4 py-2.5 text-xs font-bold text-[#142D4E]">Pay Rent</button>}{stage === 'moved_in' && <button onClick={() => setPage('maintenance')} className="rounded-xl border border-[#E4DFD3] px-4 py-2.5 text-xs font-bold text-[#142D4E]">Report a Problem</button>}</section>
              {stage === 'moved_in' && activeTenancies.map((row) => <PropertySummary key={row.tenancy_id} row={row} image={propertyImage(row)} onOpen={() => setPage('tenancy')} />)}
              {stage === 'searching' && <Empty text="You don't have an active rental yet. Explore available properties and find a place that feels like home." action="Find a House" onClick={() => setPage('find')} />}
              {(stage === 'moved_in' || stage === 'approved') && upcoming && <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E4DFD3] bg-white p-5"><div><p className="text-xs font-bold uppercase tracking-wide text-[#9C7C3E]">{stage === 'approved' ? 'Initial rent / deposit payment' : 'Upcoming rent payment'}</p><p className="mt-1 font-heading text-2xl font-bold text-[#142D4E]">{fmtMoney(outstandingFor(upcoming), upcoming.currency)}</p><p className="text-xs text-slate-500">{upcoming.payment_description} · {upcoming.property_title || upcoming.property_address} · due {shortDate(upcoming.payment_due_date)} · {paymentDueLabel(upcoming.payment_due_date, upcoming.payment_status)}</p></div><button onClick={() => setPage('payments')} className="rounded-xl bg-[#142D4E] px-5 py-3 text-sm font-bold text-white">Pay now</button></section>}
              <section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Recent activity</h2>{recentActivity.length ? recentActivity.map((activity) => <div key={activity.id} className="mt-3 rounded-xl bg-[#F7F5F0] p-3"><p className="text-sm font-semibold capitalize text-[#142D4E]">{activity.title}</p><p className="text-xs text-slate-500">{activity.detail} · {formatDateTime(activity.date)}</p></div>) : <p className="mt-3 text-xs text-slate-500">Your recent rental activity will appear here.</p>}</section>
              <div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Recent applications</h2><button onClick={() => setPage('applications')} className="text-xs font-bold text-[#9C7C3E]">View all</button></div>{uniqueApplications.length ? uniqueApplications.slice(0,4).map((row) => <button key={row.application_id} onClick={() => setSelectedApplication(row)} className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-[#F7F5F0] p-3 text-left"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#142D4E]">{row.property_title || row.property_address}</p><p className="truncate text-xs text-slate-500">{row.property_address} · Applied {formatDateTime(row.application_created_at)}</p><p className="text-xs text-slate-500">Updated {formatDateTime(row.application_updated_at)}</p></div><span className={badge}>{applicationDisplayStatus(row)}</span></button>) : <Empty text="No applications yet. Start exploring available properties." action="Find a house" onClick={() => setPage('find')} />}</section><section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Recent notifications</h2><button onClick={() => setPage('notifications')} className="text-xs font-bold text-[#9C7C3E]">View all</button></div>{notifications.slice(0,3).map((note) => <button key={note.id} onClick={() => void openNotification(note)} className={`mt-3 block w-full rounded-xl p-3 text-left ${note.read_at ? 'bg-white' : 'bg-[#F7F5F0]'}`}><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-[#142D4E]">{note.title}</p>{!note.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#9C7C3E]" aria-label="Unread"/>}</div><p className="mt-1 line-clamp-2 text-xs text-slate-500">{note.body}</p><p className="mt-1 text-[10px] text-slate-400">{formatDateTime(note.created_at)}</p></button>)}{!notifications.length && <Empty text="You are all caught up." />}</section></div>
            </>}

            {page === 'find' && <section className="space-y-4"><div className="grid gap-2 rounded-2xl border border-[#E4DFD3] bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"><label className="text-xs font-semibold">Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Property or location" className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2" /></label><label className="text-xs font-semibold">City or area<input value={city} onChange={(event) => setCity(event.target.value)} placeholder="e.g. Lagos" className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2" /></label><label className="text-xs font-semibold">Minimum rent<input type="number" min="0" value={minRent} onChange={(event) => setMinRent(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2" /></label><label className="text-xs font-semibold">Maximum monthly rent<input type="number" value={maxRent} onChange={(event) => setMaxRent(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2" /></label><label className="text-xs font-semibold">Bedrooms<input type="number" min="0" value={minBeds} onChange={(event) => setMinBeds(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2" /></label><label className="text-xs font-semibold">Property type<select value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"><option value="">All types</option>{Array.from(new Set(listings.map((listing) => listing.properties.property_type).filter(Boolean))).sort().map((type) => <option key={type} value={type}>{type}</option>)}</select></label></div>{filteredListings.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredListings.map((listing) => <article key={listing.id} className="overflow-hidden rounded-2xl border border-[#E4DFD3] bg-white"><div className="relative h-48"><ImageWithFallback src={listing.properties.image_urls?.[0] || ''} alt={listing.properties.title} className="h-full w-full object-cover"/><button onClick={() => void toggleSave(listing)} aria-label="Save property" className="absolute right-3 top-3 rounded-full bg-white p-2 text-rose-700 shadow"><Heart className={`h-4 w-4 ${savedIds.includes(listing.id) ? 'fill-current' : ''}`} /></button></div><div className="p-4"><p className="text-xs text-slate-500">{listing.properties.neighborhood || listing.properties.city}</p><h3 className="mt-1 font-heading text-lg font-bold text-[#142D4E]">{listing.properties.title}</h3><p className="mt-1 text-sm font-bold text-[#9C7C3E]">{fmtMoney(listing.rent_amount_minor, listing.currency)} / {listing.rent_frequency}</p><p className="mt-2 text-xs text-slate-600">{listing.properties.bedrooms} beds · {listing.properties.bathrooms} baths · {listing.properties.property_type || 'Rental'}</p><div className="mt-4 flex gap-2"><button onClick={() => setSelectedListing(listing)} className="flex-1 rounded-xl border border-[#E4DFD3] px-3 py-2 text-xs font-bold text-[#142D4E]">Details</button><button onClick={() => setApplicationListing(listing)} className="flex-1 rounded-xl bg-[#142D4E] px-3 py-2 text-xs font-bold text-white">Apply</button></div></div></article>)}</div> : <Empty text="No available rentals match these filters. Try changing your search."/>}</section>}

            {page === 'applications' && <section className="space-y-3">{uniqueApplications.length ? uniqueApplications.map((row) => <article key={row.application_id} className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{row.property_title || row.property_address}</p><h2 className="mt-1 font-heading text-lg font-bold text-[#142D4E]">Application · {shortDate(row.application_created_at || row.desired_move_in)}</h2><p className="mt-1 text-xs text-slate-500">Contact: {row.landlord_name || 'Property owner'} · Last updated {shortDate(row.application_updated_at || row.desired_move_in)}</p></div><span className={badge}>{applicationDisplayStatus(row)}</span></div><ol className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{['Submitted','Review','Approved','Agreement','Payment','Move-in'].map((step, index) => { const active = applicationStep(row) >= index; return <li key={step} className={`rounded-xl p-3 text-xs ${active ? 'bg-[#EAF2ED] text-emerald-900' : 'bg-[#F7F5F0] text-slate-500'}`}><CheckCircle2 className="mb-1 h-4 w-4" />{step}</li>; })}</ol><button onClick={() => setSelectedApplication(row)} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#9C7C3E]">View application and updates <ChevronRight className="h-4 w-4"/></button></article>) : <Empty text="You have not submitted an application yet." action="Find a house" onClick={() => setPage('find')} />}</section>}

            {page === 'saved' && <section className="space-y-4">{savedListings.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{savedListings.map((listing) => <article key={listing.id} className="overflow-hidden rounded-2xl border border-[#E4DFD3] bg-white"><div className="h-48"><ImageWithFallback src={listing.properties.image_urls?.[0] || ''} alt={listing.properties.title} className="h-full w-full object-cover"/></div><div className="p-4"><p className="text-xs text-slate-500">{listing.properties.neighborhood || listing.properties.city}</p><h2 className="mt-1 font-heading text-lg font-bold text-[#142D4E]">{listing.properties.title}</h2><p className="mt-1 text-sm font-bold text-[#9C7C3E]">{fmtMoney(listing.rent_amount_minor,listing.currency)} / {listing.rent_frequency}</p><p className="mt-2 text-xs text-slate-500">Available · {listing.properties.bedrooms} beds · {listing.properties.bathrooms} baths</p><div className="mt-4 flex gap-2"><button onClick={() => setSelectedListing(listing)} className="flex-1 rounded-xl border border-[#E4DFD3] px-3 py-2 text-xs font-bold">View property</button><button onClick={() => void toggleSave(listing)} className="flex-1 rounded-xl border border-[#E4DFD3] px-3 py-2 text-xs font-bold text-rose-700">Remove saved</button><button onClick={() => setApplicationListing(listing)} className="flex-1 rounded-xl bg-[#142D4E] px-3 py-2 text-xs font-bold text-white">Apply</button></div></div></article>)}</div> : <Empty text="You have no saved rental properties yet." action="Find a house" onClick={() => setPage('find')} />}</section>}
            {page === 'tenancy' && <>{activeTenancy ? <><PropertySummary row={activeTenancy} image={propertyImage(activeTenancy)} onOpen={() => setPage('agreement')} /><div className="grid gap-4 lg:grid-cols-2"><InfoCard title="Lease details" items={[["Status",txt(activeTenancy.tenancy_status)],['Rent',`${fmtMoney(activeTenancy.rent_amount_minor,activeTenancy.currency)} / ${activeTenancy.rent_frequency || 'month'}`],['Security deposit',fmtMoney(activeTenancy.deposit_amount_minor,activeTenancy.currency)],['Lease starts',shortDate(activeTenancy.lease_start)],['Lease ends',shortDate(activeTenancy.lease_end)],['Rent due day',txt(activeTenancy.payment_due_day) || 'As agreed'],['Landlord',txt(activeTenancy.landlord_name)],['Landlord contact',txt(activeTenancy.landlord_email)]]}/><section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Tenancy requests</h2><form onSubmit={submitTenancyRequest} className="mt-3 space-y-3"><label className="block text-xs font-semibold">Request type<select name="request_type" className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"><option value="renewal">Request lease renewal</option><option value="termination">Request tenancy termination</option></select></label><label className="block text-xs font-semibold">Details<textarea name="reason" required minLength={10} maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2" placeholder="Tell your landlord about your request" /></label><button disabled={busy} className="rounded-xl bg-[#142D4E] px-4 py-2 text-xs font-bold text-white">Send request</button></form><div className="mt-4 space-y-2">{tenancyRequests.filter((request) => request.tenancy_id === activeTenancy.tenancy_id).map((request) => <div key={request.id} className="rounded-xl bg-[#F7F5F0] p-3 text-xs"><p className="font-semibold capitalize text-[#142D4E]">{request.request_type} · {request.status}</p><p className="mt-1 text-slate-600">{request.reason}</p><p className="mt-1 text-slate-400">{shortDate(request.created_at)}</p></div>)}</div></section><section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Move-in checklist</h2><p className="mt-2 text-sm text-slate-600">Status: {txt(activeTenancy.move_in_status) || 'not available'}</p><p className="mt-1 text-xs text-slate-500">Keys: {activeTenancy.keys_handed_over ? 'confirmed' : 'not confirmed'} · Meter readings: {JSON.stringify(activeTenancy.meter_readings || {})}</p><p className="mt-3 text-xs text-slate-500">{activeTenancy.outstanding_issues || 'No handover issues recorded.'}</p>{activeTenancy.signed_document_path && <button onClick={() => void openDocument(activeTenancy.signed_document_path)} className="mt-4 rounded-xl bg-[#142D4E] px-4 py-2 text-xs font-bold text-white">View lease</button>}</section></div></> : <Empty text={onboarding ? 'Your tenancy activates after signatures, verified payments, confirmed handover and the lease start date.' : 'No active tenancy is linked to your account yet.'} action={onboarding ? 'View onboarding' : 'Find a house'} onClick={() => setPage(onboarding ? 'agreement' : 'find')}/>}</>}

            {page === 'payments' && <><div className="grid gap-3 sm:grid-cols-3"><InfoCard title="Rent and deposit" items={[["Rent",fmtMoney(tenancy?.rent_amount_minor,tenancy?.currency)],["Deposit",fmtMoney(tenancy?.deposit_amount_minor,tenancy?.currency)],["Status",txt(tenancy?.payment_status) || 'No payment due']]} /></div><section className="overflow-hidden rounded-2xl border border-[#E4DFD3] bg-white"><div className="border-b border-[#E4DFD3] p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Payment breakdown & history</h2></div>{applications.filter((row) => row.payment_obligation_id).map((row) => <div key={row.payment_obligation_id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4DFD3] p-4"><div><p className="font-semibold text-[#142D4E]">{row.payment_description}</p><p className="mt-1 text-xs text-slate-500">Due {shortDate(row.payment_due_date)} · {txt(row.payment_status)}</p>{row.payment_receipt && <p className="mt-1 text-xs text-emerald-800">Receipt {row.payment_receipt}</p>}{Array.isArray(row.payment_history) && row.payment_history.map((payment: Row, index: number) => <p key={index} className="mt-1 text-[11px] text-slate-500">{shortDate(payment.created_at)} · {txt(payment.status)} · {fmtMoney(payment.amount_minor,row.currency)}{payment.receipt_number ? ` · ${payment.receipt_number}` : ''}</p>)}</div>{!['success','verified_external'].includes(txt(row.payment_status)) && row.agreement_status === 'signed' && <button disabled={busy} onClick={() => void pay(row.payment_obligation_id)} className="rounded-xl bg-[#142D4E] px-4 py-2.5 text-xs font-bold text-white">Pay {fmtMoney(row.payment_amount_minor,row.currency)}</button>}</div>)}{!applications.some((row) => row.payment_obligation_id) && <p className="p-5 text-sm text-slate-500">Payment schedule appears after an agreement is signed.</p>}</section></>}

            {page === 'agreement' && <section className="space-y-3">{uniqueApplications.map((row) => <article key={row.application_id} className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{row.property_title || row.property_address}</p><h2 className="mt-1 font-heading text-lg font-bold text-[#142D4E]">Rental agreement</h2></div><span className={badge}>{txt(row.agreement_status) || 'not started'}</span></div><p className="mt-3 text-sm text-slate-600">Landlord signature: {txt(row.landlord_signature_status) || 'pending'} · Your signature: {txt(row.renter_signature_status) || 'pending'}</p><p className="mt-1 text-xs text-slate-500">Lease: {shortDate(row.lease_start)} – {shortDate(row.lease_end)} · Rent {fmtMoney(row.rent_amount_minor,row.currency)} · Deposit {fmtMoney(row.deposit_amount_minor,row.currency)}</p>{row.signed_document_path && <button onClick={() => void openDocument(row.signed_document_path)} className="mt-4 rounded-xl bg-[#142D4E] px-4 py-2.5 text-xs font-bold text-white">View / download signed agreement</button>}{['pending_signature','partially_signed'].includes(txt(row.agreement_status)) && <p className="mt-3 text-xs text-slate-500">Signing request sent by the e-signature provider. Follow the secure link in the provider's email; status updates after its verified callback.</p>}{row.agreement_status === 'signed' && row.move_in_id && row.tenancy_status !== 'active' && (canConfirmHandover(row) ? <TenantMoveInForm row={row} busy={busy} onSubmit={(event) => void confirmRenterHandover(row, event)} /> : <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Move-in handover becomes available after all initial payments are verified.</p>)}</article>)}{!uniqueApplications.some((row) => row.agreement_id) && <Empty text="An agreement will appear here if an application is approved." action="View applications" onClick={() => setPage('applications')} />}</section>}

            {page === 'maintenance' && <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_1.2fr]">{activeTenancy ? <form onSubmit={submitMaintenance} className="space-y-3 rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Report a problem</h2><label className="block text-xs font-semibold">Request title<input name="title" required maxLength={120} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"/></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Category<select name="category" className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2">{['plumbing','electrical','structural','security','appliance','general','other'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="text-xs font-semibold">Priority<select name="priority" className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2">{['low','normal','high','urgent'].map((item) => <option key={item}>{item}</option>)}</select></label></div><label className="block text-xs font-semibold">Describe the issue<textarea name="description" required minLength={10} maxLength={3000} rows={4} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"/></label><label className="block text-xs font-semibold">Photo or video (optional)<input name="attachment" type="file" accept="image/jpeg,image/png,image/webp,video/mp4" className="mt-1 block w-full text-xs"/></label><button disabled={busy} className="rounded-xl bg-[#142D4E] px-4 py-2.5 text-xs font-bold text-white">Submit request</button></form> : <Empty text="Maintenance requests are available once your tenancy is active."/>}<section className="space-y-3"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Your requests</h2>{maintenance.map((item) => <article key={item.id} className="rounded-2xl border border-[#E4DFD3] bg-white p-4"><div className="flex justify-between gap-3"><div><p className="font-semibold text-[#142D4E]">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.properties?.title} · {shortDate(item.created_at)} · {item.category}</p></div><span className={badge}>{item.status.replaceAll('_',' ')}</span></div>{item.description && <p className="mt-3 text-sm text-slate-600">{item.description}</p>}{item.resolution_notes && <p className="mt-2 text-xs text-slate-500">Update: {item.resolution_notes}</p>}</article>)}{!maintenance.length && <p className="rounded-xl bg-white p-4 text-sm text-slate-500">No maintenance requests submitted.</p>}</section></div>}

            {page === 'messages' && <section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Landlord messages</h2>{tenancy ? <><p className="mt-1 text-xs text-slate-500">Conversation with {tenancy.landlord_name || 'your landlord'} · {tenancy.landlord_email}</p><div className="my-4 max-h-[420px] space-y-2 overflow-y-auto rounded-xl bg-[#F7F5F0] p-4">{messages.filter((message) => message.tenancy_id === tenancy.tenancy_id).map((message) => <div key={message.id} className={`max-w-[85%] rounded-xl p-3 text-sm ${message.sender_id === user.id ? 'ml-auto bg-[#142D4E] text-white' : 'bg-white text-[#142D4E]'}`}><p>{message.body}</p><p className="mt-1 text-[10px] opacity-70">{shortDate(message.created_at)} · {message.sender?.full_name || (message.sender_id === user.id ? 'You' : 'Landlord')}</p></div>)}{!messages.some((message) => message.tenancy_id === tenancy.tenancy_id) && <p className="text-xs text-slate-500">No messages yet.</p>}</div><form onSubmit={sendMessage} className="flex gap-2"><input value={messageText} onChange={(event) => setMessageText(event.target.value)} maxLength={5000} placeholder="Write a message to your landlord" className="min-w-0 flex-1 rounded-xl border border-[#E4DFD3] px-3 py-2 text-sm"/><button disabled={busy || !messageText.trim()} className="rounded-xl bg-[#142D4E] px-4 py-2 text-xs font-bold text-white">Send</button></form></> : <Empty text="Messaging opens when an approved application creates a tenancy onboarding record."/>}</section>}

            {page === 'notifications' && <section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-heading text-lg font-bold text-[#142D4E]">Notification centre</h2><p className="text-xs text-slate-500">{notifications.filter((item) => !item.read_at).length} unread</p></div>{notifications.some((item) => !item.read_at) && <button disabled={busy} onClick={() => void markAllRead()} className="text-xs font-bold text-[#9C7C3E]">Mark all read</button>}</div><div className="mt-3 space-y-2">{notifications.map((note) => <button key={note.id} onClick={() => void openNotification(note)} className={`block w-full rounded-xl p-4 text-left ${note.read_at ? 'bg-white' : 'bg-[#F7F5F0]'}`}><div className="flex justify-between gap-3"><p className="text-sm font-semibold text-[#142D4E]">{note.title}</p><span className="text-[10px] text-slate-500">{new Date(note.created_at).toLocaleString()}</span></div><p className="mt-1 text-xs text-slate-600">{note.body}</p></button>)}{!notifications.length && <Empty text="No notifications yet."/>}</div></section>}

            {page === 'profile' && <form onSubmit={saveProfile} className="max-w-2xl space-y-4 rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Personal details</h2><div className="flex items-center gap-4"><div className="h-16 w-16 overflow-hidden rounded-full bg-[#F7F5F0]">{profilePhotoUrl ? <ImageWithFallback src={profilePhotoUrl} alt="Your profile" className="h-full w-full object-cover"/> : <UserRound className="m-4 h-8 w-8 text-[#9C7C3E]"/>}</div><label className="text-xs font-semibold">Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={saveProfilePhoto} className="mt-1 block w-full text-xs"/><span className="font-normal text-slate-500">JPG, PNG or WebP · up to 5 MB</span></label></div><label className="block text-xs font-semibold">Full name<input name="full_name" required defaultValue={profile.full_name || user.name} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"/></label><label className="block text-xs font-semibold">Email address<input value={profile.email || user.email} readOnly className="mt-1 w-full rounded-lg border border-[#E4DFD3] bg-slate-50 px-3 py-2 text-slate-500"/></label><label className="block text-xs font-semibold">Phone<input name="phone" defaultValue={profile.phone || ''} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"/></label><label className="block text-xs font-semibold">Residential address<input name="residential_address" defaultValue={profile.residential_address || ''} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"/></label><p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-[#9C7C3E]"/>Identity verification: {profile.identity_verification_status || 'not started'}. No identity documents are stored on this page.</p><button disabled={busy} className="rounded-xl bg-[#142D4E] px-4 py-2.5 text-xs font-bold text-white">Save profile</button></form>}

            {page === 'settings' && <form onSubmit={savePreferences} className="max-w-2xl space-y-4 rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Notification preferences</h2>{[['email_notifications','Email notifications'],['payment_reminders','Payment reminders'],['maintenance_updates','Maintenance updates'],['message_notifications','Message notifications']].map(([key,label]) => <label key={key} className="flex items-center justify-between rounded-xl bg-[#F7F5F0] p-4 text-sm"><span>{label}</span><input type="checkbox" name={key} defaultChecked={preferences[key] !== false} /></label>)}<p className="text-xs text-slate-500">Password and account-security changes are managed by the secure sign-in provider.</p><button disabled={busy} className="rounded-xl bg-[#142D4E] px-4 py-2.5 text-xs font-bold text-white">Save preferences</button></form>}
          </>}
        </main>
      </div>
    </div>
    {selectedListing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" role="dialog" aria-modal="true" aria-label="Property details"><div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white"><div className="h-56"><ImageWithFallback src={selectedListing.properties.image_urls?.[0] || ''} alt={selectedListing.properties.title} className="h-full w-full object-cover"/></div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{selectedListing.properties.neighborhood}, {selectedListing.properties.city}</p><h2 className="font-heading text-2xl font-bold text-[#142D4E]">{selectedListing.properties.title}</h2></div><button onClick={() => setSelectedListing(null)} className="rounded-lg border px-3 py-1" aria-label="Close">Ã—</button></div><p className="mt-2 text-lg font-bold text-[#9C7C3E]">{fmtMoney(selectedListing.rent_amount_minor, selectedListing.currency)} / {selectedListing.rent_frequency}</p><p className="mt-2 text-sm text-slate-600">{selectedListing.properties.address}</p><p className="mt-3 text-sm text-slate-700">{selectedListing.properties.description || 'Contact the property owner for more details.'}</p><p className="mt-3 text-xs text-slate-500">{selectedListing.properties.bedrooms} bedrooms · {selectedListing.properties.bathrooms} bathrooms · {selectedListing.properties.property_type} · Deposit {fmtMoney(selectedListing.deposit_amount_minor, selectedListing.currency)}</p><button onClick={() => { setApplicationListing(selectedListing); setSelectedListing(null); }} className="mt-5 w-full rounded-xl bg-[#142D4E] px-4 py-3 text-sm font-bold text-white">Apply for this home</button></div></div></div>}
    {selectedApplication && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" role="dialog" aria-modal="true" aria-label="Application details"><div className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{selectedApplication.property_title || selectedApplication.property_address}</p><h2 className="font-heading text-xl font-bold text-[#142D4E]">Application details</h2></div><button onClick={() => setSelectedApplication(null)} className="rounded-lg border px-3 py-1" aria-label="Close">Ã—</button></div><p className="mt-3 text-sm">Status: <strong>{applicationDisplayStatus(selectedApplication)}</strong></p><p className="mt-1 text-xs text-slate-500">Submitted {shortDate(selectedApplication.application_created_at)} · Updated {shortDate(selectedApplication.application_updated_at)} · Preferred move-in {shortDate(selectedApplication.desired_move_in)}</p><p className="mt-3 text-sm text-slate-600">Landlord: {selectedApplication.landlord_name || 'Property owner'} {selectedApplication.landlord_email ? `· ${selectedApplication.landlord_email}` : ''}</p>{selectedApplication.occupation && <p className="mt-2 text-sm text-slate-600">Occupation: {selectedApplication.occupation}</p>}{selectedApplication.message && <p className="mt-2 rounded-xl bg-[#F7F5F0] p-3 text-sm text-slate-700">{selectedApplication.message}</p>}<ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">{['Submitted','Review','Approved','Agreement','Payment','Move-in'].map((step, index) => <li key={step} className={`rounded-xl p-3 text-xs ${applicationStep(selectedApplication) >= index ? 'bg-[#EAF2ED] text-emerald-900' : 'bg-[#F7F5F0] text-slate-500'}`}><CheckCircle2 className="mb-1 h-4 w-4"/>{step}</li>)}</ol>{selectedApplication.application_status === 'approved' && <div className="mt-5 flex gap-2"><button onClick={() => { setPage('agreement'); setSelectedApplication(null); }} className="flex-1 rounded-xl border px-3 py-2 text-xs font-bold">View agreement</button><button onClick={() => { setPage('payments'); setSelectedApplication(null); }} className="flex-1 rounded-xl bg-[#142D4E] px-3 py-2 text-xs font-bold text-white">View payments</button></div>}</div></div>}
    {applicationListing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"><div className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-5"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">Apply for</p><h2 className="font-heading text-xl font-bold text-[#142D4E]">{applicationListing.properties.title}</h2><p className="text-sm text-[#9C7C3E]">{fmtMoney(applicationListing.rent_amount_minor,applicationListing.currency)} / {applicationListing.rent_frequency}</p></div><button onClick={() => setApplicationListing(null)} aria-label="Close">Ã—</button></div><form onSubmit={apply} className="mt-4 space-y-3"><label className="block text-xs font-semibold">Phone<input name="phone" type="tel" required defaultValue={profile.phone || ''} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"/></label><label className="block text-xs font-semibold">Occupation<input name="occupation" required minLength={2} maxLength={100} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"/></label><label className="block text-xs font-semibold">Preferred move-in date<input name="desiredMoveIn" type="date" required min={new Date().toISOString().slice(0,10)} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"/></label><label className="block text-xs font-semibold">Message to landlord<textarea name="message" maxLength={1000} rows={3} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"/></label><button disabled={busy} className="w-full rounded-xl bg-[#142D4E] px-4 py-3 text-sm font-bold text-white">Submit application</button></form></div></div>}
  </div>;
};

function applicationStep(row: Row) { if (row.tenancy_status === 'active') return 5; if (row.move_in_status === 'confirmed') return 5; if (row.payment_status === 'paid' || row.payment_status === 'partially_paid' || row.payment_status === 'success') return 4; if (row.agreement_status === 'signed' || row.agreement_status === 'partially_signed' || row.agreement_status === 'pending_signature') return 3; if (row.application_status === 'approved') return 2; if (row.application_status === 'under_review') return 1; return 0; }
function applicationDisplayStatus(row: Row) { if (row.tenancy_status === 'active') return 'Tenancy active'; if (row.application_status === 'approved' && !row.agreement_id) return 'Approved · agreement pending'; if (row.application_status === 'approved' && row.agreement_status !== 'signed') return `Approved · agreement ${txt(row.agreement_status || 'pending')}`; if (row.agreement_status === 'signed' && !['success','verified_external','paid'].includes(txt(row.payment_status))) return 'Payment pending'; return txt(row.application_status).replaceAll('_',' ') || 'Submitted'; }

function TenantMoveInForm({ row, busy, onSubmit }: { row: Row; busy: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-[#E4DFD3] bg-[#F7F5F0] p-4">
    <h3 className="font-semibold text-[#142D4E]">Arrange move-in and confirm handover</h3>
    <p className="mt-1 text-xs text-slate-600">Your landlord will also confirm the handover. A property-condition photo and both confirmations are required before activation.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-semibold">Agreed move-in date<input name="moveInDate" type="date" required min={new Date().toISOString().slice(0, 10)} defaultValue={row.move_in_date || row.lease_start || ''} className="mt-1 block rounded-lg border border-[#E4DFD3] p-2" /></label>
      <label className="text-xs font-semibold">Condition photo<input name="conditionPhoto" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1 block max-w-full text-xs" /></label>
      {(['electricity', 'water', 'gas'] as const).map((meter) => <label key={meter} className="text-xs font-semibold capitalize">{meter} meter reading<input name={`${meter}Reading`} maxLength={80} className="mt-1 block w-full rounded-lg border border-[#E4DFD3] p-2" /></label>)}
      <label className="text-xs font-semibold sm:col-span-2">Existing issues or notes<textarea name="issues" rows={2} maxLength={2000} className="mt-1 block w-full rounded-lg border border-[#E4DFD3] p-2" /></label>
    </div>
    <label className="mt-3 block text-xs"><input name="keysHandedOver" type="checkbox" className="mr-2" />Keys received</label>
    <label className="mt-2 block text-xs"><input name="conditionConfirmed" type="checkbox" required className="mr-2" />I reviewed and confirm the recorded property condition</label>
    <button disabled={busy} className="mt-3 rounded-lg bg-[#142D4E] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Confirm my handover'}</button>
  </form>;
}

function ProgressCard({ row, onAgreement, onPayment }: { row: Row; onAgreement: () => void; onPayment: () => void }) { const step = applicationStep(row); const labels = ['Application submitted','Landlord review','Application approved','Agreement signing','Initial payment','Move-in & activation']; return <section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase text-[#9C7C3E]">Move-in progress</p><h3 className="mt-1 font-heading text-lg font-bold text-[#142D4E]">{row.property_title || row.property_address}</h3></div><span className={badge}>{txt(row.application_status).replaceAll('_',' ')}</span></div><ol className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{labels.map((label,index)=><li key={label} className={`rounded-xl p-3 text-xs ${index<=step?'bg-[#EAF2ED] text-emerald-900':'bg-[#F7F5F0] text-slate-500'}`}><CheckCircle2 className="mb-1 h-4 w-4"/>{label}</li>)}</ol><div className="mt-4 flex gap-2"><button onClick={onAgreement} className="rounded-lg border border-[#E4DFD3] px-3 py-2 text-xs font-bold">Review agreement</button><button onClick={onPayment} className="rounded-lg bg-[#142D4E] px-3 py-2 text-xs font-bold text-white">View payments</button></div></section>; }

function PropertySummary({ row, image, onOpen }: { row: Row; image: string; onOpen: () => void }) { return <section className="overflow-hidden rounded-2xl border border-[#E4DFD3] bg-white md:flex"><div className="h-48 md:h-auto md:w-2/5"><ImageWithFallback src={image} alt={row.property_title || 'Rental home'} className="h-full w-full object-cover"/></div><div className="flex-1 p-5"><p className="text-xs font-semibold uppercase text-[#9C7C3E]">Current rental property</p><h2 className="mt-1 font-heading text-2xl font-bold text-[#142D4E]">{row.property_title || row.property_address}</h2><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4"/>{row.property_address}</p><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><p>Type <strong className="block text-[#142D4E]">{row.property_type || 'Rental'}</strong></p><p>Status <strong className="block capitalize text-[#142D4E]">{txt(row.tenancy_status).replaceAll('_',' ')}</strong></p><p>Lease starts <strong className="block text-[#142D4E]">{shortDate(row.lease_start)}</strong></p><p>Lease ends <strong className="block text-[#142D4E]">{shortDate(row.lease_end)}</strong></p><p>Landlord <strong className="block text-[#142D4E]">{row.landlord_name}</strong></p><p>Bedrooms / baths <strong className="block text-[#142D4E]">{row.bedrooms} / {row.bathrooms}</strong></p></div><button onClick={onOpen} className="mt-4 text-xs font-bold text-[#9C7C3E]">Manage tenancy →</button></div></section>; }

function InfoCard({ title, items }: { title: string; items: [string,string][] }) { return <section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">{title}</h2><dl className="mt-3 space-y-2">{items.map(([label,value])=><div key={label} className="flex justify-between gap-4 text-sm"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold text-[#142D4E]">{value}</dd></div>)}</dl></section>; }

function Empty({ text, action, onClick }: { text: string; action?: string; onClick?: () => void }) { return <div className="rounded-2xl border border-dashed border-[#D8D0C0] bg-white p-7 text-center"><Building2 className="mx-auto h-8 w-8 text-[#C5A46D]"/><p className="mt-2 text-sm text-slate-500">{text}</p>{action && onClick && <button onClick={onClick} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#9C7C3E]">{action}<ChevronRight className="h-4 w-4"/></button>}</div>; }

