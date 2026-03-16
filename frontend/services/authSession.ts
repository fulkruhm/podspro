import { User } from '../types';

let authToken: string | null = null;
let refreshToken: string | null = null;
let authUser: User | null = null;
let isRefreshingToken: Promise<boolean> | null = null;

const AUTH_API_BASE = '/api/auth';

export function setAuthSession(token: string, nextRefreshToken: string, user: User) {
  authToken = token;
  refreshToken = nextRefreshToken;
  authUser = user;
}

export function clearAuthSession() {
  authToken = null;
  refreshToken = null;
  authUser = null;
  isRefreshingToken = null;
}

export function getAuthToken() {
  return authToken;
}

export function getAuthUser() {
  return authUser;
}

export function getRefreshToken() {
  return refreshToken;
}

export function getAuthHeaders(extraHeaders?: HeadersInit): Headers {
  const headers = new Headers(extraHeaders);
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  return headers;
}

async function authFetchWithRetry(input: RequestInfo | URL, init: RequestInit = {}, retried = false): Promise<Response> {
  const headers = getAuthHeaders(init.headers);
  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status !== 401) {
    return response;
  }

  if (retried || !refreshToken) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed || !authToken) {
    return response;
  }

  return authFetchWithRetry(input, init, true);
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return authFetchWithRetry(input, init, false);
}

export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) {
    return false;
  }

  if (isRefreshingToken) {
    return isRefreshingToken;
  }

  isRefreshingToken = (async () => {
    try {
      const response = await fetch(`${AUTH_API_BASE}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearAuthSession();
        return false;
      }

      const payload = await response.json();
      if (!payload?.token || !payload?.refreshToken) {
        clearAuthSession();
        return false;
      }

      authToken = payload.token;
      refreshToken = payload.refreshToken;
      return true;
    } catch {
      clearAuthSession();
      return false;
    } finally {
      isRefreshingToken = null;
    }
  })();

  return isRefreshingToken;
}

export async function logoutSession() {
  try {
    if (!authToken) {
      clearAuthSession();
      return;
    }

    await fetch(`${AUTH_API_BASE}/logout`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ refreshToken: refreshToken || undefined }),
    });
  } catch {
    // Ignore logout transport failures and clear local state regardless.
  } finally {
    clearAuthSession();
  }
}
