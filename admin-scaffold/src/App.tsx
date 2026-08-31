import { useEffect, useState } from 'react';
import { supabase } from './supabase';

interface Stats {
  totalProducts: number;
  totalObservations: number;
  totalReceipts: number;
  totalWatches: number;
  openModeration: number;
  conflictingObservations: number;
}

interface ModerationRow {
  id: string;
  queue: string;
  subject_kind: string;
  subject_id: string;
  status: string;
  created_at: string;
}

export function App(): JSX.Element {
  const [stats, setStats] = useState<Stats | null>(null);
  const [queue, setQueue] = useState<ModerationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [envOk, setEnvOk] = useState<boolean>(true);

  useEffect(() => {
    const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
    const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
    if (!url || !key) {
      setEnvOk(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [products, obs, receipts, watches, mod, conflicts] = await Promise.all([
          supabase().from('products').select('id', { count: 'exact', head: true }),
          supabase().from('price_observations').select('id', { count: 'exact', head: true }),
          supabase().from('receipts').select('id', { count: 'exact', head: true }),
          supabase().from('watches').select('id', { count: 'exact', head: true }),
          supabase().from('moderation_queue').select('id, queue, subject_kind, subject_id, status, created_at').eq('status', 'open').order('created_at', { ascending: false }).limit(50),
          supabase().from('price_observations').select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        ]);
        if (cancelled) return;
        if (mod.error) {
          // RLS will block reads from non-moderator accounts — that's expected.
          setStats({
            totalProducts: products.count ?? 0,
            totalObservations: obs.count ?? 0,
            totalReceipts: receipts.count ?? 0,
            totalWatches: watches.count ?? 0,
            openModeration: 0,
            conflictingObservations: conflicts.count ?? 0,
          });
          setError('Moderator role required to view queue. Counts are public.');
        } else {
          setStats({
            totalProducts: products.count ?? 0,
            totalObservations: obs.count ?? 0,
            totalReceipts: receipts.count ?? 0,
            totalWatches: watches.count ?? 0,
            openModeration: mod.data?.length ?? 0,
            conflictingObservations: conflicts.count ?? 0,
          });
          setQueue(mod.data ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!envOk) {
    return (
      <div className="cs-admin">
        <h1>COSTCO-SAVER Admin</h1>
        <div className="cs-admin-section cs-admin-error">
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in the admin
          environment to connect.
        </div>
      </div>
    );
  }

  return (
    <div className="cs-admin">
      <h1>COSTCO-SAVER Admin</h1>
      <p className="cs-admin-muted">Moderator console · spec §54</p>

      {error && <div className="cs-admin-section cs-admin-error">{error}</div>}

      <h2>At a glance</h2>
      <div className="cs-admin-section">
        {stats == null ? (
          <p className="cs-admin-muted">Loading…</p>
        ) : (
          <div className="cs-admin-grid">
            <Stat label="Products" value={stats.totalProducts} />
            <Stat label="Observations" value={stats.totalObservations} />
            <Stat label="Pending verification" value={stats.conflictingObservations} />
            <Stat label="Receipts" value={stats.totalReceipts} />
            <Stat label="Watches" value={stats.totalWatches} />
            <Stat label="Open moderation items" value={stats.openModeration} />
          </div>
        )}
      </div>

      <h2>Moderation queue</h2>
      <div className="cs-admin-section">
        {queue.length === 0 ? (
          <p className="cs-admin-muted">No open items, or your account does not have moderator role.</p>
        ) : (
          <table className="cs-admin-table">
            <thead>
              <tr>
                <th>Queue</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((row) => (
                <tr key={row.id}>
                  <td>{row.queue}</td>
                  <td><code>{row.subject_kind}:{row.subject_id.slice(0, 8)}</code></td>
                  <td>
                    <span className={`cs-admin-pill cs-admin-pill--${row.status === 'open' ? 'open' : row.status === 'in_review' ? 'review' : 'resolved'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                  <td>
                    <button className="cs-admin-button cs-admin-button--ghost" disabled>Resolve</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Notes</h2>
      <div className="cs-admin-section cs-admin-muted">
        <p>Full moderator actions (resolve, quarantine, merge, suspend) ship in Phase 3
          via service-role edge functions. This console shows the read-only view backed
          by the same RLS the app uses.</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="cs-admin-stat">
      <div className="cs-admin-stat-value">{value.toLocaleString()}</div>
      <div className="cs-admin-stat-label">{label}</div>
    </div>
  );
}
