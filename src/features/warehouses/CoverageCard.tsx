import { useEffect, useState } from 'react';
import { computeWarehouseHealth, type WarehouseHealthLabel } from '@domain/health/warehouseHealth';
import { getWarehouseHealth, type WarehouseHealthStats } from '@services/api/health';

interface CoverageCardProps {
  warehouseId: string;
}

const EMPTY: WarehouseHealthStats = {
  activeObservedProducts: 0,
  medianObservationAgeHours: 0,
  distinctContributorsLast30d: 0,
  conflictRatio: 0,
  evidenceRatio: 0,
  dailyVerificationVolume7d: 0,
};

export function CoverageCard({ warehouseId }: CoverageCardProps): JSX.Element {
  const [stats, setStats] = useState<WarehouseHealthStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getWarehouseHealth(warehouseId)
      .then((next) => {
        if (cancelled) return;
        setStats(next);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [warehouseId]);

  if (loading) {
    return (
      <section className="cs-card" aria-busy="true">
        <h3 className="cs-strong" style={{ margin: 0 }}>
          Coverage
        </h3>
        <p className="cs-muted">Calculating…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="cs-card">
        <h3 className="cs-strong" style={{ margin: 0 }}>
          Coverage
        </h3>
        <p role="alert" className="cs-muted">
          {error}
        </p>
      </section>
    );
  }

  const result = computeWarehouseHealth(stats);
  return (
    <section className="cs-card" aria-label={`Warehouse coverage ${result.label}`}>
      <div className="cs-row" style={{ justifyContent: 'space-between' }}>
        <h3 className="cs-strong" style={{ margin: 0 }}>
          Coverage radar
        </h3>
        <span className={`cs-pill cs-pill--${labelToClass(result.label)}`}>{result.label}</span>
      </div>
      <div className="cs-row" style={{ justifyContent: 'space-between', marginTop: 'var(--cs-space-3)' }}>
        <div>
          <div className="cs-muted">Health score</div>
          <div className="cs-strong" style={{ fontSize: 'var(--cs-font-size-5)' }}>
            {result.score}/100
          </div>
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
        {(stats.conflictRatio * 100).toFixed(1)}% conflict · {(stats.evidenceRatio * 100).toFixed(1)}%
        evidence-backed
      </p>
    </section>
  );
}

function labelToClass(label: WarehouseHealthLabel): string {
  if (label === 'Excellent coverage' || label === 'Good coverage') return 'verified';
  if (label === 'Limited coverage') return 'aging';
  return 'historical';
}
