import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  getFrontHallEntranceLayout,
} from '../data/gameConfig';
import {
  BACKSTAGE_CORRIDOR,
  BACKSTAGE_ROOMS,
  FRONT_BACK_ARCHWAYS,
} from '../data/policyAndTechConfig';
import { FacilitySceneId, GamePhase, GameWorld, HolidayId, SeasonId, WeatherId } from '../types/game';
import {
  drawIsoPropSprite,
  getPaintedSurfaceCanvas,
  PaintedSurfaceKey,
} from './isoEnvironmentAssets';

export interface SceneAtmosphere {
  season: SeasonId;
  weather: WeatherId;
  phase: GamePhase;
  dayProgress: number; // 0..1 across business hours
  timeSec: number;
  holiday?: HolidayId;
  rushHourActive?: boolean;
}

// Shared 45° 2:1 Architectural Isometric basis (matches isoRenderer.ts exactly)
const ISO_COS = 0.72;
const ISO_SIN = 0.36;

// Refined Ligne Claire architectural ink palette (matches style_isometric_tycoon)
const INK = '#241A14';
const INK_MID = 'rgba(36, 26, 20, 0.58)';

function computeAtmosphereWeights(atmo?: SceneAtmosphere): {
  eveningness: number;
  sunStrength: number;
  lanternGlow: number;
  isRain: boolean;
  isSnow: boolean;
  isWarmDusk: boolean;
} {
  if (!atmo) {
    return {
      eveningness: 0.2,
      sunStrength: 0.7,
      lanternGlow: 0.8,
      isRain: false,
      isSnow: false,
      isWarmDusk: false,
    };
  }
  const isRain = atmo.weather === 'RAINY' || atmo.weather === 'TYPHOON';
  const isSnow = atmo.weather === 'SNOWY';
  const isClosing = atmo.phase === 'CLOSING';
  const isPrep = atmo.phase === 'PREP';
  const dp = Math.max(0, Math.min(1, atmo.dayProgress));

  // Evening ramps smoothly in the final 45% of business day, peaking during CLOSING
  const eveningness = isClosing ? 0.92 : isPrep ? 0.14 : Math.max(0, (dp - 0.42) / 0.58) * 0.85;
  const isWarmDusk = !isClosing && !isRain && !isSnow && dp >= 0.48 && dp <= 0.85;

  const baseSun = isClosing ? 0 : isRain ? 0.08 : isSnow ? 0.22 : isPrep ? 0.65 : Math.max(0.15, 1 - eveningness * 0.82);
  const sunStrength = atmo.weather === 'HEATWAVE' ? Math.min(1, baseSun * 1.25) : baseSun;
  const isRush = Boolean(atmo.rushHourActive);
  const isHoliday = Boolean(atmo.holiday && atmo.holiday !== 'NONE');
  const lanternGlow = Math.min(
    1.85,
    0.72 +
      eveningness * 0.72 +
      (isRain ? 0.24 : 0) +
      (isSnow ? 0.2 : 0) +
      (isRush ? 0.28 : 0) +
      (isHoliday ? 0.18 : 0)
  );
  return { eveningness, sunStrength, lanternGlow, isRain, isSnow, isWarmDusk };
}

function w2i(wx: number, wy: number, wz = 0): { x: number; y: number } {
  return {
    x: (wx - wy) * ISO_COS,
    y: (wx + wy) * ISO_SIN - wz,
  };
}

function drawPoly(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>,
  fill: string | CanvasPattern | CanvasGradient,
  stroke?: string,
  lineWidth = 1.0
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

function drawIsoQuadFlat(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  wz: number,
  fill: string | CanvasPattern | CanvasGradient,
  stroke?: string,
  lineWidth = 0.95
) {
  const p0 = w2i(wx, wy, wz);
  const p1 = w2i(wx + w, wy, wz);
  const p2 = w2i(wx + w, wy + d, wz);
  const p3 = w2i(wx, wy + d, wz);
  drawPoly(ctx, [p0, p1, p2, p3], fill, stroke, lineWidth);
}

function drawIsoBoxFlat(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  h: number,
  colors: {
    top: string;
    left: string;
    right: string;
    stroke?: string;
    lineWidth?: number;
  },
  baseZ = 0
) {
  const stroke = colors.stroke ?? INK;
  const lw = colors.lineWidth ?? 0.95;

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

// ==========================================
// CACHED HIGH-DPI ARCHITECTURAL TEXTURE ATLAS
// 2x world-space oversampling mapped via exact isometric DOMMatrix!
// ==========================================

type TextureKey =
  | 'parquet_classic'
  | 'parquet_mahogany'
  | 'parquet_obsidian'
  | 'parquet_azure'
  | 'terrazzo_stone'
  | 'celadon_floor'
  | 'cold_slate'
  | 'kitchen_quarry'
  | 'equipment_concrete'
  | 'office_walnut'
  | 'dorm_oak'
  | 'wall_wainscot_s'
  | 'wall_wainscot_e'
  | 'wall_celadon_s'
  | 'wall_celadon_e'
  | 'wall_cold_s'
  | 'wall_cold_e'
  | 'harbor_stone'
  | 'harbor_stone_rain'
  | 'harbor_stone_snow';

const PAINTED_SURFACE_KEYS = new Set<TextureKey>([
  'parquet_classic',
  'parquet_mahogany',
  'parquet_obsidian',
  'parquet_azure',
  'terrazzo_stone',
  'kitchen_quarry',
  'office_walnut',
  'dorm_oak',
  'wall_wainscot_s',
  'wall_wainscot_e',
  'harbor_stone',
  'harbor_stone_rain',
  'harbor_stone_snow',
]);

const textureCache = new Map<TextureKey, HTMLCanvasElement>();

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeOffscreen(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function buildWoodParquetTexture(
  palette: [string, string, string, string],
  seamColor: string,
  grainColor: string,
  seed: number,
  plankH = 26
): HTMLCanvasElement {
  const W = 256;
  const H = 256;
  const [c, ctx] = makeOffscreen(W, H);
  const rand = seededRand(seed);

  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, W, H);

  const rows = Math.ceil(H / plankH);
  for (let r = 0; r < rows; r++) {
    const y = r * plankH;
    const h = Math.min(plankH, H - y);
    const offset = ((r * 83) % 128);
    const plankW = 128;

    for (let x = -offset; x < W; x += plankW) {
      const col = palette[Math.floor(rand() * palette.length)];
      ctx.fillStyle = col;
      ctx.fillRect(x, y, plankW, h);

      // Soft watercolor tonal wash along board length
      const wash = ctx.createLinearGradient(x, y, x + plankW, y);
      wash.addColorStop(0, 'rgba(255, 245, 224, 0.08)');
      wash.addColorStop(0.5, 'rgba(255, 245, 224, 0)');
      wash.addColorStop(1, 'rgba(38, 22, 12, 0.08)');
      ctx.fillStyle = wash;
      ctx.fillRect(x, y, plankW, h);

      // Fine longitudinal wood grain lines
      ctx.strokeStyle = grainColor;
      ctx.lineWidth = 0.85;
      for (let g = 0; g < 3; g++) {
        const gy = y + 4 + rand() * Math.max(4, h - 8);
        ctx.beginPath();
        ctx.moveTo(x + 2, gy);
        ctx.bezierCurveTo(
          x + plankW * 0.35,
          gy + (rand() - 0.5) * 3,
          x + plankW * 0.7,
          gy + (rand() - 0.5) * 3,
          x + plankW - 2,
          gy
        );
        ctx.stroke();
      }

      // Crisp architectural ink plank bevel highlight & seam
      ctx.fillStyle = 'rgba(255, 244, 220, 0.14)';
      ctx.fillRect(x + 1, y + 1, plankW - 2, 1.2);

      ctx.strokeStyle = seamColor;
      ctx.lineWidth = 1.1;
      ctx.strokeRect(x + 0.5, y + 0.5, plankW - 1, h - 1);
    }
  }
  return c;
}

function buildStoneTileTexture(
  palette: [string, string, string],
  groutColor: string,
  tileSize: number,
  seed: number,
  options?: { glossy?: boolean; speckles?: boolean; highlightAlpha?: number }
): HTMLCanvasElement {
  const W = 256;
  const H = 256;
  const [c, ctx] = makeOffscreen(W, H);
  const rand = seededRand(seed);

  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, W, H);

  for (let y = 0; y < H; y += tileSize) {
    for (let x = 0; x < W; x += tileSize) {
      const base = palette[Math.floor(rand() * palette.length)];
      ctx.fillStyle = base;
      ctx.fillRect(x, y, tileSize, tileSize);

      // Subtle architectural watercolor wash across each tile
      const grad = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
      grad.addColorStop(0, `rgba(255, 255, 250, ${options?.highlightAlpha ?? 0.1})`);
      grad.addColorStop(1, 'rgba(20, 18, 16, 0.07)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, tileSize, tileSize);

      if (options?.glossy) {
        ctx.fillStyle = 'rgba(235, 255, 252, 0.16)';
        ctx.beginPath();
        ctx.moveTo(x + 3, y + tileSize * 0.42);
        ctx.lineTo(x + tileSize * 0.45, y + 3);
        ctx.lineTo(x + tileSize * 0.62, y + 3);
        ctx.lineTo(x + 3, y + tileSize * 0.58);
        ctx.closePath();
        ctx.fill();
      }

      if (options?.speckles) {
        for (let s = 0; s < 7; s++) {
          ctx.fillStyle =
            rand() > 0.5 ? 'rgba(42, 34, 28, 0.13)' : 'rgba(255, 248, 236, 0.18)';
          ctx.fillRect(
            x + 3 + rand() * (tileSize - 6),
            y + 3 + rand() * (tileSize - 6),
            1.6,
            1.6
          );
        }
      }

      // Crisp inner top-left highlight & grout line
      ctx.strokeStyle = 'rgba(255, 252, 244, 0.16)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(x + 1.5, y + tileSize - 1.5);
      ctx.lineTo(x + 1.5, y + 1.5);
      ctx.lineTo(x + tileSize - 1.5, y + 1.5);
      ctx.stroke();

      ctx.strokeStyle = groutColor;
      ctx.lineWidth = 1.25;
      ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);
    }
  }
  return c;
}

function buildWainscotWallTexture(shaded: boolean): HTMLCanvasElement {
  // Height = 152px (covers up to 76 world-units at 2x DPI); width = 192px (tiles horizontally every 96 world-units)
  const W = 192;
  const H = 152;
  const [c, ctx] = makeOffscreen(W, H);
  const rand = seededRand(shaded ? 4021 : 4019);

  // Upper warm architectural plaster (z = 26..76 => v = 0..100)
  const plasterGrad = ctx.createLinearGradient(0, 0, 0, 96);
  plasterGrad.addColorStop(0, shaded ? '#C6AC86' : '#DFC7A1');
  plasterGrad.addColorStop(1, shaded ? '#B99C74' : '#D2B78E');
  ctx.fillStyle = plasterGrad;
  ctx.fillRect(0, 0, W, 98);

  // Subtle watercolor paper grain on upper plaster
  for (let i = 0; i < 65; i++) {
    ctx.fillStyle =
      rand() > 0.5 ? 'rgba(255, 248, 232, 0.08)' : 'rgba(92, 62, 34, 0.05)';
    ctx.fillRect(rand() * W, rand() * 94, 4 + rand() * 14, 2 + rand() * 5);
  }

  // Upper horizontal timber crown beam
  ctx.fillStyle = shaded ? '#5C3B23' : '#734A2D';
  ctx.fillRect(0, 0, W, 8);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 8.5);
  ctx.lineTo(W, 8.5);
  ctx.stroke();

  // Vertical slender wooden battens dividing plaster panels
  for (const bx of [0, 96]) {
    ctx.fillStyle = shaded ? '#6E462A' : '#855736';
    ctx.fillRect(bx, 8, 7, 88);
    ctx.strokeStyle = 'rgba(36, 26, 20, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, 8.5, 6, 87);
  }

  // Carved Dado Chair Rail Molding (v = 96..106)
  ctx.fillStyle = shaded ? '#5B3820' : '#74482A';
  ctx.fillRect(0, 95, W, 10);
  ctx.fillStyle = 'rgba(255, 236, 198, 0.22)';
  ctx.fillRect(0, 96, W, 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 95.5);
  ctx.lineTo(W, 95.5);
  ctx.moveTo(0, 105.5);
  ctx.lineTo(W, 105.5);
  ctx.stroke();

  // Lower Carved Cedar Wainscoting Panels (v = 105..144)
  ctx.fillStyle = shaded ? '#7B5030' : '#96643E';
  ctx.fillRect(0, 105, W, 40);

  for (const px of [10, 106]) {
    ctx.fillStyle = shaded ? '#6E4528' : '#885835';
    ctx.fillRect(px, 111, 76, 28);
    ctx.strokeStyle = 'rgba(255, 234, 194, 0.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1, 112, 74, 26);
    ctx.strokeStyle = 'rgba(36, 26, 20, 0.62)';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(px, 111, 76, 28);
  }

  // Dark Walnut Baseboard Skirting (v = 144..152)
  ctx.fillStyle = shaded ? '#3E2515' : '#4E2F1B';
  ctx.fillRect(0, 144, W, 8);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(0, 144.5);
  ctx.lineTo(W, 144.5);
  ctx.stroke();

  return c;
}

function buildCeladonWallTexture(shaded: boolean): HTMLCanvasElement {
  const W = 128;
  const H = 152;
  const [c, ctx] = makeOffscreen(W, H);
  const rand = seededRand(shaded ? 7011 : 7009);

  // Signature style_isometric_tycoon glazed celadon-jade tiled walls (Restroom / Washroom / Wet Kitchen)
  const tile = 16;
  const pal = shaded
    ? ['#539E94', '#4B9389', '#5CA89E']
    : ['#6BC0B5', '#61B5AA', '#75C9BE'];

  for (let y = 0; y < H; y += tile) {
    for (let x = 0; x < W; x += tile) {
      ctx.fillStyle = pal[Math.floor(rand() * pal.length)];
      ctx.fillRect(x, y, tile, tile);

      // Soft ceramic highlight glint
      ctx.fillStyle = shaded
        ? 'rgba(220, 255, 250, 0.08)'
        : 'rgba(235, 255, 252, 0.14)';
      ctx.fillRect(x + 1.5, y + 1.5, tile - 3, 2.2);

      // Fine architectural grout grid
      ctx.strokeStyle = shaded
        ? 'rgba(24, 62, 58, 0.42)'
        : 'rgba(32, 82, 76, 0.34)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
    }
  }

  // Subtle decorative celadon dado trim band near top & base
  ctx.fillStyle = shaded ? '#3B7870' : '#4B9187';
  ctx.fillRect(0, 0, W, 6);
  ctx.fillRect(0, H - 7, W, 7);
  return c;
}

function buildColdWallTexture(shaded: boolean): HTMLCanvasElement {
  const W = 128;
  const H = 152;
  const [c, ctx] = makeOffscreen(W, H);
  ctx.fillStyle = shaded ? '#7898A3' : '#93B4BF';
  ctx.fillRect(0, 0, W, H);

  for (let x = 0; x < W; x += 32) {
    ctx.fillStyle = shaded ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 2, 0, 6, H);
    ctx.strokeStyle = 'rgba(30, 52, 60, 0.4)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
    ctx.stroke();
  }
  // Brushed steel lower kickplate
  ctx.fillStyle = shaded ? '#5D737B' : '#738D96';
  ctx.fillRect(0, H - 22, W, 22);
  ctx.strokeStyle = 'rgba(25, 42, 48, 0.5)';
  ctx.beginPath();
  ctx.moveTo(0, H - 22);
  ctx.lineTo(W, H - 22);
  ctx.stroke();
  return c;
}

function getTextureCanvas(key: TextureKey): HTMLCanvasElement {
  if (PAINTED_SURFACE_KEYS.has(key)) {
    const painted = getPaintedSurfaceCanvas(key as PaintedSurfaceKey);
    if (painted) return painted;
  }

  const cached = textureCache.get(key);
  if (cached) return cached;

  let canvas: HTMLCanvasElement;
  switch (key) {
    case 'parquet_classic':
      canvas = buildWoodParquetTexture(
        ['#C29563', '#B88B59', '#C89E6C', '#AF8151'],
        'rgba(66, 39, 19, 0.36)',
        'rgba(78, 46, 22, 0.15)',
        101
      );
      break;
    case 'parquet_mahogany':
      canvas = buildWoodParquetTexture(
        ['#A6724A', '#9A663F', '#B07B52', '#8F5D38'],
        'rgba(48, 26, 12, 0.42)',
        'rgba(58, 30, 14, 0.17)',
        102
      );
      break;
    case 'parquet_obsidian':
      canvas = buildWoodParquetTexture(
        ['#7D746B', '#726961', '#857C73', '#6A625A'],
        'rgba(32, 27, 23, 0.42)',
        'rgba(40, 34, 30, 0.16)',
        103
      );
      break;
    case 'parquet_azure':
      canvas = buildWoodParquetTexture(
        ['#C4AC85', '#B9A079', '#CCB691', '#B09770'],
        'rgba(78, 60, 36, 0.32)',
        'rgba(88, 68, 42, 0.14)',
        104
      );
      break;
    case 'terrazzo_stone':
      canvas = buildStoneTileTexture(
        ['#B3AA9C', '#AAA192', '#BBB3A5'],
        'rgba(56, 48, 39, 0.28)',
        32,
        201,
        { speckles: true, highlightAlpha: 0.1 }
      );
      break;
    case 'celadon_floor':
      canvas = buildStoneTileTexture(
        ['#7BC8BE', '#6FBEB4', '#85D0C7'],
        'rgba(34, 86, 80, 0.32)',
        32,
        202,
        { glossy: true, highlightAlpha: 0.15 }
      );
      break;
    case 'cold_slate':
      canvas = buildStoneTileTexture(
        ['#89ADB8', '#7FA3AE', '#92B6C0'],
        'rgba(35, 62, 72, 0.3)',
        32,
        203,
        { speckles: true, highlightAlpha: 0.12 }
      );
      break;
    case 'kitchen_quarry':
      canvas = buildStoneTileTexture(
        ['#AC8C74', '#A2836B', '#B4957D'],
        'rgba(62, 42, 28, 0.3)',
        32,
        204,
        { speckles: true, highlightAlpha: 0.09 }
      );
      break;
    case 'equipment_concrete':
      canvas = buildStoneTileTexture(
        ['#7B8890', '#727F87', '#839098'],
        'rgba(35, 44, 50, 0.34)',
        64,
        205,
        { speckles: true, highlightAlpha: 0.07 }
      );
      break;
    case 'office_walnut':
      canvas = buildWoodParquetTexture(
        ['#A2764F', '#976B45', '#AB7F57', '#8E633E'],
        'rgba(52, 32, 16, 0.38)',
        'rgba(58, 35, 18, 0.16)',
        206,
        22
      );
      break;
    case 'dorm_oak':
      canvas = buildWoodParquetTexture(
        ['#C4A074', '#BA9569', '#CCA87D', '#B28C61'],
        'rgba(74, 50, 26, 0.32)',
        'rgba(84, 56, 28, 0.14)',
        207,
        24
      );
      break;
    case 'wall_wainscot_s':
      canvas = buildWainscotWallTexture(false);
      break;
    case 'wall_wainscot_e':
      canvas = buildWainscotWallTexture(true);
      break;
    case 'wall_celadon_s':
      canvas = buildCeladonWallTexture(false);
      break;
    case 'wall_celadon_e':
      canvas = buildCeladonWallTexture(true);
      break;
    case 'wall_cold_s':
      canvas = buildColdWallTexture(false);
      break;
    case 'wall_cold_e':
      canvas = buildColdWallTexture(true);
      break;
    case 'harbor_stone':
      canvas = buildStoneTileTexture(['#B4AB99', '#AAA08E', '#BCB3A1'], 'rgba(56, 48, 38, 0.36)', 32, 208, {
        speckles: true,
        highlightAlpha: 0.1,
      });
      break;
    case 'harbor_stone_rain':
      canvas = buildStoneTileTexture(['#586E78', '#4F656F', '#617782'], 'rgba(28, 38, 44, 0.42)', 32, 209, {
        glossy: true,
        highlightAlpha: 0.14,
      });
      break;
    case 'harbor_stone_snow':
      canvas = buildStoneTileTexture(['#DDEBF2', '#D2E2EB', '#E4F1F8'], 'rgba(120, 148, 166, 0.42)', 32, 210, {
        highlightAlpha: 0.18,
      });
      break;
  }

  textureCache.set(key, canvas);
  return canvas;
}

function fillIsoFloorTextured(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  key: TextureKey,
  wz = 0,
  stroke?: string,
  lineWidth = 0.85
) {
  const tex = getTextureCanvas(key);
  const pat = ctx.createPattern(tex, 'repeat');
  if (pat) {
    pat.setTransform(
      new DOMMatrix([
        ISO_COS * 0.5,
        ISO_SIN * 0.5,
        -ISO_COS * 0.5,
        ISO_SIN * 0.5,
        0,
        -wz,
      ])
    );
    drawIsoQuadFlat(ctx, wx, wy, w, d, wz, pat, stroke, lineWidth);
  } else {
    drawIsoQuadFlat(ctx, wx, wy, w, d, wz, '#B88B59', stroke, lineWidth);
  }
}

/**
 * Maps a 2x-DPI wall texture onto a South-facing (+Y facing) vertical wall running along wx..wx+w, height baseZ..baseZ+h.
 */
function fillIsoWallFaceSouth(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  h: number,
  baseZ: number,
  key: TextureKey,
  stroke = INK,
  lineWidth = 0.95
) {
  const t0 = w2i(wx, wy, baseZ + h);
  const t1 = w2i(wx + w, wy, baseZ + h);
  const b1 = w2i(wx + w, wy, baseZ);
  const b0 = w2i(wx, wy, baseZ);

  const tex = getTextureCanvas(key);
  const pat = ctx.createPattern(tex, 'repeat');
  if (pat) {
    const scaleY = h / (tex.height * 0.5);
    pat.setTransform(
      new DOMMatrix([
        ISO_COS * 0.5,
        ISO_SIN * 0.5,
        0,
        0.5 * scaleY,
        t0.x,
        t0.y,
      ])
    );
    drawPoly(ctx, [t0, t1, b1, b0], pat, stroke, lineWidth);
  } else {
    drawPoly(ctx, [t0, t1, b1, b0], '#D8BF98', stroke, lineWidth);
  }
}

/**
 * Maps a 2x-DPI wall texture onto an East-facing (+X facing) vertical wall running along wy..wy+d, height baseZ..baseZ+h.
 */
function fillIsoWallFaceEast(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  d: number,
  h: number,
  baseZ: number,
  key: TextureKey,
  stroke = INK,
  lineWidth = 0.95
) {
  const t0 = w2i(wx, wy, baseZ + h);
  const t1 = w2i(wx, wy + d, baseZ + h);
  const b1 = w2i(wx, wy + d, baseZ);
  const b0 = w2i(wx, wy, baseZ);

  const tex = getTextureCanvas(key);
  const pat = ctx.createPattern(tex, 'repeat');
  if (pat) {
    const scaleY = h / (tex.height * 0.5);
    pat.setTransform(
      new DOMMatrix([
        -ISO_COS * 0.5,
        ISO_SIN * 0.5,
        0,
        0.5 * scaleY,
        t0.x,
        t0.y,
      ])
    );
    drawPoly(ctx, [t0, t1, b1, b0], pat, stroke, lineWidth);
  } else {
    drawPoly(ctx, [t0, t1, b1, b0], '#C6AC85', stroke, lineWidth);
  }
}

// ==========================================
// 1. ARCHITECTURAL DRAFTING BACKDROP & CUTAWAY SLAB
// ==========================================

export function drawIsoArchitecturalBackdrop(
  ctx: CanvasRenderingContext2D,
  backingWidth: number,
  backingHeight: number,
  scale: number,
  atmo?: SceneAtmosphere
) {
  const { eveningness, isRain, isSnow, isWarmDusk } = computeAtmosphereWeights(atmo);
  ctx.save();
  const bgGrad = ctx.createRadialGradient(
    backingWidth * 0.5,
    backingHeight * 0.45,
    backingHeight * 0.08,
    backingWidth * 0.5,
    backingHeight * 0.5,
    Math.max(backingWidth, backingHeight) * 0.82
  );

  if (isRain) {
    bgGrad.addColorStop(0, '#162A34');
    bgGrad.addColorStop(0.56, '#0F1E26');
    bgGrad.addColorStop(1, '#071016');
  } else if (isSnow) {
    bgGrad.addColorStop(0, '#1D333C');
    bgGrad.addColorStop(0.56, '#13242C');
    bgGrad.addColorStop(1, '#091319');
  } else if (eveningness > 0.68) {
    bgGrad.addColorStop(0, '#1B283A');
    bgGrad.addColorStop(0.56, '#121B2B');
    bgGrad.addColorStop(1, '#080D17');
  } else if (isWarmDusk) {
    bgGrad.addColorStop(0, '#2B2B2C');
    bgGrad.addColorStop(0.56, '#1B2428');
    bgGrad.addColorStop(1, '#0D1418');
  } else if (atmo?.season === 'AUTUMN') {
    bgGrad.addColorStop(0, '#243433');
    bgGrad.addColorStop(0.56, '#162626');
    bgGrad.addColorStop(1, '#0B1617');
  } else {
    bgGrad.addColorStop(0, '#1D3739');
    bgGrad.addColorStop(0.58, '#132729');
    bgGrad.addColorStop(1, '#0B1718');
  }

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, backingWidth, backingHeight);

  // Subtle architectural isometric drafting grid lines in outer void
  ctx.strokeStyle = isWarmDusk
    ? 'rgba(244, 198, 122, 0.032)'
    : 'rgba(218, 192, 132, 0.028)';
  ctx.lineWidth = 1;
  const step = Math.max(54, Math.round(72 * scale));
  for (let gx = -backingHeight * 2; gx < backingWidth + backingHeight * 2; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx + backingHeight * 2, backingHeight);
    ctx.stroke();
  }

  // Distinct seasonal & weather ambient glow, coastal mist, and shimmer accents in outer harbor void
  if (atmo) {
    const t = atmo.timeSec;
    const isTyphoon = atmo.weather === 'TYPHOON';
    const isHeat = atmo.weather === 'HEATWAVE';

    if (isRain) {
      // Drifting harbor rain-cloud haze & coastal sea-spray ribbons in outer backdrop
      const mistCount = isTyphoon ? 6 : 4;
      for (let m = 0; m < mistCount; m++) {
        const speed = isTyphoon ? 56 + m * 12 : 24 + m * 7;
        const mx =
          ((m * 317 + t * speed) % (backingWidth + backingWidth * 0.6)) - backingWidth * 0.3;
        const my = backingHeight * (0.14 + (m % 4) * 0.22) + Math.sin(t * 0.7 + m) * 16;
        const mw = backingWidth * (isTyphoon ? 0.34 : 0.26);
        const mh = backingHeight * 0.14;
        const mistGrad = ctx.createRadialGradient(mx, my, 12, mx, my, mw);
        mistGrad.addColorStop(0, isTyphoon ? 'rgba(148, 198, 224, 0.085)' : 'rgba(156, 206, 226, 0.05)');
        mistGrad.addColorStop(1, 'rgba(120, 176, 204, 0)');
        ctx.fillStyle = mistGrad;
        ctx.beginPath();
        ctx.ellipse(mx, my, mw, mh, isTyphoon ? -0.18 : -0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (atmo.season === 'SPRING' && !isSnow) {
      const springGlow = ctx.createRadialGradient(
        backingWidth * 0.22,
        backingHeight * 0.25,
        20,
        backingWidth * 0.22,
        backingHeight * 0.25,
        backingWidth * 0.65
      );
      springGlow.addColorStop(0, 'rgba(249, 168, 212, 0.095)');
      springGlow.addColorStop(0.55, 'rgba(167, 243, 208, 0.04)');
      springGlow.addColorStop(1, 'rgba(249, 168, 212, 0)');
      ctx.fillStyle = springGlow;
      ctx.fillRect(0, 0, backingWidth, backingHeight);

      // Gentle drifting spring coastal harbor morning mist ribbons
      for (let m = 0; m < 3; m++) {
        const mx = ((m * 380 + t * (14 + m * 5)) % (backingWidth + 320)) - 160;
        const my = backingHeight * (0.2 + m * 0.28);
        const mhGrad = ctx.createRadialGradient(mx, my, 10, mx, my, backingWidth * 0.24);
        mhGrad.addColorStop(0, 'rgba(232, 250, 244, 0.055)');
        mhGrad.addColorStop(1, 'rgba(232, 250, 244, 0)');
        ctx.fillStyle = mhGrad;
        ctx.beginPath();
        ctx.ellipse(mx, my, backingWidth * 0.24, backingHeight * 0.1, -0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (atmo.season === 'AUTUMN' && !isSnow) {
      const autumnGlow = ctx.createRadialGradient(
        backingWidth * 0.78,
        backingHeight * 0.22,
        24,
        backingWidth * 0.78,
        backingHeight * 0.22,
        backingWidth * 0.7
      );
      autumnGlow.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
      autumnGlow.addColorStop(0.6, 'rgba(217, 119, 6, 0.045)');
      autumnGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = autumnGlow;
      ctx.fillRect(0, 0, backingWidth, backingHeight);
    } else if (atmo.season === 'WINTER' || isSnow) {
      const winterGlow = ctx.createRadialGradient(
        backingWidth * 0.5,
        backingHeight * 0.15,
        20,
        backingWidth * 0.5,
        backingHeight * 0.15,
        backingWidth * 0.75
      );
      winterGlow.addColorStop(0, isSnow ? 'rgba(206, 238, 255, 0.12)' : 'rgba(186, 230, 253, 0.09)');
      winterGlow.addColorStop(1, 'rgba(186, 230, 253, 0)');
      ctx.fillStyle = winterGlow;
      ctx.fillRect(0, 0, backingWidth, backingHeight);

      // Subtle icy winter harbor frost-mist hugging the outer perimeter
      for (let m = 0; m < 3; m++) {
        const mx = ((m * 360 + t * (isSnow ? 22 : 11)) % (backingWidth + 320)) - 160;
        const my = backingHeight * (0.16 + m * 0.34);
        const fGrad = ctx.createRadialGradient(mx, my, 12, mx, my, backingWidth * 0.26);
        fGrad.addColorStop(0, isSnow ? 'rgba(220, 242, 255, 0.08)' : 'rgba(196, 232, 250, 0.045)');
        fGrad.addColorStop(1, 'rgba(196, 232, 250, 0)');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.ellipse(mx, my, backingWidth * 0.26, backingHeight * 0.11, 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (atmo.season === 'SUMMER' || isHeat) {
      const summerGlow = ctx.createRadialGradient(
        backingWidth * 0.85,
        backingHeight * 0.12,
        24,
        backingWidth * 0.85,
        backingHeight * 0.12,
        backingWidth * 0.72
      );
      summerGlow.addColorStop(0, isHeat ? 'rgba(255, 210, 88, 0.15)' : 'rgba(253, 224, 71, 0.11)');
      summerGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = summerGlow;
      ctx.fillRect(0, 0, backingWidth, backingHeight);

      // Coastal summer sea-water shimmer glints in outer harbor void
      const glintCount = isHeat ? 22 : 14;
      for (let g = 0; g < glintCount; g++) {
        const pulse = Math.max(0, Math.sin(t * (2.1 + (g % 3) * 0.5) + g * 1.9));
        if (pulse < 0.25) continue;
        const gx = ((g * 239 + 64) % Math.max(200, backingWidth - 80)) + 40;
        const gy = ((g * 163 + 48) % Math.max(160, backingHeight - 80)) + 40;
        const len = (10 + (g % 4) * 5) * pulse;
        ctx.strokeStyle = isHeat
          ? `rgba(255, 236, 168, ${(0.22 * pulse).toFixed(2)})`
          : `rgba(148, 238, 245, ${(0.16 * pulse).toFixed(2)})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(gx - len, gy);
        ctx.lineTo(gx + len, gy);
        ctx.stroke();
      }
    }

    if (!isRain && !isSnow && (atmo.season === 'SPRING' || atmo.season === 'AUTUMN')) {
      const count = 24;
      for (let i = 0; i < count; i++) {
        const px = ((i * 173 + t * (24 + (i % 5) * 7)) % (backingWidth + 80)) - 40;
        const py =
          ((i * 119 + t * (18 + (i % 4) * 6) + Math.sin(t * 1.6 + i) * 28) % (backingHeight + 60)) -
          30;
        const rot = t * 1.1 + i * 1.3;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.fillStyle =
          atmo.season === 'SPRING'
            ? 'rgba(251, 207, 232, 0.34)'
            : i % 3 === 0
              ? 'rgba(239, 68, 68, 0.30)'
              : 'rgba(245, 186, 86, 0.32)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.6, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

export function drawIsoFoundationSlab(
  ctx: CanvasRenderingContext2D,
  frontW: number,
  frontH: number,
  unifiedMinY: number,
  unifiedMaxX: number
) {
  const backD = Math.abs(unifiedMinY);

  // Soft two-tier floating architectural cutaway drop shadow
  drawIsoQuadFlat(ctx, 24, unifiedMinY + 24, unifiedMaxX, backD, -26, 'rgba(3, 9, 10, 0.34)');
  drawIsoQuadFlat(ctx, 24, 24, frontW, frontH, -26, 'rgba(3, 9, 10, 0.34)');
  drawIsoQuadFlat(ctx, 13, unifiedMinY + 13, unifiedMaxX, backD, -23, 'rgba(4, 10, 11, 0.48)');
  drawIsoQuadFlat(ctx, 13, 13, frontW, frontH, -23, 'rgba(4, 10, 11, 0.48)');

  // Lower dark slate subfloor stratum (-22 .. -8)
  drawIsoBoxFlat(
    ctx,
    0,
    unifiedMinY,
    unifiedMaxX,
    backD,
    14,
    { top: '#2E2219', left: '#231A14', right: '#18110D', stroke: INK, lineWidth: 1.4 },
    -22
  );
  drawIsoBoxFlat(
    ctx,
    0,
    0,
    frontW,
    frontH,
    14,
    { top: '#2E2219', left: '#231A14', right: '#18110D', stroke: INK, lineWidth: 1.4 },
    -22
  );

  // Upper warm walnut architectural fascia band (-8 .. 0)
  drawIsoBoxFlat(
    ctx,
    0,
    unifiedMinY,
    unifiedMaxX,
    backD,
    8,
    { top: '#4B3220', left: '#4D3220', right: '#382416', stroke: INK, lineWidth: 1.2 },
    -8
  );
  drawIsoBoxFlat(
    ctx,
    0,
    0,
    frontW,
    frontH,
    8,
    { top: '#4B3220', left: '#4D3220', right: '#382416', stroke: INK, lineWidth: 1.2 },
    -8
  );
}

// ==========================================
// 2. ARCHITECTURAL FLOORS, DRAIN GRATES & CONTACT AO
// ==========================================

function drawFloorDrainGrate(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  horizontal: boolean
) {
  drawIsoQuadFlat(ctx, wx, wy, w, d, 0.35, '#8A9699', '#384245', 0.9);
  drawIsoQuadFlat(ctx, wx + 1.5, wy + 1.5, w - 3, d - 3, 0.42, '#505A5E');
  ctx.save();
  ctx.strokeStyle = '#BCC7CA';
  ctx.lineWidth = 0.85;
  if (horizontal) {
    for (let sx = wx + 5; sx < wx + w - 3; sx += 5) {
      const a = w2i(sx, wy + 1.5, 0.48);
      const b = w2i(sx, wy + d - 1.5, 0.48);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  } else {
    for (let sy = wy + 5; sy < wy + d - 3; sy += 5) {
      const a = w2i(wx + 1.5, sy, 0.48);
      const b = w2i(wx + w - 1.5, sy, 0.48);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawWallBaseAO(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  alongX: boolean
) {
  const p0 = w2i(wx, wy, 0.25);
  const p1 = w2i(wx + w, wy, 0.25);
  const p2 = w2i(wx + w, wy + d, 0.25);
  const p3 = w2i(wx, wy + d, 0.25);

  const grad = alongX
    ? ctx.createLinearGradient(p0.x, p0.y, p3.x, p3.y)
    : ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
  grad.addColorStop(0, 'rgba(22, 14, 9, 0.28)');
  grad.addColorStop(0.55, 'rgba(22, 14, 9, 0.09)');
  grad.addColorStop(1, 'rgba(22, 14, 9, 0)');
  drawPoly(ctx, [p0, p1, p2, p3], grad);
}

function drawWovenWelcomeCarpet(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  d: number,
  decorId = 'harbor_warm'
) {
  const palette =
    decorId === 'retro_mahogany'
      ? { outer: '#5E1818', outerStroke: '#380C0C', mid: '#7E2120', gold: '#F2C96B', inner: '#6D1A1A', medFill: 'rgba(242, 201, 107, 0.2)', medStroke: 'rgba(250, 218, 128, 0.56)' }
      : decorId === 'obsidian_sushi'
        ? { outer: '#222831', outerStroke: '#12161B', mid: '#2F3845', gold: '#E8927C', inner: '#262E38', medFill: 'rgba(232, 146, 124, 0.16)', medStroke: 'rgba(244, 178, 162, 0.48)' }
        : decorId === 'azure_luxury'
          ? { outer: '#1C5662', outerStroke: '#0E323A', mid: '#266C78', gold: '#E8D2A0', inner: '#205D68', medFill: 'rgba(182, 240, 232, 0.18)', medStroke: 'rgba(232, 210, 160, 0.54)' }
          : { outer: '#7D2820', outerStroke: '#4A1510', mid: '#963228', gold: '#D9B166', inner: '#8A2B22', medFill: 'rgba(217, 177, 102, 0.14)', medStroke: 'rgba(232, 201, 122, 0.42)' };

  // Subtle carpet drop shadow
  drawIsoQuadFlat(ctx, wx + 2, wy + 2, w, d, 0.2, 'rgba(24, 12, 8, 0.24)');
  // Outer border
  drawIsoQuadFlat(ctx, wx, wy, w, d, 0.42, palette.outer, palette.outerStroke, 1.15);
  // Inner trim line
  drawIsoQuadFlat(ctx, wx + 5, wy + 5, w - 10, d - 10, 0.48, palette.mid, palette.gold, 1.0);
  // Geometric corner fret accents
  drawIsoQuadFlat(ctx, wx + 11, wy + 11, w - 22, d - 22, 0.52, palette.inner, palette.medStroke, 0.75);

  // Subtle woven diamond center medallions along runner length
  for (let cy = wy + 48; cy < wy + d - 34; cy += 68) {
    const cx = wx + w * 0.5;
    const pts = [
      w2i(cx, cy - 15, 0.56),
      w2i(cx + 15, cy, 0.56),
      w2i(cx, cy + 15, 0.56),
      w2i(cx - 15, cy, 0.56),
    ];
    drawPoly(ctx, pts, palette.medFill, palette.medStroke, 0.8);
  }
}

function drawFloorLightPool(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  radius: number,
  intensity: number,
  tint = '255, 214, 132'
) {
  if (intensity <= 0.02) return;
  const c = w2i(wx, wy, 0.35);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(1, 0.52);
  const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, radius);
  grad.addColorStop(0, `rgba(${tint}, ${(0.22 * intensity).toFixed(3)})`);
  grad.addColorStop(0.52, `rgba(${tint}, ${(0.09 * intensity).toFixed(3)})`);
  grad.addColorStop(1, `rgba(${tint}, 0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWindowSunbeamEast(
  ctx: CanvasRenderingContext2D,
  wyStart: number,
  spanY: number,
  reachX: number,
  strength: number,
  warmDusk: boolean
) {
  if (strength <= 0.04) return;
  const p0 = w2i(4, wyStart, 0.35);
  const p1 = w2i(4, wyStart + spanY, 0.35);
  const p2 = w2i(4 + reachX, wyStart + spanY + reachX * 0.26, 0.35);
  const p3 = w2i(4 + reachX, wyStart + reachX * 0.26, 0.35);
  const grad = ctx.createLinearGradient(p0.x, p0.y, p2.x, p2.y);
  const rgb = warmDusk ? '255, 198, 118' : '255, 240, 196';
  grad.addColorStop(0, `rgba(${rgb}, ${(0.22 * strength).toFixed(3)})`);
  grad.addColorStop(0.58, `rgba(${rgb}, ${(0.08 * strength).toFixed(3)})`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  drawPoly(ctx, [p0, p1, p2, p3], grad);
}

export function drawIsoSceneFloors(
  ctx: CanvasRenderingContext2D,
  _world: GameWorld,
  decorId: string,
  frontW: number,
  frontH: number,
  activeBackstageRoom: FacilitySceneId | null,
  hoverPos: { x: number; y: number } | null,
  unifiedMinY: number,
  unifiedMaxX: number,
  backstageOffsetY: number,
  atmo?: SceneAtmosphere
) {
  const backD = Math.abs(backstageOffsetY);
  const { sunStrength, lanternGlow, isWarmDusk } = computeAtmosphereWeights(atmo);

  // 1. Backstage Wing Subfloor & Central Terrazzo Corridor
  drawIsoQuadFlat(ctx, 0, unifiedMinY, unifiedMaxX, backD, 0, '#5A4738');
  fillIsoFloorTextured(
    ctx,
    BACKSTAGE_CORRIDOR.x,
    BACKSTAGE_CORRIDOR.y + backstageOffsetY,
    BACKSTAGE_CORRIDOR.w,
    BACKSTAGE_CORRIDOR.h,
    'terrazzo_stone',
    0.05
  );

  // 2. Distinct Architectural Textured Floor for each of the 7 Backstage Rooms
  const roomTextures: Record<FacilitySceneId, TextureKey> = {
    cold_storage: 'cold_slate',
    hot_kitchen: 'kitchen_quarry',
    dish_washroom: 'celadon_floor',
    office: 'office_walnut',
    restroom: 'celadon_floor',
    equipment_room: 'equipment_concrete',
    dormitory: 'dorm_oak',
  };

  for (const r of BACKSTAGE_ROOMS) {
    const rwy = r.y + backstageOffsetY;
    fillIsoFloorTextured(ctx, r.x, rwy, r.w, r.h, roomTextures[r.id], 0.05);

    // Subtle room-specific architectural floor insets
    if (r.id === 'cold_storage') {
      drawFloorDrainGrate(ctx, r.x + 22, rwy + r.h - 32, r.w - 44, 11, true);
    } else if (r.id === 'hot_kitchen') {
      drawFloorDrainGrate(ctx, r.x + 26, rwy + 124, r.w - 52, 10, true);
    } else if (r.id === 'dish_washroom') {
      drawFloorDrainGrate(ctx, r.x + 28, rwy + r.h - 34, r.w - 56, 10, true);
    } else if (r.id === 'equipment_room') {
      // Subtle industrial safety zone border painted on concrete floor
      drawIsoQuadFlat(
        ctx,
        r.x + 16,
        rwy + 16,
        r.w - 32,
        r.h - 32,
        0.18,
        'rgba(0,0,0,0)',
        'rgba(217, 169, 68, 0.42)',
        1.1
      );
    } else if (r.id === 'dormitory') {
      // Cozy woven tatami / lounge rug under the tea area
      drawIsoQuadFlat(
        ctx,
        r.x + 56,
        rwy + 114,
        148,
        92,
        0.22,
        '#9E7E5D',
        '#6E5238',
        1.0
      );
      drawIsoQuadFlat(
        ctx,
        r.x + 62,
        rwy + 120,
        136,
        80,
        0.26,
        '#B69672',
        'rgba(232, 201, 122, 0.35)',
        0.75
      );
    } else if (r.id === 'office') {
      // Elegant muted teal-gold desk rug
      drawIsoQuadFlat(
        ctx,
        r.x + 34,
        rwy + 92,
        144,
        106,
        0.22,
        '#365955',
        '#C9A45C',
        1.0
      );
    }

    // Room hover / active selection architectural outline
    const isHov =
      hoverPos !== null &&
      hoverPos.x >= r.x &&
      hoverPos.x <= r.x + r.w &&
      hoverPos.y >= rwy &&
      hoverPos.y <= rwy + r.h;

    if (isHov || activeBackstageRoom === r.id) {
      drawIsoQuadFlat(
        ctx,
        r.x + 2,
        rwy + 2,
        r.w - 4,
        r.h - 4,
        0.38,
        isHov ? 'rgba(253, 224, 71, 0.11)' : 'rgba(232, 201, 122, 0.08)',
        isHov ? '#FDE047' : '#D9B166',
        1.5
      );
    }
  }

  // 3. Front Dining Hall Textured Floors
  const parquetKey: TextureKey =
    decorId === 'retro_mahogany'
      ? 'parquet_mahogany'
      : decorId === 'obsidian_sushi'
        ? 'parquet_obsidian'
        : decorId === 'azure_luxury'
          ? 'parquet_azure'
          : 'parquet_classic';

  // Upper Front Kitchen & Prep Service Walkway (warm stone terrazzo, y = 0..124)
  fillIsoFloorTextured(ctx, 0, 0, CANVAS_WIDTH, 124, 'terrazzo_stone', 0);

  // Main Dining Hall Honey-Cedar Parquet Floor (y = 124..frontH, x = 0..frontW)
  fillIsoFloorTextured(ctx, 0, 124, frontW, frontH - 124, parquetKey, 0);

  // Theme-distinct floor sheen & decorative architectural floor overlay across center dining hall
  const hallCenter = w2i(frontW * 0.48, frontH * 0.54, 0.12);
  ctx.save();
  const floorSheen = ctx.createRadialGradient(
    hallCenter.x,
    hallCenter.y,
    24,
    hallCenter.x,
    hallCenter.y,
    Math.max(frontW, frontH) * 0.42
  );
  if (decorId === 'retro_mahogany') {
    floorSheen.addColorStop(0, 'rgba(246, 190, 108, 0.13)');
    floorSheen.addColorStop(0.6, 'rgba(138, 42, 24, 0.08)');
    floorSheen.addColorStop(1, 'rgba(24, 8, 6, 0.16)');
  } else if (decorId === 'obsidian_sushi') {
    floorSheen.addColorStop(0, 'rgba(238, 172, 152, 0.09)');
    floorSheen.addColorStop(0.55, 'rgba(24, 32, 42, 0.14)');
    floorSheen.addColorStop(1, 'rgba(8, 12, 18, 0.24)');
  } else if (decorId === 'azure_luxury') {
    floorSheen.addColorStop(0, 'rgba(164, 242, 232, 0.13)');
    floorSheen.addColorStop(0.6, 'rgba(42, 118, 128, 0.08)');
    floorSheen.addColorStop(1, 'rgba(10, 32, 42, 0.14)');
  } else {
    floorSheen.addColorStop(0, 'rgba(255, 240, 206, 0.09)');
    floorSheen.addColorStop(0.6, 'rgba(255, 232, 190, 0.02)');
    floorSheen.addColorStop(1, 'rgba(18, 10, 6, 0.08)');
  }
  drawIsoQuadFlat(ctx, 0, 124, frontW, frontH - 124, 0.14, floorSheen);

  // Subtle theme-signature inlaid floor ornament frame inside the dining hall
  if (decorId === 'retro_mahogany') {
    drawIsoQuadFlat(ctx, 26, 144, frontW - 52, frontH - 170, 0.2, 'rgba(0,0,0,0)', 'rgba(232, 184, 86, 0.42)', 1.25);
  } else if (decorId === 'obsidian_sushi') {
    // Minimalist Zen tatami-stone linear seam lines
    for (let zx = 180; zx < frontW - 80; zx += 220) {
      const a = w2i(zx, 132, 0.22);
      const b = w2i(zx, frontH - 18, 0.22);
      ctx.strokeStyle = 'rgba(232, 146, 124, 0.18)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  } else if (decorId === 'azure_luxury') {
    // Champagne-gold & seafoam pearl perimeter inlay framing the oceanfront hall
    drawIsoQuadFlat(ctx, 22, 140, frontW - 44, frontH - 162, 0.2, 'rgba(130, 224, 214, 0.05)', 'rgba(176, 240, 232, 0.48)', 1.2);
  }
  ctx.restore();

  // Expanded Lv.2+ East Wing North Parquet Floor (x = 960..frontW, y = 0..124)
  if (frontW > CANVAS_WIDTH) {
    fillIsoFloorTextured(ctx, CANVAS_WIDTH, 0, frontW - CANVAS_WIDTH, 124, parquetKey, 0);
    // Brass expansion seam inlay + decorative medallions along x = 960
    drawIsoQuadFlat(ctx, CANVAS_WIDTH - 2.5, 10, 5, frontH - 20, 0.35, '#9A7843', '#523A1C', 0.7);
  }

  // Subtle brass expansion seam inlay along y = 640 (Lv.3+ South Pavilion)
  if (frontH > CANVAS_HEIGHT) {
    drawIsoQuadFlat(ctx, 12, CANVAS_HEIGHT - 2.5, frontW - 24, 5, 0.35, '#9A7843', '#523A1C', 0.7);
  }

  // Crisp themed threshold divider between Kitchen Terrazzo Strip and Dining Parquet!
  const threshWood =
    decorId === 'retro_mahogany'
      ? '#641F1B'
      : decorId === 'obsidian_sushi'
        ? '#2B313B'
        : decorId === 'azure_luxury'
          ? '#245863'
          : '#7C5332';
  const threshInlay =
    decorId === 'obsidian_sushi'
      ? '#E8927C'
      : decorId === 'azure_luxury'
        ? '#A8EFE4'
        : '#C9A15A';
  drawIsoQuadFlat(ctx, 0, 121.5, CANVAS_WIDTH, 5, 0.32, threshWood, INK, 0.8);
  drawIsoQuadFlat(ctx, 0, 123.5, CANVAS_WIDTH, 1.4, 0.38, threshInlay);

  // Signature Linear Stainless Floor Drainage Grates along the wet prep / aquarium service aisle
  drawFloorDrainGrate(ctx, 74, 108, 178, 10, true);
  drawFloorDrainGrate(ctx, 290, 108, 185, 10, true);
  drawFloorDrainGrate(ctx, 520, 108, 195, 10, true);

  // Lv.2..Lv.5 Architectural Floor Trim & Gilded Border Progression
  const shopLvl = _world.shopLevel;
  if (shopLvl >= 2) {
    // Carved walnut perimeter floor border framing main dining area
    drawIsoQuadFlat(
      ctx,
      14,
      132,
      frontW - 28,
      frontH - 146,
      0.26,
      'rgba(0,0,0,0)',
      shopLvl >= 4 ? 'rgba(218, 174, 86, 0.62)' : 'rgba(116, 76, 40, 0.48)',
      shopLvl >= 4 ? 1.6 : 1.15
    );
  }
  if (shopLvl >= 3) {
    // Inner antique-brass double inlay trim & corner medallions for grand hall ambiance
    drawIsoQuadFlat(
      ctx,
      20,
      138,
      frontW - 40,
      frontH - 158,
      0.28,
      'rgba(0,0,0,0)',
      shopLvl >= 4 ? 'rgba(244, 210, 122, 0.52)' : 'rgba(196, 152, 74, 0.44)',
      1.0
    );
    const corners: Array<[number, number]> = [
      [20, 138],
      [frontW - 34, 138],
      [20, frontH - 34],
      [frontW - 34, frontH - 34],
    ];
    for (const [cx, cy] of corners) {
      drawIsoQuadFlat(ctx, cx, cy, 14, 14, 0.3, 'rgba(214, 168, 78, 0.24)', '#C99A44', 0.9);
      drawIsoQuadFlat(ctx, cx + 3.5, cy + 3.5, 7, 7, 0.32, 'rgba(246, 218, 138, 0.34)', '#9A6D2A', 0.7);
    }
  }

  // Exterior Harbor-Stone Waiting Veranda directly outside the Front Entrance Gate!
  const entrance = getFrontHallEntranceLayout(_world.shopLevel);
  const ver = entrance.veranda;
  const isRainVer = atmo?.weather === 'RAINY' || atmo?.weather === 'TYPHOON';
  const isSnowVer = atmo?.weather === 'SNOWY' || atmo?.season === 'WINTER';
  // Drop shadow & stepped granite foundation under exterior veranda
  drawIsoQuadFlat(ctx, ver.x + 10, ver.y + 10, ver.w, ver.h, -18, 'rgba(3, 9, 10, 0.36)');
  drawIsoBoxFlat(
    ctx,
    ver.x,
    ver.y,
    ver.w,
    ver.h,
    12,
    {
      top: isSnowVer ? '#CADBE3' : isRainVer ? '#63767E' : '#9B9485',
      left: isSnowVer ? '#8DA0AB' : '#5E584D',
      right: isSnowVer ? '#6B7E8A' : '#443F37',
      stroke: INK,
      lineWidth: 1.1,
    },
    -12
  );
  // Hand-painted weathered coastal harbor flagstone texture across the exterior waiting veranda
  const verandaTexKey: TextureKey = isSnowVer
    ? 'harbor_stone_snow'
    : isRainVer
      ? 'harbor_stone_rain'
      : 'harbor_stone';
  fillIsoFloorTextured(
    ctx,
    ver.x + 3,
    ver.y + 3,
    ver.w - 6,
    ver.h - 6,
    verandaTexKey,
    0.25,
    'rgba(46, 38, 30, 0.5)',
    0.95
  );

  // Weather & seasonal surface details distributed across the full length of the exterior entrance veranda!
  const verTime = atmo?.timeSec ?? 0;
  const lengthFactor = Math.max(1, Math.round(ver.w / 240));
  if (isRainVer) {
    // Glossy wet rain puddles + animated expanding raindrop ripple rings
    const puddleCount = 4 + lengthFactor * 3;
    for (let r = 0; r < puddleCount; r++) {
      const rx = ver.x + 28 + ((r * 73) % Math.max(40, ver.w - 56));
      const ry = ver.y + 18 + ((r * 31) % Math.max(24, ver.h - 32));
      const rp = w2i(rx, ry, 0.55);
      const phase = (verTime * 1.45 + r * 0.29) % 1;
      ctx.fillStyle = 'rgba(130, 184, 210, 0.22)';
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, 13, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(218, 245, 255, ${(0.72 * (1 - phase)).toFixed(2)})`;
      ctx.lineWidth = 0.95;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, 2.5 + phase * 11, 1.2 + phase * 5.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (isSnowVer) {
    // Soft white snowdrifts settled evenly along the exterior veranda edges
    const driftCount = 4 + lengthFactor * 2;
    for (let s = 0; s < driftCount; s++) {
      const tFrac = driftCount > 1 ? s / (driftCount - 1) : 0.5;
      const sx = ver.x + 24 + tFrac * (ver.w - 56);
      const sy = s % 2 === 0 ? ver.y + 20 : ver.y + ver.h - 17;
      const rw = 20 + (s % 3) * 4;
      const rh = 9 + (s % 2) * 2;
      const sp = w2i(sx, sy, 0.65);
      ctx.fillStyle = 'rgba(244, 251, 255, 0.86)';
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (atmo?.season === 'AUTUMN') {
    // Scattered golden ginkgo & crimson maple leaves across the full exterior veranda
    const leafCount = 10 + lengthFactor * 6;
    for (let l = 0; l < leafCount; l++) {
      const lx = ver.x + 16 + ((l * 53) % Math.max(30, ver.w - 32));
      const ly = ver.y + 12 + ((l * 29) % Math.max(20, ver.h - 24));
      const lp = w2i(lx, ly, 0.6);
      ctx.fillStyle = l % 3 === 0 ? '#D94E28' : l % 2 === 0 ? '#EAB308' : '#F59E0B';
      ctx.beginPath();
      ctx.ellipse(lp.x, lp.y, 3.2, 1.8, (l * 0.7) % Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (atmo?.season === 'SPRING') {
    // Fallen soft pink cherry blossom petals scattered across the full exterior veranda
    const petalCount = 10 + lengthFactor * 6;
    for (let l = 0; l < petalCount; l++) {
      const lx = ver.x + 16 + ((l * 49) % Math.max(30, ver.w - 32));
      const ly = ver.y + 12 + ((l * 31) % Math.max(20, ver.h - 24));
      const lp = w2i(lx, ly, 0.6);
      ctx.fillStyle = l % 2 === 0 ? 'rgba(251, 182, 206, 0.85)' : 'rgba(253, 218, 232, 0.9)';
      ctx.beginPath();
      ctx.ellipse(lp.x, lp.y, 2.8, 1.5, (l * 0.9) % Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (atmo?.weather === 'HEATWAVE' || atmo?.season === 'SUMMER') {
    // Warm golden sunlit patches & coastal glare glints across the summer flagstone veranda
    const isHeatVer = atmo?.weather === 'HEATWAVE';
    const patchCount = 3 + lengthFactor * 2;
    for (let p = 0; p < patchCount; p++) {
      const px = ver.x + 28 + ((p * 89) % Math.max(40, ver.w - 56));
      const py = ver.y + 14 + ((p * 27) % Math.max(20, ver.h - 28));
      const sp = w2i(px, py, 0.55);
      const pulse = 0.72 + Math.sin(verTime * 2.2 + p * 1.4) * 0.28;
      ctx.fillStyle = isHeatVer
        ? `rgba(255, 224, 128, ${(0.2 * pulse).toFixed(2)})`
        : `rgba(255, 240, 188, ${(0.12 * pulse).toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, isHeatVer ? 22 : 16, isHeatVer ? 9.5 : 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Woven Themed Welcome Carpet Runner leading seamlessly from outdoor veranda through gate to Reception Desk!
  drawWovenWelcomeCarpet(
    ctx,
    entrance.carpet.x,
    entrance.carpet.y,
    entrance.carpet.w,
    entrance.carpet.h,
    decorId
  );

  // Brass queue stanchion posts & burgundy velvet rope spaced evenly along the full exterior waiting veranda
  const ropeY = ver.y + ver.h - 14;
  const spanLen = Math.max(80, ver.w - 36);
  const segCount = Math.max(4, Math.round(spanLen / 92));
  const postXs: number[] = [];
  for (let i = 0; i <= segCount; i++) {
    postXs.push(ver.x + 18 + (spanLen * i) / segCount);
  }
  ctx.save();
  for (let i = 0; i < postXs.length; i++) {
    const pb = w2i(postXs[i], ropeY, 0.5);
    const pt = w2i(postXs[i], ropeY, 18);
    ctx.fillStyle = '#B8893A';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.ellipse(pb.x, pb.y, 3.2, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#D9B166';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(pb.x, pb.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.fillStyle = '#F5D684';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (i > 0) {
      const prevTop = w2i(postXs[i - 1], ropeY, 15);
      const curTop = w2i(postXs[i], ropeY, 15);
      const midX = (prevTop.x + curTop.x) * 0.5;
      const midY = (prevTop.y + curTop.y) * 0.5 + 5.5;
      ctx.strokeStyle = '#9E2620';
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(prevTop.x, prevTop.y);
      ctx.quadraticCurveTo(midX, midY, curTop.x, curTop.y);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Seamless Wood-Framed Connecting Archway Floor Runners (3 front-back passages!)
  for (const arch of FRONT_BACK_ARCHWAYS) {
    const ax = arch.x - arch.halfWidth + 2;
    const aw = (arch.halfWidth - 2) * 2;
    drawIsoQuadFlat(ctx, ax, -46, aw, 168, 0.3, '#A88258', '#6B4829', 0.9);
    // Brass doorway saddle threshold bar right inside the partition wall
    drawIsoQuadFlat(ctx, ax + 2, -16, aw - 4, 10, 0.45, '#C49A56', '#5C3D1C', 0.85);
  }

  // 4. Wall-Base Soft Ambient Occlusion Contact Shadows (grounds walls crisply to floors!)
  drawWallBaseAO(ctx, 0, unifiedMinY, unifiedMaxX, 18, true);
  drawWallBaseAO(ctx, 0, unifiedMinY, 18, frontH - unifiedMinY, false);
  drawWallBaseAO(ctx, 0, 0, frontW, 16, true);
  // Interior backstage divider contact AO
  drawWallBaseAO(ctx, 24, 285 + backstageOffsetY, 912, 13, true);
  drawWallBaseAO(ctx, 24, 362 + backstageOffsetY, 912, 13, true);
  for (const divX of [254, 484, 714]) {
    drawWallBaseAO(ctx, divX, unifiedMinY + 20, 12, 256, false);
  }
  drawWallBaseAO(ctx, 328, 362 + backstageOffsetY, 12, 280, false);
  drawWallBaseAO(ctx, 640, 362 + backstageOffsetY, 12, 280, false);

  // 5. Volumetric Diagonal Sunlight Shafts from West Lattice Windows (daytime / golden hour)
  if (sunStrength > 0.08) {
    drawWindowSunbeamEast(ctx, 290, 86, 175, sunStrength, isWarmDusk);
    drawWindowSunbeamEast(ctx, 456, 86, 175, sunStrength, isWarmDusk);
    if (frontH > CANVAS_HEIGHT) {
      drawWindowSunbeamEast(ctx, CANVAS_HEIGHT + 34, 86, 175, sunStrength, isWarmDusk);
    }
  }

  // 6. Soft Warm Interior Lantern Floor Pools (intensifies during dusk, evening & rain/snow!)
  const poolTint =
    decorId === 'azure_luxury'
      ? '158, 240, 228'
      : decorId === 'obsidian_sushi'
        ? '255, 168, 146'
        : decorId === 'retro_mahogany'
          ? '255, 192, 104'
          : '255, 210, 126';
  const poolScale = lanternGlow * 0.85;
  drawFloorLightPool(ctx, 165, 36, 95, poolScale, poolTint);
  drawFloorLightPool(ctx, 510, 36, 105, poolScale, poolTint);
  drawFloorLightPool(ctx, 830, 36, 95, poolScale, poolTint);
  drawFloorLightPool(ctx, 46, 224, 92, poolScale, poolTint);
  drawFloorLightPool(ctx, 46, 446, 92, poolScale, poolTint);
  drawFloorLightPool(ctx, 480, 360, 145, poolScale * 0.65, poolTint);
  if (frontW > CANVAS_WIDTH) {
    drawFloorLightPool(ctx, CANVAS_WIDTH + (frontW - CANVAS_WIDTH) * 0.5, 260, 130, poolScale * 0.75, poolTint);
  }
  if (frontH > CANVAS_HEIGHT) {
    drawFloorLightPool(ctx, frontW * 0.45, CANVAS_HEIGHT + (frontH - CANVAS_HEIGHT) * 0.5, 135, poolScale * 0.72, poolTint);
  }
}

// ==========================================
// 3. ARCHITECTURAL CUTAWAY WALLS, WAINSCOTING, SCREENS & WINDOWS
// ==========================================

/**
 * Draws a refined wooden lattice window mounted flush on a South-facing back wall.
 */
function drawWallLatticeWindowSouth(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  zBottom: number,
  zHeight: number,
  warmGlow = true,
  atmo?: SceneAtmosphere
) {
  const { isRain, isSnow, eveningness, isWarmDusk } = computeAtmosphereWeights(atmo);
  const frameColor = '#5E3A21';
  const t0 = w2i(wx, wy, zBottom + zHeight);
  const t1 = w2i(wx + w, wy, zBottom + zHeight);
  const b1 = w2i(wx + w, wy, zBottom);
  const b0 = w2i(wx, wy, zBottom);

  // Outer timber frame
  drawPoly(ctx, [t0, t1, b1, b0], frameColor, INK, 1.0);

  // Recessed paper/glass pane reacting dynamically to weather & time of day
  const pad = 3.2;
  const g0 = w2i(wx + pad, wy, zBottom + zHeight - pad);
  const g1 = w2i(wx + w - pad, wy, zBottom + zHeight - pad);
  const g2 = w2i(wx + w - pad, wy, zBottom + pad);
  const g3 = w2i(wx + pad, wy, zBottom + pad);
  const grad = ctx.createLinearGradient(g0.x, g0.y, g3.x, g3.y);
  if (isRain) {
    grad.addColorStop(0, '#7CA5B8');
    grad.addColorStop(1, '#4C7388');
  } else if (isSnow) {
    grad.addColorStop(0, '#E4F2F8');
    grad.addColorStop(1, '#B3D3E3');
  } else if (eveningness > 0.65) {
    grad.addColorStop(0, '#F6C66F');
    grad.addColorStop(1, '#D38C3D');
  } else if (isWarmDusk) {
    grad.addColorStop(0, '#FAD79A');
    grad.addColorStop(1, '#E0A463');
  } else if (warmGlow) {
    grad.addColorStop(0, '#FAF0D4');
    grad.addColorStop(1, '#E5CA94');
  } else {
    grad.addColorStop(0, '#CFE3E4');
    grad.addColorStop(1, '#9EBFC4');
  }
  drawPoly(ctx, [g0, g1, g2, g3], grad, '#4A2C18', 0.85);

  // Dynamic weather & seasonal pane details: sliding rain streaks, winter frost corners, or summer sun glints
  if (isRain) {
    const wt = atmo?.timeSec ?? 0;
    const speed = atmo?.weather === 'TYPHOON' ? 2.6 : 1.5;
    ctx.save();
    ctx.strokeStyle = 'rgba(220, 244, 255, 0.5)';
    ctx.lineWidth = 0.8;
    for (let r = 0; r < 5; r++) {
      const slide = (wt * speed + r * 0.27) % 1;
      const rx = wx + pad + 6 + r * ((w - pad * 2 - 10) / 4.2);
      const zStart = zBottom + zHeight - pad - 1 - slide * (zHeight * 0.45);
      const zEnd = Math.max(zBottom + pad + 1, zStart - zHeight * 0.42);
      const ra = w2i(rx, wy, zStart);
      const rb = w2i(rx - (atmo?.weather === 'TYPHOON' ? 6.5 : 3.8), wy, zEnd);
      ctx.beginPath();
      ctx.moveTo(ra.x, ra.y);
      ctx.lineTo(rb.x, rb.y);
      ctx.stroke();
    }
    ctx.restore();
  } else if (isSnow || atmo?.season === 'WINTER') {
    // Delicate frosted-glass corner ice sheen on cold winter panes
    ctx.save();
    const frostGrad = ctx.createLinearGradient(g3.x, g3.y, g1.x, g1.y);
    frostGrad.addColorStop(0, isSnow ? 'rgba(240, 250, 255, 0.56)' : 'rgba(232, 246, 255, 0.34)');
    frostGrad.addColorStop(0.38, 'rgba(224, 244, 255, 0.06)');
    frostGrad.addColorStop(1, 'rgba(240, 250, 255, 0.24)');
    drawPoly(ctx, [g0, g1, g2, g3], frostGrad);
    ctx.restore();
  } else if (atmo?.weather === 'HEATWAVE' || atmo?.season === 'SUMMER' || atmo?.season === 'AUTUMN') {
    // Crisp diagonal sunlit glass reflection band
    ctx.save();
    const gl0 = w2i(wx + pad + w * 0.18, wy, zBottom + zHeight - pad - 1);
    const gl1 = w2i(wx + pad + w * 0.38, wy, zBottom + zHeight - pad - 1);
    const gl2 = w2i(wx + pad + w * 0.12, wy, zBottom + pad + 1);
    const gl3 = w2i(wx + pad + 1, wy, zBottom + pad + 1);
    drawPoly(
      ctx,
      [gl0, gl1, gl2, gl3],
      atmo?.weather === 'HEATWAVE'
        ? 'rgba(255, 248, 206, 0.32)'
        : atmo?.season === 'AUTUMN'
          ? 'rgba(255, 224, 152, 0.22)'
          : 'rgba(255, 252, 232, 0.22)'
    );
    ctx.restore();
  }

  // Fine architectural wooden lattice mullions
  ctx.save();
  ctx.strokeStyle = '#6B4326';
  ctx.lineWidth = 1.05;
  const cols = Math.max(3, Math.round(w / 16));
  for (let i = 1; i < cols; i++) {
    const mx = wx + pad + ((w - pad * 2) * i) / cols;
    const pTop = w2i(mx, wy, zBottom + zHeight - pad);
    const pBot = w2i(mx, wy, zBottom + pad);
    ctx.beginPath();
    ctx.moveTo(pTop.x, pTop.y);
    ctx.lineTo(pBot.x, pBot.y);
    ctx.stroke();
  }
  const midZ = zBottom + zHeight * 0.5;
  const mL = w2i(wx + pad, wy, midZ);
  const mR = w2i(wx + w - pad, wy, midZ);
  ctx.beginPath();
  ctx.moveTo(mL.x, mL.y);
  ctx.lineTo(mR.x, mR.y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws a refined wooden lattice window mounted flush on an East-facing left wall.
 */
function drawWallLatticeWindowEast(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  d: number,
  zBottom: number,
  zHeight: number,
  atmo?: SceneAtmosphere
) {
  const { isRain, isSnow, eveningness, isWarmDusk } = computeAtmosphereWeights(atmo);
  const t0 = w2i(wx, wy, zBottom + zHeight);
  const t1 = w2i(wx, wy + d, zBottom + zHeight);
  const b1 = w2i(wx, wy + d, zBottom);
  const b0 = w2i(wx, wy, zBottom);
  drawPoly(ctx, [t0, t1, b1, b0], '#54341D', INK, 1.0);

  const pad = 3.2;
  const g0 = w2i(wx, wy + pad, zBottom + zHeight - pad);
  const g1 = w2i(wx, wy + d - pad, zBottom + zHeight - pad);
  const g2 = w2i(wx, wy + d - pad, zBottom + pad);
  const g3 = w2i(wx, wy + pad, zBottom + pad);
  const grad = ctx.createLinearGradient(g0.x, g0.y, g3.x, g3.y);
  if (isRain) {
    grad.addColorStop(0, '#729CB0');
    grad.addColorStop(1, '#446A7E');
  } else if (isSnow) {
    grad.addColorStop(0, '#DFEFF6');
    grad.addColorStop(1, '#A7CADB');
  } else if (eveningness > 0.65) {
    grad.addColorStop(0, '#F3BF67');
    grad.addColorStop(1, '#C98336');
  } else if (isWarmDusk) {
    grad.addColorStop(0, '#F5CE8C');
    grad.addColorStop(1, '#D89A58');
  } else {
    grad.addColorStop(0, '#F4E2BC');
    grad.addColorStop(1, '#D8B984');
  }
  drawPoly(ctx, [g0, g1, g2, g3], grad, '#4A2C18', 0.85);

  if (isRain) {
    ctx.save();
    ctx.strokeStyle = 'rgba(216, 240, 255, 0.38)';
    ctx.lineWidth = 0.75;
    for (let r = 0; r < 4; r++) {
      const ry = wy + pad + 10 + r * ((d - pad * 2 - 16) / 3.5);
      const ra = w2i(wx, ry, zBottom + zHeight - pad - 2);
      const rb = w2i(wx, ry + 6, zBottom + pad + 2);
      ctx.beginPath();
      ctx.moveTo(ra.x, ra.y);
      ctx.lineTo(rb.x, rb.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = '#643E23';
  ctx.lineWidth = 1.05;
  const cols = Math.max(3, Math.round(d / 16));
  for (let i = 1; i < cols; i++) {
    const my = wy + pad + ((d - pad * 2) * i) / cols;
    const pTop = w2i(wx, my, zBottom + zHeight - pad);
    const pBot = w2i(wx, my, zBottom + pad);
    ctx.beginPath();
    ctx.moveTo(pTop.x, pTop.y);
    ctx.lineTo(pBot.x, pBot.y);
    ctx.stroke();
  }
  const midZ = zBottom + zHeight * 0.5;
  const mL = w2i(wx, wy + pad, midZ);
  const mR = w2i(wx, wy + d - pad, midZ);
  ctx.beginPath();
  ctx.moveTo(mL.x, mL.y);
  ctx.lineTo(mR.x, mR.y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws the signature 4-panel Traditional Landscape Folding Screen (山水屏风) from style_isometric_tycoon
 * flush against the Front Hall back-left wall behind the reception desk!
 */
function drawLandscapeFoldingScreenEast(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  totalLen: number,
  height: number
) {
  const panels = 4;
  const seg = totalLen / panels;
  for (let i = 0; i < panels; i++) {
    const py = wy + i * seg;
    // Slight subtle zigzag depth for authentic folding screen silhouette
    const ox = wx + (i % 2 === 0 ? 0 : 4);
    const oxNext = wx + (i % 2 === 0 ? 4 : 0);

    const t0 = w2i(ox, py, height);
    const t1 = w2i(oxNext, py + seg - 1.5, height);
    const b1 = w2i(oxNext, py + seg - 1.5, 1);
    const b0 = w2i(ox, py, 1);

    // Timber panel border
    drawPoly(ctx, [t0, t1, b1, b0], '#6B4427', INK, 0.95);

    // Warm silk parchment inner art canvas
    const st0 = w2i(ox + 0.4, py + 2.5, height - 3.5);
    const st1 = w2i(oxNext + 0.4, py + seg - 4, height - 3.5);
    const sb1 = w2i(oxNext + 0.4, py + seg - 4, 5);
    const sb0 = w2i(ox + 0.4, py + 2.5, 5);
    drawPoly(ctx, [st0, st1, sb1, sb0], '#E9DCBE', '#8A643F', 0.65);

    // Delicate misty ink-wash mountain & pine motif across the 4 silk panels
    const mBaseL = w2i(ox + 0.5, py + 3, 12);
    const mPeak = w2i((ox + oxNext) * 0.5 + 0.5, py + seg * 0.5, 19 + (i % 2) * 7);
    const mBaseR = w2i(oxNext + 0.5, py + seg - 4.5, 11);
    const mBotR = w2i(oxNext + 0.5, py + seg - 4.5, 6);
    const mBotL = w2i(ox + 0.5, py + 3, 6);
    drawPoly(
      ctx,
      [mBaseL, mPeak, mBaseR, mBotR, mBotL],
      i % 2 === 0 ? 'rgba(84, 110, 98, 0.52)' : 'rgba(104, 122, 106, 0.44)'
    );
  }
}

/**
 * Draws a framed ink-painting scroll mounted on a South-facing wall (Office / Dining Hall accent).
 */
function drawWallScrollSouth(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  w: number,
  zBottom: number,
  h: number
) {
  const t0 = w2i(wx, wy, zBottom + h);
  const t1 = w2i(wx + w, wy, zBottom + h);
  const b1 = w2i(wx + w, wy, zBottom);
  const b0 = w2i(wx, wy, zBottom);
  drawPoly(ctx, [t0, t1, b1, b0], '#54351E', INK, 0.9);

  const p0 = w2i(wx + 3, wy, zBottom + h - 3);
  const p1 = w2i(wx + w - 3, wy, zBottom + h - 3);
  const p2 = w2i(wx + w - 3, wy, zBottom + 3);
  const p3 = w2i(wx + 3, wy, zBottom + 3);
  drawPoly(ctx, [p0, p1, p2, p3], '#EFE4CC', '#96764E', 0.65);

  // Misty wave/mountain ink brush stroke inside scroll
  const s0 = w2i(wx + 6, wy, zBottom + 7);
  const s1 = w2i(wx + w * 0.42, wy, zBottom + h * 0.62);
  const s2 = w2i(wx + w * 0.72, wy, zBottom + h * 0.46);
  const s3 = w2i(wx + w - 6, wy, zBottom + 6);
  drawPoly(ctx, [s0, s1, s2, s3], 'rgba(72, 98, 92, 0.45)');
}

/**
 * Draws a wall-mounted mirror & soap dispenser on the Restroom celadon tiled wall.
 */
function drawRestroomWallMirrorEast(ctx: CanvasRenderingContext2D, wx: number, wy: number) {
  const t0 = w2i(wx, wy, 56);
  const t1 = w2i(wx, wy + 52, 56);
  const b1 = w2i(wx, wy + 52, 30);
  const b0 = w2i(wx, wy, 30);
  drawPoly(ctx, [t0, t1, b1, b0], '#476A66', INK, 0.95);

  const g0 = w2i(wx, wy + 3, 53);
  const g1 = w2i(wx, wy + 49, 53);
  const g2 = w2i(wx, wy + 49, 33);
  const g3 = w2i(wx, wy + 3, 33);
  const grad = ctx.createLinearGradient(g0.x, g0.y, g2.x, g2.y);
  grad.addColorStop(0, '#E3F6F5');
  grad.addColorStop(0.5, '#C3E6E5');
  grad.addColorStop(1, '#9ECFD0');
  drawPoly(ctx, [g0, g1, g2, g3], grad, '#33524E', 0.7);
}

/**
 * Draws a carved Chinese timber archway transom header with delicate vertical latticework.
 */
function drawArchwayTransomHeader(
  ctx: CanvasRenderingContext2D,
  xLeft: number,
  xRight: number,
  wy: number,
  depth: number,
  zBottom: number,
  height: number
) {
  const w = xRight - xLeft;
  // Upper carved timber beam
  drawIsoBoxFlat(
    ctx,
    xLeft,
    wy,
    w,
    depth,
    height,
    { top: '#613D23', left: '#94633B', right: '#6B4426', stroke: INK, lineWidth: 1.0 },
    zBottom
  );
  // Delicate vertical lattice mullions on the front-facing header
  ctx.save();
  ctx.strokeStyle = '#4B2D18';
  ctx.lineWidth = 0.95;
  for (let gx = xLeft + 8; gx < xRight - 6; gx += 9) {
    const pTop = w2i(gx, wy + depth, zBottom + height - 2);
    const pBot = w2i(gx, wy + depth, zBottom + 2);
    ctx.beginPath();
    ctx.moveTo(pTop.x, pTop.y);
    ctx.lineTo(pBot.x, pBot.y);
    ctx.stroke();
  }
  ctx.restore();
  // Golden lintel trim strip along bottom edge of header
  const l0 = w2i(xLeft + 2, wy + depth, zBottom + 1.5);
  const l1 = w2i(xRight - 2, wy + depth, zBottom + 1.5);
  ctx.save();
  ctx.strokeStyle = '#DFBA6E';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(l0.x, l0.y);
  ctx.lineTo(l1.x, l1.y);
  ctx.stroke();
  ctx.restore();
}

export function drawIsoSceneWalls(
  ctx: CanvasRenderingContext2D,
  frontW: number,
  frontH: number,
  unifiedMinY: number,
  unifiedMaxX: number,
  backstageOffsetY: number,
  decorId: string,
  atmo?: SceneAtmosphere
) {
  const WALL_H = 74;
  const WALL_T = 14;
  const wallCapColor =
    decorId === 'retro_mahogany'
      ? '#641F1B'
      : decorId === 'obsidian_sushi'
        ? '#262C36'
        : decorId === 'azure_luxury'
          ? '#224F5A'
          : '#4E3220';
  const pilasterPalette =
    decorId === 'retro_mahogany'
      ? { top: '#782620', left: '#601C18', right: '#421210' }
      : decorId === 'obsidian_sushi'
        ? { top: '#353E4A', left: '#272E38', right: '#1B2028' }
        : decorId === 'azure_luxury'
          ? { top: '#2E6975', left: '#22535E', right: '#163B44' }
          : { top: '#5A3922', left: '#4B2E1A', right: '#382213' };
  const trimAccent =
    decorId === 'retro_mahogany'
      ? '#E8C46A'
      : decorId === 'obsidian_sushi'
        ? '#E8927C'
        : decorId === 'azure_luxury'
          ? '#9AEBE0'
          : null;

  // ==========================================
  // 1. TALL BACK-RIGHT OUTER WALL (wy = UNIFIED_MIN_Y - WALL_T, wx = -WALL_T..960)
  // ==========================================
  // Solid wall shell & top themed cap
  drawIsoBoxFlat(ctx, -WALL_T, unifiedMinY - WALL_T, unifiedMaxX + WALL_T, WALL_T, WALL_H, {
    top: wallCapColor,
    left: '#D6BE97',
    right: '#644028',
    stroke: INK,
    lineWidth: 1.15,
  });

  // Textured interior wall zones along the 4 top-row Backstage rooms!
  // Cold storage (0..248): cold stainless cladding
  fillIsoWallFaceSouth(ctx, 0, unifiedMinY, 248, WALL_H, 0, 'wall_cold_s');
  // Hot kitchen (248..478): celadon ceramic wet backsplash!
  fillIsoWallFaceSouth(ctx, 248, unifiedMinY, 230, WALL_H, 0, 'wall_celadon_s');
  // Dish washroom (478..708): celadon ceramic wet tile wall!
  fillIsoWallFaceSouth(ctx, 478, unifiedMinY, 230, WALL_H, 0, 'wall_celadon_s');
  // Manager Office (708..960): refined plaster & cedar wainscoting!
  fillIsoWallFaceSouth(ctx, 708, unifiedMinY, 252, WALL_H, 0, 'wall_wainscot_s');

  // Subtle top themed coping trim over the back-right wall
  drawIsoQuadFlat(ctx, -WALL_T, unifiedMinY - WALL_T, unifiedMaxX + WALL_T, WALL_T, WALL_H, wallCapColor, INK, 1.1);

  // Wall details mounted cleanly on the tall back-right wall:
  drawWallScrollSouth(ctx, 775, unifiedMinY + 0.5, 68, 34, 28); // Office calligraphy scroll
  drawWallLatticeWindowSouth(ctx, 868, unifiedMinY + 0.5, 58, 34, 26, true, atmo); // Office window

  // ==========================================
  // 2. TALL BACK-LEFT OUTER WALL (wx = -WALL_T, wy = UNIFIED_MIN_Y..frontH)
  // ==========================================
  drawIsoBoxFlat(ctx, -WALL_T, unifiedMinY, WALL_T, frontH - unifiedMinY, WALL_H, {
    top: wallCapColor,
    left: '#644028',
    right: '#C5AC84',
    stroke: INK,
    lineWidth: 1.15,
  });

  // Room-matched textured East-facing inner wall strips along wx = 0:
  // Cold storage (-662..-384)
  fillIsoWallFaceEast(ctx, 0, unifiedMinY, 278, WALL_H, 0, 'wall_cold_e');
  // Corridor end (-384..-307)
  fillIsoWallFaceEast(ctx, 0, unifiedMinY + 278, 77, WALL_H, 0, 'wall_wainscot_e');
  // Restroom (-307..-20): signature celadon glazed ceramic tiles!
  fillIsoWallFaceEast(ctx, 0, unifiedMinY + 355, 287, WALL_H, 0, 'wall_celadon_e');
  // Front Hall left wall (0..frontH): warm plaster + carved cedar wainscoting!
  fillIsoWallFaceEast(ctx, 0, 0, frontH, WALL_H, 0, 'wall_wainscot_e');

  // Subtle theme-specific wash & brass/coral/jade dado molding along front-hall west wall!
  if (trimAccent) {
    const washCol =
      decorId === 'retro_mahogany'
        ? 'rgba(116, 30, 24, 0.22)'
        : decorId === 'obsidian_sushi'
          ? 'rgba(20, 26, 34, 0.34)'
          : 'rgba(26, 98, 108, 0.22)';
    const w0 = w2i(0.2, 0, WALL_H);
    const w1 = w2i(0.2, frontH, WALL_H);
    const w2 = w2i(0.2, frontH, 0);
    const w3 = w2i(0.2, 0, 0);
    drawPoly(ctx, [w0, w1, w2, w3], washCol);
    // Horizontal decorative molding strip along mid-wall height
    const m0 = w2i(0.3, 0, 31);
    const m1 = w2i(0.3, frontH, 31);
    ctx.save();
    ctx.strokeStyle = trimAccent;
    ctx.lineWidth = 1.65;
    ctx.beginPath();
    ctx.moveTo(m0.x, m0.y);
    ctx.lineTo(m1.x, m1.y);
    ctx.stroke();
    ctx.restore();
  }

  // Top themed cap for back-left outer wall
  drawIsoQuadFlat(ctx, -WALL_T, unifiedMinY, WALL_T, frontH - unifiedMinY, WALL_H, wallCapColor, INK, 1.1);

  // Wall-mounted features along Back-Left outer wall:
  drawRestroomWallMirrorEast(ctx, 0.6, unifiedMinY + 425); // Restroom wall mirror
  drawLandscapeFoldingScreenEast(ctx, 2, 134, 108, 44); // Signature 4-panel Shanshui screen behind reception!
  drawWallLatticeWindowEast(ctx, 0.5, 290, 86, 36, 26, atmo);
  drawWallLatticeWindowEast(ctx, 0.5, 456, 86, 36, 26, atmo);
  if (frontH > CANVAS_HEIGHT) {
    drawWallLatticeWindowEast(ctx, 0.5, CANVAS_HEIGHT + 34, 86, 36, 26, atmo);
  }

  // Structural Timber Pilasters along both exterior back walls (themed per decorId!)
  for (let px = 0; px <= unifiedMaxX; px += 240) {
    drawIsoBoxFlat(ctx, px - 6, unifiedMinY - 13, 14, 15, WALL_H + 3, {
      ...pilasterPalette,
      stroke: INK,
      lineWidth: 1.0,
    });
    if (trimAccent) {
      drawIsoQuadFlat(ctx, px - 6, unifiedMinY - 13, 14, 15, WALL_H + 3.2, trimAccent, INK, 0.65);
    }
  }
  for (let py = unifiedMinY + 220; py <= frontH; py += 220) {
    drawIsoBoxFlat(ctx, -13, py - 6, 15, 14, WALL_H + 3, {
      ...pilasterPalette,
      stroke: INK,
      lineWidth: 1.0,
    });
    if (trimAccent) {
      drawIsoQuadFlat(ctx, -13, py - 6, 15, 14, WALL_H + 3.2, trimAccent, INK, 0.65);
    }
  }

  // Flat brass doorway saddle thresholds along Backstage Corridor (floor-level z=0.55 so characters walk over them)
  const topWallY = 278 + backstageOffsetY;
  for (const doorX of [135, 365, 595, 825]) {
    drawIsoQuadFlat(ctx, doorX - 26, topWallY - 1, 52, 10, 0.55, '#B99254', '#5C3D1C', 0.85);
  }
  const bottomWallY = 355 + backstageOffsetY;
  for (const doorX of [172, 480, 788]) {
    drawIsoQuadFlat(ctx, doorX - 26, bottomWallY - 1, 52, 10, 0.55, '#B99254', '#5C3D1C', 0.85);
  }

  // ==========================================
  // 5. EXPANDED LV.2+ EAST WING BACK-RIGHT CUTAWAY WALL
  // ==========================================
  if (frontW > CANVAS_WIDTH) {
    const ew = frontW - CANVAS_WIDTH;
    drawIsoBoxFlat(ctx, CANVAS_WIDTH, -20, ew, 14, 52, {
      top: '#4E3220',
      left: '#D6BE97',
      right: '#644028',
      stroke: INK,
      lineWidth: 1.05,
    });
    fillIsoWallFaceSouth(ctx, CANVAS_WIDTH, -6, ew, 52, 0, 'wall_wainscot_s');
    drawIsoQuadFlat(ctx, CANVAS_WIDTH, -20, ew, 14, 52, '#4E3220', INK, 1.0);

    // Lattice window on the expanded East Wing wall
    if (ew >= 110) {
      drawWallLatticeWindowSouth(ctx, CANVAS_WIDTH + ew * 0.5 - 38, -5.5, 76, 22, 22, true, atmo);
    }

    drawIsoBoxFlat(ctx, frontW - 6, -20, 14, 14, 55, {
      top: '#583821',
      left: '#4B2E1A',
      right: '#382213',
      stroke: INK,
      lineWidth: 1.0,
    });
  }
}

/**
 * Draws one seamless slice of a north-south interior partition wall so it can be depth-sorted
 * individually against rooms, furniture, and walking characters with zero visible internal seams.
 */
function drawSeamlessVerticalPartitionSlice(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  thickness: number,
  len: number,
  height: number,
  topColor: string,
  southFaceColor: string,
  eastTexId: 'wall_celadon_e' | 'wall_wainscot_e',
  isFirst: boolean,
  isLast: boolean
) {
  const b0 = w2i(wx, wy, 0);
  const b1 = w2i(wx + thickness, wy, 0);
  const b2 = w2i(wx + thickness, wy + len, 0);
  const b3 = w2i(wx, wy + len, 0);
  const t0 = w2i(wx, wy, height);
  const t1 = w2i(wx + thickness, wy, height);
  const t2 = w2i(wx + thickness, wy + len, height);
  const t3 = w2i(wx, wy + len, height);

  // 1. East-facing textured wall face (facing into the eastern adjacent room)
  fillIsoWallFaceEast(ctx, wx + thickness, wy, len, height, 0, eastTexId);

  // 2. South end cap (only on the southernmost slice!)
  if (isLast) {
    ctx.fillStyle = southFaceColor;
    ctx.beginPath();
    ctx.moveTo(t3.x, t3.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(b3.x, b3.y);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Top cap polygon (filled cleanly without cross-seam strokes)
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(t0.x, t0.y);
  ctx.lineTo(t1.x, t1.y);
  ctx.lineTo(t2.x, t2.y);
  ctx.lineTo(t3.x, t3.y);
  ctx.closePath();
  ctx.fill();

  // 4. Crisp architectural ink edges (outer rails only, zero slice cross-lines)
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.92;
  ctx.beginPath();
  // Top cap west & east rails + bottom east base rail
  ctx.moveTo(t0.x, t0.y);
  ctx.lineTo(t3.x, t3.y);
  ctx.moveTo(t1.x, t1.y);
  ctx.lineTo(t2.x, t2.y);
  ctx.moveTo(b1.x, b1.y);
  ctx.lineTo(b2.x, b2.y);
  if (isFirst) {
    // North outer cap edge & north-east vertical corner
    ctx.moveTo(t0.x, t0.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.moveTo(t1.x, t1.y);
    ctx.lineTo(b1.x, b1.y);
  }
  if (isLast) {
    // South outer cap edge & south-west/south-east vertical corners + south base edge
    ctx.moveTo(t3.x, t3.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.moveTo(b3.x, b3.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.moveTo(t3.x, t3.y);
    ctx.lineTo(b3.x, b3.y);
    ctx.moveTo(t2.x, t2.y);
    ctx.lineTo(b2.x, b2.y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Collects all interior backstage cutaway partition walls and the front/back grand partition wall
 * as depth-sorted isometric draw items so rooms & furniture behind a wall are cleanly occluded
 * while rooms, props & characters in front of the wall draw cleanly ahead of it.
 */
export function collectIsoInteriorWallDepthItems(
  ctx: CanvasRenderingContext2D,
  unifiedMinY: number,
  backstageOffsetY: number
): Array<{ depth: number; draw: () => void }> {
  const out: Array<{ depth: number; draw: () => void }> = [];
  const PART_H = 38;

  // 1. Vertical dividers between top-row backstage rooms (4 seamless slices each)
  const topDividers: Array<{ x: number; celadon?: boolean }> = [
    { x: 246 },
    { x: 476, celadon: true },
    { x: 706 },
  ];
  const topStartY = unifiedMinY + 20;
  const topSlices = 4;
  const topSliceLen = 256 / topSlices;
  for (const div of topDividers) {
    for (let s = 0; s < topSlices; s++) {
      const sy = topStartY + s * topSliceLen;
      const isFirst = s === 0;
      const isLast = s === topSlices - 1;
      out.push({
        depth: div.x + 4 + (sy + topSliceLen * 0.5),
        draw: () =>
          drawSeamlessVerticalPartitionSlice(
            ctx,
            div.x,
            sy,
            8,
            topSliceLen,
            PART_H,
            div.celadon ? '#46746E' : '#583821',
            div.celadon ? '#559E94' : '#855A38',
            div.celadon ? 'wall_celadon_e' : 'wall_wainscot_e',
            isFirst,
            isLast
          ),
      });
    }
  }

  // 2. Horizontal wall along top of Backstage Corridor (split cleanly at vertical divider junctions)
  const topWallY = 278 + backstageOffsetY;
  const topWallSegs: Array<[number, number]> = [
    [24, 108],
    [164, 250],
    [250, 336],
    [394, 480],
    [480, 566],
    [624, 710],
    [710, 796],
    [854, 936],
  ];
  for (const [x1, x2] of topWallSegs) {
    out.push({
      depth: (x1 + x2) * 0.5 + (topWallY + 3.5),
      draw: () => {
        drawIsoBoxFlat(ctx, x1, topWallY, x2 - x1, 7, 26, {
          top: '#583821',
          left: '#AA8862',
          right: '#694428',
          stroke: INK,
          lineWidth: 0.9,
        });
        const a = w2i(x1 + 1, topWallY + 7, 11);
        const b = w2i(x2 - 1, topWallY + 7, 11);
        ctx.save();
        ctx.strokeStyle = '#6B4326';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      },
    });
  }

  // 3. Horizontal wall along bottom of Backstage Corridor (Restroom / Equipment / Dormitory)
  const bottomWallY = 355 + backstageOffsetY;
  const bottomWallSegs: Array<{ x1: number; x2: number; jade?: boolean }> = [
    { x1: 24, x2: 144, jade: true },
    { x1: 200, x2: 324, jade: true },
    { x1: 324, x2: 452 },
    { x1: 508, x2: 636 },
    { x1: 636, x2: 760 },
    { x1: 816, x2: 936 },
  ];
  for (const seg of bottomWallSegs) {
    out.push({
      depth: (seg.x1 + seg.x2) * 0.5 + (bottomWallY + 3.5),
      draw: () => {
        drawIsoBoxFlat(
          ctx,
          seg.x1,
          bottomWallY,
          seg.x2 - seg.x1,
          7,
          26,
          seg.jade
            ? { top: '#46746E', left: '#60B3A8', right: '#80CEC3', stroke: INK, lineWidth: 0.9 }
            : { top: '#583821', left: '#AA8862', right: '#694428', stroke: INK, lineWidth: 0.9 }
        );
      },
    });
  }

  // 4. Vertical dividers between bottom-row backstage rooms (4 seamless slices each)
  const bottomDividers: Array<{ x: number; celadon?: boolean }> = [
    { x: 320, celadon: true },
    { x: 632 },
  ];
  const botStartY = 355 + backstageOffsetY;
  const botSlices = 4;
  const botSliceLen = 287 / botSlices;
  for (const div of bottomDividers) {
    for (let s = 0; s < botSlices; s++) {
      const sy = botStartY + s * botSliceLen;
      const isFirst = s === 0;
      const isLast = s === botSlices - 1;
      out.push({
        depth: div.x + 4 + (sy + botSliceLen * 0.5),
        draw: () =>
          drawSeamlessVerticalPartitionSlice(
            ctx,
            div.x,
            sy,
            8,
            botSliceLen,
            PART_H,
            div.celadon ? '#46746E' : '#583821',
            div.celadon ? '#559E94' : '#855A38',
            div.celadon ? 'wall_celadon_e' : 'wall_wainscot_e',
            isFirst,
            isLast
          ),
      });
    }
  }

  // 5. Grand Partition Wall separating Backstage & Front Dining Hall (split cleanly at room junctions)
  const divFrontBackSegs: Array<[number, number]> = [
    [0, 196],
    [246, 324],
    [324, 378],
    [434, 636],
    [636, 652],
    [712, 960],
  ];
  for (const [x1, x2] of divFrontBackSegs) {
    out.push({
      depth: (x1 + x2) * 0.5 - 13,
      draw: () => {
        drawIsoBoxFlat(ctx, x1, -20, x2 - x1, 14, 44, {
          top: '#54351F',
          left: '#D6BC93',
          right: '#764B2C',
          stroke: INK,
          lineWidth: 1.0,
        });
        if (x2 <= 380) {
          fillIsoWallFaceSouth(ctx, x1, -6, x2 - x1, 44, 0, 'wall_celadon_s');
        } else {
          fillIsoWallFaceSouth(ctx, x1, -6, x2 - x1, 44, 0, 'wall_wainscot_s');
        }
        drawIsoQuadFlat(ctx, x1, -20, x2 - x1, 14, 44, '#54351F', INK, 1.0);
      },
    });
  }

  // 6. Carved Chinese Timber Archway Transom Headers across all 3 front-back passages
  for (const arch of FRONT_BACK_ARCHWAYS) {
    out.push({
      depth: arch.x - 13,
      draw: () => {
        drawArchwayTransomHeader(
          ctx,
          arch.x - arch.halfWidth - 2,
          arch.x + arch.halfWidth + 2,
          -20,
          14,
          34,
          10
        );
      },
    });
  }

  return out;
}

// ==========================================
// 4. FOREGROUND CUTAWAY RIM, TIMBER ENTRY GATE, POTTED BAMBOO & WARM LANTERNS
// ==========================================

/**
 * Draws the refined cylindrical bamboo-ribbed warm paper lantern matching style_isometric_tycoon,
 * enhanced with dynamic dual-layer volumetric warmth and gentle candle flicker!
 */
export function drawStyle3Lantern(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  wz: number,
  timeSec: number,
  tint = '#F6C96E',
  glowMult = 1.0,
  windSway = 1.0
) {
  const pos = w2i(wx, wy, wz);
  const sway = Math.sin(timeSec * (1.7 * windSway) + wx * 0.018 + wy * 0.018) * (1.1 * windSway);
  const flicker = 0.94 + Math.sin(timeSec * 5.2 + wx * 0.13) * 0.06;
  const lx = pos.x + sway;
  const ly = pos.y;

  ctx.save();
  // Outer wide atmospheric warm amber bloom washing gently over wall & interior
  const outerRadius = 60 * Math.min(1.3, 0.88 + glowMult * 0.2);
  const halo = ctx.createRadialGradient(lx, ly + 4, 2, lx, ly + 4, outerRadius);
  const a0 = Math.min(0.48, 0.28 * glowMult * flicker);
  const a1 = Math.min(0.22, 0.12 * glowMult * flicker);
  halo.addColorStop(0, `rgba(255, 228, 148, ${a0.toFixed(3)})`);
  halo.addColorStop(0.42, `rgba(244, 176, 76, ${a1.toFixed(3)})`);
  halo.addColorStop(1, 'rgba(244, 176, 76, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(lx, ly + 4, outerRadius, 0, Math.PI * 2);
  ctx.fill();

  // Slender dark bronze hanger cord
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y - 16);
  ctx.lineTo(lx, ly - 8);
  ctx.stroke();

  // Cylindrical oval bamboo-ribbed paper lantern body
  ctx.fillStyle = tint;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.95;
  ctx.beginPath();
  ctx.roundRect(lx - 5.5, ly - 8.5, 11, 16.5, 4.5);
  ctx.fill();
  ctx.stroke();

  // Warm glowing paper core
  ctx.fillStyle = '#FFFBEA';
  ctx.beginPath();
  ctx.ellipse(lx, ly - 0.3, 3.0, 5.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Delicate horizontal bamboo ribs
  ctx.strokeStyle = 'rgba(82, 46, 18, 0.34)';
  ctx.lineWidth = 0.7;
  for (const ry of [-4, 0, 4]) {
    ctx.beginPath();
    ctx.moveTo(lx - 5, ly + ry);
    ctx.lineTo(lx + 5, ly + ry);
    ctx.stroke();
  }

  // Dark bronze top & bottom caps + tiny silk tassel
  ctx.fillStyle = '#3B2316';
  ctx.fillRect(lx - 3.8, ly - 10, 7.6, 2);
  ctx.fillRect(lx - 3.4, ly + 7.5, 6.8, 2);
  ctx.strokeStyle = '#B84A2D';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(lx, ly + 9.5);
  ctx.lineTo(lx + sway * 0.35, ly + 13.5);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws a decorative celadon ceramic planter with seasonal foliage (Spring blossoms, Summer emerald bamboo,
 * Autumn golden maple/ginkgo, Winter frosted pine & snow dust).
 */
function drawPottedEntranceBamboo(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  timeSec: number,
  atmo?: SceneAtmosphere,
  sizeScale = 1.0
) {
  const season = atmo?.season ?? 'SPRING';
  const isSnow = atmo?.weather === 'SNOWY' || season === 'WINTER';
  // Subtle grounded contact shadow
  const shadowP = w2i(wx + 1, wy + 2, 0.15);
  ctx.save();
  ctx.fillStyle = 'rgba(18, 12, 8, 0.28)';
  ctx.beginPath();
  ctx.ellipse(shadowP.x, shadowP.y + 1, 11 * sizeScale, 5.2 * sizeScale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Prefer unified hand-painted celadon octagonal kumquat & lucky bamboo planter sprite
  const drewPlanter = drawIsoPropSprite(ctx, 'POTTED_PLANTER', {
    anchorX: shadowP.x,
    anchorY: shadowP.y + 2,
    targetHeight: 37 * sizeScale,
    maxWidth: 32 * sizeScale,
  });

  if (drewPlanter) {
    // Subtle seasonal canopy accents layered cleanly over the hand-painted foliage
    const canopyP = w2i(wx + 1, wy + 1, 25 * sizeScale);
    const windBoost = atmo?.weather === 'TYPHOON' ? 2.4 : atmo?.weather === 'RAINY' ? 1.4 : 1.0;
    const sway = Math.sin(timeSec * (1.7 * windBoost) + wx * 0.05) * (1.1 * windBoost);
    ctx.save();
    if (season === 'SPRING') {
      ctx.fillStyle = 'rgba(251, 182, 206, 0.88)';
      for (const [dx, dy] of [[-5, -3], [4, -5], [-1, 2], [6, 1]]) {
        ctx.beginPath();
        ctx.arc(canopyP.x + dx * sizeScale + sway * 0.5, canopyP.y + dy * sizeScale, 1.7 * sizeScale, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (season === 'AUTUMN') {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.78)';
      for (const [dx, dy] of [[-4, -2], [3, -4], [0, 3], [-6, 1]]) {
        ctx.beginPath();
        ctx.ellipse(canopyP.x + dx * sizeScale + sway * 0.5, canopyP.y + dy * sizeScale, 2.2 * sizeScale, 1.3 * sizeScale, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (isSnow) {
      ctx.fillStyle = 'rgba(240, 250, 255, 0.86)';
      ctx.beginPath();
      ctx.ellipse(canopyP.x - 1, canopyP.y - 4 * sizeScale, 7.5 * sizeScale, 3.2 * sizeScale, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  // Fallback procedural celadon planter while image decodes
  drawIsoBoxFlat(
    ctx,
    wx - 5,
    wy - 5,
    12,
    12,
    11,
    { top: '#80B8AE', left: '#58938A', right: '#3E736B', stroke: INK, lineWidth: 0.85 },
    0
  );
  drawIsoQuadFlat(ctx, wx - 3.5, wy - 3.5, 9, 9, 11.2, isSnow ? '#E6F2F8' : '#4A3322');

  const windBoost = atmo?.weather === 'TYPHOON' ? 2.6 : atmo?.weather === 'RAINY' ? 1.5 : 1.0;
  const sway = Math.sin(timeSec * (1.6 * windBoost) + wx * 0.05) * (1.2 * windBoost);
  const base = w2i(wx + 1, wy + 1, 11.5);
  ctx.save();
  ctx.strokeStyle = season === 'AUTUMN' ? '#6D4C2D' : '#4E7D44';
  ctx.lineWidth = 1.6;
  for (const [ox, h] of [
    [-2.5, 22],
    [0.5, 27],
    [3.0, 20],
  ]) {
    ctx.beginPath();
    ctx.moveTo(base.x + ox, base.y);
    ctx.quadraticCurveTo(base.x + ox + sway * 0.5, base.y - h * 0.55, base.x + ox + sway, base.y - h);
    ctx.stroke();
  }
  const foliageCols =
    season === 'SPRING'
      ? ['#6BA65B', '#F9A8D4', '#FBCFE8', '#5D9850']
      : season === 'AUTUMN'
        ? ['#D97706', '#EA580C', '#F59E0B', '#B45309']
        : isSnow
          ? ['#3E6B58', '#E2F1F8', '#52806A', '#F0F9FF']
          : ['#5F9650', '#4D8241', '#6FA85D', '#5B8F4B'];
  const foliage = [
    [-4.5, -18, 5.4, foliageCols[0]],
    [2.8, -22, 5.8, foliageCols[1]],
    [-1.2, -25, 5.6, foliageCols[2]],
    [4.2, -16, 4.6, foliageCols[3]],
  ] as const;
  for (const [fx, fy, rad, col] of foliage) {
    ctx.fillStyle = col;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.ellipse(base.x + fx + sway, base.y + fy, rad, rad * 0.62, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Draws the classic rectangular timber Post-and-Beam Entrance Gate (中式木门框) with carved gold signboard plaque
 * and winter snow eaves when cold/snowy.
 */
function drawEntranceTimberGate(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  spanW: number,
  timeSec: number,
  glowMult: number,
  atmo?: SceneAtmosphere,
  shopLevel = 1
) {
  const postW = shopLevel >= 4 ? 8 : 7;
  const h = shopLevel >= 4 ? 58 : shopLevel >= 2 ? 55 : 52;
  const isSnow = atmo?.weather === 'SNOWY' || atmo?.season === 'WINTER';
  // Twin flanking celadon seasonal planters outside the timber posts
  drawPottedEntranceBamboo(ctx, wx - 16, wy + 4, timeSec, atmo, shopLevel >= 3 ? 1.12 : 1.0);
  drawPottedEntranceBamboo(ctx, wx + spanW + 10, wy + 4, timeSec + 1.4, atmo, shopLevel >= 3 ? 1.12 : 1.0);

  // Carved stone/brass pillar plinths (upgrades to carved antique bronze-gold at Lv.3+)
  const plinthColors =
    shopLevel >= 3
      ? { top: '#D9B166', left: '#A47834', right: '#785522', stroke: INK, lineWidth: 0.9 }
      : { top: '#9B9485', left: '#787164', right: '#595348', stroke: INK, lineWidth: 0.85 };
  drawIsoBoxFlat(ctx, wx - 2, wy - 2, postW + 4, postW + 4, 7, plinthColors, 0);
  drawIsoBoxFlat(ctx, wx + spanW - postW - 2, wy - 2, postW + 4, postW + 4, 7, plinthColors, 0);

  // Left & right lacquered/cedar posts (progresses from cedar to rich rosewood-crimson lacquer at Lv.3+)
  const postColors =
    shopLevel >= 3
      ? { top: '#78221A', left: '#922A21', right: '#611914', stroke: INK, lineWidth: 0.95 }
      : { top: '#754C2E', left: '#9B6B44', right: '#694326', stroke: INK, lineWidth: 0.95 };
  drawIsoBoxFlat(ctx, wx, wy, postW, postW, h, postColors);
  drawIsoBoxFlat(ctx, wx + spanW - postW, wy, postW, postW, h, postColors);

  // Lv.2+ Decorative carved golden collar bands & brackets (雀替) on posts
  if (shopLevel >= 2) {
    const goldTrim = { top: '#E8C574', left: '#C99B45', right: '#966E29', stroke: INK, lineWidth: 0.75 };
    drawIsoBoxFlat(ctx, wx - 0.8, wy - 0.8, postW + 1.6, postW + 1.6, 3.5, goldTrim, h - 16);
    drawIsoBoxFlat(ctx, wx + spanW - postW - 0.8, wy - 0.8, postW + 1.6, postW + 1.6, 3.5, goldTrim, h - 16);
  }

  // Overhanging upper cross-beam lintel
  drawIsoBoxFlat(
    ctx,
    wx - 10,
    wy - 1.5,
    spanW + 20,
    postW + 3,
    7.5,
    {
      top: isSnow ? '#E6F2F8' : shopLevel >= 3 ? '#7D221B' : '#8B5B37',
      left: shopLevel >= 3 ? '#9A2E24' : '#A57249',
      right: shopLevel >= 3 ? '#5E1812' : '#6B4426',
      stroke: INK,
      lineWidth: 1.0,
    },
    h - 3
  );

  // Lv.3+ Second-tier upturned tiled grand archway roof crown (牌坊飞檐)
  if (shopLevel >= 3) {
    drawIsoBoxFlat(
      ctx,
      wx - 14,
      wy - 3,
      spanW + 28,
      postW + 6,
      5,
      {
        top: isSnow ? '#EDF7FC' : '#3C6A64',
        left: '#2E544F',
        right: '#1E3C38',
        stroke: INK,
        lineWidth: 1.0,
      },
      h + 4.2
    );
    // Antique gold ridge crest along top of celadon-tiled archway roof
    drawIsoBoxFlat(
      ctx,
      wx - 8,
      wy - 1,
      spanW + 16,
      3.5,
      3.2,
      { top: '#F5D684', left: '#D4A448', right: '#9B7228', stroke: INK, lineWidth: 0.8 },
      h + 9.2
    );
  }

  // Seasonal Entrance Gate Eaves Decorations (Snow + Crimson Tassels in Winter, Blossoms in Spring,
  // Swaying Bamboo Wind-Chimes in Summer, Golden Maple Sprigs in Autumn)
  const gateSeason = atmo?.season ?? 'SPRING';
  const eavesSway = Math.sin(timeSec * (atmo?.weather === 'TYPHOON' ? 6.5 : 2.6));
  const eavesTopZ = shopLevel >= 3 ? h + 9.4 : h + 4.8;
  if (isSnow) {
    drawIsoQuadFlat(ctx, wx - 11, wy - 2, spanW + 22, postW + 4, eavesTopZ, '#F2FAFF', '#94B8CE', 0.75);
    // Cozy festive crimson-gold silk tassels hanging at both eaves corners for winter hotpot warmth
    ctx.save();
    for (const tx of [wx - 8, wx + spanW + 8]) {
      const topP = w2i(tx, wy + 2, h - 1);
      const swayX = eavesSway * 2.2;
      ctx.strokeStyle = '#F5C451';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(topP.x, topP.y);
      ctx.lineTo(topP.x + swayX, topP.y + 8);
      ctx.stroke();
      ctx.fillStyle = '#C83226';
      ctx.beginPath();
      ctx.arc(topP.x + swayX, topP.y + 9.5, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(topP.x + swayX, topP.y + 11.5);
      ctx.lineTo(topP.x + swayX * 1.3, topP.y + 18);
      ctx.stroke();
    }
    ctx.restore();
  } else if (gateSeason === 'SPRING') {
    // Delicate pink peach-blossom clusters framing the eaves corners
    ctx.save();
    for (const [bx, dir] of [
      [wx - 7, -1],
      [wx + spanW + 7, 1],
    ] as Array<[number, number]>) {
      const bp = w2i(bx, wy + 1, eavesTopZ - 1);
      ctx.strokeStyle = '#5C3A21';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(bp.x, bp.y + 1);
      ctx.lineTo(bp.x + dir * 7, bp.y - 3 + eavesSway * 0.7);
      ctx.stroke();
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = k % 2 === 0 ? '#F9A8D4' : '#FCE7F3';
        ctx.beginPath();
        ctx.arc(
          bp.x + dir * (2 + k * 2.1),
          bp.y - (k % 2 === 0 ? 2.4 : 0.4) + eavesSway * 0.6,
          2.1,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.restore();
  } else if (gateSeason === 'SUMMER') {
    // Cool celadon glass wind-chime strips swaying gently under the summer eaves
    ctx.save();
    for (const [cx, phase] of [
      [wx - 7, 0],
      [wx + spanW + 7, 1.3],
    ]) {
      const cp = w2i(cx, wy + 2, h - 1);
      const sw = Math.sin(timeSec * (atmo?.weather === 'TYPHOON' ? 7 : 3.2) + phase) * 2.8;
      ctx.strokeStyle = '#BAE6FD';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(cp.x, cp.y);
      ctx.lineTo(cp.x + sw * 0.6, cp.y + 6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(103, 232, 249, 0.85)';
      ctx.beginPath();
      ctx.arc(cp.x + sw * 0.6, cp.y + 7.2, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(cp.x + sw * 0.6 - 1.5, cp.y + 9.5);
      ctx.lineTo(cp.x + sw * 0.6 + 1.5, cp.y + 9.5);
      ctx.lineTo(cp.x + sw * 1.4 + 1.2, cp.y + 17.5);
      ctx.lineTo(cp.x + sw * 1.4 - 1.2, cp.y + 17.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else if (gateSeason === 'AUTUMN') {
    // Warm golden-persimmon autumn maple sprigs perched on both eaves corners
    ctx.save();
    for (const [ax, dir] of [
      [wx - 7, -1],
      [wx + spanW + 7, 1],
    ] as Array<[number, number]>) {
      const ap = w2i(ax, wy + 1, eavesTopZ - 0.8);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = k % 3 === 0 ? '#DC2626' : k % 2 === 0 ? '#F59E0B' : '#EAB308';
        ctx.beginPath();
        ctx.ellipse(
          ap.x + dir * (1.8 + k * 2.0),
          ap.y - (k % 2 === 0 ? 2.2 : 0.2) + eavesSway * 0.6,
          2.6,
          1.7,
          dir * 0.4 + k * 0.3,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Subtle lower tie-beam
  drawIsoBoxFlat(
    ctx,
    wx + 4,
    wy + 1,
    spanW - 8,
    postW - 2,
    4,
    { top: '#7A4F2E', left: '#8E5E39', right: '#5E3B21', stroke: INK, lineWidth: 0.85 },
    h - 12
  );

  // Grand carved lacquered crimson & gold entrance signboard plaque (牌匾) mounted flush on the upper lintel!
  const plaqueW = Math.min(spanW - 14, shopLevel >= 4 ? 96 : 86);
  const plaqueD = 4;
  const plaqueH = shopLevel >= 4 ? 24 : 22;
  const plaqueBaseZ = h - 7;
  const px = wx + (spanW - plaqueW) * 0.5;
  const plaqueY = wy + postW - 1;

  for (const bx of [px + 12, px + plaqueW - 15]) {
    drawIsoBoxFlat(
      ctx,
      bx,
      plaqueY - 1,
      3,
      3,
      5,
      { top: '#593920', left: '#3D2514', right: '#2B190D', stroke: INK, lineWidth: 0.7 },
      plaqueBaseZ + plaqueH - 2
    );
  }

  drawIsoBoxFlat(
    ctx,
    px,
    plaqueY,
    plaqueW,
    plaqueD,
    plaqueH,
    { top: isSnow ? '#EBF6FC' : '#C99B45', left: '#7D1E18', right: '#53130F', stroke: '#E8C574', lineWidth: 1.05 },
    plaqueBaseZ
  );

  const plaqueCenter = w2i(
    px + plaqueW * 0.5,
    plaqueY + plaqueD,
    plaqueBaseZ + plaqueH * 0.5
  );
  ctx.save();
  ctx.transform(ISO_COS, ISO_SIN, 0, 1, plaqueCenter.x, plaqueCenter.y);

  const faceGrad = ctx.createLinearGradient(0, -plaqueH * 0.5, 0, plaqueH * 0.5);
  faceGrad.addColorStop(0, '#8E231C');
  faceGrad.addColorStop(0.5, '#781B15');
  faceGrad.addColorStop(1, '#5D1410');
  ctx.fillStyle = faceGrad;
  ctx.fillRect(-plaqueW * 0.5 + 1.2, -plaqueH * 0.5 + 1.2, plaqueW - 2.4, plaqueH - 2.4);

  ctx.strokeStyle = '#F2CA6B';
  ctx.lineWidth = 1.25;
  ctx.strokeRect(-plaqueW * 0.5 + 3, -plaqueH * 0.5 + 2.6, plaqueW - 6, plaqueH - 5.2);

  ctx.fillStyle = '#FCE29A';
  for (const [cx, cy] of [
    [-plaqueW * 0.5 + 5.2, -plaqueH * 0.5 + 4.8],
    [plaqueW * 0.5 - 5.2, -plaqueH * 0.5 + 4.8],
    [-plaqueW * 0.5 + 5.2, plaqueH * 0.5 - 4.8],
    [plaqueW * 0.5 - 5.2, plaqueH * 0.5 - 4.8],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 1.15, 0, Math.PI * 2);
    ctx.fill();
  }

  const chars = ['沸', '鼎', '海', '鲜'];
  const charStep = (plaqueW - 24) / 3.2;
  ctx.font = '900 13px "Noto Serif SC", "Songti SC", "PingFang SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  chars.forEach((ch, idx) => {
    const ux = (idx - 1.5) * charStep;
    ctx.fillStyle = 'rgba(36, 10, 6, 0.85)';
    ctx.fillText(ch, ux + 0.8, 1.5);
    ctx.fillStyle = '#FDE68A';
    ctx.fillText(ch, ux, 0.6);
  });
  ctx.restore();

  const windSway =
    atmo?.weather === 'TYPHOON' ? 2.75 : atmo?.weather === 'RAINY' ? 1.45 : 1.0;
  const isHoliday = Boolean(atmo?.holiday && atmo.holiday !== 'NONE');

  // Festive Chaoshan crimson-and-gold pennant bunting draped gracefully beneath the gate lintel on Holidays!
  if (isHoliday) {
    const leftBeam = w2i(wx + 6, wy + postW + 1, h - 10);
    const rightBeam = w2i(wx + spanW - 6, wy + postW + 1, h - 10);
    const midX = (leftBeam.x + rightBeam.x) * 0.5;
    const midY = (leftBeam.y + rightBeam.y) * 0.5 + 9;
    const breeze = Math.sin(timeSec * (2.6 * windSway)) * (1.6 * windSway);

    ctx.save();
    // Gold silk cord
    ctx.strokeStyle = '#F2C96B';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(leftBeam.x, leftBeam.y);
    ctx.quadraticCurveTo(midX + breeze * 0.4, midY + 4, rightBeam.x, rightBeam.y);
    ctx.stroke();

    // Alternating vermilion & antique gold silk pennants along the arch curve
    const flagCount = 9;
    for (let f = 1; f < flagCount; f++) {
      const t = f / flagCount;
      const omt = 1 - t;
      const fx = omt * omt * leftBeam.x + 2 * omt * t * (midX + breeze * 0.4) + t * t * rightBeam.x;
      const fy = omt * omt * leftBeam.y + 2 * omt * t * (midY + 4) + t * t * rightBeam.y;
      const flutter = Math.sin(timeSec * (4.2 * windSway) + f * 0.9) * (1.2 * windSway);
      const isRed =
        atmo?.holiday === 'MID_AUTUMN'
          ? f % 2 === 1
          : f % 2 === 0;
      ctx.fillStyle = isRed ? '#C83226' : '#F3C653';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      ctx.moveTo(fx - 3.6, fy);
      ctx.lineTo(fx + 3.6, fy + 1.4);
      ctx.lineTo(fx + flutter, fy + 8.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Warm twin entrance welcoming lanterns suspended beneath gate eaves (+ extra crimson cluster at Lv.4+ or Holidays)
  const mainLanternTint = isHoliday
    ? atmo?.holiday === 'MID_AUTUMN'
      ? '#FDE073'
      : '#E9503E'
    : '#F5B553';
  drawStyle3Lantern(ctx, wx + 12, wy + 5, h - 15, timeSec + 0.4, mainLanternTint, glowMult * 1.08, windSway);
  drawStyle3Lantern(ctx, wx + spanW - 12, wy + 5, h - 15, timeSec + 1.9, mainLanternTint, glowMult * 1.08, windSway);
  if (shopLevel >= 4 || isHoliday) {
    drawStyle3Lantern(ctx, wx - 4, wy + 6, h - 11, timeSec + 1.1, '#E05A47', glowMult * 1.18, windSway * 1.1);
    drawStyle3Lantern(ctx, wx + spanW + 4, wy + 6, h - 11, timeSec + 2.5, '#E05A47', glowMult * 1.18, windSway * 1.1);
  }
}

function drawHarborStreetLampProp(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  timeSec: number,
  glowMult: number,
  flipX = false
) {
  const base = w2i(wx, wy, 0.4);
  ctx.save();
  ctx.fillStyle = 'rgba(14, 10, 8, 0.30)';
  ctx.beginPath();
  ctx.ellipse(base.x, base.y + 1, 9, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const drew = drawIsoPropSprite(ctx, 'HARBOR_LAMP', {
    anchorX: base.x,
    anchorY: base.y + 2,
    targetHeight: 68,
    maxWidth: 42,
    flipX,
  });

  // Warm amber lantern glow halo around top streetlamp head
  const lampHead = w2i(wx, wy, 53);
  const flicker = 0.94 + Math.sin(timeSec * 4.1 + wx * 0.09) * 0.06;
  const r = 46 * Math.min(1.3, 0.85 + glowMult * 0.25);
  ctx.save();
  const halo = ctx.createRadialGradient(lampHead.x + (flipX ? 6 : -6), lampHead.y, 2, lampHead.x, lampHead.y, r);
  halo.addColorStop(0, `rgba(255, 224, 138, ${Math.min(0.46, 0.28 * glowMult * flicker).toFixed(3)})`);
  halo.addColorStop(0.5, `rgba(244, 168, 68, ${Math.min(0.18, 0.1 * glowMult * flicker).toFixed(3)})`);
  halo.addColorStop(1, 'rgba(244, 168, 68, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(lampHead.x, lampHead.y, r, 0, Math.PI * 2);
  ctx.fill();
  if (!drew) {
    ctx.strokeStyle = '#33524A';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(lampHead.x, lampHead.y);
    ctx.stroke();
    ctx.fillStyle = '#FCE29A';
    ctx.beginPath();
    ctx.arc(lampHead.x, lampHead.y, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawIsoSceneForegroundRimAndLights(
  ctx: CanvasRenderingContext2D,
  frontW: number,
  frontH: number,
  unifiedMinY: number,
  unifiedMaxX: number,
  timeSec: number,
  decorId: string,
  atmo?: SceneAtmosphere,
  shopLevel = 1
) {
  const { lanternGlow } = computeAtmosphereWeights(atmo);
  const isSnow = atmo?.weather === 'SNOWY' || atmo?.season === 'WINTER';
  const entrance = getFrontHallEntranceLayout(shopLevel);
  const ver = entrance.veranda;
  const rimColors = {
    top: isSnow ? '#E2F1F8' : shopLevel >= 3 ? '#653A22' : '#523420',
    left: '#402718',
    right: '#2E1B10',
    stroke: INK,
    lineWidth: 1.05,
  };

  // Clean architectural front cutaway low coping rims (split cleanly around the south entrance doorway!)
  drawIsoBoxFlat(ctx, unifiedMaxX, unifiedMinY, 8, Math.abs(unifiedMinY), 11, rimColors);
  drawIsoBoxFlat(ctx, frontW, 0, 8, frontH, 11, rimColors);
  // Left segment of south rim up to gate opening
  const leftRimW = Math.max(8, entrance.gateLeftX + 14);
  drawIsoBoxFlat(ctx, -14, frontH, leftRimW, 8, 11, rimColors);
  // Right segment of south rim after gate opening
  const rightRimStart = entrance.gateLeftX + entrance.gateSpan;
  const rightRimW = Math.max(8, frontW + 8 - rightRimStart);
  drawIsoBoxFlat(ctx, rightRimStart, frontH, rightRimW, 8, 11, rimColors);

  // Subtle snow trim along outer north/west wall tops during Winter or Snowy weather
  if (isSnow) {
    drawIsoQuadFlat(ctx, -14, unifiedMinY - 14, unifiedMaxX + 14, 14, 72.4, 'rgba(240, 250, 255, 0.85)');
    drawIsoQuadFlat(ctx, -14, unifiedMinY - 14, 14, frontH - unifiedMinY + 14, 72.4, 'rgba(240, 250, 255, 0.82)');
  }

  // Hand-painted interior decorative folding lacquer screens & corner kumquat planters scaling with Shop Level
  if (shopLevel >= 2) {
    const screenAnchor = w2i(Math.min(frontW - 34, rightRimStart + 44), frontH - 12, 0.5);
    ctx.save();
    ctx.fillStyle = 'rgba(18, 12, 8, 0.24)';
    ctx.beginPath();
    ctx.ellipse(screenAnchor.x, screenAnchor.y + 1, 24, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawIsoPropSprite(ctx, 'LACQUER_SCREEN', {
      anchorX: screenAnchor.x,
      anchorY: screenAnchor.y + 3,
      targetHeight: 46,
      maxWidth: 60,
    });
  }
  if (shopLevel >= 3) {
    // Extra celadon potted kumquat trees at southeast gallery corner
    drawPottedEntranceBamboo(ctx, frontW - 22, frontH - 18, timeSec + 2.2, atmo, 1.05);
  }
  if (shopLevel >= 4) {
    // Second matching carved lacquer screen framing the grand east banquet corridor
    const eastScreen = w2i(frontW - 14, frontH * 0.52, 0.5);
    drawIsoPropSprite(ctx, 'LACQUER_SCREEN', {
      anchorX: eastScreen.x,
      anchorY: eastScreen.y + 2,
      targetHeight: 44,
      maxWidth: 56,
      flipX: true,
    });
  }

  // Adaptive wooden entrance gate with plaque, Lv.1..Lv.5 roof/trim progression & seasonal potted plants
  drawEntranceTimberGate(
    ctx,
    entrance.gateLeftX,
    entrance.gateY,
    entrance.gateSpan,
    timeSec,
    lanternGlow,
    atmo,
    shopLevel
  );

  // Hand-painted Exterior Harbor Props flanking the waiting veranda (kept clear of the queue lane!)
  // 1. Vintage carved wooden waiting bench with velvet rope stanchion near the far east veranda rest bay
  const benchPos = w2i(ver.x + ver.w - 38, ver.y + 20, 0.5);
  ctx.save();
  ctx.fillStyle = 'rgba(14, 10, 8, 0.24)';
  ctx.beginPath();
  ctx.ellipse(benchPos.x, benchPos.y + 1, 22, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawIsoPropSprite(ctx, 'WAITING_BENCH', {
    anchorX: benchPos.x,
    anchorY: benchPos.y + 4,
    targetHeight: 38,
    maxWidth: 54,
  });

  // 2. Coastal harbor fish-market crates & Chaoshan ceramic sauce urn neatly beside veranda edge
  const cratePos = w2i(ver.x + ver.w + 32, ver.y + 34, 0.4);
  ctx.save();
  ctx.fillStyle = 'rgba(12, 10, 8, 0.26)';
  ctx.beginPath();
  ctx.ellipse(cratePos.x, cratePos.y + 1, 20, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawIsoPropSprite(ctx, 'SEAFOOD_CRATES', {
    anchorX: cratePos.x,
    anchorY: cratePos.y + 3,
    targetHeight: 36,
    maxWidth: 48,
  });

  // 3. Vintage coastal harbor cast-iron streetlamp(s) with warm glowing amber lantern heads
  drawHarborStreetLampProp(ctx, ver.x + 12, ver.y + ver.h - 4, timeSec, lanternGlow, false);
  if (shopLevel >= 2) {
    drawHarborStreetLampProp(ctx, ver.x + ver.w - 10, ver.y + ver.h - 4, timeSec + 1.5, lanternGlow, true);
  }

  // Interactive Weather Ground, Reflections & Eaves Effects on Exterior Waiting Veranda
  const isRain = atmo?.weather === 'RAINY' || atmo?.weather === 'TYPHOON';
  const isTyphoon = atmo?.weather === 'TYPHOON';
  const isHeatwave = atmo?.weather === 'HEATWAVE';
  const isWinterOrSnow = atmo?.weather === 'SNOWY' || atmo?.season === 'WINTER';
  const isRushOrNight =
    Boolean(atmo?.rushHourActive) ||
    atmo?.phase === 'CLOSING' ||
    (atmo ? atmo.dayProgress > 0.62 : false);

  if (isRushOrNight || isWinterOrSnow) {
    // Warm luminous lantern & hearth ground pools spilling across the front doorway veranda
    // (Extra cozy hearth warmth pouring out in Winter/Snowy weather to contrast with outdoor frost!)
    const gatePool = w2i(entrance.gateLeftX + entrance.gateSpan * 0.5, entrance.gateY + 26, 0.3);
    const hearthBoost = isWinterOrSnow ? 1.25 : 1.0;
    ctx.save();
    const gpGrad = ctx.createRadialGradient(gatePool.x, gatePool.y, 4, gatePool.x, gatePool.y, 74);
    gpGrad.addColorStop(
      0,
      `rgba(255, 206, 108, ${Math.min(0.32, 0.16 * lanternGlow * hearthBoost).toFixed(3)})`
    );
    gpGrad.addColorStop(
      0.55,
      `rgba(244, 152, 54, ${Math.min(0.15, 0.075 * lanternGlow * hearthBoost).toFixed(3)})`
    );
    gpGrad.addColorStop(1, 'rgba(244, 152, 54, 0)');
    ctx.fillStyle = gpGrad;
    ctx.beginPath();
    ctx.ellipse(gatePool.x, gatePool.y, 74, 33, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (isRain) {
    // Shimmering wet-stone amber lantern reflections beneath entrance gate & harbor streetlamps!
    ctx.save();
    const reflectAnchors = [
      { wx: entrance.gateLeftX + entrance.gateSpan * 0.5, wy: entrance.gateY + 28, r: 34 },
      { wx: ver.x + 16, wy: ver.y + ver.h - 2, r: 22 },
      ...(shopLevel >= 2 ? [{ wx: ver.x + ver.w - 12, wy: ver.y + ver.h - 2, r: 22 }] : []),
    ];
    for (let ri = 0; ri < reflectAnchors.length; ri++) {
      const a = reflectAnchors[ri];
      const rp = w2i(a.wx, a.wy, 0.4);
      const shimmer = 0.72 + Math.sin(timeSec * 4.4 + ri * 1.9) * 0.28;
      const rGrad = ctx.createRadialGradient(rp.x, rp.y, 2, rp.x, rp.y, a.r);
      rGrad.addColorStop(0, `rgba(255, 208, 114, ${(0.28 * shimmer).toFixed(2)})`);
      rGrad.addColorStop(0.55, `rgba(240, 152, 62, ${(0.12 * shimmer).toFixed(2)})`);
      rGrad.addColorStop(1, 'rgba(240, 152, 62, 0)');
      ctx.fillStyle = rGrad;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, a.r, a.r * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Animated rain puddle ripples across the exterior stone waiting veranda + eaves rain drips
    const rippleCount = isTyphoon ? 14 : 9;
    for (let r = 0; r < rippleCount; r++) {
      const cycle = (timeSec * (isTyphoon ? 1.85 : 1.3) + r * 0.37) % 1;
      const rx = ver.x + 18 + ((r * 83) % Math.max(40, ver.w - 36));
      const ry = ver.y + 10 + ((r * 37) % Math.max(18, ver.h - 18));
      const rp = w2i(rx, ry, 0.45);
      const rad = 2.2 + cycle * (isTyphoon ? 10.5 : 7.8);
      const alpha = (1 - cycle) * (isTyphoon ? 0.56 : 0.42);
      ctx.strokeStyle = `rgba(196, 232, 250, ${alpha.toFixed(2)})`;
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rad, rad * 0.48, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Glistening water drops falling off the entrance gate eaves
    for (let d = 0; d < 5; d++) {
      const dripT = (timeSec * (isTyphoon ? 2.4 : 1.8) + d * 0.23) % 1;
      const dx = entrance.gateLeftX - 4 + ((d + 0.5) / 5) * (entrance.gateSpan + 8);
      const dz = (shopLevel >= 4 ? 54 : 48) * (1 - dripT * dripT);
      const dp = w2i(dx, entrance.gateY + 8, dz);
      ctx.strokeStyle = `rgba(210, 240, 255, ${(0.55 * (1 - dripT * 0.6)).toFixed(2)})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(dp.x, dp.y - 3.5);
      ctx.lineTo(dp.x - (isTyphoon ? 2.2 : 0.6), dp.y + 2.5);
      ctx.stroke();
    }

    // Wind-whipped coastal sea-spray mist streaks sweeping across veranda during TYPHOON
    if (isTyphoon) {
      for (let s = 0; s < 5; s++) {
        const st = (timeSec * 1.4 + s * 0.21) % 1;
        const sx = ver.x + ver.w - st * (ver.w + 40);
        const sy = ver.y + 10 + (s / 4) * (ver.h - 16);
        const sp = w2i(sx, sy, 6 + s * 2);
        const alpha = Math.sin(st * Math.PI) * 0.3;
        ctx.strokeStyle = `rgba(202, 234, 250, ${alpha.toFixed(2)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(sp.x - 28, sp.y + 8);
        ctx.stroke();
      }
    }
    ctx.restore();
  } else if (isHeatwave) {
    // Rising translucent shimmering heat-mirage ripples along the hot sunlit veranda flagstones
    ctx.save();
    for (let hIdx = 0; hIdx < 6; hIdx++) {
      const cycle = (timeSec * 0.9 + hIdx * 0.19) % 1;
      const hx = ver.x + 24 + ((hIdx * 79) % Math.max(40, ver.w - 48));
      const hy = ver.y + 14 + ((hIdx * 23) % Math.max(16, ver.h - 24));
      const hp = w2i(hx, hy, 4 + cycle * 18);
      const alpha = Math.sin(cycle * Math.PI) * 0.34;
      ctx.strokeStyle = `rgba(255, 236, 174, ${alpha.toFixed(2)})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(hp.x - 9, hp.y);
      ctx.quadraticCurveTo(hp.x - 3, hp.y - 3 + Math.sin(timeSec * 6 + hIdx) * 1.8, hp.x + 3, hp.y);
      ctx.quadraticCurveTo(hp.x + 9, hp.y + 3 - Math.sin(timeSec * 6 + hIdx) * 1.8, hp.x + 15, hp.y);
      ctx.stroke();
    }
    ctx.restore();
  } else if (atmo?.weather === 'SNOWY') {
    // Shimmering crystalline frost sparkles along the snow-dusted veranda rim
    ctx.save();
    for (let s = 0; s < 10; s++) {
      const glint = Math.max(0, Math.sin(timeSec * 2.9 + s * 1.73));
      if (glint > 0.35) {
        const sx = ver.x + 14 + ((s * 67) % Math.max(40, ver.w - 28));
        const sy = ver.y + 8 + ((s * 29) % Math.max(16, ver.h - 14));
        const sp = w2i(sx, sy, 0.8);
        const sz = (glint - 0.3) * 3.4;
        ctx.strokeStyle = `rgba(242, 252, 255, ${(glint * 0.85).toFixed(2)})`;
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        ctx.moveTo(sp.x - sz, sp.y);
        ctx.lineTo(sp.x + sz, sp.y);
        ctx.moveTo(sp.x, sp.y - sz);
        ctx.lineTo(sp.x, sp.y + sz);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Warm cylindrical paper lanterns along back walls, dividing wall, and side walls
  // Subtly modulated by seasonal warmth when using default lantern palette
  const baseLanternTint =
    decorId === 'obsidian_sushi'
      ? '#F4978E'
      : decorId === 'azure_luxury'
        ? '#8CE5D8'
        : decorId === 'retro_mahogany'
          ? '#F27D52'
          : atmo?.season === 'WINTER' || atmo?.weather === 'SNOWY'
            ? '#FFAD5C'
            : atmo?.season === 'AUTUMN'
              ? '#F5B553'
              : atmo?.season === 'SPRING'
                ? '#FDE096'
                : '#F7CC72';
  const lanternTint = baseLanternTint;
  const effectiveLanternGlow =
    isWinterOrSnow || isRain ? Math.min(1.6, lanternGlow * 1.18) : lanternGlow;
  const interiorSway = isTyphoon ? 1.45 : 1.0;

  drawStyle3Lantern(ctx, 180, unifiedMinY + 8, 56, timeSec, lanternTint, effectiveLanternGlow, interiorSway);
  drawStyle3Lantern(ctx, 560, unifiedMinY + 8, 56, timeSec, lanternTint, effectiveLanternGlow, interiorSway);
  drawStyle3Lantern(ctx, 840, unifiedMinY + 8, 56, timeSec, lanternTint, effectiveLanternGlow, interiorSway);
  drawStyle3Lantern(ctx, 160, -6, 42, timeSec, lanternTint, effectiveLanternGlow, interiorSway);
  drawStyle3Lantern(ctx, 505, -6, 42, timeSec, lanternTint, effectiveLanternGlow, interiorSway);
  drawStyle3Lantern(ctx, 830, -6, 42, timeSec, lanternTint, effectiveLanternGlow, interiorSway);
  if (frontW > CANVAS_WIDTH) {
    drawStyle3Lantern(
      ctx,
      CANVAS_WIDTH + (frontW - CANVAS_WIDTH) * 0.5,
      -6,
      46,
      timeSec,
      lanternTint,
      effectiveLanternGlow,
      interiorSway
    );
  }
  drawStyle3Lantern(ctx, 10, 210, 56, timeSec, lanternTint, effectiveLanternGlow, interiorSway);
  drawStyle3Lantern(ctx, 10, 440, 56, timeSec, lanternTint, effectiveLanternGlow, interiorSway);
  if (frontH > CANVAS_HEIGHT) {
    drawStyle3Lantern(
      ctx,
      10,
      CANVAS_HEIGHT + (frontH - CANVAS_HEIGHT) * 0.5,
      56,
      timeSec,
      lanternTint,
      effectiveLanternGlow,
      interiorSway
    );
  }
}
