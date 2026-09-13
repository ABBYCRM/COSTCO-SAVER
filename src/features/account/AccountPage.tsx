/**
 * AccountPage — profile, stats, settings.
 */

import { useState } from 'react';
import { useApp } from '@data/store';
import { formatCents, observationCount, totalSpentCents, watchlistSavingsCents } from '@data/selectors';
import { Card, OfflineBanner, Pill } from '@components/UI';

export function AccountPage(): JSX.Element {
  const handle = useApp((s) => s.handle);
  const setHandle = useApp((s) => s.setHandle);
  const notifications = useApp((s) => s.notifications);
  const toggleNotifications = useApp((s) => s.toggleNotifications);
  const resetToSeed = useApp((s) => s.resetToSeed);
  const observations = observationCount();
  const spent = totalSpentCents();
  const savings = watchlistSavingsCents();
  const watches = useApp((s) => s.watches);
  const triggeredCount = watches.filter((w) => w.triggered).length;

  const [editing, setEditing] = useState(false);
  const [draftHandle, setDraftHandle] = useState(handle);

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
        <h1
          style={{
            margin: '0 0 16px',
            fontSize: 28,
            fontWeight: 800,
            color: '#F9FAFB',
          }}
        >
          Account
        </h1>

        {/* Profile card */}
        <Card padding={20} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
                color: '#0B1220',
                display: 'grid',
                placeItems: 'center',
                fontSize: 24,
                fontWeight: 800,
                flexShrink: 0,
              }}
              aria-hidden
            >
              {handle.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    autoFocus
                    value={draftHandle}
                    onChange={(e) => setDraftHandle(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#0B1220',
                      border: '1px solid #374151',
                      borderRadius: 8,
                      padding: '8px 10px',
                      color: '#E5E7EB',
                      fontSize: 14,
                      fontWeight: 600,
                      outline: 0,
                    }}
                  />
                  <button
                    onClick={() => {
                      setHandle(draftHandle.trim() || handle);
                      setEditing(false);
                    }}
                    style={{
                      background: '#34D399',
                      color: '#0B1220',
                      border: 0,
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => {
                      setDraftHandle(handle);
                      setEditing(true);
                    }}
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: '#F9FAFB',
                      cursor: 'pointer',
                    }}
                  >
                    @{handle}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>Tap to change your handle</div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <Card padding={14} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#34D399',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatCents(savings)}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginTop: 4,
              }}
            >
              Saved
            </div>
          </Card>
          <Card padding={14} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#E5E7EB',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {observations}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginTop: 4,
              }}
            >
              Observations
            </div>
          </Card>
          <Card padding={14} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: '#E5E7EB',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {triggeredCount}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginTop: 4,
              }}
            >
              Watch hits
            </div>
          </Card>
        </div>

        {/* Offline mode card */}
        <Card
          padding={16}
          style={{
            marginBottom: 16,
            background: 'linear-gradient(135deg, #34D39915 0%, #111827 100%)',
            borderColor: '#34D39940',
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                background: '#34D39920',
                display: 'grid',
                placeItems: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}
              aria-hidden
            >
              ☁️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#F9FAFB' }}>
                Local-only preview
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.5, marginTop: 4 }}>
                Your data is stored on this device. Connect a Supabase project to sync across
                devices and join the community.
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: '#6EE7B7',
                  background: '#0B1220',
                  padding: '6px 10px',
                  borderRadius: 6,
                  display: 'inline-block',
                }}
              >
                VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
              </div>
            </div>
          </div>
        </Card>

        {/* Settings list */}
        <div
          style={{
            fontSize: 11,
            color: '#9CA3AF',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 10,
            marginTop: 8,
          }}
        >
          Settings
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <SettingsRow
            icon="🔔"
            label="Notifications"
            right={
              <Pill
                color={notifications ? '#34D399' : '#9CA3AF'}
                bg={notifications ? '#34D39920' : '#1F2937'}
              >
                {notifications ? 'On' : 'Off'}
              </Pill>
            }
            onClick={toggleNotifications}
          />
          <SettingsRow icon="📍" label="Connected warehouses" right={<Pill>3</Pill>} />
          <SettingsRow
            icon="💾"
            label="Total spent"
            right={
              <span style={{ fontSize: 13, fontWeight: 700, color: '#E5E7EB' }}>
                {formatCents(spent)}
              </span>
            }
          />
          <SettingsRow icon="📤" label="Export data" />
          <SettingsRow
            icon="🗑️"
            label="Reset to seed data"
            danger
            onClick={() => {
              if (confirm('Reset all local data back to seed?')) resetToSeed();
            }}
          />
        </div>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: '#0B1220',
            border: '1px solid #1F2937',
            borderRadius: 12,
            textAlign: 'center',
            fontSize: 11,
            color: '#6B7280',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#E5E7EB', marginBottom: 4 }}>
            COSTCO-SAVER
          </div>
          <div>v0.1.0 · No-AI core · Built end-to-end</div>
          <div style={{ marginTop: 6 }}>
            <a
              href="https://github.com/ABBYCRM/COSTCO-SAVER"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#34D399', textDecoration: 'none', fontWeight: 600 }}
            >
              View repo →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function SettingsRow({
  icon,
  label,
  right,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  right?: JSX.Element;
  onClick?: () => void;
  danger?: boolean;
}): JSX.Element {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        background: '#111827',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: '1px solid #1F2937',
      }}
    >
      <span style={{ fontSize: 16 }} aria-hidden>
        {icon}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: 500,
          color: danger ? '#F87171' : '#E5E7EB',
        }}
      >
        {label}
      </span>
      {right}
    </div>
  );
}
