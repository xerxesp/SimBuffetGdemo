import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../data/gameConfig';
import {
  BACKSTAGE_CORRIDOR,
  BACKSTAGE_EXIT_DOOR,
  BACKSTAGE_ROOMS,
  BackstageRoomRect,
} from '../data/policyAndTechConfig';
import { getCharacterDef, getSpecialStaffDef } from '../data/storyConfig';
import { GameWorld } from '../types/game';
import {
  drawPixelSprite,
  getCrushedIceTile,
  getHotpotSprite,
  getKitchenTile,
  getLanternSprite,
  getManagerSprite,
  getPlateStackSprite,
  getSeafoodSprite,
  getStaffSprite,
  getWoodPlankTile,
} from './pixelSprites';
import { getBackstagePlayerRoom } from './policyAndTech';
import { getCanvasViewportTransform, SceneCamera } from './renderer';

function drawPixelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  topHi: string,
  lip: string,
  border = '#120E14'
) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  ctx.fillStyle = border;
  ctx.fillRect(rx, ry, rw, rh);
  ctx.fillStyle = fill;
  ctx.fillRect(rx + 2, ry + 2, rw - 4, rh - 4);
  ctx.fillStyle = topHi;
  ctx.fillRect(rx + 2, ry + 2, rw - 4, 2);
  ctx.fillStyle = lip;
  ctx.fillRect(rx + 2, ry + rh - 6, rw - 4, 4);
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts?: { color?: string; bg?: string; border?: string; fontSize?: number }
) {
  const fs = opts?.fontSize ?? 11;
  ctx.save();
  ctx.font = `700 ${fs}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (opts?.bg) {
    const tw = Math.ceil(ctx.measureText(text).width) + 12;
    const th = fs + 6;
    const bx = Math.round(x - tw / 2);
    const by = Math.round(y - th / 2);
    ctx.fillStyle = opts.border ?? '#161117';
    ctx.fillRect(bx - 1, by - 1, tw + 2, th + 2);
    ctx.fillStyle = opts.bg;
    ctx.fillRect(bx, by, tw, th);
  } else {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10, 8, 14, 0.92)';
    ctx.strokeText(text, Math.round(x), Math.round(y));
  }
  ctx.fillStyle = opts?.color ?? '#FFF6E5';
  ctx.fillText(text, Math.round(x), Math.round(y));
  ctx.restore();
}

function drawRoomProps(
  ctx: CanvasRenderingContext2D,
  room: BackstageRoomRect,
  world: GameWorld,
  timeSec: number
) {
  const { x, y, w, h } = room;
  const icePat = ctx.createPattern(getCrushedIceTile(), 'repeat');
  const boilFrame = Math.floor(timeSec * 4) % 2;

  switch (room.id) {
    case 'cold_storage': {
      // Live seafood oxygenated glass tank on left
      drawPixelBox(ctx, x + 14, y + 36, 94, 72, '#1B4965', '#67E8F9', '#0E2D40');
      ctx.fillStyle = '#227C9D';
      ctx.fillRect(x + 20, y + 42, 82, 54);
      // Animated oxygen bubbles
      const bShift = Math.floor(timeSec * 5) % 8;
      ctx.fillStyle = '#E0F7FF';
      ctx.fillRect(x + 32, y + 84 - bShift * 4, 3, 3);
      ctx.fillRect(x + 62, y + 78 - ((bShift + 4) % 8) * 4, 3, 3);
      ctx.fillRect(x + 86, y + 86 - ((bShift + 2) % 8) * 4, 3, 3);
      drawPixelSprite(ctx, getSeafoodSprite('lobster'), x + 46, y + 66, 1.8, 0.5, 0.5);
      drawPixelSprite(ctx, getSeafoodSprite('abalone_live'), x + 80, y + 70, 1.7, 0.5, 0.5);

      // Chilled freezer vault + raw crates on right
      drawPixelBox(ctx, x + 118, y + 36, 82, 56, '#334E68', '#9FB3C8', '#1F3244');
      ctx.fillStyle = icePat ?? '#8BE4FA';
      ctx.fillRect(x + 124, y + 44, 70, 36);
      drawPixelSprite(ctx, getSeafoodSprite('prawns'), x + 144, y + 62, 1.8, 0.5, 0.5);
      drawPixelSprite(ctx, getSeafoodSprite('salmon'), x + 174, y + 62, 1.8, 0.5, 0.5);

      // Stainless prep table
      drawPixelBox(ctx, x + 20, y + 124, 96, 36, '#64748B', '#CBD5E1', '#334155');
      drawLabel(ctx, `原料 ${world.rawIngredients}/${world.rawIngredientsMax} · 氧${Math.round(world.oxygenLevel)}%`, x + w / 2, y + h - 42, {
        fontSize: 9,
        color: '#BAE6FD',
        bg: 'rgba(12, 32, 48, 0.88)',
        border: '#38BDF8',
      });
      break;
    }

    case 'hot_kitchen': {
      // Twin blazing wok & teppanyaki range
      drawPixelBox(ctx, x + 16, y + 36, w - 32, 64, '#3A211D', '#8C5142', '#1F100E');
      const fireCol = Math.floor(timeSec * 8) % 2 === 0 ? '#FB923C' : '#EF4444';
      ctx.fillStyle = fireCol;
      ctx.fillRect(x + 42, y + 82, 26, 5);
      ctx.fillRect(x + 132, y + 82, 26, 5);
      drawPixelSprite(ctx, getHotpotSprite('#D9381E', '#F59E0B', boilFrame), x + 56, y + 66, 2.0, 0.5, 0.5);
      drawPixelSprite(ctx, getHotpotSprite('#F59E0B', '#FEF08A', boilFrame + 1), x + 146, y + 66, 2.0, 0.5, 0.5);

      // Heated pass-through plating counter
      drawPixelBox(ctx, x + 18, y + 118, 108, 40, '#5E2D1E', '#D97706', '#2E140D');
      drawPixelSprite(ctx, getSeafoodSprite('garlic_scallops'), x + 48, y + 136, 1.9, 0.5, 0.5);
      drawPixelSprite(ctx, getSeafoodSprite('typhoon_crab'), x + 94, y + 136, 1.9, 0.5, 0.5);

      drawLabel(ctx, `熟食备货 ${world.cookedStock}/${world.cookedMaxStock}`, x + w / 2, y + h - 42, {
        fontSize: 9,
        color: '#FED7AA',
        bg: 'rgba(67, 20, 7, 0.9)',
        border: '#FB923C',
      });
      break;
    }

    case 'dish_washroom': {
      // High-temp commercial dishwasher + double sink
      drawPixelBox(ctx, x + 16, y + 36, w - 32, 58, '#475569', '#94A3B8', '#1E293B');
      ctx.fillStyle = '#0E7490';
      ctx.fillRect(x + 24, y + 46, 78, 34);
      ctx.fillStyle = '#155E75';
      ctx.fillRect(x + 112, y + 46, 78, 34);
      drawPixelSprite(ctx, getPlateStackSprite(true), x + 62, y + 62, 1.9, 0.5, 0.5);
      drawPixelSprite(ctx, getPlateStackSprite(false), x + 150, y + 62, 1.9, 0.5, 0.5);

      // Shell waste sorting bin + sterilizer rack
      drawPixelBox(ctx, x + 120, y + 112, 74, 48, '#1E3A4C', '#67E8F9', '#11222E');
      ctx.fillStyle = '#67E8F9';
      ctx.fillRect(x + 128, y + 118, 58, 2);
      drawPixelSprite(ctx, getPlateStackSprite(false), x + 156, y + 138, 1.9, 0.5, 0.5);

      drawLabel(ctx, `脏盘:${world.dirtyDishes} · 净盘:${world.cleanDishes}/${world.dishwareMax}`, x + w / 2, y + h - 42, {
        fontSize: 9,
        color: '#CFFAFE',
        bg: 'rgba(14, 45, 58, 0.9)',
        border: '#67E8F9',
      });
      break;
    }

    case 'office': {
      // Mahogany Manager Desk + Bookshelf + Seasonal Strategy Board
      drawPixelBox(ctx, x + 18, y + 36, w - 36, 36, '#4A2B1D', '#7C4D34', '#29170F');
      // Colorful binders on shelf
      const cols = ['#E53E3E', '#38BDF8', '#E8C97A', '#34D399', '#C084FC'];
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(x + 26 + i * 16, y + 44, 11, 18);
      }

      // Executive Desk with golden ledger & brass lamp
      drawPixelBox(ctx, x + 36, y + 96, 138, 56, '#5C3320', '#96593B', '#2F1910');
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(x + 56, y + 108, 44, 28);
      ctx.fillStyle = '#D97706';
      ctx.fillRect(x + 138, y + 108, 18, 18);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(x + 142, y + 112, 10, 10);

      drawLabel(ctx, world.attendanceCheckedToday ? '今日考勤已完成 · 采购/兼职' : '待核查考勤 · 采购/兼职', x + w / 2, y + h - 42, {
        fontSize: 9,
        color: '#FDE68A',
        bg: 'rgba(46, 30, 14, 0.92)',
        border: '#E8C97A',
      });
      break;
    }

    case 'restroom': {
      // Multi-basin seafood handwashing vanity (prominent!)
      drawPixelBox(ctx, x + 18, y + h - 78, w - 36, 56, '#CBD5E1', '#F8FAFC', '#64748B');
      for (let i = 0; i < 4; i++) {
        const bx = x + 32 + i * 60;
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(bx, y + h - 66, 40, 26);
        ctx.fillStyle = '#E0F2FE';
        ctx.fillRect(bx + 4, y + h - 62, 32, 18);
        // Chrome tap
        ctx.fillStyle = '#475569';
        ctx.fillRect(bx + 17, y + h - 72, 6, 8);
      }
      // Clean stall partitions on right/left corners
      drawPixelBox(ctx, x + 20, y + 52, 74, 62, '#475569', '#94A3B8', '#1E293B');
      drawPixelBox(ctx, x + 104, y + 52, 74, 62, '#475569', '#94A3B8', '#1E293B');

      const cleanVal = Math.round(world.restroomCleanliness);
      drawLabel(ctx, `洗手区洁净度 ${cleanVal}%`, x + w / 2, y + 40, {
        fontSize: 9,
        color: cleanVal < 50 ? '#FCA5A5' : '#BBF7D0',
        bg: cleanVal < 50 ? 'rgba(127, 29, 29, 0.92)' : 'rgba(15, 52, 42, 0.9)',
        border: cleanVal < 50 ? '#EF4444' : '#4ADE80',
      });
      break;
    }

    case 'equipment_room': {
      // Chiller Compressor, Ice Maker, Oxygen Pump, Oil-Water Separator
      const blinkGreen = Math.floor(timeSec * 3) % 2 === 0;
      const units = [
        { lx: x + 20, ly: y + 66, label: '制冷机组', col: '#3B82F6' },
        { lx: x + 112, ly: y + 66, label: '制冰机', col: '#06B6D4' },
        { lx: x + 204, ly: y + 66, label: '增氧水泵', col: '#10B981' },
        { lx: x + 20, ly: y + 154, label: '强排风机', col: '#F59E0B' },
        { lx: x + 152, ly: y + 154, label: '油水分离器', col: '#8B5CF6' },
      ];
      for (const u of units) {
        const uw = u.ly > y + 120 ? 122 : 78;
        drawPixelBox(ctx, u.lx, u.ly, uw, 66, '#334155', '#64748B', '#1E293B');
        // Status indicator LED
        ctx.fillStyle =
          world.equipmentHealth < 50
            ? '#EF4444'
            : blinkGreen
              ? '#4ADE80'
              : u.col;
        ctx.fillRect(u.lx + 10, u.ly + 12, 8, 8);
        // Vent grilles
        ctx.fillStyle = '#0F172A';
        for (let g = 0; g < 3; g++) {
          ctx.fillRect(u.lx + 26, u.ly + 12 + g * 8, uw - 38, 4);
        }
        drawLabel(ctx, u.label, u.lx + uw / 2, u.ly + 50, { fontSize: 9, color: '#E2E8F0' });
      }

      const eqVal = Math.round(world.equipmentHealth);
      drawLabel(ctx, `全厂机电耐久 ${eqVal}%`, x + w / 2, y + 40, {
        fontSize: 9,
        color: eqVal < 50 ? '#FCA5A5' : '#FDE68A',
        bg: eqVal < 50 ? 'rgba(127, 29, 29, 0.92)' : 'rgba(30, 41, 59, 0.92)',
        border: eqVal < 50 ? '#EF4444' : '#FBBF24',
      });
      break;
    }

    case 'dormitory': {
      // Cozy wooden bunk beds + lantern-lit tea lounge table
      drawPixelBox(ctx, x + 20, y + 58, 92, 52, '#5C3729', '#8A5641', '#331D15');
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(x + 26, y + 64, 24, 34);
      ctx.fillStyle = '#9F1239';
      ctx.fillRect(x + 52, y + 64, 54, 34);

      drawPixelBox(ctx, x + 174, y + 58, 92, 52, '#5C3729', '#8A5641', '#331D15');
      ctx.fillStyle = '#E0F2FE';
      ctx.fillRect(x + 180, y + 64, 24, 34);
      ctx.fillStyle = '#1D4ED8';
      ctx.fillRect(x + 206, y + 64, 54, 34);

      // Warm tea table in lower center
      drawPixelBox(ctx, x + 86, y + 148, 114, 62, '#6E3F29', '#A86747', '#3D2215');
      drawPixelSprite(ctx, getLanternSprite(true), x + 143, y + 178, 1.5, 0.5, 0.5);

      drawLabel(
        ctx,
        world.activePartnerId ? '员工宿舍 · 伴侣茶室 ♥' : '员工宿舍 · 休整茶室',
        x + w / 2,
        y + 40,
        {
          fontSize: 9,
          color: '#FBCFE8',
          bg: 'rgba(69, 20, 46, 0.9)',
          border: '#F472B6',
        }
      );
      break;
    }
  }
}

export function renderBackstageCanvas(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
  timeSec: number,
  hoverPos: { x: number; y: number } | null,
  backingWidth: number,
  backingHeight: number,
  camera?: SceneCamera
) {
  const vt = getCanvasViewportTransform(backingWidth, backingHeight, camera);

  // Dark warm-mahogany widescreen backdrop
  ctx.save();
  ctx.fillStyle = '#120A07';
  ctx.fillRect(0, 0, backingWidth, backingHeight);
  ctx.restore();

  ctx.save();
  ctx.setTransform(vt.scale, 0, 0, vt.scale, vt.offsetX, vt.offsetY);
  ctx.imageSmoothingEnabled = false;

  const woodPat = ctx.createPattern(getWoodPlankTile(), 'repeat');
  const tilePat = ctx.createPattern(getKitchenTile(), 'repeat');

  // Outer warm dark timber foundation
  ctx.fillStyle = '#1B100B';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Central Backstage Corridor (warm espresso tile runner with brass guide trim)
  ctx.fillStyle = '#2A1A13';
  ctx.fillRect(BACKSTAGE_CORRIDOR.x, BACKSTAGE_CORRIDOR.y, BACKSTAGE_CORRIDOR.w, BACKSTAGE_CORRIDOR.h);
  ctx.fillStyle = 'rgba(232, 201, 122, 0.22)';
  ctx.fillRect(BACKSTAGE_CORRIDOR.x, BACKSTAGE_CORRIDOR.y + 4, BACKSTAGE_CORRIDOR.w, 2);
  ctx.fillRect(
    BACKSTAGE_CORRIDOR.x,
    BACKSTAGE_CORRIDOR.y + BACKSTAGE_CORRIDOR.h - 6,
    BACKSTAGE_CORRIDOR.w,
    2
  );

  // Corridor directional label
  drawLabel(ctx, '← 返回前厅大厅    ·    后场中央通道（WASD 移动或点击房间进入）', 500, BACKSTAGE_CORRIDOR.centerY, {
    fontSize: 10,
    color: 'rgba(244, 224, 194, 0.62)',
  });

  const activeRoomId = getBackstagePlayerRoom(world);

  // Draw all 7 rooms
  for (const room of BACKSTAGE_ROOMS) {
    const isCurrent = activeRoomId === room.id;
    const isHovered =
      hoverPos !== null &&
      hoverPos.x >= room.x &&
      hoverPos.x <= room.x + room.w &&
      hoverPos.y >= room.y &&
      hoverPos.y <= room.y + room.h;

    // Room outer masonry wall
    ctx.fillStyle = isCurrent ? room.accentColor : isHovered ? '#E8C97A' : '#593A27';
    ctx.fillRect(room.x - 2, room.y - 2, room.w + 4, room.h + 4);

    // Room floor
    ctx.fillStyle = room.floorColor;
    ctx.fillRect(room.x + 2, room.y + 2, room.w - 4, room.h - 4);

    // Subtle tile / plank overlay per room type
    ctx.save();
    ctx.globalAlpha = room.id === 'office' || room.id === 'dormitory' ? 0.45 : 0.14;
    ctx.fillStyle =
      room.id === 'office' || room.id === 'dormitory'
        ? woodPat ?? room.floorColor
        : tilePat ?? room.floorColor;
    ctx.fillRect(room.x + 2, room.y + 2, room.w - 4, room.h - 4);
    ctx.restore();

    // Top wall architectural header bar
    ctx.fillStyle = 'rgba(24, 13, 9, 0.86)';
    ctx.fillRect(room.x + 2, room.y + 2, room.w - 4, 24);
    drawLabel(ctx, room.shortName, room.x + room.w / 2, room.y + 14, {
      fontSize: 11,
      color: isCurrent ? '#FFF6E5' : room.accentColor,
    });

    // Open doorway threshold connecting room to central corridor
    const isTop = room.y < BACKSTAGE_CORRIDOR.y;
    const doorRectY = isTop ? room.y + room.h - 6 : room.y - 4;
    ctx.fillStyle = '#1D2B3E';
    ctx.fillRect(room.doorX - 24, doorRectY, 48, 12);
    ctx.fillStyle = '#E8C97A';
    ctx.fillRect(room.doorX - 26, doorRectY, 3, 12);
    ctx.fillRect(room.doorX + 23, doorRectY, 3, 12);

    // Bespoke pixel furniture & live meters inside room
    drawRoomProps(ctx, room, world, timeSec);

    // Special Staff NPC standing in their room (for recruitment side-story OR personal story!)
    if (room.sideStoryStaffId) {
      const spId = room.sideStoryStaffId;
      const bond = world.specialStaffBonds[spId];
      const spDef = getSpecialStaffDef(spId);
      const bob = Math.sin(timeSec * 3.2 + room.x * 0.02) * 2;
      const npcSprite = getStaffSprite(spDef.color, 4, true, Math.floor(timeSec * 2) % 2);

      // Ground shadow
      ctx.fillStyle = 'rgba(6, 10, 18, 0.55)';
      ctx.fillRect(Math.round(room.npcX - 12), Math.round(room.npcY + 11), 24, 5);
      drawPixelSprite(ctx, npcSprite, room.npcX, room.npcY + bob, 2.2, 0.5, 0.55);

      // Pulsing marker above NPC: "!" for unrecruited side-story, "♥" for recruited partner
      const pulseY = Math.round(Math.sin(timeSec * 6) * 2.5);
      if (!bond.recruited) {
        drawLabel(
          ctx,
          bond.recruitmentStage === 0 ? '! 神秘访客' : `! ${spDef.name} (支线)`,
          room.npcX,
          room.npcY - 26 + pulseY,
          {
            fontSize: 9,
            color: '#18100A',
            bg: '#FACC15',
            border: '#78350F',
          }
        );
      } else {
        const hasQuest =
          (world.phase === 'PREP' || world.phase === 'CLOSING') &&
          bond.storyStage < spDef.quests.length &&
          bond.lastQuestDay < world.day &&
          world.mainChapter >= spDef.quests[bond.storyStage].minChapter;
        drawLabel(
          ctx,
          hasQuest ? `★ ${spDef.name} · 剧情` : `${spDef.name} ♥${bond.affection}`,
          room.npcX,
          room.npcY - 26 + (hasQuest ? pulseY : 0),
          {
            fontSize: 9,
            color: '#FFF6E5',
            bg: hasQuest ? '#BE185D' : 'rgba(14, 28, 48, 0.9)',
            border: hasQuest ? '#F9A8D4' : spDef.color,
          }
        );
      }
    }

    // Highlight active room floor glow
    if (isCurrent) {
      ctx.strokeStyle = room.accentColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(room.x + 1, room.y + 1, room.w - 2, room.h - 2);
    }
  }

  // Left Exit Doorway back to Dining Hall
  const exitHovered =
    hoverPos !== null &&
    Math.abs(hoverPos.x - BACKSTAGE_EXIT_DOOR.x) <= 32 &&
    Math.abs(hoverPos.y - BACKSTAGE_EXIT_DOOR.y) <= 40;
  drawPixelBox(
    ctx,
    BACKSTAGE_EXIT_DOOR.x - 16,
    BACKSTAGE_EXIT_DOOR.y - 30,
    32,
    60,
    exitHovered ? '#B45309' : '#78350F',
    '#F59E0B',
    '#451A03',
    exitHovered ? '#FDE047' : '#E8C97A'
  );
  drawLabel(ctx, '前厅', BACKSTAGE_EXIT_DOOR.x, BACKSTAGE_EXIT_DOOR.y, {
    fontSize: 10,
    color: '#FFFBEB',
  });

  // Walkable Manager Character Sprite
  const bp = world.backstagePlayer;
  const charDef = getCharacterDef(world.characterId);
  const frame = Math.floor(bp.walkCycle) % 2;
  const managerSprite = getManagerSprite(charDef.accentColor, frame);

  // Target click waypoint ring
  if (bp.targetX !== null && bp.targetY !== null) {
    const rPulse = 6 + Math.sin(timeSec * 8) * 2;
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bp.targetX, bp.targetY, rPulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(8, 6, 12, 0.55)';
  ctx.fillRect(Math.round(bp.x - 13), Math.round(bp.y + 12), 26, 6);
  drawPixelSprite(ctx, managerSprite, bp.x, bp.y, 2.35, 0.5, 0.55);

  ctx.restore();
}
