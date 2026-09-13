/**
 * COSTCO-SAVER — barcode normalization.
 * Spec §20.
 *
 * Responsibilities:
 *  - strip non-digits
 *  - check digit validation (UPC-A, UPC-E, EAN-8, EAN-13, GTIN-14)
 *  - normalize to canonical GTIN-14 when possible
 *  - leading-zero conversion (UPC-A 12-digit starting with 0 is also a valid EAN-13)
 *  - reject obviously bad input
 */

export type BarcodeKind =
  | 'UPC_A'
  | 'UPC_E'
  | 'EAN_8'
  | 'EAN_13'
  | 'GTIN_14'
  | 'UNKNOWN';

export interface NormalizedBarcode {
  readonly value: string;       // canonical form
  readonly kind: BarcodeKind;
  readonly checkDigitValid: boolean;
  readonly display: string;     // what the UI shows
}

const ALLOWED = /^\d+$/;

/**
 * Compute UPC-A / EAN-13 / GTIN-14 check digit (mod-10 weighted).
 * @see GS1 General Specifications
 */
export function computeCheckDigit(digits: string): number {
  if (!ALLOWED.test(digits)) {
    throw new Error('Non-digit characters in barcode body');
  }
  // Right-to-left, alternating weights of 3 and 1, starting with 3 on the
  // rightmost data digit (the one before the check digit).
  let sum = 0;
  const reversed = digits.split('').reverse();
  for (let i = 0; i < reversed.length; i++) {
    const d = parseInt(reversed[i]!, 10);
    const weight = i % 2 === 0 ? 3 : 1;
    sum += d * weight;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

export function isValidUpcA(value: string): boolean {
  if (!/^\d{12}$/.test(value)) return false;
  const body = value.slice(0, 11);
  const expected = computeCheckDigit(body);
  return expected === parseInt(value[11]!, 10);
}

export function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  const body = value.slice(0, 12);
  const expected = computeCheckDigit(body);
  return expected === parseInt(value[12]!, 10);
}

export function isValidEan8(value: string): boolean {
  if (!/^\d{8}$/.test(value)) return false;
  const body = value.slice(0, 7);
  const expected = computeCheckDigit(body);
  return expected === parseInt(value[7]!, 10);
}

export function isValidGtin14(value: string): boolean {
  if (!/^\d{14}$/.test(value)) return false;
  const body = value.slice(0, 13);
  const expected = computeCheckDigit(body);
  return expected === parseInt(value[13]!, 10);
}

/**
 * Convert a 6-digit UPC-E short form to its UPC-A equivalent.
 * Spec §20 mentions UPC-A/EAN equivalence; the standard mapping is:
 *   0abcde0 -> 0abc0000de + check
 *   0abcde1 -> 0abc1000de + check
 *   0abcde2 -> 0abc2000de + check
 *   0abcde3 -> 0abc00000d + check   (special: only 5 digits, last is 3)
 *   0abcde4 -> 0abc00000d + check
 *   0abcde5 -> 0abc00000d + check
 *   0abcde6 -> 0abc00000d + check
 *   0abcde7 -> 0abc8000de + check
 *   0abcde8 -> 0abc9000de + check
 *   0abcde9 -> 0abc0000de + check
 * Returns null if the input does not match the format.
 */
export function expandUpcEtoUpcA(upce: string): string | null {
  // Accept 6-digit core or 8-digit (number system + 6 + check).
  let ns = '0';
  let core = upce;
  if (/^\d{8}$/.test(upce)) {
    ns = upce[0]!;
    core = upce.slice(1, 7);
  } else if (!/^\d{6}$/.test(upce)) {
    return null;
  }
  // GS1 / ZXing mapping of the 6-digit UPC-E core to an 11-digit UPC-A body.
  const d = core;
  const last = d[5]!;
  let body: string;
  if (last === '0' || last === '1' || last === '2') {
    body = `${ns}${d.slice(0, 2)}${last}0000${d.slice(2, 5)}`;
  } else if (last === '3') {
    body = `${ns}${d.slice(0, 3)}00000${d.slice(3, 5)}`;
  } else if (last === '4') {
    body = `${ns}${d.slice(0, 4)}00000${d[4]!}`;
  } else {
    body = `${ns}${d.slice(0, 5)}0000${last}`;
  }
  if (body.length !== 11) return null;
  const check = computeCheckDigit(body);
  return body + check.toString();
}

/**
 * Normalize an arbitrary scanned string to a canonical form.
 * Returns the original display string for non-standard Costco internal codes
 * (e.g. item numbers like 1234567) and a check-digit-validated GTIN for
 * standard barcodes.
 */
export function normalizeBarcode(raw: string): NormalizedBarcode {
  const trimmed = raw.trim();
  const digitsOnly = trimmed.replace(/[\s-]/g, '');

  if (digitsOnly.length === 0) {
    return { value: '', kind: 'UNKNOWN', checkDigitValid: false, display: trimmed };
  }

  if (!ALLOWED.test(digitsOnly)) {
    // Probably a Costco internal item number; preserve as-is for downstream lookup.
    return { value: digitsOnly, kind: 'UNKNOWN', checkDigitValid: false, display: trimmed };
  }

  // GTIN-14
  if (digitsOnly.length === 14) {
    const valid = isValidGtin14(digitsOnly);
    return { value: valid ? digitsOnly : '', kind: 'GTIN_14', checkDigitValid: valid, display: trimmed };
  }

  // EAN-13
  if (digitsOnly.length === 13) {
    const valid = isValidEan13(digitsOnly);
    if (valid) {
      // Leading zero makes it also a UPC-A; canonicalize as 13-digit EAN-13.
      return { value: digitsOnly, kind: 'EAN_13', checkDigitValid: true, display: trimmed };
    }
    return { value: '', kind: 'EAN_13', checkDigitValid: false, display: trimmed };
  }

  // UPC-A
  if (digitsOnly.length === 12) {
    const valid = isValidUpcA(digitsOnly);
    if (valid) {
      // Canonicalize UPC-A to its EAN-13 equivalent (left-pad with 0).
      const ean13 = '0' + digitsOnly;
      return { value: ean13, kind: 'UPC_A', checkDigitValid: true, display: trimmed };
    }
    return { value: '', kind: 'UPC_A', checkDigitValid: false, display: trimmed };
  }

  // EAN-8
  if (digitsOnly.length === 8) {
    const valid = isValidEan8(digitsOnly);
    return {
      value: valid ? digitsOnly : '',
      kind: 'EAN_8',
      checkDigitValid: valid,
      display: trimmed,
    };
  }

  // UPC-E (6 digits, no separate check digit on the short form)
  if (digitsOnly.length === 6) {
    const upca = expandUpcEtoUpcA(digitsOnly);
    if (upca) {
      // Canonicalize to the 13-digit EAN-13 form.
      return { value: '0' + upca, kind: 'UPC_E', checkDigitValid: true, display: trimmed };
    }
    return { value: digitsOnly, kind: 'UPC_E', checkDigitValid: false, display: trimmed };
  }

  // 13-digit strings that look like Costco item numbers (the GS1 spec reserves
  // 0000–0199 for in-store use, but Costco uses 6–7 digit item numbers).
  return { value: digitsOnly, kind: 'UNKNOWN', checkDigitValid: false, display: trimmed };
}
