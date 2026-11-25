import {
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
  onOpenSystemMenu,
}: TopHudProps) {
  const shopCfg = getShopConfig(world.shopLevel);
  const seasonDef = getSeasonDef(world.season);
  const weatherDef = getWeatherDef(world.weather);
  const holidayDef = getHolidayDef(world.holiday);
  const charDef = getCharacterDef(world.characterId);
  const ticketPrice = calculateTicketPrice(world);
  const effectivePhase = world.phase === 'PAUSED' ? world.pausedFromPhase : world.phase;
  const clock = formatClock(world.dayTime, world.dayDuration, effectivePhase);

  const lowWarehouseCount = world.buffetSlots.filter(
    (s) => (world.warehouseStock[s.itemId] ?? 0) <= 6
  ).length;

  const phaseLabel =
    effectivePhase === 'PREP'
      ? '开店前准备'
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
    <header className="civ-topbar h-12 w-full px-3.5 flex items-center justify-between gap-3 shrink-0 z-30">
      {/* Left: Yield & Operations Ribbon */}
      <div className="flex items-center gap-3.5 xl:gap-4 min-w-0 overflow-x-auto">
        {/* Cash */}
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

        <span className="h-3.5 w-px bg-[#593b25] shrink-0" />

        {/* Reputation */}
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

        {/* Hygiene */}
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

        <span className="h-3.5 w-px bg-[#593b25] shrink-0 hidden md:inline-block" />

        {/* Dishware, Cooked Food, Warehouse & Ticket Price */}
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
          title={`熟食热菜明档存量（冷链原料 ${world.rawIngredients}/${world.rawIngredientsMax}）`}
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
              {lowWarehouseCount > 0 ? `库缺${lowWarehouseCount}` : `在途${world.pendingDeliveries.length}`}
            </span>
          </div>
        )}

        <div
          className="hidden xl:flex items-center gap-1 whitespace-nowrap text-xs text-[#C5AE92]"
          title="当前自助基础餐位费"
        >
          <span>餐位</span>
          <span className="font-mono-num font-semibold text-[#FFF6E5]">¥{ticketPrice}</span>
        </div>

        <span className="h-3.5 w-px bg-[#593b25] shrink-0" />

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
                    active
                      ? 'bg-[#DC3E26] border-[#FCA5A5]'
                      : 'bg-[#1a0f0a] border-[#6b472b]'
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

      {/* Center: Season / Weather / Holiday / Store Tier / Day / Clock / Phase */}
      <div className="hidden lg:flex items-center gap-2 text-xs whitespace-nowrap shrink-0">
        <span
          className="font-display font-bold px-1.5 py-0.5 rounded bg-[#1d110c] border border-[#6b472b]"
          style={{ color: seasonDef.color }}
          title={`${seasonDef.description}（食材成本 ×${seasonDef.costMultiplier}）`}
        >
          第{world.year}年·{seasonDef.shortName}
        </span>
        <span
          className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded bg-[#1d110c] border border-[#593b25]"
          style={{ color: weatherDef.color }}
          title={`今日天气：${weatherDef.name} — ${weatherDef.description}`}
        >
          <CloudRain className="w-3 h-3" />
          {weatherDef.shortName}
        </span>
        {world.holiday !== 'NONE' && (
          <span
            className="font-bold px-1.5 py-0.5 rounded bg-[#2a170c] border border-[#b58942]"
            style={{ color: holidayDef.color }}
            title={`今日节庆：${holidayDef.name} — ${holidayDef.description}`}
          >
            {holidayDef.shortName}
          </span>
        )}
        <span className="font-display font-bold text-[#FFF6E5]">
          Lv.{world.shopLevel} {shopCfg.title}
        </span>
        <span className="text-[#8a6544]">·</span>
        <span className="font-mono-num font-bold text-[#EFE2D0]">
          第 {world.day} 天 {clock}
        </span>
        <span className={`font-bold ${phaseColorClass}`}>· {phaseLabel}</span>
        {world.phase === 'PAUSED' && (
          <span className="font-bold px-1.5 py-0.5 rounded bg-[#3b2214] border border-[#E8C97A] text-[#FDE047]">
            已暂停
          </span>
        )}
      </div>

      {/* Right: Leader Medallion + System Controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpenStory}
          title={`店长 ${charDef.name} · 查看主线与见闻`}
          className="flex items-center gap-2 pr-2 pl-0.5 py-0.5 rounded-full bg-[#24150e] border border-[#b58942] hover:border-[#f4d689] transition-colors cursor-pointer mr-1"
        >
          <img
            src={charDef.portraitUrl}
            alt={charDef.name}
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover object-top border border-[#e8c97a]"
          />
          <span className="text-xs font-display font-bold text-[#FFF6E5] hidden xl:inline whitespace-nowrap">
            {charDef.name}
          </span>
        </button>

        <button
          onClick={onToggleSpeed}
          title="切换 1x / 2x 营业倍速"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold cursor-pointer whitespace-nowrap ${
            world.speedMultiplier === 2 ? 'game-btn-gold' : 'game-btn-wood'
          }`}
        >
          <FastForward className="w-3.5 h-3.5" />
          {world.speedMultiplier}x
        </button>

        <button
          onClick={onTogglePause}
          title="即时暂停 / 继续 (P)"
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap ${
            world.phase === 'PAUSED' ? 'game-btn-gold font-bold' : 'game-btn-wood'
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

        <button
          onClick={onToggleBgm}
          title={bgmMuted || muted ? '开启背景音乐' : `背景音乐：${activeBgmTitle}（点击开关）`}
          className={`game-btn-wood inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap ${
            !bgmMuted && !muted ? 'text-[#E8C97A]' : 'text-[#8C7058]'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">{bgmMuted || muted ? '乐关' : activeBgmTitle}</span>
        </button>

        <button
          onClick={onOpenGuide}
          title="打开/重看「开店前 · 经营中 · 闭店收尾」三阶段新手引导与按钮说明"
          className="game-btn-wood inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#E8C97A]" />
          <span className="hidden 2xl:inline">引导</span>
        </button>

        <button
          onClick={onOpenSaveLoad}
          title="存档与读档（自动存档 + 3个手动槽位）"
          className="game-btn-wood inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
        >
          <Save className="w-3.5 h-3.5 text-[#E8C97A]" />
          <span className="hidden 2xl:inline">存档</span>
        </button>

        <button
          onClick={onOpenEncyclopedia}
          title="跨周目图鉴与成就馆"
          className="game-btn-wood inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
        >
          <Trophy className="w-3.5 h-3.5 text-[#E8C97A]" />
          <span className="hidden 2xl:inline">图鉴</span>
        </button>

        <button
          onClick={onOpenSettings}
          title="游戏设置（音乐、音效、画面比例、2K分辨率）"
          className="game-btn-wood inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
        >
          <Settings className="w-3.5 h-3.5 text-[#E8C97A]" />
          <span className="hidden sm:inline">设置</span>
        </button>

        <button
          onClick={onToggleMute}
          title={muted ? '开启全部声音' : '全部静音'}
          className="game-btn-wood p-1.5 rounded cursor-pointer"
        >
          {muted ? (
            <VolumeX className="w-3.5 h-3.5 text-[#F87171]" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          onClick={onOpenSystemMenu}
          title="系统菜单（门店配置 / 存档 / 设置 / 返回主菜单）"
          className="game-btn-wood p-1.5 rounded cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
