import { useEffect, useState } from 'react';
import { supabase } from '@services/supabase/client';
import { computeWarehouseHealth, type WarehouseHealthLabel } from '@domain/health/warehouseHealth';

interface CoverageCardProps {
  warehouseId: string;
}

interface RawStats {
  activeObservedProducts: number;
  medianObservationAgeHours: number;
  distinctContributorsLast30d: number;
  conflictRatio: number;
  evidenceRatio: number;
  dailyVerificationVolume7d: number;
}

const EMPTY: RawStats = {
  activeObservedProducts: 0,
  medianObservationAgeHours: 0,
  distinctContributorsLast30d: 0,
  conflictRatio: 0,
  evidenceRatio: 0,
  dailyVerificationVolume7d: 0,
};

export function CoverageCard({ warehouseId }: CoverageCardProps): JSX.Element {
  const [stats, setStats] = useState<RawStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [state, verifications, conflicts, evidenceRows, contributors] = await Promise.all([
          supabase().from('warehouse_product_state').select('id, last_verified_at', { count: 'exact' }).eq('warehouse_id', warehouseId),
          supabase().from('price_observations').select('id', { count: 'exact', head: true }).eq('warehouse_id', warehouseId).gte('observed_at', sevenDaysAgo),
          supabase().from('price_observations').select('id, verification_status').eq('warehouse_id', warehouseId).order('observed_at', { ascending: false }).limit(500),
          supabase().from('price_observations').select('id, evidence_id').eq('warehouse_id', warehouseId).order('observed_at', { ascending: false }).limit(200),
          supabase().from('price_observations').select('submitter_user_id').eq('warehouse_id', warehouseId).gte('observed_at', thirtyDaysAgo),
        ]);

        if (cancelled) return;

        // Median observation age (hours) across the state rows.
        const lastVerifiedAt = (state.data ?? [])
          .map((r: { last_verified_at: string | null }) => r.last_verified_at)
          .filter((x: string | null): x is string => Boolean(x))
          .map((iso: string) => (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60))
          .sort((a: number, b: number) => a - b);
        const medianAge =
          lastVerifiedAt.length === 0
            ? 0
            : lastVerifiedAt[Math.floor(lastVerifiedAt.length / 2)] ?? 0;

        const conflictCount = (conflicts.data ?? []).filter(
          (r: { verification_status: string }) => r.verification_status === 'flagged',
        ).length;
        const conflictRatio = conflicts.data && conflicts.data.length > 0
          ? conflictCount / conflicts.data.length
          : 0;

        const evidenceCount = (evidenceRows.data ?? []).filter(
          (r: { evidence_id: string | null }) => r.evidence_id != null,
        ).length;
        const evidenceRatio = evidenceRows.data && evidenceRows.data.length > 0
          ? evidenceCount / evidenceRows.data.length
          : 0;

        const distinctContributors = new Set(
          (contributors.data ?? []).map((r: { submitter_user_id: string }) => r.submitter_user_id),
        ).size;

        const dailyVolume7d = verifications.count != null ? verifications.count / 7 : 0;

        setStats({
          activeObservedProducts: state.count ?? 0,
          medianObservationAgeHours: medianAge,
          distinctContributorsLast30d: distinctContributors,
          conflictRatio,
          evidenceRatio,
          dailyVerificationVolume7d: dailyVolume7d,
        });
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load coverage');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [warehouseId]);

  if (loading) {
    return (
      <section className="cs-card" aria-busy="true">
        <h3 className="cs-strong" style={{ margin: 0 }}>Coverage</h3>
        <p className="cs-muted">Calculating…</p>
      </section>
    );
  }
  if (error) {
    return (
      <section className="cs-card">
        <h3 className="cs-strong" style={{ margin: 0 }}>Coverage</h3>
        <p className="cs-muted">{error}</p>
      </section>
    );
  }
  const result = computeWarehouseHealth(stats);
  const labelClass = labelToClass(result.label);
  return (
    <section className="cs-card" aria-label={`Warehouse coverage ${result.label}`}>
      <div className="cs-row" style={{ justifyContent: 'space-between' }}>
        <h3 className="cs-strong" style={{ margin: 0 }}>Coverage radar</h3>
        <span className={`cs-pill cs-pill--${labelClass}`}>{result.label}</span>
      </div>
      <div className="cs-row" style={{ justifyContent: 'space-between', marginTop: 'var(--cs-space-3)' }}>
        <div>
          <div className="cs-muted">Health score</div>
          <div className="cs-strong" style={{ fontSize: 'var(--cs-font-size-5)' }}>{result.score}/100</div>
        </div>
        <div>
          <div className="cs-muted">Products</div>
          <div className="cs-strong">{stats.activeObservedProducts}</div>
        </div>
        <div>
          <div className="cs-muted">Median age</div>
          <div className="cs-strong">{stats.medianObservationAgeHours.toFixed(1)}h</div>
        </div>
      </div>
      <p className="cs-muted" style={{ marginTop: 'var(--cs-space-3)' }}>
        {stats.distinctContributorsLast30d} contributors in 30 days ·{' '}
        {stats.dailyVerificationVolume7d.toFixed(1)} verifications/day ·{' '}
        {(stats.conflictRatio * 100).toFixed(1)}% conflict ·{' '}
        {(stats.evidenceRatio * 100).toFixed(1)}% evidence-backed
      </p>
    </section>
  );
}

function labelToClass(label: WarehouseHealthLabel): string {
  if (label === 'Excellent coverage') return 'verified';
  if (label === 'Good coverage') return 'verified';
  if (label === 'Limited coverage') return 'aging';
  return 'historical';
}
