import { BookOpen, Calendar, Check, Compass, Crown, Heart, Sparkles, X } from 'lucide-react';
import { STAFF_ROLE_META } from '../data/gameConfig';
import {
  evaluateChapterObjectives,
  getCharacterDef,
  MAIN_CHAPTERS,
  SPECIAL_STAFF_CATALOG,
  SPECIAL_STORIES,
} from '../data/storyConfig';
import { getAvailableSpecialStaffQuests } from '../engine/storyAndFacilities';
import {
  getDiscoveredSeasonalEventSummaries,
  getDiscoveredSideQuestSummaries,
} from '../data/serviceIncidentsConfig';
import { GameWorld, SpecialStaffId } from '../types/game';

interface StoryChronicleModalProps {
  world: GameWorld;
  onClaimChapter: () => void;
  onOpenEnding: () => void;
  onTriggerSpecialQuest: (staffId: SpecialStaffId) => void;
  onOpenDormitory: () => void;
  onClose: () => void;
}

const RELATION_TEXT: Record<string, string> = {
  STRANGER: '待结识',
  COLLEAGUE: '并肩伙伴',
  CLOSE: '知心挚友',
  DATING: '热恋恋人',
  MARRIED: '结发伴侣',
};

export function StoryChronicleModal({
  world,
  onClaimChapter,
  onOpenEnding,
  onTriggerSpecialQuest,
  onOpenDormitory,
  onClose,
}: StoryChronicleModalProps) {
  const charDef = getCharacterDef(world.characterId);
  const chapterDef = MAIN_CHAPTERS[Math.min(world.mainChapter, MAIN_CHAPTERS.length) - 1];
  const chapterEval = evaluateChapterObjectives(world);
  const canClaimChapter = !world.mainStoryCompleted && chapterEval.allDone;
  const availableQuests = getAvailableSpecialStaffQuests(world);

  // Strictly show ONLY discovered non-main-story encounters
  const discoveredStories = SPECIAL_STORIES.filter(
    (story) => world.specialStories[story.id].discovered
  );
  const sideQuestSummaries = getDiscoveredSideQuestSummaries(world);
  const seasonalSummaries = getDiscoveredSeasonalEventSummaries(world);

  const { CRAFT, EMPIRE, WARMTH } = world.storyPhilosophy;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0d0604]/82 backdrop-blur-[2px] flex items-center justify-center p-3 md:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="game-panel w-[94vw] max-w-6xl max-h-[88vh] rounded-xl overflow-hidden flex flex-col text-[#F7EFE2]">
        {/* Header */}
        <header className="px-6 py-3.5 bg-gradient-to-b from-[#331f15] to-[#1d110c] border-b-2 border-[#b58942] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-[#e8c97a] bg-[#1a0f0a] flex items-center justify-center text-[#e8c97a] shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[#FFF6E5]">
                店长纪略 · 特殊店员羁绊与堂口见闻录
              </h2>
              <p className="text-xs text-[#C5AE92]">
                {world.mainStoryCompleted
                  ? '主线终章已圆满落幕 · 无尽模式将不再触发新剧情推进，此处仅供回顾档案与重温结局画卷'
                  : '主线满足条件将自动触发人物对话剧情；未邂逅的江湖奇遇严格保密'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {world.endingReport && (
              <button
                onClick={onOpenEnding}
                className="game-btn-gold inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                <Crown className="w-4 h-4" />
                重温命运终章结局
              </button>
            )}
            <button
              onClick={onClose}
              className="game-btn-wood inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              <X className="w-4 h-4" />
              返回厅堂
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-gradient-to-b from-[#1e120c]/95 to-[#140b07]/98">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 6 cols: Manager Dossier + Main Storyline & Philosophy */}
            <div className="lg:col-span-6 space-y-5">
              {/* Leader Dossier */}
              <section className="game-card p-4 rounded-xl flex items-start gap-4">
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
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-bold text-[#FFF6E5]">
                      {charDef.name}
                    </h3>
                    <span className="text-xs font-semibold" style={{ color: charDef.accentColor }}>
                      {charDef.title}
                    </span>
                  </div>
                  <p className="text-xs text-[#DFCDB6] leading-relaxed">{charDef.backstory}</p>
                  <p className="text-xs font-medium pt-0.5" style={{ color: charDef.accentColor }}>
                    绝技加成：{charDef.perkSummary}
                  </p>
                </div>
              </section>

              {/* Main Storyline Era Chapter */}
              <section className="game-card p-5 rounded-xl space-y-3.5 border-[#c9a45c]/70">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[#E8C97A]">
                      创业主线 · 第 {world.mainChapter}/{MAIN_CHAPTERS.length} 章
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#FFF6E5] mt-0.5">
                      {chapterDef.title}
                    </h3>
                  </div>
                  {world.mainStoryCompleted && (
                    <span className="text-xs font-bold text-[#6EE7B7]">主线已通关</span>
                  )}
                </div>

                {/* Philosophy Tendencies */}
                <div className="game-inset px-3.5 py-2.5 rounded-lg flex items-center justify-between gap-3 text-xs">
                  <span className="text-[#C5AE92]">经营理念倾向（决定终章结局）</span>
                  <div className="flex items-center gap-3 font-mono-num font-bold">
                    <span className="text-[#6EE7B7]">匠心 {CRAFT}</span>
                    <span className="text-[#FBBF24]">商道 {EMPIRE}</span>
                    <span className="text-[#F9A8D4]">烟火 {WARMTH}</span>
                  </div>
                </div>

                <p className="text-xs text-[#EFE2D0] leading-relaxed">
                  {world.mainStoryCompleted ? chapterDef.completionNarrative : chapterDef.narrative}
                </p>

                {!world.mainStoryCompleted && (
                  <>
                    <div className="game-inset p-3.5 rounded-lg space-y-2">
                      {chapterEval.objectives.map((obj) => (
                        <div key={obj.label} className="flex items-center justify-between text-xs gap-2">
                          <span
                            className={`flex items-center gap-1.5 ${
                              obj.done ? 'text-[#6EE7B7]' : 'text-[#F0E3CF]'
                            }`}
                          >
                            <Check
                              className={`w-3.5 h-3.5 shrink-0 ${
                                obj.done ? 'opacity-100' : 'opacity-25'
                              }`}
                            />
                            {obj.label}
                          </span>
                          <span className="font-mono-num text-[#C5AE92] shrink-0">
                            {obj.currentText}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-[#E8C97A]">
                      章节奖励：{chapterDef.rewardNote}
                    </div>

                    {canClaimChapter ? (
                      <button
                        onClick={onClaimChapter}
                        className="w-full py-2.5 rounded-lg text-xs font-bold game-btn-gold cursor-pointer"
                      >
                        目标已全部达成 · 立即开启本章立绘剧情演绎
                      </button>
                    ) : (
                      <div className="game-inset py-2 px-3 rounded-lg text-center text-[11px] text-[#B59876]">
                        达成上述全部阶段目标后，将自动触发本章人物立绘剧情对话
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>

            {/* Right 6 cols: Special Staff 5-Stage Storylines + Discovered Encounters */}
            <div className="lg:col-span-6 space-y-6">
              {/* Special Staff Bonds & Opening/Closing Quests */}
              <section className="space-y-3">
                <div className="flex items-baseline justify-between border-b border-[#593b25] pb-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#F9A8D4] flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      特殊店员羁绊与个人线（共 5 幕）
                    </h3>
                    <p className="text-xs text-[#C5AE92] mt-0.5">
                      {world.mainStoryCompleted
                        ? '终章已定格，此处永久收录已结缘伙伴的羁绊档案'
                        : '开店前/闭店后推进专属剧情与伴侣维护，决定各自未来归宿'}
                    </p>
                  </div>
                  {!world.mainStoryCompleted && (
                    <button
                      onClick={onOpenDormitory}
                      className="text-xs font-bold text-[#E8C97A] hover:text-[#FFF6E5] underline underline-offset-2 cursor-pointer whitespace-nowrap"
                    >
                      前往宿舍茶室互动 →
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {(() => {
                    const knownStaff = SPECIAL_STAFF_CATALOG.filter((sp) => {
                      const b = world.specialStaffBonds[sp.id];
                      return b.recruited || b.recruitmentStage > 0;
                    });
                    if (knownStaff.length === 0) {
                      return (
                        <div className="game-inset p-4 rounded-xl text-xs text-[#C5AE92] leading-relaxed">
                          尚未结识特殊传奇伙伴。请亲身前往「后场各房间」巡视并触发隐藏支线剧情，与志同道合之人结缘入队后，其个人线与好感羁绊将收录于此。
                        </div>
                      );
                    }
                    return knownStaff.map((sp) => {
                      const bond = world.specialStaffBonds[sp.id];
                      const questReady = availableQuests.includes(sp.id);
                      const nextQuest = sp.quests[bond.storyStage];
                      return (
                        <div
                          key={sp.id}
                          className="game-card p-3.5 rounded-xl flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display text-sm font-bold text-[#FFF6E5]">
                                {sp.name}
                              </span>
                              <span className="text-xs font-semibold" style={{ color: sp.color }}>
                                {sp.title}
                              </span>
                              <span className="text-[11px] text-[#C5AE92]">
                                ({STAFF_ROLE_META[sp.role].title})
                              </span>
                            </div>
                            {bond.recruited ? (
                              <div className="flex items-center gap-3 text-[11px] font-mono-num text-[#DFCDB6] flex-wrap">
                                <span className="text-[#F9A8D4]">好感 {bond.affection}/100</span>
                                <span className="text-[#E8C97A]">剧情 {bond.storyStage}/5 幕</span>
                                <span className="text-[#81E6D9]">{RELATION_TEXT[bond.relationship]}</span>
                                {(bond.relationship === 'DATING' || bond.relationship === 'MARRIED') && (
                                  <span className="text-[#6EE7B7]">
                                    亲密 {Math.round(bond.partnerBond)}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] text-[#FCD34D]">
                                {world.mainStoryCompleted
                                  ? '招募支线进展 1/2（终章已定格）'
                                  : '招募支线进展 1/2 · 请于明日开店前或闭店后重访后场房间邀其正式入队！'}
                              </div>
                            )}
                          </div>

                          {!world.mainStoryCompleted && bond.recruited && questReady && nextQuest && (
                            <button
                              onClick={() => onTriggerSpecialQuest(sp.id)}
                              className="game-btn-gold inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer shrink-0 whitespace-nowrap"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              开启第{bond.storyStage + 1}幕
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </section>

              {/* Discovered Encounters Only (Zero Spoilers!) */}
              <section className="space-y-3">
                <div className="flex items-baseline justify-between border-b border-[#593b25] pb-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#FFF6E5] flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#E8C97A]" />
                      堂口见闻录 · 已发现奇遇
                    </h3>
                    <p className="text-xs text-[#C5AE92] mt-0.5">
                      未邂逅的江湖奇人保持隐秘，仅在亲自发现后记入此卷
                    </p>
                  </div>
                  {discoveredStories.length > 0 && (
                    <span className="font-mono-num text-xs font-bold text-[#E8C97A]">
                      已记 {discoveredStories.length} 卷
                    </span>
                  )}
                </div>

                {discoveredStories.length === 0 ? (
                  <div className="game-inset p-5 rounded-xl text-xs text-[#C5AE92] leading-relaxed">
                    目前尚无奇遇记录。请用心经营每日客流与合理设置店面类型档位，留意店门口偶尔现身的气度不凡之客——与他们结缘后，线索与进展将自动收入本卷。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {discoveredStories.map((story) => {
                      const prog = world.specialStories[story.id];
                      return (
                        <div key={story.id} className="game-card p-4 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-baseline gap-2">
                              <span className="font-display text-base font-bold text-[#FFF6E5]">
                                {story.customerName}
                              </span>
                              <span className="text-xs font-semibold" style={{ color: story.color }}>
                                {story.roleTitle}
                              </span>
                            </div>
                            <span
                              className={`text-xs font-mono-num font-bold ${
                                prog.completed ? 'text-[#6EE7B7]' : 'text-[#E8C97A]'
                              }`}
                            >
                              {prog.completed ? '已完结' : '追踪中'}
                            </span>
                          </div>

                          <div className="text-xs text-[#DFCDB6] space-y-1">
                            <div
                              className={
                                prog.stage >= 1 ? 'text-[#6EE7B7] line-through opacity-80' : ''
                              }
                            >
                              · {story.stage1Goal}
                            </div>
                            {prog.stage >= 1 && (
                              <div
                                className={
                                  prog.stage >= 2 ? 'text-[#6EE7B7] line-through opacity-80' : ''
                                }
                              >
                                · {story.stage2Goal}
                              </div>
                            )}
                          </div>

                          {prog.completed ? (
                            <div className="pt-2 border-t border-[#593b25] text-xs text-[#F7EFE2]">
                              <span className="font-semibold text-[#E8C97A]">已获回馈：</span>
                              <span>{story.rewardTitle}</span>
                            </div>
                          ) : (
                            <div className="pt-2 border-t border-[#593b25] text-xs text-[#B59876]">
                              后续机缘：待达成当前线索后揭晓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Branching In-Service Incident Side-Quests Archive */}
              <section className="space-y-3 pt-2">
                <div className="flex items-baseline justify-between border-b border-[#593b25] pb-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#FFF6E5] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#38BDF8]" />
                      营业突发支线档案
                    </h3>
                    <p className="text-xs text-[#C5AE92] mt-0.5">
                      营业中途突发支线的不同处理抉择，将导向截然不同的后续剧情与分支结局
                    </p>
                  </div>
                  {sideQuestSummaries.length > 0 && (
                    <span className="font-mono-num text-xs font-bold text-[#7DD3FC]">
                      已触发 {sideQuestSummaries.length} 条
                    </span>
                  )}
                </div>

                {sideQuestSummaries.length === 0 ? (
                  <div className="game-inset p-4 rounded-xl text-xs text-[#C5AE92] leading-relaxed">
                    尚未触发营业支线事件。开店营业过程中请留意不定时登门的暗访记者、避雨老渔民或神秘访客——你的每一次危机处理都会开启专属分支后续！
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sideQuestSummaries.map((sq) => (
                      <div key={sq.id} className="game-card p-3.5 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="font-display text-sm font-bold"
                            style={{ color: sq.accentColor }}
                          >
                            {sq.title}
                          </span>
                          <span
                            className={`text-[11px] font-mono-num font-bold ${
                              sq.completed ? 'text-[#6EE7B7]' : 'text-[#F6DA8D]'
                            }`}
                          >
                            {sq.stageLabel}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[#FFF6E5]">
                          当前走向：{sq.branchLabel}
                        </div>
                        <p className="text-xs text-[#DFCDB6] leading-relaxed">{sq.summaryText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Four-Season Limited Events Archive */}
              <section className="space-y-3 pt-2">
                <div className="flex items-baseline justify-between border-b border-[#593b25] pb-2">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#FFF6E5] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#F9A8D4]" />
                      四季风物志 · 季节限定事件
                    </h3>
                    <p className="text-xs text-[#C5AE92] mt-0.5">
                      春夏秋冬各藏两段海港应季见闻，随季节流转在营业中触发
                    </p>
                  </div>
                  <span className="font-mono-num text-xs font-bold text-[#F9A8D4]">
                    已收录 {seasonalSummaries.length}/8 卷
                  </span>
                </div>

                {seasonalSummaries.length === 0 ? (
                  <div className="game-inset p-4 rounded-xl text-xs text-[#C5AE92] leading-relaxed">
                    尚未收录季节限定见闻。随春夏秋冬四季更迭正常营业，将陆续邂逅春日赏樱游船、盛夏热浪与伏季休渔、金秋蟹季灯会、寒冬围炉与岁末尾牙等专属事件！
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {seasonalSummaries.map((ev) => (
                      <div key={ev.id} className="game-card p-3.5 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="font-display text-sm font-bold"
                            style={{ color: ev.accentColor }}
                          >
                            【{ev.seasonLabel}】{ev.title}
                          </span>
                          <span className="text-[11px] font-mono-num font-bold text-[#6EE7B7] shrink-0">
                            {ev.outcomeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-[#DFCDB6] leading-relaxed">{ev.summaryText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
