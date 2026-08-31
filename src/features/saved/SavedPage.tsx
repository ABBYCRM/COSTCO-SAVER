import { useEffect, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel, IonButton } from '@ionic/react';
import { useWarehouse } from '@stores/warehouse';
import { listWatches, type WatchRow } from '@services/api/watches';
import { listPurchases, type PurchaseRow } from '@services/api/purchases';
import { listAdjustments, setAdjustmentStatus, type AdjustmentRow } from '@services/api/adjustments';
import { supabase } from '@services/supabase/client';
import { formatUSD, cents } from '@domain/money/cents';

type Section = 'watching' | 'purchases' | 'adjustments' | 'deals';

export function SavedPage(): JSX.Element {
  const { selected } = useWarehouse();
  const [section, setSection] = useState<Section>('watching');
  const [watches, setWatches] = useState<WatchRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [purchaseProducts, setPurchaseProducts] = useState<Record<string, string>>({});
  const [purchaseWarehouses, setPurchaseWarehouses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listWatches(), listPurchases(), listAdjustments()])
      .then(async ([w, p, a]) => {
        if (cancelled) return;
        setWatches(w);
        setPurchases(p);
        setAdjustments(a);
        // Fetch related product and warehouse names for purchases.
        const productIds = Array.from(new Set(p.map((x) => x.product_id)));
        const warehouseIds = Array.from(new Set(p.map((x) => x.warehouse_id)));
        if (productIds.length) {
          const { data: prods } = await supabase()
            .from('products')
            .select('id, canonical_name')
            .in('id', productIds);
          if (!cancelled) {
            const map: Record<string, string> = {};
            for (const r of (prods ?? []) as { id: string; canonical_name: string }[]) {
              map[r.id] = r.canonical_name;
            }
            setPurchaseProducts(map);
          }
        }
        if (warehouseIds.length) {
          const { data: whs } = await supabase()
            .from('warehouses')
            .select('id, name')
            .in('id', warehouseIds);
          if (!cancelled) {
            const map: Record<string, string> = {};
            for (const r of (whs ?? []) as { id: string; name: string }[]) {
              map[r.id] = r.name;
            }
            setPurchaseWarehouses(map);
          }
        }
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
  }, []);

  async function markAdjustment(id: string, status: AdjustmentRow['status']) {
    setError(null);
    try {
      await setAdjustmentStatus(id, status);
      const next = adjustments.map((a) => (a.id === id ? { ...a, status } : a));
      setAdjustments(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update adjustment');
    }
  }

  const adjustmentOpportunities = adjustments.filter(
    (a) => a.status === 'opportunity' && (selected == null || a.warehouse_id === selected.id),
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Saved</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          <IonSegment value={section} onIonChange={(e) => setSection(e.detail.value as Section)}>
            <IonSegmentButton value="watching"><IonLabel>Watching</IonLabel></IonSegmentButton>
            <IonSegmentButton value="purchases"><IonLabel>Purchases</IonLabel></IonSegmentButton>
            <IonSegmentButton value="adjustments"><IonLabel>Adjustments</IonLabel></IonSegmentButton>
            <IonSegmentButton value="deals"><IonLabel>Saved deals</IonLabel></IonSegmentButton>
          </IonSegment>

          {error && <p role="alert" style={{ color: 'var(--cs-danger)' }}>{error}</p>}

          {loading && <div className="cs-card cs-stack" aria-busy="true"><div className="cs-skeleton" style={{ width: '60%' }} /></div>}

          {!loading && section === 'watching' && (
            <>
              {watches.length === 0 ? (
                <div className="cs-empty">
                  <p>You are not watching any products.</p>
                  <p className="cs-muted">Open a product and tap Watch to get notified when its verified price changes.</p>
                  <IonButton onClick={() => location.assign('/home')}>Go to Home</IonButton>
                </div>
              ) : (
                <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {watches.map((w) => (
                    <li key={w.id} className="cs-card">
                      <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                        <div>
                          <div className="cs-strong">Watch</div>
                          {w.target_price_cents != null && (
                            <div className="cs-muted">Target: {formatUSD(cents(w.target_price_cents))}</div>
                          )}
                        </div>
                        <div>
                          {w.notify_any_drop && <span className="cs-pill">any drop</span>}
                          {w.notify_clearance && <span className="cs-pill cs-pill--clearance">.97</span>}
                          {w.notify_manager_markdown && <span className="cs-pill cs-pill--aging">manager</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {!loading && section === 'purchases' && (
            <>
              {purchases.length === 0 ? (
                <div className="cs-empty">
                  <p>No purchases recorded yet.</p>
                  <p className="cs-muted">You can record a purchase from any product detail page.</p>
                </div>
              ) : (
                <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {purchases.map((p) => (
                    <li key={p.id} className="cs-card">
                      <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                        <div>
                          <div className="cs-strong">{purchaseProducts[p.product_id] ?? 'Product'}</div>
                          <div className="cs-muted">
                            {purchaseWarehouses[p.warehouse_id] ?? 'Warehouse'} · {new Date(p.purchase_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="cs-price cs-strong">
                          {formatUSD(cents(p.total_cents))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {!loading && section === 'adjustments' && (
            <>
              {adjustmentOpportunities.length === 0 ? (
                <div className="cs-empty">
                  <p>No adjustment opportunities right now.</p>
                  <p className="cs-muted">If a price drops within 30 days of your purchase, we will surface it here.</p>
                </div>
              ) : (
                <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {adjustmentOpportunities.map((a) => (
                    <li key={a.id} className="cs-card">
                      <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                        <div>
                          <div className="cs-strong">You may be able to recover {formatUSD(cents(a.potential_savings_cents))}</div>
                          <div className="cs-muted">{a.days_remaining} days remaining · status: {a.status}</div>
                        </div>
                        <div>
                          <IonButton size="small" onClick={() => markAdjustment(a.id, 'claimed')}>Mark Claimed</IonButton>
                          <IonButton size="small" fill="outline" onClick={() => markAdjustment(a.id, 'dismissed')}>Dismiss</IonButton>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {!loading && section === 'deals' && (
            <div className="cs-empty">
              <p>You haven&apos;t saved any deals yet.</p>
              <p className="cs-muted">Open a deal on the Deals tab to save it for later.</p>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
