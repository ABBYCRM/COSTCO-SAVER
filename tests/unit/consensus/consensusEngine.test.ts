import { describe, expect, it } from 'vitest';
import { computeConsensus, type ObservationLike } from '@domain/consensus/consensusEngine';

const baseObs = (overrides: Partial<ObservationLike>): ObservationLike => ({
  id: crypto.randomUUID(),
  priceCents: 1997,
  observedAt: new Date('2026-08-31T11:00:00Z'),
  submitterUserId: 'u1',
  source: 'shelf_scan',
  hasAsterisk: false,
  verificationStatus: 'verified',
  evidencePresent: true,
  hasReceipt: false,
  hasBarcodeSameSession: true,
  hasCostcoItemNumber: true,
  ...overrides,
});

describe('consensus / consensusEngine', () => {
  const now = new Date('2026-08-31T12:00:00Z');

  it('returns null when there are no usable observations', () => {
    const r = computeConsensus([], now);
    expect(r.consensusPriceCents).toBeNull();
    expect(r.confidence).toBe(0);
  });

  it('filters rejected and flagged observations', () => {
    const obs: ObservationLike[] = [
      baseObs({ verificationStatus: 'rejected' }),
      baseObs({ verificationStatus: 'flagged' }),
    ];
    const r = computeConsensus(obs, now);
    expect(r.consensusPriceCents).toBeNull();
  });

  it('selects the highest weighted cluster', () => {
    const obs: ObservationLike[] = [
      baseObs({ id: 'a', priceCents: 1997, submitterUserId: 'u1' }),
      baseObs({ id: 'b', priceCents: 1997, submitterUserId: 'u2' }),
      baseObs({ id: 'c', priceCents: 1997, submitterUserId: 'u3' }),
      baseObs({ id: 'd', priceCents: 2999, submitterUserId: 'u4' }),
    ];
    const r = computeConsensus(obs, now);
    expect(r.consensusPriceCents).toBe(1997);
    expect(r.conflictingReportCount).toBe(1);
  });

  it('reports evidence + submitter counts from the winning cluster', () => {
    const obs: ObservationLike[] = [
      baseObs({ id: 'a', priceCents: 1997, submitterUserId: 'u1' }),
      baseObs({ id: 'b', priceCents: 1997, submitterUserId: 'u2' }),
    ];
    const r = computeConsensus(obs, now);
    expect(r.evidenceCount).toBeGreaterThan(0);
    expect(r.independentConfirmationCount).toBe(1);
  });

  it('returns LIVE freshness for very recent observations', () => {
    const obs: ObservationLike[] = [baseObs({ observedAt: new Date(now.getTime() - 30 * 60_000) })];
    const r = computeConsensus(obs, now);
    expect(r.freshnessClass).toBe('LIVE');
  });

  it('returns HISTORICAL freshness for very old observations', () => {
    const obs: ObservationLike[] = [
      baseObs({ observedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }),
    ];
    const r = computeConsensus(obs, now);
    expect(r.freshnessClass).toBe('HISTORICAL');
  });
});
