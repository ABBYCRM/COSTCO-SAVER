import { useEffect, useState, type ReactNode } from 'react';
import { IonLoading } from '@ionic/react';
import { supabase } from '@services/supabase/client';
import { AuthScreen } from './AuthScreen';

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Auth gate. Renders a real Supabase auth screen when the user is signed out,
 * and the app shell when signed in. Never fakes a logged-in state.
 */
export function AuthGate({ children }: AuthGateProps): JSX.Element {
  const [state, setState] = useState<'loading' | 'in' | 'out'>('loading');

  useEffect(() => {
    let active = true;
    supabase()
      .auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        setState(data.session ? 'in' : 'out');
      })
      .catch((err) => {
        console.error('auth.getSession failed', err);
        if (active) setState('out');
      });
    const { data: sub } = supabase().auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState(session ? 'in' : 'out');
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === 'loading') {
    return <IonLoading isOpen message="Signing you in..." />;
  }
  if (state === 'out') {
    return <AuthScreen onSignedIn={() => setState('in')} />;
  }
  return <>{children}</>;
}
