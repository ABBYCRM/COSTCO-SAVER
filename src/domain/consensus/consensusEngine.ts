/**
 * COSTCO-SAVER — consensus price engine.
 * Spec §15.
 *
 * For a (product, warehouse) pair:
 *   1. retrieve recent observations
 *   2. group identical prices
 *   3. weight by evidence
 *   4. weight by recency
 *   5. weight by independent submitters
 *   6. remove rejected / abusive submissions
 *   7. select highest weighted cluster
 *   8. calculate confidence
 *   9. write "warehouse_product_state"
 */

import type { Cents } from '@domain/money/cents';
import { cents } from '@domain/money/cents';
import { confidenceScore, type EvidenceSource } from '@domain/confidence/confidenceEngine';
import { classifyFreshness, type FreshnessClass } from '@domain/freshness/freshnessEngine';

export interface ObservationLike {
  readonly id: string;
  readonly priceCents: number;
  readonly observedAt: Date | string;
  readonly submitterUserId: string;
  readonly source:
    | 'shelf_scan'
    | 'manual_shelf_entry'
    | 'receipt'
    | 'confirmation'
    | 'correction'
    | 'authorized_external_provider'
    | 'administrator_verified';
  readonly hasAsterisk: boolean;
  readonly verificationStatus: 'pending' | 'verified' | 'rejected' | 'flagged';
  readonly evidencePresent: boolean;
  readonly hasReceipt: boolean;
  readonly hasBarcodeSameSession: boolean;
  readonly hasCostcoItemNumber: boolean;
}

export interface ConsensusResult {
  readonly consensusPriceCents: Cents | null;
  readonly confidence: number; // 0..100
  readonly independentConfirmationCount: number;
  readonly evidenceCount: number;
  readonly conflictingReportCount: number;
  readonly freshnessClass: FreshnessClass;
  readonly lastVerifiedAt: Date | null;
  readonly clusters: ReadonlyArray<{
    readonly priceCents: Cents;
    readonly weight: number;
    readonly observationCount: number;
    readonly independentSubmitterCount: number;
  }>;
}

interface Cluster {
  priceCents: Cents;
  observationIds: Set<string>;
  submitterIds: Set<string>;
  weight: number;
  maxObservedAt: Date;
}

const EVIDENCE_BASE_FOR_SOURCE: Record<ObservationLike['source'], EvidenceSource[]> = {
  shelf_scan: ['shelf_photo', 'barcode_same_session'],
  manual_shelf_entry: ['manual_price_only'],
  receipt: ['receipt', 'costco_item_number'],
  confirmation: ['manual_price_only'],
  correction: ['manual_price_only'],
  authorized_external_provider: ['costco_item_number'],
  administrator_verified: ['shelf_photo', 'barcode_same_session', 'costco_item_number'],
};

function recencyWeight(observedAt: Date, now: Date): number {
  const ageMs = now.getTime() - observedAt.getTime();
  if (ageMs <= 6 * 60 * 60 * 1000) return 1.0;
  if (ageMs <= 24 * 60 * 60 * 1000) return 0.85;
  if (ageMs <= 72 * 60 * 60 * 1000) return 0.6;
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return 0.35;
  return 0.1;
}

export function computeConsensus(
  observations: readonly ObservationLike[],
  now: Date = new Date(),
): ConsensusResult {
  // Step 6: filter out rejected / flagged observations.
  const usable = observations.filter(
    (o) => o.verificationStatus !== 'rejected' && o.verificationStatus !== 'flagged',
  );

  if (usable.length === 0) {
    return {
      consensusPriceCents: null,
      confidence: 0,
      independentConfirmationCount: 0,
      evidenceCount: 0,
      conflictingReportCount: 0,
      freshnessClass: 'HISTORICAL',
      lastVerifiedAt: null,
      clusters: [],
    };
  }

  // Steps 1-2: group by price.
  const clusterMap = new Map<number, Cluster>();
  for (const o of usable) {
    const existing = clusterMap.get(o.priceCents);
    const observedAt = typeof o.observedAt === 'string' ? new Date(o.observedAt) : o.observedAt;

    const sourceTypes = EVIDENCE_BASE_FOR_SOURCE[o.source] ?? ['manual_price_only'];
    const basePoints = sourceTypes.reduce((acc, st) => acc + evidenceBasePoint(st, o), 0);
    const recency = recencyWeight(observedAt, now);
    // Step 4: weight by recency; step 3: weight by evidence (already in basePoints)
    const weight = basePoints * recency;

    if (existing) {
      existing.observationIds.add(o.id);
      existing.submitterIds.add(o.submitterUserId);
      existing.weight += weight;
      if (observedAt.getTime() > existing.maxObservedAt.getTime()) {
        existing.maxObservedAt = observedAt;
      }
    } else {
      clusterMap.set(o.priceCents, {
        priceCents: cents(o.priceCents),
        observationIds: new Set([o.id]),
        submitterIds: new Set([o.submitterUserId]),
        weight,
        maxObservedAt: observedAt,
      });
    }
  }

  // Step 7: pick the highest weighted cluster.
  const clusters = Array.from(clusterMap.values()).sort((a, b) => b.weight - a.weight);
  const winner = clusters[0];
  if (!winner) {
    return {
      consensusPriceCents: null,
      confidence: 0,
      independentConfirmationCount: 0,
      evidenceCount: 0,
      conflictingReportCount: 0,
      freshnessClass: 'HISTORICAL',
      lastVerifiedAt: null,
      clusters: [],
    };
  }

  // Step 8: confidence from the cluster.
  const totalObservations = clusters.reduce((acc, c) => acc + c.observationIds.size, 0);
  const evidenceCount = clusters.reduce((acc, c) => acc + countEvidence(c), 0);
  const conflictingReportCount = totalObservations - winner.observationIds.size;

  // Base sources for the winning price: shelf, barcode, item number, receipt.
  const sources: EvidenceSource[] = [];
  for (const id of winner.observationIds) {
    const o = usable.find((x) => x.id === id);
    if (!o) continue;
    const types = EVIDENCE_BASE_FOR_SOURCE[o.source] ?? ['manual_price_only'];
    for (const t of types) {
      if (!sources.includes(t)) sources.push(t);
    }
  }

  const confidence = confidenceScore({
    sources,
    independentConfirmationCount: Math.max(0, winner.submitterIds.size - 1),
    lastVerifiedAt: winner.maxObservedAt,
    contributorReputation: 60, // averaged neutral; refined upstream
    freshConflictCount: conflictingReportCount,
    now,
  });

  return {
    consensusPriceCents: winner.priceCents,
    confidence,
    independentConfirmationCount: Math.max(0, winner.submitterIds.size - 1),
    evidenceCount,
    conflictingReportCount,
    freshnessClass: classifyFreshness(winner.maxObservedAt, now),
    lastVerifiedAt: winner.maxObservedAt,
    clusters: clusters.map((c) => ({
      priceCents: c.priceCents,
      weight: c.weight,
      observationCount: c.observationIds.size,
      independentSubmitterCount: c.submitterIds.size,
    })),
  };
}

function evidenceBasePoint(source: EvidenceSource, o: ObservationLike): number {
  const base: Record<EvidenceSource, number> = {
    shelf_photo: 30,
    barcode_same_session: 10,
    costco_item_number: 10,
    receipt: 25,
    manual_price_only: 5,
  };
  if (source === 'shelf_photo' && !o.evidencePresent) return 0;
  if (source === 'barcode_same_session' && !o.hasBarcodeSameSession) return 0;
  if (source === 'receipt' && !o.hasReceipt) return 0;
  if (source === 'costco_item_number' && !o.hasCostcoItemNumber) return 0;
  return base[source];
}

function countEvidence(c: Cluster): number {
  // Each distinct observation can contribute at most one "evidence point"
  // (i.e. a photo, a barcode, a receipt). We just use observation count
  // as a proxy and let the SQL warehouse_product_state row carry the
  // precise count.
  return c.observationIds.size;
}
