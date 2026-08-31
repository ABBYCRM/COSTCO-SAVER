import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonBackButton, IonButtons } from '@ionic/react';
import { supabase } from '@services/supabase/client';
import { useWarehouse } from '@stores/warehouse';
import { formatUSD } from '@domain/money/cents';
import { ageDescription, classifyFreshness } from '@domain/freshness/freshnessEngine';
import { computeDealScore } from '@domain/deals/dealScore';
import { confidenceLabel } from '@domain/confidence/confidenceEngine';

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

export function ProductDetailPage(): JSX.Element {
  const { productId } = useParams<{ productId: string }>();
  const { selected } = useWarehouse();
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [state, setState] = useState<StateRow | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          : Promise.resolve({ data: null, error: null } as any),
      ]);
      if (cancelled) return;
      if (pErr) setError(pErr.message);
      if (sErr) setError(sErr.message);
      setProduct((p as ProductRow) ?? null);
      setState((s as StateRow) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, selected]);

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
                    {formatUSD(state.consensus_price_cents as any)}
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
                <IonButton>Watch</IonButton>
                <IonButton fill="outline">Verify price</IonButton>
                <IonButton fill="outline">Report change</IonButton>
              </div>
            </section>
          ) : (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
              <h3 className="cs-strong" style={{ margin: 0 }}>No price at this warehouse yet</h3>
              <p className="cs-muted">Be the first shopper to submit a verified shelf price.</p>
              <IonButton onClick={() => location.assign('/scan')}>Add / verify price</IonButton>
            </section>
          )}

          {state && state.consensus_price_cents != null && (
            <section className="cs-card" style={{ marginTop: 'var(--cs-space-3)' }}>
              <h3 className="cs-strong" style={{ margin: 0 }}>Deal</h3>
              <DealBreakdown
                cents={state.consensus_price_cents}
                markdown={state.markdown_class}
                confidence={state.confidence_score}
                freshness={classifyFreshness(state.last_verified_at) as any}
              />
            </section>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

function DealBreakdown({ cents, markdown, confidence, freshness }: {
  cents: number;
  markdown: string | null;
  confidence: number;
  freshness: 'LIVE' | 'FRESH' | 'RECENT' | 'AGING' | 'HISTORICAL';
}): JSX.Element {
  const score = computeDealScore({
    currentPrice: cents,
    markdownClass: markdown as any,
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
