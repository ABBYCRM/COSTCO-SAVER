/**
 * ScanPage — barcode + shelf-tag scan entry.
 *
 * In offline mode the camera cannot launch. The page presents a realistic
 * viewfinder UI with a "Demo scan" button that picks a random seed product
 * and navigates to its detail page.
 */

import { useState } from 'react';
import { useHistory } from 'react-router';
import { useApp } from '@data/store';
import { Card, OfflineBanner, Section } from '@components/UI';
import { ProductImage } from '@components/ProductImage';
import type { Product } from '@data/types';

type Mode = 'barcode' | 'shelf_tag' | 'manual';

const RECENT: Array<{ handle: string; product: Product; priceCents: number; when: string }> = [
  {
    handle: 'marcus_ny',
    product: {
      id: 'p_olive_oil',
      costco_item_number: '1108024',
      upc: '0096619111117',
      name: 'Kirkland Olive Oil 2L',
      brand: 'KS',
      size: '2 L',
      category: 'Pantry',
      description: '',
    },
    priceCents: 2599,
    when: '2h ago',
  },
  {
    handle: 'jess_qns',
    product: {
      id: 'p_samsung_tv',
      costco_item_number: '1447829',
      upc: '0880609311115',
      name: 'Samsung 65" 4K TV',
      brand: 'Samsung',
      size: '65 in',
      category: 'Electronics',
      description: '',
    },
    priceCents: 69999,
    when: '4h ago',
  },
  {
    handle: 'tomh',
    product: {
      id: 'p_whey',
      costco_item_number: '1141192',
      upc: '0743820211113',
      name: 'Optimum Whey 5 lb',
      brand: 'ON',
      size: '5 lb',
      category: 'Sports',
      description: '',
    },
    priceCents: 4999,
    when: 'yesterday',
  },
];

export function ScanPage(): JSX.Element {
  const history = useHistory();
  const products = useApp((s) => s.products);
  const [mode, setMode] = useState<Mode>('barcode');

  const onDemoScan = () => {
    const p = products[Math.floor(Math.random() * products.length)];
    if (p) history.push(`/product/${p.id}`);
  };

  return (
    <>
      <OfflineBanner />
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '20px 16px 100px',
          color: '#E5E7EB',
        }}
      >
        <h1
          style={{
            margin: '0 0 6px',
            fontSize: 28,
            fontWeight: 800,
            color: '#F9FAFB',
          }}
        >
          Scan
        </h1>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
          Point your camera at a barcode or shelf tag.
        </div>

        {/* Mode toggle */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            background: '#111827',
            padding: 4,
            borderRadius: 999,
            marginBottom: 16,
          }}
        >
          {(['barcode', 'shelf_tag', 'manual'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                background: mode === m ? '#34D399' : 'transparent',
                color: mode === m ? '#0B1220' : '#E5E7EB',
                border: 0,
                borderRadius: 999,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                cursor: 'pointer',
              }}
            >
              {m === 'barcode' ? 'Barcode' : m === 'shelf_tag' ? 'Shelf tag' : 'Manual'}
            </button>
          ))}
        </div>

        {/* Viewfinder */}
        <Card
          padding={0}
          style={{
            marginBottom: 16,
            overflow: 'hidden',
            aspectRatio: '16 / 9',
            position: 'relative',
            background: 'linear-gradient(135deg, #0B1220 0%, #1E293B 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '70%',
              aspectRatio: '1.4 / 1',
              maxWidth: 280,
              borderRadius: 14,
              border: '2px solid rgba(52, 211, 153, 0.4)',
              position: 'relative',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((c) => {
              const isTop = c.includes('top');
              const isLeft = c.includes('left');
              return (
                <div
                  key={c}
                  style={{
                    position: 'absolute',
                    top: isTop ? -2 : undefined,
                    bottom: !isTop ? -2 : undefined,
                    left: isLeft ? -2 : undefined,
                    right: !isLeft ? -2 : undefined,
                    width: 24,
                    height: 24,
                    borderTop: isTop ? '3px solid #34D399' : 'none',
                    borderBottom: !isTop ? '3px solid #34D399' : 'none',
                    borderLeft: isLeft ? '3px solid #34D399' : 'none',
                    borderRight: !isLeft ? '3px solid #34D399' : 'none',
                    borderTopLeftRadius: isTop && isLeft ? 8 : 0,
                    borderTopRightRadius: isTop && !isLeft ? 8 : 0,
                    borderBottomLeftRadius: !isTop && isLeft ? 8 : 0,
                    borderBottomRightRadius: !isTop && !isLeft ? 8 : 0,
                  }}
                />
              );
            })}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                color: '#9CA3AF',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.5,
                textAlign: 'center',
                padding: 8,
              }}
            >
              Center the {mode === 'barcode' ? 'barcode' : 'shelf tag'} in the box
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: 'rgba(11, 18, 32, 0.7)',
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 11,
              color: '#E5E7EB',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#EF4444' }} />
            Camera offline
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              right: 12,
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <button
              onClick={onDemoScan}
              style={{
                background: '#34D399',
                color: '#0B1220',
                border: 0,
                borderRadius: 999,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(52, 211, 153, 0.4)',
              }}
            >
              ✨ Demo scan
            </button>
            <button
              onClick={() => history.push('/search')}
              style={{
                background: 'rgba(11, 18, 32, 0.85)',
                color: '#E5E7EB',
                border: '1px solid #374151',
                borderRadius: 999,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Type barcode
            </button>
          </div>
        </Card>

        {/* Recent scans */}
        <Section title="Recent in your area">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RECENT.map((r, i) => (
              <Card
                key={i}
                padding={12}
                onClick={() => history.push(`/product/${r.product.id}`)}
                style={{ display: 'flex', gap: 12, alignItems: 'center' }}
              >
                <ProductImage product={r.product} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#F9FAFB',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.product.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                    @{r.handle} · {r.when}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#34D399',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  ${(r.priceCents / 100).toFixed(2)}
                </div>
              </Card>
            ))}
          </div>
        </Section>

        <style>{`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
            50% { box-shadow: 0 0 0 16px rgba(52, 211, 153, 0); }
          }
        `}</style>
      </div>
    </>
  );
}
