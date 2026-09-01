const ACCESS_KEY = 'costco-saver.access-token';
const REFRESH_KEY = 'costco-saver.refresh-token';

export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
}

export class ApiError extends Error {
  status: number;
  code: string;
  requestId?: string;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.error?.message || `Request failed with status ${status}`);
    this.status = status;
    this.code = payload.error?.code || 'REQUEST_FAILED';
    this.requestId = payload.error?.requestId;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setSession(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    clearSession();
    return false;
  }
  const data = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
  };
  setSession(data.accessToken, data.refreshToken);
  return true;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type') && init.body) {
    headers.set('content-type', 'application/json');
  }
  const accessToken = getAccessToken();
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

  const response = await fetch(path, { ...init, headers });
  if (response.status === 401 && retry && getRefreshToken()) {
    const refreshed = await refreshSession();
    if (refreshed) return apiFetch<T>(path, init, false);
  }

  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = { error: { message: response.statusText } };
    }
    throw new ApiError(response.status, payload);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
