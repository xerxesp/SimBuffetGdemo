import { CarryItemType, CustomerParty, StaffRole } from '../types/game';
import { IsoAnimState, IsoFacing, sampleIsoPose } from './isoCharacterAnimations';

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

/**
 * Canonical standing character height in world-iso Z units (calibrated to 74z cutaway walls,
 * 21.5z dining tabletops, and 25–40z buffet counters). Future redrawn character sprites will
 * anchor directly to this exact height and foot-center pivot for drop-in replacement.
 */
export const CANONICAL_ISO_CHARACTER_HEIGHT_Z = 48;
/** Vector rig crown height at scale=1.0 is ~35.8z; 1.32x lifts standing characters cleanly to ~47.3z */
export const ISO_CHARACTER_BASE_SCALE = 1.32;
/** Subtle horizontal silhouette fullness (+9%) harmonizing vector figures with hand-drawn furniture volume */
export const ISO_CHARACTER_WIDTH_RATIO = 1.09;

export const ISO_CHARACTER_ROLE_SCALE = {
  MANAGER: 1.05,
  STAFF: 1.0,
  BACKSTAGE_NPC: 1.02,
  QUEUE_GUEST: 0.98,
  SEATED_GUEST: 0.96,
} as const;

/** Computes world-iso Z anchor above a character's crown for name tags, patience bars & chat bubbles. */
export function getIsoCharacterHeadAnchorZ(roleScale = 1.0, extraZ = 8): number {
  return Math.round(CANONICAL_ISO_CHARACTER_HEIGHT_Z * roleScale + extraZ);
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
  | 'HEIRESS'
  | 'INSPECTOR'
  | 'FOODIE'
  | 'GUEST';

export type IsoHairStyle = 'SHORT' | 'PARTED' | 'BUN' | 'BOB' | 'ELDER' | 'BERET';

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
  /** 4-direction isometric facing ('SE' | 'SW' | 'NE' | 'NW'). Falls back to seatFacing if omitted. */
  facing?: IsoFacing;
  seatFacing?: 'SE' | 'SW' | 'NW' | 'NE';
  /** Active isometric sprite animation sequence */
  animState?: IsoAnimState;
  /** Clock / phase in seconds for sampling animation sequence frames */
  animTime?: number;
  walkCycle?: number;
  carrying?: CarryItemType;
  /** Optional 0..1 patience ratio for expressive customer queue/dining reactions */
  patienceRatio?: number;
  scale?: number;
  highlightRing?: string;
  /** Deterministic seed for subtle variation */
  seed?: number;
}

const GUEST_PALETTES: Array<{
  archetype: IsoCharacterArchetype;
  body: string;
  trim: string;
  pants: string;
  hair: string;
  hairStyle: IsoHairStyle;
}> = [
  { archetype: 'GUEST', body: '#5C6F82', trim: '#DCE4EC', pants: '#363C44', hair: '#251B16', hairStyle: 'SHORT' },
  { archetype: 'GUEST', body: '#A46552', trim: '#F4DFC8', pants: '#473D38', hair: '#2A1D16', hairStyle: 'BUN' },
  { archetype: 'GUEST', body: '#6D826E', trim: '#E5EBDD', pants: '#48433B', hair: '#1F1814', hairStyle: 'BOB' },
  { archetype: 'FOODIE', body: '#B86E4B', trim: '#F6E6CF', pants: '#423934', hair: '#2A1D17', hairStyle: 'BERET' },
  { archetype: 'GUEST', body: '#8C6278', trim: '#F2DCE6', pants: '#3D353C', hair: '#231915', hairStyle: 'BUN' },
  { archetype: 'ELDER', body: '#B89668', trim: '#EDE3CE', pants: '#5C4D3D', hair: '#9A9792', hairStyle: 'ELDER' },
  { archetype: 'GUEST', body: '#4D6A7B', trim: '#D6E4EA', pants: '#2F363D', hair: '#1E1713', hairStyle: 'PARTED' },
  { archetype: 'GUEST', body: '#9B7C59', trim: '#F2E5CF', pants: '#453A30', hair: '#2D2018', hairStyle: 'SHORT' },
  { archetype: 'GUEST', body: '#7A5952', trim: '#EEDAD2', pants: '#3A3230', hair: '#201815', hairStyle: 'BOB' },
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

/**
 * Resolves a CustomerParty's lead visual archetype and curated style_isometric_tycoon palette.
 */
export function resolveCustomerVisual(party: CustomerParty, seed: string): {
  archetype: IsoCharacterArchetype;
  bodyColor: string;
  trimColor: string;
  pantsColor: string;
  hairColor: string;
  hairStyle: IsoHairStyle;
} {
  if (party.specialStoryId === 'master_zhou' || party.specialStoryId === 'critic_shen') {
    return {
      archetype: 'ELDER',
      bodyColor: party.specialStoryId === 'critic_shen' ? '#8B7963' : '#B89668',
      trimColor: '#EDE3CE',
      pantsColor: '#56493B',
      hairColor: '#A19E98',
      hairStyle: 'ELDER',
    };
  }
  if (party.specialStoryId === 'heiress_gu' || party.isSuperCustomer) {
    return {
      archetype: 'HEIRESS',
      bodyColor: '#8B3A4A',
      trimColor: '#F5E4C8',
      pantsColor: '#48242B',
      hairColor: '#1E1512',
      hairStyle: 'BUN',
    };
  }
  if (party.specialStoryId === 'inspector_cheng') {
    return {
      archetype: 'INSPECTOR',
      bodyColor: '#3E5163',
      trimColor: '#E5EDF2',
      pantsColor: '#2A3540',
      hairColor: '#221C18',
      hairStyle: 'PARTED',
    };
  }
  if (party.isVip) {
    return {
      archetype: 'VIP',
      bodyColor: '#3E454D',
      trimColor: '#F4F1EA',
      pantsColor: '#31363D',
      hairColor: '#1D1714',
      hairStyle: 'PARTED',
    };
  }
  const base = getGuestStyleBySeed(seed);
  return {
    archetype: base.archetype,
    bodyColor: base.body,
    trimColor: base.trim,
    pantsColor: base.pants,
    hairColor: base.hair,
    hairStyle: base.hairStyle,
  };
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
  s: number,
  animTime: number,
  tilt = 0
) {
  ctx.save();
  ctx.translate(cx, cy);
  if (tilt !== 0) ctx.rotate(tilt);
  ctx.lineJoin = 'round';

  if (carrying === 'BROTH_POT') {
    // Gleaming miniature copper dual-flavor hotpot with brass handles + rising steam curls!
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.85 * s;
    ctx.beginPath();
    ctx.ellipse(-5.4 * s, -0.6 * s, 1.3 * s, 1.0 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(5.4 * s, -0.6 * s, 1.3 * s, 1.0 * s, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Copper body
    ctx.fillStyle = '#B87433';
    ctx.beginPath();
    ctx.ellipse(0, 0.9 * s, 5.2 * s, 3.1 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rim
    ctx.fillStyle = '#E2A957';
    ctx.beginPath();
    ctx.ellipse(0, -0.6 * s, 5.0 * s, 2.7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Spicy red & golden broth halves
    ctx.fillStyle = '#C93824';
    ctx.beginPath();
    ctx.ellipse(0, -0.6 * s, 4.1 * s, 2.0 * s, 0, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.fillStyle = '#EBB954';
    ctx.beginPath();
    ctx.ellipse(0, -0.6 * s, 4.1 * s, 2.0 * s, 0, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.fill();

    // Animated rising translucent steam curls right off the carried pot!
    for (let i = 0; i < 2; i++) {
      const t = (animTime * 1.45 + i * 0.52) % 1;
      const sx = (i === 0 ? -1.6 : 1.7) * s + Math.sin(animTime * 5 + i * 3) * 1.2 * s;
      const sy = -2.8 * s - t * 8.5 * s;
      ctx.strokeStyle = `rgba(255, 250, 240, ${((1 - t) * 0.72).toFixed(2)})`;
      ctx.lineWidth = 1.05 * s;
      ctx.beginPath();
      ctx.arc(sx, sy, (1.2 + t * 1.4) * s, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (carrying === 'SEAFOOD_TRAY') {
    // Oval porcelain platter heaped with oysters, prawns & crab (matches reference server)
    ctx.fillStyle = '#F2EFE8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.85 * s;
    ctx.beginPath();
    ctx.ellipse(0, 0.4 * s, 6.8 * s, 3.6 * s, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ice bed shimmer
    ctx.fillStyle = '#CFE8EC';
    ctx.beginPath();
    ctx.ellipse(0, -0.1 * s, 5.5 * s, 2.6 * s, -0.08, 0, Math.PI * 2);
    ctx.fill();

    // Prawns, crab & oysters
    ctx.fillStyle = '#D9643A';
    ctx.beginPath();
    ctx.ellipse(-1.5 * s, -0.7 * s, 2.1 * s, 1.2 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E88B5A';
    ctx.beginPath();
    ctx.ellipse(1.8 * s, -0.4 * s, 1.9 * s, 1.1 * s, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#DCD9CE';
    ctx.beginPath();
    ctx.ellipse(0.2 * s, 0.8 * s, 1.6 * s, 0.9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (carrying === 'COOKED_PLATTER') {
    // Dark iron wok / ceramic platter with braised golden seafood + savory wisp
    ctx.fillStyle = '#3C3532';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.85 * s;
    ctx.beginPath();
    ctx.ellipse(0, 0.4 * s, 5.8 * s, 3.1 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#D87E34';
    ctx.beginPath();
    ctx.ellipse(0, -0.4 * s, 4.4 * s, 2.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F2C55F';
    ctx.beginPath();
    ctx.arc(-1.4 * s, -0.6 * s, 1.1 * s, 0, Math.PI * 2);
    ctx.arc(1.5 * s, -0.3 * s, 1.0 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5B8F4E';
    ctx.fillRect(-0.5 * s, -1.3 * s, 1.2 * s, 0.8 * s);

    const t = (animTime * 1.2) % 1;
    ctx.strokeStyle = `rgba(255, 246, 232, ${((1 - t) * 0.58).toFixed(2)})`;
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.arc(Math.sin(animTime * 4) * s, -2.5 * s - t * 6.5 * s, (1.0 + t * 1.2) * s, 0, Math.PI * 2);
    ctx.stroke();
  } else if (carrying === 'DIRTY_DISHES') {
    for (let i = 0; i < 4; i++) {
      const py = 1.8 * s - i * 1.8 * s;
      const shift = (i % 2 === 0 ? -0.4 : 0.45) * s;
      ctx.fillStyle = i % 2 === 0 ? '#C9C2B6' : '#B5ADA0';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.75 * s;
      ctx.beginPath();
      ctx.ellipse(shift, py, 4.6 * s, 2.1 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (carrying === 'CLEAN_TABLEWARE') {
    for (let i = 0; i < 4; i++) {
      const py = 1.8 * s - i * 1.9 * s;
      ctx.fillStyle = '#FAF8F2';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.75 * s;
      ctx.beginPath();
      ctx.ellipse(0, py, 4.5 * s, 2.0 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#6FA69E';
      ctx.lineWidth = 0.55 * s;
      ctx.beginPath();
      ctx.ellipse(0, py - 0.2 * s, 3.4 * s, 1.3 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draws an articulated 2-segment Ligne Claire arm from shoulder (sx, sy) to hand (hx, hy)
 * with matching sleeve fill, skin hand, and subtle cuff detail.
 */
function drawArmSegment(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  hx: number,
  hy: number,
  sleeveColor: string,
  skinColor: string,
  s: number,
  lw: number,
  shortSleeve = false
) {
  const dx = hx - sx;
  const dy = hy - sy;
  const len = Math.max(0.1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const wTop = 1.15 * s;
  const wBot = 0.92 * s;

  if (shortSleeve) {
    const midX = sx + dx * 0.48;
    const midY = sy + dy * 0.48;
    // Bare forearm
    ctx.fillStyle = skinColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(midX + nx * wBot, midY + ny * wBot);
    ctx.lineTo(hx + nx * wBot * 0.85, hy + ny * wBot * 0.85);
    ctx.lineTo(hx - nx * wBot * 0.85, hy - ny * wBot * 0.85);
    ctx.lineTo(midX - nx * wBot, midY - ny * wBot);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Short sleeve cap
    ctx.fillStyle = sleeveColor;
    ctx.beginPath();
    ctx.moveTo(sx + nx * wTop, sy + ny * wTop);
    ctx.lineTo(midX + nx * wTop * 0.95, midY + ny * wTop * 0.95);
    ctx.lineTo(midX - nx * wTop * 0.95, midY - ny * wTop * 0.95);
    ctx.lineTo(sx - nx * wTop, sy - ny * wTop);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = sleeveColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(sx + nx * wTop, sy + ny * wTop);
    ctx.lineTo(hx + nx * wBot, hy + ny * wBot);
    ctx.lineTo(hx - nx * wBot, hy - ny * wBot);
    ctx.lineTo(sx - nx * wTop, sy - ny * wTop);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Hand
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.85;
  ctx.beginPath();
  ctx.arc(hx, hy, 1.15 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * Draws interactive action props & micro-VFX tightly coupled to the current sprite animation frame
 * (washing soap splashes, welcoming sparkle, wok toss, chef knife chop, wiping cloth, queue menu/fan/clipboard).
 */
function drawInteractiveActionProp(
  ctx: CanvasRenderingContext2D,
  animState: IsoAnimState,
  archetype: IsoCharacterArchetype,
  carrying: CarryItemType | undefined,
  dirX: number,
  torsoTop: number,
  frontHandX: number,
  frontHandY: number,
  pose: ReturnType<typeof sampleIsoPose>,
  animTime: number,
  s: number,
  lw: number
) {
  if (carrying && carrying !== 'NONE') {
    const px = dirX * (pose.propX || 7.2) * s + dirX * pose.torsoLean * s;
    const py = torsoTop + (pose.propY || 6.6) * s;
    drawCarriedItem(ctx, carrying, px, py, s, animTime, dirX * pose.propTilt);
    return;
  }

  if (animState === 'WASH_DISHES') {
    // Scrubbing porcelain plate + sparkling soap suds & flying aqua splash droplets!
    const bx = frontHandX + dirX * 1.4 * s;
    const by = frontHandY + 0.5 * s;
    ctx.fillStyle = '#FAF8F2';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.75;
    ctx.beginPath();
    ctx.ellipse(bx, by, 3.6 * s, 1.8 * s, 0.15 * dirX, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Animated soap bubbles & water droplets
    for (let i = 0; i < 4; i++) {
      const ph = (animTime * 2.6 + i * 0.27) % 1;
      const sx = bx + (i - 1.5) * 2.4 * s * dirX;
      const sy = by - ph * 7.5 * s;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(240, 252, 255, 0.9)' : 'rgba(125, 211, 252, 0.85)';
      ctx.beginPath();
      ctx.arc(sx, sy, (0.75 + (1 - ph) * 0.85) * s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (animState === 'WELCOME_GUEST') {
    // Warm golden hospitality flourish sparkle near outstretched welcoming hand
    if (pose.fxPhase > 0.3 && pose.fxPhase < 0.88) {
      const sp = Math.sin(((pose.fxPhase - 0.3) / 0.58) * Math.PI);
      const gx = frontHandX + dirX * 2.8 * s;
      const gy = frontHandY - 2.6 * s;
      const r = 2.6 * sp * s;
      ctx.strokeStyle = `rgba(253, 224, 108, ${(0.92 * sp).toFixed(2)})`;
      ctx.lineWidth = 1.0 * s;
      ctx.beginPath();
      ctx.moveTo(gx - r, gy);
      ctx.lineTo(gx + r, gy);
      ctx.moveTo(gx, gy - r);
      ctx.lineTo(gx, gy + r);
      ctx.stroke();
    }
  } else if (animState === 'COOK_WOK') {
    // Heavy cast-iron wok + ladle + warm flame glow & sizzling steam!
    const wx = dirX * (pose.propX || 8.0) * s + dirX * pose.torsoLean * s;
    const wy = torsoTop + (pose.propY || 7.2) * s;
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(dirX * pose.propTilt);
    // Warm flame reflection under wok
    ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 2.2 * s, 5.4 * s, 2.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cast-iron wok pan
    ctx.fillStyle = '#36312F';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.9;
    ctx.beginPath();
    ctx.ellipse(0, 0.4 * s, 5.2 * s, 2.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Golden sizzling seafood contents tossing slightly
    ctx.fillStyle = '#E58A36';
    ctx.beginPath();
    ctx.ellipse(0, -0.4 * s, 3.6 * s, 1.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wok handle & ladle
    ctx.strokeStyle = '#524034';
    ctx.lineWidth = 1.3 * s;
    ctx.beginPath();
    ctx.moveTo(-dirX * 4.5 * s, 0);
    ctx.lineTo(-dirX * 8.2 * s, -0.8 * s);
    ctx.stroke();
    // Rising wok-hei steam puff
    const t = (animTime * 2.1) % 1;
    ctx.strokeStyle = `rgba(255, 246, 232, ${((1 - t) * 0.72).toFixed(2)})`;
    ctx.lineWidth = 1.0 * s;
    ctx.beginPath();
    ctx.arc(Math.sin(animTime * 6) * 1.2 * s, -2.5 * s - t * 7.5 * s, (1.1 + t * 1.5) * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (animState === 'PREP_CHOP') {
    // Gleaming steel chef / yanagiba knife chopping rhythmically
    ctx.save();
    ctx.translate(frontHandX, frontHandY);
    ctx.rotate(dirX * pose.propTilt);
    ctx.fillStyle = '#E2EAEF';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.75;
    ctx.beginPath();
    ctx.moveTo(0, -0.6 * s);
    ctx.lineTo(dirX * 5.8 * s, -1.2 * s);
    ctx.lineTo(dirX * 5.2 * s, 1.3 * s);
    ctx.lineTo(0, 1.0 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (animState === 'CLEAR_WIPE') {
    // White linen wiping cloth + clean sparkle
    ctx.fillStyle = '#F7F4EC';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.roundRect(frontHandX - 2.0 * s, frontHandY - 1.2 * s, 4.0 * s, 2.5 * s, 0.8 * s);
    ctx.fill();
    ctx.stroke();
    if (pose.fxPhase > 0.45 && pose.fxPhase < 0.85) {
      const gx = frontHandX + dirX * 2.6 * s;
      const gy = frontHandY - 2.4 * s;
      ctx.strokeStyle = '#BAE6FD';
      ctx.lineWidth = 0.85 * s;
      ctx.beginPath();
      ctx.moveTo(gx - 1.8 * s, gy);
      ctx.lineTo(gx + 1.8 * s, gy);
      ctx.moveTo(gx, gy - 1.8 * s);
      ctx.lineTo(gx, gy + 1.8 * s);
      ctx.stroke();
    }
  } else if (animState === 'SERVE_POT') {
    const px = dirX * (pose.propX || 8.0) * s + dirX * pose.torsoLean * s;
    const py = torsoTop + (pose.propY || 7.6) * s;
    drawCarriedItem(ctx, 'BROTH_POT', px, py, s, animTime, 0);
  } else if (animState === 'QUEUE_WAIT') {
    // Distinct customer props matching tycoon_v2_assets_sheet!
    if (archetype === 'VIP') {
      // Open leather-bound menu held in both hands (exact match to VIP Guest in reference sheet!)
      ctx.fillStyle = '#7C5336';
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(frontHandX - 1.8 * s, frontHandY - 3.6 * s);
      ctx.lineTo(frontHandX + dirX * 3.4 * s, frontHandY - 2.8 * s);
      ctx.lineTo(frontHandX + dirX * 2.8 * s, frontHandY + 1.4 * s);
      ctx.lineTo(frontHandX - 2.2 * s, frontHandY + 0.6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Cream inner page edge
      ctx.strokeStyle = '#F6EFE0';
      ctx.lineWidth = 0.65 * s;
      ctx.beginPath();
      ctx.moveTo(frontHandX - 1.2 * s, frontHandY - 3.0 * s);
      ctx.lineTo(frontHandX + dirX * 2.6 * s, frontHandY - 2.3 * s);
      ctx.stroke();
    } else if (archetype === 'HEIRESS') {
      // Delicate cream-gold folding silk fan swaying gently
      const fanSway = Math.sin(animTime * 4.0) * 0.25;
      ctx.save();
      ctx.translate(frontHandX, frontHandY);
      ctx.rotate(fanSway);
      ctx.fillStyle = '#F5E7CE';
      ctx.strokeStyle = '#B88940';
      ctx.lineWidth = lw * 0.75;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 4.4 * s, -Math.PI * 0.82, -Math.PI * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (archetype === 'INSPECTOR') {
      // Wooden hygiene inspection clipboard
      ctx.fillStyle = '#9D7348';
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.75;
      ctx.fillRect(frontHandX - 1.8 * s, frontHandY - 3.2 * s, 3.8 * s, 4.8 * s);
      ctx.strokeRect(frontHandX - 1.8 * s, frontHandY - 3.2 * s, 3.8 * s, 4.8 * s);
      ctx.fillStyle = '#FAF8F2';
      ctx.fillRect(frontHandX - 1.2 * s, frontHandY - 2.5 * s, 2.6 * s, 3.5 * s);
    }
  }
}

/**
 * Slender, realistic 1:4.8 architectural miniature character in Ligne Claire style
 * matching `style_isometric_tycoon_1795613182427` and `tycoon_v2_assets_sheet`,
 * powered by 4-direction isometric multi-frame sprite animation sequences.
 */
export function drawIsoCharacter(
  ctx: CanvasRenderingContext2D,
  opts: IsoCharacterDrawOpts
) {
  const roleScale = opts.scale ?? 1;
  const s = roleScale * ISO_CHARACTER_BASE_SCALE;
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

  const facing: IsoFacing = opts.facing ?? opts.seatFacing ?? 'SE';
  const dirX = facing === 'SE' || facing === 'NE' ? 1 : -1;
  const isBackView = facing === 'NE' || facing === 'NW';

  const isCarrying = Boolean(opts.carrying && opts.carrying !== 'NONE');
  const resolvedAnimState: IsoAnimState =
    opts.animState ??
    (opts.seated
      ? 'DINING_EAT'
      : isCarrying
        ? opts.carrying === 'BROTH_POT'
          ? 'CARRY_POT'
          : opts.carrying === 'SEAFOOD_TRAY' || opts.carrying === 'COOKED_PLATTER'
            ? 'CARRY_TRAY'
            : 'CARRY_DISHES'
        : (opts.walkCycle ?? 0) > 0.01
          ? 'WALK'
          : 'IDLE');

  const animTime =
    opts.animTime ??
    (resolvedAnimState === 'WALK' ||
    resolvedAnimState === 'CARRY_POT' ||
    resolvedAnimState === 'CARRY_TRAY' ||
    resolvedAnimState === 'CARRY_DISHES'
      ? (opts.walkCycle ?? 0) * 0.14
      : 0);

  const pose = sampleIsoPose(resolvedAnimState, animTime);
  // Seated characters drop pelvis neatly onto the 11.7z chair cushion so elbows align with 21.5z tabletop
  // and shoulders/head rise cleanly above the 23.7z slatted backrest (seated crown ≈ 41z vs standing ≈ 47.3z)
  const p = w2i(opts.wx, opts.wy, opts.seated ? -4.5 : 0);

  const bob = opts.seated ? pose.bodyBob * 0.55 * s : pose.bodyBob * s;
  const leanX = dirX * pose.torsoLean * s;
  const headNodY = pose.headNod * s;

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
        : archetype === 'MANAGER' || archetype === 'VIP' || archetype === 'INSPECTOR'
          ? 'PARTED'
          : archetype === 'FOODIE'
            ? 'BERET'
            : 'SHORT');

  const shortSleeve =
    archetype === 'HOST' || archetype === 'SERVER';
  const sleeveColor = archetype === 'MANAGER' ? '#F7F4EE' : opts.bodyColor;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(ISO_CHARACTER_WIDTH_RATIO, 1);
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

  // Dual-layer grounded contact shadow (soft ambient penumbra + crisp underfoot core)
  if (!opts.seated) {
    const strideSpread = Math.abs(pose.frontLegStride - pose.backLegStride) * 0.55;
    ctx.fillStyle = 'rgba(28, 18, 12, 0.15)';
    ctx.beginPath();
    ctx.ellipse(0.6 * s, 1.0, (8.6 + strideSpread) * s, 4.1 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(18, 12, 8, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 0.8, (6.0 + strideSpread * 0.7) * s, 2.7 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle animated footstep dust puffs trailing behind actively walking characters
    const isMoving =
      resolvedAnimState === 'WALK' ||
      ((resolvedAnimState === 'CARRY_POT' ||
        resolvedAnimState === 'CARRY_TRAY' ||
        resolvedAnimState === 'CARRY_DISHES') &&
        (opts.walkCycle ?? 0) > 0.02);
    if (isMoving && strideSpread > 0.45) {
      const puffT = (animTime * 2.4) % 1;
      const puffAlpha = (1 - puffT) * 0.36;
      const trailX = -dirX * (4.5 + puffT * 7.5) * s;
      const trailY = (1.4 - puffT * 2.6) * s;
      ctx.fillStyle = `rgba(232, 218, 196, ${puffAlpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(trailX, trailY, (1.4 + puffT * 1.9) * s, 0, Math.PI * 2);
      ctx.arc(trailX - dirX * 2.4 * s, trailY - 0.8 * s, (1.0 + puffT * 1.4) * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const lw = Math.max(0.85, 0.94 * s);
  const torsoTop = -26.8 * s - bob;
  const torsoBot = -13.6 * s - bob;

  // Compute articulated shoulder & hand coordinates
  const backShoulderX = -dirX * 3.5 * s + leanX * 0.85;
  const backShoulderY = torsoTop + 1.8 * s;
  const frontShoulderX = dirX * 3.4 * s + leanX * 0.9;
  const frontShoulderY = torsoTop + 1.9 * s;

  // Expressive archetype idle/queue overrides (matches tycoon_v2_assets_sheet!)
  let backHandX = backShoulderX + dirX * pose.backHandX * s;
  let backHandY = backShoulderY + pose.backHandY * s;
  let frontHandX = frontShoulderX + dirX * pose.frontHandX * s;
  let frontHandY = frontShoulderY + pose.frontHandY * s;

  if (resolvedAnimState === 'IDLE' && archetype === 'HOST' && !isCarrying) {
    // Graceful clasped hands in front of waist (exact match to Reception Hostess!)
    backHandX = dirX * 0.4 * s + leanX;
    backHandY = torsoBot - 1.2 * s;
    frontHandX = dirX * 1.4 * s + leanX;
    frontHandY = torsoBot - 1.0 * s;
  } else if (resolvedAnimState === 'QUEUE_WAIT' && archetype === 'ELDER') {
    // Thoughtfully resting hand near chin (exact match to Elderly Connoisseur!)
    frontHandX = dirX * 1.6 * s + leanX;
    frontHandY = torsoTop - 1.8 * s + Math.sin(animTime * 2.2) * 0.4 * s;
  } else if (resolvedAnimState === 'QUEUE_WAIT' && archetype === 'VIP') {
    // Holding open leather menu cleanly in front
    backHandX = dirX * 3.2 * s + leanX;
    backHandY = torsoTop + 7.6 * s;
    frontHandX = dirX * 4.5 * s + leanX;
    frontHandY = torsoTop + 7.8 * s;
  }

  // If Back View (NE/NW), carried/action items held forward appear behind the torso
  if (isBackView && !opts.seated) {
    drawInteractiveActionProp(
      ctx,
      resolvedAnimState,
      archetype,
      opts.carrying,
      dirX,
      torsoTop,
      frontHandX,
      frontHandY,
      pose,
      animTime,
      s,
      lw
    );
  }

  // ==========================================
  // 1. LOWER BODY (4-DIR STRIDING LEGS / QIPAO SKIRT / SEATED THIGHS)
  // ==========================================
  if (!opts.seated) {
    const legTopY = -14.4 * s - bob;
    // Subtle impatient foot-tap when queuing guest patience runs low
    const impatientTap =
      resolvedAnimState === 'QUEUE_WAIT' && (opts.patienceRatio ?? 1) < 0.38
        ? Math.max(0, Math.sin(animTime * 11)) * 1.2 * s
        : 0;

    // Project leg strides cleanly along the isometric direction vector
    const backFootX = (-1.8 * dirX + pose.backLegStride * 2.9 * dirX) * s;
    const frontFootX = (1.8 * dirX + pose.frontLegStride * 2.9 * dirX) * s;
    const backFootY =
      -0.8 * s +
      (isBackView ? -pose.backLegStride : pose.backLegStride) * 1.15 * s -
      pose.backFootLift * 2.6 * s;
    const frontFootY =
      -0.5 * s +
      (isBackView ? -pose.frontLegStride : pose.frontLegStride) * 1.15 * s -
      pose.frontFootLift * 2.6 * s -
      impatientTap;

    // Shoes (tapered dark leather flats)
    ctx.fillStyle = '#2A221E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(backFootX + 0.3 * dirX * s, backFootY, 2.0 * s, 1.05 * s, 0.1 * dirX, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(frontFootX + 0.4 * dirX * s, frontFootY, 2.05 * s, 1.05 * s, -0.1 * dirX, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (archetype === 'HOST' || archetype === 'HEIRESS') {
      // Slender calves visible below tailored qipao / silk dress midi hem
      ctx.fillStyle = skin;
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-2.3 * dirX * s, -6.5 * s - bob);
      ctx.lineTo(-0.5 * dirX * s, -6.5 * s - bob);
      ctx.lineTo(backFootX + 0.75 * s, backFootY - 0.5 * s);
      ctx.lineTo(backFootX - 0.75 * s, backFootY - 0.5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0.5 * dirX * s, -6.5 * s - bob);
      ctx.lineTo(2.3 * dirX * s, -6.5 * s - bob);
      ctx.lineTo(frontFootX + 0.75 * s, frontFootY - 0.5 * s);
      ctx.lineTo(frontFootX - 0.75 * s, frontFootY - 0.5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tailored midi skirt with delicate gold/cream hem trim
      const skirtSway = (pose.frontLegStride - pose.backLegStride) * 0.45 * dirX * s;
      ctx.fillStyle = opts.bodyColor;
      ctx.beginPath();
      ctx.moveTo(-3.6 * s + leanX * 0.35, -15.5 * s - bob);
      ctx.lineTo(3.6 * s + leanX * 0.35, -15.5 * s - bob);
      ctx.lineTo(4.0 * s + skirtSway, -6.0 * s - bob);
      ctx.lineTo(-4.0 * s + skirtSway, -6.0 * s - bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = opts.trimColor;
      ctx.lineWidth = 1.05 * s;
      ctx.beginPath();
      ctx.moveTo(-3.6 * s + skirtSway, -6.7 * s - bob);
      ctx.lineTo(3.6 * s + skirtSway, -6.7 * s - bob);
      ctx.stroke();
    } else {
      // Back trouser leg
      ctx.fillStyle = pants;
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(-3.2 * dirX * s + leanX * 0.3, legTopY);
      ctx.lineTo(-0.1 * dirX * s + leanX * 0.3, legTopY);
      ctx.lineTo(backFootX + 1.05 * dirX * s, backFootY - 0.6 * s);
      ctx.lineTo(backFootX - 1.05 * dirX * s, backFootY - 0.6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Front trouser leg
      ctx.beginPath();
      ctx.moveTo(0.1 * dirX * s + leanX * 0.3, legTopY);
      ctx.lineTo(3.2 * dirX * s + leanX * 0.3, legTopY);
      ctx.lineTo(frontFootX + 1.05 * dirX * s, frontFootY - 0.6 * s);
      ctx.lineTo(frontFootX - 1.05 * dirX * s, frontFootY - 0.6 * s);
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
  // 2. BACK ARM (BEHIND TORSO)
  // ==========================================
  if (!opts.seated) {
    drawArmSegment(
      ctx,
      backShoulderX,
      backShoulderY,
      backHandX,
      backHandY,
      sleeveColor,
      skin,
      s,
      lw,
      shortSleeve
    );
  }

  // ==========================================
  // 3. SLENDER TAILORED TORSO & ROLE ATTIRE (FRONT vs BACK 3/4 VIEW!)
  // ==========================================
  ctx.fillStyle = opts.bodyColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-4.4 * s + leanX, torsoTop + 1.2 * s);
  ctx.quadraticCurveTo(leanX, torsoTop - 0.4 * s, 4.4 * s + leanX, torsoTop + 1.2 * s);
  ctx.lineTo(3.8 * s + leanX * 0.35, torsoBot);
  ctx.lineTo(-3.8 * s + leanX * 0.35, torsoBot);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Painterly ligne-claire directional watercolor volume (warm top-left key light + sepia shadow side)
  const torsoGrad = ctx.createLinearGradient(-4.2 * s, torsoTop, 4.2 * s, torsoBot);
  torsoGrad.addColorStop(0, 'rgba(255, 246, 224, 0.24)');
  torsoGrad.addColorStop(0.45, 'rgba(255, 246, 224, 0)');
  torsoGrad.addColorStop(1, 'rgba(28, 16, 10, 0.22)');
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.moveTo(-4.3 * s + leanX, torsoTop + 1.2 * s);
  ctx.quadraticCurveTo(leanX, torsoTop - 0.3 * s, 4.3 * s + leanX, torsoTop + 1.2 * s);
  ctx.lineTo(3.7 * s + leanX * 0.35, torsoBot);
  ctx.lineTo(-3.7 * s + leanX * 0.35, torsoBot);
  ctx.closePath();
  ctx.fill();

  // Crisp sunlit rim accent along upper-left shoulder edge
  ctx.strokeStyle = 'rgba(255, 248, 228, 0.32)';
  ctx.lineWidth = lw * 0.72;
  ctx.beginPath();
  ctx.moveTo(-3.9 * s + leanX, torsoTop + 1.8 * s);
  ctx.quadraticCurveTo(-1.2 * s + leanX, torsoTop + 0.1 * s, 1.2 * s + leanX, torsoTop + 0.5 * s);
  ctx.stroke();

  if (isBackView) {
    // BACK 3/4 VIEW GARMENT DETAILS (matches back-facing staff & diners in style_isometric_tycoon!)
    ctx.strokeStyle = INK_LIGHT;
    ctx.lineWidth = lw * 0.78;
    // Center back tailoring seam
    ctx.beginPath();
    ctx.moveTo(leanX * 0.85, torsoTop + 1.2 * s);
    ctx.lineTo(leanX * 0.35, torsoBot - 0.6 * s);
    ctx.stroke();

    if (archetype === 'MANAGER') {
      // Tailored vest back cinch-buckle strap + crisp white collar nape
      ctx.fillStyle = '#FAF7F0';
      ctx.fillRect(-1.8 * s + leanX, torsoTop - 0.3 * s, 3.6 * s, 1.4 * s);
      ctx.strokeStyle = '#E8C97A';
      ctx.lineWidth = 0.85 * s;
      ctx.beginPath();
      ctx.moveTo(-2.4 * s + leanX * 0.5, torsoBot - 3.6 * s);
      ctx.lineTo(2.4 * s + leanX * 0.5, torsoBot - 3.6 * s);
      ctx.stroke();
    } else if (archetype === 'CHEF' || archetype === 'SUSHI_CHEF' || (archetype === 'SERVER' && (opts.staffRole === 'DISHWASHER' || opts.staffRole === 'BUSSER' || opts.staffRole === 'STOCKER'))) {
      // Back apron waist ties & neat bow knot!
      const tieCol =
        archetype === 'SUSHI_CHEF' ? '#496373' : archetype === 'CHEF' ? '#EFECE4' : opts.trimColor;
      ctx.strokeStyle = tieCol;
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.moveTo(-3.6 * s + leanX * 0.4, torsoBot - 2.0 * s);
      ctx.lineTo(3.6 * s + leanX * 0.4, torsoBot - 2.0 * s);
      ctx.stroke();
      // Little tied apron bow ribbons
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.7;
      ctx.fillStyle = tieCol;
      ctx.beginPath();
      ctx.ellipse(-1.2 * s + leanX * 0.4, torsoBot - 1.9 * s, 1.3 * s, 0.8 * s, -0.3, 0, Math.PI * 2);
      ctx.ellipse(1.2 * s + leanX * 0.4, torsoBot - 1.9 * s, 1.3 * s, 0.8 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (archetype === 'HOST') {
      // Mandarin collar gold trim along nape
      ctx.strokeStyle = opts.trimColor;
      ctx.lineWidth = 0.9 * s;
      ctx.beginPath();
      ctx.moveTo(-2.1 * s + leanX, torsoTop + 0.6 * s);
      ctx.lineTo(2.1 * s + leanX, torsoTop + 0.6 * s);
      ctx.stroke();
    } else if (archetype === 'FOODIE') {
      // Cream knit scarf draped across back of shoulders
      ctx.fillStyle = opts.trimColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.roundRect(-3.6 * s + leanX, torsoTop + 0.2 * s, 7.2 * s, 2.5 * s, 1.0 * s);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // FRONT 3/4 VIEW GARMENT DETAILS (shifted slightly toward facing side dirX)
    const cx = dirX * 0.6 * s + leanX * 0.85;
    if (archetype === 'MANAGER') {
      // Crisp white shirt V-collar + dark burgundy vest + bow tie + 3 brass buttons
      ctx.fillStyle = '#FAF7F0';
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - 1.8 * s, torsoTop + 0.2 * s);
      ctx.lineTo(cx + 1.8 * s, torsoTop + 0.2 * s);
      ctx.lineTo(cx, torsoTop + 4.4 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dark bow-tie at neck
      ctx.fillStyle = '#2B1F1B';
      ctx.beginPath();
      ctx.moveTo(cx - 1.7 * s, torsoTop + 0.7 * s);
      ctx.lineTo(cx, torsoTop + 1.4 * s);
      ctx.lineTo(cx + 1.7 * s, torsoTop + 0.7 * s);
      ctx.lineTo(cx + 1.7 * s, torsoTop + 2.1 * s);
      ctx.lineTo(cx, torsoTop + 1.5 * s);
      ctx.lineTo(cx - 1.7 * s, torsoTop + 2.1 * s);
      ctx.closePath();
      ctx.fill();

      // 3 tiny brass vest buttons + antique gold pocket-watch chain arc
      ctx.fillStyle = '#F2CF78';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(cx, torsoTop + 5.6 * s + i * 2.3 * s, 0.58 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#E8C568';
      ctx.lineWidth = 0.72 * s;
      ctx.beginPath();
      ctx.moveTo(cx, torsoBot - 3.6 * s);
      ctx.quadraticCurveTo(cx + 1.8 * dirX * s, torsoBot - 1.6 * s, cx + 3.0 * dirX * s, torsoBot - 3.2 * s);
      ctx.stroke();
    } else if (archetype === 'CHEF' || archetype === 'SUSHI_CHEF') {
      ctx.strokeStyle = INK_LIGHT;
      ctx.lineWidth = lw * 0.75;
      ctx.beginPath();
      ctx.moveTo(cx - 1.4 * dirX * s, torsoTop + 0.8 * s);
      ctx.lineTo(cx + 1.1 * dirX * s, torsoTop + 3.2 * s);
      ctx.lineTo(cx + 1.1 * dirX * s, torsoBot - 1.5 * s);
      ctx.stroke();

      // Crisp chef neckerchief accent at collar
      ctx.fillStyle = archetype === 'SUSHI_CHEF' ? '#305468' : '#A8382B';
      ctx.beginPath();
      ctx.moveTo(cx - 1.8 * s, torsoTop + 0.5 * s);
      ctx.lineTo(cx + 1.8 * s, torsoTop + 0.5 * s);
      ctx.lineTo(cx, torsoTop + 2.4 * s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#3B3430';
      for (let i = 0; i < 3; i++) {
        const by = torsoTop + 4.1 * s + i * 2.1 * s;
        ctx.beginPath();
        ctx.arc(cx - 1.1 * s, by, 0.48 * s, 0, Math.PI * 2);
        ctx.arc(cx + 1.2 * s, by, 0.48 * s, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!opts.seated) {
        ctx.fillStyle = archetype === 'SUSHI_CHEF' ? '#496373' : '#EFECE4';
        ctx.strokeStyle = INK;
        ctx.lineWidth = lw * 0.85;
        ctx.beginPath();
        ctx.rect(-3.4 * s + leanX * 0.35, torsoBot - 1.8 * s, 6.8 * s, 7.6 * s);
        ctx.fill();
        ctx.stroke();
        // Folded white kitchen towel tucked cleanly into waist sash
        ctx.fillStyle = '#FAF8F2';
        ctx.fillRect(1.2 * dirX * s + leanX * 0.35, torsoBot - 1.5 * s, 1.7 * s, 3.6 * s);
        ctx.strokeRect(1.2 * dirX * s + leanX * 0.35, torsoBot - 1.5 * s, 1.7 * s, 3.6 * s);
      }
    } else if (archetype === 'HOST') {
      // Mandarin collar & ornate diagonal gold frog clasps (盘扣) + name tag
      ctx.strokeStyle = opts.trimColor;
      ctx.lineWidth = 0.9 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 1.7 * dirX * s, torsoTop + 0.8 * s);
      ctx.quadraticCurveTo(cx, torsoTop + 1.8 * s, cx + 2.3 * dirX * s, torsoTop + 3.8 * s);
      ctx.stroke();

      ctx.fillStyle = '#F2CE72';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(cx + (0.2 + k * 0.65) * dirX * s, torsoTop + (1.8 + k * 0.85) * s, 0.45 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#E8C97A';
      ctx.fillRect(cx + 0.8 * dirX * s, torsoTop + 4.8 * s, 1.9 * s, 0.95 * s);
    } else if (archetype === 'SERVER') {
      ctx.strokeStyle = INK_LIGHT;
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(cx - 1.3 * dirX * s, torsoTop + 0.8 * s);
      ctx.lineTo(cx + 2.0 * dirX * s, torsoTop + 3.4 * s);
      ctx.lineTo(cx + 2.0 * dirX * s, torsoBot - 0.4 * s);
      ctx.stroke();

      if (!opts.seated) {
        // Tailored bistro waist apron with stitched order-pad pocket
        const apronCol =
          opts.staffRole === 'DISHWASHER' ||
          opts.staffRole === 'BUSSER' ||
          opts.staffRole === 'STOCKER' ||
          opts.staffRole === 'LIVE_MASTER'
            ? opts.trimColor
            : '#8F4D32';
        ctx.fillStyle = apronCol;
        ctx.strokeStyle = INK;
        ctx.lineWidth = lw * 0.75;
        ctx.fillRect(-3.1 * s + leanX * 0.35, torsoBot - 2.0 * s, 6.2 * s, 5.6 * s);
        ctx.strokeRect(-3.1 * s + leanX * 0.35, torsoBot - 2.0 * s, 6.2 * s, 5.6 * s);
        ctx.fillStyle = 'rgba(255, 246, 232, 0.65)';
        ctx.fillRect(-1.4 * s + leanX * 0.35, torsoBot - 0.4 * s, 2.8 * s, 2.0 * s);
      }
    } else if (archetype === 'VIP') {
      ctx.fillStyle = '#F7F5F0';
      ctx.beginPath();
      ctx.moveTo(cx - 1.7 * s, torsoTop + 0.4 * s);
      ctx.lineTo(cx + 1.7 * s, torsoTop + 0.4 * s);
      ctx.lineTo(cx, torsoTop + 6.2 * s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#2B2F36';
      ctx.beginPath();
      ctx.moveTo(cx - 0.55 * s, torsoTop + 1.0 * s);
      ctx.lineTo(cx + 0.55 * s, torsoTop + 1.0 * s);
      ctx.lineTo(cx + 0.35 * s, torsoTop + 5.8 * s);
      ctx.lineTo(cx, torsoTop + 6.6 * s);
      ctx.lineTo(cx - 0.35 * s, torsoTop + 5.8 * s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#E8C97A';
      ctx.fillRect(cx + 1.3 * dirX * s, torsoTop + 4.4 * s, 1.5 * s, 0.75 * s);
    } else if (archetype === 'ELDER') {
      ctx.fillStyle = '#7C8A6D';
      ctx.fillRect(cx - 1.5 * s, torsoTop + 0.6 * s, 3.0 * s, 11.8 * s);
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.75;
      ctx.beginPath();
      ctx.moveTo(cx - 1.5 * s, torsoTop + 0.6 * s);
      ctx.lineTo(cx - 1.5 * s, torsoBot);
      ctx.moveTo(cx + 1.5 * s, torsoTop + 0.6 * s);
      ctx.lineTo(cx + 1.5 * s, torsoBot);
      ctx.stroke();
    } else if (archetype === 'HEIRESS') {
      // Pearl collar necklace & cream silk trim
      ctx.fillStyle = '#FAF5EA';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * 0.9 * s, torsoTop + 1.3 * s + Math.abs(i) * -0.15 * s, 0.55 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (archetype === 'INSPECTOR') {
      // Crisp shirt collar + silver inspector lapel badge
      ctx.fillStyle = '#F2F5F8';
      ctx.beginPath();
      ctx.moveTo(cx - 1.6 * s, torsoTop + 0.4 * s);
      ctx.lineTo(cx + 1.6 * s, torsoTop + 0.4 * s);
      ctx.lineTo(cx, torsoTop + 4.8 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(cx + 1.4 * dirX * s, torsoTop + 3.6 * s, 1.4 * s, 1.1 * s);
    } else if (archetype === 'FOODIE') {
      // Cozy draped cream scarf loop
      ctx.fillStyle = opts.trimColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * 0.68;
      ctx.beginPath();
      ctx.roundRect(cx - 3.0 * s, torsoTop + 0.3 * s, 6.0 * s, 2.4 * s, 1.0 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(cx + 0.6 * dirX * s, torsoTop + 2.4 * s, 1.7 * s, 4.6 * s);
      ctx.strokeRect(cx + 0.6 * dirX * s, torsoTop + 2.4 * s, 1.7 * s, 4.6 * s);
    } else {
      ctx.fillStyle = opts.trimColor;
      ctx.beginPath();
      ctx.moveTo(cx - 1.7 * s, torsoTop + 0.5 * s);
      ctx.lineTo(cx + 1.7 * s, torsoTop + 0.5 * s);
      ctx.lineTo(cx, torsoTop + 3.6 * s);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ==========================================
  // 4. FRONT ARM & SEATED CHOPSTICKS ANIMATION
  // ==========================================
  if (opts.seated) {
    // Seated dining arm reaching toward hotpot center with animated chopsticks!
    const dineHandX = dirX * pose.frontHandX * s + leanX;
    const dineHandY = torsoTop + pose.frontHandY * s;
    drawArmSegment(
      ctx,
      frontShoulderX,
      frontShoulderY,
      dineHandX,
      dineHandY,
      sleeveColor,
      skin,
      s,
      lw,
      shortSleeve
    );
    if (resolvedAnimState === 'DINING_EAT') {
      const tipX = dineHandX + dirX * 4.4 * s;
      const tipY = dineHandY + (1.2 + pose.propTilt * 5.0) * s;
      ctx.strokeStyle = '#6B4423';
      ctx.lineWidth = 0.68 * s;
      ctx.beginPath();
      ctx.moveTo(dineHandX - dirX * 0.4 * s, dineHandY - 0.3 * s);
      ctx.lineTo(tipX, tipY);
      ctx.moveTo(dineHandX, dineHandY + 0.4 * s);
      ctx.lineTo(tipX - dirX * 0.4 * s, tipY + 0.7 * s);
      ctx.stroke();
    }
  } else {
    drawArmSegment(
      ctx,
      frontShoulderX,
      frontShoulderY,
      frontHandX,
      frontHandY,
      sleeveColor,
      skin,
      s,
      lw,
      shortSleeve
    );
  }

  // ==========================================
  // 5. SLENDER REALISTIC HEAD, HAIR & TOQUE (1:4.8 RATIO)
  // ==========================================
  const neckY = torsoTop + 0.3 * s;
  const headX = leanX * 1.1;
  const headY = -31.8 * s - bob + headNodY;

  // Slender neck
  ctx.fillStyle = skinShade;
  ctx.fillRect(headX - 1.1 * s, neckY - 2.1 * s, 2.2 * s, 2.5 * s);

  if (isBackView) {
    // BACK 3/4 VIEW HEAD: crisp full back-of-head hair silhouette + subtle cheek edge
    ctx.fillStyle = skin;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(headX, headY, 3.3 * s, 4.0 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Full back hair covering cranium & nape
    ctx.fillStyle = opts.hairColor;
    ctx.beginPath();
    ctx.ellipse(headX - 0.35 * dirX * s, headY - 0.2 * s, 3.55 * s, 4.05 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (hairStyle === 'BUN') {
      ctx.beginPath();
      ctx.arc(headX - 1.1 * dirX * s, headY + 0.5 * s, 2.25 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Tiny gold hairpin accent for Hostess / Heiress
      if (archetype === 'HOST' || archetype === 'HEIRESS') {
        ctx.strokeStyle = '#E8C97A';
        ctx.lineWidth = 0.85 * s;
        ctx.beginPath();
        ctx.moveTo(headX - 2.8 * dirX * s, headY - 0.6 * s);
        ctx.lineTo(headX + 0.8 * dirX * s, headY + 1.4 * s);
        ctx.stroke();
      }
    } else if (hairStyle === 'BOB') {
      ctx.beginPath();
      ctx.ellipse(headX - 0.2 * dirX * s, headY + 1.2 * s, 3.85 * s, 3.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // FRONT 3/4 VIEW HEAD
    if (hairStyle === 'BUN') {
      ctx.fillStyle = opts.hairColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(headX - 2.6 * s * dirX, headY - 0.6 * s, 2.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (hairStyle === 'BOB') {
      ctx.fillStyle = opts.hairColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(headX, headY + 0.4 * s, 4.1 * s, 4.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Realistic oval face
    ctx.fillStyle = skin;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(headX, headY, 3.35 * s, 4.05 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair cap / bangs
    ctx.fillStyle = opts.hairColor;
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    if (hairStyle === 'ELDER') {
      ctx.beginPath();
      ctx.arc(headX, headY - 0.8 * s, 3.45 * s, Math.PI * 1.08, Math.PI * 1.92);
      ctx.quadraticCurveTo(headX, headY - 2.9 * s, headX - 3.3 * s, headY - 1.2 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (hairStyle === 'PARTED') {
      ctx.beginPath();
      ctx.arc(headX, headY - 0.7 * s, 3.6 * s, Math.PI * 0.94, Math.PI * 2.06);
      ctx.quadraticCurveTo(headX + 1.2 * dirX * s, headY - 2.3 * s, headX - 1.2 * dirX * s, headY - 1.5 * s);
      ctx.quadraticCurveTo(headX - 2.7 * dirX * s, headY - 1.2 * s, headX - 3.5 * dirX * s, headY - 0.1 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(headX, headY - 0.7 * s, 3.55 * s, Math.PI * 0.92, Math.PI * 2.08);
      ctx.quadraticCurveTo(headX, headY - 1.8 * s, headX - 3.45 * s, headY - 0.2 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Subtle warm watercolor face shading & soft cheek warmth
    const faceShade = ctx.createLinearGradient(headX - 3 * s, headY - 3 * s, headX + 3 * s, headY + 3 * s);
    faceShade.addColorStop(0, 'rgba(255, 248, 236, 0.22)');
    faceShade.addColorStop(0.65, 'rgba(255, 248, 236, 0)');
    faceShade.addColorStop(1, 'rgba(184, 118, 84, 0.22)');
    ctx.fillStyle = faceShade;
    ctx.beginPath();
    ctx.ellipse(headX, headY, 3.25 * s, 3.95 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair specular sheen arc matching top-left warm key light
    ctx.strokeStyle = 'rgba(255, 248, 234, 0.28)';
    ctx.lineWidth = 0.85 * s;
    ctx.beginPath();
    ctx.arc(headX - 0.6 * s, headY - 1.1 * s, 2.5 * s, Math.PI * 1.15, Math.PI * 1.72);
    ctx.stroke();

    // Delicate facial features (subtle eyes, warm cheek blush, spectacles for ELDER/INSPECTOR)
    const eyeX = headX + 0.65 * dirX * s;
    ctx.fillStyle = 'rgba(232, 128, 110, 0.30)';
    ctx.beginPath();
    ctx.ellipse(eyeX - 1.6 * s, headY + 1.35 * s, 0.85 * s, 0.45 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeX + 1.4 * s, headY + 1.35 * s, 0.85 * s, 0.45 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = INK;
    ctx.fillRect(eyeX - 1.55 * s, headY + 0.1 * s, 0.85 * s, 1.05 * s);
    ctx.fillRect(eyeX + 0.75 * s, headY + 0.1 * s, 0.85 * s, 1.05 * s);

    if (archetype === 'ELDER' || archetype === 'INSPECTOR') {
      ctx.strokeStyle = '#3B3028';
      ctx.lineWidth = 0.55 * s;
      ctx.beginPath();
      ctx.arc(eyeX - 1.15 * s, headY + 0.55 * s, 1.05 * s, 0, Math.PI * 2);
      ctx.arc(eyeX + 1.15 * s, headY + 0.55 * s, 1.05 * s, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Headwear: Chef Toque / Sushi Hachimaki / Foodie Beret
  if (archetype === 'CHEF') {
    const hatBaseY = headY - 2.8 * s;
    ctx.fillStyle = '#FAF6EE';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(headX - 3.2 * s, hatBaseY);
    ctx.lineTo(headX - 3.6 * s, hatBaseY - 7.0 * s);
    ctx.quadraticCurveTo(headX, hatBaseY - 8.4 * s, headX + 3.6 * s, hatBaseY - 7.0 * s);
    ctx.lineTo(headX + 3.2 * s, hatBaseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#EDE6D8';
    ctx.fillRect(headX - 3.2 * s, hatBaseY - 2.0 * s, 6.4 * s, 2.0 * s);
    ctx.strokeRect(headX - 3.2 * s, hatBaseY - 2.0 * s, 6.4 * s, 2.0 * s);

    ctx.strokeStyle = INK_LIGHT;
    ctx.lineWidth = 0.55 * s;
    for (const px of [-1.6, 0, 1.6]) {
      ctx.beginPath();
      ctx.moveTo(headX + px * s, hatBaseY - 2.2 * s);
      ctx.lineTo(headX + px * 1.08 * s, hatBaseY - 6.8 * s);
      ctx.stroke();
    }
  } else if (archetype === 'SUSHI_CHEF') {
    // Traditional deep-indigo hachimaki headband (+ fluttering knot tails in back view!)
    ctx.fillStyle = '#2E4A5C';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.75;
    ctx.fillRect(headX - 3.5 * s, headY - 2.6 * s, 7.0 * s, 1.6 * s);
    ctx.strokeRect(headX - 3.5 * s, headY - 2.6 * s, 7.0 * s, 1.6 * s);
    if (isBackView) {
      ctx.strokeStyle = '#2E4A5C';
      ctx.lineWidth = 1.15 * s;
      ctx.beginPath();
      ctx.moveTo(headX - 0.5 * dirX * s, headY - 1.8 * s);
      ctx.lineTo(headX - 2.4 * dirX * s, headY + 0.6 * s);
      ctx.moveTo(headX - 0.2 * dirX * s, headY - 1.8 * s);
      ctx.lineTo(headX + 1.2 * dirX * s, headY + 0.4 * s);
      ctx.stroke();
    }
  } else if (hairStyle === 'BERET') {
    // Chic warm artist/foodie beret tilted stylishly
    ctx.fillStyle = '#7D3C34';
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.85;
    ctx.beginPath();
    ctx.ellipse(headX - 0.5 * dirX * s, headY - 3.4 * s, 4.2 * s, 1.9 * s, -0.18 * dirX, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // If Front View (SE/SW), draw carried items & interactive action props in front of torso!
  if (!isBackView && !opts.seated) {
    drawInteractiveActionProp(
      ctx,
      resolvedAnimState,
      archetype,
      opts.carrying,
      dirX,
      torsoTop,
      frontHandX,
      frontHandY,
      pose,
      animTime,
      s,
      lw
    );
  }

  // Animated pulsing double antique-gold shimmer aura for VIP / Special Guests
  if ((opts.isVip || archetype === 'HEIRESS') && !opts.seated) {
    const vipPulse = 0.78 + Math.sin(animTime * 3.4) * 0.22;
    ctx.strokeStyle = `rgba(246, 212, 114, ${(0.88 * vipPulse).toFixed(2)})`;
    ctx.lineWidth = 1.15 * s;
    ctx.beginPath();
    ctx.ellipse(0, 0.8, 9.2 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 236, 170, ${(0.42 * vipPulse).toFixed(2)})`;
    ctx.lineWidth = 0.75 * s;
    ctx.beginPath();
    ctx.ellipse(0, 0.8, (11.2 + vipPulse * 1.1) * s, (5.5 + vipPulse * 0.5) * s, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Two tiny orbiting golden starlight motes around the VIP aura
    for (let k = 0; k < 2; k++) {
      const ang = animTime * 1.9 + k * Math.PI;
      ctx.fillStyle = `rgba(255, 244, 196, ${(0.9 * vipPulse).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * 10.6 * s, 0.8 + Math.sin(ang) * 5.0 * s, 1.1 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Expressive Hand-Inked Vector Emotion Micro-Bubbles (no raw emojis!)
  const emoY = headY - (archetype === 'CHEF' ? 12.5 : 7.5) * s;
  if (opts.patienceRatio !== undefined && opts.patienceRatio < 0.35) {
    const urgent = opts.patienceRatio < 0.22;
    const pulse = 0.88 + Math.sin(animTime * (urgent ? 8.5 : 4.5)) * 0.16;
    const ex = headX + dirX * 5.6 * s;
    const ey = emoY + Math.sin(animTime * 4.0) * 1.0 * s;

    if (urgent) {
      // Crisp vector crimson anger cross-mark
      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(pulse, pulse);
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 1.45 * s;
      const r = 2.6 * s;
      ctx.beginPath();
      ctx.arc(-r, -r, r * 0.75, 0, Math.PI * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r, -r, r * 0.75, Math.PI * 0.5, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r, r, r * 0.75, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r, r, r * 0.75, Math.PI * 1.5, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      // Translucent sky-blue impatient sweat drop beside temple
      const dropPhase = (animTime * 1.35) % 1;
      const dy = ey + dropPhase * 3.0 * s;
      const da = Math.sin(dropPhase * Math.PI) * 0.92;
      ctx.fillStyle = `rgba(125, 211, 252, ${da.toFixed(2)})`;
      ctx.strokeStyle = `rgba(30, 64, 102, ${(da * 0.85).toFixed(2)})`;
      ctx.lineWidth = 0.65 * s;
      ctx.beginPath();
      ctx.moveTo(ex, dy - 2.6 * s);
      ctx.quadraticCurveTo(ex + 2.0 * s, dy + 0.5 * s, ex, dy + 1.8 * s);
      ctx.quadraticCurveTo(ex - 2.0 * s, dy + 0.5 * s, ex, dy - 2.6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (
    resolvedAnimState === 'DINING_EAT' &&
    (opts.patienceRatio === undefined || opts.patienceRatio > 0.68)
  ) {
    // Periodic delighted dining coral heart / golden star sparkle staggered deterministically per seat
    const seatHash = Math.abs(Math.sin(opts.wx * 0.17 + opts.wy * 0.23)) * 5.2;
    const cycle = (animTime * 0.28 + seatHash) % 1;
    if (cycle < 0.34) {
      const t = cycle / 0.34;
      const alpha = Math.sin(t * Math.PI) * 0.9;
      const fx = headX + dirX * 4.5 * s + Math.sin(t * Math.PI * 2) * 1.4 * s;
      const fy = emoY - t * 8.5 * s;
      const isStar = opts.isVip || Math.floor(seatHash * 10) % 2 === 0;
      if (isStar) {
        ctx.fillStyle = `rgba(253, 224, 71, ${alpha.toFixed(2)})`;
        ctx.strokeStyle = `rgba(146, 64, 14, ${(alpha * 0.7).toFixed(2)})`;
        ctx.lineWidth = 0.55 * s;
        const r = 2.6 * s;
        ctx.beginPath();
        ctx.moveTo(fx, fy - r);
        ctx.quadraticCurveTo(fx, fy, fx + r, fy);
        ctx.quadraticCurveTo(fx, fy, fx, fy + r);
        ctx.quadraticCurveTo(fx, fy, fx - r, fy);
        ctx.quadraticCurveTo(fx, fy, fx, fy - r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = `rgba(244, 114, 152, ${alpha.toFixed(2)})`;
        ctx.strokeStyle = `rgba(136, 19, 55, ${(alpha * 0.65).toFixed(2)})`;
        ctx.lineWidth = 0.55 * s;
        ctx.beginPath();
        ctx.moveTo(fx, fy + 2.2 * s);
        ctx.bezierCurveTo(fx - 3.0 * s, fy - 0.5 * s, fx - 2.2 * s, fy - 3.0 * s, fx, fy - 1.1 * s);
        ctx.bezierCurveTo(fx + 2.2 * s, fy - 3.0 * s, fx + 3.0 * s, fy - 0.5 * s, fx, fy + 2.2 * s);
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}
