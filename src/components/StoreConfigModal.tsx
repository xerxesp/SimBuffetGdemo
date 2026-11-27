import { useMemo, useState } from 'react';
import {
  ArrowUpCircle,
  Award,
  Building2,
  CalendarClock,
  Check,
  Clock,
  Crown,
  Flame,
  GitBranch,
  Layers,
  LayoutGrid,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  UserMinus,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  BROTH_CATALOG,
  BUFFET_ZONES_CONFIG,
  FRONT_HALL_EXPANSION_BY_LEVEL,
  FRONT_HALL_ZONE_PADS,
  getFrontHallBounds,
  getSeasonDef,
  getShopConfig,
  isAvailableInSeason,
  SEAFOOD_CATALOG,
  STAFF_ROLE_META,
} from '../data/gameConfig';
import {
  DINING_REGIMES,
  getOpsPolicyCardDef,
  getRegimeDef,
  getTechNodeDef,
  HIDDEN_SYNERGIES,
  REGIME_SWITCH_COOLDOWN_DAYS,
  TECH_STAGE_LABELS,
  TECH_TREE_NODES,
} from '../data/policyAndTechConfig';
import {
  canSlotAcceptCard,
  evaluatePolicyBonuses,
  getTechNodeStatus,
  isCardUnlockedAndAvailable,
  parsePolicyCardId,
} from '../engine/policyAndTech';
import {
  ensureZonePadAssignments,
  getTicketFilterPreview,
  isBuffetZoneUnlocked,
  isPadPurchased,
  isZoneBlueprintUnlocked,
} from '../engine/storyAndFacilities';
import {
  getPlayerLevelTitle,
  getXpRequiredForNextLevel,
} from '../engine/playerProgression';
import {
  BuffetZoneId,
  GameWorld,
  PolicyCardCategory,
  PolicySlotType,
  RegimeId,
} from '../types/game';
import { sound } from '../utils/sound';
import { BrothSvgIcon, SeafoodSvgIcon } from './VintageIcons';

export type ConfigTab = 'POLICY' | 'ZONES' | 'TECH_TREE' | 'STAFF';

interface StoreConfigModalProps {
  world: GameWorld;
  initialTab?: ConfigTab;
  onClose: () => void;
  onOpenShopAndClose: () => void;
  onEnterBackstageOffice: () => void;
  onEquipPolicyCard: (slotId: string, cardId: string) => void;
  onUnequipPolicySlot: (slotId: string) => void;
  onAutoSlotPolicyCard: (cardId: string) => void;
  onAssignZonePad: (padId: string, zoneId: BuffetZoneId | null) => void;
  onPurchaseZonePad: (padId: string) => void;
  onBuildBuffetZone: (zoneId: BuffetZoneId) => void;
  onPurchaseRegime: (regimeId: RegimeId) => void;
  onSwitchRegime: (regimeId: RegimeId) => void;
  onStartTechResearch: (nodeId: string) => void;
  onHire: (candidateId: string) => void;
  onPromote: (staffId: string) => void;
  onFire: (staffId: string) => void;
  onCancelFire: (staffId: string) => void;
  onRefreshCandidates: () => void;
}

const SLOT_STYLE: Record<
  PolicySlotType,
  { label: string; short: string; border: string; headerBg: string; text: string }
> = {
  DISH: {
    label: '海鲜菜品位',
    short: '菜品',
    border: '#38B2AC',
    headerBg: 'rgba(17, 74, 72, 0.88)',
    text: '#81E6D9',
  },
  BROTH: {
    label: '秘制锅底位',
    short: '锅底',
    border: '#EA7A3A',
    headerBg: 'rgba(120, 44, 16, 0.88)',
    text: '#FDBA74',
  },
  OPS: {
    label: '经营策略位',
    short: '经营',
    border: '#48BB78',
    headerBg: 'rgba(20, 74, 46, 0.88)',
    text: '#86EFAC',
  },
  WILDCARD: {
    label: '自由搭配位',
    short: '自由',
    border: '#D69E2E',
    headerBg: 'rgba(110, 74, 18, 0.88)',
    text: '#FCE59B',
  },
};

interface LibraryCardVM {
  cardId: string;
  category: PolicyCardCategory;
  title: string;
  subtitle: string;
  effect: string;
  warehouseStock?: number;
  accentColor: string;
  inSeason: boolean;
  equippedSlotId: string | null;
  dishId?: string;
  zoneId?: BuffetZoneId;
  brothId?: string;
  brothColor?: string;
  brothSecondary?: string;
}

export function StoreConfigModal({
  world,
  initialTab = 'POLICY',
  onClose,
  onOpenShopAndClose,
  onEnterBackstageOffice,
  onEquipPolicyCard,
  onUnequipPolicySlot,
  onAutoSlotPolicyCard,
  onAssignZonePad,
  onPurchaseZonePad,
  onBuildBuffetZone,
  onPurchaseRegime,
  onSwitchRegime,
  onStartTechResearch,
  onHire,
  onPromote,
  onFire,
  onCancelFire,
  onRefreshCandidates,
}: StoreConfigModalProps) {
  const [tab, setTab] = useState<ConfigTab>(initialTab);
  const [showRegimePicker, setShowRegimePicker] = useState(false);
  const [cardFilter, setCardFilter] = useState<'ALL' | PolicyCardCategory>('ALL');
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>('tech_dish_oysters');

  const isPrep = world.phase === 'PREP';
  const shopCfg = getShopConfig(world.shopLevel);
  const frontBounds = getFrontHallBounds(world.shopLevel);
  const padAssignments = ensureZonePadAssignments(world);
  const unlockedPadsList = FRONT_HALL_ZONE_PADS.filter((p) => p.minShopLevel <= world.shopLevel);
  const purchasedPadsList = unlockedPadsList.filter((p) => isPadPurchased(world, p.id));
  const occupiedPadCount = purchasedPadsList.filter((p) => Boolean(padAssignments[p.id])).length;
  const seasonDef = getSeasonDef(world.season);
  const activeRegime = getRegimeDef(world.activeRegimeId);
  const policyBonuses = evaluatePolicyBonuses(world);
  const ticketPreview = getTicketFilterPreview(world);

  // Build unified card library from unlocked dishes, broths, and ops cards
  const libraryCards = useMemo<LibraryCardVM[]>(() => {
    const cards: LibraryCardVM[] = [];
    const slotMap = new Map<string, string>();
    for (const s of world.policySlots) {
      if (s.cardId) slotMap.set(s.cardId, s.slotId);
    }

    for (const id of world.unlockedSeafoodIds) {
      const d = SEAFOOD_CATALOG.find((item) => item.id === id);
      if (!d) continue;
      const cardId = `dish:${d.id}`;
      cards.push({
        cardId,
        category: 'DISH',
        title: d.shortName,
        subtitle: d.requiresCooking ? '熟食热菜' : '冰鲜/生鲜',
        effect: `餐位 +¥${Math.round(d.ticketBonus * 0.45)} · 进货参考¥${d.restockCost}`,
        warehouseStock: world.warehouseStock[d.id] ?? 0,
        accentColor: '#38B2AC',
        inSeason: isAvailableInSeason(d.seasons, world.season),
        equippedSlotId: slotMap.get(cardId) ?? null,
        dishId: d.id,
        zoneId: d.zone,
      });
    }

    for (const id of world.unlockedBrothIds) {
      const b = BROTH_CATALOG.find((item) => item.id === id);
      if (!b) continue;
      const cardId = `broth:${b.id}`;
      cards.push({
        cardId,
        category: 'BROTH',
        title: b.name,
        subtitle: b.seasons ? '季节限定锅底' : '四季常供锅底',
        effect: `锅底加价 +¥${b.priceBonus}`,
        accentColor: '#EA7A3A',
        inSeason: isAvailableInSeason(b.seasons, world.season),
        equippedSlotId: slotMap.get(cardId) ?? null,
        brothId: b.id,
        brothColor: b.color,
        brothSecondary: b.secondaryColor,
      });
    }

    for (const id of world.unlockedOpsCardIds) {
      const o = getOpsPolicyCardDef(id);
      if (!o) continue;
      const cardId = `ops:${o.id}`;
      cards.push({
        cardId,
        category: 'OPS',
        title: o.name,
        subtitle: '经营策略卡',
        effect: o.shortEffect,
        accentColor: '#48BB78',
        inSeason: true,
        equippedSlotId: slotMap.get(cardId) ?? null,
      });
    }
    return cards;
  }, [
    world.unlockedSeafoodIds,
    world.unlockedBrothIds,
    world.unlockedOpsCardIds,
    world.policySlots,
    world.season,
    world.warehouseStock,
  ]);

  const cardById = useMemo(() => {
    const m = new Map<string, LibraryCardVM>();
    libraryCards.forEach((c) => m.set(c.cardId, c));
    return m;
  }, [libraryCards]);

  const filteredLibrary = libraryCards.filter(
    (c) => cardFilter === 'ALL' || c.category === cardFilter
  );

  const regularStaff = world.staff.filter((s) => !s.isSpecial && !s.isPartTime);
  const specialStaff = world.staff.filter((s) => s.isSpecial);
  const partTimeStaff = world.staff.filter((s) => s.isPartTime);
  const pendingHires = world.pendingOrders.filter((o) => o.type === 'HIRE_STAFF').length;
  const pendingFires = world.pendingOrders.filter((o) => o.type === 'FIRE_STAFF').length;
  const projectedRegular = regularStaff.length + pendingHires - pendingFires;

  const selectedTechNode = getTechNodeDef(selectedTechId) ?? TECH_TREE_NODES[0];
  const selectedTechStatus = getTechNodeStatus(world, selectedTechNode.id);
  const xpRequired = getXpRequiredForNextLevel(world.playerLevel);
  const xpPercent = Math.min(100, Math.round((world.playerXp / Math.max(1, xpRequired)) * 100));
  const playerLevelTitle = getPlayerLevelTitle(world.playerLevel);

  // Layout geometry for horizontal 5-stage Development Tree SVG connectors
  const COL_W = 216;
  const ROW_H = 104;
  const NODE_W = 176;
  const NODE_H = 74;
  const PAD_X = 24;
  const PAD_Y = 48;
  const getNodeXY = (stage: number, row: number) => ({
    x: PAD_X + (stage - 1) * COL_W,
    y: PAD_Y + row * ROW_H,
  });

  const handleSwitchTab = (next: ConfigTab) => {
    sound.playTabSwitch();
    setTab(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0d0604]/85 backdrop-blur-[3px] flex items-center justify-center p-2.5 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="game-panel w-[96vw] max-w-[1220px] h-[90vh] rounded-xl overflow-hidden flex flex-col text-[#F7EFE2]">
        {/* TOP BRASS & LACQUER HEADER */}
        <header className="px-5 py-3 bg-gradient-to-b from-[#331f15] to-[#1d110c] border-b-2 border-[#b58942] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full border-2 border-[#e8c97a] bg-[#1a0f0a] flex items-center justify-center text-[#e8c97a] shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-display text-lg font-bold text-[#FFF6E5] whitespace-nowrap">
                  门店配置中心
                </h2>
                <span className="text-xs font-mono-num text-[#E8C97A]">
                  门店 Lv.{world.shopLevel} · 店长 Lv.{world.playerLevel}（升级点 {world.upgradePoints}）· 现金 ¥
                  {Math.round(world.cash).toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-[#C5AE92] truncate">
                {isPrep
                  ? '开店前筹备期：消耗升级点与资金启动天赋研发、购置装潢新店面类型、扩建 10 大区域位与特色分区、配置菜单与团队'
                  : '营业/闭店阶段：当前仅供查看进度；天赋研发、店面装潢、区域扩建与菜单配置均需在每日「开店前准备」阶段执行'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPrep && (
              <button
                onClick={onOpenShopAndClose}
                className="game-btn-gold inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                <Sun className="w-3.5 h-3.5" />
                配置完成 · 正式开店
              </button>
            )}
            <button
              onClick={onClose}
              className="game-btn-wood inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <X className="w-4 h-4" />
              返回
            </button>
          </div>
        </header>

        {/* CLEAN 4-TAB NAVIGATION */}
        <nav className="px-5 bg-[#190e0a] border-b border-[#593b25] flex items-center gap-2 shrink-0 overflow-x-auto">
          {[
            {
              id: 'POLICY' as const,
              label: '店面类型与菜单配置',
              sub: `${activeRegime.name} · ${world.policySlots.filter((s) => s.cardId).length}/${world.policySlots.length}位`,
              icon: <Crown className="w-4 h-4" />,
            },
            {
              id: 'ZONES' as const,
              label: '前厅区域布局',
              sub: `已建 ${purchasedPadsList.length}/${FRONT_HALL_ZONE_PADS.length}位 · 已配 ${occupiedPadCount}`,
              icon: <LayoutGrid className="w-4 h-4" />,
            },
            {
              id: 'TECH_TREE' as const,
              label: '天赋发展树',
              sub: `可用 ${world.upgradePoints} 点 · ${world.unlockedTechNodeIds.length}/${TECH_TREE_NODES.length}`,
              icon: <GitBranch className="w-4 h-4" />,
            },
            {
              id: 'STAFF' as const,
              label: '团队与雇员',
              sub: `常规 ${regularStaff.length}/${shopCfg.maxStaffCount} · 特聘 ${specialStaff.length}`,
              icon: <Users className="w-4 h-4" />,
            },
          ].map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSwitchTab(item.id)}
                className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'border-[#e8c97a] text-[#FFF6E5] bg-[#2f1d14]/85'
                    : 'border-transparent text-[#B59876] hover:text-[#F0E3CF]'
                }`}
              >
                <span className={active ? 'text-[#E8C97A]' : 'text-[#8C6E52]'}>{item.icon}</span>
                <span>{item.label}</span>
                <span className="font-mono-num text-[10px] text-[#C5AE92]">{item.sub}</span>
              </button>
            );
          })}

          {world.pendingOrders.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5 text-[11px] font-mono-num text-[#FCD34D] whitespace-nowrap">
              <CalendarClock className="w-3.5 h-3.5" />
              在办排期 {world.pendingOrders.length} 项
            </div>
          )}
        </nav>

        {/* ======================================================
            TAB 1: STORE TYPE & MENU CARD CONFIGURATION
            ====================================================== */}
        {tab === 'POLICY' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-gradient-to-b from-[#1e120c] to-[#140b07]">
            {/* 1. Active Store Type Ribbon + Switcher Toggle */}
            <div className="px-5 py-3 bg-[#24150e] border-b border-[#593b25] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-10 h-10 rounded-lg border-2 flex items-center justify-center shrink-0"
                  style={{
                    borderColor: activeRegime.accentColor,
                    background: 'rgba(20, 11, 7, 0.9)',
                    color: activeRegime.accentColor,
                  }}
                >
                  <Crown className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[11px] text-[#C5AE92]">{activeRegime.eraLabel}</span>
                    <h3 className="font-display text-base font-bold text-[#FFF6E5]">
                      当前店面类型：{activeRegime.name}
                    </h3>
                    <span className="font-mono-num text-xs font-bold text-[#F6DA8D]">
                      当前餐位 ¥{ticketPreview.effectivePrice}/位
                    </span>
                    <span className="text-[11px] text-[#86EFAC]">
                      客流 ×{policyBonuses.customerRateMult.toFixed(2)} · 贵宾 +
                      {Math.round(policyBonuses.vipChanceBonus * 100)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#D6C3A8] truncate mt-0.5">
                    {activeRegime.passivePerk}
                    {ticketPreview.filteredSpecialNames.length > 0 && (
                      <span className="text-[#FBBF24] ml-2">
                        · 当前价位筛走：{ticketPreview.filteredSpecialNames.join('、')}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {world.regimeSwitchCooldown > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono-num text-[#FCD34D] px-2.5 py-1 rounded bg-[#2d1e0e] border border-[#b58942]">
                    <Clock className="w-3.5 h-3.5" />
                    更换冷却余 {world.regimeSwitchCooldown} 天
                  </span>
                )}
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowRegimePicker((v) => !v);
                  }}
                  className="game-btn-wood px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#E8C97A] border-[#b6924d] cursor-pointer whitespace-nowrap"
                >
                  {showRegimePicker ? '收起店面类型' : '切换店面类型'}
                </button>
              </div>
            </div>

            {/* Expandable 5-Store-Type Selector Drawer */}
            {showRegimePicker && (
              <div className="px-5 py-3 bg-[#170d09] border-b border-[#6b472b] shrink-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {DINING_REGIMES.map((reg) => {
                    const unlocked = world.unlockedRegimeIds.includes(reg.id);
                    const purchased = world.purchasedRegimeIds.includes(reg.id);
                    const pendingBuild = world.pendingOrders.find(
                      (o) => o.type === 'PURCHASE_REGIME' && o.targetId === reg.id
                    );
                    const isCurrent = world.activeRegimeId === reg.id;
                    const canPurchase =
                      isPrep &&
                      unlocked &&
                      !purchased &&
                      !pendingBuild &&
                      world.cash >= reg.purchaseCost;
                    const canSwitch =
                      isPrep &&
                      unlocked &&
                      purchased &&
                      !isCurrent &&
                      world.regimeSwitchCooldown === 0;
                    return (
                      <div
                        key={reg.id}
                        className={`p-3 rounded-lg border flex flex-col justify-between gap-2 ${
                          isCurrent
                            ? 'bg-[#382317] border-[#e8c97a]'
                            : pendingBuild
                              ? 'bg-[#192b2d] border-[#38B2AC]'
                              : unlocked
                                ? 'bg-[#261710] border-[#6b472b]'
                                : 'bg-[#1a100b] border-[#3d271a] opacity-65'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="font-display text-sm font-bold"
                              style={{ color: unlocked ? reg.accentColor : '#9E856B' }}
                            >
                              {reg.name}
                            </span>
                            <span className="font-mono-num text-xs font-bold text-[#F6DA8D]">
                              ¥{reg.baseTicketPrice}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {reg.slots.map((st, idx) => (
                              <span
                                key={idx}
                                className="w-4 h-4 rounded-sm border text-[9px] font-bold flex items-center justify-center"
                                style={{
                                  borderColor: SLOT_STYLE[st].border,
                                  backgroundColor: SLOT_STYLE[st].headerBg,
                                  color: SLOT_STYLE[st].text,
                                }}
                                title={SLOT_STYLE[st].label}
                              >
                                {SLOT_STYLE[st].short[0]}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-[#D6C3A8] mt-1.5 leading-snug">
                            {reg.description}
                          </p>
                          {reg.purchaseCost > 0 && !purchased && (
                            <div className="mt-1.5 text-[10px] font-mono-num text-[#F6DA8D]">
                              装潢配置：¥{reg.purchaseCost.toLocaleString()} · 工期 {reg.setupDays} 天
                            </div>
                          )}
                        </div>

                        {isCurrent ? (
                          <div className="text-center text-[11px] font-bold text-[#6EE7B7] py-1">
                            当前营业模式
                          </div>
                        ) : !unlocked ? (
                          <button
                            onClick={() => handleSwitchTab('TECH_TREE')}
                            className="w-full py-1 rounded text-[11px] font-semibold bg-[#281810] text-[#C5AE92] border border-[#593b25] hover:text-[#FFF6E5] cursor-pointer"
                          >
                            需在天赋树解锁 →
                          </button>
                        ) : pendingBuild ? (
                          <div className="w-full py-1 rounded text-center text-[11px] font-bold font-mono-num bg-[#172f2e] border border-[#38B2AC] text-[#81E6D9]">
                            装潢施工中 · 余 {pendingBuild.daysRemaining} 天
                          </div>
                        ) : !purchased ? (
                          <button
                            disabled={!canPurchase}
                            onClick={() => onPurchaseRegime(reg.id)}
                            className={`w-full py-1 rounded text-[11px] font-bold font-mono-num ${
                              canPurchase ? 'game-btn-gold cursor-pointer' : 'game-btn-disabled'
                            }`}
                          >
                            {!isPrep
                              ? '仅开店前可购置'
                              : world.cash < reg.purchaseCost
                                ? `资金不足（需 ¥${reg.purchaseCost}）`
                                : `购置装潢 ¥${reg.purchaseCost}（${reg.setupDays}天）`}
                          </button>
                        ) : (
                          <button
                            disabled={!canSwitch}
                            onClick={() => {
                              onSwitchRegime(reg.id);
                              setShowRegimePicker(false);
                            }}
                            className={`w-full py-1 rounded text-[11px] font-bold ${
                              canSwitch ? 'game-btn-gold cursor-pointer' : 'game-btn-disabled'
                            }`}
                          >
                            {world.regimeSwitchCooldown > 0
                              ? `冷却余 ${world.regimeSwitchCooldown} 天`
                              : !isPrep
                                ? '仅开店前可切换'
                                : `切换 (冷却${REGIME_SWITCH_COOLDOWN_DAYS}天)`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Active Menu & Strategy Card Slots Board */}
            <div className="px-5 py-3.5 bg-[#1b100b] border-b border-[#593b25] shrink-0 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs font-bold text-[#E8C97A] flex items-center gap-2">
                  <span>当前店面配置卡位（拖拽或点击下方卡片装备，点击卡位内卡片卸下）</span>
                </div>
                <div className="text-[11px] font-mono-num text-[#C5AE92] flex items-center gap-3">
                  <span>小费 +{Math.round(policyBonuses.tipBonus * 100)}%</span>
                  <span>采购省 -{Math.round(policyBonuses.costDiscount * 100)}%</span>
                  <span>移速 +{Math.round(policyBonuses.speedBonus * 100)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {world.policySlots.map((slot) => {
                  const st = SLOT_STYLE[slot.slotType];
                  const card = slot.cardId ? cardById.get(slot.cardId) : null;
                  const dragParsed = draggingCardId ? parsePolicyCardId(draggingCardId) : null;
                  const canAcceptDrag =
                    Boolean(dragParsed) && canSlotAcceptCard(slot.slotType, dragParsed!.category);

                  return (
                    <div
                      key={slot.slotId}
                      onDragOver={(e) => {
                        if (canAcceptDrag) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const cid = e.dataTransfer.getData('text/plain') || draggingCardId;
                        if (cid) onEquipPolicyCard(slot.slotId, cid);
                        setDraggingCardId(null);
                      }}
                      onClick={() => {
                        if (card && isPrep) onUnequipPolicySlot(slot.slotId);
                      }}
                      className={`rounded-lg border-2 flex flex-col min-h-[116px] overflow-hidden transition-all ${
                        card && isPrep ? 'cursor-pointer hover:-translate-y-0.5' : ''
                      } ${canAcceptDrag ? 'ring-2 ring-[#FDE047] scale-[1.02]' : ''}`}
                      style={{
                        borderColor: canAcceptDrag ? '#FDE047' : st.border,
                        backgroundColor: card ? '#2f1d14' : 'rgba(22, 12, 8, 0.78)',
                      }}
                    >
                      <div
                        className="px-2 py-1 text-[10px] font-bold flex items-center justify-between"
                        style={{ backgroundColor: st.headerBg, color: st.text }}
                      >
                        <span>{st.short}位</span>
                        {card && isPrep && <span className="opacity-75">×</span>}
                      </div>
                      {card ? (
                        <div className="p-2 flex-1 flex flex-col justify-between">
                          <div className="flex items-start gap-1.5">
                            {card.category === 'DISH' && (
                              <SeafoodSvgIcon
                                itemId={card.dishId}
                                zoneId={card.zoneId}
                                className="w-5 h-5 shrink-0 mt-0.5"
                              />
                            )}
                            {card.category === 'BROTH' && (
                              <BrothSvgIcon
                                brothId={card.brothId}
                                color={card.brothColor}
                                secondaryColor={card.brothSecondary}
                                className="w-5 h-5 shrink-0 mt-0.5"
                              />
                            )}
                            <div className="font-display text-xs font-bold text-[#FFF6E5] leading-tight">
                              {card.title}
                            </div>
                          </div>
                            <div className="text-[10px] text-[#C5AE92] mt-0.5 flex items-center justify-between gap-1">
                              <span>{card.subtitle}</span>
                              {card.warehouseStock !== undefined && (
                                <span
                                  className={`font-mono-num font-bold ${
                                    card.warehouseStock <= 6
                                      ? 'text-[#FCA5A5]'
                                      : 'text-[#81E6D9]'
                                  }`}
                                >
                                  库{card.warehouseStock}
                                </span>
                              )}
                            </div>
                          <div className="text-[10px] font-semibold text-[#E8C97A] leading-tight mt-1">
                            {card.effect}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center p-2 text-center text-[10px] text-[#8C7058]">
                          空置 · 放入{st.short}卡
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Hidden Synergy Discovery Bar (Zero Spoilers for Undiscovered Combos) */}
              <div className="flex items-center gap-2.5 flex-wrap pt-1 text-[11px]">
                <span className="inline-flex items-center gap-1 font-bold text-[#E8C97A]">
                  <Sparkles className="w-3.5 h-3.5" />
                  隐藏菜单共鸣 ({world.discoveredSynergyIds.length}/{HIDDEN_SYNERGIES.length})：
                </span>
                {world.discoveredSynergyIds.length === 0 ? (
                  <span className="text-[#B59876]">
                    暂未发现 · 尝试不同品类、季节限定或经营卡组合即可激活隐藏招牌增益！
                  </span>
                ) : (
                  world.discoveredSynergyIds.map((synId) => {
                    const syn = HIDDEN_SYNERGIES.find((h) => h.id === synId);
                    if (!syn) return null;
                    const active = world.activeSynergyIds.includes(synId);
                    return (
                      <span
                        key={syn.id}
                        title={`${syn.description} → ${syn.effectText}`}
                        className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                          active
                            ? 'bg-[#36240e] border-[#e8c97a] text-[#FEF08A]'
                            : 'bg-[#22150f] border-[#593b25] text-[#9E856B]'
                        }`}
                      >
                        {active ? '✦ ' : ''}
                        {syn.name}（{syn.effectText}）
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. Filterable Card Library */}
            <div className="flex-1 min-h-0 flex flex-col p-5 pt-3.5 overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-3 shrink-0 flex-wrap">
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      { id: 'ALL', label: `全部牌库 (${libraryCards.length})` },
                      {
                        id: 'DISH',
                        label: `海鲜菜品 (${libraryCards.filter((c) => c.category === 'DISH').length})`,
                      },
                      {
                        id: 'BROTH',
                        label: `秘制锅底 (${libraryCards.filter((c) => c.category === 'BROTH').length})`,
                      },
                      {
                        id: 'OPS',
                        label: `经营策略 (${libraryCards.filter((c) => c.category === 'OPS').length})`,
                      },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        sound.playClick();
                        setCardFilter(f.id);
                      }}
                      className={`px-3 py-1 rounded text-xs font-bold border cursor-pointer ${
                        cardFilter === f.id
                          ? 'bg-[#3d2518] border-[#e8c97a] text-[#FFF6E5]'
                          : 'bg-[#21140e] border-[#593b25] text-[#C5AE92] hover:text-[#FFF6E5]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleSwitchTab('TECH_TREE')}
                  className="text-xs font-bold text-[#E8C97A] hover:underline cursor-pointer"
                >
                  前往门店发展树解锁更多新卡片 →
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredLibrary.map((card) => {
                    const equipped = Boolean(card.equippedSlotId);
                    const avail = isCardUnlockedAndAvailable(world, card.cardId);
                    const catStyle = SLOT_STYLE[card.category];

                    return (
                      <div
                        key={card.cardId}
                        title={avail.reason}
                        draggable={isPrep && avail.ok}
                        onDragStart={(e) => {
                          setDraggingCardId(card.cardId);
                          e.dataTransfer.setData('text/plain', card.cardId);
                        }}
                        onDragEnd={() => setDraggingCardId(null)}
                        onClick={() => {
                          if (!isPrep || !avail.ok) return;
                          onAutoSlotPolicyCard(card.cardId);
                        }}
                        className={`rounded-lg border-2 flex flex-col justify-between overflow-hidden transition-all ${
                          equipped
                            ? 'bg-[#3b2518] border-[#e8c97a] shadow-[0_0_12px_rgba(232,201,122,0.22)]'
                            : avail.ok
                              ? 'bg-[#261710] border-[#6b472b] hover:border-[#c9a45c]'
                              : 'bg-[#1a100b] border-[#3d271a] opacity-55'
                        } ${isPrep && avail.ok ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      >
                        <div
                          className="px-2.5 py-1 text-[10px] font-bold flex items-center justify-between"
                          style={{
                            backgroundColor: catStyle.headerBg,
                            color: catStyle.text,
                          }}
                        >
                          <span>{catStyle.label}</span>
                          {equipped ? (
                            <span className="text-[#FDE047]">已上阵</span>
                          ) : !card.inSeason ? (
                            <span className="text-[#FCA5A5]">非当季</span>
                          ) : !avail.ok ? (
                            <span className="text-[#FBBF24]">需扩建分区</span>
                          ) : null}
                        </div>

                        <div className="p-2.5 space-y-1 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {card.category === 'DISH' && (
                                <SeafoodSvgIcon
                                  itemId={card.dishId}
                                  zoneId={card.zoneId}
                                  className="w-6 h-6 shrink-0"
                                />
                              )}
                              {card.category === 'BROTH' && (
                                <BrothSvgIcon
                                  brothId={card.brothId}
                                  color={card.brothColor}
                                  secondaryColor={card.brothSecondary}
                                  className="w-6 h-6 shrink-0"
                                />
                              )}
                              <div className="font-display text-sm font-bold text-[#FFF6E5] leading-snug truncate">
                                {card.title}
                              </div>
                            </div>
                            {card.warehouseStock !== undefined && (
                              <span
                                className={`font-mono-num text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#160c08] border shrink-0 ${
                                  card.warehouseStock <= 6
                                    ? 'border-[#f87171]/60 text-[#FCA5A5]'
                                    : 'border-[#593b25] text-[#81E6D9]'
                                }`}
                              >
                                后仓 {card.warehouseStock}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#C5AE92]">{card.subtitle}</div>
                          <div className="text-[11px] font-semibold text-[#E8C97A] pt-1">
                            {card.effect}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            TAB 2: FRONT HALL 10-AREA LAYOUT & SPECIALTY ZONE CONSTRUCTION
            ====================================================== */}
        {tab === 'ZONES' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-gradient-to-b from-[#1e120c] to-[#140b07]">
            {/* Top Map Expansion Overview Ribbon */}
            <div className="px-5 py-3 bg-[#24150e]/90 border-b border-[#593b25] shrink-0 space-y-2.5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-display text-sm font-bold text-[#FFF6E5]">
                      当前前厅规模：Lv.{world.shopLevel} · {frontBounds.wingTitle}
                    </span>
                    <span className="font-mono-num text-[11px] px-2 py-0.5 rounded bg-[#140b07] border border-[#8c6843] text-[#E8C97A]">
                      桌位 {world.tableLimit}/48 桌
                    </span>
                    <span className="font-mono-num text-[11px] px-2 py-0.5 rounded bg-[#140b07] border border-[#4EAFA2]/60 text-[#81E6D9]">
                      已建 {purchasedPadsList.length}/{FRONT_HALL_ZONE_PADS.length} 区域位
                    </span>
                    <span className="font-mono-num text-[11px] px-2 py-0.5 rounded bg-[#140b07] border border-[#b58942]/60 text-[#FCD34D]">
                      已建成 {world.unlockedZones.length}/{BUFFET_ZONES_CONFIG.length} 特色分区
                    </span>
                  </div>
                  <p className="text-[11px] text-[#C5AE92] mt-1">
                    {frontBounds.expansionNote}。在天赋树解锁店铺等级与分区蓝图后，需于每日「开店前准备」阶段出资并等待工期购置扩建区域位与特色分区，竣工后即可自由配置落位。
                  </p>
                </div>
                <button
                  onClick={() => handleSwitchTab('TECH_TREE')}
                  className="game-btn-wood inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E8C97A] cursor-pointer whitespace-nowrap"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  前往天赋树解锁蓝图
                </button>
              </div>

              {/* 5-Level Expansion Track */}
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((lv) => {
                  const spec = FRONT_HALL_EXPANSION_BY_LEVEL[lv];
                  const reached = world.shopLevel >= lv;
                  const isCurrent = world.shopLevel === lv;
                  const padCountAtLv = FRONT_HALL_ZONE_PADS.filter(
                    (p) => p.minShopLevel <= lv
                  ).length;
                  return (
                    <div
                      key={lv}
                      className={`px-2.5 py-1.5 rounded-lg border text-left transition-colors ${
                        isCurrent
                          ? 'bg-[#362014] border-[#E8C97A] text-[#FFF6E5]'
                          : reached
                            ? 'bg-[#22150e] border-[#6b472b] text-[#E5D3BC]'
                            : 'bg-[#160d09]/80 border-[#3c2719] text-[#8E7761]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span>Lv.{lv}</span>
                        <span className="font-mono-num text-[10px]">可扩至 {padCountAtLv} 区</span>
                      </div>
                      <div className="text-[11px] font-semibold truncate mt-0.5">
                        {spec.wingTitle}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Body: Specialty Zones Construction + 10 Customizable Zone Pads */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
              {/* Section A: 10 Specialty Buffet Zones (Blueprint -> Purchase & Build -> Ready) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-display text-sm font-bold text-[#E8C97A]">
                    特色菜品分区建设（共 {BUFFET_ZONES_CONFIG.length} 大分区 · 天赋解锁蓝图后开店前出资建成）
                  </h3>
                  {!isPrep && (
                    <span className="text-[11px] text-[#FBBF24]">
                      当前非开店前阶段，仅支持查看建设状态
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {BUFFET_ZONES_CONFIG.map((z) => {
                    const built = isBuffetZoneUnlocked(world, z.id);
                    const blueprintUnlocked = isZoneBlueprintUnlocked(world, z.id);
                    const pendingZone = world.pendingOrders.find(
                      (o) => o.type === 'UNLOCK_ZONE' && o.targetId === z.id
                    );
                    const canBuild =
                      isPrep &&
                      blueprintUnlocked &&
                      !built &&
                      !pendingZone &&
                      world.cash >= z.unlockCost;

                    return (
                      <div
                        key={z.id}
                        className={`rounded-lg border p-2.5 flex flex-col justify-between gap-2 ${
                          built
                            ? 'bg-[#172820] border-[#3d7a5b]'
                            : pendingZone
                              ? 'bg-[#172a2e] border-[#38B2AC]'
                              : blueprintUnlocked
                                ? 'bg-[#2b1a11] border-[#b58942]'
                                : 'bg-[#160d09] border-[#3c2719] opacity-70'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="font-display text-xs font-bold truncate"
                              style={{ color: built || blueprintUnlocked ? z.accentColor : '#9E856B' }}
                            >
                              {z.shortName}
                            </span>
                            {built && <Check className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />}
                            {!blueprintUnlocked && <Lock className="w-3 h-3 text-[#8C7058] shrink-0" />}
                          </div>
                          <p className="text-[10px] text-[#C5AE92] mt-1 leading-snug line-clamp-2">
                            {z.description}
                          </p>
                        </div>

                        {built ? (
                          <div className="text-[10px] font-bold text-[#6EE7B7]">
                            已建成 · 可配置至区域位
                          </div>
                        ) : pendingZone ? (
                          <div className="text-[10px] font-bold font-mono-num text-[#81E6D9]">
                            分区施工中 · 余 {pendingZone.daysRemaining} 天
                          </div>
                        ) : !blueprintUnlocked ? (
                          <button
                            onClick={() => handleSwitchTab('TECH_TREE')}
                            className="w-full py-1 rounded text-[10px] font-semibold bg-[#24150e] text-[#C5AE92] border border-[#593b25] hover:text-[#FFF6E5] cursor-pointer"
                          >
                            需天赋树解锁蓝图 →
                          </button>
                        ) : (
                          <button
                            disabled={!canBuild}
                            onClick={() => onBuildBuffetZone(z.id)}
                            className={`w-full py-1 rounded text-[10px] font-bold font-mono-num ${
                              canBuild ? 'game-btn-gold cursor-pointer' : 'game-btn-disabled'
                            }`}
                          >
                            {!isPrep
                              ? `开店前可建 ¥${z.unlockCost}`
                              : world.cash < z.unlockCost
                                ? `资金不足 ¥${z.unlockCost}`
                                : `购置建设 ¥${z.unlockCost}（${z.buildDays}天）`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section B: 10 Spaced Customizable Front-Hall Zone Pads */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-display text-sm font-bold text-[#FFF6E5]">
                    前厅 10 大扩建区域位（开店前购置扩建基座并自由指定菜品区）
                  </h3>
                  <span className="text-[11px] font-mono-num text-[#C5AE92]">
                    已开放资格 {unlockedPadsList.length}/10 · 已竣工 {purchasedPadsList.length}/10
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {FRONT_HALL_ZONE_PADS.map((pad) => {
                    const levelUnlocked = pad.minShopLevel <= world.shopLevel;
                    const purchased = levelUnlocked && isPadPurchased(world, pad.id);
                    const pendingPad = world.pendingOrders.find(
                      (o) => o.type === 'PURCHASE_ZONE_PAD' && o.targetId === pad.id
                    );
                    const canBuyPad =
                      isPrep &&
                      levelUnlocked &&
                      !purchased &&
                      !pendingPad &&
                      world.cash >= pad.purchaseCost;
                    const assignedId = purchased ? padAssignments[pad.id] ?? null : null;
                    const assignedDef = assignedId
                      ? BUFFET_ZONES_CONFIG.find((z) => z.id === assignedId) ?? null
                      : null;

                    return (
                      <div
                        key={pad.id}
                        className={`rounded-xl border p-3.5 flex flex-col gap-2.5 transition-colors ${
                          purchased
                            ? 'bg-[#24160f] border-[#785130]'
                            : pendingPad
                              ? 'bg-[#17282c] border-[#38B2AC]'
                              : levelUnlocked
                                ? 'bg-[#1e1a24] border-[#5b7db3]'
                                : 'bg-[#170e0a]/80 border-[#3c2719] opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-sm font-bold text-[#FFF6E5] truncate">
                                {pad.label}
                              </h3>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#140b07] border border-[#593b25] text-[#C5AE92] whitespace-nowrap">
                                {pad.orientation === 'VERTICAL' ? '纵向廊台' : '横向岛台'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#B59876] mt-0.5">{pad.wingLabel}</div>
                          </div>

                          {purchased ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                                assignedDef
                                  ? 'bg-[#1a2c26] border-[#4EAFA2]/70 text-[#81E6D9]'
                                  : 'bg-[#2d1e12] border-[#b58942]/70 text-[#FCD34D]'
                              }`}
                            >
                              {assignedDef ? assignedDef.shortName : '空位待配置'}
                            </span>
                          ) : pendingPad ? (
                            <span className="text-[10px] font-bold font-mono-num px-2 py-0.5 rounded bg-[#142c30] border border-[#38B2AC] text-[#81E6D9] whitespace-nowrap">
                              施工余 {pendingPad.daysRemaining} 天
                            </span>
                          ) : levelUnlocked ? (
                            <span className="text-[10px] font-bold font-mono-num px-2 py-0.5 rounded bg-[#182438] border border-[#60A5FA]/70 text-[#93C5FD] whitespace-nowrap">
                              待购置 ¥{pad.purchaseCost}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#140b07] border border-[#4a3120] text-[#9c8269] whitespace-nowrap">
                              <Lock className="w-3 h-3" />
                              Lv.{pad.minShopLevel} 扩建解锁
                            </span>
                          )}
                        </div>

                        {purchased ? (
                          <>
                            <div className="text-[11px] text-[#D8C5AD] min-h-[28px]">
                              {assignedDef
                                ? assignedDef.description
                                : '已竣工的空区域位，开店前点击下方任意已建成特色分区即可配置落位。'}
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#422b1c]">
                              {BUFFET_ZONES_CONFIG.map((z) => {
                                const zBuilt = isBuffetZoneUnlocked(world, z.id);
                                const isHere = assignedId === z.id;
                                const placedOtherPad = !isHere
                                  ? purchasedPadsList.find(
                                      (other) => other.id !== pad.id && padAssignments[other.id] === z.id
                                    )
                                  : undefined;
                                const clickable = isPrep && zBuilt && !isHere;

                                return (
                                  <button
                                    key={z.id}
                                    disabled={!clickable}
                                    onClick={() => onAssignZonePad(pad.id, z.id)}
                                    className={`px-2 py-1.5 rounded-lg border text-left text-[11px] transition-all flex items-center justify-between gap-1 ${
                                      isHere
                                        ? 'bg-[#382315] border-[#E8C97A] text-[#FEF08A] font-bold cursor-default'
                                        : clickable
                                          ? 'bg-[#1a100b] border-[#5b3d26] text-[#F0E3CF] hover:border-[#E8C97A] hover:bg-[#2a1a11] cursor-pointer'
                                          : 'bg-[#130b08] border-[#332116] text-[#786350] cursor-not-allowed'
                                    }`}
                                  >
                                    <span className="truncate">{z.shortName}</span>
                                    {isHere ? (
                                      <Check className="w-3 h-3 text-[#E8C97A] shrink-0" />
                                    ) : !zBuilt ? (
                                      <Lock className="w-3 h-3 shrink-0 opacity-70" />
                                    ) : !isPrep ? (
                                      <span className="text-[9px] text-[#9c8269] shrink-0">开店前</span>
                                    ) : placedOtherPad ? (
                                      <span className="text-[9px] text-[#C5AE92] shrink-0">互换</span>
                                    ) : (
                                      <span className="text-[9px] text-[#4ADE80] shrink-0">配置</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {assignedId && (
                              <button
                                disabled={!isPrep}
                                onClick={() => onAssignZonePad(pad.id, null)}
                                className={`mt-0.5 text-[11px] py-1 rounded-lg border border-[#593b25] bg-[#180e0a] text-[#B59876] transition-colors ${
                                  isPrep
                                    ? 'hover:border-[#f87171]/60 hover:text-[#FCA5A5] cursor-pointer'
                                    : 'opacity-45 cursor-not-allowed'
                                }`}
                              >
                                {isPrep ? '清空该区域位' : '仅开店前可调整区域位'}
                              </button>
                            )}
                          </>
                        ) : pendingPad ? (
                          <div className="flex-1 flex flex-col justify-center py-4 text-center text-xs text-[#81E6D9] border-t border-[#295358] space-y-1">
                            <div className="font-bold inline-flex items-center justify-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              区域扩建施工中（预计余 {pendingPad.daysRemaining} 天）
                            </div>
                            <p className="text-[11px] text-[#A8C9CE]">
                              竣工后将自动开放档口水电冷链位，可自由配置任意已建成特色分区。
                            </p>
                          </div>
                        ) : levelUnlocked ? (
                          <div className="flex-1 flex flex-col justify-between py-2 gap-3 border-t border-[#3b4e6e]">
                            <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                              该扩建区域已随 Lv.{pad.minShopLevel} 开放施工资格！需于开店前出资铺设冷链与排烟基座，完工后即可布置特色菜品区。
                            </p>
                            <button
                              disabled={!canBuyPad}
                              onClick={() => onPurchaseZonePad(pad.id)}
                              className={`w-full py-2 rounded-lg text-xs font-bold font-mono-num ${
                                canBuyPad ? 'game-btn-gold cursor-pointer' : 'game-btn-disabled'
                              }`}
                            >
                              {!isPrep
                                ? `仅开店前可购置（¥${pad.purchaseCost} · ${pad.buildDays}天）`
                                : world.cash < pad.purchaseCost
                                  ? `资金不足（需 ¥${pad.purchaseCost}）`
                                  : `购置扩建区域位 · ¥${pad.purchaseCost}（${pad.buildDays}天）`}
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col justify-center py-4 text-center text-xs text-[#9c8269] border-t border-[#332116]">
                            <p>
                              将门店升级至 <strong className="text-[#E8C97A]">Lv.{pad.minShopLevel}</strong>{' '}
                              后，即可解锁此区域位的购置扩建资格（¥{pad.purchaseCost} · {pad.buildDays}天）。
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            TAB 3: 5-STAGE HORIZONTAL TALENT & STORE TREE (天赋发展树)
            ====================================================== */}
        {tab === 'TECH_TREE' && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-gradient-to-b from-[#1c100b] to-[#120a07]">
            {/* Player Level, Revenue-to-XP Bar & Upgrade Points Banner */}
            <div className="px-5 py-2.5 bg-[#23140d] border-b border-[#6b472b] flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-full border border-[#e8c97a] bg-[#311d11] flex items-center justify-center text-[#F6DA8D] shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1 max-w-[440px]">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-display font-bold text-[#FFF6E5] whitespace-nowrap">
                      店长 Lv.{world.playerLevel} · {playerLevelTitle}
                    </span>
                    <span className="font-mono-num text-[11px] text-[#DFCDB6] whitespace-nowrap">
                      {world.playerXp.toLocaleString()} / {xpRequired.toLocaleString()} EXP
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-[#120a07] border border-[#5a3b25] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#d49a3a] via-[#f0cb72] to-[#fde68a] transition-all duration-300"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] text-[#B59876]">
                    累计创收 ¥{Math.round(world.totalCashEarned).toLocaleString()} · 每赚取 ¥1 获得 1 经验，升级即获天赋升级点
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-[10px] text-[#C5AE92]">当前可用升级点</div>
                  <div className="flex items-baseline justify-end gap-1">
                    <span
                      className={`font-mono-num text-2xl font-bold leading-none ${
                        world.upgradePoints > 0 ? 'text-[#FDE047]' : 'text-[#9E856B]'
                      }`}
                    >
                      {world.upgradePoints}
                    </span>
                    <span className="text-xs font-bold text-[#E8C97A]">点</span>
                  </div>
                </div>
                <div className="h-7 w-px bg-[#5a3b25]" aria-hidden="true" />
                <div className="text-[11px] text-[#C5AE92] leading-snug">
                  <div>常规升级 +1 点 · 逢 5 级 +2 点</div>
                  <div className="text-[#F6DA8D]">需同时投入升级点与研发资金并等待工期（开店前启动）</div>
                </div>
              </div>
            </div>

            {/* Scrollable Horizontal Tree Canvas */}
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto p-5">
              <div
                className="relative"
                style={{
                  width: `${PAD_X * 2 + 5 * COL_W - 20}px`,
                  height: `${PAD_Y + 5 * ROW_H + 16}px`,
                }}
              >
                {/* Stage Column Headers */}
                {([1, 2, 3, 4, 5] as const).map((st) => {
                  const colX = PAD_X + (st - 1) * COL_W;
                  return (
                    <div
                      key={st}
                      className="absolute top-0 border-b border-[#6b472b] pb-1.5"
                      style={{ left: `${colX}px`, width: `${NODE_W}px` }}
                    >
                      <div className="font-display text-xs font-bold text-[#E8C97A]">
                        {TECH_STAGE_LABELS[st].title}
                      </div>
                      <div className="text-[10px] text-[#B59876] truncate">
                        {TECH_STAGE_LABELS[st].subtitle}
                      </div>
                    </div>
                  );
                })}

                {/* SVG Prerequisite Connector Lines */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={PAD_X * 2 + 5 * COL_W}
                  height={PAD_Y + 5 * ROW_H + 20}
                >
                  {TECH_TREE_NODES.map((node) => {
                    const to = getNodeXY(node.stage, node.row);
                    const toX = to.x;
                    const toY = to.y + NODE_H / 2;
                    return node.prereqs.map((pid) => {
                      const prev = getTechNodeDef(pid);
                      if (!prev) return null;
                      const from = getNodeXY(prev.stage, prev.row);
                      const fromX = from.x + NODE_W;
                      const fromY = from.y + NODE_H / 2;
                      const midX = (fromX + toX) / 2;
                      const bothDone =
                        world.unlockedTechNodeIds.includes(pid) &&
                        world.unlockedTechNodeIds.includes(node.id);
                      const prevDone = world.unlockedTechNodeIds.includes(pid);
                      return (
                        <path
                          key={`${pid}-${node.id}`}
                          d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                          fill="none"
                          stroke={bothDone ? '#E8C97A' : prevDone ? '#C98A49' : '#4A3121'}
                          strokeWidth={bothDone ? 2.5 : 1.75}
                          strokeDasharray={prevDone ? undefined : '4 3'}
                        />
                      );
                    });
                  })}
                </svg>

                {/* Tech Nodes */}
                {TECH_TREE_NODES.map((node) => {
                  const pos = getNodeXY(node.stage, node.row);
                  const st = getTechNodeStatus(world, node.id);
                  const selected = selectedTechId === node.id;
                  const canAffordBoth =
                    world.upgradePoints >= node.pointCost && world.cash >= node.cost;

                  return (
                    <button
                      key={node.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedTechId(node.id);
                      }}
                      style={{
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        width: `${NODE_W}px`,
                        height: `${NODE_H}px`,
                      }}
                      className={`absolute rounded-lg border-2 px-2.5 py-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                        selected
                          ? 'ring-2 ring-[#FDE047] scale-[1.03] z-10'
                          : 'hover:border-[#d9b060]'
                      } ${
                        st.status === 'UNLOCKED'
                          ? node.isKeystone
                            ? 'bg-[#382710] border-[#E8C97A]'
                            : 'bg-[#192f22] border-[#48BB78]'
                          : st.status === 'RESEARCHING'
                            ? 'bg-[#2e2217] border-[#38B2AC]'
                            : st.status === 'AVAILABLE'
                              ? node.isKeystone
                                ? 'bg-[#352114] border-[#E8C97A]'
                                : 'bg-[#2a1a12] border-[#9C7044]'
                              : 'bg-[#1a100b] border-[#3e281b] opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display text-xs font-bold text-[#FFF6E5] truncate flex items-center gap-1">
                          {node.isKeystone && <Crown className="w-3 h-3 text-[#F2CE74] shrink-0" />}
                          {node.title}
                        </span>
                        {st.status === 'UNLOCKED' && (
                          <Check className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />
                        )}
                        {st.status === 'LOCKED' && (
                          <Lock className="w-3 h-3 text-[#8C7058] shrink-0" />
                        )}
                      </div>

                      <div className="text-[10px] text-[#D6C3A8] truncate">{node.shortDesc}</div>

                      <div className="flex items-center justify-between text-[10px] font-mono-num">
                        {st.status === 'UNLOCKED' ? (
                          <span className="text-[#6EE7B7] font-bold">已解锁</span>
                        ) : st.status === 'RESEARCHING' ? (
                          <span className="text-[#81E6D9] font-bold">
                            筹建中 · 余{st.daysRemaining}天
                          </span>
                        ) : node.pointCost === 0 && node.cost === 0 ? (
                          <span className="text-[#6EE7B7]">初始天赋</span>
                        ) : (
                          <>
                            <span
                              className={
                                st.status === 'AVAILABLE' && canAffordBoth
                                  ? 'text-[#FDE047] font-bold'
                                  : 'text-[#F6DA8D]'
                              }
                            >
                              {node.pointCost}点 + ¥{node.cost}
                            </span>
                            <span className="text-[#C5AE92]">{node.researchDays}天</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Tech Node Bottom Action Bar */}
            <div className="px-5 py-3.5 bg-[#24150e] border-t-2 border-[#8c6239] flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: 'rgba(22, 12, 8, 0.9)',
                      border: `1px solid ${selectedTechNode.accentColor}`,
                      color: selectedTechNode.accentColor,
                    }}
                  >
                    {selectedTechNode.isKeystone ? '门店档次节点' : `阶段 ${selectedTechNode.stage}`}
                  </span>
                  <h4 className="font-display text-base font-bold text-[#FFF6E5]">
                    {selectedTechNode.title}
                  </h4>
                  <span className="text-xs font-mono-num text-[#F6DA8D]">
                    消耗 {selectedTechNode.pointCost} 升级点 + ¥{selectedTechNode.cost.toLocaleString()} · 工期 {selectedTechNode.researchDays} 天
                  </span>
                </div>
                <p className="text-xs text-[#DFCDB6]">{selectedTechNode.detail}</p>
                {selectedTechStatus.reason && (
                  <p className="text-[11px] text-[#FCA5A5]">{selectedTechStatus.reason}</p>
                )}
              </div>

              <div className="shrink-0">
                {selectedTechStatus.status === 'UNLOCKED' ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-[#6EE7B7] bg-[#162d20] border border-[#3a7c58]">
                    <ShieldCheck className="w-4 h-4" />
                    已完成研发
                  </span>
                ) : selectedTechStatus.status === 'RESEARCHING' ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-[#81E6D9] bg-[#172f2e] border border-[#38B2AC]">
                    <Clock className="w-4 h-4" />
                    筹建研发中（余 {selectedTechStatus.daysRemaining} 天）
                  </span>
                ) : (
                  (() => {
                    const hasPts = world.upgradePoints >= selectedTechNode.pointCost;
                    const hasCash = world.cash >= selectedTechNode.cost;
                    const canResearch =
                      isPrep && selectedTechStatus.status === 'AVAILABLE' && hasPts && hasCash;
                    return (
                      <button
                        disabled={!canResearch}
                        onClick={() => onStartTechResearch(selectedTechNode.id)}
                        className={`px-5 py-2.5 rounded-lg text-xs font-bold font-mono-num whitespace-nowrap ${
                          canResearch ? 'game-btn-gold cursor-pointer' : 'game-btn-disabled'
                        }`}
                      >
                        {!isPrep
                          ? '仅限开店前启动研发'
                          : selectedTechStatus.status !== 'AVAILABLE'
                            ? '未满足前置条件'
                            : !hasPts
                              ? `升级点不足（需 ${selectedTechNode.pointCost} 点，当前 ${world.upgradePoints} 点）`
                              : !hasCash
                                ? `资金不足（需 ¥${selectedTechNode.cost.toLocaleString()}）`
                                : `消耗 ${selectedTechNode.pointCost} 点 + ¥${selectedTechNode.cost.toLocaleString()} · 启动筹建（${selectedTechNode.researchDays}天）`}
                      </button>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================
            TAB 3: TEAM ROSTER & TALENT MARKET
            ====================================================== */}
        {tab === 'STAFF' && (
          <div className="flex-1 min-h-0 overflow-y-auto p-5 bg-gradient-to-b from-[#1e120c] to-[#140b07]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left 7 cols: Current Team */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#FFF6E5]">
                      在编团队（常规 {regularStaff.length}/{shopCfg.maxStaffCount} · 特聘{' '}
                      {specialStaff.length} · 兼职 {partTimeStaff.length}）
                    </h3>
                    <p className="text-[11px] text-[#C5AE92]">
                      解锁「门店发展树」更高档次节点可扩充常规编制；雇佣「库存采购员」可在每日闭店后自动补单冷链食材
                    </p>
                  </div>
                  <button
                    onClick={onEnterBackstageOffice}
                    className="game-btn-wood inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#E8C97A] cursor-pointer whitespace-nowrap"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    前往后场办公室招兼职 →
                  </button>
                </div>

                {world.staff.length === 0 ? (
                  <div className="game-inset p-6 rounded-xl text-center text-xs text-[#C5AE92]">
                    当前暂无在职员工，可在右侧人才市场签约常规员工（含库存采购员），或亲赴后场冷链库/热厨/办公室触发支线结识特聘伙伴！
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {world.staff.map((s) => {
                      const meta = STAFF_ROLE_META[s.role];
                      const nextTier = s.tier + 1;
                      const promoCost = Math.round(180 * nextTier * nextTier * 0.72);
                      const hasPendingPromo = world.pendingOrders.some(
                        (o) => o.type === 'PROMOTE_STAFF' && o.staffId === s.id
                      );
                      const hasPendingFire = world.pendingOrders.some(
                        (o) => o.type === 'FIRE_STAFF' && o.staffId === s.id
                      );
                      const canPromote =
                        isPrep &&
                        !s.isSpecial &&
                        !s.isPartTime &&
                        !hasPendingPromo &&
                        !hasPendingFire &&
                        s.tier < shopCfg.maxStaffTier &&
                        s.tier < 4 &&
                        world.cash >= promoCost;

                      return (
                        <div
                          key={s.id}
                          className="game-card p-3.5 rounded-xl flex flex-col justify-between gap-2.5"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-display text-sm font-bold text-[#FFF6E5]">
                                {s.name}
                              </span>
                              <span
                                className="text-[11px] font-bold"
                                style={{ color: meta.color }}
                              >
                                {s.isSpecial
                                  ? '特聘伙伴'
                                  : s.isPartTime
                                    ? `兼职余${s.remainingDays}天`
                                    : `${s.tier}星 ${meta.title}`}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#DFCDB6]">{s.bonusDetail}</div>
                            <div className="text-[10px] font-mono-num text-[#B59876]">
                              日薪 ¥{s.dailyWage} · 疲劳 {Math.round(s.fatigue)}% · 士气{' '}
                              {Math.round(s.morale)}
                            </div>
                          </div>

                          {!s.isSpecial && !s.isPartTime && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                disabled={!canPromote}
                                onClick={() => onPromote(s.id)}
                                className={`flex-1 py-1.5 rounded text-[11px] font-bold inline-flex items-center justify-center gap-1 ${
                                  canPromote ? 'game-btn-gold cursor-pointer' : 'game-btn-disabled'
                                }`}
                              >
                                <ArrowUpCircle className="w-3.5 h-3.5" />
                                {hasPendingPromo
                                  ? '深造排期中'
                                  : s.tier >= 4
                                    ? '已满星'
                                    : `深造 ¥${promoCost}`}
                              </button>
                              {hasPendingFire ? (
                                <button
                                  onClick={() => onCancelFire(s.id)}
                                  className="px-2.5 py-1.5 rounded text-[11px] font-bold game-btn-wood text-[#FCD34D] cursor-pointer"
                                >
                                  撤销离职
                                </button>
                              ) : (
                                <button
                                  disabled={!isPrep}
                                  onClick={() => onFire(s.id)}
                                  className="px-2.5 py-1.5 rounded text-[11px] game-btn-wood text-[#FCA5A5] cursor-pointer disabled:opacity-40"
                                  title="安排明日离职"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right 5 cols: Regular Talent Market */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-[#E8C97A] flex items-center gap-1.5">
                    <Flame className="w-4 h-4" />
                    常规招聘市场（明日报到）
                  </h3>
                  <button
                    disabled={!isPrep || world.cash < 40}
                    onClick={onRefreshCandidates}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold ${
                      isPrep && world.cash >= 40
                        ? 'game-btn-wood text-[#E8C97A] cursor-pointer'
                        : 'game-btn-disabled'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    刷新 ¥40
                  </button>
                </div>

                <div className="space-y-2.5">
                  {world.candidates.map((c) => {
                    const meta = STAFF_ROLE_META[c.role];
                    const canHire =
                      isPrep &&
                      projectedRegular < shopCfg.maxStaffCount &&
                      world.cash >= c.hireCost;
                    return (
                      <div
                        key={c.candidateId}
                        className="game-card p-3 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm font-bold text-[#FFF6E5]">
                              {c.name}
                            </span>
                            <span className="text-xs font-bold" style={{ color: meta.color }}>
                              {c.tier}星 {meta.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#DFCDB6]">{c.bonusDetail}</div>
                          <div className="text-[10px] font-mono-num text-[#B59876]">
                            签约 ¥{c.hireCost} · 日薪 ¥{c.dailyWage}/天
                          </div>
                        </div>
                        <button
                          disabled={!canHire}
                          onClick={() => onHire(c.candidateId)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 whitespace-nowrap ${
                            canHire ? 'game-btn-gold cursor-pointer' : 'game-btn-disabled'
                          }`}
                        >
                          签约
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="game-inset p-3 rounded-lg text-[11px] text-[#C5AE92] flex items-start gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-[#E8C97A] shrink-0 mt-0.5" />
                  <span>
                    提示：冷链活鲜库、热厨出品间与店长办公室藏有神秘支线访客，亲身步入后场与他们结缘即可免费招募传奇特聘伙伴！
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
