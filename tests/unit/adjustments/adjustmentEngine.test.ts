import { describe, expect, it } from 'vitest';
import { evaluateAdjustment } from '@domain/adjustments/adjustmentEngine';
import { cents } from '@domain/money/cents';

describe('adjustments / adjustmentEngine', () => {
  const now = new Date('2026-08-31T12:00:00Z');
  const purchase = {
    id: 'p1',
    productId: 'prod1',
    warehouseId: 'wh1',
    unitPriceCents: cents(2999),
    quantity: 2,
    purchaseDate: new Date('2026-08-25T12:00:00Z'), // 6 days ago
  };

  it('returns null when no lower price is available', () => {
    expect(evaluateAdjustment(purchase, null, 30, now)).toBeNull();
  });

  it('returns null when lower price is not actually lower', () => {
    const result = evaluateAdjustment(
      purchase,
      {
        productId: 'prod1',
        warehouseId: 'wh1',
        priceCents: cents(3199),
        priceDropDate: new Date(),
        confidence: 90,
      },
      30,
      now,
    );
    expect(result).toBeNull();
  });

  it('returns null when confidence is below threshold', () => {
    const result = evaluateAdjustment(
      purchase,
      {
        productId: 'prod1',
        warehouseId: 'wh1',
        priceCents: cents(2097),
        priceDropDate: new Date(),
        confidence: 30,
      },
      30,
      now,
    );
    expect(result).toBeNull();
  });

  it('creates an opportunity with savings = perUnit * quantity', () => {
    const result = evaluateAdjustment(
      purchase,
      {
        productId: 'prod1',
        warehouseId: 'wh1',
        priceCents: cents(2097),
        priceDropDate: new Date(),
        confidence: 90,
      },
      30,
      now,
    );
    expect(result).not.toBeNull();
    // (2999 - 2097) * 2 = 902 * 2 = 1804
    expect(result!.potentialSavingsCents).toBe(1804);
    expect(result!.status).toBe('opportunity');
    expect(result!.daysRemaining).toBeGreaterThan(20);
  });

  it('returns expired when the window has passed', () => {
    const oldPurchase = { ...purchase, purchaseDate: new Date('2026-01-01T00:00:00Z') };
    const result = evaluateAdjustment(
      oldPurchase,
      {
        productId: 'prod1',
        warehouseId: 'wh1',
        priceCents: cents(2097),
        priceDropDate: new Date(),
        confidence: 90,
      },
      30,
      now,
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe('expired');
  });
});
