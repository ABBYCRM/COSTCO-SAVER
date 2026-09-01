import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  enqueueOutbox,
  listOutbox,
  markOutboxStatus,
  pendingOutbox,
  removeOutbox,
  clearOutbox,
} from '@services/offline/outbox';

describe('offline / outbox', () => {
  beforeEach(() => {
    if (typeof localStorage === 'undefined') {
      // node test env
      const store = new Map<string, string>();
      (globalThis as { localStorage?: Storage }).localStorage = {
        getItem: (k) => store.get(k) ?? null,
        setItem: (k, v) => {
          store.set(k, v);
        },
        removeItem: (k) => {
          store.delete(k);
        },
        clear: () => {
          store.clear();
        },
        key: () => null,
        length: 0,
      };
    }
    clearOutbox();
  });

  afterEach(() => {
    clearOutbox();
  });

  it('enqueues an item and reads it back', () => {
    const item = enqueueOutbox({
      kind: 'observation',
      idempotencyKey: 'key-1',
      payload: { productId: 'p', warehouseId: 'w', priceCents: 1997 },
    });
    expect(item.idempotencyKey).toBe('key-1');
    expect(item.status).toBe('pending');
    expect(listOutbox()).toHaveLength(1);
  });

  it('is idempotent on the same key', () => {
    enqueueOutbox({ kind: 'observation', idempotencyKey: 'dup', payload: {} });
    enqueueOutbox({ kind: 'observation', idempotencyKey: 'dup', payload: {} });
    expect(listOutbox()).toHaveLength(1);
  });

  it('pendingOutbox returns only pending and failed', () => {
    const a = enqueueOutbox({ kind: 'observation', idempotencyKey: 'a', payload: {} });
    const b = enqueueOutbox({ kind: 'observation', idempotencyKey: 'b', payload: {} });
    markOutboxStatus(a.id, 'synced', null);
    markOutboxStatus(b.id, 'failed', 'network');
    const pending = pendingOutbox();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.idempotencyKey).toBe('b');
    expect(pending[0]?.attempts).toBe(1);
    expect(pending[0]?.lastError).toBe('network');
  });

  it('removeOutbox drops the item', () => {
    const item = enqueueOutbox({ kind: 'observation', idempotencyKey: 'k', payload: {} });
    removeOutbox(item.id);
    expect(listOutbox()).toHaveLength(0);
  });

  it('failed sync increases attempts and sets next backoff', () => {
    const item = enqueueOutbox({ kind: 'observation', idempotencyKey: 'k', payload: {} });
    const before = Date.now();
    markOutboxStatus(item.id, 'failed', 'http 500');
    const after = listOutbox()[0];
    expect(after?.attempts).toBe(1);
    expect(after?.nextAttemptAt).toBeGreaterThanOrEqual(before + 2000);
    expect(after?.lastError).toBe('http 500');
  });
});
