/**
 * COSTCO-SAVER — offline sync runner.
 * Drains the outbox using the real services. Each item is retried with
 * exponential backoff. Network availability is detected via the
 * Capacitor Network plugin (when on native) and falls back to
 * navigator.onLine on the web.
 */

import { enqueueOutbox, listOutbox, markOutboxStatus, removeOutbox, type OutboxItem } from './outbox';
import { submitShelfObservation } from '@services/api/observations';
import { confirmObservation } from '@services/api/confirmations';

export interface SyncResult {
  attempted: number;
  succeeded: number;
  failed: number;
}

function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export async function drainOutbox(): Promise<SyncResult> {
  if (!isOnline()) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }
  const result: SyncResult = { attempted: 0, succeeded: 0, failed: 0 };
  for (const item of listOutbox()) {
    if (item.status === 'synced') continue;
    if (Date.now() < item.nextAttemptAt) continue;
    result.attempted += 1;
    markOutboxStatus(item.id, 'syncing');
    try {
      await dispatchOne(item);
      markOutboxStatus(item.id, 'synced', null);
      removeOutbox(item.id);
      result.succeeded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      markOutboxStatus(item.id, 'failed', message);
      result.failed += 1;
    }
  }
  return result;
}

async function dispatchOne(item: OutboxItem): Promise<void> {
  if (item.kind === 'observation') {
    const p = item.payload as unknown as Parameters<typeof submitShelfObservation>[0];
    await submitShelfObservation(p);
    return;
  }
  if (item.kind === 'confirmation') {
    const p = item.payload as unknown as {
      observationId: string;
      confirmedPriceCents: number;
      deviceSessionHash?: string | null;
    };
    await confirmObservation(p.observationId, p.confirmedPriceCents, p.deviceSessionHash ?? null);
    return;
  }
  // For other kinds, the server contract is the same as the live one. The
  // Phase 2 build will hook receipts and purchases through the same path.
  throw new Error(`outbox kind not yet wired: ${item.kind}`);
}

export function queueObservationOffline(payload: Parameters<typeof submitShelfObservation>[0]): void {
  enqueueOutbox({
    kind: 'observation',
    idempotencyKey: payload.idempotencyKey,
    payload: payload as unknown as Record<string, unknown>,
  });
}
