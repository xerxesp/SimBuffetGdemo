import {
  BROTH_CATALOG,
  FRONT_HALL_ZONE_PADS,
  getBuffetZoneDef,
  getFrontHallBounds,
  getShopConfig,
  isAvailableInSeason,
  SEAFOOD_CATALOG,
  STAFF_ROLE_META,
  TABLE_UNLOCK_ORDER,
} from '../data/gameConfig';
import {
  BACKSTAGE_CORRIDOR,
  BACKSTAGE_EXIT_DOOR,
  BACKSTAGE_ROOMS,
  DINING_REGIMES,
  findNearestFrontBackArchway,
  FRONT_BACK_ARCHWAYS,
  getBackstageRoomRect,
  getOpsPolicyCardDef,
  getRegimeDef,
  getTechNodeDef,
  HIDDEN_SYNERGIES,
  OPS_POLICY_CARDS,
  REGIME_SWITCH_COOLDOWN_DAYS,
  TECH_TREE_NODES,
} from '../data/policyAndTechConfig';
import {
  createSpecialStaffCandidate,
  getCharacterDef,
  getSpecialStaffDef,
} from '../data/storyConfig';
import {
  CharacterId,
  FacilitySceneId,
  GameWorld,
  HiredStaff,
  PolicyCardCategory,
  PolicySlotInstance,
  PolicySlotType,
  RegimeId,
  SpecialStaffId,
  StoryModalEvent,
} from '../types/game';
import { sound } from '../utils/sound';
import {
  autoPlaceNewlyUnlockedZone,
  ensureZonePadAssignments,
  isBuffetZoneUnlocked,
  rebuildActiveBuffetSlots,
} from './storyAndFacilities';

let policyUid = 50000;
function nextPolicyUid(prefix: string): string {
  policyUid += 1;
  return `${prefix}_${policyUid}`;
}

function pushPolicyAlert(
  world: GameWorld,
  message: string,
  severity: 'info' | 'warning' | 'penalty' | 'success' = 'info'
) {
  const clock = world.phase === 'PREP' ? '10:00' : world.phase === 'CLOSING' ? '22:00' : '营业';
  world.alerts.unshift({
    id: nextPolicyUid('pal'),
    timeText: clock,
    message,
    severity,
  });
  if (world.alerts.length > 30) world.alerts.length = 30;
}

// ==========================================
// 1. CIV 6 POLICY CARDS, REGIMES & HIDDEN SYNERGIES
// ==========================================

export function parsePolicyCardId(cardId: string): {
  category: PolicyCardCategory;
  rawId: string;
} | null {
  if (cardId.startsWith('dish:')) return { category: 'DISH', rawId: cardId.slice(5) };
  if (cardId.startsWith('broth:')) return { category: 'BROTH', rawId: cardId.slice(6) };
  if (cardId.startsWith('ops:')) return { category: 'OPS', rawId: cardId.slice(4) };
  return null;
}

export function canSlotAcceptCard(
  slotType: PolicySlotType,
  cardCategory: PolicyCardCategory
): boolean {
  return slotType === 'WILDCARD' || slotType === cardCategory;
}

export function createInitialPolicySlots(
  regimeId: RegimeId,
  characterId: CharacterId
): PolicySlotInstance[] {
  const regime = getRegimeDef(regimeId);
  const charDef = getCharacterDef(characterId);
  const slots: PolicySlotInstance[] = regime.slots.map((slotType, idx) => ({
    slotId: `slot_${idx}`,
    slotType,
    cardId: null,
  }));

  // Starter cards tailored cleanly to initial regime slots
  const starterDishes = ['dish:prawns', 'dish:beef_rolls', 'dish:garlic_scallops'];
  if (charDef.bonuses.freeSeafoodId) {
    starterDishes.splice(1, 0, `dish:${charDef.bonuses.freeSeafoodId}`);
  }
  const starterBroth = charDef.bonuses.freeBrothId
    ? `broth:${charDef.bonuses.freeBrothId}`
    : 'broth:spicy_tallow';

  let dishIdx = 0;
  let brothPlaced = false;
  for (const s of slots) {
    if (s.slotType === 'DISH' && dishIdx < starterDishes.length) {
      s.cardId = starterDishes[dishIdx++];
    } else if (s.slotType === 'BROTH' && !brothPlaced) {
      s.cardId = starterBroth;
      brothPlaced = true;
    } else if (s.slotType === 'WILDCARD' && dishIdx < starterDishes.length) {
      s.cardId = starterDishes[dishIdx++];
    }
  }
  return slots;
}

export function detectActiveSynergies(world: GameWorld, announceNew = true): string[] {
  const equippedIds = world.policySlots
    .map((s) => s.cardId)
    .filter((id): id is string => Boolean(id));

  const dishIds = equippedIds
    .filter((id) => id.startsWith('dish:'))
    .map((id) => id.slice(5));
  const brothIds = equippedIds
    .filter((id) => id.startsWith('broth:'))
    .map((id) => id.slice(6));
  const opsIds = equippedIds
    .filter((id) => id.startsWith('ops:'))
    .map((id) => id.slice(4));

  const dishDefs = dishIds
    .map((id) => SEAFOOD_CATALOG.find((s) => s.id === id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));
  const brothDefs = brothIds
    .map((id) => BROTH_CATALOG.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  const active: string[] = [];

  // 1. 冰火海鲜双重奏: Sashimi zone dish + Cooked zone dish + Spicy Tallow broth
  const hasSashimi = dishDefs.some((d) => d.zone === 'sashimi_sushi');
  const hasCooked = dishDefs.some((d) => d.zone === 'cooked_hot');
  if (hasSashimi && hasCooked && brothIds.includes('spicy_tallow')) {
    active.push('syn_fire_and_ice');
  }

  // 2. 港湾烟火不夜城: garlic_scallops + (typhoon_crab OR ops_iron_flame)
  if (
    dishIds.includes('garlic_scallops') &&
    (dishIds.includes('typhoon_crab') || opsIds.includes('ops_iron_flame'))
  ) {
    active.push('syn_harbor_night');
  }

  // 3. 深海三绝御宴: >= 3 premium seafood cards
  const premiumSet = new Set([
    'oysters',
    'salmon',
    'sweet_shrimp_sushi',
    'abalone_live',
    'lobster',
    'king_crab',
    'bluefin_toro',
  ]);
  const premiumCount = dishIds.filter((id) => premiumSet.has(id)).length;
  if (premiumCount >= 3) {
    active.push('syn_deep_sea_trio');
  }

  // 4. 不时不食 · 时令宗师: >= 2 in-season seasonal cards (dish or broth)
  const seasonalCount =
    dishDefs.filter((d) => d.seasons && isAvailableInSeason(d.seasons, world.season)).length +
    brothDefs.filter((b) => b.seasons && isAvailableInSeason(b.seasons, world.season)).length;
  if (seasonalCount >= 2) {
    active.push('syn_seasonal_master');
  }

  // 5. 精密堂口运转阵: >= 2 green operational policy cards
  if (opsIds.length >= 2) {
    active.push('syn_ops_engine');
  }

  // 6. 海鲜自助大满贯: equipped dishes span >= 3 distinct buffet zones
  const distinctZones = new Set(dishDefs.map((d) => d.zone));
  if (distinctZones.size >= 3) {
    active.push('syn_grand_buffet');
  }

  world.activeSynergyIds = active;

  // Record newly discovered hidden synergies with Civ 6 Eureka fanfare!
  for (const synId of active) {
    if (!world.discoveredSynergyIds.includes(synId)) {
      world.discoveredSynergyIds.push(synId);
      if (announceNew) {
        const synDef = HIDDEN_SYNERGIES.find((h) => h.id === synId);
        if (synDef) {
          sound.playStoryFanfare();
          pushPolicyAlert(
            world,
            `【发现隐藏组合共鸣 · ${synDef.name}】触发绝妙卡组搭配！生效增益：${synDef.effectText}`,
            'success'
          );
        }
      }
    }
  }

  return active;
}

export function syncActiveMenuFromPolicySlots(world: GameWorld, announceSynergy = true) {
  const dishIds: string[] = [];
  const brothIds: string[] = [];

  for (const slot of world.policySlots) {
    if (!slot.cardId) continue;
    const parsed = parsePolicyCardId(slot.cardId);
    if (!parsed) continue;
    if (parsed.category === 'DISH') {
      const def = SEAFOOD_CATALOG.find((s) => s.id === parsed.rawId);
      if (
        def &&
        isAvailableInSeason(def.seasons, world.season) &&
        isBuffetZoneUnlocked(world, def.zone)
      ) {
        dishIds.push(parsed.rawId);
      } else if (def) {
        // Unequip off-season or un-unlocked-zone card automatically
        slot.cardId = null;
      }
    } else if (parsed.category === 'BROTH') {
      const def = BROTH_CATALOG.find((b) => b.id === parsed.rawId);
      if (def && isAvailableInSeason(def.seasons, world.season)) {
        brothIds.push(parsed.rawId);
      } else if (def && !isAvailableInSeason(def.seasons, world.season)) {
        slot.cardId = null;
      }
    }
  }

  // Ensure safe fallback for active seafood & broth lists
  world.activeSeafoodIds = dishIds.length > 0 ? dishIds : ['prawns'];
  world.activeBrothIds = brothIds.length > 0 ? brothIds : ['spicy_tallow'];

  rebuildActiveBuffetSlots(world);
  detectActiveSynergies(world, announceSynergy);
}

export interface PolicyEvaluatedBonuses {
  regimeBaseTicket: number;
  extraTicketBonus: number;
  customerRateMult: number;
  vipChanceBonus: number;
  tipBonus: number;
  costDiscount: number;
  hygieneDecayReduction: number;
  speedBonus: number;
  extraCookedYield: number;
  patienceDecayReduction: number;
}

export function evaluatePolicyBonuses(world: GameWorld): PolicyEvaluatedBonuses {
  const regime = getRegimeDef(world.activeRegimeId);
  let extraTicketBonus = 0;
  let customerRateBonus = 0;
  let vipChanceBonus = regime.vipBonus;
  let tipBonus = 0;
  let costDiscount = 0;
  let hygieneDecayReduction = 0;
  let speedBonus = 0;
  let extraCookedYield = 0;
  let patienceDecayReduction = 0;

  // Dish quality ticket contribution (gentle bonus on top of Regime base)
  for (const slot of world.policySlots) {
    if (!slot.cardId) continue;
    const parsed = parsePolicyCardId(slot.cardId);
    if (!parsed) continue;
    if (parsed.category === 'DISH') {
      const dish = SEAFOOD_CATALOG.find((s) => s.id === parsed.rawId);
      if (dish && isAvailableInSeason(dish.seasons, world.season)) {
        extraTicketBonus += Math.round(dish.ticketBonus * 0.45);
      }
    } else if (parsed.category === 'OPS') {
      const ops = getOpsPolicyCardDef(parsed.rawId);
      if (ops) {
        tipBonus += ops.tipBonus ?? 0;
        costDiscount += ops.costDiscount ?? 0;
        customerRateBonus += ops.customerRateBonus ?? 0;
        hygieneDecayReduction += ops.hygieneDecayReduction ?? 0;
        speedBonus += ops.speedBonus ?? 0;
        vipChanceBonus += ops.vipChanceBonus ?? 0;
        extraCookedYield += ops.extraCookedYield ?? 0;
        patienceDecayReduction += ops.patienceDecayReduction ?? 0;
      }
    }
  }

  // Active hidden synergy bonuses
  for (const synId of world.activeSynergyIds) {
    const syn = HIDDEN_SYNERGIES.find((h) => h.id === synId);
    if (!syn) continue;
    extraTicketBonus += syn.ticketBonus ?? 0;
    tipBonus += syn.tipBonus ?? 0;
    costDiscount += syn.costDiscount ?? 0;
    customerRateBonus += syn.customerRateBonus ?? 0;
    hygieneDecayReduction += syn.hygieneDecayReduction ?? 0;
    speedBonus += syn.speedBonus ?? 0;
    extraCookedYield += syn.extraCookedYield ?? 0;
  }

  return {
    regimeBaseTicket: regime.baseTicketPrice,
    extraTicketBonus,
    customerRateMult: Math.max(0.5, regime.customerRateMult * (1 + customerRateBonus)),
    vipChanceBonus,
    tipBonus,
    costDiscount: Math.min(0.45, costDiscount),
    hygieneDecayReduction: Math.min(0.6, hygieneDecayReduction),
    speedBonus: Math.min(0.5, speedBonus),
    extraCookedYield,
    patienceDecayReduction: Math.min(0.4, patienceDecayReduction),
  };
}

export function isCardUnlockedAndAvailable(
  world: GameWorld,
  cardId: string
): { ok: boolean; reason?: string } {
  const parsed = parsePolicyCardId(cardId);
  if (!parsed) return { ok: false, reason: '无效卡牌' };

  if (parsed.category === 'DISH') {
    if (!world.unlockedSeafoodIds.includes(parsed.rawId)) {
      return { ok: false, reason: '需先在门店发展树解锁该菜品卡' };
    }
    const def = SEAFOOD_CATALOG.find((s) => s.id === parsed.rawId);
    if (!def) return { ok: false, reason: '菜品不存在' };
    if (!isBuffetZoneUnlocked(world, def.zone)) {
      return {
        ok: false,
        reason: `需先在门店发展树扩建「${getBuffetZoneDef(def.zone).name}」后方可上架`,
      };
    }
    if (!isAvailableInSeason(def.seasons, world.season)) {
      return { ok: false, reason: `「${def.shortName}」非当季应季食材，本季不可上架` };
    }
    return { ok: true };
  }
  if (parsed.category === 'BROTH') {
    if (!world.unlockedBrothIds.includes(parsed.rawId)) {
      return { ok: false, reason: '需先在门店发展树解锁该锅底卡' };
    }
    const def = BROTH_CATALOG.find((b) => b.id === parsed.rawId);
    if (!def) return { ok: false, reason: '锅底不存在' };
    if (!isAvailableInSeason(def.seasons, world.season)) {
      return { ok: false, reason: `「${def.name}」为季节限定锅底，本季不可供应` };
    }
    return { ok: true };
  }
  if (parsed.category === 'OPS') {
    if (!world.unlockedOpsCardIds.includes(parsed.rawId)) {
      return { ok: false, reason: '需先在门店发展树解锁该经营策略卡' };
    }
    return { ok: true };
  }
  return { ok: false, reason: '未知类型' };
}

export function equipPolicyCard(
  world: GameWorld,
  slotId: string,
  cardId: string
): boolean {
  if (world.phase !== 'PREP') {
    pushPolicyAlert(world, '调整门店菜单与经营配置位仅限在「开店前准备」阶段进行！', 'warning');
    return false;
  }
  const slot = world.policySlots.find((s) => s.slotId === slotId);
  if (!slot) return false;

  const parsed = parsePolicyCardId(cardId);
  if (!parsed) return false;

  if (!canSlotAcceptCard(slot.slotType, parsed.category)) {
    pushPolicyAlert(world, '该配置位类型不匹配，请放入对应类型卡位或自由搭配位！', 'warning');
    return false;
  }

  const avail = isCardUnlockedAndAvailable(world, cardId);
  if (!avail.ok) {
    pushPolicyAlert(world, avail.reason ?? '该卡牌暂不可用', 'warning');
    return false;
  }

  // If already equipped in another slot, swap cleanly!
  const existingSlot = world.policySlots.find((s) => s.cardId === cardId);
  if (existingSlot && existingSlot.slotId !== slot.slotId) {
    const prevInTarget = slot.cardId;
    if (
      prevInTarget &&
      canSlotAcceptCard(existingSlot.slotType, parsePolicyCardId(prevInTarget)!.category)
    ) {
      existingSlot.cardId = prevInTarget;
    } else {
      existingSlot.cardId = null;
    }
  }

  slot.cardId = cardId;
  sound.playClick();
  syncActiveMenuFromPolicySlots(world, true);
  return true;
}

export function unequipPolicySlot(world: GameWorld, slotId: string): boolean {
  if (world.phase !== 'PREP') {
    pushPolicyAlert(world, '调整门店配置位仅限在「开店前准备」阶段进行！', 'warning');
    return false;
  }
  const slot = world.policySlots.find((s) => s.slotId === slotId);
  if (!slot || !slot.cardId) return false;
  slot.cardId = null;
  sound.playClick();
  syncActiveMenuFromPolicySlots(world, false);
  return true;
}

export function autoSlotPolicyCard(world: GameWorld, cardId: string): boolean {
  if (world.phase !== 'PREP') {
    pushPolicyAlert(world, '调整门店配置位仅限在「开店前准备」阶段进行！', 'warning');
    return false;
  }
  const parsed = parsePolicyCardId(cardId);
  if (!parsed) return false;

  // Already equipped? Clicking again unequips it!
  const already = world.policySlots.find((s) => s.cardId === cardId);
  if (already) {
    return unequipPolicySlot(world, already.slotId);
  }

  // 1. Prefer empty exact-match slot
  const emptyExact = world.policySlots.find(
    (s) => s.slotType === parsed.category && s.cardId === null
  );
  if (emptyExact) return equipPolicyCard(world, emptyExact.slotId, cardId);

  // 2. Next prefer empty WILDCARD slot
  const emptyWild = world.policySlots.find(
    (s) => s.slotType === 'WILDCARD' && s.cardId === null
  );
  if (emptyWild) return equipPolicyCard(world, emptyWild.slotId, cardId);

  // 3. Otherwise replace the last matching slot so one-click feels responsive
  const matchingSlots = world.policySlots.filter((s) =>
    canSlotAcceptCard(s.slotType, parsed.category)
  );
  if (matchingSlots.length > 0) {
    return equipPolicyCard(world, matchingSlots[matchingSlots.length - 1].slotId, cardId);
  }

  pushPolicyAlert(
    world,
    '当前店面类型暂无可用配置位容纳该类型卡牌，可升级解锁更高阶店面类型或撤下旧卡！',
    'warning'
  );
  return false;
}

export function switchDiningRegime(world: GameWorld, targetRegimeId: RegimeId): boolean {
  if (world.phase !== 'PREP') {
    pushPolicyAlert(world, '切换店面类型仅限在「开店前准备」阶段执行！', 'warning');
    return false;
  }
  if (!world.unlockedRegimeIds.includes(targetRegimeId)) {
    pushPolicyAlert(world, '该店面类型尚未在「门店发展树」中研发解锁！', 'warning');
    return false;
  }
  if (world.activeRegimeId === targetRegimeId) {
    return false;
  }
  if (world.regimeSwitchCooldown > 0) {
    pushPolicyAlert(
      world,
      `店面类型切换冷却中！还需等待 ${world.regimeSwitchCooldown} 天才可再次切换。`,
      'warning'
    );
    return false;
  }

  const prevCards = world.policySlots
    .map((s) => s.cardId)
    .filter((id): id is string => Boolean(id));
  const nextRegime = getRegimeDef(targetRegimeId);

  const nextSlots: PolicySlotInstance[] = nextRegime.slots.map((slotType, idx) => ({
    slotId: `slot_${idx}`,
    slotType,
    cardId: null,
  }));

  // Preserve previously equipped cards into matching slots first, then wildcards
  const remaining: string[] = [];
  for (const cid of prevCards) {
    const parsed = parsePolicyCardId(cid);
    if (!parsed) continue;
    const exact = nextSlots.find((s) => s.slotType === parsed.category && s.cardId === null);
    if (exact) {
      exact.cardId = cid;
    } else {
      remaining.push(cid);
    }
  }
  for (const cid of remaining) {
    const wild = nextSlots.find((s) => s.slotType === 'WILDCARD' && s.cardId === null);
    if (wild) {
      wild.cardId = cid;
    }
  }

  world.activeRegimeId = targetRegimeId;
  world.policySlots = nextSlots;
  world.regimeSwitchCooldown = REGIME_SWITCH_COOLDOWN_DAYS;

  syncActiveMenuFromPolicySlots(world, true);
  sound.playStoryFanfare();
  pushPolicyAlert(
    world,
    `已切换店面类型为「${nextRegime.name}（基价 ¥${nextRegime.baseTicketPrice} · ${nextRegime.slots.length} 配置位）」！冷却时间 ${REGIME_SWITCH_COOLDOWN_DAYS} 天。`,
    'success'
  );
  return true;
}

// ==========================================
// 2. CIV 6 STYLE 5-STAGE TALENT TREE (天赋树)
// ==========================================

export type TechNodeStatus = 'UNLOCKED' | 'RESEARCHING' | 'AVAILABLE' | 'LOCKED';

export function getTechNodeStatus(
  world: GameWorld,
  nodeId: string
): { status: TechNodeStatus; reason?: string; daysRemaining?: number } {
  const node = getTechNodeDef(nodeId);
  if (!node) return { status: 'LOCKED', reason: '未知节点' };

  if (world.unlockedTechNodeIds.includes(nodeId)) {
    return { status: 'UNLOCKED' };
  }
  const pending = world.pendingOrders.find(
    (o) => o.type === 'UNLOCK_TECH_NODE' && o.targetId === nodeId
  );
  if (pending) {
    return { status: 'RESEARCHING', daysRemaining: pending.daysRemaining };
  }

  const missingPrereqs = node.prereqs.filter((p) => !world.unlockedTechNodeIds.includes(p));
  if (missingPrereqs.length > 0) {
    const names = missingPrereqs
      .map((pid) => getTechNodeDef(pid)?.title ?? pid)
      .join('、');
    return { status: 'LOCKED', reason: `需先掌握前置：${names}` };
  }
  if (node.minReputation && world.reputation < node.minReputation) {
    return { status: 'LOCKED', reason: `需口碑 ≥ ${node.minReputation}（当前 ${Math.round(world.reputation)}）` };
  }
  if (node.minDay && world.day < node.minDay) {
    return { status: 'LOCKED', reason: `需经营至第 ${node.minDay} 天` };
  }
  return { status: 'AVAILABLE' };
}

export function startTechNodeResearch(world: GameWorld, nodeId: string): boolean {
  if (world.phase !== 'PREP') {
    pushPolicyAlert(world, '研发解锁发展树节点仅限在「开店前准备」阶段排期！', 'warning');
    return false;
  }
  const node = getTechNodeDef(nodeId);
  if (!node) return false;

  const st = getTechNodeStatus(world, nodeId);
  if (st.status !== 'AVAILABLE') {
    if (st.reason) pushPolicyAlert(world, st.reason, 'warning');
    return false;
  }

  if (world.cash < node.cost) {
    pushPolicyAlert(
      world,
      `资金不足！筹建「${node.title}」需要投入 ¥${node.cost}。`,
      'warning'
    );
    return false;
  }

  world.cash -= node.cost;
  const days = Math.max(1, node.researchDays);
  world.pendingOrders.push({
    id: nextPolicyUid('tech_ord'),
    type: 'UNLOCK_TECH_NODE',
    title: `门店研发 · ${node.title}`,
    detail: `${node.shortDesc} · 需等待 ${days} 天后开店前生效`,
    daysRemaining: days,
    totalDays: days,
    cost: node.cost,
    targetId: node.id,
  });

  sound.playHireStamp();
  pushPolicyAlert(
    world,
    `已投入 ¥${node.cost} 启动「${node.title}」筹建研发，预计 ${days} 天后开店前完成解锁！`,
    'success'
  );
  return true;
}

function unlockTablesTo(world: GameWorld, targetCount: number) {
  if (targetCount <= world.tableLimit) return;
  const prevLimit = world.tableLimit;
  world.tableLimit = targetCount;
  const newlyUnlocked = TABLE_UNLOCK_ORDER.slice(prevLimit, world.tableLimit);
  for (const idx of newlyUnlocked) {
    const table = world.tables[idx];
    if (table && table.status === 'LOCKED') {
      table.status = 'NEEDS_TABLEWARE';
    }
  }
  world.dishwareMax += 2;
  world.cleanDishes += 2;
}

function upgradeShopLevelTo(world: GameWorld, targetLv: number) {
  if (targetLv <= world.shopLevel) return;
  const prevLv = world.shopLevel;
  const diff = targetLv - prevLv;
  world.shopLevel = Math.min(5, targetLv);
  world.rawIngredientsMax += 15 * diff;
  world.cookedMaxStock += 2 * diff;
  ensureZonePadAssignments(world);

  // Auto-place any previously unlocked but unplaced buffet zone onto the newly expanded pads
  for (const zId of world.unlockedZones) {
    autoPlaceNewlyUnlockedZone(world, zId);
  }
  const exp = getFrontHallBounds(world.shopLevel);
  const newPads = FRONT_HALL_ZONE_PADS.filter(
    (p) => p.minShopLevel > prevLv && p.minShopLevel <= world.shopLevel
  );
  if (newPads.length > 0) {
    const names = newPads.map((p) => `【${p.label}】`).join('、');
    pushPolicyAlert(
      world,
      `【地图自动扩建 · ${exp.wingTitle}】店铺升至 Lv.${world.shopLevel}，前厅面积扩大并新开放区域位 ${names}！可在「门店配置 → 区域布局」或点击空区域位自由指定菜品区。`,
      'success'
    );
  }
}

export function applyCompletedTechNode(world: GameWorld, nodeId: string): string | null {
  const node = getTechNodeDef(nodeId);
  if (!node) return null;
  if (!world.unlockedTechNodeIds.includes(nodeId)) {
    world.unlockedTechNodeIds.push(nodeId);
  }

  const addDish = (id: string) => {
    if (!world.unlockedSeafoodIds.includes(id)) world.unlockedSeafoodIds.push(id);
    // Seed initial tasting inventory batch in cold storage so player can serve immediately
    world.warehouseStock[id] = Math.max(world.warehouseStock[id] ?? 0, 18);
  };
  const addBroth = (id: string) => {
    if (!world.unlockedBrothIds.includes(id)) world.unlockedBrothIds.push(id);
  };
  const addOps = (id: string) => {
    if (!world.unlockedOpsCardIds.includes(id)) world.unlockedOpsCardIds.push(id);
  };
  const addRegime = (id: RegimeId) => {
    if (!world.unlockedRegimeIds.includes(id)) world.unlockedRegimeIds.push(id);
  };
  const addZone = (z: GameWorld['unlockedZones'][number]) => {
    if (!world.unlockedZones.includes(z)) world.unlockedZones.push(z);
  };

  let summary = `门店研发「${node.title}」竣工解锁！`;

  switch (node.id) {
    case 'tech_dish_oysters':
      addDish('oysters');
      world.reputation = Math.min(100, world.reputation + 2);
      summary = '「乳山生蚝青口」解锁（附赠首批冷库库存 18 份）！可在门店配置中上架。';
      break;
    case 'tech_broth_bamboo':
      addBroth('spring_bamboo');
      world.reputation = Math.min(100, world.reputation + 2);
      summary = '「春笋椰青清锅」解锁！已加入锅底配置卡库。';
      break;
    case 'tech_hw_tables6':
      unlockTablesTo(world, 6);
      summary = '大厅扩建竣工！现开放至 6 张雅座（附赠 2 套净盘）。';
      break;
    case 'tech_regime_bistro':
      addRegime('harbor_bistro');
      upgradeShopLevelTo(world, 2);
      addOps('ops_fresh_qc');
      world.reputation = Math.min(100, world.reputation + 4);
      summary = '店面类型「海港鲜味坊（¥198 · 5配置位）」解锁！店铺升至 Lv.2（编制5人）并获「码头严选品控」策略卡！';
      break;
    case 'tech_zone_drinks': {
      addZone('drinks_dessert');
      addDish('durian_craft');
      const placed = autoPlaceNewlyUnlockedZone(world, 'drinks_dessert');
      world.reputation = Math.min(100, world.reputation + 3);
      summary = `前场「酒水饮料/甜品水果区」研发完成！${
        placed
          ? `已自动落位至【${placed.label}】，可在「区域布局」自由调整。`
          : '请升级店铺扩建更多区域位或在「区域布局」中替换位置。'
      }`;
      break;
    }
    case 'tech_broth_maw':
      addBroth('golden_maw');
      addOps('ops_iron_flame');
      world.reputation = Math.min(100, world.reputation + 3);
      summary = '「金汤花胶鸡锅」与经营策略卡「明档铁板烟火」研发完成，已收入卡库！';
      break;
    case 'tech_hw_dish_buffet1': {
      const diff = Math.max(0, 18 - world.dishwareMax);
      world.dishwareMax = Math.max(world.dishwareMax, 18);
      world.cleanDishes += diff;
      world.buffetCapacityBonus += 2;
      summary = '商用高温消毒柜（18套）与深冷冰台（每格+2份）安装竣工！';
      break;
    }
    case 'tech_regime_hall':
      addRegime('seafood_hall');
      upgradeShopLevelTo(world, 3);
      addOps('ops_speed_turn');
      world.reputation = Math.min(100, world.reputation + 5);
      summary = '店面类型「潮鲜臻品堂（¥298 · 6配置位）」解锁！店铺升至 Lv.3（编制7人）并扩建南庭水景厅！';
      break;
    case 'tech_zone_sashimi': {
      addZone('sashimi_sushi');
      addDish('salmon');
      addDish('sweet_shrimp_sushi');
      const placed = autoPlaceNewlyUnlockedZone(world, 'sashimi_sushi');
      world.reputation = Math.min(100, world.reputation + 4);
      summary = `前场「刺身与日料区」解锁！${
        placed
          ? `已自动布置至【${placed.label}】，可在「区域布局」中自由调整位置。`
          : '可在「区域布局」中替换或待扩建新区域位后配置。'
      }`;
      break;
    }
    case 'tech_dish_typhoon':
      addDish('typhoon_crab');
      addBroth('tomyum_royal');
      world.reputation = Math.min(100, world.reputation + 3);
      summary = '热菜卡「避风塘铁板炒蟹」与锅底卡「冬阴功海鲜皇锅」研发成功！';
      break;
    case 'tech_hw_tables8':
      unlockTablesTo(world, 8);
      addOps('ops_hygiene_shield');
      summary = '大厅扩建至 8 张豪华席！同步解锁经营策略卡「无菌冷链标杆」。';
      break;
    case 'tech_regime_imperial':
      addRegime('imperial_feast');
      upgradeShopLevelTo(world, 4);
      addOps('ops_vip_concierge');
      world.reputation = Math.min(100, world.reputation + 6);
      summary = '店面类型「御海尊享殿（¥418 · 7配置位）」解锁！店铺升至 Lv.4（编制9人）并扩建东阁御宴廊！';
      break;
    case 'tech_zone_live': {
      addZone('live_seafood');
      addDish('abalone_live');
      addDish('lobster');
      const placed = autoPlaceNewlyUnlockedZone(world, 'live_seafood');
      world.reputation = Math.min(100, world.reputation + 5);
      summary = `前场「活捞海鲜暂养区」解锁！${
        placed
          ? `已自动布置至【${placed.label}】，可在「区域布局」中自由更换区域位。`
          : '可在「区域布局」中替换或待扩建新区域位后配置。'
      }`;
      break;
    }
    case 'tech_dish_wagyu_mutton':
      addDish('wagyu');
      addBroth('winter_mutton');
      world.reputation = Math.min(100, world.reputation + 4);
      summary = '顶奢菜品卡「雪花M9和牛」与秋冬名锅「古法海参滋补老汤锅」解锁！';
      break;
    case 'tech_hw_tables10': {
      unlockTablesTo(world, 10);
      const diff = Math.max(0, 24 - world.dishwareMax);
      world.dishwareMax = Math.max(world.dishwareMax, 24);
      world.cleanDishes += diff;
      world.buffetCapacityBonus += 3;
      summary = '大厅扩建至 10 张雅座、24 套餐具与超深碎冰槽竣工！';
      break;
    }
    case 'tech_regime_legendary':
      addRegime('legendary_citadel');
      upgradeShopLevelTo(world, 5);
      addOps('ops_harbor_feast');
      world.reputation = Math.min(100, world.reputation + 8);
      summary = '终极店面「传奇沸鼎城（¥528 · 8配置位）」解锁！店铺登顶 Lv.5（编制12人）并获「港湾御膳排场」卡！';
      break;
    case 'tech_dish_kingcrab':
      addDish('king_crab');
      world.reputation = Math.min(100, world.reputation + 5);
      summary = '镇店王者「深海帝王蟹腿」菜品卡解锁！已纳入冷链卡库（首批 +18 份）。';
      break;
    case 'tech_hw_tables12': {
      unlockTablesTo(world, 12);
      const diff = Math.max(0, 32 - world.dishwareMax);
      world.dishwareMax = Math.max(world.dishwareMax, 32);
      world.cleanDishes += diff;
      world.buffetCapacityBonus += 3;
      summary = '全厅 12 张满编雅座与 32 套顶级冷链消毒库全部竣工！';
      break;
    }
    default: {
      if (node.kind === 'ZONE' && node.targetId) {
        addZone(node.targetId as GameWorld['unlockedZones'][number]);
        summary = `扩建分区「${getBuffetZoneDef(node.targetId as GameWorld['unlockedZones'][number]).name}」竣工！`;
      }
      break;
    }
  }

  rebuildActiveBuffetSlots(world);
  return summary;
}

export function getUnlockedTechCount(world: GameWorld): number {
  return world.unlockedTechNodeIds.length;
}

export function getTotalTechCount(): number {
  return TECH_TREE_NODES.length;
}

export function getRegimeSummaryCounts() {
  return {
    regimes: DINING_REGIMES.length,
    opsCards: OPS_POLICY_CARDS.length,
    synergies: HIDDEN_SYNERGIES.length,
  };
}

// ==========================================
// 3. PLAYABLE WALKABLE 7-ROOM BACKSTAGE ENGINE
// ==========================================

export function enterBackstageScene(world: GameWorld, targetRoom?: FacilitySceneId) {
  world.activeScene = 'BACKSTAGE';
  world.player.taskQueue = [];
  if (targetRoom) {
    const rect = getBackstageRoomRect(targetRoom);
    const isTop = rect.y < BACKSTAGE_CORRIDOR.y;
    world.backstagePlayer = {
      x: rect.doorX,
      y: isTop ? rect.y + rect.h - 36 : rect.y + 42,
      targetX: null,
      targetY: null,
      walkCycle: 0,
      facing: isTop ? -1 : 1,
      pendingInteractScene: null,
      pendingInteractType: null,
    };
  } else {
    world.backstagePlayer = {
      x: 108,
      y: BACKSTAGE_CORRIDOR.centerY,
      targetX: null,
      targetY: null,
      walkCycle: 0,
      facing: 1,
      pendingInteractScene: null,
      pendingInteractType: null,
    };
  }
  sound.playTabSwitch();
}

export function exitBackstageToDiningHall(world: GameWorld, archwayX?: number) {
  world.activeScene = 'DINING_HALL';
  world.backstagePlayer.targetX = null;
  world.backstagePlayer.targetY = null;
  world.backstagePlayer.pendingInteractScene = null;
  world.backstagePlayer.pendingInteractType = null;
  world.backstagePlayer.pendingFrontHallTarget = null;
  if (typeof archwayX === 'number') {
    world.player.x = archwayX;
    world.player.y = 14;
    world.player.taskQueue = [];
  }
  sound.playTabSwitch();
}

export function getBackstagePlayerRoom(world: GameWorld): FacilitySceneId | null {
  const { x, y } = world.backstagePlayer;
  for (const r of BACKSTAGE_ROOMS) {
    if (x >= r.x + 4 && x <= r.x + r.w - 4 && y >= r.y + 4 && y <= r.y + r.h - 4) {
      return r.id;
    }
  }
  // Treat the 3 south archway passages (y in 612..662) as extensions of their connected bottom room
  if (y > 610) {
    for (const arch of FRONT_BACK_ARCHWAYS) {
      if (Math.abs(x - arch.x) <= arch.halfWidth + 14) {
        return arch.roomId;
      }
    }
  }
  return null;
}

function isWalkableBackstagePoint(x: number, y: number): boolean {
  // 1. Central corridor
  if (
    x >= BACKSTAGE_CORRIDOR.x + 12 &&
    x <= BACKSTAGE_CORRIDOR.x + BACKSTAGE_CORRIDOR.w - 12 &&
    y >= BACKSTAGE_CORRIDOR.y + 12 &&
    y <= BACKSTAGE_CORRIDOR.y + BACKSTAGE_CORRIDOR.h - 12
  ) {
    return true;
  }

  // 2. Inside any of the 7 rooms or their corridor doorway passages
  for (const r of BACKSTAGE_ROOMS) {
    const insideRoom =
      x >= r.x + 16 && x <= r.x + r.w - 16 && y >= r.y + 24 && y <= r.y + r.h - 10;
    if (insideRoom) return true;

    // Doorway bridge connecting room and corridor
    const isTop = r.y < BACKSTAGE_CORRIDOR.y;
    const inDoorX = Math.abs(x - r.doorX) <= 28;
    const inDoorY = isTop
      ? y >= r.y + r.h - 24 && y <= BACKSTAGE_CORRIDOR.y + 22
      : y >= BACKSTAGE_CORRIDOR.y + BACKSTAGE_CORRIDOR.h - 22 && y <= r.y + 34;
    if (inDoorX && inDoorY) return true;
  }

  // 3. South Archway Passages leading straight into Front Hall (y = 596..656)
  for (const arch of FRONT_BACK_ARCHWAYS) {
    if (Math.abs(x - arch.x) <= arch.halfWidth + 4 && y >= 596 && y <= 656) {
      return true;
    }
  }

  return false;
}

export function moveBackstagePlayerByKeys(
  world: GameWorld,
  dx: number,
  dy: number,
  dt: number
) {
  if (dx === 0 && dy === 0) return;
  const bp = world.backstagePlayer;
  bp.targetX = null;
  bp.targetY = null;
  bp.pendingInteractScene = null;
  bp.pendingInteractType = null;
  bp.pendingFrontHallTarget = null;

  const len = Math.hypot(dx, dy);
  const speed = 250;
  const stepX = (dx / len) * speed * dt;
  const stepY = (dy / len) * speed * dt;

  const nx = bp.x + stepX;
  const ny = bp.y + stepY;

  if (isWalkableBackstagePoint(nx, ny)) {
    bp.x = nx;
    bp.y = ny;
  } else if (isWalkableBackstagePoint(nx, bp.y)) {
    bp.x = nx;
  } else if (isWalkableBackstagePoint(bp.x, ny)) {
    bp.y = ny;
  } else if (dy > 0 && bp.y >= 588) {
    // Gentle isometric funnel toward nearest south archway when pressing South
    const arch = findNearestFrontBackArchway(bp.x);
    if (Math.abs(bp.x - arch.x) <= 56) {
      const pull = Math.sign(arch.x - bp.x) * Math.min(Math.abs(arch.x - bp.x), speed * dt * 0.85);
      if (isWalkableBackstagePoint(bp.x + pull, bp.y)) {
        bp.x += pull;
      }
    }
  }

  if (dx !== 0) bp.facing = dx > 0 ? 1 : -1;
  bp.walkCycle += dt * 11;

  // Walking straight SOUTH through any of the 3 connecting archways seamlessly steps into Front Hall!
  if (bp.y >= 644 && dy > 0) {
    const arch = findNearestFrontBackArchway(bp.x);
    if (Math.abs(bp.x - arch.x) <= arch.halfWidth + 12) {
      const exitX = Math.max(arch.x - 16, Math.min(arch.x + 16, bp.x));
      world.activeScene = 'DINING_HALL';
      world.player.x = exitX;
      world.player.y = 14;
      world.player.taskQueue = [];
      world.player.activeTaskLabel = '手动巡场中 · 按空格交互';
      return;
    }
  }

  // Walking straight into the left Exit Door also returns to Dining Hall
  if (
    bp.x <= BACKSTAGE_EXIT_DOOR.x + 12 &&
    Math.abs(bp.y - BACKSTAGE_EXIT_DOOR.y) <= 24 &&
    dx < 0
  ) {
    exitBackstageToDiningHall(world);
  }
}

export function walkBackstagePlayerToFrontHall(
  world: GameWorld,
  frontX: number,
  frontY: number
) {
  const bp = world.backstagePlayer;
  const arch = findNearestFrontBackArchway((bp.x + frontX) * 0.5);
  bp.targetX = arch.x;
  bp.targetY = 646;
  bp.pendingInteractScene = arch.roomId;
  bp.pendingInteractType = 'EXIT';
  bp.pendingFrontHallTarget = { x: frontX, y: frontY };
  sound.playClick();
}

export function handleBackstageCanvasClick(world: GameWorld, x: number, y: number) {
  const bp = world.backstagePlayer;
  bp.pendingFrontHallTarget = null;

  // 1. Clicked Exit Door -> walk to exit & return to Dining Hall
  if (
    Math.abs(x - BACKSTAGE_EXIT_DOOR.x) <= 32 &&
    Math.abs(y - BACKSTAGE_EXIT_DOOR.y) <= 40
  ) {
    bp.targetX = BACKSTAGE_EXIT_DOOR.x + 10;
    bp.targetY = BACKSTAGE_EXIT_DOOR.y;
    bp.pendingInteractScene = null;
    bp.pendingInteractType = 'EXIT';
    sound.playClick();
    return;
  }

  // 1B. Clicked directly on one of the 3 South Connecting Archways -> walk out into Front Hall
  if (y >= 612 && y <= 666) {
    const arch = findNearestFrontBackArchway(x);
    if (Math.abs(x - arch.x) <= arch.halfWidth + 24) {
      walkBackstagePlayerToFrontHall(world, arch.x, 128);
      return;
    }
  }

  // 2. Clicked inside any of the 7 rooms
  for (const r of BACKSTAGE_ROOMS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      const clampedX = Math.max(r.x + 22, Math.min(r.x + r.w - 22, x));
      const clampedY = Math.max(r.y + 38, Math.min(r.y + r.h - 18, y));
      bp.targetX = clampedX;
      bp.targetY = clampedY;
      bp.pendingInteractScene = r.id;

      // Did player click directly on the Special Staff NPC in that room?
      if (r.sideStoryStaffId && Math.hypot(x - r.npcX, y - r.npcY) <= 32) {
        bp.targetX = Math.max(r.x + 24, r.npcX - 24);
        bp.targetY = r.npcY + 12;
        bp.pendingInteractType = 'NPC';
      } else {
        bp.pendingInteractType = null;
      }
      sound.playClick();
      return;
    }
  }

  // 3. Clicked corridor (with generous vertical margin around partition walls)
  if (
    x >= BACKSTAGE_CORRIDOR.x - 10 &&
    x <= BACKSTAGE_CORRIDOR.x + BACKSTAGE_CORRIDOR.w + 10 &&
    y >= BACKSTAGE_CORRIDOR.y - 12 &&
    y <= BACKSTAGE_CORRIDOR.y + BACKSTAGE_CORRIDOR.h + 12
  ) {
    bp.targetX = Math.max(
      BACKSTAGE_CORRIDOR.x + 18,
      Math.min(BACKSTAGE_CORRIDOR.x + BACKSTAGE_CORRIDOR.w - 18, x)
    );
    bp.targetY = BACKSTAGE_CORRIDOR.centerY;
    bp.pendingInteractScene = null;
    bp.pendingInteractType = null;
    sound.playClick();
    return;
  }

  // 4. Fallback: clicked thin border/wall gap inside backstage -> walk to nearest room interior
  let nearestRoom = BACKSTAGE_ROOMS[0];
  let bestDist = Infinity;
  for (const r of BACKSTAGE_ROOMS) {
    const cx = r.x + r.w * 0.5;
    const cy = r.y + r.h * 0.5;
    const d = Math.hypot(x - cx, y - cy);
    if (d < bestDist) {
      bestDist = d;
      nearestRoom = r;
    }
  }
  bp.targetX = Math.max(nearestRoom.x + 22, Math.min(nearestRoom.x + nearestRoom.w - 22, x));
  bp.targetY = Math.max(nearestRoom.y + 38, Math.min(nearestRoom.y + nearestRoom.h - 18, y));
  bp.pendingInteractScene = nearestRoom.id;
  bp.pendingInteractType = null;
  sound.playClick();
}

export function tickBackstagePlayer(
  world: GameWorld,
  dt: number
): { x: number; y: number } | null {
  const bp = world.backstagePlayer;
  if (bp.targetX === null || bp.targetY === null) return null;

  const curRoomId = getBackstagePlayerRoom(world);
  let targetRoomId: FacilitySceneId | null = null;
  for (const r of BACKSTAGE_ROOMS) {
    if (
      bp.targetX >= r.x &&
      bp.targetX <= r.x + r.w &&
      bp.targetY >= r.y &&
      bp.targetY <= r.y + r.h
    ) {
      targetRoomId = r.id;
      break;
    }
  }
  if (!targetRoomId && bp.targetY > 610) {
    const arch = findNearestFrontBackArchway(bp.targetX);
    targetRoomId = arch.roomId;
  }

  // Doorway-aware steering: exit current room via its door -> corridor -> enter target room via its door
  let steerX = bp.targetX;
  let steerY = bp.targetY;

  if (curRoomId && curRoomId !== targetRoomId) {
    const curRoom = getBackstageRoomRect(curRoomId);
    if (Math.abs(bp.x - curRoom.doorX) > 10) {
      steerX = curRoom.doorX;
      steerY = curRoom.y < BACKSTAGE_CORRIDOR.y ? curRoom.y + curRoom.h - 24 : curRoom.y + 34;
    } else {
      steerX = curRoom.doorX;
      steerY = BACKSTAGE_CORRIDOR.centerY;
    }
  } else if (!curRoomId && targetRoomId) {
    const destRoom = getBackstageRoomRect(targetRoomId);
    if (Math.abs(bp.x - destRoom.doorX) > 12) {
      steerX = destRoom.doorX;
      steerY = BACKSTAGE_CORRIDOR.centerY;
    } else {
      steerX = destRoom.doorX;
      steerY = Math.min(bp.targetY, destRoom.y + destRoom.h - 18);
    }
  } else if (curRoomId && curRoomId === targetRoomId && bp.targetY > 610 && bp.y < 606) {
    // Inside the bottom room heading out the south archway: align to archway X cleanly before exiting
    const arch = findNearestFrontBackArchway(bp.targetX);
    if (Math.abs(bp.x - arch.x) > 10) {
      steerX = arch.x;
      steerY = 598;
    }
  }

  const dx = steerX - bp.x;
  const dy = steerY - bp.y;
  const dist = Math.hypot(dx, dy);
  const speed = 265;

  if (dist > 6) {
    const step = Math.min(dist, speed * dt);
    bp.x += (dx / dist) * step;
    bp.y += (dy / dist) * step;
    if (Math.abs(dx) > 1) bp.facing = dx > 0 ? 1 : -1;
    bp.walkCycle += dt * 11;
    return null;
  }

  // Reached final click destination?
  if (Math.hypot(bp.targetX - bp.x, bp.targetY - bp.y) <= 10) {
    const interactType = bp.pendingInteractType;
    const interactScene = bp.pendingInteractScene;
    const frontTarget = bp.pendingFrontHallTarget ?? null;
    const arrivedX = bp.targetX;
    bp.x = bp.targetX;
    bp.y = bp.targetY;
    bp.targetX = null;
    bp.targetY = null;
    bp.pendingInteractType = null;
    bp.pendingInteractScene = null;
    bp.pendingFrontHallTarget = null;

    if (interactType === 'EXIT') {
      if (frontTarget) {
        world.activeScene = 'DINING_HALL';
        world.player.x = arrivedX;
        world.player.y = 14;
        world.player.taskQueue = [];
        return frontTarget;
      }
      exitBackstageToDiningHall(world, arrivedX > 120 ? arrivedX : undefined);
    } else if (interactType === 'NPC' && interactScene) {
      const roomRect = getBackstageRoomRect(interactScene);
      if (roomRect.sideStoryStaffId) {
        const bond = world.specialStaffBonds[roomRect.sideStoryStaffId];
        if (!bond.recruited) {
          triggerSpecialStaffRecruitmentSideStory(world, roomRect.sideStoryStaffId);
        }
      }
    }
  }
  return null;
}

// ==========================================
// 4. SPECIAL STAFF RECRUITMENT VIA BACKSTAGE SIDE-STORIES ONLY
// ==========================================

export function enlistSpecialStaff(world: GameWorld, staffId: SpecialStaffId): boolean {
  const bond = world.specialStaffBonds[staffId];
  if (bond.recruited) return false;

  const def = getSpecialStaffDef(staffId);
  bond.recruitmentStage = 2;
  bond.recruited = true;
  bond.affection = Math.max(bond.affection, 22);

  const tpl = createSpecialStaffCandidate(staffId);
  const meta = STAFF_ROLE_META[tpl.role];
  const sameRoleCount = world.staff.filter((s) => s.role === tpl.role).length;
  const offset = sameRoleCount * 22;

  const hired: HiredStaff = {
    ...tpl,
    id: nextPolicyUid('spec_partner'),
    x: meta.homeX + offset,
    y: meta.homeY,
    homeX: meta.homeX + offset,
    homeY: meta.homeY,
    carrying: 'NONE',
    carryAmount: 0,
    carryBrothId: null,
    taskQueue: [],
    activeTaskLabel: '支线结缘入队',
    idleTimer: 0,
    walkCycle: 0,
    tasksCompleted: 0,
    fatigue: 0,
    morale: 98,
  };
  world.staff.push(hired);
  sound.playStoryFanfare();
  pushPolicyAlert(
    world,
    `【支线招募成功】特聘伙伴「${def.name}（${def.title}）」因你之诚意正式入队（不占常规编制）！后续可在开店前/闭店后继续推进其 5 幕人物剧情与感情线！`,
    'success'
  );
  return true;
}

export function canTriggerRecruitmentSideStory(
  world: GameWorld,
  staffId: SpecialStaffId
): { canTrigger: boolean; stage: 0 | 1 | 2; hint: string } {
  const bond = world.specialStaffBonds[staffId];
  if (bond.recruited || bond.recruitmentStage >= 2) {
    return { canTrigger: false, stage: 2, hint: '已入队' };
  }
  if (world.phase !== 'PREP' && world.phase !== 'CLOSING') {
    return {
      canTrigger: false,
      stage: bond.recruitmentStage,
      hint: '请在开店前或闭店后与访客深谈',
    };
  }
  if (bond.lastQuestDay >= world.day && bond.recruitmentStage === 1) {
    return {
      canTrigger: false,
      stage: 1,
      hint: '明日再访此房间可推进最终入队支线',
    };
  }
  return {
    canTrigger: true,
    stage: bond.recruitmentStage,
    hint: bond.recruitmentStage === 0 ? '上前搭话 · 触发隐藏支线' : '推进招募支线 (2/2)',
  };
}

export function triggerSpecialStaffRecruitmentSideStory(
  world: GameWorld,
  staffId: SpecialStaffId
): boolean {
  const check = canTriggerRecruitmentSideStory(world, staffId);
  if (!check.canTrigger) {
    pushPolicyAlert(world, check.hint, 'info');
    return false;
  }

  const bond = world.specialStaffBonds[staffId];
  const def = getSpecialStaffDef(staffId);
  let modal: StoryModalEvent | null = null;

  if (staffId === 'lin_xi') {
    if (bond.recruitmentStage === 0) {
      modal = {
        id: nextPolicyUid('recruit_lin_1'),
        category: 'SPECIAL_STAFF',
        badge: '后场支线邂逅 · 冷链活鲜库 (1/2)',
        speakerName: '林汐',
        speakerTitle: '神秘渔港海产少女',
        accentColor: def.color,
        headline: '冷链暂养池边的意外来客',
        body: '你推开冷链库房的厚重保温门，看见一位身披深蓝防水围裙的少女正蹲在活鲜暂养池边，指尖轻点水面测试盐度与溶氧。',
        lines: [
          {
            speaker: '林汐',
            title: '渔港验货行家',
            text: '“喂，店长！你这池子的增氧管偏了两寸，龙虾和活鲍靠在角落会缺氧发蔫的……顺手帮你调好了，别谢我。”',
            accentColor: def.color,
          },
          {
            speaker: '林汐',
            title: '渔港验货行家',
            text: '“我在老码头帮渔船挑货三年，看得出你这家店不拿次品糊弄人。要是你真在乎鲜度，明天我带一箱刚上岸的直采样品给你掌掌眼？”',
            accentColor: def.color,
          },
        ],
        choices: [
          {
            id: 'recruit_lin_1a',
            label: '虚心请教并约定明日验货（好感+10 · 原料+10）',
            hint: '开启林汐招募支线（1/2）',
            philosophyDelta: { CRAFT: 1 },
            affectionDelta: { staffId: 'lin_xi', amount: 10 },
            outcomeText: '与「林汐」结识！她答应明日再来冷链库房考察你的诚意（支线 1/2 已记录）。',
          },
          {
            id: 'recruit_lin_1b',
            label: '盛情留她喝碗热汤再谈合作（好感+12）',
            hint: '开启林汐招募支线（1/2）',
            philosophyDelta: { WARMTH: 1 },
            affectionDelta: { staffId: 'lin_xi', amount: 12 },
            outcomeText: '林汐喝着热鱼汤眉眼弯弯，约好明日再在冷链库房见（支线 1/2 已记录）。',
          },
        ],
      };
    } else {
      modal = {
        id: nextPolicyUid('recruit_lin_2'),
        category: 'SPECIAL_STAFF',
        badge: '后场招募支线 · 尘埃落定 (2/2)',
        speakerName: '林汐',
        speakerTitle: '潮鲜活水千金 · 活鲜水产师',
        accentColor: def.color,
        headline: '码头直采之约 · 诚邀入伙',
        body: '次日一早，林汐果然提着满箱晶莹冰鲜的渔船直采样本出现在冷链库房，眼里闪着跃跃欲试的光。',
        lines: [
          {
            speaker: '林汐',
            title: '潮鲜活水千金',
            text: '“我查过你这几天的损耗账，确实是个懂鲜、惜货的实在人！家里水产行只讲走量，我想在真正尊重海味的火锅店里大干一场。”',
            accentColor: def.color,
          },
          {
            speaker: '林汐',
            title: '潮鲜活水千金',
            text: '“店长，这冷链库房与活鲜海鲜缸，以后交给我来镇守如何？我自带码头直采路子，绝不让你店里断一口鲜！”',
            accentColor: def.color,
          },
        ],
        choices: [
          {
            id: 'recruit_lin_2a',
            label: '郑重交付冷链库钥匙，欢迎入队！',
            hint: '林汐正式加入团队（不占常规编制）',
            philosophyDelta: { CRAFT: 1, WARMTH: 1 },
            affectionDelta: { staffId: 'lin_xi', amount: 12 },
            outcomeText: '林汐接过钥匙露出灿烂笑容，正式成为你的特聘活鲜水产师！',
          },
        ],
        rewardHighlight: '特聘伙伴「林汐」通过支线剧情正式入队 · 解锁后续 5 幕专属人物剧情与好感线！',
      };
    }
  } else if (staffId === 'shen_zhiwei') {
    if (bond.recruitmentStage === 0) {
      modal = {
        id: nextPolicyUid('recruit_shen_1'),
        category: 'SPECIAL_STAFF',
        badge: '后场支线邂逅 · 热厨出品间 (1/2)',
        speakerName: '沈知微',
        speakerTitle: '隐世名厨之后',
        accentColor: def.color,
        headline: '灶火三寸间的知音试菜',
        body: '热厨出品间里飘出一缕奇异的蒜蓉焦香。一位扎着利落马尾的年轻女厨正站在明档灶前，盯着火候沉思。',
        lines: [
          {
            speaker: '沈知微',
            title: '星级酒店前热厨主理',
            text: '“冒昧借了你这口铁板灶一用。现在的海鲜自助大多只顾堆生鲜，热菜区敷衍得像快餐……可我瞧见你专门留了现烹熟食档。”',
            accentColor: def.color,
          },
          {
            speaker: '沈知微',
            title: '星级酒店前热厨主理',
            text: '“我刚从五星级酒店辞职，正在找一间肯把『锅气』当回事的厨房。明日我再来试一道避风塘绝活，店长敢不敢品鉴？”',
            accentColor: def.color,
          },
        ],
        choices: [
          {
            id: 'recruit_shen_1a',
            label: '赞叹她的火候功底，约定明日品鉴（好感+10 · 熟食补满）',
            hint: '开启沈知微招募支线（1/2）',
            philosophyDelta: { CRAFT: 1 },
            affectionDelta: { staffId: 'shen_zhiwei', amount: 10 },
            outcomeText: '与「沈知微」结识！她顺手烹满一盘蒜蓉扇贝，约好明日热厨再会（支线 1/2 已记录）。',
          },
          {
            id: 'recruit_shen_1b',
            label: '承诺给她独立研发热菜的绝对权限（好感+12）',
            hint: '开启沈知微招募支线（1/2）',
            philosophyDelta: { EMPIRE: 1 },
            affectionDelta: { staffId: 'shen_zhiwei', amount: 12 },
            outcomeText: '沈知微眼中亮起锋芒，与你定下明日热厨出品间之约（支线 1/2 已记录）。',
          },
        ],
      };
    } else {
      modal = {
        id: nextPolicyUid('recruit_shen_2'),
        category: 'SPECIAL_STAFF',
        badge: '后场招募支线 · 尘埃落定 (2/2)',
        speakerName: '沈知微',
        speakerTitle: '烈焰明档女王 · 热厨主厨',
        accentColor: def.color,
        headline: '一勺定乾坤 · 热厨主厨归位',
        body: '烈火升腾，铁锅翻飞。沈知微将一道金黄酥香的铁板炒蟹端到你面前，神情认真而骄傲。',
        lines: [
          {
            speaker: '沈知微',
            title: '烈焰明档女王',
            text: '“我尝过你的招牌锅底，也看过你待员工的诚意。在这里做菜，不用讨好资本，只要讨好食客的胃。”',
            accentColor: def.color,
          },
          {
            speaker: '沈知微',
            title: '烈焰明档女王',
            text: '“热厨与熟食明档，以后归我管了。店长，准备好让全城的食客闻香排队了吗？”',
            accentColor: def.color,
          },
        ],
        choices: [
          {
            id: 'recruit_shen_2a',
            label: '递上主厨围裙，共燃沸鼎明档！',
            hint: '沈知微正式加入团队（不占常规编制）',
            philosophyDelta: { CRAFT: 2 },
            affectionDelta: { staffId: 'shen_zhiwei', amount: 12 },
            outcomeText: '沈知微系上围裙执勺一笑，正式成为你的特聘热厨主厨！',
          },
        ],
        rewardHighlight: '特聘伙伴「沈知微」通过支线剧情正式入队 · 解锁后续 5 幕专属人物剧情与好感线！',
      };
    }
  } else if (staffId === 'su_xingyao') {
    if (bond.recruitmentStage === 0) {
      modal = {
        id: nextPolicyUid('recruit_su_1'),
        category: 'SPECIAL_STAFF',
        badge: '后场支线邂逅 · 店长办公室 (1/2)',
        speakerName: '苏星遥',
        speakerTitle: '海归餐饮策划顾问',
        accentColor: def.color,
        headline: '账本与灯火下的不速之客',
        body: '推开店长办公室的门，一位气质温雅的女子正拿着一杯清茶，饶有兴致地端详墙上的四季菜单与餐位挡位规划图。',
        lines: [
          {
            speaker: '苏星遥',
            title: '高端会所前首席礼宾',
            text: '“抱歉打扰了，我是来帮朋友谈团建预订的，却被你墙上这套『四季食材+分档客群』的经营笔记吸引了目光。”',
            accentColor: def.color,
          },
          {
            speaker: '苏星遥',
            title: '高端会所前首席礼宾',
            text: '“我有多年豪华邮轮与高端餐饮礼宾经验，正琢磨着找一家有灵魂的本土品牌扎根。明天我把整理好的贵宾动线方案带来，聊聊？”',
            accentColor: def.color,
          },
        ],
        choices: [
          {
            id: 'recruit_su_1a',
            label: '泡上好茶相邀明日细谈品牌蓝图（好感+10 · 口碑+3）',
            hint: '开启苏星遥招募支线（1/2）',
            philosophyDelta: { EMPIRE: 1 },
            reputationDelta: 3,
            affectionDelta: { staffId: 'su_xingyao', amount: 10 },
            outcomeText: '与「苏星遥」结识！她留下名片，约定明日再到店长办公室共议前程（支线 1/2 已记录）。',
          },
          {
            id: 'recruit_su_1b',
            label: '坦诚相告开店初心与烟火愿景（好感+12）',
            hint: '开启苏星遥招募支线（1/2）',
            philosophyDelta: { WARMTH: 1 },
            affectionDelta: { staffId: 'su_xingyao', amount: 12 },
            outcomeText: '苏星遥轻笑颔首，约好明日在办公室给你一个惊喜答复（支线 1/2 已记录）。',
          },
        ],
      };
    } else {
      modal = {
        id: nextPolicyUid('recruit_su_2'),
        category: 'SPECIAL_STAFF',
        badge: '后场招募支线 · 尘埃落定 (2/2)',
        speakerName: '苏星遥',
        speakerTitle: '锦绣礼宾总管 · 首席迎宾',
        accentColor: def.color,
        headline: '共绘潮鲜盛景 · 锦绣总管入驻',
        body: '次日，苏星遥带着装订精美的《潮鲜沸鼎礼宾与会员章程》如约来到店长办公室。',
        lines: [
          {
            speaker: '苏星遥',
            title: '锦绣礼宾总管',
            text: '“昨夜我想通了——与其在冰冷的连锁集团当螺丝钉，不如亲手陪你把『潮鲜沸鼎』打造成整座海港城最耀眼的传奇。”',
            accentColor: def.color,
          },
          {
            speaker: '苏星遥',
            title: '锦绣礼宾总管',
            text: '“门面迎宾、贵客礼仪、品牌格调交给我。店长，愿不愿意聘我做你的首席大总管？”',
            accentColor: def.color,
          },
        ],
        choices: [
          {
            id: 'recruit_su_2a',
            label: '握手签约，共启潮鲜盛世！',
            hint: '苏星遥正式加入团队（不占常规编制）',
            philosophyDelta: { EMPIRE: 1, WARMTH: 1 },
            affectionDelta: { staffId: 'su_xingyao', amount: 12 },
            outcomeText: '苏星遥优雅欠身，正式入驻潮鲜沸鼎担任首席迎宾大总管！',
          },
        ],
        rewardHighlight: '特聘伙伴「苏星遥」通过支线剧情正式入队 · 解锁后续 5 幕专属人物剧情与好感线！',
      };
    }
  }

  if (!modal) return false;
  bond.lastQuestDay = world.day;
  world.pendingStoryModal = modal;
  sound.playStoryFanfare();
  return true;
}
