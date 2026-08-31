/**
 * COSTCO-SAVER — freshness engine.
 * Spec §14.
 *
 * LIVE     verified within 6 hours
 * FRESH    verified within 24 hours
 * RECENT   verified within 72 hours
 * AGING    3-7 days
 * HISTORICAL older than 7 days
 */

export type FreshnessClass = 'LIVE' | 'FRESH' | 'RECENT' | 'AGING' | 'HISTORICAL';

export const FRESHNESS_THRESHOLDS_MS: Readonly<Record<FreshnessClass, number>> = {
  LIVE: 6 * 60 * 60 * 1000,
  FRESH: 24 * 60 * 60 * 1000,
  RECENT: 72 * 60 * 60 * 1000,
  AGING: 7 * 24 * 60 * 60 * 1000,
  // HISTORICAL is anything past AGING
  HISTORICAL: Number.POSITIVE_INFINITY,
} as const;

export function classifyFreshness(
  lastVerifiedAt: Date | string | null,
  now: Date = new Date(),
): FreshnessClass {
  if (!lastVerifiedAt) return 'HISTORICAL';
  const last = typeof lastVerifiedAt === 'string' ? new Date(lastVerifiedAt) : lastVerifiedAt;
  if (Number.isNaN(last.getTime())) return 'HISTORICAL';

  const ageMs = now.getTime() - last.getTime();
  if (ageMs < 0) return 'LIVE'; // future timestamps count as fresh (clock skew)
  if (ageMs <= FRESHNESS_THRESHOLDS_MS.LIVE) return 'LIVE';
  if (ageMs <= FRESHNESS_THRESHOLDS_MS.FRESH) return 'FRESH';
  if (ageMs <= FRESHNESS_THRESHOLDS_MS.RECENT) return 'RECENT';
  if (ageMs <= FRESHNESS_THRESHOLDS_MS.AGING) return 'AGING';
  return 'HISTORICAL';
}

export function ageDescription(lastVerifiedAt: Date | string | null, now: Date = new Date()): string {
  if (!lastVerifiedAt) return 'no verification on record';
  const last = typeof lastVerifiedAt === 'string' ? new Date(lastVerifiedAt) : lastVerifiedAt;
  if (Number.isNaN(last.getTime())) return 'unknown verification time';
  const ageMs = now.getTime() - last.getTime();
  if (ageMs < 0) return 'verified just now';
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return 'verified just now';
  if (minutes < 60) return `verified ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `verified ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `verified ${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `verified ${months}mo ago`;
  const years = Math.floor(months / 12);
  return `verified ${years}y ago`;
}
