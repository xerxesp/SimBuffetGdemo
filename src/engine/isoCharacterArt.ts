import { CarryItemType, StaffRole } from '../types/game';

const ISO_COS = 0.72;
const ISO_SIN = 0.36;

// Delicate dark sepia architectural ink (ligne claire, matching style_isometric_tycoon)
const INK = '#241A14';
const INK_LIGHT = 'rgba(36, 26, 20, 0.45)';

function w2i(wx: number, wy: number, wz = 0): { x: number; y: number } {
  return {
    x: (wx - wy) * ISO_COS,
    y: (wx + wy) * ISO_SIN - wz,
  };
}

export type IsoCharacterArchetype =
  | 'MANAGER'
  | 'CHEF'
  | 'SUSHI_CHEF'
  | 'HOST'
  | 'SERVER'
  | 'TECHNICIAN'
  | 'CLERK'
  | 'VIP'
  | 'ELDER'
  | 'GUEST';

export type IsoHairStyle = 'SHORT' | 'PARTED' | 'BUN' | 'BOB' | 'ELDER';

export interface IsoCharacterDrawOpts {
  wx: number;
  wy: number;
  archetype?: IsoCharacterArchetype;
  staffRole?: StaffRole;
  bodyColor: string;
  trimColor: string;
  pantsColor?: string;
  hairColor: string;
  hairStyle?: IsoHairStyle;
  skinColor?: string;
  isChef?: boolean;
  isManager?: boolean;
  isVip?: boolean;
  isElder?: boolean;
  seated?: boolean;
  seatFacing?: 'SE' | 'SW' | 'NW' | 'NE';
  walkCycle?: number;
  carrying?: CarryItemType;
  scale?: number;
  highlightRing?: string;
  /** Deterministic seed for subtle variation */
  seed?: number;
}

const GUEST_PALETTES: Array<{
  body: string;
  trim: string;
  pants: string;
  hair: string;
  hairStyle: IsoHairStyle;
}> = [
  { body: '#5C6F82', trim: '#DCE4EC', pants: '#363C44', hair: '#251B16', hairStyle: 'SHORT' },
  { body: '#A46552', trim: '#F4DFC8', pants: '#473D38', hair: '#2A1D16', hairStyle: 'BUN' },
  { body: '#6D826E', trim: '#E5EBDD', pants: '#48433B', hair: '#1F1814', hairStyle: 'BOB' },
  { body: '#8C6278', trim: '#F2DCE6', pants: '#3D353C', hair: '#231915', hairStyle: 'BUN' },
  { body: '#B89668', trim: '#EDE3CE', pants: '#5C4D3D', hair: '#9A9792', hairStyle: 'ELDER' },
  { body: '#4D6A7B', trim: '#D6E4EA', pants: '#2F363D', hair: '#1E1713', hairStyle: 'PARTED' },
  { body: '#9B7C59', trim: '#F2E5CF', pants: '#453A30', hair: '#2D2018', hairStyle: 'SHORT' },
  { body: '#7A5952', trim: '#EEDAD2', pants: '#3A3230', hair: '#201815', hairStyle: 'BOB' },
];

export function getGuestStyleBySeed(seed: number | string) {
  let hash = 0;
  if (typeof seed === 'number') {
    hash = Math.abs(Math.floor(seed));
  } else {
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
  }
  const idx = hash % GUEST_PALETTES.length;
  return GUEST_PALETTES[idx];
}

export function getStaffVisualPreset(role: StaffRole): {
  archetype: IsoCharacterArchetype;
  bodyColor: string;
  trimColor: string;
  pantsColor: string;
  hairColor: string;
  hairStyle: IsoHairStyle;
} {
  switch (role) {
    case 'HOST':
      return {
        archetype: 'HOST',
        bodyColor: '#56978F',
        trimColor: '#E3C27A',
        pantsColor: '#3A5F5A',
        hairColor: '#221814',
        hairStyle: 'BUN',
      };
    case 'CHEF':
      return {
        archetype: 'CHEF',
        bodyColor: '#F6F2E9',
        trimColor: '#E8DFCF',
        pantsColor: '#36393E',
        hairColor: '#221915',
        hairStyle: 'SHORT',
      };
    case 'SUSHI_CHEF':
      return {
        archetype: 'SUSHI_CHEF',
        bodyColor: '#F8F4EC',
        trimColor: '#4E6B7C',
        pantsColor: '#2D353D',
        hairColor: '#1E1612',
        hairStyle: 'SHORT',
      };
    case 'LIVE_MASTER':
      return {
        archetype: 'SERVER',
        bodyColor: '#4F8F88',
        trimColor: '#CBE7E3',
        pantsColor: '#2F4F4D',
        hairColor: '#221914',
        hairStyle: 'PARTED',
      };
    case 'STOCKER':
      return {
        archetype: 'SERVER',
        bodyColor: '#66A398',
        trimColor: '#E5EFEA',
        pantsColor: '#3E5B57',
        hairColor: '#231A15',
        hairStyle: 'BUN',
      };
    case 'RUNNER':
      return {
        archetype: 'SERVER',
        bodyColor: '#5F93A4',
        trimColor: '#E4EFF2',
        pantsColor: '#364A54',
        hairColor: '#241A14',
        hairStyle: 'SHORT',
      };
    case 'BUSSER':
      return {
        archetype: 'SERVER',
        bodyColor: '#6E7F91',
        trimColor: '#E3E8EE',
        pantsColor: '#38414C',
        hairColor: '#251B16',
        hairStyle: 'BOB',
      };
    case 'DISHWASHER':
      return {
        archetype: 'SERVER',
        bodyColor: '#538699',
        trimColor: '#D6E8EE',
        pantsColor: '#30444F',
        hairColor: '#221813',
        hairStyle: 'SHORT',
      };
    case 'SETTER':
      return {
        archetype: 'SERVER',
        bodyColor: '#6AA497',
        trimColor: '#E9DFC5',
        pantsColor: '#3F5C56',
        hairColor: '#231914',
        hairStyle: 'BUN',
      };
    case 'TECHNICIAN':
      return {
        archetype: 'TECHNICIAN',
        bodyColor: '#546270',
        trimColor: '#D9B96A',
        pantsColor: '#323A42',
        hairColor: '#211814',
        hairStyle: 'SHORT',
      };
    case 'INVENTORY_CLERK':
      return {
        archetype: 'CLERK',
        bodyColor: '#9C7348',
        trimColor: '#EFE4CE',
        pantsColor: '#473B30',
        hairColor: '#241B15',
        hairStyle: 'PARTED',
      };
  }
}

function drawCarriedItem(
  ctx: CanvasRenderingContext2D,
  carrying: CarryItemType,
  cx: number,
  cy: number,
  s: number
) {
  ctx.save();
  ctx.lineJoin = 'round';

  if (carrying === 'BROTH_POT') {
    // Gleaming miniature copper dual-flavor hotpot with brass handles
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.85 * s;
    // Left & right brass loop handles
    ctx.beginPath();
    ctx.ellipse(cx - 5.4 * s, cy - 0.6 * s, 1.3 * s, 1.0 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 5.4 * s, cy - 0.6 * s, 1.3 * s, 1.0 * s, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Copper body
    ctx.fillStyle = '#B87433';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 0.9 * s, 5.2 * s, 3.1 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rim
    ctx.fillStyle = '#E2A957';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 0.6 * s, 5.0 * s, 2.7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Spicy red & golden broth halves
    ctx.fillStyle = '#C93824';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 0.6 * s, 4.1 * s, 2.0 * s, 0, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.fillStyle = '#EBB954';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 0.6 * s, 4.1 * s, 2.0 * s, 0, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.fill();
  } else if (carrying === 'SEAFOOD_TRAY') {
    // Oval porcelain platter heaped with oysters, prawns & crab (matches reference server)
    ctx.fillStyle = '#F2EFE8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.85 * s;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 0.4 * s, 6.8 * s, 3.6 * s, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ice bed shimmer
    ctx.fillStyle = '#CFE8EC';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 0.1 * s, 5.5 * s, 2.6 * s, -0.08, 0, Math.PI * 2);
    ctx.fill();

    // Prawns, crab & oysters
    ctx.fillStyle = '#D9643A';
    ctx.beginPath();
    ctx.ellipse(cx - 1.5 * s, cy - 0.7 * s, 2.1 * s, 1.2 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E88B5A';
    ctx.beginPath();
    ctx.ellipse(cx + 1.8 * s, cy - 0.4 * s, 1.9 * s, 1.1 * s, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#DCD9CE';
    ctx.beginPath();
    ctx.ellipse(cx + 0.2 * s, cy + 0.8 * s, 1.6 * s, 0.9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (carrying === 'COOKED_PLATTER') {
    // Dark iron wok / ceramic platter with braised golden seafood
    ctx.fillStyle = '#3C3532';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.85 * s;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 0.4 * s, 5.8 * s, 3.1 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#D87E34';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 0.4 * s, 4.4 * s, 2.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F2C55F';
    ctx.beginPath();
    ctx.arc(cx - 1.4 * s, cy - 0.6 * s, 1.1 * s, 0, Math.PI * 2);
    ctx.arc(cx + 1.5 * s, cy - 0.3 * s, 1.0 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5B8F4E';
    ctx.fillRect(cx - 0.5 * s, cy - 1.3 * s, 1.2 * s, 0.8 * s);
  } else if (carrying === 'DIRTY_DISHES') {
    // Stacked used porcelain bowls & plates
    for (let i = 0; i < 4; i++) {
      const py = cy + 1.8 * s - i * 1.8 * s;
      const tilt = (i % 2 === 0 ? -0.4 : 0.45) * s;
      ctx.fillStyle = i % 2 === 0 ? '#C9C2B6' : '#B5ADA0';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.75 * s;
      ctx.beginPath();
      ctx.ellipse(cx + tilt, py, 4.6 * s, 2.1 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (carrying === 'CLEAN_TABLEWARE') {
    // Gleaming tidy stack of white-celadon porcelain bowls
    for (let i = 0; i < 4; i++) {
      const py = cy + 1.8 * s - i * 1.9 * s;
      ctx.fillStyle = '#FAF8F2';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.75 * s;
      ctx.beginPath();
      ctx.ellipse(cx, py, 4.5 * s, 2.0 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#6FA69E';
      ctx.lineWidth = 0.55 * s;
      ctx.beginPath();
      ctx.ellipse(cx, py - 0.2 * s, 3.4 * s, 1.3 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Slender, realistic 1:4.8 architectural miniature character in Ligne Claire style
 * matching `style_isometric_tycoon` and `tycoon_v2_assets_sheet`.
 */
export function drawIsoCharacter(
  ctx: CanvasRenderingContext2D,
  opts: IsoCharacterDrawOpts
) {
  const s = opts.scale ?? 1;
  const archetype: IsoCharacterArchetype =
    opts.archetype ??
    (opts.isManager
      ? 'MANAGER'
      : opts.isChef
        ? 'CHEF'
        : opts.isVip
          ? 'VIP'
          : opts.isElder
            ? 'ELDER'
            : opts.staffRole
              ? getStaffVisualPreset(opts.staffRole).archetype
              : 'GUEST');

  const p = w2i(opts.wx, opts.wy, opts.seated ? 8.5 : 0);
  const walk = opts.walkCycle ?? 0;
  const bob = opts.seated ? 0 : Math.abs(Math.sin(walk)) * 1.45 * s;
  const stride = opts.seated ? 0 : Math.sin(walk) * 2.3 * s;
  const armSwing = opts.seated ? 0 : Math.sin(walk) * 2.0 * s;

  const skin = opts.skinColor ?? '#EFC9A6';
  const skinShade = '#DDA982';
  const pants =
    opts.pantsColor ??
    (archetype === 'MANAGER'
      ? '#3B3635'
      : archetype === 'VIP'
        ? '#393E45'
        : archetype === 'ELDER'
          ? '#6B5C4B'
          : archetype === 'CHEF' || archetype === 'SUSHI_CHEF'
            ? '#33363B'
            : '#3D484B');
  const hairStyle: IsoHairStyle =
    opts.hairStyle ??
    (archetype === 'ELDER'
      ? 'ELDER'
      : archetype === 'HOST'
        ? 'BUN'
        : archetype === 'MANAGER' || archetype === 'VIP'
          ? 'PARTED'
          : 'SHORT');

  const isCarrying = Boolean(opts.carrying && opts.carrying !== 'NONE');
  const faceDir =
    opts.seatFacing === 'SW' || opts.seatFacing === 'NW' ? -1 : 1;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Optional selection / manager / interactable ground ring
  if (opts.highlightRing) {
    ctx.strokeStyle = opts.highlightRing;
    ctx.lineWidth = 1.45;
    ctx.beginPath();
    ctx.ellipse(0, 0.8, 10.5 * s, 5.2 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Soft elliptical ambient contact shadow
  if (!opts.seated) {
    ctx.fillStyle = 'rgba(20, 14, 10, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 0.8, 7.2 * s, 3.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const lw = Math.max(0.7, 0.88 * s);

  // ==========================================
  // 1. LOWER BODY (SLENDER TAPERED LEGS / SKIRT / SEATED THIGHS)
  // ==========================================
  if (!opts.seated) {
    const legTopY = -14.5 * s - bob;
    const leftFootX = -2.0 * s - stride * 0.7;
    const rightFootX = 2.0 * s + stride * 0.7;
    const leftFootY = -0.6 * s + Math.max(0, stride * 0.25);
    const rightFootY = -0.6 * s + Math.max(0, -stride * 0.25);

    // Shoes (tapered dark leather flats)
    ctx.fillStyle = '#2A221E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(leftFootX - 0.3 * s, leftFootY, 2.0 * s, 1.05 * s, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(rightFootX + 0.5 * s, rightFootY, 2.0 * s, 1.05 * s, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (archetype === 'HOST') {
      // Slender calves visible below tailored qipao skirt hem
      ctx.fillStyle = skin;
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-2.5 * s, -6.5 * s - bob);
      ctx.lineTo(-0.7 * s, -6.5 * s - bob);
      ctx.lineTo(leftFootX + 0.7 * s, leftFootY - 0.5 * s);
      ctx.lineTo(leftFootX - 0.8 * s, leftFootY - 0.5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0.7 * s, -6.5 * s - bob);
      ctx.lineTo(2.5 * s, -6.5 * s - bob);
      ctx.lineTo(rightFootX + 0.8 * s, rightFootY - 0.5 * s);
      ctx.lineTo(rightFootX - 0.7 * s, rightFootY - 0.5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tailored qipao midi skirt with delicate gold hem trim
      ctx.fillStyle = opts.bodyColor;
      ctx.beginPath();
      ctx.moveTo(-3.6 * s, -15.5 * s - bob);
      ctx.lineTo(3.6 * s, -15.5 * s - bob);
      ctx.lineTo(4.0 * s, -6.0 * s - bob);
      ctx.lineTo(-4.0 * s, -6.0 * s - bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold qipao hem piping
      ctx.strokeStyle = opts.trimColor;
      ctx.lineWidth = 1.05 * s;
      ctx.beginPath();
      ctx.moveTo(-3.6 * s, -6.7 * s - bob);
      ctx.lineTo(3.6 * s, -6.7 * s - bob);
      ctx.stroke();
    } else {
      // Left leg trouser
      ctx.fillStyle = pants;
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-3.4 * s, legTopY);
      ctx.lineTo(-0.2 * s, legTopY);
      ctx.lineTo(leftFootX + 1.0 * s, leftFootY - 0.6 * s);
      ctx.lineTo(leftFootX - 1.1 * s, leftFootY - 0.6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right leg trouser
      ctx.beginPath();
      ctx.moveTo(0.2 * s, legTopY);
      ctx.lineTo(3.4 * s, legTopY);
      ctx.lineTo(rightFootX + 1.1 * s, rightFootY - 0.6 * s);
      ctx.lineTo(rightFootX - 1.0 * s, rightFootY - 0.6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // Seated lap / thighs resting neatly on chair cushion
    ctx.fillStyle = pants;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.roundRect(-4.0 * s, -13.2 * s, 8.0 * s, 4.8 * s, 2.0 * s);
    ctx.fill();
    ctx.stroke();
  }

  // ==========================================
  // 2. SLENDER TAILORED TORSO & ROLE ATTIRE
  // ==========================================
  const torsoTop = -26.8 * s - bob;
  const torsoBot = -13.6 * s - bob;

  // Back arm (when not carrying)
  if (!isCarrying && !opts.seated) {
    ctx.fillStyle =
      archetype === 'MANAGER' ? '#F7F4EE' : opts.bodyColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(-4.1 * s, torsoTop + 1.4 * s);
    ctx.lineTo(-5.5 * s - armSwing * 0.4, torsoBot + 1.2 * s);
    ctx.lineTo(-3.8 * s - armSwing * 0.35, torsoBot + 1.6 * s);
    ctx.lineTo(-2.9 * s, torsoTop + 3.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Small hand
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(-4.7 * s - armSwing * 0.4, torsoBot + 2.0 * s, 1.15 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Main tailored torso polygon (natural shoulder-to-waist taper)
  ctx.fillStyle = opts.bodyColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-4.4 * s, torsoTop + 1.2 * s);
  ctx.quadraticCurveTo(0, torsoTop - 0.4 * s, 4.4 * s, torsoTop + 1.2 * s);
  ctx.lineTo(3.8 * s, torsoBot);
  ctx.lineTo(-3.8 * s, torsoBot);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Subtle shaded right half for crisp architectural 3D form
  ctx.fillStyle = 'rgba(24, 16, 12, 0.11)';
  ctx.beginPath();
  ctx.moveTo(0.5 * s, torsoTop + 0.5 * s);
  ctx.lineTo(4.3 * s, torsoTop + 1.2 * s);
  ctx.lineTo(3.7 * s, torsoBot);
  ctx.lineTo(0.4 * s, torsoBot);
  ctx.closePath();
  ctx.fill();

  // Role-specific clothing details
  if (archetype === 'MANAGER') {
    // Crisp white shirt V-collar + dark burgundy vest + bow tie + brass buttons
    ctx.fillStyle = '#FAF7F0';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(-1.8 * s, torsoTop + 0.2 * s);
    ctx.lineTo(1.8 * s, torsoTop + 0.2 * s);
    ctx.lineTo(0, torsoTop + 4.4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dark bow-tie at neck
    ctx.fillStyle = '#2B1F1B';
    ctx.beginPath();
    ctx.moveTo(-1.7 * s, torsoTop + 0.7 * s);
    ctx.lineTo(0, torsoTop + 1.4 * s);
    ctx.lineTo(1.7 * s, torsoTop + 0.7 * s);
    ctx.lineTo(1.7 * s, torsoTop + 2.1 * s);
    ctx.lineTo(0, torsoTop + 1.5 * s);
    ctx.lineTo(-1.7 * s, torsoTop + 2.1 * s);
    ctx.closePath();
    ctx.fill();

    // 3 tiny brass vest buttons
    ctx.fillStyle = '#E8C97A';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, torsoTop + 5.6 * s + i * 2.4 * s, 0.55 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (archetype === 'CHEF' || archetype === 'SUSHI_CHEF') {
    // Double-breasted white chef coat wrap + two neat button columns + waist apron
    ctx.strokeStyle = INK_LIGHT;
    ctx.lineWidth = lw * 0.75;
    ctx.beginPath();
    ctx.moveTo(-1.5 * s, torsoTop + 0.8 * s);
    ctx.lineTo(1.1 * s, torsoTop + 3.2 * s);
    ctx.lineTo(1.1 * s, torsoBot - 1.5 * s);
    ctx.stroke();

    // Double-breasted buttons
    ctx.fillStyle = '#3B3430';
    for (let i = 0; i < 3; i++) {
      const by = torsoTop + 3.8 * s + i * 2.2 * s;
      ctx.beginPath();
      ctx.arc(-1.1 * s, by, 0.48 * s, 0, Math.PI * 2);
      ctx.arc(1.2 * s, by, 0.48 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp waist apron extending down over trousers
    if (!opts.seated) {
      ctx.fillStyle = archetype === 'SUSHI_CHEF' ? '#496373' : '#EFECE4';
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.85;
      ctx.beginPath();
      ctx.rect(-3.4 * s, torsoBot - 1.8 * s, 6.8 * s, 7.6 * s);
      ctx.fill();
      ctx.stroke();
      // Waistband tie line
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.moveTo(-3.8 * s, torsoBot - 1.8 * s);
      ctx.lineTo(3.8 * s, torsoBot - 1.8 * s);
      ctx.stroke();
    }
  } else if (archetype === 'HOST') {
    // Mandarin collar & diagonal frog clasp + tiny gold name tag
    ctx.strokeStyle = opts.trimColor;
    ctx.lineWidth = 0.85 * s;
    ctx.beginPath();
    ctx.moveTo(-1.8 * s, torsoTop + 0.8 * s);
    ctx.quadraticCurveTo(0, torsoTop + 1.8 * s, 2.4 * s, torsoTop + 3.8 * s);
    ctx.stroke();

    // Gold name pin
    ctx.fillStyle = '#E8C97A';
    ctx.fillRect(1.1 * s, torsoTop + 4.3 * s, 1.8 * s, 0.9 * s);
  } else if (archetype === 'SERVER') {
    // Celadon Chinese-collar tunic with diagonal placket & neat tunic hem
    ctx.strokeStyle = INK_LIGHT;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ctx.moveTo(-1.3 * s, torsoTop + 0.8 * s);
    ctx.lineTo(2.1 * s, torsoTop + 3.4 * s);
    ctx.lineTo(2.1 * s, torsoBot - 0.4 * s);
    ctx.stroke();

    // Subtle fabric apron for dishwashers/bussers/stockers
    if (
      !opts.seated &&
      (opts.staffRole === 'DISHWASHER' || opts.staffRole === 'BUSSER' || opts.staffRole === 'STOCKER')
    ) {
      ctx.fillStyle = opts.trimColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.75;
      ctx.fillRect(-3.1 * s, torsoBot - 2.0 * s, 6.2 * s, 5.2 * s);
      ctx.strokeRect(-3.1 * s, torsoBot - 2.0 * s, 6.2 * s, 5.2 * s);
    }
  } else if (archetype === 'VIP') {
    // Charcoal tailored suit lapels + crisp white shirt + dark silk tie
    ctx.fillStyle = '#F7F5F0';
    ctx.beginPath();
    ctx.moveTo(-1.7 * s, torsoTop + 0.4 * s);
    ctx.lineTo(1.7 * s, torsoTop + 0.4 * s);
    ctx.lineTo(0, torsoTop + 6.2 * s);
    ctx.closePath();
    ctx.fill();

    // Silk tie
    ctx.fillStyle = '#2B2F36';
    ctx.beginPath();
    ctx.moveTo(-0.55 * s, torsoTop + 1.0 * s);
    ctx.lineTo(0.55 * s, torsoTop + 1.0 * s);
    ctx.lineTo(0.35 * s, torsoTop + 5.8 * s);
    ctx.lineTo(0, torsoTop + 6.6 * s);
    ctx.lineTo(-0.35 * s, torsoTop + 5.8 * s);
    ctx.closePath();
    ctx.fill();

    // Subtle gold pocket square accent
    ctx.fillStyle = '#E8C97A';
    ctx.fillRect(1.5 * s, torsoTop + 4.4 * s, 1.5 * s, 0.75 * s);
  } else if (archetype === 'ELDER') {
    // Open camel jacket over muted olive shirt (matches Elderly Connoisseur Diner!)
    ctx.fillStyle = '#7C8A6D';
    ctx.fillRect(-1.5 * s, torsoTop + 0.6 * s, 3.0 * s, 11.8 * s);
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.75;
    ctx.beginPath();
    ctx.moveTo(-1.5 * s, torsoTop + 0.6 * s);
    ctx.lineTo(-1.5 * s, torsoBot);
    ctx.moveTo(1.5 * s, torsoTop + 0.6 * s);
    ctx.lineTo(1.5 * s, torsoBot);
    ctx.stroke();
  } else {
    // Refined casual collar / cardigan V-neck
    ctx.fillStyle = opts.trimColor;
    ctx.beginPath();
    ctx.moveTo(-1.7 * s, torsoTop + 0.5 * s);
    ctx.lineTo(1.7 * s, torsoTop + 0.5 * s);
    ctx.lineTo(0, torsoTop + 3.6 * s);
    ctx.closePath();
    ctx.fill();
  }

  // Front arm (either natural swing, seated dining posture, or cradling carried item)
  if (!isCarrying) {
    ctx.fillStyle = archetype === 'MANAGER' ? '#F7F4EE' : opts.bodyColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    if (opts.seated) {
      // Forearm angled toward table holding chopsticks
      ctx.beginPath();
      ctx.moveTo(faceDir * 3.4 * s, torsoTop + 2.2 * s);
      ctx.lineTo(faceDir * 5.8 * s, torsoTop + 7.2 * s);
      ctx.lineTo(faceDir * 4.2 * s, torsoTop + 8.3 * s);
      ctx.lineTo(faceDir * 2.1 * s, torsoTop + 4.5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tiny hand & delicate wooden chopsticks
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(faceDir * 5.2 * s, torsoTop + 7.8 * s, 1.05 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6B4423';
      ctx.lineWidth = 0.65 * s;
      ctx.beginPath();
      ctx.moveTo(faceDir * 5.0 * s, torsoTop + 7.6 * s);
      ctx.lineTo(faceDir * 9.0 * s, torsoTop + 8.9 * s);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(3.9 * s, torsoTop + 1.5 * s);
      ctx.lineTo(5.3 * s + armSwing * 0.4, torsoBot + 1.0 * s);
      ctx.lineTo(3.6 * s + armSwing * 0.35, torsoBot + 1.5 * s);
      ctx.lineTo(2.7 * s, torsoTop + 3.4 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(4.5 * s + armSwing * 0.4, torsoBot + 1.8 * s, 1.15 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // Both arms angled forward cradling carried item
    ctx.fillStyle = archetype === 'MANAGER' ? '#F7F4EE' : opts.bodyColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(3.4 * s, torsoTop + 2.0 * s);
    ctx.lineTo(6.6 * s, torsoTop + 7.4 * s);
    ctx.lineTo(5.0 * s, torsoTop + 8.6 * s);
    ctx.lineTo(2.2 * s, torsoTop + 4.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    drawCarriedItem(ctx, opts.carrying!, 7.5 * s, torsoTop + 7.0 * s, s);
  }

  // ==========================================
  // 3. SLENDER REALISTIC HEAD, HAIR & TOQUE (1:4.8 RATIO)
  // ==========================================
  const neckY = torsoTop + 0.3 * s;
  const headY = -31.8 * s - bob;

  // Slender neck
  ctx.fillStyle = skinShade;
  ctx.fillRect(-1.1 * s, neckY - 2.1 * s, 2.2 * s, 2.5 * s);

  // Back hair silhouette for BUN / BOB styles (behind head)
  if (hairStyle === 'BUN') {
    ctx.fillStyle = opts.hairColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(-2.6 * s * faceDir, headY - 0.6 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (hairStyle === 'BOB') {
    ctx.fillStyle = opts.hairColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(0, headY + 0.4 * s, 4.1 * s, 4.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Realistic oval face
  ctx.fillStyle = skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.ellipse(0, headY, 3.35 * s, 4.05 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair cap / bangs
  ctx.fillStyle = opts.hairColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  if (hairStyle === 'ELDER') {
    // Silver-grey combed-back hairline with high forehead
    ctx.beginPath();
    ctx.arc(0, headY - 0.8 * s, 3.45 * s, Math.PI * 1.08, Math.PI * 1.92);
    ctx.quadraticCurveTo(0, headY - 2.9 * s, -3.3 * s, headY - 1.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (hairStyle === 'PARTED') {
    // Sleek side-parted hair (Manager / VIP)
    ctx.beginPath();
    ctx.arc(0, headY - 0.7 * s, 3.6 * s, Math.PI * 0.94, Math.PI * 2.06);
    ctx.quadraticCurveTo(1.2 * s, headY - 2.3 * s, -1.2 * s, headY - 1.5 * s);
    ctx.quadraticCurveTo(-2.7 * s, headY - 1.2 * s, -3.5 * s, headY - 0.1 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, headY - 0.7 * s, 3.55 * s, Math.PI * 0.92, Math.PI * 2.08);
    ctx.quadraticCurveTo(0, headY - 1.8 * s, -3.45 * s, headY - 0.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Delicate facial features (subtle eyes; tiny spectacles for ELDER)
  ctx.fillStyle = INK;
  const eyeX = 0.55 * faceDir * s;
  ctx.fillRect(eyeX - 1.55 * s, headY + 0.1 * s, 0.85 * s, 1.05 * s);
  ctx.fillRect(eyeX + 0.75 * s, headY + 0.1 * s, 0.85 * s, 1.05 * s);

  if (archetype === 'ELDER') {
    // Delicate wire-rim spectacles
    ctx.strokeStyle = '#3B3028';
    ctx.lineWidth = 0.55 * s;
    ctx.beginPath();
    ctx.arc(eyeX - 1.15 * s, headY + 0.55 * s, 1.05 * s, 0, Math.PI * 2);
    ctx.arc(eyeX + 1.15 * s, headY + 0.55 * s, 1.05 * s, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Tall pleated white Chef Toque (matching Head Chef in reference sheet!)
  if (archetype === 'CHEF' || archetype === 'SUSHI_CHEF') {
    const hatBaseY = headY - 2.8 * s;
    ctx.fillStyle = '#FAF6EE';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    // Tall cylindrical pleated crown
    ctx.beginPath();
    ctx.moveTo(-3.2 * s, hatBaseY);
    ctx.lineTo(-3.6 * s, hatBaseY - 7.0 * s);
    ctx.quadraticCurveTo(0, hatBaseY - 8.4 * s, 3.6 * s, hatBaseY - 7.0 * s);
    ctx.lineTo(3.2 * s, hatBaseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Headband cuff
    ctx.fillStyle = '#EDE6D8';
    ctx.fillRect(-3.2 * s, hatBaseY - 2.0 * s, 6.4 * s, 2.0 * s);
    ctx.strokeRect(-3.2 * s, hatBaseY - 2.0 * s, 6.4 * s, 2.0 * s);

    // Delicate vertical pleats
    ctx.strokeStyle = INK_LIGHT;
    ctx.lineWidth = 0.55 * s;
    for (const px of [-1.6, 0, 1.6]) {
      ctx.beginPath();
      ctx.moveTo(px * s, hatBaseY - 2.2 * s);
      ctx.lineTo(px * 1.08 * s, hatBaseY - 6.8 * s);
      ctx.stroke();
    }
  }

  // Subtle VIP golden lapel/halo accent (refined, never cartoony)
  if (opts.isVip) {
    ctx.strokeStyle = 'rgba(232, 201, 122, 0.85)';
    ctx.lineWidth = 1.0 * s;
    ctx.beginPath();
    ctx.ellipse(0, 0.8, 9.2 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}
