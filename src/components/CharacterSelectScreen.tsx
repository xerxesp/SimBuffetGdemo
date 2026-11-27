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
            'radial-gradient(circle at 50% 35%, rgba(44,26,17,0.74) 0%, rgba(16,9,6,0.96) 86%)',
        }}
      />

      {/* Main Framed Selection Stage */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col max-w-6xl w-full mx-auto px-6 py-5 md:py-7">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#593b25] shrink-0">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBackToMenu}
              className="game-btn-wood inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回主菜单</span>
            </button>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-[#FFF6E5]">
                择定开局店长
              </h1>
              <p className="text-xs text-[#C5AE92] mt-0.5">
                三位店长各具出身、初始资金与经营绝技 · 双击立绘可直接启程
              </p>
            </div>
          </div>
          <span className="text-xs font-mono-num text-[#E8C97A] hidden sm:inline whitespace-nowrap">
            第 1 幕 · 启程开店
          </span>
        </div>

        {/* 3 Tall 3:4 Portrait Character Dossiers */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-5 py-5 overflow-y-auto">
          {MANAGER_CHARACTERS.map((char) => {
            const active = char.id === selectedId;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => setSelectedId(char.id)}
                onDoubleClick={() => onConfirmStart(char.id)}
                className={`text-left rounded-xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col ${
                  active
                    ? 'bg-[#342015] border-2 border-[#E8C97A] shadow-[0_0_30px_rgba(232,201,122,0.22)] -translate-y-0.5'
                    : 'bg-[#20130d]/92 border border-[#593b25] hover:border-[#b58942]'
                }`}
              >
                {/* Tall 3:4 Illustrated Character Portrait */}
                <div className="relative h-64 sm:h-72 lg:h-80 w-full bg-[#160c08] overflow-hidden shrink-0">
                  <img
                    src={char.portraitUrl}
                    alt={`${char.name} - ${char.title}`}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover object-top transition-transform duration-300 ${
                      active ? 'scale-[1.03]' : 'scale-100'
                    }`}
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-24"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(32,19,13,0) 0%, rgba(32,19,13,0.96) 100%)',
                    }}
                  />
                  {active && (
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#E8C97A] text-[#211208] flex items-center justify-center shadow-md">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-4 right-4 flex items-baseline justify-between gap-2">
                    <span className="font-display text-2xl font-bold text-[#FFF7E8]">
                      {char.name}
                    </span>
                    <span
                      className="text-xs font-semibold whitespace-nowrap"
                      style={{ color: char.accentColor }}
                    >
                      {char.title}
                    </span>
                  </div>
                </div>

                {/* Story & Stats */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <p className="text-xs text-[#DFCDB6] leading-relaxed">{char.backstory}</p>

                  <div className="space-y-2.5 pt-3 border-t border-[#593b25]">
                    <div className="flex items-center justify-between text-xs font-mono-num text-[#DFCDB6]">
                      <span>
                        初始资金 <strong className="text-[#E8C97A]">¥{char.startingCash}</strong>
                      </span>
                      <span className="text-[#6b472b]" aria-hidden="true">
                        ·
                      </span>
                      <span>
                        初始口碑 <strong className="text-[#6EE7B7]">{char.startingReputation}</strong>
                      </span>
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
        <div className="hud-float rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
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
            type="button"
            onClick={() => onConfirmStart(selectedId)}
            className="game-btn-gold inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-display font-bold text-base tracking-wide cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>进入开店准备</span>
          </button>
        </div>
      </div>
    </div>
  );
}
