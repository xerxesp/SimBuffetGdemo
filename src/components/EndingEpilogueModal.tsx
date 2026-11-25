import { Award, Compass, Crown, Heart, Home, Sparkles, Store } from 'lucide-react';
import { getCharacterDef } from '../data/storyConfig';
import { EndingEpilogueReport, GameWorld } from '../types/game';
import { sound } from '../utils/sound';

interface EndingEpilogueModalProps {
  world: GameWorld;
  report: EndingEpilogueReport;
  onContinueEndless: () => void;
  onBackToMenu: () => void;
}

export function EndingEpilogueModal({
  world,
  report,
  onContinueEndless,
  onBackToMenu,
}: EndingEpilogueModalProps) {
  const charDef = getCharacterDef(world.characterId);
  const { CRAFT, EMPIRE, WARMTH } = world.storyPhilosophy;

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0604]/90 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
      <div className="game-panel w-[96vw] max-w-5xl max-h-[90vh] rounded-xl overflow-hidden flex flex-col text-[#F7EFE2] shadow-2xl border-2 border-[#c9a45c]">
        {/* Grand Golden Epilogue Header */}
        <header className="px-6 py-5 bg-gradient-to-b from-[#3d2517] via-[#28170f] to-[#1a0f0a] border-b-2 border-[#c9a45c] flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="w-16 h-16 rounded-full overflow-hidden border-2 bg-[#160c08] shadow-lg shrink-0"
              style={{ borderColor: charDef.accentColor }}
            >
              <img
                src={charDef.portraitUrl}
                alt={charDef.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#E8C97A]">
                <Crown className="w-4 h-4 shrink-0" />
                <span>潮鲜沸鼎 · 命运终章史诗结局</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-black text-[#FFF8EC] mt-0.5 truncate">
                {report.overallTitle}
              </h2>
              <div className="flex items-center gap-3 text-xs text-[#C5AE92] font-mono-num mt-1 flex-wrap">
                <span>历时第 {world.year} 年 · 第 {world.day} 天</span>
                <span>·</span>
                <span>累计接待 {world.totalGuestsServed} 桌</span>
                <span>·</span>
                <span>
                  理念倾向：匠心 {CRAFT} / 商道 {EMPIRE} / 烟火 {WARMTH}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-[#C5AE92]">累计总创收</div>
            <div className="font-mono-num text-2xl font-bold text-[#F6DA8D]">
              ¥{world.totalCashEarned.toLocaleString()}
            </div>
          </div>
        </header>

        {/* Scrollable 4-Dimension Multi-Ending Chronicles */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-gradient-to-b from-[#1e120c]/95 to-[#120a07]/98 space-y-5">
          {/* Row 1: Shop Ending & Manager Future Life */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <section className="game-card p-5 rounded-xl border-[#c9a45c]/70 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#E8C97A]">
                <Store className="w-4 h-4" />
                <span>壹 · 这家店的最终结局</span>
              </div>
              <h3 className="font-display text-xl font-bold text-[#FFF6E5]">
                {report.shopEnding.title}
              </h3>
              <p className="text-sm text-[#EFE2D0] leading-relaxed">
                {report.shopEnding.summary}
              </p>
            </section>

            <section className="game-card p-5 rounded-xl border-[#38B2AC]/60 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#81E6D9]">
                <Award className="w-4 h-4" />
                <span>贰 · 店长 {charDef.name} 的未来人生</span>
              </div>
              <h3 className="font-display text-xl font-bold text-[#FFF6E5]">
                {report.managerEnding.title}
              </h3>
              <p className="text-sm text-[#EFE2D0] leading-relaxed">
                {report.managerEnding.summary}
              </p>
            </section>
          </div>

          {/* Row 2: Special Staff Future Lives */}
          <section className="game-card p-5 rounded-xl border-[#F472B6]/45 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#F472B6]">
              <Heart className="w-4 h-4" />
              <span>叁 · 特殊店员与羁绊伙伴的未来归宿</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.staffEndings.map((se) => (
                <div key={se.name} className="game-inset p-4 rounded-lg space-y-2 border border-[#6b472b]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-base font-bold" style={{ color: se.color }}>
                      {se.name}
                    </span>
                    <span className="text-[11px] font-semibold text-[#F9A8D4]">
                      {se.relationBadge}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#C5AE92]">{se.roleTitle}</div>
                  <p className="text-xs text-[#DFCDB6] leading-relaxed">{se.summary}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Row 3: Future Era & Times Change */}
          <section className="game-card p-5 rounded-xl border-[#6EE7B7]/45 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6EE7B7]">
              <Compass className="w-4 h-4" />
              <span>肆 · 港湾烟火与未来时代变迁</span>
            </div>
            <h3 className="font-display text-xl font-bold text-[#FFF6E5]">
              {report.eraEnding.title}
            </h3>
            <p className="text-sm text-[#EFE2D0] leading-relaxed">
              {report.eraEnding.summary}
            </p>
          </section>
        </div>

        {/* Footer Actions */}
        <footer className="px-6 py-4 bg-[#160c08] border-t border-[#593b25] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-[#C5AE92]">
            你可以在「主线见闻录」中随时重温此终章，或继续无尽经营探索更多季节与伴侣日常。
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                sound.playClick();
                onBackToMenu();
              }}
              className="game-btn-wood inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <Home className="w-4 h-4" />
              返回主菜单
            </button>
            <button
              onClick={() => {
                sound.playStoryFanfare();
                onContinueEndless();
              }}
              className="game-btn-gold inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg font-display font-bold text-sm cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              继续无尽传奇经营
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
