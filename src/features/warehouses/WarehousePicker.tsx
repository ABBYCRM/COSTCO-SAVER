import { IonModal } from '@ionic/react';
import { useMemo, useState } from 'react';
import type { WarehouseRow } from '@services/api/warehouses';

interface WarehousePickerProps {
  isOpen: boolean;
  warehouses: WarehouseRow[];
  onSelect: (w: WarehouseRow) => void;
  onDismiss: () => void;
}

export function WarehousePicker({ isOpen, warehouses, onSelect, onDismiss }: WarehousePickerProps): JSX.Element {
  const [q, setQ] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return warehouses;
    return warehouses.filter(
      (w) =>
        w.name.toLowerCase().includes(needle) ||
        (w.warehouse_number ?? '').toLowerCase().includes(needle) ||
        (w.city ?? '').toLowerCase().includes(needle) ||
        (w.region ?? '').toLowerCase().includes(needle),
    );
  }, [q, warehouses]);

  const picked = filtered.find((w) => w.id === pickedId) ?? null;

  function close() {
    setQ('');
    setPickedId(null);
    onDismiss();
  }

  function confirm() {
    if (!picked) return;
    onSelect(picked);
    setQ('');
    setPickedId(null);
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={close}>
      <div className="cs-page">
        <header className="cs-header">
          <h2 className="cs-header__title">Choose a warehouse</h2>
          <p className="cs-header__sub">Select one, then confirm.</p>
        </header>
        <label className="cs-field">
          <span className="cs-field__label">Search</span>
          <input
            className="cs-field__input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, number, or city"
            aria-label="Search warehouses"
          />
        </label>
        <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {filtered.length === 0 && (
            <li className="cs-state">
              <p className="cs-state__title">No warehouses match</p>
              <p>Try a city, warehouse number, or a shorter name.</p>
            </li>
          )}
          {filtered.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className={`cs-card${pickedId === w.id ? ' cs-card--selected' : ''}`}
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => setPickedId(w.id)}
                aria-pressed={pickedId === w.id}
                aria-label={`Select ${w.name}`}
              >
                <div className="cs-strong">{w.name}</div>
                <div className="cs-muted">
                  {[w.city, w.region].filter(Boolean).join(', ')}
                </div>
                {w.warehouse_number && (
                  <div className="cs-muted" style={{ fontFamily: 'var(--cs-font-mono)' }}>
                    #{w.warehouse_number}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="cs-actions">
          <button className="cs-button" type="button" onClick={confirm} disabled={!picked}>
            Confirm warehouse
          </button>
          <button className="cs-button cs-button--ghost" type="button" onClick={close}>
            Cancel
          </button>
        </div>
      </div>
    </IonModal>
  );
}
