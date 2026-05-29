import { API_BASE_URL } from '../constants/config';

// AuthProvider registers a handler so an expired/invalid token can force a logout
// from anywhere, without each call site needing access to the auth context.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

type ApiFetchOptions = Omit<RequestInit, 'headers'> & {
  token?: string | null;
  headers?: Record<string, string>;
  // Skip the automatic logout-on-401 (e.g. the login request itself).
  skipAuthRedirect?: boolean;
};

/**
 * Thin wrapper around fetch that:
 *  - prefixes the shared API base URL (pass an absolute URL to bypass),
 *  - attaches the bearer token + Accept header,
 *  - triggers the registered unauthorized handler on a 401 for authed calls.
 *
 * Note: Content-Type is intentionally NOT defaulted so FormData uploads keep
 * their auto-generated multipart boundary. Pass it explicitly for JSON bodies.
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { token, headers, skipAuthRedirect, ...rest } = options;
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (response.status === 401 && token && !skipAuthRedirect) {
    unauthorizedHandler?.();
  }

  return response;
}
