import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Award, Check, ChevronRight, FastForward, ScrollText } from 'lucide-react';
import { getCharacterDef, resolveSpeakerPortrait } from '../data/storyConfig';
import { CharacterId, StoryChoiceOption, StoryModalEvent } from '../types/game';
import { sound } from '../utils/sound';
import { ChaoshanCornerOrnament, VermilionSealStamp } from './VintageIcons';

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
  const [revealedChars, setRevealedChars] = useState(0);

  // Guard refs preventing stale typewriter state or rapid double-clicks from skipping choices / closing early
  const skipNextTypewriterRef = useRef(false);
  const lastRevealAtRef = useRef(0);

  useEffect(() => {
    skipNextTypewriterRef.current = false;
    lastRevealAtRef.current = 0;
    setLineIndex(0);
    setChosenOption(null);
    setRevealedChars(0);
  }, [event.id]);

  const activeLine = lines ? lines[Math.min(lineIndex, lines.length - 1)] : null;
  const isLastLine = !lines || lineIndex >= lines.length - 1;
  const fullText = chosenOption
    ? chosenOption.outcomeText
    : activeLine
      ? activeLine.text
      : event.body;

  // Smooth typewriter cadence (snappy 22ms/2 chars, subtle brush tick SFX, instantly skippable)
  useEffect(() => {
    if (!fullText) {
      setRevealedChars(0);
      return;
    }
    if (skipNextTypewriterRef.current) {
      skipNextTypewriterRef.current = false;
      setRevealedChars(fullText.length);
      lastRevealAtRef.current = performance.now();
      return;
    }
    setRevealedChars(0);
    const total = fullText.length;
    const timer = window.setInterval(() => {
      setRevealedChars((prev) => {
        if (prev >= total) {
          window.clearInterval(timer);
          return total;
        }
        const next = Math.min(total, prev + 2);
        if (next >= total) {
          lastRevealAtRef.current = performance.now();
        } else if (next % 6 === 0) {
          sound.playDialogueTick();
        }
        return next;
      });
    }, 22);
    return () => window.clearInterval(timer);
  }, [fullText]);

  const isTypingDone = revealedChars >= fullText.length;
  const visibleText = isTypingDone ? fullText : fullText.slice(0, revealedChars);
  const hasPendingChoice = Boolean(choices && !chosenOption);
  const showChoices = Boolean(hasPendingChoice && isLastLine && isTypingDone);

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
      lastRevealAtRef.current = performance.now();
      return;
    }
    if (lines && !isLastLine) {
      sound.playPageFlip();
      setRevealedChars(0);
      setLineIndex((idx) => Math.min(lines.length - 1, idx + 1));
      return;
    }
    // Never close the modal while branching choices are still pending selection!
    if (hasPendingChoice) {
      return;
    }
    // Brief 240ms anti-double-click guard right after finishing final text reveal
    if (performance.now() - lastRevealAtRef.current < 240) {
      return;
    }
    sound.playPageFlip();
    onClose();
  }, [isTypingDone, fullText.length, lines, isLastLine, hasPendingChoice, onClose]);

  const handleSkipToEnd = () => {
    if (!lines) return;
    sound.playPageFlip();
    skipNextTypewriterRef.current = true;
    lastRevealAtRef.current = performance.now();
    const lastIdx = lines.length - 1;
    setLineIndex(lastIdx);
    setRevealedChars(lines[lastIdx].text.length);
  };

  const handlePickChoice = useCallback(
    (choice: StoryChoiceOption) => {
      sound.playClick();
      setRevealedChars(0);
      lastRevealAtRef.current = performance.now();
      setChosenOption(choice);
      if (onSelectChoice) {
        onSelectChoice(choice);
      }
    },
    [onSelectChoice]
  );

  // Keyboard shortcuts: Space/Enter advances (ignoring key-repeat), 1-3 selects branching choices
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
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
    <div className="fixed inset-0 z-50 h-[100dvh] bg-[#0d0705]/62 backdrop-blur-[3px] flex flex-col justify-between items-center px-2.5 sm:px-6 pt-[max(0.625rem,env(safe-area-inset-top))] pb-[max(0.625rem,env(safe-area-inset-bottom))] overflow-hidden">
      {/* Top Floating Chapter Ribbon (translucent, clean unboxed metadata + vermilion chapter seal) */}
      <div className="w-full max-w-5xl hud-float rounded-xl px-3.5 py-2 sm:px-5 sm:py-2.5 flex items-center justify-between gap-2.5 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <VermilionSealStamp
            label={
              event.category === 'INSPECTION'
                ? '核查'
                : event.category === 'INCIDENT'
                  ? '奇遇'
                  : event.category === 'STAFF_CHAT'
                    ? '羁绊'
                    : '见闻'
            }
            size="sm"
          />
          <span
            className="text-[11px] sm:text-xs font-semibold tracking-wider whitespace-nowrap shrink-0 hidden sm:inline"
            style={{ color: event.accentColor }}
          >
            {event.badge}
          </span>
          <span className="text-[#7c5c38] hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <h2 className="font-display text-sm sm:text-base md:text-lg font-bold text-[#FFF7E8] truncate">
            {event.headline}
          </h2>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <span className="text-[11px] sm:text-xs text-[#D4BC9E] font-mono-num whitespace-nowrap">
            {lines ? `${lineIndex + 1} / ${lines.length}` : displayTitle || displaySpeaker}
          </span>
          {lines && !isLastLine && (
            <button
              type="button"
              onClick={handleSkipToEnd}
              className="inline-flex items-center gap-1 px-2 py-1 min-h-[34px] text-xs font-medium text-[#E8C97A] hover:text-[#FFF7E8] transition-colors cursor-pointer whitespace-nowrap"
              title="直接跳转至本段末句与抉择"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>快进</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Novel Stage: Large 3:4 Waist-Up Portraits + Classical Gold-Filigree Dialogue Box */}
      <div className="w-full max-w-5xl flex flex-col items-stretch mt-auto min-h-0">
        {/* Dual Portrait Stage rising smoothly behind top rim of dialogue frame */}
        <div className="relative flex items-end justify-between px-2 sm:px-10 -mb-5 sm:-mb-7 pointer-events-none select-none shrink-0">
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
              className="relative w-28 h-36 sm:w-52 sm:h-68 md:w-64 md:h-[330px] rounded-t-2xl overflow-hidden border border-[#cfa356]/75 bg-[#160d09] shadow-[0_14px_40px_rgba(0,0,0,0.72)]"
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
              <div className="absolute inset-x-0 bottom-0 h-14 sm:h-20 bg-gradient-to-t from-[#160d09] via-[#160d09]/55 to-transparent" />
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
                className="relative w-28 h-36 sm:w-52 sm:h-68 md:w-64 md:h-[330px] rounded-t-2xl overflow-hidden border bg-[#160d09] shadow-[0_14px_40px_rgba(0,0,0,0.72)]"
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
                <div className="absolute inset-x-0 bottom-0 h-14 sm:h-20 bg-gradient-to-t from-[#160d09] via-[#160d09]/55 to-transparent" />
              </div>
            </div>
          )}
        </div>

        {/* Classical Chinese Lacquer & Gold-Filigree Dialogue Box */}
        <div className="relative z-20 vn-dialogue-box rounded-2xl text-[#F7EFE2]">
          <ChaoshanCornerOrnament className="absolute top-2 left-2 w-6 h-6 sm:w-7 sm:h-7 opacity-90" />
          <ChaoshanCornerOrnament className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rotate-90 opacity-90" />
          <ChaoshanCornerOrnament className="absolute bottom-2 right-2 w-6 h-6 sm:w-7 sm:h-7 rotate-180 opacity-90" />
          <ChaoshanCornerOrnament className="absolute bottom-2 left-2 w-6 h-6 sm:w-7 sm:h-7 -rotate-90 opacity-90" />

          {/* Floating Ornate Speaker Name Plaque perched on top rim */}
          <div
            className={`absolute -top-4 sm:-top-5 z-30 flex items-center gap-2 vn-nameplate px-3.5 py-1 sm:px-5 sm:py-1.5 rounded-lg transition-all duration-200 ${
              isManagerSpeaking ? 'left-4 sm:left-10' : 'right-4 sm:right-10'
            }`}
          >
            <span className="font-display text-sm sm:text-lg font-bold tracking-wider text-[#FFF6E5] whitespace-nowrap">
              【{speakerLabel}】
            </span>
            {displayTitle && (
              <span className="text-xs text-[#DFC496] whitespace-nowrap hidden sm:inline">
                {displayTitle}
              </span>
            )}
          </div>

          {/* Main Dialogue Body (internally scrollable on short mobile screens so choices never clip) */}
          <div className="px-4 pt-6 pb-4 sm:px-9 sm:pt-8 sm:pb-6 space-y-3 sm:space-y-4 max-h-[62dvh] sm:max-h-[68dvh] overflow-y-auto touch-scroll">
            <div
              onClick={handleAdvanceOrFinish}
              className={`min-h-[64px] sm:min-h-[96px] flex flex-col justify-between ${
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
                      className="vn-choice-plaque w-full text-left px-4 sm:px-5 py-3 min-h-[48px] rounded-xl cursor-pointer group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm sm:text-[15px] font-bold text-[#FFF6E5] group-hover:text-[#FDE68A]">
                          【{ch.label}】
                        </span>
                        <span className="font-mono-num text-[11px] text-[#E8C97A]/85 shrink-0 hidden sm:inline">
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
            <div className="pt-2.5 sm:pt-3 border-t border-[#593b25]/70 flex items-center justify-between gap-3">
              {!isTypingDone || (lines && !isLastLine) ? (
                <>
                  <span className="text-xs text-[#BFA587] inline-flex items-center gap-1.5 min-w-0">
                    <ScrollText className="w-3.5 h-3.5 text-[#D9B060] shrink-0" />
                    <span className="truncate">
                      {!isTypingDone && hasPendingChoice && isLastLine
                        ? '点击显示全文并展开抉择'
                        : '轻点对话框继续'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAdvanceOrFinish}
                    className="game-btn-gold inline-flex items-center gap-1.5 px-5 sm:px-6 py-2.5 min-h-[42px] rounded-lg font-bold text-sm cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>
                      {!isTypingDone
                        ? hasPendingChoice && isLastLine
                          ? '显示选项'
                          : '显示全文'
                        : '继续对话'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : hasPendingChoice ? (
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
                    className="game-btn-gold inline-flex items-center gap-1.5 px-5 sm:px-6 py-2.5 min-h-[42px] rounded-lg font-bold text-sm cursor-pointer whitespace-nowrap shrink-0"
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
