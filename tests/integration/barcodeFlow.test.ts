import { describe, expect, it } from 'vitest';
import { normalizeBarcode } from '@domain/barcodes/normalizeBarcode';
import { classifyPriceCode } from '@domain/pricing/priceCodeEngine';
import { cents } from '@domain/money/cents';
import { confidenceScore } from '@domain/confidence/confidenceEngine';
import { computeConsensus } from '@domain/consensus/consensusEngine';
import { computeDealScore } from '@domain/deals/dealScore';
import { evaluateAdjustment } from '@domain/adjustments/adjustmentEngine';

/**
 * End-to-end flow tests for the deterministic core.
 * Spec §16, §17, §30, §38 — these assert the spec-mandated behavior in one
 * chain, not just each engine in isolation.
 */
describe('integration / core flow', () => {
  const now = new Date('2026-08-31T12:00:00Z');

  it('scan → lookup → classify → consensus → deal score → adjustment', () => {
    // 1. Scan a UPC-A
    const raw = '012345678905';
    const barcode = normalizeBarcode(raw);
    expect(barcode.kind).toBe('UPC_A');
    expect(barcode.checkDigitValid).toBe(true);

    // 2. Submit a shelf price observation
    const priceCents = cents(1997);
    const code = classifyPriceCode({ priceCents, hasAsterisk: false });
    expect(code.classification).toBe('clearance');

    // 3. Consensus from multiple observations
    const observations = [
      {
        id: 'a', priceCents: 1997, observedAt: new Date(now.getTime() - 30 * 60_000),
        submitterUserId: 'u1', source: 'shelf_scan' as const, hasAsterisk: false,
        verificationStatus: 'verified' as const, evidencePresent: true,
        hasReceipt: false, hasBarcodeSameSession: true, hasCostcoItemNumber: true,
      },
      {
        id: 'b', priceCents: 1997, observedAt: new Date(now.getTime() - 60 * 60_000),
        submitterUserId: 'u2', source: 'receipt' as const, hasAsterisk: false,
        verificationStatus: 'verified' as const, evidencePresent: true,
        hasReceipt: true, hasBarcodeSameSession: false, hasCostcoItemNumber: true,
      },
    ];
    const consensus = computeConsensus(observations, now);
    expect(consensus.consensusPriceCents).toBe(1997);
    expect(consensus.freshnessClass).toBe('LIVE');

    // 4. Deal score
    const deal = computeDealScore({
      currentPrice: priceCents,
      markdownClass: 'clearance',
      confidence: consensus.confidence,
      freshnessClass: consensus.freshnessClass,
      currentWarehousePrice: priceCents,
    });
    expect(deal.score).toBeGreaterThan(0);
    expect(deal.rating).toMatch(/Deal/);

    // 5. Adjustment candidate from a recent purchase
    const adj = evaluateAdjustment(
      {
        id: 'p1', productId: 'prod', warehouseId: 'wh',
        unitPriceCents: cents(2999), quantity: 1,
        purchaseDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        productId: 'prod', warehouseId: 'wh',
        priceCents: cents(1997), priceDropDate: now, confidence: 90,
      },
      30,
      now,
    );
    expect(adj?.status).toBe('opportunity');
    expect(adj?.potentialSavingsCents).toBe(1002);
  });

  it('confidence engine is deterministic and matches spec table', () => {
    // Spec §13 example: shelf photo + barcode same session + item number + LIVE.
    const c = confidenceScore({
      sources: ['shelf_photo', 'barcode_same_session', 'costco_item_number'],
      independentConfirmationCount: 0,
      lastVerifiedAt: now,
      contributorReputation: 0,
      freshConflictCount: 0,
      now,
    });
    // 30 + 10 + 10 + 20 = 70
    expect(c).toBe(70);
  });
});
