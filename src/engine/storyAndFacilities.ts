import {
  BROTH_CATALOG,
  BUFFET_ZONES_CONFIG,
  createDefaultZonePadAssignments,
  FRONT_HALL_ZONE_PADS,
  getBuffetZoneDef,
  getSeasonDef,
  getShopConfig,
  isAvailableInSeason,
  PART_TIME_JOBS,
  SEAFOOD_CATALOG,
  STAFF_ROLE_META,
  STATIONS,
} from '../data/gameConfig';
import {
  buildEndingEpilogue,
  buildFacilitySceneEvent,
  createSpecialStaffCandidate,
  getSpecialStaffDef,
  SPECIAL_STAFF_CATALOG,
  SPECIAL_STORIES,
} from '../data/storyConfig';
import {
  buildConfessionDramaModal,
  buildOrdinaryStaffChatEvent,
  buildPartnerDateModal,
  buildSpecialStaffChatOrEvent,
  buildWeddingDramaModal,
} from '../data/staffDialogueConfig';
import { getRegimeDef } from '../data/policyAndTechConfig';
import {
  BuffetSlot,
  BuffetZoneId,
  FacilitySceneId,
  GameWorld,
  HiredStaff,
  SpecialStaffId,
  StoryChoiceOption,
  ZonePadDef,
} from '../types/game';
import { sound } from '../utils/sound';
import { enlistSpecialStaff, evaluatePolicyBonuses } from './policyAndTech';
import { evaluateTycoonModifiers } from './tycoonSystems';
import { awardPlayerXpFromCash } from './playerProgression';
import { applyIncidentChoiceEffects } from '../data/serviceIncidentsConfig';

let extUid = 10000;
function nextExtUid(prefix: string): string {
  extUid += 1;
  return `${prefix}_${extUid}`;
}

function pushAlert(
  world: GameWorld,
  message: string,
  severity: 'info' | 'warning' | 'penalty' | 'success' = 'info'
) {
  const clock = world.phase === 'PREP' ? '10:00' : world.phase === 'CLOSING' ? '22:00' : '营业';
  world.alerts.unshift({
    id: nextExtUid('al'),
    timeText: clock,
    message,
    severity,
  });
  if (world.alerts.length > 30) world.alerts.length = 30;
}

const EXPANDABLE_ZONE_TECH_NODE: Partial<Record<BuffetZoneId, string>> = {
  steam_dimsum: 'tech_zone_dimsum',
  drinks_dessert: 'tech_zone_drinks',
  teppan_bbq: 'tech_zone_teppan',
  sashimi_sushi: 'tech_zone_sashimi',
  raw_marinated: 'tech_zone_raw_marinated',
  live_seafood: 'tech_zone_live',
  wagyu_carving: 'tech_zone_wagyu_carving',
};

export function isZoneBlueprintUnlocked(world: GameWorld, zoneId: BuffetZoneId): boolean {
  const requiredTech = EXPANDABLE_ZONE_TECH_NODE[zoneId];
  if (!requiredTech) return true;
  return world.unlockedTechNodeIds.includes(requiredTech);
}

export function isBuffetZoneUnlocked(world: GameWorld, zoneId: BuffetZoneId): boolean {
  if (!world.unlockedZones.includes(zoneId)) return false;
  return isZoneBlueprintUnlocked(world, zoneId);
}

export function isPadPurchased(world: GameWorld, padId: string): boolean {
  const pad = FRONT_HALL_ZONE_PADS.find((p) => p.id === padId);
  if (!pad) return false;
  if (pad.purchaseCost <= 0) return true;
  return Array.isArray(world.purchasedPadIds) && world.purchasedPadIds.includes(padId);
}

export function ensureZonePadAssignments(world: GameWorld): Record<string, BuffetZoneId | null> {
  if (!world.zonePadAssignments) {
    world.zonePadAssignments = createDefaultZonePadAssignments();
  }
  if (!Array.isArray(world.purchasedPadIds)) {
    world.purchasedPadIds = FRONT_HALL_ZONE_PADS.filter((p) => p.purchaseCost <= 0).map((p) => p.id);
  }
  for (const pad of FRONT_HALL_ZONE_PADS) {
    if (!(pad.id in world.zonePadAssignments)) {
      world.zonePadAssignments[pad.id] = pad.defaultZone ?? null;
    }
    if (!isPadPurchased(world, pad.id)) {
      world.zonePadAssignments[pad.id] = null;
      continue;
    }
    const assigned = world.zonePadAssignments[pad.id];
    if (assigned && !isBuffetZoneUnlocked(world, assigned)) {
      world.zonePadAssignments[pad.id] = null;
    }
  }
  return world.zonePadAssignments;
}

export function getUnlockedZonePads(
  world: GameWorld
): Array<{ pad: ZonePadDef; zoneId: BuffetZoneId | null }> {
  const assignments = ensureZonePadAssignments(world);
  return FRONT_HALL_ZONE_PADS.filter(
    (p) => p.minShopLevel <= world.shopLevel && isPadPurchased(world, p.id)
  ).map((pad) => ({
    pad,
    zoneId: assignments[pad.id] ?? null,
  }));
}

export interface VisibleFrontHallPad {
  pad: ZonePadDef;
  purchased: boolean;
  buildingDays: number | null;
  zoneId: BuffetZoneId | null;
}

export function getVisibleFrontHallPads(world: GameWorld): VisibleFrontHallPad[] {
  const assignments = ensureZonePadAssignments(world);
  return FRONT_HALL_ZONE_PADS.filter((p) => p.minShopLevel <= world.shopLevel).map((pad) => {
    const purchased = isPadPurchased(world, pad.id);
    const pending = world.pendingOrders.find(
      (o) => o.type === 'PURCHASE_ZONE_PAD' && o.targetId === pad.id
    );
    return {
      pad,
      purchased,
      buildingDays: pending ? pending.daysRemaining : null,
      zoneId: purchased ? assignments[pad.id] ?? null : null,
    };
  });
}

export function purchaseZonePad(world: GameWorld, padId: string): boolean {
  if (world.phase !== 'PREP') {
    pushAlert(world, '购置扩建前厅区域位仅限在「开店前准备」阶段下单施工！', 'warning');
    return false;
  }
  const pad = FRONT_HALL_ZONE_PADS.find((p) => p.id === padId);
  if (!pad) return false;
  if (pad.minShopLevel > world.shopLevel) {
    pushAlert(world, `购置「${pad.label}」需要店铺等级达到 Lv.${pad.minShopLevel}！`, 'warning');
    return false;
  }
  if (isPadPurchased(world, padId)) {
    return true;
  }
  if (world.pendingOrders.some((o) => o.type === 'PURCHASE_ZONE_PAD' && o.targetId === padId)) {
    pushAlert(world, `「${pad.label}」正在扩建施工中，请耐心等待竣工！`, 'info');
    return false;
  }
  if (world.cash < pad.purchaseCost) {
    pushAlert(
      world,
      `资金不足！购置扩建「${pad.label}」需要 ¥${pad.purchaseCost}（当前余额 ¥${Math.floor(world.cash)}）。`,
      'warning'
    );
    return false;
  }

  world.cash -= pad.purchaseCost;

  if (pad.buildDays <= 0) {
    if (!world.purchasedPadIds.includes(pad.id)) {
      world.purchasedPadIds.push(pad.id);
    }
    ensureZonePadAssignments(world);
    sound.playHireStamp();
    pushAlert(world, `扩建区域位「${pad.label}」购置竣工，现可自由配置菜品分区！`, 'success');
    return true;
  }

  world.pendingOrders.push({
    id: nextExtUid('ord_pad'),
    type: 'PURCHASE_ZONE_PAD',
    title: `扩建区域位 · ${pad.label}`,
    detail: `前厅扩建档口基座与水电冷链管路施工需 ${pad.buildDays} 天`,
    daysRemaining: pad.buildDays,
    totalDays: pad.buildDays,
    cost: pad.purchaseCost,
    targetId: pad.id,
  });

  sound.playHireStamp();
  pushAlert(
    world,
    `已出资 ¥${pad.purchaseCost} 签约施工「${pad.label}」，预计 ${pad.buildDays} 天后开店前竣工可用！`,
    'success'
  );
  return true;
}

export function getPadForBuffetZone(
  world: GameWorld,
  zoneId: BuffetZoneId
): ZonePadDef | null {
  const unlockedPads = getUnlockedZonePads(world);
  const found = unlockedPads.find((entry) => entry.zoneId === zoneId);
  return found ? found.pad : null;
}

export function autoPlaceNewlyUnlockedZone(
  world: GameWorld,
  zoneId: BuffetZoneId
): ZonePadDef | null {
  if (!isBuffetZoneUnlocked(world, zoneId)) return null;
  const assignments = ensureZonePadAssignments(world);
  const purchasedPads = FRONT_HALL_ZONE_PADS.filter(
    (p) => p.minShopLevel <= world.shopLevel && isPadPurchased(world, p.id)
  );
  if (purchasedPads.some((p) => assignments[p.id] === zoneId)) {
    return purchasedPads.find((p) => assignments[p.id] === zoneId) ?? null;
  }
  const emptyPad = purchasedPads.find((p) => !assignments[p.id]);
  if (!emptyPad) return null;
  assignments[emptyPad.id] = zoneId;
  rebuildActiveBuffetSlots(world);
  return emptyPad;
}

export function assignZoneToPad(
  world: GameWorld,
  padId: string,
  zoneId: BuffetZoneId | null
): boolean {
  if (world.phase !== 'PREP') {
    pushAlert(world, '调整前厅区域档口配置仅限在「开店前准备」阶段进行！', 'warning');
    return false;
  }
  const pad = FRONT_HALL_ZONE_PADS.find((p) => p.id === padId);
  if (!pad || pad.minShopLevel > world.shopLevel) {
    pushAlert(world, '该区域位尚未随店铺等级扩建开放！', 'warning');
    return false;
  }
  if (!isPadPurchased(world, padId)) {
    pushAlert(
      world,
      `区域位「${pad.label}」尚未购置扩建！请先出资 ¥${pad.purchaseCost}（${pad.buildDays}天）完成施工后再配置档口。`,
      'warning'
    );
    return false;
  }
  if (zoneId !== null && !isBuffetZoneUnlocked(world, zoneId)) {
    const zDef = getBuffetZoneDef(zoneId);
    pushAlert(
      world,
      isZoneBlueprintUnlocked(world, zoneId)
        ? `「${zDef.name}」尚未出资施工建成，请先在上方购置建设（¥${zDef.unlockCost} · ${zDef.buildDays}天）！`
        : `「${zDef.name}」蓝图尚未在天赋树中研发解锁！`,
      'warning'
    );
    return false;
  }

  const assignments = ensureZonePadAssignments(world);
  const currentOnTarget = assignments[padId] ?? null;
  if (currentOnTarget === zoneId) return true;

  const purchasedPads = FRONT_HALL_ZONE_PADS.filter(
    (p) => p.minShopLevel <= world.shopLevel && isPadPurchased(world, p.id)
  );

  if (zoneId === null) {
    assignments[padId] = null;
    rebuildActiveBuffetSlots(world);
    sound.playClick();
    pushAlert(world, `已将「${pad.label}」设为空区域位，随时可重新配置菜品区。`, 'info');
    return true;
  }

  // Check if zoneId is already placed on another purchased pad
  const existingPad = purchasedPads.find((p) => p.id !== padId && assignments[p.id] === zoneId);
  const allUnlockedZoneIds = BUFFET_ZONES_CONFIG.map((z) => z.id).filter((id) =>
    isBuffetZoneUnlocked(world, id)
  );
  const allPlacedAlready = allUnlockedZoneIds.every((id) =>
    purchasedPads.some((p) => assignments[p.id] === id)
  );

  if (existingPad && !(currentOnTarget === null && allPlacedAlready)) {
    // Cleanly swap positions between the two pads
    assignments[existingPad.id] = currentOnTarget;
    assignments[padId] = zoneId;
    rebuildActiveBuffetSlots(world);
    sound.playClick();
    const zDef = getBuffetZoneDef(zoneId);
    pushAlert(
      world,
      `已将「${zDef.shortName}」调换布置至【${pad.label}】${
        currentOnTarget ? `（原位置与【${existingPad.label}】互换）` : ''
      }！`,
      'success'
    );
    return true;
  }

  assignments[padId] = zoneId;
  rebuildActiveBuffetSlots(world);
  sound.playClick();
  const zDef = getBuffetZoneDef(zoneId);
  pushAlert(world, `已在【${pad.label}】成功配置「${zDef.name}」！`, 'success');
  return true;
}

export function rebuildActiveBuffetSlots(world: GameWorld) {
  ensureZonePadAssignments(world);
  const unlockedPads = getUnlockedZonePads(world);

  // Show active, in-season, non-cooked-counter items physically inside their matching assigned pad!
  const coldIds = world.activeSeafoodIds.filter((id) => {
    const def = SEAFOOD_CATALOG.find((s) => s.id === id);
    if (!def) return false;
    if (def.requiresCooking) return false;
    if (!isBuffetZoneUnlocked(world, def.zone)) return false;
    return isAvailableInSeason(def.seasons, world.season);
  });

  // Always guarantee at least 1 item on the cold buffet line
  const finalIds = coldIds.length > 0 ? coldIds : ['prawns'];

  // Map each item to its assigned pad (fallback to first occupied cold pad or pad_nw)
  const fallbackPad =
    unlockedPads.find((p) => p.zoneId && p.zoneId !== 'cooked_hot')?.pad ??
    FRONT_HALL_ZONE_PADS[0];

  const byPadId = new Map<string, { pad: ZonePadDef; ids: string[] }>();
  for (const id of finalIds) {
    const def = SEAFOOD_CATALOG.find((s) => s.id === id);
    const zoneId: BuffetZoneId = def?.zone ?? 'ice_seafood';
    const matchingPads = unlockedPads.filter((entry) => entry.zoneId === zoneId);
    const targetPad = matchingPads[0]?.pad ?? fallbackPad;
    const bucket = byPadId.get(targetPad.id) ?? { pad: targetPad, ids: [] };
    bucket.ids.push(id);
    byPadId.set(targetPad.id, bucket);
  }

  const prevSlots = world.buffetSlots;
  const nextSlots: BuffetSlot[] = [];
  let runningIdx = 0;

  for (const { pad, ids } of byPadId.values()) {
    const isVert = pad.orientation === 'VERTICAL';
    const padMargin = 14;
    const usableSpan = Math.max(36, (isVert ? pad.h : pad.w) - padMargin * 2);
    const step = usableSpan / Math.max(ids.length, 1);

    ids.forEach((itemId, localIdx) => {
      const def = SEAFOOD_CATALOG.find((s) => s.id === itemId)!;
      const prev = prevSlots.find((s) => s.itemId === itemId);
      const maxStock = def.maxStock + world.buffetCapacityBonus;
      const sx = isVert ? pad.x + pad.w * 0.5 : pad.x + padMargin + step * (localIdx + 0.5);
      const sy = isVert ? pad.y + padMargin + step * (localIdx + 0.5) : pad.y + pad.h * 0.54;
      nextSlots.push({
        slotIndex: runningIdx++,
        itemId,
        stock: prev ? Math.min(maxStock, prev.stock) : Math.max(3, Math.floor(maxStock * 0.85)),
        maxStock,
        x: sx,
        y: sy,
        lastGrabFlash: prev ? prev.lastGrabFlash : 0,
      });
    });
  }

  world.buffetSlots = nextSlots;
}

// ==========================================
// 0. WAREHOUSE INVENTORY & DELAYED CLOSING PROCUREMENT
// ==========================================

export function getProcurementDiscount(world: GameWorld): number {
  const clerkBonus = world.staff
    .filter((s) => s.role === 'INVENTORY_CLERK')
    .reduce((best, s) => Math.max(best, s.bonusValue), 0);
  const liveBonus = world.staff
    .filter((s) => s.role === 'LIVE_MASTER')
    .reduce((best, s) => Math.max(best, s.bonusValue), 0);
  const policyDiscount = evaluatePolicyBonuses(world).costDiscount;
  return Math.min(0.55, clerkBonus + liveBonus + policyDiscount);
}

export function getDishUnitPurchaseCost(world: GameWorld, itemId: string): number {
  const seasonMult = getSeasonDef(world.season).costMultiplier;
  const tycoonCostMult = evaluateTycoonModifiers(world).costMultiplier;
  const discount = getProcurementDiscount(world);
  if (itemId === '__RAW__') {
    return Math.max(2, Math.round(4 * seasonMult * tycoonCostMult * (1 - discount)));
  }
  const def = SEAFOOD_CATALOG.find((s) => s.id === itemId);
  if (!def) return 4;
  // Unit wholesale cost per 1 portion (restockCost covers ~maxStock portions)
  const baseUnit = def.restockCost / Math.max(4, def.maxStock);
  return Math.max(2, Math.round(baseUnit * seasonMult * tycoonCostMult * (1 - discount)));
}

export function placeClosingProcurementOrder(
  world: GameWorld,
  itemId: string,
  quantity = 12,
  autoOrdered = false
): boolean {
  if (world.phase !== 'CLOSING') {
    if (!autoOrdered) {
      pushAlert(
        world,
        '冷链补货采购单需在每日「闭店收尾（22:00 后）」统一下单，次日闭店后准时送达入库！',
        'warning'
      );
    }
    return false;
  }

  const isRaw = itemId === '__RAW__';
  const def = isRaw ? null : SEAFOOD_CATALOG.find((s) => s.id === itemId);
  if (!isRaw && !def) return false;

  const unitCost = getDishUnitPurchaseCost(world, itemId);
  const totalCost = unitCost * quantity;
  if (world.cash < totalCost) {
    if (!autoOrdered) {
      pushAlert(
        world,
        `资金不足！采购「${isRaw ? '熟食冷链原料' : def!.shortName} ×${quantity}」需要 ¥${totalCost}。`,
        'warning'
      );
    }
    return false;
  }

  world.cash -= totalCost;
  world.todayStats.ingredientCost += totalCost;

  const itemName = isRaw ? '熟食冷链原料' : def!.name;
  world.pendingDeliveries.push({
    id: nextExtUid('deliv'),
    itemId,
    itemName,
    quantity,
    orderedDay: world.day,
    arrivalDay: world.day + 1,
    cost: totalCost,
    autoOrdered,
  });

  if (!autoOrdered) {
    sound.playIceRestock();
    pushAlert(
      world,
      `已下单采购「${itemName} ×${quantity}」（花费 ¥${totalCost}），将于第 ${world.day + 1} 天闭店后到货入库！`,
      'success'
    );
  }
  return true;
}

export function deliverArrivedWarehouseOrders(world: GameWorld): number {
  const arrived = world.pendingDeliveries.filter((d) => d.arrivalDay <= world.day);
  if (arrived.length === 0) return 0;

  world.pendingDeliveries = world.pendingDeliveries.filter((d) => d.arrivalDay > world.day);

  const summaryParts: string[] = [];
  for (const order of arrived) {
    if (order.itemId === '__RAW__') {
      world.rawIngredients = Math.min(world.rawIngredientsMax + 30, world.rawIngredients + order.quantity);
    } else {
      world.warehouseStock[order.itemId] = (world.warehouseStock[order.itemId] ?? 0) + order.quantity;
    }
    summaryParts.push(`${order.itemName} +${order.quantity}`);
  }

  sound.playIceRestock();
  pushAlert(
    world,
    `【冷链货车抵店入库】昨日采购的 ${arrived.length} 批货品已入后场库房：${summaryParts.join('、')}！`,
    'success'
  );
  return arrived.length;
}

export function runInventoryClerkAutoOrders(world: GameWorld): number {
  const clerks = world.staff.filter((s) => s.role === 'INVENTORY_CLERK');
  if (clerks.length === 0) return 0;

  const bestClerk = clerks.reduce((a, b) => (a.tier >= b.tier ? a : b));
  const targetDishStock = 18 + bestClerk.tier * 4;
  const targetRawStock = 26 + bestClerk.tier * 6;
  const cashReserve = 60;

  let orderedCount = 0;
  let totalSpent = 0;
  const orderedNames: string[] = [];

  // Check every active non-cooking dish on the menu
  for (const dishId of world.activeSeafoodIds) {
    const def = SEAFOOD_CATALOG.find((s) => s.id === dishId);
    if (!def || def.requiresCooking) continue;
    const inStock = world.warehouseStock[dishId] ?? 0;
    const inTransit = world.pendingDeliveries
      .filter((d) => d.itemId === dishId)
      .reduce((sum, d) => sum + d.quantity, 0);
    const projected = inStock + inTransit;

    if (projected < targetDishStock) {
      const qty = Math.max(10, targetDishStock - projected);
      const estCost = getDishUnitPurchaseCost(world, dishId) * qty;
      if (world.cash - estCost >= cashReserve) {
        if (placeClosingProcurementOrder(world, dishId, qty, true)) {
          orderedCount += 1;
          totalSpent += estCost;
          orderedNames.push(`${def.shortName}×${qty}`);
        }
      }
    }
  }

  // Also check raw kitchen ingredients for cooked food zone
  const rawInTransit = world.pendingDeliveries
    .filter((d) => d.itemId === '__RAW__')
    .reduce((sum, d) => sum + d.quantity, 0);
  if (world.rawIngredients + rawInTransit < targetRawStock) {
    const qty = Math.max(12, targetRawStock - (world.rawIngredients + rawInTransit));
    const estCost = getDishUnitPurchaseCost(world, '__RAW__') * qty;
    if (world.cash - estCost >= cashReserve) {
      if (placeClosingProcurementOrder(world, '__RAW__', qty, true)) {
        orderedCount += 1;
        totalSpent += estCost;
        orderedNames.push(`热厨原料×${qty}`);
      }
    }
  }

  if (orderedCount > 0) {
    pushAlert(
      world,
      `【库存采购员 · ${bestClerk.name} 自动补仓】已闭店下单 ${orderedNames.join('、')}（共 ¥${totalSpent}），将于明日闭店后准时入库！`,
      'success'
    );
  }
  return orderedCount;
}

// ==========================================
// 1. MENU, BROTH & TICKET PRICE CONFIGURATION
// ==========================================

export function computeRecommendedTicketPrice(world: GameWorld): number {
  const bonuses = evaluatePolicyBonuses(world);
  return Math.max(98, bonuses.regimeBaseTicket + bonuses.extraTicketBonus);
}

export function getEffectiveTicketPrice(world: GameWorld): number {
  const bonuses = evaluatePolicyBonuses(world);
  return Math.max(98, bonuses.regimeBaseTicket + bonuses.extraTicketBonus);
}

export interface TicketFilterPreview {
  effectivePrice: number;
  recommendedPrice: number;
  demandMultiplier: number;
  vipChanceBonus: number;
  tierLabel: string;
  filteredSpecialNames: string[];
  boostedSpecialNames: string[];
}

export function getTicketFilterPreview(world: GameWorld): TicketFilterPreview {
  const regime = getRegimeDef(world.activeRegimeId);
  const bonuses = evaluatePolicyBonuses(world);
  const effectivePrice = getEffectiveTicketPrice(world);
  const recommendedPrice = effectivePrice;

  const demandMultiplier = bonuses.customerRateMult;
  const vipChanceBonus = bonuses.vipChanceBonus;

  const tierLabel = `${regime.name}（基价¥${regime.baseTicketPrice}${
    effectivePrice >= 400 ? ' · 已达¥400+高定门槛' : ''
  }）`;

  const filteredSpecialNames: string[] = [];
  const boostedSpecialNames: string[] = [];

  for (const st of SPECIAL_STORIES) {
    const discovered = world.specialStories[st.id].discovered;
    const label = discovered ? st.customerName : `某位${st.tagLabel}`;
    if (effectivePrice > st.maxTicketPrice || effectivePrice < st.minTicketPrice) {
      filteredSpecialNames.push(label);
    } else if (effectivePrice >= 300 && st.minTicketPrice >= 180) {
      boostedSpecialNames.push(label);
    }
  }

  return {
    effectivePrice,
    recommendedPrice,
    demandMultiplier,
    vipChanceBonus,
    tierLabel,
    filteredSpecialNames,
    boostedSpecialNames,
  };
}

export function setCustomTicketPrice(world: GameWorld, price: number | null) {
  world.customTicketPrice = price === null ? null : Math.max(98, Math.min(680, Math.round(price)));
  sound.playClick();
  const label = price === null ? '自动随菜单定价' : `¥${world.customTicketPrice}`;
  pushAlert(world, `已调整基础餐位档位为「${label}」，将实时影响客流与特殊顾客来访概率。`, 'info');
}

export function toggleActiveSeafood(world: GameWorld, itemId: string): boolean {
  if (!world.unlockedSeafoodIds.includes(itemId)) return false;
  const def = SEAFOOD_CATALOG.find((s) => s.id === itemId);
  if (!def) return false;

  const isActive = world.activeSeafoodIds.includes(itemId);
  if (isActive) {
    if (world.activeSeafoodIds.length <= 2) {
      pushAlert(world, '至少需保留 2 种上架菜品以维持自助台正常营业！', 'warning');
      return false;
    }
    world.activeSeafoodIds = world.activeSeafoodIds.filter((id) => id !== itemId);
    rebuildActiveBuffetSlots(world);
    sound.playClick();
    pushAlert(world, `已将「${def.name}」从今日供应菜单下架。`, 'info');
    return true;
  } else {
    if (!isAvailableInSeason(def.seasons, world.season)) {
      pushAlert(world, `「${def.name}」非当前季节应季食材，暂无法上架！`, 'warning');
      return false;
    }
    if (!world.unlockedZones.includes(def.zone)) {
      const z = getBuffetZoneDef(def.zone);
      pushAlert(world, `上架「${def.name}」需先扩建「${z.name}」。`, 'warning');
      return false;
    }
    world.activeSeafoodIds.push(itemId);
    rebuildActiveBuffetSlots(world);
    sound.playClick();
    pushAlert(world, `已将「${def.name}」配置上架至今日供应菜单！`, 'success');
    return true;
  }
}

export function toggleActiveBroth(world: GameWorld, brothId: string): boolean {
  if (!world.unlockedBrothIds.includes(brothId)) return false;
  const def = BROTH_CATALOG.find((b) => b.id === brothId);
  if (!def) return false;

  const isActive = world.activeBrothIds.includes(brothId);
  if (isActive) {
    if (world.activeBrothIds.length <= 1) {
      pushAlert(world, '至少需保留 1 款上架锅底供顾客点单！', 'warning');
      return false;
    }
    world.activeBrothIds = world.activeBrothIds.filter((id) => id !== brothId);
    sound.playClick();
    pushAlert(world, `已暂停供应「${def.name}」。`, 'info');
    return true;
  } else {
    if (!isAvailableInSeason(def.seasons, world.season)) {
      pushAlert(world, `「${def.name}」为季节限定锅底，当前季节暂不可供应！`, 'warning');
      return false;
    }
    world.activeBrothIds.push(brothId);
    sound.playClick();
    pushAlert(world, `已将「${def.name}」加入今日供应锅底菜单！`, 'success');
    return true;
  }
}

export function unlockBuffetZone(world: GameWorld, zoneId: BuffetZoneId): boolean {
  if (world.phase !== 'PREP') {
    pushAlert(world, '购置建设特色菜品分区仅限在「开店前准备」阶段排期施工！', 'warning');
    return false;
  }
  if (world.unlockedZones.includes(zoneId)) return false;
  if (world.pendingOrders.some((o) => o.type === 'UNLOCK_ZONE' && o.targetId === zoneId)) {
    return false;
  }
  const def = getBuffetZoneDef(zoneId);
  if (!isZoneBlueprintUnlocked(world, zoneId)) {
    pushAlert(world, `建设「${def.name}」需先在「天赋树」研发解锁对应分区蓝图！`, 'warning');
    return false;
  }
  if (world.cash < def.unlockCost) {
    pushAlert(world, `资金不足，购置建设「${def.name}」需要 ¥${def.unlockCost}。`, 'warning');
    return false;
  }

  world.cash -= def.unlockCost;
  world.pendingOrders.push({
    id: nextExtUid('ord'),
    type: 'UNLOCK_ZONE',
    title: `分区建设 · ${def.shortName}`,
    detail: `${def.name}明档设备施工需 ${def.buildDays} 天，竣工后可配置至前厅区域位并上架专属菜品`,
    daysRemaining: def.buildDays,
    totalDays: def.buildDays,
    cost: def.unlockCost,
    targetId: zoneId,
  });
  sound.playHireStamp();
  pushAlert(
    world,
    `已出资 ¥${def.unlockCost} 签约建设「${def.name}」，预计 ${def.buildDays} 天后开店前竣工开放！`,
    'success'
  );
  return true;
}

// ==========================================
// 2. SPECIAL STAFF RECRUITMENT, 5-STAGE QUESTS & ROMANCE
// ==========================================

export function recruitSpecialStaff(world: GameWorld, staffId: SpecialStaffId): boolean {
  const bond = world.specialStaffBonds[staffId];
  if (bond.recruited) return false;
  const def = getSpecialStaffDef(staffId);
  if (world.mainChapter < def.recruitChapter) {
    pushAlert(world, `需推进主线至第 ${def.recruitChapter} 章才可邀请「${def.name}」。`, 'warning');
    return false;
  }
  if (world.cash < def.recruitCost) {
    pushAlert(world, `资金不足，诚邀特聘伙伴「${def.name}」需要签约礼金 ¥${def.recruitCost}。`, 'warning');
    return false;
  }

  world.cash -= def.recruitCost;
  bond.recruited = true;
  bond.affection = Math.max(bond.affection, 15);

  const tpl = createSpecialStaffCandidate(staffId);
  const meta = STAFF_ROLE_META[tpl.role];
  const sameRoleCount = world.staff.filter((s) => s.role === tpl.role).length;
  const offset = sameRoleCount * 22;

  const hired: HiredStaff = {
    ...tpl,
    id: nextExtUid('spec_partner'),
    x: meta.homeX + offset,
    y: meta.homeY,
    homeX: meta.homeX + offset,
    homeY: meta.homeY,
    carrying: 'NONE',
    carryAmount: 0,
    carryBrothId: null,
    taskQueue: [],
    activeTaskLabel: '特聘伙伴入驻',
    idleTimer: 0,
    walkCycle: 0,
    tasksCompleted: 0,
    fatigue: 0,
    morale: 95,
  };
  world.staff.push(hired);
  sound.playStoryFanfare();
  pushAlert(
    world,
    `特聘伙伴「${def.name}（${def.title}）」正式入队（不占常规编制）！可在开店前/闭店后推进其专属人物剧情。`,
    'success'
  );
  return true;
}

export function getAvailableSpecialStaffQuests(world: GameWorld): SpecialStaffId[] {
  if (world.phase !== 'PREP' && world.phase !== 'CLOSING') return [];
  if (world.mainStoryCompleted) return [];
  const available: SpecialStaffId[] = [];
  for (const def of SPECIAL_STAFF_CATALOG) {
    const bond = world.specialStaffBonds[def.id];
    if (!bond.recruited) continue;
    if (bond.storyStage >= def.quests.length) continue;
    if (bond.lastQuestDay >= world.day) continue; // Max 1 stage per day for pacing
    const nextQuest = def.quests[bond.storyStage];
    if (world.mainChapter < nextQuest.minChapter) continue;
    available.push(def.id);
  }
  return available;
}

export function triggerSpecialStaffQuest(world: GameWorld, staffId: SpecialStaffId): boolean {
  if (world.mainStoryCompleted) {
    pushAlert(world, '主线结局已圆满落幕，当前为纯经营无尽模式，不再触发剧情故事。', 'info');
    return false;
  }
  if (world.phase !== 'PREP' && world.phase !== 'CLOSING') {
    pushAlert(world, '特殊店员人物剧情任务仅限在「开店前准备」或「闭店收尾」阶段开启！', 'warning');
    return false;
  }
  const def = getSpecialStaffDef(staffId);
  const bond = world.specialStaffBonds[staffId];
  if (!bond.recruited || bond.storyStage >= def.quests.length) return false;
  const quest = def.quests[bond.storyStage];
  if (world.mainChapter < quest.minChapter) {
    pushAlert(world, `需主线达到第 ${quest.minChapter} 章后开启「${def.name}」的下一幕人物剧情。`, 'warning');
    return false;
  }

  bond.storyStage += 1;
  bond.lastQuestDay = world.day;
  sound.playStoryFanfare();

  world.pendingStoryModal = {
    id: nextExtUid('staff_quest'),
    category: 'SPECIAL_STAFF',
    badge: `特殊店员人物剧情 · ${def.name} (${bond.storyStage}/5)`,
    speakerName: def.name,
    speakerTitle: def.title,
    accentColor: def.color,
    headline: quest.title,
    body: quest.lines[0]?.text ?? '',
    lines: quest.lines,
    choices: quest.choices,
  };
  return true;
}

export function talkToStaffMember(world: GameWorld, staff: HiredStaff): boolean {
  if (world.mainStoryCompleted) return false;
  if (world.phase !== 'PREP' && world.phase !== 'CLOSING') {
    return false;
  }
  if (world.pendingStoryModal) return false;

  // Special recruitable staff member -> full daily dialogue or triggered milestone event!
  if (staff.specialStaffId) {
    return interactWithSpecialStaff(world, staff.specialStaffId, 'CHAT');
  }

  const isFirstToday = !world.staffChattedTodayIds.includes(staff.id);
  if (isFirstToday) {
    world.staffChattedTodayIds.push(staff.id);
    staff.morale = Math.min(100, staff.morale + 12);
    staff.fatigue = Math.max(0, staff.fatigue - 10);
  }

  sound.playClick();
  world.pendingStoryModal = buildOrdinaryStaffChatEvent(world, staff, isFirstToday);
  return true;
}

export function interactWithSpecialStaff(
  world: GameWorld,
  staffId: SpecialStaffId,
  mode: 'CHAT' | 'GIFT'
): boolean {
  if (world.mainStoryCompleted) {
    pushAlert(world, '主线结局已圆满落幕，当前为纯经营无尽模式，不再触发人物剧情互动。', 'info');
    return false;
  }
  const bond = world.specialStaffBonds[staffId];
  const def = getSpecialStaffDef(staffId);
  if (!bond.recruited) return false;

  if (mode === 'GIFT') {
    if (world.cash < 45) {
      pushAlert(world, '资金不足 ¥45，无法准备心意小礼。', 'warning');
      return false;
    }
    world.cash -= 45;
    bond.affection = Math.min(100, bond.affection + 12);
    if (bond.relationship === 'DATING' || bond.relationship === 'MARRIED') {
      bond.partnerBond = Math.min(100, bond.partnerBond + 18);
    }
    sound.playStoryFanfare();
    pushAlert(world, `送给「${def.name}」一份精选心意礼（-¥45），好感度 +12（当前 ${bond.affection}/100）！`, 'success');
  } else {
    const chatKey = `special_${staffId}`;
    const isFirstToday = !world.staffChattedTodayIds.includes(chatKey);
    if (isFirstToday) {
      world.staffChattedTodayIds.push(chatKey);
      bond.affection = Math.min(100, bond.affection + 5);
      if (bond.relationship === 'DATING' || bond.relationship === 'MARRIED') {
        bond.partnerBond = Math.min(100, bond.partnerBond + 10);
      }
      const staffObj = world.staff.find((s) => s.specialStaffId === staffId);
      if (staffObj) {
        staffObj.morale = Math.min(100, staffObj.morale + 12);
        staffObj.fatigue = Math.max(0, staffObj.fatigue - 10);
      }
    }

    if (bond.relationship === 'COLLEAGUE' && bond.affection >= 50) {
      bond.relationship = 'CLOSE';
    }

    // During PREP or CLOSING, open full VN daily dialogue or triggered milestone special event!
    if ((world.phase === 'PREP' || world.phase === 'CLOSING') && !world.pendingStoryModal) {
      const modal = buildSpecialStaffChatOrEvent(world, staffId, isFirstToday);
      world.pendingStoryModal = modal;
      if (modal.category === 'SPECIAL_STAFF') {
        sound.playStoryFanfare();
      } else {
        sound.playClick();
      }
      return true;
    }

    sound.playClick();
    pushAlert(
      world,
      isFirstToday
        ? `与「${def.name}」在休息间隙倾心畅谈，好感度 +5（当前 ${bond.affection}/100）！`
        : `与「${def.name}」默契点头致意，相视一笑。`,
      'info'
    );
  }

  if (bond.relationship === 'COLLEAGUE' && bond.affection >= 50) {
    bond.relationship = 'CLOSE';
  }
  return true;
}

export function confessOrProposeSpecialStaff(world: GameWorld, staffId: SpecialStaffId): boolean {
  if (world.mainStoryCompleted) {
    pushAlert(world, '主线结局已圆满落幕，当前为纯经营无尽模式，不再触发情感剧情。', 'info');
    return false;
  }
  if (world.phase !== 'PREP' && world.phase !== 'CLOSING') {
    pushAlert(world, '表白交往或求婚仪式需在「开店前」或「闭店后」的静谧时光进行！', 'warning');
    return false;
  }
  const bond = world.specialStaffBonds[staffId];
  const def = getSpecialStaffDef(staffId);
  if (!bond.recruited) return false;

  // Confess & start dating (Full multi-line VN drama!)
  if (bond.relationship !== 'DATING' && bond.relationship !== 'MARRIED') {
    if (world.activePartnerId && world.activePartnerId !== staffId) {
      const cur = getSpecialStaffDef(world.activePartnerId);
      pushAlert(world, `你已与「${cur.name}」确立伴侣关系，请专心守护这段感情。`, 'warning');
      return false;
    }
    if (bond.affection < 80) {
      pushAlert(world, `与「${def.name}」表白需要好感度达到 80（当前 ${bond.affection}）。`, 'warning');
      return false;
    }

    bond.relationship = 'DATING';
    bond.partnerBond = 95;
    bond.daysSinceDate = 0;
    bond.currentWish = def.wishes[0];
    bond.wishFulfilledToday = false;
    world.activePartnerId = staffId;
    sound.playStoryFanfare();

    world.pendingStoryModal = buildConfessionDramaModal(world, staffId);
    return true;
  }

  // Propose marriage (Full multi-line VN harbor wedding drama + vow choices!)
  if (bond.relationship === 'DATING') {
    if (bond.affection < 100 || bond.storyStage < 4) {
      pushAlert(
        world,
        `向「${def.name}」求婚需好感度满 100 且完成至少 4 幕人物剧情（当前好感 ${bond.affection}/100，剧情 ${bond.storyStage}/5）。`,
        'warning'
      );
      return false;
    }
    if (world.cash < 200) {
      pushAlert(world, '筹备浪漫海港求婚与婚戒需要 ¥200。', 'warning');
      return false;
    }
    world.cash -= 200;
    bond.relationship = 'MARRIED';
    bond.partnerBond = 100;
    bond.daysSinceDate = 0;
    world.reputation = Math.min(100, world.reputation + 8);
    sound.playStoryFanfare();

    world.pendingStoryModal = buildWeddingDramaModal(world, staffId);
    return true;
  }

  return false;
}

export function spendTimeWithPartner(
  world: GameWorld,
  staffId: SpecialStaffId,
  fulfillWish: boolean
): boolean {
  if (world.mainStoryCompleted) {
    pushAlert(world, '主线结局已圆满落幕，当前为纯经营无尽模式，不再触发伴侣剧情。', 'info');
    return false;
  }
  const bond = world.specialStaffBonds[staffId];
  const def = getSpecialStaffDef(staffId);
  if (bond.relationship !== 'DATING' && bond.relationship !== 'MARRIED') return false;

  if (fulfillWish) {
    if (bond.wishFulfilledToday) {
      pushAlert(world, `今天已经满足过「${def.name}」的心愿啦，对方正满心欢喜！`, 'info');
      return false;
    }
    if (world.cash < 50) {
      pushAlert(world, '满足伴侣心愿约会需要准备经费 ¥50。', 'warning');
      return false;
    }
    const fulfilledWishText = bond.currentWish || def.wishes[0];
    world.cash -= 50;
    bond.partnerBond = 100;
    bond.daysSinceDate = 0;
    bond.wishFulfilledToday = true;
    bond.affection = Math.min(100, bond.affection + 8);
    const nextWish = def.wishes[(world.day + 1) % def.wishes.length];
    bond.currentWish = nextWish;
    sound.playStoryFanfare();

    world.pendingStoryModal = buildPartnerDateModal(world, staffId, fulfilledWishText);
    return true;
  } else {
    bond.partnerBond = Math.min(100, bond.partnerBond + 22);
    bond.daysSinceDate = 0;
    sound.playClick();
    pushAlert(
      world,
      `你抽出休息时间静静陪伴「${def.name}」，伴侣亲密度提升至 ${Math.round(bond.partnerBond)}%！`,
      'success'
    );
    return true;
  }
}

// ==========================================
// 3. STORY CHOICE RESOLVER (MAIN / STAFF / FACILITY)
// ==========================================

export function resolveStoryChoice(world: GameWorld, choice: StoryChoiceOption) {
  if (choice.philosophyDelta) {
    for (const [k, v] of Object.entries(choice.philosophyDelta)) {
      const key = k as keyof GameWorld['storyPhilosophy'];
      world.storyPhilosophy[key] += v ?? 0;
    }
  }
  if (choice.cashDelta) {
    world.cash += choice.cashDelta;
    if (choice.cashDelta > 0) {
      world.totalCashEarned += choice.cashDelta;
      awardPlayerXpFromCash(world, choice.cashDelta);
    }
  }
  if (choice.reputationDelta) {
    world.reputation = Math.max(0, Math.min(100, world.reputation + choice.reputationDelta));
  }
  if (choice.affectionDelta) {
    const b = world.specialStaffBonds[choice.affectionDelta.staffId];
    if (b) {
      b.affection = Math.min(100, b.affection + choice.affectionDelta.amount);
      if (b.relationship === 'COLLEAGUE' && b.affection >= 50) b.relationship = 'CLOSE';
    }
  }
  if (choice.staffPath) {
    const b = world.specialStaffBonds[choice.staffPath.staffId];
    if (b) b.storyPathChoice = choice.staffPath.path;
  }
  if (choice.storyFlag) {
    world.storyFlags[choice.storyFlag.key] = choice.storyFlag.value;
  }

  // Contextual mechanical bonuses tied to specific choice IDs
  if (choice.id === 'ch1_craft' || choice.id === 'lin1_a') {
    world.hygiene = Math.min(100, world.hygiene + 6);
    world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + 10);
  } else if (choice.id === 'ch2_warmth' || choice.id === 'ch4_warmth' || choice.id === 'dorm_treat') {
    const delta = choice.id === 'ch2_warmth' ? 10 : choice.id === 'ch4_warmth' ? 8 : 6;
    for (const def of SPECIAL_STAFF_CATALOG) {
      const b = world.specialStaffBonds[def.id];
      if (b.recruited) b.affection = Math.min(100, b.affection + delta);
    }
    if (choice.id === 'dorm_treat') {
      world.staff.forEach((s) => {
        s.fatigue = 0;
        s.morale = 100;
      });
    }
  } else if (choice.id === 'shen1_a') {
    world.cookedStock = world.cookedMaxStock;
  } else if (choice.id === 'cold_buy') {
    world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + 18);
    world.oxygenLevel = 100;
  } else if (choice.id === 'cold_inspect') {
    world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + 8);
    world.hygiene = Math.min(100, world.hygiene + 3);
  } else if (choice.id === 'hot_boost') {
    world.cookedStock = Math.min(world.cookedMaxStock, world.cookedStock + 4);
  } else if (choice.id === 'hot_flow') {
    world.hygiene = Math.min(100, world.hygiene + 3);
  } else if (choice.id === 'wash_deep') {
    world.hygiene = Math.min(100, world.hygiene + 6);
    const washed = Math.min(world.dirtyDishes, 4);
    world.dirtyDishes -= washed;
    world.cleanDishes = Math.min(world.dishwareMax, world.cleanDishes + washed);
  } else if (choice.id === 'restroom_vip') {
    world.restroomCleanliness = 100;
    world.hygiene = Math.min(100, world.hygiene + 4);
  } else if (choice.id === 'restroom_std') {
    world.restroomCleanliness = Math.min(100, world.restroomCleanliness + 35);
    world.hygiene = Math.min(100, world.hygiene + 2);
  } else if (choice.id === 'equip_full') {
    world.equipmentHealth = 100;
    world.oxygenLevel = 100;
  } else if (choice.id === 'equip_diy') {
    world.equipmentHealth = Math.min(100, world.equipmentHealth + 28);
  } else if (choice.id === 'dorm_chat') {
    world.staff.forEach((s) => {
      s.fatigue = Math.max(0, s.fatigue - 25);
      s.morale = Math.min(100, s.morale + 10);
    });
  } else if (choice.id === 'office_bonus') {
    world.staff.forEach((s) => {
      s.morale = 100;
    });
  } else if (choice.id === 'recruit_lin_1a' || choice.id === 'recruit_lin_1b') {
    world.specialStaffBonds.lin_xi.recruitmentStage = 1;
    if (choice.id === 'recruit_lin_1a') {
      world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + 10);
    }
  } else if (choice.id === 'recruit_lin_2a') {
    enlistSpecialStaff(world, 'lin_xi');
  } else if (choice.id === 'recruit_shen_1a' || choice.id === 'recruit_shen_1b') {
    world.specialStaffBonds.shen_zhiwei.recruitmentStage = 1;
    if (choice.id === 'recruit_shen_1a') {
      world.cookedStock = world.cookedMaxStock;
    }
  } else if (choice.id === 'recruit_shen_2a') {
    enlistSpecialStaff(world, 'shen_zhiwei');
  } else if (choice.id === 'recruit_su_1a' || choice.id === 'recruit_su_1b') {
    world.specialStaffBonds.su_xingyao.recruitmentStage = 1;
  } else if (choice.id === 'recruit_su_2a') {
    enlistSpecialStaff(world, 'su_xingyao');
  } else if (choice.id === 'evt_lin_tide_a') {
    world.staff.forEach((s) => {
      s.fatigue = Math.max(0, s.fatigue - 15);
    });
  } else if (choice.id === 'evt_shen_taste_a') {
    world.cookedStock = world.cookedMaxStock;
  } else if (
    choice.id === 'evt_lin_chime_a' ||
    choice.id === 'evt_shen_star_a' ||
    choice.id === 'evt_su_book_a' ||
    choice.id.startsWith('wedding_vow_quiet_')
  ) {
    if (world.activePartnerId) {
      world.specialStaffBonds[world.activePartnerId].partnerBond = 100;
      world.specialStaffBonds[world.activePartnerId].daysSinceDate = 0;
    }
  } else if (choice.id.startsWith('wedding_vow_feast_')) {
    world.staff.forEach((s) => {
      s.morale = 100;
      s.fatigue = 0;
    });
  }

  // Apply in-service unexpected incident & branching side-quest effects
  applyIncidentChoiceEffects(world, choice.id);

  sound.playClick();
  pushAlert(world, choice.outcomeText, 'success');

  // If this was the Chapter 5 finale choice, generate the 4-dimension multi-ending!
  if (world.pendingStoryModal?.triggersEndingAfterClose) {
    world.endingReport = buildEndingEpilogue(world);
    world.showEndingModal = true;
  }
}

// ==========================================
// 4. 7 BACKSTAGE FACILITY SCENES & OFFICE / PART-TIME ACTIONS
// ==========================================

export function procureRawIngredients(world: GameWorld, amount = 15): boolean {
  const seasonDef = getSeasonDef(world.season);
  const tycoonCostMult = evaluateTycoonModifiers(world).costMultiplier;
  const unitCost = Math.max(2, Math.round(4 * seasonDef.costMultiplier * tycoonCostMult));
  const totalCost = unitCost * amount;
  if (world.rawIngredients >= world.rawIngredientsMax) {
    pushAlert(world, '冷链原料库已满仓，无需继续囤货！', 'info');
    return false;
  }
  if (world.cash < totalCost) {
    pushAlert(world, `资金不足，采购 ${amount} 份当季生鲜原料需要 ¥${totalCost}。`, 'warning');
    return false;
  }
  world.cash -= totalCost;
  world.todayStats.ingredientCost += totalCost;
  world.rawIngredients = Math.min(world.rawIngredientsMax, world.rawIngredients + amount);
  sound.playIceRestock();
  pushAlert(
    world,
    `按「${seasonDef.shortName}季行情 ×${seasonDef.costMultiplier}」采购原料 +${amount} 份（花费 ¥${totalCost}），现存 ${world.rawIngredients}/${world.rawIngredientsMax}。`,
    'success'
  );
  return true;
}

export function postPartTimeJob(world: GameWorld, jobId: string): boolean {
  const job = PART_TIME_JOBS.find((j) => j.id === jobId);
  if (!job) return false;
  const currentPartTimers = world.staff.filter((s) => s.isPartTime).length;
  if (currentPartTimers >= 3) {
    pushAlert(world, '同时在岗兼职人数上限为 3 人，请待现有兼职期满后再发布新任务！', 'warning');
    return false;
  }
  const meta = STAFF_ROLE_META[job.role];
  const sameRoleCount = world.staff.filter((s) => s.role === job.role).length;
  const offset = sameRoleCount * 20;

  const ptStaff: HiredStaff = {
    candidateId: `pt_${job.id}_${Date.now()}`,
    id: nextExtUid('pt_staff'),
    name: `${job.title.slice(0, 4)}·兼职`,
    role: job.role,
    tier: job.tier,
    hireCost: 0,
    dailyWage: job.dailyWage,
    moveSpeed: 145 + (job.tier - 1) * 35,
    workSpeed: 1.05 + (job.tier - 1) * 0.5,
    carryCapacity: job.tier,
    bonusTitle: '灵活用工兼职',
    bonusDetail: job.description,
    bonusValue: job.role === 'CHEF' ? 2 : job.role === 'DISHWASHER' ? 2 : 0.12,
    isPartTime: true,
    remainingDays: job.durationDays,
    x: meta.homeX + offset,
    y: meta.homeY,
    homeX: meta.homeX + offset,
    homeY: meta.homeY,
    carrying: 'NONE',
    carryAmount: 0,
    carryBrothId: null,
    taskQueue: [],
    activeTaskLabel: '兼职即刻上岗',
    idleTimer: 0,
    walkCycle: 0,
    tasksCompleted: 0,
    fatigue: 0,
    morale: 90,
  };

  world.staff.push(ptStaff);
  sound.playHireStamp();
  pushAlert(
    world,
    `办公室已发布「${job.title}」并即时到岗（不占编制 · 签约 ${job.durationDays} 天 · 日薪 ¥${job.dailyWage}）！`,
    'success'
  );
  return true;
}

export function checkOfficeAttendance(world: GameWorld): boolean {
  if (world.attendanceCheckedToday) {
    pushAlert(world, '今日员工考勤已核查完毕。', 'info');
    return false;
  }
  world.attendanceCheckedToday = true;
  world.staff.forEach((s) => {
    s.morale = Math.min(100, s.morale + 12);
  });
  sound.playClick();
  pushAlert(
    world,
    `已完成今日考勤抽查！全店 ${world.staff.length} 名员工出勤整齐，团队士气 +12。`,
    'success'
  );
  return true;
}

export function performFacilityAction(
  world: GameWorld,
  sceneId: FacilitySceneId
): boolean {
  switch (sceneId) {
    case 'cold_storage': {
      world.oxygenLevel = 100;
      world.coldChainTemp = -2;
      sound.playSplash();
      pushAlert(world, '已完成活鲜暂养池换水增氧与冷库巡检（含氧量 100%）。', 'success');
      return true;
    }
    case 'hot_kitchen': {
      if (world.cookedStock >= world.cookedMaxStock) {
        pushAlert(world, '熟食区热菜档已满仓！', 'info');
        return false;
      }
      if (world.rawIngredients < 2) {
        const seasonCost = Math.round(12 * getSeasonDef(world.season).costMultiplier);
        world.cash -= seasonCost;
        world.todayStats.ingredientCost += seasonCost;
      } else {
        world.rawIngredients -= 2;
      }
      const add = Math.min(world.cookedMaxStock - world.cookedStock, 3);
      world.cookedStock += add;
      world.todayStats.cookedDishesServed += add;
      sound.playSizzle();
      pushAlert(world, `热厨出品间加急现烹熟食 +${add} 份送抵熟食明档！`, 'success');
      return true;
    }
    case 'dish_washroom': {
      if (world.dirtyDishes <= 0) {
        world.hygiene = Math.min(100, world.hygiene + 3);
        sound.playSplash();
        pushAlert(world, '已清理洗消间海鲜壳垃圾并高温除味，卫生 +3！', 'success');
        return true;
      }
      const washed = Math.min(world.dirtyDishes, 5);
      world.dirtyDishes -= washed;
      world.cleanDishes = Math.min(world.dishwareMax, world.cleanDishes + washed);
      world.hygiene = Math.min(100, world.hygiene + 4);
      sound.playSplash();
      pushAlert(world, `洗消间集中高温洗消完成：净盘 +${washed}，卫生 +4！`, 'success');
      return true;
    }
    case 'restroom': {
      world.restroomCleanliness = 100;
      world.hygiene = Math.min(100, world.hygiene + 3);
      sound.playSplash();
      pushAlert(world, '已完成卫生间与洗手台全面保洁、补足去腥洗手液与擦手纸！', 'success');
      return true;
    }
    case 'equipment_room': {
      if (world.cash < 30) {
        pushAlert(world, '例行检修更换耗材需花费 ¥30。', 'warning');
        return false;
      }
      world.cash -= 30;
      world.equipmentHealth = 100;
      world.oxygenLevel = 100;
      sound.playClink();
      pushAlert(world, '已完成制冷机组、制冰机、增氧泵与油水分离器检修维护（耐久 100%）。', 'success');
      return true;
    }
    case 'dormitory': {
      if (world.dormFeastDoneToday) {
        pushAlert(world, '今日已在宿舍安排过休整慰问。', 'info');
        return false;
      }
      if (world.cash < 40) {
        pushAlert(world, '安排宿舍宵夜加餐慰问需要 ¥40。', 'warning');
        return false;
      }
      world.cash -= 40;
      world.dormFeastDoneToday = true;
      world.staff.forEach((s) => {
        s.fatigue = 0;
        s.morale = 100;
      });
      sound.playStoryFanfare();
      pushAlert(world, '宿舍团建慰问圆满完成！全体员工消除疲劳、干劲拉满！', 'success');
      return true;
    }
    case 'office':
      return checkOfficeAttendance(world);
  }
}

export function triggerFacilitySceneStory(
  world: GameWorld,
  sceneId: FacilitySceneId
): boolean {
  if (world.mainStoryCompleted) {
    pushAlert(world, '主线结局已圆满落幕，当前为纯经营无尽模式，不再触发场馆剧情。', 'info');
    return false;
  }
  if (world.facilityEventsDoneToday.includes(sceneId)) {
    pushAlert(world, '该场景今日互动剧情已触发过，明日再来巡视看看新动态吧！', 'info');
    return false;
  }
  world.facilityEventsDoneToday.push(sceneId);
  world.pendingStoryModal = buildFacilitySceneEvent(sceneId, world);
  sound.playStoryFanfare();
  return true;
}
