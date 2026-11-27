import { BuffetZoneId, SeasonId, WeatherId } from '../types/game';

interface IconProps {
  className?: string;
}

const INK = '#241A14';

// ============================================================================
// 1. WEATHER SVG ICONS (5 Distinct Chaoshan Watercolor + Sepia Ink Emblems)
// ============================================================================

export function WeatherSvgIcon({
  weather,
  className = 'w-4 h-4',
}: IconProps & { weather: WeatherId }) {
  switch (weather) {
    case 'SUNNY':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <g stroke="#F7D070" strokeWidth="1.7" strokeLinecap="round">
            <line x1="12" y1="2.2" x2="12" y2="4.6" />
            <line x1="12" y1="19.4" x2="12" y2="21.8" />
            <line x1="2.2" y1="12" x2="4.6" y2="12" />
            <line x1="19.4" y1="12" x2="21.8" y2="12" />
            <line x1="5.1" y1="5.1" x2="6.8" y2="6.8" />
            <line x1="17.2" y1="17.2" x2="18.9" y2="18.9" />
            <line x1="18.9" y1="5.1" x2="17.2" y2="6.8" />
            <line x1="6.8" y1="17.2" x2="5.1" y2="18.9" />
          </g>
          <circle cx="12" cy="12" r="5.2" fill="#F5B841" stroke={INK} strokeWidth="1.4" />
          <circle cx="10.6" cy="10.5" r="2.1" fill="#FFF3C4" opacity="0.82" />
          <path
            d="M14.5 16.8h4.2a2.1 2.1 0 0 0 .2-4.18 2.8 2.8 0 0 0-5.12-.72 1.9 1.9 0 0 0 .72 4.9Z"
            fill="#F7EFE2"
            stroke={INK}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'RAINY':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M6.4 14.5h11.3a3.6 3.6 0 0 0 .6-7.14A5.1 5.1 0 0 0 8.5 6.3a3.8 3.8 0 0 0-2.1 8.2Z"
            fill="#8BB3C9"
            stroke={INK}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 7.4a3.6 3.6 0 0 1 6.2-1.2"
            stroke="#E3F2FA"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M8.2 17.1l-1.2 3.1M12.4 17.1l-1.2 3.4M16.6 17.1l-1.2 3.1"
            stroke="#67E8F9"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'TYPHOON':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M5.5 12.2h12.2a3.3 3.3 0 0 0 .5-6.56 4.8 4.8 0 0 0-9.1-1.08A3.6 3.6 0 0 0 5.5 12.2Z"
            fill="#4F6B88"
            stroke={INK}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M12.4 11.4L9.3 16.4h2.7l-1.1 4.8 4.8-6.4h-2.8l1.2-3.4h-1.7Z"
            fill="#FDE047"
            stroke={INK}
            strokeWidth="1.15"
            strokeLinejoin="round"
          />
          <path
            d="M3.2 15.2c1.8-.8 3.2-.6 4.5-.1M16.8 16.2c1.4-.5 2.7-.4 4 .2"
            stroke="#93C5FD"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'SNOWY':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <g stroke="#DCEEFF" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2.8" x2="12" y2="21.2" />
            <line x1="4" y1="7.4" x2="20" y2="16.6" />
            <line x1="20" y1="7.4" x2="4" y2="16.6" />
            <path d="M9.8 4.6L12 6.6l2.2-2M9.8 19.4L12 17.4l2.2 2" />
            <path d="M5.2 10.2l2.4-.9-.6-2.5M18.8 13.8l-2.4.9.6 2.5" />
            <path d="M18.8 10.2l-2.4-.9.6-2.5M5.2 13.8l2.4.9-.6 2.5" />
          </g>
          <circle cx="12" cy="12" r="2.6" fill="#93C5FD" stroke={INK} strokeWidth="1.2" />
        </svg>
      );

    case 'HEATWAVE':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="9.2" r="5" fill="#F97316" stroke={INK} strokeWidth="1.4" />
          <circle cx="11" cy="8.2" r="2.2" fill="#FEF08A" opacity="0.88" />
          <g stroke="#FB923C" strokeWidth="1.5" strokeLinecap="round">
            <line x1="12" y1="1.8" x2="12" y2="3.2" />
            <line x1="4.4" y1="9.2" x2="5.8" y2="9.2" />
            <line x1="18.2" y1="9.2" x2="19.6" y2="9.2" />
            <line x1="6.4" y1="3.8" x2="7.5" y2="4.9" />
            <line x1="17.6" y1="3.8" x2="16.5" y2="4.9" />
          </g>
          <path
            d="M4.2 17.2c1.6-1.3 3.2-1.3 4.8 0s3.2 1.3 4.8 0 3.2-1.3 5.8 0"
            stroke="#FDBA74"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M5.4 20.5c1.5-1.1 3-1.1 4.5 0s3 1.1 4.5 0 3-1.1 4.4 0"
            stroke="#EF4444"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

// ============================================================================
// 2. SEASON SVG ICONS (4 Chaoshan Seasonal Emblem Stamps)
// ============================================================================

export function SeasonSvgIcon({
  season,
  className = 'w-4 h-4',
}: IconProps & { season: SeasonId }) {
  switch (season) {
    case 'SPRING':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          {/* Tender bamboo/plum leaf */}
          <path
            d="M15.6 15.8c2.6-.2 5.1 1.1 5.6 3.5-2.6.9-5.1-.1-6.2-2.2"
            fill="#4ADE80"
            stroke={INK}
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          {/* Five-petal Chaoshan plum/peach blossom */}
          <g fill="#F9A8D4" stroke={INK} strokeWidth="1.2">
            <circle cx="11.5" cy="6.6" r="3.1" />
            <circle cx="16.2" cy="10.1" r="3.1" />
            <circle cx="14.4" cy="15.5" r="3.1" />
            <circle cx="8.6" cy="15.5" r="3.1" />
            <circle cx="6.8" cy="10.1" r="3.1" />
          </g>
          <circle cx="11.5" cy="11.6" r="2.6" fill="#FDE047" stroke={INK} strokeWidth="1.2" />
        </svg>
      );

    case 'SUMMER':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          {/* Coastal jade lotus pad */}
          <ellipse cx="12" cy="17.2" rx="8.6" ry="3.4" fill="#22C55E" stroke={INK} strokeWidth="1.3" />
          {/* Lotus petals */}
          <path
            d="M12 4.4c2.4 2.4 3.4 5.5 2.4 9.2h-4.8C8.6 9.9 9.6 6.8 12 4.4Z"
            fill="#FB7185"
            stroke={INK}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M6.4 8.6c2.6.8 4.4 2.5 5 5.2H8.1c-1.7-1.4-2.2-3.2-1.7-5.2Z"
            fill="#FDA4AF"
            stroke={INK}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M17.6 8.6c-2.6.8-4.4 2.5-5 5.2h3.3c1.7-1.4 2.2-3.2 1.7-5.2Z"
            fill="#FDA4AF"
            stroke={INK}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M5.5 20.6c2.2-.8 4.2-.8 6.5 0 2.3.8 4.3.8 6.5 0" stroke="#38BDF8" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    case 'AUTUMN':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          {/* Golden Ginkgo / Harvest Leaf */}
          <path
            d="M12 16.2C6.4 16 3.5 11.6 4.2 6.6c2.2-.6 4.4.1 6.1 1.7.4-1.8 1-3.3 1.7-4.3.7 1 1.3 2.5 1.7 4.3 1.7-1.6 3.9-2.3 6.1-1.7.7 5-2.2 9.4-7.8 9.6Z"
            fill="#F59E0B"
            stroke={INK}
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
          <path d="M12 16v5.2" stroke="#92400E" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 15.6L8.4 10.6M12 15.6l3.6-5M12 15.4V9.2" stroke="#FEF08A" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
        </svg>
      );

    case 'WINTER':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          {/* Warm Crimson Lantern in Snow */}
          <line x1="12" y1="2.2" x2="12" y2="5" stroke="#E8C97A" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="8.8" y="4.8" width="6.4" height="2" rx="0.8" fill="#E8C97A" stroke={INK} strokeWidth="1.1" />
          <ellipse cx="12" cy="11.6" rx="5.8" ry="5.2" fill="#DC3E26" stroke={INK} strokeWidth="1.35" />
          <ellipse cx="12" cy="11.6" rx="2.6" ry="5" fill="#F97316" opacity="0.52" />
          <rect x="9.2" y="16.4" width="5.6" height="1.9" rx="0.8" fill="#E8C97A" stroke={INK} strokeWidth="1.1" />
          <line x1="12" y1="18.4" x2="12" y2="21.4" stroke="#E8C97A" strokeWidth="1.6" strokeLinecap="round" />
          {/* Snowflakes */}
          <circle cx="4.4" cy="6.6" r="1.25" fill="#E0F2FE" />
          <circle cx="19.6" cy="8.2" r="1.15" fill="#E0F2FE" />
          <circle cx="18.8" cy="18.2" r="1.1" fill="#BAE6FD" />
        </svg>
      );
  }
}

// ============================================================================
// 3. SEAFOOD & DISH SVG ICONS (Retro Chaoshan Watercolor Illustrations)
// ============================================================================

export function SeafoodSvgIcon({
  itemId,
  zoneId,
  className = 'w-6 h-6',
}: IconProps & { itemId?: string; zoneId?: BuffetZoneId }) {
  const id = itemId ?? '';

  // Boston Lobster
  if (id === 'lobster') {
    return (
      <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
        <ellipse cx="14" cy="21" rx="10" ry="3.5" fill="#DCE8E5" stroke={INK} strokeWidth="1.3" />
        <path
          d="M9 11.5c-2.6-2.4-2.2-5.4.6-6.2 1.2 1.4 1.6 3.1.9 4.7M19 11.5c2.6-2.4 2.2-5.4-.6-6.2-1.2 1.4-1.6 3.1-.9 4.7"
          fill="#D9381E"
          stroke={INK}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M14 7.8c3.2 0 4.6 3.4 4.1 7.6-.4 3-1.8 5.2-4.1 6-2.3-.8-3.7-3-4.1-6-.5-4.2.9-7.6 4.1-7.6Z"
          fill="#E5482B"
          stroke={INK}
          strokeWidth="1.35"
        />
        <path d="M11.2 13.4h5.6M11.6 16.4h4.8" stroke="#FFC4B0" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M11 20.6l-2.4 2.4h10.8L17 20.6" fill="#C42B16" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }

  // Crabs (King Crab / Typhoon Crab / Marinated Crab)
  if (id === 'king_crab' || id === 'typhoon_crab' || id === 'marinated_crab') {
    const shell = id === 'marinated_crab' ? '#0EA5E9' : id === 'typhoon_crab' ? '#EA580C' : '#E04B2E';
    const highlight = id === 'marinated_crab' ? '#BAE6FD' : '#FDE68A';
    return (
      <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
        <g stroke={INK} strokeWidth="1.4" strokeLinecap="round">
          <path d="M6.5 14.5L3.4 12.6M6.6 17.2L3.5 18.8M21.5 14.5l3.1-1.9M21.4 17.2l3.1 1.6" />
          <path d="M8.5 11.4C6 8.8 6.4 5.8 9.2 5.4c.7 1.4.6 2.8-.2 4" fill={shell} />
          <path d="M19.5 11.4c2.5-2.6 2.1-5.6-.7-6-.7 1.4-.6 2.8.2 4" fill={shell} />
        </g>
        <ellipse cx="14" cy="15.8" rx="7.6" ry="5.4" fill={shell} stroke={INK} strokeWidth="1.4" />
        <ellipse cx="14" cy="14.2" rx="4.2" ry="2.2" fill={highlight} opacity="0.55" />
        <circle cx="11.2" cy="11.2" r="1.1" fill={INK} />
        <circle cx="16.8" cy="11.2" r="1.1" fill={INK} />
      </svg>
    );
  }

  // Prawns / Shrimp / Drunken Prawns
  if (id === 'prawns' || id === 'drunken_prawns' || id === 'sweet_shrimp_sushi') {
    const body = id === 'drunken_prawns' ? '#F59E0B' : id === 'sweet_shrimp_sushi' ? '#FB7185' : '#F26D4B';
    return (
      <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
        <ellipse cx="14" cy="20.6" rx="9.6" ry="3.4" fill="#DCE8E5" stroke={INK} strokeWidth="1.25" />
        <path
          d="M19.2 9.4c-2.6-2.5-7.4-2.4-10.2.8-2.4 2.7-2.2 6.8.8 8.8 2.2 1.4 5.6 1.2 7.2-.8-2.2-.4-3.7-1.7-3.6-3.4.1-1.9 2.3-2.9 4.5-2.4l1.3-3Z"
          fill={body}
          stroke={INK}
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path d="M11 10.2l1.6 2.4M8.8 13.6l2.5 1M10.4 17.2l2.2-1.1" stroke="#FFF1E6" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M19 9.2c2.2-1.2 3.8-.9 5.1.4M19.2 10.6c2-.4 3.5.3 4.4 1.6" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }

  // Shellfish / Oysters / Garlic Scallops / Abalone
  if (id === 'oysters' || id === 'garlic_scallops' || id === 'abalone_live') {
    const shell = id === 'abalone_live' ? '#2DD4BF' : id === 'garlic_scallops' ? '#E8B85B' : '#7FA5C2';
    const meat = id === 'garlic_scallops' ? '#FDE047' : '#FFF4DC';
    return (
      <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
        <path
          d="M4.6 15.6C4.6 9.6 8.8 5.6 14 5.6s9.4 4 9.4 10c0 3.6-3.8 6.4-9.4 6.4s-9.4-2.8-9.4-6.4Z"
          fill={shell}
          stroke={INK}
          strokeWidth="1.4"
        />
        <path d="M14 5.8v15.8M9.2 7.2L12.6 21M18.8 7.2L15.4 21" stroke={INK} strokeWidth="1" opacity="0.42" />
        <ellipse cx="14" cy="14.6" rx="4.8" ry="3.2" fill={meat} stroke={INK} strokeWidth="1.25" />
        {id === 'garlic_scallops' && (
          <circle cx="14" cy="14.4" r="1.4" fill="#EA580C" />
        )}
      </svg>
    );
  }

  // Sashimi / Salmon / Bluefin Toro / Steamed Turbot
  if (id === 'salmon' || id === 'bluefin_toro' || id === 'steamed_turbot' || zoneId === 'sashimi_sushi') {
    const fill = id === 'bluefin_toro' ? '#E85D75' : id === 'steamed_turbot' ? '#CBD5E1' : '#F48A5E';
    return (
      <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
        <rect x="4" y="17.2" width="20" height="4.4" rx="1.6" fill="#2B3D42" stroke={INK} strokeWidth="1.3" />
        <path
          d="M6.2 17.2c1.4-5.4 5.8-8.6 12-8.2 2.4.2 3.8 1.5 3.6 3.8-.3 2.8-2.6 4.4-6.4 4.4H6.2Z"
          fill={fill}
          stroke={INK}
          strokeWidth="1.35"
          strokeLinejoin="round"
        />
        <path d="M10.4 12.2l3.8 4.4M14.2 10.2l3.6 4.8M17.8 9.8l2.5 3.4" stroke="#FFF4EA" strokeWidth="1.35" strokeLinecap="round" opacity="0.85" />
      </svg>
    );
  }

  // Bamboo Dimsum Steamer
  if (id === 'dimsum_shrimp_dumpling' || zoneId === 'steam_dimsum') {
    return (
      <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
        <path d="M10 6.8c-.4-1.2.4-2.2.8-3M14 6.2c-.4-1.2.4-2.2.8-3M18 6.8c-.4-1.2.4-2.2.8-3" stroke="#E8D8BE" strokeWidth="1.3" strokeLinecap="round" />
        <rect x="4.5" y="13.8" width="19" height="8.2" rx="3" fill="#C99A58" stroke={INK} strokeWidth="1.4" />
        <ellipse cx="14" cy="13.8" rx="9.5" ry="3.6" fill="#E6C387" stroke={INK} strokeWidth="1.35" />
        <ellipse cx="10.8" cy="13.2" rx="2.6" ry="1.9" fill="#FFF7EB" stroke={INK} strokeWidth="1.15" />
        <ellipse cx="16.8" cy="13.4" rx="2.7" ry="1.9" fill="#FFF7EB" stroke={INK} strokeWidth="1.15" />
        <ellipse cx="13.8" cy="14.9" rx="2.6" ry="1.8" fill="#FDE6C4" stroke={INK} strokeWidth="1.15" />
      </svg>
    );
  }

  // Wagyu / Beef Rolls / Tomahawk / Teppan Lamb
  if (
    id === 'wagyu' ||
    id === 'beef_rolls' ||
    id === 'carved_wagyu_ribeye' ||
    id === 'tomahawk_roast' ||
    id === 'teppan_lamb' ||
    zoneId === 'wagyu_carving'
  ) {
    return (
      <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
        <path
          d="M5.4 16.4c0-4.8 4.2-8.4 9.8-8.4 4.4 0 7.4 2.4 7.4 6 0 4.2-3.4 7.4-8.8 7.4-5 0-8.4-1.8-8.4-5Z"
          fill="#B91C1C"
          stroke={INK}
          strokeWidth="1.4"
        />
        <path
          d="M8.5 14.8c2.2-1.8 4.4-2.4 7.2-1.2 1.8.8 3.2.4 4.2-.8M9.8 18.2c2.8-1 5.4-.8 8.2.4"
          stroke="#FFE4E6"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="18.2" cy="13.4" r="1.9" fill="#FEF2F2" stroke={INK} strokeWidth="1.1" />
      </svg>
    );
  }

  // Teppan BBQ / Foie Gras
  if (id === 'bbq_garlic_oyster' || id === 'teppan_foie_gras' || zoneId === 'teppan_bbq') {
    return (
      <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
        <line x1="5" y1="22.5" x2="22.5" y2="5" stroke="#E8C97A" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="8.2" y="13.6" width="5.2" height="5.2" rx="1.6" transform="rotate(-45 8.2 13.6)" fill="#EA580C" stroke={INK} strokeWidth="1.3" />
        <rect x="13.4" y="8.4" width="5.2" height="5.2" rx="1.6" transform="rotate(-45 13.4 8.4)" fill="#D97706" stroke={INK} strokeWidth="1.3" />
        <path d="M18.4 17.4c1.2 1.8 2.4 2.4 2.4 4.2a2.6 2.6 0 0 1-5.2 0c0-1.6 1.2-2.6 2.8-4.2Z" fill="#F97316" stroke={INK} strokeWidth="1.15" />
      </svg>
    );
  }

  // Durian / Drinks & Dessert
  if (id === 'durian_craft' || zoneId === 'drinks_dessert') {
    return (
      <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
        <path
          d="M14 5.5l2.3 2 3-.6 1 2.9 2.5 1.7-1.1 2.8 1.1 2.8-2.5 1.7-1 2.9-3-.6-2.3 2-2.3-2-3 .6-1-2.9-2.5-1.7 1.1-2.8-1.1-2.8 2.5-1.7 1-2.9 3 .6 2.3-2Z"
          fill="#CA8A04"
          stroke={INK}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <ellipse cx="14" cy="14.5" rx="4.6" ry="5.4" fill="#FEF08A" stroke={INK} strokeWidth="1.2" />
      </svg>
    );
  }

  // Default: Hotpot Veggies & Hand-beaten Shrimp Balls Bowl
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      <path d="M5 14.5h18c-.4 5.2-4 8-9 8s-8.6-2.8-9-8Z" fill="#4E7A74" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7.8 14.2c.2-3.4 2.4-5.4 5-5.2 2 .2 3.2 2 3.2 5.2" fill="#4ADE80" stroke={INK} strokeWidth="1.25" />
      <circle cx="16.8" cy="12.2" r="2.8" fill="#FDE6C4" stroke={INK} strokeWidth="1.2" />
      <circle cx="12.4" cy="12.8" r="2.4" fill="#FDBA74" stroke={INK} strokeWidth="1.2" />
    </svg>
  );
}

// ============================================================================
// 4. BROTH CAULDRON SVG ICON (Hammered Brass Chaoshan Hotpot)
// ============================================================================

export function BrothSvgIcon({
  brothId,
  color = '#C83223',
  secondaryColor = '#F28B30',
  className = 'w-6 h-6',
}: IconProps & { brothId?: string; color?: string; secondaryColor?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
      {/* Rising steam curls */}
      <path
        d="M10.4 7.5c-.6-1.4.4-2.4.9-3.4M14.2 6.8c-.6-1.4.4-2.4.9-3.4M17.8 7.5c-.6-1.4.4-2.4.9-3.4"
        stroke="#F6E6CC"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.78"
      />
      {/* Twin brass handles */}
      <path d="M5.6 13.4c-2.2 0-2.6 3.2-.2 3.8M22.4 13.4c2.2 0 2.6 3.2.2 3.8" stroke="#E8C97A" strokeWidth="1.8" strokeLinecap="round" />
      {/* Brass cauldron body */}
      <path
        d="M5.4 13.2h17.2c-.3 6.2-3.6 9.8-8.6 9.8s-8.3-3.6-8.6-9.8Z"
        fill="#A67432"
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M9.6 22.8h8.8" stroke="#6B4418" strokeWidth="2" strokeLinecap="round" />
      {/* Broth surface */}
      <ellipse cx="14" cy="13.2" rx="8.6" ry="3.6" fill={color} stroke="#E8C97A" strokeWidth="1.5" />
      {/* Signature broth swirl & floating garnish */}
      <ellipse cx="13.6" cy="12.9" rx="5.4" ry="1.8" fill={secondaryColor} opacity="0.65" />
      {brothId === 'spicy_tallow' ? (
        <path d="M10.8 13.2c1.4-.9 3.2-.6 4.4.4M15.8 12.2l1.6 1.2" stroke="#991B1B" strokeWidth="1.5" strokeLinecap="round" />
      ) : brothId === 'spring_bamboo' ? (
        <circle cx="14" cy="13" r="1.4" fill="#ECFDF5" />
      ) : (
        <circle cx="12.2" cy="13" r="1.1" fill="#FEF08A" />
      )}
    </svg>
  );
}

// ============================================================================
// 5. RETRO HUD RESOURCE EMBLEMS (Replacing Generic Line Icons)
// ============================================================================

export type HudResourceKind =
  | 'CASH'
  | 'REPUTATION'
  | 'HYGIENE'
  | 'DISHES'
  | 'COOKED'
  | 'DELIVERY'
  | 'LEVEL'
  | 'HOLIDAY';

export function HudResourceSvgIcon({
  kind,
  className = 'w-4 h-4',
}: IconProps & { kind: HudResourceKind }) {
  switch (kind) {
    case 'CASH':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" fill="#E8B949" stroke={INK} strokeWidth="1.4" />
          <circle cx="12" cy="12" r="6.8" fill="#F7DA82" stroke="#9C6B19" strokeWidth="1" />
          <rect x="9.6" y="9.6" width="4.8" height="4.8" rx="0.6" fill="#2A170D" stroke="#9C6B19" strokeWidth="0.9" />
        </svg>
      );

    case 'REPUTATION':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 20.2C7.4 16.9 4.2 13.8 4.2 9.6A4.4 4.4 0 0 1 12 6.8a4.4 4.4 0 0 1 7.8 2.8c0 4.2-3.2 7.3-7.8 10.6Z"
            fill="#4ADE80"
            stroke={INK}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M8.8 9.2c.6-1 1.7-1.4 2.8-1.2" stroke="#ECFDF5" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );

    case 'HYGIENE':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 3.2l2.1 5.6 5.7 2.1-5.7 2.1L12 18.6l-2.1-5.6-5.7-2.1 5.7-2.1L12 3.2Z"
            fill="#7DD3FC"
            stroke={INK}
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
          <circle cx="18.2" cy="17.8" r="2" fill="#E0F2FE" stroke={INK} strokeWidth="1" />
        </svg>
      );

    case 'DISHES':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <ellipse cx="12" cy="16.6" rx="8.4" ry="3.2" fill="#9BBEC8" stroke={INK} strokeWidth="1.3" />
          <ellipse cx="12" cy="13.2" rx="8.4" ry="3.2" fill="#DCEEF3" stroke={INK} strokeWidth="1.3" />
          <ellipse cx="12" cy="9.8" rx="8.4" ry="3.2" fill="#F8FAFC" stroke={INK} strokeWidth="1.35" />
          <ellipse cx="12" cy="9.8" rx="4.8" ry="1.4" stroke="#3B82A6" strokeWidth="1.1" />
        </svg>
      );

    case 'COOKED':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12.4 3.4c2.8 3.2 6.2 6.2 6.2 10.4a6.6 6.6 0 1 1-13.2 0c0-2.6 1.4-4.9 3.2-6.6.1 1.6.9 2.6 1.8 2.8-.6-2.4.4-4.8 2-6.6Z"
            fill="#F97316"
            stroke={INK}
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
          <path
            d="M12 11.4c1.6 1.5 2.6 2.8 2.6 4.4a2.6 2.6 0 0 1-5.2 0c0-1.6 1-2.9 2.6-4.4Z"
            fill="#FEF08A"
          />
        </svg>
      );

    case 'DELIVERY':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="4" y="6.8" width="16" height="12.4" rx="2" fill="#67B8CE" stroke={INK} strokeWidth="1.4" />
          <path d="M4 11.2h16M12 6.8v12.4" stroke={INK} strokeWidth="1.2" opacity="0.65" />
          <circle cx="12" cy="13" r="2.6" fill="#E0F2FE" stroke={INK} strokeWidth="1.1" />
        </svg>
      );

    case 'LEVEL':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 2.8l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8 2.5-5Z"
            fill="#F6DA8D"
            stroke={INK}
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'HOLIDAY':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="8.8" y="4.2" width="6.4" height="2" rx="0.8" fill="#F6DA8D" stroke={INK} strokeWidth="1.1" />
          <ellipse cx="12" cy="11.4" rx="6.2" ry="5.4" fill="#DC2626" stroke={INK} strokeWidth="1.35" />
          <path d="M12 6v10.8" stroke="#FDE047" strokeWidth="1.1" opacity="0.7" />
          <rect x="9.2" y="16.4" width="5.6" height="2" rx="0.8" fill="#F6DA8D" stroke={INK} strokeWidth="1.1" />
          <line x1="12" y1="18.4" x2="12" y2="21.8" stroke="#F6DA8D" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
  }
}

// ============================================================================
// 6. RETRO CHAOSHAN ORNAMENTAL CORNERS & VERMILION SEAL STAMPS
// ============================================================================

export function ChaoshanCornerOrnament({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    >
      <path
        d="M2 24V4.5C2 3.12 3.12 2 4.5 2H24"
        stroke="#E8C97A"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M2 13.5H10.5C12.16 13.5 13.5 12.16 13.5 10.5V2"
        stroke="#D4A64A"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path
        d="M6 18V8.5C6 7.12 7.12 6 8.5 6H18"
        stroke="#F6DF9B"
        strokeWidth="0.9"
        strokeLinecap="round"
        opacity="0.72"
      />
      <rect x="4.5" y="4.5" width="3.2" height="3.2" rx="0.6" fill="#E8C97A" />
    </svg>
  );
}

export function VermilionSealStamp({
  label,
  size = 'md',
  className = '',
}: {
  label: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dims =
    size === 'sm'
      ? 'w-7 h-7 text-[10px] leading-[1.05]'
      : size === 'lg'
        ? 'w-11 h-11 text-[13px] leading-[1.08]'
        : 'w-9 h-9 text-[11px] leading-[1.05]';
  const chars = Array.from(label).slice(0, 4);
  const isTwoChar = chars.length <= 2;

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-[5px] border-[1.5px] border-[#F0B49E]/80 bg-gradient-to-br from-[#B5281C] via-[#8F1D14] to-[#6B130C] text-[#FFF4E0] font-display font-black shadow-[inset_0_0_0_1.5px_rgba(255,226,184,0.38),0_2px_8px_rgba(0,0,0,0.45)] select-none shrink-0 ${dims} ${className}`}
    >
      {isTwoChar ? (
        <span className="flex flex-col items-center justify-center tracking-tight">
          {chars.map((c, idx) => (
            <span key={idx}>{c}</span>
          ))}
        </span>
      ) : (
        <span className="grid grid-cols-2 gap-x-[1px] text-center">
          {chars.map((c, idx) => (
            <span key={idx}>{c}</span>
          ))}
        </span>
      )}
    </span>
  );
}

