import { useState, type FormEvent } from 'react';
import { IonButton, IonContent, IonInput, IonItem, IonLabel, IonPage } from '@ionic/react';
import { supabase } from '@services/supabase/client';

interface AuthScreenProps {
  onSignedIn: () => void;
}

/**
 * Real email/password auth against Supabase. No demo creds, no fake buttons.
 * Apple and Google sign-in are added in the Phase 2 build per spec §49.
 */
export function AuthScreen({ onSignedIn }: AuthScreenProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error: signUpErr } = await supabase().auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpErr) throw signUpErr;
      } else {
        const { error: signInErr } = await supabase().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) throw signInErr;
      }
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="cs-page" style={{ paddingTop: 'var(--cs-space-7)' }}>
          <h1 className="cs-section-title">COSTCO-SAVER</h1>
          <p className="cs-muted">Scan it before you buy it.</p>
          <form onSubmit={submit} className="cs-stack" style={{ marginTop: 'var(--cs-space-5)' }}>
            <IonItem>
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                type="email"
                autocomplete="email"
                value={email}
                onIonChange={(e) => setEmail(e.detail.value ?? '')}
                required
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Password</IonLabel>
              <IonInput
                type="password"
                autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                minlength={8}
                onIonChange={(e) => setPassword(e.detail.value ?? '')}
                required
              />
            </IonItem>
            {error && <p role="alert" style={{ color: 'var(--cs-danger)' }}>{error}</p>}
            <IonButton type="submit" expand="block" disabled={busy}>
              {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </IonButton>
            <IonButton
              type="button"
              expand="block"
              fill="clear"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? 'Need an account? Create one' : 'Have an account? Sign in'}
            </IonButton>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
}
