import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  getFrontHallBounds,
  getFrontHallEntranceLayout,
  STATIONS,
} from '../data/gameConfig';
import { BACKSTAGE_ROOMS } from '../data/policyAndTechConfig';
import { getCharacterDef } from '../data/storyConfig';
import { getDecorThemeDef } from '../data/tycoonSystemsConfig';
import { GameWorld, QueueCustomer } from '../types/game';
import {
  resolveManagerAnimAndFacing,
  resolveStaffAnimAndFacing,
} from './isoCharacterAnimations';
import {
  drawIsoCharacter,
  getStaffVisualPreset,
  resolveCustomerVisual,
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
  SceneAtmosphere,
} from './isoSceneArt';
import { getBackstagePlayerRoom } from './policyAndTech';
import { CanvasViewportTransform, SceneCamera } from './renderer';
import { getVisibleFrontHallPads } from './storyAndFacilities';

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
  const entrance = getFrontHallEntranceLayout(shopLevel);
  const frontW = bounds.width;
  const frontH = bounds.height;
  const ver = entrance.veranda;

  // Hull corners of the unified L-shaped Backstage + Front Hall + Extended Exterior South Waiting Veranda
  const corners = [
    worldToIso(-14, UNIFIED_MIN_Y - 14, 78),
    worldToIso(UNIFIED_MAX_X, UNIFIED_MIN_Y - 14, 78),
    worldToIso(UNIFIED_MAX_X + 8, UNIFIED_MIN_Y, 0),
    worldToIso(frontW + 8, -14, 48),
    worldToIso(frontW + 8, frontH + 24, -22),
    worldToIso(ver.x + ver.w + 14, ver.y + ver.h + 18, -16),
    worldToIso(Math.min(-14, ver.x - 10), ver.y + ver.h + 18, -16),
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

  minX -= 16;
  maxX += 24;
  minY -= 14;
  maxY += 28;

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
  const baseScale = Math.min(backingWidth / m.boundsW, backingHeight / m.boundsH) * 1.03;
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
  const atmo: SceneAtmosphere = {
    season: world.season,
    weather: world.weather,
    phase: world.phase,
    dayProgress: Math.max(0, Math.min(1, world.dayTime / Math.max(1, world.dayDuration))),
    timeSec,
  };

  // 1. Style-3 Deep Architectural Jade-Slate Backdrop Void (weather & time-of-day reactive)
  drawIsoArchitecturalBackdrop(ctx, backingWidth, backingHeight, vt.scale, atmo);

  // 2. Transform into Unified Isometric Architectural Space & Render Multi-Layer Cutaway Slab
  ctx.save();
  ctx.setTransform(vt.scale, 0, 0, vt.scale, vt.offsetX, vt.offsetY);
  drawIsoFoundationSlab(ctx, frontW, frontH, UNIFIED_MIN_Y, UNIFIED_MAX_X);

  // 3. Textured Architectural Floors, Sunbeams, Lantern Pools, Welcome Runner & Wall-Base AO
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
    BACKSTAGE_OFFSET_Y,
    atmo
  );

  // 4. Architectural Cutaway Walls, Wainscoting Panels, Lattice Windows, Shanshui Screen & Archways
  drawIsoSceneWalls(
    ctx,
    frontW,
    frontH,
    UNIFIED_MIN_Y,
    UNIFIED_MAX_X,
    BACKSTAGE_OFFSET_Y,
    decor.id,
    atmo
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

  // 5C. Adaptive Front-Entrance Reception Counter (right inside the front door!)
  const entrance = getFrontHallEntranceLayout(world.shopLevel);
  const rec = entrance.reception;
  const recHover =
    hoverPos !== null &&
    Math.abs(hoverPos.x - rec.x) <= rec.w * 0.65 &&
    Math.abs(hoverPos.y - rec.y) <= rec.h * 0.7;
  items.push({
    depth: rec.x + rec.y,
    draw: () => drawIsoReceptionDesk(ctx, world, recHover),
  });

  // 5D. Visible Front-Hall Zone Pads (Lv.1..Lv.5 map expansion — purchased, buyable, or under construction!)
  const visiblePads = getVisibleFrontHallPads(world);
  for (const { pad, purchased, buildingDays, zoneId } of visiblePads) {
    const isHov =
      hoverPos !== null &&
      hoverPos.x >= pad.x &&
      hoverPos.x <= pad.x + pad.w &&
      hoverPos.y >= pad.y &&
      hoverPos.y <= pad.y + pad.h;
    const padStatus = purchased ? 'PURCHASED' : buildingDays !== null ? 'BUILDING' : 'BUYABLE';
    items.push({
      depth: zoneId ? pad.x + pad.w * 0.5 + (pad.y + pad.h * 0.5) : -99999 + pad.x + pad.y,
      draw: () => drawIsoZonePad(ctx, pad, zoneId, world, timeSec, isHov, padStatus, buildingDays),
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

  // 5F. Queuing Guests OUTSIDE the Front Entrance Gate on the Exterior Stone Veranda!
  world.queue.forEach((qItem: QueueCustomer, idx: number) => {
    const party = qItem.party;
    const slotPos = entrance.getQueueSlotPos(idx);
    const qx = slotPos.x;
    const qy = slotPos.y;
    const vis = resolveCustomerVisual(party, `${party.id}_${idx}`);
    const ratio = Math.max(0, Math.min(1, party.patience / Math.max(1, party.maxPatience)));

    items.push({
      depth: qx + qy,
      draw: () => {
        drawIsoCharacter(ctx, {
          wx: qx,
          wy: qy,
          archetype: vis.archetype,
          bodyColor: vis.bodyColor,
          trimColor: vis.trimColor,
          pantsColor: vis.pantsColor,
          hairColor: vis.hairColor,
          hairStyle: vis.hairStyle,
          isVip: party.isVip,
          facing: 'NE',
          animState: 'QUEUE_WAIT',
          animTime: timeSec + idx * 0.83,
          patienceRatio: ratio,
          scale: 0.98,
        });
        const p = worldToIso(qx, qy, 43);
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

  // 5G. Hired Staff in Front Hall (4-dir multi-frame walk & interaction animations!)
  const canChatStaff =
    !world.mainStoryCompleted && (world.phase === 'PREP' || world.phase === 'CLOSING');
  for (const s of world.staff) {
    const preset = getStaffVisualPreset(s.role);
    const staffAnim = resolveStaffAnimAndFacing(s, world, timeSec);
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
          facing: staffAnim.facing,
          animState: staffAnim.animState,
          animTime: staffAnim.animTime,
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

  // 5H. Unified Player Manager Avatar (4-dir walk, carrying pot/tray/dishes, washing, welcoming!)
  const charDef = getCharacterDef(world.characterId);
  const isBackstageActive = world.activeScene === 'BACKSTAGE';
  const managerWx = isBackstageActive ? world.backstagePlayer.x : world.player.x;
  const managerWy = isBackstageActive
    ? world.backstagePlayer.y + BACKSTAGE_OFFSET_Y
    : world.player.y;
  const managerWalk = isBackstageActive ? world.backstagePlayer.walkCycle : world.player.walkCycle;
  const managerAnim = resolveManagerAnimAndFacing(world.player, world, timeSec, isBackstageActive);

  const isGhostMode =
    world.activeScene === 'DINING_HALL' && (world.player.ghostModeTimer ?? 0) > 0;

  items.push({
    depth: managerWx + managerWy + 1,
    draw: () => {
      ctx.save();
      if (isGhostMode) {
        ctx.globalAlpha = 0.62;
      }
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
        facing: managerAnim.facing,
        animState: managerAnim.animState,
        animTime: managerAnim.animTime,
        walkCycle: managerWalk,
        carrying: world.activeScene === 'DINING_HALL' ? world.player.carrying : 'NONE',
        highlightRing: isGhostMode ? '#67E8F9' : '#FDE047',
        scale: 1.08,
      });
      ctx.restore();
      const mp = worldToIso(managerWx, managerWy, 49);
      drawIsoTextTag(ctx, `店长·${charDef.name}`, mp.x, mp.y, {
        color: isGhostMode ? '#A5F3FC' : '#FEF08A',
        bg: 'rgba(38, 20, 12, 0.9)',
        border: isGhostMode ? '#67E8F9' : '#E8C97A',
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
    decor.id,
    atmo,
    world.shopLevel
  );

  // Clean subtle Wing Orientation Labels at the outer architectural edges (kept clear of extended outer queue!)
  const frontWingLabelX = Math.min(frontW - 84, Math.max(entrance.veranda.x + entrance.veranda.w + 96, frontW * 0.78));
  const frontWingLabel = worldToIso(frontWingLabelX, frontH + 34, 0);
  const queueVerandaLabel = worldToIso(entrance.veranda.x + entrance.veranda.w * 0.5, entrance.veranda.y + entrance.veranda.h + 16, 0);
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
  drawIsoTextTag(
    ctx,
    world.queue.length > 0 ? `门外候位区 · ${world.queue.length}组等位` : '门外候位区',
    queueVerandaLabel.x,
    queueVerandaLabel.y,
    {
      color: world.queue.length > 0 ? '#FEF08A' : '#E7D8B9',
      bg: 'rgba(34, 20, 14, 0.84)',
      border: world.queue.length > 0 ? '#F59E0B' : '#967240',
      fontSize: 9.5,
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
  // 7. WORLD PARTICLES, FLOATING FEEDBACK TEXTS & WEATHER / EVENING ATMOSPHERE
  // ==========================================
  for (const pt of world.particles) {
    const progress = 1 - pt.life / Math.max(0.05, pt.maxLife);
    const alpha = Math.max(0, Math.min(1, pt.life / Math.max(0.05, pt.maxLife * 0.6)));
    const zLift =
      pt.kind === 'STEAM'
        ? 24 + progress * 22
        : pt.kind === 'SPARKLE'
          ? 28 + progress * 14
          : pt.kind === 'SPLASH'
            ? 20 + Math.sin(progress * Math.PI) * 10
            : pt.kind === 'FLY'
              ? 26 + Math.sin(timeSec * 14 + pt.x) * 4
              : 34 + progress * 12;
    const pp = worldToIso(pt.x, pt.y, zLift);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (pt.kind === 'STEAM') {
      const r = pt.radius * (0.75 + progress * 0.85);
      ctx.fillStyle = pt.color || 'rgba(255, 250, 240, 0.55)';
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === 'SPARKLE') {
      const s = Math.max(2.2, pt.radius * 1.15);
      ctx.strokeStyle = pt.color || '#FEF08A';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(pp.x - s, pp.y);
      ctx.lineTo(pp.x + s, pp.y);
      ctx.moveTo(pp.x, pp.y - s);
      ctx.lineTo(pp.x, pp.y + s);
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, s * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === 'SPLASH') {
      ctx.fillStyle = pt.color || '#7DD3FC';
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, Math.max(1.4, pt.radius * 0.72), 0, Math.PI * 2);
      ctx.fill();
    } else if (pt.kind === 'FLY') {
      const wingFlutter = Math.sin(timeSec * 42 + pt.y) * 1.6;
      ctx.fillStyle = '#1E1B18';
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(220, 235, 240, 0.65)';
      ctx.beginPath();
      ctx.ellipse(pp.x - 1.4, pp.y - 1.2 + wingFlutter * 0.3, 1.6, 0.8, -0.4, 0, Math.PI * 2);
      ctx.ellipse(pp.x + 1.4, pp.y - 1.2 - wingFlutter * 0.3, 1.6, 0.8, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // ANGRY puff
      ctx.fillStyle = pt.color || '#EF4444';
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, Math.max(2.0, pt.radius * 0.85), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

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

  // Screen-space atmospheric lighting, distinct seasonal grading & rich weather layers
  if (world.phase === 'CLOSING') {
    // Cozy harbor evening twilight vignette leaving warm lantern-lit interior bright!
    ctx.save();
    const twGrad = ctx.createRadialGradient(
      backingWidth * 0.5,
      backingHeight * 0.52,
      backingHeight * 0.24,
      backingWidth * 0.5,
      backingHeight * 0.5,
      Math.max(backingWidth, backingHeight) * 0.78
    );
    twGrad.addColorStop(0, 'rgba(255, 196, 118, 0.05)');
    twGrad.addColorStop(0.58, 'rgba(14, 24, 42, 0.16)');
    twGrad.addColorStop(1, 'rgba(8, 15, 28, 0.34)');
    ctx.fillStyle = twGrad;
    ctx.fillRect(0, 0, backingWidth, backingHeight);
    ctx.restore();
  } else if (
    world.phase === 'PLAYING' &&
    atmo.dayProgress > 0.54 &&
    (world.weather === 'SUNNY' || world.weather === 'HEATWAVE')
  ) {
    // Warm golden-hour dusk sunlight wash sweeping softly from top-right
    const duskT = Math.min(1, (atmo.dayProgress - 0.54) / 0.42);
    ctx.save();
    const duskGrad = ctx.createLinearGradient(backingWidth, 0, backingWidth * 0.15, backingHeight);
    duskGrad.addColorStop(0, `rgba(255, 178, 86, ${(0.16 * duskT).toFixed(3)})`);
    duskGrad.addColorStop(0.55, `rgba(248, 152, 68, ${(0.06 * duskT).toFixed(3)})`);
    duskGrad.addColorStop(1, 'rgba(18, 28, 46, 0.06)');
    ctx.fillStyle = duskGrad;
    ctx.fillRect(0, 0, backingWidth, backingHeight);
    ctx.restore();
  }

  // Distinct Seasonal Ambient Overlay (visible even on SUNNY days so every season feels unmistakable!)
  if (world.weather !== 'RAINY' && world.weather !== 'TYPHOON') {
    if (world.season === 'SPRING') {
      ctx.save();
      // Fresh warm spring sunlit veil + abundant fluttering cherry-blossom petals across viewport
      const spGrad = ctx.createLinearGradient(0, 0, backingWidth, backingHeight);
      spGrad.addColorStop(0, 'rgba(255, 224, 238, 0.075)');
      spGrad.addColorStop(0.5, 'rgba(255, 248, 232, 0.03)');
      spGrad.addColorStop(1, 'rgba(167, 243, 208, 0.045)');
      ctx.fillStyle = spGrad;
      ctx.fillRect(0, 0, backingWidth, backingHeight);

      const petals = 42;
      for (let i = 0; i < petals; i++) {
        const layer = i % 3; // 0 = distant, 1 = mid, 2 = foreground soft petal
        const speedX = 34 + layer * 16 + (i % 5) * 6;
        const speedY = 22 + layer * 11 + (i % 4) * 5;
        const px =
          ((i * 191 + timeSec * speedX + Math.sin(timeSec * 1.4 + i) * 28) % (backingWidth + 100)) -
          50;
        const py =
          ((i * 127 + timeSec * speedY + Math.cos(timeSec * 1.1 + i * 0.7) * 18) %
            (backingHeight + 80)) -
          40;
        const rot = timeSec * (1.2 + layer * 0.5) + i * 1.7;
        const rx = 3.2 + layer * 1.45;
        const ry = 1.8 + layer * 0.75;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.fillStyle =
          i % 3 === 0
            ? `rgba(255, 228, 240, ${(0.55 + layer * 0.14).toFixed(2)})`
            : `rgba(251, 168, 206, ${(0.5 + layer * 0.14).toFixed(2)})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    } else if (world.season === 'SUMMER' || world.weather === 'HEATWAVE') {
      ctx.save();
      const isHeat = world.weather === 'HEATWAVE';
      // Radiant diagonal summer sunbeams & warm shimmering golden motes
      const sunGrad = ctx.createLinearGradient(backingWidth, 0, backingWidth * 0.18, backingHeight * 0.82);
      sunGrad.addColorStop(0, isHeat ? 'rgba(255, 202, 92, 0.20)' : 'rgba(255, 226, 134, 0.12)');
      sunGrad.addColorStop(0.45, isHeat ? 'rgba(255, 176, 76, 0.08)' : 'rgba(255, 218, 128, 0.04)');
      sunGrad.addColorStop(1, 'rgba(255, 210, 120, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, backingWidth, backingHeight);

      // Soft diagonal sun shafts from top-right
      for (let b = 0; b < 3; b++) {
        const bx = backingWidth * (0.58 + b * 0.17);
        const shimmer = 0.78 + Math.sin(timeSec * 1.6 + b * 2.1) * 0.22;
        const rayGrad = ctx.createLinearGradient(bx, 0, bx - 220, backingHeight * 0.75);
        rayGrad.addColorStop(0, `rgba(255, 240, 180, ${((isHeat ? 0.13 : 0.075) * shimmer).toFixed(3)})`);
        rayGrad.addColorStop(1, 'rgba(255, 240, 180, 0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(bx - 42, 0);
        ctx.lineTo(bx + 54, 0);
        ctx.lineTo(bx - 165, backingHeight * 0.78);
        ctx.lineTo(bx - 270, backingHeight * 0.78);
        ctx.closePath();
        ctx.fill();
      }

      // Floating sunlit golden dust motes
      const motes = isHeat ? 26 : 16;
      for (let i = 0; i < motes; i++) {
        const mx = ((i * 211 + Math.sin(timeSec * 0.65 + i) * 34) % backingWidth + backingWidth) % backingWidth;
        const my = ((i * 139 - timeSec * (10 + (i % 4) * 4)) % backingHeight + backingHeight) % backingHeight;
        const pulse = 0.4 + Math.sin(timeSec * 2.8 + i * 1.5) * 0.35;
        ctx.fillStyle = `rgba(255, 242, 178, ${(pulse * (isHeat ? 0.75 : 0.5)).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(mx, my, 1.4 + (i % 3) * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (world.season === 'AUTUMN') {
      ctx.save();
      // Warm amber-ochre autumn light wash + swirling golden ginkgo & crimson maple leaves
      const auGrad = ctx.createLinearGradient(backingWidth, 0, 0, backingHeight);
      auGrad.addColorStop(0, 'rgba(245, 166, 62, 0.12)');
      auGrad.addColorStop(0.55, 'rgba(217, 119, 6, 0.045)');
      auGrad.addColorStop(1, 'rgba(120, 53, 15, 0.06)');
      ctx.fillStyle = auGrad;
      ctx.fillRect(0, 0, backingWidth, backingHeight);

      const leaves = 38;
      for (let i = 0; i < leaves; i++) {
        const layer = i % 3;
        const speedX = 44 + layer * 18 + (i % 5) * 7;
        const speedY = 26 + layer * 12 + (i % 4) * 6;
        const lx =
          ((i * 197 + timeSec * speedX + Math.sin(timeSec * 1.7 + i) * 34) % (backingWidth + 100)) -
          50;
        const ly =
          ((i * 131 + timeSec * speedY + Math.cos(timeSec * 1.3 + i) * 20) % (backingHeight + 80)) -
          40;
        const rot = timeSec * (1.6 + layer * 0.55) + i * 1.4;
        const r = 3.8 + layer * 1.6;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(rot);
        ctx.fillStyle =
          i % 3 === 0
            ? `rgba(220, 68, 42, ${(0.62 + layer * 0.12).toFixed(2)})`
            : i % 2 === 0
              ? `rgba(245, 180, 42, ${(0.64 + layer * 0.12).toFixed(2)})`
              : `rgba(234, 120, 32, ${(0.6 + layer * 0.12).toFixed(2)})`;
        ctx.beginPath();
        // Stylized ginkgo / maple leaf silhouette
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(r * 0.95, -r * 0.2, r * 0.65, r * 0.7);
        ctx.lineTo(0, r * 0.35);
        ctx.lineTo(-r * 0.65, r * 0.7);
        ctx.quadraticCurveTo(-r * 0.95, -r * 0.2, 0, -r);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  // Intense Weather Effects: Rain, Typhoon (with lightning pulse!), and Winter/Snowy multi-depth Snowfall!
  if (world.weather === 'RAINY' || world.weather === 'TYPHOON') {
    const isTyphoon = world.weather === 'TYPHOON';
    ctx.save();
    // Atmospheric cool harbor storm grading
    const stormGrad = ctx.createLinearGradient(0, 0, 0, backingHeight);
    stormGrad.addColorStop(0, isTyphoon ? 'rgba(12, 28, 44, 0.24)' : 'rgba(18, 38, 54, 0.14)');
    stormGrad.addColorStop(1, isTyphoon ? 'rgba(16, 36, 52, 0.16)' : 'rgba(20, 42, 58, 0.08)');
    ctx.fillStyle = stormGrad;
    ctx.fillRect(0, 0, backingWidth, backingHeight);

    // Subtle periodic distant lightning flash during TYPHOON
    if (isTyphoon) {
      const boltCycle = (timeSec * 0.22) % 1;
      if (boltCycle > 0.94 && boltCycle < 0.985) {
        const flashIntensity = Math.sin(((boltCycle - 0.94) / 0.045) * Math.PI) * 0.16;
        ctx.fillStyle = `rgba(220, 240, 255, ${flashIntensity.toFixed(3)})`;
        ctx.fillRect(0, 0, backingWidth, backingHeight);
      }
    }

    // Two-depth rain curtains (distant fine rain + bold wind-driven foreground streaks)
    const drops = isTyphoon ? 132 : 84;
    for (let i = 0; i < drops; i++) {
      const fg = i % 3 === 0;
      const windDx = isTyphoon ? (fg ? -30 : -20) : fg ? -16 : -10;
      const lenY = isTyphoon ? (fg ? 42 : 28) : fg ? 34 : 22;
      const speedX = isTyphoon ? (fg ? 760 : 520) : fg ? 480 : 340;
      const speedY = isTyphoon ? (fg ? 1020 : 760) : fg ? 780 : 580;
      const rx = ((i * 197 + timeSec * speedX) % (backingWidth + 240)) - 120;
      const ry = ((i * 131 + timeSec * speedY) % (backingHeight + 160)) - 80;
      ctx.strokeStyle = isTyphoon
        ? fg
          ? 'rgba(196, 232, 255, 0.44)'
          : 'rgba(164, 212, 248, 0.26)'
        : fg
          ? 'rgba(212, 242, 255, 0.34)'
          : 'rgba(182, 224, 246, 0.20)';
      ctx.lineWidth = fg ? (isTyphoon ? 1.85 : 1.45) : 1.0;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + windDx, ry + lenY);
      ctx.stroke();
    }
    ctx.restore();
  } else if (world.weather === 'SNOWY' || world.season === 'WINTER') {
    const isBlizzard = world.weather === 'SNOWY';
    ctx.save();
    // Crisp frosty winter corner vignette leaving warm golden restaurant interior cozy!
    const frostGrad = ctx.createRadialGradient(
      backingWidth * 0.5,
      backingHeight * 0.5,
      backingHeight * 0.26,
      backingWidth * 0.5,
      backingHeight * 0.5,
      Math.max(backingWidth, backingHeight) * 0.78
    );
    frostGrad.addColorStop(0, 'rgba(224, 242, 254, 0)');
    frostGrad.addColorStop(0.68, isBlizzard ? 'rgba(186, 226, 250, 0.08)' : 'rgba(186, 226, 250, 0.04)');
    frostGrad.addColorStop(1, isBlizzard ? 'rgba(204, 234, 252, 0.22)' : 'rgba(186, 226, 250, 0.13)');
    ctx.fillStyle = frostGrad;
    ctx.fillRect(0, 0, backingWidth, backingHeight);

    const flakes = isBlizzard ? 86 : 34;
    for (let i = 0; i < flakes; i++) {
      const layer = i % 3;
      const speedY = (isBlizzard ? 48 : 28) + layer * 18 + (i % 4) * 7;
      const windX = (isBlizzard ? 26 : 12) + layer * 9;
      const fx =
        ((i * 173 + timeSec * windX + Math.sin(timeSec * (1.2 + layer * 0.35) + i) * 32) %
          (backingWidth + 100)) -
        50;
      const fy = ((i * 109 + timeSec * speedY) % (backingHeight + 80)) - 40;
      const r = (isBlizzard ? 1.8 : 1.4) + layer * 1.15;
      const alpha = (isBlizzard ? 0.56 : 0.4) + layer * 0.14;
      ctx.fillStyle = `rgba(246, 252, 255, ${Math.min(0.92, alpha).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
