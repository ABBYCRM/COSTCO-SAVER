import { useEffect, useState, type ReactNode } from 'react';
import { IonLoading } from '@ionic/react';
import { currentUser } from '@services/api/auth';
import { AuthScreen } from './AuthScreen';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps): JSX.Element {
  const [state, setState] = useState<'loading' | 'in' | 'out'>('loading');

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const user = await currentUser();
        if (active) setState(user ? 'in' : 'out');
      } catch {
        if (active) setState('out');
      }
    };

    void check();
    const onSessionChanged = () => {
      setState('loading');
      void check();
    };
    window.addEventListener('costco-saver:session-changed', onSessionChanged);
    return () => {
      active = false;
      window.removeEventListener('costco-saver:session-changed', onSessionChanged);
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
