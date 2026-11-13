import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Bell, Building2, CalendarDays, CheckCircle2, ClipboardList, FileText, Home, LogOut, MessageCircle, Settings, TrendingUp, UserPlus, Users } from 'lucide-react';
import { UserProfile } from '../types';
import { ImageWithFallback } from './ImageWithFallback';
import { createPrivateDocumentLink, isSupabaseConfigured, listWorkflowNotifications, markWorkflowNotificationRead, patchWorkflowRows, selectWorkflowRows, uploadTenantProfilePhoto, WorkflowNotification } from '../services/supabaseWorkflow';

type AgentPage = 'overview' | 'properties' | 'enquiries' | 'leads' | 'viewings' | 'applications' | 'transactions' | 'messages' | 'notifications' | 'profile' | 'performance' | 'settings';
type Row = Record<string, any>;
const AGENT_NAV: { id: AgentPage; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Dashboard', icon: Home }, { id: 'properties', label: 'My Properties', icon: Building2 },
  { id: 'enquiries', label: 'Property Enquiries', icon: MessageCircle }, { id: 'leads', label: 'Leads & Clients', icon: Users },
  { id: 'viewings', label: 'Property Viewings', icon: CalendarDays }, { id: 'applications', label: 'Rental Applications', icon: ClipboardList },
  { id: 'transactions', label: 'Sales & Transactions', icon: FileText }, { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'notifications', label: 'Notifications', icon: Bell }, { id: 'profile', label: 'My Profile', icon: Users },
  { id: 'performance', label: 'Performance & Earnings', icon: TrendingUp }, { id: 'settings', label: 'Settings', icon: Settings },
];
const dateTime = (value: unknown) => value ? new Date(String(value)).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export const AgentDashboard: React.FC<{ user: UserProfile; onSignOut: () => void }> = ({ user, onSignOut }) => {
  const [page, setPage] = useState<AgentPage>('overview');
  const [profile, setProfile] = useState<Row>({});
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    if (!isSupabaseConfigured) { setProfile({ full_name: user.name, email: user.email }); setNotifications([]); setLoading(false); return; }
    try {
      const [profiles, notes] = await Promise.all([
        selectWorkflowRows<Row>('profiles', new URLSearchParams({ select: 'full_name,email,phone,profile_photo_path', id: `eq.${user.id}`, limit: '1' })),
        listWorkflowNotifications(),
      ]);
      setProfile(profiles[0] || {}); setNotifications(notes || []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load your agent workspace'); }
    finally { setLoading(false); }
  }, [user.id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let cancelled = false;
    if (!profile.profile_photo_path) { setPhotoUrl(''); return; }
    void createPrivateDocumentLink(profile.profile_photo_path).then((url) => { if (!cancelled) setPhotoUrl(url); }).catch(() => { if (!cancelled) setPhotoUrl(''); });
    return () => { cancelled = true; };
  }, [profile.profile_photo_path]);

  const unread = notifications.filter((item) => !item.read_at).length;
  const title = AGENT_NAV.find((item) => item.id === page)?.label || 'Dashboard';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = profile.full_name || user.name;
  const metrics = [
    ['Assigned Properties', '—', 'Assignment records are not configured', Building2, 'properties'],
    ['Active Listings', '—', 'Listing assignment records are not configured', Home, 'properties'],
    ['New Enquiries', '—', 'Enquiry records are not configured', MessageCircle, 'enquiries'],
    ['Active Leads', '—', 'Lead records are not configured', Users, 'leads'],
    ['Scheduled Viewings', '—', 'Agent viewing records are not configured', CalendarDays, 'viewings'],
    ['Completed Transactions', '—', 'Transaction attribution is not configured', CheckCircle2, 'transactions'],
  ] as const;
  const openNotice = async (note: WorkflowNotification) => {
    if (note.read_at) return;
    try { await markWorkflowNotificationRead(note.id); setNotifications((current) => current.map((item) => item.id === note.id ? { ...item, read_at: new Date().toISOString() } : item)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update notification'); }
  };
  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(''); setSuccess('');
    try {
      await patchWorkflowRows('profiles', new URLSearchParams({ id: `eq.${user.id}` }), { full_name: data.get('full_name'), phone: data.get('phone') });
      setSuccess('Profile updated.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save profile'); }
    finally { setBusy(false); }
  };
  const updatePhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP photo under 5 MB.'); event.target.value = ''; return; }
    setBusy(true); setError('');
    try { const path = await uploadTenantProfilePhoto(user.id, file); await patchWorkflowRows('profiles', new URLSearchParams({ id: `eq.${user.id}` }), { profile_photo_path: path }); setProfile((current) => ({ ...current, profile_photo_path: path })); setSuccess('Profile photo updated.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not upload photo'); }
    finally { setBusy(false); event.target.value = ''; }
  };
  const quickAction = (label: string) => {
    const target: Record<string, AgentPage> = { 'Add Property': 'properties', 'Add Client': 'leads', 'Schedule Viewing': 'viewings', 'Follow Up': 'leads' };
    if (label === 'Add Property') setNotice('Property submission needs an agent permission and assignment workflow. The current backend has neither, so this action is unavailable.');
    else if (label === 'Add Client') setNotice('Client creation needs an agent lead database and access rules. The current backend does not provide them.');
    else if (label === 'Schedule Viewing') setNotice('Scheduling requires agent viewing records and conflict checks. The current backend does not provide them.');
    setPage(target[label]);
  };
  const markAllRead = async () => {
    setBusy(true); setError('');
    try { await Promise.all(notifications.filter((item) => !item.read_at).map((item) => markWorkflowNotificationRead(item.id))); setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() }))); setSuccess('Notifications marked as read.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update notifications'); }
    finally { setBusy(false); }
  };

  const missingCopy: Record<Exclude<AgentPage, 'overview' | 'notifications' | 'profile' | 'settings'>, string> = {
    properties: 'Agent property assignments are not in the current database. No property records are shown until the platform can assign properties to your account.',
    enquiries: 'The current database has no property enquiry records or agent assignment rules.',
    leads: 'The current database has no agent lead or client records. Personal client details cannot be safely stored in this workspace yet.',
    viewings: 'The current database has no agent viewing scheduler, booking conflict checks or viewing outcome records.',
    applications: 'Rental applications exist, but there are no agent-property assignments or agent RLS policies. Applications are hidden until access can be scoped safely.',
    transactions: 'There is no sales transaction attribution or commission data in the current database. No financial figures are estimated here.',
    messages: 'The current messaging table is limited to tenant-landlord tenancy conversations. Agent conversations and their participant rules are not configured.',
    performance: 'Agent activity records and verified commission records are not configured. Performance figures remain unavailable until those sources exist.',
  };

  return <div className="min-h-[calc(100vh-80px)] bg-[#F7F5F0]"><div className="mx-auto max-w-[1600px] px-3 py-5 sm:px-5 lg:px-8 lg:py-8"><div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
    <aside className="h-fit rounded-2xl border border-[#E4DFD3] bg-white p-3 lg:sticky lg:top-24"><div className="mb-2 border-b border-[#E4DFD3] px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9C7C3E]">Aurelia Homes</p><p className="mt-1 text-sm font-bold text-[#142D4E]">Agent workspace</p></div><nav aria-label="Agent dashboard" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">{AGENT_NAV.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setPage(id); setNotice(''); }} aria-current={page === id ? 'page' : undefined} className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold lg:w-full ${page === id ? 'bg-[#142D4E] text-white' : 'text-slate-600 hover:bg-[#F7F5F0]'}`}><Icon className={`h-4 w-4 ${page === id ? 'text-[#D8BD8C]' : 'text-[#9C7C3E]'}`}/>{label}{id === 'notifications' && unread > 0 && <span className="ml-auto rounded-full bg-[#F3E8D2] px-1.5 py-0.5 text-[10px] text-[#142D4E]">{unread}</span>}</button>)}</nav><button onClick={onSignOut} className="mt-3 flex w-full items-center gap-2 border-t border-[#E4DFD3] px-3 py-3 text-left text-xs font-semibold text-slate-600"><LogOut className="h-4 w-4"/>Log out</button><p className="hidden px-3 pb-2 text-[10px] text-slate-500 lg:block">{displayName} · {user.email}</p></aside>
    <main className="min-w-0 space-y-5"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9C7C3E]">{page === 'overview' ? new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Agent workspace'}</p><h1 className="mt-1 font-heading text-3xl font-bold text-[#142D4E]">{page === 'overview' ? `${greeting}, ${displayName.split(' ')[0]}` : title}</h1><p className="mt-1 text-sm text-slate-500">{page === 'overview' ? 'Manage your properties, enquiries and clients from one place.' : title}</p></div><div className="flex items-center gap-2"><button onClick={() => setPage('notifications')} aria-label={`Notifications, ${unread} unread`} className="relative rounded-xl border border-[#E4DFD3] bg-white p-2.5"><Bell className="h-4 w-4 text-[#142D4E]"/>{unread > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-600"/>}</button><button onClick={() => setPage('profile')} className="h-10 w-10 overflow-hidden rounded-full border border-[#E4DFD3] bg-white" aria-label="My profile">{photoUrl ? <ImageWithFallback src={photoUrl} alt="Profile" className="h-full w-full object-cover"/> : <Users className="m-auto h-5 w-5 text-[#9C7C3E]"/>}</button></div></header>
      {!isSupabaseConfigured && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Agent dashboard preview. Live assignments, enquiries, viewings and client records require a configured Supabase project and agent-specific data permissions.</div>}{error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}<button onClick={() => void load()} className="ml-3 font-bold underline">Retry</button></div>}{success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div>}{notice && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{notice}</div>}
      {loading ? <div className="rounded-2xl border border-[#E4DFD3] bg-white p-8 text-sm text-slate-500">Loading your agent workspace…</div> : page === 'overview' ? <div className="space-y-5">
        <section className="rounded-3xl bg-[#142D4E] p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D8BD8C]">Real estate agent workspace</p><h2 className="mt-2 font-heading text-3xl font-bold">Your work, at a glance</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">Agent records will appear here when assignments, enquiries, leads and viewing workflows are connected.</p></section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value, description, Icon, destination]) => <button key={label} onClick={() => setPage(destination)} className="rounded-2xl border border-[#E4DFD3] bg-white p-4 text-left"><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Icon className="h-4 w-4 text-[#9C7C3E]"/>{label}</div><p className="mt-3 font-heading text-2xl font-bold text-[#142D4E]">{loading ? '…' : value}</p><p className="mt-1 text-[11px] text-slate-500">{description}</p></button>)}</section>
        <section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Quick actions</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{[['Add Property',Building2],['Add Client',UserPlus],['Schedule Viewing',CalendarDays],['Follow Up',MessageCircle]].map(([label, Icon]: any) => <button key={label} onClick={() => quickAction(label)} className="flex items-center gap-2 rounded-xl border border-[#E4DFD3] px-4 py-3 text-left text-xs font-semibold text-[#142D4E] hover:bg-[#F7F5F0]"><Icon className="h-4 w-4 text-[#9C7C3E]"/>{label}</button>)}</div></section>
        <section className="grid gap-4 xl:grid-cols-2"><AgentEmpty title="My Properties" text={missingCopy.properties} onClick={() => setPage('properties')}/><AgentEmpty title="Recent Property Enquiries" text={missingCopy.enquiries} onClick={() => setPage('enquiries')}/><AgentEmpty title="Upcoming Property Viewings" text={missingCopy.viewings} onClick={() => setPage('viewings')}/><AgentEmpty title="Recent Leads & Transactions" text={missingCopy.leads} onClick={() => setPage('leads')}/><section className="rounded-2xl border border-[#E4DFD3] bg-white p-5 xl:col-span-2"><div className="flex items-center justify-between"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Recent notifications</h2><button onClick={() => setPage('notifications')} className="text-xs font-bold text-[#9C7C3E]">View all</button></div>{notifications.slice(0,4).map((note) => <button key={note.id} onClick={() => void openNotice(note)} className={`mt-3 block w-full rounded-xl p-3 text-left ${note.read_at ? 'bg-white' : 'bg-[#F7F5F0]'}`}><div className="flex justify-between gap-3"><p className="text-sm font-semibold text-[#142D4E]">{note.title}</p>{!note.read_at && <span className="h-2 w-2 rounded-full bg-[#9C7C3E]"/>}</div><p className="mt-1 text-xs text-slate-600">{note.body}</p><p className="mt-1 text-[10px] text-slate-400">{dateTime(note.created_at)}</p></button>)}{notifications.length === 0 && <p className="mt-3 text-sm text-slate-500">No notifications yet.</p>}</section></section>
      </div> : page === 'notifications' ? <section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-heading text-lg font-bold text-[#142D4E]">Notifications</h2><p className="text-xs text-slate-500">{unread} unread</p></div>{unread > 0 && <button disabled={busy} onClick={() => void markAllRead()} className="text-xs font-bold text-[#9C7C3E]">Mark all read</button>}</div>{notifications.map((note) => <button key={note.id} onClick={() => void openNotice(note)} className={`mt-3 block w-full rounded-xl p-4 text-left ${note.read_at ? 'bg-white' : 'bg-[#F7F5F0]'}`}><p className="text-sm font-semibold text-[#142D4E]">{note.title}</p><p className="mt-1 text-xs text-slate-600">{note.body}</p><p className="mt-1 text-[10px] text-slate-400">{dateTime(note.created_at)}</p></button>)}{notifications.length === 0 && <p className="mt-4 text-sm text-slate-500">No notifications yet.</p>}</section> : page === 'profile' ? <form onSubmit={(event) => void saveProfile(event)} className="max-w-2xl space-y-4 rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Agent profile</h2><div className="flex items-center gap-4"><div className="h-16 w-16 overflow-hidden rounded-full bg-[#F7F5F0]">{photoUrl ? <ImageWithFallback src={photoUrl} alt="Agent profile" className="h-full w-full object-cover"/> : <Users className="m-4 h-8 w-8 text-[#9C7C3E]"/>}</div><label className="text-xs font-semibold">Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void updatePhoto(event)} disabled={!isSupabaseConfigured || busy} className="mt-1 block text-xs"/></label></div><label className="block text-xs font-semibold">Full name<input name="full_name" required defaultValue={profile.full_name || user.name} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"/></label><label className="block text-xs font-semibold">Email<input value={profile.email || user.email} readOnly className="mt-1 w-full rounded-lg border border-[#E4DFD3] bg-slate-50 px-3 py-2"/></label><label className="block text-xs font-semibold">Phone<input name="phone" defaultValue={profile.phone || ''} className="mt-1 w-full rounded-lg border border-[#E4DFD3] px-3 py-2"/></label><p className="text-xs text-slate-500">Agent ID, agency, service areas and verification status are not in the current profile schema.</p><button disabled={busy || !isSupabaseConfigured} className="rounded-xl bg-[#142D4E] px-4 py-2.5 text-xs font-bold text-white">Save profile</button></form> : page === 'settings' ? <section className="max-w-2xl rounded-2xl border border-[#E4DFD3] bg-white p-5"><h2 className="font-heading text-lg font-bold text-[#142D4E]">Account settings</h2><p className="mt-2 text-sm text-slate-600">Password and sign-in security are managed by the authentication provider. Agent notification preferences are not yet stored separately from tenant settings.</p></section> : <AgentEmpty title={title} text={missingCopy[page as keyof typeof missingCopy] || 'This section is not connected to an agent-specific data source yet.'} />}
    </main></div></div></div>;
};

function AgentEmpty({ title, text, onClick }: { title: string; text: string; onClick?: () => void }) {
  return <section className="rounded-2xl border border-[#E4DFD3] bg-white p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-[#F7F5F0] p-2"><Activity className="h-4 w-4 text-[#9C7C3E]"/></div><div className="min-w-0 flex-1"><h2 className="font-heading text-lg font-bold text-[#142D4E]">{title}</h2><p className="mt-2 text-sm text-slate-600">{text}</p>{onClick && <button onClick={onClick} className="mt-3 text-xs font-bold text-[#9C7C3E]">Open section →</button>}</div></div></section>;
}
