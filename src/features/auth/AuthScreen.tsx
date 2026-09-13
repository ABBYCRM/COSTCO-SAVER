import { useState, type FormEvent } from 'react';
import { IonContent, IonPage } from '@ionic/react';
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
        <div className="cs-auth">
          <div className="cs-auth__panel">
            <p className="cs-meta cs-auth__eyebrow">Scan it before you buy it</p>
            <h1 className="cs-section-title">COSTCO-SAVER</h1>
            <p className="cs-muted">Warehouse price intelligence. Verify the shelf, then decide.</p>
            <form onSubmit={submit} className="cs-stack" style={{ marginTop: 'var(--cs-space-5)' }}>
              <label className="cs-field">
                <span className="cs-field__label">Email</span>
                <input
                  className="cs-field__input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="cs-field">
                <span className="cs-field__label">Password</span>
                <input
                  className="cs-field__input"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              {error && <p className="cs-error" role="alert">{error}</p>}
              <button className="cs-button" type="submit" disabled={busy}>
                {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
              <button
                className="cs-button cs-button--ghost"
                type="button"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              >
                {mode === 'signin' ? 'Need an account? Create one' : 'Have an account? Sign in'}
              </button>
            </form>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
