import { Home, RotateCcw, ShieldAlert } from 'lucide-react';
import { getCharacterDef, MAIN_CHAPTERS } from '../data/storyConfig';
import { GameWorld } from '../types/game';

interface GameOverModalProps {
  world: GameWorld;
  onChooseCharacter: () => void;
  onBackToMenu: () => void;
}

export function GameOverModal({
  world,
  onChooseCharacter,
  onBackToMenu,
}: GameOverModalProps) {
  const charDef = getCharacterDef(world.characterId);
  const chapterDef = MAIN_CHAPTERS[Math.min(world.mainChapter, MAIN_CHAPTERS.length) - 1];

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0604]/86 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="game-panel w-full max-w-xl rounded-xl overflow-hidden border-[#b83b24] text-[#F7EFE2]">
        <div className="px-6 py-4 bg-gradient-to-b from-[#3d1713] to-[#240d0a] border-b border-[#8e2715] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-[#F87171]">
            <ShieldAlert className="w-6 h-6" />
            <h2 className="font-display text-2xl font-bold tracking-wide">
              经营失败 · 停业通告
            </h2>
          </div>
          <span className="text-xs font-mono-num text-[#DFBFB8]">第 {world.day} 天</span>
        </div>

        <div className="p-6 space-y-5">
          {/* Manager Portrait + Failure Cause */}
          <div className="flex items-start gap-4 pb-4 border-b border-[#593b25]">
            <img
              src={charDef.portraitUrl}
              alt={charDef.name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover object-top border-2 border-[#8e2715] grayscale-[35%] shrink-0"
            />
            <div className="space-y-1">
              <div className="text-sm font-bold text-[#FCA5A5]">
                失败原因：{world.gameOverTitle || '门店停业整顿'}
              </div>
              <p className="text-xs text-[#DFCDB6] leading-relaxed">
                {world.gameOverReason || '门店经营不善，被迫停业。'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="game-inset p-3 rounded-lg">
              <div className="text-[11px] text-[#C5AE92]">营业天数</div>
              <div className="font-mono-num text-lg font-bold text-[#FFF6E5] mt-0.5">
                {world.day} 天
              </div>
            </div>
            <div className="game-inset p-3 rounded-lg">
              <div className="text-[11px] text-[#C5AE92]">累计营收</div>
              <div className="font-mono-num text-lg font-bold text-[#E8C97A] mt-0.5">
                ¥{world.totalCashEarned.toLocaleString()}
              </div>
            </div>
            <div className="game-inset p-3 rounded-lg">
              <div className="text-[11px] text-[#C5AE92]">接待桌次</div>
              <div className="font-mono-num text-lg font-bold text-[#FFF6E5] mt-0.5">
                {world.totalGuestsServed} 桌
              </div>
            </div>
            <div className="game-inset p-3 rounded-lg">
              <div className="text-[11px] text-[#C5AE92]">违规记点</div>
              <div className="font-mono-num text-lg font-bold text-[#F87171] mt-0.5">
                {world.penaltyStrikes}/{world.maxPenaltyStrikes}
              </div>
            </div>
            <div className="game-inset p-3 rounded-lg">
              <div className="text-[11px] text-[#C5AE92]">逃单 / 罚金</div>
              <div className="font-mono-num text-sm font-bold text-[#FCA5A5] mt-1">
                {world.totalWalkouts}次 · ¥{world.totalPenaltyFines}
              </div>
            </div>
            <div className="game-inset p-3 rounded-lg">
              <div className="text-[11px] text-[#C5AE92]">主线进度</div>
              <div className="text-xs font-semibold text-[#EFE2D0] mt-1.5 truncate">
                {world.mainStoryCompleted ? '已通关' : chapterDef.title}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={onChooseCharacter}
              className="game-btn-gold flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-display font-bold text-sm tracking-wide cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              重新选择角色再战
            </button>
            <button
              onClick={onBackToMenu}
              className="game-btn-wood inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm cursor-pointer whitespace-nowrap"
            >
              <Home className="w-4 h-4" />
              返回主菜单
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
