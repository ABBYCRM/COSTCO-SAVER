/**
 * Helpers for typing PostgREST joined rows.
 *
 * PostgREST returns joined single records as the object, but the generated
 * types treat them as arrays. We use these helpers to keep the rest of
 * the codebase free of `any` casts.
 */

export type MaybeArray<T> = T | T[] | null | undefined;

export function first<T>(v: MaybeArray<T>): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function unwrap<T>(v: MaybeArray<T>, fallback: T): T {
  const x = first(v);
  return x ?? fallback;
}
