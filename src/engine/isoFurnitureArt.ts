import {
  BROTH_CATALOG,
  FRONT_HALL_ZONES,
  SEAFOOD_CATALOG,
  STATIONS,
} from '../data/gameConfig';
import { BackstageRoomRect } from '../data/policyAndTechConfig';
import { getSpecialStaffDef } from '../data/storyConfig';
import {
  BuffetZoneId,
  DiningTable,
  GameWorld,
  ZonePadDef,
} from '../types/game';
import {
  drawIsoCharacter,
  getGuestStyleBySeed,
} from './isoCharacterArt';

const ISO_COS = 0.72;
const ISO_SIN = 0.36;

// Delicate dark sepia architectural ink (ligne claire, matching isoSceneArt.ts)
const INK = '#241A14';
const INK_SOFT = 'rgba(36, 26, 20, 0.5)';

function w2i(wx: number, wy: number, wz = 0): { x: number; y: number } {
  return {
    x: (wx - wy) * ISO_COS,
    y: (wx + wy) * ISO_SIN - wz,
  };
}

function drawPoly(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  fill: string | CanvasGradient,
  stroke?: string,
  lineWidth = 0.95
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

function drawQuad(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  wz: number,
  fill: string,
  stroke?: string,
  lineWidth = 0.9
) {
  drawPoly(
    ctx,
    [
      w2i(wx, wy, wz),
      w2i(wx + w, wy, wz),
      w2i(wx + w, wy + d, wz),
      w2i(wx, wy + d, wz),
    ],
    fill,
    stroke,
    lineWidth
  );
}

function drawBox(
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
  const lw = colors.lineWidth ?? 0.92;

  const t0 = w2i(wx, wy, baseZ + h);
  const t1 = w2i(wx + w, wy, baseZ + h);
  const t2 = w2i(wx + w, wy + d, baseZ + h);
  const t3 = w2i(wx, wy + d, baseZ + h);

  const b1 = w2i(wx + w, wy, baseZ);
  const b2 = w2i(wx + w, wy + d, baseZ);
  const b3 = w2i(wx, wy + d, baseZ);

  drawPoly(ctx, [t3, t2, b2, b3], colors.left, stroke, lw);
  drawPoly(ctx, [t2, t1, b1, b2], colors.right, stroke, lw);
  drawPoly(ctx, [t0, t1, t2, t3], colors.top, stroke, lw);
}

/** Draw recessed decorative wood/metal panel insets on the +Y (front-left) and +X (front-right) faces of a cabinet */
function drawCabinetPanels(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  baseZ: number,
  h: number,
  opts: {
    leftFill: string;
    rightFill: string;
    colsX?: number;
    colsY?: number;
    drawHandles?: boolean;
  }
) {
  const colsX = opts.colsX ?? Math.max(1, Math.round(w / 46));
  const colsY = opts.colsY ?? Math.max(1, Math.round(d / 46));
  const padZ = Math.min(3.5, h * 0.18);
  const padS = 4;

  // Front-left face (+Y = wy + d)
  const segW = (w - padS * 2) / colsX;
  for (let i = 0; i < colsX; i++) {
    const px = wx + padS + i * segW + 1.5;
    const pw = Math.max(4, segW - 3);
    const p0 = w2i(px, wy + d, baseZ + h - padZ);
    const p1 = w2i(px + pw, wy + d, baseZ + h - padZ);
    const p2 = w2i(px + pw, wy + d, baseZ + padZ);
    const p3 = w2i(px, wy + d, baseZ + padZ);
    drawPoly(ctx, [p0, p1, p2, p3], opts.leftFill, INK_SOFT, 0.72);
    if (opts.drawHandles) {
      const hm = w2i(px + pw * 0.5, wy + d, baseZ + h * 0.55);
      ctx.fillStyle = '#D9B972';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.ellipse(hm.x, hm.y, 2.2, 1.1, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Front-right face (+X = wx + w)
  const segD = (d - padS * 2) / colsY;
  for (let i = 0; i < colsY; i++) {
    const py = wy + padS + i * segD + 1.5;
    const pd = Math.max(4, segD - 3);
    const p0 = w2i(wx + w, py, baseZ + h - padZ);
    const p1 = w2i(wx + w, py + pd, baseZ + h - padZ);
    const p2 = w2i(wx + w, py + pd, baseZ + padZ);
    const p3 = w2i(wx + w, py, baseZ + padZ);
    drawPoly(ctx, [p0, p1, p2, p3], opts.rightFill, INK_SOFT, 0.72);
    if (opts.drawHandles) {
      const hm = w2i(wx + w, py + pd * 0.5, baseZ + h * 0.55);
      ctx.fillStyle = '#C7A45C';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.ellipse(hm.x, hm.y, 2.2, 1.1, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

export function drawIsoTextTag(
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
  ctx.font = `700 ${fs}px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;
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
      ctx.lineWidth = 1.05;
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
  intensity = 1,
  tint = '255, 250, 240'
) {
  ctx.save();
  const count = Math.max(2, Math.round(3 * intensity));
  for (let i = 0; i < count; i++) {
    const phase = (timeSec * 0.72 + seed * 0.37 + i * 0.33) % 1;
    const rise = phase * 28 * intensity;
    const sway = Math.sin(timeSec * 2.1 + seed + i * 2.2) * (3.2 + phase * 4.5);
    const alpha = Math.sin(phase * Math.PI) * 0.44;
    const radius = (2.8 + phase * 5.6) * Math.min(1.2, intensity);
    ctx.fillStyle = `rgba(${tint}, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(ix + sway + (i - 1) * 3.2, iy - rise, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPorcelainStack(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  wz: number,
  count: number,
  radius = 5.5
) {
  const base = w2i(wx, wy, wz);
  for (let i = 0; i < count; i++) {
    const y = base.y - i * 2.4;
    ctx.fillStyle = '#FBF9F4';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.ellipse(base.x, y, radius, radius * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(92, 146, 140, 0.55)';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.ellipse(base.x, y - 0.3, radius * 0.72, radius * 0.34, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ==========================================
// 1. SLATTED WOODEN CHAIRS & 4-LEG HOTPOT DINING TABLE
// Matches tycoon_v2_assets_sheet bottom-right!
// ==========================================

function drawSlattedWoodenChair(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  backSide: 'NORTH' | 'WEST' | 'EAST' | 'SOUTH'
) {
  const woodTop = '#B68251';
  const woodLeft = '#8C5C33';
  const woodRight = '#6C4422';
  const legSize = 2.6;
  const seatZ = 9.5;
  const seatH = 2.2;
  const backH = 14.5;

  // 4 slender wooden legs
  const legPositions = [
    [wx + 0.8, wy + 0.8],
    [wx + w - legSize - 0.8, wy + 0.8],
    [wx + 0.8, wy + d - legSize - 0.8],
    [wx + w - legSize - 0.8, wy + d - legSize - 0.8],
  ];
  for (const [lx, ly] of legPositions) {
    drawBox(
      ctx,
      lx,
      ly,
      legSize,
      legSize,
      seatZ,
      { top: woodTop, left: woodLeft, right: woodRight, lineWidth: 0.75 },
      0
    );
  }

  // Seat cushion frame
  drawBox(
    ctx,
    wx,
    wy,
    w,
    d,
    seatH,
    { top: '#C49260', left: woodLeft, right: woodRight, lineWidth: 0.82 },
    seatZ
  );

  // Slatted vertical backrest (2 corner stiles + top rail + 3 visible vertical slats!)
  const backBase = seatZ + seatH;
  const slatThickness = 2.2;
  if (backSide === 'NORTH' || backSide === 'SOUTH') {
    const by = backSide === 'NORTH' ? wy : wy + d - slatThickness;
    // Left & right vertical stiles
    drawBox(ctx, wx, by, 2.3, slatThickness, backH, { top: woodTop, left: woodLeft, right: woodRight, lineWidth: 0.72 }, backBase);
    drawBox(ctx, wx + w - 2.3, by, 2.3, slatThickness, backH, { top: woodTop, left: woodLeft, right: woodRight, lineWidth: 0.72 }, backBase);
    // 3 interior vertical wooden slats
    const innerSpan = w - 6.6;
    for (let i = 0; i < 3; i++) {
      const sx = wx + 3.3 + (i + 0.5) * (innerSpan / 3) - 0.9;
      drawBox(ctx, sx, by + 0.2, 1.8, slatThickness - 0.4, backH - 2.0, { top: '#A87344', left: '#85562E', right: '#663E1E', lineWidth: 0.6 }, backBase);
    }
    // Top horizontal rail
    drawBox(ctx, wx, by, w, slatThickness, 2.5, { top: '#C49260', left: woodLeft, right: woodRight, lineWidth: 0.78 }, backBase + backH - 2.5);
  } else {
    const bx = backSide === 'WEST' ? wx : wx + w - slatThickness;
    drawBox(ctx, bx, wy, slatThickness, 2.3, backH, { top: woodTop, left: woodLeft, right: woodRight, lineWidth: 0.72 }, backBase);
    drawBox(ctx, bx, wy + d - 2.3, slatThickness, 2.3, backH, { top: woodTop, left: woodLeft, right: woodRight, lineWidth: 0.72 }, backBase);
    const innerSpan = d - 6.6;
    for (let i = 0; i < 3; i++) {
      const sy = wy + 3.3 + (i + 0.5) * (innerSpan / 3) - 0.9;
      drawBox(ctx, bx + 0.2, sy, slatThickness - 0.4, 1.8, backH - 2.0, { top: '#A87344', left: '#85562E', right: '#663E1E', lineWidth: 0.6 }, backBase);
    }
    drawBox(ctx, bx, wy, slatThickness, d, 2.5, { top: '#C49260', left: woodLeft, right: woodRight, lineWidth: 0.78 }, backBase + backH - 2.5);
  }
}

export function drawIsoHotpotTable(
  ctx: CanvasRenderingContext2D,
  table: DiningTable,
  _world: GameWorld,
  timeSec: number,
  isHovered: boolean
) {
  const half = 28;
  const wx = table.x - half;
  const wy = table.y - half;
  const size = half * 2;

  // Soft ambient architectural contact shadow beneath table + chairs
  drawQuad(ctx, wx - 4, wy - 2, size + 10, size + 10, 0.1, 'rgba(22, 15, 10, 0.20)');

  // Back 2 slatted wooden chairs (North & West)
  drawSlattedWoodenChair(ctx, wx + 17, wy - 14, 22, 13, 'NORTH');
  drawSlattedWoodenChair(ctx, wx - 14, wy + 17, 13, 22, 'WEST');

  // Seated back diners (rendered behind table rim, looking inward toward hotpot!)
  const guest = table.customer;
  const guestBaseSeed = `${guest?.id ?? 't'}_${table.id}`;
  if (guest) {
    const primaryPalette = getGuestStyleBySeed(guestBaseSeed);
    const isCriticOrElder =
      guest.specialStoryId === 'master_zhou' || guest.specialStoryId === 'critic_shen';

    drawIsoCharacter(ctx, {
      wx: table.x - 1,
      wy: table.y - 31,
      archetype: guest.isVip ? 'VIP' : isCriticOrElder ? 'ELDER' : 'GUEST',
      bodyColor: guest.isVip
        ? '#3E454D'
        : isCriticOrElder
          ? '#B89668'
          : primaryPalette.body,
      trimColor: guest.isVip ? '#F4F1EA' : primaryPalette.trim,
      pantsColor: guest.isVip ? '#31363D' : primaryPalette.pants,
      hairColor: isCriticOrElder ? '#A19E98' : primaryPalette.hair,
      hairStyle: isCriticOrElder ? 'ELDER' : primaryPalette.hairStyle,
      isVip: guest.isVip,
      seated: true,
      seatFacing: 'SE',
      scale: 0.9,
    });

    if (guest.size >= 2) {
      const p2 = getGuestStyleBySeed(guestBaseSeed + 3);
      drawIsoCharacter(ctx, {
        wx: table.x - 31,
        wy: table.y + 1,
        archetype: 'GUEST',
        bodyColor: p2.body,
        trimColor: p2.trim,
        pantsColor: p2.pants,
        hairColor: p2.hair,
        hairStyle: p2.hairStyle,
        seated: true,
        seatFacing: 'SE',
        scale: 0.89,
      });
    }
  }

  // 4 slender wooden table corner legs + recessed apron rails (NOT a chunky pedestal!)
  const legW = 4.2;
  const legH = 16.5;
  const legWood = { top: '#8B5C34', left: '#6F4624', right: '#543318', lineWidth: 0.8 };
  drawBox(ctx, wx + 3, wy + 3, legW, legW, legH, legWood, 0);
  drawBox(ctx, wx + size - legW - 3, wy + 3, legW, legW, legH, legWood, 0);
  drawBox(ctx, wx + 3, wy + size - legW - 3, legW, legW, legH, legWood, 0);
  drawBox(ctx, wx + size - legW - 3, wy + size - legW - 3, legW, legW, legH, legWood, 0);

  // Under-table cross-stretcher apron frame
  drawBox(
    ctx,
    wx + 5,
    wy + 5,
    size - 10,
    size - 10,
    4.2,
    { top: '#7E522D', left: '#6F4523', right: '#523217', lineWidth: 0.78 },
    12.5
  );

  // Warm carved cedar tabletop
  const topTint = isHovered
    ? '#E3BA7D'
    : table.status === 'READY'
      ? '#CCA06B'
      : table.status === 'DIRTY'
        ? '#AA8258'
        : '#C49560';

  drawBox(
    ctx,
    wx,
    wy,
    size,
    size,
    4.2,
    {
      top: topTint,
      left: '#9A693C',
      right: '#764C28',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 1.85 : 0.98,
    },
    16.5
  );

  // Subtle decorative inset wood trim frame on tabletop
  drawQuad(ctx, wx + 3.5, wy + 3.5, size - 7, size - 7, 20.8, 'rgba(255,244,224,0.08)', 'rgba(84, 51, 24, 0.45)', 0.7);

  // Recessed dark bronze induction burner plate in center
  drawQuad(ctx, table.x - 14.5, table.y - 14.5, 29, 29, 20.9, '#3A2A22', '#A87D42', 0.85);
  drawQuad(ctx, table.x - 11.5, table.y - 11.5, 23, 23, 21.0, '#2A201B', '#735733', 0.65);

  const topCenter = w2i(table.x, table.y, 21.5);

  if (table.status === 'READY') {
    // 4 neat celadon-rimmed porcelain bowls + tiny bamboo chopsticks
    const settings = [
      { dx: -17, dy: -17 },
      { dx: 17, dy: -17 },
      { dx: -17, dy: 17 },
      { dx: 17, dy: 17 },
    ];
    for (const st of settings) {
      const dp = w2i(table.x + st.dx, table.y + st.dy, 21.1);
      ctx.fillStyle = '#FAF7F0';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.72;
      ctx.beginPath();
      ctx.ellipse(dp.x, dp.y, 3.9, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#6EA59C';
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.ellipse(dp.x, dp.y - 0.2, 2.7, 1.3, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Tiny chopstick pair beside bowl
      ctx.strokeStyle = '#684122';
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(dp.x + 3.5, dp.y - 1.5);
      ctx.lineTo(dp.x + 7.2, dp.y + 0.6);
      ctx.stroke();
    }
  } else if (table.status === 'DIRTY') {
    const messPts = [
      { dx: -13, dy: -9, c: '#C6BEB1', r: 4.0 },
      { dx: 13, dy: 6, c: '#B7AEA0', r: 3.8 },
      { dx: -5, dy: 14, c: '#C87654', r: 3.5 },
      { dx: 11, dy: -12, c: '#C2B9AC', r: 3.6 },
    ];
    for (const m of messPts) {
      const mp = w2i(table.x + m.dx, table.y + m.dy, 21.1);
      ctx.fillStyle = m.c;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.72;
      ctx.beginPath();
      ctx.ellipse(mp.x, mp.y, m.r, m.r * 0.55, 0, 0, Math.PI * 2);
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

  // Gleaming Copper Yin-Yang Dual-Flavor Hotpot + Side Dish Trays when DINING
  if (table.status === 'DINING') {
    const brothDef = BROTH_CATALOG.find((b) => b.id === table.customer?.brothId);
    const potC = w2i(table.x, table.y, 22.8);

    // Side rectangular dish trays with leafy greens & sliced beef
    drawQuad(ctx, table.x - 24, table.y + 8, 12, 15, 21.1, '#EFEBE1', INK, 0.65);
    drawQuad(ctx, table.x - 22, table.y + 10, 8, 11, 21.3, '#6EA052');
    drawQuad(ctx, table.x + 12, table.y - 23, 12, 15, 21.1, '#EFEBE1', INK, 0.65);
    drawQuad(ctx, table.x + 14, table.y - 21, 8, 11, 21.3, '#CF6A55');

    // Dipping bowls at corners
    for (const [dx, dy] of [
      [-18, -18],
      [18, 18],
    ]) {
      const bp = w2i(table.x + dx, table.y + dy, 21.1);
      ctx.fillStyle = '#F9F6EE';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y, 3.6, 1.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Brass loop handles on left & right of copper pot
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(potC.x - 12.2, potC.y - 0.5, 2.3, 1.6, 0, 0, Math.PI * 2);
    ctx.ellipse(potC.x + 12.2, potC.y - 0.5, 2.3, 1.6, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Copper pot rounded belly
    ctx.fillStyle = '#B57230';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.ellipse(potC.x, potC.y + 1.8, 11.8, 6.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rolled gleaming brass rim
    ctx.fillStyle = '#E2AA5A';
    ctx.beginPath();
    ctx.ellipse(potC.x, potC.y - 1.1, 11.4, 6.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dual-flavor broth halves (spicy mala + golden seafood stock)
    ctx.fillStyle = brothDef?.color ?? '#C83724';
    ctx.beginPath();
    ctx.ellipse(potC.x, potC.y - 1.1, 9.4, 4.7, 0, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();

    ctx.fillStyle = '#ECC163';
    ctx.beginPath();
    ctx.ellipse(potC.x, potC.y - 1.1, 9.4, 4.7, 0, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.fill();

    // Yin-Yang S-curve stainless divider
    ctx.strokeStyle = '#E6E2D8';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(potC.x, potC.y - 5.6);
    ctx.bezierCurveTo(potC.x - 2.6, potC.y - 3.0, potC.x + 2.6, potC.y + 0.8, potC.x, potC.y + 3.5);
    ctx.stroke();

    // Simmering bubbles & garnish flecks
    const bPulse = Math.sin(timeSec * 7.2 + table.id) * 1.0;
    ctx.fillStyle = '#FFF5DC';
    ctx.beginPath();
    ctx.arc(potC.x - 3.6, potC.y - 1.4 + bPulse * 0.35, 1.15, 0, Math.PI * 2);
    ctx.arc(potC.x + 3.4, potC.y - 0.6 - bPulse * 0.35, 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5D8F49';
    ctx.fillRect(potC.x + 1.8, potC.y - 2.6, 1.6, 1.0);
    ctx.fillRect(potC.x - 5.2, potC.y - 0.2, 1.5, 1.0);

    // Rising translucent watercolor steam curls
    drawSteamWisps(ctx, potC.x, potC.y - 6, timeSec, table.id * 1.7, 1.0);
  }

  // Front seated guests (size >= 3 & >= 4) + Front 2 slatted wooden chairs (East & South)
  if (guest && guest.size >= 3) {
    const p3 = getGuestStyleBySeed(guestBaseSeed + 5);
    drawIsoCharacter(ctx, {
      wx: table.x + 30,
      wy: table.y + 2,
      archetype: 'GUEST',
      bodyColor: p3.body,
      trimColor: p3.trim,
      pantsColor: p3.pants,
      hairColor: p3.hair,
      hairStyle: p3.hairStyle,
      seated: true,
      seatFacing: 'NW',
      scale: 0.88,
    });
  }
  if (guest && guest.size >= 4) {
    const p4 = getGuestStyleBySeed(guestBaseSeed + 9);
    drawIsoCharacter(ctx, {
      wx: table.x + 2,
      wy: table.y + 30,
      archetype: 'GUEST',
      bodyColor: p4.body,
      trimColor: p4.trim,
      pantsColor: p4.pants,
      hairColor: p4.hair,
      hairStyle: p4.hairStyle,
      seated: true,
      seatFacing: 'NW',
      scale: 0.88,
    });
  }

  drawSlattedWoodenChair(ctx, wx + size + 1, wy + 17, 13, 22, 'EAST');
  drawSlattedWoodenChair(ctx, wx + 17, wy + size + 1, 22, 13, 'SOUTH');

  // Waiting-for-broth badge, special guest tag, patience bar & speech bubble
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

    ctx.fillStyle = 'rgba(20, 12, 8, 0.85)';
    ctx.fillRect(bx - 1, by - 1, barW + 2, 5.2);
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
    ctx.fillRect(bx, by, barW * fillRatio, 3.2);

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

// ==========================================
// 2. SIGNATURE RECEPTION CONCIERGE DESK
// ==========================================

export function drawIsoReceptionDesk(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  isHovered: boolean
) {
  const rec = STATIONS.RECEPTION;
  const wx = rec.x - 42;
  const wy = rec.y - 24;
  const w = 84;
  const d = 48;

  // Soft contact shadow
  drawQuad(ctx, wx + 4, wy + 5, w, d, 0.1, 'rgba(20, 14, 10, 0.24)');

  // Carved cedar concierge desk base
  drawBox(ctx, wx, wy, w, d, 25, {
    top: isHovered ? '#D8A96B' : '#BA8752',
    left: '#8C5B32',
    right: '#684122',
    stroke: isHovered ? '#FDE047' : INK,
    lineWidth: isHovered ? 1.85 : 0.98,
  });
  drawCabinetPanels(ctx, wx, wy, w, d, 1, 22, {
    leftFill: '#784D28',
    rightFill: '#58361B',
    colsX: 2,
    colsY: 1,
    drawHandles: false,
  });

  // Slightly overhanging dark walnut counter ledge
  drawBox(
    ctx,
    wx - 2,
    wy - 2,
    w + 4,
    d + 4,
    3.4,
    {
      top: isHovered ? '#E6BD7F' : '#CFA06A',
      left: '#9B6B3E',
      right: '#764E29',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: 0.95,
    },
    25
  );

  // Open cream guest ledger book with fine ink rows
  drawQuad(ctx, rec.x - 24, rec.y - 10, 24, 18, 28.6, '#F7F1E1', INK, 0.78);
  const spineA = w2i(rec.x - 12, rec.y - 10, 28.7);
  const spineB = w2i(rec.x - 12, rec.y + 8, 28.7);
  ctx.strokeStyle = INK_SOFT;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(spineA.x, spineA.y);
  ctx.lineTo(spineB.x, spineB.y);
  ctx.stroke();

  // Polished brass desk bell
  const bellP = w2i(rec.x + 12, rec.y + 2, 29);
  ctx.fillStyle = '#C99846';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.ellipse(bellP.x, bellP.y + 0.8, 3.8, 2.0, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#F2D282';
  ctx.beginPath();
  ctx.arc(bellP.x, bellP.y - 0.8, 2.6, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Small celadon ceramic vase with green bamboo sprigs on corner
  const vaseP = w2i(rec.x + 28, rec.y - 12, 29);
  ctx.fillStyle = '#6EA89F';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.72;
  ctx.beginPath();
  ctx.ellipse(vaseP.x, vaseP.y - 2.5, 3.2, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#4B7D49';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(vaseP.x - 0.6, vaseP.y - 6.2);
  ctx.lineTo(vaseP.x - 3.5, vaseP.y - 13.5);
  ctx.moveTo(vaseP.x + 0.8, vaseP.y - 6.2);
  ctx.lineTo(vaseP.x + 3.2, vaseP.y - 14.5);
  ctx.stroke();

  const lp = w2i(rec.x, rec.y, 31);
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
}

// ==========================================
// 3. TIERED TURQUOISE LIVE SEAFOOD AQUARIUMS
// Matches tycoon_v2_assets_sheet bottom-left!
// ==========================================

export function drawIsoTieredAquarium(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  timeSec: number,
  tiers = 2,
  isHovered = false
) {
  // Cedar drawer stand cabinet with brass handles
  drawBox(ctx, wx, wy, w, d, 14, {
    top: '#A67247',
    left: '#7F522E',
    right: '#5F3B1F',
    stroke: isHovered ? '#FDE047' : INK,
    lineWidth: isHovered ? 1.8 : 0.95,
  });
  drawCabinetPanels(ctx, wx, wy, w, d, 1.5, 11.5, {
    leftFill: '#714726',
    rightFill: '#53331A',
    drawHandles: true,
  });

  const isVert = d > w;

  for (let t = 0; t < tiers; t++) {
    const zBase = 14 + t * 23;
    const insetX = isVert ? t * 2 : t * 4;
    const insetY = isVert ? t * 4 : t * 2;
    const tw = Math.max(24, w - insetX * 2);
    const td = Math.max(24, d - insetY * 2);
    const tx = wx + insetX;
    const ty = wy + (t === 1 ? 0 : insetY);

    // Translucent aqua-jade glass tank water body
    drawBox(
      ctx,
      tx,
      ty,
      tw,
      td,
      20,
      {
        top: 'rgba(178, 240, 236, 0.84)',
        left: 'rgba(92, 194, 194, 0.82)',
        right: 'rgba(58, 158, 162, 0.86)',
        stroke: '#20565B',
        lineWidth: 0.95,
      },
      zBase
    );

    // Inner sand/stone substrate rim at bottom of tank
    drawQuad(ctx, tx + 2, ty + 2, tw - 4, td - 4, zBase + 1.2, 'rgba(176, 168, 144, 0.42)');

    // Swimming detailed seafood silhouettes (fish in upper tier, crabs & prawns in lower tier!)
    const center = w2i(tx + tw * 0.5, ty + td * 0.56, zBase + 10);
    const span = Math.min(28, Math.max(tw, td) * 0.2);
    const swim1 = Math.sin(timeSec * 1.25 + t * 2.1 + wx * 0.04) * span;
    const swim2 = Math.cos(timeSec * 0.95 + t * 3.4 + wy * 0.04) * (span * 0.85);

    if (t === 1) {
      // Upper tank: two sleek silver-blue sea bass / groupers with forked tails
      for (const [ox, oy, dir, col] of [
        [swim1 * 0.7 - 5, -1, 1, '#587E8C'],
        [-swim2 * 0.65 + 7, 3.5, -1, '#4B6F7D'],
      ] as const) {
        const fx = center.x + ox;
        const fy = center.y + oy;
        ctx.fillStyle = col;
        ctx.strokeStyle = '#1E3A40';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 5.2, 2.1, -0.15 * dir, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Tail fin
        ctx.beginPath();
        ctx.moveTo(fx - 4.8 * dir, fy);
        ctx.lineTo(fx - 7.8 * dir, fy - 2.1);
        ctx.lineTo(fx - 7.8 * dir, fy + 2.1);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Lower tank: warm terracotta crabs & crawling lobster
      for (const [ox, oy, col] of [
        [swim1 * 0.45 - 8, 2.5, '#C86035'],
        [-swim2 * 0.4 + 9, 4.0, '#B8502C'],
      ] as const) {
        const cx = center.x + ox;
        const cy = center.y + oy;
        ctx.fillStyle = col;
        ctx.strokeStyle = '#3B1E14';
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 4.4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Tiny legs
        ctx.beginPath();
        ctx.moveTo(cx - 5.8, cy + 1.5);
        ctx.lineTo(cx - 3.6, cy + 0.5);
        ctx.moveTo(cx + 5.8, cy + 1.5);
        ctx.lineTo(cx + 3.6, cy + 0.5);
        ctx.stroke();
      }
    }

    // Rising fine aerator bubbles
    const bOff = (timeSec * 15 + t * 7) % 13;
    ctx.fillStyle = 'rgba(240, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(center.x - 12, center.y + 6 - bOff, 1.0, 0, Math.PI * 2);
    ctx.arc(center.x + 11, center.y + 7 - ((bOff + 6) % 13), 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Diagonal glass specular reflection lines on front glass panes
    const gA = w2i(tx + tw * 0.22, ty + td, zBase + 18);
    const gB = w2i(tx + tw * 0.34, ty + td, zBase + 3);
    const gC = w2i(tx + tw * 0.62, ty + td, zBase + 18);
    const gD = w2i(tx + tw * 0.72, ty + td, zBase + 4);
    ctx.strokeStyle = 'rgba(236, 255, 255, 0.55)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(gA.x, gA.y);
    ctx.lineTo(gB.x, gB.y);
    ctx.moveTo(gC.x, gC.y);
    ctx.lineTo(gD.x, gD.y);
    ctx.stroke();

    // Crisp illuminated glass rim highlight
    const rimL = w2i(tx, ty + td, zBase + 19.6);
    const rimM = w2i(tx + tw, ty + td, zBase + 19.6);
    const rimR = w2i(tx + tw, ty, zBase + 19.6);
    ctx.strokeStyle = 'rgba(240, 255, 255, 0.82)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(rimL.x, rimL.y);
    ctx.lineTo(rimM.x, rimM.y);
    ctx.lineTo(rimR.x, rimR.y);
    ctx.stroke();

    // Shimmering white-foam cascade lip from upper tier to lower tier!
    if (t === 1) {
      const wfTop = w2i(tx + tw * 0.5, ty + td, zBase + 2);
      const wfBot = w2i(tx + tw * 0.5, ty + td + 2, zBase - 6);
      ctx.strokeStyle = 'rgba(232, 252, 252, 0.78)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(wfTop.x, wfTop.y);
      ctx.lineTo(wfBot.x, wfBot.y);
      ctx.stroke();
    }
  }
}

// ==========================================
// 4. ALL 7 BUFFET ZONE PADS (HORIZONTAL & VERTICAL)
// ==========================================

export function drawIsoZonePad(
  ctx: CanvasRenderingContext2D,
  pad: ZonePadDef,
  zoneId: BuffetZoneId | null,
  world: GameWorld,
  timeSec: number,
  isHovered: boolean
) {
  const isVert = pad.orientation === 'VERTICAL';

  // Empty customizable floor blueprint pad
  if (!zoneId) {
    drawQuad(
      ctx,
      pad.x,
      pad.y,
      pad.w,
      pad.h,
      0.8,
      isHovered ? 'rgba(232, 201, 122, 0.28)' : 'rgba(26, 20, 15, 0.34)',
      isHovered ? '#FDE047' : '#D6AF66',
      isHovered ? 2.1 : 1.2
    );
    drawQuad(
      ctx,
      pad.x + 8,
      pad.y + 8,
      pad.w - 16,
      pad.h - 16,
      1.0,
      isHovered ? 'rgba(253, 224, 71, 0.14)' : 'rgba(214, 175, 102, 0.08)',
      'rgba(232, 201, 122, 0.52)',
      0.85
    );
    const p0 = w2i(pad.x + 12, pad.y + 12, 1.2);
    const p1 = w2i(pad.x + pad.w - 12, pad.y + pad.h - 12, 1.2);
    const p2 = w2i(pad.x + pad.w - 12, pad.y + 12, 1.2);
    const p3 = w2i(pad.x + 12, pad.y + pad.h - 12, 1.2);
    ctx.save();
    ctx.strokeStyle = isHovered ? 'rgba(253, 224, 71, 0.72)' : 'rgba(232, 201, 122, 0.35)';
    ctx.lineWidth = 0.9;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();
    ctx.restore();

    const tagPos = w2i(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5, 12);
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

  const labelPos = w2i(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5, 44);

  // Subtle ambient contact shadow under buffet island
  drawQuad(ctx, pad.x + 4, pad.y + 5, pad.w, pad.h, 0.15, 'rgba(18, 12, 8, 0.26)');

  if (zoneId === 'live_seafood') {
    drawIsoTieredAquarium(ctx, pad.x + 3, pad.y + 3, pad.w - 6, pad.h - 6, timeSec, 2, isHovered);
  } else if (zoneId === 'ice_seafood') {
    // Signature Celadon-Tiled Base + Sloped Brushed-Steel Crushed-Ice Seafood Island
    // (Matches centerpiece of style_isometric_tycoon & tycoon_v2_assets_sheet!)
    drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 13, {
      top: '#95C4C0',
      left: '#6EA39E',
      right: '#4E827E',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 1.85 : 0.95,
    });
    // Subtle celadon tile vertical grout joints on base skirt
    const tileStep = 14;
    ctx.strokeStyle = 'rgba(30, 62, 60, 0.35)';
    ctx.lineWidth = 0.65;
    for (let tx = pad.x + tileStep; tx < pad.x + pad.w - 4; tx += tileStep) {
      const a = w2i(tx, pad.y + pad.h, 13);
      const b = w2i(tx, pad.y + pad.h, 0);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let ty = pad.y + tileStep; ty < pad.y + pad.h - 4; ty += tileStep) {
      const a = w2i(pad.x + pad.w, ty, 13);
      const b = w2i(pad.x + pad.w, ty, 0);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Sloped stainless steel ice display wedge (higher along back wall, sloping down toward diner)
    const zBack = 28;
    const zFront = 19;
    const b0 = w2i(pad.x, pad.y, isVert ? zBack : zBack);
    const b1 = w2i(pad.x + pad.w, pad.y, isVert ? zFront : zBack);
    const b2 = w2i(pad.x + pad.w, pad.y + pad.h, zFront);
    const b3 = w2i(pad.x, pad.y + pad.h, isVert ? zBack : zFront);

    const low1 = w2i(pad.x + pad.w, pad.y, 13);
    const low2 = w2i(pad.x + pad.w, pad.y + pad.h, 13);
    const low3 = w2i(pad.x, pad.y + pad.h, 13);

    drawPoly(ctx, [b3, b2, low2, low3], '#B5C5C8', isHovered ? '#FDE047' : INK, 0.92);
    drawPoly(ctx, [b2, b1, low1, low2], '#8FA5AA', isHovered ? '#FDE047' : INK, 0.92);
    // Stainless steel sloped outer frame
    drawPoly(ctx, [b0, b1, b2, b3], '#CEDCE0', isHovered ? '#FDE047' : INK, 0.95);

    // Glistening pale-blue crushed ice bed inset
    const m = 6;
    const i0 = w2i(pad.x + m, pad.y + m, zBack - 0.6);
    const i1 = w2i(pad.x + pad.w - m, pad.y + m, isVert ? zFront + 0.6 : zBack - 0.6);
    const i2 = w2i(pad.x + pad.w - m, pad.y + pad.h - m, zFront + 0.6);
    const i3 = w2i(pad.x + m, pad.y + pad.h - m, isVert ? zBack - 0.6 : zFront + 0.6);
    drawPoly(ctx, [i0, i1, i2, i3], '#E3F2F5', '#7EA9B4', 0.85);

    // Neatly arranged rows of miniature iced fish, half-shell oysters & coral prawns!
    const count = Math.max(4, slots.length);
    const usable = (isVert ? pad.h : pad.w) - 22;
    const step = usable / count;
    for (let i = 0; i < count; i++) {
      const slot = slots[i];
      if (slot && slot.stock <= 0) continue;
      const sx = isVert ? pad.x + pad.w * 0.5 : pad.x + 11 + (i + 0.5) * step;
      const sy = isVert ? pad.y + 11 + (i + 0.5) * step : pad.y + pad.h * 0.5;
      const zMid = (zBack + zFront) * 0.5;
      const sp = w2i(sx, sy, zMid + 0.6);
      const kind = i % 3;
      if (kind === 0) {
        // Pair of sleek silver sea fish on ice
        for (const dy of [-3, 2.5]) {
          ctx.fillStyle = '#8FA4B2';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.65;
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y + dy, 6.2, 2.1, -0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else if (kind === 1) {
        // Cluster of 3 open half-shell oysters
        for (const [ox, oy] of [
          [-3.5, -1.5],
          [3.2, -1.2],
          [0, 2.4],
        ]) {
          ctx.fillStyle = '#D5D1C7';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.ellipse(sp.x + ox, sp.y + oy, 3.0, 1.8, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#EFE9D8';
          ctx.beginPath();
          ctx.arc(sp.x + ox, sp.y + oy, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Rows of bright coral-orange cooked prawns / crab legs
        for (const [ox, oy] of [
          [-3.4, -2.0],
          [0.5, 0],
          [3.8, 2.0],
        ]) {
          ctx.fillStyle = '#DF6D42';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.ellipse(sp.x + ox, sp.y + oy, 3.3, 1.5, -0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  } else if (zoneId === 'teppan_bbq') {
    // Cedar & Iron Charcoal Teppanyaki Grill Counter (matches tycoon_v2_assets_sheet 2nd bottom item!)
    drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 21, {
      top: '#B57F4E',
      left: '#8A5B34',
      right: '#674122',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 1.85 : 0.95,
    });
    // Signature recessed charcoal-slate lower cabinet panels
    drawCabinetPanels(ctx, pad.x, pad.y, pad.w, pad.h, 1.5, 17, {
      leftFill: '#5F5B57',
      rightFill: '#474340',
    });
    // Overhanging beveled cedar top slab
    drawBox(
      ctx,
      pad.x - 1.5,
      pad.y - 1.5,
      pad.w + 3,
      pad.h + 3,
      3.0,
      {
        top: isHovered ? '#DDA86D' : '#C9945E',
        left: '#98673C',
        right: '#734B28',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: 0.9,
      },
      21
    );

    // Inset dark cast-iron charcoal grill trough
    const gm = 9;
    drawQuad(ctx, pad.x + gm, pad.y + gm, pad.w - gm * 2, pad.h - gm * 2, 24.3, '#2D2522', '#5B4B44', 0.95);

    // Pulsing orange-crimson glowing charcoal ember bed
    const emberPulse = 0.72 + Math.sin(timeSec * 4.2 + pad.x * 0.05) * 0.22;
    const emberFill = `rgba(232, 86, 20, ${emberPulse.toFixed(2)})`;
    drawQuad(ctx, pad.x + gm + 4, pad.y + gm + 4, pad.w - (gm + 4) * 2, pad.h - (gm + 4) * 2, 24.6, emberFill, '#FDBA74', 0.65);

    // Fine parallel iron grill grate bars over the glowing embers
    ctx.strokeStyle = '#1E1816';
    ctx.lineWidth = 0.85;
    const bars = 8;
    for (let i = 1; i < bars; i++) {
      const t = i / bars;
      if (isVert) {
        const y = pad.y + gm + 2 + t * (pad.h - gm * 2 - 4);
        const pA = w2i(pad.x + gm + 2, y, 24.9);
        const pB = w2i(pad.x + pad.w - gm - 2, y, 24.9);
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      } else {
        const x = pad.x + gm + 2 + t * (pad.w - gm * 2 - 4);
        const pA = w2i(x, pad.y + gm + 2, 24.9);
        const pB = w2i(x, pad.y + pad.h - gm - 2, 24.9);
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      }
    }

    // Sizzling BBQ skewers & glazed seafood pieces lined on grill grate
    const span = (isVert ? pad.h : pad.w) - 34;
    const step = span / 4;
    for (let i = 0; i < 4; i++) {
      const px = isVert ? pad.x + pad.w * 0.5 : pad.x + 17 + (i + 0.5) * step;
      const py = isVert ? pad.y + 17 + (i + 0.5) * step : pad.y + pad.h * 0.5;
      const gp = w2i(px, py, 25.6);
      // Bamboo skewer stick
      ctx.strokeStyle = '#E6C88B';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(gp.x - 8, gp.y + 3);
      ctx.lineTo(gp.x + 8, gp.y - 3);
      ctx.stroke();
      // Charred meat / grilled prawn nuggets
      ctx.fillStyle = i % 2 === 0 ? '#B5441E' : '#C96C26';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.ellipse(gp.x - 2, gp.y + 0.8, 3.0, 1.8, -0.3, 0, Math.PI * 2);
      ctx.ellipse(gp.x + 2.5, gp.y - 1.0, 2.8, 1.7, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (slots.some((s) => s.stock > 0)) {
      const smokeA = w2i(pad.x + pad.w * 0.35, pad.y + pad.h * 0.45, 27);
      const smokeB = w2i(pad.x + pad.w * 0.65, pad.y + pad.h * 0.55, 27);
      drawSteamWisps(ctx, smokeA.x, smokeA.y, timeSec * 1.1, 7.5, 1.0, '246, 236, 224');
      drawSteamWisps(ctx, smokeB.x, smokeB.y, timeSec * 1.1 + 1.8, 7.5, 0.9, '246, 236, 224');
    }
  } else if (zoneId === 'cooked_hot') {
    // Warm Cedar & Dark Granite Hot Cooked Food Chafing Bar
    drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 23, {
      top: isHovered ? '#DCA469' : '#BD8552',
      left: '#8D5C34',
      right: '#694121',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 1.85 : 0.95,
    });
    drawCabinetPanels(ctx, pad.x, pad.y, pad.w, pad.h, 1.5, 18.5, {
      leftFill: '#7A4E2A',
      rightFill: '#5A371B',
    });
    // Recessed dark stone hearth deck
    drawQuad(ctx, pad.x + 8, pad.y + 8, pad.w - 16, pad.h - 16, 23.4, '#362D29', '#7C6555', 0.88);

    const ratio = world.cookedStock / Math.max(1, world.cookedMaxStock);
    const panCount = Math.max(0, Math.min(4, Math.ceil(ratio * 4)));
    const span = (isVert ? pad.h : pad.w) - 34;
    const panStep = span / 4;
    for (let i = 0; i < 4; i++) {
      const px = isVert ? pad.x + pad.w * 0.5 : pad.x + 17 + (i + 0.5) * panStep;
      const py = isVert ? pad.y + 17 + (i + 0.5) * panStep : pad.y + pad.h * 0.5;
      const pc = w2i(px, py, 24.4);
      // Hammered brass chafing dish / dark wok
      ctx.fillStyle = '#C98A42';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.ellipse(pc.x, pc.y + 0.8, 9.6, 5.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = i < panCount ? (i % 2 === 0 ? '#D96A27' : '#C9872C') : '#463C38';
      ctx.beginPath();
      ctx.ellipse(pc.x, pc.y - 0.5, 7.8, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
      if (i < panCount) {
        ctx.fillStyle = '#F7CA63';
        ctx.beginPath();
        ctx.arc(pc.x - 2.2, pc.y - 0.9, 1.6, 0, Math.PI * 2);
        ctx.arc(pc.x + 2.5, pc.y + 0.2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Small porcelain plate stack at end of counter
    drawPorcelainStack(ctx, pad.x + 12, pad.y + 12, 23.8, 4, 4.4);

    if (world.cookedStock > 0) {
      const stP = w2i(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5, 28);
      drawSteamWisps(ctx, stP.x, stP.y, timeSec, 9.2, 1.05);
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
    // Pale Hinoki Cypress Sashimi Counter with Glass Showcase
    drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 22, {
      top: isHovered ? '#EED7B2' : '#DFC398',
      left: '#AC8759',
      right: '#87663E',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 1.85 : 0.95,
    });
    drawCabinetPanels(ctx, pad.x, pad.y, pad.w, pad.h, 1.5, 18, {
      leftFill: '#9A764A',
      rightFill: '#785934',
    });

    // Dark slate sushi bed inside display
    drawQuad(ctx, pad.x + 8, pad.y + 8, pad.w - 16, pad.h - 16, 22.3, '#3B444A', '#242A2E', 0.8);

    // Sashimi & nigiri rows
    const span = (isVert ? pad.h : pad.w) - 34;
    const step = span / 4;
    for (let i = 0; i < 4; i++) {
      const px = isVert ? pad.x + pad.w * 0.5 : pad.x + 17 + (i + 0.5) * step;
      const py = isVert ? pad.y + 17 + (i + 0.5) * step : pad.y + pad.h * 0.5;
      const sp = w2i(px, py, 23.2);
      // Bamboo leaf garnish
      ctx.fillStyle = '#538651';
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y + 0.8, 7.6, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Salmon / tuna / whitefish slices
      for (const ox of [-3.2, 0, 3.2]) {
        ctx.fillStyle = i % 2 === 0 ? '#EB7856' : '#D9535E';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.ellipse(sp.x + ox, sp.y - 0.5, 2.2, 1.4, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Translucent glass sneeze-guard showcase cover
    drawBox(
      ctx,
      pad.x + 6,
      pad.y + 6,
      pad.w - 12,
      pad.h - 12,
      8.5,
      {
        top: 'rgba(218, 244, 246, 0.34)',
        left: 'rgba(182, 228, 234, 0.24)',
        right: 'rgba(148, 206, 214, 0.28)',
        stroke: 'rgba(92, 152, 160, 0.72)',
        lineWidth: 0.78,
      },
      22.4
    );
  } else if (zoneId === 'drinks_dessert') {
    // Refined Lacquered Cedar & Cream Marble Beverage & Dessert Bar
    drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 22, {
      top: isHovered ? '#F4E8D8' : '#E8DAC6',
      left: '#8D5D4E',
      right: '#694236',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 1.85 : 0.95,
    });
    drawCabinetPanels(ctx, pad.x, pad.y, pad.w, pad.h, 1.5, 18, {
      leftFill: '#784E41',
      rightFill: '#58372D',
    });

    // Twin glass juice dispensers + tiered dessert stand + fruit platter
    const span = (isVert ? pad.h : pad.w) - 34;
    const step = span / 4;
    for (let i = 0; i < 4; i++) {
      const px = isVert ? pad.x + pad.w * 0.5 : pad.x + 17 + (i + 0.5) * step;
      const py = isVert ? pad.y + 17 + (i + 0.5) * step : pad.y + pad.h * 0.5;
      const dp = w2i(px, py, 23);
      if (i < 2) {
        // Cylindrical glass juice dispenser on brass stand
        ctx.fillStyle = '#C79B50';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.72;
        ctx.fillRect(dp.x - 3.6, dp.y - 3, 7.2, 3.2);
        ctx.fillStyle = i === 0 ? 'rgba(244, 195, 68, 0.88)' : 'rgba(222, 92, 114, 0.86)';
        ctx.beginPath();
        ctx.roundRect(dp.x - 4.2, dp.y - 12.5, 8.4, 9.8, 2.2);
        ctx.fill();
        ctx.stroke();
        // Lid
        ctx.fillStyle = '#D9B972';
        ctx.beginPath();
        ctx.ellipse(dp.x, dp.y - 12.5, 4.4, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Tiered durian / fruit dessert platter
        ctx.fillStyle = '#FAF6EE';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.ellipse(dp.x, dp.y, 7.2, 3.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = i === 2 ? '#E8C65B' : '#7DB362';
        ctx.beginPath();
        ctx.arc(dp.x - 2, dp.y - 1.4, 2.3, 0, Math.PI * 2);
        ctx.arc(dp.x + 2.2, dp.y - 0.8, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // 'hotpot_sides' — Warm Cedar Buffet Island with Chilled Trays, Plate Stack & Bonsai Accent!
    // (Matches 4th item on bottom row of tycoon_v2_assets_sheet!)
    drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 22, {
      top: isHovered ? '#DFB47D' : '#C99862',
      left: '#96663B',
      right: '#734B28',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 1.85 : 0.95,
    });
    drawCabinetPanels(ctx, pad.x, pad.y, pad.w, pad.h, 1.5, 18.5, {
      leftFill: '#835731',
      rightFill: '#633F21',
    });

    // Chilled rectangular food trays (sliced beef rolls, leafy greens, shrimp paste)
    const span = (isVert ? pad.h : pad.w) - 44;
    const trayCount = 3;
    const step = Math.max(18, span / trayCount);
    const trayColors = ['#D27664', '#6CA054', '#DFB67E'];
    for (let i = 0; i < trayCount; i++) {
      const tw = isVert ? pad.w - 18 : Math.max(14, step - 6);
      const td = isVert ? Math.max(14, step - 6) : pad.h - 18;
      const tx = isVert ? pad.x + 9 : pad.x + 12 + i * step;
      const ty = isVert ? pad.y + 12 + i * step : pad.y + 9;
      drawQuad(ctx, tx, ty, tw, td, 22.4, '#ECE6DA', INK, 0.75);
      drawQuad(ctx, tx + 2.5, ty + 2.5, tw - 5, td - 5, 22.7, trayColors[i % trayColors.length]);
    }

    // Porcelain plate stack + signature miniature scholar's rock & jade bonsai at far end!
    const endX = isVert ? pad.x + pad.w * 0.5 : pad.x + pad.w - 14;
    const endY = isVert ? pad.y + pad.h - 14 : pad.y + pad.h * 0.5;
    drawPorcelainStack(
      ctx,
      isVert ? pad.x + pad.w * 0.5 : pad.x + pad.w - 30,
      isVert ? pad.y + pad.h - 28 : pad.y + pad.h * 0.5,
      22.5,
      5,
      4.5
    );
    const bonsaiP = w2i(endX, endY, 23);
    // Planter box
    drawBox(ctx, endX - 6, endY - 6, 12, 12, 4.5, { top: '#784E2C', left: '#5D3B20', right: '#452A15', lineWidth: 0.7 }, 22.2);
    // Scholar's rock & sculpted jade foliage
    ctx.fillStyle = '#9EA39E';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.72;
    ctx.beginPath();
    ctx.moveTo(bonsaiP.x - 4, bonsaiP.y - 3);
    ctx.lineTo(bonsaiP.x - 1, bonsaiP.y - 16);
    ctx.lineTo(bonsaiP.x + 4, bonsaiP.y - 12);
    ctx.lineTo(bonsaiP.x + 4.5, bonsaiP.y - 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6A9B5B';
    ctx.beginPath();
    ctx.arc(bonsaiP.x - 2.5, bonsaiP.y - 13, 3.8, 0, Math.PI * 2);
    ctx.arc(bonsaiP.x + 2.8, bonsaiP.y - 11.5, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Per-slot stock bars (clean & unobtrusive, preserving exact game info!)
  if (slots.length > 0) {
    const usableSpan = Math.max(36, (isVert ? pad.h : pad.w) - 24);
    const step = usableSpan / slots.length;
    slots.forEach((slot, idx) => {
      const ratio = slot.stock / Math.max(1, slot.maxStock);
      const sx = isVert ? pad.x + pad.w * 0.5 : pad.x + 12 + idx * step + step * 0.5;
      const sy = isVert ? pad.y + 12 + idx * step + step * 0.5 : pad.y + pad.h * 0.5;
      const sp = w2i(sx, sy, zoneId === 'live_seafood' ? 58 : 27);

      const bw = 22;
      ctx.fillStyle = 'rgba(18, 12, 10, 0.84)';
      ctx.fillRect(sp.x - bw / 2, sp.y - 12, bw, 3.8);
      ctx.fillStyle = ratio <= 0.25 ? '#EF4444' : ratio <= 0.55 ? '#FBBF24' : '#4ADE80';
      ctx.fillRect(sp.x - bw / 2 + 0.5, sp.y - 11.5, (bw - 1) * Math.max(0, Math.min(1, ratio)), 2.8);
    });
  }

  // Zone label badge
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

// ==========================================
// 5. FRONT-HALL TOP 4 KITCHEN STATIONS
// ==========================================

export function drawIsoTopKitchenStation(
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
  const topCenter = w2i(st.x, st.y, 44);

  // Soft contact shadow
  drawQuad(ctx, wx + 3, wy + 4, sw, st.h, 0.1, 'rgba(18, 12, 8, 0.22)');

  if (key === 'SINK') {
    // Signature Celadon-Tiled Double-Basin Wash Station (matches tycoon_v2_assets_sheet bottom-right!)
    drawBox(ctx, wx, wy, sw, st.h, 23, {
      top: isHovered ? '#BCE6E1' : '#96CFC9',
      left: '#68AAA4',
      right: '#4C8A85',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 1.85 : 0.95,
    });
    // Subtle celadon tile joints
    drawCabinetPanels(ctx, wx, wy, sw, st.h, 1.5, 19, {
      leftFill: '#5F9E98',
      rightFill: '#437C77',
      colsX: 3,
      colsY: 1,
    });

    // Twin recessed stainless/deep-jade wash basins
    const basinW = (sw - 34) * 0.48;
    for (let i = 0; i < 2; i++) {
      const bx = wx + 12 + i * (basinW + 10);
      drawQuad(ctx, bx, wy + 12, basinW, st.h - 24, 23.4, '#4C8D94', '#26585E', 0.85);
      // Curved chrome gooseneck faucet
      const fp = w2i(bx + basinW * 0.5, wy + 10, 23.6);
      ctx.strokeStyle = '#DCE4E8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(fp.x, fp.y);
      ctx.lineTo(fp.x, fp.y - 8);
      ctx.quadraticCurveTo(fp.x, fp.y - 12, fp.x + 3.8, fp.y - 9.5);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.65;
      ctx.stroke();
    }

    // Stainless wire drying rack holding stacked plates on right edge
    const rackP = w2i(wx + sw - 18, wy + st.h * 0.5, 24);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#F7F5EE';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.ellipse(rackP.x - 5 + i * 3.2, rackP.y - 2, 2.2, 4.4, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Dirty dishes stack proportional to world.dirtyDishes
    if (world.dirtyDishes > 0) {
      const stackH = Math.min(6, 1 + Math.ceil(world.dirtyDishes * 0.6));
      drawPorcelainStack(ctx, wx + 22, wy + st.h * 0.55, 24, stackH, 5.2);
    }

    drawIsoTextTag(ctx, `洗碗池 (脏${world.dirtyDishes})`, topCenter.x, topCenter.y, {
      color: world.dirtyDishes >= 3 ? '#FCA5A5' : '#E0F2FE',
      bg: 'rgba(19, 38, 44, 0.88)',
      border: world.dirtyDishes >= 3 ? '#EF4444' : '#38BDF8',
      fontSize: 10,
    });
  } else if (key === 'CLEAN_RACK') {
    // Brushed Stainless Glass-Front UV Dish Sterilizing Cabinet
    drawBox(ctx, wx, wy, sw, st.h, 27, {
      top: isHovered ? '#E5ECEF' : '#CDD8DE',
      left: '#98AAB4',
      right: '#728590',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 1.85 : 0.95,
    });
    // Pale cyan UV glass sliding doors on front-left face
    drawCabinetPanels(ctx, wx, wy, sw, st.h, 3, 21, {
      leftFill: 'rgba(182, 232, 238, 0.68)',
      rightFill: '#647681',
      colsX: 2,
      colsY: 1,
    });
    // Gleaming vertical porcelain bowl stacks on top shelf
    const stackCount = Math.min(4, Math.max(1, Math.ceil(world.cleanDishes / 4)));
    for (let i = 0; i < 3; i++) {
      drawPorcelainStack(ctx, wx + 24 + i * ((sw - 48) / 2), st.y, 27.6, stackCount, 5.6);
    }
    drawIsoTextTag(ctx, `消毒柜 (净${world.cleanDishes})`, topCenter.x, topCenter.y, {
      color: '#DCFCE7',
      bg: 'rgba(20, 42, 34, 0.88)',
      border: '#4ADE80',
      fontSize: 10,
    });
  } else if (key === 'BROTH_KITCHEN') {
    // Cedar & Cast-Iron 3-Burner Commercial Soup Stove
    drawBox(ctx, wx, wy, sw, st.h, 23, {
      top: isHovered ? '#DBA572' : '#BC8654',
      left: '#8C5B33',
      right: '#684121',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 1.85 : 0.95,
    });
    drawCabinetPanels(ctx, wx, wy, sw, st.h, 1.5, 18.5, {
      leftFill: '#7A4E2A',
      rightFill: '#59361B',
      colsX: 3,
      colsY: 1,
    });
    // Recessed dark iron stove deck
    drawQuad(ctx, wx + 8, wy + 8, sw - 16, st.h - 16, 23.4, '#332A27', '#6E5A4F', 0.88);

    // 3 large simmering copper & cast-iron broth cauldrons with stainless ladles
    const brothCols = ['#C83824', '#EAB74E', '#D96B27'];
    for (let i = 0; i < 3; i++) {
      const bx = wx + 36 + i * ((sw - 72) / 2);
      const bp = w2i(bx, st.y, 25.5);

      // Subtle orange burner glow ring under pot
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.65)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y + 3.2, 12.6, 6.4, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Heavy cast-iron / copper cauldron body
      ctx.fillStyle = '#4B372B';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y + 1.5, 12.2, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Metallic rim
      ctx.fillStyle = '#C6924E';
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y - 1.2, 11.6, 5.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Simmering broth
      ctx.fillStyle = brothCols[i];
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y - 1.2, 9.6, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ladle handle sticking out
      ctx.strokeStyle = '#D5DEE2';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(bp.x + 2, bp.y - 2);
      ctx.lineTo(bp.x + 11, bp.y - 9.5);
      ctx.stroke();

      drawSteamWisps(ctx, bp.x, bp.y - 5, timeSec, 3.3 + i * 2.1, 0.9);
    }

    drawIsoTextTag(ctx, '熬汤锅底灶', topCenter.x, topCenter.y, {
      color: '#FEF3C7',
      bg: 'rgba(54, 24, 14, 0.88)',
      border: '#F59E0B',
      fontSize: 10,
    });
  } else {
    // COLD_PREP: Stainless Steel & Cedar Seafood Prep Butcher Counter
    drawBox(ctx, wx, wy, sw, st.h, 23, {
      top: isHovered ? '#D9ECEE' : '#BCD9DE',
      left: '#7CA3AD',
      right: '#5B808B',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 1.85 : 0.95,
    });
    drawCabinetPanels(ctx, wx, wy, sw, st.h, 1.5, 18.5, {
      leftFill: '#6B919B',
      rightFill: '#4E707B',
      colsX: 3,
      colsY: 1,
    });

    // End-grain wooden cutting board + silver chef knife + sliced seafood
    drawBox(ctx, wx + 18, wy + 12, 42, st.h - 24, 2.2, { top: '#D8B17E', left: '#A97F4E', right: '#856037', lineWidth: 0.78 }, 23.2);
    const fishP = w2i(wx + 36, st.y, 26);
    ctx.fillStyle = '#E87C5C';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.ellipse(fishP.x - 3, fishP.y, 5.2, 2.3, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Chef knife resting beside fish
    ctx.fillStyle = '#E2E8EE';
    ctx.beginPath();
    ctx.moveTo(fishP.x + 2, fishP.y + 1);
    ctx.lineTo(fishP.x + 11, fishP.y - 2.5);
    ctx.lineTo(fishP.x + 10, fishP.y + 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Twin chilled stainless gastronorm ingredient pans
    drawQuad(ctx, wx + 70, wy + 12, 34, st.h - 24, 23.5, '#E3F4F6', '#4E828E', 0.8);
    drawQuad(ctx, wx + 110, wy + 12, Math.max(24, sw - 124), st.h - 24, 23.5, '#DDF0E6', '#4E8272', 0.8);

    drawIsoTextTag(ctx, `生鲜备菜台 (料${world.rawIngredients})`, topCenter.x, topCenter.y, {
      color: '#E0F2FE',
      bg: 'rgba(18, 42, 54, 0.88)',
      border: '#38BDF8',
      fontSize: 10,
    });
  }
}

// ==========================================
// 6. BACKSTAGE 7 ROOMS ARCHITECTURAL PROPS
// ==========================================

function drawBunkBed(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  quiltColor: string,
  quiltShade: string
) {
  const postWood = { top: '#9B6B3E', left: '#7C512B', right: '#5E3B1D', lineWidth: 0.78 };
  const postH = 44;
  const pW = 3.2;

  // Back 2 vertical corner posts
  drawBox(ctx, wx, wy, pW, pW, postH, postWood, 0);
  drawBox(ctx, wx + w - pW, wy, pW, pW, postH, postWood, 0);

  // Lower bunk wooden platform & mattress
  drawBox(ctx, wx + 2, wy + 2, w - 4, d - 4, 6.5, { top: '#B98756', left: '#8C5C33', right: '#6A4322', lineWidth: 0.8 }, 7);
  drawBox(ctx, wx + 4, wy + 4, w - 8, d - 8, 4.5, { top: '#F5EFE2', left: '#DDD5C5', right: '#C4BBA9', lineWidth: 0.75 }, 13.5);
  // Lower quilt & pillow
  drawBox(ctx, wx + 28, wy + 4, w - 34, d - 8, 2.2, { top: quiltColor, left: quiltShade, right: quiltShade, lineWidth: 0.7 }, 18);
  drawBox(ctx, wx + 7, wy + 8, 16, d - 16, 2.8, { top: '#FFFDF8', left: '#E4DED2', right: '#CCC5B7', lineWidth: 0.65 }, 18);

  // Upper bunk platform, mattress, quilt, pillow & safety rail
  drawBox(ctx, wx + 2, wy + 2, w - 4, d - 4, 5.5, { top: '#B98756', left: '#8C5C33', right: '#6A4322', lineWidth: 0.8 }, 29);
  drawBox(ctx, wx + 4, wy + 4, w - 8, d - 8, 4.2, { top: '#F5EFE2', left: '#DDD5C5', right: '#C4BBA9', lineWidth: 0.75 }, 34.5);
  drawBox(ctx, wx + 28, wy + 4, w - 34, d - 8, 2.2, { top: quiltColor, left: quiltShade, right: quiltShade, lineWidth: 0.7 }, 38.7);
  drawBox(ctx, wx + 7, wy + 8, 16, d - 16, 2.8, { top: '#FFFDF8', left: '#E4DED2', right: '#CCC5B7', lineWidth: 0.65 }, 38.7);
  // Safety rail along front edge of upper bunk
  drawBox(ctx, wx + 18, wy + d - 3.5, w - 34, 2.0, 2.2, postWood, 40.5);

  // Front 2 corner posts
  drawBox(ctx, wx, wy + d - pW, pW, pW, postH, postWood, 0);
  drawBox(ctx, wx + w - pW, wy + d - pW, pW, pW, postH, postWood, 0);

  // Wooden climbing ladder on front-left side
  const ladX = wx + 10;
  for (const rZ of [10, 18, 26, 34]) {
    const a = w2i(ladX, wy + d + 0.5, rZ);
    const b = w2i(ladX + 10, wy + d + 0.5, rZ);
    ctx.strokeStyle = '#6B4221';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

export function drawIsoBackstageRoomProps(
  ctx: CanvasRenderingContext2D,
  room: BackstageRoomRect,
  world: GameWorld,
  timeSec: number,
  isCurrentRoom: boolean,
  isHovered: boolean,
  backstageOffsetY: number
) {
  const wy = room.y + backstageOffsetY;
  const { x, w, h } = room;

  if (room.id === 'cold_storage') {
    // Tiered live holding aquariums + walk-in stainless crates & wooden produce boxes
    drawIsoTieredAquarium(ctx, x + 16, wy + 18, 128, 54, timeSec, 2);
    // Iced blue seafood storage crates with lids
    drawBox(ctx, x + 20, wy + 106, 46, 34, 21, {
      top: '#B5D6E3',
      left: '#7DA8BA',
      right: '#5B8497',
    });
    drawCabinetPanels(ctx, x + 20, wy + 106, 46, 34, 2, 16, { leftFill: '#6E99AC', rightFill: '#4E7487', colsX: 1, colsY: 1 });
    drawBox(ctx, x + 76, wy + 100, 44, 34, 27, {
      top: '#D2E7F0',
      left: '#93BCCB',
      right: '#6E98A8',
    });
    // Slatted wooden produce crate
    drawBox(ctx, x + 130, wy + 114, 34, 28, 16, {
      top: '#C79B67',
      left: '#9A6F3E',
      right: '#77532B',
    });
  } else if (room.id === 'hot_kitchen') {
    // Commercial cedar-and-steel twin-wok range + stacked plates + stainless prep island
    drawBox(ctx, x + 16, wy + 20, 174, 52, 24, {
      top: '#C99B68',
      left: '#93643B',
      right: '#6F4826',
    });
    drawCabinetPanels(ctx, x + 16, wy + 20, 174, 52, 1.5, 19, { leftFill: '#7F532E', rightFill: '#5E3B1E', colsX: 3, colsY: 1 });
    drawQuad(ctx, x + 24, wy + 27, 158, 38, 24.4, '#362D29', '#705D52', 0.85);

    for (let i = 0; i < 2; i++) {
      const wp = w2i(x + 62 + i * 74, wy + 46, 26.5);
      ctx.fillStyle = '#2E2623';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.ellipse(wp.x, wp.y, 14.5, 7.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = i === 0 ? '#DF6B27' : '#E39A38';
      ctx.beginPath();
      ctx.ellipse(wp.x, wp.y - 1.1, 9.6, 4.8, 0, 0, Math.PI * 2);
      ctx.fill();
      drawSteamWisps(ctx, wp.x, wp.y - 5, timeSec, 11.4 + i * 3, 1.05);
    }
    drawPorcelainStack(ctx, x + 26, wy + 46, 25, 5, 4.6);

    // Stainless chef prep table with wooden cutting board
    drawBox(ctx, x + 24, wy + 112, 102, 40, 21, {
      top: '#CFD9DE',
      left: '#97A8B1',
      right: '#73858F',
    });
    drawBox(ctx, x + 38, wy + 118, 36, 26, 2.2, { top: '#D8B07C', left: '#A87E4C', right: '#855F36', lineWidth: 0.7 }, 21.2);
  } else if (room.id === 'dish_washroom') {
    // Industrial stainless pass-through dishwasher & celadon rinse trough + wire plate racks
    drawBox(ctx, x + 18, wy + 22, 174, 52, 26, {
      top: '#A5D6D7',
      left: '#6DA7AC',
      right: '#4E8287',
    });
    drawQuad(ctx, x + 30, wy + 32, 110, 32, 26.4, '#42838E', '#1F4F59', 0.85);
    // Overhead stainless hood box on right end
    drawBox(ctx, x + 144, wy + 24, 44, 48, 22, { top: '#DCE5E9', left: '#9EB0B8', right: '#788B94', lineWidth: 0.85 }, 26);

    // Stainless clean dish cart with porcelain stacks
    drawBox(ctx, x + 24, wy + 110, 88, 36, 22, {
      top: '#DCE5E9',
      left: '#9AAAB3',
      right: '#758791',
    });
    drawPorcelainStack(ctx, x + 46, wy + 128, 22.6, 5, 5.2);
    drawPorcelainStack(ctx, x + 78, wy + 128, 22.6, 4, 5.2);
  } else if (room.id === 'office') {
    // Floor-to-ceiling carved mahogany bookcase filled with colorful ledger binders
    drawBox(ctx, x + 22, wy + 18, 160, 24, 48, {
      top: '#8D5C37',
      left: '#6A4225',
      right: '#4E2F19',
    });
    // 3 shelves of upright ledger books on bookcase face
    const bookCols = ['#B84A39', '#3E6F6B', '#C99846', '#4E5F7A', '#8F5A46', '#5F7F5B'];
    for (let shelf = 0; shelf < 3; shelf++) {
      const sz = 10 + shelf * 13;
      for (let b = 0; b < 9; b++) {
        const bx = x + 29 + b * 16;
        const p0 = w2i(bx, wy + 42, sz + 9.5);
        const p1 = w2i(bx + 11, wy + 42, sz + 9.5);
        const p2 = w2i(bx + 11, wy + 42, sz);
        const p3 = w2i(bx, wy + 42, sz);
        drawPoly(ctx, [p0, p1, p2, p3], bookCols[(b + shelf * 2) % bookCols.length], INK, 0.55);
      }
    }

    // Executive carved mahogany desk + open ledger + brass banker's lamp
    drawBox(ctx, x + 48, wy + 102, 114, 48, 22, {
      top: '#B57B4A',
      left: '#85532E',
      right: '#623B1E',
    });
    drawCabinetPanels(ctx, x + 48, wy + 102, 114, 48, 1.5, 18, { leftFill: '#744726', rightFill: '#543219', colsX: 2, colsY: 1, drawHandles: true });
    // Open ledger book
    drawQuad(ctx, x + 82, wy + 114, 28, 20, 22.5, '#FAF2DF', '#78481E', 0.8);
    // Emerald-shade brass banker's lamp
    const lampP = w2i(x + 138, wy + 114, 23);
    ctx.fillStyle = '#C99A49';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.7;
    ctx.fillRect(lampP.x - 1.2, lampP.y - 10, 2.4, 10);
    ctx.fillStyle = '#2F7D5C';
    ctx.beginPath();
    ctx.ellipse(lampP.x, lampP.y - 10.5, 5.2, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Slatted office chair behind desk
    drawSlattedWoodenChair(ctx, x + 92, wy + 80, 22, 16, 'NORTH');
  } else if (room.id === 'restroom') {
    // Signature Style-3 Celadon-Jade 3-Basin Handwashing Vanity + Stalls!
    drawBox(ctx, x + 18, wy + 20, 184, 40, 23, {
      top: '#E0F3F0',
      left: '#8CC9C2',
      right: '#65A8A0',
    });
    drawCabinetPanels(ctx, x + 18, wy + 20, 184, 40, 1.5, 18.5, { leftFill: '#78BAB2', rightFill: '#569790', colsX: 3, colsY: 1 });
    for (let i = 0; i < 3; i++) {
      const bx = x + 48 + i * 56;
      const bp = w2i(bx, wy + 40, 23.5);
      ctx.fillStyle = '#FAFDFC';
      ctx.strokeStyle = '#316F6A';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y, 10.5, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Chrome gooseneck faucet
      const fp = w2i(bx, wy + 29, 23.6);
      ctx.strokeStyle = '#D5E0E4';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(fp.x, fp.y);
      ctx.lineTo(fp.x, fp.y - 7);
      ctx.quadraticCurveTo(fp.x, fp.y - 10, fp.x + 3.2, fp.y - 8);
      ctx.stroke();
    }

    // Two Celadon-Teal Toilet Stalls with Wooden Doors & Brass Handles
    for (const sx of [x + 20, x + 104]) {
      drawBox(ctx, sx, wy + 122, 72, 74, 34, {
        top: '#82C5BB',
        left: '#5AA298',
        right: '#418178',
      });
      drawCabinetPanels(ctx, sx, wy + 122, 72, 74, 2, 29, {
        leftFill: '#9B6F46',
        rightFill: '#3B746C',
        colsX: 1,
        colsY: 1,
        drawHandles: true,
      });
    }
  } else if (room.id === 'equipment_room') {
    // Brushed Steel Chiller Compressor + Copper Pipes + Ice Maker + Ochre Separator
    drawBox(ctx, x + 22, wy + 24, 76, 58, 42, {
      top: '#A4B3BF',
      left: '#728494',
      right: '#526373',
    });
    // Dark louver vent grille lines on chiller
    for (let v = 0; v < 5; v++) {
      const vz = 12 + v * 5.2;
      const a = w2i(x + 30, wy + 82, vz);
      const b = w2i(x + 88, wy + 82, vz);
      ctx.strokeStyle = '#33414D';
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // Status gauge LED
    const gp = w2i(x + 60, wy + 82, 34);
    ctx.fillStyle = world.equipmentHealth < 55 ? '#EF4444' : '#4ADE80';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(gp.x, gp.y, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Commercial stainless ice-maker cabinet
    drawBox(ctx, x + 114, wy + 24, 76, 58, 36, {
      top: '#CBD6DE',
      left: '#8DA0AE',
      right: '#657886',
    });
    drawCabinetPanels(ctx, x + 114, wy + 24, 76, 58, 3, 28, { leftFill: '#7B8F9E', rightFill: '#596C7B', colsX: 1, colsY: 1, drawHandles: true });

    // Copper coolant connecting pipe between units
    const pipeA = w2i(x + 98, wy + 50, 32);
    const pipeB = w2i(x + 114, wy + 50, 32);
    ctx.strokeStyle = '#C87E45';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(pipeA.x, pipeA.y);
    ctx.lineTo(pipeB.x, pipeB.y);
    ctx.stroke();

    // Ochre-copper oil-water separator tank
    drawBox(ctx, x + 28, wy + 130, 114, 42, 23, {
      top: '#D48A3B',
      left: '#A86423',
      right: '#7D4717',
    });
    drawCabinetPanels(ctx, x + 28, wy + 130, 114, 42, 2, 18, { leftFill: '#96561D', rightFill: '#6D3D13', colsX: 2, colsY: 1 });
  } else if (room.id === 'dormitory') {
    // Two warm cedar double-decker bunk beds with ladders, quilts & pillows!
    drawBunkBed(ctx, x + 20, wy + 22, 102, 50, '#E3BE74', '#B9924A');
    drawBunkBed(ctx, x + 146, wy + 22, 102, 50, '#CFA0A8', '#A3747C');

    // Low wooden tea table on woven dorm rug with ceramic teapot & 4 cups
    drawBox(ctx, x + 84, wy + 132, 86, 50, 13, {
      top: '#BE8954',
      left: '#8C5C33',
      right: '#694321',
    });
    const potP = w2i(x + 126, wy + 156, 14.5);
    ctx.fillStyle = '#6FA69D';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.ellipse(potP.x, potP.y, 4.8, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (const [cx, cy] of [
      [-10, -4],
      [10, -4],
      [-9, 5],
      [9, 5],
    ]) {
      ctx.fillStyle = '#FAF6EE';
      ctx.beginPath();
      ctx.ellipse(potP.x + cx, potP.y + cy, 2.1, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Special Staff NPC in Cold Storage (林汐) / Hot Kitchen (沈知微) / Office (苏星遥)
  if (room.sideStoryStaffId) {
    const def = getSpecialStaffDef(room.sideStoryStaffId);
    const bond = world.specialStaffBonds[room.sideStoryStaffId];
    if (bond?.recruited || !world.mainStoryCompleted) {
      const npcWy = room.npcY + backstageOffsetY;
      const isShen = room.sideStoryStaffId === 'shen_zhiwei';
      const isSu = room.sideStoryStaffId === 'su_xingyao';
      drawIsoCharacter(ctx, {
        wx: room.npcX,
        wy: npcWy,
        archetype: isShen ? 'CHEF' : isSu ? 'HOST' : 'SERVER',
        bodyColor: isShen ? '#F7F3EA' : isSu ? '#7D3B4C' : '#53948B',
        trimColor: isSu ? '#E6C67A' : '#E8DFC8',
        pantsColor: isShen ? '#33363B' : '#354F4D',
        hairColor: '#1E1612',
        hairStyle: isSu ? 'BUN' : isShen ? 'PARTED' : 'BOB',
        highlightRing: world.mainStoryCompleted
          ? undefined
          : bond?.recruited
            ? '#E8C97A'
            : '#38BDF8',
        scale: 1.02,
      });
      const np = w2i(room.npcX, npcWy, 43);
      drawIsoTextTag(
        ctx,
        bond?.recruited
          ? world.mainStoryCompleted
            ? def.name
            : `${def.name} ♥${bond.affection}`
          : `★ ${def.name}（可招募）`,
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
  }

  // Room title badge centered cleanly
  const titlePos = w2i(x + w * 0.5, wy + h * 0.5, 58);
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
