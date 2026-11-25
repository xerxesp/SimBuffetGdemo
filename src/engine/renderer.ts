import {
  BROTH_CATALOG,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FRONT_HALL_ZONES,
  SEAFOOD_CATALOG,
  STAFF_ROLE_META,
  STATIONS,
} from '../data/gameConfig';
import { DINING_HALL_BACKSTAGE_DOOR } from '../data/policyAndTechConfig';
import { getCharacterDef } from '../data/storyConfig';
import {
  BuffetSlot,
  BuffetZoneId,
  CarryItemType,
  DiningTable,
  GameWorld,
  HiredStaff,
  PlayerState,
} from '../types/game';
import { isBuffetZoneUnlocked } from './storyAndFacilities';
import { getNearFailureStatus } from '../data/staffDialogueConfig';
import { getDecorThemeDef } from '../data/tycoonSystemsConfig';
import {
  drawPixelSprite,
  getCarpetTile,
  getCarriedSprite,
  getCrushedIceTile,
  getCustomerSprite,
  getFortuneCatSprite,
  getHotpotSprite,
  getKitchenTile,
  getLanternSprite,
  getManagerSprite,
  getPlateStackSprite,
  getSeafoodSprite,
  getSeatedCustomerSprite,
  getSideDishSprite,
  getStaffSprite,
  getTablePlaceSettingSprite,
  getWoodPlankTile,
} from './pixelSprites';

export interface SceneCamera {
  zoom: number;
  panX: number;
  panY: number;
}

export interface CanvasViewportTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function getCanvasViewportTransform(
  backingWidth: number,
  backingHeight: number,
  camera?: SceneCamera
): CanvasViewportTransform {
  const baseScale = Math.min(backingWidth / CANVAS_WIDTH, backingHeight / CANVAS_HEIGHT);
  const zoom = camera ? Math.max(0.65, Math.min(2.2, camera.zoom)) : 1;
  const scale = baseScale * zoom;
  const panX = camera ? camera.panX : 0;
  const panY = camera ? camera.panY : 0;
  const offsetX = (backingWidth - CANVAS_WIDTH * scale) / 2 - panX * scale;
  const offsetY = (backingHeight - CANVAS_HEIGHT * scale) / 2 - panY * scale;
  return { scale, offsetX, offsetY };
}

interface PatternSet {
  wood: CanvasPattern | null;
  kitchen: CanvasPattern | null;
  carpet: CanvasPattern | null;
  ice: CanvasPattern | null;
}

const patternCache = new WeakMap<CanvasRenderingContext2D, PatternSet>();

function getPatterns(ctx: CanvasRenderingContext2D): PatternSet {
  const cached = patternCache.get(ctx);
  if (cached) return cached;
  const set: PatternSet = {
    wood: ctx.createPattern(getWoodPlankTile(), 'repeat'),
    kitchen: ctx.createPattern(getKitchenTile(), 'repeat'),
    carpet: ctx.createPattern(getCarpetTile(), 'repeat'),
    ice: ctx.createPattern(getCrushedIceTile(), 'repeat'),
  };
  patternCache.set(ctx, set);
  return set;
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Draw a crisp HD-2D pixel-beveled block with dark pixel outline,
 * top/left specular edge, bottom depth lip, and optional hover brackets.
 */
function drawPixelBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: {
    fill: string;
    topHighlight?: string;
    bottomLip?: string;
    border?: string;
    lipHeight?: number;
    shadowOffset?: number;
  }
) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  const border = opts.border ?? '#181117';
  const lip = opts.lipHeight ?? 4;

  if (opts.shadowOffset && opts.shadowOffset > 0) {
    ctx.fillStyle = 'rgba(8, 5, 10, 0.45)';
    ctx.fillRect(rx + 2, ry + opts.shadowOffset, rw, rh);
  }

  // Outer dark pixel outline
  ctx.fillStyle = border;
  ctx.fillRect(rx, ry, rw, rh);

  // Main surface fill
  ctx.fillStyle = opts.fill;
  ctx.fillRect(rx + 2, ry + 2, rw - 4, rh - 4);

  // Top specular bevel
  if (opts.topHighlight) {
    ctx.fillStyle = opts.topHighlight;
    ctx.fillRect(rx + 2, ry + 2, rw - 4, 2);
    ctx.fillRect(rx + 2, ry + 2, 2, Math.max(2, rh - lip - 4));
  }

  // Front depth skirt / lip
  if (opts.bottomLip && lip > 0 && rh > lip + 6) {
    ctx.fillStyle = opts.bottomLip;
    ctx.fillRect(rx + 2, ry + rh - 2 - lip, rw - 4, lip);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(rx + 2, ry + rh - 2 - lip, rw - 4, 1);
  }
}

function drawHoverBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  timeSec: number,
  color = '#FDE047'
) {
  const pulse = 0.72 + Math.sin(timeSec * 7) * 0.25;
  const rx = Math.round(x) - 2;
  const ry = Math.round(y) - 2;
  const rw = Math.round(w) + 4;
  const rh = Math.round(h) + 4;
  const b = 10;

  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = color;
  // Top-left
  ctx.fillRect(rx, ry, b, 2);
  ctx.fillRect(rx, ry, 2, b);
  // Top-right
  ctx.fillRect(rx + rw - b, ry, b, 2);
  ctx.fillRect(rx + rw - 2, ry, 2, b);
  // Bottom-left
  ctx.fillRect(rx, ry + rh - 2, b, 2);
  ctx.fillRect(rx, ry + rh - b, 2, b);
  // Bottom-right
  ctx.fillRect(rx + rw - b, ry + rh - 2, b, 2);
  ctx.fillRect(rx + rw - 2, ry + rh - b, 2, b);
  ctx.restore();
}

function drawPixelLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts?: {
    color?: string;
    bg?: string;
    border?: string;
    fontSize?: number;
    align?: CanvasTextAlign;
  }
) {
  const fontSize = opts?.fontSize ?? 11;
  ctx.save();
  ctx.font = `700 ${fontSize}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = opts?.align ?? 'center';
  ctx.textBaseline = 'middle';

  if (opts?.bg) {
    const tw = Math.ceil(ctx.measureText(text).width) + 10;
    const th = fontSize + 6;
    const bx = Math.round(x - tw / 2);
    const by = Math.round(y - th / 2);
    ctx.fillStyle = opts.border ?? '#181117';
    ctx.fillRect(bx - 1, by - 1, tw + 2, th + 2);
    ctx.fillStyle = opts.bg;
    ctx.fillRect(bx, by, tw, th);
  } else {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(14, 10, 14, 0.9)';
    ctx.strokeText(text, Math.round(x), Math.round(y));
  }

  ctx.fillStyle = opts?.color ?? '#FFF7E8';
  ctx.fillText(text, Math.round(x), Math.round(y));
  ctx.restore();
}

function drawPixelBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  ratio: number,
  fillColor: string,
  bgColor = '#1E1822'
) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  const clamped = Math.max(0, Math.min(1, ratio));

  ctx.fillStyle = '#120D14';
  ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
  ctx.fillStyle = bgColor;
  ctx.fillRect(rx, ry, rw, rh);
  if (clamped > 0) {
    const fw = Math.max(2, Math.round(rw * clamped));
    ctx.fillStyle = fillColor;
    ctx.fillRect(rx, ry, fw, rh);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(rx, ry, fw, Math.max(1, Math.floor(rh * 0.35)));
  }
}

function drawRadialGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  innerColor: string,
  midColor: string
) {
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, innerColor);
  g.addColorStop(0.5, midColor);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.imageSmoothingEnabled = prevSmooth;
}

function drawCarriedItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  carrying: CarryItemType,
  amount: number,
  brothId: string | null
) {
  if (carrying === 'NONE') return;
  const broth = BROTH_CATALOG.find((b) => b.id === brothId) || BROTH_CATALOG[0];
  const sprite = getCarriedSprite(carrying, broth.color, broth.secondaryColor);
  if (!sprite) return;

  const scale = carrying === 'BROTH_POT' ? 1.25 : 1.75;
  drawPixelSprite(ctx, sprite, x, y, scale, 0.5, 0.5);

  if ((carrying === 'CLEAN_TABLEWARE' || carrying === 'DIRTY_DISHES') && amount > 1) {
    drawPixelLabel(ctx, `×${amount}`, x + 13, y - 5, {
      fontSize: 10,
      color: carrying === 'CLEAN_TABLEWARE' ? '#4ADE80' : '#FBBF24',
    });
  }
}

// ==========================================
// WIDESCREEN SEAMLESS HD-2D ARCHITECTURAL HALL
// ==========================================

function drawWidescreenBackdrop(
  ctx: CanvasRenderingContext2D,
  backingWidth: number,
  backingHeight: number,
  vt: CanvasViewportTransform,
  world: GameWorld,
  timeSec: number
) {
  const patterns = getPatterns(ctx);
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const kitchenBottomPx = vt.offsetY + 124 * vt.scale;
  const playLeft = vt.offsetX;
  const playRight = vt.offsetX + CANVAS_WIDTH * vt.scale;

  // Seamless dark wood plank dining floor across full widescreen canvas
  ctx.save();
  ctx.translate(vt.offsetX, vt.offsetY);
  ctx.scale(vt.scale, vt.scale);
  if (patterns.wood) {
    ctx.fillStyle = patterns.wood;
    ctx.fillRect(
      -vt.offsetX / vt.scale - 64,
      -vt.offsetY / vt.scale - 64,
      backingWidth / vt.scale + 128,
      backingHeight / vt.scale + 128
    );
  } else {
    ctx.fillStyle = '#3B251A';
    ctx.fillRect(
      -vt.offsetX / vt.scale,
      -vt.offsetY / vt.scale,
      backingWidth / vt.scale,
      backingHeight / vt.scale
    );
  }

  // Extended kitchen tiled upper strip across widescreen wings
  if (patterns.kitchen) {
    ctx.fillStyle = patterns.kitchen;
    ctx.fillRect(
      -vt.offsetX / vt.scale - 64,
      -vt.offsetY / vt.scale - 64,
      backingWidth / vt.scale + 128,
      124 + vt.offsetY / vt.scale + 64
    );
  }
  // Subtle dark timber separator beam extending across full width
  ctx.fillStyle = '#1B110E';
  ctx.fillRect(-vt.offsetX / vt.scale - 64, 120, backingWidth / vt.scale + 128, 6);
  ctx.fillStyle = '#6B4226';
  ctx.fillRect(-vt.offsetX / vt.scale - 64, 121, backingWidth / vt.scale + 128, 3);
  ctx.restore();

  // Dimmed outer wings framing the active 960x640 dining hall with harbor architecture
  const playTop = vt.offsetY;
  const playBottom = vt.offsetY + CANVAS_HEIGHT * vt.scale;
  const leftW = Math.max(0, playLeft);
  const rightW = Math.max(0, backingWidth - playRight);
  const topH = Math.max(0, playTop);
  const bottomH = Math.max(0, backingHeight - playBottom);
  const wingDim =
    world.phase === 'CLOSING' ? 'rgba(10, 12, 22, 0.56)' : 'rgba(18, 12, 10, 0.42)';

  if (topH > 2) {
    ctx.fillStyle = wingDim;
    ctx.fillRect(Math.max(0, playLeft), 0, Math.min(backingWidth, playRight) - Math.max(0, playLeft), topH);
  }
  if (bottomH > 2) {
    ctx.fillStyle = wingDim;
    ctx.fillRect(Math.max(0, playLeft), playBottom, Math.min(backingWidth, playRight) - Math.max(0, playLeft), bottomH);
  }

  if (leftW > 2) {
    ctx.fillStyle = wingDim;
    ctx.fillRect(0, 0, leftW, backingHeight);

    // Timber pillar border on left playfield boundary
    const pillarW = Math.max(6, Math.round(10 * vt.scale));
    ctx.fillStyle = '#1A100D';
    ctx.fillRect(playLeft - pillarW, 0, pillarW, backingHeight);
    ctx.fillStyle = '#5B3724';
    ctx.fillRect(playLeft - pillarW + 2, 0, Math.max(2, pillarW - 4), backingHeight);
    // Gold brass studs along timber pillar
    ctx.fillStyle = '#D9A74A';
    for (let py = 40 * vt.scale; py < backingHeight; py += 96 * vt.scale) {
      ctx.fillRect(
        playLeft - pillarW + Math.floor(pillarW * 0.35),
        Math.round(py),
        Math.max(2, Math.round(3 * vt.scale)),
        Math.max(2, Math.round(3 * vt.scale))
      );
    }
  }

  if (rightW > 2) {
    ctx.fillStyle = wingDim;
    ctx.fillRect(playRight, 0, rightW, backingHeight);

    const pillarW = Math.max(6, Math.round(10 * vt.scale));
    ctx.fillStyle = '#1A100D';
    ctx.fillRect(playRight, 0, pillarW, backingHeight);
    ctx.fillStyle = '#5B3724';
    ctx.fillRect(playRight + 2, 0, Math.max(2, pillarW - 4), backingHeight);
    ctx.fillStyle = '#D9A74A';
    for (let py = 40 * vt.scale; py < backingHeight; py += 96 * vt.scale) {
      ctx.fillRect(
        playRight + Math.floor(pillarW * 0.35),
        Math.round(py),
        Math.max(2, Math.round(3 * vt.scale)),
        Math.max(2, Math.round(3 * vt.scale))
      );
    }
  }

  // Hanging pixel red lanterns in widescreen wings with soft warm light halos
  const lanternSprite = getLanternSprite(Math.sin(timeSec * 3.5) > -0.6);
  const drawWingLantern = (lx: number, ly: number) => {
    const sway = Math.sin(timeSec * 1.8 + lx * 0.01) * 2.5 * vt.scale;
    const x = lx + sway;
    const glowR = 54 * vt.scale;
    drawRadialGlow(
      ctx,
      x,
      ly + 6 * vt.scale,
      glowR,
      'rgba(255, 138, 52, 0.34)',
      'rgba(232, 74, 34, 0.12)'
    );
    drawPixelSprite(ctx, lanternSprite, x, ly, Math.max(1.5, 2.2 * vt.scale), 0.5, 0.5);
  };

  if (leftW > 46 * vt.scale) {
    drawWingLantern(leftW * 0.5, kitchenBottomPx + 82 * vt.scale);
    drawWingLantern(leftW * 0.5, kitchenBottomPx + 310 * vt.scale);
  }
  if (rightW > 46 * vt.scale) {
    drawWingLantern(playRight + rightW * 0.5, kitchenBottomPx + 82 * vt.scale);
    drawWingLantern(playRight + rightW * 0.5, kitchenBottomPx + 310 * vt.scale);
  }

  ctx.restore();
}

// ==========================================
// FLOOR, CARPET, ARCHITECTURE & LANTERNS
// ==========================================

function drawFloorAndZones(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  timeSec: number
) {
  const patterns = getPatterns(ctx);
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const decor = getDecorThemeDef(world.activeDecorThemeId);

  // 1. Dining hall wood plank floor + decor theme tint
  ctx.fillStyle = patterns.wood ?? '#3E261B';
  ctx.fillRect(0, 124, CANVAS_WIDTH, CANVAS_HEIGHT - 124);
  if (decor.floorTint && decor.floorTint !== 'rgba(0,0,0,0)') {
    ctx.fillStyle = decor.floorTint;
    ctx.fillRect(0, 124, CANVAS_WIDTH, CANVAS_HEIGHT - 124);
  }

  // Subtle floor board perspective shadow right under kitchen counter beam
  ctx.fillStyle = 'rgba(12, 7, 5, 0.42)';
  ctx.fillRect(0, 126, CANVAS_WIDTH, 10);

  // 2. Top Kitchen ceramic tile zone (y = 0..124)
  ctx.fillStyle = patterns.kitchen ?? '#C7D6E4';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 124);

  // Kitchen dark timber top header wall molding
  ctx.fillStyle = '#1B110E';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 14);
  ctx.fillStyle = decor.beamFill;
  ctx.fillRect(0, 2, CANVAS_WIDTH, 8);
  ctx.fillStyle = decor.carpetTrim;
  ctx.fillRect(0, 2, CANVAS_WIDTH, 2);

  // Kitchen-to-Dining divider beam (themed timber + trim)
  ctx.fillStyle = '#19100E';
  ctx.fillRect(0, 118, CANVAS_WIDTH, 8);
  ctx.fillStyle = decor.beamFill;
  ctx.fillRect(0, 120, CANVAS_WIDTH, 4);
  ctx.fillStyle = decor.carpetTrim;
  ctx.fillRect(0, 120, CANVAS_WIDTH, 1);

  // 3. Left Reception Carpet Runner (x: 16..158, y: 158..620)
  const cx = 16;
  const cy = 158;
  const cw = 142;
  const ch = 462;
  // Dark outer rug fringe border
  ctx.fillStyle = '#140A0B';
  ctx.fillRect(cx - 2, cy - 2, cw + 4, ch + 4);
  // Embroidered border trim
  ctx.fillStyle = decor.carpetTrim;
  ctx.fillRect(cx, cy, cw, ch);
  ctx.fillStyle = decor.carpetFill;
  ctx.fillRect(cx + 3, cy + 3, cw - 6, ch - 6);
  // Subtle woven pattern overlay for classic warm theme, solid plush tint for custom themes
  if (world.activeDecorThemeId === 'harbor_warm' && patterns.carpet) {
    ctx.fillStyle = patterns.carpet;
    ctx.fillRect(cx + 5, cy + 5, cw - 10, ch - 10);
  }
  // Inner thin embroidered corner thread
  ctx.strokeStyle = decor.carpetTrim;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx + 9.5, cy + 9.5, cw - 19, ch - 19);
  ctx.globalAlpha = 1;

  // Pixel wooden entrance threshold mat at bottom of carpet
  drawPixelBlock(ctx, 24, 592, 126, 28, {
    fill: '#382117',
    topHighlight: '#5A3625',
    bottomLip: '#21130D',
    lipHeight: 4,
  });
  const entranceText =
    world.phase === 'PREP'
      ? '筹备中 · 待挂牌'
      : world.phase === 'CLOSING'
        ? '已打烊 · 闭店收尾'
        : '入口 · 候客区';
  drawPixelLabel(ctx, entranceText, 87, 605, {
    fontSize: 10,
    color:
      world.phase === 'PREP'
        ? '#FDE047'
        : world.phase === 'CLOSING'
          ? '#94A3B8'
          : '#FFE7B3',
  });

  // 4. Hanging Red Paper Lanterns along kitchen divider beam
  const lanternXs = [176, 392, 668, 922];
  const lanternSprite = getLanternSprite(Math.sin(timeSec * 4) > -0.7);
  for (let i = 0; i < lanternXs.length; i++) {
    const lx = lanternXs[i];
    const sway = Math.round(Math.sin(timeSec * 2 + i * 1.4) * 1.5);
    drawPixelSprite(ctx, lanternSprite, lx + sway, 124, 2, 0.5, 0.3);
  }

  ctx.restore();
}

// ==========================================
// TOP KITCHEN STATIONS (HD-2D PIXEL WORKBENCH)
// ==========================================

function drawTopStations(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  timeSec: number,
  hoverPos: { x: number; y: number } | null
) {
  const isHovered = (st: { x: number; y: number; w: number; h: number }) =>
    hoverPos !== null &&
    hoverPos.x >= st.x - st.w / 2 &&
    hoverPos.x <= st.x + st.w / 2 &&
    hoverPos.y >= st.y - st.h / 2 &&
    hoverPos.y <= st.y + st.h / 2;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // --- 1. DISHWASHING SINK ---
  const sink = STATIONS.SINK;
  const sx = sink.x - sink.w / 2;
  const sy = sink.y - sink.h / 2;
  drawPixelBlock(ctx, sx, sy, sink.w, sink.h, {
    fill: '#5D7084',
    topHighlight: '#9AB0C4',
    bottomLip: '#394756',
    lipHeight: 6,
    shadowOffset: 4,
  });

  // Stainless steel recessed water basin
  drawPixelBlock(ctx, sx + 10, sy + 10, sink.w - 20, 44, {
    fill: '#2C6E91',
    topHighlight: '#509EC2',
    bottomLip: '#1E4F6B',
    border: '#253240',
    lipHeight: 3,
  });
  // Animated pixel water shimmer bars
  const shimmerOffset = Math.floor(timeSec * 6) % 8;
  ctx.fillStyle = '#90E0EF';
  ctx.fillRect(sx + 18 + shimmerOffset, sy + 18, 16, 2);
  ctx.fillRect(sx + 56 - shimmerOffset, sy + 30, 14, 2);
  ctx.fillRect(sx + 108 + shimmerOffset, sy + 22, 18, 2);

  // Pixel chrome faucet on top edge
  drawPixelBlock(ctx, sink.x - 10, sy + 4, 20, 12, {
    fill: '#CBD5E1',
    topHighlight: '#F8FAFC',
    bottomLip: '#64748B',
    lipHeight: 2,
  });

  // Stacked dirty plates inside sink + soap bubbles
  const dirtyCount = Math.min(world.dirtyDishes, 6);
  const dirtySprite = getPlateStackSprite(true);
  for (let i = 0; i < dirtyCount; i++) {
    const px = sx + 28 + (i % 3) * 34;
    const py = sy + 34 - Math.floor(i / 3) * 8;
    drawPixelSprite(ctx, dirtySprite, px, py, 1.8, 0.5, 0.5);
  }
  if (world.dirtyDishes > 0) {
    // Rising pixel soap bubbles
    const bStep = Math.floor(timeSec * 4) % 4;
    ctx.fillStyle = '#E0F7FF';
    ctx.fillRect(sx + 44, sy + 22 - bStep * 2, 4, 4);
    ctx.fillRect(sx + 124, sy + 28 - ((bStep + 2) % 4) * 2, 4, 4);
  }

  // Station badge + counter
  drawPixelLabel(ctx, `洗碗池  脏盘:${world.dirtyDishes}`, sink.x, sy + sink.h - 14, {
    fontSize: 11,
    color: world.dirtyDishes >= 5 ? '#FCA5A5' : '#E2F1FF',
  });
  if (isHovered(sink)) drawHoverBrackets(ctx, sx, sy, sink.w, sink.h, timeSec);

  // --- 2. CLEAN TABLEWARE DISINFECTION CABINET ---
  const rack = STATIONS.CLEAN_RACK;
  const rx = rack.x - rack.w / 2;
  const ry = rack.y - rack.h / 2;
  drawPixelBlock(ctx, rx, ry, rack.w, rack.h, {
    fill: '#4C646B',
    topHighlight: '#83A8B2',
    bottomLip: '#2F4046',
    lipHeight: 6,
    shadowOffset: 4,
  });
  // UV-sanitized glass cabinet interior
  drawPixelBlock(ctx, rx + 10, ry + 10, rack.w - 20, 44, {
    fill: '#1E3C45',
    topHighlight: '#366E7C',
    bottomLip: '#152A30',
    border: '#19292E',
    lipHeight: 3,
  });
  // Subtle UV-cyan light tube at top of rack
  ctx.fillStyle = '#67E8F9';
  ctx.fillRect(rx + 18, ry + 13, rack.w - 36, 2);

  const cleanSprite = getPlateStackSprite(false);
  const shownClean = Math.min(world.cleanDishes, 6);
  for (let i = 0; i < shownClean; i++) {
    const px = rx + 28 + (i % 3) * 32;
    const py = ry + 36 - Math.floor(i / 3) * 9;
    drawPixelSprite(ctx, cleanSprite, px, py, 1.8, 0.5, 0.5);
  }
  drawPixelLabel(
    ctx,
    `消毒柜  净盘:${world.cleanDishes}/${world.dishwareMax}`,
    rack.x,
    ry + rack.h - 14,
    {
      fontSize: 11,
      color: world.cleanDishes === 0 ? '#FCA5A5' : '#A7F3D0',
    }
  );
  if (isHovered(rack)) drawHoverBrackets(ctx, rx, ry, rack.w, rack.h, timeSec);

  // --- 3. BROTH KITCHEN RANGE (SIMMERING CAULDRONS) ---
  const bk = STATIONS.BROTH_KITCHEN;
  const bx = bk.x - bk.w / 2;
  const by = bk.y - bk.h / 2;
  drawPixelBlock(ctx, bx, by, bk.w, bk.h, {
    fill: '#4B2A26',
    topHighlight: '#7A4942',
    bottomLip: '#2C1715',
    lipHeight: 6,
    shadowOffset: 4,
  });
  // Dark cast-iron hearth stove deck
  drawPixelBlock(ctx, bx + 8, by + 10, bk.w - 16, 48, {
    fill: '#23191B',
    topHighlight: '#3B2B2E',
    bottomLip: '#140E10',
    border: '#140D0E',
    lipHeight: 3,
  });

  const unlockedBroths = BROTH_CATALOG.filter((b) => world.unlockedBrothIds.includes(b.id));
  const spacing = (bk.w - 36) / Math.max(unlockedBroths.length, 1);
  const boilFrame = Math.floor(timeSec * 4) % 2;

  unlockedBroths.forEach((broth, idx) => {
    const px = bx + 18 + spacing * idx + spacing / 2;
    const py = by + 34;

    // Flickering pixel stove fire embers peeking under pot
    const flicker = Math.floor(timeSec * 9 + idx) % 2 === 0;
    ctx.fillStyle = flicker ? '#F97316' : '#EF4444';
    ctx.fillRect(Math.round(px - 16), Math.round(py + 10), 6, 4);
    ctx.fillRect(Math.round(px + 10), Math.round(py + 10), 6, 4);
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(Math.round(px - 4), Math.round(py + 12), 8, 3);

    const potSprite = getHotpotSprite(broth.color, broth.secondaryColor, boilFrame + idx);
    drawPixelSprite(ctx, potSprite, px, py, 2.0, 0.5, 0.5);
  });

  drawPixelLabel(
    ctx,
    `熬汤锅底灶 (${unlockedBroths.length}款沸锅)`,
    bk.x,
    by + bk.h - 14,
    {
      fontSize: 11,
      color: '#FDE68A',
    }
  );
  if (isHovered(bk)) drawHoverBrackets(ctx, bx, by, bk.w, bk.h, timeSec);

  // --- 4. COLD SEAFOOD PREP COUNTER ---
  const cp = STATIONS.COLD_PREP;
  const cx = cp.x - cp.w / 2;
  const cy = cp.y - cp.h / 2;
  drawPixelBlock(ctx, cx, cy, cp.w, cp.h, {
    fill: '#395A72',
    topHighlight: '#6DA2C4',
    bottomLip: '#213747',
    lipHeight: 6,
    shadowOffset: 4,
  });

  // Icy chilled prep deck
  const patterns = getPatterns(ctx);
  ctx.fillStyle = '#182A38';
  ctx.fillRect(cx + 8, cy + 10, cp.w - 16, 46);
  ctx.fillStyle = patterns.ice ?? '#8BE4FA';
  ctx.fillRect(cx + 10, cy + 12, cp.w - 20, 42);

  // Display up to 4 iconic unlocked pixel seafood items on prep ice
  const unlockedItems = SEAFOOD_CATALOG.filter((s) => world.unlockedSeafoodIds.includes(s.id));
  const showcase = unlockedItems.slice(-4);
  const gap = (cp.w - 30) / Math.max(showcase.length, 1);
  showcase.forEach((item, idx) => {
    const ix = cx + 15 + gap * idx + gap / 2;
    const iy = cy + 33;
    // Pixel stainless tray rim
    ctx.fillStyle = '#334155';
    ctx.fillRect(Math.round(ix - 19), Math.round(iy - 14), 38, 28);
    ctx.fillStyle = '#DFF8FF';
    ctx.fillRect(Math.round(ix - 17), Math.round(iy - 12), 34, 24);
    drawPixelSprite(ctx, getSeafoodSprite(item.id), ix, iy, 2.0, 0.5, 0.5);
  });

  drawPixelLabel(ctx, '生鲜备菜台 · 点此取菜补货', cp.x, cy + cp.h - 14, {
    fontSize: 11,
    color: '#CFFAFE',
  });
  if (isHovered(cp)) drawHoverBrackets(ctx, cx, cy, cp.w, cp.h, timeSec);

  ctx.restore();
}

// ==========================================
// RECEPTION COUNTER & QUEUING CHIBI GUESTS
// ==========================================

function drawReceptionAndQueue(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  timeSec: number,
  hoverPos: { x: number; y: number } | null
) {
  const rec = STATIONS.RECEPTION;
  const rx = rec.x - rec.w / 2;
  const ry = rec.y - rec.h / 2;
  const hovered =
    hoverPos !== null &&
    hoverPos.x >= rx &&
    hoverPos.x <= rx + rec.w &&
    hoverPos.y >= ry &&
    hoverPos.y <= ry + rec.h;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Carved dark-mahogany pixel reception desk with brass trim
  drawPixelBlock(ctx, rx, ry, rec.w, rec.h, {
    fill: '#5A3222',
    topHighlight: '#8A5138',
    bottomLip: '#311A11',
    lipHeight: 10,
    shadowOffset: 5,
  });

  // Brass top trim strip
  ctx.fillStyle = '#D9A74A';
  ctx.fillRect(rx + 6, ry + 6, rec.w - 12, 2);

  // Open guest ledger book (pixel book)
  ctx.fillStyle = '#1C1310';
  ctx.fillRect(rx + 14, ry + 18, 38, 26);
  ctx.fillStyle = '#FDF6E3';
  ctx.fillRect(rx + 16, ry + 20, 16, 22);
  ctx.fillRect(rx + 34, ry + 20, 16, 22);
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(rx + 19, ry + 25, 10, 2);
  ctx.fillRect(rx + 19, ry + 30, 10, 2);
  ctx.fillRect(rx + 37, ry + 25, 10, 2);
  ctx.fillRect(rx + 37, ry + 30, 8, 2);

  // Lucky waving pixel Fortune Cat (招财猫) on desk!
  drawPixelSprite(ctx, getFortuneCatSprite(), rx + rec.w - 28, ry + 29, 2.2, 0.5, 0.5);

  // Waiting badge
  const qCount = world.queue.length;
  drawPixelLabel(
    ctx,
    qCount > 0 ? `迎宾台 · 候位 ${qCount}` : '迎宾接待台',
    rec.x,
    ry + rec.h - 14,
    {
      fontSize: 11,
      color: qCount > 0 ? '#FDE047' : '#F3DFC1',
    }
  );

  // Hanging red lantern beside reception desk
  const lantern = getLanternSprite(true);
  drawPixelSprite(ctx, lantern, rx + 8, ry + 8, 1.5, 0.5, 0.5);
  drawPixelSprite(ctx, lantern, rx + rec.w - 8, ry + 8, 1.5, 0.5, 0.5);

  if (hovered) drawHoverBrackets(ctx, rx, ry, rec.w, rec.h, timeSec);

  // Draw Queuing Customers as animated chibi pixel sprites!
  for (let i = 0; i < world.queue.length; i++) {
    const qc = world.queue[i];
    const party = qc.party;
    const isSpecial = Boolean(party.specialStoryId);
    const isSuper = Boolean(party.isSuperCustomer);
    const seed = hashString(qc.id);
    const frame = Math.floor(timeSec * 2.5 + i) % 2;

    // Ground pixel oval shadow
    ctx.fillStyle = 'rgba(10, 6, 8, 0.48)';
    ctx.fillRect(Math.round(qc.x - 14), Math.round(qc.y + 12), 28, 6);

    // Special / VIP / Super golden pixel aura pad on carpet
    if (isSpecial || isSuper || party.isVip) {
      ctx.fillStyle = isSuper
        ? 'rgba(244, 114, 182, 0.35)'
        : isSpecial
          ? 'rgba(56, 189, 248, 0.35)'
          : 'rgba(245, 196, 67, 0.32)';
      ctx.fillRect(Math.round(qc.x - 18), Math.round(qc.y + 10), 36, 9);
    }

    // Companion chibi sprite offset slightly behind lead guest if party.size > 1
    if (party.size >= 2) {
      const compSprite = getCustomerSprite(
        party.color,
        seed + 2,
        false,
        false,
        false,
        (frame + 1) % 2
      );
      drawPixelSprite(ctx, compSprite, qc.x + 14, qc.y - 2, 1.85, 0.5, 0.55);
    }
    if (party.size >= 3) {
      const compSprite2 = getCustomerSprite(
        party.color,
        seed + 4,
        false,
        false,
        false,
        frame
      );
      drawPixelSprite(ctx, compSprite2, qc.x - 14, qc.y - 2, 1.85, 0.5, 0.55);
    }

    // Lead guest chibi pixel sprite
    const leadSprite = getCustomerSprite(
      party.color,
      seed,
      party.isVip,
      isSpecial,
      isSuper,
      frame
    );
    drawPixelSprite(ctx, leadSprite, qc.x, qc.y, 2.1, 0.5, 0.55);

    // Tag badge above VIP / Special / Super guest
    if (isSpecial || isSuper || party.isVip) {
      const tag = party.specialTag || (isSuper ? '超级贵宾' : 'VIP');
      drawPixelLabel(ctx, tag, qc.x, qc.y - 25, {
        fontSize: 9,
        color: '#FFFDF5',
        bg: isSuper ? '#BE185D' : isSpecial ? '#0369A1' : '#B45309',
        border: '#1A1118',
      });
    }

    // Crisp pixel patience bar beneath guest
    const pRatio = party.patience / Math.max(1, party.maxPatience);
    const barColor =
      pRatio > 0.55 ? '#22C55E' : pRatio > 0.28 ? '#F59E0B' : '#EF4444';
    drawPixelBar(ctx, qc.x - 20, qc.y + 18, 40, 5, pRatio, barColor);
  }

  ctx.restore();
}

// ==========================================
// 6 FRONT-HALL THEMED BUFFET ZONES
// (3 Core Main-Line Zones + 3 Expandable Upper Showcase Zones)
// ==========================================

function drawBuffetBar(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  timeSec: number,
  hoverPos: { x: number; y: number } | null
) {
  const patterns = getPatterns(ctx);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const isZoneHovered = (z: { x: number; y: number; w: number; h: number }) =>
    hoverPos !== null &&
    hoverPos.x >= z.x &&
    hoverPos.x <= z.x + z.w &&
    hoverPos.y >= z.y &&
    hoverPos.y <= z.y + z.h;

  const slotsByZone = (zoneId: BuffetZoneId) =>
    world.buffetSlots.filter((s) => {
      const d = SEAFOOD_CATALOG.find((item) => item.id === s.itemId);
      return (d?.zone ?? 'ice_seafood') === zoneId;
    });

  // =========================================================
  // A. UPPER FRONT SHOWCASE ROW (Expanded Specialty Zones!)
  // =========================================================

  // 1) 活捞海鲜区 (Live Seafood Aquariums) — appears only after tech-tree unlock!
  if (isBuffetZoneUnlocked(world, 'live_seafood')) {
    const z = FRONT_HALL_ZONES.live_seafood;
    const zSlots = slotsByZone('live_seafood');
    drawPixelBlock(ctx, z.x, z.y, z.w, z.h, {
      fill: '#184A5A',
      topHighlight: '#5EEAD4',
      bottomLip: '#0F2D38',
      border: '#0B1D24',
      lipHeight: 6,
      shadowOffset: 3,
    });
    // Illuminated seawater glass aquarium interior
    ctx.fillStyle = '#0F6B78';
    ctx.fillRect(z.x + 6, z.y + 6, z.w - 12, z.h - 15);
    ctx.fillStyle = '#22A8B8';
    ctx.fillRect(z.x + 8, z.y + 8, z.w - 16, 4);
    // Animated oxygen bubbles & live lobster/abalone silhouettes
    const bTick = Math.floor(timeSec * 5) % 6;
    ctx.fillStyle = '#CCFBF1';
    for (let i = 0; i < 6; i++) {
      const bx = z.x + 22 + i * 38;
      const by = z.y + z.h - 14 - ((bTick + i * 2) % 6) * 4;
      ctx.fillRect(bx, by, 2, 2);
    }
    if (zSlots.length === 0) {
      // Showcase live lobsters & abalones swimming in the aquarium even before equipping dish cards
      drawPixelSprite(ctx, getSeafoodSprite('lobster'), z.x + 56, z.y + 27, 1.6, 0.5, 0.5);
      drawPixelSprite(ctx, getSeafoodSprite('abalone_live'), z.x + 124, z.y + 28, 1.6, 0.5, 0.5);
      drawPixelSprite(ctx, getSeafoodSprite('king_crab'), z.x + 188, z.y + 27, 1.6, 0.5, 0.5);
    } else {
      const slotW = Math.min(82, Math.floor((z.w - 22) / zSlots.length) - 4);
      for (const slot of zSlots) {
        drawBuffetSlot(ctx, world, slot, slotW, 38, timeSec, hoverPos);
      }
    }
    drawPixelLabel(ctx, '活捞海鲜区 · 海鲜缸', z.x + z.w / 2, z.y + 1, {
      fontSize: 9,
      color: '#CCFBF1',
      bg: 'rgba(13, 62, 72, 0.94)',
      border: '#2DD4BF',
    });
    if (isZoneHovered(z)) drawHoverBrackets(ctx, z.x, z.y, z.w, z.h, timeSec, '#5EEAD4');
  }

  // 2) 刺身与日料区 (Hinoki Sashimi & Sushi Bar) — appears only after tech-tree unlock!
  if (isBuffetZoneUnlocked(world, 'sashimi_sushi')) {
    const z = FRONT_HALL_ZONES.sashimi_sushi;
    const zSlots = slotsByZone('sashimi_sushi');
    drawPixelBlock(ctx, z.x, z.y, z.w, z.h, {
      fill: '#7A5438',
      topHighlight: '#E6BC8A',
      bottomLip: '#422B1B',
      border: '#20130C',
      lipHeight: 6,
      shadowOffset: 3,
    });
    // Chilled dark slate sushi counter deck + rose accent light
    ctx.fillStyle = '#1E2530';
    ctx.fillRect(z.x + 8, z.y + 7, z.w - 16, z.h - 16);
    ctx.fillStyle = '#FB7185';
    ctx.fillRect(z.x + 6, z.y + z.h - 7, z.w - 12, 2);

    if (zSlots.length === 0) {
      drawPixelSprite(ctx, getSeafoodSprite('salmon'), z.x + 56, z.y + 27, 1.6, 0.5, 0.5);
      drawPixelSprite(ctx, getSeafoodSprite('sweet_shrimp_sushi'), z.x + 124, z.y + 27, 1.6, 0.5, 0.5);
      drawPixelSprite(ctx, getSeafoodSprite('bluefin_toro'), z.x + 190, z.y + 27, 1.6, 0.5, 0.5);
    } else {
      const slotW = Math.min(82, Math.floor((z.w - 22) / zSlots.length) - 4);
      for (const slot of zSlots) {
        drawBuffetSlot(ctx, world, slot, slotW, 38, timeSec, hoverPos);
      }
    }
    drawPixelLabel(ctx, '刺身与日料区', z.x + z.w / 2, z.y + 1, {
      fontSize: 9,
      color: '#FFE4E6',
      bg: 'rgba(110, 26, 48, 0.94)',
      border: '#FB7185',
    });
    if (isZoneHovered(z)) drawHoverBrackets(ctx, z.x, z.y, z.w, z.h, timeSec, '#FDA4AF');
  }

  // 3) 酒水饮料 / 甜品水果区 (Beverage, Dessert & Fruit Bar) — appears only after tech-tree unlock!
  if (isBuffetZoneUnlocked(world, 'drinks_dessert')) {
    const z = FRONT_HALL_ZONES.drinks_dessert;
    const zSlots = slotsByZone('drinks_dessert');
    drawPixelBlock(ctx, z.x, z.y, z.w, z.h, {
      fill: '#5D2A3F',
      topHighlight: '#F9A8D4',
      bottomLip: '#341522',
      border: '#1D0A12',
      lipHeight: 6,
      shadowOffset: 3,
    });
    // Illuminated dessert & craft beer chilled glass showcase
    ctx.fillStyle = '#331A29';
    ctx.fillRect(z.x + 8, z.y + 7, z.w - 16, z.h - 16);
    ctx.fillStyle = '#F472B6';
    ctx.fillRect(z.x + 6, z.y + z.h - 7, z.w - 12, 2);

    // Decorative brass craft beer taps & juice carafes on left corner
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(z.x + 14, z.y + 12, 5, 16);
    ctx.fillRect(z.x + 23, z.y + 12, 5, 16);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(z.x + 14, z.y + 10, 14, 3);

    if (zSlots.length === 0) {
      drawPixelSprite(ctx, getSeafoodSprite('durian_craft'), z.x + 132, z.y + 27, 1.7, 0.5, 0.5);
    } else {
      const slotW = Math.min(86, Math.floor((z.w - 28) / zSlots.length) - 4);
      for (const slot of zSlots) {
        drawBuffetSlot(ctx, world, slot, slotW, 38, timeSec, hoverPos);
      }
    }
    drawPixelLabel(ctx, '酒水饮料 · 甜品水果区', z.x + z.w / 2, z.y + 1, {
      fontSize: 9,
      color: '#FCE7F3',
      bg: 'rgba(92, 24, 58, 0.94)',
      border: '#F472B6',
    });
    if (isZoneHovered(z)) drawHoverBrackets(ctx, z.x, z.y, z.w, z.h, timeSec, '#F9A8D4');
  }

  // =========================================================
  // B. MAIN FRONT BUFFET LINE (3 Core Zones Always Active)
  // =========================================================

  // 4) 冰鲜/冷冻海鲜区 (Crushed-Ice Seafood Bar)
  {
    const z = FRONT_HALL_ZONES.ice_seafood;
    const zSlots = slotsByZone('ice_seafood');

    const prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    const underGlow = ctx.createLinearGradient(z.x, z.y + z.h - 4, z.x, z.y + z.h + 18);
    underGlow.addColorStop(0, 'rgba(56, 212, 248, 0.32)');
    underGlow.addColorStop(1, 'rgba(56, 212, 248, 0)');
    ctx.fillStyle = underGlow;
    ctx.fillRect(z.x - 6, z.y + z.h - 4, z.w + 12, 22);
    ctx.imageSmoothingEnabled = prevSmooth;

    drawPixelBlock(ctx, z.x, z.y, z.w, z.h, {
      fill: '#334E63',
      topHighlight: '#90D7F0',
      bottomLip: '#1E2F3E',
      border: '#131C24',
      lipHeight: 8,
      shadowOffset: 4,
    });
    ctx.fillStyle = '#5CE8FF';
    ctx.fillRect(z.x + 6, z.y + z.h - 9, z.w - 12, 2);
    ctx.fillStyle = '#1E3C52';
    ctx.fillRect(z.x + 8, z.y + 8, z.w - 16, z.h - 20);
    ctx.fillStyle = patterns.ice ?? '#8BE4FA';
    ctx.fillRect(z.x + 10, z.y + 10, z.w - 20, z.h - 24);

    // Twinkling ice crystals
    const sparkleTick = Math.floor(timeSec * 5);
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 6; i++) {
      const sx = z.x + 18 + ((i * 57 + sparkleTick * 13) % (z.w - 36));
      const sy = z.y + 12 + ((i * 17) % 30);
      if ((sparkleTick + i) % 3 === 0) ctx.fillRect(sx, sy, 3, 3);
    }

    const slotW = Math.min(84, Math.floor((z.w - 26) / Math.max(zSlots.length, 1)) - 6);
    for (const slot of zSlots) {
      drawBuffetSlot(ctx, world, slot, slotW, 48, timeSec, hoverPos);
    }

    drawPixelLabel(ctx, '冰鲜 / 冷冻海鲜区', z.x + z.w / 2, z.y + 2, {
      fontSize: 9,
      color: '#E0F7FF',
      bg: 'rgba(14, 52, 76, 0.94)',
      border: '#38BDF8',
    });
    if (isZoneHovered(z)) drawHoverBrackets(ctx, z.x, z.y, z.w, z.h, timeSec, '#7DD3FC');
  }

  // 5) 火锅/烧烤配菜与小料区 (Hotpot Sides, Veggies & Condiment Bar)
  {
    const z = FRONT_HALL_ZONES.hotpot_sides;
    const zSlots = slotsByZone('hotpot_sides');

    drawPixelBlock(ctx, z.x, z.y, z.w, z.h, {
      fill: '#384D38',
      topHighlight: '#86EFAC',
      bottomLip: '#1E2D1F',
      border: '#111A12',
      lipHeight: 8,
      shadowOffset: 4,
    });
    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(z.x + 6, z.y + z.h - 9, z.w - 12, 2);
    ctx.fillStyle = '#233626';
    ctx.fillRect(z.x + 8, z.y + 8, z.w - 16, z.h - 20);

    if (zSlots.length === 0) {
      // Show condiment sauce bowls & fresh greens even if player hasn't slotted a sides card
      drawPixelSprite(ctx, getSeafoodSprite('veggies_balls'), z.x + 70, z.y + 38, 1.8, 0.5, 0.5);
      drawPixelSprite(ctx, getSeafoodSprite('beef_rolls'), z.x + 164, z.y + 38, 1.8, 0.5, 0.5);
    } else {
      const slotW = Math.min(82, Math.floor((z.w - 24) / Math.max(zSlots.length, 1)) - 6);
      for (const slot of zSlots) {
        drawBuffetSlot(ctx, world, slot, slotW, 48, timeSec, hoverPos);
      }
    }

    drawPixelLabel(ctx, '火锅配菜 / 小料区', z.x + z.w / 2, z.y + 2, {
      fontSize: 9,
      color: '#DCFCE7',
      bg: 'rgba(20, 62, 34, 0.94)',
      border: '#4ADE80',
    });
    if (isZoneHovered(z)) drawHoverBrackets(ctx, z.x, z.y, z.w, z.h, timeSec, '#86EFAC');
  }

  ctx.restore();
}

function drawBuffetSlot(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  slot: BuffetSlot,
  slotW: number,
  slotH: number,
  timeSec: number,
  hoverPos: { x: number; y: number } | null
) {
  const item = SEAFOOD_CATALOG.find((s) => s.id === slot.itemId) || SEAFOOD_CATALOG[0];
  const sx = Math.round(slot.x - slotW / 2);
  const sy = Math.round(slot.y - slotH / 2);
  const ratio = slot.stock / Math.max(1, slot.maxStock);
  const isEmpty = slot.stock <= 0;
  const isLow = ratio > 0 && ratio <= 0.34;
  const whStock = world.warehouseStock[slot.itemId] ?? 0;
  const compact = slotH <= 40;
  const hovered =
    hoverPos !== null &&
    hoverPos.x >= sx &&
    hoverPos.x <= sx + slotW &&
    hoverPos.y >= sy &&
    hoverPos.y <= sy + slotH;

  // Chilled stainless pixel tray embedded in zone counter
  drawPixelBlock(ctx, sx, sy, slotW, slotH, {
    fill: isEmpty ? '#3B2830' : '#DDF8FF',
    topHighlight: isEmpty ? '#63434F' : '#FFFFFF',
    bottomLip: isEmpty ? '#26171D' : '#85C5DC',
    border: isEmpty ? '#EF4444' : whStock <= 0 ? '#F59E0B' : '#213B4F',
    lipHeight: 3,
  });

  if (slot.lastGrabFlash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.65, slot.lastGrabFlash * 1.4)})`;
    ctx.fillRect(sx + 2, sy + 2, slotW - 4, slotH - 5);
  }

  if (!isEmpty) {
    const sprite = getSeafoodSprite(item.id);
    const scale = compact ? 1.45 : 1.75;
    const spriteY = compact ? sy + 14 : sy + 19;
    const copies = !compact && ratio > 0.65 && slotW >= 64 ? 2 : 1;
    if (copies === 2) {
      drawPixelSprite(ctx, sprite, slot.x - 11, spriteY, scale, 0.5, 0.5);
      drawPixelSprite(ctx, sprite, slot.x + 11, spriteY + 1, scale, 0.5, 0.5);
    } else {
      drawPixelSprite(ctx, sprite, slot.x, spriteY, scale + 0.15, 0.5, 0.5);
    }
  } else {
    const blink = Math.sin(timeSec * 8) > 0;
    drawPixelLabel(ctx, whStock <= 0 ? '无库!' : '缺货!', slot.x, sy + (compact ? 13 : 18), {
      fontSize: compact ? 9 : 10,
      color: blink ? '#FEF08A' : '#FCA5A5',
    });
  }

  // Compact warehouse stock pill in top-right corner of tray
  drawPixelLabel(ctx, `仓${whStock}`, sx + slotW - 14, sy + 7, {
    fontSize: 8,
    color: whStock <= 0 ? '#FECACA' : whStock <= 6 ? '#FEF08A' : '#D1FAE5',
    bg: whStock <= 0 ? 'rgba(127, 29, 29, 0.92)' : 'rgba(15, 23, 42, 0.85)',
    border: whStock <= 0 ? '#EF4444' : '#475569',
  });

  // Item short label + stock ratio bar
  drawPixelLabel(ctx, item.shortName, slot.x, sy + slotH - (compact ? 9 : 11), {
    fontSize: 8,
    color: isEmpty ? '#FECACA' : '#0F2536',
    bg: isEmpty ? '#7F1D1D' : 'rgba(235, 250, 255, 0.9)',
    border: isEmpty ? '#FCA5A5' : '#5889A6',
  });

  const barCol = isEmpty ? '#EF4444' : isLow ? '#F59E0B' : '#10B981';
  drawPixelBar(ctx, sx + 4, sy + slotH - 3, slotW - 8, 3, ratio, barCol);

  if (hovered) {
    drawHoverBrackets(ctx, sx, sy, slotW, slotH, timeSec, '#7DD3FC');
  }
}

// ==========================================
// SIZZLING COOKED / HOT-FOOD IRON-PLATE COUNTER (Zone 6)
// ==========================================

function drawCookedCounter(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  timeSec: number,
  hoverPos: { x: number; y: number } | null
) {
  const z = FRONT_HALL_ZONES.cooked_hot;
  const cx = Math.round(z.x);
  const cy = Math.round(z.y);
  const ratio = world.cookedStock / Math.max(1, world.cookedMaxStock);
  const isEmpty = world.cookedStock <= 0;
  const hovered =
    hoverPos !== null &&
    hoverPos.x >= cx &&
    hoverPos.x <= cx + z.w &&
    hoverPos.y >= cy &&
    hoverPos.y <= cy + z.h;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Warm amber under-counter heat-lamp spill onto wood floor
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  const warmGlow = ctx.createLinearGradient(cx, cy + z.h - 4, cx, cy + z.h + 18);
  warmGlow.addColorStop(0, 'rgba(251, 146, 60, 0.34)');
  warmGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
  ctx.fillStyle = warmGlow;
  ctx.fillRect(cx - 6, cy + z.h - 4, z.w + 12, 22);
  ctx.imageSmoothingEnabled = prevSmooth;

  // Copper & dark-walnut sizzling hot-food counter
  drawPixelBlock(ctx, cx, cy, z.w, z.h, {
    fill: '#5E2D1E',
    topHighlight: '#C97B4B',
    bottomLip: '#2E140D',
    border: '#190D0A',
    lipHeight: 8,
    shadowOffset: 4,
  });

  // Glowing amber heat-lamp LED strip
  ctx.fillStyle = '#FDBA74';
  ctx.fillRect(cx + 6, cy + z.h - 9, z.w - 12, 2);

  // Recessed iron teppan / warmer tray deck
  ctx.fillStyle = '#241410';
  ctx.fillRect(cx + 8, cy + 8, z.w - 16, z.h - 20);
  ctx.fillStyle = isEmpty ? '#3B2220' : '#4C261A';
  ctx.fillRect(cx + 10, cy + 10, z.w - 20, z.h - 24);

  // Show sizzling cooked dishes proportional to stock
  if (!isEmpty) {
    const hasCrab = world.activeSeafoodIds.includes('typhoon_crab');
    const dishA = getSeafoodSprite('garlic_scallops');
    const dishB = getSeafoodSprite(hasCrab ? 'typhoon_crab' : 'garlic_scallops');
    const plates = Math.min(3, Math.max(1, Math.ceil(ratio * 3)));
    for (let i = 0; i < plates; i++) {
      const px = cx + 36 + i * 52;
      const py = cy + 28;
      ctx.fillStyle = '#B45309';
      ctx.fillRect(px - 19, py - 12, 38, 23);
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(px - 17, py - 10, 34, 19);
      drawPixelSprite(ctx, i % 2 === 0 ? dishA : dishB, px, py - 1, 1.7, 0.5, 0.5);

      const steamShift = Math.floor(timeSec * 4 + i) % 4;
      ctx.fillStyle = 'rgba(255, 247, 237, 0.65)';
      ctx.fillRect(px - 4, py - 16 - steamShift * 2, 2, 4);
      ctx.fillRect(px + 5, py - 14 - ((steamShift + 2) % 4) * 2, 2, 4);
    }
  } else {
    const blink = Math.sin(timeSec * 8) > 0;
    drawPixelLabel(ctx, '熟食已空 · 点此烹制', cx + z.w / 2, cy + 26, {
      fontSize: 10,
      color: blink ? '#FEF08A' : '#FCA5A5',
    });
  }

  // Zone top header tag
  drawPixelLabel(ctx, '熟食 / 热菜铁板区', cx + z.w / 2, cy + 2, {
    fontSize: 9,
    color: '#FFEDD5',
    bg: 'rgba(104, 34, 14, 0.94)',
    border: '#F97316',
  });

  // Counter stock + raw material indicator
  drawPixelLabel(
    ctx,
    `熟食 ${world.cookedStock}/${world.cookedMaxStock} · 原料 ${world.rawIngredients}`,
    cx + z.w / 2,
    cy + z.h - 15,
    {
      fontSize: 8,
      color: isEmpty ? '#FECACA' : '#FEF3C7',
      bg: isEmpty ? 'rgba(127, 29, 29, 0.92)' : 'rgba(67, 26, 14, 0.9)',
      border: isEmpty ? '#F87171' : '#F59E0B',
    }
  );

  // Stock bar along front rim
  const barCol = isEmpty ? '#EF4444' : ratio <= 0.35 ? '#F59E0B' : '#FB923C';
  drawPixelBar(ctx, cx + 10, cy + z.h - 5, z.w - 20, 3, ratio, barCol);

  if (hovered) {
    drawHoverBrackets(ctx, cx, cy, z.w, z.h, timeSec, '#FDBA74');
  }

  ctx.restore();
}

// ==========================================
// PIXELATED WALNUT DINING TABLES & SEATED GUESTS
// ==========================================

function drawDiningTable(
  ctx: CanvasRenderingContext2D,
  table: DiningTable,
  timeSec: number,
  hoverPos: { x: number; y: number } | null
) {
  const tw = 114;
  const th = 72;
  const tx = Math.round(table.x - tw / 2);
  const ty = Math.round(table.y - th / 2);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Locked expansion slot: subtle pixel blueprint floor markings
  if (table.status === 'LOCKED') {
    ctx.strokeStyle = 'rgba(232, 185, 86, 0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(tx + 4, ty + 4, tw - 8, th - 8);
    ctx.setLineDash([]);
    drawPixelLabel(ctx, '待扩建席位', table.x, table.y, {
      fontSize: 10,
      color: 'rgba(226, 200, 155, 0.45)',
    });
    ctx.restore();
    return;
  }

  const hovered =
    hoverPos !== null &&
    hoverPos.x >= tx - 8 &&
    hoverPos.x <= tx + tw + 8 &&
    hoverPos.y >= ty - 16 &&
    hoverPos.y <= ty + th + 16;

  // 1. Top & Bottom wooden pixel benches / booths behind/in front of table
  const drawBench = (bx: number, by: number, bw: number, bh: number) => {
    drawPixelBlock(ctx, bx, by, bw, bh, {
      fill: '#724229',
      topHighlight: '#9A603E',
      bottomLip: '#3E2215',
      border: '#1A100D',
      lipHeight: 3,
      shadowOffset: 2,
    });
    // Crimson seat cushion strip
    ctx.fillStyle = '#8F2626';
    ctx.fillRect(bx + 6, by + 3, bw - 12, bh - 7);
    ctx.fillStyle = '#B53838';
    ctx.fillRect(bx + 6, by + 3, bw - 12, 2);
  };

  drawBench(tx + 12, ty - 16, tw - 24, 15);
  drawBench(tx + 12, ty + th + 2, tw - 24, 15);

  // 2. Seated top-row chibi pixel guests (rendered BEFORE tabletop so legs tuck under table!)
  const cust = table.customer;
  if (cust && (table.status === 'WAITING_BROTH' || table.status === 'DINING')) {
    const seed = hashString(cust.id);
    const isSpecial = Boolean(cust.specialStoryId);
    const isSuper = Boolean(cust.isSuperCustomer);
    const topCount = Math.ceil(cust.size / 2);
    for (let i = 0; i < topCount; i++) {
      const offset = topCount === 1 ? 0 : i === 0 ? -24 : 24;
      const sprite = getSeatedCustomerSprite(
        cust.color,
        seed + i,
        cust.isVip && i === 0,
        isSpecial && i === 0,
        isSuper && i === 0,
        true
      );
      drawPixelSprite(ctx, sprite, table.x + offset, ty - 7, 2.0, 0.5, 0.5);
    }
  }

  // 3. Main Pixel Walnut Dining Tabletop
  drawPixelBlock(ctx, tx, ty, tw, th, {
    fill: '#8E5A36',
    topHighlight: '#BC8354',
    bottomLip: '#52301B',
    border: '#1B110E',
    lipHeight: 8,
    shadowOffset: 5,
  });

  // Wood plank grain lines across tabletop
  ctx.fillStyle = 'rgba(42, 22, 12, 0.25)';
  ctx.fillRect(tx + 4, ty + 18, tw - 8, 1);
  ctx.fillRect(tx + 4, ty + 42, tw - 8, 1);

  // Recessed dark cast-iron induction stove ring in table center
  ctx.fillStyle = '#1B171D';
  ctx.fillRect(table.x - 18, table.y - 16, 36, 28);
  ctx.fillStyle = '#332F38';
  ctx.fillRect(table.x - 16, table.y - 14, 32, 24);
  if (table.status === 'DINING') {
    // Glowing orange induction coil pixel ring
    const coilBright = Math.sin(timeSec * 8 + table.id) > 0 ? '#FB923C' : '#EA580C';
    ctx.fillStyle = coilBright;
    ctx.fillRect(table.x - 14, table.y - 12, 28, 20);
  }

  // 4. Table status-specific pixel props
  if (table.status === 'READY') {
    const setting = getTablePlaceSettingSprite();
    drawPixelSprite(ctx, setting, tx + 24, ty + 16, 1.8, 0.5, 0.5);
    drawPixelSprite(ctx, setting, tx + tw - 24, ty + 16, 1.8, 0.5, 0.5);
    drawPixelSprite(ctx, setting, tx + 24, ty + th - 20, 1.8, 0.5, 0.5);
    drawPixelSprite(ctx, setting, tx + tw - 24, ty + th - 20, 1.8, 0.5, 0.5);
    drawPixelLabel(ctx, '已摆台 · 可入座', table.x, table.y + 18, {
      fontSize: 9,
      color: '#BBF7D0',
      bg: 'rgba(16, 60, 42, 0.85)',
      border: '#22C55E',
    });
  } else if (table.status === 'NEEDS_TABLEWARE') {
    const blink = Math.sin(timeSec * 5 + table.id) > 0;
    drawPixelLabel(ctx, '待摆餐具', table.x, table.y - 2, {
      fontSize: 10,
      color: blink ? '#FEF08A' : '#E2E8F0',
      bg: 'rgba(30, 41, 59, 0.88)',
      border: '#64748B',
    });
  } else if (table.status === 'DIRTY') {
    // Broth smudges + messy pixel dirty plates
    ctx.fillStyle = 'rgba(146, 56, 20, 0.65)';
    ctx.fillRect(tx + 22, ty + 20, 14, 8);
    ctx.fillRect(tx + 72, ty + 34, 18, 10);
    const dirtyStack = getPlateStackSprite(true);
    drawPixelSprite(ctx, dirtyStack, tx + 32, ty + 26, 1.8, 0.5, 0.5);
    drawPixelSprite(ctx, dirtyStack, tx + 82, ty + 32, 1.8, 0.5, 0.5);
    drawPixelLabel(ctx, '待收桌清理!', table.x, table.y - 2, {
      fontSize: 10,
      color: '#FEE2E2',
      bg: 'rgba(153, 27, 27, 0.92)',
      border: '#F87171',
    });
  } else if (table.status === 'WAITING_BROTH' && cust) {
    // Place settings waiting for broth
    const setting = getTablePlaceSettingSprite();
    drawPixelSprite(ctx, setting, tx + 22, ty + 20, 1.7, 0.5, 0.5);
    drawPixelSprite(ctx, setting, tx + tw - 22, ty + 20, 1.7, 0.5, 0.5);

    const broth = BROTH_CATALOG.find((b) => b.id === cust.brothId) || BROTH_CATALOG[0];
    // Pixel speech bubble requesting broth
    drawPixelBlock(ctx, table.x - 42, table.y - 24, 84, 24, {
      fill: '#FFFBEB',
      topHighlight: '#FFFFFF',
      bottomLip: '#E5DEC9',
      border: '#1E1519',
      lipHeight: 3,
    });
    // Broth color square swatch
    ctx.fillStyle = '#1C1418';
    ctx.fillRect(table.x - 36, table.y - 18, 12, 12);
    ctx.fillStyle = broth.color;
    ctx.fillRect(table.x - 34, table.y - 16, 8, 8);
    ctx.fillStyle = broth.secondaryColor;
    ctx.fillRect(table.x - 32, table.y - 14, 3, 3);

    drawPixelLabel(ctx, '催上锅底!', table.x + 8, table.y - 12, {
      fontSize: 10,
      color: '#9A3412',
    });

    // Patience bar
    const pRatio = cust.patience / Math.max(1, cust.maxPatience);
    const barCol = pRatio > 0.5 ? '#22C55E' : pRatio > 0.25 ? '#F59E0B' : '#EF4444';
    drawPixelBar(ctx, tx + 16, ty + th - 14, tw - 32, 5, pRatio, barCol);
  } else if (table.status === 'DINING' && cust) {
    const broth = BROTH_CATALOG.find((b) => b.id === cust.brothId) || BROTH_CATALOG[0];
    const boilFrame = Math.floor(timeSec * 5 + table.boilPhase) % 2;

    // Pixel side dishes of prawns/beef/veggies around hotpot
    drawPixelSprite(ctx, getSideDishSprite(table.id), tx + 22, ty + 20, 1.9, 0.5, 0.5);
    drawPixelSprite(ctx, getSideDishSprite(table.id + 1), tx + tw - 22, ty + 20, 1.9, 0.5, 0.5);
    drawPixelSprite(ctx, getSideDishSprite(table.id + 2), tx + 22, ty + th - 24, 1.9, 0.5, 0.5);

    // Simmering pixel hotpot right in the center!
    const potSprite = getHotpotSprite(broth.color, broth.secondaryColor, boilFrame);
    drawPixelSprite(ctx, potSprite, table.x, table.y - 3, 2.2, 0.5, 0.5);

    // Dining progress bar along front edge
    drawPixelBar(ctx, tx + 16, ty + th - 14, tw - 32, 5, cust.dineProgress, '#38BDF8');

    // Special / VIP / Super floating banner
    if (cust.specialStoryId || cust.isSuperCustomer || cust.isVip) {
      const label = cust.displayName || (cust.isSuperCustomer ? '超级贵宾' : 'VIP');
      drawPixelLabel(ctx, label, table.x, ty - 24, {
        fontSize: 9,
        color: '#FFFDF5',
        bg: cust.isSuperCustomer
          ? '#BE185D'
          : cust.specialStoryId
            ? '#0369A1'
            : '#B45309',
        border: '#1A1118',
      });
    }
  }

  // 5. Seated bottom-row chibi pixel guests (in front of table, facing up toward hotpot!)
  if (cust && (table.status === 'WAITING_BROTH' || table.status === 'DINING')) {
    const seed = hashString(cust.id);
    const bottomCount = Math.floor(cust.size / 2);
    for (let i = 0; i < bottomCount; i++) {
      const offset = bottomCount === 1 ? 0 : i === 0 ? -24 : 24;
      const sprite = getSeatedCustomerSprite(
        cust.color,
        seed + 3 + i,
        false,
        false,
        false,
        false
      );
      drawPixelSprite(ctx, sprite, table.x + offset, ty + th + 6, 2.0, 0.5, 0.5);
    }
  }

  if (hovered) {
    drawHoverBrackets(ctx, tx - 4, ty - 4, tw + 8, th + 8, timeSec);
  }

  ctx.restore();
}

// ==========================================
// ANIMATED CHIBI PIXEL STAFF & MANAGER
// ==========================================

function drawTaskProgressRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  color: string
) {
  ctx.save();
  drawPixelBar(ctx, x - 18, y - 34, 36, 5, progress, color, '#18111A');
  ctx.restore();
}

function drawStaffMember(
  ctx: CanvasRenderingContext2D,
  s: HiredStaff,
  world: GameWorld,
  hoverPos: { x: number; y: number } | null,
  timeSec: number
) {
  const meta = STAFF_ROLE_META[s.role];
  const isMoving = s.taskQueue.length > 0 && !s.taskQueue[0].progress;
  const frame = isMoving ? Math.floor(s.walkCycle * 1.4) % 2 : 0;
  const bobY = isMoving ? (frame === 0 ? -1 : 1) : 0;
  const canChat = world.phase === 'PREP' || world.phase === 'CLOSING';
  const isHovered = canChat && hoverPos !== null && Math.hypot(hoverPos.x - s.x, hoverPos.y - s.y) <= 28;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Ground pixel oval shadow
  ctx.fillStyle = 'rgba(8, 5, 10, 0.48)';
  ctx.fillRect(Math.round(s.x - 12), Math.round(s.y + 11), 24, 6);

  // Role highlight ground ring for high-tier / special masters (or hovered during chat phases)
  if (isHovered) {
    ctx.fillStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.fillRect(Math.round(s.x - 17), Math.round(s.y + 9), 34, 10);
  } else if (s.isSpecial || s.tier >= 3) {
    ctx.fillStyle = s.isSpecial
      ? 'rgba(56, 189, 248, 0.35)'
      : 'rgba(245, 196, 67, 0.32)';
    ctx.fillRect(Math.round(s.x - 15), Math.round(s.y + 10), 30, 8);
  }

  // Chibi pixel staff sprite
  const sprite = getStaffSprite(meta.color, s.tier, Boolean(s.isSpecial), frame);
  drawPixelSprite(ctx, sprite, s.x, s.y + bobY, 2.1, 0.5, 0.62);

  // Carried item held slightly forward
  if (s.carrying !== 'NONE') {
    drawCarriedItem(ctx, s.x + 15, s.y - 4 + bobY, s.carrying, s.carryAmount, s.carryBrothId);
  }

  // Task progress bar if performing timed work
  const activeStep = s.taskQueue[0];
  if (activeStep && activeStep.duration && activeStep.progress && activeStep.progress > 0) {
    drawTaskProgressRing(
      ctx,
      s.x,
      s.y,
      activeStep.progress / activeStep.duration,
      meta.color
    );
  }

  // Subtle pixel chat prompt icon on hover during PREP / CLOSING (never displaying staff name!)
  if (isHovered) {
    const floatY = Math.round(Math.sin(timeSec * 6) * 2);
    drawPixelLabel(ctx, '点击交谈', s.x, s.y - 34 + floatY, {
      fontSize: 9,
      color: '#FEF9C3',
      bg: 'rgba(38, 22, 14, 0.94)',
      border: '#E8C97A',
    });
  } else if (canChat && s.specialStaffId) {
    const floatY = Math.round(Math.sin(timeSec * 4 + s.x) * 1.5);
    ctx.fillStyle = '#F472B6';
    ctx.fillRect(Math.round(s.x - 4), Math.round(s.y - 33 + floatY), 8, 6);
    ctx.fillStyle = '#FFF7ED';
    ctx.fillRect(Math.round(s.x - 3), Math.round(s.y - 32 + floatY), 6, 4);
    ctx.fillStyle = '#BE185D';
    ctx.fillRect(Math.round(s.x - 2), Math.round(s.y - 31 + floatY), 1, 1);
    ctx.fillRect(Math.round(s.x), Math.round(s.y - 31 + floatY), 1, 1);
    ctx.fillRect(Math.round(s.x + 2), Math.round(s.y - 31 + floatY), 1, 1);
  }

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  world: GameWorld
) {
  const charDef = getCharacterDef(world.characterId);
  const activeStep = player.taskQueue[0];
  const isMoving = Boolean(activeStep && !activeStep.progress);
  const frame = isMoving ? Math.floor(player.walkCycle * 1.5) % 2 : 0;
  const bobY = isMoving ? (frame === 0 ? -1 : 1) : 0;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Draw crisp pixel waypoint line for player's queued task path
  if (player.taskQueue.length > 0) {
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y + 8);
    for (const step of player.taskQueue) {
      ctx.lineTo(step.targetX, step.targetY);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const last = player.taskQueue[player.taskQueue.length - 1];
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(Math.round(last.targetX - 4), Math.round(last.targetY - 4), 8, 8);
    ctx.fillStyle = '#181118';
    ctx.fillRect(Math.round(last.targetX - 2), Math.round(last.targetY - 2), 4, 4);
  }

  // Manager golden command aura pad & shadow
  ctx.fillStyle = 'rgba(245, 196, 67, 0.34)';
  ctx.fillRect(Math.round(player.x - 17), Math.round(player.y + 10), 34, 9);
  ctx.fillStyle = 'rgba(8, 5, 10, 0.55)';
  ctx.fillRect(Math.round(player.x - 13), Math.round(player.y + 12), 26, 6);

  // Chibi pixel manager sprite
  const sprite = getManagerSprite(charDef.accentColor, frame);
  drawPixelSprite(ctx, sprite, player.x, player.y + bobY, 2.25, 0.5, 0.62);

  // Carried item
  if (player.carrying !== 'NONE') {
    drawCarriedItem(
      ctx,
      player.x + 17,
      player.y - 5 + bobY,
      player.carrying,
      player.carryAmount,
      player.carryBrothId
    );
  }

  // Active timed work bar
  if (activeStep && activeStep.duration && activeStep.progress && activeStep.progress > 0) {
    drawTaskProgressRing(
      ctx,
      player.x,
      player.y - 4,
      activeStep.progress / activeStep.duration,
      '#FDE047'
    );
  }

  // Manager label tag
  drawPixelLabel(ctx, `店长·${charDef.name}`, player.x, player.y + 25, {
    fontSize: 10,
    color: '#FEF9C3',
    bg: '#1B2538',
    border: '#F5C443',
  });

  ctx.restore();
}

// ==========================================
// HD-2D DYNAMIC 2D LIGHTING COMPOSITE PASS
// ==========================================

function drawDynamicLighting(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  timeSec: number
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;

  // 1. Phase-driven atmospheric ambient tint (makes lights pop!)
  if (world.phase === 'CLOSING') {
    // Cozy twilight indigo dusk so red lanterns & pots shine dramatically
    ctx.fillStyle = 'rgba(14, 22, 46, 0.28)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else if (world.phase === 'PREP') {
    // Crisp morning harbor daylight wash
    const morningGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    morningGrad.addColorStop(0, 'rgba(30, 58, 92, 0.08)');
    morningGrad.addColorStop(1, 'rgba(253, 224, 152, 0.09)');
    ctx.fillStyle = morningGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    // Seasonal rich ambient tint so each of the 4 seasons feels distinct!
    const seasonTint =
      world.season === 'SPRING'
        ? 'rgba(18, 34, 24, 0.09)'
        : world.season === 'SUMMER'
          ? 'rgba(12, 28, 38, 0.08)'
          : world.season === 'AUTUMN'
            ? 'rgba(34, 18, 8, 0.12)'
            : 'rgba(14, 20, 40, 0.16)';
    ctx.fillStyle = seasonTint;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // 2. Additive / screen light pools (HD-2D Bloom!)
  ctx.globalCompositeOperation = 'screen';

  const pulse = 0.92 + Math.sin(timeSec * 3.2) * 0.08;

  // Hanging lanterns along kitchen divider beam (tinted by equipped decor theme)
  const decor = getDecorThemeDef(world.activeDecorThemeId);
  const lanternXs = [176, 392, 668, 922];
  for (let i = 0; i < lanternXs.length; i++) {
    const lx = lanternXs[i];
    const p = 0.92 + Math.sin(timeSec * 2.8 + i) * 0.08;
    drawRadialGlow(
      ctx,
      lx,
      132,
      86 * p,
      decor.lanternGlowRgba,
      'rgba(220, 62, 32, 0.07)'
    );
  }

  // Reception desk twin warm lanterns
  drawRadialGlow(
    ctx,
    STATIONS.RECEPTION.x,
    STATIONS.RECEPTION.y - 10,
    92 * pulse,
    `rgba(255, 165, 76, ${world.phase === 'CLOSING' ? 0.36 : 0.22})`,
    'rgba(224, 92, 38, 0.08)'
  );

  // Broth Kitchen hearth fire glow
  drawRadialGlow(
    ctx,
    STATIONS.BROTH_KITCHEN.x,
    STATIONS.BROTH_KITCHEN.y + 8,
    132 * pulse,
    'rgba(255, 134, 48, 0.28)',
    'rgba(234, 88, 12, 0.09)'
  );

  // Glowing Crushed-Ice Seafood Buffet Bar cyan luminescence!
  const bar = STATIONS.BUFFET_BAR;
  drawRadialGlow(
    ctx,
    bar.x - 160,
    bar.y + 8,
    138,
    'rgba(72, 224, 255, 0.22)',
    'rgba(56, 189, 248, 0.07)'
  );
  drawRadialGlow(
    ctx,
    bar.x,
    bar.y + 8,
    152,
    'rgba(96, 232, 255, 0.24)',
    'rgba(56, 189, 248, 0.08)'
  );
  drawRadialGlow(
    ctx,
    bar.x + 160,
    bar.y + 8,
    138,
    'rgba(72, 224, 255, 0.22)',
    'rgba(56, 189, 248, 0.07)'
  );

  // Sizzling Cooked Hot-Food Counter amber heat-lamp bloom!
  const cc = STATIONS.COOKED_COUNTER;
  drawRadialGlow(
    ctx,
    cc.x,
    cc.y + 6,
    118 * pulse,
    'rgba(255, 168, 76, 0.28)',
    'rgba(234, 88, 12, 0.09)'
  );

  // Active boiling dining tables emit cozy flickering hearth glow!
  for (const table of world.tables) {
    if (table.status === 'DINING') {
      const f = 0.92 + Math.sin(timeSec * 6 + table.id * 1.3) * 0.08;
      drawRadialGlow(
        ctx,
        table.x,
        table.y - 4,
        74 * f,
        `rgba(255, 168, 72, ${world.phase === 'CLOSING' ? 0.38 : 0.24})`,
        'rgba(245, 108, 38, 0.08)'
      );
    }
  }

  // 3. Soft diorama edge vignette (restores Octopath/HD-2D depth framing)
  ctx.globalCompositeOperation = 'source-over';
  const vignette = ctx.createRadialGradient(
    CANVAS_WIDTH * 0.5,
    CANVAS_HEIGHT * 0.52,
    CANVAS_WIDTH * 0.34,
    CANVAS_WIDTH * 0.5,
    CANVAS_HEIGHT * 0.52,
    CANVAS_WIDTH * 0.65
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(8, 5, 12, 0.28)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.restore();
}

function drawWeatherOverlay(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  timeSec: number
) {
  if (world.weather === 'SUNNY') return;

  ctx.save();
  if (world.weather === 'HEATWAVE') {
    const haze = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    haze.addColorStop(0, 'rgba(255, 198, 96, 0.11)');
    haze.addColorStop(0.5, 'rgba(255, 140, 48, 0.04)');
    haze.addColorStop(1, 'rgba(255, 180, 72, 0.09)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else if (world.weather === 'RAINY' || world.weather === 'TYPHOON') {
    const isTyphoon = world.weather === 'TYPHOON';
    ctx.fillStyle = isTyphoon ? 'rgba(10, 22, 38, 0.18)' : 'rgba(14, 28, 44, 0.10)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const dropCount = isTyphoon ? 72 : 36;
    const speedY = isTyphoon ? 620 : 380;
    const slantX = isTyphoon ? -14 : -5;
    const lenY = isTyphoon ? 22 : 14;
    ctx.strokeStyle = isTyphoon ? 'rgba(186, 230, 253, 0.42)' : 'rgba(186, 230, 253, 0.26)';
    ctx.lineWidth = isTyphoon ? 1.5 : 1;
    ctx.beginPath();
    for (let i = 0; i < dropCount; i++) {
      const seedX = (i * 137.5) % (CANVAS_WIDTH + 120);
      const seedY = (i * 89.3 + timeSec * speedY) % (CANVAS_HEIGHT + 40);
      const x = ((seedX - timeSec * (isTyphoon ? 260 : 80)) % (CANVAS_WIDTH + 120) + (CANVAS_WIDTH + 120)) % (CANVAS_WIDTH + 120) - 40;
      const y = seedY - 20;
      ctx.moveTo(x, y);
      ctx.lineTo(x + slantX, y + lenY);
    }
    ctx.stroke();
  } else if (world.weather === 'SNOWY') {
    ctx.fillStyle = 'rgba(204, 232, 255, 0.08)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = 'rgba(241, 248, 255, 0.72)';
    for (let i = 0; i < 44; i++) {
      const drift = Math.sin(timeSec * 1.4 + i) * 18;
      const x = ((i * 97.3 + drift) % CANVAS_WIDTH + CANVAS_WIDTH) % CANVAS_WIDTH;
      const y = (i * 67.1 + timeSec * (32 + (i % 4) * 10)) % CANVAS_HEIGHT;
      const sz = i % 3 === 0 ? 3 : 2;
      ctx.fillRect(Math.round(x), Math.round(y), sz, sz);
    }
  }
  ctx.restore();
}

// ==========================================
// MAIN HD-2D CANVAS RENDER ENTRYPOINT
// ==========================================

export function renderGameCanvas(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  timeSec: number,
  hoverPos: { x: number; y: number } | null,
  backingWidth: number,
  backingHeight: number,
  camera?: SceneCamera
) {
  const vt = getCanvasViewportTransform(backingWidth, backingHeight, camera);

  // 1. Paint seamless extended widescreen HD-2D harbor dining hall
  drawWidescreenBackdrop(ctx, backingWidth, backingHeight, vt, world, timeSec);

  // 2. Transform into 2K-scaled logical 960x640 playfield
  ctx.save();
  ctx.setTransform(vt.scale, 0, 0, vt.scale, vt.offsetX, vt.offsetY);

  drawFloorAndZones(ctx, world, timeSec);
  drawTopStations(ctx, world, timeSec, hoverPos);
  drawReceptionAndQueue(ctx, world, timeSec, hoverPos);
  drawBuffetBar(ctx, world, timeSec, hoverPos);
  drawCookedCounter(ctx, world, timeSec, hoverPos);

  // Backstage doorway on right wall (click to walk into 7-room backstage!)
  const bDoor = DINING_HALL_BACKSTAGE_DOOR;
  const bdx = bDoor.x - bDoor.w / 2;
  const bdy = bDoor.y - bDoor.h / 2;
  const doorHover =
    hoverPos !== null &&
    hoverPos.x >= bdx - 4 &&
    hoverPos.x <= bdx + bDoor.w + 4 &&
    hoverPos.y >= bdy - 4 &&
    hoverPos.y <= bdy + bDoor.h + 4;
  drawPixelBlock(ctx, bdx, bdy, bDoor.w, bDoor.h, {
    fill: doorHover ? '#9A5A1A' : '#5E341A',
    topHighlight: '#E8C97A',
    bottomLip: '#2E160A',
    border: doorHover ? '#FDE047' : '#C99846',
    lipHeight: 4,
    shadowOffset: 3,
  });
  drawPixelLabel(ctx, '后场', bDoor.x, bDoor.y - 4, { fontSize: 10, color: '#FFFBEB' });
  drawPixelLabel(ctx, '→', bDoor.x, bDoor.y + 9, { fontSize: 10, color: '#FDE047' });
  if (doorHover) drawHoverBrackets(ctx, bdx, bdy, bDoor.w, bDoor.h, timeSec, '#FDE047');

  for (const table of world.tables) {
    drawDiningTable(ctx, table, timeSec, hoverPos);
  }

  // Depth-sort mobile actors by Y coordinate for authentic HD-2D layering!
  const actors: Array<{ y: number; draw: () => void }> = [];
  for (const s of world.staff) {
    actors.push({ y: s.y, draw: () => drawStaffMember(ctx, s, world, hoverPos, timeSec) });
  }
  actors.push({ y: world.player.y, draw: () => drawPlayer(ctx, world.player, world) });
  actors.sort((a, b) => a.y - b.y);
  for (const actor of actors) {
    actor.draw();
  }

  // 3. Crisp HD-2D Pixel Particles (steam puffs, sparkles, flies, splashes)
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  for (const pt of world.particles) {
    const alpha = Math.max(0, Math.min(1, pt.life / pt.maxLife));
    const pxSize = Math.max(2, Math.round(pt.radius * 1.7));
    const sx = Math.round(pt.x - pxSize / 2);
    const sy = Math.round(pt.y - pxSize / 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    ctx.fillRect(sx, sy, pxSize, pxSize);
    if (pt.kind === 'SPARKLE') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(sx + 1, sy + 1, Math.max(1, pxSize - 2), Math.max(1, pxSize - 2));
    }
  }
  ctx.restore();

  // 4. HD-2D Soft Dynamic Lighting & Atmospheric Vignette Pass + Weather Overlay
  drawDynamicLighting(ctx, world, timeSec);
  drawWeatherOverlay(ctx, world, timeSec);

  // 4b. Customer Dining Speech Bubbles (crisp above lighting; Special NPCs get highlighted styling!)
  for (const table of world.tables) {
    const cust = table.customer;
    if (table.status !== 'DINING' || !cust || !cust.speechText) continue;
    const isSpecialNpc = Boolean(cust.specialStoryId);
    const fadeAlpha =
      cust.speechTimer !== undefined && cust.speechTimer < 0.6
        ? Math.max(0, cust.speechTimer / 0.6)
        : 1;
    const bubbleText = isSpecialNpc ? `★ ${cust.speechText}` : cust.speechText;
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    ctx.font = `700 ${isSpecialNpc ? 10 : 9.5}px "Noto Sans SC", sans-serif`;
    const tw = Math.ceil(ctx.measureText(bubbleText).width);
    const bw = tw + 14;
    const bh = 20;
    const bx = Math.max(8, Math.min(CANVAS_WIDTH - bw - 8, Math.round(table.x - bw / 2)));
    const by = Math.round(table.y - (isSpecialNpc ? 74 : 62));

    // Pixel speech bubble background + border + downward tail
    ctx.fillStyle = isSpecialNpc ? 'rgba(34, 18, 42, 0.95)' : 'rgba(255, 250, 236, 0.95)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = isSpecialNpc ? '#F6DA8D' : '#6B4226';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

    // Little pointer triangle at bottom center
    const tailX = Math.max(bx + 6, Math.min(bx + bw - 6, Math.round(table.x)));
    ctx.fillStyle = isSpecialNpc ? 'rgba(34, 18, 42, 0.95)' : 'rgba(255, 250, 236, 0.95)';
    ctx.fillRect(tailX - 3, by + bh - 1, 6, 4);
    ctx.fillStyle = isSpecialNpc ? '#F6DA8D' : '#6B4226';
    ctx.fillRect(tailX - 1, by + bh + 3, 2, 2);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isSpecialNpc ? '#FEF08A' : '#3B1F11';
    ctx.fillText(bubbleText, bx + bw / 2, by + bh / 2 + 0.5);
    ctx.restore();
  }

  // 5. Crisp Floating Feedback Numbers / Texts (rendered ABOVE lighting so always legible!)
  for (const ft of world.floatingTexts) {
    const alpha = Math.max(0, Math.min(1, ft.life / ft.maxLife));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${ft.size ?? 14}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(12, 8, 16, 0.92)';
    ctx.strokeText(ft.text, Math.round(ft.x), Math.round(ft.y));
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, Math.round(ft.x), Math.round(ft.y));
    ctx.restore();
  }

  // Near-failure / low-hygiene border alert pulse on canvas
  const dangerStatus = getNearFailureStatus(world);
  if (dangerStatus.level !== 'NONE') {
    const speed = dangerStatus.level === 'CRITICAL' ? 7.5 : 3.5;
    const base = dangerStatus.level === 'CRITICAL' ? 0.42 : 0.22;
    const amp = dangerStatus.level === 'CRITICAL' ? 0.26 : 0.14;
    const pulse = base + Math.sin(timeSec * speed) * amp;
    ctx.strokeStyle =
      dangerStatus.level === 'CRITICAL'
        ? `rgba(239, 68, 68, ${pulse})`
        : `rgba(245, 158, 11, ${pulse})`;
    ctx.lineWidth = dangerStatus.level === 'CRITICAL' ? 8 : 5;
    ctx.strokeRect(3, 3, CANVAS_WIDTH - 6, CANVAS_HEIGHT - 6);
  }

  ctx.restore();
}
