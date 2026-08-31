import { useEffect, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonRefresher, IonRefresherContent } from '@ionic/react';
import { supabase } from '@services/supabase/client';
import { listWarehouses, type WarehouseRow } from '@services/api/warehouses';
import { useWarehouse } from '@stores/warehouse';
import { WarehousePicker } from '@features/warehouses/WarehousePicker';
import { formatUSD, cents } from '@domain/money/cents';
import { first, type MaybeArray } from '@services/api/joins';

interface DropResponse {
  product_id: string;
  warehouse_id: string;
  old_price_cents: number | null;
  new_price_cents: number;
  effective_at: string;
  products: MaybeArray<{ canonical_name: string; brand: string | null }>;
  warehouses: MaybeArray<{ name: string }>;
}

interface DropRow {
  product_id: string;
  product_name: string;
  brand: string | null;
  warehouse_id: string;
  warehouse_name: string;
  old_price_cents: number;
  new_price_cents: number;
  effective_at: string;
  markdown_class: string | null;
  freshness_class: string;
}

export function HomePage(): JSX.Element {
  const { selected, setSelected } = useWarehouse();
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [drops, setDrops] = useState<DropRow[]>([]);
  const [loadingDrops, setLoadingDrops] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    listWarehouses()
      .then((rows) => {
        setWarehouses(rows);
        if (!selected && rows[0]) setSelected(rows[0]);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load warehouses');
      });
  }, [selected, setSelected]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoadingDrops(true);
    supabase()
      .from('price_events')
      .select('product_id, warehouse_id, old_price_cents, new_price_cents, effective_at, event_type, products(canonical_name, brand), warehouses(name)')
      .eq('warehouse_id', selected.id)
      .eq('event_type', 'price_drop')
      .order('effective_at', { ascending: false })
      .limit(20)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setLoadingDrops(false);
          return;
        }
        const rows: DropRow[] = (data ?? []).map((d: DropResponse) => {
          const p = first(d.products);
          const w = first(d.warehouses);
          return {
            product_id: d.product_id,
            product_name: p?.canonical_name ?? 'Unknown product',
            brand: p?.brand ?? null,
            warehouse_id: d.warehouse_id,
            warehouse_name: w?.name ?? selected.name,
            old_price_cents: d.old_price_cents ?? 0,
            new_price_cents: d.new_price_cents,
            effective_at: d.effective_at,
            markdown_class: null,
            freshness_class: 'RECENT',
          };
        });
        setDrops(rows);
        setLoadingDrops(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const doRefresh = async (event?: CustomEvent) => {
    if (!selected) return;
    const { data, error: err } = await supabase()
      .from('price_events')
      .select('product_id, warehouse_id, old_price_cents, new_price_cents, effective_at, event_type, products(canonical_name, brand), warehouses(name)')
      .eq('warehouse_id', selected.id)
      .eq('event_type', 'price_drop')
      .order('effective_at', { ascending: false })
      .limit(20);
    if (!err) {
      const rows: DropRow[] = (data ?? []).map((d: DropResponse) => {
        const p = first(d.products);
        const w = first(d.warehouses);
        return {
          product_id: d.product_id,
          product_name: p?.canonical_name ?? 'Unknown product',
          brand: p?.brand ?? null,
          warehouse_id: d.warehouse_id,
          warehouse_name: w?.name ?? selected.name,
          old_price_cents: d.old_price_cents ?? 0,
          new_price_cents: d.new_price_cents,
          effective_at: d.effective_at,
          markdown_class: null,
          freshness_class: 'RECENT',
        };
      });
      setDrops(rows);
    }
    (event?.detail as { complete?: () => void } | undefined)?.complete?.();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>COSTCO-SAVER</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={doRefresh}>
          <IonRefresherContent />
        </IonRefresher>
        <div className="cs-page">
          <section className="cs-card">
            <p className="cs-muted" style={{ margin: 0 }}>Active warehouse</p>
            <h2 className="cs-strong" style={{ margin: 'var(--cs-space-1) 0 0 0' }}>
              {selected?.name ?? 'Pick a warehouse'}
            </h2>
            <div className="cs-row" style={{ marginTop: 'var(--cs-space-3)', flexWrap: 'wrap' }}>
              <button className="cs-button cs-button--ghost" onClick={() => setShowPicker(true)}>
                Switch warehouse
              </button>
              <button className="cs-button" onClick={() => location.assign('/search')}>
                Search products
              </button>
            </div>
          </section>

          <section style={{ marginTop: 'var(--cs-space-5)' }}>
            <h2 className="cs-section-title">Recent price drops</h2>
            {error && <p role="alert" style={{ color: 'var(--cs-danger)' }}>{error}</p>}
            {loadingDrops && (
              <div className="cs-card cs-stack" aria-busy="true">
                <div className="cs-skeleton" style={{ width: '60%' }} />
                <div className="cs-skeleton" style={{ width: '40%' }} />
              </div>
            )}
            {!loadingDrops && drops.length === 0 && (
              <div className="cs-empty">
                <p>No verified price drops at this warehouse yet.</p>
                <p className="cs-muted">Be the first to scan a shelf and submit a verified price.</p>
                <button className="cs-button" onClick={() => location.assign('/scan')}>Scan a shelf</button>
              </div>
            )}
            <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {drops.map((d) => (
                <li key={`${d.product_id}-${d.effective_at}`} className="cs-card">
                  <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div className="cs-strong">{d.product_name}</div>
                      {d.brand && <div className="cs-muted">{d.brand}</div>}
                    </div>
                    <div className="cs-price cs-strong" style={{ fontSize: 'var(--cs-font-size-5)' }}>
                      {formatUSD(cents(d.new_price_cents))}
                    </div>
                  </div>
                  {d.old_price_cents > 0 && (
                    <div className="cs-muted cs-price" style={{ marginTop: 'var(--cs-space-1)' }}>
                      was {formatUSD(cents(d.old_price_cents))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <WarehousePicker
          isOpen={showPicker}
          warehouses={warehouses}
          onDismiss={() => setShowPicker(false)}
          onSelect={(w) => {
            setSelected(w);
            setShowPicker(false);
          }}
        />
      </IonContent>
    </IonPage>
  );
}
