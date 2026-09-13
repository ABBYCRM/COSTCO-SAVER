/**
 * ProductImage — renders a beautiful, CDN-free product silhouette based on
 * the product ID. Uses CSS gradients + inline SVG. No external network.
 */

import type { Product } from '@data/types';

interface Props {
  product: Product;
  size?: number;
  rounded?: boolean;
}

function visualFor(id: string): { gradient: string; svg: string; emoji: string } {
  switch (id) {
    case 'p_olive_oil':
      return {
        gradient: 'linear-gradient(135deg, #14532D 0%, #65A30D 60%, #CA8A04 100%)',
        svg: `<path d="M70 25 H130 V45 H70 Z" fill="#1E3A29"/><rect x="78" y="45" width="44" height="115" fill="#A16207" rx="3"/><rect x="72" y="158" width="56" height="8" fill="#1E3A29" rx="2"/><text x="100" y="110" text-anchor="middle" font-size="14" fill="#FBBF24" font-family="serif" font-weight="700">KS</text>`,
        emoji: '🫒',
      };
    case 'p_bounty':
      return {
        gradient: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #93C5FD 100%)',
        svg: `<circle cx="100" cy="100" r="38" fill="#FFFFFF"/><circle cx="100" cy="100" r="14" fill="#FFFFFF" stroke="#93C5FD" stroke-width="3"/><text x="100" y="172" text-anchor="middle" font-size="11" fill="#FFFFFF" font-weight="700">BOUNTY</text>`,
        emoji: '🧻',
      };
    case 'p_kirkland_tp':
      return {
        gradient: 'linear-gradient(135deg, #831843 0%, #BE185D 60%, #F472B6 100%)',
        svg: `<rect x="60" y="60" width="80" height="100" fill="#FFFFFF" rx="6"/><rect x="68" y="68" width="64" height="84" fill="#FBCFE8" rx="3"/><circle cx="100" cy="110" r="14" fill="#BE185D"/>`,
        emoji: '🧻',
      };
    case 'p_rotisserie':
      return {
        gradient: 'linear-gradient(135deg, #7C2D12 0%, #C2410C 60%, #FB923C 100%)',
        svg: `<ellipse cx="100" cy="120" rx="60" ry="35" fill="#FED7AA"/><ellipse cx="100" cy="105" rx="48" ry="32" fill="#FB923C"/><circle cx="80" cy="100" r="6" fill="#7C2D12"/><circle cx="120" cy="100" r="6" fill="#7C2D12"/><text x="100" y="155" text-anchor="middle" font-size="9" fill="#FFFFFF" font-weight="700">ROTTISSERIE</text>`,
        emoji: '🍗',
      };
    case 'p_bananas':
      return {
        gradient: 'linear-gradient(135deg, #854D0E 0%, #CA8A04 60%, #FDE047 100%)',
        svg: `<path d="M50 130 Q60 60 110 60 Q160 60 170 130 Q170 150 150 145 Q100 135 50 145 Z" fill="#FACC15" stroke="#A16207" stroke-width="2"/><path d="M110 60 Q115 50 130 45" stroke="#15803D" stroke-width="4" fill="none"/>`,
        emoji: '🍌',
      };
    case 'p_cold_med':
      return {
        gradient: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 60%, #93C5FD 100%)',
        svg: `<rect x="65" y="40" width="70" height="120" fill="#FFFFFF" rx="6"/><rect x="68" y="55" width="64" height="20" fill="#3B82F6"/><text x="100" y="70" text-anchor="middle" font-size="10" fill="#FFFFFF" font-weight="700">KS</text><rect x="74" y="85" width="52" height="6" fill="#93C5FD"/><rect x="74" y="95" width="40" height="6" fill="#93C5FD"/><rect x="74" y="115" width="52" height="6" fill="#E0F2FE"/><rect x="74" y="125" width="46" height="6" fill="#E0F2FE"/><rect x="74" y="135" width="44" height="6" fill="#E0F2FE"/>`,
        emoji: '💊',
      };
    case 'p_aa_batt':
      return {
        gradient: 'linear-gradient(135deg, #1F2937 0%, #374151 60%, #6B7280 100%)',
        svg: `<rect x="55" y="60" width="20" height="100" fill="#FACC15" rx="3"/><rect x="78" y="60" width="20" height="100" fill="#FACC15" rx="3"/><rect x="101" y="60" width="20" height="100" fill="#FACC15" rx="3"/><rect x="124" y="60" width="20" height="100" fill="#FACC15" rx="3"/><circle cx="65" cy="65" r="4" fill="#1F2937"/><circle cx="88" cy="65" r="4" fill="#1F2937"/><circle cx="111" cy="65" r="4" fill="#1F2937"/><circle cx="134" cy="65" r="4" fill="#1F2937"/>`,
        emoji: '🔋',
      };
    case 'p_almond_butter':
      return {
        gradient: 'linear-gradient(135deg, #78350F 0%, #B45309 60%, #D97706 100%)',
        svg: `<rect x="65" y="50" width="70" height="110" fill="#FFFFFF" rx="4"/><rect x="68" y="60" width="64" height="40" fill="#D97706"/><text x="100" y="80" text-anchor="middle" font-size="9" fill="#FFFFFF" font-weight="700">KS</text><text x="100" y="125" text-anchor="middle" font-size="8" fill="#78350F">ALMOND</text><text x="100" y="138" text-anchor="middle" font-size="8" fill="#78350F">BUTTER</text>`,
        emoji: '🥜',
      };
    case 'p_lays':
      return {
        gradient: 'linear-gradient(135deg, #B45309 0%, #F59E0B 60%, #FDE047 100%)',
        svg: `<rect x="55" y="50" width="90" height="110" fill="#FBBF24" rx="4"/><circle cx="100" cy="100" r="36" fill="#FFFFFF"/><path d="M85 95 Q100 80 115 95 Q115 110 100 115 Q85 110 85 95" fill="#F59E0B"/><text x="100" y="155" text-anchor="middle" font-size="9" fill="#7C2D12" font-weight="700">LAY'S</text>`,
        emoji: '🍟',
      };
    case 'p_whey':
      return {
        gradient: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 60%, #818CF8 100%)',
        svg: `<path d="M70 40 L130 40 L135 60 L65 60 Z" fill="#312E81"/><rect x="60" y="60" width="80" height="100" fill="#FFFFFF" rx="4"/><rect x="65" y="70" width="70" height="30" fill="#4338CA"/><text x="100" y="90" text-anchor="middle" font-size="10" fill="#FFFFFF" font-weight="700">ON</text><text x="100" y="125" text-anchor="middle" font-size="9" fill="#1E1B4B">WHEY 5lb</text><text x="100" y="140" text-anchor="middle" font-size="9" fill="#1E1B4B">VANILLA</text>`,
        emoji: '🥤',
      };
    case 'p_down_sweater':
      return {
        gradient: 'linear-gradient(135deg, #0C4A6E 0%, #0369A1 60%, #7DD3FC 100%)',
        svg: `<path d="M60 80 L100 50 L140 80 L150 130 L130 140 L130 175 L70 175 L70 140 L50 130 Z" fill="#0EA5E9" stroke="#0C4A6E" stroke-width="2"/><circle cx="100" cy="100" r="3" fill="#0C4A6E"/><circle cx="100" cy="120" r="3" fill="#0C4A6E"/><circle cx="100" cy="140" r="3" fill="#0C4A6E"/>`,
        emoji: '🧥',
      };
    case 'p_samsung_tv':
      return {
        gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #475569 100%)',
        svg: `<rect x="35" y="60" width="130" height="80" fill="#0F172A" stroke="#475569" stroke-width="3" rx="3"/><rect x="40" y="65" width="120" height="70" fill="#1E3A8A"/><text x="100" y="105" text-anchor="middle" font-size="14" fill="#60A5FA" font-weight="700">SAMSUNG</text><rect x="90" y="140" width="20" height="10" fill="#475569"/><rect x="70" y="150" width="60" height="3" fill="#475569" rx="1"/>`,
        emoji: '📺',
      };
    case 'p_dyson':
      return {
        gradient: 'linear-gradient(135deg, #1F2937 0%, #4B5563 60%, #9CA3AF 100%)',
        svg: `<rect x="85" y="40" width="30" height="35" fill="#F3F4F6" rx="3"/><rect x="78" y="75" width="44" height="65" fill="#1F2937" rx="6"/><rect x="85" y="80" width="30" height="55" fill="#374151" rx="3"/><circle cx="100" cy="155" r="18" fill="#9CA3AF" stroke="#1F2937" stroke-width="2"/><circle cx="100" cy="155" r="10" fill="#374151"/><line x1="100" y1="143" x2="100" y2="167" stroke="#1F2937" stroke-width="1"/><line x1="88" y1="155" x2="112" y2="155" stroke="#1F2937" stroke-width="1"/>`,
        emoji: '🧹',
      };
    case 'p_vitamix':
      return {
        gradient: 'linear-gradient(135deg, #0C4A6E 0%, #1E40AF 60%, #93C5FD 100%)',
        svg: `<path d="M70 35 H130 V55 H70 Z" fill="#1E293B"/><rect x="75" y="55" width="50" height="80" fill="#F3F4F6" rx="3"/><rect x="78" y="58" width="44" height="74" fill="#93C5FD" opacity="0.6" rx="2"/><rect x="80" y="60" width="40" height="70" fill="#FFFFFF" rx="2"/><rect x="68" y="135" width="64" height="20" fill="#1E293B" rx="3"/><circle cx="100" cy="105" r="5" fill="#1E40AF"/>`,
        emoji: '🥤',
      };
    case 'p_levis':
      return {
        gradient: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #3B82F6 100%)',
        svg: `<path d="M75 50 L85 50 L92 170 L78 175 L72 175 Z" fill="#1E40AF"/><path d="M115 50 L125 50 L128 175 L122 175 L108 170 Z" fill="#1E40AF"/><circle cx="85" cy="60" r="3" fill="#FBBF24"/><line x1="85" y1="55" x2="85" y2="65" stroke="#1E3A8A" stroke-width="1"/><rect x="78" y="100" width="14" height="10" fill="#0C1F4D" rx="1"/>`,
        emoji: '👖',
      };
    default:
      return {
        gradient: 'linear-gradient(135deg, #1F2937 0%, #374151 60%, #6B7280 100%)',
        svg: `<rect x="70" y="60" width="60" height="80" fill="#6B7280" rx="3"/><text x="100" y="105" text-anchor="middle" font-size="14" fill="#FFFFFF" font-weight="700">${'$'}</text>`,
        emoji: '📦',
      };
  }
}

export function ProductImage({ product, size = 64, rounded = true }: Props): JSX.Element {
  const v = visualFor(product.id);
  return (
    <div
      style={{
        width: size,
        height: size,
        background: v.gradient,
        borderRadius: rounded ? 12 : 0,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      }}
      aria-label={`${product.name} image`}
    >
      <svg
        viewBox="0 0 200 200"
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0 }}
        dangerouslySetInnerHTML={{ __html: v.svg }}
      />
    </div>
  );
}
