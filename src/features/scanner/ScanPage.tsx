/**
 * ScanPage — barcode + shelf-tag scan entry.
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
      <div className="cs-page">
        <header style={{ marginBottom: 16 }}>
          <h1 className="cs-title">Scan a tag</h1>
          <p className="cs-sub">Barcode finds the product. The shelf tag is the price. Keep them separate.</p>
        </header>

        <div className="cs-segment" style={{ marginBottom: 16 }}>
          {(['barcode', 'shelf_tag', 'manual'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={mode === m ? 'is-on' : undefined}
              onClick={() => setMode(m)}
            >
              {m === 'barcode' ? 'Barcode' : m === 'shelf_tag' ? 'Shelf' : 'Manual'}
            </button>
          ))}
        </div>

        <Card padding={0} style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div
            style={{
              position: 'relative',
              aspectRatio: '16 / 9',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
              background: 'var(--cs-elevated)',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 160,
                height: 160,
                borderRadius: 12,
                border: '2px solid var(--cs-accent)',
              }}
            >
              <span style={{ position: 'absolute', top: -1, left: -1, width: 16, height: 16, borderTop: '2px solid var(--cs-accent)', borderLeft: '2px solid var(--cs-accent)' }} />
              <span style={{ position: 'absolute', top: -1, right: -1, width: 16, height: 16, borderTop: '2px solid var(--cs-accent)', borderRight: '2px solid var(--cs-accent)' }} />
              <span style={{ position: 'absolute', bottom: -1, left: -1, width: 16, height: 16, borderBottom: '2px solid var(--cs-accent)', borderLeft: '2px solid var(--cs-accent)' }} />
              <span style={{ position: 'absolute', bottom: -1, right: -1, width: 16, height: 16, borderBottom: '2px solid var(--cs-accent)', borderRight: '2px solid var(--cs-accent)' }} />
              <span
                style={{
                  position: 'absolute',
                  left: 8,
                  right: 8,
                  height: 2,
                  background: 'var(--cs-accent)',
                  animation: 'cs-scan 2.4s linear infinite',
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                right: 12,
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 800,
                color: 'var(--cs-text)',
                background: 'color-mix(in oklab, var(--cs-card) 95%, transparent)',
                borderRadius: 999,
                padding: '6px 12px',
                boxShadow: 'var(--cs-shadow)',
              }}
            >
              Point at a barcode, or tap Demo scan.
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button type="button" className="cs-btn" style={{ flex: 1 }} onClick={onDemoScan}>
            Demo scan
          </button>
          <button
            type="button"
            className="cs-btn cs-btn--ghost"
            style={{ flex: 1 }}
            onClick={() => history.push('/search')}
          >
            Look up
          </button>
        </div>

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
                      fontSize: 14,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.product.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--cs-muted)' }}>
                    @{r.handle} · {r.when}
                  </div>
                </div>
                <div className="cs-price" style={{ fontSize: 16, color: 'var(--cs-accent)' }}>
                  ${(r.priceCents / 100).toFixed(2)}
                </div>
              </Card>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
