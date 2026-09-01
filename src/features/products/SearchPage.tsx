import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonBackButton,
  IonButtons,
} from '@ionic/react';
import { searchProducts, type SearchHit } from '@services/api/search';

export function SearchPage(): JSX.Element {
  const history = useHistory();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      searchProducts(q)
        .then((rows) => {
          if (cancelled) return;
          setHits(rows);
          setLoading(false);
        })
        .catch((err: Error) => {
          if (cancelled) return;
          setError(err.message);
          setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Search</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          <IonSearchbar
            value={q}
            onIonInput={(e) => setQ(e.detail.value ?? '')}
            placeholder="Name, brand, UPC, or Costco item #"
            aria-label="Search products"
            debounce={0}
          />
          {error && (
            <p role="alert" style={{ color: 'var(--cs-danger)' }}>
              {error}
            </p>
          )}
          {loading && (
            <div className="cs-card cs-stack" aria-busy="true">
              <div className="cs-skeleton" style={{ width: '60%' }} />
              <div className="cs-skeleton" style={{ width: '40%' }} />
            </div>
          )}
          {!loading && q.trim() && hits.length === 0 && (
            <div className="cs-empty">
              <p>No matches for &ldquo;{q}&rdquo;.</p>
              <p className="cs-muted">Try a Costco item number or a brand name.</p>
            </div>
          )}
          {!loading && hits.length > 0 && (
            <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {hits.map((h) => (
                <li key={h.productId}>
                  <button
                    className="cs-card"
                    style={{ width: '100%', textAlign: 'left', border: '1px solid var(--cs-border)' }}
                    onClick={() => history.push(`/product/${h.productId}`)}
                    aria-label={`Open ${h.canonicalName}`}
                  >
                    <div className="cs-strong">{h.canonicalName}</div>
                    {h.brand && <div className="cs-muted">{h.brand}</div>}
                    <div
                      className="cs-muted"
                      style={{ display: 'flex', gap: 'var(--cs-space-2)', flexWrap: 'wrap' }}
                    >
                      {h.size && <span>{h.size}</span>}
                      {h.category && <span className="cs-pill">{h.category}</span>}
                      {h.identifier && (
                        <span className="cs-pill" style={{ fontFamily: 'var(--cs-font-mono)' }}>
                          {h.identifierType}: {h.identifier}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!loading && !q.trim() && (
            <div className="cs-empty">
              <p>Search for a product by name, brand, barcode, or Costco item number.</p>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
