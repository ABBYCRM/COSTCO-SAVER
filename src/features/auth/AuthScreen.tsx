import { useState, type FormEvent } from 'react';
import { IonButton, IonContent, IonInput, IonItem, IonLabel, IonPage } from '@ionic/react';
import { signIn, signUp } from '@services/api/auth';

interface AuthScreenProps {
  onSignedIn: () => void;
}

export function AuthScreen({ onSignedIn }: AuthScreenProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
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
                minlength={10}
                onIonChange={(e) => setPassword(e.detail.value ?? '')}
                required
              />
            </IonItem>
            {mode === 'signup' && (
              <p className="cs-muted">Use at least 10 characters. Your password is hashed before storage.</p>
            )}
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
