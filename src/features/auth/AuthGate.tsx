import { useEffect, useState, type ReactNode } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { isSupabaseConfigured, supabase } from '@services/supabase/client';
import { AuthScreen } from './AuthScreen';
import { DemoScreen } from './DemoScreen';

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Auth gate. Renders a real Supabase auth screen when the user is signed out,
 * and the app shell when signed in. Never fakes a logged-in state.
 *
 * If the build was shipped without Supabase env vars (e.g. on the public
 * demo deploy, before the operator has linked a real project), shows the
 * DemoScreen instead of throwing.
 */
export function AuthGate({ children }: AuthGateProps): JSX.Element {
  const [state, setState] = useState<'loading' | 'in' | 'out'>('loading');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // No Supabase = demo mode. Render the demo screen, don't even try.
      return;
    }
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

  if (!isSupabaseConfigured()) {
    return <DemoScreen />;
  }
  if (state === 'loading') {
    return (
      <IonPage>
        <IonContent fullscreen>
          <div className="cs-auth" role="status" aria-live="polite">
            <div className="cs-auth__panel">
              <p className="cs-meta cs-auth__eyebrow">COSTCO-SAVER</p>
              <h1 className="cs-section-title">Checking your session…</h1>
              <p className="cs-muted">Hang tight while we confirm you are signed in.</p>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }
  if (state === 'out') {
    return <AuthScreen onSignedIn={() => setState('in')} />;
  }
  return <>{children}</>;
}
