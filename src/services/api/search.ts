import { supabase } from '@services/supabase/client';

export interface SearchHit {
  productId: string;
  canonicalName: string;
  brand: string | null;
  size: string | null;
  category: string | null;
  identifier: string | null;
  identifierType: string | null;
}

/**
 * Server-side product search (spec §45).
 * Postgres trigram + identifier lookups. Single round trip to the server.
 */
export async function searchProducts(query: string, limit = 20): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Two-step: look up by identifier first, then by trigram name match.
  const { data: idHits, error: idErr } = await supabase()
    .from('product_identifiers')
    .select('product_id, identifier_type, normalized_value, products(canonical_name, brand, size_value, size_unit, categories(slug))')
    .or(`normalized_value.ilike.%${trimmed}%`)
    .limit(limit);
  if (idErr) throw idErr;

  const { data: nameHits, error: nameErr } = await supabase()
    .from('products')
    .select('id, canonical_name, brand, size_value, size_unit, categories(slug)')
    .or(`canonical_name.ilike.%${trimmed}%,brand.ilike.%${trimmed}%`)
    .limit(limit);
  if (nameErr) throw nameErr;

  const seen = new Set<string>();
  const out: SearchHit[] = [];
  const push = (id: string, name: string, brand: string | null, size: string | null, category: string | null, identifier: string | null, identifierType: string | null) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ productId: id, canonicalName: name, brand, size, category, identifier, identifierType });
  };

  for (const hit of idHits ?? []) {
    const p = (hit as { products: ProductJoin | ProductJoin[] | null }).products;
    const product = Array.isArray(p) ? p[0] : p;
    if (!product) continue;
    push(
      hit.product_id as string,
      (product as { canonical_name: string }).canonical_name,
      (product as { brand: string | null }).brand ?? null,
      formatSize((product as { size_value: number | null }).size_value, (product as { size_unit: string | null }).size_unit),
      ((product as { categories: { slug: string } | { slug: string }[] | null }).categories as { slug: string } | null)?.slug ?? null,
      (hit as { normalized_value: string }).normalized_value,
      (hit as { identifier_type: string }).identifier_type,
    );
  }
  for (const hit of nameHits ?? []) {
    push(
      (hit as { id: string }).id,
      (hit as { canonical_name: string }).canonical_name,
      (hit as { brand: string | null }).brand ?? null,
      formatSize((hit as { size_value: number | null }).size_value, (hit as { size_unit: string | null }).size_unit),
      ((hit as { categories: { slug: string } | { slug: string }[] | null }).categories as { slug: string } | null)?.slug ?? null,
      null,
      null,
    );
  }
  return out.slice(0, limit);
}

function formatSize(value: number | null, unit: string | null): string | null {
  if (value == null) return null;
  return unit ? `${value} ${unit}` : String(value);
}

interface ProductJoin {
  canonical_name: string;
  brand: string | null;
  size_value: number | null;
  size_unit: string | null;
  categories: { slug: string } | { slug: string }[] | null;
}
