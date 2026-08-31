import { useEffect, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/react';
import { supabase } from '@services/supabase/client';

export function AccountPage(): JSX.Element {
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase()
      .auth.getUser()
      .then(({ data }) => {
        setEmail(data.user?.email ?? null);
        setDisplayName((data.user?.user_metadata as { display_name?: string } | undefined)?.display_name ?? null);
      });
  }, []);

  async function signOut() {
    setBusy(true);
    try {
      await supabase().auth.signOut();
      // AuthGate will redirect to AuthScreen.
    } finally {
      setBusy(false);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          <section className="cs-card">
            <p className="cs-muted" style={{ margin: 0 }}>Signed in as</p>
            <div className="cs-strong" style={{ fontSize: 'var(--cs-font-size-4)' }}>{email ?? '—'}</div>
            {displayName && <div className="cs-muted">{displayName}</div>}
          </section>
          <section className="cs-card">
            <h3 className="cs-strong" style={{ marginTop: 0 }}>Privacy</h3>
            <p className="cs-muted">
              Your purchases, receipts, watches, and private scan history are
              isolated to your account. We never share private data with other
              shoppers, and you can export or delete your account at any time.
            </p>
          </section>
          <IonButton expand="block" color="danger" onClick={signOut} disabled={busy}>
            Sign out
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}
