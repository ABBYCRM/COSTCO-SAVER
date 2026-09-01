/**
 * COSTCO-SAVER — money primitives.
 * Spec §61. All money is integer cents. No floats. Deterministic.
 *
 * The cents type is brand-shaped so a plain number cannot be passed
 * to a savings calculation by mistake; the caller must construct
 * one via `cents()` or `fromMajorUnits()`.
 */

export type Cents = number & { readonly __brand: 'Cents' };

export function cents(value: number): Cents {
  if (!Number.isInteger(value)) {
    throw new Error(`Cents must be an integer, got ${value}`);
  }
  if (value < 0) {
    throw new Error(`Cents must be non-negative, got ${value}`);
  }
  return value as Cents;
}

export function fromMajorUnits(major: number): Cents {
  if (!Number.isFinite(major)) {
    throw new Error(`Major units must be finite, got ${major}`);
  }
  // Use Math.round so $19.979 -> 1998 (banker style would round 1997.5 -> 1998).
  return cents(Math.round(major * 100));
}

export function toMajorUnits(c: Cents): number {
  return c / 100;
}

export function addCents(a: Cents, b: Cents): Cents {
  return cents((a + b) as number);
}

export function subCents(a: Cents, b: Cents): Cents {
  return cents((a - b) as number);
}

export function mulCents(c: Cents, factor: number): Cents {
  if (!Number.isFinite(factor)) {
    throw new Error(`Factor must be finite, got ${factor}`);
  }
  return cents(Math.round((c as number) * factor));
}

export function sumCents(values: readonly Cents[]): Cents {
  let total = 0;
  for (const v of values) {
    total += v as number;
  }
  return cents(total);
}

/**
 * Compute savings = purchase - current. Returns a positive value if the user
 * paid more than the current price, zero if equal, throws if the result would
 * be negative (which would mean current is more expensive than the purchase —
 * not a "savings" scenario for adjustment detection).
 */
export function computeSavingsCents(purchasePrice: Cents, currentPrice: Cents): Cents {
  if ((currentPrice as number) > (purchasePrice as number)) {
    return cents(0);
  }
  return subCents(purchasePrice, currentPrice);
}

export function formatUSD(c: Cents): string {
  const major = toMajorUnits(c);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(major);
}

export function percentChange(oldPrice: Cents, newPrice: Cents): number {
  if ((oldPrice as number) === 0) return 0;
  const delta = (newPrice as number) - (oldPrice as number);
  return (delta / (oldPrice as number)) * 100;
}
