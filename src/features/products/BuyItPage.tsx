import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useWarehouse } from '@stores/warehouse';
import { createPurchase } from '@services/api/purchases';
import { getProduct, type ProductState } from '@services/api/products';
import { cents, formatUSD, fromMajorUnits } from '@domain/money/cents';

export function BuyItPage(): JSX.Element {
  const { productId } = useParams<{ productId: string }>();
  const history = useHistory();
  const { selected } = useWarehouse();
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existing, setExisting] = useState<ProductState | null>(null);

  useEffect(() => {
    if (!productId || !selected) return;
    let cancelled = false;
    getProduct(productId, selected.id)
      .then(({ state }) => {
        if (cancelled) return;
        setExisting(state);
        if (state?.consensus_price_cents != null) {
          setUnitPrice((state.consensus_price_cents / 100).toFixed(2));
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, selected]);

  async function submit() {
    if (!productId || !selected) {
      setError('Pick a warehouse on Home first.');
      return;
    }
    const price = Number(unitPrice);
    const qty = Number(quantity);
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty <= 0) {
      setError('Enter a valid price and quantity.');
      return;
    }
    const unitCents = fromMajorUnits(price);
    setBusy(true);
    setError(null);
    try {
      const purchase = await createPurchase({
        productId,
        warehouseId: selected.id,
        unitPriceCents: unitCents as number,
        quantity: qty,
        purchaseDate: new Date().toISOString(),
        source: 'manual',
      });
      setSuccess(`Recorded purchase at ${formatUSD(cents(purchase.total_cents))}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record purchase');
    } finally {
      setBusy(false);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle>Record purchase</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          <p className="cs-muted">
            Recording at <span className="cs-strong">{selected?.name ?? 'no warehouse'}</span>.
          </p>
          <IonItem>
            <IonLabel position="stacked">Price you paid (USD)</IonLabel>
            <IonInput
              inputMode="decimal"
              value={unitPrice}
              onIonChange={(e) => setUnitPrice(e.detail.value ?? '')}
              placeholder="e.g. 19.97"
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Quantity</IonLabel>
            <IonInput
              inputMode="decimal"
              value={quantity}
              onIonChange={(e) => setQuantity(e.detail.value ?? '')}
            />
          </IonItem>
          {error && <p role="alert" style={{ color: 'var(--cs-danger)' }}>{error}</p>}
          {success && <p className="cs-strong" role="status">{success}</p>}
          <div className="cs-row" style={{ marginTop: 'var(--cs-space-3)' }}>
            <IonButton onClick={submit} disabled={busy || !unitPrice || !selected}>
              {busy ? 'Saving…' : 'Save purchase'}
            </IonButton>
            <IonButton fill="outline" onClick={() => history.goBack()}>Cancel</IonButton>
          </div>
          {existing?.consensus_price_cents != null && (
            <p className="cs-muted" style={{ marginTop: 'var(--cs-space-3)' }}>
              Current verified price at this warehouse: {formatUSD(cents(existing.consensus_price_cents))}
            </p>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
