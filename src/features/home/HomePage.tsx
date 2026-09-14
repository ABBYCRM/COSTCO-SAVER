/**
 * HomePage — store card, nearby warehouses, live markdowns.
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

  return (
    <>
      <OfflineBanner />
      <div className="cs-page">
        <header style={{ marginBottom: 20 }}>
          <p className="cs-kicker">Hi, {handle}</p>
          <h1 className="cs-title">
            What's on sale <em>today</em>?
          </h1>
        </header>

        <button type="button" className="cs-store" onClick={() => setPickerOpen(true)}>
          <img
            src="/images/warehouse.jpg"
            alt=""
            style={{ height: 144, width: '100%', objectFit: 'cover', objectPosition: '72% center' }}
          />
          <span style={{ display: 'block', padding: 16 }}>
            <span className="cs-kicker">Shopping at #{warehouse.number}</span>
            <span
              style={{
                display: 'block',
                marginTop: 4,
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }}
            >
              {warehouse.city}
            </span>
            <span style={{ display: 'block', marginTop: 6, fontSize: 14, color: 'var(--cs-muted)', lineHeight: 1.5 }}>
              {warehouse.address}
              <br />
              {warehouse.hours}
            </span>
            {wHealth ? (
              <span style={{ display: 'block', marginTop: 12, fontSize: 12, fontWeight: 600, color: 'var(--cs-muted)' }}>
                {wHealth.observation_count} prices on the floor · {wHealth.coverage_pct}% covered
              </span>
            ) : null}
            <span style={{ display: 'inline-block', marginTop: 12, fontSize: 14, fontWeight: 800, color: 'var(--cs-accent)' }}>
              Switch store →
            </span>
          </span>
        </button>

        {nearby.length > 0 && (
          <section style={{ marginTop: 22 }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 800 }}>Nearby stores</h2>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {nearby.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className="cs-card"
                  onClick={() => setWarehouse(w.id)}
                  style={{ minWidth: 148, flexShrink: 0, padding: '12px 16px', textAlign: 'left' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{w.city}</div>
                  <div style={{ fontSize: 12, color: 'var(--cs-muted)', marginTop: 2, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {w.miles.toFixed(1)} mi · #{w.number}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {triggeredWatches.length > 0 && (
          <Section title="Watch hits">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {triggeredWatches.slice(0, 3).map((w) => {
                const product = products.find((p) => p.id === w.product_id);
                if (!product) return null;
                return (
                  <Card
                    key={w.id}
                    padding={12}
                    onClick={() => history.push(`/product/${product.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <ProductImage product={product} size={48} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{product.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--cs-muted)' }}>
                        Now {formatCents(w.current_cents)} · Target {formatCents(w.target_cents)}
                      </div>
                    </div>
                    <Pill>Hit</Pill>
                  </Card>
                );
              })}
            </div>
          </Section>
        )}

        <Section
          title="On sale nearby"
          action={
            <button
              type="button"
              onClick={() => history.push('/deals')}
              style={{ fontSize: 13, color: 'var(--cs-accent)', fontWeight: 800 }}
            >
              All deals →
            </button>
          }
        >
          {drops.length === 0 ? (
            <EmptyState title="No markdowns yet" body="Scan a shelf tag to start the feed at this warehouse." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {drops.map((d) => (
                <Card
                  key={d.observation.id}
                  padding={12}
                  onClick={() => history.push(`/product/${d.product.id}`)}
                  style={{ display: 'flex', gap: 12, alignItems: 'center' }}
                >
                  <ProductImage product={d.product} size={80} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {d.product.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--cs-muted)', marginTop: 2 }}>
                      #{d.product.costco_item_number} · {d.product.size}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <MarkdownBadge cls={d.observation.markdown_class} />
                      <FreshnessDot cls={d.observation.freshness_class} showLabel />
                    </div>
                  </div>
                  <Price cents={d.observation.price_cents} size="lg" color="var(--cs-text)" />
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>

      <WarehousePicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}
