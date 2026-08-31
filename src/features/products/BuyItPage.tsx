import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonBackButton, IonButtons, IonInput, IonItem, IonLabel } from '@ionic/react';
import { useWarehouse } from '@stores/warehouse';
import { createPurchase } from '@services/api/purchases';
import { cents, formatUSD, fromMajorUnits } from '@domain/money/cents';
import { supabase } from '@services/supabase/client';

interface ExistingPrice {
  consensus_price_cents: number | null;
}

export function BuyItPage(): JSX.Element {
  const { productId } = useParams<{ productId: string }>();
  const history = useHistory();
  const { selected } = useWarehouse();
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existing, setExisting] = useState<ExistingPrice | null>(null);

  // Pre-fill with the current consensus price when present.
  useEffect(() => {
    if (!productId || !selected) return;
    let cancelled = false;
    supabase()
      .from('warehouse_product_state')
      .select('consensus_price_cents')
      .eq('product_id', productId)
      .eq('warehouse_id', selected.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const row = data as ExistingPrice | null;
        if (row?.consensus_price_cents != null) {
          setUnitPrice(((row.consensus_price_cents as number) / 100).toFixed(2));
          setExisting(row);
        }
      });
    return () => { cancelled = true; };
  }, [productId, selected]);

  async function submit() {
    if (!productId || !selected) {
      setError('Pick a warehouse on Home first.');
      return;
    }
    const unitCents = fromMajorUnits(Number(unitPrice));
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Enter a valid quantity');
      return;
    }
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
            You can adjust the price you actually paid below.
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
              inputMode="numeric"
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
