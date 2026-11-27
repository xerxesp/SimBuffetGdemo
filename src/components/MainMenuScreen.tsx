import { useState } from 'react';
import { BookOpen, HardDrive, Play, RotateCcw, Settings, ShieldAlert, Trophy, X } from 'lucide-react';
import { TITLE_KEYART_URL } from '../data/storyConfig';
import { DevicePlatform } from '../hooks/useMobileDevice';
import { PWAInstallState } from '../hooks/usePWAInstall';
import { SaveSlotMeta } from '../types/game';
import { PWAInstallButton } from './PWAInstallButton';
import { ChaoshanCornerOrnament, VermilionSealStamp } from './VintageIcons';

interface MainMenuScreenProps {
  bestDays: number;
  bestCash: number;
  autoSaveMeta: SaveSlotMeta | null;
  hasAnySave: boolean;
  platform: DevicePlatform;
  pwa: PWAInstallState;
  onContinueAutoSave: () => void;
  onStartGame: () => void;
  onOpenLoadModal: () => void;
  onOpenEncyclopedia: () => void;
  onOpenSettings: () => void;
}

export function MainMenuScreen({
  bestDays,
  bestCash,
  autoSaveMeta,
  hasAnySave,
  platform,
  pwa,
  onContinueAutoSave,
  onStartGame,
  onOpenLoadModal,
  onOpenEncyclopedia,
  onOpenSettings,
}: MainMenuScreenProps) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="relative h-[100dvh] w-screen overflow-y-auto overflow-x-hidden touch-scroll bg-[#120a07] text-[#F7EFE2] select-none">
      {/* Full-bleed Illustrated Key Art Backdrop */}
      <img
        src={TITLE_KEYART_URL}
        alt="潮鲜沸鼎海鲜自助火锅馆夜景插画"
        referrerPolicy="no-referrer"
        className="fixed inset-0 w-full h-full object-cover object-center scale-[1.01] pointer-events-none"
      />

      {/* Directional Warm Espresso Scrim so Left Title & Menu have crisp contrast while Art glows on Right */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(96deg, rgba(16,9,6,0.94) 0%, rgba(24,14,10,0.82) 42%, rgba(24,14,10,0.28) 76%, rgba(16,9,6,0.45) 100%)',
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(16,9,6,0.42) 0%, rgba(16,9,6,0.08) 26%, rgba(16,9,6,0.86) 100%)',
        }}
      />

      {/* Main Game Title Screen Content */}
      <div
        className="relative z-10 min-h-full w-full flex flex-col justify-between gap-6 px-5 py-6 sm:px-8 sm:py-8 md:px-16 md:py-11"
        style={{
          paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(1.25rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1.25rem, env(safe-area-inset-right, 0px))',
        }}
      >
        {/* Clean Top Strip (Zero Pill Clutter) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
          <div className="text-[11px] sm:text-xs tracking-[0.2em] sm:tracking-[0.22em] text-[#E8C97A] font-medium whitespace-nowrap">
            海鲜自助火锅 · 模拟经营单机版
          </div>
          {bestDays > 0 && (
            <div className="text-[11px] sm:text-xs font-mono-num text-[#F2E4CE] hud-float px-3 sm:px-4 py-1.5 rounded-lg whitespace-nowrap">
              最佳纪录 · {bestDays}天 · ¥{bestCash.toLocaleString()}
            </div>
          )}
        </div>

        {/* Center-Left Classic Strategy Game Title & Refined Vertical Menu Stack */}
        <div className="max-w-lg space-y-5 sm:space-y-7 my-auto">
          <div className="relative space-y-2.5 sm:space-y-3 pl-3.5 sm:pl-4 border-l-2 border-[#c9a45c]/55">
            <ChaoshanCornerOrnament className="absolute -top-3 -left-3 w-7 h-7 opacity-80" />
            <div className="flex items-center gap-2.5 sm:gap-3">
              <VermilionSealStamp label="沸鼎" size="md" className="rotate-[-2deg]" />
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm text-[#E8C97A] font-semibold tracking-[0.22em] sm:tracking-[0.26em]">
                  潮汕海畔 · 店长物语
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#C5AE92]/85 tracking-[0.16em] sm:tracking-[0.18em]">
                  老字号活鲜自助火锅馆
                </span>
              </div>
            </div>

            <div className="flex items-end gap-2.5 sm:gap-3.5">
              <h1
                className="font-display text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#FFF7E8] leading-none"
                style={{
                  textShadow: '0 4px 20px rgba(0, 0, 0, 0.85), 0 1px 0 #7C5B20',
                }}
              >
                潮鲜沸鼎
              </h1>
              <VermilionSealStamp label="御膳潮鲜" size="sm" className="mb-1 opacity-90 rotate-[3deg]" />
            </div>

            <p className="text-xs sm:text-sm md:text-[15px] text-[#E8D8C2] leading-relaxed max-w-md pt-0.5">
              执掌海畔火锅名馆，开店前于门店配置中心调兵遣将、扩建七大前场档口与秘制锅底；开市后迎宾上锅、冷库补货、清桌洗碗，在客流高峰与食安红线中问鼎海上御膳传奇。
            </p>
          </div>

          {/* Crisp Single Dominant CTA + Organized Secondary Action Grid */}
          <div className="flex flex-col gap-2.5 w-full sm:w-80 max-w-sm">
            {autoSaveMeta ? (
              <>
                <button
                  type="button"
                  onClick={onContinueAutoSave}
                  className="game-btn-gold w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-xl font-display font-bold text-sm sm:text-base tracking-wide cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>
                    继续经营 · 第 {autoSaveMeta.day} 天 (Lv.{autoSaveMeta.shopLevel})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onStartGame}
                  className="game-btn-wood text-[#FFF6E5] w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl font-semibold text-sm cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-current text-[#E8C97A] shrink-0" />
                  <span>开启新店（选角开局）</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onStartGame}
                className="game-btn-gold w-full min-h-[50px] inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:py-4 rounded-xl font-display font-bold text-base sm:text-lg tracking-wider cursor-pointer whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span>开始游戏</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={onOpenLoadModal}
                disabled={!hasAnySave}
                className={`w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs tracking-wide whitespace-nowrap ${
                  hasAnySave
                    ? 'game-btn-wood cursor-pointer'
                    : 'bg-[#1a0f0a]/70 border border-[#3d2518] text-[#785e47] cursor-not-allowed'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-[#E8C97A]" />
                <span>读取存档</span>
              </button>

              <button
                type="button"
                onClick={onOpenEncyclopedia}
                className="game-btn-wood w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs tracking-wide cursor-pointer whitespace-nowrap"
              >
                <Trophy className="w-3.5 h-3.5 text-[#E8C97A]" />
                <span>图鉴与成就</span>
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                className="game-btn-wood w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs tracking-wide cursor-pointer whitespace-nowrap"
              >
                <Settings className="w-3.5 h-3.5 text-[#E8C97A]" />
                <span>游戏设置</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="game-btn-wood w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs tracking-wide cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#E8C97A]" />
                <span>经营指南</span>
              </button>
            </div>

            {/* Platform-aware Install to Home Screen / Desktop PWA CTA (Android, Huawei, iOS) */}
            <PWAInstallButton platform={platform} pwa={pwa} variant="menu" />
          </div>
        </div>

        {/* Quiet Bottom Game Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 text-[11px] sm:text-xs text-[#C5AE92]/90">
          <span>
            每日节奏：开店前筹备 → 正式开店营业 → 闭店冷链采购与手动结算
          </span>
          <span>3 位开局店长 · 10 章立绘对话主线 · 7 大前场明档与 7 大后场功能区</span>
        </div>
      </div>

      {/* Rules & Penalty Overlay Dialog */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-[#0d0604]/80 backdrop-blur-[3px] flex items-center justify-center p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
        >
          <div className="relative game-panel w-full max-w-2xl max-h-[90dvh] overflow-y-auto touch-scroll rounded-xl p-4 sm:p-6 md:p-7 text-[#F7EFE2]">
            <ChaoshanCornerOrnament className="absolute top-2 left-2 w-6 h-6 opacity-80" />
            <ChaoshanCornerOrnament className="absolute top-2 right-2 w-6 h-6 rotate-90 opacity-80" />
            <ChaoshanCornerOrnament className="absolute bottom-2 right-2 w-6 h-6 rotate-180 opacity-80" />
            <ChaoshanCornerOrnament className="absolute bottom-2 left-2 w-6 h-6 -rotate-90 opacity-80" />
            <div className="flex items-center justify-between pb-4 border-b border-[#593b25]">
              <div className="flex items-center gap-2.5">
                <VermilionSealStamp label="手札" size="sm" />
                <h2 className="font-display text-2xl font-bold text-[#FFF6E5]">
                  店长经营手札 · 玩法与失败红线
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="game-btn-wood p-1.5 rounded cursor-pointer"
                aria-label="关闭说明"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-5 text-xs text-[#DFCDB6] leading-relaxed">
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-[#E8C97A]">一、每日三段式经营流程</h3>
                <p>
                  1. <strong className="text-[#FFF6E5]">开店前准备</strong>：点击左上角「门店配置」或按 C 键进入门店配置中心，切换店面类型、调整菜单策略卡、研学门店发展树或签约雇员。
                </p>
                <p>
                  2. <strong className="text-[#FFF6E5]">正式开店营业</strong>：点击右下角圆形「正式开店」印玺开门迎客，迎宾上锅、从后场冷库向七大前场档口补货、现烹熟食、收桌洗碗。
                </p>
                <p>
                  3. <strong className="text-[#FFF6E5]">闭店采购与手动结算</strong>：22:00 闭店收尾后，可前往后场冷库手动下单补货（或雇佣「库存采购员」自动补单），货品将于次日闭店后到货入库；全厅整洁后手动点击打烊结算。
                </p>
                <p>
                  4. <strong className="text-[#FFF6E5]">主线与后场奇遇</strong>：达成主线目标自动触发人物立绘剧情演绎；步入后场 7 大房间还能结识特殊伙伴并解锁个人羁绊线。
                </p>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-[#F87171] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>二、惩罚与经营失败判定</span>
                </h3>
                <p>
                  <strong className="text-[#FCA5A5]">违规处罚满 5/5 次（吊销停业）</strong>：卫生低于 35 触发食安突击整改并记 +1 次违规；顾客逃单满 4 次或档口断供满 5 次各记 +1 次违规（前 2 日新店扶持期免记违规）。
                </p>
                <p>
                  <strong className="text-[#FCA5A5]">门店口碑归 0（倒闭）</strong>：排队超时、未上锅底离席及食安不合格会扣减口碑。
                </p>
                <p>
                  <strong className="text-[#FCA5A5]">资金低于 -¥600（破产）</strong>：每日打烊需扣除门店租金与员工日薪。
                </p>
                <p className="text-[#86EFAC]">
                  补救机制：单日达成「逃单 ≤ 1、零食安失败、卫生 ≥ 78」可撤销 1 次违规记点！
                </p>
              </div>
            </div>

            <div className="pt-4 pb-5 border-t border-[#593b25] space-y-2.5 text-xs text-[#DFCDB6]">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-[#99F6E4]">
                  三、后场七大功能区速览（局内按 [M] 随时切换巡视）
                </h3>
                <span className="text-[11px] text-[#C5AE92]">
                  每房每日 1 次巡视剧情 · 标「!」有可免费招募的神秘访客
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-snug">
                <div className="game-inset rounded-lg px-3 py-2">
                  <strong className="text-[#38BDF8]">冷链活鲜库</strong>：闭店冷链补货下单（次日闭店入库）、换水增氧巡检；可结识特聘伙伴 <strong className="text-[#FFF6E5]">林汐</strong>。
                </div>
                <div className="game-inset rounded-lg px-3 py-2">
                  <strong className="text-[#FB923C]">热厨出品间</strong>：加急现烹熟食（+3）救急前厅热菜；可结识特聘名厨 <strong className="text-[#FFF6E5]">沈知微</strong>。
                </div>
                <div className="game-inset rounded-lg px-3 py-2">
                  <strong className="text-[#67E8F9]">餐具洗消间</strong>：集中高温洗消积压脏碗，快速拉升全店卫生评分。
                </div>
                <div className="game-inset rounded-lg px-3 py-2">
                  <strong className="text-[#E8C97A]">店长办公室</strong>：核查考勤回士气、闭店补货、加急直采原料、发布灵活用工兼职（最多 3 人）；可结识 <strong className="text-[#FFF6E5]">苏星遥</strong>。
                </div>
                <div className="game-inset rounded-lg px-3 py-2">
                  <strong className="text-[#86EFAC]">卫生间洗手区</strong>：全面保洁补耗材，防止洁净度低于 55% 拖累口碑与半月检查。
                </div>
                <div className="game-inset rounded-lg px-3 py-2">
                  <strong className="text-[#FBBF24]">机电设备间</strong>：¥30 例行检修冷链与油水分离器，避免低于 60% 引发故障扣分。
                </div>
                <div className="game-inset rounded-lg px-3 py-2 sm:col-span-2">
                  <strong className="text-[#F472B6]">员工宿舍与茶室</strong>：¥40 安排宵夜慰问大幅恢复全员士气；与特聘伙伴好感 ≥80 结缘后可在此陪伴或满足心愿维系亲密。
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#593b25] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="game-btn-wood px-5 py-2.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                返回主菜单
              </button>
              <button
                type="button"
                onClick={onStartGame}
                className="game-btn-gold px-6 py-2.5 rounded-lg text-xs font-bold cursor-pointer"
              >
                进入选角开店
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
