import { useEffect, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel } from '@ionic/react';
import { supabase } from '@services/supabase/client';

interface WatchRow {
  id: string;
  product_id: string;
  notify_any_drop: boolean;
  notify_clearance: boolean;
  notify_manager_markdown: boolean;
  enabled: boolean;
  products: { canonical_name: string; brand: string | null } | { canonical_name: string; brand: string | null }[] | null;
}

interface PurchaseRow {
  id: string;
  product_id: string;
  warehouse_id: string;
  unit_price_cents: number;
  total_cents: number;
  purchase_date: string;
  products: { canonical_name: string; brand: string | null } | { canonical_name: string; brand: string | null }[] | null;
  warehouses: { name: string } | { name: string }[] | null;
}

interface AdjustmentRow {
  id: string;
  purchase_id: string;
  potential_savings_cents: number;
  days_remaining: number;
  status: string;
  new_price_cents: number;
  purchase_price_cents: number;
}

type Section = 'watching' | 'purchases' | 'adjustments' | 'deals';

function firstObj<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function SavedPage(): JSX.Element {
  const [section, setSection] = useState<Section>('watching');
  const [watches, setWatches] = useState<WatchRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      supabase().from('watches').select('id, product_id, notify_any_drop, notify_clearance, notify_manager_markdown, enabled, products(canonical_name, brand)'),
      supabase().from('purchases').select('id, product_id, warehouse_id, unit_price_cents, total_cents, purchase_date, products(canonical_name, brand), warehouses(name)').order('purchase_date', { ascending: false }).limit(20),
      supabase().from('adjustment_candidates').select('id, purchase_id, potential_savings_cents, days_remaining, status, new_price_cents, purchase_price_cents').order('days_remaining', { ascending: false }).limit(20),
    ]).then(([w, p, a]) => {
      if (cancelled) return;
      setWatches((w.data ?? []) as unknown as WatchRow[]);
      setPurchases((p.data ?? []) as unknown as PurchaseRow[]);
      setAdjustments((a.data ?? []) as AdjustmentRow[]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

          {loading && <div className="cs-card cs-stack" aria-busy="true"><div className="cs-skeleton" style={{ width: '60%' }} /></div>}

          {!loading && section === 'watching' && (
            <>
              {watches.length === 0 ? (
                <div className="cs-empty">
                  <p>You are not watching any products.</p>
                  <p className="cs-muted">Watch a product to get notified when its verified price changes.</p>
                  <button className="cs-button" onClick={() => location.assign('/scan')}>Scan a product</button>
                </div>
              ) : (
                <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {watches.map((w) => (
                    <li key={w.id} className="cs-card">
                      <div className="cs-strong">{firstObj(w.products)?.canonical_name ?? 'Unknown'}</div>
                      <div className="cs-muted">
                        {w.notify_any_drop && <span className="cs-pill">any drop</span>}
                        {w.notify_clearance && <span className="cs-pill cs-pill--clearance">.97</span>}
                        {w.notify_manager_markdown && <span className="cs-pill cs-pill--aging">manager</span>}
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
                      <div className="cs-strong">{firstObj(p.products)?.canonical_name ?? 'Unknown'}</div>
                      <div className="cs-muted">
                        {firstObj(p.warehouses)?.name} · {new Date(p.purchase_date).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {!loading && section === 'adjustments' && (
            <>
              {adjustments.length === 0 ? (
                <div className="cs-empty">
                  <p>No adjustment opportunities yet.</p>
                  <p className="cs-muted">If a price drops within 30 days of your purchase, we will surface it here.</p>
                </div>
              ) : (
                <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {adjustments.map((a) => (
                    <li key={a.id} className="cs-card">
                      <div className="cs-strong">Potential recovery</div>
                      <div className="cs-muted">${(a.potential_savings_cents / 100).toFixed(2)} · {a.days_remaining} days remaining</div>
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
