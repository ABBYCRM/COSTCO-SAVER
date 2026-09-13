import { useEffect, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonButtons, IonMenuButton } from '@ionic/react';
import { supabase } from '@services/supabase/client';
import { listPurchases, type PurchaseRow } from '@services/api/purchases';
import { listWatches, type WatchRow } from '@services/api/watches';

type ConfirmAction = null | 'export' | 'delete';

/**
 * Account / privacy page.
 * Implements every action the copy promises (spec §46):
 *   - Sign out
 *   - Export all my data (downloads a JSON dump of purchases + watches)
 *   - Delete account (removes private rows + signs out)
 */
export function AccountPage(): JSX.Element {
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function exportData() {
    setBusy(true);
    setError(null);
    try {
      const [purchases, watches] = await Promise.all([listPurchases(), listWatches()]);
      const payload = {
        exported_at: new Date().toISOString(),
        user_email: email,
        purchases: purchases satisfies PurchaseRow[],
        watches: watches satisfies WatchRow[],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `costco-saver-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus(`Exported ${purchases.length} purchases and ${watches.length} watches.`);
      setConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    setError(null);
    try {
      const userId = (await supabase().auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not signed in');
      // Wipe private data. Public product observations stay (they belong to
      // the community, not the user; spec §46 specifies removing private
      // rows and the auth row).
      await supabase().from('watches').delete().eq('user_id', userId);
      await supabase().from('purchases').delete().eq('user_id', userId);
      await supabase().from('receipts').delete().eq('user_id', userId);
      await supabase().from('notifications').delete().eq('user_id', userId);
      await supabase().from('device_tokens').delete().eq('user_id', userId);
      await supabase().rpc('delete_my_user');
      await supabase().auth.signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>Account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          <header className="cs-header">
            <span className="cs-header__eyebrow">Signed in</span>
            <h2 className="cs-header__title">{displayName ?? email ?? 'Anonymous'}</h2>
            {displayName && email && <p className="cs-header__sub">{email}</p>}
          </header>

          <section className="cs-card">
            <h3 className="cs-strong" style={{ marginTop: 0 }}>Privacy</h3>
            <p className="cs-muted">
              Your purchases, receipts, watches, and private scan history are
              isolated to your account. We never share private data with other
              shoppers, and you can export or delete your account at any time.
            </p>
          </section>

          <section className="cs-card">
            <h3 className="cs-strong" style={{ marginTop: 0 }}>Your data</h3>
            <button
              type="button"
              className="cs-button cs-button--ghost"
              style={{ width: '100%' }}
              onClick={() => setConfirm('export')}
              disabled={busy}
            >
              Export my data
            </button>
            <p className="cs-muted" style={{ marginTop: 'var(--cs-space-2)' }}>
              Downloads a JSON file with every purchase and watch you have
              ever recorded.
            </p>
          </section>

          <section className="cs-card">
            <h3 className="cs-strong" style={{ marginTop: 0 }}>Delete account</h3>
            <button
              type="button"
              className="cs-button cs-button--danger"
              style={{ width: '100%', background: 'var(--cs-danger)', color: '#0B1220' }}
              onClick={() => setConfirm('delete')}
              disabled={busy}
            >
              Delete account…
            </button>
            <p className="cs-muted" style={{ marginTop: 'var(--cs-space-2)' }}>
              Removes your private data and signs you out. Public price
              observations stay attached to their product record.
            </p>
          </section>

          {error && (
            <p role="alert" style={{ color: 'var(--cs-danger)' }}>{error}</p>
          )}
          {status && (
            <p role="status" className="cs-strong">{status}</p>
          )}

          <IonButton expand="block" color="medium" onClick={signOut} disabled={busy}>
            Sign out
          </IonButton>
        </div>

        {confirm === 'export' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
            style={{
              position: 'fixed', inset: 0, background: 'rgba(11,18,32,0.78)',
              display: 'grid', placeItems: 'center', padding: 'var(--cs-space-4)',
              zIndex: 1000,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}
          >
            <div className="cs-card" style={{ maxWidth: 420, width: '100%' }}>
              <h3 id="export-title" className="cs-strong" style={{ marginTop: 0 }}>Export my data?</h3>
              <p className="cs-muted">
                A JSON file with every purchase and watch will be downloaded to
                your device. Other shoppers cannot see this data.
              </p>
              <div className="cs-row" style={{ justifyContent: 'flex-end', marginTop: 'var(--cs-space-4)' }}>
                <button
                  type="button"
                  className="cs-button cs-button--ghost"
                  onClick={() => setConfirm(null)}
                  disabled={busy}
                >Cancel</button>
                <button
                  type="button"
                  className="cs-button"
                  onClick={exportData}
                  disabled={busy}
                >Export</button>
              </div>
            </div>
          </div>
        )}

        {confirm === 'delete' && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            style={{
              position: 'fixed', inset: 0, background: 'rgba(11,18,32,0.78)',
              display: 'grid', placeItems: 'center', padding: 'var(--cs-space-4)',
              zIndex: 1000,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}
          >
            <div className="cs-card" style={{ maxWidth: 420, width: '100%' }}>
              <h3 id="delete-title" className="cs-strong" style={{ marginTop: 0, color: 'var(--cs-danger)' }}>Delete account?</h3>
              <p className="cs-muted">
                Your private data will be removed. Public observations stay
                attached to their product record (they help the community).
                You can re-create an account at any time.
              </p>
              <div className="cs-row" style={{ justifyContent: 'flex-end', marginTop: 'var(--cs-space-4)' }}>
                <button
                  type="button"
                  className="cs-button cs-button--ghost"
                  onClick={() => setConfirm(null)}
                  disabled={busy}
                >Cancel</button>
                <button
                  type="button"
                  style={{ background: 'var(--cs-danger)', color: '#0B1220', border: 0, padding: '0 var(--cs-space-4)', minHeight: 'var(--cs-touch-min)', borderRadius: 'var(--cs-radius-2)', fontWeight: 700, cursor: 'pointer' }}
                  onClick={deleteAccount}
                  disabled={busy}
                >Delete</button>
              </div>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
