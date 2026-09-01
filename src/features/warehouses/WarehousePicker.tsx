import { IonModal, IonSearchbar } from '@ionic/react';
import { useMemo, useState } from 'react';
import type { WarehouseRow } from '@services/api/warehouses';

interface WarehousePickerProps {
  isOpen: boolean;
  warehouses: WarehouseRow[];
  onSelect: (warehouse: WarehouseRow) => void;
  onDismiss: () => void;
}

export function WarehousePicker({
  isOpen,
  warehouses,
  onSelect,
  onDismiss,
}: WarehousePickerProps): JSX.Element {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return warehouses;
    return warehouses.filter(
      (warehouse) =>
        warehouse.name.toLowerCase().includes(needle) ||
        (warehouse.retailer_warehouse_id ?? '').toLowerCase().includes(needle) ||
        warehouse.city.toLowerCase().includes(needle) ||
        warehouse.state.toLowerCase().includes(needle) ||
        warehouse.postal_code.toLowerCase().includes(needle),
    );
  }, [q, warehouses]);

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss}>
      <div className="cs-page">
        <h2 className="cs-section-title">Choose a warehouse</h2>
        <IonSearchbar
          value={q}
          onIonInput={(e) => setQ(e.detail.value ?? '')}
          placeholder="Search by name, number, city, or ZIP"
          aria-label="Search warehouses"
        />
        <ul className="cs-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {filtered.length === 0 && <li className="cs-empty">No warehouses match.</li>}
          {filtered.map((warehouse) => (
            <li key={warehouse.id}>
              <button
                className="cs-card"
                style={{ width: '100%', textAlign: 'left', border: '1px solid var(--cs-border)' }}
                onClick={() => onSelect(warehouse)}
                aria-label={`Select ${warehouse.name}`}
              >
                <div className="cs-strong">{warehouse.name}</div>
                <div className="cs-muted">
                  {warehouse.city}, {warehouse.state} {warehouse.postal_code}
                </div>
                {warehouse.retailer_warehouse_id && (
                  <div className="cs-muted" style={{ fontFamily: 'var(--cs-font-mono)' }}>
                    #{warehouse.retailer_warehouse_id}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
        <button
          className="cs-button cs-button--ghost"
          style={{ marginTop: 'var(--cs-space-4)' }}
          onClick={onDismiss}
        >
          Cancel
        </button>
      </div>
    </IonModal>
  );
}
