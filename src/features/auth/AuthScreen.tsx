import { useState, type FormEvent } from 'react';
import { IonButton, IonContent, IonInput, IonPage } from '@ionic/react';
import { supabase } from '@services/supabase/client';

interface AuthScreenProps {
  onSignedIn: () => void;
}

/**
 * Real email/password auth against Supabase. No demo creds, no fake buttons.
 * Apple and Google sign-in are added in the Phase 2 build per spec §49.
 *
 * UI uses the COSTCO-SAVER design tokens so it harmonizes with the rest
 * of the app — dark navy surface, mint brand color, tabular numerals,
 * generous spacing, mobile-first 44px touch targets.
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
          <div className="cs-auth__brand">
            <div className="cs-auth__mark" aria-hidden>$</div>
            <h1 className="cs-auth__title">COSTCO-SAVER</h1>
            <p className="cs-auth__lede">Scan it before you buy it.</p>
          </div>
          <form className="cs-auth__form" onSubmit={submit}>
            <label className="cs-auth__field">
              <span className="cs-auth__label">Email</span>
              <input
                type="email"
                className="cs-auth__input"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="cs-auth__field">
              <span className="cs-auth__label">Password</span>
              <input
                type="password"
                className="cs-auth__input"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && (
              <p role="alert" className="cs-auth__error">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="cs-auth__submit"
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
            <button
              type="button"
              className="cs-auth__toggle"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin'
                ? 'Need an account? Create one'
                : 'Have an account? Sign in'}
            </button>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
}

// IonInput is imported above for parity with the previous shape but unused now
// (replaced with native <input class="cs-auth__input" />). Keep the import
// silent if eslint complains.
void IonInput;
void IonButton;
