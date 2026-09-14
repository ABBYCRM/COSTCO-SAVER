/**
 * AppShell — sticky wordmark + shopping dock.
 */

import type { ReactNode } from 'react';
import { useLocation, useHistory } from 'react-router';

interface Tab {
  path: string;
  label: string;
}

const TABS: Tab[] = [
  { path: '/home', label: 'Home' },
  { path: '/deals', label: 'Deals' },
  { path: '/scan', label: 'Scan' },
  { path: '/saved', label: 'Saved' },
  { path: '/account', label: 'You' },
];

function icon(label: string, active: boolean): JSX.Element {
  const stroke = active ? 'var(--cs-accent)' : 'var(--cs-muted)';
  const scanStroke = 'var(--cs-accent-fg)';
  if (label === 'Home') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (label === 'Deals') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="7" cy="7" r="1.2" fill={stroke} />
      </svg>
    );
  }
  if (label === 'Scan') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M15 8v8M19 8v8" stroke={scanStroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (label === 'Saved') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const location = useLocation();
  const history = useHistory();

  const activePath =
    TABS.find((t) =>
      t.path === '/home'
        ? location.pathname === '/' || location.pathname === '/home'
        : location.pathname.startsWith(t.path),
    )?.path ?? '/home';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cs-bg)', color: 'var(--cs-text)', position: 'relative' }}>
      <header className="cs-header">
        <button
          type="button"
          onClick={() => history.push('/home')}
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          aria-label="Costco-Saver home"
        >
          <span className="cs-mark" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 32 32">
              <path fill="currentColor" d="M7.2 17.4 17.4 7.2h8.4v8.4L15.8 25.6z" />
              <circle cx="22.4" cy="10.6" r="2.3" fill="var(--cs-accent)" />
            </svg>
          </span>
          <span style={{ textAlign: 'left', lineHeight: 1.1 }}>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
              Costco-Saver
            </span>
            <span className="cs-kicker" style={{ display: 'block', marginTop: 2, fontSize: 12 }}>
              South Florida markdowns
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => history.push('/search')}
          aria-label="Search catalog"
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--cs-card)',
            boxShadow: 'var(--cs-shadow)',
            color: 'var(--cs-text)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <main style={{ minHeight: 'calc(100vh - 56px)' }}>{children}</main>

      <nav className="cs-dock" aria-label="Primary">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {TABS.map((t) => {
            const active = t.path === activePath;
            const isScan = t.label === 'Scan';
            return (
              <button
                key={t.path}
                type="button"
                onClick={() => history.push(t.path)}
                aria-current={active ? 'page' : undefined}
                aria-label={t.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '4px 0',
                  position: 'relative',
                }}
              >
                {isScan ? (
                  <span
                    style={{
                      marginTop: -24,
                      width: 56,
                      height: 56,
                      borderRadius: 999,
                      background: 'var(--cs-accent)',
                      color: 'var(--cs-accent-fg)',
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 10px 22px color-mix(in oklab, var(--cs-accent) 35%, transparent)',
                    }}
                  >
                    {icon(t.label, active)}
                  </span>
                ) : (
                  <span style={{ width: 28, height: 28, display: 'grid', placeItems: 'center' }}>
                    {icon(t.label, active)}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: active || isScan ? 'var(--cs-accent)' : 'var(--cs-muted)',
                  }}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
