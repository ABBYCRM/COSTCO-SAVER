/**
 * DealsPage — every markdown across all warehouses.
 *
 * Features:
 *  - Filter chips by markdown class
 *  - Grid of deal cards with product image, price, badge, freshness
 *  - Sort by best deal / closest / freshest / most observed
 */

import { useMemo, useState } from 'react';
import { useHistory } from 'react-router';
import {
  useSelectedWarehouse,
  dealsByMarkdown,
  distanceMiles,
} from '@data/selectors';
import type { MarkdownClass } from '@data/types';
import { Card, MarkdownBadge, OfflineBanner, Pill, Price, EmptyState } from '@components/UI';
import { ProductImage } from '@components/ProductImage';

const FILTERS: Array<{ key: MarkdownClass | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'asterisk', label: '* markdown' },
  { key: 'manager_special', label: 'Manager' },
  { key: 'clearance', label: 'Clearance' },
  { key: 'fresh_cut', label: 'Fresh cut' },
];

const SORTS = ['Best deal', 'Closest', 'Freshest'] as const;
type Sort = (typeof SORTS)[number];

export function DealsPage(): JSX.Element {
  const history = useHistory();
  const warehouse = useSelectedWarehouse();
  const [filter, setFilter] = useState<MarkdownClass | 'all'>('all');
  const [sort, setSort] = useState<Sort>('Best deal');

  const deals = useMemo(() => {
    const filtered = dealsByMarkdown(filter);
    return filtered
      .map((d) => ({
        ...d,
        distance: warehouse
          ? distanceMiles(
              { lat: warehouse.lat, lng: warehouse.lng },
              { lat: d.warehouse.lat, lng: d.warehouse.lng },
            )
          : 999,
        savings: Math.max(
          0,
          d.product
            ? 0
            : 0,
        ),
      }))
      .sort((a, b) => {
        if (sort === 'Best deal') {
          const freshnessOrder = { fresh: 0, recent: 1, aging: 2, stale: 3, expired: 4 } as const;
          return (
            freshnessOrder[a.observation.freshness_class] -
            freshnessOrder[b.observation.freshness_class]
          );
        }
        if (sort === 'Closest') return a.distance - b.distance;
        if (sort === 'Freshest') {
          return new Date(b.observation.submitted_at).getTime() -
            new Date(a.observation.submitted_at).getTime();
        }
        return 0;
      });
  }, [filter, sort, warehouse]);

  if (!warehouse) return <></>;

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
        <div style={{ marginBottom: 16 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 800,
              color: '#F9FAFB',
            }}
          >
            Deals
          </h1>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
            {deals.length} markdown{deals.length === 1 ? '' : 's'} across {warehouse.city} and{' '}
            nearby warehouses
          </div>
        </div>

        {/* Filter chips */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 12,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  background: isActive ? '#34D399' : 'transparent',
                  color: isActive ? '#0B1220' : '#E5E7EB',
                  border: isActive ? '0' : '1px solid #374151',
                  borderRadius: 999,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Sort row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            style={{
              background: '#111827',
              color: '#E5E7EB',
              border: '1px solid #374151',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Deal grid */}
        {deals.length === 0 ? (
          <EmptyState
            icon="🏷️"
            title="No deals match"
            body="Try a different filter — markdown activity shifts throughout the week."
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 12,
            }}
          >
            {deals.map((d) => (
              <Card
                key={d.observation.id}
                padding={14}
                onClick={() => history.push(`/product/${d.product.id}`)}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <ProductImage product={d.product} size={64} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      <MarkdownBadge cls={d.observation.markdown_class} />
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#F9FAFB',
                        lineHeight: 1.3,
                        marginBottom: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {d.product.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                      #{d.product.costco_item_number}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                  }}
                >
                  <Price cents={d.observation.price_cents} size="lg" color="#34D399" />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' }}>
                      {d.warehouse.city}
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>
                      {d.distance.toFixed(1)} mi
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <Pill
                    color={
                      d.observation.freshness_class === 'fresh' ? '#34D399' : '#FBBF24'
                    }
                    bg="#34D39920"
                    size="xs"
                  >
                    {d.observation.freshness_class}
                  </Pill>
                  <span style={{ fontSize: 10, color: '#6B7280' }}>
                    {d.observation.confidence}% confidence
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
