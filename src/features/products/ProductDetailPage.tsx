import { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonBackButton, IonButtons, IonModal } from '@ionic/react';
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
    return (
      <IonPage>
        <IonContent>
          <div className="cs-state">
            <p className="cs-state__title">No product selected</p>
            <p>Open a product from Home, Deals, or Search.</p>
          </div>
        </IonContent>
      </IonPage>
    );
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
          {error && <p className="cs-error" role="alert">{error}</p>}

          <header className="cs-header">
            <p className="cs-meta">{product?.brand ?? 'Product'}</p>
            <h1 className="cs-header__title">{product?.canonical_name ?? 'Loading…'}</h1>
            {product?.description && <p className="cs-header__sub">{product.description}</p>}
          </header>

          {state && state.consensus_price_cents != null && selected ? (
            <section className="cs-card">
              <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <p className="cs-meta" style={{ margin: 0 }}>Verified price</p>
                  <div className="cs-price cs-deal-score">
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
                  <div className="cs-meta">Confidence</div>
                  <div className="cs-strong">{confidenceLabel(state.confidence_score)} · {state.confidence_score}/100</div>
                </div>
                <div>
                  <div className="cs-meta">Evidence</div>
                  <div className="cs-strong">{state.evidence_count} observations · {state.independent_confirmation_count} confirmations</div>
                </div>
              </div>
              <div className="cs-actions">
                <button className="cs-button" type="button" onClick={() => setShowWatchModal(true)}>Watch</button>
                <button className="cs-button cs-button--ghost" type="button" onClick={() => setShowConfirmModal(true)}>Verify price</button>
                <button className="cs-button cs-button--ghost" type="button" onClick={() => setShowChangeModal(true)}>Report change</button>
                <button className="cs-button cs-button--ghost" type="button" onClick={() => history.push(`/product/${productId}/buy`)}>Bought it</button>
              </div>
            </section>
          ) : (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
              <div className="cs-state" style={{ padding: 'var(--cs-space-4) 0' }}>
                <p className="cs-state__title">No price at this warehouse yet</p>
                <p>Be the first shopper to submit a verified shelf price.</p>
                <button className="cs-button" type="button" onClick={() => setShowChangeModal(true)}>
                  Add / verify price
                </button>
              </div>
            </section>
          )}
          {actionMessage && <p className="cs-success" style={{ marginTop: 'var(--cs-space-3)' }} role="status">{actionMessage}</p>}

          {state && state.consensus_price_cents != null && (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
              <p className="cs-meta" style={{ margin: 0 }}>Deal</p>
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
          <header className="cs-header">
            <h2 className="cs-header__title">Verify price</h2>
            <p className="cs-header__sub">
              Is the current shelf price at {selected?.name ?? 'this warehouse'} still{' '}
              <span className="cs-strong">{state?.consensus_price_cents ? formatUSD(cents(state.consensus_price_cents)) : '—'}</span>?
            </p>
          </header>
          <label className="cs-field">
            <span className="cs-field__label">Current price you see (USD)</span>
            <input
              className="cs-field__input"
              inputMode="decimal"
              value={confirmPrice}
              onChange={(e) => setConfirmPrice(e.target.value)}
              placeholder={state?.consensus_price_cents ? (state.consensus_price_cents / 100).toFixed(2) : '19.97'}
            />
          </label>
          <div className="cs-actions">
            <button className="cs-button" type="button" onClick={handleConfirmPrice} disabled={busy || !confirmPrice}>
              {busy ? 'Submitting…' : 'Confirm'}
            </button>
            <button className="cs-button cs-button--ghost" type="button" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      </IonModal>

      <IonModal isOpen={showChangeModal} onDidDismiss={() => setShowChangeModal(false)}>
        <div className="cs-page">
          <header className="cs-header">
            <h2 className="cs-header__title">Report a different price</h2>
            <p className="cs-header__sub">Submit the shelf price you see right now.</p>
          </header>
          <label className="cs-field">
            <span className="cs-field__label">New price (USD)</span>
            <input
              className="cs-field__input"
              inputMode="decimal"
              value={changePrice}
              onChange={(e) => setChangePrice(e.target.value)}
              placeholder="e.g. 19.97"
            />
          </label>
          <label className="cs-field cs-field--check">
            <input
              className="cs-field__checkbox"
              type="checkbox"
              checked={changeHasAsterisk}
              onChange={(e) => setChangeHasAsterisk(e.target.checked)}
            />
            <span className="cs-field__label">Asterisk on tag (no restock)</span>
          </label>
          <div className="cs-actions">
            <button className="cs-button" type="button" onClick={handleReportChange} disabled={busy || !changePrice || !selected}>
              {busy ? 'Submitting…' : 'Submit'}
            </button>
            <button className="cs-button cs-button--ghost" type="button" onClick={() => setShowChangeModal(false)}>
              Cancel
            </button>
          </div>
          {!selected && <p className="cs-muted">Pick a warehouse on Home first.</p>}
        </div>
      </IonModal>

      <IonModal isOpen={showWatchModal} onDidDismiss={() => setShowWatchModal(false)}>
        <div className="cs-page">
          <header className="cs-header">
            <h2 className="cs-header__title">Watch this product</h2>
            <p className="cs-header__sub">You will get a push notification when one of these conditions is met.</p>
          </header>
          <label className="cs-field">
            <span className="cs-field__label">Target price (USD, optional)</span>
            <input
              className="cs-field__input"
              inputMode="decimal"
              value={watchTargetPrice}
              onChange={(e) => setWatchTargetPrice(e.target.value)}
              placeholder="e.g. 17.99"
            />
          </label>
          <label className="cs-field cs-field--check">
            <input
              className="cs-field__checkbox"
              type="checkbox"
              checked={watchAnyDrop}
              onChange={(e) => setWatchAnyDrop(e.target.checked)}
            />
            <span className="cs-field__label">Notify on any price drop</span>
          </label>
          <label className="cs-field cs-field--check">
            <input
              className="cs-field__checkbox"
              type="checkbox"
              checked={watchClearance}
              onChange={(e) => setWatchClearance(e.target.checked)}
            />
            <span className="cs-field__label">Notify on .97 clearance</span>
          </label>
          <label className="cs-field cs-field--check">
            <input
              className="cs-field__checkbox"
              type="checkbox"
              checked={watchManager}
              onChange={(e) => setWatchManager(e.target.checked)}
            />
            <span className="cs-field__label">Notify on .00 / .88 manager markdown</span>
          </label>
          <label className="cs-field cs-field--check">
            <input
              className="cs-field__checkbox"
              type="checkbox"
              checked={watchAsterisk}
              onChange={(e) => setWatchAsterisk(e.target.checked)}
            />
            <span className="cs-field__label">Notify on asterisk (final stock)</span>
          </label>
          <div className="cs-actions">
            <button className="cs-button" type="button" onClick={handleCreateWatch} disabled={busy}>
              Save watch
            </button>
            <button className="cs-button cs-button--ghost" type="button" onClick={() => setShowWatchModal(false)}>
              Cancel
            </button>
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
      <div className="cs-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <span className={`cs-deal-rating ${ratingClass(score.rating)}`}>{score.rating}</span>
        <div className="cs-deal-score">{score.score}</div>
      </div>
      <div className="cs-muted">
        Markdown {score.components.markdownSignal} · Confidence {score.components.confidence} ·
        Freshness {score.components.freshness}
      </div>
    </div>
  );
}

function ratingClass(rating: string): string {
  if (rating === 'Excellent Deal' || rating === 'Great Deal') return 'cs-deal-rating--great';
  if (rating === 'Good Deal') return 'cs-deal-rating--good';
  if (rating === 'Fair') return 'cs-deal-rating--ok';
  return 'cs-deal-rating--hold';
}
