/**
 * COSTCO-SAVER — deal score V2.
 * Spec §38. Deterministic 0–100.
 *
 * Components (max):
 *   historical discount         35
 *   markdown signal             20
 *   confidence                  20
 *   freshness                   15
 *   warehouse advantage         10
 *                           -------
 *                              100
 */

import type { Cents } from '@domain/money/cents';
import { percentChange } from '@domain/money/cents';
import { classifyPriceCode, type MarkdownClassification } from '@domain/pricing/priceCodeEngine';
import type { FreshnessClass } from '@domain/freshness/freshnessEngine';

export interface DealScoreInput {
  readonly currentPrice: Cents | number;
  readonly historicalRegularPrice?: Cents | number | null;
  readonly hasAsterisk?: boolean;
  readonly markdownClass?: MarkdownClassification | null;
  readonly confidence: number; // 0..100
  readonly freshnessClass: FreshnessClass;
  readonly currentWarehousePrice: Cents | number;
  readonly nearbyBestPrice?: Cents | number | null;
}

export interface DealScoreResult {
  readonly score: number;
  readonly components: {
    readonly historicalDiscount: number;
    readonly markdownSignal: number;
    readonly confidence: number;
    readonly freshness: number;
    readonly warehouseAdvantage: number;
  };
  readonly rating: 'Excellent Deal' | 'Great Deal' | 'Good Deal' | 'Fair' | 'Hold';
}

const FRESHNESS_POINTS: Record<FreshnessClass, number> = {
  LIVE: 15,
  FRESH: 12,
  RECENT: 8,
  AGING: 3,
  HISTORICAL: 0,
};

function toNum(v: Cents | number): number {
  return typeof v === 'number' ? v : (v as number);
}

export function computeDealScore(input: DealScoreInput): DealScoreResult {
  // 1. Historical discount: up to 35 points based on % off the historical
  //    regular price. 0% → 0; 50%+ → 35 (linear in between).
  let historicalDiscount = 0;
  if (input.historicalRegularPrice != null) {
    const hist = toNum(input.historicalRegularPrice);
    const cur = toNum(input.currentPrice);
    if (hist > 0 && cur < hist) {
      const pct = (hist - cur) / hist;
      historicalDiscount = Math.min(35, Math.round(pct * 70)); // 50% off -> 35
    }
  }

  // 2. Markdown signal: 0–20.
  //    We re-run the classifier so the score is consistent with display
  //    copy even if markdown_class was not passed.
  const classified = classifyPriceCode({
    priceCents: toNum(input.currentPrice),
    hasAsterisk: input.hasAsterisk ?? false,
  });
  const markdownClass = input.markdownClass ?? classified.classification;
  let markdownSignal = 0;
  if (markdownClass === 'clearance') markdownSignal = 20;
  else if (markdownClass === 'manager_markdown') markdownSignal = 14;
  else if (markdownClass === 'regular_signal') markdownSignal = 4;
  else markdownSignal = 0;
  if (input.hasAsterisk) markdownSignal = Math.min(20, markdownSignal + 4);

  // 3. Confidence: 0–20.
  const confidencePts = Math.max(0, Math.min(100, input.confidence));
  const confidence = Math.round((confidencePts / 100) * 20);

  // 4. Freshness: 0–15.
  const freshness = FRESHNESS_POINTS[input.freshnessClass] ?? 0;

  // 5. Warehouse advantage: 0–10. 5% cheaper than a nearby warehouse.
  let warehouseAdvantage = 0;
  if (input.nearbyBestPrice != null) {
    const nearby = toNum(input.nearbyBestPrice);
    const here = toNum(input.currentWarehousePrice);
    if (nearby > 0 && here < nearby) {
      const pct = (nearby - here) / nearby;
      warehouseAdvantage = Math.min(10, Math.round(pct * 200)); // 5% off -> 10
    }
  }

  const score = Math.max(
    0,
    Math.min(100, historicalDiscount + markdownSignal + confidence + freshness + warehouseAdvantage),
  );

  let rating: DealScoreResult['rating'];
  if (score >= 85) rating = 'Excellent Deal';
  else if (score >= 70) rating = 'Great Deal';
  else if (score >= 55) rating = 'Good Deal';
  else if (score >= 35) rating = 'Fair';
  else rating = 'Hold';

  // Suppress lint for unused helper; percentChange is exported for other modules.
  void percentChange;

  return {
    score,
    components: {
      historicalDiscount,
      markdownSignal,
      confidence,
      freshness,
      warehouseAdvantage,
    },
    rating,
  };
}
