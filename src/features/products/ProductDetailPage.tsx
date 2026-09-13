/**
 * ProductDetailPage — full product view with price history, warehouse
 * comparison, and action row.
 */

import { useHistory, useParams } from 'react-router';
import { useMemo, useState } from 'react';
import { useApp } from '@data/store'; import { useSelectedWarehouse } from '@data/selectors';
import {
  formatCents,
  formatCentsCompact,
  latestObservationFor,
  priceHistory,
} from '@data/selectors';
import {
  Card,
  EmptyState,
  FreshnessDot,
  MarkdownBadge,
  OfflineBanner,
  Pill,
  Price,
} from '@components/UI';
import { ProductImage } from '@components/ProductImage';
import type { Observation } from '@data/types';

export function ProductDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const products = useApp((s) => s.products);
  const observations = useApp((s) => s.observations);
  const warehouses = useApp((s) => s.warehouses);
  const watches = useApp((s) => s.watches);
  const selectedWh = useSelectedWarehouse();
  const addWatch = useApp((s) => s.addWatch);
  const [watchModalOpen, setWatchModalOpen] = useState(false);
  const [targetCents, setTargetCents] = useState('');

  const product = products.find((p) => p.id === id);

  const activeObs = useMemo(() => {
    if (!product || !selectedWh) return null;
    return latestObservationFor(observations, product.id, selectedWh.id);
  }, [product, observations, selectedWh]);

  const perWarehouse = useMemo(() => {
    if (!product) return [];
    return warehouses
      .map((w) => {
        const o = latestObservationFor(observations, product.id, w.id);
        return o ? { warehouse: w, observation: o } : null;
      })
      .filter((x): x is { warehouse: typeof warehouses[0]; observation: Observation } => x !== null);
  }, [product, observations, warehouses]);

  const sparkHistory = useMemo(() => {
    if (!product || !selectedWh) return [];
    return priceHistory(observations, product.id, selectedWh.id);
  }, [product, observations, selectedWh]);

  const isWatched = product
    ? watches.some((w) => w.product_id === product.id)
    : false;

  if (!product) {
    return (
      <>
        <OfflineBanner />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px', color: '#E5E7EB' }}>
          <EmptyState
            icon="🔍"
            title="Product not found"
            body="Try searching the catalog or scanning again."
            cta={{ label: 'Browse all', onClick: () => history.push('/search') }}
          />
        </div>
      </>
    );
  }

  const onSubmitWatch = () => {
    const cents = Math.round(parseFloat(targetCents) * 100);
    if (!isNaN(cents) && cents > 0) {
      addWatch(product.id, cents);
      setWatchModalOpen(false);
      setTargetCents('');
    }
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
        <button
          onClick={() => history.goBack()}
          aria-label="Back"
          style={{
            background: '#111827',
            border: '1px solid #1F2937',
            color: '#E5E7EB',
            borderRadius: 999,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 16,
          }}
        >
          ← Back
        </button>

        {/* Hero */}
        <Card
          padding={0}
          style={{
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              height: 180,
              background: 'linear-gradient(135deg, #111827 0%, #1E293B 100%)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <ProductImage product={product} size={140} rounded={false} />
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <Pill color="#E5E7EB" bg="#1F2937">
                {product.brand}
              </Pill>
              <Pill color="#9CA3AF" bg="transparent">
                #{product.costco_item_number}
              </Pill>
            </div>
            <h1
              style={{
                margin: '0 0 4px',
                fontSize: 22,
                fontWeight: 800,
                color: '#F9FAFB',
                lineHeight: 1.2,
              }}
            >
              {product.name}
            </h1>
            <div style={{ fontSize: 13, color: '#9CA3AF' }}>
              {product.size} · {product.category}
            </div>
            <p
              style={{
                fontSize: 13,
                color: '#9CA3AF',
                lineHeight: 1.5,
                marginTop: 10,
                marginBottom: 0,
              }}
            >
              {product.description}
            </p>
          </div>
        </Card>

        {/* Current price block */}
        {activeObs && selectedWh && (
          <Card padding={20} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 6,
              }}
            >
              Current price at {selectedWh.city}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                marginBottom: 8,
              }}
            >
              <Price cents={activeObs.price_cents} size="xl" color="#34D399" />
              {activeObs.markdown_class !== 'none' && (
                <MarkdownBadge cls={activeObs.markdown_class} />
              )}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <FreshnessDot cls={activeObs.freshness_class} showLabel />
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                {activeObs.confidence}% confidence · @{activeObs.submitter_handle}
              </span>
            </div>
            {activeObs.note && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: '#0B1220',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#9CA3AF',
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{activeObs.note}&rdquo;
              </div>
            )}
          </Card>
        )}

        {/* Price history sparkline */}
        {sparkHistory.length > 0 && sparkHistory.some((h) => h.priceCents > 0) && (
          <Card padding={20} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 12,
              }}
            >
              14-day price trend
            </div>
            <Sparkline history={sparkHistory} />
          </Card>
        )}

        {/* Across-warehouse comparison */}
        <Card padding={20} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            Across warehouses
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {perWarehouse.map(({ warehouse: w, observation: o }) => {
              const max = Math.max(...perWarehouse.map((x) => x.observation.price_cents));
              const width = max > 0 ? (o.price_cents / max) * 100 : 0;
              const isSelected = w.id === selectedWh?.id;
              return (
                <div key={w.id}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#34D399' : '#E5E7EB',
                      }}
                    >
                      {w.city}
                      {isSelected && (
                        <span style={{ marginLeft: 6, fontSize: 10, color: '#34D399' }}>
                          · you
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#E5E7EB' }}>
                      {formatCents(o.price_cents)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: '#1F2937',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${width}%`,
                        height: '100%',
                        background: isSelected
                          ? 'linear-gradient(90deg, #34D399, #10B981)'
                          : '#6B7280',
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setWatchModalOpen(true)}
            disabled={isWatched}
            style={{
              flex: 1,
              background: isWatched ? '#1F2937' : '#34D399',
              color: isWatched ? '#6B7280' : '#0B1220',
              border: 0,
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 800,
              cursor: isWatched ? 'default' : 'pointer',
            }}
          >
            {isWatched ? '✓ On watchlist' : 'Watch price'}
          </button>
          <button
            onClick={() => history.push(`/buy/${product.id}`)}
            style={{
              flex: 1,
              background: 'transparent',
              color: '#E5E7EB',
              border: '1px solid #374151',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Mark purchased
          </button>
        </div>

        {/* Recent observations */}
        <div
          style={{
            fontSize: 11,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 12,
          }}
        >
          Recent observations
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {observations
            .filter((o) => o.product_id === product.id)
            .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
            .slice(0, 8)
            .map((o) => {
              const w = warehouses.find((x) => x.id === o.warehouse_id);
              return (
                <div
                  key={o.id}
                  style={{
                    background: '#111827',
                    borderRadius: 10,
                    padding: 12,
                    border: '1px solid #1F2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <FreshnessDot cls={o.freshness_class} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#E5E7EB' }}>
                      {w?.city}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                      @{o.submitter_handle} ·{' '}
                      {new Date(o.submitted_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: o.markdown_class === 'none' ? '#E5E7EB' : '#34D399',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatCentsCompact(o.price_cents)}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Watch modal */}
        {watchModalOpen && (
          <div
            onClick={() => setWatchModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#0F172A',
                borderRadius: 16,
                padding: 24,
                maxWidth: 400,
                width: '100%',
                border: '1px solid #1F2937',
              }}
            >
              <h3
                style={{
                  margin: '0 0 6px',
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#F9FAFB',
                }}
              >
                Watch price
              </h3>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16, lineHeight: 1.5 }}>
                Tell us your target and we&apos;ll alert you when this drops at {selectedWh?.city}.
              </p>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                step="0.01"
                value={targetCents}
                onChange={(e) => setTargetCents(e.target.value)}
                placeholder="Target price (e.g. 19.99)"
                style={{
                  width: '100%',
                  background: '#111827',
                  border: '1px solid #374151',
                  borderRadius: 10,
                  padding: '12px 14px',
                  color: '#E5E7EB',
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 14,
                  outline: 0,
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setWatchModalOpen(false)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: '#E5E7EB',
                    border: '1px solid #374151',
                    borderRadius: 10,
                    padding: '12px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmitWatch}
                  style={{
                    flex: 1,
                    background: '#34D399',
                    color: '#0B1220',
                    border: 0,
                    borderRadius: 10,
                    padding: '12px',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Add watch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sparkline — simple SVG price chart
// ────────────────────────────────────────────────────────────────────

function Sparkline({ history }: { history: Array<{ day: number; priceCents: number }> }): JSX.Element {
  const W = 320;
  const H = 80;
  const PAD = 4;
  const data = history.filter((h) => h.priceCents > 0);
  if (data.length === 0) return <></>;

  const min = Math.min(...data.map((d) => d.priceCents));
  const max = Math.max(...data.map((d) => d.priceCents));
  const range = max - min || 1;

  const points = data
    .map((d, i) => {
      const x = PAD + (i / (data.length - 1 || 1)) * (W - 2 * PAD);
      const y = H - PAD - ((d.priceCents - min) / range) * (H - 2 * PAD);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const minIdx = data.findIndex((d) => d.priceCents === min);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={`Price trend from ${formatCents(min)} to ${formatCents(max)}`}
    >
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`${PAD},${H - PAD} ${points} ${W - PAD},${H - PAD}`}
        fill="url(#sparkfill)"
        stroke="none"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#34D399"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((d, i) => {
        const x = PAD + (i / (data.length - 1 || 1)) * (W - 2 * PAD);
        const y = H - PAD - ((d.priceCents - min) / range) * (H - 2 * PAD);
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#34D399" />;
      })}
      {/* Highlight the min point */}
      {minIdx >= 0 && (
        <>
          {(() => {
            const x = PAD + (minIdx / (data.length - 1 || 1)) * (W - 2 * PAD);
            const y = H - PAD - ((data[minIdx]!.priceCents - min) / range) * (H - 2 * PAD);
            return <circle cx={x} cy={y} r="5" fill="#FBBF24" stroke="#0B1220" strokeWidth="2" />;
          })()}
        </>
      )}
    </svg>
  );
}
