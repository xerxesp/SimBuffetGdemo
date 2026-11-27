import {
  BROTH_CATALOG,
  FRONT_HALL_ZONES,
  getFrontHallEntranceLayout,
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
  resolveCustomerVisual,
} from './isoCharacterArt';
import { drawIsoFurnitureSprite } from './isoFurnitureSprites';

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
  const seatAnimState = table.status === 'DINING' ? 'DINING_EAT' : 'DINING_WAIT';
  if (guest) {
    const leadVis = resolveCustomerVisual(guest, guestBaseSeed);
    const patienceRatio = Math.max(0, Math.min(1, guest.patience / Math.max(1, guest.maxPatience)));

    drawIsoCharacter(ctx, {
      wx: table.x - 1,
      wy: table.y - 31,
      archetype: leadVis.archetype,
      bodyColor: leadVis.bodyColor,
      trimColor: leadVis.trimColor,
      pantsColor: leadVis.pantsColor,
      hairColor: leadVis.hairColor,
      hairStyle: leadVis.hairStyle,
      isVip: guest.isVip,
      seated: true,
      facing: 'SW',
      seatFacing: 'SW',
      animState: seatAnimState,
      animTime: timeSec + table.id * 0.73,
      patienceRatio,
      scale: 0.9,
    });

    if (guest.size >= 2) {
      const p2 = getGuestStyleBySeed(guestBaseSeed + 3);
      drawIsoCharacter(ctx, {
        wx: table.x - 31,
        wy: table.y + 1,
        archetype: p2.archetype,
        bodyColor: p2.body,
        trimColor: p2.trim,
        pantsColor: p2.pants,
        hairColor: p2.hair,
        hairStyle: p2.hairStyle,
        seated: true,
        facing: 'SE',
        seatFacing: 'SE',
        animState: seatAnimState,
        animTime: timeSec + table.id * 0.73 + 1.15,
        patienceRatio,
        scale: 0.89,
      });
    }
  }

  // Unified hand-drawn Cantonese cedar & dark-bronze induction Hotpot Dining Table sprite
  const drewTableSprite = drawIsoFurnitureSprite(ctx, 'HOTPOT_TABLE', {
    topPt: w2i(wx, wy, 0),
    rightPt: w2i(wx + size, wy, 0),
    bottomPt: w2i(wx + size, wy + size, 0),
    leftPt: w2i(wx, wy + size, 0),
    isHovered,
  });

  if (!drewTableSprite) {
    // 4 slender wooden table corner legs + recessed apron rails fallback while decoding
    const legW = 4.2;
    const legH = 16.5;
    const legWood = { top: '#8B5C34', left: '#6F4624', right: '#543318', lineWidth: 0.8 };
    drawBox(ctx, wx + 3, wy + 3, legW, legW, legH, legWood, 0);
    drawBox(ctx, wx + size - legW - 3, wy + 3, legW, legW, legH, legWood, 0);
    drawBox(ctx, wx + 3, wy + size - legW - 3, legW, legW, legH, legWood, 0);
    drawBox(ctx, wx + size - legW - 3, wy + size - legW - 3, legW, legW, legH, legWood, 0);

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

    drawQuad(ctx, wx + 3.5, wy + 3.5, size - 7, size - 7, 20.8, 'rgba(255,244,224,0.08)', 'rgba(84, 51, 24, 0.45)', 0.7);
    drawQuad(ctx, table.x - 14.5, table.y - 14.5, 29, 29, 20.9, '#3A2A22', '#A87D42', 0.85);
    drawQuad(ctx, table.x - 11.5, table.y - 11.5, 23, 23, 21.0, '#2A201B', '#735733', 0.65);
  }

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

    // Warm induction-hearth amber glow halo radiating softly onto the cedar tabletop
    const hearthPulse = 0.85 + Math.sin(timeSec * 4.5 + table.id * 1.3) * 0.15;
    const hearthGrad = ctx.createRadialGradient(potC.x, potC.y + 2, 2, potC.x, potC.y + 2, 22);
    hearthGrad.addColorStop(0, `rgba(255, 168, 62, ${(0.28 * hearthPulse).toFixed(2)})`);
    hearthGrad.addColorStop(0.55, `rgba(245, 130, 40, ${(0.11 * hearthPulse).toFixed(2)})`);
    hearthGrad.addColorStop(1, 'rgba(245, 130, 40, 0)');
    ctx.fillStyle = hearthGrad;
    ctx.beginPath();
    ctx.ellipse(potC.x, potC.y + 2.2, 22, 12.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Side rectangular dish trays with leafy greens & sliced beef
    drawQuad(ctx, table.x - 24, table.y + 8, 12, 15, 21.1, '#EFEBE1', INK, 0.65);
    drawQuad(ctx, table.x - 22, table.y + 10, 8, 11, 21.3, '#6EA052');
    drawQuad(ctx, table.x + 12, table.y - 23, 12, 15, 21.1, '#EFEBE1', INK, 0.65);
    drawQuad(ctx, table.x + 14, table.y - 21, 8, 11, 21.3, '#CF6A55');

    // Dipping bowls & delicate celadon teacup at corners
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
      // Savory sesame-chili dipping sauce center dot
      ctx.fillStyle = '#A85828';
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y - 0.1, 2.0, 1.0, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const cupP = w2i(table.x - 19, table.y - 7, 21.2);
    ctx.fillStyle = '#B8DCD5';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(cupP.x, cupP.y, 2.2, 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

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

    // Lively rolling simmering broth bubbles & garnish flecks
    const bPhase1 = (timeSec * 2.4 + table.id * 0.7) % 1;
    const bPhase2 = (timeSec * 2.1 + table.id * 1.1 + 0.5) % 1;
    const bPhase3 = (timeSec * 2.8 + table.id * 0.4 + 0.25) % 1;
    ctx.strokeStyle = 'rgba(255, 246, 224, 0.88)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(potC.x - 4.0, potC.y - 1.5 - bPhase1 * 0.8, 0.7 + bPhase1 * 1.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(potC.x + 3.8, potC.y - 0.8 - bPhase2 * 0.8, 0.65 + bPhase2 * 1.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#FFF5DC';
    ctx.beginPath();
    ctx.arc(potC.x - 2.4, potC.y + 0.3 - bPhase3 * 0.5, 0.9, 0, Math.PI * 2);
    ctx.arc(potC.x + 2.1, potC.y - 2.2 - bPhase1 * 0.5, 0.85, 0, Math.PI * 2);
    ctx.fill();
    // Floating green scallion & red chili flecks
    ctx.fillStyle = '#5D8F49';
    ctx.fillRect(potC.x + 1.8, potC.y - 2.6, 1.6, 1.0);
    ctx.fillRect(potC.x - 5.2, potC.y - 0.2, 1.5, 1.0);
    ctx.fillStyle = '#E53935';
    ctx.fillRect(potC.x - 4.8, potC.y - 2.4, 1.4, 0.85);

    // Rising translucent watercolor steam curls
    drawSteamWisps(ctx, potC.x, potC.y - 6, timeSec, table.id * 1.7, 1.15);
  }

  // Front seated guests (size >= 3 & >= 4, back 3/4 view facing inward toward pot!)
  if (guest && guest.size >= 3) {
    const p3 = getGuestStyleBySeed(guestBaseSeed + 5);
    drawIsoCharacter(ctx, {
      wx: table.x + 30,
      wy: table.y + 2,
      archetype: p3.archetype,
      bodyColor: p3.body,
      trimColor: p3.trim,
      pantsColor: p3.pants,
      hairColor: p3.hair,
      hairStyle: p3.hairStyle,
      seated: true,
      facing: 'NW',
      seatFacing: 'NW',
      animState: seatAnimState,
      animTime: timeSec + table.id * 0.73 + 2.3,
      scale: 0.88,
    });
  }
  if (guest && guest.size >= 4) {
    const p4 = getGuestStyleBySeed(guestBaseSeed + 9);
    drawIsoCharacter(ctx, {
      wx: table.x + 2,
      wy: table.y + 30,
      archetype: p4.archetype,
      bodyColor: p4.body,
      trimColor: p4.trim,
      pantsColor: p4.pants,
      hairColor: p4.hair,
      hairStyle: p4.hairStyle,
      seated: true,
      facing: 'NE',
      seatFacing: 'NE',
      animState: seatAnimState,
      animTime: timeSec + table.id * 0.73 + 3.45,
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
  const entrance = getFrontHallEntranceLayout(world.shopLevel);
  const rec = entrance.reception;
  const wx = rec.x - rec.w * 0.5;
  const wy = rec.y - rec.h * 0.5;
  const w = rec.w;
  const d = rec.h;

  // Soft contact shadow
  drawQuad(ctx, wx + 4, wy + 5, w, d, 0.1, 'rgba(20, 14, 10, 0.24)');

  // Standalone Cantonese-harbor mahogany & brass Reception Desk isometric sprite (unified canonical scale!)
  const drewSprite = drawIsoFurnitureSprite(ctx, 'RECEPTION', {
    topPt: w2i(wx, wy, 0),
    rightPt: w2i(wx + w, wy, 0),
    bottomPt: w2i(wx + w, wy + d, 0),
    leftPt: w2i(wx, wy + d, 0),
    flipX: true,
    isHovered,
  });

  if (!drewSprite) {
    // Crisp procedural fallback while image decodes
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
  }

  // Subtle warm tabletop lantern halo on reception desk corner
  const lampP = w2i(rec.x - w * 0.28, rec.y - d * 0.12, 34);
  const lampGrad = ctx.createRadialGradient(lampP.x, lampP.y, 1, lampP.x, lampP.y, 16);
  lampGrad.addColorStop(0, 'rgba(255, 226, 146, 0.35)');
  lampGrad.addColorStop(1, 'rgba(255, 226, 146, 0)');
  ctx.fillStyle = lampGrad;
  ctx.beginPath();
  ctx.arc(lampP.x, lampP.y, 16, 0, Math.PI * 2);
  ctx.fill();

  const lp = w2i(rec.x, rec.y, 38);
  drawIsoTextTag(
    ctx,
    world.queue.length > 0 ? `迎宾台 (门外排队${world.queue.length})` : '迎宾接待台',
    lp.x,
    lp.y - 24,
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
  const isVert = d > w;
  const drewAqSprite = drawIsoFurnitureSprite(ctx, 'LIVE_AQUARIUM', {
    topPt: w2i(wx, wy, 0),
    rightPt: w2i(wx + w, wy, 0),
    bottomPt: w2i(wx + w, wy + d, 0),
    leftPt: w2i(wx, wy + d, 0),
    flipX: !isVert,
    isHovered,
  });

  if (!drewAqSprite) {
    // Procedural fallback while image decodes
    drawBox(ctx, wx, wy, w, d, 14, {
      top: '#A67247',
      left: '#7F522E',
      right: '#5F3B1F',
      stroke: isHovered ? '#FDE047' : INK,
      lineWidth: isHovered ? 1.8 : 0.95,
    });
    for (let t = 0; t < tiers; t++) {
      const zBase = 14 + t * 20;
      const insetX = isVert ? t * 2 : t * 4;
      const insetY = isVert ? t * 4 : t * 2;
      const tw = Math.max(24, w - insetX * 2);
      const td = Math.max(24, d - insetY * 2);
      drawBox(
        ctx,
        wx + insetX,
        wy + (t === 1 ? 0 : insetY),
        tw,
        td,
        18,
        {
          top: 'rgba(178, 240, 236, 0.84)',
          left: 'rgba(92, 194, 194, 0.82)',
          right: 'rgba(58, 158, 162, 0.86)',
          stroke: '#20565B',
          lineWidth: 0.95,
        },
        zBase
      );
    }
  }

  // Live animated turquoise underwater shimmer & rising aerator bubbles layered cleanly on aquarium
  const center = w2i(wx + w * 0.5, wy + d * 0.5, 24);
  const caustShift = Math.sin(timeSec * 2.2 + wx * 0.03) * 5;
  ctx.save();
  ctx.strokeStyle = 'rgba(232, 255, 252, 0.45)';
  ctx.lineWidth = 0.85;
  ctx.beginPath();
  ctx.ellipse(center.x + caustShift * 0.5, center.y - 6, Math.min(20, w * 0.16), 3.0, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(240, 255, 255, 0.86)';
  for (let b = 0; b < 6; b++) {
    const bOff = (timeSec * (13 + (b % 3) * 3) + b * 3.7) % 16;
    const bxOff = -18 + b * 7.2 + Math.sin(timeSec * 3.2 + b * 1.7) * 1.3;
    const br = 0.7 + (b % 2) * 0.35;
    ctx.beginPath();
    ctx.arc(center.x + bxOff, center.y + 4 - bOff, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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
  isHovered: boolean,
  padStatus: 'PURCHASED' | 'BUYABLE' | 'BUILDING' = 'PURCHASED',
  buildingDays: number | null = null
) {
  const isVert = pad.orientation === 'VERTICAL';

  // Empty / Buyable / Under-Construction floor blueprint pad
  if (!zoneId) {
    const isBuyable = padStatus === 'BUYABLE';
    const isBuilding = padStatus === 'BUILDING';

    const outerFill = isBuilding
      ? isHovered
        ? 'rgba(56, 189, 248, 0.28)'
        : 'rgba(18, 46, 58, 0.42)'
      : isBuyable
        ? isHovered
          ? 'rgba(96, 165, 250, 0.24)'
          : 'rgba(20, 30, 44, 0.36)'
        : isHovered
          ? 'rgba(232, 201, 122, 0.28)'
          : 'rgba(26, 20, 15, 0.34)';

    const outerStroke = isBuilding
      ? isHovered
        ? '#7DD3FC'
        : '#38BDF8'
      : isBuyable
        ? isHovered
          ? '#93C5FD'
          : '#60A5FA'
        : isHovered
          ? '#FDE047'
          : '#D6AF66';

    const innerStroke = isBuilding
      ? 'rgba(125, 211, 252, 0.62)'
      : isBuyable
        ? 'rgba(147, 197, 253, 0.55)'
        : 'rgba(232, 201, 122, 0.52)';

    drawQuad(
      ctx,
      pad.x,
      pad.y,
      pad.w,
      pad.h,
      0.8,
      outerFill,
      outerStroke,
      isHovered ? 2.1 : 1.25
    );
    drawQuad(
      ctx,
      pad.x + 8,
      pad.y + 8,
      pad.w - 16,
      pad.h - 16,
      1.0,
      isBuilding
        ? 'rgba(56, 189, 248, 0.14)'
        : isBuyable
          ? 'rgba(96, 165, 250, 0.08)'
          : isHovered
            ? 'rgba(253, 224, 71, 0.14)'
            : 'rgba(214, 175, 102, 0.08)',
      innerStroke,
      0.85
    );

    const p0 = w2i(pad.x + 12, pad.y + 12, 1.2);
    const p1 = w2i(pad.x + pad.w - 12, pad.y + pad.h - 12, 1.2);
    const p2 = w2i(pad.x + pad.w - 12, pad.y + 12, 1.2);
    const p3 = w2i(pad.x + 12, pad.y + pad.h - 12, 1.2);
    ctx.save();
    ctx.strokeStyle = isBuilding
      ? 'rgba(125, 211, 252, 0.6)'
      : isBuyable
        ? 'rgba(147, 197, 253, 0.45)'
        : isHovered
          ? 'rgba(253, 224, 71, 0.72)'
          : 'rgba(232, 201, 122, 0.35)';
    ctx.lineWidth = 0.95;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();
    ctx.restore();

    const tagPos = w2i(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5, 12);
    const tagText = isBuilding
      ? `扩建施工中 · ${pad.label} · 余${buildingDays ?? 1}天`
      : isBuyable
        ? `+ ${pad.label} · ¥${pad.purchaseCost}购置(${pad.buildDays}天)`
        : `+ ${pad.label} · 点击配置`;
    drawIsoTextTag(ctx, tagText, tagPos.x, tagPos.y, {
      color: isBuilding
        ? '#BAE6FD'
        : isBuyable
          ? isHovered
            ? '#EFF6FF'
            : '#BFDBFE'
          : isHovered
            ? '#FEF08A'
            : '#E8C97A',
      bg: isBuilding
        ? 'rgba(14, 42, 56, 0.92)'
        : isBuyable
          ? 'rgba(16, 26, 42, 0.88)'
          : isHovered
            ? 'rgba(54, 34, 16, 0.94)'
            : 'rgba(24, 16, 12, 0.84)',
      border: outerStroke,
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

  // Subtle ambient contact shadow + crisp low stone pad border grounding every buffet island
  drawQuad(ctx, pad.x + 4, pad.y + 5, pad.w, pad.h, 0.15, 'rgba(18, 12, 8, 0.24)');
  drawQuad(ctx, pad.x + 1, pad.y + 1, pad.w - 2, pad.h - 2, 0.25, 'rgba(54, 38, 26, 0.16)', 'rgba(84, 58, 36, 0.42)', 0.85);

  const padFoot = {
    topPt: w2i(pad.x, pad.y, 0),
    rightPt: w2i(pad.x + pad.w, pad.y, 0),
    bottomPt: w2i(pad.x + pad.w, pad.y + pad.h, 0),
    leftPt: w2i(pad.x, pad.y + pad.h, 0),
  };

  if (zoneId === 'live_seafood') {
    drawIsoTieredAquarium(ctx, pad.x + 2, pad.y + 2, pad.w - 4, pad.h - 4, timeSec, 2, isHovered);
  } else if (zoneId === 'ice_seafood') {
    const drewIceSprite = drawIsoFurnitureSprite(ctx, 'ICE_BUFFET', {
      ...padFoot,
      flipX: !isVert,
      isHovered,
    });

    if (!drewIceSprite) {
      drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 22, {
        top: '#CEDCE0',
        left: '#6EA39E',
        right: '#4E827E',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    // Animated crystalline crushed-ice sparkles + cool dry-ice chill mist
    for (let k = 0; k < 5; k++) {
      const glint = Math.max(0, Math.sin(timeSec * 3.1 + k * 1.9 + pad.x * 0.02));
      if (glint > 0.35) {
        const gx = pad.x + 14 + ((k * 37) % Math.max(20, pad.w - 28));
        const gy = pad.y + 10 + ((k * 23) % Math.max(16, pad.h - 20));
        const gp = w2i(gx, gy, 24);
        const s = (glint - 0.3) * 3.2;
        ctx.strokeStyle = `rgba(242, 254, 255, ${(glint * 0.92).toFixed(2)})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(gp.x - s, gp.y);
        ctx.lineTo(gp.x + s, gp.y);
        ctx.moveTo(gp.x, gp.y - s);
        ctx.lineTo(gp.x, gp.y + s);
        ctx.stroke();
      }
    }
    const chillA = w2i(pad.x + pad.w * 0.32, pad.y + pad.h * 0.5, 24);
    const chillB = w2i(pad.x + pad.w * 0.68, pad.y + pad.h * 0.5, 24);
    drawSteamWisps(ctx, chillA.x, chillA.y, timeSec * 0.65, 2.2, 0.55, '208, 246, 255');
    drawSteamWisps(ctx, chillB.x, chillB.y, timeSec * 0.65 + 2.4, 5.1, 0.5, '208, 246, 255');
  } else if (zoneId === 'teppan_bbq') {
    const drewTeppanSprite = drawIsoFurnitureSprite(ctx, 'TEPPAN_BBQ', {
      ...padFoot,
      flipX: !isVert,
      isHovered,
    });

    if (!drewTeppanSprite) {
      drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 21, {
        top: '#B57F4E',
        left: '#8A5B34',
        right: '#674122',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    // Live warm ember glow, rising glowing sparks & sizzle wisps
    const emberPulse = 0.72 + Math.sin(timeSec * 4.2 + pad.x * 0.05) * 0.22;
    const glowCenter = w2i(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5, 24);
    const emberGrad = ctx.createRadialGradient(glowCenter.x, glowCenter.y, 3, glowCenter.x, glowCenter.y, 32);
    emberGrad.addColorStop(0, `rgba(255, 132, 36, ${(0.24 * emberPulse).toFixed(2)})`);
    emberGrad.addColorStop(1, 'rgba(255, 132, 36, 0)');
    ctx.fillStyle = emberGrad;
    ctx.beginPath();
    ctx.ellipse(glowCenter.x, glowCenter.y, 32, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let f = 0; f < 3; f++) {
      const fx = isVert ? pad.x + pad.w * 0.5 : pad.x + 24 + f * ((pad.w - 48) / 2);
      const fy = isVert ? pad.y + 24 + f * ((pad.h - 48) / 2) : pad.y + pad.h * 0.5;
      const fp = w2i(fx, fy, 25);
      const sparkT = (timeSec * 0.9 + f * 0.37) % 1;
      const sx = fp.x + Math.sin(timeSec * 4 + f * 3) * 3.8;
      const sy = fp.y - 2 - sparkT * 18;
      ctx.fillStyle = `rgba(253, 186, 116, ${((1 - sparkT) * 0.95).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.05, 0, Math.PI * 2);
      ctx.fill();
    }

    if (slots.some((s) => s.stock > 0)) {
      const smokeA = w2i(pad.x + pad.w * 0.36, pad.y + pad.h * 0.45, 27);
      const smokeB = w2i(pad.x + pad.w * 0.64, pad.y + pad.h * 0.55, 27);
      drawSteamWisps(ctx, smokeA.x, smokeA.y, timeSec * 1.1, 7.5, 1.0, '246, 236, 224');
      drawSteamWisps(ctx, smokeB.x, smokeB.y, timeSec * 1.1 + 1.8, 7.5, 0.9, '246, 236, 224');
    }
  } else if (zoneId === 'cooked_hot') {
    const drewCookedSprite = drawIsoFurnitureSprite(ctx, 'COOKED_HOT', {
      ...padFoot,
      flipX: !isVert,
      isHovered,
    });

    if (!drewCookedSprite) {
      drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 23, {
        top: isHovered ? '#DCA469' : '#BD8552',
        left: '#8D5C34',
        right: '#694121',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    // Warm golden heat-lamp glow + fragrant steam above brass chafing woks
    const lampGlow = w2i(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5, 25);
    const hlGrad = ctx.createRadialGradient(lampGlow.x, lampGlow.y, 3, lampGlow.x, lampGlow.y, 34);
    hlGrad.addColorStop(0, 'rgba(255, 206, 102, 0.22)');
    hlGrad.addColorStop(1, 'rgba(255, 206, 102, 0)');
    ctx.fillStyle = hlGrad;
    ctx.beginPath();
    ctx.ellipse(lampGlow.x, lampGlow.y, 34, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    if (world.cookedStock > 0) {
      const stP1 = w2i(pad.x + pad.w * 0.36, pad.y + pad.h * 0.5, 27);
      const stP2 = w2i(pad.x + pad.w * 0.66, pad.y + pad.h * 0.5, 27);
      drawSteamWisps(ctx, stP1.x, stP1.y, timeSec, 9.2, 1.0);
      drawSteamWisps(ctx, stP2.x, stP2.y, timeSec + 1.4, 4.7, 0.85);
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
    const drewSashimiSprite = drawIsoFurnitureSprite(ctx, 'SASHIMI_SUSHI', {
      ...padFoot,
      flipX: !isVert,
      isHovered,
    });

    if (!drewSashimiSprite) {
      drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 22, {
        top: isHovered ? '#EED7B2' : '#DFC398',
        left: '#AC8759',
        right: '#87663E',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    // Delicate chilled dry-ice mist over hinoki sushi glass showcase
    const smP = w2i(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5, 25);
    drawSteamWisps(ctx, smP.x, smP.y, timeSec * 0.55, 6.2, 0.48, '218, 248, 255');
  } else if (zoneId === 'drinks_dessert') {
    const drewDrinksSprite = drawIsoFurnitureSprite(ctx, 'DRINKS_DESSERT', {
      ...padFoot,
      flipX: !isVert,
      isHovered,
    });

    if (!drewDrinksSprite) {
      drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 22, {
        top: isHovered ? '#F4E8D8' : '#E8DAC6',
        left: '#8D5D4E',
        right: '#694236',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    // Subtle warm fairy-light twinkle sparkles along dessert bar edge
    for (let l = 0; l < 4; l++) {
      const t = (l + 0.5) / 4;
      const lp = isVert
        ? w2i(pad.x + pad.w, pad.y + t * pad.h, 20)
        : w2i(pad.x + t * pad.w, pad.y + pad.h, 20);
      const tw = 0.55 + Math.sin(timeSec * 3.5 + l * 1.4) * 0.4;
      ctx.fillStyle = `rgba(255, 228, 142, ${tw.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(lp.x, lp.y, 1.35, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (zoneId === 'steam_dimsum') {
    const drewDimsumSprite = drawIsoFurnitureSprite(ctx, 'STEAM_DIMSUM', {
      ...padFoot,
      flipX: !isVert,
      isHovered,
    });

    if (!drewDimsumSprite) {
      drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 22, {
        top: isHovered ? '#E6BC82' : '#D2A166',
        left: '#98693C',
        right: '#734B27',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    // Billowing warm dim-sum steam wisps above bamboo steamer stacks
    const st1 = w2i(pad.x + pad.w * 0.34, pad.y + pad.h * 0.48, 29);
    const st2 = w2i(pad.x + pad.w * 0.66, pad.y + pad.h * 0.52, 31);
    drawSteamWisps(ctx, st1.x, st1.y, timeSec, 3.4, 0.95);
    drawSteamWisps(ctx, st2.x, st2.y, timeSec + 1.6, 5.5, 0.9);
  } else if (zoneId === 'raw_marinated') {
    const drewRawSprite = drawIsoFurnitureSprite(ctx, 'RAW_MARINATED', {
      ...padFoot,
      flipX: !isVert,
      isHovered,
    });

    if (!drewRawSprite) {
      drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 21, {
        top: isHovered ? '#9AD3D4' : '#7ABBC0',
        left: '#4A8991',
        right: '#346971',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    // Cool chilled mist rising softly from Chaoshan marinated trough
    const rmMist = w2i(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5, 24);
    drawSteamWisps(ctx, rmMist.x, rmMist.y, timeSec * 0.58, 1.6, 0.48, '204, 246, 248');
  } else if (zoneId === 'wagyu_carving') {
    const drewWagyuSprite = drawIsoFurnitureSprite(ctx, 'WAGYU_CARVING', {
      ...padFoot,
      flipX: !isVert,
      isHovered,
    });

    if (!drewWagyuSprite) {
      drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 22, {
        top: isHovered ? '#F2EAE0' : '#E5DBCE',
        left: '#5F322C',
        right: '#45221E',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    // Warm golden brass heat-lamp glow + occasional sear flare & savory steam
    const lampPulse = 0.85 + Math.sin(timeSec * 3.2 + pad.x * 0.02) * 0.15;
    const wp = w2i(pad.x + pad.w * 0.5, pad.y + pad.h * 0.5, 25);
    const wgGrad = ctx.createRadialGradient(wp.x, wp.y, 2, wp.x, wp.y, 32);
    wgGrad.addColorStop(0, `rgba(251, 191, 36, ${(0.25 * lampPulse).toFixed(2)})`);
    wgGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = wgGrad;
    ctx.beginPath();
    ctx.ellipse(wp.x, wp.y, 32, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    drawSteamWisps(ctx, wp.x, wp.y - 3, timeSec * 0.9, 5.4, 0.72, '248, 238, 226');
  } else {
    // 'hotpot_sides' — Carved cedar buffet island with sliced beef, greens, sauce jars & bonsai
    const drewSidesSprite = drawIsoFurnitureSprite(ctx, 'HOTPOT_SIDES', {
      ...padFoot,
      flipX: !isVert,
      isHovered,
    });

    if (!drewSidesSprite) {
      drawBox(ctx, pad.x, pad.y, pad.w, pad.h, 22, {
        top: isHovered ? '#DFB47D' : '#C99862',
        left: '#96663B',
        right: '#734B28',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    const sideMist = w2i(pad.x + pad.w * 0.45, pad.y + pad.h * 0.5, 24);
    drawSteamWisps(ctx, sideMist.x, sideMist.y, timeSec * 0.52, 4.1, 0.4, '220, 248, 255');
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

  const topFoot = {
    topPt: w2i(wx, wy, 0),
    rightPt: w2i(wx + sw, wy, 0),
    bottomPt: w2i(wx + sw, wy + st.h, 0),
    leftPt: w2i(wx, wy + st.h, 0),
  };

  if (key === 'SINK') {
    const drewSinkSprite = drawIsoFurnitureSprite(ctx, 'SINK', {
      ...topFoot,
      flipX: true,
      isHovered,
    });

    if (!drewSinkSprite) {
      drawBox(ctx, wx, wy, sw, st.h, 23, {
        top: isHovered ? '#BCE6E1' : '#96CFC9',
        left: '#68AAA4',
        right: '#4C8A85',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    // Animated water ripple & soap foam bubbles over basin
    const wc = w2i(wx + sw * 0.48, wy + st.h * 0.52, 24);
    const rip = (timeSec * 1.1) % 1;
    ctx.strokeStyle = `rgba(218, 248, 252, ${(0.58 * (1 - rip)).toFixed(2)})`;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.ellipse(wc.x, wc.y, 2.5 + rip * 7.2, 1.3 + rip * 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (world.dirtyDishes > 0) {
      ctx.fillStyle = 'rgba(245, 252, 255, 0.86)';
      const bob = Math.sin(timeSec * 3.2) * 0.7;
      ctx.beginPath();
      ctx.arc(wc.x - 3.4, wc.y - 0.6 + bob, 1.3, 0, Math.PI * 2);
      ctx.arc(wc.x + 2.2, wc.y - 0.8 - bob, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    drawIsoTextTag(ctx, `洗碗池 (脏${world.dirtyDishes})`, topCenter.x, topCenter.y - 8, {
      color: world.dirtyDishes >= 3 ? '#FCA5A5' : '#E0F2FE',
      bg: 'rgba(19, 38, 44, 0.88)',
      border: world.dirtyDishes >= 3 ? '#EF4444' : '#38BDF8',
      fontSize: 10,
    });
  } else if (key === 'CLEAN_RACK') {
    const drewSterilizerSprite = drawIsoFurnitureSprite(ctx, 'CLEAN_RACK', {
      ...topFoot,
      flipX: true,
      isHovered,
    });

    if (!drewSterilizerSprite) {
      drawBox(ctx, wx, wy, sw, st.h, 27, {
        top: isHovered ? '#E5ECEF' : '#CDD8DE',
        left: '#98AAB4',
        right: '#728590',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    // Live pulsing cyan UV sterilization radiance spilling onto counter front
    const uvPulse = 0.58 + Math.sin(timeSec * 2.6) * 0.18;
    const uvGlowP = w2i(wx + sw * 0.5, wy + st.h + 2, 16);
    const uvGrad = ctx.createRadialGradient(uvGlowP.x, uvGlowP.y, 2, uvGlowP.x, uvGlowP.y, 24);
    uvGrad.addColorStop(0, `rgba(103, 232, 249, ${(0.26 * uvPulse).toFixed(2)})`);
    uvGrad.addColorStop(1, 'rgba(103, 232, 249, 0)');
    ctx.fillStyle = uvGrad;
    ctx.beginPath();
    ctx.ellipse(uvGlowP.x, uvGlowP.y, 24, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    drawIsoTextTag(ctx, `消毒柜 (净${world.cleanDishes})`, topCenter.x, topCenter.y - 12, {
      color: '#DCFCE7',
      bg: 'rgba(20, 42, 34, 0.88)',
      border: '#4ADE80',
      fontSize: 10,
    });
  } else if (key === 'BROTH_KITCHEN') {
    const drewStoveSprite = drawIsoFurnitureSprite(ctx, 'BROTH_KITCHEN', {
      ...topFoot,
      flipX: true,
      isHovered,
    });

    if (!drewStoveSprite) {
      drawBox(ctx, wx, wy, sw, st.h, 23, {
        top: isHovered ? '#DBA572' : '#BC8654',
        left: '#8C5B33',
        right: '#684121',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    // Live warm hearth glow + rising watercolor steam curls above the 3 copper broth cauldrons
    for (let i = 0; i < 3; i++) {
      const bx = wx + 42 + i * ((sw - 84) / 2);
      const bp = w2i(bx, st.y, 26);
      const flameFlicker = 0.72 + Math.sin(timeSec * 9.2 + i * 2.4) * 0.22;
      const stoveGlow = ctx.createRadialGradient(bp.x, bp.y + 4, 2, bp.x, bp.y + 4, 15);
      stoveGlow.addColorStop(0, `rgba(255, 152, 46, ${(0.22 * flameFlicker).toFixed(2)})`);
      stoveGlow.addColorStop(1, 'rgba(255, 152, 46, 0)');
      ctx.fillStyle = stoveGlow;
      ctx.beginPath();
      ctx.ellipse(bp.x, bp.y + 4, 15, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      drawSteamWisps(ctx, bp.x, bp.y - 5, timeSec, 3.3 + i * 2.1, 0.95);
    }

    drawIsoTextTag(ctx, '熬汤锅底灶', topCenter.x, topCenter.y - 8, {
      color: '#FEF3C7',
      bg: 'rgba(54, 24, 14, 0.88)',
      border: '#F59E0B',
      fontSize: 10,
    });
  } else {
    // COLD_PREP: Unified hand-drawn stainless & cedar seafood prep butcher counter sprite
    const drewColdPrepSprite = drawIsoFurnitureSprite(ctx, 'COLD_PREP', {
      ...topFoot,
      flipX: true,
      isHovered,
    });

    if (!drewColdPrepSprite) {
      drawBox(ctx, wx, wy, sw, st.h, 23, {
        top: isHovered ? '#D9ECEE' : '#BCD9DE',
        left: '#7CA3AD',
        right: '#5B808B',
        stroke: isHovered ? '#FDE047' : INK,
        lineWidth: isHovered ? 1.85 : 0.95,
      });
    }

    // Subtle cool mist & ice glints above chilled seafood prep trays
    const coldP = w2i(wx + sw * 0.56, st.y, 24);
    drawSteamWisps(ctx, coldP.x, coldP.y, timeSec * 0.55, 8.1, 0.45, '212, 246, 255');
    const sparkle = Math.max(0, Math.sin(timeSec * 3.4 + 1.1));
    if (sparkle > 0.4) {
      const sp = w2i(wx + sw * 0.52, st.y - 4, 24);
      const sz = (sparkle - 0.35) * 3.2;
      ctx.strokeStyle = `rgba(244, 255, 255, ${(sparkle * 0.92).toFixed(2)})`;
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(sp.x - sz, sp.y);
      ctx.lineTo(sp.x + sz, sp.y);
      ctx.moveTo(sp.x, sp.y - sz);
      ctx.lineTo(sp.x, sp.y + sz);
      ctx.stroke();
    }

    drawIsoTextTag(ctx, `生鲜备菜台 (料${world.rawIngredients})`, topCenter.x, topCenter.y - 8, {
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

  const makeFoot = (fx: number, fy: number, fw: number, fd: number) => ({
    topPt: w2i(fx, fy, 0),
    rightPt: w2i(fx + fw, fy, 0),
    bottomPt: w2i(fx + fw, fy + fd, 0),
    leftPt: w2i(fx, fy + fd, 0),
  });

  if (room.id === 'cold_storage') {
    // Tiered live holding aquarium + unified cold-storage insulated crates & produce cluster
    drawIsoTieredAquarium(ctx, x + 16, wy + 18, 140, 56, timeSec, 2);

    drawQuad(ctx, x + 18, wy + 102, 148, 52, 0.1, 'rgba(18, 12, 8, 0.2)');
    const drewColdCrates = drawIsoFurnitureSprite(ctx, 'BACKSTAGE_COLD_CRATES', {
      ...makeFoot(x + 18, wy + 100, 148, 52),
      flipX: true,
    });
    if (!drewColdCrates) {
      drawBox(ctx, x + 20, wy + 106, 46, 34, 21, {
        top: '#B5D6E3',
        left: '#7DA8BA',
        right: '#5B8497',
      });
      drawBox(ctx, x + 76, wy + 100, 44, 34, 27, {
        top: '#D2E7F0',
        left: '#93BCCB',
        right: '#6E98A8',
      });
      drawBox(ctx, x + 130, wy + 114, 34, 28, 16, {
        top: '#C79B67',
        left: '#9A6F3E',
        right: '#77532B',
      });
    }
  } else if (room.id === 'hot_kitchen') {
    // Backstage Hot Kitchen: unified canonical Stove Range + Cold Prep Butcher Counter sprites
    drawQuad(ctx, x + 18, wy + 22, 174, 54, 0.1, 'rgba(18, 12, 8, 0.2)');
    const drewBackStove = drawIsoFurnitureSprite(ctx, 'BROTH_KITCHEN', {
      ...makeFoot(x + 16, wy + 20, 174, 54),
      flipX: true,
    });
    if (!drewBackStove) {
      drawBox(ctx, x + 16, wy + 20, 174, 52, 24, {
        top: '#C99B68',
        left: '#93643B',
        right: '#6F4826',
      });
    }
    for (let i = 0; i < 2; i++) {
      const wp = w2i(x + 68 + i * 70, wy + 46, 26);
      drawSteamWisps(ctx, wp.x, wp.y - 4, timeSec, 11.4 + i * 3, 0.95);
    }

    drawQuad(ctx, x + 24, wy + 112, 128, 46, 0.1, 'rgba(18, 12, 8, 0.2)');
    const drewBackPrep = drawIsoFurnitureSprite(ctx, 'COLD_PREP', {
      ...makeFoot(x + 22, wy + 110, 128, 46),
      flipX: true,
    });
    if (!drewBackPrep) {
      drawBox(ctx, x + 24, wy + 112, 102, 40, 21, {
        top: '#CFD9DE',
        left: '#97A8B1',
        right: '#73858F',
      });
    }
  } else if (room.id === 'dish_washroom') {
    // Backstage Dish Washroom: unified canonical Sink + Sterilizer Cabinet sprites
    drawQuad(ctx, x + 20, wy + 22, 162, 56, 0.1, 'rgba(18, 12, 8, 0.2)');
    const drewBackSink = drawIsoFurnitureSprite(ctx, 'SINK', {
      ...makeFoot(x + 18, wy + 20, 162, 56),
      flipX: true,
    });
    if (!drewBackSink) {
      drawBox(ctx, x + 18, wy + 22, 174, 52, 26, {
        top: '#A5D6D7',
        left: '#6DA7AC',
        right: '#4E8287',
      });
    }

    drawQuad(ctx, x + 26, wy + 108, 96, 46, 0.1, 'rgba(18, 12, 8, 0.2)');
    const drewBackClean = drawIsoFurnitureSprite(ctx, 'CLEAN_RACK', {
      ...makeFoot(x + 24, wy + 106, 96, 46),
      flipX: true,
    });
    if (!drewBackClean) {
      drawBox(ctx, x + 24, wy + 110, 88, 36, 22, {
        top: '#DCE5E9',
        left: '#9AAAB3',
        right: '#758791',
      });
      drawPorcelainStack(ctx, x + 46, wy + 128, 22.6, 5, 5.2);
      drawPorcelainStack(ctx, x + 78, wy + 128, 22.6, 4, 5.2);
    }
  } else if (room.id === 'office') {
    // Manager Office: unified Mahogany Ledger Bookcase + Executive Desk & Banker's Lamp sprites
    drawQuad(ctx, x + 20, wy + 18, 168, 36, 0.1, 'rgba(18, 12, 8, 0.22)');
    const drewBookcase = drawIsoFurnitureSprite(ctx, 'OFFICE_BOOKCASE', {
      ...makeFoot(x + 18, wy + 16, 168, 36),
      flipX: true,
    });
    if (!drewBookcase) {
      drawBox(ctx, x + 22, wy + 18, 160, 24, 48, {
        top: '#8D5C37',
        left: '#6A4225',
        right: '#4E2F19',
      });
    }

    drawQuad(ctx, x + 44, wy + 96, 124, 62, 0.1, 'rgba(18, 12, 8, 0.22)');
    const drewDesk = drawIsoFurnitureSprite(ctx, 'OFFICE_DESK', {
      ...makeFoot(x + 42, wy + 92, 124, 62),
      flipX: true,
    });
    if (!drewDesk) {
      drawBox(ctx, x + 48, wy + 102, 114, 48, 22, {
        top: '#B57B4A',
        left: '#85532E',
        right: '#623B1E',
      });
      drawCabinetPanels(ctx, x + 48, wy + 102, 114, 48, 1.5, 18, {
        leftFill: '#744726',
        rightFill: '#543219',
        colsX: 2,
        colsY: 1,
        drawHandles: true,
      });
      drawSlattedWoodenChair(ctx, x + 92, wy + 80, 22, 16, 'NORTH');
    }
  } else if (room.id === 'restroom') {
    // Restroom: unified Celadon-Jade 3-Basin Handwashing Vanity + Twin Celadon Toilet Stalls!
    drawQuad(ctx, x + 20, wy + 20, 190, 48, 0.1, 'rgba(18, 12, 8, 0.2)');
    const drewVanity = drawIsoFurnitureSprite(ctx, 'RESTROOM_VANITY', {
      ...makeFoot(x + 18, wy + 18, 190, 48),
      flipX: true,
    });
    if (!drewVanity) {
      drawBox(ctx, x + 18, wy + 20, 184, 40, 23, {
        top: '#E0F3F0',
        left: '#8CC9C2',
        right: '#65A8A0',
      });
    }

    for (const sx of [x + 20, x + 106]) {
      drawQuad(ctx, sx + 2, wy + 124, 72, 72, 0.1, 'rgba(18, 12, 8, 0.22)');
      const drewStall = drawIsoFurnitureSprite(ctx, 'RESTROOM_STALL', {
        ...makeFoot(sx, wy + 122, 72, 72),
        flipX: true,
      });
      if (!drewStall) {
        drawBox(ctx, sx, wy + 122, 72, 74, 34, {
          top: '#82C5BB',
          left: '#5AA298',
          right: '#418178',
        });
      }
    }
  } else if (room.id === 'equipment_room') {
    // Equipment Room: unified Chiller/Ice-Maker Machinery Unit + Copper Oil-Water Separator Tank!
    drawQuad(ctx, x + 20, wy + 24, 174, 62, 0.1, 'rgba(18, 12, 8, 0.22)');
    const drewChiller = drawIsoFurnitureSprite(ctx, 'EQUIP_CHILLER', {
      ...makeFoot(x + 18, wy + 22, 174, 62),
      flipX: true,
    });
    if (!drewChiller) {
      drawBox(ctx, x + 22, wy + 24, 76, 58, 42, {
        top: '#A4B3BF',
        left: '#728494',
        right: '#526373',
      });
      drawBox(ctx, x + 114, wy + 24, 76, 58, 36, {
        top: '#CBD6DE',
        left: '#8DA0AE',
        right: '#657886',
      });
    }
    // Live equipment health status indicator glow overlaid cleanly on chiller front
    const gp = w2i(x + 86, wy + 82, 32);
    ctx.fillStyle = world.equipmentHealth < 55 ? '#EF4444' : '#4ADE80';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(gp.x, gp.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    drawQuad(ctx, x + 26, wy + 126, 134, 52, 0.1, 'rgba(18, 12, 8, 0.22)');
    const drewSeparator = drawIsoFurnitureSprite(ctx, 'EQUIP_SEPARATOR', {
      ...makeFoot(x + 24, wy + 124, 134, 52),
      flipX: true,
    });
    if (!drewSeparator) {
      drawBox(ctx, x + 28, wy + 130, 114, 42, 23, {
        top: '#D48A3B',
        left: '#A86423',
        right: '#7D4717',
      });
    }
  } else if (room.id === 'dormitory') {
    // Staff Dormitory: Twin Unified Cedar Double-Decker Bunk Beds + Cantonese Gongfu Tea Table!
    for (const [bx, qTop, qShade] of [
      [x + 18, '#E3BE74', '#B9924A'],
      [x + 144, '#CFA0A8', '#A3747C'],
    ] as const) {
      drawQuad(ctx, bx + 2, wy + 24, 106, 54, 0.1, 'rgba(18, 12, 8, 0.22)');
      const drewBunk = drawIsoFurnitureSprite(ctx, 'DORM_BUNK_BED', {
        ...makeFoot(bx, wy + 20, 106, 54),
        flipX: true,
      });
      if (!drewBunk) {
        drawBunkBed(ctx, bx, wy + 22, 102, 50, qTop, qShade);
      }
    }

    drawQuad(ctx, x + 78, wy + 128, 104, 58, 0.1, 'rgba(18, 12, 8, 0.18)');
    const drewTeaTable = drawIsoFurnitureSprite(ctx, 'DORM_TEA_TABLE', {
      ...makeFoot(x + 76, wy + 126, 104, 58),
      flipX: true,
    });
    if (!drewTeaTable) {
      drawBox(ctx, x + 84, wy + 132, 86, 50, 13, {
        top: '#BE8954',
        left: '#8C5C33',
        right: '#694321',
      });
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
        facing: isShen ? 'NE' : isSu ? 'SE' : 'SW',
        animState: isShen ? 'COOK_WOK' : isSu ? 'IDLE' : 'PREP_CHOP',
        animTime: timeSec + (isShen ? 0.5 : isSu ? 1.7 : 1.1),
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
