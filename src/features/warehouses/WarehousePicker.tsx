/**
 * WarehousePicker — bottom sheet modal for choosing the active warehouse.
 */

import { useApp } from '@data/store';
import { distanceMiles, useSelectedWarehouse } from '@data/selectors';
import { Pill } from '@components/UI';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WarehousePicker({ open, onClose }: Props): JSX.Element | null {
  const setWarehouse = useApp((s) => s.setWarehouse);
  const warehouses = useApp((s) => s.warehouses);
  const selected = useSelectedWarehouse();

  if (!open || !selected) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(28, 25, 21, 0.32)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--cs-surface)',
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: '16px 16px 32px',
          maxHeight: '80vh',
          overflowY: 'auto',
          border: '1px solid var(--cs-elevated)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: 'var(--cs-border-strong)',
            borderRadius: 999,
            margin: '0 auto 16px',
          }}
          aria-hidden
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--cs-text)' }}>
            Pick a store
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 0,
              color: 'var(--cs-muted)',
              fontSize: 22,
              cursor: 'pointer',
              width: 32,
              height: 32,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {warehouses.map((w) => {
            const miles = distanceMiles(
              { lat: selected.lat, lng: selected.lng },
              { lat: w.lat, lng: w.lng },
            );
            const isSelected = w.id === selected.id;
            return (
              <button
                key={w.id}
                onClick={() => {
                  setWarehouse(w.id);
                  onClose();
                }}
                style={{
                  background: isSelected ? 'var(--cs-accent-soft)' : 'var(--cs-card)',
                  border: isSelected ? '2px solid var(--cs-accent)' : '1px solid var(--cs-elevated)',
                  borderRadius: 14,
                  padding: 14,
                  color: 'var(--cs-text)',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 4,
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{w.name}</div>
                  {isSelected && <Pill color="var(--cs-accent)" bg="var(--cs-accent-soft)">Active</Pill>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--cs-muted)' }}>
                  #{w.number} · {w.address}, {w.city}, {w.state}
                </div>
                {miles > 0 && (
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--cs-subtle)',
                      marginTop: 4,
                    }}
                  >
                    {miles.toFixed(1)} mi from your current selection
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
