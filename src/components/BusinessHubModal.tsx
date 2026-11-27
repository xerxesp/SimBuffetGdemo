import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Check,
  Coins,
  Crown,
  Landmark,
  Megaphone,
  Paintbrush,
  Sparkles,
  Swords,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react';
import { getSeasonDef, SEAFOOD_CATALOG } from '../data/gameConfig';
import {
  DECOR_THEMES,
  getHolidayDef,
  getWeatherDef,
  MARKETING_CAMPAIGNS,
} from '../data/tycoonSystemsConfig';
import { computeCityLeaderboard, evaluateTycoonModifiers } from '../engine/tycoonSystems';
import { DecorThemeId, GameWorld, MarketingCampaignId } from '../types/game';
import { HudResourceSvgIcon, SeasonSvgIcon, WeatherSvgIcon } from './VintageIcons';

export type BusinessTab = 'MARKETING' | 'DECOR' | 'RANKING' | 'ANALYTICS';

interface BusinessHubModalProps {
  world: GameWorld;
  initialTab?: BusinessTab;
  onLaunchMarketing: (id: MarketingCampaignId) => void;
  onTakeLoan: (amount: 400 | 800) => void;
  onRepayLoan: () => void;
  onBuyOrEquipDecor: (id: DecorThemeId) => void;
  onClose: () => void;
}

export function BusinessHubModal({
  world,
  initialTab = 'MARKETING',
  onLaunchMarketing,
  onTakeLoan,
  onRepayLoan,
  onBuyOrEquipDecor,
  onClose,
}: BusinessHubModalProps) {
  const [tab, setTab] = useState<BusinessTab>(initialTab);

  const seasonDef = getSeasonDef(world.season);
  const weatherDef = getWeatherDef(world.weather);
  const holidayDef = getHolidayDef(world.holiday);
  const mods = evaluateTycoonModifiers(world);
  const { rows: leaderboard, playerRank, playerScore } = computeCityLeaderboard(world);

  // Dish consumption top 8
  const topDishes = Object.entries(world.dishConsumptionCounts)
    .map(([id, count]) => {
      const def = SEAFOOD_CATALOG.find((s) => s.id === id);
      return {
        id,
        name: def ? def.name : id,
        count,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const maxDishCount = Math.max(1, topDishes[0]?.count ?? 1);

  // Last 7 days profit chart
  const recentDays = world.dailyHistory.slice(-7);
  const maxAbsProfit = Math.max(
    200,
    ...recentDays.map((r) => Math.max(r.revenue, Math.abs(r.profit)))
  );

  const tabs: Array<{ id: BusinessTab; label: string; icon: typeof Megaphone }> = [
    { id: 'MARKETING', label: '营销与周转贷', icon: Megaphone },
    { id: 'DECOR', label: '前厅装潢定制', icon: Paintbrush },
    { id: 'RANKING', label: '全城榜单与商战', icon: Trophy },
    { id: 'ANALYTICS', label: '经营复盘报表', icon: BarChart3 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0604]/82 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="game-panel w-full max-w-4xl rounded-xl p-5 md:p-6 text-[#F7EFE2] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#593b25]">
          <div>
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-5 h-5 text-[#E8C97A]" />
              <h2 className="font-display text-xl font-bold text-[#FFF6E5]">
                商战经营总台 · 营销 · 装潢 · 榜单与复盘
              </h2>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#C5AE92]">
              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: seasonDef.color }}>
                <SeasonSvgIcon season={world.season} className="w-4 h-4 shrink-0" />
                {seasonDef.name}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: weatherDef.color }}>
                <WeatherSvgIcon weather={world.weather} className="w-4 h-4 shrink-0" />
                今日天气：{weatherDef.name}
              </span>
              {world.holiday !== 'NONE' && (
                <span className="inline-flex items-center gap-1 font-bold" style={{ color: holidayDef.color }}>
                  <HudResourceSvgIcon kind="HOLIDAY" className="w-3.5 h-3.5 shrink-0" />
                  节庆：{holidayDef.name}
                </span>
              )}
              <span className="font-mono-num text-[#F6DA8D]">
                全城排名：第 {playerRank} 名（综合分 {playerScore}）
              </span>
              <span className="font-mono-num text-[#86EFAC]">
                综合客流 ×{mods.customerRateMult.toFixed(2)} · 进货 ×{mods.costMultiplier.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="game-btn-wood p-1.5 rounded cursor-pointer"
            aria-label="关闭商战经营总台"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mt-3.5 pb-3 border-b border-[#4a2f1d]">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  active ? 'game-btn-gold' : 'game-btn-wood text-[#DFCDB6]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="mt-4 overflow-y-auto pr-1 flex-1 space-y-4">
          {/* TAB 1: MARKETING & LOAN */}
          {tab === 'MARKETING' && (
            <>
              {/* Active Status Strip */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="game-inset rounded-lg p-3.5">
                  <div className="text-[11px] text-[#C5AE92] font-semibold">当前生效营销方案</div>
                  {world.activeMarketing ? (
                    <div className="mt-1">
                      <div className="text-sm font-bold text-[#F6DA8D]">
                        {world.activeMarketing.name}（剩余 {world.activeMarketing.daysRemaining} 天）
                      </div>
                      <div className="text-xs text-[#DFCDB6] mt-0.5">
                        客流 ×{world.activeMarketing.customerRateMult}
                        {world.activeMarketing.vipBonus > 0
                          ? ` · VIP +${Math.round(world.activeMarketing.vipBonus * 100)}%`
                          : ''}
                        {world.activeMarketing.ticketDelta !== 0
                          ? ` · 餐位 ${world.activeMarketing.ticketDelta > 0 ? '+' : ''}¥${world.activeMarketing.ticketDelta}`
                          : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-[#9C8168]">
                      当前未投放营销活动，可在下方选择方案主动拉升客流或回笼资金。
                    </div>
                  )}
                </div>

                <div className="game-inset rounded-lg p-3.5">
                  <div className="text-[11px] text-[#C5AE92] font-semibold">今日天气与街区态势</div>
                  <div className="mt-1 text-xs text-[#EFE2D0] leading-relaxed flex items-start gap-2">
                    <WeatherSvgIcon weather={world.weather} className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>
                      <span style={{ color: weatherDef.color }} className="font-bold">
                        [{weatherDef.name}]
                      </span>{' '}
                      {weatherDef.description}
                    </span>
                  </div>
                  {world.activeRivalEvent && (
                    <div className="mt-1.5 text-xs text-[#FCA5A5] font-medium">
                      ⚔ 商战冲击：{world.activeRivalEvent.title}（剩余 {world.activeRivalEvent.daysRemaining} 天）
                    </div>
                  )}
                </div>
              </div>

              {/* Marketing Campaigns Grid */}
              <div>
                <h3 className="font-display font-bold text-sm text-[#E8C97A] mb-2.5 flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4" />
                  门店营销与客流投放
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MARKETING_CAMPAIGNS.map((c) => {
                    const isRunning = world.activeMarketing?.id === c.id;
                    const repLocked = Boolean(c.minReputation && world.reputation < c.minReputation);
                    const cashLocked = c.cost > 0 && world.cash < c.cost;
                    const disabled = Boolean(world.activeMarketing) || repLocked || cashLocked;

                    return (
                      <div key={c.id} className="game-card rounded-lg p-4 flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="font-display font-bold text-sm"
                              style={{ color: c.accentColor }}
                            >
                              {c.name}
                            </span>
                            <span className="font-mono-num text-xs font-bold text-[#F6DA8D]">
                              {c.cost < 0 ? `回笼 +¥${Math.abs(c.cost)}` : `花费 ¥${c.cost}`}
                            </span>
                          </div>
                          <div className="mt-1 text-xs font-semibold text-[#86EFAC]">
                            {c.summary}
                          </div>
                          <p className="mt-1.5 text-xs text-[#C5AE92] leading-relaxed">
                            {c.description}
                          </p>
                          {c.minReputation && (
                            <div className="mt-1 text-[11px] text-[#E8C97A]">
                              要求口碑 ≥ {c.minReputation}（当前 {Math.round(world.reputation)}）
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => onLaunchMarketing(c.id)}
                          disabled={disabled}
                          className={`w-full py-2 rounded text-xs font-bold cursor-pointer ${
                            isRunning
                              ? 'bg-[#1a3328] border border-[#34d399] text-[#86EFAC]'
                              : disabled
                                ? 'bg-[#1c110b] border border-[#4a2f1d] text-[#785e47] cursor-not-allowed'
                                : 'game-btn-gold'
                          }`}
                        >
                          {isRunning
                            ? '当前投放生效中'
                            : world.activeMarketing
                              ? '已有活动进行中'
                              : repLocked
                                ? `口碑不足 ${c.minReputation}`
                                : cashLocked
                                  ? '流动资金不足'
                                  : c.cost < 0
                                    ? '立即发行储值卡回笼现金'
                                    : '立即启动投放'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Emergency Small-Business Loan */}
              <div className="game-card rounded-lg p-4 border border-[#8f6734]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-[#E8C97A]" />
                    <div>
                      <h3 className="font-display font-bold text-sm text-[#FFF6E5]">
                        港湾小微商户应急周转贷（年化 10% · 5日等额扣还）
                      </h3>
                      <p className="text-xs text-[#C5AE92]">
                        面临扩建缺钱、台风囤货或资金逼近破产红线时，可瞬时放款周转，每晚打烊自动扣分期，亦可随时提前结清。
                      </p>
                    </div>
                  </div>
                  <div className="font-mono-num text-xs text-[#F6DA8D] font-bold">
                    当前现金：¥{world.cash.toLocaleString()}
                  </div>
                </div>

                {world.loan.remainingPrincipal > 0 ? (
                  <div className="mt-3 p-3 rounded bg-[#21120b] border border-[#b58942] flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs space-y-0.5">
                      <div className="text-[#F6DA8D] font-bold">
                        待还本息：¥{world.loan.remainingPrincipal}（剩余 {world.loan.daysRemaining} 期）
                      </div>
                      <div className="text-[#C5AE92]">
                        每晚打烊结算自动扣款 ¥{world.loan.dailyInstallment}
                      </div>
                    </div>
                    <button
                      onClick={onRepayLoan}
                      disabled={world.cash < world.loan.remainingPrincipal}
                      className={`px-4 py-2 rounded text-xs font-bold cursor-pointer ${
                        world.cash >= world.loan.remainingPrincipal
                          ? 'game-btn-gold'
                          : 'bg-[#1c110b] border border-[#4a2f1d] text-[#785e47] cursor-not-allowed'
                      }`}
                    >
                      提前全额结清（¥{world.loan.remainingPrincipal}）
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => onTakeLoan(400)}
                      className="game-btn-wood p-3 rounded-lg text-left cursor-pointer hover:border-[#e8c97a]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-sm text-[#FFF6E5]">
                          小额应急贷 ¥400
                        </span>
                        <Coins className="w-4 h-4 text-[#E8C97A]" />
                      </div>
                      <div className="text-[11px] text-[#C5AE92] mt-1">
                        应还总额 ¥440 · 分 5 晚每晚扣 ¥88
                      </div>
                    </button>

                    <button
                      onClick={() => onTakeLoan(800)}
                      className="game-btn-wood p-3 rounded-lg text-left cursor-pointer hover:border-[#e8c97a]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-sm text-[#F6DA8D]">
                          大额扩店贷 ¥800
                        </span>
                        <Coins className="w-4 h-4 text-[#F6DA8D]" />
                      </div>
                      <div className="text-[11px] text-[#C5AE92] mt-1">
                        应还总额 ¥880 · 分 5 晚每晚扣 ¥176
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: INTERIOR DECOR THEMES */}
          {tab === 'DECOR' && (
            <div className="space-y-3">
              <div className="game-inset rounded-lg p-3.5 text-xs text-[#DFCDB6] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E8C97A] shrink-0" />
                <span>
                  更换装潢主题会<strong className="text-[#FFF6E5]">实时重绘前厅木地板色调、迎宾地毯、顶梁与灯笼光影</strong>，同时提供永久餐位溢价、VIP 概率、小费与全城榜单积分加成！
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {DECOR_THEMES.map((theme) => {
                  const owned = world.unlockedDecorThemeIds.includes(theme.id);
                  const equipped = world.activeDecorThemeId === theme.id;
                  const levelLocked = world.shopLevel < theme.minShopLevel;
                  const cashLocked = !owned && world.cash < theme.cost;

                  return (
                    <div
                      key={theme.id}
                      className={`game-card rounded-lg p-4 border flex flex-col justify-between gap-3 ${
                        equipped ? 'border-[#E8C97A]' : 'border-[#593b25]'
                      }`}
                    >
                      <div>
                        {/* Color Palette Preview Strip */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-display font-bold text-base"
                              style={{ color: theme.accentColor }}
                            >
                              {theme.name}
                            </span>
                            {equipped && (
                              <span className="text-[11px] font-bold text-[#86EFAC] inline-flex items-center gap-0.5">
                                <Check className="w-3.5 h-3.5" /> 使用中
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {theme.previewSwatches.map((hex, idx) => (
                              <span
                                key={idx}
                                className="w-4 h-4 rounded-sm border border-[#e8c97a]/50"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="text-xs font-semibold text-[#F6DA8D]">
                          {theme.perkSummary}
                        </div>
                        <p className="mt-1.5 text-xs text-[#C5AE92] leading-relaxed">
                          {theme.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#4a2f1d]">
                        <span className="text-[11px] font-mono-num text-[#C5AE92]">
                          {owned
                            ? '已购置 · 随时免费切换'
                            : `要求 Lv.${theme.minShopLevel} · 造价 ¥${theme.cost.toLocaleString()}`}
                        </span>

                        <button
                          onClick={() => onBuyOrEquipDecor(theme.id)}
                          disabled={equipped || (!owned && (levelLocked || cashLocked))}
                          className={`px-3.5 py-1.5 rounded text-xs font-bold cursor-pointer ${
                            equipped
                              ? 'bg-[#1a3328] border border-[#34d399] text-[#86EFAC] cursor-default'
                              : owned
                                ? 'game-btn-wood text-[#FFF6E5]'
                                : levelLocked || cashLocked
                                  ? 'bg-[#1c110b] border border-[#4a2f1d] text-[#785e47] cursor-not-allowed'
                                  : 'game-btn-gold'
                          }`}
                        >
                          {equipped
                            ? '当前已装潢'
                            : owned
                              ? '立即换装'
                              : levelLocked
                                ? `需 Lv.${theme.minShopLevel}`
                                : cashLocked
                                  ? '资金不足'
                                  : `斥资 ¥${theme.cost} 装潢`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CITY LEADERBOARD & RIVALS */}
          {tab === 'RANKING' && (
            <div className="space-y-3.5">
              {world.activeRivalEvent ? (
                <div className="p-3.5 rounded-lg border border-[#b91c1c] bg-[#2c1212] flex items-start gap-2.5">
                  <Swords className="w-5 h-5 text-[#FCA5A5] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-bold text-[#FECACA]">
                      街区竞争动态：{world.activeRivalEvent.title}（剩余 {world.activeRivalEvent.daysRemaining} 天）
                    </div>
                    <p className="text-[#FCA5A5]/90 mt-0.5">{world.activeRivalEvent.effectDesc}</p>
                  </div>
                </div>
              ) : (
                <div className="game-inset rounded-lg p-3 text-xs text-[#C5AE92]">
                  当前街区商战风平浪静。提升门店口碑、扩建档口、激活隐藏组合与更换高星装潢均可大幅拉高全城综合评分，冲击榜首「全城第一海鲜王」！
                </div>
              )}

              <div className="space-y-1.5">
                {leaderboard.map((row, idx) => {
                  const rank = idx + 1;
                  return (
                    <div
                      key={row.id}
                      className={`rounded-lg px-4 py-2.5 border flex items-center justify-between gap-3 ${
                        row.isPlayer
                          ? 'bg-[#342012] border-[#E8C97A] shadow-[0_0_16px_rgba(232,201,122,0.18)]'
                          : 'bg-[#1a0f0a] border-[#4a2f1d]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded flex items-center justify-center font-mono-num text-xs font-black shrink-0 ${
                            rank === 1
                              ? 'bg-[#E8C97A] text-[#1c1008]'
                              : rank === 2
                                ? 'bg-[#cbd5e1] text-[#1c1008]'
                                : rank === 3
                                  ? 'bg-[#d97706] text-[#1c1008]'
                                  : 'bg-[#2a1810] text-[#C5AE92] border border-[#593b25]'
                          }`}
                        >
                          {rank === 1 ? <Crown className="w-4 h-4" /> : `#${rank}`}
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`text-sm font-display font-bold truncate ${
                              row.isPlayer ? 'text-[#FFF6E5]' : 'text-[#E6D6C0]'
                            }`}
                          >
                            {row.name}
                          </div>
                          <div className="text-[11px] text-[#A88E74] truncate">{row.style}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 font-mono-num text-xs">
                        <span className="text-[#C5AE92] hidden sm:inline">
                          均价 ¥{row.avgTicket}
                        </span>
                        <span
                          className={`font-bold text-sm ${
                            row.isPlayer ? 'text-[#F6DA8D]' : 'text-[#DFCDB6]'
                          }`}
                        >
                          {row.score} 分
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: BUSINESS ANALYTICS & 7-DAY REPORT */}
          {tab === 'ANALYTICS' && (
            <div className="space-y-4">
              {/* Top KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="game-card rounded-lg p-3">
                  <div className="text-[11px] text-[#C5AE92]">累计接待桌数</div>
                  <div className="font-mono-num text-lg font-bold text-[#FFF6E5] mt-0.5">
                    {world.totalGuestsServed} 桌
                  </div>
                </div>
                <div className="game-card rounded-lg p-3">
                  <div className="text-[11px] text-[#C5AE92]">累计营业总营收</div>
                  <div className="font-mono-num text-lg font-bold text-[#F6DA8D] mt-0.5">
                    ¥{world.totalCashEarned.toLocaleString()}
                  </div>
                </div>
                <div className="game-card rounded-lg p-3">
                  <div className="text-[11px] text-[#C5AE92]">累计逃单 / 断菜</div>
                  <div className="font-mono-num text-lg font-bold text-[#FCA5A5] mt-0.5">
                    {world.totalWalkouts} / {world.totalStockoutComplaints}
                  </div>
                </div>
                <div className="game-card rounded-lg p-3">
                  <div className="text-[11px] text-[#C5AE92]">累计赔付罚金</div>
                  <div className="font-mono-num text-lg font-bold text-[#FB923C] mt-0.5">
                    ¥{world.totalPenaltyFines.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 7-Day Revenue vs Net Profit Bar Chart */}
              <div className="game-card rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-bold text-sm text-[#E8C97A]">
                    近 7 日营收与净利润趋势
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-[#C5AE92]">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-[#E8C97A] inline-block" /> 日营收
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-[#34D399] inline-block" /> 净盈利
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-[#F87171] inline-block" /> 净亏损
                    </span>
                  </div>
                </div>

                {recentDays.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#9C8168]">
                    完成首日打烊结算后，此处将自动绘制每日经营曲线与盈亏复盘。
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4 border-b border-[#4a2f1d] pb-2">
                    {recentDays.map((rec) => {
                      const revPct = Math.max(6, Math.round((rec.revenue / maxAbsProfit) * 100));
                      const profPct = Math.max(
                        6,
                        Math.round((Math.abs(rec.profit) / maxAbsProfit) * 100)
                      );
                      const isLoss = rec.profit < 0;
                      const wDef = getWeatherDef(rec.weather);
                      return (
                        <div
                          key={rec.day}
                          className="flex flex-col items-center justify-end h-full gap-1"
                          title={`第${rec.day}天（${wDef.shortName}）· 营收 ¥${rec.revenue} · 成本 ¥${rec.cost} · 净利 ${rec.profit >= 0 ? '+' : ''}¥${rec.profit} · 接待 ${rec.guests} 桌`}
                        >
                          <div className="text-[10px] font-mono-num text-[#DFCDB6]">
                            {rec.profit >= 0 ? `+${rec.profit}` : rec.profit}
                          </div>
                          <div className="w-full flex items-end justify-center gap-1 h-28">
                            <div
                              className="w-3.5 bg-[#E8C97A]/85 rounded-t-sm"
                              style={{ height: `${revPct}%` }}
                            />
                            <div
                              className={`w-3.5 rounded-t-sm ${
                                isLoss ? 'bg-[#F87171]' : 'bg-[#34D399]'
                              }`}
                              style={{ height: `${profPct}%` }}
                            />
                          </div>
                          <div className="text-[11px] font-mono-num text-[#C5AE92]">
                            D{rec.day}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dish Consumption Ranking & Operational Diagnosis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="game-card rounded-lg p-4">
                  <h3 className="font-display font-bold text-sm text-[#E8C97A] mb-2.5">
                    菜品热销消耗排行（前 8 名）
                  </h3>
                  {topDishes.length === 0 ? (
                    <div className="text-xs text-[#9C8168] py-4">
                      暂无顾客取餐消耗数据，开店营业后将自动统计每道海鲜与熟食的畅销度。
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topDishes.map((d, idx) => (
                        <div key={d.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#EFE2D0]">
                              {idx + 1}. {d.name}
                            </span>
                            <span className="font-mono-num text-[#F6DA8D] font-semibold">
                              {d.count} 份
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#180e0a] rounded overflow-hidden">
                            <div
                              className="h-full bg-[#E8C97A]"
                              style={{ width: `${Math.round((d.count / maxDishCount) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="game-card rounded-lg p-4 space-y-2.5">
                  <h3 className="font-display font-bold text-sm text-[#E8C97A] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    店长经营诊断建议
                  </h3>
                  <ul className="text-xs text-[#DFCDB6] space-y-2 leading-relaxed">
                    <li>
                      • <strong className="text-[#FFF6E5]">库存把控</strong>：观察左侧畅销榜前 3 菜品，在每日闭店后优先于冷链库房加购，或雇佣「库存采购员」自动补齐，杜绝断菜赔付。
                    </li>
                    <li>
                      • <strong className="text-[#FFF6E5]">天气与节庆套利</strong>：「休渔开海季」进货 75 折最宜囤积昂贵海鲜；「雪天/台风/跨年夜」客流暴增，宜提前备足洁净餐具与熟食。
                    </li>
                    <li>
                      • <strong className="text-[#FFF6E5]">商战反击</strong>：遭遇对手价格战时，开启「爆款团购」或更换高星装潢可迅速夺回客流并反超全城排名。
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
