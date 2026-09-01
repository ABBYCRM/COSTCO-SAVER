import { useCallback, useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { listWarehouses, type WarehouseRow } from '@services/api/warehouses';
import { listPriceEvents, type PriceEvent } from '@services/api/events';
import { useWarehouse } from '@stores/warehouse';
import { WarehousePicker } from '@features/warehouses/WarehousePicker';
import { CoverageCard } from '@features/warehouses/CoverageCard';
import { formatUSD, cents } from '@domain/money/cents';

export function HomePage(): JSX.Element {
  const { selected, setSelected } = useWarehouse();
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [drops, setDrops] = useState<PriceEvent[]>([]);
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

  const loadDrops = useCallback(async () => {
    if (!selected) return;
    setLoadingDrops(true);
    setError(null);
    try {
      setDrops(await listPriceEvents(selected.id, 'price_drop'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load price drops');
    } finally {
      setLoadingDrops(false);
    }
  }, [selected]);

  useEffect(() => {
    void loadDrops();
  }, [loadDrops]);

  const doRefresh = async (event?: CustomEvent) => {
    await loadDrops();
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

          {selected && (
            <div style={{ marginTop: 'var(--cs-space-3)' }}>
              <CoverageCard warehouseId={selected.id} />
            </div>
          )}

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
              {drops.map((drop) => (
                <li key={drop.id} className="cs-card">
                  <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div className="cs-strong">{drop.product_name}</div>
                      {drop.brand && <div className="cs-muted">{drop.brand}</div>}
                      <div className="cs-muted">{drop.warehouse_name} · {new Date(drop.effective_at).toLocaleString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="cs-price cs-strong" style={{ fontSize: 'var(--cs-font-size-5)' }}>
                        {formatUSD(cents(drop.new_price_cents))}
                      </div>
                      {drop.old_price_cents != null && (
                        <div className="cs-muted">was {formatUSD(cents(drop.old_price_cents))}</div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <WarehousePicker
          isOpen={showPicker}
          warehouses={warehouses}
          onDismiss={() => setShowPicker(false)}
          onSelect={(warehouse) => {
            setSelected(warehouse);
            setShowPicker(false);
          }}
        />
      </IonContent>
    </IonPage>
  );
}
