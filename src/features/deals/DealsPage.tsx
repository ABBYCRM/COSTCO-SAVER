import { useEffect, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonChip, IonLabel } from '@ionic/react';
import { supabase } from '@services/supabase/client';
import { useWarehouse } from '@stores/warehouse';
import { formatUSD } from '@domain/money/cents';
import { computeDealScore } from '@domain/deals/dealScore';
import { classifyFreshness } from '@domain/freshness/freshnessEngine';

interface DealRow {
  product_id: string;
  warehouse_id: string;
  product_name: string;
  brand: string | null;
  consensus_price_cents: number | null;
  markdown_class: string | null;
  freshness_class: string;
  confidence_score: number;
  last_verified_at: string | null;
}

export function DealsPage(): JSX.Element {
  const { selected } = useWarehouse();
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'clearance' | 'manager_markdown' | 'asterisk'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase()
      .from('warehouse_product_state')
      .select('product_id, warehouse_id, consensus_price_cents, markdown_class, freshness_class, confidence_score, last_verified_at, products(canonical_name, brand)')
      .eq('warehouse_id', selected.id)
      .not('consensus_price_cents', 'is', null)
      .order('confidence_score', { ascending: false })
      .limit(50)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setLoading(false);
          return;
        }
        const rows: DealRow[] = (data ?? []).map((d: any) => ({
          product_id: d.product_id,
          warehouse_id: d.warehouse_id,
          product_name: d.products?.canonical_name ?? 'Unknown product',
          brand: d.products?.brand ?? null,
          consensus_price_cents: d.consensus_price_cents,
          markdown_class: d.markdown_class,
          freshness_class: d.freshness_class,
          confidence_score: d.confidence_score,
          last_verified_at: d.last_verified_at,
        }));
        setDeals(rows);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  if (!selected) {
    return (
      <IonPage>
        <IonHeader><IonToolbar><IonTitle>Deals</IonTitle></IonToolbar></IonHeader>
        <IonContent>
          <div className="cs-empty">Pick a warehouse on the Home tab to see deals there.</div>
        </IonContent>
      </IonPage>
    );
  }

  const filtered = deals.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'clearance') return d.markdown_class === 'clearance';
    if (filter === 'manager_markdown') return d.markdown_class === 'manager_markdown';
    return true;
  });

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
            <IonChip onClick={() => setFilter('all')} color={filter === 'all' ? 'primary' : undefined}>
              <IonLabel>All</IonLabel>
            </IonChip>
            <IonChip onClick={() => setFilter('clearance')} color={filter === 'clearance' ? 'primary' : undefined}>
              <IonLabel>Clearance .97</IonLabel>
            </IonChip>
            <IonChip onClick={() => setFilter('manager_markdown')} color={filter === 'manager_markdown' ? 'primary' : undefined}>
              <IonLabel>Manager markdown</IonLabel>
            </IonChip>
          </div>

          {error && <p role="alert" style={{ color: 'var(--cs-danger)' }}>{error}</p>}
          {loading && (
            <div className="cs-card cs-stack" aria-busy="true">
              <div className="cs-skeleton" style={{ width: '60%' }} />
              <div className="cs-skeleton" style={{ width: '40%' }} />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="cs-empty">
              <p>No verified prices at this warehouse yet.</p>
              <p className="cs-muted">Be the first shopper to submit a verified shelf price.</p>
              <button className="cs-button" onClick={() => location.assign('/scan')}>Scan a shelf</button>
            </div>
          )}
          <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {filtered.map((d) => {
              const score = computeDealScore({
                currentPrice: d.consensus_price_cents ?? 0,
                markdownClass: d.markdown_class as any,
                confidence: d.confidence_score,
                freshnessClass: (d.freshness_class as any) ?? classifyFreshness(d.last_verified_at),
                currentWarehousePrice: d.consensus_price_cents ?? 0,
              });
              return (
                <li key={d.product_id} className="cs-card">
                  <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div className="cs-strong">{d.product_name}</div>
                      <div className="cs-muted">
                        {d.brand && <>{d.brand} · </>}
                        <span className="cs-pill cs-pill--verified">{d.freshness_class}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="cs-price cs-strong" style={{ fontSize: 'var(--cs-font-size-5)' }}>
                        {d.consensus_price_cents ? formatUSD(d.consensus_price_cents as any) : '—'}
                      </div>
                      <div className="cs-muted">{score.rating} · {score.score}</div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </IonContent>
    </IonPage>
  );
}
