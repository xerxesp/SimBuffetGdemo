import {
  applyAdaptiveFrontHallLayout,
  createDefaultZonePadAssignments,
  FRONT_HALL_ZONE_PADS,
  getShopConfig,
  STARTER_PURCHASED_PAD_IDS,
  TABLE_POSITIONS,
} from '../data/gameConfig';
import { getRegimeDef, TECH_TREE_NODES } from '../data/policyAndTechConfig';
import { awardPlayerXpFromCash, syncLegacyPlayerProgression } from './playerProgression';
import {
  ACHIEVEMENTS_CATALOG,
  CITY_RIVALS,
  getDecorThemeDef,
  getHolidayDef,
  getHolidayForCalendar,
  getWeatherDef,
  MARKETING_CAMPAIGNS,
} from '../data/tycoonSystemsConfig';
import {
  DecorThemeId,
  GameWorld,
  MarketingCampaignId,
  PersistentEncyclopedia,
  SaveSlotId,
  SaveSlotMeta,
  SeasonId,
  WeatherId,
} from '../types/game';
import { sound } from '../utils/sound';

const SAVE_PREFIX = 'chaoxian_save_v1_';
const ENCYCLOPEDIA_KEY = 'chaoxian_encyclopedia_v1';

let tycoonUid = 90000;
function nextTycoonId(prefix: string): string {
  tycoonUid += 1;
  return `${prefix}_${tycoonUid}`;
}

function pushTycoonAlert(
  world: GameWorld,
  message: string,
  severity: 'info' | 'warning' | 'penalty' | 'success' = 'info'
) {
  const clock = world.phase === 'PREP' ? '10:00' : world.phase === 'CLOSING' ? '22:00' : '营业';
  world.alerts.unshift({
    id: nextTycoonId('tyc'),
    timeText: clock,
    message,
    severity,
  });
  if (world.alerts.length > 30) world.alerts.length = 30;
}

// ============================================================================
// 1. CITY SEAFOOD BUFFET LEADERBOARD & PLAYER SCORE
// ============================================================================

export interface CityLeaderboardRow {
  id: string;
  name: string;
  style: string;
  score: number;
  avgTicket: number;
  isPlayer: boolean;
}

export function computeCityLeaderboard(world: GameWorld): {
  rows: CityLeaderboardRow[];
  playerRank: number;
  playerScore: number;
} {
  const decor = getDecorThemeDef(world.activeDecorThemeId);
  const regime = getRegimeDef(world.activeRegimeId);
  const effectiveTicket = world.customTicketPrice ?? regime.baseTicketPrice;
  const shopCfg = getShopConfig(world.shopLevel);

  // Player City Score formula rewarding reputation, expansion, zones, dishes, synergies, decor & guests
  const playerScore = Math.max(
    40,
    Math.round(
      world.reputation * 2.4 +
        world.shopLevel * 62 +
        world.unlockedZones.length * 36 +
        world.unlockedSeafoodIds.length * 14 +
        world.activeSynergyIds.length * 30 +
        decor.rankScoreBonus +
        Math.min(120, Math.floor(world.totalGuestsServed * 0.9)) -
        world.penaltyStrikes * 32
    )
  );

  const dayOffset = Math.max(0, world.day - 1);
  const rows: CityLeaderboardRow[] = CITY_RIVALS.map((r) => ({
    id: r.id,
    name: r.name,
    style: r.style,
    score: Math.round(r.baseScore + Math.min(28, dayOffset) * r.growthPerDay),
    avgTicket: r.avgTicket,
    isPlayer: false,
  }));

  rows.push({
    id: 'player_store',
    name: `潮鲜沸鼎（你的门店 · Lv.${world.shopLevel}）`,
    style: `${shopCfg.title} · ${decor.name}`,
    score: playerScore,
    avgTicket: effectiveTicket + decor.ticketBonus,
    isPlayer: true,
  });

  rows.sort((a, b) => b.score - a.score);
  const playerRank = rows.findIndex((r) => r.isPlayer) + 1;

  return { rows, playerRank, playerScore };
}

// ============================================================================
// 2. COMBINED ENVIRONMENT MODIFIERS (WEATHER + HOLIDAY + RIVAL + MARKETING + DECOR)
// ============================================================================

export interface TycoonModifiers {
  customerRateMult: number;
  costMultiplier: number;
  vipBonus: number;
  tipBonus: number;
  patienceMult: number;
  ticketDelta: number;
}

export function evaluateTycoonModifiers(world: GameWorld): TycoonModifiers {
  const w = getWeatherDef(world.weather);
  const h = getHolidayDef(world.holiday);
  const decor = getDecorThemeDef(world.activeDecorThemeId);
  const mkt = world.activeMarketing;
  const rival = world.activeRivalEvent;

  const customerRateMult =
    w.customerRateMult *
    h.customerRateMult *
    (mkt ? mkt.customerRateMult : 1) *
    (rival ? rival.customerRateMult : 1);

  const costMultiplier = w.costMultiplier * h.costMultiplier;
  const vipBonus = h.vipBonus + decor.vipBonus + (mkt ? mkt.vipBonus : 0);
  const tipBonus = w.tipBonus + h.tipBonus + decor.tipBonus;
  const patienceMult = Math.max(0.55, w.patienceMult * (1 - decor.patienceReduction));
  const ticketDelta = decor.ticketBonus + (mkt ? mkt.ticketDelta : 0);

  return {
    customerRateMult,
    costMultiplier,
    vipBonus,
    tipBonus,
    patienceMult,
    ticketDelta,
  };
}

// ============================================================================
// 3. DAILY WEATHER, HOLIDAY, RIVAL & MARKETING / LOAN ROLLER
// ============================================================================

export function rollWeatherForSeason(season: SeasonId): WeatherId {
  const r = Math.random();
  switch (season) {
    case 'SPRING':
      if (r < 0.52) return 'SUNNY';
      if (r < 0.88) return 'RAINY';
      return 'TYPHOON';
    case 'SUMMER':
      if (r < 0.34) return 'HEATWAVE';
      if (r < 0.62) return 'SUNNY';
      if (r < 0.82) return 'RAINY';
      return 'TYPHOON';
    case 'AUTUMN':
      if (r < 0.5) return 'SUNNY';
      if (r < 0.78) return 'RAINY';
      return 'TYPHOON';
    case 'WINTER':
      if (r < 0.42) return 'SNOWY';
      if (r < 0.78) return 'SUNNY';
      return 'RAINY';
  }
}

export function advanceDailyTycoonEvents(world: GameWorld): string[] {
  const reports: string[] = [];

  // 1) Roll Weather
  world.weather = rollWeatherForSeason(world.season);
  const wDef = getWeatherDef(world.weather);
  if (world.weather !== 'SUNNY') {
    reports.push(`【今日天气 · ${wDef.name}】${wDef.description}`);
  }

  // 2) Check Calendar Holiday
  world.holiday = getHolidayForCalendar(world.season, world.dayInSeason);
  if (world.holiday !== 'NONE') {
    const hDef = getHolidayDef(world.holiday);
    reports.push(`【节庆大促 · ${hDef.name}】${hDef.description}`);
  }

  // 3) Tick active marketing campaign
  if (world.activeMarketing) {
    world.activeMarketing.daysRemaining -= 1;
    if (world.activeMarketing.daysRemaining <= 0) {
      reports.push(`营销活动「${world.activeMarketing.name}」已圆满结案。`);
      world.activeMarketing = null;
    }
  }

  // 4) Tick or trigger neighborhood rival event (starting Day 4+)
  if (world.activeRivalEvent) {
    world.activeRivalEvent.daysRemaining -= 1;
    if (world.activeRivalEvent.daysRemaining <= 0) {
      world.activeRivalEvent = null;
    }
  } else if (world.day >= 4 && Math.random() < 0.24) {
    const { playerRank } = computeCityLeaderboard(world);
    // Pick a rival near player's current rank for relevant competition
    const targetIdx = Math.max(0, Math.min(CITY_RIVALS.length - 1, playerRank - 2));
    const rival = CITY_RIVALS[targetIdx];
    world.activeRivalEvent = {
      id: nextTycoonId('rival_evt'),
      rivalName: rival.name,
      title: rival.eventTitle,
      effectDesc: rival.eventDesc,
      customerRateMult: rival.customerRateMult,
      daysRemaining: 2,
    };
    reports.push(`【街区商战】${rival.eventTitle}：${rival.eventDesc}`);
  }

  return reports;
}

// ============================================================================
// 4. PLAYER ACTIONS: MARKETING, EMERGENCY LOAN, DECOR THEMES
// ============================================================================

export function launchMarketingCampaign(
  world: GameWorld,
  campaignId: MarketingCampaignId
): boolean {
  const def = MARKETING_CAMPAIGNS.find((c) => c.id === campaignId);
  if (!def) return false;
  if (world.activeMarketing) {
    pushTycoonAlert(
      world,
      `当前正在进行「${world.activeMarketing.name}」（余 ${world.activeMarketing.daysRemaining} 天），期满后可开启新推广。`,
      'warning'
    );
    return false;
  }
  if (def.minReputation && world.reputation < def.minReputation) {
    pushTycoonAlert(
      world,
      `发起「${def.name}」需要门店口碑达到 ${def.minReputation}（当前 ${Math.round(world.reputation)}）。`,
      'warning'
    );
    return false;
  }
  if (def.cost > 0 && world.cash < def.cost) {
    pushTycoonAlert(world, `资金不足，启动「${def.name}」需要 ¥${def.cost}。`, 'warning');
    return false;
  }

  world.cash -= def.cost; // negative cost adds cash immediately (prepaid membership)
  if (def.cost < 0) {
    const earned = Math.abs(def.cost);
    world.totalCashEarned += earned;
    awardPlayerXpFromCash(world, earned);
  }
  if (def.reputationInstant > 0) {
    world.reputation = Math.min(100, world.reputation + def.reputationInstant);
    world.todayStats.reputationChange += def.reputationInstant;
  }

  world.activeMarketing = {
    id: def.id,
    name: def.name,
    daysRemaining: def.durationDays,
    customerRateMult: def.customerRateMult,
    vipBonus: def.vipBonus,
    ticketDelta: def.ticketDelta,
  };

  sound.playStoryFanfare();
  pushTycoonAlert(
    world,
    def.cost < 0
      ? `已启动「${def.name}」：储值金 +¥${Math.abs(def.cost)} 已即刻到账！（持续 ${def.durationDays} 天）`
      : `已启动「${def.name}」（花费 ¥${def.cost}，持续 ${def.durationDays} 天）！${def.summary}`,
    'success'
  );
  return true;
}

export function takeEmergencyLoan(world: GameWorld, amount: 400 | 800): boolean {
  if (world.loan.remainingPrincipal > 0) {
    pushTycoonAlert(
      world,
      `当前尚有未结清应急贷 ¥${world.loan.remainingPrincipal}，请先还清后再申请新额度。`,
      'warning'
    );
    return false;
  }

  const totalPayable = Math.round(amount * 1.1);
  const days = 5;
  const dailyInstallment = Math.ceil(totalPayable / days);

  world.cash += amount;
  world.loan = {
    remainingPrincipal: totalPayable,
    dailyInstallment,
    daysRemaining: days,
    totalLoansTaken: world.loan.totalLoansTaken + 1,
  };

  sound.playCoin();
  pushTycoonAlert(
    world,
    `港湾小微商户应急贷 ¥${amount} 已瞬间放款到账！未来 ${days} 天打烊时每晚自动扣还 ¥${dailyInstallment}（可随时提前结清）。`,
    'success'
  );
  return true;
}

export function repayEmergencyLoan(world: GameWorld): boolean {
  const owed = world.loan.remainingPrincipal;
  if (owed <= 0) return false;
  if (world.cash < owed) {
    pushTycoonAlert(world, `流动资金不足，提前全额结清需 ¥${owed}。`, 'warning');
    return false;
  }
  world.cash -= owed;
  world.loan.remainingPrincipal = 0;
  world.loan.dailyInstallment = 0;
  world.loan.daysRemaining = 0;
  sound.playCoin();
  pushTycoonAlert(world, `已一次性提前结清应急贷款 ¥${owed}，无债一身轻！`, 'success');
  return true;
}

export function buyOrEquipDecorTheme(world: GameWorld, themeId: DecorThemeId): boolean {
  const def = getDecorThemeDef(themeId);
  if (world.unlockedDecorThemeIds.includes(themeId)) {
    world.activeDecorThemeId = themeId;
    sound.playClick();
    pushTycoonAlert(world, `前厅装潢已切换为「${def.name}」！`, 'success');
    return true;
  }

  if (world.shopLevel < def.minShopLevel) {
    pushTycoonAlert(
      world,
      `购置「${def.name}」需门店达到 Lv.${def.minShopLevel}（当前 Lv.${world.shopLevel}）。`,
      'warning'
    );
    return false;
  }
  if (world.cash < def.cost) {
    pushTycoonAlert(world, `资金不足，装潢改造「${def.name}」需花费 ¥${def.cost}。`, 'warning');
    return false;
  }

  world.cash -= def.cost;
  world.unlockedDecorThemeIds.push(themeId);
  world.activeDecorThemeId = themeId;
  world.reputation = Math.min(100, world.reputation + 4);
  sound.playStoryFanfare();
  pushTycoonAlert(
    world,
    `前厅全新装潢「${def.name}」竣工启用！口碑 +4，${def.perkSummary}！`,
    'success'
  );
  return true;
}

// ============================================================================
// 5. LOCAL STORAGE SAVE / LOAD (AUTO + 3 MANUAL SLOTS)
// ============================================================================

interface StoredSaveBlob {
  meta: SaveSlotMeta;
  world: GameWorld;
}

export function saveGameToSlot(world: GameWorld, slotId: SaveSlotId): SaveSlotMeta | null {
  try {
    const regime = getRegimeDef(world.activeRegimeId);
    const { playerRank } = computeCityLeaderboard(world);

    // Strip transient particles/floating texts & reset pause to clean phase on save
    const cleanPhase = world.phase === 'PAUSED' ? world.pausedFromPhase : world.phase;
    const snapshot: GameWorld = {
      ...world,
      phase: cleanPhase,
      pendingStoryModal: null,
      particles: [],
      floatingTexts: [],
    };

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const savedAt = `${now.getMonth() + 1}/${now.getDate()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const meta: SaveSlotMeta = {
      slotId,
      savedAt,
      day: world.day,
      year: world.year,
      season: world.season,
      shopLevel: world.shopLevel,
      cash: Math.round(world.cash),
      reputation: Math.round(world.reputation),
      characterId: world.characterId,
      regimeName: regime.name,
      cityRank: playerRank,
    };

    const blob: StoredSaveBlob = { meta, world: snapshot };
    localStorage.setItem(`${SAVE_PREFIX}${slotId}`, JSON.stringify(blob));
    return meta;
  } catch {
    return null;
  }
}

export function loadGameFromSlot(slotId: SaveSlotId): GameWorld | null {
  try {
    const raw = localStorage.getItem(`${SAVE_PREFIX}${slotId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSaveBlob;
    if (!parsed || !parsed.world) return null;
    const w = parsed.world;

    // Safe backfill for any newer fields on older saves
    w.staffChattedTodayIds = w.staffChattedTodayIds ?? [];
    w.triggeredSpecialEventIds = w.triggeredSpecialEventIds ?? [];
    w.lastInspectionDay = w.lastInspectionDay ?? 0;
    w.weather = w.weather ?? 'SUNNY';
    w.holiday = w.holiday ?? 'NONE';
    w.activeRivalEvent = w.activeRivalEvent ?? null;
    w.activeMarketing = w.activeMarketing ?? null;
    w.loan = w.loan ?? { remainingPrincipal: 0, dailyInstallment: 0, daysRemaining: 0, totalLoansTaken: 0 };
    w.dailyHistory = w.dailyHistory ?? [];
    w.dishConsumptionCounts = w.dishConsumptionCounts ?? {};
    w.activeDecorThemeId = w.activeDecorThemeId ?? 'harbor_warm';
    w.unlockedDecorThemeIds = w.unlockedDecorThemeIds ?? ['harbor_warm'];
    w.onboardingStep = typeof w.onboardingStep === 'number' ? (w.onboardingStep === 4 ? 9 : w.onboardingStep) : 9;
    w.incidentCooldown = typeof w.incidentCooldown === 'number' ? w.incidentCooldown : 26;
    w.incidentsTriggeredToday = typeof w.incidentsTriggeredToday === 'number' ? w.incidentsTriggeredToday : 0;
    w.recentIncidentIds = w.recentIncidentIds ?? [];
    if (!Array.isArray(w.purchasedRegimeIds)) {
      const legacyRegimes = new Set(w.unlockedRegimeIds ?? ['street_stall']);
      legacyRegimes.add('street_stall');
      if (w.activeRegimeId) legacyRegimes.add(w.activeRegimeId);
      w.purchasedRegimeIds = Array.from(legacyRegimes);
    }
    if (!w.zonePadAssignments) {
      w.zonePadAssignments = createDefaultZonePadAssignments();
    }
    if (!Array.isArray(w.purchasedPadIds)) {
      const legacyPads = new Set<string>(STARTER_PURCHASED_PAD_IDS);
      for (const pad of FRONT_HALL_ZONE_PADS) {
        if (pad.purchaseCost <= 0 || w.zonePadAssignments[pad.id]) {
          legacyPads.add(pad.id);
        }
      }
      w.purchasedPadIds = Array.from(legacyPads);
    }
    for (const pad of FRONT_HALL_ZONE_PADS) {
      if (!(pad.id in w.zonePadAssignments)) {
        w.zonePadAssignments[pad.id] = pad.defaultZone ?? null;
      }
    }
    if (Array.isArray(w.tables)) {
      // Expand older 12-table saves up to 48 tables cleanly before applying adaptive layout
      for (let idx = w.tables.length; idx < TABLE_POSITIONS.length; idx++) {
        const pos = TABLE_POSITIONS[idx];
        w.tables.push({
          id: idx,
          x: pos.x,
          y: pos.y,
          status: 'LOCKED',
          customer: null,
          dirtyTime: 0,
          reservedByStaffId: null,
          setterBonus: 0,
          brothBonus: 0,
          boilPhase: Math.random() * Math.PI * 2,
        });
      }
      applyAdaptiveFrontHallLayout(w);
    }
    w.particles = [];
    w.floatingTexts = [];
    w.pendingStoryModal = null;

    // Migrate older saves to the player-level & upgrade-point talent tree system
    const pendingTechIds = (w.pendingOrders ?? [])
      .filter((o) => o.type === 'UNLOCK_TECH_NODE' && o.targetId)
      .map((o) => o.targetId!);
    const spentNodeIds = new Set([...(w.unlockedTechNodeIds ?? []), ...pendingTechIds]);
    const spentPts = Array.from(spentNodeIds).reduce((sum, nodeId) => {
      const node = TECH_TREE_NODES.find((n) => n.id === nodeId);
      return sum + (node && !node.starterUnlocked ? node.pointCost : 0);
    }, 0);
    syncLegacyPlayerProgression(w, spentPts);

    return w;
  } catch {
    return null;
  }
}

export function deleteSaveSlot(slotId: SaveSlotId): void {
  try {
    localStorage.removeItem(`${SAVE_PREFIX}${slotId}`);
  } catch {
    // ignore storage quota errors
  }
}

export function listSaveSlots(): Record<SaveSlotId, SaveSlotMeta | null> {
  const slotIds: SaveSlotId[] = ['auto', 'slot_1', 'slot_2', 'slot_3'];
  const result: Record<SaveSlotId, SaveSlotMeta | null> = {
    auto: null,
    slot_1: null,
    slot_2: null,
    slot_3: null,
  };
  for (const id of slotIds) {
    try {
      const raw = localStorage.getItem(`${SAVE_PREFIX}${id}`);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredSaveBlob;
      if (parsed?.meta) result[id] = parsed.meta;
    } catch {
      // ignore corrupted slot
    }
  }
  return result;
}

// ============================================================================
// 6. CROSS-RUN PERSISTENT ENCYCLOPEDIA & ACHIEVEMENTS
// ============================================================================

const DEFAULT_ENCYCLOPEDIA: PersistentEncyclopedia = {
  discoveredSeafoodIds: ['prawns', 'beef_rolls', 'veggies_balls', 'garlic_scallops'],
  discoveredBrothIds: ['spicy_tallow', 'seafood_clear'],
  discoveredSynergyIds: [],
  discoveredSpecialCustomerIds: [],
  unlockedEndings: [],
  unlockedAchievementIds: [],
  highestRank: 10,
  maxCashHeld: 0,
  totalDaysAllRuns: 0,
  totalGuestsAllRuns: 0,
  hasCompletedOnboarding: false,
};

export function loadEncyclopedia(): PersistentEncyclopedia {
  try {
    const raw = localStorage.getItem(ENCYCLOPEDIA_KEY);
    if (!raw) return { ...DEFAULT_ENCYCLOPEDIA };
    const parsed = JSON.parse(raw) as Partial<PersistentEncyclopedia>;
    return {
      ...DEFAULT_ENCYCLOPEDIA,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_ENCYCLOPEDIA };
  }
}

export function saveEncyclopedia(enc: PersistentEncyclopedia): void {
  try {
    localStorage.setItem(ENCYCLOPEDIA_KEY, JSON.stringify(enc));
  } catch {
    // ignore storage errors
  }
}

export function markOnboardingCompleted(): void {
  const enc = loadEncyclopedia();
  if (!enc.hasCompletedOnboarding) {
    enc.hasCompletedOnboarding = true;
    saveEncyclopedia(enc);
  }
}

export function syncWorldToEncyclopedia(world: GameWorld): string[] {
  const enc = loadEncyclopedia();
  const addUnique = (arr: string[], items: string[]) => {
    for (const item of items) {
      if (item && !arr.includes(item)) arr.push(item);
    }
  };

  addUnique(enc.discoveredSeafoodIds, world.unlockedSeafoodIds);
  addUnique(enc.discoveredBrothIds, world.unlockedBrothIds);
  addUnique(enc.discoveredSynergyIds, world.discoveredSynergyIds);

  const discoveredCustomers = Object.values(world.specialStories)
    .filter((s) => s.discovered)
    .map((s) => s.id);
  addUnique(enc.discoveredSpecialCustomerIds, discoveredCustomers);

  if (world.endingReport) {
    addUnique(enc.unlockedEndings, [world.endingReport.overallTitle]);
  }

  const { playerRank } = computeCityLeaderboard(world);
  if (playerRank < enc.highestRank) {
    enc.highestRank = playerRank;
  }
  if (world.cash > enc.maxCashHeld) {
    enc.maxCashHeld = Math.round(world.cash);
  }

  // Evaluate 12 Achievements!
  const newlyUnlockedTitles: string[] = [];
  const grant = (achId: string) => {
    if (!enc.unlockedAchievementIds.includes(achId)) {
      enc.unlockedAchievementIds.push(achId);
      const def = ACHIEVEMENTS_CATALOG.find((a) => a.id === achId);
      if (def) newlyUnlockedTitles.push(def.title);
    }
  };

  if (world.totalDaysSurvived >= 1) grant('ach_first_day');
  if (world.todayStats.walkouts === 0 && world.hygiene >= 90 && world.todayStats.guestsServed >= 2) {
    grant('ach_clean_day');
  }
  if (world.cash >= 3000) grant('ach_cash_3000');
  if (world.cash >= 10000) grant('ach_cash_10000');
  if (world.unlockedZones.length >= 7) grant('ach_all_zones');
  if (world.discoveredSynergyIds.length >= 2) grant('ach_synergy_master');
  if (world.year >= 2) grant('ach_full_year');
  if (playerRank <= 3) grant('ach_top3_city');
  if (playerRank === 1) grant('ach_rank_1');
  if (world.unlockedDecorThemeIds.length >= 3) grant('ach_decor_collector');
  if (
    Object.values(world.specialStaffBonds).some((b) => b.relationship === 'MARRIED')
  ) {
    grant('ach_harbor_wedding');
  }
  if (world.mainStoryCompleted) grant('ach_story_finale');

  saveEncyclopedia(enc);
  return newlyUnlockedTitles;
}
