/**
 * COSTCO-SAVER — confidence engine.
 * Spec §13. Deterministic. Score 0–100.
 *
 * Components:
 *   base evidence points
 *   independent user confirmations (capped +25)
 *   recency (max +20)
 *   contributor reputation (max +10)
 *   conflicts (-20 / -15)
 *   invalid evidence (-10 to -100)
 *
 * Same-account repeated submissions cannot increase confirmation score
 * (caller must pass distinct confirmerUserIds).
 */

export type EvidenceSource =
  | 'shelf_photo'
  | 'barcode_same_session'
  | 'costco_item_number'
  | 'receipt'
  | 'manual_price_only';

export interface ConfidenceInput {
  readonly sources: readonly EvidenceSource[];
  readonly independentConfirmationCount: number;
  readonly lastVerifiedAt: Date | string | null;
  readonly contributorReputation: number; // 0..100
  readonly freshConflictCount: number;
  readonly invalidPenalty?: number;       // 0..100, default 0
  readonly now?: Date;
}

const BASE_POINTS: Readonly<Record<EvidenceSource, number>> = {
  shelf_photo: 30,
  barcode_same_session: 10,
  costco_item_number: 10,
  receipt: 25,
  manual_price_only: 5,
};

const CONFIRMATION_POINTS = [8, 7, 5]; // 1st, 2nd, 3rd
const CONFIRMATION_CAP = 25;
const ADDITIONAL_CONFIRMATION_POINTS = 2;

export function confidenceScore(input: ConfidenceInput): number {
  const now = input.now ?? new Date();
  let score = 0;

  // Base evidence points — sources are cumulative but only the strongest
  // counts; we do not double-count overlapping evidence (e.g. shelf photo +
  // barcode in same session are both part of one shelf-scan submission).
  const sourceSet = new Set(input.sources);
  for (const source of sourceSet) {
    score += BASE_POINTS[source];
  }

  // Independent confirmations
  const confirmations = Math.max(0, Math.floor(input.independentConfirmationCount));
  if (confirmations > 0) {
    score += CONFIRMATION_POINTS[0];
  }
  if (confirmations > 1) {
    score += CONFIRMATION_POINTS[1];
  }
  if (confirmations > 2) {
    score += CONFIRMATION_POINTS[2];
  }
  if (confirmations > 3) {
    score += Math.min(confirmations - 3, 0) + ADDITIONAL_CONFIRMATION_POINTS * (confirmations - 3);
    // Cap at +25 from confirmations.
    const confirmTotal =
      CONFIRMATION_POINTS[0] +
      CONFIRMATION_POINTS[1] +
      CONFIRMATION_POINTS[2] +
      ADDITIONAL_CONFIRMATION_POINTS * (confirmations - 3);
    score -= Math.max(0, confirmTotal - CONFIRMATION_CAP);
  }

  // Recency
  if (input.lastVerifiedAt) {
    const last = typeof input.lastVerifiedAt === 'string'
      ? new Date(input.lastVerifiedAt)
      : input.lastVerifiedAt;
    if (!Number.isNaN(last.getTime())) {
      const ageMs = now.getTime() - last.getTime();
      if (ageMs <= 6 * 60 * 60 * 1000) score += 20;
      else if (ageMs <= 24 * 60 * 60 * 1000) score += 16;
      else if (ageMs <= 72 * 60 * 60 * 1000) score += 10;
      else if (ageMs <= 7 * 24 * 60 * 60 * 1000) score += 4;
    }
  }

  // Contributor reputation (max +10)
  const rep = Math.max(0, Math.min(100, Math.floor(input.contributorReputation)));
  score += Math.floor((rep / 100) * 10);

  // Conflicts
  if (input.freshConflictCount >= 1) score -= 20;
  if (input.freshConflictCount >= 2) score -= 15;

  // Invalid / suspicious evidence
  const penalty = Math.max(0, Math.min(100, input.invalidPenalty ?? 0));
  if (penalty > 0) score -= penalty;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function confidenceLabel(score: number): string {
  if (score >= 90) return 'Very High';
  if (score >= 75) return 'High';
  if (score >= 50) return 'Medium';
  if (score >= 25) return 'Low';
  return 'Very Low';
}
