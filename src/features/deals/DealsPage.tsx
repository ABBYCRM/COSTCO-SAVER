import { useEffect, useState } from 'react';
import { IonChip, IonContent, IonHeader, IonLabel, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useHistory } from 'react-router';
import { useWarehouse } from '@stores/warehouse';
import { listDeals, type DealRow } from '@services/api/deals';
import { formatUSD, cents } from '@domain/money/cents';
import { computeDealScore } from '@domain/deals/dealScore';
import type { MarkdownClassification } from '@domain/pricing/priceCodeEngine';
import type { FreshnessClass } from '@domain/freshness/freshnessEngine';

type Filter = 'all' | 'clearance' | 'manager_markdown' | 'asterisk';

export function DealsPage(): JSX.Element {
  const history = useHistory();
  const { selected } = useWarehouse();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listDeals(selected.id, filter)
      .then((rows) => {
        if (cancelled) return;
        setDeals(rows);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, filter]);

  if (!selected) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Deals</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="cs-empty">Pick a warehouse on the Home tab to see deals there.</div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Deals · {selected.name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          <div className="cs-row" style={{ flexWrap: 'wrap', gap: 'var(--cs-space-2)' }}>
            {(
              [
                ['all', 'All'],
                ['clearance', 'Clearance .97'],
                ['manager_markdown', 'Manager markdown'],
                ['asterisk', 'Asterisk'],
              ] as Array<[Filter, string]>
            ).map(([value, label]) => (
              <IonChip
                key={value}
                onClick={() => setFilter(value)}
                color={filter === value ? 'primary' : undefined}
              >
                <IonLabel>{label}</IonLabel>
              </IonChip>
            ))}
          </div>

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
          {!loading && deals.length === 0 && (
            <div className="cs-empty">
              <p>No verified prices match this filter yet.</p>
              <button className="cs-button" onClick={() => location.assign('/scan')}>
                Scan a shelf
              </button>
            </div>
          )}
          <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {deals.map((deal) => {
              const score = computeDealScore({
                currentPrice: deal.consensus_price_cents ?? 0,
                markdownClass: (deal.markdown_class as MarkdownClassification | null) ?? null,
                confidence: deal.confidence_score,
                freshnessClass: deal.freshness_class as FreshnessClass,
                currentWarehousePrice: deal.consensus_price_cents ?? 0,
              });
              return (
                <li key={deal.product_id}>
                  <button
                    className="cs-card"
                    style={{ width: '100%', textAlign: 'left', border: '1px solid var(--cs-border)' }}
                    onClick={() => history.push(`/product/${deal.product_id}`)}
                    aria-label={`Open ${deal.canonical_name}`}
                  >
                    <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                      <div>
                        <div className="cs-strong">{deal.canonical_name}</div>
                        <div className="cs-muted">
                          {deal.brand && <>{deal.brand} · </>}
                          <span className="cs-pill cs-pill--verified">{deal.freshness_class}</span>
                          {deal.has_asterisk && <span className="cs-pill cs-pill--aging">asterisk</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="cs-price cs-strong" style={{ fontSize: 'var(--cs-font-size-5)' }}>
                          {deal.consensus_price_cents != null
                            ? formatUSD(cents(deal.consensus_price_cents))
                            : '—'}
                        </div>
                        <div className="cs-muted">
                          {score.rating} · {score.score}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </IonContent>
    </IonPage>
  );
}
