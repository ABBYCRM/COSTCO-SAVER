/**
 * HomePage — the user's anchor screen.
 *
 * Renders:
 *  - Hero warehouse card (full address + change CTA)
 *  - Coverage radar SVG (4-axis health score)
 *  - Nearby warehouses (tap to switch)
 *  - "Drops near you" — vertical list of markdown products at the active warehouse
 *  - "Watchlist hits" — quick view of triggered watches
 *  - Sticky bottom Scan CTA
 */

import { useState } from 'react';
import { useHistory } from 'react-router';
import { useApp } from '@data/store';
import {
  useSelectedWarehouse,
  activeDrops,
  distanceMiles,
  formatCents,
} from '@data/selectors';
import {
  Card,
  EmptyState,
  FreshnessDot,
  MarkdownBadge,
  OfflineBanner,
  Pill,
  Price,
  Section,
} from '@components/UI';
import { ProductImage } from '@components/ProductImage';
import { CoverageRadar } from '@features/warehouses/CoverageRadar';
import { WarehousePicker } from '@features/warehouses/WarehousePicker';

export function HomePage(): JSX.Element {
  const history = useHistory();
  const warehouse = useSelectedWarehouse();
  const setWarehouse = useApp((s) => s.setWarehouse);
  const products = useApp((s) => s.products);
  const watches = useApp((s) => s.watches);
  const health = useApp((s) => s.health);
  const handle = useApp((s) => s.handle);
  const allWarehouses = useApp((s) => s.warehouses);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!warehouse) return <></>;

  const drops = activeDrops().slice(0, 8);
  const triggeredWatches = watches.filter((w) => w.triggered);
  const wHealth = health.find((h) => h.warehouse_id === warehouse.id);
  const nearby = allWarehouses
    .filter((w) => w.id !== warehouse.id)
    .map((w) => ({
      ...w,
      miles: distanceMiles(
        { lat: warehouse.lat, lng: warehouse.lng },
        { lat: w.lat, lng: w.lng },
      ),
    }))
    .sort((a, b) => a.miles - b.miles);

  const totalSavings = triggeredWatches.reduce(
    (sum, w) => sum + Math.max(0, w.current_cents - w.target_cents),
    0,
  );

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
        {/* Greeting */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>
            Hello, {handle}
          </div>
          <h1
            style={{
              margin: '4px 0 0',
              fontSize: 28,
              fontWeight: 800,
              color: '#F9FAFB',
              lineHeight: 1.15,
            }}
          >
            Scan it before you <span style={{ color: '#34D399' }}>buy</span> it.
          </h1>
        </div>

        {/* Hero warehouse card */}
        <Card
          padding={20}
          style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #111827 0%, #0F172A 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 22,
                fontWeight: 800,
                color: '#0B1220',
                flexShrink: 0,
              }}
              aria-hidden
            >
              $
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 2,
                }}
              >
                Your warehouse
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#F9FAFB', marginBottom: 2 }}>
                {warehouse.name}
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.4 }}>
                {warehouse.address} · {warehouse.city}, {warehouse.state} {warehouse.zip}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>{warehouse.hours}</div>
            </div>
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            style={{
              marginTop: 14,
              width: '100%',
              background: 'transparent',
              border: '1px solid #374151',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#E5E7EB',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            Change warehouse <span aria-hidden>→</span>
          </button>
        </Card>

        {/* Coverage radar */}
        {wHealth && (
          <Card padding={20} style={{ marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  Warehouse health
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#F9FAFB',
                    marginTop: 2,
                  }}
                >
                  Coverage score
                </div>
              </div>
              <div
                style={{
                  background: '#34D39920',
                  borderRadius: 999,
                  padding: '6px 12px',
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#34D399',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {Math.round(
                  (wHealth.coverage_pct + wHealth.avg_confidence + wHealth.freshness_score) / 3,
                )}
              </div>
            </div>
            <CoverageRadar health={wHealth} />
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 12,
                fontSize: 12,
                color: '#9CA3AF',
              }}
            >
              <span>
                <strong style={{ color: '#E5E7EB' }}>{wHealth.observation_count}</strong>{' '}
                observations
              </span>
              <span>
                <strong style={{ color: '#E5E7EB' }}>{wHealth.velocity}</strong> / 24h
              </span>
            </div>
          </Card>
        )}

        {/* Nearby warehouses */}
        {nearby.length > 0 && (
          <Card padding={16} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              Nearby warehouses
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nearby.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setWarehouse(w.id);
                    setPickerOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#0B1220',
                    border: '1px solid #1F2937',
                    borderRadius: 10,
                    padding: '10px 12px',
                    color: '#E5E7EB',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: '#34D399',
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {w.address} · {w.city}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#9CA3AF',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {w.miles.toFixed(1)} mi
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Drops near you */}
        <Section
          title={`Drops at ${warehouse.city}`}
          action={
            <span
              onClick={() => history.push('/deals')}
              style={{
                fontSize: 12,
                color: '#34D399',
                cursor: 'pointer',
                fontWeight: 600,
              }}
              role="button"
              tabIndex={0}
            >
              See all →
            </span>
          }
        >
          {drops.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No markdowns right now"
              body="When someone submits a markdown at this warehouse it'll appear here."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {drops.map((d) => (
                <Card
                  key={d.observation.id}
                  padding={12}
                  onClick={() => history.push(`/product/${d.product.id}`)}
                  style={{ display: 'flex', gap: 12, alignItems: 'center' }}
                >
                  <ProductImage product={d.product} size={64} />
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
                      {d.product.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      #{d.product.costco_item_number} · {d.product.size}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        marginTop: 6,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <MarkdownBadge cls={d.observation.markdown_class} />
                      <FreshnessDot cls={d.observation.freshness_class} showLabel />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <Price cents={d.observation.price_cents} size="lg" color="#34D399" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>

        {/* Watchlist hits */}
        {triggeredWatches.length > 0 && (
          <Section
            title="Watchlist hits"
            action={
              <span
                onClick={() => history.push('/saved')}
                style={{
                  fontSize: 12,
                  color: '#34D399',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                role="button"
                tabIndex={0}
              >
                See all →
              </span>
            }
          >
            <Card
              padding={16}
              style={{
                background: 'linear-gradient(135deg, #34D39915 0%, #111827 100%)',
                borderColor: '#34D39940',
              }}
            >
              <div style={{ fontSize: 14, color: '#F9FAFB', marginBottom: 8 }}>
                <strong style={{ color: '#34D399' }}>{triggeredWatches.length}</strong>{' '}
                watch{totalSavings > 0 ? ` saving you ${formatCents(totalSavings)}` : ' triggered'}
              </div>
              {triggeredWatches.slice(0, 3).map((w) => {
                const product = products.find((p) => p.id === w.product_id);
                if (!product) return null;
                return (
                  <div
                    key={w.id}
                    onClick={() => history.push(`/product/${product.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      paddingTop: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <ProductImage product={product} size={40} rounded />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#E5E7EB' }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                        Now {formatCents(w.current_cents)} · Target{' '}
                        {formatCents(w.target_cents)}
                      </div>
                    </div>
                    <Pill color="#34D399" bg="#34D39920">
                      ↓ hit
                    </Pill>
                  </div>
                );
              })}
            </Card>
          </Section>
        )}

        {/* Sticky bottom scan CTA */}
        <button
          onClick={() => history.push('/scan')}
          style={{
            position: 'fixed',
            bottom: 90,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: 380,
            background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
            color: '#0B1220',
            border: 0,
            borderRadius: 999,
            padding: '14px 20px',
            fontSize: 15,
            fontWeight: 800,
            boxShadow: '0 8px 24px rgba(52, 211, 153, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            zIndex: 100,
          }}
        >
          <span style={{ fontSize: 18 }}>📷</span> Scan a barcode
        </button>
      </div>

      <WarehousePicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}
