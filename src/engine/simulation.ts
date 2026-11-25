import {
  BROTH_CATALOG,
  BUFFET_CAPACITY_TIERS,
  BUFFET_ZONES_CONFIG,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  createDefaultZonePadAssignments,
  createStaffCandidate,
  DAY_DURATION_SECONDS,
  DAYS_PER_SEASON,
  DISHWARE_UPGRADE_TIERS,
  generateCandidatePool,
  getBuffetZoneDef,
  getFrontHallBounds,
  getPadStandPoint,
  getSeasonDef,
  getShopConfig,
  isAvailableInSeason,
  SEAFOOD_CATALOG,
  SEASON_ORDER,
  SHOP_LEVEL_CONFIG,
  STAFF_ROLE_META,
  STATIONS,
  TABLE_EXPANSION_TIERS,
  TABLE_POSITIONS,
  TABLE_UNLOCK_ORDER,
} from '../data/gameConfig';
import {
  createSpecialStaffTemplate,
  evaluateChapterObjectives,
  getCharacterDef,
  getSpecialStaffDef,
  getSpecialStoryDef,
  MAIN_CHAPTER_SCRIPTS,
  MAIN_CHAPTERS,
  SPECIAL_STORIES,
} from '../data/storyConfig';
import {
  AlertLogEntry,
  BuffetSlot,
  BuffetZoneId,
  CharacterId,
  CustomerParty,
  DailyStats,
  DiningTable,
  GameWorld,
  HiredStaff,
  PendingOrder,
  SpecialCustomerId,
  StaffCandidate,
  StaffRole,
  StaffTier,
  TaskStep,
} from '../types/game';
import { sound } from '../utils/sound';
import {
  DINING_HALL_BACKSTAGE_DOOR,
  findNearestFrontBackArchway,
  FRONT_BACK_ARCHWAYS,
  TECH_TREE_NODES,
} from '../data/policyAndTechConfig';
import {
  applyCompletedTechNode,
  createInitialPolicySlots,
  enterBackstageScene,
  evaluatePolicyBonuses,
  handleBackstageCanvasClick,
  syncActiveMenuFromPolicySlots,
} from './policyAndTech';
import {
  deliverArrivedWarehouseOrders,
  getEffectiveTicketPrice,
  getPadForBuffetZone,
  getTicketFilterPreview,
  getUnlockedZonePads,
  isBuffetZoneUnlocked,
  rebuildActiveBuffetSlots,
  runInventoryClerkAutoOrders,
  talkToStaffMember,
} from './storyAndFacilities';
import {
  INSPECTION_INTERVAL_DAYS,
  pickCustomerSpeech,
  runHalfMonthInspection,
} from '../data/staffDialogueConfig';
import {
  advanceDailyTycoonEvents,
  evaluateTycoonModifiers,
  saveGameToSlot,
  syncWorldToEncyclopedia,
} from './tycoonSystems';
import { pickServiceIncident } from '../data/serviceIncidentsConfig';

let uidCounter = 1;
function nextUid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${uidCounter}`;
}

export function isActivePlayPhase(phase: GameWorld['phase']): boolean {
  return phase === 'PREP' || phase === 'PLAYING' || phase === 'CLOSING';
}

export function getClosingProgress(world: GameWorld) {
  const seatedGuests = world.tables.filter(
    (t) => t.status === 'WAITING_BROTH' || t.status === 'DINING'
  ).length;
  const dirtyTables = world.tables.filter((t) => t.status === 'DIRTY').length;
  const dirtyDishes =
    world.dirtyDishes +
    (world.player.carrying === 'DIRTY_DISHES' ? world.player.carryAmount : 0) +
    world.staff.reduce(
      (sum, s) => sum + (s.carrying === 'DIRTY_DISHES' ? s.carryAmount : 0),
      0
    );
  return {
    seatedGuests,
    dirtyTables,
    dirtyDishes,
    canFinishEarly: seatedGuests === 0,
    allClean: seatedGuests === 0 && dirtyTables === 0 && dirtyDishes === 0,
  };
}

export function formatClock(dayTime: number, dayDuration: number, phase?: GameWorld['phase']): string {
  if (phase === 'PREP') return '10:00';
  if (phase === 'CLOSING') return '22:00';
  const ratio = Math.min(1, Math.max(0, dayTime / dayDuration));
  const totalMinutes = Math.floor(11 * 60 + ratio * 11 * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function calculateTicketPrice(world: GameWorld): number {
  const mods = evaluateTycoonModifiers(world);
  return Math.max(68, getEffectiveTicketPrice(world) + mods.ticketDelta);
}

export function buildBuffetSlots(
  unlockedSeafoodIds: string[],
  capacityBonus: number,
  existingSlots?: BuffetSlot[]
): BuffetSlot[] {
  const count = unlockedSeafoodIds.length;
  const barLeft = STATIONS.BUFFET_BAR.x - STATIONS.BUFFET_BAR.w / 2 + 18;
  const barUsableWidth = STATIONS.BUFFET_BAR.w - 36;
  const slotStep = barUsableWidth / Math.max(count, 1);

  return unlockedSeafoodIds.map((itemId, idx) => {
    const def = SEAFOOD_CATALOG.find((s) => s.id === itemId)!;
    const prev = existingSlots?.find((s) => s.itemId === itemId);
    const maxStock = def.maxStock + capacityBonus;
    return {
      slotIndex: idx,
      itemId,
      stock: prev ? Math.min(maxStock, prev.stock) : Math.max(3, Math.floor(maxStock * 0.85)),
      maxStock,
      x: barLeft + slotStep * (idx + 0.5),
      y: STATIONS.BUFFET_BAR.y,
      lastGrabFlash: prev ? prev.lastGrabFlash : 0,
    };
  });
}

function createEmptyDailyStats(day: number, shopLevel: number): DailyStats {
  return {
    day,
    guestsServed: 0,
    vipServed: 0,
    walkouts: 0,
    ticketRevenue: 0,
    tipRevenue: 0,
    ingredientCost: 0,
    staffWages: 0,
    rentCost: getShopConfig(shopLevel).baseRent,
    penaltyFines: 0,
    healthInspectionsFailed: 0,
    reputationChange: 0,
    cookedDishesServed: 0,
  };
}

function addSpecialStaffToWorld(world: GameWorld, tpl: StaffCandidate) {
  const meta = STAFF_ROLE_META[tpl.role];
  const sameRoleCount = world.staff.filter((s) => s.role === tpl.role).length;
  const offset = sameRoleCount * 22;

  const hired: HiredStaff = {
    ...tpl,
    id: nextUid('special_staff'),
    x: meta.homeX + offset,
    y: meta.homeY,
    homeX: meta.homeX + offset,
    homeY: meta.homeY,
    carrying: 'NONE',
    carryAmount: 0,
    carryBrothId: null,
    taskQueue: [],
    activeTaskLabel: '特聘宗师就位',
    idleTimer: 0,
    walkCycle: 0,
    tasksCompleted: 0,
    fatigue: 0,
    morale: 95,
  };
  world.staff.push(hired);
  spawnParticles(world, hired.x, hired.y, 'SPARKLE', 14);
  addFloatingText(world, hired.x, hired.y - 28, `特聘名匠 ${hired.name} 入队！`, '#F7D060', 15);
}

export function createInitialWorld(
  phase: GameWorld['phase'] = 'MAIN_MENU',
  characterId: CharacterId = 'harbor_heir'
): GameWorld {
  const charDef = getCharacterDef(characterId);
  const unlockedZones: BuffetZoneId[] = ['ice_seafood', 'cooked_hot', 'hotpot_sides'];
  const unlockedSeafoodIds = ['prawns', 'beef_rolls', 'veggies_balls', 'garlic_scallops'];
  if (charDef.bonuses.freeSeafoodId && !unlockedSeafoodIds.includes(charDef.bonuses.freeSeafoodId)) {
    unlockedSeafoodIds.push(charDef.bonuses.freeSeafoodId);
  }

  const unlockedBrothIds = ['spicy_tallow', 'seafood_clear'];
  if (charDef.bonuses.freeBrothId && !unlockedBrothIds.includes(charDef.bonuses.freeBrothId)) {
    unlockedBrothIds.push(charDef.bonuses.freeBrothId);
  }

  const tableLimit = 4;
  const unlockedIndices = new Set(TABLE_UNLOCK_ORDER.slice(0, tableLimit));

  const tables: DiningTable[] = TABLE_POSITIONS.map((pos, idx) => {
    const isUnlocked = unlockedIndices.has(idx);
    const initialReady = idx === 0 || idx === 1;
    return {
      id: idx,
      x: pos.x,
      y: pos.y,
      status: !isUnlocked ? 'LOCKED' : initialReady ? 'READY' : 'NEEDS_TABLEWARE',
      customer: null,
      dirtyTime: 0,
      reservedByStaffId: null,
      setterBonus: 0,
      brothBonus: 0,
      boilPhase: Math.random() * Math.PI * 2,
    };
  });

  const initialBuffetBonus = charDef.bonuses.buffetCapacityExtra;
  const initialStaff: HiredStaff[] = [];

  if (charDef.bonuses.freeStarterHost) {
    const starterHost = createStaffCandidate('HOST', 1, 0);
    const meta = STAFF_ROLE_META.HOST;
    initialStaff.push({
      ...starterHost,
      id: nextUid('staff'),
      name: '林安(随行礼宾)',
      dailyWage: 25,
      x: meta.homeX,
      y: meta.homeY,
      homeX: meta.homeX,
      homeY: meta.homeY,
      carrying: 'NONE',
      carryAmount: 0,
      carryBrothId: null,
      taskQueue: [],
      activeTaskLabel: '随行迎宾待命',
      idleTimer: 0,
      walkCycle: 0,
      tasksCompleted: 0,
      fatigue: 0,
      morale: 95,
    });
  }

  const world: GameWorld = {
    phase,
    pausedFromPhase: phase === 'PLAYING' || phase === 'CLOSING' ? phase : 'PREP',
    day: 1,
    year: 1,
    season: 'SPRING',
    dayInSeason: 1,
    dayTime: 0,
    dayDuration: DAY_DURATION_SECONDS,
    speedMultiplier: 1,
    pendingOrders: [],
    morningReport: [],
    closingCleanBonusAwarded: false,

    characterId,
    mainChapter: 1,
    mainStoryCompleted: false,
    storyPhilosophy: { CRAFT: 0, EMPIRE: 0, WARMTH: 0 },
    storyFlags: {},
    endingReport: null,
    showEndingModal: false,

    specialStories: {
      critic_shen: { id: 'critic_shen', discovered: false, stage: 0, completed: false },
      master_zhou: { id: 'master_zhou', discovered: false, stage: 0, completed: false },
      heiress_gu: { id: 'heiress_gu', discovered: false, stage: 0, completed: false },
      inspector_cheng: { id: 'inspector_cheng', discovered: false, stage: 0, completed: false },
    },
    specialStaffBonds: {
      lin_xi: {
        id: 'lin_xi',
        recruitmentStage: 0,
        recruited: false,
        storyStage: 0,
        affection: 0,
        relationship: 'COLLEAGUE',
        partnerBond: 80,
        daysSinceDate: 0,
        currentWish: null,
        wishFulfilledToday: false,
        lastQuestDay: 0,
        storyPathChoice: 'DEVOTION',
      },
      shen_zhiwei: {
        id: 'shen_zhiwei',
        recruitmentStage: 0,
        recruited: false,
        storyStage: 0,
        affection: 0,
        relationship: 'COLLEAGUE',
        partnerBond: 80,
        daysSinceDate: 0,
        currentWish: null,
        wishFulfilledToday: false,
        lastQuestDay: 0,
        storyPathChoice: 'DEVOTION',
      },
      su_xingyao: {
        id: 'su_xingyao',
        recruitmentStage: 0,
        recruited: false,
        storyStage: 0,
        affection: 0,
        relationship: 'COLLEAGUE',
        partnerBond: 80,
        daysSinceDate: 0,
        currentWish: null,
        wishFulfilledToday: false,
        lastQuestDay: 0,
        storyPathChoice: 'DEVOTION',
      },
    },
    activePartnerId: null,

    superCustomerUnlocked: false,
    hygieneDecayPerk: 0,
    finaleTipBonus: 0,
    pendingStoryModal: null,
    specialVisitCooldown: 15,

    cash: charDef.startingCash,
    reputation: charDef.startingReputation,
    hygiene: 96,

    rawIngredients: 34,
    rawIngredientsMax: 65,
    warehouseStock: Object.fromEntries(
      SEAFOOD_CATALOG.map((item) => [
        item.id,
        unlockedSeafoodIds.includes(item.id) ? 24 : 0,
      ])
    ),
    pendingDeliveries: [],
    cookedStock: 4,
    cookedMaxStock: 8,
    restroomCleanliness: 96,
    equipmentHealth: 98,
    coldChainTemp: -2,
    oxygenLevel: 98,
    facilityEventsDoneToday: [],
    staffChattedTodayIds: [],
    triggeredSpecialEventIds: [],
    lastInspectionDay: 0,
    attendanceCheckedToday: false,
    dormFeastDoneToday: false,

    activeScene: 'DINING_HALL',
    backstagePlayer: {
      x: 108,
      y: 320,
      targetX: null,
      targetY: null,
      walkCycle: 0,
      facing: 1,
      pendingInteractScene: null,
      pendingInteractType: null,
    },

    activeRegimeId: 'street_stall',
    unlockedRegimeIds: ['street_stall'],
    regimeSwitchCooldown: 0,
    policySlots: createInitialPolicySlots('street_stall', characterId),
    unlockedOpsCardIds: [],
    discoveredSynergyIds: [],
    activeSynergyIds: [],
    unlockedTechNodeIds: TECH_TREE_NODES.filter((n) => n.starterUnlocked).map((n) => n.id),

    shopLevel: 1,
    tableLimit,
    dishwareMax: 8,
    cleanDishes: 5,
    dirtyDishes: 1,
    buffetCapacityBonus: initialBuffetBonus,

    unlockedZones,
    zonePadAssignments: createDefaultZonePadAssignments(),
    unlockedSeafoodIds,
    activeSeafoodIds: [...unlockedSeafoodIds],
    unlockedBrothIds,
    activeBrothIds: [...unlockedBrothIds],
    customTicketPrice: null,

    tables,
    buffetSlots: [],
    queue: [],
    player: {
      x: 420,
      y: 274,
      speed: Math.round(235 * charDef.bonuses.playerMoveSpeedMult),
      carrying: 'NONE',
      carryAmount: 0,
      carryBrothId: null,
      taskQueue: [],
      activeTaskLabel: '开店筹备中 · 可摆台/备菜/烹熟食或巡视场馆，就绪后点击正式开店',
      facing: 0,
      walkCycle: 0,
    },
    staff: initialStaff,
    candidates: generateCandidatePool(1, unlockedZones),

    spawnTimer: 2.0,
    hygieneInspectionCooldown: 18,
    rushHourActive: false,

    floatingTexts: [],
    particles: [],
    alerts: [
      {
        id: nextUid('alert'),
        timeText: '10:00',
        message: `${charDef.name}（${charDef.title}）已入驻！当前为第1年春季筹备期，已自带熟食明档，可配置菜品/餐位档位、巡视7大场馆或邀请特聘伙伴，就绪后点击「正式开店」。`,
        severity: 'info',
      },
    ],
    todayStats: createEmptyDailyStats(1, 1),
    penaltyStrikes: 0,
    maxPenaltyStrikes: 5,
    totalWalkouts: 0,
    totalStockoutComplaints: 0,
    totalPenaltyFines: 0,
    gameOverTitle: null,
    gameOverReason: null,
    totalDaysSurvived: 0,
    totalCashEarned: 0,
    totalGuestsServed: 0,

    // Tycoon systems: weather, holiday, rivals, marketing, loan, analytics, decor & onboarding
    weather: 'SUNNY',
    holiday: 'NONE',
    activeRivalEvent: null,
    activeMarketing: null,
    loan: {
      remainingPrincipal: 0,
      dailyInstallment: 0,
      daysRemaining: 0,
      totalLoansTaken: 0,
    },
    dailyHistory: [],
    dishConsumptionCounts: {},
    activeDecorThemeId: 'harbor_warm',
    unlockedDecorThemeIds: ['harbor_warm'],
    onboardingStep: 0,

    incidentCooldown: 30,
    incidentsTriggeredToday: 0,
    recentIncidentIds: [],
  };

  syncActiveMenuFromPolicySlots(world, false);
  return world;
}

export function addFloatingText(
  world: GameWorld,
  x: number,
  y: number,
  text: string,
  color: string,
  size = 14
) {
  world.floatingTexts.push({
    id: nextUid('ft'),
    x,
    y,
    text,
    color,
    life: 1.55,
    maxLife: 1.55,
    size,
  });
}

export function addAlert(
  world: GameWorld,
  message: string,
  severity: AlertLogEntry['severity'] = 'info'
) {
  world.alerts.unshift({
    id: nextUid('al'),
    timeText: formatClock(world.dayTime, world.dayDuration, world.phase),
    message,
    severity,
  });
  if (world.alerts.length > 26) {
    world.alerts.length = 26;
  }
}

function spawnParticles(
  world: GameWorld,
  x: number,
  y: number,
  kind: GameWorld['particles'][number]['kind'],
  count = 4
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = kind === 'STEAM' ? 10 + Math.random() * 14 : 24 + Math.random() * 34;
    world.particles.push({
      x: x + (Math.random() - 0.5) * 18,
      y: y + (Math.random() - 0.5) * 12,
      vx: kind === 'STEAM' ? (Math.random() - 0.5) * 8 : Math.cos(angle) * speed,
      vy: kind === 'STEAM' ? -18 - Math.random() * 16 : Math.sin(angle) * speed - 10,
      life: kind === 'STEAM' ? 0.9 + Math.random() * 0.5 : 0.65 + Math.random() * 0.35,
      maxLife: 1.1,
      radius: kind === 'STEAM' ? 4 + Math.random() * 4 : kind === 'FLY' ? 2.2 : 3.2,
      color:
        kind === 'STEAM'
          ? 'rgba(255,248,236,0.55)'
          : kind === 'FLY'
          ? '#6EE755'
          : kind === 'SPARKLE'
          ? '#F7D060'
          : kind === 'SPLASH'
          ? '#7DD3FC'
          : '#EF4444',
      kind,
    });
  }
}

function getBestStaffBonus(world: GameWorld, role: StaffRole): number {
  let sum = 0;
  for (const s of world.staff) {
    if (s.role === role) {
      sum += s.bonusValue;
    }
  }
  return sum;
}

function getMaxStaffTierForRole(world: GameWorld, role: StaffRole): number {
  let maxT = 0;
  for (const s of world.staff) {
    if (s.role === role && s.tier > maxT) maxT = s.tier;
  }
  return maxT;
}

function hasActiveSpecialCustomer(world: GameWorld): boolean {
  if (world.queue.some((q) => Boolean(q.party.specialStoryId))) return true;
  if (world.tables.some((t) => Boolean(t.customer?.specialStoryId))) return true;
  return false;
}

function pickEligibleSpecialStory(world: GameWorld): SpecialCustomerId | null {
  const effectiveTicket = calculateTicketPrice(world);
  const candidates = SPECIAL_STORIES.filter((def) => {
    const prog = world.specialStories[def.id];
    if (prog.completed) return false;
    if (world.shopLevel < def.minShopLevel || world.mainChapter < def.minChapter) return false;
    // Ticket price filter! E.g. >= ¥400 blocks Master Zhou (maxTicketPrice: 399)
    if (effectiveTicket < def.minTicketPrice || effectiveTicket > def.maxTicketPrice) return false;
    if (def.id === 'master_zhou' && prog.stage === 1 && world.shopLevel < 2) return false;
    return true;
  });
  if (candidates.length === 0) return null;

  // Weight probability by price affinity (e.g. high ticket strongly boosts Heiress Gu)
  const weighted: SpecialCustomerId[] = [];
  for (const def of candidates) {
    let weight = 2;
    if (def.id === 'heiress_gu' && effectiveTicket >= 300) weight = 5;
    if (def.id === 'critic_shen' && effectiveTicket >= 200 && effectiveTicket <= 420) weight = 4;
    if (def.id === 'master_zhou' && effectiveTicket <= 280) weight = 4;
    for (let i = 0; i < weight; i++) weighted.push(def.id);
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

function pickActiveSeasonalBroth(world: GameWorld): string {
  const valid = world.activeBrothIds.filter((id) => {
    const b = BROTH_CATALOG.find((item) => item.id === id);
    return b && isAvailableInSeason(b.seasons, world.season);
  });
  const pool = valid.length > 0 ? valid : ['spicy_tallow', 'seafood_clear'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function createSpecialCustomerParty(world: GameWorld, storyId: SpecialCustomerId): CustomerParty {
  const def = getSpecialStoryDef(storyId);
  const charDef = getCharacterDef(world.characterId);
  const brothId = pickActiveSeasonalBroth(world);
  const brothDef = BROTH_CATALOG.find((b) => b.id === brothId)!;
  const brothFee = Math.round(brothDef.priceBonus * charDef.bonuses.brothPriceMult);
  const baseTicket = calculateTicketPrice(world) + brothFee;

  return {
    id: nextUid('spec_cust'),
    isVip: true,
    specialStoryId: storyId,
    displayName: def.customerName,
    specialTag: def.tagLabel,
    size: 2,
    color: def.color,
    patience: 100,
    maxPatience: 100,
    brothId,
    dineProgress: 0,
    eatCyclesLeft: 3,
    nextGrabTimer: 3.4,
    satisfaction: 84,
    stockoutHits: 0,
    ticketPrice: Math.round(baseTicket * 1.6),
    bonusTip: 35,
    prefersCooked: Math.random() < 0.45,
  };
}

function createCustomerParty(world: GameWorld): CustomerParty {
  const shopCfg = getShopConfig(world.shopLevel);
  const charDef = getCharacterDef(world.characterId);
  const filterPreview = getTicketFilterPreview(world);
  const hostTier = getMaxStaffTierForRole(world, 'HOST');
  const sushiTier = getMaxStaffTierForRole(world, 'SUSHI_CHEF');
  const zoneVipBonus = world.unlockedZones.reduce((sum, zid) => {
    const z = BUFFET_ZONES_CONFIG.find((item) => item.id === zid);
    return sum + (z ? z.vipBonus : 0);
  }, 0);
  const vipBonusFromHost = hostTier >= 3 ? hostTier * 0.05 : 0;
  const vipBonusFromSushi = sushiTier * 0.04;

  const superChance = world.superCustomerUnlocked
    ? filterPreview.effectivePrice >= 360
      ? 0.34
      : 0.22
    : 0;
  const isSuperCustomer = superChance > 0 && Math.random() < superChance;
  const tycoonMods = evaluateTycoonModifiers(world);
  const isVip =
    isSuperCustomer ||
    Math.random() <
      Math.min(
        0.82,
        shopCfg.vipChance +
          vipBonusFromHost +
          vipBonusFromSushi +
          zoneVipBonus +
          filterPreview.vipChanceBonus +
          tycoonMods.vipBonus
      );

  const brothId = pickActiveSeasonalBroth(world);
  const brothDef = BROTH_CATALOG.find((b) => b.id === brothId)!;
  const brothFee = Math.round(brothDef.priceBonus * charDef.bonuses.brothPriceMult);

  const baseTicket = calculateTicketPrice(world) + brothFee;
  const ticketPrice = isSuperCustomer
    ? Math.round(baseTicket * 2.5)
    : isVip
      ? Math.round(baseTicket * 1.45)
      : baseTicket;

  const guestColors = isSuperCustomer
    ? ['#FACC15']
    : isVip
      ? ['#E5A93B', '#F2C94C', '#D98E2B']
      : ['#5C9CE6', '#E87A90', '#58B986', '#B388EB', '#E89B5C'];

  return {
    id: nextUid('cust'),
    isVip,
    isSuperCustomer,
    displayName: isSuperCustomer ? '船王超VIP' : undefined,
    specialTag: isSuperCustomer ? '超级顾客' : undefined,
    size: isSuperCustomer ? 4 : isVip ? 3 : Math.random() < 0.5 ? 2 : 4,
    color: guestColors[Math.floor(Math.random() * guestColors.length)],
    patience: 100,
    maxPatience: 100,
    brothId,
    dineProgress: 0,
    eatCyclesLeft: isSuperCustomer ? 4 : 3 + (isVip ? 1 : 0),
    nextGrabTimer: 3.2 + Math.random() * 2,
    satisfaction:
      80 +
      hostTier * 4 +
      (world.unlockedSeafoodIds.includes('bluefin_toro') ? 6 : 0) +
      (world.unlockedZones.includes('drinks_dessert') ? 4 : 0),
    stockoutHits: 0,
    ticketPrice,
    bonusTip: isSuperCustomer ? 120 : 0,
    prefersCooked: Math.random() < 0.38,
  };
}

function repositionQueue(world: GameWorld) {
  world.queue.forEach((q, idx) => {
    q.x = 86;
    q.y = 304 + idx * 54;
  });
}

function changeReputation(world: GameWorld, delta: number) {
  const prev = world.reputation;
  world.reputation = Math.max(0, Math.min(100, world.reputation + delta));
  world.todayStats.reputationChange += world.reputation - prev;
}

function addPenaltyStrike(world: GameWorld, amount: number, reason: string) {
  world.penaltyStrikes = Math.min(world.maxPenaltyStrikes, world.penaltyStrikes + amount);
  addFloatingText(
    world,
    CANVAS_WIDTH / 2,
    136,
    `违规处罚 +${amount}（当前 ${world.penaltyStrikes}/${world.maxPenaltyStrikes}）`,
    '#EF4444',
    16
  );
  addAlert(
    world,
    `【违规处罚 +${amount}】${reason}（当前违规 ${world.penaltyStrikes}/${world.maxPenaltyStrikes}，记满即停业失败！）`,
    'penalty'
  );
  checkGameOver(world);
}

function checkGameOver(world: GameWorld) {
  if (world.phase === 'GAME_OVER') return;
  if (world.penaltyStrikes >= world.maxPenaltyStrikes) {
    world.phase = 'GAME_OVER';
    world.gameOverTitle = '吊销执照 · 违规处罚记满';
    world.gameOverReason = `门店累计违规处罚已达 ${world.penaltyStrikes}/${world.maxPenaltyStrikes} 次（食安隐患、断菜投诉或大量客诉逃单），被市场监管部门责令永久停业，本次经营失败！`;
    sound.playGameOver();
  } else if (world.reputation <= 0) {
    world.phase = 'GAME_OVER';
    world.gameOverTitle = '口碑崩盘 · 无人问津';
    world.gameOverReason =
      '门店差评失控，口碑跌至 0 分，客流彻底断绝被迫关门停业，本次经营失败！';
    sound.playGameOver();
  } else if (world.cash < -400) {
    world.phase = 'GAME_OVER';
    world.gameOverTitle = '资金断裂 · 宣告破产';
    world.gameOverReason =
      '门店资金严重透支（低于 -¥400），无力支付租金、货款与员工薪资，宣告破产，本次经营失败！';
    sound.playGameOver();
  }
}

function handleSpecialCustomerFinished(world: GameWorld, cust: CustomerParty) {
  if (!cust.specialStoryId) return;
  const storyId = cust.specialStoryId;
  const def = getSpecialStoryDef(storyId);
  const prog = world.specialStories[storyId];
  prog.discovered = true;
  if (prog.completed) return;

  // Check service quality requirements
  if (cust.stockoutHits > 0 || cust.satisfaction < 66) {
    addAlert(
      world,
      `奇遇食客「${def.customerName}」对本次体验略有遗憾（出现断菜或满意度不足），约定下次再来考察！`,
      'warning'
    );
    return;
  }

  if (prog.stage === 0) {
    // Stage 1 check
    if (storyId === 'inspector_cheng' && world.hygiene < 80) {
      addAlert(
        world,
        `「程明镜」指出卫生未达 80（当前 ${Math.round(world.hygiene)}），下次来访需更洁净才能推进奇遇！`,
        'warning'
      );
      return;
    }

    prog.stage = 1;
    world.cash += 120;
    changeReputation(world, 4);
    sound.playStoryFanfare();

    world.pendingStoryModal = {
      id: nextUid('story_modal'),
      category: 'SPECIAL_CUSTOMER',
      badge: '江湖奇遇 · 线索推进',
      speakerName: def.customerName,
      speakerTitle: def.roleTitle,
      accentColor: def.color,
      headline: `获得「${def.customerName}」初步认可！`,
      body: def.stage1Dialogue,
      rewardHighlight: `赏金 +¥120 · 口碑 +4 · 已记录后续线索：${def.stage2Goal}`,
    };
    addAlert(world, `推进了奇遇「${def.customerName}」（1/2）！获得赏金 ¥120，后续线索已记入见闻录。`, 'success');
    return;
  }

  if (prog.stage === 1) {
    // Stage 2 specific requirements
    if (storyId === 'critic_shen' && world.hygiene < 75) {
      addAlert(
        world,
        `食评家「沈墨白」复查时发现卫生低于 75，暂缓了专栏推荐，请保持整洁等待下次到访！`,
        'warning'
      );
      return;
    }
    if (storyId === 'master_zhou' && world.shopLevel < 2) {
      addAlert(
        world,
        `「周老灶」期待你的门店升至 Lv.2 后再正式出山相助！`,
        'warning'
      );
      return;
    }
    if (storyId === 'heiress_gu') {
      const stockedVarieties = world.buffetSlots.filter((s) => s.stock > 0).length;
      if (stockedVarieties < 4) {
        addAlert(
          world,
          `「顾清欢」希望冰台至少有 4 种海鲜有货（当前 ${stockedVarieties} 种），下次备齐即可签约！`,
          'warning'
        );
        return;
      }
    }
    if (storyId === 'inspector_cheng' && world.hygiene < 85) {
      addAlert(
        world,
        `品控官「程明镜」终检要求卫生 ≥ 85（当前 ${Math.round(world.hygiene)}），请继续保持！`,
        'warning'
      );
      return;
    }

    // Complete Stage 2 & Grant Unique Special Reward!
    prog.stage = 2;
    prog.completed = true;
    changeReputation(world, 8);
    sound.playStoryFanfare();

    if (storyId === 'critic_shen') {
      if (!world.unlockedSeafoodIds.includes('bluefin_toro')) {
        world.unlockedSeafoodIds.push('bluefin_toro');
        world.warehouseStock['bluefin_toro'] = Math.max(
          world.warehouseStock['bluefin_toro'] ?? 0,
          18
        );
        // Do NOT auto-unlock sashimi_sushi zone; player must unlock it via the Tech Tree first!
        if (
          isBuffetZoneUnlocked(world, 'sashimi_sushi') &&
          !world.activeSeafoodIds.includes('bluefin_toro')
        ) {
          world.activeSeafoodIds.push('bluefin_toro');
          rebuildActiveBuffetSlots(world);
        }
      }
    } else if (storyId === 'master_zhou') {
      addSpecialStaffToWorld(world, createSpecialStaffTemplate('ZHOU'));
    } else if (storyId === 'heiress_gu') {
      world.superCustomerUnlocked = true;
    } else if (storyId === 'inspector_cheng') {
      addSpecialStaffToWorld(world, createSpecialStaffTemplate('AJING'));
      world.hygieneDecayPerk = Math.min(0.45, world.hygieneDecayPerk + 0.25);
    }

    world.pendingStoryModal = {
      id: nextUid('story_modal'),
      category: 'SPECIAL_CUSTOMER',
      badge: '特殊顾客剧情完结 · 专属奖励解锁',
      speakerName: def.customerName,
      speakerTitle: def.roleTitle,
      accentColor: def.color,
      headline: `达成羁绊：${def.rewardTitle}`,
      body: def.stage2Dialogue,
      rewardHighlight: `${def.rewardTitle} — ${def.rewardDescription}`,
    };
    addAlert(world, `完成「${def.customerName}」剧情线！解锁奖励：${def.rewardTitle}！`, 'success');
  }
}

function completeTaskStep(
  world: GameWorld,
  actor: {
    isPlayer: boolean;
    staff?: HiredStaff;
    x: number;
    y: number;
    carrying: GameWorld['player']['carrying'];
    carryAmount: number;
    carryBrothId: string | null;
  },
  step: TaskStep
): boolean {
  const staff = actor.staff;
  const tier = staff ? staff.tier : 2;
  const charDef = getCharacterDef(world.characterId);

  switch (step.type) {
    case 'WALK_TO':
      return true;

    case 'ENTER_BACKSTAGE': {
      world.activeScene = 'BACKSTAGE';
      world.backstagePlayer.x = step.targetX;
      world.backstagePlayer.y = 634;
      world.backstagePlayer.targetX = null;
      world.backstagePlayer.targetY = null;
      world.backstagePlayer.pendingInteractScene = null;
      world.backstagePlayer.pendingInteractType = null;
      world.backstagePlayer.pendingFrontHallTarget = null;
      world.player.taskQueue = [];
      if (world.phase === 'CLOSING' && world.onboardingStep === 7) {
        world.onboardingStep = 8;
      }
      if (
        typeof step.backstageTargetX === 'number' &&
        typeof step.backstageTargetY === 'number'
      ) {
        handleBackstageCanvasClick(world, step.backstageTargetX, step.backstageTargetY);
      }
      return true;
    }

    case 'WELCOME_GUEST': {
      if (world.queue.length === 0) return true;
      let targetTable =
        typeof step.targetId === 'number'
          ? world.tables.find((t) => t.id === step.targetId && t.status === 'READY')
          : undefined;
      if (!targetTable) {
        targetTable = world.tables.find((t) => t.status === 'READY');
      }
      if (!targetTable) {
        if (actor.isPlayer) {
          addFloatingText(world, actor.x, actor.y - 24, '没有已摆台的空桌！', '#F59E0B');
        }
        return false;
      }
      const queued = world.queue.shift()!;
      repositionQueue(world);
      const party = queued.party;

      const setterPatienceBoost = targetTable.setterBonus;
      party.patience = Math.min(100, 88 + setterPatienceBoost * 0.5);
      party.maxPatience = 100;
      if (staff && staff.role === 'HOST') {
        party.satisfaction = Math.min(100, party.satisfaction + staff.tier * 4);
        party.bonusTip += staff.tier * 5;
        staff.tasksCompleted += 1;
      }

      targetTable.status = 'WAITING_BROTH';
      targetTable.customer = party;
      targetTable.reservedByStaffId = null;

      sound.playBell();
      spawnParticles(world, targetTable.x, targetTable.y, 'SPARKLE', 5);
      addFloatingText(
        world,
        STATIONS.RECEPTION.x,
        STATIONS.RECEPTION.y - 26,
        party.displayName ? `贵客${party.displayName}入座！` : party.isVip ? '贵宾入座！' : '欢迎光临！',
        '#E5A93B'
      );
      return true;
    }

    case 'PICKUP_SEAFOOD': {
      if (actor.carrying !== 'NONE' && actor.carrying !== 'SEAFOOD_TRAY') return false;
      actor.carrying = 'SEAFOOD_TRAY';
      actor.carryAmount = staff ? 3 * staff.carryCapacity : 4;
      sound.playClick();
      return true;
    }

    case 'RESTOCK_BUFFET': {
      if (actor.carrying !== 'SEAFOOD_TRAY') return false;
      let slot =
        typeof step.targetId === 'number'
          ? world.buffetSlots.find((s) => s.slotIndex === step.targetId)
          : undefined;
      if (!slot || slot.stock >= slot.maxStock) {
        slot = [...world.buffetSlots]
          .filter((s) => s.stock < s.maxStock && (world.warehouseStock[s.itemId] ?? 0) > 0)
          .sort((a, b) => a.stock / a.maxStock - b.stock / b.maxStock)[0];
      }
      if (!slot) {
        actor.carrying = 'NONE';
        actor.carryAmount = 0;
        return true;
      }
      const def = SEAFOOD_CATALOG.find((d) => d.id === slot!.itemId)!;
      const needed = slot.maxStock - slot.stock;
      if (needed <= 0) {
        actor.carrying = 'NONE';
        actor.carryAmount = 0;
        return true;
      }

      const warehouseAvail = world.warehouseStock[slot.itemId] ?? 0;
      if (warehouseAvail <= 0) {
        actor.carrying = 'NONE';
        actor.carryAmount = 0;
        if (actor.isPlayer) {
          sound.playPenalty();
          addFloatingText(
            world,
            slot.x,
            slot.y - 26,
            `后场「${def.shortName}」库存告罄！闭店后补购`,
            '#F87171',
            12
          );
          addAlert(
            world,
            `后场冷库「${def.name}」库存为 0，无法补台！请在闭店后前往冷链库/办公室采购（或雇佣库存采购员自动补货）。`,
            'warning'
          );
        }
        return true;
      }

      const added = Math.min(needed, Math.max(actor.carryAmount, 3), warehouseAvail);
      world.warehouseStock[slot.itemId] = Math.max(0, warehouseAvail - added);

      slot.stock = Math.min(slot.maxStock, slot.stock + added);
      slot.lastGrabFlash = 0.6;
      actor.carrying = 'NONE';
      actor.carryAmount = 0;
      if (staff) staff.tasksCompleted += 1;

      sound.playIceRestock();
      spawnParticles(world, slot.x, slot.y - 8, 'SPARKLE', 5);
      addFloatingText(
        world,
        slot.x,
        slot.y - 26,
        `后场补齐${def.shortName} +${added} (仓余${world.warehouseStock[slot.itemId]})`,
        world.warehouseStock[slot.itemId] <= 4 ? '#FBBF24' : '#34D399',
        12
      );
      return true;
    }

    case 'PICKUP_BROTH': {
      if (actor.carrying !== 'NONE') return false;
      actor.carrying = 'BROTH_POT';
      actor.carryAmount = 1;
      actor.carryBrothId = step.brothId || world.unlockedBrothIds[0] || 'spicy_tallow';
      sound.playPotPickup();
      spawnParticles(world, STATIONS.BROTH_KITCHEN.x, STATIONS.BROTH_KITCHEN.y - 10, 'STEAM', 5);
      return true;
    }

    case 'SERVE_BROTH': {
      if (actor.carrying !== 'BROTH_POT') return false;
      let table =
        typeof step.targetId === 'number'
          ? world.tables.find((t) => t.id === step.targetId && t.status === 'WAITING_BROTH')
          : undefined;
      if (!table) {
        table = world.tables.find((t) => t.status === 'WAITING_BROTH');
      }
      actor.carrying = 'NONE';
      actor.carryAmount = 0;
      actor.carryBrothId = null;

      if (!table || !table.customer) return true;

      table.status = 'DINING';
      table.reservedByStaffId = null;
      table.customer.patience = 100;
      if (staff && staff.role === 'RUNNER') {
        table.brothBonus = staff.bonusValue;
        table.customer.satisfaction = Math.min(
          100,
          table.customer.satisfaction + (staff.isSpecial ? 18 : staff.tier * 5)
        );
        table.customer.bonusTip += Math.round(table.customer.ticketPrice * staff.bonusValue * 0.35);
        staff.tasksCompleted += 1;
      } else {
        table.brothBonus = 0.08 + charDef.bonuses.dineSpeedBonus;
      }

      sound.playSizzle();
      spawnParticles(world, table.x, table.y - 6, 'STEAM', 7);
      addFloatingText(world, table.x, table.y - 30, '锅底已上！开涮', '#F28B30');
      return true;
    }

    case 'CLEAR_TABLE': {
      const table =
        typeof step.targetId === 'number'
          ? world.tables.find((t) => t.id === step.targetId && t.status === 'DIRTY')
          : world.tables.find((t) => t.status === 'DIRTY');
      if (!table) return true;

      table.status = 'NEEDS_TABLEWARE';
      table.dirtyTime = 0;
      table.reservedByStaffId = null;
      table.setterBonus = 0;
      table.brothBonus = 0;

      actor.carrying = 'DIRTY_DISHES';
      actor.carryAmount = Math.min(3, actor.carryAmount + 1);

      const hygieneGain = staff && staff.role === 'BUSSER' ? staff.bonusValue : 2.2;
      world.hygiene = Math.min(100, world.hygiene + hygieneGain);
      if (staff) staff.tasksCompleted += 1;

      sound.playClink();
      spawnParticles(world, table.x, table.y, 'SPARKLE', 5);
      addFloatingText(world, table.x, table.y - 26, '餐桌已清理', '#7DD3FC', 12);
      return true;
    }

    case 'DROP_DIRTY': {
      if (actor.carrying === 'DIRTY_DISHES') {
        world.dirtyDishes = Math.min(world.dishwareMax, world.dirtyDishes + Math.max(1, actor.carryAmount));
        actor.carrying = 'NONE';
        actor.carryAmount = 0;
        sound.playSplash();
      }
      return true;
    }

    case 'WASH_DISHES': {
      if (world.dirtyDishes <= 0) return true;
      const batch = staff && staff.role === 'DISHWASHER' ? Math.round(staff.bonusValue) : 2;
      const washed = Math.min(world.dirtyDishes, batch);
      world.dirtyDishes -= washed;
      world.cleanDishes = Math.min(world.dishwareMax, world.cleanDishes + washed);

      if (staff && staff.role === 'DISHWASHER') {
        world.hygiene = Math.min(100, world.hygiene + (staff.isSpecial ? 6 : staff.tier * 1.2));
        staff.tasksCompleted += 1;
      } else {
        world.hygiene = Math.min(100, world.hygiene + 1.0);
      }

      sound.playSplash();
      spawnParticles(world, STATIONS.SINK.x, STATIONS.SINK.y, 'SPLASH', 6);
      addFloatingText(
        world,
        STATIONS.SINK.x,
        STATIONS.SINK.y - 24,
        `洗净餐具 +${washed}`,
        '#7DD3FC',
        12
      );
      return true;
    }

    case 'PICKUP_CLEAN_DISH': {
      if (world.cleanDishes <= 0) {
        if (actor.isPlayer) {
          addFloatingText(world, STATIONS.CLEAN_RACK.x, STATIONS.CLEAN_RACK.y - 24, '无干净餐具！请先洗碗', '#F59E0B');
        }
        return false;
      }
      const maxCap = staff ? staff.carryCapacity : 2;
      const take = Math.min(world.cleanDishes, maxCap);
      world.cleanDishes -= take;
      actor.carrying = 'CLEAN_TABLEWARE';
      actor.carryAmount = take;
      sound.playClink();
      return true;
    }

    case 'SET_TABLEWARE': {
      if (actor.carrying !== 'CLEAN_TABLEWARE' || actor.carryAmount <= 0) return false;
      let table =
        typeof step.targetId === 'number'
          ? world.tables.find((t) => t.id === step.targetId && t.status === 'NEEDS_TABLEWARE')
          : undefined;
      if (!table) {
        table = world.tables.find((t) => t.status === 'NEEDS_TABLEWARE');
      }
      if (!table) {
        world.cleanDishes = Math.min(world.dishwareMax, world.cleanDishes + actor.carryAmount);
        actor.carrying = 'NONE';
        actor.carryAmount = 0;
        return true;
      }

      table.status = 'READY';
      table.reservedByStaffId = null;
      table.setterBonus = staff && staff.role === 'SETTER' ? staff.bonusValue : 8;

      actor.carryAmount -= 1;
      if (actor.carryAmount <= 0) {
        actor.carrying = 'NONE';
        actor.carryAmount = 0;
      }
      if (staff) staff.tasksCompleted += 1;

      sound.playClink();
      spawnParticles(world, table.x, table.y, 'SPARKLE', 5);
      addFloatingText(
        world,
        table.x,
        table.y - 26,
        tier >= 3 && staff ? '星级摆台完成' : '餐具已摆好',
        '#73C96E',
        12
      );
      return true;
    }

    case 'COOK_FOOD': {
      if (actor.carrying !== 'NONE' && actor.carrying !== 'COOKED_PLATTER') return false;
      const neededRaw = 2;
      if (world.rawIngredients >= neededRaw) {
        world.rawIngredients -= neededRaw;
      } else {
        const tycoonCostMult = evaluateTycoonModifiers(world).costMultiplier;
        const emergencyCost = Math.round(14 * getSeasonDef(world.season).costMultiplier * tycoonCostMult);
        world.cash -= emergencyCost;
        world.todayStats.ingredientCost += emergencyCost;
        addFloatingText(world, STATIONS.COLD_PREP.x, STATIONS.COLD_PREP.y - 24, `现采原料 -¥${emergencyCost}`, '#FBBF24', 11);
      }
      const cookBonuses = evaluatePolicyBonuses(world);
      actor.carrying = 'COOKED_PLATTER';
      actor.carryAmount =
        (staff && staff.role === 'CHEF' ? Math.max(2, Math.round(staff.bonusValue)) : 3) +
        cookBonuses.extraCookedYield;
      sound.playSizzle();
      spawnParticles(world, STATIONS.BROTH_KITCHEN.x + 60, STATIONS.BROTH_KITCHEN.y - 8, 'STEAM', 6);
      return true;
    }

    case 'DELIVER_COOKED': {
      if (actor.carrying !== 'COOKED_PLATTER') return false;
      const add = Math.min(world.cookedMaxStock - world.cookedStock, Math.max(1, actor.carryAmount));
      world.cookedStock = Math.min(world.cookedMaxStock, world.cookedStock + add);
      actor.carrying = 'NONE';
      actor.carryAmount = 0;
      if (staff) staff.tasksCompleted += 1;

      sound.playSizzle();
      const cookedPad = getPadForBuffetZone(world, 'cooked_hot');
      const cx = cookedPad ? cookedPad.x + cookedPad.w * 0.5 : STATIONS.COOKED_COUNTER.x;
      const cy = cookedPad ? cookedPad.y + cookedPad.h * 0.5 : STATIONS.COOKED_COUNTER.y;
      spawnParticles(world, cx, cy - 8, 'STEAM', 6);
      addFloatingText(world, cx, cy - 28, `熟食热菜出锅 +${add}`, '#FB923C', 12);
      return true;
    }
  }
}

// ==========================================
// FRONT HALL SOLID COLLISION VOLUMES (Tables, Occupied Zone Pads, Stations)
// ==========================================

export interface SolidCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function getFrontHallColliders(world: GameWorld): SolidCollider[] {
  const colliders: SolidCollider[] = [];

  // 1. Top 4 kitchen stations (inset 8px horizontally so the 3 archways 221, 406, 682 stay cleanly passable!)
  const topStations = [
    STATIONS.SINK,
    STATIONS.CLEAN_RACK,
    STATIONS.BROTH_KITCHEN,
    STATIONS.COLD_PREP,
  ];
  for (const st of topStations) {
    colliders.push({
      minX: st.x - st.w / 2 + 8,
      maxX: st.x + st.w / 2 - 8,
      minY: st.y - st.h / 2,
      maxY: st.y + st.h / 2,
    });
  }

  // 2. Reception Desk
  colliders.push({
    minX: STATIONS.RECEPTION.x - 42,
    maxX: STATIONS.RECEPTION.x + 42,
    minY: STATIONS.RECEPTION.y - 24,
    maxY: STATIONS.RECEPTION.y + 24,
  });

  // 3. All unlocked Dining Tables (table + surrounding chairs footprint)
  for (const t of world.tables) {
    if (t.status === 'LOCKED') continue;
    colliders.push({
      minX: t.x - 34,
      maxX: t.x + 34,
      minY: t.y - 27,
      maxY: t.y + 27,
    });
  }

  // 4. All occupied (configured) Front-Hall Buffet Zone Pads
  for (const { pad, zoneId } of getUnlockedZonePads(world)) {
    if (!zoneId) continue; // Empty floor pads remain walkable!
    colliders.push({
      minX: pad.x,
      maxX: pad.x + pad.w,
      minY: pad.y,
      maxY: pad.y + pad.h,
    });
  }

  return colliders;
}

function overlapsCollider(x: number, y: number, c: SolidCollider, r: number): boolean {
  return x > c.minX - r && x < c.maxX + r && y > c.minY - r && y < c.maxY + r;
}

function hitsAnyCollider(x: number, y: number, colliders: SolidCollider[], r: number): boolean {
  for (const c of colliders) {
    if (overlapsCollider(x, y, c, r)) return true;
  }
  return false;
}

export function pushOutsideColliders(
  world: GameWorld,
  x: number,
  y: number,
  r = 11
): { x: number; y: number } {
  const bounds = getFrontHallBounds(world.shopLevel);
  let cx = Math.max(124, Math.min(bounds.width - 24, x));
  let cy = Math.max(114, Math.min(bounds.height - 24, y));
  const colliders = getFrontHallColliders(world);

  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const c of colliders) {
      if (overlapsCollider(cx, cy, c, r)) {
        const dLeft = Math.abs(cx - (c.minX - r));
        const dRight = Math.abs(c.maxX + r - cx);
        const dTop = Math.abs(cy - (c.minY - r));
        const dBottom = Math.abs(c.maxY + r - cy);
        const minD = Math.min(dLeft, dRight, dTop, dBottom);
        if (minD === dLeft) cx = c.minX - r - 1;
        else if (minD === dRight) cx = c.maxX + r + 1;
        else if (minD === dTop) cy = c.minY - r - 1;
        else cy = c.maxY + r + 1;
        moved = true;
      }
    }
    cx = Math.max(124, Math.min(bounds.width - 24, cx));
    cy = Math.max(114, Math.min(bounds.height - 24, cy));
    if (!moved) break;
  }
  return { x: cx, y: cy };
}

function resolveFrontHallStep(
  world: GameWorld,
  curX: number,
  curY: number,
  wantX: number,
  wantY: number,
  allowArchwayNorth: boolean,
  r = 10
): { x: number; y: number; blocked: boolean } {
  const bounds = getFrontHallBounds(world.shopLevel);
  const minY = allowArchwayNorth ? -8 : 114;
  let tx = Math.max(124, Math.min(bounds.width - 24, wantX));
  let ty = Math.max(minY, Math.min(bounds.height - 24, wantY));

  const colliders = getFrontHallColliders(world);

  // Unstuck safeguard if actor is currently embedded inside a newly placed collider
  if (hitsAnyCollider(curX, curY, colliders, r - 1)) {
    const escaped = pushOutsideColliders(world, tx, ty, r);
    return { x: escaped.x, y: escaped.y, blocked: false };
  }

  if (!hitsAnyCollider(tx, ty, colliders, r)) {
    return { x: tx, y: ty, blocked: false };
  }
  if (!hitsAnyCollider(tx, curY, colliders, r)) {
    return { x: tx, y: curY, blocked: true };
  }
  if (!hitsAnyCollider(curX, ty, colliders, r)) {
    return { x: curX, y: ty, blocked: true };
  }
  return { x: curX, y: curY, blocked: true };
}

function advanceActorTasks(
  world: GameWorld,
  dt: number,
  actor: {
    isPlayer: boolean;
    staff?: HiredStaff;
    x: number;
    y: number;
    speed: number;
    workSpeed: number;
    carrying: GameWorld['player']['carrying'];
    carryAmount: number;
    carryBrothId: string | null;
    taskQueue: TaskStep[];
    activeTaskLabel: string;
    walkCycle: number;
  }
) {
  if (actor.taskQueue.length === 0) return;

  const step = actor.taskQueue[0];
  const dx = step.targetX - actor.x;
  const dy = step.targetY - actor.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 6) {
    const moveDist = actor.speed * dt;
    const rawNextX = moveDist >= dist ? step.targetX : actor.x + (dx / dist) * moveDist;
    const rawNextY = moveDist >= dist ? step.targetY : actor.y + (dy / dist) * moveDist;

    if (actor.isPlayer && step.type !== 'ENTER_BACKSTAGE') {
      const res = resolveFrontHallStep(world, actor.x, actor.y, rawNextX, rawNextY, true, 10);
      if (Math.hypot(res.x - actor.x, res.y - actor.y) < moveDist * 0.22 && res.blocked) {
        // Smart tangential detour around table/buffet corner so click-to-walk glides cleanly!
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const tryA = resolveFrontHallStep(
          world,
          actor.x,
          actor.y,
          actor.x + perpX * moveDist,
          actor.y + perpY * moveDist,
          true,
          10
        );
        const tryB = resolveFrontHallStep(
          world,
          actor.x,
          actor.y,
          actor.x - perpX * moveDist,
          actor.y - perpY * moveDist,
          true,
          10
        );
        const dA = Math.hypot(tryA.x - step.targetX, tryA.y - step.targetY);
        const dB = Math.hypot(tryB.x - step.targetX, tryB.y - step.targetY);
        const pick = dA <= dB ? tryA : tryB;
        actor.x = pick.x;
        actor.y = pick.y;
      } else {
        actor.x = res.x;
        actor.y = res.y;
      }
    } else {
      actor.x = rawNextX;
      actor.y = rawNextY;
    }
    actor.walkCycle += dt * 10;
    return;
  }

  const baseDur = step.duration ?? 0;
  if (baseDur > 0) {
    const effectiveDur = baseDur / actor.workSpeed;
    step.progress = (step.progress ?? 0) + dt / effectiveDur;
    if (step.progress < 1) {
      return;
    }
  }

  const ok = completeTaskStep(world, actor, step);
  actor.taskQueue.shift();
  if (!ok) {
    actor.taskQueue = [];
  }
}

function assignStaffTasks(world: GameWorld, dt: number) {
  for (const s of world.staff) {
    if (s.taskQueue.length > 0) continue;

    if (s.carrying === 'DIRTY_DISHES') {
      s.taskQueue.push({
        type: 'DROP_DIRTY',
        targetX: STATIONS.SINK.x,
        targetY: STATIONS.SINK.y + 42,
        duration: 0.25,
      });
      s.activeTaskLabel = '送回脏餐具';
      continue;
    }
    if (s.carrying === 'CLEAN_TABLEWARE') {
      const needy = world.tables.find(
        (t) => t.status === 'NEEDS_TABLEWARE' && (!t.reservedByStaffId || t.reservedByStaffId === s.id)
      );
      if (needy) {
        needy.reservedByStaffId = s.id;
        s.taskQueue.push({
          type: 'SET_TABLEWARE',
          targetX: needy.x,
          targetY: needy.y - 34,
          targetId: needy.id,
          duration: 0.65,
        });
        s.activeTaskLabel = `为 ${needy.id + 1}号桌摆餐具`;
        continue;
      } else {
        world.cleanDishes = Math.min(world.dishwareMax, world.cleanDishes + s.carryAmount);
        s.carrying = 'NONE';
        s.carryAmount = 0;
      }
    }

    switch (s.role) {
      case 'HOST': {
        const readyTable = world.tables.find((t) => t.status === 'READY');
        if (world.queue.length > 0 && readyTable) {
          s.taskQueue.push({
            type: 'WELCOME_GUEST',
            targetX: STATIONS.RECEPTION.x + 28,
            targetY: STATIONS.RECEPTION.y + 8,
            targetId: readyTable.id,
            duration: 0.6,
          });
          s.activeTaskLabel = '迎宾带位中';
        } else {
          s.activeTaskLabel = '迎宾待命';
        }
        break;
      }

      case 'STOCKER': {
        const lowSlots = world.buffetSlots
          .filter(
            (slot) =>
              slot.stock < slot.maxStock * 0.85 && (world.warehouseStock[slot.itemId] ?? 0) > 0
          )
          .sort((a, b) => a.stock / a.maxStock - b.stock / b.maxStock);
        const targetSlot = lowSlots[0];
        if (targetSlot) {
          s.taskQueue.push(
            {
              type: 'PICKUP_SEAFOOD',
              targetX: STATIONS.COLD_PREP.x - 10,
              targetY: STATIONS.COLD_PREP.y + 44,
              duration: 0.5,
            },
            {
              type: 'RESTOCK_BUFFET',
              targetX: targetSlot.x,
              targetY: targetSlot.y + 34,
              targetId: targetSlot.slotIndex,
              duration: 0.65,
            }
          );
          s.activeTaskLabel = '从冷库取货补菜中';
        } else {
          const anyEmptyWarehouse = world.buffetSlots.some(
            (slot) => slot.stock < slot.maxStock * 0.5 && (world.warehouseStock[slot.itemId] ?? 0) <= 0
          );
          s.activeTaskLabel = anyEmptyWarehouse ? '后场库存告罄待补购' : '巡视海鲜冰台';
        }
        break;
      }

      case 'RUNNER': {
        const waiting = world.tables
          .filter(
            (t) =>
              t.status === 'WAITING_BROTH' &&
              t.customer &&
              (!t.reservedByStaffId || t.reservedByStaffId === s.id)
          )
          .sort((a, b) => (a.customer?.patience ?? 100) - (b.customer?.patience ?? 100))[0];
        if (waiting && waiting.customer) {
          waiting.reservedByStaffId = s.id;
          s.taskQueue.push(
            {
              type: 'PICKUP_BROTH',
              targetX: STATIONS.BROTH_KITCHEN.x,
              targetY: STATIONS.BROTH_KITCHEN.y + 44,
              brothId: waiting.customer.brothId,
              duration: 0.55,
            },
            {
              type: 'SERVE_BROTH',
              targetX: waiting.x,
              targetY: waiting.y - 34,
              targetId: waiting.id,
              duration: 0.45,
            }
          );
          s.activeTaskLabel = `送锅底至 ${waiting.id + 1}号桌`;
        } else {
          s.activeTaskLabel = '灶台候命';
        }
        break;
      }

      case 'BUSSER': {
        const dirty = world.tables
          .filter(
            (t) => t.status === 'DIRTY' && (!t.reservedByStaffId || t.reservedByStaffId === s.id)
          )
          .sort((a, b) => b.dirtyTime - a.dirtyTime)[0];
        if (dirty) {
          dirty.reservedByStaffId = s.id;
          s.taskQueue.push(
            {
              type: 'CLEAR_TABLE',
              targetX: dirty.x,
              targetY: dirty.y - 34,
              targetId: dirty.id,
              duration: 0.85,
            },
            {
              type: 'DROP_DIRTY',
              targetX: STATIONS.SINK.x + 12,
              targetY: STATIONS.SINK.y + 44,
              duration: 0.25,
            }
          );
          s.activeTaskLabel = `收拾 ${dirty.id + 1}号桌`;
        } else {
          s.activeTaskLabel = '巡场保洁';
        }
        break;
      }

      case 'DISHWASHER': {
        if (world.dirtyDishes > 0) {
          s.taskQueue.push({
            type: 'WASH_DISHES',
            targetX: STATIONS.SINK.x,
            targetY: STATIONS.SINK.y + 44,
            duration: 1.05,
          });
          s.activeTaskLabel = '清洗餐具中';
        } else {
          s.activeTaskLabel = '洗碗池待命';
        }
        break;
      }

      case 'SETTER': {
        const needyTables = world.tables.filter(
          (t) =>
            t.status === 'NEEDS_TABLEWARE' &&
            (!t.reservedByStaffId || t.reservedByStaffId === s.id)
        );
        if (needyTables.length > 0 && world.cleanDishes > 0) {
          const count = Math.min(s.carryCapacity, needyTables.length, world.cleanDishes);
          const targets = needyTables.slice(0, count);
          s.taskQueue.push({
            type: 'PICKUP_CLEAN_DISH',
            targetX: STATIONS.CLEAN_RACK.x,
            targetY: STATIONS.CLEAN_RACK.y + 44,
            duration: 0.4,
          });
          targets.forEach((t) => {
            t.reservedByStaffId = s.id;
            s.taskQueue.push({
              type: 'SET_TABLEWARE',
              targetX: t.x,
              targetY: t.y - 34,
              targetId: t.id,
              duration: 0.6,
            });
          });
          s.activeTaskLabel = `摆台 (${targets.length}桌)`;
        } else {
          s.activeTaskLabel = '消毒柜待命';
        }
        break;
      }

      case 'CHEF': {
        const cookedPad = getPadForBuffetZone(world, 'cooked_hot');
        const cookedStand = cookedPad
          ? getPadStandPoint(cookedPad)
          : { x: STATIONS.COOKED_COUNTER.x, y: STATIONS.COOKED_COUNTER.y + 42 };
        if (s.carrying === 'COOKED_PLATTER') {
          s.taskQueue.push({
            type: 'DELIVER_COOKED',
            targetX: cookedStand.x,
            targetY: cookedStand.y,
            duration: 0.4,
          });
          s.activeTaskLabel = '端送热菜至熟食区';
        } else if (world.cookedStock < world.cookedMaxStock - 1) {
          s.taskQueue.push(
            {
              type: 'COOK_FOOD',
              targetX: STATIONS.COLD_PREP.x - 16,
              targetY: STATIONS.COLD_PREP.y + 44,
              duration: 1.05,
            },
            {
              type: 'DELIVER_COOKED',
              targetX: cookedStand.x,
              targetY: cookedStand.y,
              duration: 0.4,
            }
          );
          s.activeTaskLabel = '热厨烹制熟食中';
        } else {
          s.activeTaskLabel = '热厨候命';
        }
        break;
      }

      case 'LIVE_MASTER': {
        const liveLow = world.buffetSlots
          .filter((slot) => {
            const d = SEAFOOD_CATALOG.find((item) => item.id === slot.itemId);
            return (
              slot.stock < slot.maxStock * 0.85 &&
              (world.warehouseStock[slot.itemId] ?? 0) > 0 &&
              (d?.zone === 'live_seafood' || d?.zone === 'ice_seafood')
            );
          })
          .sort((a, b) => a.stock / a.maxStock - b.stock / b.maxStock)[0];
        if (liveLow) {
          s.taskQueue.push(
            {
              type: 'PICKUP_SEAFOOD',
              targetX: STATIONS.COLD_PREP.x - 10,
              targetY: STATIONS.COLD_PREP.y + 44,
              duration: 0.45,
            },
            {
              type: 'RESTOCK_BUFFET',
              targetX: liveLow.x,
              targetY: liveLow.y + 34,
              targetId: liveLow.slotIndex,
              duration: 0.55,
            }
          );
          s.activeTaskLabel = '巡检补货活鲜池';
        } else {
          s.activeTaskLabel = '看护活鲜暂养池';
        }
        break;
      }

      case 'SUSHI_CHEF': {
        const sushiLow =
          world.buffetSlots
            .filter((slot) => {
              const d = SEAFOOD_CATALOG.find((item) => item.id === slot.itemId);
              return (
                slot.stock < slot.maxStock * 0.85 &&
                (world.warehouseStock[slot.itemId] ?? 0) > 0 &&
                (d?.zone === 'sashimi_sushi' || d?.zone === 'drinks_dessert')
              );
            })
            .sort((a, b) => a.stock / a.maxStock - b.stock / b.maxStock)[0] ||
          world.buffetSlots.find(
            (slot) => slot.stock < slot.maxStock * 0.6 && (world.warehouseStock[slot.itemId] ?? 0) > 0
          );
        if (sushiLow) {
          s.taskQueue.push(
            {
              type: 'PICKUP_SEAFOOD',
              targetX: STATIONS.COLD_PREP.x - 10,
              targetY: STATIONS.COLD_PREP.y + 44,
              duration: 0.45,
            },
            {
              type: 'RESTOCK_BUFFET',
              targetX: sushiLow.x,
              targetY: sushiLow.y + 34,
              targetId: sushiLow.slotIndex,
              duration: 0.55,
            }
          );
          s.activeTaskLabel = '现切摆盘刺身台';
        } else {
          s.activeTaskLabel = '刺身明档值守';
        }
        break;
      }

      case 'TECHNICIAN': {
        s.activeTaskLabel =
          world.equipmentHealth < 92 || world.restroomCleanliness < 92
            ? '巡检设备间与洗手间'
            : '冷链设备值守中';
        break;
      }

      case 'INVENTORY_CLERK': {
        // Helps carry cold-storage restock during urgent shortage; auto-orders at closing!
        const urgentSlot = world.buffetSlots
          .filter(
            (slot) =>
              slot.stock <= Math.max(1, slot.maxStock * 0.35) &&
              (world.warehouseStock[slot.itemId] ?? 0) > 0
          )
          .sort((a, b) => a.stock - b.stock)[0];
        if (urgentSlot) {
          s.taskQueue.push(
            {
              type: 'PICKUP_SEAFOOD',
              targetX: STATIONS.COLD_PREP.x - 10,
              targetY: STATIONS.COLD_PREP.y + 44,
              duration: 0.5,
            },
            {
              type: 'RESTOCK_BUFFET',
              targetX: urgentSlot.x,
              targetY: urgentSlot.y + 34,
              targetId: urgentSlot.slotIndex,
              duration: 0.6,
            }
          );
          s.activeTaskLabel = '紧急调拨后场库存';
        } else {
          s.activeTaskLabel = '盘点冷链库存（闭店自动采购）';
        }
        break;
      }
    }

    if (s.taskQueue.length === 0) {
      s.idleTimer += dt;
      const distHome = Math.hypot(s.homeX - s.x, s.homeY - s.y);
      if (s.idleTimer > 1.2 && distHome > 18) {
        s.taskQueue.push({
          type: 'WALK_TO',
          targetX: s.homeX,
          targetY: s.homeY,
        });
        s.idleTimer = 0;
      }
    } else {
      s.idleTimer = 0;
    }
  }
}

function settleCustomerBill(world: GameWorld, table: DiningTable) {
  const cust = table.customer;
  if (!cust) return;

  const charDef = getCharacterDef(world.characterId);
  const stockerTipBonus = getBestStaffBonus(world, 'STOCKER');
  const setterTipBonus = table.setterBonus > 0 ? table.setterBonus * 0.005 : 0;

  const stockoutDiscount = cust.stockoutHits >= 2 ? 0.55 : cust.stockoutHits === 1 ? 0.8 : 1.0;
  const ticketPaid = Math.round(cust.ticketPrice * stockoutDiscount);

  let tip = 0;
  if (cust.satisfaction >= 68 && cust.stockoutHits === 0) {
    const sushiBonus = getBestStaffBonus(world, 'SUSHI_CHEF');
    const chefBonus = getMaxStaffTierForRole(world, 'CHEF') * 0.06;
    const partnerState = world.activePartnerId ? world.specialStaffBonds[world.activePartnerId] : null;
    const partnerTipBuff =
      partnerState && partnerState.partnerBond >= 70
        ? partnerState.relationship === 'MARRIED'
          ? 0.2
          : partnerState.relationship === 'DATING'
            ? 0.12
            : 0
        : 0;
    const policyTipBonus = evaluatePolicyBonuses(world).tipBonus;
    const tycoonTipBonus = evaluateTycoonModifiers(world).tipBonus;
    const baseTipRate =
      (cust.satisfaction - 58) / 140 +
      stockerTipBonus +
      sushiBonus +
      chefBonus +
      partnerTipBuff +
      setterTipBonus +
      table.brothBonus * 0.2 +
      charDef.bonuses.tipMultiplierBonus +
      world.finaleTipBonus +
      policyTipBonus +
      tycoonTipBonus;
    tip = Math.max(8, Math.round(ticketPaid * baseTipRate) + cust.bonusTip);
  }

  const totalEarned = ticketPaid + tip;
  world.cash += totalEarned;
  world.totalCashEarned += totalEarned;
  world.todayStats.ticketRevenue += ticketPaid;
  world.todayStats.tipRevenue += tip;
  world.todayStats.guestsServed += 1;
  world.totalGuestsServed += 1;
  if (cust.isVip) world.todayStats.vipServed += 1;

  if (cust.satisfaction >= 80 && cust.stockoutHits === 0) {
    changeReputation(world, cust.isSuperCustomer ? 5 : cust.isVip ? 3 : 1.5);
  } else if (cust.satisfaction < 55 || cust.stockoutHits >= 2) {
    changeReputation(world, -3);
  }

  sound.playCoin();
  spawnParticles(world, table.x, table.y - 10, 'SPARKLE', cust.isSuperCustomer ? 12 : 7);
  addFloatingText(
    world,
    table.x,
    table.y - 34,
    cust.isSuperCustomer
      ? `超级VIP结账 +¥${ticketPaid} (打赏+¥${tip})`
      : tip > 0
      ? `+¥${ticketPaid} (小费+¥${tip})`
      : `+¥${ticketPaid}`,
    '#F7D060',
    cust.isSuperCustomer ? 16 : 15
  );

  // Process special customer storyline progression!
  if (cust.specialStoryId) {
    handleSpecialCustomerFinished(world, cust);
  }

  table.customer = null;
  table.status = 'DIRTY';
  table.dirtyTime = 0;
  table.reservedByStaffId = null;
}

function applyStaffPromotionStats(s: HiredStaff, nextTier: StaffTier) {
  s.tier = nextTier;
  s.dailyWage = Math.round(38 * (nextTier === 2 ? 1.7 : nextTier === 3 ? 2.8 : 4.5));
  s.moveSpeed = Math.round(122 + (nextTier - 1) * 44);
  s.workSpeed = Number((0.95 + (nextTier - 1) * 0.65).toFixed(2));
  s.carryCapacity = nextTier === 2 ? 2 : nextTier === 3 ? 3 : 4;

  switch (s.role) {
    case 'HOST':
      s.bonusValue = nextTier === 2 ? 0.28 : nextTier === 3 ? 0.45 : 0.65;
      s.bonusTitle = nextTier >= 3 ? '礼宾安抚 · 招揽VIP' : '亲和迎宾';
      s.bonusDetail = `排队耐心衰减-${Math.round(s.bonusValue * 100)}%，带位自带+${nextTier * 4}好感${nextTier >= 3 ? `，VIP率+${nextTier * 5}%` : ''}`;
      break;
    case 'STOCKER':
      s.bonusValue = nextTier === 2 ? 0.12 : nextTier === 3 ? 0.22 : 0.35;
      s.bonusTitle = nextTier >= 3 ? '米其林冰台摆盘' : '保鲜补菜';
      s.bonusDetail = `单次补货×${s.carryCapacity}倍，全店小费+${Math.round(s.bonusValue * 100)}%，食材损耗-${nextTier * 8}%`;
      break;
    case 'RUNNER':
      s.bonusValue = nextTier === 2 ? 0.18 : nextTier === 3 ? 0.32 : 0.5;
      s.bonusTitle = nextTier >= 3 ? '沸鼎飘香加速' : '稳妥上锅';
      s.bonusDetail = `上锅后小费+${Math.round(s.bonusValue * 100)}%，顾客就餐满意度+${nextTier * 5}，翻台提速+${nextTier * 8}%`;
      break;
    case 'BUSSER':
      s.bonusValue = nextTier === 2 ? 3.5 : nextTier === 3 ? 6 : 10;
      s.bonusTitle = nextTier >= 3 ? '无痕除味净化' : '细致保洁';
      s.bonusDetail = `每收一桌恢复卫生+${s.bonusValue}，减少脏桌卫生扣除${nextTier * 12}%`;
      break;
    case 'DISHWASHER':
      s.bonusValue = nextTier === 2 ? 2 : nextTier === 3 ? 3 : 5;
      s.bonusTitle = nextTier >= 3 ? '高温杀菌闪亮' : '高效洗刷';
      s.bonusDetail = `单次洗净${s.bonusValue}套餐具，洗碗额外提升店铺卫生+${nextTier * 1.2}`;
      break;
    case 'SETTER':
      s.bonusValue = nextTier === 2 ? 14 : nextTier === 3 ? 24 : 38;
      s.bonusTitle = nextTier >= 3 ? '星级仪式摆台' : '齐整餐具';
      s.bonusDetail = `单次可携${s.carryCapacity}套餐具，该桌顾客初始耐心+${s.bonusValue}%，好评小费+${nextTier * 6}%`;
      break;
    case 'CHEF':
      s.bonusValue = nextTier === 2 ? 2 : nextTier === 3 ? 3 : 5;
      s.bonusTitle = nextTier >= 3 ? '铁板明档大厨' : '熟食现烹';
      s.bonusDetail = `单次出菜${s.bonusValue}份热菜熟食，熟食区小费+${nextTier * 8}%，损耗更低`;
      break;
    case 'LIVE_MASTER':
      s.bonusValue = nextTier === 2 ? 0.14 : nextTier === 3 ? 0.24 : 0.36;
      s.bonusTitle = nextTier >= 3 ? '海鲜池宗师' : '活鲜照料';
      s.bonusDetail = `自动维持暂养池高含氧，活鲜区小费+${Math.round(s.bonusValue * 100)}%，补货更稳`;
      break;
    case 'SUSHI_CHEF':
      s.bonusValue = nextTier === 2 ? 0.16 : nextTier === 3 ? 0.28 : 0.42;
      s.bonusTitle = nextTier >= 3 ? '板前刺身名匠' : '日料切配';
      s.bonusDetail = `刺身档口精致出品，高消费客群小费+${Math.round(s.bonusValue * 100)}%`;
      break;
    case 'TECHNICIAN':
      s.bonusValue = nextTier === 2 ? 1.5 : nextTier === 3 ? 2.4 : 3.6;
      s.bonusTitle = nextTier >= 3 ? '冷链机电专家' : '设备巡检';
      s.bonusDetail = `自动维护设备间与卫生间洁净度，大幅降低故障与食安风险`;
      break;
    case 'INVENTORY_CLERK':
      s.bonusValue = nextTier === 2 ? 0.12 : nextTier === 3 ? 0.18 : 0.25;
      s.bonusTitle = nextTier >= 3 ? '海港大宗议价师' : '智能闭店补仓';
      s.bonusDetail = `每日闭店自动补购低库存菜品与原料（次日闭店入库），采购成本 -${Math.round(s.bonusValue * 100)}%`;
      break;
  }
}

function applyCompletedOrder(world: GameWorld, order: PendingOrder): string | null {
  switch (order.type) {
    case 'HIRE_STAFF': {
      const cand = order.candidate;
      if (!cand) return null;
      const meta = STAFF_ROLE_META[cand.role];
      const sameRoleCount = world.staff.filter((s) => s.role === cand.role).length;
      const offset = sameRoleCount * 22;
      const hired: HiredStaff = {
        ...cand,
        id: nextUid('staff'),
        x: meta.homeX + offset,
        y: meta.homeY,
        homeX: meta.homeX + offset,
        homeY: meta.homeY,
        carrying: 'NONE',
        carryAmount: 0,
        carryBrothId: null,
        taskQueue: [],
        activeTaskLabel: '今晨报到上岗',
        idleTimer: 0,
        walkCycle: 0,
        tasksCompleted: 0,
        fatigue: 0,
        morale: 92,
      };
      world.staff.push(hired);
      spawnParticles(world, hired.x, hired.y, 'SPARKLE', 10);
      return `新员工「${hired.name}（${meta.title}）」今晨正式报到上岗！`;
    }

    case 'PROMOTE_STAFF': {
      const s = world.staff.find((st) => st.id === order.staffId);
      if (!s || !order.targetNumber) return null;
      const nextTier = Math.min(4, Math.max(2, order.targetNumber)) as StaffTier;
      applyStaffPromotionStats(s, nextTier);
      spawnParticles(world, s.x, s.y, 'SPARKLE', 10);
      return `「${s.name}」深造归来，正式晋升为 ${nextTier} 星骨干！`;
    }

    case 'FIRE_STAFF': {
      const idx = world.staff.findIndex((st) => st.id === order.staffId);
      if (idx === -1) return null;
      const removed = world.staff[idx];
      for (const t of world.tables) {
        if (t.reservedByStaffId === removed.id) t.reservedByStaffId = null;
      }
      world.staff.splice(idx, 1);
      return `「${removed.name}」已完成交接离职（节省日薪 ¥${removed.dailyWage}）。`;
    }

    case 'UNLOCK_SEAFOOD': {
      const itemId = order.targetId;
      if (!itemId || world.unlockedSeafoodIds.includes(itemId)) return null;
      const def = SEAFOOD_CATALOG.find((s) => s.id === itemId);
      if (!def) return null;
      world.unlockedSeafoodIds.push(itemId);
      if (isAvailableInSeason(def.seasons, world.season) && !world.activeSeafoodIds.includes(itemId)) {
        world.activeSeafoodIds.push(itemId);
      }
      rebuildActiveBuffetSlots(world);
      changeReputation(world, 3);
      return `冷链菜品「${def.name}」今晨到货解锁！可在菜单配置中自由上架或下架。`;
    }

    case 'UNLOCK_BROTH': {
      const brothId = order.targetId;
      if (!brothId || world.unlockedBrothIds.includes(brothId)) return null;
      const def = BROTH_CATALOG.find((b) => b.id === brothId);
      if (!def) return null;
      world.unlockedBrothIds.push(brothId);
      if (isAvailableInSeason(def.seasons, world.season) && !world.activeBrothIds.includes(brothId)) {
        world.activeBrothIds.push(brothId);
      }
      changeReputation(world, 2);
      return `新锅底「${def.name}」试煮成功，今日起可配置供应！`;
    }

    case 'UNLOCK_ZONE': {
      const zoneId = order.targetId as BuffetZoneId | undefined;
      if (!zoneId || world.unlockedZones.includes(zoneId)) return null;
      const zDef = getBuffetZoneDef(zoneId);
      world.unlockedZones.push(zoneId);
      if (zoneId === 'cooked_hot') {
        world.cookedMaxStock += 4;
      }
      changeReputation(world, 5);
      return `扩建分区「${zDef.name}」正式竣工开放！已解锁对应高端菜品与专属岗位招聘！`;
    }

    case 'UPGRADE_SHOP': {
      const targetLv = order.targetNumber;
      if (!targetLv || targetLv <= world.shopLevel) return null;
      const cfg = getShopConfig(targetLv);
      world.shopLevel = cfg.level;
      world.rawIngredientsMax += 15;
      world.cookedMaxStock += 2;
      changeReputation(world, 6);
      return `门店装潢竣工！正式晋升为 Lv.${cfg.level}「${cfg.title}」！`;
    }

    case 'EXPAND_TABLES': {
      const targetTables = order.targetNumber;
      if (!targetTables || targetTables <= world.tableLimit) return null;
      const prevLimit = world.tableLimit;
      world.tableLimit = targetTables;
      const newlyUnlocked = TABLE_UNLOCK_ORDER.slice(prevLimit, world.tableLimit);
      for (const idx of newlyUnlocked) {
        const table = world.tables[idx];
        if (table && table.status === 'LOCKED') {
          table.status = 'NEEDS_TABLEWARE';
          spawnParticles(world, table.x, table.y, 'SPARKLE', 8);
        }
      }
      world.dishwareMax += 2;
      world.cleanDishes += 2;
      return `大厅扩建竣工！现开放至 ${world.tableLimit} 张餐桌（附赠 2 套餐具），请在开店前摆台。`;
    }

    case 'UPGRADE_DISHWARE': {
      const targetMax = order.targetNumber;
      if (!targetMax || targetMax <= world.dishwareMax) return null;
      const diff = targetMax - world.dishwareMax;
      world.dishwareMax = targetMax;
      world.cleanDishes += diff;
      return `消毒餐具库安装完毕！干净餐具容量扩充至 ${world.dishwareMax} 套（+${diff}）。`;
    }

    case 'UPGRADE_BUFFET': {
      const targetBonus = order.targetNumber;
      if (typeof targetBonus !== 'number') return null;
      const charExtra = getCharacterDef(world.characterId).bonuses.buffetCapacityExtra;
      world.buffetCapacityBonus = Math.max(world.buffetCapacityBonus, targetBonus + charExtra);
      rebuildActiveBuffetSlots(world);
      return `海鲜冰台扩容改装竣工！单格盛放量大幅提升。`;
    }

    case 'UNLOCK_TECH_NODE': {
      if (!order.targetId) return null;
      return applyCompletedTechNode(world, order.targetId);
    }
  }
}

export function openShopForBusiness(world: GameWorld): boolean {
  if (world.phase !== 'PREP') return false;
  world.phase = 'PLAYING';
  world.dayTime = 0;
  world.rushHourActive = false;
  world.spawnTimer = 1.4;
  world.morningReport = [];
  if (world.player.taskQueue.length === 0) {
    world.player.activeTaskLabel = '开门迎客中 · 点击工位/餐桌或使用方向键';
  }
  sound.playOpenShop();
  addFloatingText(world, CANVAS_WIDTH / 2, 180, `第 ${world.day} 天正式开门迎客！`, '#F1BE51', 18);
  addAlert(world, `11:00 挂牌开市！第 ${world.day} 天正式开始营业。`, 'info');
  return true;
}

export function enterClosingPhase(world: GameWorld) {
  if (world.phase !== 'PLAYING') return;
  world.phase = 'CLOSING';
  world.rushHourActive = false;
  world.dayTime = world.dayDuration;

  if (world.queue.length > 0) {
    world.queue = [];
    addAlert(world, '22:00 营业时间结束，门口尚未入座的候客礼貌离去。', 'info');
  }

  // 1) Deliver orders placed on previous closing day ("第二天关店后才能进来")
  deliverArrivedWarehouseOrders(world);

  // 2) If an Inventory Clerk is hired, automatically inspect & place today's closing procurement orders!
  runInventoryClerkAutoOrders(world);

  // NEVER auto-settle! Always let player finish cleaning, order stock, play closing staff stories, and manually click settle!
  sound.playClosingBell();
  const isInspectionNight =
    world.day > 0 &&
    world.day % INSPECTION_INTERVAL_DAYS === 0 &&
    world.lastInspectionDay !== world.day;
  addFloatingText(
    world,
    CANVAS_WIDTH / 2,
    180,
    isInspectionNight
      ? '22:00 闭店收尾 · 今晚将迎半月联合检查组！'
      : '22:00 停止迎新 · 闭店收尾（可后场采购并手动结算）',
    '#FBBF24',
    15
  );
  addAlert(
    world,
    isInspectionNight
      ? `【半月联合检查】第 ${world.day} 天已闭店！请尽快收净脏桌脏碗、巡检设备与冷库备货，点击「手动打烊结算」时检查组将正式进店核查！`
      : '22:00 已进入闭店收尾！可点击员工交谈、在后场「冷链库房」补购库存，收尾妥当后点击右下角「手动打烊结算」。',
    'warning'
  );
  saveGameToSlot(world, 'auto');
}

export function completeClosingAndSettle(world: GameWorld, manualEarly = false): boolean {
  if (world.phase !== 'CLOSING') return false;
  const prog = getClosingProgress(world);
  if (prog.seatedGuests > 0) {
    addAlert(world, `店内仍有 ${prog.seatedGuests} 桌顾客未用餐完毕，请接待结账后再手动结算！`, 'warning');
    return false;
  }

  if (prog.allClean) {
    world.hygiene = Math.min(100, world.hygiene + 6);
    world.closingCleanBonusAwarded = true;
    addAlert(world, '闭店清场整洁无遗漏！获得打烊卫生奖励 +6。', 'success');
  } else if (manualEarly) {
    world.closingCleanBonusAwarded = false;
    addAlert(world, '已手动提前结账，未清理的脏桌与餐具将留待明日开店前处理。', 'info');
  }

  // Trigger Half-Month Periodic Joint Inspection every 15 days after closing!
  if (
    world.day > 0 &&
    world.day % INSPECTION_INTERVAL_DAYS === 0 &&
    world.lastInspectionDay !== world.day
  ) {
    const inspectionModal = runHalfMonthInspection(world);
    world.pendingStoryModal = inspectionModal;
    if (inspectionModal.inspectionScorecard?.grade === '不合格') {
      sound.playPenalty();
    } else {
      sound.playStoryFanfare();
    }
    addAlert(
      world,
      `【半月联合检查】${inspectionModal.inspectionScorecard?.summaryRewardText ?? inspectionModal.headline}`,
      inspectionModal.inspectionScorecard?.grade === '不合格' ? 'penalty' : 'success'
    );
    return true;
  }

  finishBusinessDay(world);
  return true;
}

export function finishBusinessDay(world: GameWorld) {
  for (const t of world.tables) {
    if (t.status === 'DINING' && t.customer) {
      settleCustomerBill(world, t);
    } else if (t.status === 'WAITING_BROTH' && t.customer) {
      t.customer = null;
      t.status = 'READY';
    }
    t.reservedByStaffId = null;
  }

  world.queue = [];

  const wages = world.staff.reduce((sum, s) => sum + s.dailyWage, 0);
  const rent = getShopConfig(world.shopLevel).baseRent;
  world.todayStats.staffWages = wages;
  world.todayStats.rentCost = rent;

  world.cash -= wages + rent;
  world.totalDaysSurvived = world.day;

  // Deduct emergency small-business loan daily installment if active
  if (world.loan.remainingPrincipal > 0) {
    const pay = Math.min(world.loan.remainingPrincipal, world.loan.dailyInstallment);
    world.cash -= pay;
    world.loan.remainingPrincipal = Math.max(0, world.loan.remainingPrincipal - pay);
    world.loan.daysRemaining = Math.max(0, world.loan.daysRemaining - 1);
    if (world.loan.remainingPrincipal === 0) {
      world.loan.dailyInstallment = 0;
      world.loan.daysRemaining = 0;
      addAlert(world, `【银团周转贷】今日扣收 ¥${pay}，全部借款本息已结清！`, 'success');
    } else {
      addAlert(
        world,
        `【银团周转贷】自动扣收当日分期 ¥${pay}，尚余本息 ¥${world.loan.remainingPrincipal}（剩 ${world.loan.daysRemaining} 天）。`,
        'info'
      );
    }
  }

  // Record 14-day business review history
  const dayRev = world.todayStats.ticketRevenue + world.todayStats.tipRevenue;
  const dayCost =
    world.todayStats.ingredientCost +
    world.todayStats.staffWages +
    world.todayStats.rentCost +
    world.todayStats.penaltyFines;
  world.dailyHistory.push({
    day: world.day,
    season: world.season,
    revenue: dayRev,
    cost: dayCost,
    profit: dayRev - dayCost,
    guests: world.todayStats.guestsServed,
    reputation: Math.round(world.reputation),
    hygiene: Math.round(world.hygiene),
    walkouts: world.todayStats.walkouts,
    stockouts: world.totalStockoutComplaints,
    weather: world.weather,
    holiday: world.holiday,
  });
  if (world.dailyHistory.length > 14) {
    world.dailyHistory = world.dailyHistory.slice(-14);
  }

  // Sync cross-run encyclopedia & unlock achievements!
  const newlyUnlockedTitles = syncWorldToEncyclopedia(world);
  if (newlyUnlockedTitles.length > 0) {
    for (const title of newlyUnlockedTitles) {
      addAlert(world, `【成就达成】解锁勋章「${title}」！可在图鉴馆中查阅收藏。`, 'success');
    }
  }

  if (
    world.penaltyStrikes > 0 &&
    world.todayStats.walkouts === 0 &&
    world.todayStats.healthInspectionsFailed === 0 &&
    world.hygiene >= 85
  ) {
    world.penaltyStrikes = Math.max(0, world.penaltyStrikes - 1);
    addAlert(world, '今日零客诉且高卫生达标，监管部门撤销 1 次违规记点！', 'success');
  }

  checkGameOver(world);
  if (world.phase !== 'GAME_OVER') {
    world.phase = 'DAY_SUMMARY';
    sound.playDaySummary();
  }
}

export function startNextDay(world: GameWorld) {
  world.day += 1;
  world.dayTime = 0;
  world.rushHourActive = false;
  world.spawnTimer = 1.6;
  world.closingCleanBonusAwarded = false;
  world.specialVisitCooldown = Math.min(world.specialVisitCooldown, 14);
  world.incidentsTriggeredToday = 0;
  world.incidentCooldown = 20 + Math.random() * 16;
  world.facilityEventsDoneToday = [];
  world.staffChattedTodayIds = [];
  world.attendanceCheckedToday = false;
  world.dormFeastDoneToday = false;
  world.regimeSwitchCooldown = Math.max(0, world.regimeSwitchCooldown - 1);
  world.activeScene = 'DINING_HALL';
  world.player.taskQueue = [];
  world.player.activeTaskLabel = '开店前准备中 · 可摆台/备菜/烹熟食或巡视场馆';

  // Advance Four Seasons calendar! (5 days per season)
  let seasonChangedMsg: string | null = null;
  world.dayInSeason += 1;
  if (world.dayInSeason > DAYS_PER_SEASON) {
    world.dayInSeason = 1;
    const curIdx = SEASON_ORDER.indexOf(world.season);
    const nextIdx = (curIdx + 1) % SEASON_ORDER.length;
    world.season = SEASON_ORDER[nextIdx];
    if (nextIdx === 0) {
      world.year += 1;
    }
    const newSeasonDef = getSeasonDef(world.season);
    seasonChangedMsg = `节气更迭！进入第 ${world.year} 年「${newSeasonDef.name}」（食材成本 ×${newSeasonDef.costMultiplier}，客流 ×${newSeasonDef.customerRateMult}）！`;

    // Filter out off-season active dishes & broths automatically
    world.activeSeafoodIds = world.activeSeafoodIds.filter((id) => {
      const def = SEAFOOD_CATALOG.find((s) => s.id === id);
      return def ? isAvailableInSeason(def.seasons, world.season) : false;
    });
    if (world.activeSeafoodIds.length < 2) {
      for (const id of world.unlockedSeafoodIds) {
        const def = SEAFOOD_CATALOG.find((s) => s.id === id);
        if (def && isAvailableInSeason(def.seasons, world.season) && !world.activeSeafoodIds.includes(id)) {
          world.activeSeafoodIds.push(id);
        }
      }
    }
    world.activeBrothIds = world.activeBrothIds.filter((id) => {
      const def = BROTH_CATALOG.find((b) => b.id === id);
      return def ? isAvailableInSeason(def.seasons, world.season) : false;
    });
    if (world.activeBrothIds.length === 0) {
      world.activeBrothIds = ['spicy_tallow', 'seafood_clear'];
    }
  }

  // Return carried dishes, handle overnight dormitory rest, and expire part-time contracts
  const expiredPartTimers: string[] = [];
  for (let i = world.staff.length - 1; i >= 0; i--) {
    const s = world.staff[i];
    s.taskQueue = [];
    if (s.carrying === 'CLEAN_TABLEWARE') {
      world.cleanDishes = Math.min(world.dishwareMax, world.cleanDishes + s.carryAmount);
    } else if (s.carrying === 'DIRTY_DISHES') {
      world.dirtyDishes = Math.min(world.dishwareMax, world.dirtyDishes + s.carryAmount);
    }
    s.carrying = 'NONE';
    s.carryAmount = 0;
    s.carryBrothId = null;
    s.x = s.homeX;
    s.y = s.homeY;
    s.fatigue = Math.max(0, s.fatigue - 38);

    if (s.isPartTime && typeof s.remainingDays === 'number') {
      s.remainingDays -= 1;
      if (s.remainingDays <= 0) {
        expiredPartTimers.push(s.name);
        world.staff.splice(i, 1);
      }
    }
  }

  if (world.player.carrying === 'CLEAN_TABLEWARE') {
    world.cleanDishes = Math.min(world.dishwareMax, world.cleanDishes + world.player.carryAmount);
  } else if (world.player.carrying === 'DIRTY_DISHES') {
    world.dirtyDishes = Math.min(world.dishwareMax, world.dirtyDishes + world.player.carryAmount);
  }
  world.player.carrying = 'NONE';
  world.player.carryAmount = 0;
  world.player.carryBrothId = null;

  // Partner relationship maintenance daily check!
  if (world.activePartnerId) {
    const pBond = world.specialStaffBonds[world.activePartnerId];
    const pDef = getSpecialStaffDef(world.activePartnerId);
    if (pBond.relationship === 'DATING' || pBond.relationship === 'MARRIED') {
      if (!pBond.wishFulfilledToday) {
        pBond.daysSinceDate += 1;
        if (pBond.daysSinceDate >= 2) {
          pBond.partnerBond = Math.max(20, pBond.partnerBond - 12);
          addAlert(
            world,
            `【伴侣思念】你已连续 ${pBond.daysSinceDate} 天没抽出时间陪伴「${pDef.name}」，亲密度降至 ${Math.round(pBond.partnerBond)}%，快去宿舍/办公室满足 TA 的心愿吧！`,
            'warning'
          );
        }
      }
      pBond.wishFulfilledToday = false;
      if (!pBond.currentWish) {
        pBond.currentWish = pDef.wishes[world.day % pDef.wishes.length];
      }
    }
  }

  // Advance scheduled orders
  const remainingOrders: PendingOrder[] = [];
  const reports: string[] = [];
  if (seasonChangedMsg) reports.push(seasonChangedMsg);
  if (expiredPartTimers.length > 0) {
    reports.push(`兼职合约期满离岗：${expiredPartTimers.join('、')}`);
  }
  for (const order of world.pendingOrders) {
    order.daysRemaining -= 1;
    if (order.daysRemaining <= 0) {
      const msg = applyCompletedOrder(world, order);
      if (msg) reports.push(msg);
    } else {
      remainingOrders.push(order);
    }
  }
  const tycoonReports = advanceDailyTycoonEvents(world);
  reports.unshift(...tycoonReports);

  if (world.day % INSPECTION_INTERVAL_DAYS === 0) {
    reports.unshift(
      `【半月检查预告】今天是第 ${world.day} 天，今晚闭店后联合检查组将查验设备运行、卫生洁净与冷链备货，请提前检修巡查！`
    );
  }
  world.pendingOrders = remainingOrders;
  world.morningReport = reports;

  syncActiveMenuFromPolicySlots(world, false);
  world.candidates = generateCandidatePool(world.shopLevel, world.unlockedZones);
  world.todayStats = createEmptyDailyStats(world.day, world.shopLevel);

  world.phase = 'PREP';
  if (reports.length > 0) {
    reports.forEach((r) => addAlert(world, `【今晨动态】${r}`, 'success'));
    sound.playUpgrade();
  } else {
    sound.playClick();
  }
  addAlert(
    world,
    `第 ${world.year} 年${getSeasonDef(world.season).shortName}季 · 第 ${world.day} 天「开店前准备」开始！可配置菜品/餐位、触发特聘伙伴剧情或巡视7大场馆。`,
    'info'
  );
  saveGameToSlot(world, 'auto');
}

export function claimCurrentChapter(world: GameWorld): boolean {
  if (world.mainStoryCompleted) return false;
  const { allDone } = evaluateChapterObjectives(world);
  if (!allDone) return false;

  const chDef = MAIN_CHAPTERS[world.mainChapter - 1];
  const charDef = getCharacterDef(world.characterId);
  const script = MAIN_CHAPTER_SCRIPTS[chDef.chapter];

  world.cash += chDef.rewardCash;
  world.totalCashEarned += chDef.rewardCash;
  changeReputation(world, chDef.rewardReputation);
  sound.playStoryFanfare();

  if (world.mainChapter >= MAIN_CHAPTERS.length) {
    world.mainStoryCompleted = true;
    world.finaleTipBonus = 0.3;
    world.pendingStoryModal = {
      id: nextUid('ch_finale'),
      category: 'FINALE',
      badge: script.badge,
      speakerName: charDef.name,
      speakerTitle: `${charDef.title} · 传奇店长`,
      accentColor: '#E5A93B',
      headline: script.headline,
      body: chDef.completionNarrative,
      lines: script.lines(charDef.name),
      choices: script.choices,
      rewardHighlight: chDef.rewardNote,
      triggersEndingAfterClose: true,
    };
    addAlert(world, `主线终章达成！做出最终抉择即可见证店铺、角色、特殊店员与时代的四维史诗结局！`, 'success');
  } else {
    const nextCh = MAIN_CHAPTERS[world.mainChapter];
    world.mainChapter += 1;
    world.specialVisitCooldown = Math.min(world.specialVisitCooldown, 6);
    world.pendingStoryModal = {
      id: nextUid('ch_done'),
      category: 'MAIN_CHAPTER',
      badge: script.badge,
      speakerName: charDef.name,
      speakerTitle: charDef.title,
      accentColor: charDef.accentColor,
      headline: `${chDef.title} · ${script.headline}`,
      body: `${chDef.completionNarrative}\n\n【下一阶段 · ${nextCh.title}】${nextCh.narrative}`,
      lines: script.lines(charDef.name),
      choices: script.choices,
      rewardHighlight: chDef.rewardNote,
    };
    addAlert(world, `完成「${chDef.title}」并获得 ¥${chDef.rewardCash}！推进至「${nextCh.title}」。`, 'success');
  }

  return true;
}

export function tickWorld(world: GameWorld, rawDt: number) {
  // Pause simulation while reading a story modal or outside active phases
  if (!isActivePlayPhase(world.phase) || world.pendingStoryModal) return;

  // Auto-trigger Main Story chapter dialogue immediately once all chapter objectives are met!
  if (!world.mainStoryCompleted && evaluateChapterObjectives(world).allDone) {
    claimCurrentChapter(world);
    return;
  }

  const dt = Math.min(rawDt, 0.05) * world.speedMultiplier;
  const charDef = getCharacterDef(world.characterId);
  const isPrep = world.phase === 'PREP';
  const isPlaying = world.phase === 'PLAYING';
  const isClosing = world.phase === 'CLOSING';

  if (isPlaying) {
    world.dayTime += dt;

    const progress = world.dayTime / world.dayDuration;
    const isRush = (progress > 0.14 && progress < 0.34) || (progress > 0.58 && progress < 0.85);
    if (isRush && !world.rushHourActive) {
      world.rushHourActive = true;
      sound.playRushWarning();
      addAlert(world, '用餐高峰期到来！客流加快，注意补菜、上锅与收桌卫生。', 'warning');
    } else if (!isRush && world.rushHourActive) {
      world.rushHourActive = false;
    }

    if (world.dayTime >= world.dayDuration) {
      enterClosingPhase(world);
      return;
    }

    // 0. In-service unexpected incidents & branching side-quests!
    if (
      progress >= 0.24 &&
      progress <= 0.8 &&
      world.incidentsTriggeredToday < 1 &&
      !world.pendingStoryModal
    ) {
      world.incidentCooldown -= dt;
      if (world.incidentCooldown <= 0) {
        const incident = pickServiceIncident(world);
        if (incident) {
          world.incidentsTriggeredToday += 1;
          world.pendingStoryModal = incident;
          sound.playSpecialArrival();
          addAlert(world, `【营业突发事件】${incident.headline}`, 'warning');
          return;
        }
        world.incidentCooldown = 24;
      }
    }

    // 1. Hidden special customer organic discovery & arrival
    world.specialVisitCooldown -= dt;
    if (
      world.specialVisitCooldown <= 0 &&
      world.queue.length < 5 &&
      progress < 0.82 &&
      !hasActiveSpecialCustomer(world)
    ) {
      const storyId = pickEligibleSpecialStory(world);
      if (storyId) {
        const def = getSpecialStoryDef(storyId);
        const prog = world.specialStories[storyId];
        const firstDiscovery = !prog.discovered;
        prog.discovered = true;

        const party = createSpecialCustomerParty(world, storyId);
        world.queue.push({
          id: party.id,
          party,
          x: 86,
          y: 304 + world.queue.length * 54,
          waitTime: 0,
        });
        repositionQueue(world);
        world.specialVisitCooldown = Math.max(20, 30 - world.mainChapter * 2);
        sound.playSpecialArrival();
        addFloatingText(
          world,
          STATIONS.RECEPTION.x + 24,
          286,
          firstDiscovery ? `发现奇遇食客「${def.customerName}」！` : `熟客「${def.customerName}」再度登门！`,
          def.color,
          15
        );
        addAlert(
          world,
          firstDiscovery
            ? `【发现新奇遇】气度不凡的食客「${def.customerName}（${def.roleTitle}）」来到门口排队！已自动记录至「剧情」见闻录，妥善接待以探寻隐秘机缘。`
            : `奇遇食客「${def.customerName}（${def.roleTitle}）」再次来到门口排队！请务必优质接待。`,
          'success'
        );
      } else {
        world.specialVisitCooldown = 16;
      }
    }

    // 2. Spawn regular / VIP / Super customers (affected by Season, Ticket Filter, Weather/Holiday/Marketing/Rivals!)
    const shopCfg = getShopConfig(world.shopLevel);
    const seasonDef = getSeasonDef(world.season);
    const filterPreview = getTicketFilterPreview(world);
    const tycoonTickMods = evaluateTycoonModifiers(world);
    const repFactor = 0.55 + (world.reputation / 100) * 0.85;
    const rushFactor = world.rushHourActive ? 1.45 : 1.0;
    const tableFactor = 0.8 + (world.tableLimit / 12) * 0.7;
    const baseInterval =
      8.4 /
      (shopCfg.customerRate *
        seasonDef.customerRateMult *
        filterPreview.demandMultiplier *
        tycoonTickMods.customerRateMult *
        repFactor *
        rushFactor *
        tableFactor);

    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0 && world.queue.length < 6 && progress < 0.92) {
      const party = createCustomerParty(world);
      world.queue.push({
        id: party.id,
        party,
        x: 86,
        y: 304 + world.queue.length * 54,
        waitTime: 0,
      });
      repositionQueue(world);
      if (party.isSuperCustomer) {
        addAlert(world, '「船王家族超VIP团」大驾光临！接待妥当将获超高消费与打赏！', 'success');
      }
      world.spawnTimer = Math.max(2.1, baseInterval * (0.8 + Math.random() * 0.4));
    }

    // 3. Update queue patience
    const tickPolicy = evaluatePolicyBonuses(world);
    const hostDecayReduction = Math.min(
      0.8,
      getBestStaffBonus(world, 'HOST') +
        charDef.bonuses.patienceDecayReduction +
        tickPolicy.patienceDecayReduction
    );
    for (let i = world.queue.length - 1; i >= 0; i--) {
      const q = world.queue[i];
      q.waitTime += dt;
      const baseDecay = q.party.specialStoryId ? 2.6 : q.party.isVip ? 3.5 : 2.75;
      const decayRate = baseDecay * (1 - hostDecayReduction) * tycoonTickMods.patienceMult;
      q.party.patience -= decayRate * dt;

      if (q.party.patience <= 0) {
        world.queue.splice(i, 1);
        repositionQueue(world);
        world.todayStats.walkouts += 1;
        world.totalWalkouts += 1;
        const repLoss = q.party.specialStoryId ? 10 : q.party.isVip ? 8 : 6;
        changeReputation(world, -repLoss);
        sound.playWalkout();
        spawnParticles(world, q.x, q.y, 'ANGRY', 6);
        const label = q.party.displayName ? `「${q.party.displayName}」失望离开` : '排队久等离开';
        addFloatingText(world, q.x + 12, q.y - 16, `${label}！口碑-${repLoss}`, '#EF4444', 13);
        addAlert(
          world,
          `${q.party.displayName || (q.party.isVip ? 'VIP贵宾' : '顾客')}因排队过久愤怒离场，口碑 -${repLoss}！`,
          'penalty'
        );
        if (world.totalWalkouts % 3 === 0) {
          addPenaltyStrike(world, 1, '顾客流失/逃单累计达 3 次，引发消协集中投诉');
        } else {
          checkGameOver(world);
        }
      }
    }
  }

  // 4. Update tables (during PLAYING & CLOSING; during PREP tables don't decay hygiene)
  const policyBonusesNow = evaluatePolicyBonuses(world);
  if (!isPrep) {
    const busserMitigation = Math.min(
      0.78,
      getMaxStaffTierForRole(world, 'BUSSER') * 0.12 +
        world.hygieneDecayPerk +
        policyBonusesNow.hygieneDecayReduction
    );
    let dirtyCount = 0;

    for (const table of world.tables) {
      if (table.status === 'LOCKED') continue;
      table.boilPhase += dt * 5;

      if (table.status === 'WAITING_BROTH' && table.customer) {
        const tycoonPatienceMult = evaluateTycoonModifiers(world).patienceMult;
        const waitDecay =
          (table.customer.isVip ? 3.6 : 3.0) *
          (1 - Math.min(0.65, charDef.bonuses.patienceDecayReduction + policyBonusesNow.patienceDecayReduction)) *
          tycoonPatienceMult *
          (isClosing ? 0.55 : 1);
        table.customer.patience -= waitDecay * dt;
        if (table.customer.patience <= 0) {
          const cust = table.customer;
          table.customer = null;
          table.status = 'DIRTY';
          table.dirtyTime = 0;
          table.reservedByStaffId = null;
          world.todayStats.walkouts += 1;
          world.totalWalkouts += 1;
          const repLoss = cust.specialStoryId ? 12 : cust.isVip ? 11 : 9;
          changeReputation(world, -repLoss);
          sound.playWalkout();
          spawnParticles(world, table.x, table.y, 'ANGRY', 7);
          addFloatingText(world, table.x, table.y - 26, `没上锅底逃单！口碑-${repLoss}`, '#EF4444', 13);
          addAlert(
            world,
            `${table.id + 1}号桌（${cust.displayName || '顾客'}）久等未上锅底愤然离席，口碑 -${repLoss}！`,
            'penalty'
          );
          if (world.totalWalkouts % 3 === 0) {
            addPenaltyStrike(world, 1, '顾客流失/逃单累计达 3 次，引发严重服务投诉');
          } else {
            checkGameOver(world);
          }
        }
      } else if (table.status === 'DINING' && table.customer) {
        const cust = table.customer;
        const closingPace = isClosing ? 1.35 : 1.0;
        const speedBoost = (1 + table.brothBonus * 0.45 + charDef.bonuses.dineSpeedBonus) * closingPace;
        cust.dineProgress += (100 / 18) * speedBoost * dt;

        // Customer dining self-talk & Special NPC favorite dish/broth chatter!
        if (cust.speechTimer && cust.speechTimer > 0) {
          cust.speechTimer -= dt;
          if (cust.speechTimer <= 0) {
            cust.speechText = null;
            cust.speechTimer = 0;
          }
        } else {
          if (cust.speechCooldown === undefined) {
            cust.speechCooldown = cust.specialStoryId
              ? 1.2 + Math.random() * 1.4
              : 2.2 + Math.random() * 4.5;
          } else {
            cust.speechCooldown -= dt;
          }
          if (cust.speechCooldown <= 0) {
            const activeBubbles = world.tables.filter(
              (t) => t.status === 'DINING' && t.customer?.speechText
            ).length;
            if (cust.specialStoryId || activeBubbles < 3) {
              cust.speechText = pickCustomerSpeech(world, cust);
              cust.speechTimer = cust.specialStoryId ? 5.2 : 4.2;
              cust.speechCooldown = cust.specialStoryId
                ? 5.5 + Math.random() * 2.5
                : 8.5 + Math.random() * 5.0;
            } else {
              cust.speechCooldown = 2.5 + Math.random() * 2.0;
            }
          }
        }

        if (Math.random() < dt * 2.4) {
          spawnParticles(world, table.x, table.y - 8, 'STEAM', 1);
        }

        cust.nextGrabTimer -= dt;
        if (cust.nextGrabTimer <= 0 && cust.eatCyclesLeft > 0) {
          cust.eatCyclesLeft -= 1;
          cust.nextGrabTimer = 4.2 + Math.random() * 2.2;

          // Cooked Food Zone grab if customer prefers cooked dishes!
          if (cust.prefersCooked && world.cookedStock > 0) {
            world.cookedStock -= 1;
            world.todayStats.cookedDishesServed += 1;
            world.dishConsumptionCounts['garlic_scallops'] =
              (world.dishConsumptionCounts['garlic_scallops'] ?? 0) + 1;
            cust.satisfaction = Math.min(100, cust.satisfaction + 7);
            spawnParticles(world, STATIONS.COOKED_COUNTER.x, STATIONS.COOKED_COUNTER.y - 10, 'SPARKLE', 3);
          } else {
            const nonEmptySlots = world.buffetSlots.filter((s) => s.stock > 0);
            if (nonEmptySlots.length > 0) {
              const picked = nonEmptySlots[Math.floor(Math.random() * nonEmptySlots.length)];
              picked.stock -= 1;
              picked.lastGrabFlash = 0.55;
              world.dishConsumptionCounts[picked.itemId] =
                (world.dishConsumptionCounts[picked.itemId] ?? 0) + 1;
              cust.satisfaction = Math.min(100, cust.satisfaction + 4);
            } else {
              cust.stockoutHits += 1;
              cust.satisfaction = Math.max(10, cust.satisfaction - 26);
              const compFine = 28;
              world.cash -= compFine;
              world.todayStats.penaltyFines += compFine;
              world.totalPenaltyFines += compFine;
              world.totalStockoutComplaints += 1;
              changeReputation(world, -3.5);
              sound.playPenalty();
              spawnParticles(world, table.x, table.y - 12, 'ANGRY', 5);
              addFloatingText(world, table.x, table.y - 34, `自助断菜赔付 -¥${compFine}`, '#EF4444', 13);
              addAlert(
                world,
                `海鲜冰台断货！${table.id + 1}号桌投诉获赔 ¥${compFine}，口碑 -3.5。`,
                'penalty'
              );
              if (world.totalStockoutComplaints % 3 === 0) {
                addPenaltyStrike(world, 1, '海鲜自助多次断供，被举报虚假宣传');
              } else {
                checkGameOver(world);
              }
            }
          }
        }

        if (cust.dineProgress >= 100) {
          settleCustomerBill(world, table);
        }
      } else if (table.status === 'DIRTY') {
        dirtyCount += 1;
        table.dirtyTime += dt;
        if (table.dirtyTime > 4.5) {
          const closingRelief = isClosing ? 0.2 : 1.0;
          world.hygiene = Math.max(
            0,
            world.hygiene - 0.62 * (1 - busserMitigation) * closingRelief * dt
          );
          if (Math.random() < dt * 2.5) {
            spawnParticles(world, table.x, table.y - 8, 'FLY', 1);
          }
        }
      }
    }

    // 5. Dirty sink overflow hygiene drain (only during PLAYING)
    if (isPlaying) {
      if (world.dirtyDishes >= Math.ceil(world.dishwareMax * 0.65)) {
        world.hygiene = Math.max(0, world.hygiene - 0.48 * (1 - world.hygieneDecayPerk) * dt);
        if (Math.random() < dt * 2.0) {
          spawnParticles(world, STATIONS.SINK.x, STATIONS.SINK.y - 6, 'FLY', 1);
        }
      } else if (dirtyCount === 0 && world.dirtyDishes <= 1 && world.hygiene < 100) {
        world.hygiene = Math.min(100, world.hygiene + 0.35 * dt);
      }

      // 5b. Backstage facility meters: Restroom Cleanliness (seafood handwashing!) & Equipment Health
      const activeDiners = world.tables.filter((t) => t.status === 'DINING').length;
      const techBonus = getBestStaffBonus(world, 'TECHNICIAN');
      const busserRestroomHelp = getMaxStaffTierForRole(world, 'BUSSER') * 0.25;
      const liveMasterOxy = getMaxStaffTierForRole(world, 'LIVE_MASTER') * 0.6;

      world.restroomCleanliness = Math.max(
        0,
        Math.min(100, world.restroomCleanliness - (0.08 + activeDiners * 0.14) * dt + (techBonus * 0.45 + busserRestroomHelp) * dt)
      );
      world.equipmentHealth = Math.max(
        0,
        Math.min(100, world.equipmentHealth - 0.14 * dt + techBonus * 0.65 * dt)
      );
      world.oxygenLevel = Math.max(
        20,
        Math.min(100, world.oxygenLevel - 0.1 * dt + (techBonus * 0.4 + liveMasterOxy) * dt)
      );

      if (world.restroomCleanliness < 38) {
        world.hygiene = Math.max(0, world.hygiene - 0.25 * dt);
      }

      // 6. Health inspection penalty (only during open business hours)
      world.hygieneInspectionCooldown = Math.max(0, world.hygieneInspectionCooldown - dt);
      if (world.hygiene < 45 && world.hygieneInspectionCooldown <= 0) {
        const fine = 180 + world.shopLevel * 120;
        world.cash -= fine;
        world.todayStats.penaltyFines += fine;
        world.totalPenaltyFines += fine;
        world.todayStats.healthInspectionsFailed += 1;
        changeReputation(world, -12);
        world.hygiene = 56;
        world.hygieneInspectionCooldown = 26;

        sound.playInspectionAlarm();
        addFloatingText(world, CANVAS_WIDTH / 2, 168, `食安突击检查罚款 -¥${fine} · 口碑-12`, '#EF4444', 18);
        addAlert(
          world,
          `卫生不达标（低于45）触发食安突击检查！罚款 ¥${fine}，口碑 -12！请及时清理餐桌、洗碗与洗手间。`,
          'penalty'
        );
        addPenaltyStrike(world, 2, '食品安全突击检查不合格（重度违规）');
      }
    }
  }

  // 7. Update Buffet flash timers
  for (const slot of world.buffetSlots) {
    if (slot.lastGrabFlash > 0) {
      slot.lastGrabFlash = Math.max(0, slot.lastGrabFlash - dt);
    }
  }

  // 8. Update Player task execution
  const speedMult = 1 + policyBonusesNow.speedBonus;
  if (world.player.taskQueue.length > 0) {
    const pAdapter = {
      isPlayer: true,
      x: world.player.x,
      y: world.player.y,
      speed: world.player.speed * speedMult,
      workSpeed: 1.35 * charDef.bonuses.playerWorkSpeedMult * speedMult,
      carrying: world.player.carrying,
      carryAmount: world.player.carryAmount,
      carryBrothId: world.player.carryBrothId,
      taskQueue: world.player.taskQueue,
      activeTaskLabel: world.player.activeTaskLabel,
      walkCycle: world.player.walkCycle,
    };
    advanceActorTasks(world, dt, pAdapter);
    world.player.x = pAdapter.x;
    world.player.y = pAdapter.y;
    world.player.carrying = pAdapter.carrying;
    world.player.carryAmount = pAdapter.carryAmount;
    world.player.carryBrothId = pAdapter.carryBrothId;
    world.player.taskQueue = pAdapter.taskQueue;
    world.player.walkCycle = pAdapter.walkCycle;
    if (world.player.taskQueue.length === 0) {
      world.player.activeTaskLabel =
        world.player.carrying === 'NONE'
          ? isPrep
            ? '筹备待命中 · 摆台备菜后点击正式开店'
            : isClosing
            ? '闭店收尾中 · 清理余桌并洗净餐具'
            : '待命中 · 点击工位/餐桌或使用方向键'
          : `手持物品中 · 点击目标工位交付`;
    }
  }

  // 9. Update Staff AI & movement
  assignStaffTasks(world, dt);
  for (const s of world.staff) {
    const sAdapter = {
      isPlayer: false,
      staff: s,
      x: s.x,
      y: s.y,
      speed: s.moveSpeed * speedMult,
      workSpeed: s.workSpeed * speedMult,
      carrying: s.carrying,
      carryAmount: s.carryAmount,
      carryBrothId: s.carryBrothId,
      taskQueue: s.taskQueue,
      activeTaskLabel: s.activeTaskLabel,
      walkCycle: s.walkCycle,
    };
    advanceActorTasks(world, dt, sAdapter);
    s.x = sAdapter.x;
    s.y = sAdapter.y;
    s.carrying = sAdapter.carrying;
    s.carryAmount = sAdapter.carryAmount;
    s.carryBrothId = sAdapter.carryBrothId;
    s.taskQueue = sAdapter.taskQueue;
    s.walkCycle = sAdapter.walkCycle;
  }

  // 10. Manual closing settlement only (no auto-settle when clean!)
  if (isPlaying) {
    for (const s of world.staff) {
      s.fatigue = Math.min(100, s.fatigue + 0.16 * dt);
    }
  }

  // 11. Update Floating Texts & Particles
  for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
    const ft = world.floatingTexts[i];
    ft.life -= rawDt;
    ft.y -= 26 * rawDt;
    if (ft.life <= 0) world.floatingTexts.splice(i, 1);
  }

  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.life -= rawDt;
    pt.x += pt.vx * rawDt;
    pt.y += pt.vy * rawDt;
    if (pt.kind === 'FLY') {
      pt.vx += (Math.random() - 0.5) * 140 * rawDt;
      pt.vy += (Math.random() - 0.5) * 140 * rawDt;
    }
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
}

function prependDropIfNeeded(world: GameWorld, neededCarry: GameWorld['player']['carrying']): TaskStep[] {
  const cur = world.player.carrying;
  if (cur === 'NONE' || cur === neededCarry) return [];
  if (cur === 'DIRTY_DISHES') {
    return [
      {
        type: 'DROP_DIRTY',
        targetX: STATIONS.SINK.x + 10,
        targetY: STATIONS.SINK.y + 44,
        duration: 0.2,
      },
    ];
  }
  if (cur === 'CLEAN_TABLEWARE') {
    world.cleanDishes = Math.min(world.dishwareMax, world.cleanDishes + world.player.carryAmount);
  }
  world.player.carrying = 'NONE';
  world.player.carryAmount = 0;
  world.player.carryBrothId = null;
  return [];
}

function hitBox(px: number, py: number, cx: number, cy: number, w: number, h: number): boolean {
  return px >= cx - w / 2 && px <= cx + w / 2 && py >= cy - h / 2 && py <= cy + h / 2;
}

export function handleCanvasClick(
  world: GameWorld,
  x: number,
  y: number
): 'OPEN_ZONE_CONFIG' | void {
  if (!isActivePlayPhase(world.phase) || world.pendingStoryModal) return;
  const p = world.player;

  // During PREP (开店前) or CLOSING (闭店时), clicking any staff member starts a conversation!
  if (world.phase === 'PREP' || world.phase === 'CLOSING') {
    const clickedStaff = [...world.staff]
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))
      .find((s) => Math.hypot(s.x - x, s.y - y) <= 28);
    if (clickedStaff) {
      talkToStaffMember(world, clickedStaff);
      return;
    }
  }

  // Clicking any of the 3 Front<->Back connecting archway aisles walks seamlessly into Backstage!
  if (y <= 112) {
    for (const arch of FRONT_BACK_ARCHWAYS) {
      if (Math.abs(x - arch.x) <= arch.halfWidth) {
        walkPlayerToBackstage(world, arch.x, 540);
        sound.playClick();
        return;
      }
    }
  }

  // Clicking the right-wall Backstage Doorway walks straight into the 7-room backstage!
  if (
    hitBox(
      x,
      y,
      DINING_HALL_BACKSTAGE_DOOR.x,
      DINING_HALL_BACKSTAGE_DOOR.y,
      DINING_HALL_BACKSTAGE_DOOR.w + 14,
      DINING_HALL_BACKSTAGE_DOOR.h + 14
    )
  ) {
    enterBackstageScene(world);
    return;
  }

  if (
    hitBox(x, y, STATIONS.RECEPTION.x, STATIONS.RECEPTION.y, STATIONS.RECEPTION.w + 20, STATIONS.RECEPTION.h + 20) ||
    (x < 156 && y > 260)
  ) {
    if (world.phase === 'PREP') {
      addFloatingText(world, STATIONS.RECEPTION.x, STATIONS.RECEPTION.y - 24, '筹备阶段未开门，点击「正式开店」迎客', '#F1BE51', 12);
      return;
    }
    if (world.phase === 'CLOSING') {
      addFloatingText(world, STATIONS.RECEPTION.x, STATIONS.RECEPTION.y - 24, '已打烊停止迎客，请先完成收尾清理', '#FBBF24', 12);
      return;
    }
    if (world.queue.length === 0) {
      addFloatingText(world, STATIONS.RECEPTION.x, STATIONS.RECEPTION.y - 24, '当前暂无排队顾客', '#94A3B8', 12);
      return;
    }
    const ready = world.tables.find((t) => t.status === 'READY');
    if (!ready) {
      addFloatingText(world, STATIONS.RECEPTION.x, STATIONS.RECEPTION.y - 24, '请先摆餐具准备空桌！', '#F59E0B', 13);
      return;
    }
    const pre = prependDropIfNeeded(world, 'NONE');
    p.taskQueue = [
      ...pre,
      {
        type: 'WELCOME_GUEST',
        targetX: STATIONS.RECEPTION.x + 34,
        targetY: STATIONS.RECEPTION.y + 8,
        targetId: ready.id,
        duration: 0.45,
      },
    ];
    p.activeTaskLabel = '前往迎宾带位';
    sound.playClick();
    return;
  }

  if (hitBox(x, y, STATIONS.SINK.x, STATIONS.SINK.y, STATIONS.SINK.w - 14, STATIONS.SINK.h + 12)) {
    const steps: TaskStep[] = [];
    if (p.carrying === 'DIRTY_DISHES') {
      steps.push({
        type: 'DROP_DIRTY',
        targetX: STATIONS.SINK.x,
        targetY: STATIONS.SINK.y + 44,
        duration: 0.2,
      });
    } else if (p.carrying !== 'NONE') {
      prependDropIfNeeded(world, 'NONE');
    }
    if (world.dirtyDishes > 0 || p.carrying === 'DIRTY_DISHES') {
      steps.push({
        type: 'WASH_DISHES',
        targetX: STATIONS.SINK.x,
        targetY: STATIONS.SINK.y + 44,
        duration: 0.85,
      });
      p.taskQueue = steps;
      p.activeTaskLabel = '前往洗碗池清洗餐具';
      sound.playClick();
    } else {
      addFloatingText(world, STATIONS.SINK.x, STATIONS.SINK.y - 24, '洗碗池已清空', '#7DD3FC', 12);
    }
    return;
  }

  if (hitBox(x, y, STATIONS.CLEAN_RACK.x, STATIONS.CLEAN_RACK.y, STATIONS.CLEAN_RACK.w - 14, STATIONS.CLEAN_RACK.h + 12)) {
    if (world.cleanDishes <= 0) {
      addFloatingText(world, STATIONS.CLEAN_RACK.x, STATIONS.CLEAN_RACK.y - 24, '暂无干净餐具，先去洗碗！', '#F59E0B', 13);
      return;
    }
    const needy = world.tables.find((t) => t.status === 'NEEDS_TABLEWARE');
    const pre = prependDropIfNeeded(world, 'NONE');
    const steps: TaskStep[] = [
      ...pre,
      {
        type: 'PICKUP_CLEAN_DISH',
        targetX: STATIONS.CLEAN_RACK.x,
        targetY: STATIONS.CLEAN_RACK.y + 44,
        duration: 0.3,
      },
    ];
    if (needy) {
      steps.push({
        type: 'SET_TABLEWARE',
        targetX: needy.x,
        targetY: needy.y - 42,
        targetId: needy.id,
        duration: 0.5,
      });
      p.activeTaskLabel = `取餐具为 ${needy.id + 1}号桌摆台`;
    } else {
      p.activeTaskLabel = '取干净餐具';
    }
    p.taskQueue = steps;
    sound.playClick();
    return;
  }

  if (hitBox(x, y, STATIONS.BROTH_KITCHEN.x, STATIONS.BROTH_KITCHEN.y, STATIONS.BROTH_KITCHEN.w - 14, STATIONS.BROTH_KITCHEN.h + 12)) {
    const waiting = world.tables
      .filter((t) => t.status === 'WAITING_BROTH' && t.customer)
      .sort((a, b) => (a.customer?.patience ?? 100) - (b.customer?.patience ?? 100))[0];
    if (!waiting || !waiting.customer) {
      addFloatingText(world, STATIONS.BROTH_KITCHEN.x, STATIONS.BROTH_KITCHEN.y - 24, '暂无待上锅底餐桌', '#94A3B8', 12);
      return;
    }
    const pre = prependDropIfNeeded(world, 'NONE');
    p.taskQueue = [
      ...pre,
      {
        type: 'PICKUP_BROTH',
        targetX: STATIONS.BROTH_KITCHEN.x,
        targetY: STATIONS.BROTH_KITCHEN.y + 44,
        brothId: waiting.customer.brothId,
        duration: 0.4,
      },
      {
        type: 'SERVE_BROTH',
        targetX: waiting.x,
        targetY: waiting.y - 42,
        targetId: waiting.id,
        duration: 0.35,
      },
    ];
    p.activeTaskLabel = `端锅底送往 ${waiting.id + 1}号桌`;
    sound.playClick();
    return;
  }

  if (hitBox(x, y, STATIONS.COLD_PREP.x, STATIONS.COLD_PREP.y, STATIONS.COLD_PREP.w - 14, STATIONS.COLD_PREP.h + 12)) {
    const lowest = [...world.buffetSlots]
      .filter((s) => s.stock < s.maxStock)
      .sort((a, b) => a.stock / a.maxStock - b.stock / b.maxStock)[0];
    if (!lowest) {
      addFloatingText(world, STATIONS.COLD_PREP.x, STATIONS.COLD_PREP.y - 24, '海鲜冰台全满！', '#34D399', 12);
      return;
    }
    const pre = prependDropIfNeeded(world, 'SEAFOOD_TRAY');
    const steps: TaskStep[] = [...pre];
    if (p.carrying !== 'SEAFOOD_TRAY') {
      steps.push({
        type: 'PICKUP_SEAFOOD',
        targetX: STATIONS.COLD_PREP.x,
        targetY: STATIONS.COLD_PREP.y + 44,
        duration: 0.35,
      });
    }
    const lowestDef = SEAFOOD_CATALOG.find((d) => d.id === lowest.itemId);
    const lowestPad = lowestDef ? getPadForBuffetZone(world, lowestDef.zone) : null;
    const lowestStand = lowestPad
      ? getPadStandPoint(lowestPad, lowest.x, lowest.y)
      : { x: lowest.x, y: lowest.y + 42 };
    steps.push({
      type: 'RESTOCK_BUFFET',
      targetX: lowestStand.x,
      targetY: lowestStand.y,
      targetId: lowest.slotIndex,
      duration: 0.45,
    });
    p.taskQueue = steps;
    p.activeTaskLabel = '前往生鲜冷库补菜';
    sound.playClick();
    return;
  }

  // Clicking any unlocked Front-Hall Zone Pad (occupied -> restock/cook; empty -> open Zone Layout Config!)
  for (const { pad, zoneId } of getUnlockedZonePads(world)) {
    if (x >= pad.x && x <= pad.x + pad.w && y >= pad.y && y <= pad.y + pad.h) {
      if (!zoneId) {
        sound.playClick();
        addFloatingText(
          world,
          pad.x + pad.w * 0.5,
          pad.y - 8,
          `打开【${pad.label}】区域配置`,
          '#FDE047',
          12
        );
        return 'OPEN_ZONE_CONFIG';
      }

      const zDef = getBuffetZoneDef(zoneId);
      const stand = getPadStandPoint(pad, x, y);

      if (zoneId === 'cooked_hot') {
        if (world.cookedStock >= world.cookedMaxStock) {
          addFloatingText(world, pad.x + pad.w / 2, pad.y - 10, '熟食热菜档已满仓！', '#FB923C', 12);
          return;
        }
        const pre = prependDropIfNeeded(world, 'COOKED_PLATTER');
        const steps: TaskStep[] = [...pre];
        if (p.carrying !== 'COOKED_PLATTER') {
          steps.push({
            type: 'COOK_FOOD',
            targetX: STATIONS.COLD_PREP.x - 16,
            targetY: STATIONS.COLD_PREP.y + 44,
            duration: 0.75,
          });
        }
        steps.push({
          type: 'DELIVER_COOKED',
          targetX: stand.x,
          targetY: stand.y,
          duration: 0.35,
        });
        p.taskQueue = steps;
        p.activeTaskLabel = '热厨加工熟食并送至熟食明档';
        sound.playClick();
        return;
      }

      // Cold/Live/Sashimi/Drinks/Sides zone: find closest slot in this zone (or any low slot)
      const zoneSlots = world.buffetSlots.filter((s) => {
        const d = SEAFOOD_CATALOG.find((item) => item.id === s.itemId);
        return d?.zone === zoneId;
      });
      const candidateSlots = zoneSlots.length > 0 ? zoneSlots : world.buffetSlots;
      if (candidateSlots.length === 0) {
        addFloatingText(
          world,
          pad.x + pad.w / 2,
          pad.y - 8,
          `${zDef.shortName} · 暂未上架该区菜品`,
          zDef.accentColor,
          12
        );
        return;
      }

      let clickedSlot = candidateSlots.reduce((best, s) =>
        Math.hypot(s.x - x, s.y - y) < Math.hypot(best.x - x, best.y - y) ? s : best
      );
      if (clickedSlot.stock >= clickedSlot.maxStock) {
        const lowInZone = candidateSlots.find((s) => s.stock < s.maxStock);
        if (lowInZone) {
          clickedSlot = lowInZone;
        } else {
          const lowAny = world.buffetSlots.find((s) => s.stock < s.maxStock);
          if (!lowAny) {
            addFloatingText(world, clickedSlot.x, clickedSlot.y - 20, `${zDef.shortName}菜品已摆满！`, '#34D399', 12);
            return;
          }
          clickedSlot = lowAny;
        }
      }

      const def = SEAFOOD_CATALOG.find((d) => d.id === clickedSlot.itemId);
      if ((world.warehouseStock[clickedSlot.itemId] ?? 0) <= 0) {
        sound.playPenalty();
        addFloatingText(
          world,
          clickedSlot.x,
          clickedSlot.y - 22,
          `后场「${def?.shortName ?? '菜品'}」库存为 0！闭店后补购`,
          '#F87171',
          12
        );
        return;
      }

      const slotPad = def ? getPadForBuffetZone(world, def.zone) ?? pad : pad;
      const slotStand = getPadStandPoint(slotPad, clickedSlot.x, clickedSlot.y);
      const pre = prependDropIfNeeded(world, 'SEAFOOD_TRAY');
      const steps: TaskStep[] = [...pre];
      if (p.carrying !== 'SEAFOOD_TRAY') {
        steps.push({
          type: 'PICKUP_SEAFOOD',
          targetX: STATIONS.COLD_PREP.x,
          targetY: STATIONS.COLD_PREP.y + 44,
          duration: 0.35,
        });
      }
      steps.push({
        type: 'RESTOCK_BUFFET',
        targetX: slotStand.x,
        targetY: slotStand.y,
        targetId: clickedSlot.slotIndex,
        duration: 0.45,
      });
      p.taskQueue = steps;
      p.activeTaskLabel = `后场补货：${def?.shortName ?? '海鲜'}`;
      sound.playClick();
      return;
    }
  }

  for (const table of world.tables) {
    if (table.status === 'LOCKED') continue;
    if (hitBox(x, y, table.x, table.y, 128, 86)) {
      if (table.status === 'WAITING_BROTH' && table.customer) {
        const pre = prependDropIfNeeded(world, 'BROTH_POT');
        const steps: TaskStep[] = [...pre];
        if (p.carrying !== 'BROTH_POT') {
          steps.push({
            type: 'PICKUP_BROTH',
            targetX: STATIONS.BROTH_KITCHEN.x,
            targetY: STATIONS.BROTH_KITCHEN.y + 44,
            brothId: table.customer.brothId,
            duration: 0.4,
          });
        }
        steps.push({
          type: 'SERVE_BROTH',
          targetX: table.x,
          targetY: table.y - 42,
          targetId: table.id,
          duration: 0.35,
        });
        p.taskQueue = steps;
        p.activeTaskLabel = `为 ${table.id + 1}号桌上锅底`;
        sound.playClick();
        return;
      }

      if (table.status === 'DIRTY') {
        const pre = prependDropIfNeeded(world, 'NONE');
        p.taskQueue = [
          ...pre,
          {
            type: 'CLEAR_TABLE',
            targetX: table.x,
            targetY: table.y - 42,
            targetId: table.id,
            duration: 0.65,
          },
          {
            type: 'DROP_DIRTY',
            targetX: STATIONS.SINK.x + 10,
            targetY: STATIONS.SINK.y + 44,
            duration: 0.2,
          },
        ];
        p.activeTaskLabel = `清理 ${table.id + 1}号桌并送洗`;
        sound.playClick();
        return;
      }

      if (table.status === 'NEEDS_TABLEWARE') {
        if (p.carrying === 'CLEAN_TABLEWARE' && p.carryAmount > 0) {
          p.taskQueue = [
            {
              type: 'SET_TABLEWARE',
              targetX: table.x,
              targetY: table.y - 42,
              targetId: table.id,
              duration: 0.45,
            },
          ];
          p.activeTaskLabel = `为 ${table.id + 1}号桌摆餐具`;
          sound.playClick();
          return;
        }
        if (world.cleanDishes <= 0) {
          addFloatingText(world, table.x, table.y - 26, '消毒柜无干净餐具，请先洗碗！', '#F59E0B', 13);
          return;
        }
        const pre = prependDropIfNeeded(world, 'NONE');
        p.taskQueue = [
          ...pre,
          {
            type: 'PICKUP_CLEAN_DISH',
            targetX: STATIONS.CLEAN_RACK.x,
            targetY: STATIONS.CLEAN_RACK.y + 44,
            duration: 0.3,
          },
          {
            type: 'SET_TABLEWARE',
            targetX: table.x,
            targetY: table.y - 42,
            targetId: table.id,
            duration: 0.45,
          },
        ];
        p.activeTaskLabel = `取餐具摆台 ${table.id + 1}号桌`;
        sound.playClick();
        return;
      }

      if (table.status === 'READY' && world.queue.length > 0) {
        const pre = prependDropIfNeeded(world, 'NONE');
        p.taskQueue = [
          ...pre,
          {
            type: 'WELCOME_GUEST',
            targetX: STATIONS.RECEPTION.x + 34,
            targetY: STATIONS.RECEPTION.y + 8,
            targetId: table.id,
            duration: 0.45,
          },
        ];
        p.activeTaskLabel = `带位至 ${table.id + 1}号桌`;
        sound.playClick();
        return;
      }

      if (table.status === 'DINING') {
        addFloatingText(
          world,
          table.x,
          table.y - 26,
          table.customer?.displayName
            ? `${table.customer.displayName}正在细细品鉴`
            : '顾客正在享用海鲜火锅',
          '#F7D060',
          12
        );
        return;
      }
    }
  }

  const safePt = pushOutsideColliders(world, x, y, 11);
  p.taskQueue = [{ type: 'WALK_TO', targetX: safePt.x, targetY: safePt.y }];
  p.activeTaskLabel = '移动中';
}

export function walkPlayerToBackstage(
  world: GameWorld,
  backstageX: number,
  backstageY: number
) {
  if (!isActivePlayPhase(world.phase) || world.pendingStoryModal) return;
  const p = world.player;
  const arch = findNearestFrontBackArchway((p.x + backstageX) * 0.5);
  const steps: TaskStep[] = [];
  if (p.y > 118) {
    steps.push({ type: 'WALK_TO', targetX: arch.x, targetY: 118 });
  }
  steps.push({
    type: 'ENTER_BACKSTAGE',
    targetX: arch.x,
    targetY: 4,
    backstageTargetX: backstageX,
    backstageTargetY: backstageY,
  });
  p.taskQueue = steps;
  p.activeTaskLabel = '前往后场...';
  sound.playClick();
}

export function movePlayerByKeys(world: GameWorld, dx: number, dy: number, dt: number) {
  if (!isActivePlayPhase(world.phase) || world.pendingStoryModal) return;
  if (dx === 0 && dy === 0) return;

  const p = world.player;
  const bounds = getFrontHallBounds(world.shopLevel);
  const len = Math.hypot(dx, dy);
  const nx = dx / len;
  const ny = dy / len;
  p.taskQueue = [];

  const stepX = nx * p.speed * dt;
  const stepY = ny * p.speed * dt;
  let wantX = Math.max(124, Math.min(bounds.width - 24, p.x + stepX));
  let wantY = Math.min(bounds.height - 24, p.y + stepY);

  const inArchwayBand = (xVal: number) =>
    FRONT_BACK_ARCHWAYS.find((a) => Math.abs(xVal - a.x) <= a.halfWidth + 4);

  const curArch = inArchwayBand(wantX) ?? inArchwayBand(p.x);
  if (curArch) {
    // Inside one of the 3 open archway aisles: allow walking smoothly north all the way across y = 0!
    if (wantY < 114) {
      wantX = Math.max(
        curArch.x - curArch.halfWidth + 4,
        Math.min(curArch.x + curArch.halfWidth - 4, wantX)
      );
    }
    wantY = Math.max(-6, wantY);
  } else {
    // Blocked by top kitchen stations unless gliding into a nearby archway
    if (wantY < 114) {
      wantY = 114;
      if (ny < 0 && p.y <= 122) {
        const nearest = findNearestFrontBackArchway(p.x);
        if (Math.abs(p.x - nearest.x) <= 58) {
          const pull =
            Math.sign(nearest.x - p.x) * Math.min(Math.abs(nearest.x - p.x), p.speed * dt * 0.85);
          wantX = p.x + pull;
        }
      }
    }
  }

  // Enforce solid collision against tables, occupied buffet zones, reception & kitchen stations!
  const resolved = resolveFrontHallStep(world, p.x, p.y, wantX, wantY, Boolean(curArch), 11);
  p.x = resolved.x;
  p.y = resolved.y;
  p.walkCycle += dt * 11;
  p.activeTaskLabel = '手动巡场中 · 按空格交互';

  // Walking straight NORTH through any of the 3 golden archways seamlessly steps into Backstage!
  if (p.y <= 4 && ny < 0) {
    const arch = findNearestFrontBackArchway(p.x);
    if (Math.abs(p.x - arch.x) <= arch.halfWidth + 8) {
      const enterX = Math.max(arch.x - 16, Math.min(arch.x + 16, p.x));
      world.activeScene = 'BACKSTAGE';
      world.backstagePlayer.x = enterX;
      world.backstagePlayer.y = 634;
      world.backstagePlayer.targetX = null;
      world.backstagePlayer.targetY = null;
      world.backstagePlayer.pendingInteractScene = null;
      world.backstagePlayer.pendingInteractType = null;
      world.backstagePlayer.pendingFrontHallTarget = null;
      if (world.phase === 'CLOSING' && world.onboardingStep === 7) {
        world.onboardingStep = 8;
      }
    }
  }
}

export function interactNearestStation(world: GameWorld) {
  if (!isActivePlayPhase(world.phase) || world.pendingStoryModal) return;
  const px = world.player.x;
  const py = world.player.y;

  let bestDist = 115;
  let bestTarget: { x: number; y: number } | null = null;

  const points: Array<{ x: number; y: number }> = [
    { x: STATIONS.RECEPTION.x, y: STATIONS.RECEPTION.y },
    { x: STATIONS.SINK.x, y: STATIONS.SINK.y },
    { x: STATIONS.CLEAN_RACK.x, y: STATIONS.CLEAN_RACK.y },
    { x: STATIONS.BROTH_KITCHEN.x, y: STATIONS.BROTH_KITCHEN.y },
    { x: STATIONS.COLD_PREP.x, y: STATIONS.COLD_PREP.y },
    ...getUnlockedZonePads(world).map(({ pad }) => ({
      x: pad.x + pad.w * 0.5,
      y: pad.y + pad.h * 0.5,
    })),
    ...world.buffetSlots.map((s) => ({ x: s.x, y: s.y })),
    ...world.tables.filter((t) => t.status !== 'LOCKED').map((t) => ({ x: t.x, y: t.y })),
  ];

  for (const pt of points) {
    const d = Math.hypot(pt.x - px, pt.y - py);
    if (d < bestDist) {
      bestDist = d;
      bestTarget = pt;
    }
  }

  if (bestTarget) {
    return handleCanvasClick(world, bestTarget.x, bestTarget.y);
  }
}

function ensurePrepPhase(world: GameWorld, actionName: string): boolean {
  if (world.phase !== 'PREP') {
    addAlert(world, `「${actionName}」仅限在开店前准备阶段办理，营业与收尾期间暂不支持即时变动。`, 'warning');
    return false;
  }
  return true;
}

export function hireCandidate(world: GameWorld, candidateId: string): boolean {
  if (!ensurePrepPhase(world, '签约招募员工')) return false;

  const shopCfg = getShopConfig(world.shopLevel);
  const regularStaffCount = world.staff.filter((s) => !s.isSpecial && !s.isPartTime).length;
  const pendingHires = world.pendingOrders.filter((o) => o.type === 'HIRE_STAFF').length;
  const pendingFires = world.pendingOrders.filter((o) => o.type === 'FIRE_STAFF').length;
  const projectedRegular = regularStaffCount + pendingHires - pendingFires;

  if (projectedRegular >= shopCfg.maxStaffCount) {
    addAlert(world, `常规员工编制（含待报到）已达上限 ${shopCfg.maxStaffCount} 人，请先升级店铺！`, 'warning');
    return false;
  }
  const idx = world.candidates.findIndex((c) => c.candidateId === candidateId);
  if (idx === -1) return false;
  const cand = world.candidates[idx];
  if (world.cash < cand.hireCost) {
    addAlert(world, `资金不足，签约 ${cand.name} 需要 ¥${cand.hireCost}。`, 'warning');
    return false;
  }

  world.cash -= cand.hireCost;
  world.candidates.splice(idx, 1);

  const meta = STAFF_ROLE_META[cand.role];
  world.pendingOrders.push({
    id: nextUid('ord'),
    type: 'HIRE_STAFF',
    title: `新员工报到 · ${cand.name}`,
    detail: `${meta.title}（${cand.tier}星）将于明日开店前到岗`,
    daysRemaining: 1,
    totalDays: 1,
    cost: cand.hireCost,
    candidate: cand,
  });

  sound.playHireStamp();
  addAlert(world, `已签约 ${cand.name}（${meta.title}），预计明日开店前正式报到上岗！`, 'success');
  return true;
}

export function promoteStaff(world: GameWorld, staffId: string): boolean {
  if (!ensurePrepPhase(world, '安排员工深造')) return false;

  const s = world.staff.find((st) => st.id === staffId);
  if (!s || s.isSpecial) return false;
  if (world.pendingOrders.some((o) => o.type === 'PROMOTE_STAFF' && o.staffId === staffId)) {
    addAlert(world, `${s.name} 已在晋升深造排期中，明日开店前即可晋升。`, 'info');
    return false;
  }
  if (world.pendingOrders.some((o) => o.type === 'FIRE_STAFF' && o.staffId === staffId)) {
    addAlert(world, `${s.name} 已安排离职，无法预约深造。`, 'warning');
    return false;
  }

  const maxTier = getShopConfig(world.shopLevel).maxStaffTier;
  if (s.tier >= maxTier || s.tier >= 4) {
    addAlert(world, '需先完成店铺等级升级以解锁更高员工品阶。', 'warning');
    return false;
  }
  const nextTier = (s.tier + 1) as StaffTier;
  const upgradeCost = Math.round(180 * nextTier * nextTier * 0.72);
  if (world.cash < upgradeCost) {
    addAlert(world, `资金不足，为 ${s.name} 报名深造需要 ¥${upgradeCost}。`, 'warning');
    return false;
  }
  world.cash -= upgradeCost;

  world.pendingOrders.push({
    id: nextUid('ord'),
    type: 'PROMOTE_STAFF',
    title: `员工深造 · ${s.name}`,
    detail: `晋升至 ${nextTier} 星，明日开店前学成生效`,
    daysRemaining: 1,
    totalDays: 1,
    cost: upgradeCost,
    staffId: s.id,
    targetNumber: nextTier,
  });

  sound.playHireStamp();
  addAlert(world, `已为 ${s.name} 安排 ${nextTier} 星特训深造，明日开店前正式晋升！`, 'success');
  return true;
}

export function fireStaff(world: GameWorld, staffId: string) {
  if (!ensurePrepPhase(world, '人事离职安排')) return;
  const s = world.staff.find((st) => st.id === staffId);
  if (!s) return;
  if (world.pendingOrders.some((o) => o.type === 'FIRE_STAFF' && o.staffId === staffId)) {
    return;
  }

  world.pendingOrders.push({
    id: nextUid('ord'),
    type: 'FIRE_STAFF',
    title: `离职交接 · ${s.name}`,
    detail: `今日闭店后完成交接，明日不再计薪`,
    daysRemaining: 1,
    totalDays: 1,
    cost: 0,
    staffId: s.id,
  });
  sound.playClick();
  addAlert(world, `已通知 ${s.name} 办理离职交接，今日班次结束后生效。`, 'info');
}

export function cancelPendingFire(world: GameWorld, staffId: string) {
  if (!ensurePrepPhase(world, '撤销离职安排')) return;
  const idx = world.pendingOrders.findIndex(
    (o) => o.type === 'FIRE_STAFF' && o.staffId === staffId
  );
  if (idx === -1) return;
  const [removed] = world.pendingOrders.splice(idx, 1);
  sound.playClick();
  addAlert(world, `已撤销「${removed.title}」的离职安排。`, 'info');
}

export function unlockSeafoodItem(world: GameWorld, itemId: string): boolean {
  if (!ensurePrepPhase(world, '冷链海鲜订货')) return false;
  if (world.unlockedSeafoodIds.includes(itemId)) return false;
  if (world.pendingOrders.some((o) => o.type === 'UNLOCK_SEAFOOD' && o.targetId === itemId)) {
    return false;
  }
  const def = SEAFOOD_CATALOG.find((s) => s.id === itemId);
  if (!def || def.isSpecialReward) return false;
  if (!world.unlockedZones.includes(def.zone)) {
    const z = getBuffetZoneDef(def.zone);
    addAlert(world, `采购 ${def.name} 需要先扩建「${z.name}」。`, 'warning');
    return false;
  }
  if (world.shopLevel < def.minShopLevel) {
    addAlert(world, `订购 ${def.name} 需要店铺达到 Lv.${def.minShopLevel}。`, 'warning');
    return false;
  }
  if (world.cash < def.unlockCost) {
    addAlert(world, `资金不足，签订 ${def.name} 冷链渠道需要 ¥${def.unlockCost}。`, 'warning');
    return false;
  }
  world.cash -= def.unlockCost;
  world.pendingOrders.push({
    id: nextUid('ord'),
    type: 'UNLOCK_SEAFOOD',
    title: `冷链上新 · ${def.name}`,
    detail: `明日开店前鲜货到店上架（餐位 +¥${def.ticketBonus}）`,
    daysRemaining: 1,
    totalDays: 1,
    cost: def.unlockCost,
    targetId: itemId,
  });
  sound.playHireStamp();
  addAlert(world, `已签约冷链采购「${def.name}」，预计明日开店前到货上架！`, 'success');
  return true;
}

export function unlockBrothItem(world: GameWorld, brothId: string): boolean {
  if (!ensurePrepPhase(world, '秘制锅底研发')) return false;
  if (world.unlockedBrothIds.includes(brothId)) return false;
  if (world.pendingOrders.some((o) => o.type === 'UNLOCK_BROTH' && o.targetId === brothId)) {
    return false;
  }
  const def = BROTH_CATALOG.find((b) => b.id === brothId);
  if (!def) return false;
  if (world.shopLevel < def.minShopLevel) {
    addAlert(world, `研发 ${def.name} 需要店铺达到 Lv.${def.minShopLevel}。`, 'warning');
    return false;
  }
  if (world.cash < def.unlockCost) {
    addAlert(world, `资金不足，研发 ${def.name} 需要 ¥${def.unlockCost}。`, 'warning');
    return false;
  }
  world.cash -= def.unlockCost;
  world.pendingOrders.push({
    id: nextUid('ord'),
    type: 'UNLOCK_BROTH',
    title: `锅底试煮 · ${def.name}`,
    detail: `明日开店前研发完成并加入菜单`,
    daysRemaining: 1,
    totalDays: 1,
    cost: def.unlockCost,
    targetId: brothId,
  });
  sound.playHireStamp();
  addAlert(world, `已启动「${def.name}」慢熬试煮，明日开店前正式上线！`, 'success');
  return true;
}

export function upgradeShopLevel(world: GameWorld): boolean {
  if (!ensurePrepPhase(world, '店铺装潢升级')) return false;
  if (world.shopLevel >= SHOP_LEVEL_CONFIG.length) return false;
  if (world.pendingOrders.some((o) => o.type === 'UPGRADE_SHOP')) {
    addAlert(world, '已有店铺装潢升级正在排期施工中，请耐心等待竣工！', 'info');
    return false;
  }
  const nextCfg = SHOP_LEVEL_CONFIG[world.shopLevel];
  if (world.cash < nextCfg.upgradeCost) {
    addAlert(world, `资金不足，预约升级店铺需要 ¥${nextCfg.upgradeCost}。`, 'warning');
    return false;
  }
  const leadDays = nextCfg.level >= 3 ? 2 : 1;
  world.cash -= nextCfg.upgradeCost;
  world.pendingOrders.push({
    id: nextUid('ord'),
    type: 'UPGRADE_SHOP',
    title: `门店升级 · Lv.${nextCfg.level} ${nextCfg.title}`,
    detail: `装潢施工需 ${leadDays} 天，竣工后开放新编制与更高品阶`,
    daysRemaining: leadDays,
    totalDays: leadDays,
    cost: nextCfg.upgradeCost,
    targetNumber: nextCfg.level,
  });
  sound.playHireStamp();
  addAlert(
    world,
    `已委托施工队升级 Lv.${nextCfg.level}「${nextCfg.title}」，预计 ${leadDays} 天后开店前竣工！`,
    'success'
  );
  return true;
}

export function expandTables(world: GameWorld): boolean {
  if (!ensurePrepPhase(world, '扩建大厅餐桌')) return false;
  if (world.pendingOrders.some((o) => o.type === 'EXPAND_TABLES')) {
    addAlert(world, '大厅餐桌扩建已在夜间施工排期中，明日开店前即可启用！', 'info');
    return false;
  }
  const nextTier = TABLE_EXPANSION_TIERS.find((t) => t.tables > world.tableLimit);
  if (!nextTier) return false;
  if (world.shopLevel < nextTier.minShopLevel) {
    addAlert(world, `扩建至 ${nextTier.tables} 桌需要店铺 Lv.${nextTier.minShopLevel}。`, 'warning');
    return false;
  }
  if (world.cash < nextTier.cost) {
    addAlert(world, `资金不足，扩建餐桌需要 ¥${nextTier.cost}。`, 'warning');
    return false;
  }
  world.cash -= nextTier.cost;
  world.pendingOrders.push({
    id: nextUid('ord'),
    type: 'EXPAND_TABLES',
    title: `扩建餐桌 · ${nextTier.label}`,
    detail: `夜间装台改造，明日开店前开放并附赠 2 套餐具`,
    daysRemaining: 1,
    totalDays: 1,
    cost: nextTier.cost,
    targetNumber: nextTier.tables,
  });
  sound.playHireStamp();
  addAlert(world, `已预约大厅扩建至 ${nextTier.tables} 张餐桌，预计明日开店前竣工！`, 'success');
  return true;
}

export function upgradeDishware(world: GameWorld): boolean {
  if (!ensurePrepPhase(world, '扩容消毒餐具库')) return false;
  if (world.pendingOrders.some((o) => o.type === 'UPGRADE_DISHWARE')) {
    addAlert(world, '消毒餐具库扩容已在配送安装排期中。', 'info');
    return false;
  }
  const nextTier = DISHWARE_UPGRADE_TIERS.find((t) => t.maxDishes > world.dishwareMax);
  if (!nextTier) return false;
  if (world.cash < nextTier.cost) {
    addAlert(world, `资金不足，预约升级餐具库需要 ¥${nextTier.cost}。`, 'warning');
    return false;
  }
  world.cash -= nextTier.cost;
  world.pendingOrders.push({
    id: nextUid('ord'),
    type: 'UPGRADE_DISHWARE',
    title: `设备升级 · ${nextTier.label}`,
    detail: `明日开店前送货安装完毕`,
    daysRemaining: 1,
    totalDays: 1,
    cost: nextTier.cost,
    targetNumber: nextTier.maxDishes,
  });
  sound.playHireStamp();
  addAlert(world, `已订购「${nextTier.label}」，预计明日开店前安装到位！`, 'success');
  return true;
}

export function upgradeBuffetCapacity(world: GameWorld): boolean {
  if (!ensurePrepPhase(world, '升级海鲜冰台')) return false;
  if (world.pendingOrders.some((o) => o.type === 'UPGRADE_BUFFET')) {
    addAlert(world, '海鲜冰台扩容改造已在排期中。', 'info');
    return false;
  }
  const charExtra = getCharacterDef(world.characterId).bonuses.buffetCapacityExtra;
  const effectiveBase = world.buffetCapacityBonus - charExtra;
  const nextTier = BUFFET_CAPACITY_TIERS.find((t) => t.bonus > effectiveBase);
  if (!nextTier) return false;
  if (world.cash < nextTier.cost) {
    addAlert(world, `资金不足，预约升级海鲜冰台需要 ¥${nextTier.cost}。`, 'warning');
    return false;
  }
  world.cash -= nextTier.cost;
  world.pendingOrders.push({
    id: nextUid('ord'),
    type: 'UPGRADE_BUFFET',
    title: `冰台改装 · ${nextTier.label}`,
    detail: `明日开店前改造竣工，单格容量提升`,
    daysRemaining: 1,
    totalDays: 1,
    cost: nextTier.cost,
    targetNumber: nextTier.bonus,
  });
  sound.playHireStamp();
  addAlert(world, `已预约「${nextTier.label}」改装工程，预计明日开店前竣工！`, 'success');
  return true;
}
