/**
 * Local-first domain types for COSTCO-SAVER.
 *
 * These mirror the Supabase schema but live in the client. The store layer
 * below seeds these with realistic Costco data so the app is fully usable
 * offline (no Supabase required for the demo build).
 */

export type FreshnessClass = 'fresh' | 'recent' | 'aging' | 'stale' | 'expired';

export type MarkdownClass =
  | 'asterisk'
  | 'manager_special'
  | 'clearance'
  | 'fresh_cut'
  | 'none';

export interface Warehouse {
  id: string;
  number: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  phone: string;
  hours: string;
}

export interface Product {
  id: string;
  costco_item_number: string;
  upc: string;
  name: string;
  brand: string;
  size: string;
  category: string;
  description: string;
}

export interface Observation {
  id: string;
  product_id: string;
  warehouse_id: string;
  price_cents: number;
  markdown_class: MarkdownClass;
  freshness_class: FreshnessClass;
  confidence: number; // 0-100
  submitter_handle: string;
  submitted_at: string; // ISO
  note?: string;
  receipt_id?: string;
}

export interface Watch {
  id: string;
  product_id: string;
  target_cents: number;
  current_cents: number;
  created_at: string;
  triggered: boolean;
}

export interface Receipt {
  id: string;
  warehouse_id: string;
  purchased_at: string;
  total_cents: number;
  items: ReceiptItem[];
  thumbnail_label: string;
}

export interface ReceiptItem {
  product_id: string;
  name: string;
  qty: number;
  unit_cents: number;
  line_cents: number;
  markdown_class: MarkdownClass;
}

export interface WarehouseHealth {
  warehouse_id: string;
  coverage_pct: number;
  avg_confidence: number;
  observation_count: number;
  freshness_score: number;
  velocity: number;
}

export interface BasketLine {
  product_id: string;
  name: string;
  qty: number;
  unit_cents: number;
  markdown_class: MarkdownClass;
}

export interface BasketPreset {
  id: string;
  label: string;
  lines: BasketLine[];
}
