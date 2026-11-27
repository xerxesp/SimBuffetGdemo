import { useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Heart,
  MessageCircle,
  Package,
  Sparkles,
  Truck,
  Wrench,
} from 'lucide-react';
import { getSeasonDef, PART_TIME_JOBS, SEAFOOD_CATALOG } from '../data/gameConfig';
import { BACKSTAGE_ROOMS, getBackstageRoomRect } from '../data/policyAndTechConfig';
import { getSpecialStaffDef } from '../data/storyConfig';
import {
  canTriggerRecruitmentSideStory,
  getBackstagePlayerRoom,
} from '../engine/policyAndTech';
import {
  getAvailableSpecialStaffQuests,
  getDishUnitPurchaseCost,
} from '../engine/storyAndFacilities';
import { FacilitySceneId, GameWorld, SpecialStaffId } from '../types/game';
import { HudResourceSvgIcon, SeafoodSvgIcon, SeasonSvgIcon } from './VintageIcons';

interface BackstageRoomDockProps {
  world: GameWorld;
  isTouchDevice?: boolean;
  hudScale?: number;
  compactLayout?: boolean;
  bottomOffsetPx?: number;
  rightReservePx?: number;
  onExitBackstage: () => void;
  onWalkToRoom: (roomId: FacilitySceneId) => void;
  onPerformRoomAction: (roomId: FacilitySceneId) => void;
  onTriggerRoomStory: (roomId: FacilitySceneId) => void;
  onTriggerRecruitmentSideStory: (staffId: SpecialStaffId) => void;
  onTriggerSpecialQuest: (staffId: SpecialStaffId) => void;
  onInteractSpecialStaff: (staffId: SpecialStaffId, mode: 'CHAT' | 'GIFT') => void;
  onConfessOrPropose: (staffId: SpecialStaffId) => void;
  onSpendTimePartner: (staffId: SpecialStaffId, fulfillWish: boolean) => void;
  onProcureIngredients: (amount: number) => void;
  onPlaceWarehouseOrder: (itemId: string, quantity: number) => void;
  onPostPartTime: (jobId: string) => void;
}

const ROOM_ACTION_LABEL: Record<FacilitySceneId, string> = {
  cold_storage: '换水增氧巡检',
  hot_kitchen: '加急现烹熟食 (+3)',
  dish_washroom: '集中高温洗消',
  office: '核查考勤 (+士气)',
  restroom: '全面保洁补耗材',
  equipment_room: '机电例行检修 (¥30)',
  dormitory: '安排宵夜慰问 (¥40)',
};

export function BackstageRoomDock({
  world,
  isTouchDevice = false,
  hudScale = 1,
  compactLayout = false,
  bottomOffsetPx = 10,
  rightReservePx = 0,
  onExitBackstage,
  onWalkToRoom,
  onPerformRoomAction,
  onTriggerRoomStory,
  onTriggerRecruitmentSideStory,
  onTriggerSpecialQuest,
  onInteractSpecialStaff,
  onConfessOrPropose,
  onSpendTimePartner,
  onProcureIngredients,
  onPlaceWarehouseOrder,
  onPostPartTime,
}: BackstageRoomDockProps) {
  const [drawerMode, setDrawerMode] = useState<'NONE' | 'WAREHOUSE' | 'PROCURE' | 'PART_TIME'>(
    'NONE'
  );

  const currentRoomId = getBackstagePlayerRoom(world);
  const roomRect = currentRoomId ? getBackstageRoomRect(currentRoomId) : null;
  const seasonDef = getSeasonDef(world.season);
  const availQuests = getAvailableSpecialStaffQuests(world);

  const effectivePhase = world.phase === 'PAUSED' ? world.pausedFromPhase : world.phase;
  const isClosing = effectivePhase === 'CLOSING';
  const hasInventoryClerk = world.staff.some((s) => s.role === 'INVENTORY_CLERK');

  const npcStaffId = roomRect?.sideStoryStaffId;
  const npcBond = npcStaffId ? world.specialStaffBonds[npcStaffId] : null;
  const npcDef = npcStaffId ? getSpecialStaffDef(npcStaffId) : null;
  const recruitCheck = npcStaffId ? canTriggerRecruitmentSideStory(world, npcStaffId) : null;
  const storyDoneToday = currentRoomId
    ? world.facilityEventsDoneToday.includes(currentRoomId)
    : false;

  const partnerId = world.activePartnerId;
  const partnerBond = partnerId ? world.specialStaffBonds[partnerId] : null;
  const partnerDef = partnerId ? getSpecialStaffDef(partnerId) : null;

  // Build warehouse procurement list: active configured dishes + raw cooked ingredients
  const activeDishIds = Array.from(
    new Set([
      ...world.buffetSlots.map((s) => s.itemId),
      ...world.activeSeafoodIds,
    ])
  );
  const lowWarehouseCount = activeDishIds.filter(
    (id) => (world.warehouseStock[id] ?? 0) <= 8
  ).length;

  const canOpenWarehouse =
    currentRoomId === 'cold_storage' || currentRoomId === 'office';

  const getInTransitQty = (itemId: string) =>
    world.pendingDeliveries
      .filter((d) => d.itemId === itemId)
      .reduce((acc, d) => acc + d.quantity, 0);

  const isScaled = Math.abs(hudScale - 1) > 0.005;
  const dockAnchorLeft = rightReservePx > 0;

  return (
    <div
      className={`absolute z-30 pointer-events-none flex flex-col gap-2 ${
        dockAnchorLeft
          ? 'items-start'
          : 'left-2.5 right-2.5 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-[92vw] md:max-w-[820px] xl:max-w-[940px] items-center'
      }`}
      style={{
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottomOffsetPx}px)`,
        ...(dockAnchorLeft
          ? {
              left: 'calc(env(safe-area-inset-left, 0px) + 10px)',
              width: `calc((100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px) - ${rightReservePx + 18}px) / ${hudScale})`,
              maxWidth: '880px',
            }
          : {}),
        ...(isScaled
          ? {
              transform: `scale(${hudScale})`,
              transformOrigin: dockAnchorLeft ? 'bottom left' : 'bottom center',
            }
          : {}),
      }}
    >
      {/* Expandable Warehouse Closing Procurement Drawer (Cold Storage / Office) */}
      {canOpenWarehouse && drawerMode === 'WAREHOUSE' && (
        <div className="pointer-events-auto game-panel rounded-xl p-3 sm:p-3.5 w-full max-w-[820px] space-y-2.5 max-h-[46dvh] flex flex-col">
          <div className="flex items-center justify-between gap-2 text-xs shrink-0 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-[#E8C97A] flex items-center gap-1.5">
                <HudResourceSvgIcon kind="DELIVERY" className="w-4 h-4 shrink-0" />
                <span>闭店冷链补货采购单 ·</span>
                <SeasonSvgIcon season={world.season} className="w-4 h-4 shrink-0" />
                <span>{seasonDef.name}（行情 ×{seasonDef.costMultiplier}）</span>
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                  isClosing
                    ? 'bg-[#2c2110] border-[#e8c97a] text-[#FDE047]'
                    : 'bg-[#1a100b] border-[#593b25] text-[#C5AE92]'
                }`}
              >
                {isClosing ? '闭店下单窗口已开放 · 明日闭店后到货入库' : '仅限每日闭店收尾阶段下单'}
              </span>
              {hasInventoryClerk && (
                <span className="text-[11px] text-[#86EFAC] font-semibold">
                  ✓ 已雇库存采购员（闭店自动补单）
                </span>
              )}
            </div>
            <button
              onClick={() => setDrawerMode('NONE')}
              className="text-[#C5AE92] hover:text-[#FFF6E5] cursor-pointer"
            >
              收起
            </button>
          </div>

          {/* Per-Dish Warehouse Stock & Order Grid */}
          <div className="overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {activeDishIds.map((itemId) => {
              const def = SEAFOOD_CATALOG.find((c) => c.id === itemId);
              if (!def) return null;
              const stock = world.warehouseStock[itemId] ?? 0;
              const inTransit = getInTransitQty(itemId);
              const unitCost = getDishUnitPurchaseCost(world, itemId);
              const batchQty = 12;
              const batchCost = unitCost * batchQty;
              const canOrder = isClosing && world.cash >= batchCost;

              return (
                <div
                  key={itemId}
                  className={`game-card p-2.5 rounded-lg flex items-center justify-between gap-2 ${
                    stock <= 6 ? 'border-[#f87171]/70' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-[#180e0a] border border-[#6b472b] flex items-center justify-center shrink-0">
                      <SeafoodSvgIcon itemId={def.id} zoneId={def.zone} className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-xs font-bold text-[#FFF6E5] truncate">
                        {def.shortName}
                      </div>
                      <div className="text-[10px] font-mono-num flex items-center gap-2 mt-0.5">
                        <span className={stock <= 6 ? 'text-[#FCA5A5] font-bold' : 'text-[#DECBB0]'}>
                          库余 {stock} 份
                        </span>
                        {inTransit > 0 && (
                          <span className="text-[#7DD3FC]">在途 +{inTransit}</span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono-num text-[#B59876]">
                        单价 ¥{unitCost}/份
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={!canOrder}
                    onClick={() => onPlaceWarehouseOrder(itemId, batchQty)}
                    className={`px-2.5 py-1.5 rounded text-[11px] font-bold shrink-0 whitespace-nowrap ${
                      canOrder ? 'game-btn-gold cursor-pointer' : 'game-btn-disabled'
                    }`}
                  >
                    +{batchQty}份 ¥{batchCost}
                  </button>
                </div>
              );
            })}

            {/* Raw Ingredients for Cooked Counter */}
            {(() => {
              const unitCost = getDishUnitPurchaseCost(world, '__RAW__');
              const batchQty = 12;
              const batchCost = unitCost * batchQty;
              const inTransit = getInTransitQty('__RAW__');
              const canOrder = isClosing && world.cash >= batchCost;
              return (
                <div
                  className={`game-card p-2.5 rounded-lg flex items-center justify-between gap-2 ${
                    world.rawIngredients <= 8 ? 'border-[#fb923c]/75' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-display text-xs font-bold text-[#FDBA74] truncate">
                      熟食冷链原料
                    </div>
                    <div className="text-[10px] font-mono-num flex items-center gap-2 mt-0.5">
                      <span className="text-[#DECBB0]">
                        库余 {world.rawIngredients}/{world.rawIngredientsMax}
                      </span>
                      {inTransit > 0 && (
                        <span className="text-[#7DD3FC]">在途 +{inTransit}</span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono-num text-[#B59876]">
                      单价 ¥{unitCost}/份
                    </div>
                  </div>
                  <button
                    disabled={!canOrder}
                    onClick={() => onPlaceWarehouseOrder('__RAW__', batchQty)}
                    className={`px-2.5 py-1.5 rounded text-[11px] font-bold shrink-0 whitespace-nowrap ${
                      canOrder ? 'game-btn-gold cursor-pointer' : 'game-btn-disabled'
                    }`}
                  >
                    +{batchQty}份 ¥{batchCost}
                  </button>
                </div>
              );
            })()}
          </div>

          {/* In-Transit Cold-Chain Trucks Manifest */}
          {world.pendingDeliveries.length > 0 && (
            <div className="game-inset px-3 py-2 rounded-lg text-[11px] flex items-center gap-2 flex-wrap shrink-0">
              <span className="font-bold text-[#7DD3FC] whitespace-nowrap">
                在途冷链车 ({world.pendingDeliveries.length} 笔)：
              </span>
              {world.pendingDeliveries.slice(0, 6).map((d) => (
                <span
                  key={d.id}
                  className="px-2 py-0.5 rounded bg-[#24160f] border border-[#6b472b] text-[#E6D6C0] font-mono-num"
                >
                  {d.itemName} ×{d.quantity}（第{d.arrivalDay}天闭店入库）
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expandable Compact Office Drawer (Emergency Raw Procure / Part-Time Jobs) */}
      {currentRoomId === 'office' && drawerMode === 'PROCURE' && (
        <div className="pointer-events-auto game-panel rounded-xl p-3.5 w-full max-w-[740px] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-display font-bold text-[#E8C97A]">
              加急直采熟食原料 · {seasonDef.name}（行情 ×{seasonDef.costMultiplier} · 现存 {world.rawIngredients}/{world.rawIngredientsMax}）
            </span>
            <button
              onClick={() => setDrawerMode('NONE')}
              className="text-[#C5AE92] hover:text-[#FFF6E5] cursor-pointer"
            >
              收起
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[10, 20, 35].map((qty) => {
              const cost = Math.round(4 * seasonDef.costMultiplier) * qty;
              return (
                <button
                  key={qty}
                  onClick={() => onProcureIngredients(qty)}
                  className="game-btn-gold py-2 px-3 rounded-lg text-xs font-bold cursor-pointer"
                >
                  直采 +{qty} 份原料（¥{cost}）
                </button>
              );
            })}
          </div>
        </div>
      )}

      {currentRoomId === 'office' && drawerMode === 'PART_TIME' && (
        <div className="pointer-events-auto game-panel rounded-xl p-3.5 w-full max-w-[780px] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-display font-bold text-[#7DD3FC]">
              发布灵活用工兼职（不占常规编制 · 即刻上岗 · 当前在岗 {world.staff.filter((s) => s.isPartTime).length}/3）
            </span>
            <button
              onClick={() => setDrawerMode('NONE')}
              className="text-[#C5AE92] hover:text-[#FFF6E5] cursor-pointer"
            >
              收起
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {PART_TIME_JOBS.map((job) => (
              <button
                key={job.id}
                onClick={() => onPostPartTime(job.id)}
                className="game-btn-wood p-2.5 rounded-lg text-left cursor-pointer"
              >
                <div className="font-bold text-xs text-[#FFF6E5]">{job.title}</div>
                <div className="text-[10px] text-[#E8C97A] font-mono-num mt-0.5">
                  日薪 ¥{job.dailyWage} · 签约 {job.durationDays} 天
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Floating Room Command Dock */}
      <div
        className={`pointer-events-auto hud-float backdrop-blur-md rounded-xl w-full ${
          compactLayout ? 'px-2.5 py-1.5 space-y-1.5' : 'px-2.5 sm:px-4 py-2 sm:py-2.5 space-y-2'
        }`}
      >
        {/* Top Row: Quick Room Jump Bar + Exit to Dining Hall */}
        <div
          className={`flex items-center justify-between gap-2 border-b border-[#593b25] ${
            compactLayout ? 'pb-1.5' : 'pb-2'
          }`}
        >
          <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap overflow-x-auto no-scrollbar touch-scroll min-w-0">
            {BACKSTAGE_ROOMS.map((r) => {
              const active = currentRoomId === r.id;
              const hasUnrecruitedNpc =
                !world.mainStoryCompleted &&
                r.sideStoryStaffId &&
                !world.specialStaffBonds[r.sideStoryStaffId].recruited;
              const needsClosingProcure =
                r.id === 'cold_storage' && isClosing && lowWarehouseCount > 0;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setDrawerMode('NONE');
                    onWalkToRoom(r.id);
                  }}
                  className={`px-2.5 py-1.5 sm:py-1 rounded text-[11px] font-bold border cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#42291c] border-[#e8c97a] text-[#FFF6E5]'
                      : 'bg-[#1c100b] border-[#593b25] text-[#C5AE92] hover:border-[#c9a45c]'
                  }`}
                >
                  {r.shortName}
                  {hasUnrecruitedNpc && <span className="text-[#FACC15] ml-1">!</span>}
                  {needsClosingProcure && <span className="text-[#7DD3FC] ml-1">补</span>}
                </button>
              );
            })}
          </div>

          <button
            onClick={onExitBackstage}
            className="game-btn-gold inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-1 rounded text-xs font-bold cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isTouchDevice ? '回前厅' : '返回前厅 [M]'}</span>
          </button>
        </div>

        {/* Bottom Row: Contextual Actions for Current Room */}
        {!roomRect ? (
          <div className="text-[11px] sm:text-xs text-[#D6C3A8] flex items-center justify-between gap-3 py-0.5">
            <span>
              当前位于 <strong className="text-[#FFF6E5]">后场中央走廊</strong> ·{' '}
              {isTouchDevice ? (
                <>
                  <strong className="text-[#E8C97A]">单指拖动视角</strong> 或{' '}
                  <strong className="text-[#E8C97A]">点击房间/上方标签</strong> 走入巡视
                </>
              ) : (
                <>
                  使用 <strong className="text-[#E8C97A]">WASD / 方向键</strong> 或{' '}
                  <strong className="text-[#E8C97A]">点击任意房间</strong> 走入巡视
                </>
              )}
              {world.mainStoryCompleted ? (
                <span className="text-[#6EE7B7] font-semibold">（终章已完结 · 无尽纯经营模式）</span>
              ) : (
                <>
                  （带 <span className="text-[#FACC15] font-bold">!</span> 的房间有可招募的神秘访客）
                </>
              )}
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="font-display text-sm font-bold"
                  style={{ color: roomRect.accentColor }}
                >
                  {roomRect.name}
                </span>
                {world.mainStoryCompleted && (
                  <span className="text-[11px] font-semibold text-[#6EE7B7]">
                    · 终章已完结（剧情不再触发）
                  </span>
                )}
                {!world.mainStoryCompleted && npcDef && npcBond && (
                  <span className="text-[11px] text-[#E8C97A]">
                    · 室内人物：
                    {npcBond.recruited
                      ? `${npcDef.name}（好感 ${npcBond.affection}）`
                      : npcBond.recruitmentStage === 1
                        ? `${npcDef.name}（招募支线 1/2）`
                        : '神秘访客'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap sm:flex-wrap overflow-x-auto no-scrollbar touch-scroll pb-0.5 sm:pb-0">
              {/* 1. Primary Room Operational Action */}
              <button
                onClick={() => onPerformRoomAction(roomRect.id)}
                className="game-btn-wood inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#FFF6E5] cursor-pointer whitespace-nowrap"
              >
                <Wrench className="w-3.5 h-3.5 text-[#7DD3FC]" />
                {ROOM_ACTION_LABEL[roomRect.id]}
              </button>

              {/* 2. Closing Cold-Chain Warehouse Procurement (Cold Storage & Office) */}
              {canOpenWarehouse && (
                <button
                  onClick={() =>
                    setDrawerMode((m) => (m === 'WAREHOUSE' ? 'NONE' : 'WAREHOUSE'))
                  }
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                    isClosing && lowWarehouseCount > 0
                      ? 'game-btn-gold'
                      : 'game-btn-wood text-[#7DD3FC] border-[#8c6239]'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  闭店冷链补货
                  {lowWarehouseCount > 0 ? ` (${lowWarehouseCount}缺)` : ''}
                </button>
              )}

              {/* 3. Daily Room Story Event (Frozen after main ending) */}
              {!world.mainStoryCompleted && (
                <button
                  disabled={storyDoneToday}
                  onClick={() => onTriggerRoomStory(roomRect.id)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                    storyDoneToday
                      ? 'game-btn-disabled'
                      : 'game-btn-wood text-[#E8C97A] border-[#b6924d] cursor-pointer'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {storyDoneToday ? '今日巡视剧情已看' : '巡视互动剧情'}
                </button>
              )}

              {/* 4. Office Sub-Drawers */}
              {roomRect.id === 'office' && (
                <>
                  <button
                    onClick={() =>
                      setDrawerMode((p) => (p === 'PROCURE' ? 'NONE' : 'PROCURE'))
                    }
                    className="game-btn-wood inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#6EE7B7] cursor-pointer whitespace-nowrap"
                  >
                    <Package className="w-3.5 h-3.5" />
                    加急原料
                  </button>
                  <button
                    onClick={() =>
                      setDrawerMode((p) => (p === 'PART_TIME' ? 'NONE' : 'PART_TIME'))
                    }
                    className="game-btn-wood inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#7DD3FC] cursor-pointer whitespace-nowrap"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    发布兼职
                  </button>
                </>
              )}

              {/* 5. Special Staff NPC Side-Story Recruitment OR Personal Arc (Frozen after main ending) */}
              {!world.mainStoryCompleted &&
                npcStaffId &&
                npcBond &&
                npcDef &&
                !npcBond.recruited &&
                recruitCheck && (
                  <button
                    disabled={!recruitCheck.canTrigger}
                    onClick={() => onTriggerRecruitmentSideStory(npcStaffId)}
                    className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                      recruitCheck.canTrigger ? 'game-btn-gold cursor-pointer' : 'game-btn-disabled'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {recruitCheck.hint}
                  </button>
                )}

              {!world.mainStoryCompleted &&
                npcStaffId &&
                npcBond &&
                npcDef &&
                npcBond.recruited && (
                  <>
                    {availQuests.includes(npcStaffId) && (
                      <button
                        onClick={() => onTriggerSpecialQuest(npcStaffId)}
                        className="game-btn-gold inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {npcDef.name}第{npcBond.storyStage + 1}幕剧情
                      </button>
                    )}
                    <button
                      onClick={() => onInteractSpecialStaff(npcStaffId, 'CHAT')}
                      className="game-btn-wood px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#F9A8D4] cursor-pointer whitespace-nowrap"
                    >
                      闲聊 +5
                    </button>
                    <button
                      onClick={() => onInteractSpecialStaff(npcStaffId, 'GIFT')}
                      className="game-btn-wood px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#F2CE74] cursor-pointer whitespace-nowrap"
                    >
                      赠礼 ¥45
                    </button>
                    {npcBond.affection >= 80 && npcBond.relationship !== 'MARRIED' && (
                      <button
                        onClick={() => onConfessOrPropose(npcStaffId)}
                        className="game-btn-gold inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
                      >
                        <Heart className="w-3.5 h-3.5" />
                        {npcBond.relationship === 'DATING' ? '海港求婚' : '倾心表白'}
                      </button>
                    )}
                  </>
                )}

              {/* 6. Dormitory Partner Maintenance Actions (Frozen after main ending) */}
              {!world.mainStoryCompleted &&
                roomRect.id === 'dormitory' &&
                partnerId &&
                partnerBond &&
                partnerDef && (
                  <>
                    <button
                      onClick={() => onSpendTimePartner(partnerId, false)}
                      className="game-btn-wood inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#F9A8D4] cursor-pointer whitespace-nowrap"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      陪伴{partnerDef.name}（亲密{Math.round(partnerBond.partnerBond)}%）
                    </button>
                    <button
                      onClick={() => onSpendTimePartner(partnerId, true)}
                      className="game-btn-gold inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      满足心愿 ¥50
                    </button>
                  </>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
