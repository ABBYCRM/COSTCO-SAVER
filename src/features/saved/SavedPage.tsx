import { useEffect, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useHistory } from 'react-router';
import { useWarehouse } from '@stores/warehouse';
import { listWatches, deleteWatch, type WatchRow } from '@services/api/watches';
import { listPurchases, deletePurchase, type PurchaseRow } from '@services/api/purchases';
import {
  listAdjustments,
  setAdjustmentStatus,
  type AdjustmentRow,
} from '@services/api/adjustments';
import {
  listSavedDeals,
  deleteSavedDeal,
  type SavedDealRow,
} from '@services/api/savedDeals';
import { formatUSD, cents } from '@domain/money/cents';

type Section = 'watching' | 'purchases' | 'adjustments' | 'deals';

export function SavedPage(): JSX.Element {
  const history = useHistory();
  const { selected } = useWarehouse();
  const [section, setSection] = useState<Section>('watching');
  const [watches, setWatches] = useState<WatchRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([]);
  const [savedDeals, setSavedDeals] = useState<SavedDealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [nextWatches, nextPurchases, nextAdjustments, nextDeals] = await Promise.all([
        listWatches(),
        listPurchases(),
        listAdjustments(),
        listSavedDeals(),
      ]);
      setWatches(nextWatches);
      setPurchases(nextPurchases);
      setAdjustments(nextAdjustments);
      setSavedDeals(nextDeals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved items');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function markAdjustment(id: string, status: AdjustmentRow['status']) {
    setBusyId(id);
    setError(null);
    try {
      await setAdjustmentStatus(id, status);
      setAdjustments((rows) => rows.map((row) => (row.id === id ? { ...row, status } : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update adjustment');
    } finally {
      setBusyId(null);
    }
  }

  async function removeWatch(id: string) {
    setBusyId(id);
    try {
      await deleteWatch(id);
      setWatches((rows) => rows.filter((row) => row.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove watch');
    } finally {
      setBusyId(null);
    }
  }

  async function removePurchase(id: string) {
    if (!window.confirm('Delete this purchase record?')) return;
    setBusyId(id);
    try {
      await deletePurchase(id);
      setPurchases((rows) => rows.filter((row) => row.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete purchase');
    } finally {
      setBusyId(null);
    }
  }

  async function removeSavedDeal(id: string) {
    setBusyId(id);
    try {
      await deleteSavedDeal(id);
      setSavedDeals((rows) => rows.filter((row) => row.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove saved deal');
    } finally {
      setBusyId(null);
    }
  }

  const adjustmentOpportunities = adjustments.filter(
    (row) => row.status === 'opportunity' && (!selected || row.warehouse_id === selected.id),
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Saved</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="cs-page">
          <IonSegment value={section} onIonChange={(e) => setSection(e.detail.value as Section)}>
            <IonSegmentButton value="watching"><IonLabel>Watching</IonLabel></IonSegmentButton>
            <IonSegmentButton value="purchases"><IonLabel>Purchases</IonLabel></IonSegmentButton>
            <IonSegmentButton value="adjustments"><IonLabel>Adjustments</IonLabel></IonSegmentButton>
            <IonSegmentButton value="deals"><IonLabel>Deals</IonLabel></IonSegmentButton>
          </IonSegment>

          {error && <p role="alert" style={{ color: 'var(--cs-danger)' }}>{error}</p>}
          {loading && (
            <div className="cs-card cs-stack" aria-busy="true">
              <div className="cs-skeleton" style={{ width: '60%' }} />
            </div>
          )}

          {!loading && section === 'watching' && (
            watches.length === 0 ? (
              <div className="cs-empty">
                <p>You are not watching any products.</p>
                <IonButton onClick={() => history.push('/search')}>Find a product</IonButton>
              </div>
            ) : (
              <ul className="cs-stack" style={{ listStyle: 'none', padding: 0 }}>
                {watches.map((watch) => (
                  <li key={watch.id} className="cs-card">
                    <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                      <button
                        className="cs-link-button"
                        onClick={() => history.push(`/product/${watch.product_id}`)}
                      >
                        <span className="cs-strong">{watch.canonical_name ?? 'Product'}</span>
                        {watch.warehouse_name && <span className="cs-muted">{watch.warehouse_name}</span>}
                      </button>
                      <IonButton
                        size="small"
                        fill="outline"
                        disabled={busyId === watch.id}
                        onClick={() => removeWatch(watch.id)}
                      >
                        Remove
                      </IonButton>
                    </div>
                    <div className="cs-row" style={{ flexWrap: 'wrap', marginTop: 'var(--cs-space-2)' }}>
                      {watch.target_price_cents != null && (
                        <span className="cs-pill">target {formatUSD(cents(watch.target_price_cents))}</span>
                      )}
                      {watch.notify_any_drop && <span className="cs-pill">any drop</span>}
                      {watch.notify_clearance && <span className="cs-pill cs-pill--clearance">.97</span>}
                      {watch.notify_manager_markdown && <span className="cs-pill cs-pill--aging">manager</span>}
                      {watch.notify_asterisk && <span className="cs-pill">asterisk</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {!loading && section === 'purchases' && (
            purchases.length === 0 ? (
              <div className="cs-empty">
                <p>No purchases recorded yet.</p>
                <p className="cs-muted">Record a purchase from a product page to track future drops.</p>
              </div>
            ) : (
              <ul className="cs-stack" style={{ listStyle: 'none', padding: 0 }}>
                {purchases.map((purchase) => (
                  <li key={purchase.id} className="cs-card">
                    <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                      <button
                        className="cs-link-button"
                        onClick={() => history.push(`/product/${purchase.product_id}`)}
                      >
                        <span className="cs-strong">{purchase.canonical_name ?? 'Product'}</span>
                        <span className="cs-muted">
                          {purchase.warehouse_name ?? 'Warehouse'} ·{' '}
                          {new Date(purchase.purchase_date).toLocaleDateString()}
                        </span>
                      </button>
                      <div style={{ textAlign: 'right' }}>
                        <div className="cs-price cs-strong">{formatUSD(cents(purchase.total_cents))}</div>
                        <IonButton
                          size="small"
                          fill="clear"
                          color="danger"
                          disabled={busyId === purchase.id}
                          onClick={() => removePurchase(purchase.id)}
                        >
                          Delete
                        </IonButton>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {!loading && section === 'adjustments' && (
            adjustmentOpportunities.length === 0 ? (
              <div className="cs-empty">
                <p>No potential price-adjustment opportunities right now.</p>
              </div>
            ) : (
              <ul className="cs-stack" style={{ listStyle: 'none', padding: 0 }}>
                {adjustmentOpportunities.map((adjustment) => (
                  <li key={adjustment.id} className="cs-card">
                    <div className="cs-strong">
                      {adjustment.canonical_name ?? 'Product'} · potential{' '}
                      {formatUSD(cents(adjustment.potential_savings_cents))}
                    </div>
                    <div className="cs-muted">
                      Paid {formatUSD(cents(adjustment.purchase_price_cents))} · now{' '}
                      {formatUSD(cents(adjustment.new_price_cents))} · {adjustment.days_remaining} days remaining
                    </div>
                    <p className="cs-muted">
                      Verify eligibility with Costco. Final approval is determined by Costco.
                    </p>
                    <div className="cs-row">
                      <IonButton
                        size="small"
                        disabled={busyId === adjustment.id}
                        onClick={() => markAdjustment(adjustment.id, 'claimed')}
                      >
                        Mark claimed
                      </IonButton>
                      <IonButton
                        size="small"
                        fill="outline"
                        disabled={busyId === adjustment.id}
                        onClick={() => markAdjustment(adjustment.id, 'dismissed')}
                      >
                        Dismiss
                      </IonButton>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {!loading && section === 'deals' && (
            savedDeals.length === 0 ? (
              <div className="cs-empty">
                <p>No saved deals yet.</p>
                <IonButton onClick={() => history.push('/deals')}>Browse deals</IonButton>
              </div>
            ) : (
              <ul className="cs-stack" style={{ listStyle: 'none', padding: 0 }}>
                {savedDeals.map((deal) => (
                  <li key={deal.id} className="cs-card">
                    <div className="cs-row" style={{ justifyContent: 'space-between' }}>
                      <button
                        className="cs-link-button"
                        onClick={() => history.push(`/product/${deal.product_id}`)}
                      >
                        <span className="cs-strong">{deal.canonical_name}</span>
                        <span className="cs-muted">{deal.warehouse_name}</span>
                      </button>
                      <div style={{ textAlign: 'right' }}>
                        <div className="cs-price cs-strong">
                          {deal.consensus_price_cents != null
                            ? formatUSD(cents(deal.consensus_price_cents))
                            : 'No current price'}
                        </div>
                        <IonButton
                          size="small"
                          fill="clear"
                          disabled={busyId === deal.id}
                          onClick={() => removeSavedDeal(deal.id)}
                        >
                          Remove
                        </IonButton>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
