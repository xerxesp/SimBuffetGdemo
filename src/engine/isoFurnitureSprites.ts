import coldCratesUrl from '../assets/images/iso_v3_cold_crates_1795773603039.jpg';
import brothStoveUrl from '../assets/images/iso_v3_broth_stove_1795773541813.jpg';
import coldPrepUrl from '../assets/images/iso_v3_cold_prep_1795773541394.jpg';
import cookedHotUrl from '../assets/images/iso_v3_cooked_hot_1795773548406.jpg';
import dormBunkUrl from '../assets/images/iso_v3_dorm_bunk_1795773621815.jpg';
import dormTeaTableUrl from '../assets/images/iso_v3_dorm_teatable_1795773623559.jpg';
import drinksDessertUrl from '../assets/images/iso_v3_drinks_dessert_1795773554092.jpg';
import equipChillerUrl from '../assets/images/iso_v3_equip_chiller_1795773610616.jpg';
import equipSeparatorUrl from '../assets/images/iso_v3_equip_separator_1795773620409.jpg';
import hotpotSidesUrl from '../assets/images/iso_v3_hotpot_sides_1795773551239.jpg';
import hotpotTableUrl from '../assets/images/iso_v3_hotpot_table_1795773601044.jpg';
import iceBuffetUrl from '../assets/images/iso_v3_ice_buffet_1795773545106.jpg';
import liveAquariumUrl from '../assets/images/iso_v3_live_aquarium_1795773544313.jpg';
import officeBookcaseUrl from '../assets/images/iso_v3_office_bookcase_1795773603198.jpg';
import officeDeskUrl from '../assets/images/iso_v3_office_desk_1795773606414.jpg';
import rawMarinatedUrl from '../assets/images/iso_v3_raw_marinated_1795773559791.jpg';
import receptionUrl from '../assets/images/iso_v3_reception_1795773536687.jpg';
import restroomStallUrl from '../assets/images/iso_v3_restroom_stall_1795773608755.jpg';
import restroomVanityUrl from '../assets/images/iso_v3_restroom_vanity_1795773606909.jpg';
import sashimiSushiUrl from '../assets/images/iso_v3_sashimi_sushi_1795773554264.jpg';
import sinkUrl from '../assets/images/iso_v3_sink_1795773538820.jpg';
import steamDimsumUrl from '../assets/images/iso_v3_steam_dimsum_1795773557424.jpg';
import sterilizerUrl from '../assets/images/iso_v3_sterilizer_1795773540340.jpg';
import teppanGrillUrl from '../assets/images/iso_v3_teppan_grill_1795773552187.jpg';
import wagyuCarvingUrl from '../assets/images/iso_v3_wagyu_carving_1795773593921.jpg';

/**
 * All 25 unified style_isometric_tycoon_1795613182427 front-hall & backstage furniture sprite keys.
 */
export type FurnitureSpriteKey =
  // Front-Hall Core Stations & Reception
  | 'RECEPTION'
  | 'SINK'
  | 'CLEAN_RACK'
  | 'BROTH_KITCHEN'
  | 'COLD_PREP'
  // Front-Hall 10 Themed Buffet Islands
  | 'LIVE_AQUARIUM'
  | 'ICE_BUFFET'
  | 'HOTPOT_SIDES'
  | 'COOKED_HOT'
  | 'TEPPAN_BBQ'
  | 'SASHIMI_SUSHI'
  | 'DRINKS_DESSERT'
  | 'STEAM_DIMSUM'
  | 'RAW_MARINATED'
  | 'WAGYU_CARVING'
  // Front-Hall Dining Table
  | 'HOTPOT_TABLE'
  // Backstage 7 Rooms Dedicated Furniture
  | 'BACKSTAGE_COLD_CRATES'
  | 'OFFICE_BOOKCASE'
  | 'OFFICE_DESK'
  | 'RESTROOM_VANITY'
  | 'RESTROOM_STALL'
  | 'EQUIP_CHILLER'
  | 'EQUIP_SEPARATOR'
  | 'DORM_BUNK_BED'
  | 'DORM_TEA_TABLE';

export interface ProcessedFurnitureSprite {
  /** High-resolution crisp canvas (max 512px) used when zoomed in */
  canvasHi: HTMLCanvasElement;
  /** Pre-filtered half-resolution mip canvas (max 256px) preventing dark-ink shimmer when zoomed out */
  canvasLo: HTMLCanvasElement;
  width: number;
  height: number;
  /** Exact fraction from top (0..1) where the silhouette's lowest corner contacts the floor */
  baseAnchorY: number;
}

export interface FurnitureSpriteSpec {
  url: string;
  /** Standardized architectural 3D height in world Z units (characters ≈ 42z, walls = 74z) */
  canonicalHeightZ: number;
  /** Standardized footprint width fill ratio (0.84..1.00) */
  widthScale: number;
  /** Subtle horizontal aspect fill allowance keeping counters seated flush on floor diamonds */
  maxAspectStretch: number;
  /** True for sprites with enclosed open pure-white loops (lamp bars, desk knee-well, bunk frames, pipes) */
  punchInteriorHoles?: boolean;
  /** Floor contact Y fine-tune in isometric world-projected pixels */
  defaultOffsetY?: number;
}

interface SpriteEntry {
  spec: FurnitureSpriteSpec;
  status: 'idle' | 'loading' | 'ready' | 'error';
  processed: ProcessedFurnitureSprite | null;
}

const FURNITURE_SPECS: Record<FurnitureSpriteKey, FurnitureSpriteSpec> = {
  // Front-Hall Stations & Entrance (unified waist/cabinet heights relative to 42z characters)
  RECEPTION: {
    url: receptionUrl,
    canonicalHeightZ: 25,
    widthScale: 0.96,
    maxAspectStretch: 1.08,
    defaultOffsetY: 2,
  },
  SINK: {
    url: sinkUrl,
    canonicalHeightZ: 25,
    widthScale: 0.9,
    maxAspectStretch: 1.08,
    defaultOffsetY: 1,
  },
  CLEAN_RACK: {
    url: sterilizerUrl,
    canonicalHeightZ: 33,
    widthScale: 0.84,
    maxAspectStretch: 1.06,
    defaultOffsetY: 1,
  },
  BROTH_KITCHEN: {
    url: brothStoveUrl,
    canonicalHeightZ: 25,
    widthScale: 0.92,
    maxAspectStretch: 1.08,
    defaultOffsetY: 1,
  },
  COLD_PREP: {
    url: coldPrepUrl,
    canonicalHeightZ: 25,
    widthScale: 0.92,
    maxAspectStretch: 1.08,
    defaultOffsetY: 1,
  },

  // Front-Hall 10 Buffet Islands (harmonized architectural proportions)
  LIVE_AQUARIUM: {
    url: liveAquariumUrl,
    canonicalHeightZ: 40,
    widthScale: 0.96,
    maxAspectStretch: 1.08,
    defaultOffsetY: 2,
  },
  ICE_BUFFET: {
    url: iceBuffetUrl,
    canonicalHeightZ: 26,
    widthScale: 0.96,
    maxAspectStretch: 1.08,
    defaultOffsetY: 2,
  },
  HOTPOT_SIDES: {
    url: hotpotSidesUrl,
    canonicalHeightZ: 27,
    widthScale: 0.96,
    maxAspectStretch: 1.08,
    defaultOffsetY: 2,
  },
  COOKED_HOT: {
    url: cookedHotUrl,
    canonicalHeightZ: 34,
    widthScale: 0.95,
    maxAspectStretch: 1.08,
    punchInteriorHoles: true,
    defaultOffsetY: 2,
  },
  TEPPAN_BBQ: {
    url: teppanGrillUrl,
    canonicalHeightZ: 26,
    widthScale: 0.95,
    maxAspectStretch: 1.08,
    punchInteriorHoles: true,
    defaultOffsetY: 2,
  },
  SASHIMI_SUSHI: {
    url: sashimiSushiUrl,
    canonicalHeightZ: 30,
    widthScale: 0.96,
    maxAspectStretch: 1.08,
    defaultOffsetY: 2,
  },
  DRINKS_DESSERT: {
    url: drinksDessertUrl,
    canonicalHeightZ: 29,
    widthScale: 0.95,
    maxAspectStretch: 1.08,
    defaultOffsetY: 2,
  },
  STEAM_DIMSUM: {
    url: steamDimsumUrl,
    canonicalHeightZ: 29,
    widthScale: 0.95,
    maxAspectStretch: 1.08,
    defaultOffsetY: 2,
  },
  RAW_MARINATED: {
    url: rawMarinatedUrl,
    canonicalHeightZ: 27,
    widthScale: 0.96,
    maxAspectStretch: 1.08,
    defaultOffsetY: 2,
  },
  WAGYU_CARVING: {
    url: wagyuCarvingUrl,
    canonicalHeightZ: 35,
    widthScale: 0.95,
    maxAspectStretch: 1.08,
    punchInteriorHoles: true,
    defaultOffsetY: 2,
  },

  // Front-Hall Dining Table (burner center aligns to z=21.5)
  HOTPOT_TABLE: {
    url: hotpotTableUrl,
    canonicalHeightZ: 23,
    widthScale: 0.98,
    maxAspectStretch: 1.05,
    defaultOffsetY: 2,
  },

  // Backstage 7 Rooms Dedicated Furniture (identical scale rules to front hall)
  BACKSTAGE_COLD_CRATES: {
    url: coldCratesUrl,
    canonicalHeightZ: 27,
    widthScale: 0.96,
    maxAspectStretch: 1.08,
    defaultOffsetY: 2,
  },
  OFFICE_BOOKCASE: {
    url: officeBookcaseUrl,
    canonicalHeightZ: 44,
    widthScale: 0.96,
    maxAspectStretch: 1.08,
    defaultOffsetY: 2,
  },
  OFFICE_DESK: {
    url: officeDeskUrl,
    canonicalHeightZ: 28,
    widthScale: 0.98,
    maxAspectStretch: 1.08,
    punchInteriorHoles: true,
    defaultOffsetY: 2,
  },
  RESTROOM_VANITY: {
    url: restroomVanityUrl,
    canonicalHeightZ: 30,
    widthScale: 0.96,
    maxAspectStretch: 1.08,
    defaultOffsetY: 2,
  },
  RESTROOM_STALL: {
    url: restroomStallUrl,
    canonicalHeightZ: 38,
    widthScale: 0.94,
    maxAspectStretch: 1.06,
    defaultOffsetY: 2,
  },
  EQUIP_CHILLER: {
    url: equipChillerUrl,
    canonicalHeightZ: 38,
    widthScale: 0.96,
    maxAspectStretch: 1.08,
    punchInteriorHoles: true,
    defaultOffsetY: 2,
  },
  EQUIP_SEPARATOR: {
    url: equipSeparatorUrl,
    canonicalHeightZ: 26,
    widthScale: 0.96,
    maxAspectStretch: 1.08,
    punchInteriorHoles: true,
    defaultOffsetY: 2,
  },
  DORM_BUNK_BED: {
    url: dormBunkUrl,
    canonicalHeightZ: 44,
    widthScale: 0.96,
    maxAspectStretch: 1.08,
    punchInteriorHoles: true,
    defaultOffsetY: 2,
  },
  DORM_TEA_TABLE: {
    url: dormTeaTableUrl,
    canonicalHeightZ: 15,
    widthScale: 0.98,
    maxAspectStretch: 1.06,
    defaultOffsetY: 2,
  },
};

const SPRITE_REGISTRY: Record<FurnitureSpriteKey, SpriteEntry> = (
  Object.keys(FURNITURE_SPECS) as FurnitureSpriteKey[]
).reduce(
  (acc, key) => {
    acc[key] = { spec: FURNITURE_SPECS[key], status: 'idle', processed: null };
    return acc;
  },
  {} as Record<FurnitureSpriteKey, SpriteEntry>
);

function buildPreFilteredMip(src: HTMLCanvasElement, targetMaxDim: number): HTMLCanvasElement {
  const maxSide = Math.max(src.width, src.height);
  if (maxSide <= targetMaxDim) return src;

  // Stepped downsampling keeps dark sepia ligne-claire ink lines crisp at low map zoom levels
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

/**
 * Flood-fills connected near-white exterior background pixels from all 4 borders
 * so internal cream porcelain plates, crushed ice, pillows, and marble remain 100% opaque.
 * Optionally removes large enclosed flat-#FFFFFF air cavities inside overhead lamp arches,
 * bunk bed posts, desk knee-wells, or copper pipes, tight-crops, measures exact base contact,
 * and pre-builds a 2-tier crisp mip pyramid for uniform clarity across all map zoom levels.
 */
function processWhiteKeyedSprite(
  img: HTMLImageElement,
  punchInteriorHoles = false
): ProcessedFurnitureSprite {
  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const w = Math.max(1, Math.round((img.naturalWidth || 256) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || 256) * scale));

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const wctx = work.getContext('2d', { willReadFrequently: true });
  if (!wctx) {
    return { canvasHi: work, canvasLo: work, width: w, height: h, baseAnchorY: 0.99 };
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
    return minC >= 226 && maxC - minC <= 24;
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

  // Pass 1: Seed flood-fill from all 4 outer edges
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

  // Pass 2: Remove large flat #FFFFFF enclosed interior air cavities on arch/frame/pipe furniture
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
      if (cTail >= 55) {
        for (let k = 0; k < cTail; k++) {
          isBg[compQueue[k]] = 1;
        }
      }
    }
  }

  // Apply transparency to background + 1px anti-alias de-fringe + exact silhouette bounds
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
    return { canvasHi: work, canvasLo: work, width: w, height: h, baseAnchorY: 0.99 };
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

  // Exact base anchor fraction (lowest opaque pixel sits at maxY - cy inside cropped canvas)
  const baseAnchorY = Math.max(0.92, Math.min(0.996, (maxY - cy + 0.5) / Math.max(1, ch)));
  const canvasLo = buildPreFilteredMip(canvasHi, 240);

  return {
    canvasHi,
    canvasLo,
    width: cw,
    height: ch,
    baseAnchorY,
  };
}

function ensureSpriteLoaded(key: FurnitureSpriteKey): void {
  const entry = SPRITE_REGISTRY[key];
  if (entry.status !== 'idle') return;
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;

  entry.status = 'loading';
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      entry.processed = processWhiteKeyedSprite(img, Boolean(entry.spec.punchInteriorHoles));
      entry.status = 'ready';
    } catch {
      entry.status = 'error';
    }
  };
  img.onerror = () => {
    entry.status = 'error';
  };
  img.src = entry.spec.url;
}

/**
 * Eagerly preloads all 25 unified style_isometric_tycoon front-hall & backstage furniture sprites.
 */
export function preloadIsoFurnitureSprites(): void {
  (Object.keys(SPRITE_REGISTRY) as FurnitureSpriteKey[]).forEach((key) => {
    ensureSpriteLoaded(key);
  });
}

export function getIsoFurnitureSprite(key: FurnitureSpriteKey): ProcessedFurnitureSprite | null {
  const entry = SPRITE_REGISTRY[key];
  if (entry.status === 'idle') {
    ensureSpriteLoaded(key);
  }
  return entry.processed;
}

export function getIsoFurnitureSpec(key: FurnitureSpriteKey): FurnitureSpriteSpec {
  return SPRITE_REGISTRY[key].spec;
}

export interface DrawIsoFurnitureSpriteOptions {
  /** Projected isometric corners of the furniture's exact world floor footprint at z=0 */
  topPt: { x: number; y: number };
  rightPt: { x: number; y: number };
  bottomPt: { x: number; y: number };
  leftPt: { x: number; y: number };
  /**
   * Optional override for architectural 3D height in world Z units.
   * Defaults to each sprite's unified canonicalHeightZ so scale stays consistent across all rooms & levels.
   */
  heightZ?: number;
  /**
   * Flip horizontally so sprites with long front face angled bottom-left -> top-right (SE)
   * align cleanly onto horizontal counters facing SW (top-left -> bottom-right).
   */
  flipX?: boolean;
  /** Optional width fill ratio override (defaults to spec.widthScale) */
  widthScale?: number;
  /** Optional horizontal aspect fill allowance override (defaults to spec.maxAspectStretch) */
  maxAspectStretch?: number;
  /** Optional floor contact Y offset in world-iso pixels (defaults to spec.defaultOffsetY) */
  offsetY?: number;
  /** Optional warm highlight halo when hovered */
  isHovered?: boolean;
}

/**
 * Renders a unified style_isometric_tycoon furniture sprite calibrated strictly to its
 * world floor footprint diamond and canonical architectural Z height. Automatically selects
 * the optimal pre-filtered mip tier based on the live canvas zoom transform so proportions
 * and dark sepia ink lines remain crisp and visually uniform across all shop levels (Lv.1..Lv.5),
 * layers (Front Hall & Backstage), and camera zoom scales.
 */
export function drawIsoFurnitureSprite(
  ctx: CanvasRenderingContext2D,
  key: FurnitureSpriteKey,
  opts: DrawIsoFurnitureSpriteOptions
): boolean {
  const sprite = getIsoFurnitureSprite(key);
  if (!sprite) return false;

  const spec = SPRITE_REGISTRY[key].spec;
  const {
    topPt,
    rightPt,
    bottomPt,
    leftPt,
    heightZ = spec.canonicalHeightZ,
    flipX = false,
    widthScale = spec.widthScale,
    maxAspectStretch = spec.maxAspectStretch,
    offsetY = spec.defaultOffsetY ?? 2,
    isHovered = false,
  } = opts;

  const footMinX = Math.min(topPt.x, rightPt.x, bottomPt.x, leftPt.x);
  const footMaxX = Math.max(topPt.x, rightPt.x, bottomPt.x, leftPt.x);
  const footMinY = Math.min(topPt.y, rightPt.y, bottomPt.y, leftPt.y);
  const footMaxY = Math.max(topPt.y, rightPt.y, bottomPt.y, leftPt.y);

  const footW = Math.max(24, footMaxX - footMinX);
  const footH = Math.max(12, footMaxY - footMinY);

  // Unified world-space proportional bounding box: fits floor diamond width AND canonical Z height
  const maxW = footW * widthScale;
  const maxH = footH + heightZ;

  const uniformScale = Math.min(maxW / Math.max(1, sprite.width), maxH / Math.max(1, sprite.height));
  const drawH = Math.min(maxH, sprite.height * uniformScale);
  const drawW = Math.min(maxW, sprite.width * uniformScale * maxAspectStretch);

  const centerX = (footMinX + footMaxX) * 0.5;
  const drawBottomY = footMaxY + offsetY;
  const drawTopY = drawBottomY - drawH * sprite.baseAnchorY;

  // Select zoom-adaptive pre-filtered mip canvas based on live effective pixel size on screen
  const xform = ctx.getTransform();
  const screenZoom = Math.hypot(xform.a, xform.b) || 1;
  const screenDrawMax = Math.max(drawW, drawH) * screenZoom;
  const sourceCanvas = screenDrawMax <= 230 ? sprite.canvasLo : sprite.canvasHi;

  ctx.save();

  if (isHovered) {
    ctx.fillStyle = 'rgba(253, 224, 71, 0.18)';
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(topPt.x, topPt.y);
    ctx.lineTo(rightPt.x, rightPt.y);
    ctx.lineTo(bottomPt.x, bottomPt.y);
    ctx.lineTo(leftPt.x, leftPt.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (flipX) {
    ctx.translate(centerX, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sourceCanvas, -drawW * 0.5, drawTopY, drawW, drawH);
  } else {
    ctx.drawImage(sourceCanvas, centerX - drawW * 0.5, drawTopY, drawW, drawH);
  }

  ctx.restore();
  return true;
}

// Kick off background decode immediately when module is imported in browser
preloadIsoFurnitureSprites();
