import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crown,
  Heart,
  Home,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Store,
} from 'lucide-react';
import { getCharacterDef } from '../data/storyConfig';
import { EndingEpilogueReport, GameWorld } from '../types/game';
import { sound } from '../utils/sound';
import { ChaoshanCornerOrnament, VermilionSealStamp } from './VintageIcons';
import endingShopEmpireImg from '../assets/images/ending_shop_empire_1795681654695.jpg';
import endingShopCraftImg from '../assets/images/ending_shop_craft_1795681655994.jpg';
import endingManagerGloryImg from '../assets/images/ending_manager_glory_1795681663856.jpg';
import endingCompanionsFeastImg from '../assets/images/ending_companions_feast_1795681659517.jpg';
import endingHarborEraImg from '../assets/images/ending_harbor_era_1795681662733.jpg';

interface EndingEpilogueModalProps {
  world: GameWorld;
  report: EndingEpilogueReport;
  onContinueEndless: () => void;
  onBackToMenu: () => void;
}

interface EpilogueSlide {
  id: 'SHOP' | 'MANAGER' | 'COMPANIONS' | 'ERA';
  chapterTag: string;
  shortLabel: string;
  title: string;
  description: string;
  imageUrl: string;
  accentColor: string;
}

const SLIDE_AUTO_MS = 7500;
const TICK_MS = 100;

export function EndingEpilogueModal({
  world,
  report,
  onContinueEndless,
  onBackToMenu,
}: EndingEpilogueModalProps) {
  const charDef = getCharacterDef(world.characterId);
  const { CRAFT, EMPIRE, WARMTH } = world.storyPhilosophy;

  const slides: EpilogueSlide[] = useMemo(() => {
    const shopImg =
      report.dominantPhilosophy === 'EMPIRE' ? endingShopEmpireImg : endingShopCraftImg;

    const companionLead =
      report.staffEndings.length > 0
        ? `一路并肩走来的 ${report.staffEndings.length} 位羁绊伙伴在庆功沸锅宴上举杯共贺，各自迎来了属于自己的璀璨人生归宿：`
        : '虽然这一路多由你亲自掌舵打拼，但每一位曾在厅堂挥洒汗水的店员与食客，都在岁月的滚沸烟火里记住了“潮鲜沸鼎”的温暖灯火。';

    return [
      {
        id: 'SHOP',
        chapterTag: '壹 · 门店归宿',
        shortLabel: '门店归宿',
        title: report.shopEnding.title,
        description: report.shopEnding.summary,
        imageUrl: shopImg,
        accentColor: '#E8C97A',
      },
      {
        id: 'MANAGER',
        chapterTag: `贰 · 店长 ${charDef.name} 的未来`,
        shortLabel: '店长未来',
        title: report.managerEnding.title,
        description: report.managerEnding.summary,
        imageUrl: endingManagerGloryImg,
        accentColor: '#81E6D9',
      },
      {
        id: 'COMPANIONS',
        chapterTag: '叁 · 伙伴与挚爱归宿',
        shortLabel: '伙伴归宿',
        title:
          report.staffEndings.length > 0
            ? '《海港灯火夜 · 群星重逢沸锅宴》'
            : '《烟火长明 · 潮鲜同路人》',
        description: companionLead,
        imageUrl: endingCompanionsFeastImg,
        accentColor: '#F9A8D4',
      },
      {
        id: 'ERA',
        chapterTag: '肆 · 港湾时代变迁',
        shortLabel: '时代变迁',
        title: report.eraEnding.title,
        description: report.eraEnding.summary,
        imageUrl: endingHarborEraImg,
        accentColor: '#6EE7B7',
      },
    ];
  }, [report, charDef.name]);

  const [slideIdx, setSlideIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);

  const isFirst = slideIdx === 0;
  const isLast = slideIdx === slides.length - 1;
  const current = slides[slideIdx];

  const goToSlide = useCallback(
    (nextIdx: number) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, nextIdx));
      setSlideIdx(clamped);
      setElapsedMs(0);
      sound.playPageFlip();
    },
    [slides.length]
  );

  const handleNext = useCallback(() => {
    if (slideIdx < slides.length - 1) {
      goToSlide(slideIdx + 1);
    }
  }, [slideIdx, slides.length, goToSlide]);

  const handlePrev = useCallback(() => {
    if (slideIdx > 0) {
      goToSlide(slideIdx - 1);
    }
  }, [slideIdx, goToSlide]);

  const handleReplay = useCallback(() => {
    sound.playStoryFanfare();
    setSlideIdx(0);
    setElapsedMs(0);
    setAutoPlay(true);
  }, []);

  // Auto-advance slideshow timer (stops smoothly on the final slide)
  useEffect(() => {
    if (!autoPlay || isLast) return;
    const timer = window.setInterval(() => {
      setElapsedMs((prev) => {
        const next = prev + TICK_MS;
        if (next >= SLIDE_AUTO_MS) {
          setSlideIdx((idx) => Math.min(slides.length - 1, idx + 1));
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [autoPlay, isLast, slides.length]);

  // Keyboard navigation: Left / Right / Space
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (isLast) {
          handleReplay();
        } else {
          setAutoPlay((p) => !p);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNext, handlePrev, handleReplay, isLast]);

  const progressPct = isLast ? 100 : Math.min(100, (elapsedMs / SLIDE_AUTO_MS) * 100);

  const ChapterIcon =
    current.id === 'SHOP'
      ? Store
      : current.id === 'MANAGER'
        ? Award
        : current.id === 'COMPANIONS'
          ? Heart
          : Compass;

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] bg-[#090503]/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-5">
      <div className="relative game-panel w-[97vw] max-w-6xl h-[93dvh] sm:h-[92dvh] max-h-[820px] rounded-xl overflow-hidden flex flex-col text-[#F7EFE2] shadow-2xl border-2 border-[#c9a45c]">
        <ChaoshanCornerOrnament className="absolute top-1.5 left-1.5 z-30 w-6 h-6 opacity-85" />
        <ChaoshanCornerOrnament className="absolute top-1.5 right-1.5 z-30 w-6 h-6 rotate-90 opacity-85" />
        {/* Top Compact Cinema Header */}
        <header className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-[#2c190f] via-[#21130c] to-[#1a0f0a] border-b border-[#8c6239] flex items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <VermilionSealStamp label="终章" size="sm" />
            <div className="w-8 h-8 rounded-full border border-[#e8c97a] bg-[#160c08] hidden sm:flex items-center justify-center text-[#E8C97A] shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold tracking-widest text-[#E8C97A] truncate">
                潮鲜沸鼎 · 命运终章画卷（{slideIdx + 1} / {slides.length}）
              </div>
              <h2 className="font-display text-base md:text-lg font-black text-[#FFF8EC] truncate">
                {report.overallTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-2.5 text-[11px] text-[#C5AE92] font-mono-num mr-2">
              <span>
                第{world.year}年·第{world.day}天
              </span>
              <span>·</span>
              <span>总接待 {world.totalGuestsServed} 桌</span>
              <span>·</span>
              <span className="text-[#F6DA8D] font-bold">
                ¥{world.totalCashEarned.toLocaleString()}
              </span>
            </div>

            {!isLast ? (
              <button
                onClick={() => {
                  sound.playClick();
                  setAutoPlay((p) => !p);
                }}
                className="game-btn-wood inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
              >
                {autoPlay ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-[#E8C97A]" />
                    暂停连播
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-[#6EE7B7]" />
                    继续连播
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleReplay}
                className="game-btn-wood inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E8C97A] cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重播画卷
              </button>
            )}
          </div>
        </header>

        {/* Main Illustrated CG Slideshow Stage */}
        <div className="relative flex-1 min-h-0 bg-[#0d0705] overflow-hidden select-none">
          {/* Crossfading Full-Bleed Ending CG Images */}
          {slides.map((s, idx) => {
            const active = idx === slideIdx;
            return (
              <div
                key={s.id}
                className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                  active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <img
                  src={s.imageUrl}
                  alt={s.title}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover transition-transform duration-[7500ms] ease-linear ${
                    active ? 'scale-105' : 'scale-100'
                  }`}
                />
                {/* Soft Top & Bottom Cinema Vignette Gradients */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f0805]/55 via-transparent to-[#0c0604]/95" />
                <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#0b0604] via-[#130a07]/88 to-transparent" />
              </div>
            );
          })}

          {/* Thin Animated Progress Strip at Top of CG Frame */}
          <div className="absolute top-0 inset-x-0 z-20 flex gap-1.5 px-4 pt-2.5">
            {slides.map((s, idx) => {
              const fill = idx < slideIdx ? 100 : idx === slideIdx ? progressPct : 0;
              return (
                <button
                  key={s.id}
                  onClick={() => goToSlide(idx)}
                  aria-label={`切换到${s.shortLabel}`}
                  className="flex-1 h-1.5 rounded-full bg-[#ffffff]/20 overflow-hidden cursor-pointer hover:bg-[#ffffff]/35 transition-colors"
                >
                  <div
                    className="h-full bg-gradient-to-r from-[#D9A74A] to-[#FEF08A] transition-[width] duration-100 ease-linear"
                    style={{ width: `${fill}%` }}
                  />
                </button>
              );
            })}
          </div>

          {/* Left / Right Slide Arrow Controls */}
          {!isFirst && (
            <button
              onClick={handlePrev}
              aria-label="上一张结局图"
              className="absolute left-3 top-[38%] -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#1a0f0a]/80 hover:bg-[#3a2215]/95 border border-[#c9a45c]/70 text-[#FFF6E5] flex items-center justify-center shadow-lg cursor-pointer transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {!isLast && (
            <button
              onClick={handleNext}
              aria-label="下一张结局图"
              className="absolute right-3 top-[38%] -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#1a0f0a]/80 hover:bg-[#3a2215]/95 border border-[#c9a45c]/70 text-[#FFF6E5] flex items-center justify-center shadow-lg cursor-pointer transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Bottom Storytelling Narration Overlay */}
          <div className="absolute inset-x-0 bottom-0 z-20 px-5 md:px-8 pb-5 pt-4 flex flex-col gap-3">
            {/* Chapter Tag + Title Row */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1 max-w-3xl">
                <div
                  className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider"
                  style={{ color: current.accentColor }}
                >
                  <ChapterIcon className="w-4 h-4 shrink-0" />
                  <span>{current.chapterTag}</span>
                </div>
                <h3 className="font-display text-2xl md:text-3xl font-black text-[#FFF8EC] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                  {current.title}
                </h3>
              </div>

              {/* Slide-specific contextual badge (Manager portrait on Slide 2 / Philosophy breakdown on Slide 1) */}
              {current.id === 'SHOP' && (
                <div className="hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-lg bg-[#190e09]/85 border border-[#8c6239]/75 text-xs font-mono-num">
                  <span className="text-[#C5AE92]">经营理念</span>
                  <span className="text-[#6EE7B7] font-bold">匠心 {CRAFT}</span>
                  <span className="text-[#FBBF24] font-bold">商道 {EMPIRE}</span>
                  <span className="text-[#F9A8D4] font-bold">烟火 {WARMTH}</span>
                </div>
              )}

              {current.id === 'MANAGER' && (
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#190e09]/85 border border-[#38B2AC]/60">
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden border-2 bg-[#160c08] shrink-0"
                    style={{ borderColor: charDef.accentColor }}
                  >
                    <img
                      src={charDef.portraitUrl}
                      alt={charDef.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="text-xs leading-tight">
                    <div className="font-display font-bold text-[#FFF6E5]">{charDef.name}</div>
                    <div className="text-[11px] text-[#81E6D9]">{charDef.title}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Narration Description Box */}
            <div className="relative bg-[#160c08]/88 border border-[#c9a45c]/65 rounded-xl px-5 md:px-6 py-3.5 backdrop-blur-sm space-y-3">
              <ChaoshanCornerOrnament className="absolute top-1.5 left-1.5 w-5 h-5 opacity-75" />
              <ChaoshanCornerOrnament className="absolute bottom-1.5 right-1.5 w-5 h-5 rotate-180 opacity-75" />
              <p className="text-sm md:text-[15px] text-[#F5E9D6] leading-relaxed">
                {current.description}
              </p>

              {/* On Slide 3 (Companions), render concise illustrated ending cards for each recruited companion */}
              {current.id === 'COMPANIONS' && report.staffEndings.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 max-h-[156px] overflow-y-auto pr-1 pt-0.5">
                  {report.staffEndings.map((se) => (
                    <div
                      key={se.name}
                      className="bg-[#23140d]/90 border border-[#6b472b] rounded-lg px-3 py-2.5 space-y-1"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className="font-display text-sm font-bold truncate"
                          style={{ color: se.color }}
                        >
                          {se.name}
                        </span>
                        <span className="text-[10px] font-semibold text-[#F9A8D4] shrink-0">
                          {se.relationBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#DFCDB6] leading-relaxed">{se.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Filmstrip Selector & Final Action Footer */}
        <footer className="px-4 md:px-6 py-3 bg-[#150b07] border-t border-[#6b472b] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Chapter Filmstrip Quick-Jump Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {slides.map((s, idx) => {
              const active = idx === slideIdx;
              return (
                <button
                  key={s.id}
                  onClick={() => goToSlide(idx)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    active
                      ? 'bg-[#3d2517] border-[#e8c97a] text-[#FFF8EC] shadow-sm'
                      : 'bg-[#1f120c] border-[#523622] text-[#B59876] hover:border-[#b6924d] hover:text-[#F0E3CF]'
                  }`}
                >
                  <span className="font-mono-num text-[10px] text-[#E8C97A]">0{idx + 1}</span>
                  <span>{s.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Primary Progression / Endless Mode Controls */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {!isLast ? (
              <button
                onClick={handleNext}
                className="game-btn-gold inline-flex items-center gap-1 px-4 py-2 rounded-lg font-display font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                下一幕画卷
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-[11px] text-[#C5AE92] hidden lg:inline mr-1">
                继续经营将进入无尽模式，剧情故事不再触发推进
              </span>
            )}

            <button
              onClick={() => {
                sound.playClick();
                onBackToMenu();
              }}
              className="game-btn-wood inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <Home className="w-3.5 h-3.5" />
              返回主菜单
            </button>

            <button
              onClick={() => {
                sound.playStoryFanfare();
                onContinueEndless();
              }}
              className={`${
                isLast ? 'game-btn-gold' : 'game-btn-wood text-[#F6DA8D] border-[#b6924d]'
              } inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-display font-bold text-xs cursor-pointer whitespace-nowrap`}
              title="进入无尽纯经营模式（主线与支线剧情将全部定格不再触发）"
            >
              <Sparkles className="w-3.5 h-3.5" />
              继续纯经营无尽模式
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
