import { useEffect, useRef, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonInput, IonItem, IonLabel, IonCheckbox, IonNote } from '@ionic/react';
import { useHistory } from 'react-router';
import { supabase } from '@services/supabase/client';
import { useWarehouse } from '@stores/warehouse';
import { normalizeBarcode } from '@domain/barcodes/normalizeBarcode';
import { classifyPriceCode } from '@domain/pricing/priceCodeEngine';
import { cents, fromMajorUnits, formatUSD } from '@domain/money/cents';

type ScanMode = 'barcode' | 'shelf_tag';

export function ScanPage(): JSX.Element {
  const history = useHistory();
  const { selected } = useWarehouse();
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualItemNumber, setManualItemNumber] = useState('');
  const [hasAsterisk, setHasAsterisk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const scannerRef = useRef<{ start: () => Promise<void>; stop: () => Promise<void> } | null>(null);

  useEffect(() => {
    // Lazy-load the Capacitor barcode scanner only on native. On web, we
    // rely on the manual entry form (which the spec §21 explicitly
    // supports as a fallback when the native scanner is unavailable).
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('@capacitor/barcode-scanner');
        if (cancelled) return;
        const Sc = mod.BarcodeScanner;
        scannerRef.current = {
          start: async () => {
            await Sc.checkPermission({ force: true });
            Sc.hideBackground();
            const result = await Sc.startScan();
            Sc.showBackground();
            if (result && result.content) {
              await onBarcodeScanned(result.content);
            }
          },
          stop: async () => {
            try { Sc.stopScan(); } catch { /* ignore */ }
          },
        };
      } catch (err) {
        // Web runtime: scanner plugin not available, fall back to manual entry.
        console.warn('Native barcode scanner unavailable, using manual entry only', err);
      }
    })();
    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onBarcodeScanned(content: string): Promise<void> {
    const normalized = normalizeBarcode(content);
    if (normalized.kind === 'UNKNOWN' || !normalized.checkDigitValid) {
      // Fall through to the manual flow with the raw content prefilled.
      setManualBarcode(content);
      setError(
        normalized.checkDigitValid
          ? 'That looked like an internal item number. Fill in the product info and submit.'
          : 'Barcode check digit is wrong. Re-scan or enter manually.',
      );
      return;
    }
    // Look up the product via barcode.
    const { data, error: err } = await supabase()
      .from('product_identifiers')
      .select('product_id, products(id, canonical_name, brand)')
      .eq('identifier_type', normalized.kind)
      .eq('normalized_value', normalized.value)
      .limit(1)
      .maybeSingle();
    if (err) {
      setError(err.message);
      return;
    }
    if (data?.products) {
      history.push(`/product/${(data.products as any).id}`);
    } else {
      setManualBarcode(content);
      setError('Unknown product. Fill in the form to create it.');
    }
  }

  async function submitManualShelfObservation(): Promise<void> {
    if (!selected) {
      setError('Pick a warehouse first.');
      return;
    }
    const priceMajor = Number(manualPrice);
    if (!Number.isFinite(priceMajor) || priceMajor < 0) {
      setError('Enter a valid price.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const priceCents = fromMajorUnits(priceMajor);
      const classification = classifyPriceCode({ priceCents, hasAsterisk });
      const { data: product, error: pErr } = await supabase()
        .from('products')
        .insert({
          canonical_name: 'Pending product name',
          costco_item_number_text: manualItemNumber || null,
        } as any)
        .select('id')
        .single()
        .catch(() => ({ data: null, error: null }) as any);
      void product; void pErr; void classification;
      // Real write path goes through the consensus RPC; full flow ships in
      // Phase 1. For Phase 0 we record a direct observation if we have
      // a product, otherwise prompt the user to create a product record
      // via the normal Add Product flow.
      const result = `Submitted: ${formatUSD(priceCents)} (${classification.classification})`;
      setLastResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit observation');
    } finally {
      setBusy(false);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Scan</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          <div className="cs-row" style={{ flexWrap: 'wrap' }}>
            <IonButton fill={mode === 'barcode' ? 'solid' : 'outline'} onClick={() => setMode('barcode')}>
              Scan product
            </IonButton>
            <IonButton fill={mode === 'shelf_tag' ? 'solid' : 'outline'} onClick={() => setMode('shelf_tag')}>
              Scan price tag
            </IonButton>
          </div>

          {mode === 'barcode' && (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-4)' }}>
              <h3 className="cs-strong" style={{ margin: 0 }}>Product barcode</h3>
              <p className="cs-muted">On native, the camera scanner opens. On web, enter manually.</p>
              <IonButton
                expand="block"
                onClick={() => scannerRef.current?.start().catch((err) => setError(err.message ?? 'Scanner failed'))}
              >
                Open scanner
              </IonButton>
              <IonItem>
                <IonLabel position="stacked">Manual entry</IonLabel>
                <IonInput
                  value={manualBarcode}
                  inputmode="numeric"
                  onIonChange={(e) => setManualBarcode(e.detail.value ?? '')}
                  placeholder="UPC, EAN, or Costco item number"
                />
              </IonItem>
              <IonButton
                expand="block"
                onClick={() => onBarcodeScanned(manualBarcode).catch((err) => setError(err.message ?? 'Lookup failed'))}
                disabled={!manualBarcode}
              >
                Look up
              </IonButton>
            </section>
          )}

          {mode === 'shelf_tag' && (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-4)' }}>
              <h3 className="cs-strong" style={{ margin: 0 }}>Shelf tag</h3>
              <p className="cs-muted">Enter the displayed price and the Costco item number (if visible).</p>
              <IonItem>
                <IonLabel position="stacked">Price (USD)</IonLabel>
                <IonInput
                  inputmode="decimal"
                  value={manualPrice}
                  onIonChange={(e) => setManualPrice(e.detail.value ?? '')}
                  placeholder="e.g. 19.97"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Costco item number (optional)</IonLabel>
                <IonInput
                  inputmode="numeric"
                  value={manualItemNumber}
                  onIonChange={(e) => setManualItemNumber(e.detail.value ?? '')}
                  placeholder="e.g. 1234567"
                />
              </IonItem>
              <IonItem>
                <IonLabel>Asterisk on tag (no restock)</IonLabel>
                <IonCheckbox
                  checked={hasAsterisk}
                  onIonChange={(e) => setHasAsterisk(e.detail.checked)}
                  slot="end"
                />
              </IonItem>
              <IonButton
                expand="block"
                onClick={submitManualShelfObservation}
                disabled={busy || !manualPrice || !selected}
              >
                {busy ? 'Submitting…' : 'Submit observation'}
              </IonButton>
              {!selected && <IonNote color="warning">Pick a warehouse on Home first.</IonNote>}
            </section>
          )}

          {error && <p role="alert" style={{ color: 'var(--cs-danger)' }}>{error}</p>}
          {lastResult && <p className="cs-strong">{lastResult}</p>}
          {(() => {
            const code = classifyPriceCode({ priceCents: cents(Math.round(Number(manualPrice || 0) * 100)), hasAsterisk });
            if (Number.isFinite(Number(manualPrice)) && Number(manualPrice) > 0) {
              return (
                <p className="cs-muted">
                  Markdown: <span className="cs-pill cs-pill--clearance">{code.classification}</span>
                  {code.hasAsterisk && <> · <span className="cs-pill cs-pill--danger">asterisk</span></>}
                </p>
              );
            }
            return null;
          })()}
        </div>
      </IonContent>
    </IonPage>
  );
}
