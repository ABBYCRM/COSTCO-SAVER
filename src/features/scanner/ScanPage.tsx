import { useEffect, useRef, useState } from 'react';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useHistory } from 'react-router';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useWarehouse } from '@stores/warehouse';
import { normalizeBarcode, type BarcodeKind } from '@domain/barcodes/normalizeBarcode';
import { classifyPriceCode } from '@domain/pricing/priceCodeEngine';
import { cents, fromMajorUnits, formatUSD } from '@domain/money/cents';
import {
  createProvisionalProduct,
  findProductByBarcode,
  searchProducts,
} from '@services/api/search';
import { submitShelfObservation } from '@services/api/observations';

type ScanMode = 'barcode' | 'shelf_tag';

interface ScannerHandle {
  scan: () => Promise<string | null>;
}

interface ResolvedProduct {
  id: string;
  label: string;
}

export function ScanPage(): JSX.Element {
  const history = useHistory();
  const { selected } = useWarehouse();
  const [mode, setMode] = useState<ScanMode>('barcode');
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualItemNumber, setManualItemNumber] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductBrand, setNewProductBrand] = useState('');
  const [hasAsterisk, setHasAsterisk] = useState(false);
  const [resolvedProduct, setResolvedProduct] = useState<ResolvedProduct | null>(null);
  const [unknownBarcodeType, setUnknownBarcodeType] = useState<BarcodeKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const scannerRef = useRef<ScannerHandle | null>(null);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('@capacitor/barcode-scanner');
        if (cancelled) return;
        const scanner = mod.CapacitorBarcodeScanner;
        scannerRef.current = {
          scan: async () => {
            const result = await scanner.scanBarcode({ hint: 17 });
            return (result as { ScanResult?: string } | null)?.ScanResult ?? null;
          },
        };
      } catch {
        scannerRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function resolveBarcode(content: string): Promise<void> {
    const raw = content.trim();
    if (!raw) return;
    const previous = lastScanRef.current;
    if (previous && previous.value === raw && Date.now() - previous.at < 2_000) return;
    lastScanRef.current = { value: raw, at: Date.now() };

    const normalized = normalizeBarcode(raw);
    if (normalized.kind === 'UNKNOWN' || !normalized.checkDigitValid) {
      setManualBarcode(raw);
      setUnknownBarcodeType(normalized.kind === 'UNKNOWN' ? null : normalized.kind);
      setResolvedProduct(null);
      setError(
        normalized.checkDigitValid
          ? 'This identifier is not a supported retail barcode. Enter the item details below.'
          : 'The barcode check digit is invalid. Re-scan or correct the number.',
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      const product = await findProductByBarcode(normalized.value);
      if (product) {
        setResolvedProduct({ id: product.id, label: normalized.value });
        setUnknownBarcodeType(null);
        history.push(`/product/${product.id}`);
        return;
      }
      setManualBarcode(normalized.value);
      setUnknownBarcodeType(normalized.kind);
      setResolvedProduct(null);
      setError('New barcode. Add the product once, then this barcode will resolve for every shopper.');
    } finally {
      setBusy(false);
    }
  }

  async function resolveItemNumber(): Promise<ResolvedProduct | null> {
    const item = manualItemNumber.trim();
    if (!item) return resolvedProduct;
    const hits = await searchProducts(item, 10);
    const exact = hits.find(
      (hit) => hit.identifierType === 'COSTCO_ITEM_NUMBER' && hit.identifier === item,
    );
    if (exact) {
      const resolved = { id: exact.productId, label: exact.canonicalName };
      setResolvedProduct(resolved);
      return resolved;
    }
    return resolvedProduct;
  }

  async function createUnknownProduct(): Promise<void> {
    if (!newProductName.trim()) {
      setError('Enter the product name shown on the package or shelf tag.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const product = await createProvisionalProduct({
        canonicalName: newProductName.trim(),
        brand: newProductBrand.trim() || null,
        barcode: manualBarcode.trim() || null,
        barcodeType: unknownBarcodeType,
        costcoItemNumber: manualItemNumber.trim() || null,
      });
      setResolvedProduct({ id: product.id, label: newProductName.trim() });

      if (selected && manualPrice.trim()) {
        const price = Number(manualPrice);
        if (!Number.isFinite(price) || price <= 0) {
          throw new Error('Enter a valid shelf price.');
        }
        await submitShelfObservation({
          productId: product.id,
          warehouseId: selected.id,
          priceCents: fromMajorUnits(price) as number,
          hasAsterisk,
          idempotencyKey: crypto.randomUUID(),
          sourceType: 'manual_shelf_entry',
        });
      }
      history.push(`/product/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setBusy(false);
    }
  }

  async function submitManualShelfObservation(): Promise<void> {
    if (!selected) {
      setError('Pick a warehouse first.');
      return;
    }
    const priceMajor = Number(manualPrice);
    if (!Number.isFinite(priceMajor) || priceMajor <= 0) {
      setError('Enter a valid price.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const product = await resolveItemNumber();
      if (!product) {
        if (newProductName.trim()) {
          await createUnknownProduct();
          return;
        }
        setError('Scan the product barcode, enter a known Costco item number, or add the product name.');
        return;
      }

      const priceCents = fromMajorUnits(priceMajor) as number;
      const classification = classifyPriceCode({ priceCents: cents(priceCents), hasAsterisk });
      await submitShelfObservation({
        productId: product.id,
        warehouseId: selected.id,
        priceCents,
        hasAsterisk,
        idempotencyKey: crypto.randomUUID(),
        sourceType: 'manual_shelf_entry',
      });
      setLastResult(
        `Recorded ${formatUSD(cents(priceCents))} at ${selected.name} · ${classification.classification}`,
      );
      await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
      history.push(`/product/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit observation');
    } finally {
      setBusy(false);
    }
  }

  const pricePreview = Number(manualPrice);
  const preview =
    Number.isFinite(pricePreview) && pricePreview > 0
      ? classifyPriceCode({
          priceCents: cents(Math.round(pricePreview * 100)),
          hasAsterisk,
        })
      : null;

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
              Add shelf price
            </IonButton>
          </div>

          {mode === 'barcode' && (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-4)' }}>
              <h3 className="cs-strong" style={{ margin: 0 }}>Product barcode</h3>
              <p className="cs-muted">
                Use the camera on iOS/Android. Manual entry remains available if camera access is unavailable.
              </p>
              <IonButton
                expand="block"
                disabled={busy}
                onClick={async () => {
                  try {
                    if (!scannerRef.current) {
                      setError('Camera scanner is unavailable in this runtime. Enter the barcode manually.');
                      return;
                    }
                    const result = await scannerRef.current.scan();
                    if (result) await resolveBarcode(result);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Scanner failed');
                  }
                }}
              >
                Open scanner
              </IonButton>
              <IonItem>
                <IonLabel position="stacked">Manual barcode</IonLabel>
                <IonInput
                  value={manualBarcode}
                  inputMode="numeric"
                  onIonChange={(e) => setManualBarcode(e.detail.value ?? '')}
                  placeholder="UPC or EAN"
                />
              </IonItem>
              <IonButton
                expand="block"
                onClick={() => resolveBarcode(manualBarcode)}
                disabled={busy || !manualBarcode.trim()}
              >
                Look up
              </IonButton>
            </section>
          )}

          {(unknownBarcodeType || (manualBarcode && !resolvedProduct)) && (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-4)' }}>
              <h3 className="cs-strong" style={{ margin: 0 }}>Add this product</h3>
              <IonItem>
                <IonLabel position="stacked">Product name</IonLabel>
                <IonInput value={newProductName} onIonChange={(e) => setNewProductName(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Brand (optional)</IonLabel>
                <IonInput value={newProductBrand} onIonChange={(e) => setNewProductBrand(e.detail.value ?? '')} />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Costco item number (optional)</IonLabel>
                <IonInput
                  value={manualItemNumber}
                  inputMode="numeric"
                  onIonChange={(e) => setManualItemNumber(e.detail.value ?? '')}
                />
              </IonItem>
              <IonButton expand="block" onClick={createUnknownProduct} disabled={busy || !newProductName.trim()}>
                Create product
              </IonButton>
            </section>
          )}

          {mode === 'shelf_tag' && (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-4)' }}>
              <h3 className="cs-strong" style={{ margin: 0 }}>Warehouse shelf price</h3>
              <p className="cs-muted">
                Reporting at <span className="cs-strong">{selected?.name ?? 'no warehouse selected'}</span>.
              </p>
              {resolvedProduct && (
                <p className="cs-muted">
                  Product: <span className="cs-strong">{resolvedProduct.label}</span>
                </p>
              )}
              <IonItem>
                <IonLabel position="stacked">Costco item number</IonLabel>
                <IonInput
                  inputMode="numeric"
                  value={manualItemNumber}
                  onIonChange={(e) => setManualItemNumber(e.detail.value ?? '')}
                  placeholder="Use this if you did not scan the product"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Product name if new</IonLabel>
                <IonInput
                  value={newProductName}
                  onIonChange={(e) => setNewProductName(e.detail.value ?? '')}
                  placeholder="Only needed for a new item number"
                />
              </IonItem>
              <IonItem>
                <IonLabel position="stacked">Price (USD)</IonLabel>
                <IonInput
                  inputMode="decimal"
                  value={manualPrice}
                  onIonChange={(e) => setManualPrice(e.detail.value ?? '')}
                  placeholder="e.g. 19.97"
                />
              </IonItem>
              <IonItem>
                <IonLabel>Asterisk on shelf tag</IonLabel>
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
                {busy ? 'Submitting…' : 'Record shelf price'}
              </IonButton>
              {!selected && <IonNote color="warning">Pick a warehouse on Home first.</IonNote>}
            </section>
          )}

          {preview && (
            <p className="cs-muted">
              Markdown classification: <span className="cs-pill cs-pill--clearance">{preview.classification}</span>
              {preview.hasAsterisk && <> · <span className="cs-pill cs-pill--aging">asterisk</span></>}
            </p>
          )}
          {error && <p role="alert" style={{ color: 'var(--cs-danger)' }}>{error}</p>}
          {lastResult && <p className="cs-strong" role="status">{lastResult}</p>}
        </div>
      </IonContent>
    </IonPage>
  );
}
