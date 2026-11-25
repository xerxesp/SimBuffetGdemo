import { useEffect, useMemo, useState } from 'react';
import { Award, Check, ChevronRight, Sparkles } from 'lucide-react';
import { getCharacterDef, resolveSpeakerPortrait } from '../data/storyConfig';
import { CharacterId, StoryChoiceOption, StoryModalEvent } from '../types/game';
import { sound } from '../utils/sound';

interface StoryEventModalProps {
  event: StoryModalEvent;
  characterId: CharacterId;
  onSelectChoice?: (choice: StoryChoiceOption) => void;
  onClose: () => void;
}

export function StoryEventModal({
  event,
  characterId,
  onSelectChoice,
  onClose,
}: StoryEventModalProps) {
  const charDef = getCharacterDef(characterId);
  const lines = event.lines && event.lines.length > 0 ? event.lines : null;
  const choices = event.choices && event.choices.length > 0 ? event.choices : null;

  const [lineIndex, setLineIndex] = useState(0);
  const [chosenOption, setChosenOption] = useState<StoryChoiceOption | null>(null);

  useEffect(() => {
    setLineIndex(0);
    setChosenOption(null);
  }, [event.id]);

  const activeLine = lines ? lines[Math.min(lineIndex, lines.length - 1)] : null;
  const isLastLine = !lines || lineIndex >= lines.length - 1;
  const showChoices = Boolean(choices && isLastLine && !chosenOption);

  const displaySpeaker = activeLine ? activeLine.speaker : event.speakerName;
  const displayTitle = activeLine?.title ?? event.speakerTitle;

  const activePortrait = useMemo(() => {
    if (activeLine?.portraitUrl) {
      const isMgr = activeLine.portraitSide === 'left' || activeLine.speaker === '你' || activeLine.speaker === charDef.name;
      return {
        url: activeLine.portraitUrl,
        side: activeLine.portraitSide ?? (isMgr ? 'left' : 'right'),
        isManager: isMgr,
      };
    }
    return resolveSpeakerPortrait(displaySpeaker, characterId);
  }, [activeLine, displaySpeaker, characterId, charDef.name]);

  // Determine the counterpart (right-side NPC) portrait for the entire scene so both portraits stay on stage
  const rightSideNpc = useMemo(() => {
    // Prefer active speaker if they are on the right
    if (!activePortrait.isManager) {
      return {
        name: displaySpeaker,
        title: displayTitle,
        url: activePortrait.url,
      };
    }
    // Otherwise look through dialogue lines for the first non-manager speaker
    if (lines) {
      for (const l of lines) {
        const res = resolveSpeakerPortrait(l.speaker, characterId);
        if (!res.isManager) {
          return {
            name: l.speaker,
            title: l.title ?? '',
            url: l.portraitUrl ?? res.url,
          };
        }
      }
    }
    // Fallback to event.speakerName if it isn't the manager
    const fallback = resolveSpeakerPortrait(event.speakerName, characterId);
    if (!fallback.isManager) {
      return {
        name: event.speakerName,
        title: event.speakerTitle,
        url: fallback.url,
      };
    }
    return null;
  }, [activePortrait, displaySpeaker, displayTitle, lines, characterId, event.speakerName, event.speakerTitle]);

  const isManagerSpeaking = activePortrait.isManager;

  const handleNextLine = () => {
    if (!lines || isLastLine) return;
    sound.playClick();
    setLineIndex((idx) => Math.min(lines.length - 1, idx + 1));
  };

  const handlePickChoice = (choice: StoryChoiceOption) => {
    sound.playClick();
    setChosenOption(choice);
    if (onSelectChoice) {
      onSelectChoice(choice);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0604]/86 backdrop-blur-[4px] flex flex-col justify-end items-center p-3 md:p-6 overflow-hidden">
      {/* Top Floating Chapter / Event Ribbon */}
      <div className="w-full max-w-4xl mb-auto mt-1 flex items-center justify-between gap-4 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#2c1a11]/95 to-[#1a0f0a]/95 border border-[#b58942] shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-xs font-bold tracking-wider px-2.5 py-0.5 rounded bg-[#140a07] border border-[#6b472b] shrink-0"
            style={{ color: event.accentColor }}
          >
            {event.badge}
          </span>
          <h2 className="font-display text-base md:text-lg font-bold text-[#FFF6E5] truncate">
            {event.headline}
          </h2>
        </div>
        <span className="text-xs text-[#C5AE92] font-mono-num shrink-0">
          {lines ? `剧情演绎 ${lineIndex + 1} / ${lines.length}` : `${displaySpeaker} · ${displayTitle}`}
        </span>
      </div>

      {/* Visual Novel Stage: Left (Manager) & Right (NPC) Character Portraits */}
      <div className="w-full max-w-4xl flex flex-col items-stretch">
        <div className="relative flex items-end justify-between px-2 sm:px-8 -mb-3 pointer-events-none select-none min-h-[190px] sm:min-h-[250px]">
          {/* Left Portrait: Manager (Player) */}
          <div
            className={`relative flex flex-col items-center transition-all duration-300 ease-out ${
              isManagerSpeaking
                ? 'opacity-100 scale-[1.03] brightness-105 z-10'
                : 'opacity-50 scale-95 brightness-70 z-0'
            }`}
          >
            <div
              className="w-36 h-44 sm:w-48 sm:h-60 rounded-t-2xl overflow-hidden border-2 bg-[#160c08] shadow-[0_12px_36px_rgba(0,0,0,0.75)]"
              style={{
                borderColor: isManagerSpeaking ? '#E8C97A' : '#593b25',
                boxShadow: isManagerSpeaking
                  ? '0 0 26px rgba(232, 201, 122, 0.32), 0 12px 36px rgba(0,0,0,0.75)'
                  : undefined,
              }}
            >
              <img
                src={charDef.portraitUrl}
                alt={charDef.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#140a07] via-[#140a07]/60 to-transparent" />
            </div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded bg-[#140a07]/90 border border-[#8f6632] text-[11px] font-display font-bold text-[#F6DA8D] whitespace-nowrap">
              店长 · {charDef.name}
            </div>
          </div>

          {/* Right Portrait: Active NPC Counterpart */}
          {rightSideNpc && (
            <div
              className={`relative flex flex-col items-center transition-all duration-300 ease-out ${
                !isManagerSpeaking
                  ? 'opacity-100 scale-[1.03] brightness-105 z-10'
                  : 'opacity-50 scale-95 brightness-70 z-0'
              }`}
            >
              <div
                className="w-36 h-44 sm:w-48 sm:h-60 rounded-t-2xl overflow-hidden border-2 bg-[#160c08] shadow-[0_12px_36px_rgba(0,0,0,0.75)]"
                style={{
                  borderColor: !isManagerSpeaking ? event.accentColor : '#593b25',
                  boxShadow: !isManagerSpeaking
                    ? `0 0 26px ${event.accentColor}44, 0 12px 36px rgba(0,0,0,0.75)`
                    : undefined,
                }}
              >
                <img
                  src={rightSideNpc.url}
                  alt={rightSideNpc.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#140a07] via-[#140a07]/60 to-transparent" />
              </div>
              <div
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded bg-[#140a07]/90 border text-[11px] font-display font-bold whitespace-nowrap"
                style={{
                  borderColor: !isManagerSpeaking ? event.accentColor : '#6b472b',
                  color: !isManagerSpeaking ? '#FFF6E5' : '#C5AE92',
                }}
              >
                {rightSideNpc.name}
              </div>
            </div>
          )}
        </div>

        {/* Visual Novel Bottom Dialogue Panel */}
        <div className="relative z-20 game-panel rounded-2xl overflow-hidden text-[#F7EFE2] shadow-2xl">
          {/* Active Speaker Nameplate Header */}
          <div className="px-6 py-2.5 bg-gradient-to-r from-[#341f15] via-[#26160f] to-[#1c100b] border-b border-[#8c6239] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: isManagerSpeaking ? '#E8C97A' : event.accentColor }}
              />
              <span className="font-display text-base font-bold text-[#FFF6E5] whitespace-nowrap">
                {displaySpeaker === '你' ? `店长 · ${charDef.name}` : displaySpeaker}
              </span>
              {displayTitle && (
                <span className="text-xs text-[#D4BC9E] truncate">· {displayTitle}</span>
              )}
            </div>
            {lines && !isLastLine && (
              <span className="text-[11px] text-[#E8C97A] animate-pulse whitespace-nowrap">
                点击对话框继续 ▸
              </span>
            )}
          </div>

          {/* Dialogue Text / Outcome / Choices */}
          <div className="p-5 sm:p-6 space-y-4">
            {chosenOption ? (
              <div className="game-inset p-4 rounded-xl border border-[#4ade80]/50 space-y-2">
                <div className="text-xs font-bold text-[#86EFAC] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>你的抉择：{chosenOption.label}</span>
                </div>
                <p className="text-sm sm:text-[15px] text-[#FFF6E5] leading-relaxed">
                  {chosenOption.outcomeText}
                </p>
              </div>
            ) : (
              <div
                onClick={lines && !isLastLine ? handleNextLine : undefined}
                className={`game-inset p-4 sm:p-5 rounded-xl border border-[#6b472b] min-h-[96px] flex flex-col justify-between ${
                  lines && !isLastLine ? 'cursor-pointer hover:border-[#c4974b] transition-colors' : ''
                }`}
              >
                <p className="text-sm sm:text-[15px] text-[#F7EFE2] leading-relaxed whitespace-pre-line">
                  {activeLine ? activeLine.text : event.body}
                </p>
              </div>
            )}

            {/* Half-Month Inspection Itemized Scorecard */}
            {event.inspectionScorecard && isLastLine && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {event.inspectionScorecard.metrics.map((m) => (
                  <div
                    key={m.label}
                    className={`game-inset p-3 rounded-xl border ${
                      m.score >= 80
                        ? 'border-[#34d399]/60'
                        : m.passed
                          ? 'border-[#fbbf24]/55'
                          : 'border-[#f87171]/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#FFF6E5]">{m.label}</span>
                      <span
                        className={`font-mono-num text-xs font-bold ${
                          m.score >= 80
                            ? 'text-[#6EE7B7]'
                            : m.passed
                              ? 'text-[#FCD34D]'
                              : 'text-[#FCA5A5]'
                        }`}
                      >
                        {m.score}分 · {m.statusText}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#D6C3A8] leading-relaxed mt-1.5">
                      {m.feedback}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {event.rewardHighlight && (isLastLine || chosenOption) && (
              <div className="game-inset p-3 rounded-xl flex items-start gap-2.5 border border-[#b58942]/75">
                <Award
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: event.accentColor }}
                />
                <div className="text-xs leading-relaxed text-[#F7EFE2]">
                  <span className="font-semibold text-[#E8C97A]">
                    {event.category === 'INSPECTION' ? '核查结论与奖惩：' : '里程碑收获：'}
                  </span>
                  <span>{event.rewardHighlight}</span>
                </div>
              </div>
            )}

            {/* Interactive Branching Choices */}
            {showChoices && choices && (
              <div className="pt-2 border-t border-[#593b25] space-y-2">
                <div className="text-xs font-bold text-[#E8C97A] tracking-wide">
                  请选择你的经营回应（抉择将深刻影响后续故事与最终结局）：
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {choices.map((ch, idx) => (
                    <button
                      key={ch.id}
                      onClick={() => handlePickChoice(ch)}
                      className="w-full text-left game-card hover:border-[#e8c97a] px-4 py-3 rounded-xl transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-display text-sm font-bold text-[#FFF6E5] group-hover:text-[#F6DA8D]">
                          {idx + 1}. {ch.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#E8C97A] shrink-0" />
                      </div>
                      <div className="text-xs text-[#C5AE92] mt-1">{ch.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="px-6 py-3.5 bg-[#150b08] border-t border-[#593b25] flex items-center justify-between gap-3">
            {lines && !isLastLine ? (
              <>
                <span className="text-xs text-[#B59876]">
                  第 {lineIndex + 1} / {lines.length} 幕对话 · 点击推进剧情
                </span>
                <button
                  onClick={handleNextLine}
                  className="game-btn-gold inline-flex items-center gap-1.5 px-6 py-2 rounded-lg font-bold text-sm cursor-pointer whitespace-nowrap"
                >
                  继续对话
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : showChoices ? (
              <span className="text-xs text-[#E8C97A]">请在上方做出你的选择以继续</span>
            ) : (
              <>
                <span className="text-xs text-[#B59876]">
                  {event.triggersEndingAfterClose
                    ? '最终章抉择已尘埃落定，即将揭晓命运终章结局'
                    : event.finishDayAfterClose
                      ? '半月联合核查完毕，确认后将进入今日打烊结算'
                      : event.category === 'INCIDENT'
                        ? '突发事件已处置完毕，支线抉择结果将牵动后续剧情发展'
                        : event.category === 'STAFF_CHAT'
                          ? '与店员的温暖交流让店里更有凝聚力'
                          : '本段剧情已自动收录至主线见闻'}
                </span>
                <button
                  onClick={() => {
                    sound.playClick();
                    onClose();
                  }}
                  className="game-btn-gold inline-flex items-center gap-1.5 px-6 py-2 rounded-lg font-bold text-sm cursor-pointer whitespace-nowrap"
                >
                  <Check className="w-4 h-4" />
                  {event.triggersEndingAfterClose
                    ? '开启命运终章结局'
                    : event.finishDayAfterClose
                      ? '签收核查单 · 进入打烊结算'
                      : event.category === 'INCIDENT'
                        ? '回到厅堂 · 继续营业'
                        : event.category === 'STAFF_CHAT'
                          ? '结束交谈'
                          : '收入囊中 · 继续经营'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
