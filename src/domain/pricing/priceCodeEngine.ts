/**
 * COSTCO-SAVER — markdown classification engine.
 * Spec §17. No LLM. Deterministic.
 *
 * Costco warehouse price endings (the canonical "retailer language"):
 *   .97  → clearance
 *   .00  → manager markdown
 *   .88  → manager markdown
 *   .99  → ordinary / regular-price signal
 *   *    → possible non-restock / final stock signal (independent of cents)
 *
 * Any other ending is unclassified. We never assign strong meaning to
 * unsupported endings without verified evidence.
 */

import type { Cents } from '@domain/money/cents';
import { cents } from '@domain/money/cents';

export type MarkdownClassification = 'clearance' | 'manager_markdown' | 'regular_signal' | 'unclassified';

export type MarkdownSignal =
  'ending_97' | 'ending_00' | 'ending_88' | 'ending_99' | 'has_asterisk' | 'unclassified_ending';

export interface PriceCodeInput {
  readonly priceCents: number | Cents;
  readonly hasAsterisk?: boolean;
}

export interface PriceCodeResult {
  readonly ending: string; // '00' | '88' | '97' | '99' | '<other>'
  readonly classification: MarkdownClassification;
  readonly hasAsterisk: boolean;
  readonly signals: readonly MarkdownSignal[];
}

export function classifyPriceCode(input: PriceCodeInput): PriceCodeResult {
  const rawCents = typeof input.priceCents === 'number' ? input.priceCents : (input.priceCents as number);

  if (!Number.isInteger(rawCents) || rawCents < 0) {
    throw new Error(`Price must be a non-negative integer (cents), got ${input.priceCents}`);
  }

  const ending = rawCents % 100;
  const endingStr = ending.toString().padStart(2, '0');

  const hasAsterisk = input.hasAsterisk === true;
  const signals: MarkdownSignal[] = [];

  let classification: MarkdownClassification;
  switch (endingStr) {
    case '97':
      classification = 'clearance';
      signals.push('ending_97');
      break;
    case '00':
    case '88':
      classification = 'manager_markdown';
      signals.push(`ending_${endingStr}` as MarkdownSignal);
      break;
    case '99':
      classification = 'regular_signal';
      signals.push('ending_99');
      break;
    default:
      classification = 'unclassified';
      signals.push('unclassified_ending');
  }

  if (hasAsterisk) {
    signals.push('has_asterisk');
  }

  // Sanity-tag the cents to its branded type so callers can use it
  // safely downstream.
  void cents(rawCents);

  return {
    ending: endingStr,
    classification,
    hasAsterisk,
    signals,
  };
}

/**
 * User-facing explanation copy. Stored as static text per spec §18
 * (no LLM-generated explanations).
 */
export const MARKDOWN_EXPLANATIONS: Readonly<Record<MarkdownClassification, string>> = {
  clearance:
    'A price ending in .97 typically signals a clearance markdown. Once stock is gone, ' +
    'the item usually does not return to the warehouse.',
  manager_markdown:
    'A price ending in .00 or .88 is a manager markdown, often applied to reduce stock ' +
    'or match a local competitor. These prices can revert without notice.',
  regular_signal:
    'A price ending in .99 is Costco’s standard everyday price ending and usually ' +
    'indicates the regular retail price rather than a temporary discount.',
  unclassified:
    'The price ending is not a recognized Costco markdown signal. The price may still ' +
    'be a temporary reduction, but we have no deterministic rule for this ending.',
} as const;

export const ASTERISK_EXPLANATION =
  'An asterisk (*) on a Costco price tag often means the item will not be restocked ' +
  'once current stock is sold. Combined with a markdown, it is a strong "final stock" signal.';
