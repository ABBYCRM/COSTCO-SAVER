/**
 * SearchPage — search products by barcode, item #, or name.
 *
 * Live result list, sticky input, mode segmented control.
 */

import { useMemo, useState } from 'react';
import { useHistory } from 'react-router';
import { useApp } from '@data/store'; import { useSelectedWarehouse } from '@data/selectors';
import { Card, EmptyState, OfflineBanner } from '@components/UI';
import { ProductImage } from '@components/ProductImage';

type Mode = 'name' | 'barcode' | 'item';

const MODES: Array<{ key: Mode; label: string; placeholder: string }> = [
  { key: 'name', label: 'Name', placeholder: "Try 'Kirkland', 'rotisserie', 'Bounty'…" },
  { key: 'barcode', label: 'Barcode', placeholder: 'Enter a UPC, EAN, or GTIN…' },
  { key: 'item', label: 'Item #', placeholder: '6-digit Costco item number…' },
];

export function SearchPage(): JSX.Element {
  const history = useHistory();
  const products = useApp((s) => s.products);
  const observations = useApp((s) => s.observations);
  const warehouse = useSelectedWarehouse();
  const [mode, setMode] = useState<Mode>('name');
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => {
        if (mode === 'name') return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
        if (mode === 'barcode') return p.upc.includes(q.replace(/\s/g, ''));
        if (mode === 'item') return p.costco_item_number.includes(q);
        return false;
      })
      .slice(0, 12);
  }, [mode, query, products]);

  const placeholder = MODES.find((m) => m.key === mode)?.placeholder ?? '';

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
            margin: '0 0 12px',
            fontSize: 28,
            fontWeight: 800,
            color: '#F9FAFB',
          }}
        >
          Search
        </h1>

        {/* Sticky input */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: '#0B1220',
            padding: '0 0 12px',
            marginBottom: 12,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#111827',
              border: '1px solid #1F2937',
              borderRadius: 12,
              padding: '10px 14px',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 18 }} aria-hidden>
              🔍
            </span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              style={{
                flex: 1,
                background: 'transparent',
                border: 0,
                outline: 0,
                color: '#E5E7EB',
                fontSize: 15,
                fontWeight: 500,
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{
                  background: 'transparent',
                  border: 0,
                  color: '#9CA3AF',
                  fontSize: 18,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            )}
          </div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                style={{
                  background: mode === m.key ? '#34D399' : '#111827',
                  color: mode === m.key ? '#0B1220' : '#E5E7EB',
                  border: 0,
                  borderRadius: 999,
                  padding: '6px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {query.trim() === '' ? (
          <EmptyState
            icon="🔎"
            title="Search the catalog"
            body={`${products.length} products in your area — try a barcode, item number, or brand.`}
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon="🤷"
            title="No matches"
            body={`Nothing matches "${query}" in this mode. Try switching tabs.`}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((p) => {
              const obs = observations
                .filter((o) => o.product_id === p.id && o.warehouse_id === warehouse?.id)
                .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0];
              return (
                <Card
                  key={p.id}
                  padding={12}
                  onClick={() => history.push(`/product/${p.id}`)}
                  style={{ display: 'flex', gap: 12, alignItems: 'center' }}
                >
                  <ProductImage product={p} size={48} />
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
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                      #{p.costco_item_number} · {p.size}
                    </div>
                  </div>
                  {obs && (
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: obs.markdown_class === 'none' ? '#E5E7EB' : '#34D399',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      ${(obs.price_cents / 100).toFixed(2)}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
