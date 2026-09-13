/**
 * CoverageRadar — animated 4-axis radar chart for warehouse health.
 *
 * Axes:
 *   - Freshness (top)
 *   - Confidence (right)
 *   - Coverage (bottom)
 *   - Velocity (left)
 */

import type { WarehouseHealth } from '@data/types';

interface Props {
  health: WarehouseHealth;
}

const AXES = ['Freshness', 'Confidence', 'Coverage', 'Velocity'] as const;
const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = SIZE * 0.34;

function point(axisIdx: number, value: number): [number, number] {
  const angle = (axisIdx * 2 * Math.PI) / AXES.length - Math.PI / 2;
  const r = R * (value / 100);
  return [CX + Math.cos(angle) * r, CY + Math.sin(angle) * r];
}

export function CoverageRadar({ health }: Props): JSX.Element {
  const values = [
    health.freshness_score,
    health.avg_confidence,
    health.coverage_pct,
    Math.min(100, health.velocity * 3), // velocity is observations/24h, scale to %
  ];

  // Build the polygon path
  const polygon = values
    .map((v, i) => point(i, v))
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ') + ' Z';

  // Concentric rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1].map((scale) => {
    return AXES.map((_, i) => {
      const angle = (i * 2 * Math.PI) / AXES.length - Math.PI / 2;
      const x = CX + Math.cos(angle) * R * scale;
      const y = CY + Math.sin(angle) * R * scale;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ') + ' Z';
  });

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ width: '100%', maxWidth: 220, height: 'auto', display: 'block', margin: '0 auto' }}
      role="img"
      aria-label={`Coverage radar: freshness ${values[0]} percent, confidence ${values[1]} percent, coverage ${values[2]} percent, velocity ${values[3]} percent`}
    >
      {/* Background rings */}
      {rings.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#1F2937"
          strokeWidth={1}
          opacity={0.7 - i * 0.1}
        />
      ))}

      {/* Axis lines */}
      {AXES.map((_, i) => {
        const [x, y] = point(i, 100);
        return (
          <line
            key={i}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            stroke="#374151"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        );
      })}

      {/* Filled polygon */}
      <path
        d={polygon}
        fill="#34D39940"
        stroke="#34D399"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Axis dots */}
      {values.map((v, i) => {
        const [x, y] = point(i, v);
        return (
          <circle key={i} cx={x} cy={y} r={3.5} fill="#34D399" />
        );
      })}

      {/* Axis labels */}
      {AXES.map((label, i) => {
        const angle = (i * 2 * Math.PI) / AXES.length - Math.PI / 2;
        const labelR = R + 18;
        const x = CX + Math.cos(angle) * labelR;
        const y = CY + Math.sin(angle) * labelR;
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fontWeight="600"
            fill="#9CA3AF"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
