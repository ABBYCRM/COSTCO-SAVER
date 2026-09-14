/**
 * ProductImage — catalog photos with a cream fallback tile.
 */

import { useState } from 'react';
import type { Product } from '@data/types';

interface Props {
  product: Product;
  size?: number;
  rounded?: boolean;
  hero?: boolean;
}

const PHOTOS: Record<string, string> = {
  p_olive_oil: '/products/olive-oil.jpg',
  p_bounty: '/products/paper-towels.jpg',
  p_kirkland_tp: '/products/bath-tissue.jpg',
  p_rotisserie: '/products/rotisserie.jpg',
  p_bananas: '/products/bananas.jpg',
  p_cold_med: '/products/cold-med.jpg',
  p_aa_batt: '/products/batteries.jpg',
  p_almond_butter: '/products/almond-butter.jpg',
  p_lays: '/products/chips.jpg',
  p_whey: '/products/whey.jpg',
  p_down_sweater: '/products/jacket.jpg',
  p_samsung_tv: '/products/tv.jpg',
  p_dyson: '/products/vacuum.jpg',
  p_vitamix: '/products/blender.jpg',
  p_levis: '/products/jeans.jpg',
  p_water: '/products/water.jpg',
  p_eggs: '/products/eggs.jpg',
  p_chicken: '/products/chicken.jpg',
  p_coffee: '/products/coffee.jpg',
  p_airpods: '/products/earbuds.jpg',
};

const CAT: Record<string, string> = {
  Pantry: '#efe4c8',
  Household: '#dce7f2',
  Deli: '#f3ddd0',
  Produce: '#dcebd8',
  Health: '#d7e8e4',
  Electronics: '#e2e4e8',
  Snacks: '#f3e2c8',
  Sports: '#dce6f0',
  Apparel: '#e6e0d8',
  Home: '#e8e4d4',
  Grocery: '#dceae3',
  Dairy: '#f0ead2',
  Meat: '#f0dcd8',
};

export function ProductImage({ product, size = 64, rounded = true, hero = false }: Props): JSX.Element {
  const src = PHOTOS[product.id];
  const [failed, setFailed] = useState(false);
  const radius = hero ? 0 : rounded ? 12 : 8;
  const mark = product.brand.slice(0, 2).toUpperCase();
  const bg = CAT[product.category] ?? '#efe8dc';

  if (src && !failed) {
    if (hero) {
      return (
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          style={{ width: '100%', height: size, objectFit: 'cover', display: 'block' }}
        />
      );
    }
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          borderRadius: radius,
          flexShrink: 0,
          display: 'block',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: hero ? '100%' : size,
        height: size,
        background: bg,
        borderRadius: radius,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        fontSize: size > 80 ? 22 : 13,
        fontWeight: 800,
        color: 'rgba(28,25,21,0.45)',
      }}
      aria-hidden
    >
      {mark}
    </div>
  );
}
