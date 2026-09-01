import { useEffect, useState } from 'react';
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useHistory } from 'react-router';
import { listNotifications, markNotificationRead, type NotificationRow } from '@services/api/notifications';

export function NotificationsPage(): JSX.Element {
  const history = useHistory();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    listNotifications()
      .then((data) => {
        if (active) {
          setRows(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load notifications');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  async function open(row: NotificationRow) {
    try {
      if (!row.read_at) {
        const updated = await markNotificationRead(row.id);
        setRows((items) => items.map((item) => (item.id === row.id ? updated : item)));
      }
      if (row.deep_link) history.push(row.deep_link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open notification');
    }
  }
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Notifications</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          {error && (
            <p role="alert" style={{ color: 'var(--cs-danger)' }}>
              {error}
            </p>
          )}
          {loading && (
            <div className="cs-card" aria-busy="true">
              Loading notifications…
            </div>
          )}
          {!loading && rows.length === 0 && (
            <div className="cs-empty">
              <p>No notifications yet.</p>
            </div>
          )}
          <ul className="cs-stack" style={{ listStyle: 'none', padding: 0 }}>
            {rows.map((row) => (
              <li key={row.id} className="cs-card">
                <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div className="cs-strong">{row.title}</div>
                    <p>{row.body}</p>
                    <div className="cs-muted">{new Date(row.created_at).toLocaleString()}</div>
                  </div>
                  {!row.read_at && <span className="cs-pill cs-pill--verified">New</span>}
                </div>
                <IonButton size="small" fill="outline" onClick={() => void open(row)}>
                  {row.deep_link ? 'Open' : 'Mark read'}
                </IonButton>
              </li>
            ))}
          </ul>
        </div>
      </IonContent>
    </IonPage>
  );
}
