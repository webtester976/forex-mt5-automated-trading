/**
 * Centralized API client & URL resolver.
 * 
 * Configures the backend API base URL via environment variable:
 * - VITE_API_BASE_URL: Backend URL (e.g. 'https://api.yourdomain.com' or Cloud Run URL)
 * 
 * In local full-stack development, VITE_API_BASE_URL is typically empty,
 * routing requests to the local Express server on the same origin.
 * In production Cloudflare Pages deployments, VITE_API_BASE_URL directs
 * all API requests to the standalone backend API service.
 */

export const API_BASE_URL: string = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
).trim().replace(/\/+$/, '');

/**
 * Resolves an API path to a fully qualified URL if API_BASE_URL is set,
 * or returns the clean relative path.
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return cleanPath;
  }
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Wrapper around window.fetch that automatically resolves paths using apiUrl.
 */
export function apiFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  let finalInput: RequestInfo | URL = input;
  if (typeof input === 'string') {
    finalInput = apiUrl(input);
  }
  return fetch(finalInput, {
    credentials: 'include',
    ...init,
  });
}

/**
 * Diagnostic helper to detect if the app is hosted on Cloudflare Pages
 * without an API URL configured.
 */
export function isCloudflarePagesStandalone(): boolean {
  if (typeof window !== 'undefined') {
    return window.location.hostname.endsWith('pages.dev') && !API_BASE_URL;
  }
  return false;
}
 