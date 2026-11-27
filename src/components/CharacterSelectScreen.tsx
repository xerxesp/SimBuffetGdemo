import { useState } from 'react';
import { ArrowLeft, Check, Play } from 'lucide-react';
import { MANAGER_CHARACTERS, TITLE_KEYART_URL } from '../data/storyConfig';
import { CharacterId } from '../types/game';
import { ChaoshanCornerOrnament, VermilionSealStamp } from './VintageIcons';

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
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-[#120a07] text-[#F7EFE2] flex flex-col select-none">
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
      <div
        className="relative z-10 flex-1 min-h-0 flex flex-col max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 md:py-7"
        style={{
          paddingTop: 'max(0.85rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(0.85rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-[#593b25] shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={onBackToMenu}
              className="game-btn-wood inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 min-h-[40px] rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回</span>
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <VermilionSealStamp label="择主" size="sm" className="hidden sm:inline-flex" />
              <div className="min-w-0">
                <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-[#FFF6E5] truncate">
                  择定开局店长
                </h1>
                <p className="text-[11px] sm:text-xs text-[#C5AE92] mt-0.5 truncate">
                  三位店长各具出身、初始资金与经营绝技
                </p>
              </div>
            </div>
          </div>
          <span className="text-xs font-mono-num text-[#E8C97A] hidden sm:inline whitespace-nowrap">
            第 1 幕 · 启程开店
          </span>
        </div>

        {/* 3 Tall 3:4 Portrait Character Dossiers */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 py-4 sm:py-5 overflow-y-auto touch-scroll">
          {MANAGER_CHARACTERS.map((char) => {
            const active = char.id === selectedId;
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => setSelectedId(char.id)}
                onDoubleClick={() => onConfirmStart(char.id)}
                className={`relative text-left rounded-xl overflow-hidden transition-all duration-200 cursor-pointer flex flex-col shrink-0 ${
                  active
                    ? 'bg-[#342015] border-2 border-[#E8C97A] shadow-[0_0_30px_rgba(232,201,122,0.22)] md:-translate-y-0.5'
                    : 'bg-[#20130d]/92 border border-[#593b25] hover:border-[#b58942]'
                }`}
              >
                {active && (
                  <>
                    <ChaoshanCornerOrnament className="absolute top-1.5 left-1.5 z-20 w-6 h-6" />
                    <ChaoshanCornerOrnament className="absolute bottom-1.5 right-1.5 z-20 w-6 h-6 rotate-180" />
                  </>
                )}
                {/* Tall 3:4 Illustrated Character Portrait */}
                <div className="relative h-48 sm:h-64 lg:h-80 w-full bg-[#160c08] overflow-hidden shrink-0">
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
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <VermilionSealStamp label="掌柜" size="sm" className="rotate-[4deg]" />
                      <div className="w-7 h-7 rounded-full bg-[#E8C97A] text-[#211208] flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-4 right-4 flex items-baseline justify-between gap-2">
                    <span className="font-display text-xl sm:text-2xl font-bold text-[#FFF7E8]">
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
                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
                  <p className="text-xs text-[#DFCDB6] leading-relaxed">{char.backstory}</p>

                  <div className="space-y-2 pt-2.5 border-t border-[#593b25]">
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
        <div className="hud-float rounded-xl px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={chosen.portraitUrl}
              alt={chosen.name}
              referrerPolicy="no-referrer"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover object-top border-2 border-[#E8C97A] shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#FFF6E5]">
                已选定：{chosen.name}
                <span className="ml-2 text-xs font-medium" style={{ color: chosen.accentColor }}>
                  {chosen.title}
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-[#C5AE92] truncate">{chosen.perkSummary}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onConfirmStart(selectedId)}
            className="game-btn-gold min-h-[44px] inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-display font-bold text-sm sm:text-base tracking-wide cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>进入开店准备</span>
          </button>
        </div>
      </div>
    </div>
  );
}
