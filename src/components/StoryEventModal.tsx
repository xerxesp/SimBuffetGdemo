import { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, Check, ChevronRight, FastForward, ScrollText } from 'lucide-react';
import { getCharacterDef, resolveSpeakerPortrait } from '../data/storyConfig';
import { CharacterId, StoryChoiceOption, StoryModalEvent } from '../types/game';
import { sound } from '../utils/sound';

interface StoryEventModalProps {
  event: StoryModalEvent;
  characterId: CharacterId;
  onSelectChoice?: (choice: StoryChoiceOption) => void;
  onClose: () => void;
}

/** Delicate classical Chinese gold corner flourish SVG for the VN dialogue box */
function GoldCornerFlourish({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none absolute w-6 h-6 text-[#d9b060]/85 ${className}`}
    >
      <path
        d="M2 18V4.5C2 3.1 3.1 2 4.5 2H18M2 9.5H7.5C8.6 9.5 9.5 8.6 9.5 7.5V2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="5.5" cy="5.5" r="1.3" fill="currentColor" />
    </svg>
  );
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
  const [revealedChars, setRevealedChars] = useState(0);

  useEffect(() => {
    setLineIndex(0);
    setChosenOption(null);
  }, [event.id]);

  const activeLine = lines ? lines[Math.min(lineIndex, lines.length - 1)] : null;
  const isLastLine = !lines || lineIndex >= lines.length - 1;
  const fullText = chosenOption
    ? chosenOption.outcomeText
    : activeLine
      ? activeLine.text
      : event.body;

  // Smooth typewriter cadence (snappy 18ms/char, instantly skippable by click or Space/Enter)
  useEffect(() => {
    setRevealedChars(0);
    if (!fullText) return;
    const total = fullText.length;
    const timer = window.setInterval(() => {
      setRevealedChars((prev) => {
        if (prev >= total) {
          window.clearInterval(timer);
          return total;
        }
        return Math.min(total, prev + 2);
      });
    }, 22);
    return () => window.clearInterval(timer);
  }, [fullText]);

  const isTypingDone = revealedChars >= fullText.length;
  const visibleText = isTypingDone ? fullText : fullText.slice(0, revealedChars);
  const showChoices = Boolean(choices && isLastLine && !chosenOption && isTypingDone);

  const displaySpeaker = activeLine ? activeLine.speaker : event.speakerName;
  const displayTitle = activeLine?.title ?? event.speakerTitle;

  const activePortrait = useMemo(() => {
    if (activeLine?.portraitUrl) {
      const isMgr =
        activeLine.portraitSide === 'left' ||
        activeLine.speaker === '你' ||
        activeLine.speaker === charDef.name;
      return {
        url: activeLine.portraitUrl,
        side: activeLine.portraitSide ?? (isMgr ? 'left' : 'right'),
        isManager: isMgr,
      };
    }
    return resolveSpeakerPortrait(displaySpeaker, characterId);
  }, [activeLine, displaySpeaker, characterId, charDef.name]);

  const rightSideNpc = useMemo(() => {
    if (!activePortrait.isManager) {
      return {
        name: displaySpeaker,
        title: displayTitle,
        url: activePortrait.url,
      };
    }
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
    const fallback = resolveSpeakerPortrait(event.speakerName, characterId);
    if (!fallback.isManager) {
      return {
        name: event.speakerName,
        title: event.speakerTitle,
        url: fallback.url,
      };
    }
    return null;
  }, [
    activePortrait,
    displaySpeaker,
    displayTitle,
    lines,
    characterId,
    event.speakerName,
    event.speakerTitle,
  ]);

  const isManagerSpeaking = activePortrait.isManager;

  const handleAdvanceOrFinish = useCallback(() => {
    if (!isTypingDone) {
      setRevealedChars(fullText.length);
      return;
    }
    if (lines && !isLastLine) {
      sound.playClick();
      setLineIndex((idx) => Math.min(lines.length - 1, idx + 1));
      return;
    }
    if (!showChoices) {
      sound.playClick();
      onClose();
    }
  }, [isTypingDone, fullText.length, lines, isLastLine, showChoices, onClose]);

  const handleSkipToEnd = () => {
    if (!lines) return;
    sound.playClick();
    setLineIndex(lines.length - 1);
    setRevealedChars(9999);
  };

  const handlePickChoice = useCallback(
    (choice: StoryChoiceOption) => {
      sound.playClick();
      setChosenOption(choice);
      if (onSelectChoice) {
        onSelectChoice(choice);
      }
    },
    [onSelectChoice]
  );

  // Keyboard shortcuts: Space/Enter advances, 1-3 selects branching choices
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleAdvanceOrFinish();
      } else if (showChoices && choices) {
        const idx = Number(e.key) - 1;
        if (idx >= 0 && idx < choices.length) {
          e.preventDefault();
          handlePickChoice(choices[idx]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleAdvanceOrFinish, handlePickChoice, showChoices, choices]);

  const speakerLabel = displaySpeaker === '你' ? charDef.name : displaySpeaker;

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0705]/62 backdrop-blur-[3px] flex flex-col justify-between items-center px-3 py-3 sm:px-6 sm:py-5 overflow-hidden">
      {/* Top Floating Chapter Ribbon (translucent, clean unboxed metadata) */}
      <div className="w-full max-w-5xl hud-float rounded-xl px-5 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="text-xs font-semibold tracking-wider whitespace-nowrap shrink-0"
            style={{ color: event.accentColor }}
          >
            {event.badge}
          </span>
          <span className="text-[#7c5c38]" aria-hidden="true">
            ·
          </span>
          <h2 className="font-display text-base md:text-lg font-bold text-[#FFF7E8] truncate">
            {event.headline}
          </h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-[#D4BC9E] font-mono-num whitespace-nowrap">
            {lines ? `${lineIndex + 1} / ${lines.length}` : displayTitle || displaySpeaker}
          </span>
          {lines && !isLastLine && (
            <button
              type="button"
              onClick={handleSkipToEnd}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#E8C97A] hover:text-[#FFF7E8] transition-colors cursor-pointer whitespace-nowrap"
              title="直接跳转至本段末句与抉择"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>快进</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Novel Stage: Large 3:4 Waist-Up Portraits + Classical Gold-Filigree Dialogue Box */}
      <div className="w-full max-w-5xl flex flex-col items-stretch mt-auto">
        {/* Dual Portrait Stage rising smoothly behind top rim of dialogue frame */}
        <div className="relative flex items-end justify-between px-2 sm:px-10 -mb-7 pointer-events-none select-none">
          {/* Left Portrait: Manager (Player) */}
          <div
            className={`relative flex flex-col items-center transition-all duration-300 ease-out origin-bottom ${
              isManagerSpeaking
                ? 'opacity-100 scale-105 brightness-105 z-10'
                : 'opacity-65 scale-[0.94] brightness-[0.65] z-0'
            }`}
          >
            {isManagerSpeaking && (
              <div
                aria-hidden="true"
                className="absolute -inset-3 rounded-t-3xl blur-2xl opacity-35 bg-[#e8c97a]"
              />
            )}
            <div
              className="relative w-40 h-52 sm:w-56 sm:h-72 md:w-64 md:h-[330px] rounded-t-2xl overflow-hidden border border-[#cfa356]/75 bg-[#160d09] shadow-[0_14px_40px_rgba(0,0,0,0.72)]"
              style={{
                borderColor: isManagerSpeaking ? '#E8C97A' : 'rgba(110, 78, 46, 0.55)',
              }}
            >
              <img
                src={charDef.portraitUrl}
                alt={charDef.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
              {/* Seamless warm vignette fade into dialogue frame */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#160d09] via-[#160d09]/55 to-transparent" />
            </div>
          </div>

          {/* Right Portrait: Active NPC Counterpart */}
          {rightSideNpc && (
            <div
              className={`relative flex flex-col items-center transition-all duration-300 ease-out origin-bottom ${
                !isManagerSpeaking
                  ? 'opacity-100 scale-105 brightness-105 z-10'
                  : 'opacity-65 scale-[0.94] brightness-[0.65] z-0'
              }`}
            >
              {!isManagerSpeaking && (
                <div
                  aria-hidden="true"
                  className="absolute -inset-3 rounded-t-3xl blur-2xl opacity-30"
                  style={{ backgroundColor: event.accentColor }}
                />
              )}
              <div
                className="relative w-40 h-52 sm:w-56 sm:h-72 md:w-64 md:h-[330px] rounded-t-2xl overflow-hidden border bg-[#160d09] shadow-[0_14px_40px_rgba(0,0,0,0.72)]"
                style={{
                  borderColor: !isManagerSpeaking ? event.accentColor : 'rgba(110, 78, 46, 0.55)',
                }}
              >
                <img
                  src={rightSideNpc.url}
                  alt={rightSideNpc.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#160d09] via-[#160d09]/55 to-transparent" />
              </div>
            </div>
          )}
        </div>

        {/* Classical Chinese Lacquer & Gold-Filigree Dialogue Box */}
        <div className="relative z-20 vn-dialogue-box rounded-2xl text-[#F7EFE2]">
          <GoldCornerFlourish className="top-2 left-2" />
          <GoldCornerFlourish className="top-2 right-2 rotate-90" />
          <GoldCornerFlourish className="bottom-2 right-2 rotate-180" />
          <GoldCornerFlourish className="bottom-2 left-2 -rotate-90" />

          {/* Floating Ornate Speaker Name Plaque perched on top rim (matching approved mockup!) */}
          <div
            className={`absolute -top-5 z-30 flex items-center gap-2 vn-nameplate px-5 py-1.5 rounded-lg transition-all duration-200 ${
              isManagerSpeaking ? 'left-6 sm:left-10' : 'right-6 sm:right-10'
            }`}
          >
            <span className="font-display text-base sm:text-lg font-bold tracking-wider text-[#FFF6E5] whitespace-nowrap">
              【{speakerLabel}】
            </span>
            {displayTitle && (
              <span className="text-xs text-[#DFC496] whitespace-nowrap hidden sm:inline">
                {displayTitle}
              </span>
            )}
          </div>

          {/* Main Dialogue Body */}
          <div className="px-6 pt-7 pb-5 sm:px-9 sm:pt-8 sm:pb-6 space-y-4">
            <div
              onClick={handleAdvanceOrFinish}
              className={`min-h-[84px] sm:min-h-[96px] flex flex-col justify-between ${
                !showChoices ? 'cursor-pointer' : ''
              }`}
            >
              {chosenOption && (
                <div className="text-xs font-semibold text-[#86EFAC] mb-1.5">
                  已选定抉择 · {chosenOption.label}
                </div>
              )}
              <p className="text-[15px] sm:text-base text-[#FFF8EC] leading-[1.8] tracking-[0.015em] whitespace-pre-line">
                {visibleText}
                {!isTypingDone && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-[#E8C97A]" />
                )}
              </p>
            </div>

            {/* Half-Month Inspection Itemized Scorecard */}
            {event.inspectionScorecard && isLastLine && isTypingDone && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {event.inspectionScorecard.metrics.map((m) => (
                  <div
                    key={m.label}
                    className={`game-inset p-3 rounded-lg border ${
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
                    <p className="text-xs text-[#D6C3A8] leading-relaxed mt-1.5">{m.feedback}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Milestone / Reward Summary */}
            {event.rewardHighlight && (isLastLine || chosenOption) && isTypingDone && (
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-[#160d09]/85 border border-[#b58942]/65 text-xs leading-relaxed text-[#F7EFE2]">
                <Award
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: event.accentColor }}
                />
                <div>
                  <span className="font-semibold text-[#E8C97A]">
                    {event.category === 'INSPECTION' ? '核查结论与奖惩：' : '里程碑收获：'}
                  </span>
                  <span>{event.rewardHighlight}</span>
                </div>
              </div>
            )}

            {/* Ornate Branching Choice Plaques (matching approved mockup!) */}
            {showChoices && choices && (
              <div className="pt-3 border-t border-[#6b472b]/70 space-y-2.5">
                <div className="text-xs text-[#E8C97A] font-medium">
                  请做出你的抉择（按数字键 1–{choices.length} 或点击下方牌匾）
                </div>
                <div
                  className={`grid grid-cols-1 ${
                    choices.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'
                  } gap-2.5`}
                >
                  {choices.map((ch, idx) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handlePickChoice(ch)}
                      className="vn-choice-plaque w-full text-left px-5 py-3 rounded-xl cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm sm:text-[15px] font-bold text-[#FFF6E5] group-hover:text-[#FDE68A]">
                          【{ch.label}】
                        </span>
                        <span className="font-mono-num text-[11px] text-[#E8C97A]/85 shrink-0">
                          [{idx + 1}]
                        </span>
                      </div>
                      <div className="text-xs text-[#E2CEB4] mt-1 leading-snug">{ch.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clean Footer Action Bar */}
            <div className="pt-3 border-t border-[#593b25]/70 flex items-center justify-between gap-3">
              {lines && !isLastLine ? (
                <>
                  <span className="text-xs text-[#BFA587] inline-flex items-center gap-1.5">
                    <ScrollText className="w-3.5 h-3.5 text-[#D9B060]" />
                    <span>点击对话框或按空格键继续</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAdvanceOrFinish}
                    className="game-btn-gold inline-flex items-center gap-1.5 px-6 py-2 rounded-lg font-bold text-sm cursor-pointer whitespace-nowrap"
                  >
                    <span>{isTypingDone ? '继续对话' : '显示全文'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : showChoices ? (
                <span className="text-xs text-[#E8C97A]">
                  抉择将深刻影响人物羁绊与最终结局走向
                </span>
              ) : (
                <>
                  <span className="text-xs text-[#BFA587] truncate">
                    {event.triggersEndingAfterClose
                      ? '最终章抉择已落定，即将揭晓命运终章画卷'
                      : event.finishDayAfterClose
                        ? '半月联合核查完毕，确认后进入打烊结算'
                        : event.category === 'INCIDENT'
                          ? '事件已妥善处置，返回厅堂继续营业'
                          : event.category === 'STAFF_CHAT'
                            ? '店员间的默契又加深了几分'
                            : '已自动收录至主线见闻'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      onClose();
                    }}
                    className="game-btn-gold inline-flex items-center gap-1.5 px-6 py-2 rounded-lg font-bold text-sm cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {event.triggersEndingAfterClose
                        ? '开启命运终章'
                        : event.finishDayAfterClose
                          ? '签收并结算'
                          : event.category === 'INCIDENT'
                            ? '回到厅堂'
                            : event.category === 'STAFF_CHAT'
                              ? '结束交谈'
                              : '继续经营'}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
