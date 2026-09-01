import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useWarehouse } from '@stores/warehouse';
import { formatUSD, cents } from '@domain/money/cents';
import { ageDescription, classifyFreshness } from '@domain/freshness/freshnessEngine';
import { computeDealScore } from '@domain/deals/dealScore';
import type { MarkdownClassification } from '@domain/pricing/priceCodeEngine';
import { confidenceLabel } from '@domain/confidence/confidenceEngine';
import { confirmObservation } from '@services/api/confirmations';
import { submitShelfObservation } from '@services/api/observations';
import { createWatch } from '@services/api/watches';
import { saveDeal } from '@services/api/savedDeals';
import { saveShoppingItem } from '@services/api/shopping';
import {
  getProduct,
  getProductHistory,
  getProductWarehouses,
  type PriceObservation,
  type ProductDetail,
  type ProductState,
  type ProductWarehouseState,
} from '@services/api/products';

type FreshnessClassName = 'LIVE' | 'FRESH' | 'RECENT' | 'AGING' | 'HISTORICAL';

export function ProductDetailPage(): JSX.Element {
  const { productId } = useParams<{ productId: string }>();
  const history = useHistory();
  const { selected } = useWarehouse();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [state, setState] = useState<ProductState | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceObservation[]>([]);
  const [warehouseStates, setWarehouseStates] = useState<ProductWarehouseState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);

  const [confirmPrice, setConfirmPrice] = useState('');
  const [changePrice, setChangePrice] = useState('');
  const [changeHasAsterisk, setChangeHasAsterisk] = useState(false);
  const [watchTargetPrice, setWatchTargetPrice] = useState('');
  const [watchAnyDrop, setWatchAnyDrop] = useState(true);
  const [watchClearance, setWatchClearance] = useState(false);
  const [watchManager, setWatchManager] = useState(false);
  const [watchAsterisk, setWatchAsterisk] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const [{ product: nextProduct, state: nextState }, warehouses] = await Promise.all([
        getProduct(productId, selected?.id ?? null),
        getProductWarehouses(productId),
      ]);
      setProduct(nextProduct);
      setState(nextState);
      setWarehouseStates(warehouses);
      if (selected) {
        setPriceHistory(await getProductHistory(productId, selected.id));
      } else {
        setPriceHistory([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [productId, selected]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleConfirmPrice() {
    if (!state?.latest_observation_id || !state.consensus_price_cents) {
      setError('There is no observation to confirm yet.');
      return;
    }
    const priceCents = Math.round(Number(confirmPrice) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setError('Enter a valid current shelf price.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await confirmObservation(state.latest_observation_id, priceCents);
      setShowConfirmModal(false);
      setConfirmPrice('');
      setActionMessage(
        result.conflict
          ? 'Your different price was recorded as a conflict for re-verification.'
          : 'Thanks — your confirmation refreshed this price.',
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm price');
    } finally {
      setBusy(false);
    }
  }

  async function handleReportChange() {
    if (!productId || !selected) {
      setError('Pick a warehouse on Home first.');
      return;
    }
    const priceCents = Math.round(Number(changePrice) * 100);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setError('Enter a valid price.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitShelfObservation({
        productId,
        warehouseId: selected.id,
        priceCents,
        hasAsterisk: changeHasAsterisk,
        idempotencyKey: crypto.randomUUID(),
        sourceType: 'correction',
      });
      setShowChangeModal(false);
      setChangePrice('');
      setChangeHasAsterisk(false);
      setActionMessage('New warehouse price recorded.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit price');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateWatch() {
    if (!productId) return;
    setBusy(true);
    setError(null);
    try {
      await createWatch({
        productId,
        warehouseId: selected?.id ?? null,
        targetPriceCents: watchTargetPrice ? Math.round(Number(watchTargetPrice) * 100) : null,
        notifyAnyDrop: watchAnyDrop,
        notifyClearance: watchClearance,
        notifyManagerMarkdown: watchManager,
        notifyAsterisk: watchAsterisk,
      });
      setShowWatchModal(false);
      setWatchTargetPrice('');
      setActionMessage('Watch saved. Verified price events can now notify you.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save watch');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDeal() {
    if (!productId || !selected) {
      setError('Pick a warehouse before saving this deal.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveDeal({
        productId,
        warehouseId: selected.id,
        savedPriceCents: state?.consensus_price_cents ?? null,
      });
      setActionMessage('Deal saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save deal');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddToList() {
    if (!productId) return;
    setBusy(true);
    setError(null);
    try {
      await saveShoppingItem({ productId, quantity: 1, preferredWarehouseId: selected?.id ?? null });
      setActionMessage('Added to your shopping list.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to shopping list');
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!product) return;
    const text = state?.consensus_price_cents
      ? `${product.canonical_name} — ${formatUSD(cents(state.consensus_price_cents))} at ${selected?.name ?? 'Costco'}`
      : `${product.canonical_name} on COSTCO-SAVER`;
    const shareData = { title: product.canonical_name, text, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`);
        setActionMessage('Product link copied.');
      }
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Unable to share');
      }
    }
  }

  const latestPrice = state?.consensus_price_cents ?? null;
  const markdownLabel = useMemo(() => {
    if (!state?.markdown_class) return null;
    if (state.markdown_class === 'clearance') return 'Clearance .97';
    if (state.markdown_class === 'manager_markdown') return 'Manager markdown';
    if (state.markdown_class === 'regular_signal') return 'Regular-price signal';
    return 'Unclassified ending';
  }, [state?.markdown_class]);

  if (!productId) {
    return (
      <IonPage>
        <IonContent>
          <div className="cs-empty">No product selected.</div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>{product?.canonical_name ?? 'Product'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          {error && (
            <p role="alert" style={{ color: 'var(--cs-danger)' }}>
              {error}
            </p>
          )}
          {loading && (
            <div className="cs-card cs-stack" aria-busy="true">
              <div className="cs-skeleton" style={{ width: '70%' }} />
              <div className="cs-skeleton" style={{ width: '40%' }} />
            </div>
          )}

          {!loading && product && (
            <>
              <section className="cs-card">
                <h2 className="cs-strong" style={{ margin: 0 }}>
                  {product.canonical_name}
                </h2>
                {product.brand && <div className="cs-muted">{product.brand}</div>}
                {product.description && <p className="cs-muted">{product.description}</p>}
                <div className="cs-row" style={{ flexWrap: 'wrap' }}>
                  {product.identifiers.map((identifier) => (
                    <span className="cs-pill" key={`${identifier.type}-${identifier.value}`}>
                      {identifier.type}: {identifier.value}
                    </span>
                  ))}
                </div>
              </section>

              {state && latestPrice != null && selected ? (
                <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
                  <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div
                        className="cs-price"
                        style={{ fontSize: 'var(--cs-font-size-7)', fontWeight: 700 }}
                      >
                        {formatUSD(cents(latestPrice))}
                      </div>
                      <div className="cs-muted">{selected.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`cs-pill cs-pill--${state.freshness_class.toLowerCase()}`}>
                        {state.freshness_class}
                      </span>
                      <div className="cs-muted">{ageDescription(state.last_verified_at)}</div>
                    </div>
                  </div>

                  <div className="cs-row" style={{ marginTop: 'var(--cs-space-3)', flexWrap: 'wrap' }}>
                    {markdownLabel && <span className="cs-pill cs-pill--clearance">{markdownLabel}</span>}
                    {state.has_asterisk && (
                      <span className="cs-pill cs-pill--aging">Asterisk / possible non-restock</span>
                    )}
                  </div>

                  <div
                    className="cs-row"
                    style={{ marginTop: 'var(--cs-space-3)', gap: 'var(--cs-space-5)', flexWrap: 'wrap' }}
                  >
                    <div>
                      <div className="cs-muted">Confidence</div>
                      <div className="cs-strong">
                        {confidenceLabel(state.confidence_score)} · {state.confidence_score}/100
                      </div>
                    </div>
                    <div>
                      <div className="cs-muted">Evidence</div>
                      <div className="cs-strong">{state.evidence_count} evidence items</div>
                    </div>
                    <div>
                      <div className="cs-muted">Confirmations</div>
                      <div className="cs-strong">{state.independent_confirmation_count}</div>
                    </div>
                    {state.conflicting_report_count > 0 && (
                      <div>
                        <div className="cs-muted">Conflicts</div>
                        <div className="cs-strong">{state.conflicting_report_count}</div>
                      </div>
                    )}
                  </div>

                  <div className="cs-row" style={{ marginTop: 'var(--cs-space-3)', flexWrap: 'wrap' }}>
                    <IonButton onClick={() => setShowWatchModal(true)}>Watch</IonButton>
                    <IonButton fill="outline" onClick={handleSaveDeal} disabled={busy}>
                      Save deal
                    </IonButton>
                    <IonButton fill="outline" onClick={handleAddToList} disabled={busy}>
                      Add to list
                    </IonButton>
                    <IonButton fill="outline" onClick={() => setShowConfirmModal(true)}>
                      Verify price
                    </IonButton>
                    <IonButton fill="outline" onClick={() => setShowChangeModal(true)}>
                      Report change
                    </IonButton>
                    <IonButton fill="outline" onClick={() => history.push(`/product/${productId}/buy`)}>
                      Bought it
                    </IonButton>
                    <IonButton fill="clear" onClick={handleShare}>
                      Share
                    </IonButton>
                  </div>
                </section>
              ) : (
                <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
                  <h3 className="cs-strong" style={{ margin: 0 }}>
                    No price at this warehouse yet
                  </h3>
                  <p className="cs-muted">Add the shelf price to start this warehouse's history.</p>
                  <IonButton onClick={() => setShowChangeModal(true)} disabled={!selected}>
                    Add price
                  </IonButton>
                </section>
              )}

              {actionMessage && (
                <p className="cs-strong" role="status" style={{ marginTop: 'var(--cs-space-3)' }}>
                  {actionMessage}
                </p>
              )}

              {state && latestPrice != null && (
                <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
                  <h3 className="cs-strong" style={{ margin: 0 }}>
                    Deal analysis
                  </h3>
                  <DealBreakdown
                    priceCents={latestPrice}
                    markdown={state.markdown_class}
                    confidence={state.confidence_score}
                    freshness={classifyFreshness(state.last_verified_at) as FreshnessClassName}
                  />
                </section>
              )}

              <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
                <h3 className="cs-strong" style={{ marginTop: 0 }}>
                  Price history
                </h3>
                <PriceHistory observations={priceHistory} />
              </section>

              <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
                <h3 className="cs-strong" style={{ marginTop: 0 }}>
                  Warehouse comparison
                </h3>
                {warehouseStates.length === 0 ? (
                  <p className="cs-muted">No other warehouse prices have been reported yet.</p>
                ) : (
                  <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {warehouseStates.map((warehouse) => (
                      <li
                        key={warehouse.warehouse_id}
                        className="cs-row"
                        style={{ justifyContent: 'space-between' }}
                      >
                        <div>
                          <div className="cs-strong">{warehouse.name}</div>
                          <div className="cs-muted">
                            {warehouse.city}, {warehouse.state} · {warehouse.freshness_class}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="cs-price cs-strong">
                            {warehouse.consensus_price_cents != null
                              ? formatUSD(cents(warehouse.consensus_price_cents))
                              : '—'}
                          </div>
                          <div className="cs-muted">{warehouse.confidence_score}/100</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <p className="cs-muted" style={{ marginTop: 'var(--cs-space-4)' }}>
                Prices and availability can vary by warehouse and change without notice. Verify in store
                before traveling specifically for an item.
              </p>
            </>
          )}
        </div>
      </IonContent>

      <IonModal isOpen={showConfirmModal} onDidDismiss={() => setShowConfirmModal(false)}>
        <div className="cs-page">
          <h2 className="cs-section-title">Verify price</h2>
          <p className="cs-muted">
            Enter the shelf price you see now. Matching prices refresh confidence; a different price is
            recorded as a conflict.
          </p>
          <IonItem>
            <IonLabel position="stacked">Current price (USD)</IonLabel>
            <IonInput
              inputMode="decimal"
              value={confirmPrice}
              onIonChange={(e) => setConfirmPrice(e.detail.value ?? '')}
              placeholder={latestPrice ? (latestPrice / 100).toFixed(2) : '19.97'}
            />
          </IonItem>
          <div className="cs-row" style={{ marginTop: 'var(--cs-space-3)' }}>
            <IonButton onClick={handleConfirmPrice} disabled={busy || !confirmPrice}>
              Confirm
            </IonButton>
            <IonButton fill="outline" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </IonButton>
          </div>
        </div>
      </IonModal>

      <IonModal isOpen={showChangeModal} onDidDismiss={() => setShowChangeModal(false)}>
        <div className="cs-page">
          <h2 className="cs-section-title">Report warehouse price</h2>
          <p className="cs-muted">Reporting at {selected?.name ?? 'no warehouse selected'}.</p>
          <IonItem>
            <IonLabel position="stacked">Price (USD)</IonLabel>
            <IonInput
              inputMode="decimal"
              value={changePrice}
              onIonChange={(e) => setChangePrice(e.detail.value ?? '')}
              placeholder="e.g. 19.97"
            />
          </IonItem>
          <IonItem>
            <IonLabel>Asterisk on tag</IonLabel>
            <IonCheckbox
              checked={changeHasAsterisk}
              onIonChange={(e) => setChangeHasAsterisk(e.detail.checked)}
              slot="end"
            />
          </IonItem>
          <div className="cs-row" style={{ marginTop: 'var(--cs-space-3)' }}>
            <IonButton onClick={handleReportChange} disabled={busy || !changePrice || !selected}>
              Submit
            </IonButton>
            <IonButton fill="outline" onClick={() => setShowChangeModal(false)}>
              Cancel
            </IonButton>
          </div>
        </div>
      </IonModal>

      <IonModal isOpen={showWatchModal} onDidDismiss={() => setShowWatchModal(false)}>
        <div className="cs-page">
          <h2 className="cs-section-title">Watch this product</h2>
          <IonItem>
            <IonLabel position="stacked">Target price (USD, optional)</IonLabel>
            <IonInput
              inputMode="decimal"
              value={watchTargetPrice}
              onIonChange={(e) => setWatchTargetPrice(e.detail.value ?? '')}
            />
          </IonItem>
          <IonItem>
            <IonLabel>Notify on any verified drop</IonLabel>
            <IonCheckbox
              checked={watchAnyDrop}
              onIonChange={(e) => setWatchAnyDrop(e.detail.checked)}
              slot="end"
            />
          </IonItem>
          <IonItem>
            <IonLabel>Notify on .97 clearance</IonLabel>
            <IonCheckbox
              checked={watchClearance}
              onIonChange={(e) => setWatchClearance(e.detail.checked)}
              slot="end"
            />
          </IonItem>
          <IonItem>
            <IonLabel>Notify on .00 / .88 manager markdown</IonLabel>
            <IonCheckbox
              checked={watchManager}
              onIonChange={(e) => setWatchManager(e.detail.checked)}
              slot="end"
            />
          </IonItem>
          <IonItem>
            <IonLabel>Notify on asterisk</IonLabel>
            <IonCheckbox
              checked={watchAsterisk}
              onIonChange={(e) => setWatchAsterisk(e.detail.checked)}
              slot="end"
            />
          </IonItem>
          <div className="cs-row" style={{ marginTop: 'var(--cs-space-3)' }}>
            <IonButton onClick={handleCreateWatch} disabled={busy}>
              Save watch
            </IonButton>
            <IonButton fill="outline" onClick={() => setShowWatchModal(false)}>
              Cancel
            </IonButton>
          </div>
        </div>
      </IonModal>
    </IonPage>
  );
}

function DealBreakdown({
  priceCents,
  markdown,
  confidence,
  freshness,
}: {
  priceCents: number;
  markdown: string | null;
  confidence: number;
  freshness: FreshnessClassName;
}): JSX.Element {
  const score = computeDealScore({
    currentPrice: priceCents,
    markdownClass: (markdown as MarkdownClassification | null) ?? null,
    confidence,
    freshnessClass: freshness,
    currentWarehousePrice: priceCents,
  });
  return (
    <div className="cs-stack">
      <div className="cs-row" style={{ justifyContent: 'space-between' }}>
        <div className="cs-strong">{score.rating}</div>
        <div className="cs-strong" style={{ fontSize: 'var(--cs-font-size-5)' }}>
          {score.score}/100
        </div>
      </div>
      <div className="cs-muted">
        Markdown {score.components.markdownSignal} · Confidence {score.components.confidence} · Freshness{' '}
        {score.components.freshness}
      </div>
    </div>
  );
}

function PriceHistory({ observations }: { observations: PriceObservation[] }): JSX.Element {
  if (observations.length === 0) {
    return <p className="cs-muted">No historical observations for this warehouse yet.</p>;
  }

  const values = observations.map((row) => row.price_cents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const width = 640;
  const height = 180;
  const padding = 18;
  const points = observations.map((row, index) => {
    const x =
      observations.length === 1
        ? width / 2
        : padding + (index / (observations.length - 1)) * (width - padding * 2);
    const y = height - padding - ((row.price_cents - min) / span) * (height - padding * 2);
    return { x, y, row };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Price history from ${formatUSD(cents(min))} to ${formatUSD(cents(max))}`}
        style={{ width: '100%', minHeight: 180 }}
      >
        <polyline
          points={polyline}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point) => (
          <circle key={point.row.id} cx={point.x} cy={point.y} r="4" fill="currentColor">
            <title>
              {formatUSD(cents(point.row.price_cents))} · {new Date(point.row.observed_at).toLocaleString()}
            </title>
          </circle>
        ))}
      </svg>
      <div className="cs-row" style={{ justifyContent: 'space-between' }}>
        <span className="cs-muted">Low {formatUSD(cents(min))}</span>
        <span className="cs-muted">High {formatUSD(cents(max))}</span>
      </div>
    </div>
  );
}
