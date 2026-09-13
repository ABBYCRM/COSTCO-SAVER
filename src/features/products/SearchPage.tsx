import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons } from '@ionic/react';
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
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle>Search</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          <header className="cs-header">
            <span className="cs-header__eyebrow">Find</span>
            <h2 className="cs-header__title">What are you looking for?</h2>
            <p className="cs-header__sub">Name, brand, barcode, or Costco item number.</p>
          </header>

          <label className="cs-field">
            <span className="cs-field__label">Search</span>
            <input
              className="cs-field__input"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, brand, UPC, or Costco item #"
              aria-label="Search products"
            />
          </label>

          {error && <p role="alert" className="cs-error">{error}</p>}

          {loading && (
            <div className="cs-card cs-stack" aria-busy="true">
              <div className="cs-skeleton" style={{ width: '60%' }} />
              <div className="cs-skeleton" style={{ width: '40%' }} />
            </div>
          )}

          {!loading && q.trim() && hits.length === 0 && (
            <div className="cs-state">
              <div className="cs-state__icon" aria-hidden>∅</div>
              <h3 className="cs-state__title">No matches</h3>
              <p className="cs-state__hint">
                No matches for &ldquo;{q}&rdquo;. Try a Costco item number or a brand name.
              </p>
            </div>
          )}

          {!loading && hits.length > 0 && (
            <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {hits.map((hit) => (
                <li key={hit.productId}>
                  <button
                    type="button"
                    className="cs-card"
                    style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => history.push(`/product/${hit.productId}`)}
                    aria-label={`Open ${hit.canonicalName}`}
                  >
                    <div className="cs-strong">{hit.canonicalName}</div>
                    {hit.brand && <div className="cs-muted">{hit.brand}</div>}
                    <div className="cs-muted" style={{ display: 'flex', gap: 'var(--cs-space-2)', flexWrap: 'wrap', marginTop: 'var(--cs-space-2)' }}>
                      {hit.size && <span>{hit.size}</span>}
                      {hit.category && <span className="cs-pill">{hit.category}</span>}
                      {hit.identifier && (
                        <span className="cs-pill" style={{ fontFamily: 'var(--cs-font-mono)' }}>
                          {hit.identifierType}: {hit.identifier}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && !q.trim() && (
            <div className="cs-state">
              <div className="cs-state__icon" aria-hidden>⌕</div>
              <h3 className="cs-state__title">Search by anything</h3>
              <p className="cs-state__hint">Name, brand, barcode, or Costco item number.</p>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
