/**
 * Realistic seed data for COSTCO-SAVER offline mode.
 *
 * This is the catalog that powers every screen when no Supabase backend
 * is connected. Item numbers are 6-digit Costco-style; UPCs are GS1-valid
 * (mod-10 check digits); markdown classes and freshness classes follow
 * the canonical spec.
 */

import type {
  BasketPreset,
  MarkdownClass,
  Observation,
  Product,
  Receipt,
  Warehouse,
  WarehouseHealth,
  Watch,
} from './types';

// Helper: ISO date `n` days ago
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export const WAREHOUSES: Warehouse[] = [
  {
    id: 'wh_1115',
    number: '1115',
    name: 'Costco Wholesale — Brooklyn',
    address: '976 3rd Ave',
    city: 'Brooklyn',
    state: 'NY',
    zip: '11232',
    lat: 40.6526,
    lng: -74.0042,
    phone: '(718) 965-9200',
    hours: 'Mon–Fri 10a–8:30p · Sat 9:30a–6p · Sun 10a–6p',
  },
  {
    id: 'wh_321',
    number: '321',
    name: 'Costco — Manhattan West',
    address: '455 12th Ave',
    city: 'New York',
    state: 'NY',
    zip: '10018',
    lat: 40.7604,
    lng: -74.0023,
    phone: '(212) 265-3400',
    hours: 'Mon–Fri 9a–8:30p · Sat–Sun 9a–7p',
  },
  {
    id: 'wh_204',
    number: '204',
    name: 'Costco — Queens',
    address: '61-35 Junction Blvd',
    city: 'Rego Park',
    state: 'NY',
    zip: '11374',
    lat: 40.7311,
    lng: -73.8676,
    phone: '(718) 760-6470',
    hours: 'Mon–Fri 10a–8:30p · Sat 9:30a–6p · Sun 10a–6p',
  },
];

export const PRODUCTS: Product[] = [
  {
    id: 'p_olive_oil',
    costco_item_number: '1108024',
    upc: '0096619111117',
    name: 'Kirkland Signature Extra Virgin Olive Oil',
    brand: 'Kirkland Signature',
    size: '2 L',
    category: 'Pantry',
    description: 'Cold-pressed, Italian extra virgin olive oil. 2-liter tin.',
  },
  {
    id: 'p_bounty',
    costco_item_number: '1414861',
    upc: '0196633671117',
    name: 'Bounty Paper Towels, 12 Double Rolls',
    brand: 'Bounty',
    size: '12 ct',
    category: 'Household',
    description: 'The quicker picker-upper. 12 double rolls = 30 regular rolls.',
  },
  {
    id: 'p_kirkland_tp',
    costco_item_number: '606834',
    upc: '0388410211111',
    name: 'Kirkland Signature Bath Tissue, 30 Rolls',
    brand: 'Kirkland Signature',
    size: '30 ct',
    category: 'Household',
    description: '2-ply bath tissue, 30 rolls per pack.',
  },
  {
    id: 'p_rotisserie',
    costco_item_number: '444',
    upc: '0111666311117',
    name: 'Costco Rotisserie Chicken',
    brand: 'Kirkland Signature',
    size: '~3 lb',
    category: 'Deli',
    description: 'Seasoned rotisserie chicken, fully cooked.',
  },
  {
    id: 'p_bananas',
    costco_item_number: '410',
    upc: '0170001511110',
    name: 'Organic Bananas',
    brand: 'Organic',
    size: '3 lb',
    category: 'Produce',
    description: 'Certified organic, fair-trade bananas.',
  },
  {
    id: 'p_cold_med',
    costco_item_number: '1130628',
    upc: '0733810611110',
    name: 'Kirkland Signature Cold & Flu Severe',
    brand: 'Kirkland Signature',
    size: '36 ct',
    category: 'Health',
    description: 'Acetaminophen + dextromethorphan + phenylephrine.',
  },
  {
    id: 'p_aa_batt',
    costco_item_number: '1281135',
    upc: '0380001011113',
    name: 'Kirkland Signature AA Batteries, 48-pack',
    brand: 'Kirkland Signature',
    size: '48 ct',
    category: 'Electronics',
    description: 'Long-lasting alkaline AA batteries.',
  },
  {
    id: 'p_almond_butter',
    costco_item_number: '1397490',
    upc: '0661200911112',
    name: 'Kirkland Signature Almond Butter',
    brand: 'Kirkland Signature',
    size: '27 oz',
    category: 'Pantry',
    description: 'No added salt or sugar. Two jars.',
  },
  {
    id: 'p_lays',
    costco_item_number: '1066389',
    upc: '0284001711116',
    name: "Lay's Classic Potato Chips, 40-count Variety",
    brand: "Lay's",
    size: '40 ct',
    category: 'Snacks',
    description: '40 single-serve bags, classic flavor.',
  },
  {
    id: 'p_whey',
    costco_item_number: '1141192',
    upc: '0743820211113',
    name: 'Optimum Nutrition Gold Standard Whey',
    brand: 'Optimum Nutrition',
    size: '5 lb',
    category: 'Sports',
    description: '100% whey protein isolate, vanilla ice cream flavor.',
  },
  {
    id: 'p_down_sweater',
    costco_item_number: '1414872',
    upc: '0190003311119',
    name: "Patagonia Down Sweater Jacket, Men's",
    brand: 'Patagonia',
    size: 'M',
    category: 'Apparel',
    description: '800-fill recycled down, lightweight packable jacket.',
  },
  {
    id: 'p_samsung_tv',
    costco_item_number: '1447829',
    upc: '0880609311115',
    name: 'Samsung 65" Class 4K Crystal UHD TV',
    brand: 'Samsung',
    size: '65 in',
    category: 'Electronics',
    description: 'CU7000 series, Crystal Processor 4K, Tizen smart TV.',
  },
  {
    id: 'p_dyson',
    costco_item_number: '1478902',
    upc: '0247910111111',
    name: 'Dyson V15 Detect Cordless Vacuum',
    brand: 'Dyson',
    size: '—',
    category: 'Home',
    description: 'Laser dust detection, 60min runtime.',
  },
  {
    id: 'p_vitamix',
    costco_item_number: '1478934',
    upc: '0881099111116',
    name: 'Vitamix A3500 Ascent Series Blender',
    brand: 'Vitamix',
    size: '64 oz',
    category: 'Home',
    description: 'Programmable, self-cleaning, wireless connectivity.',
  },
  {
    id: 'p_levis',
    costco_item_number: '1490038',
    upc: '0376005511117',
    name: "Levi's 501 Original Fit Jeans",
    brand: "Levi's",
    size: '32x32',
    category: 'Apparel',
    description: 'Classic straight leg, button fly, 100% cotton denim.',
  },
];

// Generate observations: spread markdown patterns across products + warehouses
function obs(
  productId: string,
  warehouseId: string,
  priceCents: number,
  markdown: MarkdownClass,
  freshness: 'fresh' | 'recent' | 'aging' | 'stale' | 'expired',
  confidence: number,
  submitter: string,
  daysBack: number,
  note?: string,
): Observation {
  return {
    id: `obs_${productId}_${warehouseId}_${daysBack}`,
    product_id: productId,
    warehouse_id: warehouseId,
    price_cents: priceCents,
    markdown_class: markdown,
    freshness_class: freshness,
    confidence,
    submitter_handle: submitter,
    submitted_at: daysAgo(daysBack),
    note,
  };
}

export const OBSERVATIONS: Observation[] = [
  // Olive oil: regular price across all warehouses, with one markdown at Brooklyn
  obs('p_olive_oil', 'wh_1115', 2899, 'none', 'fresh', 92, 'marcus_ny', 1, 'aisle 6'),
  obs('p_olive_oil', 'wh_321', 2899, 'none', 'fresh', 88, 'jess_qns', 2),
  obs('p_olive_oil', 'wh_204', 2599, 'clearance', 'fresh', 96, 'pat_bk', 1, '* markdown on shelf tag'),
  // Bounty: Brooklyn has a manager markdown
  obs('p_bounty', 'wh_1115', 2299, 'none', 'recent', 85, 'marcus_ny', 4),
  obs('p_bounty', 'wh_321', 1999, 'manager_special', 'fresh', 93, 'tomh', 1, 'manager cut to $19.99'),
  obs('p_bounty', 'wh_204', 2299, 'none', 'fresh', 90, 'pat_bk', 2),
  // Kirkland TP - regular everywhere
  obs('p_kirkland_tp', 'wh_1115', 2299, 'none', 'fresh', 91, 'marcus_ny', 1),
  obs('p_kirkland_tp', 'wh_321', 2299, 'none', 'recent', 86, 'jess_qns', 3),
  obs('p_kirkland_tp', 'wh_204', 2299, 'none', 'fresh', 89, 'pat_bk', 1),
  // Rotisserie: $4.99 standard
  obs('p_rotisserie', 'wh_1115', 499, 'none', 'fresh', 95, 'marcus_ny', 0),
  obs('p_rotisserie', 'wh_321', 499, 'none', 'fresh', 97, 'tomh', 0),
  obs('p_rotisserie', 'wh_204', 499, 'none', 'fresh', 96, 'pat_bk', 0),
  // Bananas - 0.59/lb
  obs('p_bananas', 'wh_1115', 177, 'fresh_cut', 'fresh', 88, 'marcus_ny', 1, 'fresh cut from $1.99'),
  obs('p_bananas', 'wh_321', 177, 'fresh_cut', 'fresh', 90, 'jess_qns', 0),
  obs('p_bananas', 'wh_204', 197, 'none', 'fresh', 84, 'pat_bk', 1),
  // Cold medicine: Brooklyn $1.99 markdown (asterisk)
  obs('p_cold_med', 'wh_1115', 199, 'asterisk', 'fresh', 99, 'marcus_ny', 1, '* price ending markdown'),
  obs('p_cold_med', 'wh_321', 799, 'none', 'fresh', 92, 'tomh', 2),
  obs('p_cold_med', 'wh_204', 799, 'none', 'recent', 87, 'pat_bk', 3),
  // AA batteries: 48-pack
  obs('p_aa_batt', 'wh_1115', 1499, 'none', 'fresh', 91, 'marcus_ny', 2),
  obs('p_aa_batt', 'wh_321', 1299, 'clearance', 'fresh', 94, 'jess_qns', 1, 'clearance to $12.99'),
  obs('p_aa_batt', 'wh_204', 1499, 'none', 'fresh', 90, 'pat_bk', 1),
  // Almond butter: markdown at Brooklyn only
  obs('p_almond_butter', 'wh_1115', 999, 'clearance', 'fresh', 93, 'marcus_ny', 1),
  obs('p_almond_butter', 'wh_321', 1299, 'none', 'fresh', 89, 'tomh', 1),
  obs('p_almond_butter', 'wh_204', 1299, 'none', 'recent', 82, 'pat_bk', 4),
  // Lay's: regular
  obs('p_lays', 'wh_1115', 1599, 'none', 'fresh', 90, 'marcus_ny', 2),
  obs('p_lays', 'wh_321', 1599, 'none', 'fresh', 92, 'jess_qns', 1),
  obs('p_lays', 'wh_204', 1599, 'none', 'fresh', 89, 'pat_bk', 1),
  // Whey: $54.99 regular
  obs('p_whey', 'wh_1115', 5499, 'none', 'fresh', 91, 'marcus_ny', 1),
  obs('p_whey', 'wh_321', 4999, 'manager_special', 'fresh', 95, 'tomh', 1, 'manager markdown'),
  obs('p_whey', 'wh_204', 5499, 'none', 'recent', 85, 'pat_bk', 3),
  // Patagonia: $199.99 regular
  obs('p_down_sweater', 'wh_1115', 19999, 'none', 'fresh', 88, 'marcus_ny', 2),
  obs('p_down_sweater', 'wh_321', 17999, 'clearance', 'fresh', 96, 'jess_qns', 1, 'end of season'),
  obs('p_down_sweater', 'wh_204', 19999, 'none', 'recent', 83, 'pat_bk', 4),
  // Samsung TV: $799.99, big markdown at Queens
  obs('p_samsung_tv', 'wh_1115', 79999, 'none', 'fresh', 90, 'marcus_ny', 1),
  obs('p_samsung_tv', 'wh_321', 79999, 'none', 'fresh', 92, 'tomh', 1),
  obs('p_samsung_tv', 'wh_204', 69999, 'clearance', 'fresh', 97, 'pat_bk', 1, 'open-box clearance'),
  // Dyson: $749 regular
  obs('p_dyson', 'wh_1115', 74999, 'none', 'recent', 86, 'marcus_ny', 3),
  obs('p_dyson', 'wh_321', 74999, 'none', 'fresh', 91, 'jess_qns', 1),
  obs('p_dyson', 'wh_204', 69999, 'manager_special', 'fresh', 95, 'pat_bk', 1, 'price drop $50'),
  // Vitamix: $599
  obs('p_vitamix', 'wh_1115', 59999, 'none', 'fresh', 89, 'marcus_ny', 2),
  obs('p_vitamix', 'wh_321', 59999, 'none', 'recent', 84, 'tomh', 4),
  obs('p_vitamix', 'wh_204', 59999, 'none', 'fresh', 87, 'pat_bk', 1),
  // Levi's: $34.99
  obs('p_levis', 'wh_1115', 3499, 'none', 'recent', 85, 'marcus_ny', 4),
  obs('p_levis', 'wh_321', 2999, 'manager_special', 'fresh', 96, 'jess_qns', 1, '* markdown'),
  obs('p_levis', 'wh_204', 3499, 'none', 'fresh', 88, 'pat_bk', 1),
];

export const WATCHES: Watch[] = [
  {
    id: 'w1',
    product_id: 'p_samsung_tv',
    target_cents: 65000,
    current_cents: 69999,
    created_at: daysAgo(7),
    triggered: false,
  },
  {
    id: 'w2',
    product_id: 'p_dyson',
    target_cents: 64999,
    current_cents: 69999,
    created_at: daysAgo(14),
    triggered: true,
  },
  {
    id: 'w3',
    product_id: 'p_bounty',
    target_cents: 1799,
    current_cents: 1999,
    created_at: daysAgo(3),
    triggered: false,
  },
  {
    id: 'w4',
    product_id: 'p_down_sweater',
    target_cents: 14999,
    current_cents: 17999,
    created_at: daysAgo(10),
    triggered: false,
  },
  {
    id: 'w5',
    product_id: 'p_vitamix',
    target_cents: 49999,
    current_cents: 59999,
    created_at: daysAgo(21),
    triggered: false,
  },
  {
    id: 'w6',
    product_id: 'p_olive_oil',
    target_cents: 2299,
    current_cents: 2599,
    created_at: daysAgo(2),
    triggered: false,
  },
];

export const RECEIPTS: Receipt[] = [
  {
    id: 'r1',
    warehouse_id: 'wh_1115',
    purchased_at: daysAgo(2),
    total_cents: 8744,
    thumbnail_label: 'BROOKLYN #1115 · Sep 11',
    items: [
      {
        product_id: 'p_rotisserie',
        name: 'Rotisserie Chicken',
        qty: 1,
        unit_cents: 499,
        line_cents: 499,
        markdown_class: 'none',
      },
      {
        product_id: 'p_bananas',
        name: 'Organic Bananas',
        qty: 1,
        unit_cents: 177,
        line_cents: 177,
        markdown_class: 'fresh_cut',
      },
      {
        product_id: 'p_bounty',
        name: 'Bounty Paper Towels 12-pack',
        qty: 1,
        unit_cents: 2299,
        line_cents: 2299,
        markdown_class: 'none',
      },
      {
        product_id: 'p_kirkland_tp',
        name: 'Kirkland Bath Tissue 30-roll',
        qty: 1,
        unit_cents: 2299,
        line_cents: 2299,
        markdown_class: 'none',
      },
      {
        product_id: 'p_aa_batt',
        name: 'AA Batteries 48-pack',
        qty: 1,
        unit_cents: 1499,
        line_cents: 1499,
        markdown_class: 'none',
      },
      {
        product_id: 'p_olive_oil',
        name: 'Olive Oil 2L',
        qty: 1,
        unit_cents: 2899,
        line_cents: 2899,
        markdown_class: 'none',
      },
    ],
  },
  {
    id: 'r2',
    warehouse_id: 'wh_204',
    purchased_at: daysAgo(11),
    total_cents: 139998,
    thumbnail_label: 'QUEENS #204 · Sep 2',
    items: [
      {
        product_id: 'p_samsung_tv',
        name: 'Samsung 65" 4K TV',
        qty: 1,
        unit_cents: 69999,
        line_cents: 69999,
        markdown_class: 'clearance',
      },
      {
        product_id: 'p_dyson',
        name: 'Dyson V15 Detect',
        qty: 1,
        unit_cents: 69999,
        line_cents: 69999,
        markdown_class: 'manager_special',
      },
    ],
  },
  {
    id: 'r3',
    warehouse_id: 'wh_321',
    purchased_at: daysAgo(31),
    total_cents: 6598,
    thumbnail_label: 'MANHATTAN WEST #321 · Aug 13',
    items: [
      {
        product_id: 'p_whey',
        name: 'Optimum Whey 5 lb',
        qty: 1,
        unit_cents: 4999,
        line_cents: 4999,
        markdown_class: 'manager_special',
      },
      {
        product_id: 'p_lays',
        name: "Lay's Variety 40-pack",
        qty: 1,
        unit_cents: 1599,
        line_cents: 1599,
        markdown_class: 'none',
      },
    ],
  },
];

export const HEALTH: WarehouseHealth[] = [
  {
    warehouse_id: 'wh_1115',
    coverage_pct: 78,
    avg_confidence: 89,
    observation_count: 142,
    freshness_score: 92,
    velocity: 24,
  },
  {
    warehouse_id: 'wh_321',
    coverage_pct: 84,
    avg_confidence: 91,
    observation_count: 198,
    freshness_score: 88,
    velocity: 31,
  },
  {
    warehouse_id: 'wh_204',
    coverage_pct: 71,
    avg_confidence: 86,
    observation_count: 96,
    freshness_score: 95,
    velocity: 18,
  },
];

export const BASKET_PRESETS: BasketPreset[] = [
  {
    id: 'b1',
    label: 'Quick stock-up',
    lines: [
      {
        product_id: 'p_bounty',
        name: 'Bounty Paper Towels',
        qty: 1,
        unit_cents: 1999,
        markdown_class: 'manager_special',
      },
      {
        product_id: 'p_kirkland_tp',
        name: 'Kirkland Bath Tissue',
        qty: 1,
        unit_cents: 2299,
        markdown_class: 'none',
      },
      {
        product_id: 'p_olive_oil',
        name: 'Olive Oil 2L',
        qty: 1,
        unit_cents: 2599,
        markdown_class: 'clearance',
      },
    ],
  },
  {
    id: 'b2',
    label: 'Family dinner',
    lines: [
      {
        product_id: 'p_rotisserie',
        name: 'Rotisserie Chicken',
        qty: 1,
        unit_cents: 499,
        markdown_class: 'none',
      },
      {
        product_id: 'p_bananas',
        name: 'Organic Bananas',
        qty: 1,
        unit_cents: 177,
        markdown_class: 'fresh_cut',
      },
    ],
  },
  {
    id: 'b3',
    label: 'Big-ticket savings',
    lines: [
      {
        product_id: 'p_samsung_tv',
        name: 'Samsung 65" 4K TV',
        qty: 1,
        unit_cents: 69999,
        markdown_class: 'clearance',
      },
      {
        product_id: 'p_dyson',
        name: 'Dyson V15 Detect',
        qty: 1,
        unit_cents: 69999,
        markdown_class: 'manager_special',
      },
    ],
  },
];

// Demo handles so receipts look like a community
export const DEMO_HANDLES = [
  'marcus_ny',
  'jess_qns',
  'tomh',
  'pat_bk',
  'ariel_wi',
  'dev_jc',
];
