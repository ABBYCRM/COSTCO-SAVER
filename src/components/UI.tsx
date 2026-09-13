/**
 * Reusable UI primitives for COSTCO-SAVER.
 *
 * All components are presentational only — they take props and render.
 */

import type { ReactNode } from 'react';
import { freshnessColor } from '@data/store';
import { markdownBadge, markdownBadgeColor } from '@data/selectors';
import type { MarkdownClass, Observation } from '@data/types';
import { formatCents } from '@data/selectors';

// ────────────────────────────────────────────────────────────────────
// Pill — small inline label
// ────────────────────────────────────────────────────────────────────

interface PillProps {
  children: ReactNode;
  color?: string;
  bg?: string;
  size?: 'xs' | 'sm';
}
export function Pill({ children, color = '#E5E7EB', bg = 'transparent', size = 'sm' }: PillProps): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: size === 'xs' ? '2px 6px' : '3px 10px',
        borderRadius: 999,
        fontSize: size === 'xs' ? 10 : 11,
        fontWeight: 600,
        color,
        background: bg,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────
// MarkdownBadge — colored badge showing markdown class
// ────────────────────────────────────────────────────────────────────

export function MarkdownBadge({ cls }: { cls: MarkdownClass }): JSX.Element {
  const color = markdownBadgeColor(cls);
  const label = markdownBadge(cls);
  if (!label) return <></>;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 800,
        color: '#0B1220',
        background: color,
        letterSpacing: 0.5,
      }}
    >
      {label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────
// FreshnessDot — colored circle with freshness class label
// ────────────────────────────────────────────────────────────────────

export function FreshnessDot({
  cls,
  showLabel = false,
}: {
  cls: Observation['freshness_class'];
  showLabel?: boolean;
}): JSX.Element {
  const color = freshnessColor(cls);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: '#D1D5DB',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 8px ${color}80`,
        }}
      />
      {showLabel && <span style={{ textTransform: 'capitalize' }}>{cls}</span>}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────
// Price — large currency display
// ────────────────────────────────────────────────────────────────────

interface PriceProps {
  cents: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  strikethrough?: boolean;
}
export function Price({ cents, size = 'md', color = '#E5E7EB', strikethrough }: PriceProps): JSX.Element {
  const fontSize = size === 'xl' ? 40 : size === 'lg' ? 28 : size === 'md' ? 18 : 14;
  return (
    <span
      style={{
        fontSize,
        fontWeight: 800,
        color,
        fontVariantNumeric: 'tabular-nums',
        textDecoration: strikethrough ? 'line-through' : 'none',
        textDecorationColor: '#6B7280',
      }}
    >
      {formatCents(cents)}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────
// Card — elevated surface
// ────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  padding?: number;
  style?: React.CSSProperties;
  className?: string;
}
export function Card({ children, onClick, padding = 16, style, className }: CardProps): JSX.Element {
  return (
    <div
      onClick={onClick}
      className={className}
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
        border: '1px solid #1F2937',
        borderRadius: 14,
        padding,
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'transform 120ms ease, box-shadow 120ms ease' : undefined,
        ...style,
      }}
      onMouseDown={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.transform = '';
      }}
      onMouseLeave={(e) => {
        if (onClick) (e.currentTarget as HTMLDivElement).style.transform = '';
      }}
    >
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// EmptyState — dashed-border, mint icon, headline, body, optional CTA
// ────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title: string;
  body?: string;
  cta?: { label: string; onClick: () => void };
}
export function EmptyState({ icon = '📦', title, body, cta }: EmptyStateProps): JSX.Element {
  return (
    <div
      style={{
        border: '1px dashed #374151',
        borderRadius: 14,
        padding: 32,
        textAlign: 'center',
        background: '#0B1220',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          background: '#34D39920',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 14px',
          fontSize: 28,
        }}
        aria-hidden
      >
        {icon}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#E5E7EB', marginBottom: 6 }}>{title}</div>
      {body && (
        <div style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.5, marginBottom: cta ? 16 : 0 }}>
          {body}
        </div>
      )}
      {cta && (
        <button
          onClick={cta.onClick}
          style={{
            background: '#34D399',
            color: '#0B1220',
            border: 0,
            borderRadius: 999,
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Skeleton — shimmer placeholder
// ────────────────────────────────────────────────────────────────────

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 6,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
}): JSX.Element {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, #1F2937 0%, #374151 50%, #1F2937 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────
// Section — labeled header
// ────────────────────────────────────────────────────────────────────

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <section style={{ marginBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px 12px',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            color: '#9CA3AF',
          }}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// OfflineBanner — small chip showing local-only mode
// ────────────────────────────────────────────────────────────────────

export function OfflineBanner(): JSX.Element {
  return (
    <div
      style={{
        background: '#34D39915',
        borderBottom: '1px solid #34D39940',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: 11,
        color: '#6EE7B7',
        fontWeight: 600,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: '#34D399' }} />
      Offline preview · Local seed data
    </div>
  );
}
