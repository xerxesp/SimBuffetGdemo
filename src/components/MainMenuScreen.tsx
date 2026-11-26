import { useState } from 'react';
import { BookOpen, HardDrive, Play, RotateCcw, Settings, ShieldAlert, Trophy, X } from 'lucide-react';
import { TITLE_KEYART_URL } from '../data/storyConfig';
import { SaveSlotMeta } from '../types/game';

interface MainMenuScreenProps {
  bestDays: number;
  bestCash: number;
  autoSaveMeta: SaveSlotMeta | null;
  hasAnySave: boolean;
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
  onContinueAutoSave,
  onStartGame,
  onOpenLoadModal,
  onOpenEncyclopedia,
  onOpenSettings,
}: MainMenuScreenProps) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#120a07] text-[#F7EFE2] select-none">
      {/* Full-bleed Illustrated Key Art Backdrop */}
      <img
        src={TITLE_KEYART_URL}
        alt="潮鲜沸鼎海鲜自助火锅馆夜景插画"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center scale-[1.01]"
      />

      {/* Directional Warm Espresso Scrim so Left Title & Menu have crisp contrast while Art glows on Right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(95deg, rgba(18,10,7,0.95) 0%, rgba(28,16,11,0.82) 38%, rgba(28,16,11,0.28) 72%, rgba(18,10,7,0.45) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(18,10,7,0.34) 0%, rgba(18,10,7,0) 28%, rgba(18,10,7,0.8) 100%)',
        }}
      />

      {/* Main Game Title Screen Content */}
      <div className="relative z-10 h-full w-full flex flex-col justify-between px-8 py-9 md:px-16 md:py-12">
        {/* Subtle Top-Left Emblem */}
        <div className="flex items-center justify-between">
          <div className="text-xs tracking-[0.22em] text-[#E8C97A] font-medium">
            海鲜自助火锅 · 模拟经营单机版
          </div>
          {bestDays > 0 && (
            <div className="text-xs font-mono-num text-[#F7EFE2]/95 bg-[#24150e]/85 border border-[#b58942]/80 px-3.5 py-1.5 rounded">
              最佳纪录 · 经营 {bestDays} 天 · 累计营收 ¥{bestCash.toLocaleString()}
            </div>
          )}
        </div>

        {/* Center-Left Classic Strategy Game Title & Vertical Menu Stack */}
        <div className="max-w-lg space-y-8 my-auto">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border-2 border-[#E8C97A] bg-[#9B2B16] flex items-center justify-center font-display font-black text-base text-[#FFF7E6] shadow-lg shrink-0">
                鼎
              </div>
              <span className="text-sm text-[#E8C97A] font-semibold tracking-widest">
                店长物语
              </span>
            </div>

            <h1
              className="font-display text-6xl md:text-7xl font-black tracking-tight text-[#FFF7E8] leading-none"
              style={{
                textShadow: '0 4px 18px rgba(0, 0, 0, 0.85), 0 1px 0 #7C5B20',
              }}
            >
              潮鲜沸鼎
            </h1>

            <p className="text-sm md:text-base text-[#E6D6C0] leading-relaxed max-w-md pt-1">
              执掌海畔火锅名馆，开店前于门店配置中心调兵遣将、扩建七大前场档口与秘制锅底；开市后迎宾上锅、冷库补货、清桌洗碗，在客流高峰与食安红线中问鼎海上御膳传奇。
            </p>
          </div>

          {/* Tactile Vertical PC Game Menu Buttons */}
          <div className="flex flex-col gap-2.5 w-68">
            {autoSaveMeta && (
              <button
                onClick={onContinueAutoSave}
                className="game-btn-gold w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-display font-bold text-base tracking-wide cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                继续经营（第 {autoSaveMeta.day} 天 · Lv.{autoSaveMeta.shopLevel}）
              </button>
            )}

            <button
              onClick={onStartGame}
              className={`${
                autoSaveMeta
                  ? 'game-btn-wood text-[#FFF6E5] py-3 text-sm font-bold'
                  : 'game-btn-gold py-4 text-lg font-display font-bold tracking-wider'
              } w-full inline-flex items-center justify-center gap-2.5 px-7 rounded-lg cursor-pointer whitespace-nowrap`}
            >
              <Play className="w-4 h-4 fill-current" />
              {autoSaveMeta ? '开启新店（选角开局）' : '开始游戏'}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenLoadModal}
                disabled={!hasAnySave}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs tracking-wide whitespace-nowrap ${
                  hasAnySave
                    ? 'game-btn-wood cursor-pointer'
                    : 'bg-[#1a0f0a]/70 border border-[#3d2518] text-[#785e47] cursor-not-allowed'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-[#E8C97A]" />
                读取存档
              </button>

              <button
                onClick={onOpenEncyclopedia}
                className="game-btn-wood w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs tracking-wide cursor-pointer whitespace-nowrap"
              >
                <Trophy className="w-3.5 h-3.5 text-[#E8C97A]" />
                图鉴与成就
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenSettings}
                className="game-btn-wood w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs tracking-wide cursor-pointer whitespace-nowrap"
              >
                <Settings className="w-3.5 h-3.5 text-[#E8C97A]" />
                游戏设置
              </button>

              <button
                onClick={() => setShowGuide(true)}
                className="game-btn-wood w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-semibold text-xs tracking-wide cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#E8C97A]" />
                经营指南
              </button>
            </div>
          </div>
        </div>

        {/* Quiet Bottom Game Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#C5AE92]/90">
          <span>
            每日节奏：开店前筹备（门店配置中心）→ 正式营业 → 闭店冷链采购与手动结算
          </span>
          <span>3 位开局店长 · 5 章立绘对话主线 · 未知奇遇待发掘</span>
        </div>
      </div>

      {/* Rules & Penalty Overlay Dialog */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-[#0d0604]/82 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="game-panel w-full max-w-2xl rounded-xl p-6 md:p-7 text-[#F7EFE2]">
            <div className="flex items-center justify-between pb-4 border-b border-[#593b25]">
              <h2 className="font-display text-2xl font-bold text-[#FFF6E5]">
                店长经营手札 · 玩法与失败红线
              </h2>
              <button
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
                  二、惩罚与经营失败判定
                </h3>
                <p>
                  <strong className="text-[#FCA5A5]">违规处罚满 5/5 次（吊销停业）</strong>：卫生低于 45 触发食安突击重罚并直接记 +2 次违规；顾客逃单或档口断供每累计 3 次各记 +1 次违规。
                </p>
                <p>
                  <strong className="text-[#FCA5A5]">门店口碑归 0（倒闭）</strong>：排队超时、未上锅底逃单及食安不合格均大幅扣减口碑。
                </p>
                <p>
                  <strong className="text-[#FCA5A5]">资金低于 -¥400（破产）</strong>：每日打烊需扣除门店租金与员工日薪。
                </p>
                <p className="text-[#86EFAC]">
                  补救机制：单日达成「零逃单、零食安失败、卫生 ≥ 85」可撤销 1 次违规记点！
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#593b25] flex justify-end gap-3">
              <button
                onClick={() => setShowGuide(false)}
                className="game-btn-wood px-5 py-2.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                返回主菜单
              </button>
              <button
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
