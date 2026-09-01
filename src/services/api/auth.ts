import { apiFetch, clearSession, getAccessToken, getRefreshToken, setSession } from './client';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'shopper' | 'moderator' | 'admin';
}

interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export async function signUp(email: string, password: string): Promise<AuthUser> {
  const result = await apiFetch<SessionResponse>('/api/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setSession(result.accessToken, result.refreshToken);
  return result.user;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const result = await apiFetch<SessionResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setSession(result.accessToken, result.refreshToken);
  return result.user;
}

export async function currentUser(): Promise<AuthUser | null> {
  if (!getAccessToken() && !getRefreshToken()) return null;
  try {
    const result = await apiFetch<{ user: AuthUser }>('/api/v1/me');
    return result.user;
  } catch {
    clearSession();
    return null;
  }
}

export async function signOut(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (getAccessToken()) {
      await apiFetch<{ ok: boolean }>('/api/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    clearSession();
  }
}

export async function deleteAccount(): Promise<void> {
  await apiFetch<{ deleted: boolean }>('/api/v1/me', { method: 'DELETE' });
  clearSession();
}

export async function exportAccount(): Promise<unknown> {
  return apiFetch<unknown>('/api/v1/me/export');
}
