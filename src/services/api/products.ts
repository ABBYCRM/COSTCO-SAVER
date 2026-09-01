import { apiFetch } from './client';

export interface ProductDetail {
  id: string;
  canonical_name: string;
  brand: string | null;
  description: string | null;
  size_value: number | null;
  size_unit: string | null;
  image_url: string | null;
  status: string;
  category: string | null;
  identifiers: Array<{ type: string; value: string }>;
}

export interface ProductState {
  product_id: string;
  warehouse_id: string;
  consensus_price_cents: number | null;
  currency: string;
  markdown_class: string | null;
  has_asterisk: boolean;
  last_verified_at: string | null;
  latest_observation_id: string | null;
  independent_confirmation_count: number;
  evidence_count: number;
  conflicting_report_count: number;
  confidence_score: number;
  freshness_class: string;
  warehouse_name?: string;
}

export interface ProductWarehouseState extends ProductState {
  name: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
}

export interface PriceObservation {
  id: string;
  price_cents: number;
  currency: string;
  observed_at: string;
  source_type: string;
  markdown_class: string;
  has_asterisk: boolean;
  verification_status: string;
}

export async function getProduct(
  productId: string,
  warehouseId?: string | null,
): Promise<{ product: ProductDetail; state: ProductState | null }> {
  const suffix = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
  return apiFetch(`/api/v1/products/${productId}${suffix}`);
}

export async function getProductHistory(
  productId: string,
  warehouseId: string,
): Promise<PriceObservation[]> {
  const result = await apiFetch<{ observations: PriceObservation[] }>(
    `/api/v1/products/${productId}/history?warehouseId=${encodeURIComponent(warehouseId)}`,
  );
  return result.observations;
}

export async function getProductWarehouses(productId: string): Promise<ProductWarehouseState[]> {
  const result = await apiFetch<{ warehouses: ProductWarehouseState[] }>(
    `/api/v1/products/${productId}/warehouses`,
  );
  return result.warehouses;
}
