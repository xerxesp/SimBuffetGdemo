import {
  Award,
  CloudRain,
  Coins,
  FastForward,
  Flame,
  Heart,
  HelpCircle,
  Home,
  Music,
  Pause,
  Play,
  Save,
  Settings,
  ShieldAlert,
  Sparkles,
  Trophy,
  Truck,
  Utensils,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getSeasonDef, getShopConfig } from '../data/gameConfig';
import { getCharacterDef } from '../data/storyConfig';
import { getHolidayDef, getWeatherDef } from '../data/tycoonSystemsConfig';
import { getPlayerLevelTitle, getXpRequiredForNextLevel } from '../engine/playerProgression';
import { calculateTicketPrice, formatClock } from '../engine/simulation';
import { GameWorld } from '../types/game';

interface TopHudProps {
  world: GameWorld;
  muted: boolean;
  bgmMuted: boolean;
  activeBgmTitle: string;
  onTogglePause: () => void;
  onToggleSpeed: () => void;
  onToggleMute: () => void;
  onToggleBgm: () => void;
  onOpenGuide: () => void;
  onOpenSaveLoad: () => void;
  onOpenEncyclopedia: () => void;
  onOpenSettings: () => void;
  onOpenStory: () => void;
  onOpenTechTree: () => void;
  onOpenSystemMenu: () => void;
}

export function TopHud({
  world,
  muted,
  bgmMuted,
  activeBgmTitle,
  onTogglePause,
  onToggleSpeed,
  onToggleMute,
  onToggleBgm,
  onOpenGuide,
  onOpenSaveLoad,
  onOpenEncyclopedia,
  onOpenSettings,
  onOpenStory,
  onOpenTechTree,
  onOpenSystemMenu,
}: TopHudProps) {
  const shopCfg = getShopConfig(world.shopLevel);
  const seasonDef = getSeasonDef(world.season);
  const weatherDef = getWeatherDef(world.weather);
  const holidayDef = getHolidayDef(world.holiday);
  const charDef = getCharacterDef(world.characterId);
  const ticketPrice = calculateTicketPrice(world);
  const xpRequired = getXpRequiredForNextLevel(world.playerLevel);
  const xpPercent = Math.min(100, Math.round((world.playerXp / Math.max(1, xpRequired)) * 100));
  const playerLevelTitle = getPlayerLevelTitle(world.playerLevel);
  const effectivePhase = world.phase === 'PAUSED' ? world.pausedFromPhase : world.phase;
  const clock = formatClock(world.dayTime, world.dayDuration, effectivePhase);

  const lowWarehouseCount = world.buffetSlots.filter(
    (s) => (world.warehouseStock[s.itemId] ?? 0) <= 6
  ).length;

  const phaseLabel =
    effectivePhase === 'PREP'
      ? '筹备中'
      : effectivePhase === 'CLOSING'
        ? '闭店收尾'
        : world.rushHourActive
          ? '高峰营业'
          : '正式营业';

  const phaseColorClass =
    effectivePhase === 'PREP'
      ? 'text-[#E8C97A]'
      : effectivePhase === 'CLOSING'
        ? 'text-[#7DD3FC]'
        : world.rushHourActive
          ? 'text-[#F87171]'
          : 'text-[#6EE7B7]';

  return (
    <header className="pointer-events-none absolute top-2.5 inset-x-3 z-40 flex items-center justify-between gap-2.5">
      {/* Left Floating Island: Core Business Resources & Penalty Meter */}
      <div className="pointer-events-auto hud-float backdrop-blur-md rounded-xl px-3.5 h-10 flex items-center gap-3 min-w-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 whitespace-nowrap" title="当前流动资金">
          <Coins className="w-3.5 h-3.5 text-[#E8C97A] shrink-0" />
          <span
            className={`font-mono-num text-sm font-bold ${
              world.cash < 0 ? 'text-[#F87171]' : 'text-[#F6DA8D]'
            }`}
          >
            ¥{world.cash.toLocaleString()}
          </span>
        </div>

        <span className="h-3.5 w-px bg-[#6b4d31]/70 shrink-0" aria-hidden="true" />

        <button
          type="button"
          onClick={onOpenTechTree}
          title={`店长 Lv.${world.playerLevel} ${playerLevelTitle}（经验 ${world.playerXp}/${xpRequired}，赚取 ¥1 = +1 EXP）· 可用 ${world.upgradePoints} 升级点，点击前往天赋发展树`}
          className="flex items-center gap-1.5 px-1.5 h-7 rounded-md hover:bg-[#332116] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Award className="w-3.5 h-3.5 text-[#F6DA8D] shrink-0" />
          <span className="font-mono-num text-xs font-bold text-[#FFF6E5]">
            Lv.{world.playerLevel}
          </span>
          <span className="hidden sm:inline-block w-10 h-1.5 rounded-full bg-[#160c08] border border-[#6b4d31]/80 overflow-hidden shrink-0">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-[#d49a3a] to-[#fde68a]"
              style={{ width: `${xpPercent}%` }}
            />
          </span>
          <span
            className={`font-mono-num text-[11px] font-bold ${
              world.upgradePoints > 0 ? 'text-[#FDE047]' : 'text-[#B59876]'
            }`}
          >
            {world.upgradePoints}点
          </span>
        </button>

        <span className="h-3.5 w-px bg-[#6b4d31]/70 shrink-0" aria-hidden="true" />

        <div className="flex items-center gap-1.5 whitespace-nowrap" title="门店口碑（跌至 0 倒闭）">
          <Heart className="w-3.5 h-3.5 text-[#6EE7B7] shrink-0" />
          <span className="text-[11px] text-[#C5AE92] hidden sm:inline">口碑</span>
          <span
            className={`font-mono-num text-xs font-bold ${
              world.reputation >= 60
                ? 'text-[#6EE7B7]'
                : world.reputation >= 35
                  ? 'text-[#FBBF24]'
                  : 'text-[#F87171]'
            }`}
          >
            {Math.round(world.reputation)}
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 whitespace-nowrap"
          title="食安卫生（低于 45 触发食安突击重罚）"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#7DD3FC] shrink-0" />
          <span className="text-[11px] text-[#C5AE92] hidden sm:inline">卫生</span>
          <span
            className={`font-mono-num text-xs font-bold ${
              world.hygiene >= 70
                ? 'text-[#7DD3FC]'
                : world.hygiene >= 45
                  ? 'text-[#FBBF24]'
                  : 'text-[#F87171]'
            }`}
          >
            {Math.round(world.hygiene)}
          </span>
        </div>

        <span className="h-3.5 w-px bg-[#6b4d31]/70 shrink-0 hidden md:inline-block" aria-hidden="true" />

        <div
          className="hidden md:flex items-center gap-1.5 whitespace-nowrap text-xs"
          title="可用消毒净餐具 / 待洗脏餐具"
        >
          <Utensils className="w-3.5 h-3.5 text-[#E5C9A8] shrink-0" />
          <span className="font-mono-num text-[#EFE2D0]">
            净{world.cleanDishes}/脏{world.dirtyDishes}
          </span>
        </div>

        <div
          className="hidden lg:flex items-center gap-1 whitespace-nowrap text-xs"
          title={`熟食热菜存量（冷链原料 ${world.rawIngredients}/${world.rawIngredientsMax}）`}
        >
          <Flame className="w-3.5 h-3.5 text-[#FB923C] shrink-0" />
          <span
            className={`font-mono-num font-semibold ${
              world.cookedStock <= 1 ? 'text-[#F87171]' : 'text-[#FDBA74]'
            }`}
          >
            熟{world.cookedStock}/{world.cookedMaxStock}
          </span>
        </div>

        {(lowWarehouseCount > 0 || world.pendingDeliveries.length > 0) && (
          <div
            className="hidden xl:flex items-center gap-1 whitespace-nowrap text-xs"
            title="后场冷库低库存菜品数 / 明日闭店在途冷链单数"
          >
            <Truck
              className={`w-3.5 h-3.5 shrink-0 ${
                lowWarehouseCount > 0 ? 'text-[#FCA5A5]' : 'text-[#7DD3FC]'
              }`}
            />
            <span
              className={`font-mono-num font-semibold ${
                lowWarehouseCount > 0 ? 'text-[#FCA5A5]' : 'text-[#7DD3FC]'
              }`}
            >
              {lowWarehouseCount > 0
                ? `库缺${lowWarehouseCount}`
                : `在途${world.pendingDeliveries.length}`}
            </span>
          </div>
        )}

        <div
          className="hidden 2xl:flex items-center gap-1 whitespace-nowrap text-xs text-[#C5AE92]"
          title="当前自助基础餐位费"
        >
          <span>餐位</span>
          <span className="font-mono-num font-semibold text-[#FFF6E5]">¥{ticketPrice}</span>
        </div>

        <span className="h-3.5 w-px bg-[#6b4d31]/70 shrink-0" aria-hidden="true" />

        {/* Penalty Strikes 5-Pip Meter */}
        <div
          className="flex items-center gap-1.5 whitespace-nowrap"
          title="违规处罚记点（满 5 次吊销停业）"
        >
          <ShieldAlert
            className={`w-3.5 h-3.5 shrink-0 ${
              world.penaltyStrikes >= 4
                ? 'text-[#F87171]'
                : world.penaltyStrikes >= 2
                  ? 'text-[#FBBF24]'
                  : 'text-[#B59876]'
            }`}
          />
          <div className="flex items-center gap-0.5">
            {Array.from({ length: world.maxPenaltyStrikes }).map((_, idx) => {
              const active = idx < world.penaltyStrikes;
              return (
                <span
                  key={idx}
                  className={`w-2 h-2.5 rounded-[1px] border ${
                    active ? 'bg-[#DC3E26] border-[#FCA5A5]' : 'bg-[#1a0f0a] border-[#6b472b]'
                  }`}
                />
              );
            })}
          </div>
          <span
            className={`font-mono-num text-xs font-semibold ${
              world.penaltyStrikes >= 4
                ? 'text-[#F87171]'
                : world.penaltyStrikes >= 2
                  ? 'text-[#FBBF24]'
                  : 'text-[#C5AE92]'
            }`}
          >
            {world.penaltyStrikes}/{world.maxPenaltyStrikes}
          </span>
        </div>
      </div>

      {/* Center Floating Island: Calendar, Weather, Store Tier & Phase (Clean Unboxed Typography) */}
      <div className="pointer-events-auto hidden lg:flex hud-float backdrop-blur-md rounded-xl px-4 h-10 items-center gap-2 text-xs whitespace-nowrap shrink-0">
        <span
          className="font-display font-bold"
          style={{ color: seasonDef.color }}
          title={`${seasonDef.description}（食材成本 ×${seasonDef.costMultiplier}）`}
        >
          第{world.year}年·{seasonDef.shortName}
        </span>
        <span className="text-[#7c5c38]" aria-hidden="true">
          ·
        </span>
        <span
          className="inline-flex items-center gap-1 font-semibold"
          style={{ color: weatherDef.color }}
          title={`今日天气：${weatherDef.name} — ${weatherDef.description}`}
        >
          <CloudRain className="w-3 h-3" />
          {weatherDef.shortName}
        </span>
        {world.holiday !== 'NONE' && (
          <>
            <span className="text-[#7c5c38]" aria-hidden="true">
              ·
            </span>
            <span
              className="font-bold"
              style={{ color: holidayDef.color }}
              title={`今日节庆：${holidayDef.name} — ${holidayDef.description}`}
            >
              {holidayDef.shortName}
            </span>
          </>
        )}
        <span className="text-[#7c5c38]" aria-hidden="true">
          /
        </span>
        <span className="font-display font-bold text-[#FFF6E5]">
          Lv.{world.shopLevel} {shopCfg.title}
        </span>
        <span className="text-[#7c5c38]" aria-hidden="true">
          ·
        </span>
        <span className="font-mono-num font-bold text-[#EFE2D0]">
          第{world.day}天 {clock}
        </span>
        <span className={`font-bold ${phaseColorClass}`}>· {phaseLabel}</span>
        {world.phase === 'PAUSED' && (
          <span className="font-bold text-[#FDE047]">（已暂停）</span>
        )}
      </div>

      {/* Right Floating Island: Manager Medallion + Compact Quick Controls */}
      <div className="pointer-events-auto hud-float backdrop-blur-md rounded-xl px-2 h-10 flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onOpenStory}
          title={`店长 ${charDef.name} · 查看主线与见闻`}
          className="flex items-center gap-2 pr-2 pl-0.5 py-0.5 rounded-lg hover:bg-[#322016] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <img
            src={charDef.portraitUrl}
            alt={charDef.name}
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover object-top border border-[#e8c97a]"
          />
          <span className="text-xs font-display font-bold text-[#FFF6E5] hidden xl:inline">
            {charDef.name}
          </span>
        </button>

        <span className="h-4 w-px bg-[#6b4d31]/65 mx-0.5" aria-hidden="true" />

        <button
          type="button"
          onClick={onToggleSpeed}
          title="切换 1x / 2x 营业倍速"
          className={`inline-flex items-center gap-1 px-2 h-7 rounded-md text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
            world.speedMultiplier === 2
              ? 'game-btn-gold'
              : 'text-[#EFE2D0] hover:bg-[#332116] hover:text-[#FFF7E8]'
          }`}
        >
          <FastForward className="w-3.5 h-3.5" />
          <span className="font-mono-num">{world.speedMultiplier}x</span>
        </button>

        <button
          type="button"
          onClick={onTogglePause}
          title="暂停 / 继续 (P)"
          className={`inline-flex items-center gap-1 px-2 h-7 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
            world.phase === 'PAUSED'
              ? 'game-btn-gold font-bold'
              : 'text-[#EFE2D0] hover:bg-[#332116] hover:text-[#FFF7E8]'
          }`}
        >
          {world.phase === 'PAUSED' ? (
            <>
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">继续</span>
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">暂停</span>
            </>
          )}
        </button>

        <span className="h-4 w-px bg-[#6b4d31]/65 mx-0.5 hidden sm:inline-block" aria-hidden="true" />

        <button
          type="button"
          onClick={onToggleBgm}
          title={bgmMuted || muted ? '开启背景音乐' : `背景音乐：${activeBgmTitle}（点击开关）`}
          className={`p-1.5 h-7 rounded-md hover:bg-[#332116] transition-colors cursor-pointer ${
            !bgmMuted && !muted ? 'text-[#E8C97A]' : 'text-[#8C7058]'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onOpenGuide}
          title="新手引导与操作说明"
          className="p-1.5 h-7 rounded-md text-[#E8C97A] hover:bg-[#332116] transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onOpenSaveLoad}
          title="存档与读档"
          className="p-1.5 h-7 rounded-md text-[#E8C97A] hover:bg-[#332116] transition-colors cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onOpenEncyclopedia}
          title="图鉴与成就馆"
          className="p-1.5 h-7 rounded-md text-[#E8C97A] hover:bg-[#332116] transition-colors cursor-pointer"
        >
          <Trophy className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title="游戏设置（音量、音乐、画面比例、2K分辨率）"
          className="p-1.5 h-7 rounded-md text-[#E8C97A] hover:bg-[#332116] transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          title={muted ? '开启全部声音' : '全部静音'}
          className="p-1.5 h-7 rounded-md hover:bg-[#332116] transition-colors cursor-pointer"
        >
          {muted ? (
            <VolumeX className="w-3.5 h-3.5 text-[#F87171]" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-[#EFE2D0]" />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenSystemMenu}
          title="系统菜单 (Esc)"
          className="p-1.5 h-7 rounded-md text-[#EFE2D0] hover:bg-[#332116] hover:text-[#FFF7E8] transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
