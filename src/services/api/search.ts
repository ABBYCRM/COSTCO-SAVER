import { apiFetch } from './client';

export interface SearchHit {
  productId: string;
  canonicalName: string;
  brand: string | null;
  size: string | null;
  category: string | null;
  identifier: string | null;
  identifierType: string | null;
}

interface ApiSearchRow {
  id: string;
  canonical_name: string;
  brand: string | null;
  size_value: number | null;
  size_unit: string | null;
  category: string | null;
  normalized_value: string | null;
  identifier_type: string | null;
}

export async function searchProducts(query: string, limit = 20): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const result = await apiFetch<{ products: ApiSearchRow[] }>(
    `/api/v1/products/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`,
  );
  return result.products.map((row) => ({
    productId: row.id,
    canonicalName: row.canonical_name,
    brand: row.brand,
    size:
      row.size_value == null
        ? null
        : row.size_unit
          ? `${row.size_value} ${row.size_unit}`
          : String(row.size_value),
    category: row.category,
    identifier: row.normalized_value,
    identifierType: row.identifier_type,
  }));
}

export async function findProductByBarcode(barcode: string): Promise<{ id: string } | null> {
  const response = await fetch(`/api/v1/products/barcode/${encodeURIComponent(barcode)}`, {
    headers: { accept: 'application/json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Product lookup failed');
  const body = (await response.json()) as { product: { id: string } };
  return body.product;
}

export async function createProvisionalProduct(input: {
  canonicalName: string;
  brand?: string | null;
  barcode?: string | null;
  barcodeType?: string | null;
  costcoItemNumber?: string | null;
}): Promise<{ id: string }> {
  const result = await apiFetch<{ product: { id: string } }>('/api/v1/products/provisional', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return result.product;
}
