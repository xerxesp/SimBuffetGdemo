import hallParquetUrl from '../assets/images/iso_tex_hall_parquet_1795774444549.jpg';
import kitchenTileUrl from '../assets/images/iso_tex_kitchen_tile_1795774444884.jpg';
import harborStoneUrl from '../assets/images/iso_tex_harbor_stone_1795774449881.jpg';
import wainscotWallUrl from '../assets/images/iso_tex_wainscot_wall_1795774477867.jpg';

import waitingBenchUrl from '../assets/images/iso_prop_waiting_bench_1795774449811.jpg';
import pottedPlanterUrl from '../assets/images/iso_prop_potted_planter_1795774450996.jpg';
import lacquerScreenUrl from '../assets/images/iso_prop_lacquer_screen_1795774452114.jpg';
import harborLampUrl from '../assets/images/iso_prop_harbor_lamp_1795774453401.jpg';
import seafoodCratesUrl from '../assets/images/iso_prop_seafood_crates_1795774456760.jpg';

import tableFeastYuanyangUrl from '../assets/images/iso_table_feast_yuanyang_1795774460953.jpg';
import tableDirtyDishesUrl from '../assets/images/iso_table_dirty_dishes_1795774465157.jpg';

export type PaintedSurfaceKey =
  | 'parquet_classic'
  | 'parquet_mahogany'
  | 'parquet_obsidian'
  | 'parquet_azure'
  | 'terrazzo_stone'
  | 'kitchen_quarry'
  | 'harbor_stone'
  | 'harbor_stone_rain'
  | 'harbor_stone_snow'
  | 'office_walnut'
  | 'dorm_oak'
  | 'wall_wainscot_s'
  | 'wall_wainscot_e';

export type EnvPropSpriteKey =
  | 'WAITING_BENCH'
  | 'POTTED_PLANTER'
  | 'LACQUER_SCREEN'
  | 'HARBOR_LAMP'
  | 'SEAFOOD_CRATES'
  | 'TABLE_FEAST_YUANYANG'
  | 'TABLE_DIRTY_DISHES';

interface ProcessedPropSprite {
  canvasHi: HTMLCanvasElement;
  canvasLo: HTMLCanvasElement;
  width: number;
  height: number;
  baseAnchorY: number;
}

interface EnvPropSpec {
  url: string;
  punchInteriorHoles?: boolean;
}

const BASE_TEXTURE_URLS = {
  parquet: hallParquetUrl,
  kitchen: kitchenTileUrl,
  harbor: harborStoneUrl,
  wainscot: wainscotWallUrl,
} as const;

type BaseTexId = keyof typeof BASE_TEXTURE_URLS;

const baseTexImages: Partial<Record<BaseTexId, HTMLImageElement>> = {};
const baseTexStatus: Record<BaseTexId, 'idle' | 'loading' | 'ready' | 'error'> = {
  parquet: 'idle',
  kitchen: 'idle',
  harbor: 'idle',
  wainscot: 'idle',
};

const paintedSurfaceCache = new Map<PaintedSurfaceKey, HTMLCanvasElement>();

const ENV_PROP_SPECS: Record<EnvPropSpriteKey, EnvPropSpec> = {
  WAITING_BENCH: { url: waitingBenchUrl, punchInteriorHoles: true },
  POTTED_PLANTER: { url: pottedPlanterUrl, punchInteriorHoles: false },
  LACQUER_SCREEN: { url: lacquerScreenUrl, punchInteriorHoles: false },
  HARBOR_LAMP: { url: harborLampUrl, punchInteriorHoles: true },
  SEAFOOD_CRATES: { url: seafoodCratesUrl, punchInteriorHoles: false },
  TABLE_FEAST_YUANYANG: { url: tableFeastYuanyangUrl, punchInteriorHoles: false },
  TABLE_DIRTY_DISHES: { url: tableDirtyDishesUrl, punchInteriorHoles: false },
};

const propRegistry: Record<
  EnvPropSpriteKey,
  { status: 'idle' | 'loading' | 'ready' | 'error'; processed: ProcessedPropSprite | null }
> = {
  WAITING_BENCH: { status: 'idle', processed: null },
  POTTED_PLANTER: { status: 'idle', processed: null },
  LACQUER_SCREEN: { status: 'idle', processed: null },
  HARBOR_LAMP: { status: 'idle', processed: null },
  SEAFOOD_CRATES: { status: 'idle', processed: null },
  TABLE_FEAST_YUANYANG: { status: 'idle', processed: null },
  TABLE_DIRTY_DISHES: { status: 'idle', processed: null },
};

function buildSteppedMip(src: HTMLCanvasElement, targetMaxDim: number): HTMLCanvasElement {
  const maxSide = Math.max(src.width, src.height);
  if (maxSide <= targetMaxDim) return src;
  let cur = src;
  let cw = src.width;
  let ch = src.height;
  while (Math.max(cw, ch) > targetMaxDim * 1.45) {
    const nw = Math.max(1, Math.round(cw * 0.55));
    const nh = Math.max(1, Math.round(ch * 0.55));
    const step = document.createElement('canvas');
    step.width = nw;
    step.height = nh;
    const sctx = step.getContext('2d');
    if (sctx) {
      sctx.imageSmoothingEnabled = true;
      sctx.imageSmoothingQuality = 'high';
      sctx.drawImage(cur, 0, 0, nw, nh);
    }
    cur = step;
    cw = nw;
    ch = nh;
  }
  const ratio = targetMaxDim / Math.max(cw, ch);
  const fw = Math.max(1, Math.round(cw * ratio));
  const fh = Math.max(1, Math.round(ch * ratio));
  const out = document.createElement('canvas');
  out.width = fw;
  out.height = fh;
  const octx = out.getContext('2d');
  if (octx) {
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(cur, 0, 0, fw, fh);
  }
  return out;
}

function processWhiteKeyedProp(
  img: HTMLImageElement,
  punchInteriorHoles = false
): ProcessedPropSprite {
  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const w = Math.max(1, Math.round((img.naturalWidth || 256) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || 256) * scale));

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const wctx = work.getContext('2d', { willReadFrequently: true });
  if (!wctx) {
    return { canvasHi: work, canvasLo: work, width: w, height: h, baseAnchorY: 0.98 };
  }
  wctx.imageSmoothingEnabled = true;
  wctx.imageSmoothingQuality = 'high';
  wctx.drawImage(img, 0, 0, w, h);

  const imgData = wctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const total = w * h;
  const isBg = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isNearWhite = (idx: number): boolean => {
    const o = idx * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
    const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
    return minC >= 228 && maxC - minC <= 24;
  };

  const isPureFlatWhite = (idx: number): boolean => {
    const o = idx * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const maxC = r > g ? (r > b ? r : b) : g > b ? g : b;
    const minC = r < g ? (r < b ? r : b) : g < b ? g : b;
    return minC >= 246 && maxC - minC <= 8;
  };

  const tryEnqueue = (x: number, y: number) => {
    const idx = y * w + x;
    if (isBg[idx]) return;
    if (isNearWhite(idx)) {
      isBg[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    tryEnqueue(x, 0);
    tryEnqueue(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    tryEnqueue(0, y);
    tryEnqueue(w - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) tryEnqueue(x - 1, y);
    if (x < w - 1) tryEnqueue(x + 1, y);
    if (y > 0) tryEnqueue(x, y - 1);
    if (y < h - 1) tryEnqueue(x, y + 1);
  }

  if (punchInteriorHoles) {
    const visited = new Uint8Array(total);
    const compQueue = new Int32Array(total);
    for (let startIdx = 0; startIdx < total; startIdx++) {
      if (isBg[startIdx] || visited[startIdx] || !isPureFlatWhite(startIdx)) continue;
      let cHead = 0;
      let cTail = 0;
      visited[startIdx] = 1;
      compQueue[cTail++] = startIdx;
      while (cHead < cTail) {
        const cur = compQueue[cHead++];
        const cx = cur % w;
        const cy = (cur - cx) / w;
        if (cx > 0) {
          const n = cur - 1;
          if (!isBg[n] && !visited[n] && isPureFlatWhite(n)) {
            visited[n] = 1;
            compQueue[cTail++] = n;
          }
        }
        if (cx < w - 1) {
          const n = cur + 1;
          if (!isBg[n] && !visited[n] && isPureFlatWhite(n)) {
            visited[n] = 1;
            compQueue[cTail++] = n;
          }
        }
        if (cy > 0) {
          const n = cur - w;
          if (!isBg[n] && !visited[n] && isPureFlatWhite(n)) {
            visited[n] = 1;
            compQueue[cTail++] = n;
          }
        }
        if (cy < h - 1) {
          const n = cur + w;
          if (!isBg[n] && !visited[n] && isPureFlatWhite(n)) {
            visited[n] = 1;
            compQueue[cTail++] = n;
          }
        }
      }
      if (cTail >= 45) {
        for (let k = 0; k < cTail; k++) {
          isBg[compQueue[k]] = 1;
        }
      }
    }
  }

  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const o = idx * 4;
      if (isBg[idx]) {
        data[o + 3] = 0;
        continue;
      }
      const touchesBg =
        (x > 0 && isBg[idx - 1]) ||
        (x < w - 1 && isBg[idx + 1]) ||
        (y > 0 && isBg[idx - w]) ||
        (y < h - 1 && isBg[idx + w]);
      if (touchesBg) {
        const lum = (data[o] * 299 + data[o + 1] * 587 + data[o + 2] * 114) / 1000;
        if (lum > 214) {
          const factor = Math.max(0, Math.min(1, (246 - lum) / 32));
          data[o + 3] = Math.round(255 * factor);
        }
      }
      if (data[o + 3] > 28) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  wctx.putImageData(imgData, 0, 0);
  if (maxX <= minX || maxY <= minY) {
    return { canvasHi: work, canvasLo: work, width: w, height: h, baseAnchorY: 0.98 };
  }

  const pad = 2;
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(w - cx, maxX - minX + 1 + pad * 2);
  const ch = Math.min(h - cy, maxY - minY + 1 + pad * 2);

  const canvasHi = document.createElement('canvas');
  canvasHi.width = cw;
  canvasHi.height = ch;
  const cctx = canvasHi.getContext('2d');
  if (cctx) {
    cctx.drawImage(work, cx, cy, cw, ch, 0, 0, cw, ch);
  }

  const baseAnchorY = Math.max(0.92, Math.min(0.996, (maxY - cy + 0.5) / Math.max(1, ch)));
  const canvasLo = buildSteppedMip(canvasHi, 220);

  return {
    canvasHi,
    canvasLo,
    width: cw,
    height: ch,
    baseAnchorY,
  };
}

function ensureBaseTexture(id: BaseTexId): HTMLImageElement | null {
  if (baseTexStatus[id] === 'ready') return baseTexImages[id] ?? null;
  if (baseTexStatus[id] !== 'idle') return null;
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null;

  baseTexStatus[id] = 'loading';
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    baseTexImages[id] = img;
    baseTexStatus[id] = 'ready';
    // Clear any cached tinted surfaces derived from this texture so they rebuild fresh
    paintedSurfaceCache.clear();
  };
  img.onerror = () => {
    baseTexStatus[id] = 'error';
  };
  img.src = BASE_TEXTURE_URLS[id];
  return null;
}

function ensurePropLoaded(key: EnvPropSpriteKey): void {
  const entry = propRegistry[key];
  if (entry.status !== 'idle') return;
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;

  entry.status = 'loading';
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      entry.processed = processWhiteKeyedProp(img, Boolean(ENV_PROP_SPECS[key].punchInteriorHoles));
      entry.status = 'ready';
    } catch {
      entry.status = 'error';
    }
  };
  img.onerror = () => {
    entry.status = 'error';
  };
  img.src = ENV_PROP_SPECS[key].url;
}

export function preloadIsoEnvironmentAssets(): void {
  (Object.keys(BASE_TEXTURE_URLS) as BaseTexId[]).forEach(ensureBaseTexture);
  (Object.keys(ENV_PROP_SPECS) as EnvPropSpriteKey[]).forEach(ensurePropLoaded);
}

/**
 * Returns a tileable, pre-filtered hand-painted surface canvas for seamless floors & walls.
 * Returns null while still decoding so procedural Canvas fallbacks render seamlessly with zero flash.
 */
export function getPaintedSurfaceCanvas(key: PaintedSurfaceKey): HTMLCanvasElement | null {
  const cached = paintedSurfaceCache.get(key);
  if (cached) return cached;

  let baseId: BaseTexId;
  let w = 256;
  let h = 256;
  let tintOverlay: string | null = null;
  let multiplyOverlay: string | null = null;

  switch (key) {
    case 'parquet_classic':
      baseId = 'parquet';
      tintOverlay = 'rgba(255, 240, 210, 0.05)';
      break;
    case 'parquet_mahogany':
      baseId = 'parquet';
      multiplyOverlay = 'rgba(150, 88, 56, 0.34)';
      break;
    case 'parquet_obsidian':
      baseId = 'parquet';
      multiplyOverlay = 'rgba(72, 74, 82, 0.48)';
      break;
    case 'parquet_azure':
      baseId = 'parquet';
      tintOverlay = 'rgba(210, 236, 228, 0.22)';
      break;
    case 'office_walnut':
      baseId = 'parquet';
      multiplyOverlay = 'rgba(138, 92, 58, 0.30)';
      break;
    case 'dorm_oak':
      baseId = 'parquet';
      tintOverlay = 'rgba(255, 244, 222, 0.14)';
      break;
    case 'terrazzo_stone':
      baseId = 'kitchen';
      multiplyOverlay = 'rgba(198, 190, 174, 0.22)';
      break;
    case 'kitchen_quarry':
      baseId = 'kitchen';
      multiplyOverlay = 'rgba(186, 138, 108, 0.32)';
      break;
    case 'harbor_stone':
      baseId = 'harbor';
      break;
    case 'harbor_stone_rain':
      baseId = 'harbor';
      multiplyOverlay = 'rgba(92, 126, 146, 0.44)';
      break;
    case 'harbor_stone_snow':
      baseId = 'harbor';
      tintOverlay = 'rgba(222, 240, 250, 0.56)';
      break;
    case 'wall_wainscot_s':
      baseId = 'wainscot';
      w = 192;
      h = 152;
      break;
    case 'wall_wainscot_e':
      baseId = 'wainscot';
      w = 192;
      h = 152;
      multiplyOverlay = 'rgba(182, 166, 148, 0.24)';
      break;
  }

  const img = ensureBaseTexture(baseId);
  if (!img) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  if (multiplyOverlay) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = multiplyOverlay;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (tintOverlay) {
    ctx.save();
    ctx.fillStyle = tintOverlay;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  paintedSurfaceCache.set(key, canvas);
  return canvas;
}

/**
 * Draws an isolated hand-painted architectural/exterior prop sprite anchored cleanly at its
 * projected world floor point `(anchorX, anchorY)` with zoom-adaptive crisp mip selection.
 */
export function drawIsoPropSprite(
  ctx: CanvasRenderingContext2D,
  key: EnvPropSpriteKey,
  opts: {
    anchorX: number;
    anchorY: number;
    targetHeight: number;
    maxWidth?: number;
    flipX?: boolean;
    alpha?: number;
  }
): boolean {
  const entry = propRegistry[key];
  if (entry.status === 'idle') ensurePropLoaded(key);
  const sprite = entry.processed;
  if (!sprite) return false;

  const { anchorX, anchorY, targetHeight, maxWidth, flipX = false, alpha = 1 } = opts;
  let drawH = targetHeight;
  let drawW = (sprite.width / Math.max(1, sprite.height)) * drawH;
  if (maxWidth && drawW > maxWidth) {
    const ratio = maxWidth / drawW;
    drawW *= ratio;
    drawH *= ratio;
  }

  const drawTopY = anchorY - drawH * sprite.baseAnchorY;
  const xform = ctx.getTransform();
  const screenZoom = Math.hypot(xform.a, xform.b) || 1;
  const sourceCanvas = Math.max(drawW, drawH) * screenZoom <= 210 ? sprite.canvasLo : sprite.canvasHi;

  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (flipX) {
    ctx.translate(anchorX, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sourceCanvas, -drawW * 0.5, drawTopY, drawW, drawH);
  } else {
    ctx.drawImage(sourceCanvas, anchorX - drawW * 0.5, drawTopY, drawW, drawH);
  }

  ctx.restore();
  return true;
}

/**
 * Draws a hand-painted isometric tabletop food/dishes overlay centered cleanly onto a hotpot table surface.
 */
export function drawIsoTabletopOverlay(
  ctx: CanvasRenderingContext2D,
  key: 'TABLE_FEAST_YUANYANG' | 'TABLE_DIRTY_DISHES',
  opts: {
    centerX: number;
    centerY: number;
    maxWidth: number;
    maxHeight: number;
    alpha?: number;
  }
): boolean {
  const entry = propRegistry[key];
  if (entry.status === 'idle') ensurePropLoaded(key);
  const sprite = entry.processed;
  if (!sprite) return false;

  const { centerX, centerY, maxWidth, maxHeight, alpha = 1 } = opts;
  const scale = Math.min(maxWidth / Math.max(1, sprite.width), maxHeight / Math.max(1, sprite.height));
  const drawW = sprite.width * scale;
  const drawH = sprite.height * scale;

  const xform = ctx.getTransform();
  const screenZoom = Math.hypot(xform.a, xform.b) || 1;
  const sourceCanvas = Math.max(drawW, drawH) * screenZoom <= 190 ? sprite.canvasLo : sprite.canvasHi;

  ctx.save();
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, centerX - drawW * 0.5, centerY - drawH * 0.52, drawW, drawH);
  ctx.restore();
  return true;
}

preloadIsoEnvironmentAssets();
