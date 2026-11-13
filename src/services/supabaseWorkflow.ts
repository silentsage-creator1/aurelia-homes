import { UserProfile } from '../types';

// Compatibility exports keep the existing dashboard imports stable while all
// requests now go through the Aurelia Node API backed by Namecheap PostgreSQL.
const API_URL = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const SESSION_KEY = 'aurelia_namecheap_session';

export const isSupabaseConfigured = Boolean(API_URL);

interface ApiSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  user: { id: string; email: string; user_metadata?: { full_name?: string; phone?: string } };
}

function readSession(): ApiSession | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) as ApiSession : null;
  } catch { return null; }
}

function saveSession(session: ApiSession) {
  const expiresAt = session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600);
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, expires_at: expiresAt }));
}

async function apiRequest<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  if (!API_URL) throw new Error('Set VITE_API_URL in your local .env file to the Namecheap API URL.');
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof Blob) && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (authenticated) headers.set('Authorization', `Bearer ${await getSupabaseAccessToken()}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    if (typeof body === 'string' && /<!doctype\s+html|<html[\s>]/i.test(body)) {
      throw new Error('The API URL returned a website page instead of an API response. Check that api.ijeshadigitalhub.com is assigned to the Node.js app in cPanel.');
    }
    const message = typeof body === 'object' && body ? (body.error || body.message) : body;
    throw new Error(String(message || `Request failed (${response.status})`));
  }
  return body as T;
}

export function hasSupabaseSession() { return Boolean(readSession()?.access_token); }

export async function loadCurrentSupabaseProfile(): Promise<UserProfile | null> {
  if (!readSession()) return null;
  try { return await apiRequest<UserProfile>('/api/auth/me', {}, true); }
  catch { sessionStorage.removeItem(SESSION_KEY); return null; }
}

export async function registerWithSupabase(email: string, password: string, fullName: string, phone: string) {
  const result = await apiRequest<ApiSession & { profile: UserProfile }>('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ email, password, fullName, phone }),
  });
  saveSession(result);
  return { user: result.profile, verificationRequired: false } as const;
}

export async function signInWithSupabase(email: string, password: string) {
  const result = await apiRequest<ApiSession & { profile: UserProfile }>('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  });
  saveSession(result);
  return result.profile;
}

export async function getSupabaseAccessToken(): Promise<string> {
  const session = readSession();
  if (!session) throw new Error('Sign in with your Aurelia account to continue.');
  if (!session.expires_at || session.expires_at * 1000 > Date.now() + 60_000) return session.access_token;
  const refreshed = await apiRequest<Omit<ApiSession, 'user'>>('/api/auth/refresh', {
    method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  saveSession({ ...session, ...refreshed });
  return refreshed.access_token;
}

export async function invokeWorkflow<T>(functionName: string, payload: Record<string, unknown>): Promise<T> {
  return apiRequest<T>(`/api/workflows/${encodeURIComponent(functionName)}`, { method: 'POST', body: JSON.stringify(payload) }, true);
}

export async function callWorkflowRpc<T>(functionName: string, payload: Record<string, unknown> = {}): Promise<T> {
  return apiRequest<T>(`/api/rpc/${encodeURIComponent(functionName)}`, { method: 'POST', body: JSON.stringify(payload) }, true);
}

export interface WorkflowNotification {
  id: string;
  title: string;
  body: string;
  action_path: string | null;
  created_at: string;
  read_at: string | null;
}

export function listWorkflowNotifications(): Promise<WorkflowNotification[]> {
  const query = new URLSearchParams({ select: 'id,title,body,action_path,created_at,read_at', order: 'created_at.desc', limit: '30' });
  return selectWorkflowRows<WorkflowNotification>('notifications', query);
}

export async function markWorkflowNotificationRead(id: string): Promise<void> {
  await patchWorkflowRows('notifications', new URLSearchParams({ id: `eq.${id}` }), { read_at: new Date().toISOString() });
}

export async function selectWorkflowRows<T>(table: string, query: URLSearchParams): Promise<T[]> {
  const suffix = query.size ? `?${query.toString()}` : '';
  return apiRequest<T[]>(`/api/data/${encodeURIComponent(table)}${suffix}`, {}, true);
}

export async function insertWorkflowRow<T>(table: string, row: Record<string, unknown>): Promise<T> {
  return apiRequest<T>(`/api/data/${encodeURIComponent(table)}`, { method: 'POST', body: JSON.stringify(row) }, true);
}

export async function upsertWorkflowRow<T = void>(table: string, row: Record<string, unknown>, conflictColumn: string): Promise<T> {
  return apiRequest<T>(`/api/data/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(conflictColumn)}`, {
    method: 'PUT', body: JSON.stringify(row),
  }, true);
}

export async function patchWorkflowRows(table: string, query: URLSearchParams, values: Record<string, unknown>): Promise<void> {
  const suffix = query.size ? `?${query.toString()}` : '';
  await apiRequest(`/api/data/${encodeURIComponent(table)}${suffix}`, { method: 'PATCH', body: JSON.stringify(values) }, true);
}

export async function deleteWorkflowRows(table: string, query: URLSearchParams): Promise<void> {
  const suffix = query.size ? `?${query.toString()}` : '';
  await apiRequest(`/api/data/${encodeURIComponent(table)}${suffix}`, { method: 'DELETE' }, true);
}

async function uploadFile(kind: string, recordId: string, file: File): Promise<string> {
  const query = new URLSearchParams({ kind, recordId, filename: file.name });
  const result = await apiRequest<{ path: string }>(`/api/uploads?${query}`, { method: 'POST', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } }, true);
  return result.path;
}

export const uploadHandoverPhoto = (moveInId: string, file: File) => uploadFile('handover', moveInId, file);
export const uploadExternalPaymentEvidence = (obligationId: string, file: File) => uploadFile('external-payment', obligationId, file);
export const uploadMaintenanceAttachment = (requestId: string, file: File) => uploadFile('maintenance', requestId, file);
export const uploadTenantProfilePhoto = (userId: string, file: File) => uploadFile('profile', userId, file);
export const uploadManagerDocument = (kind: 'inspections' | 'expenses', recordId: string, file: File) => uploadFile(kind, recordId, file);

export async function createPrivateDocumentLink(path: string): Promise<string> {
  const query = new URLSearchParams({ path });
  const token = await getSupabaseAccessToken();
  const response = await fetch(`${API_URL}/api/documents?${query}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Could not open the private document');
  return URL.createObjectURL(await response.blob());
}

export async function signOutSupabase() {
  try { await apiRequest('/api/auth/logout', { method: 'POST' }, true); }
  finally { sessionStorage.removeItem(SESSION_KEY); }
}
