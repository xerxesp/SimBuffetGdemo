import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  getFrontHallBounds,
  STATIONS,
} from '../data/gameConfig';
import { BACKSTAGE_ROOMS } from '../data/policyAndTechConfig';
import { getCharacterDef } from '../data/storyConfig';
import { getDecorThemeDef } from '../data/tycoonSystemsConfig';
import { GameWorld, QueueCustomer } from '../types/game';
import {
  drawIsoCharacter,
  getGuestStyleBySeed,
  getStaffVisualPreset,
} from './isoCharacterArt';
import {
  drawIsoBackstageRoomProps,
  drawIsoHotpotTable,
  drawIsoReceptionDesk,
  drawIsoTextTag,
  drawIsoTopKitchenStation,
  drawIsoZonePad,
} from './isoFurnitureArt';
import {
  drawIsoArchitecturalBackdrop,
  drawIsoFoundationSlab,
  drawIsoSceneFloors,
  drawIsoSceneForegroundRimAndLights,
  drawIsoSceneWalls,
} from './isoSceneArt';
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

  // 1. Style-3 Deep Architectural Jade-Slate Backdrop Void (clean neutral drafting surround)
  drawIsoArchitecturalBackdrop(ctx, backingWidth, backingHeight, vt.scale);

  // 2. Transform into Unified Isometric Architectural Space & Render Multi-Layer Cutaway Slab
  ctx.save();
  ctx.setTransform(vt.scale, 0, 0, vt.scale, vt.offsetX, vt.offsetY);
  drawIsoFoundationSlab(ctx, frontW, frontH, UNIFIED_MIN_Y, UNIFIED_MAX_X);

  // 3. Textured Architectural Floors, Linear Drain Grates, Woven Welcome Runner & Wall-Base AO
  const activeBackstageRoom =
    world.activeScene === 'BACKSTAGE' ? getBackstagePlayerRoom(world) : null;
  drawIsoSceneFloors(
    ctx,
    world,
    decor.id,
    frontW,
    frontH,
    activeBackstageRoom,
    hoverPos,
    UNIFIED_MIN_Y,
    UNIFIED_MAX_X,
    BACKSTAGE_OFFSET_Y
  );

  // 4. Architectural Cutaway Walls, Wainscoting Panels, Celadon Tile Walls, Shanshui Screen & Archways
  drawIsoSceneWalls(
    ctx,
    frontW,
    frontH,
    UNIFIED_MIN_Y,
    UNIFIED_MAX_X,
    BACKSTAGE_OFFSET_Y,
    decor.id
  );

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
          isHov,
          BACKSTAGE_OFFSET_Y
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

  // 5C. Front Hall Reception Counter
  const rec = STATIONS.RECEPTION;
  const recHover =
    hoverPos !== null &&
    Math.abs(hoverPos.x - rec.x) <= rec.w * 0.6 &&
    Math.abs(hoverPos.y - rec.y) <= rec.h * 0.6;
  items.push({
    depth: rec.x + rec.y,
    draw: () => drawIsoReceptionDesk(ctx, world, recHover),
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
    const palette = getGuestStyleBySeed(`${party.id}_${idx}`);
    const isElder =
      party.specialStoryId === 'master_zhou' || party.specialStoryId === 'critic_shen';

    items.push({
      depth: qx + qy,
      draw: () => {
        drawIsoCharacter(ctx, {
          wx: qx,
          wy: qy,
          archetype: party.isVip ? 'VIP' : isElder ? 'ELDER' : 'GUEST',
          bodyColor: party.isVip ? '#3E454D' : isElder ? '#B89668' : palette.body,
          trimColor: party.isVip ? '#F4F1EA' : palette.trim,
          pantsColor: party.isVip ? '#31363D' : palette.pants,
          hairColor: isElder ? '#A19E98' : palette.hair,
          hairStyle: isElder ? 'ELDER' : party.isVip ? 'PARTED' : palette.hairStyle,
          isVip: party.isVip,
          scale: 0.98,
        });
        const p = worldToIso(qx, qy, 43);
        const ratio = Math.max(0, Math.min(1, party.patience / Math.max(1, party.maxPatience)));
        ctx.fillStyle = 'rgba(18, 12, 8, 0.85)';
        ctx.fillRect(p.x - 16, p.y - 2, 32, 4.4);
        ctx.fillStyle = ratio > 0.5 ? '#4ADE80' : ratio > 0.25 ? '#FBBF24' : '#EF4444';
        ctx.fillRect(p.x - 15.5, p.y - 1.5, 31 * ratio, 3.4);
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

  // 5G. Hired Staff in Front Hall (refined slender 1:4.8 Ligne Claire uniforms)
  const canChatStaff =
    !world.mainStoryCompleted && (world.phase === 'PREP' || world.phase === 'CLOSING');
  for (const s of world.staff) {
    const preset = getStaffVisualPreset(s.role);
    items.push({
      depth: s.x + s.y,
      draw: () => {
        drawIsoCharacter(ctx, {
          wx: s.x,
          wy: s.y,
          archetype: preset.archetype,
          staffRole: s.role,
          bodyColor: preset.bodyColor,
          trimColor: preset.trimColor,
          pantsColor: preset.pantsColor,
          hairColor: preset.hairColor,
          hairStyle: preset.hairStyle,
          walkCycle: s.walkCycle,
          carrying: s.carrying,
          highlightRing:
            canChatStaff && !world.staffChattedTodayIds.includes(s.id)
              ? 'rgba(232, 201, 122, 0.75)'
              : undefined,
          scale: 1.0,
        });
        if (canChatStaff && !world.staffChattedTodayIds.includes(s.id)) {
          const sp = worldToIso(s.x, s.y, 46 + Math.sin(timeSec * 3.5 + s.x) * 2);
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
        archetype: 'MANAGER',
        bodyColor: '#6D282C',
        trimColor: '#F6DA8D',
        pantsColor: '#363231',
        hairColor: '#1E1510',
        hairStyle: 'PARTED',
        isManager: true,
        walkCycle: managerWalk,
        carrying: world.activeScene === 'DINING_HALL' ? world.player.carrying : 'NONE',
        highlightRing: '#FDE047',
        scale: 1.08,
      });
      const mp = worldToIso(managerWx, managerWy, 49);
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
  // 6. LOW FRONT ARCHITECTURAL CUTAWAY RIM, TIMBER ENTRY GATE & WARM LANTERNS
  // ==========================================
  drawIsoSceneForegroundRimAndLights(
    ctx,
    frontW,
    frontH,
    UNIFIED_MIN_Y,
    UNIFIED_MAX_X,
    timeSec,
    decor.id
  );

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
