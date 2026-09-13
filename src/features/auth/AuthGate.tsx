import type { ReactNode } from 'react';

/**
 * AuthGate (legacy) — kept as a no-op so the original App.tsx imports still
 * resolve. The app is local-first in offline mode: there is no auth screen
 * or loading state. When Supabase env vars are present the user can still
 * sign in via the Account page (out of scope for this build).
 */
export function AuthGate({ children }: { children: ReactNode }): JSX.Element {
  return <>{children}</>;
}
