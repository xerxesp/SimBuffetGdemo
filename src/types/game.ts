export type GamePhase =
  | 'MAIN_MENU'
  | 'CHARACTER_SELECT'
  | 'PREP'
  | 'PLAYING'
  | 'CLOSING'
  | 'PAUSED'
  | 'DAY_SUMMARY'
  | 'GAME_OVER';

export type ActiveSceneView = 'DINING_HALL' | 'BACKSTAGE';

export type SeasonId = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';

export type WeatherId = 'SUNNY' | 'RAINY' | 'TYPHOON' | 'HEATWAVE' | 'SNOWY';

export type SeasonalParticleKind = 'SAKURA_PETAL' | 'HEAT_RIPPLE' | 'AUTUMN_LEAF' | 'SNOWFLAKE';

export interface SeasonalVisualParticle {
  kind: SeasonalParticleKind;
  x: number; // Normalized 0..1 horizontal position
  y: number; // Normalized 0..1 vertical position
  vx: number; // Normalized horizontal drift per second
  vy: number; // Normalized vertical drift per second
  size: number; // Base visual radius/scale in logical px
  rotation: number; // Radians
  rotSpeed: number; // Radians per second
  swayPhase: number; // Sinusoidal sway phase
  swayAmp: number; // Normalized horizontal sway amplitude
  depth: 0 | 1 | 2; // 0 = far, 1 = mid, 2 = foreground
  color: string;
  alpha: number;
}

export interface SeasonalVisualState {
  activeSeason: SeasonId;
  previousSeason: SeasonId | null;
  transitionTimer: number; // Seconds remaining in cross-season visual sweep
  transitionDuration: number;
  snowCoverage: number; // 0..1 dynamic winter snow blanket coverage
  heatDistortionIntensity: number; // 0..1 dynamic summer heatwave refraction distortion
  sakuraDensity: number; // 0..1 spring sakura blossom layer opacity
  autumnLeafDensity: number; // 0..1 autumn foliage layer opacity
  particles: SeasonalVisualParticle[];
}

export type HolidayId =
  | 'NONE'
  | 'FISHING_OPEN'
  | 'MID_AUTUMN'
  | 'GOLDEN_WEEK'
  | 'NEW_YEAR_EVE';

export type DecorThemeId =
  | 'harbor_warm'
  | 'retro_mahogany'
  | 'obsidian_sushi'
  | 'azure_luxury';

export type MarketingCampaignId =
  | 'harbor_flyer'
  | 'group_buy'
  | 'food_blogger'
  | 'vip_prepaid';

export type SaveSlotId = 'auto' | 'slot_1' | 'slot_2' | 'slot_3';

export interface ActiveRivalEvent {
  id: string;
  rivalName: string;
  title: string;
  effectDesc: string;
  customerRateMult: number;
  daysRemaining: number;
}

export interface ActiveMarketingCampaign {
  id: MarketingCampaignId;
  name: string;
  daysRemaining: number;
  customerRateMult: number;
  vipBonus: number;
  ticketDelta: number;
}

export interface ActiveLoanState {
  remainingPrincipal: number;
  dailyInstallment: number;
  daysRemaining: number;
  totalLoansTaken: number;
}

export interface DailyHistoryRecord {
  day: number;
  season: SeasonId;
  revenue: number;
  cost: number;
  profit: number;
  guests: number;
  reputation: number;
  hygiene: number;
  walkouts: number;
  stockouts: number;
  weather: WeatherId;
  holiday: HolidayId;
}

export interface SaveSlotMeta {
  slotId: SaveSlotId;
  savedAt: string;
  day: number;
  year: number;
  season: SeasonId;
  shopLevel: number;
  cash: number;
  reputation: number;
  characterId: CharacterId;
  regimeName: string;
  cityRank: number;
}

export interface PersistentEncyclopedia {
  discoveredSeafoodIds: string[];
  discoveredBrothIds: string[];
  discoveredSynergyIds: string[];
  discoveredSpecialCustomerIds: string[];
  unlockedEndings: string[];
  unlockedAchievementIds: string[];
  highestRank: number;
  maxCashHeld: number;
  totalDaysAllRuns: number;
  totalGuestsAllRuns: number;
  hasCompletedOnboarding: boolean;
}

export type RegimeId =
  | 'street_stall'
  | 'harbor_bistro'
  | 'seafood_hall'
  | 'imperial_feast'
  | 'legendary_citadel';

export type PolicyCardCategory = 'DISH' | 'BROTH' | 'OPS';
export type PolicySlotType = 'DISH' | 'BROTH' | 'OPS' | 'WILDCARD';

export type CarryItemType =
  | 'NONE'
  | 'SEAFOOD_TRAY'
  | 'BROTH_POT'
  | 'DIRTY_DISHES'
  | 'CLEAN_TABLEWARE'
  | 'COOKED_PLATTER';

export type TableStatus =
  | 'LOCKED'
  | 'NEEDS_TABLEWARE'
  | 'READY'
  | 'WAITING_BROTH'
  | 'DINING'
  | 'DIRTY';

export type StaffRole =
  | 'HOST'        // 迎宾员
  | 'STOCKER'     // 摆菜切配师
  | 'RUNNER'      // 上锅传菜员
  | 'BUSSER'      // 收桌保洁员
  | 'DISHWASHER'  // 洗碗工
  | 'SETTER'      // 摆台服务员
  | 'CHEF'        // 热厨主厨（加工熟食）
  | 'LIVE_MASTER' // 活鲜水产师（活捞区与冷链库房）
  | 'SUSHI_CHEF'      // 刺身日料师（刺身与日料区）
  | 'TECHNICIAN'      // 设备与设施维保员（设备间与卫生间）
  | 'INVENTORY_CLERK'; // 库存采购员（冷链库房与每日闭店采购）

export type StaffTier = 1 | 2 | 3 | 4;

export type BuffetZoneId =
  | 'live_seafood'
  | 'ice_seafood'
  | 'sashimi_sushi'
  | 'cooked_hot'
  | 'teppan_bbq'
  | 'hotpot_sides'
  | 'drinks_dessert'
  | 'steam_dimsum'
  | 'raw_marinated'
  | 'wagyu_carving';

export type FacilitySceneId =
  | 'cold_storage'
  | 'hot_kitchen'
  | 'dish_washroom'
  | 'restroom'
  | 'equipment_room'
  | 'dormitory'
  | 'office';

export type CharacterId = 'harbor_heir' | 'hotel_director' | 'broth_artisan';

export type SpecialStaffId = 'lin_xi' | 'shen_zhiwei' | 'su_xingyao';

export type RelationshipStatus = 'COLLEAGUE' | 'CLOSE' | 'DATING' | 'MARRIED';

export type StoryPhilosophy = 'CRAFT' | 'EMPIRE' | 'WARMTH';

export interface ManagerCharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  portraitUrl: string;
  accentColor: string;
  backstory: string;
  startingCash: number;
  startingReputation: number;
  perkSummary: string;
  bonuses: {
    ingredientDiscount: number;
    buffetCapacityExtra: number;
    patienceDecayReduction: number;
    tipMultiplierBonus: number;
    playerMoveSpeedMult: number;
    playerWorkSpeedMult: number;
    brothPriceMult: number;
    dineSpeedBonus: number;
    freeSeafoodId?: string;
    freeBrothId?: string;
    freeStarterHost?: boolean;
  };
}

export type SpecialCustomerId = 'critic_shen' | 'master_zhou' | 'heiress_gu' | 'inspector_cheng';

export interface SpecialStoryDef {
  id: SpecialCustomerId;
  customerName: string;
  roleTitle: string;
  color: string;
  tagLabel: string;
  minShopLevel: number;
  minChapter: number;
  minTicketPrice: number;
  maxTicketPrice: number; // Above this price tier, this special customer will NOT appear!
  stage1Goal: string;
  stage2Goal: string;
  stage1Dialogue: string;
  stage2Dialogue: string;
  rewardType: 'SPECIAL_DISH' | 'SPECIAL_STAFF' | 'SUPER_CUSTOMER' | 'SPECIAL_STAFF_BUFF';
  rewardTitle: string;
  rewardDescription: string;
  preferredBrothId?: string;
  requiresHygiene?: number;
}

export interface SpecialStoryProgress {
  id: SpecialCustomerId;
  discovered: boolean;
  stage: 0 | 1 | 2;
  completed: boolean;
}

export interface SpecialStaffBondState {
  id: SpecialStaffId;
  recruitmentStage: 0 | 1 | 2; // 0 = undiscovered, 1 = met in side-story, 2 = recruited!
  recruited: boolean;
  storyStage: number; // 0..5 (matches 5 main chapters!)
  affection: number; // 0..100
  relationship: RelationshipStatus;
  partnerBond: number; // 0..100 maintained once DATING or MARRIED
  daysSinceDate: number;
  currentWish: string | null;
  wishFulfilledToday: boolean;
  lastQuestDay: number;
  storyPathChoice: 'AMBITION' | 'DEVOTION' | 'INDEPENDENT';
}

export type PendingOrderType =
  | 'HIRE_STAFF'
  | 'PROMOTE_STAFF'
  | 'FIRE_STAFF'
  | 'UPGRADE_SHOP'
  | 'EXPAND_TABLES'
  | 'UPGRADE_DISHWARE'
  | 'UPGRADE_BUFFET'
  | 'UNLOCK_SEAFOOD'
  | 'UNLOCK_BROTH'
  | 'UNLOCK_ZONE'
  | 'UNLOCK_TECH_NODE'
  | 'PURCHASE_REGIME'
  | 'PURCHASE_ZONE_PAD';

export interface PendingOrder {
  id: string;
  type: PendingOrderType;
  title: string;
  detail: string;
  daysRemaining: number;
  totalDays: number;
  cost: number;
  candidate?: StaffCandidate;
  staffId?: string;
  targetId?: string;
  targetNumber?: number;
}

export interface PendingDelivery {
  id: string;
  itemId: string; // seafood item id or '__RAW__' for raw kitchen ingredients
  itemName: string;
  quantity: number;
  orderedDay: number;
  arrivalDay: number; // arrives at CLOSING of orderedDay + 1 ("第二天关店后进来")
  cost: number;
  autoOrdered?: boolean;
}

export interface MainChapterDef {
  chapter: number;
  title: string;
  subtitle: string;
  narrative: string;
  completionNarrative: string;
  rewardCash: number;
  rewardReputation: number;
  rewardNote: string;
}

export interface DialogueLine {
  speaker: string;
  title?: string;
  text: string;
  accentColor?: string;
  portraitSide?: 'left' | 'right';
  portraitUrl?: string;
}

export interface StoryChoiceOption {
  id: string;
  label: string;
  hint: string;
  philosophyDelta?: Partial<Record<StoryPhilosophy, number>>;
  cashDelta?: number;
  reputationDelta?: number;
  affectionDelta?: { staffId: SpecialStaffId; amount: number };
  staffPath?: { staffId: SpecialStaffId; path: 'AMBITION' | 'DEVOTION' | 'INDEPENDENT' };
  storyFlag?: { key: string; value: string };
  outcomeText: string;
}

export interface InspectionMetricItem {
  label: string;
  score: number; // 0..100
  statusText: string;
  feedback: string;
  passed: boolean;
}

export interface InspectionReportCard {
  grade: '优秀' | '良好' | '合格' | '不合格';
  overallScore: number;
  metrics: InspectionMetricItem[];
  summaryRewardText: string;
}

export interface StoryModalEvent {
  id: string;
  category:
    | 'MAIN_CHAPTER'
    | 'SPECIAL_CUSTOMER'
    | 'SPECIAL_STAFF'
    | 'FACILITY_SCENE'
    | 'ROMANCE'
    | 'FINALE'
    | 'STAFF_CHAT'
    | 'INSPECTION'
    | 'INCIDENT';
  badge: string;
  speakerName: string;
  speakerTitle: string;
  accentColor: string;
  headline: string;
  body: string;
  lines?: DialogueLine[];
  choices?: StoryChoiceOption[];
  rewardHighlight?: string;
  inspectionScorecard?: InspectionReportCard;
  triggersEndingAfterClose?: boolean;
  finishDayAfterClose?: boolean;
}

export interface EndingEpilogueReport {
  overallTitle: string;
  dominantPhilosophy: StoryPhilosophy;
  shopEnding: { title: string; summary: string };
  managerEnding: { title: string; summary: string };
  staffEndings: Array<{ name: string; roleTitle: string; relationBadge: string; summary: string; color: string }>;
  eraEnding: { title: string; summary: string };
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface SeasonDef {
  id: SeasonId;
  name: string;
  shortName: string;
  color: string;
  costMultiplier: number;
  customerRateMult: number;
  description: string;
  specialtyNote: string;
}

export interface BuffetZoneDef {
  id: BuffetZoneId;
  name: string;
  shortName: string;
  unlockCost: number;
  buildDays: number;
  minShopLevel: number;
  ticketBonus: number;
  vipBonus: number;
  accentColor: string;
  description: string;
  itemsPreview: string;
}

export interface ZonePadDef {
  id: string;
  label: string;
  wingLabel: string;
  minShopLevel: number;
  purchaseCost: number;
  buildDays: number;
  x: number;
  y: number;
  w: number;
  h: number;
  orientation: 'HORIZONTAL' | 'VERTICAL';
  defaultZone?: BuffetZoneId;
}

export interface BrothDef {
  id: string;
  name: string;
  color: string;
  secondaryColor: string;
  unlockCost: number;
  minShopLevel: number;
  priceBonus: number;
  seasons?: SeasonId[]; // Undefined means available all year
  description: string;
}

export interface SeafoodItemDef {
  id: string;
  name: string;
  shortName: string;
  zone: BuffetZoneId;
  color: string;
  accentColor: string;
  unlockCost: number;
  minShopLevel: number;
  ticketBonus: number;
  restockCost: number;
  maxStock: number;
  seasons?: SeasonId[]; // Undefined means available all year
  requiresCooking?: boolean; // Consumes rawIngredients to cook in cooked zone
  description: string;
  isSpecialReward?: boolean;
}

export interface PartTimeJobDef {
  id: string;
  title: string;
  role: StaffRole;
  dailyWage: number;
  durationDays: number;
  tier: StaffTier;
  description: string;
}

export interface FacilitySceneDef {
  id: FacilitySceneId;
  name: string;
  shortName: string;
  accentColor: string;
  description: string;
  linkedRoles: StaffRole[];
}

export interface PolicySlotInstance {
  slotId: string;
  slotType: PolicySlotType;
  cardId: string | null; // e.g. 'dish:prawns', 'broth:spicy_tallow', 'ops:ops_fresh_qc'
}

export interface DiningRegimeDef {
  id: RegimeId;
  name: string;
  eraLabel: string;
  baseTicketPrice: number;
  purchaseCost: number;
  setupDays: number;
  customerRateMult: number;
  vipBonus: number;
  accentColor: string;
  description: string;
  passivePerk: string;
  slots: PolicySlotType[];
}

export interface OpsPolicyCardDef {
  id: string;
  name: string;
  shortEffect: string;
  description: string;
  accentColor: string;
  tipBonus?: number;
  costDiscount?: number;
  customerRateBonus?: number;
  hygieneDecayReduction?: number;
  speedBonus?: number;
  vipChanceBonus?: number;
  extraCookedYield?: number;
  patienceDecayReduction?: number;
}

export interface HiddenSynergyDef {
  id: string;
  name: string;
  badge: string;
  description: string;
  effectText: string;
  accentColor: string;
  tipBonus?: number;
  ticketBonus?: number;
  costDiscount?: number;
  customerRateBonus?: number;
  hygieneDecayReduction?: number;
  speedBonus?: number;
  extraCookedYield?: number;
}

export type TechNodeKind =
  | 'REGIME'
  | 'ZONE'
  | 'SEAFOOD'
  | 'BROTH'
  | 'OPS_CARD'
  | 'SHOP_LEVEL'
  | 'TABLES'
  | 'DISHWARE'
  | 'BUFFET_CAP';

export interface TechTreeNodeDef {
  id: string;
  stage: 1 | 2 | 3 | 4 | 5;
  row: 0 | 1 | 2 | 3 | 4;
  kind: TechNodeKind;
  title: string;
  shortDesc: string;
  detail: string;
  cost: number;
  pointCost: number;
  researchDays: number;
  prereqs: string[];
  targetId?: string;
  targetNumber?: number;
  minDay?: number;
  minReputation?: number;
  isKeystone?: boolean;
  starterUnlocked?: boolean;
  accentColor: string;
}

export interface BackstagePlayerState {
  x: number;
  y: number;
  targetX: number | null;
  targetY: number | null;
  walkCycle: number;
  facing: number;
  pendingInteractScene: FacilitySceneId | null;
  pendingInteractType: 'ACTION' | 'STORY' | 'NPC' | 'EXIT' | null;
  pendingFrontHallTarget?: { x: number; y: number } | null;
}

export interface BuffetSlot {
  slotIndex: number;
  itemId: string;
  stock: number;
  maxStock: number;
  x: number;
  y: number;
  lastGrabFlash: number;
}

export interface CustomerParty {
  id: string;
  isVip: boolean;
  isSuperCustomer?: boolean;
  specialStoryId?: SpecialCustomerId;
  displayName?: string;
  specialTag?: string;
  size: number;
  color: string;
  patience: number;
  maxPatience: number;
  brothId: string;
  dineProgress: number;
  eatCyclesLeft: number;
  nextGrabTimer: number;
  satisfaction: number;
  stockoutHits: number;
  ticketPrice: number;
  bonusTip: number;
  prefersCooked?: boolean;
  speechText?: string | null;
  speechTimer?: number;
  speechCooldown?: number;
}

export interface DiningTable {
  id: number;
  x: number;
  y: number;
  status: TableStatus;
  customer: CustomerParty | null;
  dirtyTime: number;
  reservedByStaffId: string | null;
  setterBonus: number;
  brothBonus: number;
  boilPhase: number;
}

export interface QueueCustomer {
  id: string;
  party: CustomerParty;
  x: number;
  y: number;
  waitTime: number;
}

export interface TaskStep {
  type:
    | 'WALK_TO'
    | 'WELCOME_GUEST'
    | 'PICKUP_SEAFOOD'
    | 'RESTOCK_BUFFET'
    | 'PICKUP_BROTH'
    | 'SERVE_BROTH'
    | 'CLEAR_TABLE'
    | 'DROP_DIRTY'
    | 'WASH_DISHES'
    | 'PICKUP_CLEAN_DISH'
    | 'SET_TABLEWARE'
    | 'COOK_FOOD'
    | 'DELIVER_COOKED'
    | 'ENTER_BACKSTAGE';
  targetX: number;
  targetY: number;
  targetId?: number | string;
  duration?: number;
  progress?: number;
  brothId?: string;
  backstageTargetX?: number;
  backstageTargetY?: number;
  waypoints?: Array<{ x: number; y: number }>;
  stuckTime?: number;
  repathCooldown?: number;
  stationStuckTime?: number;
}

export interface PlayerState {
  x: number;
  y: number;
  speed: number;
  carrying: CarryItemType;
  carryAmount: number;
  carryBrothId: string | null;
  taskQueue: TaskStep[];
  activeTaskLabel: string;
  facing: number;
  walkCycle: number;
  manualMoveTimer?: number;
  ghostModeTimer?: number;
  stationStuckTime?: number;
}

export interface StaffCandidate {
  candidateId: string;
  name: string;
  role: StaffRole;
  tier: StaffTier;
  hireCost: number;
  dailyWage: number;
  moveSpeed: number;
  workSpeed: number;
  carryCapacity: number;
  bonusTitle: string;
  bonusDetail: string;
  bonusValue: number;
  isSpecial?: boolean;
  specialStaffId?: SpecialStaffId;
  isPartTime?: boolean;
  remainingDays?: number;
}

export interface HiredStaff extends StaffCandidate {
  id: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  carrying: CarryItemType;
  carryAmount: number;
  carryBrothId: string | null;
  taskQueue: TaskStep[];
  activeTaskLabel: string;
  idleTimer: number;
  walkCycle: number;
  facing?: number;
  tasksCompleted: number;
  fatigue: number; // 0..100, restored in dormitory
  morale: number; // 0..100
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  kind: 'STEAM' | 'FLY' | 'SPARKLE' | 'SPLASH' | 'ANGRY';
}

export interface AlertLogEntry {
  id: string;
  timeText: string;
  message: string;
  severity: 'info' | 'warning' | 'penalty' | 'success';
}

export interface DailyStats {
  day: number;
  guestsServed: number;
  vipServed: number;
  walkouts: number;
  ticketRevenue: number;
  tipRevenue: number;
  ingredientCost: number;
  staffWages: number;
  rentCost: number;
  penaltyFines: number;
  healthInspectionsFailed: number;
  reputationChange: number;
  cookedDishesServed: number;
  xpEarned?: number;
  levelsGained?: number;
}

export interface GameWorld {
  phase: GamePhase;
  pausedFromPhase: 'PREP' | 'PLAYING' | 'CLOSING';
  day: number;
  year: number;
  season: SeasonId;
  dayInSeason: number; // 1..5
  dayTime: number;
  dayDuration: number;
  speedMultiplier: 1 | 2;
  pendingOrders: PendingOrder[];
  morningReport: string[];
  closingCleanBonusAwarded: boolean;

  // Story, Choices, Multi-Ending & Special Staff Romance
  characterId: CharacterId;
  mainChapter: number; // 1..10
  mainStoryCompleted: boolean;
  storyPhilosophy: Record<StoryPhilosophy, number>;
  storyFlags: Record<string, string>;
  endingReport: EndingEpilogueReport | null;
  showEndingModal: boolean;

  specialStories: Record<SpecialCustomerId, SpecialStoryProgress>;
  specialStaffBonds: Record<SpecialStaffId, SpecialStaffBondState>;
  activePartnerId: SpecialStaffId | null;

  superCustomerUnlocked: boolean;
  hygieneDecayPerk: number;
  finaleTipBonus: number;
  pendingStoryModal: StoryModalEvent | null;
  specialVisitCooldown: number;

  // Core Resources & Player Level Progression
  cash: number;
  reputation: number;
  hygiene: number;
  playerLevel: number;
  playerXp: number;
  upgradePoints: number;
  totalUpgradePointsEarned: number;

  // New Facilities, Cooked Food & Backstage Inventory State
  rawIngredients: number;
  rawIngredientsMax: number;
  warehouseStock: Record<string, number>;
  pendingDeliveries: PendingDelivery[];
  cookedStock: number;
  cookedMaxStock: number;
  restroomCleanliness: number; // 0..100
  equipmentHealth: number; // 0..100
  coldChainTemp: number; // e.g., -18..6 C
  oxygenLevel: number; // 0..100 for live tanks
  facilityEventsDoneToday: FacilitySceneId[];
  staffChattedTodayIds: string[];
  triggeredSpecialEventIds: string[];
  lastInspectionDay: number;
  attendanceCheckedToday: boolean;
  dormFeastDoneToday: boolean;

  // Playable Walkable Backstage & Policy/Regime/TechTree Systems
  activeScene: ActiveSceneView;
  backstagePlayer: BackstagePlayerState;

  activeRegimeId: RegimeId;
  unlockedRegimeIds: RegimeId[];
  purchasedRegimeIds: RegimeId[];
  regimeSwitchCooldown: number; // Days remaining before player can switch regime again
  policySlots: PolicySlotInstance[];
  unlockedOpsCardIds: string[];
  discoveredSynergyIds: string[];
  activeSynergyIds: string[];
  unlockedTechNodeIds: string[];

  // Shop Expansion & Configurable Menu / Pricing
  shopLevel: number;
  tableLimit: number;
  dishwareMax: number;
  cleanDishes: number;
  dirtyDishes: number;
  buffetCapacityBonus: number;

  unlockedZones: BuffetZoneId[];
  purchasedPadIds: string[];
  zonePadAssignments: Record<string, BuffetZoneId | null>;
  unlockedSeafoodIds: string[];
  activeSeafoodIds: string[]; // Driven by Policy Card slots!
  unlockedBrothIds: string[];
  activeBrothIds: string[]; // Driven by Policy Card slots!
  customTicketPrice: number | null; // Synced from active Regime (or optional override)

  tables: DiningTable[];
  buffetSlots: BuffetSlot[];
  queue: QueueCustomer[];
  player: PlayerState;
  staff: HiredStaff[];
  candidates: StaffCandidate[];

  spawnTimer: number;
  hygieneInspectionCooldown: number;
  rushHourActive: boolean;

  floatingTexts: FloatingText[];
  particles: Particle[];
  alerts: AlertLogEntry[];
  todayStats: DailyStats;
  penaltyStrikes: number;
  maxPenaltyStrikes: number;
  totalWalkouts: number;
  totalStockoutComplaints: number;
  totalPenaltyFines: number;
  gameOverTitle: string | null;
  gameOverReason: string | null;
  totalDaysSurvived: number;
  totalCashEarned: number;
  totalGuestsServed: number;

  // Dynamic Environment, Marketing, Finance, Decor, Analytics & Onboarding
  weather: WeatherId;
  holiday: HolidayId;
  seasonalVisual?: SeasonalVisualState;
  activeRivalEvent: ActiveRivalEvent | null;
  activeMarketing: ActiveMarketingCampaign | null;
  loan: ActiveLoanState;
  dailyHistory: DailyHistoryRecord[];
  dishConsumptionCounts: Record<string, number>;
  activeDecorThemeId: DecorThemeId;
  unlockedDecorThemeIds: DecorThemeId[];
  onboardingStep: number; // 0..8 detailed 3-stage Day-1 guide, 9+ completed/dismissed

  // In-service unexpected incidents & branching side-quest pacing
  incidentCooldown: number;
  incidentsTriggeredToday: number;
  recentIncidentIds: string[];
}
