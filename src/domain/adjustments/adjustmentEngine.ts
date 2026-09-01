/**
 * COSTCO-SAVER — price adjustment engine.
 * Spec §30.
 *
 * For every active purchase:
 *   - find the same product at the same warehouse
 *   - find a qualifying lower verified price
 *   - confirm event confidence threshold
 *   - calculate delta
 *   - check date window (30 days from purchase)
 *   - create or update candidate
 *
 * Statuses: tracking | opportunity | claimed | denied | expired | dismissed
 */

import type { Cents } from '@domain/money/cents';
import { cents, computeSavingsCents, subCents, mulCents } from '@domain/money/cents';

export type AdjustmentStatus = 'tracking' | 'opportunity' | 'claimed' | 'denied' | 'expired' | 'dismissed';

export interface ActivePurchase {
  readonly id: string;
  readonly productId: string;
  readonly warehouseId: string;
  readonly unitPriceCents: Cents;
  readonly quantity: number;
  readonly purchaseDate: Date | string;
}

export interface QualifyingLowerPrice {
  readonly productId: string;
  readonly warehouseId: string;
  readonly priceCents: Cents;
  readonly priceDropDate: Date | string;
  readonly confidence: number; // 0..100
}

export interface AdjustmentWindow {
  readonly days: number; // default 30
}

const DEFAULT_WINDOW_DAYS = 30;
const MIN_CONFIDENCE = 50; // below this we don't surface as an opportunity

export function evaluateAdjustment(
  purchase: ActivePurchase,
  lowerPrice: QualifyingLowerPrice | null,
  windowDays: number = DEFAULT_WINDOW_DAYS,
  now: Date = new Date(),
): AdjustmentCandidate | null {
  if (!lowerPrice) return null;
  if (lowerPrice.productId !== purchase.productId) return null;
  if (lowerPrice.warehouseId !== purchase.warehouseId) return null;
  if ((lowerPrice.priceCents as number) >= (purchase.unitPriceCents as number)) return null;
  if (lowerPrice.confidence < MIN_CONFIDENCE) return null;

  const purchaseDate =
    typeof purchase.purchaseDate === 'string' ? new Date(purchase.purchaseDate) : purchase.purchaseDate;
  const dropDate =
    typeof lowerPrice.priceDropDate === 'string'
      ? new Date(lowerPrice.priceDropDate)
      : lowerPrice.priceDropDate;
  if (Number.isNaN(purchaseDate.getTime()) || Number.isNaN(dropDate.getTime())) return null;

  const windowEnd = new Date(purchaseDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
  if (now.getTime() > windowEnd.getTime()) {
    return {
      purchaseId: purchase.id,
      productId: purchase.productId,
      warehouseId: purchase.warehouseId,
      purchasePriceCents: purchase.unitPriceCents,
      newPriceCents: lowerPrice.priceCents,
      quantity: purchase.quantity,
      potentialSavingsCents: cents(0),
      purchaseDate,
      priceDropDate: dropDate,
      windowEnd,
      daysRemaining: 0,
      status: 'expired',
    };
  }

  const perUnit = computeSavingsCents(purchase.unitPriceCents, lowerPrice.priceCents);
  const qty = purchase.quantity;
  // savingsCents = perUnit * quantity (rounded to whole cents)
  const totalSavings = mulCents(perUnit, qty);
  const daysRemaining = Math.max(0, Math.ceil((windowEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

  return {
    purchaseId: purchase.id,
    productId: purchase.productId,
    warehouseId: purchase.warehouseId,
    purchasePriceCents: purchase.unitPriceCents,
    newPriceCents: lowerPrice.priceCents,
    quantity: qty,
    potentialSavingsCents: totalSavings,
    purchaseDate,
    priceDropDate: dropDate,
    windowEnd,
    daysRemaining,
    status: 'opportunity',
  };
}

export interface AdjustmentCandidate {
  readonly purchaseId: string;
  readonly productId: string;
  readonly warehouseId: string;
  readonly purchasePriceCents: Cents;
  readonly newPriceCents: Cents;
  readonly quantity: number;
  readonly potentialSavingsCents: Cents;
  readonly purchaseDate: Date;
  readonly priceDropDate: Date;
  readonly windowEnd: Date;
  readonly daysRemaining: number;
  readonly status: AdjustmentStatus;
}

export { subCents };
