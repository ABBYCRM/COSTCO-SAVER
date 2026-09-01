import { useEffect, useState } from 'react';
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { currentUser, deleteAccount, exportAccount, signOut, type AuthUser } from '@services/api/auth';
import { useHistory } from 'react-router';

export function AccountPage(): JSX.Element {
  const history = useHistory();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    currentUser()
      .then(setUser)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function handleSignOut() {
    setBusy(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const data = await exportAccount();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'costco-saver-export.json';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export account');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete your COSTCO-SAVER account and private data? This cannot be undone.')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
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
            <div className="cs-strong" style={{ fontSize: 'var(--cs-font-size-4)' }}>
              {user?.email ?? 'Loading…'}
            </div>
            {user?.displayName && <div className="cs-muted">{user.displayName}</div>}
          </section>

          <section className="cs-card">
            <h3 className="cs-strong" style={{ marginTop: 0 }}>Shopping</h3>
            <IonButton fill="outline" onClick={() => history.push('/trip')}>Open Trip Mode</IonButton>
            <IonButton fill="outline" onClick={() => history.push('/notifications')}>Notifications</IonButton>
            {user && ['moderator', 'admin'].includes(user.role) && (
              <IonButton fill="outline" onClick={() => history.push('/admin')}>Moderator console</IonButton>
            )}
          </section>

          <section className="cs-card">
            <h3 className="cs-strong" style={{ marginTop: 0 }}>Privacy & data</h3>
            <p className="cs-muted">
              Purchases, receipts, watches, notifications, and account data are isolated by authenticated
              API ownership checks and PostgreSQL row policies.
            </p>
            <div className="cs-row" style={{ flexWrap: 'wrap' }}>
              <IonButton fill="outline" onClick={handleExport} disabled={busy}>Export my data</IonButton>
              <IonButton color="danger" fill="outline" onClick={handleDelete} disabled={busy}>
                Delete account
              </IonButton>
            </div>
          </section>

          {error && <p role="alert" style={{ color: 'var(--cs-danger)' }}>{error}</p>}

          <IonButton expand="block" color="danger" onClick={handleSignOut} disabled={busy}>
            Sign out
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}
