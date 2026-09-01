import { useEffect, useMemo, useState } from 'react';
import {
  IonButton,
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
import { searchProducts, type SearchHit } from '@services/api/search';
import { uploadEvidence } from '@services/api/media';
import { createReceipt, type ReceiptLineInput } from '@services/api/receipts';

interface EditableLine {
  key: string;
  query: string;
  product: SearchHit | null;
  quantity: string;
  unitPrice: string;
  discount: string;
}

function newLine(): EditableLine {
  return {
    key: crypto.randomUUID(),
    query: '',
    product: null,
    quantity: '1',
    unitPrice: '',
    discount: '0',
  };
}

export function ReceiptImportPage(): JSX.Element {
  const history = useHistory();
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([newLine()]);
  const [searchResults, setSearchResults] = useState<Record<string, SearchHit[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listWarehouses()
      .then((rows) => {
        setWarehouses(rows);
        if (rows[0]) setWarehouseId(rows[0].id);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const totalCents = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const unit = Number(line.unitPrice);
        const quantity = Number(line.quantity);
        const discount = Number(line.discount || 0);
        if (!Number.isFinite(unit) || !Number.isFinite(quantity) || !Number.isFinite(discount)) {
          return sum;
        }
        return sum + Math.max(0, Math.round(unit * 100 * quantity - discount * 100));
      }, 0),
    [lines],
  );

  function patchLine(key: string, patch: Partial<EditableLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  async function searchLine(line: EditableLine) {
    if (!line.query.trim()) return;
    try {
      setSearchResults((current) => ({ ...current, [line.key]: await searchProducts(line.query, 8) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Product search failed');
    }
  }

  async function submit() {
    if (!warehouseId) {
      setError('Select the warehouse shown on the receipt.');
      return;
    }
    const completed = lines.filter((line) => line.product && Number(line.unitPrice) >= 0);
    if (!completed.length) {
      setError('Add at least one matched product line.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const evidence = file
        ? await uploadEvidence(file, file.type === 'application/pdf' ? 'receipt_pdf' : 'receipt_image')
        : null;
      const payload: ReceiptLineInput[] = completed.map((line, index) => {
        const quantity = Number(line.quantity);
        const unitPriceCents = Math.round(Number(line.unitPrice) * 100);
        const discountCents = Math.round(Number(line.discount || 0) * 100);
        return {
          productId: line.product!.productId,
          rawDescription: line.query || line.product!.canonicalName,
          costcoItemNumber:
            line.product!.identifierType === 'COSTCO_ITEM_NUMBER' ? line.product!.identifier : null,
          quantity,
          unitPriceCents,
          discountCents,
          totalCents: Math.max(0, Math.round(unitPriceCents * quantity - discountCents)),
          lineOrder: index,
        };
      });
      await createReceipt({
        warehouseId,
        purchaseDate: new Date(`${purchaseDate}T12:00:00`).toISOString(),
        totalCents,
        evidenceId: evidence?.id ?? null,
        lines: payload,
      });
      history.replace('/saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Receipt import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Import Receipt</IonTitle></IonToolbar></IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          <section className="cs-card">
            <h2 className="cs-section-title" style={{ marginTop: 0 }}>Receipt</h2>
            <IonItem>
              <IonLabel position="stacked">Warehouse</IonLabel>
              <select
                aria-label="Warehouse"
                value={warehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
                style={{ width: '100%', padding: 12 }}
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} — {warehouse.city}, {warehouse.state}
                  </option>
                ))}
              </select>
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Purchase date</IonLabel>
              <IonInput
                type="date"
                value={purchaseDate}
                onIonChange={(event) => setPurchaseDate(event.detail.value ?? purchaseDate)}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">Receipt photo or PDF (optional)</IonLabel>
              <input
                aria-label="Receipt photo or PDF"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                capture="environment"
                onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
                style={{ padding: '12px 0', width: '100%' }}
              />
            </IonItem>
          </section>

          <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
            <h2 className="cs-section-title" style={{ marginTop: 0 }}>Purchase lines</h2>
            <p className="cs-muted">Match each receipt line to a product and confirm the price you paid.</p>
            <div className="cs-stack">
              {lines.map((line, index) => (
                <div key={line.key} className="cs-card">
                  <div className="cs-strong">Line {index + 1}</div>
                  <IonItem>
                    <IonLabel position="stacked">Product name or Costco item number</IonLabel>
                    <IonInput
                      value={line.query}
                      onIonChange={(event) => patchLine(line.key, { query: event.detail.value ?? '', product: null })}
                    />
                  </IonItem>
                  <IonButton size="small" fill="outline" onClick={() => void searchLine(line)}>
                    Search product
                  </IonButton>
                  {(searchResults[line.key] ?? []).map((hit) => (
                    <button
                      key={hit.productId}
                      className="cs-card"
                      style={{ width: '100%', textAlign: 'left', border: '1px solid var(--cs-border)' }}
                      onClick={() => {
                        patchLine(line.key, { product: hit, query: hit.canonicalName });
                        setSearchResults((current) => ({ ...current, [line.key]: [] }));
                      }}
                    >
                      <span className="cs-strong">{hit.canonicalName}</span>
                      {hit.brand && <span className="cs-muted"> · {hit.brand}</span>}
                    </button>
                  ))}
                  {line.product && <p className="cs-muted">Matched: {line.product.canonicalName}</p>}
                  <div className="cs-row">
                    <IonItem style={{ flex: 1 }}>
                      <IonLabel position="stacked">Quantity</IonLabel>
                      <IonInput
                        inputMode="decimal"
                        value={line.quantity}
                        onIonChange={(event) => patchLine(line.key, { quantity: event.detail.value ?? '1' })}
                      />
                    </IonItem>
                    <IonItem style={{ flex: 1 }}>
                      <IonLabel position="stacked">Unit price</IonLabel>
                      <IonInput
                        inputMode="decimal"
                        value={line.unitPrice}
                        onIonChange={(event) => patchLine(line.key, { unitPrice: event.detail.value ?? '' })}
                      />
                    </IonItem>
                    <IonItem style={{ flex: 1 }}>
                      <IonLabel position="stacked">Discount</IonLabel>
                      <IonInput
                        inputMode="decimal"
                        value={line.discount}
                        onIonChange={(event) => patchLine(line.key, { discount: event.detail.value ?? '0' })}
                      />
                    </IonItem>
                  </div>
                  {lines.length > 1 && (
                    <IonButton
                      size="small"
                      fill="clear"
                      color="danger"
                      onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                    >
                      Remove line
                    </IonButton>
                  )}
                </div>
              ))}
            </div>
            <IonButton fill="outline" onClick={() => setLines((current) => [...current, newLine()])}>
              Add line
            </IonButton>
            <p className="cs-strong">Confirmed total: {'$'}{(totalCents / 100).toFixed(2)}</p>
            <IonButton expand="block" disabled={busy} onClick={() => void submit()}>
              {busy ? 'Importing…' : 'Confirm receipt'}
            </IonButton>
            {error && <p role="alert" style={{ color: 'var(--cs-danger)' }}>{error}</p>}
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}
