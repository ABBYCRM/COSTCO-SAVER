import { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonBackButton, IonButtons, IonModal, IonInput, IonItem, IonLabel, IonCheckbox } from '@ionic/react';
import { supabase } from '@services/supabase/client';
import { useWarehouse } from '@stores/warehouse';
import { formatUSD, cents } from '@domain/money/cents';
import { ageDescription, classifyFreshness } from '@domain/freshness/freshnessEngine';
import { computeDealScore } from '@domain/deals/dealScore';
import type { MarkdownClassification } from '@domain/pricing/priceCodeEngine';
import { confidenceLabel } from '@domain/confidence/confidenceEngine';
import { confirmObservation } from '@services/api/confirmations';
import { submitShelfObservation } from '@services/api/observations';
import { createWatch } from '@services/api/watches';

interface ProductRow {
  id: string;
  canonical_name: string;
  brand: string | null;
  description: string | null;
}

interface StateRow {
  consensus_price_cents: number | null;
  markdown_class: string | null;
  last_verified_at: string | null;
  confidence_score: number;
  evidence_count: number;
  independent_confirmation_count: number;
  freshness_class: string;
}

type FreshnessClassName = 'LIVE' | 'FRESH' | 'RECENT' | 'AGING' | 'HISTORICAL';

export function ProductDetailPage(): JSX.Element {
  const { productId } = useParams<{ productId: string }>();
  const history = useHistory();
  const { selected } = useWarehouse();
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [state, setState] = useState<StateRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showWatchModal, setShowWatchModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);

  // Confirm price form
  const [confirmPrice, setConfirmPrice] = useState('');

  // Report change form
  const [changePrice, setChangePrice] = useState('');
  const [changeHasAsterisk, setChangeHasAsterisk] = useState(false);

  // Watch form
  const [watchTargetPrice, setWatchTargetPrice] = useState('');
  const [watchAnyDrop, setWatchAnyDrop] = useState(true);
  const [watchClearance, setWatchClearance] = useState(false);
  const [watchManager, setWatchManager] = useState(false);
  const [watchAsterisk, setWatchAsterisk] = useState(false);

  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!productId) return;
    (async () => {
      const [{ data: p, error: pErr }, { data: s, error: sErr }] = await Promise.all([
        supabase().from('products').select('id, canonical_name, brand, description').eq('id', productId).maybeSingle(),
        selected
          ? supabase().from('warehouse_product_state')
              .select('consensus_price_cents, markdown_class, last_verified_at, confidence_score, evidence_count, independent_confirmation_count, freshness_class')
              .eq('product_id', productId)
              .eq('warehouse_id', selected.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as { data: StateRow | null; error: null }),
      ]);
      if (cancelled) return;
      if (pErr) setError(pErr.message);
      if (sErr) setError(sErr.message);
      setProduct((p as ProductRow | null) ?? null);
      setState((s as StateRow | null) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, selected]);

  async function reloadState() {
    if (!productId || !selected) return;
    const { data: s } = await supabase()
      .from('warehouse_product_state')
      .select('consensus_price_cents, markdown_class, last_verified_at, confidence_score, evidence_count, independent_confirmation_count, freshness_class')
      .eq('product_id', productId)
      .eq('warehouse_id', selected.id)
      .maybeSingle();
    setState((s as StateRow | null) ?? null);
  }

  async function handleConfirmPrice() {
    if (!state?.consensus_price_cents || !productId || !selected) return;
    const centsValue = Math.round(Number(confirmPrice) * 100);
    if (!Number.isFinite(centsValue) || centsValue < 0) {
      setError('Enter a valid price');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Find the latest observation to confirm
      const { data: obs } = await supabase()
        .from('price_observations')
        .select('id')
        .eq('product_id', productId)
        .eq('warehouse_id', selected.id)
        .order('observed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!obs) {
        setError('No observation to confirm yet. Add a price first.');
        setBusy(false);
        return;
      }
      await confirmObservation((obs as { id: string }).id, centsValue);
      await reloadState();
      setShowConfirmModal(false);
      setConfirmPrice('');
      setActionMessage('Thanks — your confirmation was recorded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm');
    } finally {
      setBusy(false);
    }
  }

  async function handleReportChange() {
    if (!productId || !selected) return;
    const priceCents = Math.round(Number(changePrice) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setError('Enter a valid price');
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
      });
      await reloadState();
      setShowChangeModal(false);
      setChangePrice('');
      setChangeHasAsterisk(false);
      setActionMessage('New price submitted. Thanks for keeping the data fresh.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
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
      setActionMessage('You are now watching this product.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create watch');
    } finally {
      setBusy(false);
    }
  }

  if (!productId) {
    return <IonPage><IonContent><div className="cs-empty">No product selected.</div></IonContent></IonPage>;
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle>{product?.canonical_name ?? 'Product'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          {error && <p role="alert" style={{ color: 'var(--cs-danger)' }}>{error}</p>}

          <section className="cs-card">
            <h2 className="cs-strong" style={{ margin: 0 }}>{product?.canonical_name ?? 'Loading…'}</h2>
            {product?.brand && <div className="cs-muted">{product.brand}</div>}
          </section>

          {state && state.consensus_price_cents != null && selected ? (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
              <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div className="cs-price" style={{ fontSize: 'var(--cs-font-size-7)', fontWeight: 700 }}>
                    {formatUSD(cents(state.consensus_price_cents))}
                  </div>
                  <div className="cs-muted">{selected.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`cs-pill cs-pill--${state.freshness_class.toLowerCase()}`}>
                    {state.freshness_class}
                  </span>
                  <div className="cs-muted" style={{ marginTop: 'var(--cs-space-1)' }}>
                    {ageDescription(state.last_verified_at)}
                  </div>
                </div>
              </div>
              <div className="cs-row" style={{ marginTop: 'var(--cs-space-3)', gap: 'var(--cs-space-4)', flexWrap: 'wrap' }}>
                <div>
                  <div className="cs-muted">Confidence</div>
                  <div className="cs-strong">{confidenceLabel(state.confidence_score)} · {state.confidence_score}/100</div>
                </div>
                <div>
                  <div className="cs-muted">Evidence</div>
                  <div className="cs-strong">{state.evidence_count} observations · {state.independent_confirmation_count} confirmations</div>
                </div>
              </div>
              <div className="cs-row" style={{ marginTop: 'var(--cs-space-3)', flexWrap: 'wrap' }}>
                <IonButton onClick={() => setShowWatchModal(true)}>Watch</IonButton>
                <IonButton fill="outline" onClick={() => setShowConfirmModal(true)}>Verify price</IonButton>
                <IonButton fill="outline" onClick={() => setShowChangeModal(true)}>Report change</IonButton>
                <IonButton fill="outline" onClick={() => history.push(`/product/${productId}/buy`)}>Bought it</IonButton>
              </div>
            </section>
          ) : (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
              <h3 className="cs-strong" style={{ margin: 0 }}>No price at this warehouse yet</h3>
              <p className="cs-muted">Be the first shopper to submit a verified shelf price.</p>
              <IonButton onClick={() => setShowChangeModal(true)}>Add / verify price</IonButton>
            </section>
          )}
          {actionMessage && <p className="cs-strong" style={{ marginTop: 'var(--cs-space-3)' }} role="status">{actionMessage}</p>}

          {state && state.consensus_price_cents != null && (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
              <h3 className="cs-strong" style={{ margin: 0 }}>Deal</h3>
              <DealBreakdown
                cents={state.consensus_price_cents}
                markdown={state.markdown_class}
                confidence={state.confidence_score}
                freshness={classifyFreshness(state.last_verified_at) as FreshnessClassName}
              />
            </section>
          )}
        </div>
      </IonContent>

      <IonModal isOpen={showConfirmModal} onDidDismiss={() => setShowConfirmModal(false)}>
        <div className="cs-page">
          <h2 className="cs-section-title">Verify price</h2>
          <p className="cs-muted">
            Is the current shelf price at {selected?.name ?? 'this warehouse'} still{' '}
            <span className="cs-strong">{state?.consensus_price_cents ? formatUSD(cents(state.consensus_price_cents)) : '—'}</span>?
          </p>
          <IonItem>
            <IonLabel position="stacked">Current price you see (USD)</IonLabel>
            <IonInput
              inputMode="decimal"
              value={confirmPrice}
              onIonChange={(e) => setConfirmPrice(e.detail.value ?? '')}
              placeholder={state?.consensus_price_cents ? (state.consensus_price_cents / 100).toFixed(2) : '19.97'}
            />
          </IonItem>
          <div className="cs-row" style={{ marginTop: 'var(--cs-space-3)' }}>
            <IonButton onClick={handleConfirmPrice} disabled={busy || !confirmPrice}>
              {busy ? 'Submitting…' : 'Confirm'}
            </IonButton>
            <IonButton fill="outline" onClick={() => setShowConfirmModal(false)}>Cancel</IonButton>
          </div>
        </div>
      </IonModal>

      <IonModal isOpen={showChangeModal} onDidDismiss={() => setShowChangeModal(false)}>
        <div className="cs-page">
          <h2 className="cs-section-title">Report a different price</h2>
          <IonItem>
            <IonLabel position="stacked">New price (USD)</IonLabel>
            <IonInput
              inputMode="decimal"
              value={changePrice}
              onIonChange={(e) => setChangePrice(e.detail.value ?? '')}
              placeholder="e.g. 19.97"
            />
          </IonItem>
          <IonItem>
            <IonLabel>Asterisk on tag (no restock)</IonLabel>
            <IonCheckbox
              checked={changeHasAsterisk}
              onIonChange={(e) => setChangeHasAsterisk(e.detail.checked)}
              slot="end"
            />
          </IonItem>
          <div className="cs-row" style={{ marginTop: 'var(--cs-space-3)' }}>
            <IonButton onClick={handleReportChange} disabled={busy || !changePrice || !selected}>
              {busy ? 'Submitting…' : 'Submit'}
            </IonButton>
            <IonButton fill="outline" onClick={() => setShowChangeModal(false)}>Cancel</IonButton>
          </div>
          {!selected && <p className="cs-muted">Pick a warehouse on Home first.</p>}
        </div>
      </IonModal>

      <IonModal isOpen={showWatchModal} onDidDismiss={() => setShowWatchModal(false)}>
        <div className="cs-page">
          <h2 className="cs-section-title">Watch this product</h2>
          <p className="cs-muted">You will get a push notification when one of these conditions is met.</p>
          <IonItem>
            <IonLabel position="stacked">Target price (USD, optional)</IonLabel>
            <IonInput
              inputMode="decimal"
              value={watchTargetPrice}
              onIonChange={(e) => setWatchTargetPrice(e.detail.value ?? '')}
              placeholder="e.g. 17.99"
            />
          </IonItem>
          <IonItem>
            <IonLabel>Notify on any price drop</IonLabel>
            <IonCheckbox checked={watchAnyDrop} onIonChange={(e) => setWatchAnyDrop(e.detail.checked)} slot="end" />
          </IonItem>
          <IonItem>
            <IonLabel>Notify on .97 clearance</IonLabel>
            <IonCheckbox checked={watchClearance} onIonChange={(e) => setWatchClearance(e.detail.checked)} slot="end" />
          </IonItem>
          <IonItem>
            <IonLabel>Notify on .00 / .88 manager markdown</IonLabel>
            <IonCheckbox checked={watchManager} onIonChange={(e) => setWatchManager(e.detail.checked)} slot="end" />
          </IonItem>
          <IonItem>
            <IonLabel>Notify on asterisk (final stock)</IonLabel>
            <IonCheckbox checked={watchAsterisk} onIonChange={(e) => setWatchAsterisk(e.detail.checked)} slot="end" />
          </IonItem>
          <div className="cs-row" style={{ marginTop: 'var(--cs-space-3)' }}>
            <IonButton onClick={handleCreateWatch} disabled={busy}>Save watch</IonButton>
            <IonButton fill="outline" onClick={() => setShowWatchModal(false)}>Cancel</IonButton>
          </div>
        </div>
      </IonModal>
    </IonPage>
  );
}

function DealBreakdown({ cents, markdown, confidence, freshness }: {
  cents: number;
  markdown: string | null;
  confidence: number;
  freshness: FreshnessClassName;
}): JSX.Element {
  const score = computeDealScore({
    currentPrice: cents,
    markdownClass: (markdown as MarkdownClassification | null) ?? null,
    confidence,
    freshnessClass: freshness,
    currentWarehousePrice: cents,
  });
  return (
    <div className="cs-stack">
      <div className="cs-row" style={{ justifyContent: 'space-between' }}>
        <div className="cs-strong">{score.rating}</div>
        <div className="cs-strong" style={{ fontSize: 'var(--cs-font-size-5)' }}>{score.score}</div>
      </div>
      <div className="cs-muted">
        Markdown {score.components.markdownSignal} · Confidence {score.components.confidence} ·
        Freshness {score.components.freshness}
      </div>
    </div>
  );
}
