/**
 * AppShell — outer layout with sticky header + bottom tab bar.
 */

import type { ReactNode } from 'react';
import { useLocation, useHistory } from 'react-router';

interface Tab {
  path: string;
  label: string;
  icon: JSX.Element;
}

function homeIcon(active: boolean): JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10"
        stroke={active ? '#34D399' : '#9CA3AF'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function dealsIcon(active: boolean): JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 7l-6 6 6 6m6-12l6 6-6 6"
        stroke={active ? '#34D399' : '#9CA3AF'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function scanIcon(active: boolean): JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M15 8v8M19 8v8"
        stroke={active ? '#0B1220' : '#9CA3AF'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function savedIcon(active: boolean): JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
        stroke={active ? '#34D399' : '#9CA3AF'}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function accountIcon(active: boolean): JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
        stroke={active ? '#34D399' : '#9CA3AF'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const TABS: Tab[] = [
  { path: '/', label: 'Home', icon: homeIcon(false) },
  { path: '/deals', label: 'Deals', icon: dealsIcon(false) },
  { path: '/scan', label: 'Scan', icon: scanIcon(false) },
  { path: '/saved', label: 'Saved', icon: savedIcon(false) },
  { path: '/account', label: 'Account', icon: accountIcon(false) },
];

export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const location = useLocation();
  const history = useHistory();

  const activePath = TABS.find((t) =>
    t.path === '/' ? location.pathname === '/' : location.pathname.startsWith(t.path),
  )?.path ?? '/';

  const iconFor = (path: string, label: string): JSX.Element => {
    const active = path === activePath;
    if (label === 'Home') return homeIcon(active);
    if (label === 'Deals') return dealsIcon(active);
    if (label === 'Scan') return scanIcon(active);
    if (label === 'Saved') return savedIcon(active);
    return accountIcon(active);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B1220',
        color: '#E5E7EB',
        position: 'relative',
      }}
    >
      {/* Top brand bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(11, 18, 32, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1F2937',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
              color: '#0B1220',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 16,
            }}
            aria-hidden
          >
            $
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#F9FAFB', letterSpacing: 0.3 }}>
            COSTCO-SAVER
          </div>
        </div>
      </div>

      {/* Main content */}
      <main style={{ minHeight: 'calc(100vh - 56px - 76px)' }}>{children}</main>

      {/* Bottom tab bar */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(11, 18, 32, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid #1F2937',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            maxWidth: 720,
            margin: '0 auto',
            padding: '8px 8px 8px',
          }}
        >
          {TABS.map((t) => {
            const active = t.path === activePath;
            const isScan = t.label === 'Scan';
            return (
              <button
                key={t.path}
                onClick={() => history.push(t.path)}
                aria-current={active ? 'page' : undefined}
                aria-label={t.label}
                style={{
                  background: 'transparent',
                  border: 0,
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  position: 'relative',
                }}
              >
                {isScan ? (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 999,
                      background: active
                        ? 'linear-gradient(135deg, #34D399 0%, #10B981 100%)'
                        : 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 4px 16px rgba(52, 211, 153, 0.4)',
                      marginTop: -16,
                    }}
                  >
                    {scanIcon(active)}
                  </div>
                ) : (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {iconFor(t.path, t.label)}
                  </div>
                )}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: active ? '#34D399' : '#9CA3AF',
                    marginTop: isScan ? 2 : 0,
                  }}
                >
                  {t.label}
                </span>
                {active && !isScan && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      width: 16,
                      height: 2,
                      borderRadius: 999,
                      background: '#34D399',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
