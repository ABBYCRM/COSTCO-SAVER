import { apiFetch } from './client';

export interface WarehouseHealthStats {
  activeObservedProducts: number;
  medianObservationAgeHours: number;
  distinctContributorsLast30d: number;
  conflictRatio: number;
  evidenceRatio: number;
  dailyVerificationVolume7d: number;
}

interface ApiStats {
  active_observed_products: number;
  median_observation_age_hours: number;
  distinct_contributors_last_30d: number;
  conflict_ratio: number;
  evidence_ratio: number;
  daily_verification_volume_7d: number;
}

export async function getWarehouseHealth(warehouseId: string): Promise<WarehouseHealthStats> {
  const result = await apiFetch<{ stats: ApiStats }>(
    `/api/v1/warehouses/${warehouseId}/health`,
  );
  return {
    activeObservedProducts: Number(result.stats.active_observed_products || 0),
    medianObservationAgeHours: Number(result.stats.median_observation_age_hours || 0),
    distinctContributorsLast30d: Number(result.stats.distinct_contributors_last_30d || 0),
    conflictRatio: Number(result.stats.conflict_ratio || 0),
    evidenceRatio: Number(result.stats.evidence_ratio || 0),
    dailyVerificationVolume7d: Number(result.stats.daily_verification_volume_7d || 0),
  };
}
