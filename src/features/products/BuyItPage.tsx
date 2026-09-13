/**
 * BuyItPage — local-first "mark purchased" flow.
 *
 * Records a purchase into local store + receipt list. No Supabase.
 */

import { useState } from 'react';
import { useHistory, useParams } from 'react-router';
import { useApp } from '@data/store'; import { useSelectedWarehouse } from '@data/selectors';
import { Card, EmptyState, OfflineBanner } from '@components/UI';
import { ProductImage } from '@components/ProductImage';

export function BuyItPage(): JSX.Element {
  const { productId } = useParams<{ productId: string }>();
  const history = useHistory();
  const products = useApp((s) => s.products);
  const warehouses = useApp((s) => s.warehouses);
  const selected = useSelectedWarehouse();
  const product = products.find((p) => p.id === productId);
  const [qty, setQty] = useState(1);

  if (!product) {
    return (
      <>
        <OfflineBanner />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px', color: '#E5E7EB' }}>
          <EmptyState
            icon="🔍"
            title="Product not found"
            cta={{ label: 'Browse all', onClick: () => history.push('/search') }}
          />
        </div>
      </>
    );
  }

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

        <h1
          style={{
            margin: '0 0 16px',
            fontSize: 24,
            fontWeight: 800,
            color: '#F9FAFB',
          }}
        >
          Mark purchased
        </h1>

        <Card padding={16} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <ProductImage product={product} size={64} />
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
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>
              #{product.costco_item_number} · {product.size}
            </div>
          </div>
        </Card>

        <Card padding={20} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Warehouse
          </div>
          <select
            value={selected?.id ?? ''}
            onChange={(e) => {
              const w = warehouses.find((x) => x.id === e.target.value);
              if (w) {
                useApp.getState().setWarehouse(w.id);
              }
            }}
            style={{
              width: '100%',
              background: '#0B1220',
              border: '1px solid #374151',
              borderRadius: 10,
              padding: '12px 14px',
              color: '#E5E7EB',
              fontSize: 14,
              fontWeight: 600,
              outline: 0,
            }}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Card>

        <Card padding={20} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 8,
            }}
          >
            Quantity
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#0B1220',
                border: '1px solid #374151',
                color: '#E5E7EB',
                fontSize: 20,
                cursor: 'pointer',
              }}
            >
              −
            </button>
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 32,
                fontWeight: 800,
                color: '#F9FAFB',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {qty}
            </div>
            <button
              onClick={() => setQty(qty + 1)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#0B1220',
                border: '1px solid #374151',
                color: '#E5E7EB',
                fontSize: 20,
                cursor: 'pointer',
              }}
            >
              +
            </button>
          </div>
        </Card>

        <button
          onClick={() => {
            const w = useApp.getState().warehouses.find((x) => x.id === selected?.id);
            const obs = useApp
              .getState()
              .observations.find(
                (o) => o.product_id === product.id && o.warehouse_id === w?.id,
              );
            if (w && obs) {
              const total = obs.price_cents * qty;
              useApp.setState((s) => ({
                receipts: [
                  {
                    id: `r_local_${Date.now()}`,
                    warehouse_id: w.id,
                    purchased_at: new Date().toISOString(),
                    total_cents: total,
                    thumbnail_label: `${w.city.toUpperCase()} #${w.number} · Today`,
                    items: [
                      {
                        product_id: product.id,
                        name: product.name,
                        qty,
                        unit_cents: obs.price_cents,
                        line_cents: total,
                        markdown_class: obs.markdown_class,
                      },
                    ],
                  },
                  ...s.receipts,
                ],
              }));
              history.push('/saved');
            }
          }}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
            color: '#0B1220',
            border: 0,
            borderRadius: 12,
            padding: '14px 20px',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(52, 211, 153, 0.4)',
          }}
        >
          Save purchase
        </button>
      </div>
    </>
  );
}
