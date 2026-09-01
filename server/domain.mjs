export function classifyMarkdown(priceCents, hasAsterisk = false) {
  const ending = String(priceCents % 100).padStart(2, '0');
  let classification = 'unclassified';
  if (ending === '97') classification = 'clearance';
  else if (ending === '00' || ending === '88') classification = 'manager_markdown';
  else if (ending === '99') classification = 'regular_signal';
  return {
    ending,
    classification,
    hasAsterisk: Boolean(hasAsterisk),
  };
}

export function freshnessFor(dateLike, now = Date.now()) {
  if (!dateLike) return 'HISTORICAL';
  const ageHours = Math.max(0, now - new Date(dateLike).getTime()) / 3_600_000;
  if (ageHours <= 6) return 'LIVE';
  if (ageHours <= 24) return 'FRESH';
  if (ageHours <= 72) return 'RECENT';
  if (ageHours <= 168) return 'AGING';
  return 'HISTORICAL';
}

export function initialConfidence({ hasEvidence = false, sourceType = 'manual_shelf_entry' } = {}) {
  let score = 20;
  if (hasEvidence) score += 30;
  if (sourceType === 'shelf_scan') score += 10;
  if (sourceType === 'receipt') score += 25;
  score += 20; // fresh observation
  return Math.min(100, score);
}

export function eventTypeFor(oldPrice, newPrice) {
  if (oldPrice == null) return 'first_observation';
  if (newPrice < oldPrice) return 'price_drop';
  if (newPrice > oldPrice) return 'price_increase';
  return null;
}

export function percentChange(oldPrice, newPrice) {
  if (!oldPrice || oldPrice <= 0) return null;
  return Number((((newPrice - oldPrice) / oldPrice) * 100).toFixed(2));
}

export function potentialSavings(purchasePrice, currentPrice, quantity) {
  if (currentPrice >= purchasePrice) return 0;
  return Math.max(0, Math.round((purchasePrice - currentPrice) * Number(quantity)));
}
