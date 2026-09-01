import { useEffect, useMemo, useState } from 'react';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useHistory } from 'react-router';
import { listWarehouses, type WarehouseRow } from '@services/api/warehouses';
import {
  compareTrip,
  deleteShoppingItem,
  listShoppingItems,
  updateShoppingItem,
  type ShoppingItem,
  type TripWarehouse,
} from '@services/api/shopping';
import { cents, formatUSD } from '@domain/money/cents';

export function TripPage(): JSX.Element {
  const history = useHistory();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<TripWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextItems, nextWarehouses] = await Promise.all([listShoppingItems(), listWarehouses()]);
      setItems(nextItems);
      setWarehouses(nextWarehouses);
      if (!selectedIds.length) setSelectedIds(nextWarehouses.slice(0, 3).map((w) => w.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Trip Mode');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const activeItems = useMemo(() => items.filter((item) => !item.checked), [items]);

  async function refreshComparison() {
    if (!selectedIds.length) {
      setError('Select at least one warehouse.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setComparison(await compareTrip(selectedIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare warehouses');
    } finally {
      setBusy(false);
    }
  }

  async function toggleItem(item: ShoppingItem, checked: boolean) {
    try {
      const updated = await updateShoppingItem(item.id, { checked });
      setItems((rows) => rows.map((row) => (row.id === item.id ? { ...row, ...updated } : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    }
  }

  async function updateQuantity(item: ShoppingItem, value: string) {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    try {
      const updated = await updateShoppingItem(item.id, { quantity });
      setItems((rows) => rows.map((row) => (row.id === item.id ? { ...row, ...updated } : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quantity');
    }
  }

  async function remove(item: ShoppingItem) {
    try {
      await deleteShoppingItem(item.id);
      setItems((rows) => rows.filter((row) => row.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Trip Mode</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          <section className="cs-card">
            <h2 className="cs-section-title" style={{ marginTop: 0 }}>
              Shopping list
            </h2>
            {loading && (
              <p className="cs-muted" aria-busy="true">
                Loading…
              </p>
            )}
            {!loading && items.length === 0 && (
              <div className="cs-empty">
                <p>Your shopping list is empty.</p>
                <IonButton onClick={() => history.push('/search')}>Find products</IonButton>
              </div>
            )}
            <ul className="cs-stack" style={{ listStyle: 'none', padding: 0 }}>
              {items.map((item) => (
                <li
                  key={item.id}
                  className="cs-row"
                  style={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div className="cs-row" style={{ flex: 1 }}>
                    <IonCheckbox
                      aria-label={`Mark ${item.canonical_name} complete`}
                      checked={item.checked}
                      onIonChange={(e) => void toggleItem(item, e.detail.checked)}
                    />
                    <button
                      className="cs-link-button"
                      onClick={() => history.push(`/product/${item.product_id}`)}
                    >
                      <span className="cs-strong">{item.canonical_name}</span>
                      {item.brand && <span className="cs-muted">{item.brand}</span>}
                    </button>
                  </div>
                  <IonInput
                    aria-label={`Quantity for ${item.canonical_name}`}
                    value={String(item.quantity)}
                    inputMode="decimal"
                    style={{ maxWidth: 80 }}
                    onIonBlur={(e) =>
                      void updateQuantity(
                        item,
                        String((e.target as HTMLIonInputElement).value ?? item.quantity),
                      )
                    }
                  />
                  <IonButton size="small" fill="clear" onClick={() => void remove(item)}>
                    Remove
                  </IonButton>
                </li>
              ))}
            </ul>
          </section>

          <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
            <h2 className="cs-section-title" style={{ marginTop: 0 }}>
              Compare warehouses
            </h2>
            <p className="cs-muted">Unknown prices are excluded from basket totals, never counted as zero.</p>
            <div className="cs-stack">
              {warehouses.map((warehouse) => (
                <IonItem key={warehouse.id}>
                  <IonCheckbox
                    slot="start"
                    checked={selectedIds.includes(warehouse.id)}
                    onIonChange={(e) =>
                      setSelectedIds((ids) =>
                        e.detail.checked
                          ? [...new Set([...ids, warehouse.id])]
                          : ids.filter((id) => id !== warehouse.id),
                      )
                    }
                  />
                  <IonLabel>
                    {warehouse.name} · {warehouse.city}, {warehouse.state}
                  </IonLabel>
                </IonItem>
              ))}
            </div>
            <IonButton
              expand="block"
              disabled={busy || activeItems.length === 0}
              onClick={() => void refreshComparison()}
            >
              {busy ? 'Comparing…' : 'Compare trip'}
            </IonButton>
          </section>

          {comparison.length > 0 && (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
              <h2 className="cs-section-title" style={{ marginTop: 0 }}>
                Trip comparison
              </h2>
              <ul className="cs-stack" style={{ listStyle: 'none', padding: 0 }}>
                {comparison.map((row) => (
                  <li key={row.warehouse_id} className="cs-row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div className="cs-strong">{row.warehouse_name}</div>
                      <div className="cs-muted">
                        {row.priced_items} of {row.list_items} active items priced
                      </div>
                    </div>
                    <div className="cs-price cs-strong">
                      {formatUSD(cents(Number(row.known_basket_cents)))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {error && (
            <p role="alert" style={{ color: 'var(--cs-danger)' }}>
              {error}
            </p>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
