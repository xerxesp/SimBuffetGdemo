import { useState } from 'react';
import { ArrowLeft, Check, Play } from 'lucide-react';
import { MANAGER_CHARACTERS, TITLE_KEYART_URL } from '../data/storyConfig';
import { CharacterId } from '../types/game';

interface CharacterSelectScreenProps {
  initialCharacterId: CharacterId;
  onBackToMenu: () => void;
  onConfirmStart: (characterId: CharacterId) => void;
}

export function CharacterSelectScreen({
  initialCharacterId,
  onBackToMenu,
  onConfirmStart,
}: CharacterSelectScreenProps) {
  const [selectedId, setSelectedId] = useState<CharacterId>(initialCharacterId);
  const chosen = MANAGER_CHARACTERS.find((c) => c.id === selectedId) || MANAGER_CHARACTERS[0];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#120a07] text-[#F7EFE2] flex flex-col select-none">
      {/* Subtle Dimmed Key-Art Atmosphere */}
      <img
        src={TITLE_KEYART_URL}
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[2px] scale-105"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 35%, rgba(48,28,18,0.72) 0%, rgba(18,10,7,0.96) 85%)',
        }}
      />

      {/* Main Framed Selection Stage */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col max-w-6xl w-full mx-auto px-6 py-6 md:py-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#593b25] shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={onBackToMenu}
              className="game-btn-wood inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回主菜单
            </button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-[#FFF6E5]">
                择定开局店长
              </h1>
              <p className="text-xs text-[#C5AE92] mt-0.5">
                三位店长拥有迥异的出身背景、初始资金与贯穿全程的经营绝技
              </p>
            </div>
          </div>
          <span className="text-xs font-mono-num text-[#E8C97A] hidden sm:inline whitespace-nowrap">
            第 1 幕 · 启程开店
          </span>
        </div>

        {/* 3 Portrait Character Dossiers */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-5 py-6 overflow-y-auto">
          {MANAGER_CHARACTERS.map((char) => {
            const active = char.id === selectedId;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => setSelectedId(char.id)}
                className={`text-left rounded-xl overflow-hidden transition-all cursor-pointer flex flex-col ${
                  active
                    ? 'bg-[#362116] border-2 border-[#E8C97A] shadow-[0_0_26px_rgba(232,201,122,0.24)] -translate-y-0.5'
                    : 'bg-[#22140e]/95 border border-[#593b25] hover:border-[#b58942]'
                }`}
              >
                {/* Illustrated Character Portrait */}
                <div className="relative aspect-[4/3] w-full bg-[#160c08] overflow-hidden shrink-0">
                  <img
                    src={char.portraitUrl}
                    alt={`${char.name} - ${char.title}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-20"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(34,20,14,0) 0%, rgba(34,20,14,0.96) 100%)',
                    }}
                  />
                  {active && (
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#E8C97A] text-[#211208] flex items-center justify-center shadow-md">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                  <div className="absolute bottom-2.5 left-4 right-4 flex items-baseline justify-between">
                    <span className="font-display text-2xl font-bold text-[#FFF7E8]">
                      {char.name}
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: char.accentColor }}
                    >
                      {char.title}
                    </span>
                  </div>
                </div>

                {/* Story & Stats */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3.5">
                  <p className="text-xs text-[#DFCDB6] leading-relaxed">
                    {char.backstory}
                  </p>

                  <div className="space-y-2.5 pt-3 border-t border-[#593b25]">
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono-num">
                      <div className="game-inset px-2.5 py-1.5 rounded flex justify-between">
                        <span className="text-[#B59876]">资金</span>
                        <span className="text-[#E8C97A] font-bold">¥{char.startingCash}</span>
                      </div>
                      <div className="game-inset px-2.5 py-1.5 rounded flex justify-between">
                        <span className="text-[#B59876]">口碑</span>
                        <span className="text-[#6EE7B7] font-bold">{char.startingReputation}</span>
                      </div>
                    </div>

                    <div
                      className="text-xs font-medium leading-relaxed"
                      style={{ color: char.accentColor }}
                    >
                      {char.perkSummary}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom Confirmation Dock */}
        <div className="game-panel rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src={chosen.portraitUrl}
              alt={chosen.name}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-full object-cover object-top border-2 border-[#E8C97A] shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#FFF6E5]">
                已选定：{chosen.name}
                <span className="ml-2 text-xs font-medium" style={{ color: chosen.accentColor }}>
                  {chosen.title}
                </span>
              </div>
              <div className="text-xs text-[#C5AE92] truncate">{chosen.perkSummary}</div>
            </div>
          </div>

          <button
            onClick={() => onConfirmStart(selectedId)}
            className="game-btn-gold inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-display font-bold text-base tracking-wide cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            进入开店准备
          </button>
        </div>
      </div>
    </div>
  );
}
