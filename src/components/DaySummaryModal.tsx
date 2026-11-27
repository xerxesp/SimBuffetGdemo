import { ArrowRight, Award, CalendarClock, Sparkles, Truck } from 'lucide-react';
import { getSeasonDef } from '../data/gameConfig';
import { getWeatherDef } from '../data/tycoonSystemsConfig';
import { getPlayerLevelTitle, getXpRequiredForNextLevel } from '../engine/playerProgression';
import { GameWorld } from '../types/game';
import { SeasonSvgIcon, WeatherSvgIcon } from './VintageIcons';

interface DaySummaryModalProps {
  world: GameWorld;
  onNextDay: () => void;
}

export function DaySummaryModal({ world, onNextDay }: DaySummaryModalProps) {
  const s = world.todayStats;
  const seasonDef = getSeasonDef(world.season);
  const weatherDef = getWeatherDef(world.weather);
  const totalIncome = s.ticketRevenue + s.tipRevenue;
  const totalExpense = s.ingredientCost + s.staffWages + s.rentCost + s.penaltyFines;
  const netProfit = totalIncome - totalExpense;

  const tomorrowArrivals = world.pendingOrders.filter((o) => o.daysRemaining <= 1);
  const laterOrders = world.pendingOrders.filter((o) => o.daysRemaining > 1);
  const xpEarnedToday = s.xpEarned ?? 0;
  const levelsGainedToday = s.levelsGained ?? 0;
  const xpRequired = getXpRequiredForNextLevel(world.playerLevel);
  const xpPercent = Math.min(100, Math.round((world.playerXp / Math.max(1, xpRequired)) * 100));
  const playerLevelTitle = getPlayerLevelTitle(world.playerLevel);

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0604]/82 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="game-panel w-full max-w-lg rounded-xl overflow-hidden text-[#F7EFE2] max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-b from-[#331f15] to-[#1d110c] border-b-2 border-[#b58942] flex items-baseline justify-between shrink-0">
          <div>
            <p className="text-xs font-semibold tracking-wider flex items-center gap-1.5 flex-wrap" style={{ color: seasonDef.color }}>
              <SeasonSvgIcon season={world.season} className="w-4 h-4 shrink-0" />
              <span>第 {world.year} 年 · {seasonDef.name}</span>
              <span className="text-[#7c5c38]">·</span>
              <span className="inline-flex items-center gap-1" style={{ color: weatherDef.color }}>
                <WeatherSvgIcon weather={world.weather} className="w-4 h-4 shrink-0" />
                {weatherDef.shortName}
              </span>
            </p>
            <h2 className="font-display text-2xl font-bold mt-0.5 text-[#FFF6E5]">
              第 {s.day} 天营业结算
            </h2>
          </div>
          <span className="text-xs text-[#C5AE92] font-mono-num">
            结余资金 ¥{world.cash.toLocaleString()}
          </span>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-3 gap-3 pb-4 border-b border-[#593b25] text-center">
            <div className="game-inset py-2.5 rounded-lg">
              <div className="text-[11px] text-[#C5AE92]">接待桌次</div>
              <div className="font-mono-num text-lg font-bold text-[#FFF6E5] mt-0.5">
                {s.guestsServed}
                <span className="text-[11px] font-normal text-[#E8C97A] ml-1">
                  (VIP {s.vipServed})
                </span>
              </div>
            </div>
            <div className="game-inset py-2.5 rounded-lg">
              <div className="text-[11px] text-[#C5AE92]">逃单流失</div>
              <div
                className={`font-mono-num text-lg font-bold mt-0.5 ${
                  s.walkouts > 0 ? 'text-[#F87171]' : 'text-[#6EE7B7]'
                }`}
              >
                {s.walkouts}
              </div>
            </div>
            <div className="game-inset py-2.5 rounded-lg">
              <div className="text-[11px] text-[#C5AE92]">口碑变化</div>
              <div
                className={`font-mono-num text-lg font-bold mt-0.5 ${
                  s.reputationChange >= 0 ? 'text-[#6EE7B7]' : 'text-[#F87171]'
                }`}
              >
                {s.reputationChange >= 0 ? '+' : ''}
                {s.reputationChange.toFixed(1)}
              </div>
            </div>
          </div>

          <div
            className={`game-inset px-3.5 py-2.5 rounded-lg border space-y-1.5 ${
              levelsGainedToday > 0 ? 'border-[#E8C97A]/80' : 'border-[#593b25]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 font-display font-bold text-[#FFF6E5]">
                <Award className="w-4 h-4 text-[#F6DA8D] shrink-0" />
                <span>
                  店长 Lv.{world.playerLevel} · {playerLevelTitle}
                </span>
                {levelsGainedToday > 0 && (
                  <span className="font-mono-num text-[10px] font-bold text-[#211208] bg-[#FDE047] px-1.5 py-0.5 rounded">
                    今日连升 +{levelsGainedToday} 级
                  </span>
                )}
              </div>
              <span className="font-mono-num text-[#F6DA8D] font-bold whitespace-nowrap">
                可用升级点 {world.upgradePoints} 点
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#120a07] border border-[#5a3b25] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#d49a3a] via-[#f0cb72] to-[#fde68a]"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono-num text-[#C5AE92]">
              <span>
                本日营收经验 <strong className="text-[#86EFAC]">+{xpEarnedToday.toLocaleString()} EXP</strong>
              </span>
              <span>
                {world.playerXp.toLocaleString()} / {xpRequired.toLocaleString()} EXP
              </span>
            </div>
          </div>

          {world.closingCleanBonusAwarded && (
            <div className="game-inset px-3.5 py-2.5 rounded-lg border border-[#48BB78]/45 flex items-center gap-2 text-xs text-[#86EFAC]">
              <Sparkles className="w-4 h-4 shrink-0 text-[#6EE7B7]" />
              <span>闭店收尾全厅洁净无遗漏！已获得打烊卫生奖励 +6。</span>
            </div>
          )}

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#C5AE92]">自助餐位及锅底收入</span>
              <span className="font-mono-num text-[#6EE7B7]">
                +¥{s.ticketRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#C5AE92]">好评与高星员工小费加成</span>
              <span className="font-mono-num text-[#6EE7B7]">
                +¥{s.tipRevenue.toLocaleString()}
              </span>
            </div>
            <div className="h-px bg-[#593b25] my-1" />
            <div className="flex justify-between">
              <span className="text-[#C5AE92]">冷链食材采购成本</span>
              <span className="font-mono-num text-[#EFE2D0]">
                -¥{s.ingredientCost.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#C5AE92]">员工日薪 ({world.staff.length}人)</span>
              <span className="font-mono-num text-[#EFE2D0]">
                -¥{s.staffWages.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#C5AE92]">门店每日租金 (Lv.{world.shopLevel})</span>
              <span className="font-mono-num text-[#EFE2D0]">
                -¥{s.rentCost.toLocaleString()}
              </span>
            </div>
            {s.penaltyFines > 0 && (
              <div className="flex justify-between">
                <span className="text-[#FCA5A5]">
                  断货赔付 / 食安罚款 ({s.healthInspectionsFailed}次检查失败)
                </span>
                <span className="font-mono-num font-semibold text-[#F87171]">
                  -¥{s.penaltyFines.toLocaleString()}
                </span>
              </div>
            )}
            <div className="h-px bg-[#754f31] my-2" />
            <div className="flex justify-between items-baseline text-base font-semibold">
              <span>本日净利润</span>
              <span
                className={`font-mono-num text-2xl font-bold ${
                  netProfit >= 0 ? 'text-[#E8C97A]' : 'text-[#F87171]'
                }`}
              >
                {netProfit >= 0 ? '+' : ''}¥{netProfit.toLocaleString()}
              </span>
            </div>
          </div>

          {world.pendingDeliveries.length > 0 && (
            <div className="game-inset p-3.5 rounded-lg space-y-1.5 border border-[#38B2AC]/55">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#81E6D9]">
                <Truck className="w-3.5 h-3.5" />
                <span>在途冷链采购单（次日闭店后入库）</span>
              </div>
              <div className="space-y-1 text-xs">
                {world.pendingDeliveries.slice(0, 5).map((del) => (
                  <div key={del.id} className="flex items-center justify-between gap-2">
                    <span className="text-[#EFE2D0] truncate">
                      {del.itemName} ×{del.quantity}
                    </span>
                    <span className="font-mono-num text-[#81E6D9] shrink-0">
                      第 {del.arrivalDay} 天闭店送达
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {world.pendingOrders.length > 0 && (
            <div className="game-inset p-3.5 rounded-lg space-y-2 border border-[#b58942]/70">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#E8C97A]">
                <CalendarClock className="w-3.5 h-3.5" />
                <span>排期进展预告</span>
              </div>
              <div className="space-y-1 text-xs">
                {tomorrowArrivals.map((ord) => (
                  <div key={ord.id} className="flex items-center justify-between gap-2">
                    <span className="text-[#F7EFE2] truncate">{ord.title}</span>
                    <span className="text-[#6EE7B7] font-semibold shrink-0">明晨生效</span>
                  </div>
                ))}
                {laterOrders.map((ord) => (
                  <div key={ord.id} className="flex items-center justify-between gap-2">
                    <span className="text-[#C5AE92] truncate">{ord.title}</span>
                    <span className="font-mono-num text-[#FBBF24] shrink-0">
                      还需 {ord.daysRemaining - 1} 天
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={onNextDay}
              className="game-btn-gold inline-flex items-center gap-2 px-7 py-3 rounded-lg font-display font-bold text-sm tracking-wide cursor-pointer whitespace-nowrap"
            >
              进入第 {s.day + 1} 天 · 开店前准备
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
