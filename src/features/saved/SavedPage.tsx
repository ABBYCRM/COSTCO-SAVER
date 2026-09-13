/**
 * SavedPage — Watching / Purchased / Receipts tabs.
 */

import { useState } from 'react';
import { useHistory } from 'react-router';
import { useApp } from '@data/store';
import { formatCents } from '@data/selectors';
import { Card, EmptyState, OfflineBanner, Pill, Price, Section } from '@components/UI';
import { ProductImage } from '@components/ProductImage';

type Tab = 'watching' | 'purchased' | 'receipts';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'watching', label: 'Watching' },
  { key: 'purchased', label: 'Purchased' },
  { key: 'receipts', label: 'Receipts' },
];

export function SavedPage(): JSX.Element {
  const history = useHistory();
  const products = useApp((s) => s.products);
  const watches = useApp((s) => s.watches);
  const receipts = useApp((s) => s.receipts);
  const warehouses = useApp((s) => s.warehouses);
  const removeWatch = useApp((s) => s.removeWatch);
  const [tab, setTab] = useState<Tab>('watching');

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
          Saved
        </h1>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            background: '#111827',
            borderRadius: 12,
            padding: 4,
            marginBottom: 16,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                background: tab === t.key ? '#34D399' : 'transparent',
                color: tab === t.key ? '#0B1220' : '#E5E7EB',
                border: 0,
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'watching' && (
          <>
            {watches.length === 0 ? (
              <EmptyState
                icon="👁️"
                title="Nothing on watch"
                body="Tap a product, hit 'Watch price', and we'll alert you when it drops."
                cta={{ label: 'Browse products', onClick: () => history.push('/deals') }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {watches.map((w) => {
                  const product = products.find((p) => p.id === w.product_id);
                  if (!product) return null;
                  const delta = w.current_cents - w.target_cents;
                  const hit = delta <= 0;
                  return (
                    <Card
                      key={w.id}
                      padding={12}
                      onClick={() => history.push(`/product/${product.id}`)}
                      style={{ display: 'flex', gap: 12, alignItems: 'center' }}
                    >
                      <ProductImage product={product} size={56} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#F9FAFB',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {product.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                          Target {formatCents(w.target_cents)} · Now{' '}
                          {formatCents(w.current_cents)}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            display: 'flex',
                            gap: 6,
                            alignItems: 'center',
                          }}
                        >
                          {hit ? (
                            <Pill color="#34D399" bg="#34D39920">
                              ✓ hit
                            </Pill>
                          ) : (
                            <Pill color="#FBBF24" bg="#FBBF2420">
                              {formatCents(Math.abs(delta))} to go
                            </Pill>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWatch(w.id);
                        }}
                        aria-label="Remove watch"
                        style={{
                          background: 'transparent',
                          border: 0,
                          color: '#6B7280',
                          fontSize: 20,
                          cursor: 'pointer',
                          padding: 4,
                        }}
                      >
                        ×
                      </button>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'purchased' && (
          <>
            {receipts.length === 0 ? (
              <EmptyState
                icon="🧾"
                title="No purchases yet"
                body="Mark items as purchased to track your spending and find adjustment opportunities."
                cta={{ label: 'Find a deal', onClick: () => history.push('/deals') }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {receipts.map((r) => {
                  const w = warehouses.find((x) => x.id === r.warehouse_id);
                  return (
                    <Card key={r.id} padding={14}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 8,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB' }}>
                            {w?.city}
                          </div>
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                            {new Date(r.purchased_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}{' '}
                            · {r.items.length} item{r.items.length === 1 ? '' : 's'}
                          </div>
                        </div>
                        <Price cents={r.total_cents} size="lg" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {r.items.slice(0, 4).map((item, i) => {
                          const p = products.find((p) => p.id === item.product_id);
                          return (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                gap: 8,
                                alignItems: 'center',
                                padding: '4px 0',
                              }}
                            >
                              {p && <ProductImage product={p} size={28} />}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: '#E5E7EB',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {item.name}
                                </div>
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: '#9CA3AF',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                ${(item.unit_cents / 100).toFixed(2)}
                              </div>
                            </div>
                          );
                        })}
                        {r.items.length > 4 && (
                          <div style={{ fontSize: 11, color: '#9CA3AF', paddingTop: 4 }}>
                            + {r.items.length - 4} more item
                            {r.items.length - 4 === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'receipts' && (
          <>
            <Section title="Original receipt photos">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 12,
                }}
              >
                {receipts.map((r) => (
                  <Card key={r.id} padding={12}>
                    <div
                      style={{
                        aspectRatio: '3 / 4',
                        background:
                          'repeating-linear-gradient(0deg, #1F2937 0px, #1F2937 24px, #111827 24px, #111827 48px)',
                        borderRadius: 8,
                        marginBottom: 8,
                        padding: 12,
                        fontFamily: 'monospace',
                        fontSize: 10,
                        color: '#9CA3AF',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ color: '#34D399' }}>{r.thumbnail_label}</div>
                      <div>{r.items.length} items</div>
                      <div style={{ color: '#F9FAFB', fontWeight: 700 }}>
                        ${(r.total_cents / 100).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {new Date(r.purchased_at).toLocaleDateString()}
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </>
  );
}
