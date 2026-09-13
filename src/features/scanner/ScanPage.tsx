import { useEffect, useRef, useState } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton } from '@ionic/react';
import { requireUserId, supabase } from '@services/supabase/client';
import { useWarehouse } from '@stores/warehouse';
import { normalizeBarcode, type BarcodeKind } from '@domain/barcodes/normalizeBarcode';
import { classifyPriceCode } from '@domain/pricing/priceCodeEngine';
import { cents, fromMajorUnits, formatUSD } from '@domain/money/cents';
import { submitShelfObservation } from '@services/api/observations';

type ScanMode = 'barcode' | 'shelf_tag';

interface ScannerHandle {
  scan: () => Promise<string | null>;
}

/**
 * Scan page. Spec §47, §52, §69.
 *
 * Two modes:
 *   - barcode: native camera scanner (Capacitor) or manual entry, looks up
 *     the product by identifier, writes scan_history.
 *   - shelf_tag: enter the displayed price + item number, writes a real
 *     price_observation via submitShelfObservation.
 *
 * UI uses the COSTCO-SAVER design system: native form controls styled by
 * global.css, segment control for mode, error / success states use the
 * .cs-state / .cs-error conventions.
 */
export function ScanPage(): JSX.Element {
  const { selected } = useWarehouse();
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualItemNumber, setManualItemNumber] = useState('');
  const [hasAsterisk, setHasAsterisk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const scannerRef = useRef<ScannerHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('@capacitor/barcode-scanner');
        if (cancelled) return;
        const Sc = mod.CapacitorBarcodeScanner;
        scannerRef.current = {
          scan: async () => {
            const result = await Sc.scanBarcode({ hint: 17 /* ALL */ });
            if (result && (result as { ScanResult?: string }).ScanResult) {
              return (result as { ScanResult: string }).ScanResult;
            }
            return null;
          },
        };
      } catch (err) {
        // Web runtime: scanner plugin not available, fall back to manual entry.
        console.warn('Native barcode scanner unavailable, using manual entry only', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onBarcodeScanned(content: string): Promise<void> {
    const normalized = normalizeBarcode(content);
    if (!normalized.value) {
      setError('Empty barcode.');
      return;
    }
    if (normalized.kind === 'UNKNOWN' || !normalized.checkDigitValid) {
      setManualBarcode(content);
      setError(
        normalized.checkDigitValid
          ? 'That looked like an internal item number. Fill in the product info and submit.'
          : 'Barcode check digit is wrong. Re-scan or enter manually.',
      );
      return;
    }
    const { data, error: err } = await supabase()
      .from('product_identifiers')
      .select('product_id, products(id, canonical_name, brand)')
      .eq('identifier_type', normalized.kind as BarcodeKind)
      .eq('normalized_value', normalized.value)
      .limit(1)
      .maybeSingle();
    if (err) {
      setError(err.message);
      return;
    }
    const product = (data as { products: { id: string } | { id: string }[] | null } | null)?.products;
    const productId = Array.isArray(product) ? product[0]?.id : product?.id;
    if (productId) {
      try {
        const userId = await requireUserId();
        await supabase().from('scan_history').insert({
          user_id: userId,
          product_id: productId,
          barcode_normalized: normalized.value,
          warehouse_id: selected?.id ?? null,
        });
      } catch {
        // History is best-effort; lookup still succeeds.
      }
      window.location.assign(`/product/${productId}`);
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
      let productId: string | null = null;
      const item = manualItemNumber.trim();
      if (item) {
        const { data, error: idErr } = await supabase()
          .from('product_identifiers')
          .select('product_id')
          .eq('identifier_type', 'COSTCO_ITEM_NUMBER')
          .eq('normalized_value', item)
          .maybeSingle();
        if (idErr) throw idErr;
        productId = (data as { product_id: string } | null)?.product_id ?? null;
      }
      if (!productId && manualBarcode.trim()) {
        const normalized = normalizeBarcode(manualBarcode);
        if (normalized.value) {
          const { data } = await supabase()
            .from('product_identifiers')
            .select('product_id')
            .eq('normalized_value', normalized.value)
            .limit(1)
            .maybeSingle();
          productId = (data as { product_id: string } | null)?.product_id ?? null;
        }
      }
      if (!productId) {
        setError(
          'Unknown product. Scan or look up the barcode first, or enter a Costco item number already in the catalog.',
        );
        return;
      }
      await submitShelfObservation({
        productId,
        warehouseId: selected.id,
        priceCents: priceCents as number,
        hasAsterisk,
        idempotencyKey: crypto.randomUUID(),
      });
      const classification = classifyPriceCode({ priceCents, hasAsterisk });
      setLastResult(`Submitted: ${formatUSD(priceCents)} (${classification.classification})`);
      window.location.assign(`/product/${productId}`);
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
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>Scan</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          <header className="cs-header">
            <span className="cs-header__eyebrow">Submit</span>
            <h2 className="cs-header__title">What did you see?</h2>
            <p className="cs-header__sub">A barcode, a price tag, or an item number.</p>
          </header>

          <div className="cs-segment" role="tablist" aria-label="Scan mode">
            <button
              type="button"
              className="cs-segment__item"
              role="tab"
              aria-pressed={mode === 'barcode'}
              onClick={() => setMode('barcode')}
            >
              Barcode
            </button>
            <button
              type="button"
              className="cs-segment__item"
              role="tab"
              aria-pressed={mode === 'shelf_tag'}
              onClick={() => setMode('shelf_tag')}
            >
              Shelf tag
            </button>
          </div>

          {mode === 'barcode' && (
            <section className="cs-card cs-stack">
              <h3 className="cs-strong" style={{ margin: 0 }}>Product barcode</h3>
              <p className="cs-muted" style={{ margin: 0 }}>Native cameras open automatically. Web falls back to manual entry.</p>
              <button
                type="button"
                className="cs-button"
                onClick={() => scannerRef.current?.scan().then((c) => c ? onBarcodeScanned(c) : null).catch((err: Error) => setError(err.message ?? 'Scanner failed'))}
              >
                Open scanner
              </button>
              <label className="cs-field">
                <span className="cs-field__label">Manual entry</span>
                <input
                  className="cs-field__input"
                  value={manualBarcode}
                  inputMode="numeric"
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="UPC, EAN, or Costco item number"
                />
              </label>
              <button
                type="button"
                className="cs-button cs-button--ghost"
                onClick={() => onBarcodeScanned(manualBarcode).catch((err: Error) => setError(err.message ?? 'Lookup failed'))}
                disabled={!manualBarcode}
                aria-disabled={!manualBarcode}
              >
                Look up
              </button>
            </section>
          )}

          {mode === 'shelf_tag' && (
            <section className="cs-card cs-stack">
              <h3 className="cs-strong" style={{ margin: 0 }}>Shelf tag</h3>
              <p className="cs-muted" style={{ margin: 0 }}>Enter the displayed price and the Costco item number if visible.</p>
              <label className="cs-field">
                <span className="cs-field__label">Price (USD)</span>
                <input
                  className="cs-field__input"
                  inputMode="decimal"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  placeholder="e.g. 19.97"
                />
              </label>
              <label className="cs-field">
                <span className="cs-field__label">Costco item number (optional)</span>
                <input
                  className="cs-field__input"
                  inputMode="numeric"
                  value={manualItemNumber}
                  onChange={(e) => setManualItemNumber(e.target.value)}
                  placeholder="e.g. 1234567"
                />
              </label>
              <label className="cs-field cs-field--row">
                <span className="cs-field__label">Asterisk on tag (no restock)</span>
                <input
                  type="checkbox"
                  className="cs-field__checkbox"
                  checked={hasAsterisk}
                  onChange={(e) => setHasAsterisk(e.target.checked)}
                />
              </label>
              <button
                type="button"
                className="cs-button"
                onClick={submitManualShelfObservation}
                disabled={busy || !manualPrice || !selected}
                aria-disabled={busy || !manualPrice || !selected}
              >
                {busy ? 'Submitting…' : 'Submit observation'}
              </button>
              {!selected && (
                <p className="cs-muted">Pick a warehouse on Home first.</p>
              )}
            </section>
          )}

          {error && (
            <p role="alert" className="cs-error">{error}</p>
          )}
          {lastResult && (
            <p role="status" className="cs-success">{lastResult}</p>
          )}
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
