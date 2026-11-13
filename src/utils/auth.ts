import { UserProfile } from '../types';

export const ALLOWED_INTERNAL_ROUTES = [
  '/',
  '/login',
  '/buy',
  '/rent',
  '/sell',
  '/search',
  '/tools',
  '/mortgage',
  '/agents',
  '/manage-rentals',
  '/dashboard',
  '/renter-dashboard',
  '/apply-to-rent',
  '/demo-action',
  '/help',
  '/privacy',
  '/terms',
];

export function readStoredValue<T>(key: string, fallback: T, isValid?: (value: unknown) => value is T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    return isValid && !isValid(value) ? fallback : (value as T);
  } catch {
    return fallback;
  }
}

export function writeStoredValue(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable or full; the in-memory app remains usable.
  }
}

/**
 * Validates a redirect target to prevent open redirect vulnerabilities.
 * Ensures the destination is a safe relative internal route.
 */
export function sanitizeInternalRedirect(url: string | null | undefined): string {
  if (!url) return '/buy';

  const trimmed = url.trim();

  // Block protocol-relative URLs (//example.com) or absolute URLs (http://, https://, javascript:)
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:')
  ) {
    return '/buy';
  }

  // Must begin with a single slash
  if (!trimmed.startsWith('/')) {
    return '/buy';
  }

  // Check against allowed route prefixes or property IDs
  const pathWithoutQuery = trimmed.split('?')[0];

  const isAllowedBase = ALLOWED_INTERNAL_ROUTES.some(
    (allowed) => pathWithoutQuery === allowed || pathWithoutQuery.startsWith(allowed + '/')
  );

  const isPropertyRoute = /^\/property\/[a-zA-Z0-9_-]+$/.test(pathWithoutQuery);

  if (isAllowedBase || isPropertyRoute) {
    return trimmed;
  }

  return '/buy';
}
