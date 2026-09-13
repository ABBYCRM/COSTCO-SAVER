/**
 * COSTCO-SAVER — offline observation outbox.
 * Spec §46. When the network is unavailable, observation submissions are
 * queued locally with an idempotency key. On reconnect, the outbox is
 * drained in order; duplicate keys are no-ops on the server.
 */

export type OutboxStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface OutboxItem {
  readonly id: string;
  readonly kind: 'observation' | 'confirmation' | 'purchase' | 'receipt';
  readonly idempotencyKey: string;
  readonly payload: Record<string, unknown>;
  readonly createdAt: number;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  nextAttemptAt: number;
}

const STORAGE_KEY = 'costco-saver.outbox.v1';

function readStore(): OutboxItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(items: OutboxItem[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function enqueueOutbox(input: {
  kind: OutboxItem['kind'];
  idempotencyKey: string;
  payload: Record<string, unknown>;
}): OutboxItem {
  const items = readStore();
  const existing = items.find((x) => x.idempotencyKey === input.idempotencyKey);
  if (existing) return existing;
  const item: OutboxItem = {
    id: crypto.randomUUID(),
    kind: input.kind,
    idempotencyKey: input.idempotencyKey,
    payload: input.payload,
    createdAt: Date.now(),
    status: 'pending',
    attempts: 0,
    lastError: null,
    nextAttemptAt: Date.now(),
  };
  items.push(item);
  writeStore(items);
  return item;
}

export function listOutbox(): OutboxItem[] {
  return readStore().sort((a, b) => a.createdAt - b.createdAt);
}

export function pendingOutbox(): OutboxItem[] {
  return listOutbox().filter((x) => x.status === 'pending' || x.status === 'failed');
}

export function markOutboxStatus(id: string, status: OutboxStatus, error?: string | null): void {
  const items = readStore();
  const item = items.find((x) => x.id === id);
  if (!item) return;
  item.status = status;
  if (error !== undefined) {
    item.lastError = error;
    item.attempts += 1;
    // Exponential backoff: 2^attempts seconds, capped at 1 hour.
    const backoffMs = Math.min(60 * 60 * 1000, Math.pow(2, item.attempts) * 1000);
    item.nextAttemptAt = Date.now() + backoffMs;
  }
  writeStore(items);
}

export function removeOutbox(id: string): void {
  const items = readStore().filter((x) => x.id !== id);
  writeStore(items);
}

export function clearOutbox(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
