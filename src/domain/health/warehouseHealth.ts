/**
 * COSTCO-SAVER — warehouse health score.
 * Spec §36. Internal calculation.
 *
 * Inputs (real data only):
 *   - active observed products
 *   - median observation age
 *   - number of distinct contributors (last 30 days)
 *   - conflict ratio
 *   - evidence ratio (with photo vs without)
 *   - daily verification volume (last 7 days)
 *
 * Output: 0-100 health score, and a label bucket.
 */

export interface WarehouseHealthInput {
  readonly activeObservedProducts: number;
  readonly medianObservationAgeHours: number;
  readonly distinctContributorsLast30d: number;
  readonly conflictRatio: number;             // 0..1
  readonly evidenceRatio: number;             // 0..1
  readonly dailyVerificationVolume7d: number; // count
}

export type WarehouseHealthLabel =
  | 'Excellent coverage'
  | 'Good coverage'
  | 'Limited coverage'
  | 'Building coverage';

export interface WarehouseHealthResult {
  readonly score: number; // 0..100
  readonly label: WarehouseHealthLabel;
  readonly components: {
    readonly coverage: number;
    readonly freshness: number;
    readonly contributor: number;
    readonly conflict: number;
    readonly evidence: number;
    readonly volume: number;
  };
}

export function computeWarehouseHealth(input: WarehouseHealthInput): WarehouseHealthResult {
  // Coverage: target is 1000 active products per warehouse. 1000 -> 25 pts.
  const coverage = Math.min(25, Math.round((input.activeObservedProducts / 1000) * 25));

  // Freshness: median age in hours. 0h -> 25; 168h (7d) -> 0; linear in between.
  const age = Math.max(0, input.medianObservationAgeHours);
  const freshness = Math.max(0, Math.min(25, Math.round(25 - (age / 168) * 25)));

  // Contributors: target 50. 50 -> 20 pts.
  const contributor = Math.min(20, Math.round((input.distinctContributorsLast30d / 50) * 20));

  // Conflict: 0% -> 15 pts; 10%+ -> 0 pts; linear in between (subtract from 15).
  const conflictPenalty = Math.max(0, Math.min(1, input.conflictRatio));
  const conflict = Math.max(0, Math.round(15 * (1 - conflictPenalty * 10)));

  // Evidence: 0% -> 0 pts; 100% -> 10 pts.
  const evidence = Math.max(0, Math.min(10, Math.round(input.evidenceRatio * 10)));

  // Volume: target 50 verifications per day. 50 -> 5 pts.
  const volume = Math.min(5, Math.round((input.dailyVerificationVolume7d / 50) * 5));

  const score = Math.max(0, Math.min(100, coverage + freshness + contributor + conflict + evidence + volume));

  let label: WarehouseHealthLabel;
  if (score >= 80) label = 'Excellent coverage';
  else if (score >= 60) label = 'Good coverage';
  else if (score >= 35) label = 'Limited coverage';
  else label = 'Building coverage';

  return { score, label, components: { coverage, freshness, contributor, conflict, evidence, volume } };
}
