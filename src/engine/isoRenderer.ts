import {
  BROTH_CATALOG,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FRONT_HALL_ZONES,
  getFrontHallBounds,
  SEAFOOD_CATALOG,
  STATIONS,
} from '../data/gameConfig';
import {
  BACKSTAGE_CORRIDOR,
  BACKSTAGE_ROOMS,
  BackstageRoomRect,
  FRONT_BACK_ARCHWAYS,
} from '../data/policyAndTechConfig';
import { getCharacterDef, getSpecialStaffDef } from '../data/storyConfig';
import { getDecorThemeDef } from '../data/tycoonSystemsConfig';
import {
  BuffetZoneId,
  CarryItemType,
  DiningTable,
  FacilitySceneId,
  GameWorld,
  HiredStaff,
  QueueCustomer,
  ZonePadDef,
} from '../types/game';
import { getBackstagePlayerRoom } from './policyAndTech';
import { CanvasViewportTransform, SceneCamera } from './renderer';
import { getUnlockedZonePads } from './storyAndFacilities';

// ==========================================
// UNIFIED GRAND MAP 45° ISOMETRIC PROJECTION
// Front Hall:     wx in [0, frontW], wy in [0, frontH] (auto-expands with shopLevel Lv.1..Lv.5!)
// Partition Wall: wy in [-22, 0]     (3 aligned golden archways connecting front & back)
// Backstage Wing: wx in [0, 960],    wy in [-662, -22] (localY = wy - BACKSTAGE_OFFSET_Y)
// ==========================================

export const BACKSTAGE_OFFSET_Y = -662;
export const UNIFIED_MIN_Y = -662;
export const UNIFIED_MAX_Y = CANVAS_HEIGHT; // 640 (Lv.1 base)
export const UNIFIED_MAX_X = CANVAS_WIDTH; // 960 (Lv.1 base)

// Crisp 2:1 Architectural Isometric basis
export const ISO_COS = 0.72;
export const ISO_SIN = 0.36;

export interface IsoMapMetrics {
  frontW: number;
  frontH: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  boundsW: number;
  boundsH: number;
  centerX: number;
  centerY: number;
}

export function getIsoMapMetrics(shopLevel = 1): IsoMapMetrics {
  const bounds = getFrontHallBounds(shopLevel);
  const frontW = bounds.width;
  const frontH = bounds.height;

  // Hull corners of the unified L-shaped Backstage (0..960, -662..0) + Front Hall (0..frontW, 0..frontH)
  const corners = [
    worldToIso(-14, UNIFIED_MIN_Y - 14, 78),
    worldToIso(UNIFIED_MAX_X, UNIFIED_MIN_Y - 14, 78),
    worldToIso(UNIFIED_MAX_X + 8, UNIFIED_MIN_Y, 0),
    worldToIso(frontW + 8, -14, 48),
    worldToIso(frontW + 8, frontH + 8, -22),
    worldToIso(-14, frontH + 8, -22),
  ];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
  }

  minX -= 28;
  maxX += 42;
  minY -= 24;
  maxY += 44;

  return {
    frontW,
    frontH,
    minX,
    maxX,
    minY,
    maxY,
    boundsW: maxX - minX,
    boundsH: maxY - minY,
    centerX: (minX + maxX) * 0.5,
    centerY: (minY + maxY) * 0.5,
  };
}

// Base Lv.1 constants kept exported for backwards compatibility
export const ISO_MIN_X = -495;
export const ISO_MAX_X = 1205;
export const ISO_MIN_Y = -345;
export const ISO_MAX_Y = 625;
export const ISO_BOUNDS_W = ISO_MAX_X - ISO_MIN_X;
export const ISO_BOUNDS_H = ISO_MAX_Y - ISO_MIN_Y;
export const ISO_CENTER_X = (ISO_MIN_X + ISO_MAX_X) / 2;
export const ISO_CENTER_Y = (ISO_MIN_Y + ISO_MAX_Y) / 2;

const INK = '#1D1510';
const INK_SOFT = 'rgba(29, 21, 16, 0.55)';

export function worldToIso(wx: number, wy: number, wz = 0): { x: number; y: number } {
  return {
    x: (wx - wy) * ISO_COS,
    y: (wx + wy) * ISO_SIN - wz,
  };
}

export function isoToWorld(ix: number, iy: number): { x: number; y: number } {
  const a = ix / ISO_COS; // wx - wy
  const b = iy / ISO_SIN; // wx + wy
  return {
    x: (a + b) * 0.5,
    y: (b - a) * 0.5,
  };
}

export function getIsoViewportTransform(
  backingWidth: number,
  backingHeight: number,
  camera?: SceneCamera,
  shopLevel = 1
): CanvasViewportTransform {
  const m = getIsoMapMetrics(shopLevel);
  const baseScale = Math.min(backingWidth / m.boundsW, backingHeight / m.boundsH) * 0.96;
  const zoom = camera ? Math.max(0.65, Math.min(2.6, camera.zoom)) : 1;
  const scale = baseScale * zoom;
  const panX = camera ? camera.panX : 0;
  const panY = camera ? camera.panY : 0;
  const offsetX = backingWidth / 2 - (m.centerX + panX) * scale;
  const offsetY = backingHeight / 2 - (m.centerY + panY) * scale;
  return { scale, offsetX, offsetY };
}

export function screenBufToUnifiedWorld(
  bufX: number,
  bufY: number,
  backingWidth: number,
  backingHeight: number,
  camera?: SceneCamera,
  shopLevel = 1
): { x: number; y: number } {
  const vt = getIsoViewportTransform(backingWidth, backingHeight, camera, shopLevel);
  const ix = (bufX - vt.offsetX) / vt.scale;
  const iy = (bufY - vt.offsetY) / vt.scale;
  return isoToWorld(ix, iy);
}

// ==========================================
// LOW-LEVEL ISOMETRIC ARCHITECTURAL PRIMITIVES
// ==========================================

function drawPoly(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  fill: string,
  stroke?: string,
  lineWidth = 1.15
) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

function drawIsoQuad(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  wz: number,
  fill: string,
  stroke?: string,
  lineWidth = 1
) {
  const p0 = worldToIso(wx, wy, wz);
  const p1 = worldToIso(wx + w, wy, wz);
  const p2 = worldToIso(wx + w, wy + d, wz);
  const p3 = worldToIso(wx, wy + d, wz);
  drawPoly(ctx, [p0, p1, p2, p3], fill, stroke, lineWidth);
}

function drawIsoBox(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  h: number,
  colors: {
    top: string;
    left: string; // +Y facing (front-left)
    right: string; // +X facing (front-right)
    stroke?: string;
    lineWidth?: number;
  },
  baseZ = 0
) {
  const stroke = colors.stroke ?? INK;
  const lw = colors.lineWidth ?? 1.1;

  const t0 = worldToIso(wx, wy, baseZ + h);
  const t1 = worldToIso(wx + w, wy, baseZ + h);
  const t2 = worldToIso(wx + w, wy + d, baseZ + h);
  const t3 = worldToIso(wx, wy + d, baseZ + h);

  const b1 = worldToIso(wx + w, wy, baseZ);
  const b2 = worldToIso(wx + w, wy + d, baseZ);
  const b3 = worldToIso(wx, wy + d, baseZ);

  // Front-left face (y = wy + d)
  drawPoly(ctx, [t3, t2, b2, b3], colors.left, stroke, lw);
  // Front-right face (x = wx + w)
  drawPoly(ctx, [t2, t1, b1, b2], colors.right, stroke, lw);
  // Top face
  drawPoly(ctx, [t0, t1, t2, t3], colors.top, stroke, lw);
}

function drawIsoTileGrid(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  tileSize: number,
  colorA: string,
  colorB: string,
  groutColor = 'rgba(29, 21, 16, 0.14)'
) {
  // Base fill
  drawIsoQuad(ctx, wx, wy, w, d, 0, colorA);

  // Alternating subtle checker / parquet tiles
  const cols = Math.ceil(w / tileSize);
  const rows = Math.ceil(d / tileSize);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 === 1) {
        const tx = wx + c * tileSize;
        const ty = wy + r * tileSize;
        const tw = Math.min(tileSize, wx + w - tx);
        const td = Math.min(tileSize, wy + d - ty);
        drawIsoQuad(ctx, tx, ty, tw, td, 0, colorB);
      }
    }
  }

  // Crisp architectural grid seams
  ctx.save();
  ctx.strokeStyle = groutColor;
  ctx.lineWidth = 0.7;
  for (let x = wx + tileSize; x < wx + w; x += tileSize) {
    const a = worldToIso(x, wy, 0);
    const b = worldToIso(x, wy + d, 0);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let y = wy + tileSize; y < wy + d; y += tileSize) {
    const a = worldToIso(wx, y, 0);
    const b = worldToIso(wx + w, y, 0);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawIsoTextTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  ix: number,
  iy: number,
  opts?: {
    color?: string;
    bg?: string;
    border?: string;
    fontSize?: number;
  }
) {
  const fs = opts?.fontSize ?? 11;
  ctx.save();
  ctx.font = `700 ${fs}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (opts?.bg) {
    const padX = 7;
    const tw = Math.ceil(ctx.measureText(text).width) + padX * 2;
    const th = fs + 7;
    const bx = ix - tw / 2;
    const by = iy - th / 2;
    ctx.fillStyle = opts.bg;
    ctx.beginPath();
    ctx.roundRect(bx, by, tw, th, 4);
    ctx.fill();
    if (opts.border) {
      ctx.strokeStyle = opts.border;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
  } else {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(16, 12, 10, 0.88)';
    ctx.strokeText(text, ix, iy);
  }
  ctx.fillStyle = opts?.color ?? '#FFF6E5';
  ctx.fillText(text, ix, iy);
  ctx.restore();
}

function drawSteamWisps(
  ctx: CanvasRenderingContext2D,
  ix: number,
  iy: number,
  timeSec: number,
  seed: number,
  intensity = 1
) {
  ctx.save();
  const count = Math.max(2, Math.round(3 * intensity));
  for (let i = 0; i < count; i++) {
    const phase = (timeSec * 0.85 + seed * 0.37 + i * 0.33) % 1;
    const rise = phase * 32 * intensity;
    const sway = Math.sin(timeSec * 2.4 + seed + i * 2.1) * (4 + phase * 5);
    const alpha = Math.sin(phase * Math.PI) * 0.52;
    const radius = (3.5 + phase * 6.5) * Math.min(1.25, intensity);
    ctx.fillStyle = `rgba(255, 250, 240, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(ix + sway + (i - 1) * 4, iy - rise, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWarmLantern(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  wz: number,
  timeSec: number,
  tint = '#FFB84D'
) {
  const pos = worldToIso(wx, wy, wz);
  const sway = Math.sin(timeSec * 1.9 + wx * 0.02 + wy * 0.02) * 1.4;
  const lx = pos.x + sway;
  const ly = pos.y;

  // Soft warm glow halo
  const grad = ctx.createRadialGradient(lx, ly, 2, lx, ly, 42);
  grad.addColorStop(0, 'rgba(255, 218, 122, 0.34)');
  grad.addColorStop(0.5, 'rgba(245, 165, 66, 0.12)');
  grad.addColorStop(1, 'rgba(245, 165, 66, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(lx, ly, 42, 0, Math.PI * 2);
  ctx.fill();

  // Cord
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y - 16);
  ctx.lineTo(lx, ly - 8);
  ctx.stroke();

  // Palace octagonal lantern silhouette (matching Style 3's warm yellow-amber lanterns)
  ctx.fillStyle = tint;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(lx - 6.5, ly - 8, 13, 16, 4);
  ctx.fill();
  ctx.stroke();

  // Inner bright candle core
  ctx.fillStyle = '#FFF7D6';
  ctx.beginPath();
  ctx.ellipse(lx, ly, 3.2, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top & bottom dark bronze caps
  ctx.fillStyle = '#3B2316';
  ctx.fillRect(lx - 4.5, ly - 10, 9, 2.5);
  ctx.fillRect(lx - 4, ly + 7.5, 8, 2.5);
}

// ==========================================
// ILLUSTRATED ISOMETRIC CHARACTERS (INK & COLOR)
// ==========================================

function drawIsoCharacter(
  ctx: CanvasRenderingContext2D,
  opts: {
    wx: number;
    wy: number;
    bodyColor: string;
    trimColor: string;
    hairColor: string;
    skinColor?: string;
    isChef?: boolean;
    isManager?: boolean;
    isVip?: boolean;
    seated?: boolean;
    walkCycle?: number;
    carrying?: CarryItemType;
    scale?: number;
    highlightRing?: string;
  }
) {
  const s = opts.scale ?? 1;
  const p = worldToIso(opts.wx, opts.wy, opts.seated ? 6 : 0);
  const bob = opts.seated ? 0 : Math.abs(Math.sin(opts.walkCycle ?? 0)) * 2.2 * s;
  const stride = opts.seated ? 0 : Math.sin(opts.walkCycle ?? 0) * 2.4 * s;
  const skin = opts.skinColor ?? '#F3C8A4';

  ctx.save();
  ctx.translate(p.x, p.y);

  // Optional selection / manager / VIP ground ring
  if (opts.highlightRing) {
    ctx.strokeStyle = opts.highlightRing;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 1, 13 * s, 6.5 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Contact ambient shadow
  ctx.fillStyle = 'rgba(18, 12, 8, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 1, 9.5 * s, 4.8 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (when standing)
  if (!opts.seated) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2.5 * s, -6 * s - bob);
    ctx.lineTo(-2.5 * s - stride, -1 * s);
    ctx.moveTo(2.5 * s, -6 * s - bob);
    ctx.lineTo(2.5 * s + stride, -1 * s);
    ctx.stroke();
  }

  // Torso / Jacket / Apron
  ctx.fillStyle = opts.bodyColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-6.5 * s, -20 * s - bob, 13 * s, 14.5 * s, 4 * s);
  ctx.fill();
  ctx.stroke();

  // Apron / Collar trim
  ctx.fillStyle = opts.trimColor;
  ctx.fillRect(-4.2 * s, -15 * s - bob, 8.4 * s, 8.5 * s);
  ctx.strokeStyle = 'rgba(29,21,16,0.45)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-4.2 * s, -15 * s - bob, 8.4 * s, 8.5 * s);

  // Head
  ctx.fillStyle = skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -25.5 * s - bob, 6.4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair cap
  ctx.fillStyle = opts.hairColor;
  ctx.beginPath();
  ctx.arc(0, -27 * s - bob, 6.5 * s, Math.PI * 0.95, Math.PI * 2.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Subtle expressive eyes
  ctx.fillStyle = INK;
  ctx.fillRect(-2.6 * s, -25.6 * s - bob, 1.4 * s, 1.6 * s);
  ctx.fillRect(1.2 * s, -25.6 * s - bob, 1.4 * s, 1.6 * s);

  // Chef toque hat
  if (opts.isChef) {
    ctx.fillStyle = '#FAF6EE';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(-5.5 * s, -37 * s - bob, 11 * s, 7.5 * s, 3.5 * s);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-4.8 * s, -31.5 * s - bob, 9.6 * s, 2.5 * s);
  } else if (opts.isManager) {
    // Small brass manager crest pin on chest
    ctx.fillStyle = '#F6DA8D';
    ctx.beginPath();
    ctx.arc(3.5 * s, -17.5 * s - bob, 1.9 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (opts.isVip) {
    // Tiny golden VIP crown glint
    ctx.fillStyle = '#FBBF24';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-4.5 * s, -32 * s - bob);
    ctx.lineTo(-3 * s, -36.5 * s - bob);
    ctx.lineTo(0, -33.5 * s - bob);
    ctx.lineTo(3 * s, -36.5 * s - bob);
    ctx.lineTo(4.5 * s, -32 * s - bob);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Carried item clearly held in front
  if (opts.carrying && opts.carrying !== 'NONE') {
    const cx = 8 * s;
    const cy = -14 * s - bob;
    if (opts.carrying === 'BROTH_POT') {
      ctx.fillStyle = '#D97724';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 5.5 * s, 3.6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 0.8 * s, 4 * s, 2.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (opts.carrying === 'SEAFOOD_TRAY') {
      ctx.fillStyle = '#BAE6FD';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx - 6 * s, cy - 3 * s, 12 * s, 6 * s, 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(cx - 1.5 * s, cy - 0.5 * s, 2.2 * s, 0, Math.PI * 2);
      ctx.arc(cx + 2 * s, cy, 2 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (opts.carrying === 'COOKED_PLATTER') {
      ctx.fillStyle = '#FDBA74';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 6 * s, 3.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#C2410C';
      ctx.beginPath();
      ctx.arc(cx, cy - 1 * s, 2.4 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (opts.carrying === 'DIRTY_DISHES') {
      ctx.fillStyle = '#9CA3AF';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.fillRect(cx - 4.5 * s, cy - 5 * s, 9 * s, 7 * s);
      ctx.strokeRect(cx - 4.5 * s, cy - 5 * s, 9 * s, 7 * s);
    } else if (opts.carrying === 'CLEAN_TABLEWARE') {
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.fillRect(cx - 4.5 * s, cy - 5 * s, 9 * s, 7 * s);
      ctx.strokeRect(cx - 4.5 * s, cy - 5 * s, 9 * s, 7 * s);
    }
  }

  ctx.restore();
}

// ==========================================
// SIGNATURE ISOMETRIC ARCHITECTURAL MODULES
// ==========================================

function drawIsoTieredAquarium(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  timeSec: number,
  tiers = 2
) {
  // Teak cabinet stand
  drawIsoBox(ctx, wx, wy, w, d, 16, {
    top: '#8B5E3C',
    left: '#6B4529',
    right: '#52331D',
  });

  for (let t = 0; t < tiers; t++) {
    const zBase = 16 + t * 24;
    const inset = t * 3;
    const tw = w - inset * 2;
    const td = d - inset;
    const tx = wx + inset;
    const ty = wy;

    // Glowing turquoise-jade water tank volume
    drawIsoBox(
      ctx,
      tx,
      ty,
      tw,
      td,
      21,
      {
        top: 'rgba(147, 245, 240, 0.86)',
        left: 'rgba(62, 188, 192, 0.84)',
        right: 'rgba(35, 146, 155, 0.88)',
        stroke: '#164E54',
        lineWidth: 1.2,
      },
      zBase
    );

    // Animated lobsters / fish silhouettes swimming inside tank
    const center = worldToIso(tx + tw * 0.5, ty + td * 0.55, zBase + 10);
    const swim1 = Math.sin(timeSec * 1.4 + t * 2 + wx * 0.05) * (tw * 0.14);
    const swim2 = Math.cos(timeSec * 1.1 + t * 3 + wy * 0.05) * (tw * 0.12);
    ctx.fillStyle = t === 0 ? '#D94826' : '#2563EB';
    ctx.beginPath();
    ctx.ellipse(center.x + swim1, center.y + 1, 5.5, 2.5, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.ellipse(center.x - swim2 * 0.9 - 10, center.y + 4, 4.5, 2.2, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Oxygen bubble dots
    const bOff = (timeSec * 18 + t * 7) % 14;
    ctx.fillStyle = 'rgba(235, 255, 255, 0.88)';
    ctx.fillRect(center.x - 14, center.y + 6 - bOff, 2, 2);
    ctx.fillRect(center.x + 12, center.y + 8 - ((bOff + 6) % 14), 2, 2);

    // Specular glass highlight line along front rim
    const rimL = worldToIso(tx, ty + td, zBase + 20);
    const rimM = worldToIso(tx + tw, ty + td, zBase + 20);
    ctx.strokeStyle = 'rgba(225, 255, 255, 0.72)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(rimL.x, rimL.y);
    ctx.lineTo(rimM.x, rimM.y);
    ctx.stroke();
  }
}

function drawIsoHotpotTable(
  ctx: CanvasRenderingContext2D,
  table: DiningTable,
  world: GameWorld,
  timeSec: number,
  isHovered: boolean
) {
  const half = 28;
  const wx = table.x - half;
  const wy = table.y - half;
  const size = half * 2;

  // Soft ground shadow
  drawIsoQuad(ctx, wx + 4, wy + 5, size, size, 0, 'rgba(20, 14, 10, 0.26)');

  // 4 Wooden Chairs tucked around table (back chairs first)
  const chairOffsets = [
    { dx: 12, dy: -13, w: 18, d: 12 }, // back-top
    { dx: -13, dy: 12, w: 12, d: 18 }, // back-left
    { dx: size + 2, dy: 14, w: 12, d: 18 }, // front-right
    { dx: 16, dy: size + 2, w: 18, d: 12 }, // front-bottom
  ];

  // Draw back 2 chairs behind table
  for (let i = 0; i < 2; i++) {
    const ch = chairOffsets[i];
    drawIsoBox(ctx, wx + ch.dx, wy + ch.dy, ch.w, ch.d, 10, {
      top: '#9C693D',
      left: '#7A4F2B',
      right: '#5E3B1F',
    });
    // Chair backrest
    drawIsoBox(
      ctx,
      wx + ch.dx,
      wy + ch.dy,
      i === 0 ? ch.w : 3,
      i === 0 ? 3 : ch.d,
      11,
      { top: '#875731', left: '#694222', right: '#4F3017' },
      10
    );
  }

  // Table pedestal legs
  drawIsoBox(ctx, table.x - 9, table.y - 9, 18, 18, 14, {
    top: '#5C3A21',
    left: '#4A2D18',
    right: '#382111',
  });

  // Warm honey-teak tabletop
  const topTint = isHovered
    ? '#E3B978'
    : table.status === 'READY'
      ? '#CFA169'
      : table.status === 'DIRTY'
        ? '#A67B52'
        : '#C5935B';

  drawIsoBox(
    ctx,
    wx,
    wy,
    size,
    size,
    6,
    {
      top: topTint,
      left: '#9A693C',
      right: '#784E29',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 2 : 1.15,
    },
    14
  );

  // Decorative recessed brass induction frame in center of table
  drawIsoQuad(ctx, table.x - 16, table.y - 16, 32, 32, 20.2, '#402719', '#B98A42', 0.9);

  // Table state visual contents
  const topCenter = worldToIso(table.x, table.y, 21);

  if (table.status === 'READY') {
    // 4 neat porcelain place settings
    const dishPts = [
      worldToIso(table.x - 15, table.y - 15, 20.5),
      worldToIso(table.x + 15, table.y - 15, 20.5),
      worldToIso(table.x - 15, table.y + 15, 20.5),
      worldToIso(table.x + 15, table.y + 15, 20.5),
    ];
    for (const dp of dishPts) {
      ctx.fillStyle = '#F8F4EC';
      ctx.strokeStyle = INK_SOFT;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(dp.x, dp.y, 4.2, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (table.status === 'DIRTY') {
    // Scattered messy used bowls & shells
    const messPts = [
      { dx: -10, dy: -6, c: '#B4A99A' },
      { dx: 11, dy: 4, c: '#A39889' },
      { dx: -4, dy: 11, c: '#C46A4A' },
      { dx: 6, dy: -10, c: '#B4A99A' },
    ];
    for (const m of messPts) {
      const mp = worldToIso(table.x + m.dx, table.y + m.dy, 20.5);
      ctx.fillStyle = m.c;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(mp.x, mp.y, 4.5, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    drawIsoTextTag(ctx, '待收桌', topCenter.x, topCenter.y - 26, {
      color: '#FDE68A',
      bg: 'rgba(64, 24, 16, 0.88)',
      border: '#F59E0B',
      fontSize: 10,
    });
  } else if (table.status === 'NEEDS_TABLEWARE') {
    drawIsoTextTag(ctx, '缺餐具', topCenter.x, topCenter.y - 24, {
      color: '#BBF7D0',
      bg: 'rgba(18, 46, 36, 0.88)',
      border: '#4ADE80',
      fontSize: 10,
    });
  }

  // Seated guests around the table (back guests behind pot, front guests in front)
  const guest = table.customer;
  if (guest) {
    const guestColors = guest.isVip
      ? { body: '#6D28D9', trim: '#FDE68A', hair: '#271A12' }
      : guest.specialStoryId
        ? { body: '#0F766E', trim: '#E8C97A', hair: '#1E1B18' }
        : { body: '#475569', trim: '#E2E8F0', hair: '#291E16' };

    // Back diner
    drawIsoCharacter(ctx, {
      wx: table.x - 16,
      wy: table.y - 24,
      bodyColor: guestColors.body,
      trimColor: guestColors.trim,
      hairColor: guestColors.hair,
      isVip: guest.isVip,
      seated: true,
      scale: 0.9,
    });

    if (guest.size >= 2) {
      drawIsoCharacter(ctx, {
        wx: table.x + 24,
        wy: table.y - 12,
        bodyColor: '#9A3412',
        trimColor: '#FED7AA',
        hairColor: '#1F1713',
        seated: true,
        scale: 0.88,
      });
    }
  }

  // Steaming Brass Yin-Yang Dual-Flavor Hotpot when DINING
  if (table.status === 'DINING') {
    const brothDef = BROTH_CATALOG.find((b) => b.id === table.customer?.brothId);
    const potC = worldToIso(table.x, table.y, 22);

    // Copper pot rim & body
    ctx.fillStyle = '#B8762C';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(potC.x, potC.y + 2, 12.5, 7.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E0A44B';
    ctx.beginPath();
    ctx.ellipse(potC.x, potC.y - 1, 11.8, 6.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dual-flavor broth halves (crimson spicy + golden soup)
    ctx.fillStyle = brothDef?.color ?? '#DC2626';
    ctx.beginPath();
    ctx.ellipse(potC.x, potC.y - 1, 9.6, 4.9, 0, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();

    ctx.fillStyle = '#F5C45E';
    ctx.beginPath();
    ctx.ellipse(potC.x, potC.y - 1, 9.6, 4.9, 0, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.fill();

    // Boiling bubble dots
    const bPulse = Math.sin(timeSec * 8 + table.id) * 1.2;
    ctx.fillStyle = '#FFF5DC';
    ctx.beginPath();
    ctx.arc(potC.x - 3.5, potC.y - 1.5 + bPulse * 0.4, 1.4, 0, Math.PI * 2);
    ctx.arc(potC.x + 3.5, potC.y - 0.5 - bPulse * 0.4, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Small side seafood bowls around pot
    const plateA = worldToIso(table.x - 16, table.y + 8, 20.5);
    const plateB = worldToIso(table.x + 14, table.y - 12, 20.5);
    ctx.fillStyle = '#F8FAFC';
    ctx.strokeStyle = INK_SOFT;
    ctx.beginPath();
    ctx.ellipse(plateA.x, plateA.y, 4.5, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(plateB.x, plateB.y, 4.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rising wispy steam!
    drawSteamWisps(ctx, potC.x, potC.y - 6, timeSec, table.id * 1.7, 1.05);
  }

  // Front seated guest (if size >= 3) + Front 2 chairs
  if (guest && guest.size >= 3) {
    drawIsoCharacter(ctx, {
      wx: table.x + 14,
      wy: table.y + 22,
      bodyColor: '#1E40AF',
      trimColor: '#DBEAFE',
      hairColor: '#2B1F18',
      seated: true,
      scale: 0.88,
    });
  }

  for (let i = 2; i < 4; i++) {
    const ch = chairOffsets[i];
    drawIsoBox(ctx, wx + ch.dx, wy + ch.dy, ch.w, ch.d, 10, {
      top: '#9C693D',
      left: '#7A4F2B',
      right: '#5E3B1F',
    });
  }

  // Waiting-for-broth indicator & patience bar
  if (guest) {
    const ratio = Math.max(0, Math.min(1, guest.patience / Math.max(1, guest.maxPatience)));
    const barW = 36;
    const bx = topCenter.x - barW / 2;
    const by = topCenter.y - 44;

    if (table.status === 'WAITING_BROTH') {
      drawIsoTextTag(ctx, '等锅底!', topCenter.x, by - 11, {
        color: '#FEF08A',
        bg: 'rgba(138, 36, 18, 0.92)',
        border: '#F59E0B',
        fontSize: 10,
      });
    } else if (guest.displayName) {
      drawIsoTextTag(ctx, `★ ${guest.displayName}`, topCenter.x, by - 11, {
        color: '#FDE68A',
        bg: 'rgba(42, 22, 14, 0.92)',
        border: '#E8C97A',
        fontSize: 10,
      });
    }

    // Patience / dining progress bar
    ctx.fillStyle = 'rgba(20, 12, 8, 0.85)';
    ctx.fillRect(bx - 1, by - 1, barW + 2, 5.5);
    ctx.fillStyle =
      table.status === 'DINING'
        ? '#38BDF8'
        : ratio > 0.5
          ? '#4ADE80'
          : ratio > 0.25
            ? '#FBBF24'
            : '#EF4444';
    const fillRatio =
      table.status === 'DINING'
        ? Math.max(0, Math.min(1, guest.dineProgress))
        : ratio;
    ctx.fillRect(bx, by, barW * fillRatio, 3.5);

    // Self-talk customer speech bubble!
    if (guest.speechText && (guest.speechTimer ?? 0) > 0) {
      drawIsoTextTag(ctx, guest.speechText, topCenter.x, by - 25, {
        color: '#FFFBEB',
        bg: 'rgba(28, 17, 12, 0.93)',
        border: guest.specialStoryId ? '#E8C97A' : '#8C6843',
        fontSize: 10,
      });
    }
  }
}

function drawIsoZonePad(
  ctx: CanvasRenderingContext2D,
  pad: ZonePadDef,
  zoneId: BuffetZoneId | null,
  world: GameWorld,
  timeSec: number,
  isHovered: boolean
) {
  const isVert = pad.orientation === 'VERTICAL';

  // Empty customizable floor blueprint pad (walkable & clickable to configure!)
  if (!zoneId) {
    drawIsoQuad(
      ctx,
      pad.x,
      pad.y,
      pad.w,
      pad.h,
      0.8,
      isHovered ? 'rgba(232, 201, 122, 0.28)' : 'rgba(26, 20, 15, 0.34)',
      isHovered ? '#FDE047' : '#D6AF66',
      isHovered ? 2.2 : 1.35
    );
    drawIsoQuad(
      ctx,
      pad.x + 8,
      pad.y + 8,
      pad.w - 16,
      pad.h - 16,
      1.0,
      isHovered ? 'rgba(253, 224, 71, 0.14)' : 'rgba(214, 175, 102, 0.08)',
      'rgba(232, 201, 122, 0.55)',
      0.95
    );
    // Subtle architectural X-cross lines inside empty pad
    const p0 = worldToIso(pad.x + 12, pad.y + 12, 1.2);
    const p1 = worldToIso(pad.x + pad.w - 12, pad.y + pad.h - 12, 1.2);
    const p2 = worldToIso(pad.x + pad.w - 12, pad.y + 12, 1.2);
    const p3 = worldToIso(pad.x + 12, pad.y + pad.h - 12, 1.2);
    ctx.save();
    ctx.strokeStyle = isHovered ? 'rgba(253, 224, 71, 0.7)' : 'rgba(232, 201, 122, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();
    ctx.restore();

    const tagPos = worldToIso(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5, 12);
    drawIsoTextTag(ctx, `+ ${pad.label} · 点击配置`, tagPos.x, tagPos.y, {
      color: isHovered ? '#FEF08A' : '#E8C97A',
      bg: isHovered ? 'rgba(54, 34, 16, 0.94)' : 'rgba(24, 16, 12, 0.84)',
      border: isHovered ? '#FDE047' : '#B6924D',
      fontSize: 10,
    });
    return;
  }

  const zMeta = FRONT_HALL_ZONES[zoneId];
  const slots = world.buffetSlots.filter((s) => {
    const def = SEAFOOD_CATALOG.find((item) => item.id === s.itemId);
    return def?.zone === zoneId;
  });

  const labelPos = worldToIso(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5, 44);

  // Subtle ambient contact shadow under the buffet counter
  drawIsoQuad(ctx, pad.x + 4, pad.y + 5, pad.w, pad.h, 0.2, 'rgba(18, 12, 8, 0.28)');

  if (zoneId === 'live_seafood') {
    // Tiered Glowing Turquoise Live Seafood Aquarium Wall
    drawIsoTieredAquarium(ctx, pad.x + 4, pad.y + 4, pad.w - 8, pad.h - 8, timeSec, 2);
  } else if (zoneId === 'cooked_hot') {
    // Open Hot Wok & Iron Teppanyaki Cooked Food Counter
    drawIsoBox(ctx, pad.x, pad.y, pad.w, pad.h, 24, {
      top: isHovered ? '#D99B66' : '#B57B4C',
      left: '#85532E',
      right: '#663D1F',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 2 : 1.15,
    });
    drawIsoQuad(ctx, pad.x + 9, pad.y + 9, pad.w - 18, pad.h - 18, 24.4, '#2F2623', '#6B584E', 1);

    const ratio = world.cookedStock / Math.max(1, world.cookedMaxStock);
    const panCount = Math.max(0, Math.min(4, Math.ceil(ratio * 4)));
    const span = isVert ? pad.h - 36 : pad.w - 36;
    const panStep = span / 4;
    for (let i = 0; i < panCount; i++) {
      const px = isVert ? pad.x + pad.w * 0.5 : pad.x + 18 + (i + 0.5) * panStep;
      const py = isVert ? pad.y + 18 + (i + 0.5) * panStep : pad.y + pad.h * 0.5;
      const pc = worldToIso(px, py, 25);
      ctx.fillStyle = '#E87A35';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(pc.x, pc.y, 10, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FCD34D';
      ctx.beginPath();
      ctx.arc(pc.x - 2, pc.y - 1, 2.1, 0, Math.PI * 2);
      ctx.arc(pc.x + 3, pc.y + 0.5, 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
    if (world.cookedStock > 0) {
      const stP = worldToIso(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5, 28);
      drawSteamWisps(ctx, stP.x, stP.y, timeSec, 9.2, 1.15);
    }
    drawIsoTextTag(
      ctx,
      `熟食明档 ${world.cookedStock}/${world.cookedMaxStock}`,
      labelPos.x,
      labelPos.y - 6,
      {
        color: world.cookedStock <= 2 ? '#FCA5A5' : '#FFEDD5',
        bg: 'rgba(46, 20, 12, 0.88)',
        border: world.cookedStock <= 2 ? '#EF4444' : '#F97316',
        fontSize: 10,
      }
    );
    return;
  } else if (zoneId === 'sashimi_sushi') {
    // Hinoki Cypress Sashimi & Sushi Counter
    drawIsoBox(ctx, pad.x, pad.y, pad.w, pad.h, 24, {
      top: isHovered ? '#EED7B2' : '#DFC398',
      left: '#A88253',
      right: '#84633B',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 2 : 1.15,
    });
    drawIsoQuad(ctx, pad.x + 10, pad.y + 10, pad.w - 20, pad.h - 20, 24.4, '#C8E6E8', '#528A91', 1);
    const span = isVert ? pad.h - 36 : pad.w - 36;
    const step = span / 4;
    for (let i = 0; i < 4; i++) {
      const px = isVert ? pad.x + pad.w * 0.5 : pad.x + 18 + (i + 0.5) * step;
      const py = isVert ? pad.y + 18 + (i + 0.5) * step : pad.y + pad.h * 0.5;
      const sp = worldToIso(px, py, 25);
      ctx.fillStyle = i % 2 === 0 ? '#FB7185' : '#F97316';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, 9.5, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (zoneId === 'drinks_dessert') {
    // Beverage, Fruit & Durian Dessert Bar
    drawIsoBox(ctx, pad.x, pad.y, pad.w, pad.h, 24, {
      top: isHovered ? '#F2D0DC' : '#DEB6C5',
      left: '#9A6579',
      right: '#754A5B',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 2 : 1.15,
    });
    const span = isVert ? pad.h - 36 : pad.w - 36;
    const step = span / 4;
    for (let i = 0; i < 4; i++) {
      const px = isVert ? pad.x + pad.w * 0.5 : pad.x + 18 + (i + 0.5) * step;
      const py = isVert ? pad.y + 18 + (i + 0.5) * step : pad.y + pad.h * 0.5;
      const dp = worldToIso(px, py, 26);
      ctx.fillStyle = ['#FDE047', '#F472B6', '#38BDF8', '#A3E635'][i];
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(dp.x, dp.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    // Crushed-Ice Seafood Island or Hotpot Sides Bar
    const isIce = zoneId === 'ice_seafood';
    drawIsoBox(ctx, pad.x, pad.y, pad.w, pad.h, 22, {
      top: isIce ? '#DDF3F6' : '#C7A173',
      left: isIce ? '#8AAEB6' : '#8D613B',
      right: isIce ? '#678B94' : '#6B4628',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 2 : 1.15,
    });
    if (isIce) {
      drawIsoQuad(ctx, pad.x + 8, pad.y + 8, pad.w - 16, pad.h - 16, 22.4, '#CBEBF0', '#79B4BE', 0.9);
    } else {
      drawIsoQuad(ctx, pad.x + 8, pad.y + 8, pad.w - 16, pad.h - 16, 22.4, '#466D49', '#2A472C', 0.9);
    }
  }

  // Render live stock seafood trays inside this buffet pad (adapting to HORIZONTAL / VERTICAL!)
  if (slots.length > 0) {
    const usableSpan = Math.max(36, (isVert ? pad.h : pad.w) - 24);
    const step = usableSpan / slots.length;
    slots.forEach((slot, idx) => {
      const def = SEAFOOD_CATALOG.find((item) => item.id === slot.itemId);
      const ratio = slot.stock / Math.max(1, slot.maxStock);
      const sx = isVert ? pad.x + pad.w * 0.5 : pad.x + 12 + idx * step + step * 0.5;
      const sy = isVert ? pad.y + 12 + idx * step + step * 0.5 : pad.y + pad.h * 0.5;
      const sp = worldToIso(sx, sy, zoneId === 'live_seafood' ? 58 : 25);

      if (zoneId !== 'live_seafood') {
        const trayR = Math.max(4.5, Math.min(11.5, step * 0.24));
        ctx.fillStyle = ratio <= 0 ? 'rgba(90, 90, 95, 0.45)' : def?.color ?? '#F97316';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, trayR, trayR * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      const bw = 24;
      ctx.fillStyle = 'rgba(18, 12, 10, 0.86)';
      ctx.fillRect(sp.x - bw / 2, sp.y - 14, bw, 4.2);
      ctx.fillStyle = ratio <= 0.25 ? '#EF4444' : ratio <= 0.55 ? '#FBBF24' : '#4ADE80';
      ctx.fillRect(sp.x - bw / 2 + 0.5, sp.y - 13.5, (bw - 1) * Math.max(0, Math.min(1, ratio)), 3.2);
    });
  }

  // Subtle zone label
  const anyEmpty = slots.some((s) => s.stock <= 1);
  drawIsoTextTag(
    ctx,
    anyEmpty ? `${zMeta.shortLabel} · 急需补菜` : zMeta.shortLabel,
    labelPos.x,
    zoneId === 'live_seafood' ? labelPos.y - 24 : labelPos.y - 4,
    {
      color: anyEmpty ? '#FCA5A5' : '#FFF6E5',
      bg: anyEmpty ? 'rgba(115, 22, 16, 0.92)' : 'rgba(26, 18, 14, 0.84)',
      border: anyEmpty ? '#F87171' : zMeta.accentColor,
      fontSize: 10,
    }
  );
}

function drawIsoTopKitchenStation(
  ctx: CanvasRenderingContext2D,
  key: 'SINK' | 'CLEAN_RACK' | 'BROTH_KITCHEN' | 'COLD_PREP',
  world: GameWorld,
  timeSec: number,
  isHovered: boolean
) {
  const st = STATIONS[key];
  const inset = 8;
  const wx = st.x - st.w / 2 + inset;
  const wy = st.y - st.h / 2;
  const sw = st.w - inset * 2;
  const topCenter = worldToIso(st.x, st.y, 44);

  if (key === 'SINK') {
    drawIsoBox(ctx, wx, wy, sw, st.h, 24, {
      top: isHovered ? '#A8E2DF' : '#80C4C2',
      left: '#529395',
      right: '#3B7275',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 2 : 1.15,
    });
    // Basin recess
    drawIsoQuad(ctx, wx + 14, wy + 16, sw - 28, st.h - 32, 24.4, '#387A82', '#1C4B52', 1);
    drawIsoTextTag(ctx, `洗碗池 (脏${world.dirtyDishes})`, topCenter.x, topCenter.y, {
      color: world.dirtyDishes >= 3 ? '#FCA5A5' : '#E0F2FE',
      bg: 'rgba(19, 38, 44, 0.88)',
      border: world.dirtyDishes >= 3 ? '#EF4444' : '#38BDF8',
      fontSize: 10,
    });
  } else if (key === 'CLEAN_RACK') {
    drawIsoBox(ctx, wx, wy, sw, st.h, 26, {
      top: isHovered ? '#E5E7EB' : '#CBD5E1',
      left: '#94A3B8',
      right: '#64748B',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 2 : 1.15,
    });
    // Crisp stacks of gleaming white porcelain bowls
    for (let i = 0; i < 3; i++) {
      const pp = worldToIso(wx + 24 + i * 38, st.y, 29);
      for (let stack = 0; stack < 3; stack++) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(pp.x, pp.y - stack * 3, 7, 3.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    drawIsoTextTag(ctx, `消毒柜 (净${world.cleanDishes})`, topCenter.x, topCenter.y, {
      color: '#DCFCE7',
      bg: 'rgba(20, 42, 34, 0.88)',
      border: '#4ADE80',
      fontSize: 10,
    });
  } else if (key === 'BROTH_KITCHEN') {
    drawIsoBox(ctx, wx, wy, sw, st.h, 24, {
      top: isHovered ? '#D8A06E' : '#B57B4A',
      left: '#85512C',
      right: '#633A1D',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 2 : 1.15,
    });
    // Twin glowing broth cauldrons with curling steam!
    for (let i = 0; i < 3; i++) {
      const bx = wx + 38 + i * 68;
      const bp = worldToIso(bx, st.y, 26);
      ctx.fillStyle = '#3B2820';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = i === 0 ? '#DC2626' : i === 1 ? '#F59E0B' : '#EA580C';
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y - 1.5, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      drawSteamWisps(ctx, bp.x, bp.y - 5, timeSec, 3.3 + i * 2.1, 0.9);
    }
    drawIsoTextTag(ctx, '熬汤锅底灶', topCenter.x, topCenter.y, {
      color: '#FEF3C7',
      bg: 'rgba(54, 24, 14, 0.88)',
      border: '#F59E0B',
      fontSize: 10,
    });
  } else {
    drawIsoBox(ctx, wx, wy, sw, st.h, 24, {
      top: isHovered ? '#BFEAF0' : '#96CED8',
      left: '#6098A6',
      right: '#467685',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 2 : 1.15,
    });
    drawIsoQuad(ctx, wx + 14, wy + 14, sw - 28, st.h - 28, 24.4, '#E0F7FA', '#5BA4B5', 0.9);
    drawIsoTextTag(ctx, `生鲜备菜台 (料${world.rawIngredients})`, topCenter.x, topCenter.y, {
      color: '#E0F2FE',
      bg: 'rgba(18, 42, 54, 0.88)',
      border: '#38BDF8',
      fontSize: 10,
    });
  }
}

function drawIsoBackstageRoomProps(
  ctx: CanvasRenderingContext2D,
  room: BackstageRoomRect,
  world: GameWorld,
  timeSec: number,
  isCurrentRoom: boolean,
  isHovered: boolean
) {
  const wy = room.y + BACKSTAGE_OFFSET_Y;
  const { x, w, h } = room;

  if (room.id === 'cold_storage') {
    // Tiered live holding aquariums + walk-in freezer crates
    drawIsoTieredAquarium(ctx, x + 16, wy + 18, 128, 56, timeSec, 2);
    // Silver cold-storage crates
    drawIsoBox(ctx, x + 22, wy + 108, 46, 36, 24, {
      top: '#A5C9D8',
      left: '#739DB0',
      right: '#52798C',
    });
    drawIsoBox(ctx, x + 78, wy + 102, 42, 34, 30, {
      top: '#C7E2ED',
      left: '#8AB5C7',
      right: '#648FA3',
    });
  } else if (room.id === 'hot_kitchen') {
    // Commercial twin wok range + stainless prep table
    drawIsoBox(ctx, x + 18, wy + 22, 168, 52, 26, {
      top: '#C8A379',
      left: '#8C623B',
      right: '#694626',
    });
    for (let i = 0; i < 2; i++) {
      const wp = worldToIso(x + 56 + i * 74, wy + 48, 28);
      ctx.fillStyle = '#2B2422';
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.ellipse(wp.x, wp.y, 15, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.ellipse(wp.x, wp.y - 1, 9, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      drawSteamWisps(ctx, wp.x, wp.y - 5, timeSec, 11.4 + i * 3, 1.15);
    }
    // Prep counter
    drawIsoBox(ctx, x + 28, wy + 114, 96, 38, 20, {
      top: '#D1D5DB',
      left: '#9CA3AF',
      right: '#6B7280',
    });
  } else if (room.id === 'dish_washroom') {
    // High-temp dishwashing conveyor & sanitizing shelves
    drawIsoBox(ctx, x + 18, wy + 24, 174, 52, 28, {
      top: '#9CD5DC',
      left: '#62A3AE',
      right: '#467D87',
    });
    drawIsoQuad(ctx, x + 32, wy + 34, 146, 32, 28.4, '#3B7F8C', '#1D4E59', 1);
    drawIsoBox(ctx, x + 26, wy + 112, 82, 34, 24, {
      top: '#E2E8F0',
      left: '#94A3B8',
      right: '#64748B',
    });
  } else if (room.id === 'office') {
    // Manager's carved mahogany executive desk + bookshelf + brass lamp
    drawIsoBox(ctx, x + 24, wy + 20, 158, 26, 46, {
      top: '#8A5A36',
      left: '#664024',
      right: '#4B2D18',
    });
    drawIsoBox(ctx, x + 52, wy + 104, 112, 48, 22, {
      top: '#A87042',
      left: '#7C4E2B',
      right: '#5B371C',
    });
    // Ledger book on desk
    drawIsoQuad(ctx, x + 84, wy + 116, 26, 20, 22.5, '#FEF3C7', '#92400E', 0.9);
  } else if (room.id === 'restroom') {
    // Style-3 Iconic Jade-Mint Multi-Sink Handwashing Zone!
    // Left porcelain handwashing counter with 3 basins
    drawIsoBox(ctx, x + 20, wy + 22, 184, 42, 24, {
      top: '#E6F7F5',
      left: '#93CFC8',
      right: '#69ADA5',
    });
    for (let i = 0; i < 3; i++) {
      const bp = worldToIso(x + 52 + i * 54, wy + 43, 24.5);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#357873';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y, 11, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Restroom stalls on right side
    drawIsoBox(ctx, x + 20, wy + 124, 72, 74, 34, {
      top: '#78C2B7',
      left: '#529C92',
      right: '#3B7A72',
    });
    drawIsoBox(ctx, x + 104, wy + 124, 72, 74, 34, {
      top: '#78C2B7',
      left: '#529C92',
      right: '#3B7A72',
    });
  } else if (room.id === 'equipment_room') {
    // Chiller compressors, ice maker & oxygen manifold
    drawIsoBox(ctx, x + 24, wy + 26, 76, 60, 44, {
      top: '#94A3B8',
      left: '#64748B',
      right: '#475569',
    });
    drawIsoBox(ctx, x + 116, wy + 26, 76, 60, 38, {
      top: '#CBD5E1',
      left: '#7C8EA3',
      right: '#526275',
    });
    // Status gauge LED on machinery
    const gp = worldToIso(x + 62, wy + 86, 30);
    ctx.fillStyle = world.equipmentHealth < 55 ? '#EF4444' : '#4ADE80';
    ctx.beginPath();
    ctx.arc(gp.x, gp.y, 3.8, 0, Math.PI * 2);
    ctx.fill();
    drawIsoBox(ctx, x + 28, wy + 132, 112, 42, 24, {
      top: '#D97706',
      left: '#B45309',
      right: '#78350F',
    });
  } else if (room.id === 'dormitory') {
    // Cozy warm staff bunk beds & tea table
    drawIsoBox(ctx, x + 22, wy + 26, 104, 52, 22, {
      top: '#FDE68A',
      left: '#B45309',
      right: '#78350F',
    });
    drawIsoQuad(ctx, x + 26, wy + 30, 26, 44, 22.6, '#FFFFFF', '#D97706', 0.8);
    drawIsoBox(ctx, x + 148, wy + 26, 104, 52, 22, {
      top: '#FECDD3',
      left: '#9F1239',
      right: '#701A31',
    });
    drawIsoQuad(ctx, x + 152, wy + 30, 26, 44, 22.6, '#FFFFFF', '#BE123C', 0.8);
    // Low tea table
    drawIsoBox(ctx, x + 84, wy + 132, 88, 52, 14, {
      top: '#A87042',
      left: '#7A4F2B',
      right: '#5B371C',
    });
  }

  // Special Staff NPC in Cold Storage (林汐) / Hot Kitchen (沈知微) / Office (苏星遥)
  if (room.sideStoryStaffId) {
    const def = getSpecialStaffDef(room.sideStoryStaffId);
    const bond = world.specialStaffBonds[room.sideStoryStaffId];
    const npcWy = room.npcY + BACKSTAGE_OFFSET_Y;
    drawIsoCharacter(ctx, {
      wx: room.npcX,
      wy: npcWy,
      bodyColor: def.color,
      trimColor: '#FEF3C7',
      hairColor: '#1E1612',
      isChef: room.sideStoryStaffId === 'shen_zhiwei',
      highlightRing: bond?.recruited ? '#E8C97A' : '#38BDF8',
      scale: 1.02,
    });
    const np = worldToIso(room.npcX, npcWy, 42);
    drawIsoTextTag(
      ctx,
      bond?.recruited ? `${def.name} ♥${bond.affection}` : `★ ${def.name}（可招募）`,
      np.x,
      np.y,
      {
        color: '#FFFBEB',
        bg: 'rgba(30, 18, 12, 0.9)',
        border: def.color,
        fontSize: 10,
      }
    );
  }

  // Room title badge centered cleanly
  const titlePos = worldToIso(x + w * 0.5, wy + h * 0.5, 56);
  const statusHint =
    room.id === 'restroom' && world.restroomCleanliness < 55
      ? ` · 洁净${Math.round(world.restroomCleanliness)}%`
      : room.id === 'equipment_room' && world.equipmentHealth < 60
        ? ` · 状态${Math.round(world.equipmentHealth)}%`
        : '';

  drawIsoTextTag(ctx, `${room.shortName}${statusHint}`, titlePos.x, titlePos.y, {
    color: isCurrentRoom || isHovered ? '#FEF08A' : '#F3E8D8',
    bg: isCurrentRoom ? 'rgba(56, 32, 16, 0.92)' : 'rgba(20, 26, 26, 0.84)',
    border: isCurrentRoom || isHovered ? '#FDE047' : room.accentColor,
    fontSize: 10.5,
  });
}

// ==========================================
// MAIN UNIFIED ISOMETRIC GRAND MAP RENDERER
// ==========================================

export function renderUnifiedIsoCanvas(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  timeSec: number,
  hoverPos: { x: number; y: number } | null,
  backingWidth: number,
  backingHeight: number,
  camera?: SceneCamera
) {
  const frontBounds = getFrontHallBounds(world.shopLevel);
  const frontW = frontBounds.width;
  const frontH = frontBounds.height;
  const vt = getIsoViewportTransform(backingWidth, backingHeight, camera, world.shopLevel);
  const decor = getDecorThemeDef(world.activeDecorThemeId);

  // 1. Style-3 Deep Architectural Jade-Slate Backdrop Void (clean 60% neutral surround)
  ctx.save();
  const bgGrad = ctx.createRadialGradient(
    backingWidth * 0.5,
    backingHeight * 0.48,
    backingHeight * 0.12,
    backingWidth * 0.5,
    backingHeight * 0.5,
    Math.max(backingWidth, backingHeight) * 0.78
  );
  bgGrad.addColorStop(0, '#1B3435');
  bgGrad.addColorStop(0.65, '#132526');
  bgGrad.addColorStop(1, '#0C1718');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, backingWidth, backingHeight);

  // Subtle architectural drafting diagonal lines in background void
  ctx.strokeStyle = 'rgba(232, 201, 122, 0.035)';
  ctx.lineWidth = 1;
  const gridStep = Math.max(48, Math.round(64 * vt.scale));
  for (let gx = -backingHeight; gx < backingWidth + backingHeight; gx += gridStep) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx + backingHeight * 2, backingHeight);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Transform into Unified Isometric Architectural Space
  ctx.save();
  ctx.setTransform(vt.scale, 0, 0, vt.scale, vt.offsetX, vt.offsetY);

  // Drop shadow underneath the grand floating cutaway slab (Backstage + Expanded Front Hall)
  drawIsoQuad(
    ctx,
    18,
    UNIFIED_MIN_Y + 18,
    UNIFIED_MAX_X,
    Math.abs(UNIFIED_MIN_Y),
    -24,
    'rgba(4, 10, 11, 0.55)'
  );
  drawIsoQuad(ctx, 18, 18, frontW, frontH, -24, 'rgba(4, 10, 11, 0.55)');

  // Thick Architectural Foundation Cross-Section Slab (Backstage Wing + Dynamically Expanded Front Hall)
  drawIsoBox(
    ctx,
    0,
    UNIFIED_MIN_Y,
    UNIFIED_MAX_X,
    Math.abs(UNIFIED_MIN_Y),
    22,
    {
      top: '#3B281B',
      left: '#2B1C13',
      right: '#1E130D',
      stroke: INK,
      lineWidth: 1.8,
    },
    -22
  );
  drawIsoBox(
    ctx,
    0,
    0,
    frontW,
    frontH,
    22,
    {
      top: '#3B281B',
      left: '#2B1C13',
      right: '#1E130D',
      stroke: INK,
      lineWidth: 1.8,
    },
    -22
  );

  // ==========================================
  // 3. FLOORS: UNIFIED BACKSTAGE + FRONT HALL
  // ==========================================

  // 3A. Backstage Wing Base Floor & Central Corridor
  drawIsoQuad(
    ctx,
    0,
    UNIFIED_MIN_Y,
    UNIFIED_MAX_X,
    Math.abs(BACKSTAGE_OFFSET_Y),
    0,
    '#4A382C'
  );

  // Central Backstage Corridor (warm stone tile runner)
  drawIsoTileGrid(
    ctx,
    BACKSTAGE_CORRIDOR.x,
    BACKSTAGE_CORRIDOR.y + BACKSTAGE_OFFSET_Y,
    BACKSTAGE_CORRIDOR.w,
    BACKSTAGE_CORRIDOR.h,
    36,
    '#7D6451',
    '#705847',
    'rgba(29, 21, 16, 0.16)'
  );

  // Each of the 7 Backstage Rooms' Distinct Architectural Flooring
  const activeBackstageRoom =
    world.activeScene === 'BACKSTAGE' ? getBackstagePlayerRoom(world) : null;

  const roomFloorPalettes: Record<FacilitySceneId, [string, string]> = {
    cold_storage: ['#6C9AA8', '#618F9D'],
    hot_kitchen: ['#A67555', '#9A6B4C'],
    dish_washroom: ['#73AAAE', '#679DA1'],
    office: ['#8E6444', '#825B3C'],
    restroom: ['#63C5B8', '#55B7AA'], // Signature Mockup-3 Jade-Mint Restroom Tile!
    equipment_room: ['#687680', '#5E6B75'],
    dormitory: ['#B89A70', '#AC8F65'],
  };

  for (const r of BACKSTAGE_ROOMS) {
    const rwy = r.y + BACKSTAGE_OFFSET_Y;
    const pal = roomFloorPalettes[r.id];
    const isHov =
      hoverPos !== null &&
      hoverPos.x >= r.x &&
      hoverPos.x <= r.x + r.w &&
      hoverPos.y >= rwy &&
      hoverPos.y <= rwy + r.h;

    drawIsoTileGrid(ctx, r.x, rwy, r.w, r.h, 36, pal[0], pal[1]);

    if (isHov || activeBackstageRoom === r.id) {
      drawIsoQuad(
        ctx,
        r.x + 2,
        rwy + 2,
        r.w - 4,
        r.h - 4,
        0.3,
        isHov ? 'rgba(253, 224, 71, 0.14)' : 'rgba(232, 201, 122, 0.1)',
        isHov ? '#FDE047' : '#E8C97A',
        1.6
      );
    }
  }

  // 3B. Front Dining Hall Floors (Kitchen strip + Warm Honey-Teak Dining Parquet)
  const teakA =
    decor.id === 'retro_mahogany'
      ? '#A67248'
      : decor.id === 'obsidian_sushi'
        ? '#7C7268'
        : decor.id === 'azure_luxury'
          ? '#BFA57D'
          : '#C1915B';
  const teakB =
    decor.id === 'retro_mahogany'
      ? '#97653E'
      : decor.id === 'obsidian_sushi'
        ? '#6F665D'
        : decor.id === 'azure_luxury'
          ? '#B29770'
          : '#B48450';

  // Upper Front Kitchen Service Strip (y = 0..124, base width 960)
  drawIsoTileGrid(ctx, 0, 0, CANVAS_WIDTH, 124, 34, '#928B7E', '#857F73', 'rgba(29,21,16,0.16)');

  // Main Dining Hall Warm Honey-Teak Floor (y = 124..frontH, x = 0..frontW)
  drawIsoTileGrid(
    ctx,
    0,
    124,
    frontW,
    frontH - 124,
    40,
    teakA,
    teakB,
    'rgba(78, 47, 24, 0.18)'
  );

  // Expanded East Wing North Floor (x = 960..frontW, y = 0..124 when shopLevel >= 2!)
  if (frontW > CANVAS_WIDTH) {
    drawIsoTileGrid(
      ctx,
      CANVAS_WIDTH,
      0,
      frontW - CANVAS_WIDTH,
      124,
      40,
      teakA,
      teakB,
      'rgba(78, 47, 24, 0.18)'
    );
    // Subtle brass architectural expansion threshold seam at x = 960
    drawIsoQuad(ctx, CANVAS_WIDTH - 2, 10, 4, frontH - 20, 0.4, 'rgba(232, 201, 122, 0.45)');
  }

  // Subtle brass architectural expansion threshold seam at y = 640 (when shopLevel >= 3!)
  if (frontH > CANVAS_HEIGHT) {
    drawIsoQuad(ctx, 14, CANVAS_HEIGHT - 2, frontW - 28, 4, 0.4, 'rgba(232, 201, 122, 0.45)');
  }

  // Crimson Welcome Carpet Runner at Reception & Queue (left side of Front Hall)
  drawIsoQuad(ctx, 26, 174, 118, 430, 0.4, '#8F2D24', '#D9A74A', 1.4);
  drawIsoQuad(ctx, 34, 182, 102, 414, 0.5, '#A3362B', '#E8C97A', 0.9);

  // Seamless Connecting Service Passageways between Backstage & Front Hall (3 aligned open aisles!)
  for (const arch of FRONT_BACK_ARCHWAYS) {
    drawIsoQuad(
      ctx,
      arch.x - arch.halfWidth + 2,
      -52,
      (arch.halfWidth - 2) * 2,
      174,
      0.5,
      '#A67C52',
      '#E8C97A',
      1.15
    );
  }

  // ==========================================
  // 4. TALL BACK EXTERIOR CUTAWAY WALLS
  // ==========================================
  const WALL_H = 74;
  const WALL_T = 14;

  // Back-Right Outer Wall (wy = UNIFIED_MIN_Y - WALL_T, wx = 0..960)
  drawIsoBox(ctx, -WALL_T, UNIFIED_MIN_Y - WALL_T, UNIFIED_MAX_X + WALL_T, WALL_T, WALL_H, {
    top: '#4F3320',
    left: '#DAC19A', // warm plaster inner face visible to camera
    right: '#69442B',
  });
  // Carved timber wainscoting along back-right inner wall
  drawIsoBox(ctx, 0, UNIFIED_MIN_Y - 2, UNIFIED_MAX_X, 2, 24, {
    top: '#6B4327',
    left: '#7C4F2F',
    right: '#59361E',
  });

  // Back-Left Outer Wall (wx = -WALL_T, wy = UNIFIED_MIN_Y..frontH)
  drawIsoBox(ctx, -WALL_T, UNIFIED_MIN_Y, WALL_T, frontH - UNIFIED_MIN_Y, WALL_H, {
    top: '#4F3320',
    left: '#69442B',
    right: '#CDB289', // warm plaster inner face visible to camera
  });
  // Carved timber wainscoting along back-left inner wall
  drawIsoBox(ctx, -2, UNIFIED_MIN_Y, 2, frontH - UNIFIED_MIN_Y, 24, {
    top: '#6B4327',
    left: '#59361E',
    right: '#73482B',
  });

  // Architectural Structural Pillars along back walls
  for (let px = 0; px <= UNIFIED_MAX_X; px += 240) {
    drawIsoBox(ctx, px - 6, UNIFIED_MIN_Y - 12, 14, 14, WALL_H + 3, {
      top: '#5E3B23',
      left: '#4B2E1B',
      right: '#3A2213',
    });
  }
  for (let py = UNIFIED_MIN_Y + 220; py <= frontH; py += 220) {
    drawIsoBox(ctx, -12, py - 6, 14, 14, WALL_H + 3, {
      top: '#5E3B23',
      left: '#4B2E1B',
      right: '#3A2213',
    });
  }

  // Interior Mid-Height Partition Walls separating the 7 Backstage Rooms (cutaway architectural look!)
  const PART_H = 38;
  // Vertical dividers between top-row backstage rooms
  for (const divX of [246, 476, 706]) {
    drawIsoBox(ctx, divX, UNIFIED_MIN_Y + 20, 8, 256, PART_H, {
      top: '#5E3B23',
      left: '#8C623E',
      right: '#C5AA83',
    });
  }
  // Horizontal wall along top of Backstage Corridor with doorways into top 4 rooms
  const topWallY = 278 + BACKSTAGE_OFFSET_Y;
  const topWallSegs: Array<[number, number]> = [
    [24, 108],
    [164, 336],
    [394, 566],
    [624, 796],
    [854, 936],
  ];
  for (const [x1, x2] of topWallSegs) {
    drawIsoBox(ctx, x1, topWallY, x2 - x1, 7, 26, {
      top: '#5E3B23',
      left: '#A98761',
      right: '#6B4529',
    });
  }
  // Golden doorway threshold mats for top 4 rooms
  for (const doorX of [135, 365, 595, 825]) {
    drawIsoQuad(ctx, doorX - 26, topWallY - 1, 52, 10, 0.6, '#C49A5C', '#E8C97A', 0.9);
  }

  // Horizontal wall along bottom of Backstage Corridor separating Restroom, Equipment Room & Dormitory (with doorways!)
  const bottomWallY = 355 + BACKSTAGE_OFFSET_Y;
  const bottomWallSegs: Array<{ x1: number; x2: number; jade?: boolean }> = [
    { x1: 24, x2: 144, jade: true },
    { x1: 200, x2: 324, jade: true },
    { x1: 324, x2: 452 },
    { x1: 508, x2: 636 },
    { x1: 636, x2: 760 },
    { x1: 816, x2: 936 },
  ];
  for (const seg of bottomWallSegs) {
    drawIsoBox(
      ctx,
      seg.x1,
      bottomWallY,
      seg.x2 - seg.x1,
      7,
      26,
      seg.jade
        ? {
            top: '#4F7A74',
            left: '#5AAEA2',
            right: '#84D1C6',
          }
        : {
            top: '#5E3B23',
            left: '#A98761',
            right: '#6B4529',
          }
    );
  }
  // Golden doorway threshold mats for bottom 3 rooms (restroom, equipment_room, dormitory)
  for (const doorX of [172, 480, 788]) {
    drawIsoQuad(ctx, doorX - 26, bottomWallY - 1, 52, 10, 0.6, '#C49A5C', '#E8C97A', 0.9);
  }

  // Vertical dividers between bottom-row backstage rooms (extending cleanly from corridor wall to front-back dividing wall!)
  drawIsoBox(ctx, 320, 355 + BACKSTAGE_OFFSET_Y, 8, 287, PART_H, {
    top: '#4F7A74',
    left: '#5AAEA2',
    right: '#84D1C6',
  });
  drawIsoBox(ctx, 632, 355 + BACKSTAGE_OFFSET_Y, 8, 287, PART_H, {
    top: '#5E3B23',
    left: '#8C623E',
    right: '#C5AA83',
  });

  // Grand Partition Wall separating Backstage Wing from Front Dining Hall (with 3 wide open golden archways!)
  const divFrontBackSegs: Array<[number, number]> = [
    [0, 196],
    [246, 378],
    [434, 652],
    [712, 960],
  ];
  for (const [x1, x2] of divFrontBackSegs) {
    drawIsoBox(ctx, x1, -20, x2 - x1, 14, 42, {
      top: '#5E3B23',
      left: '#D6BC93',
      right: '#7C4F2F',
    });
    // Timber rail accent
    drawIsoBox(ctx, x1, -8, x2 - x1, 3, 18, {
      top: '#784D2C',
      left: '#8A5B37',
      right: '#5E3A1F',
    });
  }
  // Golden timber archway headers spanning all 3 seamless front-back passages!
  for (const arch of FRONT_BACK_ARCHWAYS) {
    drawIsoBox(
      ctx,
      arch.x - arch.halfWidth - 2,
      -20,
      (arch.halfWidth + 2) * 2,
      14,
      10,
      { top: '#8A5A32', left: '#B98746', right: '#6B4220' },
      34
    );
  }

  // East Wing Exterior Back-Right Cutaway Wall (when expanded to Lv.2+: frontW > 960)
  if (frontW > CANVAS_WIDTH) {
    drawIsoBox(ctx, CANVAS_WIDTH, -20, frontW - CANVAS_WIDTH, 14, 48, {
      top: '#4F3320',
      left: '#DAC19A',
      right: '#69442B',
    });
    drawIsoBox(ctx, CANVAS_WIDTH, -8, frontW - CANVAS_WIDTH, 3, 20, {
      top: '#784D2C',
      left: '#8A5B37',
      right: '#5E3A1F',
    });
    drawIsoBox(ctx, frontW - 6, -20, 14, 14, 51, {
      top: '#5E3B23',
      left: '#4B2E1B',
      right: '#3A2213',
    });
  }

  // ==========================================
  // 5. DEPTH-SORTED 3D PROPS, STATIONS, TABLES & CHARACTERS
  // ==========================================
  type DepthItem = { depth: number; draw: () => void };
  const items: DepthItem[] = [];

  // 5A. Backstage 7 Rooms Props & Special Staff NPCs
  for (const r of BACKSTAGE_ROOMS) {
    const rwy = r.y + BACKSTAGE_OFFSET_Y;
    const isHov =
      hoverPos !== null &&
      hoverPos.x >= r.x &&
      hoverPos.x <= r.x + r.w &&
      hoverPos.y >= rwy &&
      hoverPos.y <= rwy + r.h;
    items.push({
      depth: r.x + r.w * 0.5 + (rwy + r.h * 0.5),
      draw: () =>
        drawIsoBackstageRoomProps(
          ctx,
          r,
          world,
          timeSec,
          activeBackstageRoom === r.id,
          isHov
        ),
    });
  }

  // 5B. Front Hall Top Kitchen Stations
  const topStationKeys: Array<'SINK' | 'CLEAN_RACK' | 'BROTH_KITCHEN' | 'COLD_PREP'> = [
    'SINK',
    'CLEAN_RACK',
    'BROTH_KITCHEN',
    'COLD_PREP',
  ];
  for (const key of topStationKeys) {
    const st = STATIONS[key];
    const isHov =
      hoverPos !== null &&
      Math.abs(hoverPos.x - st.x) <= st.w * 0.55 &&
      Math.abs(hoverPos.y - st.y) <= st.h * 0.55;
    items.push({
      depth: st.x + st.y,
      draw: () => drawIsoTopKitchenStation(ctx, key, world, timeSec, isHov),
    });
  }

  // 5C. Front Hall Reception Counter & Wooden Entry Arch
  const rec = STATIONS.RECEPTION;
  const recHover =
    hoverPos !== null &&
    Math.abs(hoverPos.x - rec.x) <= rec.w * 0.6 &&
    Math.abs(hoverPos.y - rec.y) <= rec.h * 0.6;
  items.push({
    depth: rec.x + rec.y,
    draw: () => {
      drawIsoBox(ctx, rec.x - 42, rec.y - 24, 84, 48, 28, {
        top: recHover ? '#DFAF6C' : '#BE8A52',
        left: '#8C5B32',
        right: '#684122',
        stroke: recHover ? '#FDE047' : INK,
        lineWidth: recHover ? 2 : 1.15,
      });
      // Ledger & Brass Bell
      const lp = worldToIso(rec.x, rec.y, 29);
      ctx.fillStyle = '#F6DA8D';
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.arc(lp.x + 8, lp.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      drawIsoTextTag(
        ctx,
        world.queue.length > 0 ? `迎宾台 (排队${world.queue.length})` : '迎宾接待台',
        lp.x,
        lp.y - 22,
        {
          color: world.queue.length > 0 ? '#FEF08A' : '#FFF6E5',
          bg: world.queue.length > 0 ? 'rgba(130, 32, 18, 0.92)' : 'rgba(32, 20, 14, 0.86)',
          border: world.queue.length > 0 ? '#F59E0B' : '#B6924D',
          fontSize: 10,
        }
      );
    },
  });

  // 5D. Unlocked Spaced Customizable Front-Hall Zone Pads (Lv.1..Lv.5 map expansion!)
  const unlockedPads = getUnlockedZonePads(world);
  for (const { pad, zoneId } of unlockedPads) {
    const isHov =
      hoverPos !== null &&
      hoverPos.x >= pad.x &&
      hoverPos.x <= pad.x + pad.w &&
      hoverPos.y >= pad.y &&
      hoverPos.y <= pad.y + pad.h;
    items.push({
      depth: zoneId ? pad.x + pad.w * 0.5 + (pad.y + pad.h * 0.5) : -99999 + pad.x + pad.y,
      draw: () => drawIsoZonePad(ctx, pad, zoneId, world, timeSec, isHov),
    });
  }

  // 5E. Dining Hall Hotpot Tables (only unlocked tables!)
  for (const table of world.tables) {
    if (table.status === 'LOCKED') continue;
    const isHov =
      hoverPos !== null &&
      Math.abs(hoverPos.x - table.x) <= 44 &&
      Math.abs(hoverPos.y - table.y) <= 44;
    items.push({
      depth: table.x + table.y,
      draw: () => drawIsoHotpotTable(ctx, table, world, timeSec, isHov),
    });
  }

  // 5F. Queuing Guests on Crimson Welcome Carpet
  world.queue.forEach((qItem: QueueCustomer, idx: number) => {
    const party = qItem.party;
    const qx = 84;
    const qy = 286 + idx * 44;
    items.push({
      depth: qx + qy,
      draw: () => {
        drawIsoCharacter(ctx, {
          wx: qx,
          wy: qy,
          bodyColor: party.isVip ? '#7C3AED' : party.specialStoryId ? '#0F766E' : '#475569',
          trimColor: party.isVip ? '#FDE68A' : '#E2E8F0',
          hairColor: '#231812',
          isVip: party.isVip,
          scale: 0.96,
        });
        const p = worldToIso(qx, qy, 40);
        const ratio = Math.max(0, Math.min(1, party.patience / Math.max(1, party.maxPatience)));
        ctx.fillStyle = 'rgba(18, 12, 8, 0.85)';
        ctx.fillRect(p.x - 16, p.y - 2, 32, 4.5);
        ctx.fillStyle = ratio > 0.5 ? '#4ADE80' : ratio > 0.25 ? '#FBBF24' : '#EF4444';
        ctx.fillRect(p.x - 15.5, p.y - 1.5, 31 * ratio, 3.5);
        if (party.displayName) {
          drawIsoTextTag(ctx, `★ ${party.displayName}`, p.x, p.y - 12, {
            color: '#FEF08A',
            bg: 'rgba(34, 20, 14, 0.9)',
            border: '#E8C97A',
            fontSize: 9.5,
          });
        }
      },
    });
  });

  // 5G. Hired Staff in Front Hall (clean — NO floating name clutter!)
  const roleColors: Record<HiredStaff['role'], { body: string; trim: string; chef?: boolean }> = {
    HOST: { body: '#9D174D', trim: '#FCE7F3' },
    STOCKER: { body: '#0F766E', trim: '#CCFBF1' },
    RUNNER: { body: '#0284C7', trim: '#E0F2FE' },
    BUSSER: { body: '#6D28D9', trim: '#EDE9FE' },
    DISHWASHER: { body: '#0369A1', trim: '#BAE6FD' },
    SETTER: { body: '#2B7A78', trim: '#DEF2F1' },
    CHEF: { body: '#F8FAFC', trim: '#F97316', chef: true },
    LIVE_MASTER: { body: '#0D9488', trim: '#99F6E4' },
    SUSHI_CHEF: { body: '#FFF1F2', trim: '#FB7185', chef: true },
    TECHNICIAN: { body: '#475569', trim: '#FDE047' },
    INVENTORY_CLERK: { body: '#B45309', trim: '#FEF3C7' },
  };

  const canChatStaff = world.phase === 'PREP' || world.phase === 'CLOSING';
  for (const s of world.staff) {
    const rc = roleColors[s.role] ?? { body: '#2B7A78', trim: '#E2E8F0' };
    items.push({
      depth: s.x + s.y,
      draw: () => {
        drawIsoCharacter(ctx, {
          wx: s.x,
          wy: s.y,
          bodyColor: rc.body,
          trimColor: rc.trim,
          hairColor: '#1E1612',
          isChef: rc.chef,
          walkCycle: s.walkCycle,
          carrying: s.carrying,
          highlightRing:
            canChatStaff && !world.staffChattedTodayIds.includes(s.id)
              ? 'rgba(232, 201, 122, 0.75)'
              : undefined,
          scale: 0.98,
        });
        if (canChatStaff && !world.staffChattedTodayIds.includes(s.id)) {
          const sp = worldToIso(s.x, s.y, 44 + Math.sin(timeSec * 3.5 + s.x) * 2);
          drawIsoTextTag(ctx, '💬', sp.x, sp.y, {
            color: '#FEF08A',
            bg: 'rgba(32, 20, 14, 0.9)',
            border: '#E8C97A',
            fontSize: 9.5,
          });
        }
      },
    });
  }

  // 5H. Unified Player Manager Avatar (renders seamlessly wherever active: Front Hall OR Backstage!)
  const charDef = getCharacterDef(world.characterId);
  const managerWx =
    world.activeScene === 'BACKSTAGE' ? world.backstagePlayer.x : world.player.x;
  const managerWy =
    world.activeScene === 'BACKSTAGE'
      ? world.backstagePlayer.y + BACKSTAGE_OFFSET_Y
      : world.player.y;
  const managerWalk =
    world.activeScene === 'BACKSTAGE' ? world.backstagePlayer.walkCycle : world.player.walkCycle;

  items.push({
    depth: managerWx + managerWy + 1,
    draw: () => {
      drawIsoCharacter(ctx, {
        wx: managerWx,
        wy: managerWy,
        bodyColor: '#8C2A1E',
        trimColor: '#F6DA8D',
        hairColor: '#1C130E',
        isManager: true,
        walkCycle: managerWalk,
        carrying: world.activeScene === 'DINING_HALL' ? world.player.carrying : 'NONE',
        highlightRing: '#FDE047',
        scale: 1.08,
      });
      const mp = worldToIso(managerWx, managerWy, 48);
      drawIsoTextTag(ctx, `店长·${charDef.name}`, mp.x, mp.y, {
        color: '#FEF08A',
        bg: 'rgba(38, 20, 12, 0.9)',
        border: '#E8C97A',
        fontSize: 10,
      });
    },
  });

  // Sort back-to-front by isometric depth (wx + wy) and paint!
  items.sort((a, b) => a.depth - b.depth);
  for (const it of items) {
    it.draw();
  }

  // ==========================================
  // 6. LOW FRONT ARCHITECTURAL CUTAWAY RIM + WARM LANTERNS
  // ==========================================
  // Backstage Front-Right outer low rim (wx = 960, y = -662..0)
  drawIsoBox(ctx, UNIFIED_MAX_X, UNIFIED_MIN_Y, 8, Math.abs(UNIFIED_MIN_Y), 12, {
    top: '#4F3320',
    left: '#3B2416',
    right: '#2A190F',
  });
  // Expanded Front Hall Front-Right outer low rim (wx = frontW, y = 0..frontH)
  drawIsoBox(ctx, frontW, 0, 8, frontH, 12, {
    top: '#4F3320',
    left: '#3B2416',
    right: '#2A190F',
  });
  // Expanded Front Hall Front-Left outer low rim (wy = frontH, x = -WALL_T..frontW + 8)
  drawIsoBox(ctx, -WALL_T, frontH, frontW + WALL_T + 8, 8, 12, {
    top: '#4F3320',
    left: '#3B2416',
    right: '#2A190F',
  });

  // Warm glowing hanging palace lanterns along back & dividing walls (Style 3!)
  const lanternTint =
    decor.id === 'obsidian_sushi'
      ? '#FB7185'
      : decor.id === 'azure_luxury'
        ? '#5EEAD4'
        : '#FFC45C';
  drawWarmLantern(ctx, 180, UNIFIED_MIN_Y + 8, 56, timeSec, lanternTint);
  drawWarmLantern(ctx, 560, UNIFIED_MIN_Y + 8, 56, timeSec, lanternTint);
  drawWarmLantern(ctx, 840, UNIFIED_MIN_Y + 8, 56, timeSec, lanternTint);
  drawWarmLantern(ctx, 180, -8, 42, timeSec, lanternTint);
  drawWarmLantern(ctx, 500, -8, 42, timeSec, lanternTint);
  drawWarmLantern(ctx, 820, -8, 42, timeSec, lanternTint);
  if (frontW > CANVAS_WIDTH) {
    drawWarmLantern(ctx, CANVAS_WIDTH + (frontW - CANVAS_WIDTH) * 0.5, -8, 46, timeSec, lanternTint);
  }
  drawWarmLantern(ctx, 10, 210, 56, timeSec, lanternTint);
  drawWarmLantern(ctx, 10, 460, 56, timeSec, lanternTint);
  if (frontH > CANVAS_HEIGHT) {
    drawWarmLantern(ctx, 10, CANVAS_HEIGHT + (frontH - CANVAS_HEIGHT) * 0.5, 56, timeSec, lanternTint);
  }

  // Clean subtle Wing Orientation Labels at the outer architectural edges
  const frontWingLabel = worldToIso(frontW * 0.5, frontH + 26, 0);
  const backWingLabel = worldToIso(UNIFIED_MAX_X + 36, -340, 0);
  drawIsoTextTag(
    ctx,
    `前厅 · ${frontBounds.wingTitle}`,
    frontWingLabel.x,
    frontWingLabel.y,
    {
      color: '#F6DA8D',
      bg: 'rgba(20, 32, 33, 0.85)',
      border: '#B6924D',
      fontSize: 11,
    }
  );
  drawIsoTextTag(ctx, '后场七大功能区', backWingLabel.x, backWingLabel.y, {
    color: '#99F6E4',
    bg: 'rgba(20, 32, 33, 0.85)',
    border: '#4EAFA2',
    fontSize: 11,
  });
  if (frontW > CANVAS_WIDTH) {
    const eastWingLabel = worldToIso(frontW + 34, frontH * 0.45, 0);
    drawIsoTextTag(
      ctx,
      world.shopLevel >= 4 ? '东阁御宴廊' : '东翼雅廊',
      eastWingLabel.x,
      eastWingLabel.y,
      {
        color: '#FDE68A',
        bg: 'rgba(26, 22, 16, 0.84)',
        border: '#D6AF66',
        fontSize: 10,
      }
    );
  }

  // ==========================================
  // 7. FLOATING FEEDBACK TEXTS & WEATHER / EVENING ATMOSPHERE
  // ==========================================
  for (const ft of world.floatingTexts) {
    const fp = worldToIso(ft.x, ft.y, 44 + (1 - ft.life / Math.max(0.1, ft.maxLife)) * 22);
    const alpha = Math.max(0, Math.min(1, ft.life / Math.max(0.1, ft.maxLife * 0.45)));
    ctx.save();
    ctx.globalAlpha = alpha;
    drawIsoTextTag(ctx, ft.text, fp.x, fp.y, {
      color: ft.color,
      fontSize: Math.max(11, (ft.size ?? 13) - 1),
    });
    ctx.restore();
  }

  ctx.restore();

  // Subtle screen-space atmospheric weather / closing twilight tint
  if (world.phase === 'CLOSING') {
    ctx.save();
    ctx.fillStyle = 'rgba(12, 22, 38, 0.14)';
    ctx.fillRect(0, 0, backingWidth, backingHeight);
    ctx.restore();
  } else if (world.weather === 'RAINY' || world.weather === 'TYPHOON') {
    ctx.save();
    ctx.strokeStyle =
      world.weather === 'TYPHOON'
        ? 'rgba(147, 197, 253, 0.24)'
        : 'rgba(186, 230, 253, 0.16)';
    ctx.lineWidth = 1.2;
    const drops = world.weather === 'TYPHOON' ? 56 : 32;
    for (let i = 0; i < drops; i++) {
      const rx = ((i * 197 + timeSec * 420) % (backingWidth + 160)) - 80;
      const ry = ((i * 131 + timeSec * 680) % (backingHeight + 120)) - 60;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 12, ry + 26);
      ctx.stroke();
    }
    ctx.restore();
  }
}
