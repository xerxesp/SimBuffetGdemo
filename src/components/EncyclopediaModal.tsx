import { useState } from 'react';
import { Award, BookOpen, CheckCircle2, Lock, Sparkles, Trophy, Utensils, X } from 'lucide-react';
import { BROTH_CATALOG, SEAFOOD_CATALOG } from '../data/gameConfig';
import { HIDDEN_SYNERGIES } from '../data/policyAndTechConfig';
import { SPECIAL_STORIES } from '../data/storyConfig';
import { ACHIEVEMENTS_CATALOG } from '../data/tycoonSystemsConfig';
import { PersistentEncyclopedia } from '../types/game';
import { BrothSvgIcon, SeafoodSvgIcon } from './VintageIcons';

type EncyclopediaTab = 'ACHIEVEMENTS' | 'CATALOG' | 'LORE';

interface EncyclopediaModalProps {
  encyclopedia: PersistentEncyclopedia;
  onClose: () => void;
}

export function EncyclopediaModal({ encyclopedia, onClose }: EncyclopediaModalProps) {
  const [tab, setTab] = useState<EncyclopediaTab>('ACHIEVEMENTS');

  const unlockedAchCount = encyclopedia.unlockedAchievementIds.length;
  const totalAchCount = ACHIEVEMENTS_CATALOG.length;

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0604]/82 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="game-panel w-full max-w-4xl rounded-xl p-5 md:p-6 text-[#F7EFE2] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[#593b25]">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-[#E8C97A]" />
            <div>
              <h2 className="font-display text-xl font-bold text-[#FFF6E5]">
                跨周目图鉴与成就馆
              </h2>
              <p className="text-xs text-[#C5AE92]">
                跨存档永久累积 · 成就 {unlockedAchCount}/{totalAchCount} · 菜品{' '}
                {encyclopedia.discoveredSeafoodIds.length}/{SEAFOOD_CATALOG.length} · 锅底{' '}
                {encyclopedia.discoveredBrothIds.length}/{BROTH_CATALOG.length} · 最高排名第{' '}
                {encyclopedia.highestRank} 名
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="game-btn-wood p-1.5 rounded cursor-pointer"
            aria-label="关闭图鉴与成就馆"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5">
          <div className="game-inset rounded-lg px-3 py-2">
            <div className="text-[11px] text-[#C5AE92]">勋章解锁率</div>
            <div className="font-mono-num text-sm font-bold text-[#F6DA8D]">
              {unlockedAchCount} / {totalAchCount}
            </div>
          </div>
          <div className="game-inset rounded-lg px-3 py-2">
            <div className="text-[11px] text-[#C5AE92]">历史最高全城排名</div>
            <div className="font-mono-num text-sm font-bold text-[#86EFAC]">
              第 {encyclopedia.highestRank} 名
            </div>
          </div>
          <div className="game-inset rounded-lg px-3 py-2">
            <div className="text-[11px] text-[#C5AE92]">历史最高单店现金</div>
            <div className="font-mono-num text-sm font-bold text-[#FFF6E5]">
              ¥{encyclopedia.maxCashHeld.toLocaleString()}
            </div>
          </div>
          <div className="game-inset rounded-lg px-3 py-2">
            <div className="text-[11px] text-[#C5AE92]">已见证终章结局</div>
            <div className="font-mono-num text-sm font-bold text-[#F472B6]">
              {encyclopedia.unlockedEndings.length} 个
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mt-3.5 pb-3 border-b border-[#4a2f1d]">
          <button
            onClick={() => setTab('ACHIEVEMENTS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
              tab === 'ACHIEVEMENTS' ? 'game-btn-gold' : 'game-btn-wood text-[#DFCDB6]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            成就勋章 ({unlockedAchCount}/{totalAchCount})
          </button>
          <button
            onClick={() => setTab('CATALOG')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
              tab === 'CATALOG' ? 'game-btn-gold' : 'game-btn-wood text-[#DFCDB6]'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            菜品与锅底图鉴
          </button>
          <button
            onClick={() => setTab('LORE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
              tab === 'LORE' ? 'game-btn-gold' : 'game-btn-wood text-[#DFCDB6]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            隐藏流派 · 奇遇与结局
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 overflow-y-auto pr-1 flex-1 space-y-4">
          {tab === 'ACHIEVEMENTS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ACHIEVEMENTS_CATALOG.map((ach) => {
                const unlocked = encyclopedia.unlockedAchievementIds.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`rounded-lg p-3.5 border ${
                      unlocked
                        ? 'game-card border-[#b58942]'
                        : 'bg-[#170d09] border-[#3d2518] opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="font-display font-bold text-sm"
                        style={{ color: unlocked ? ach.accentColor : '#8C7058' }}
                      >
                        {ach.title}
                      </span>
                      {unlocked ? (
                        <CheckCircle2 className="w-4 h-4 text-[#6EE7B7] shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-[#6B503B] shrink-0" />
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-[#C5AE92] leading-relaxed">
                      {ach.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'CATALOG' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display font-bold text-sm text-[#E8C97A] mb-2">
                  海鲜与配菜全图鉴（{encyclopedia.discoveredSeafoodIds.length}/{SEAFOOD_CATALOG.length}）
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {SEAFOOD_CATALOG.map((item) => {
                    const seen = encyclopedia.discoveredSeafoodIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg p-3 border text-xs flex items-start gap-2.5 ${
                          seen
                            ? 'game-card border-[#6b472b]'
                            : 'bg-[#160c08] border-[#362014] opacity-60'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                            seen
                              ? 'bg-[#1c110b] border-[#8c633a]'
                              : 'bg-[#120a07] border-[#3b2518] grayscale opacity-45'
                          }`}
                        >
                          <SeafoodSvgIcon itemId={item.id} zoneId={item.zone} className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-display font-bold text-[#FFF6E5] truncate">
                            {seen ? item.name : '？？？'}
                          </div>
                          <div className="text-[11px] text-[#C5AE92] mt-1 leading-snug">
                            {seen
                              ? `餐位溢价 +¥${item.ticketBonus} · 上限 ${item.maxStock}`
                              : '待通过门店发展树或奇遇解锁'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display font-bold text-sm text-[#E8C97A] mb-2">
                  秘制锅底全图鉴（{encyclopedia.discoveredBrothIds.length}/{BROTH_CATALOG.length}）
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {BROTH_CATALOG.map((b) => {
                    const seen = encyclopedia.discoveredBrothIds.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        className={`rounded-lg p-3 border text-xs flex items-start gap-2.5 ${
                          seen
                            ? 'game-card border-[#6b472b]'
                            : 'bg-[#160c08] border-[#362014] opacity-60'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                            seen
                              ? 'bg-[#1c110b] border-[#8c633a]'
                              : 'bg-[#120a07] border-[#3b2518] grayscale opacity-45'
                          }`}
                        >
                          <BrothSvgIcon
                            brothId={b.id}
                            color={b.color}
                            secondaryColor={b.secondaryColor}
                            className="w-7 h-7"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display font-bold text-[#FFF6E5] truncate">
                              {seen ? b.name : '未解锁锅底'}
                            </span>
                            {seen && (
                              <span className="font-mono-num text-[#F6DA8D] shrink-0">
                                +¥{b.priceBonus}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#C5AE92] mt-1 leading-snug">
                            {seen ? b.description : '需在发展树研学解锁'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'LORE' && (
            <div className="space-y-4">
              {/* Hidden Synergies */}
              <div>
                <h3 className="font-display font-bold text-sm text-[#E8C97A] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  隐藏菜单流派组合（{encyclopedia.discoveredSynergyIds.length}/{HIDDEN_SYNERGIES.length}）
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {HIDDEN_SYNERGIES.map((syn) => {
                    const seen = encyclopedia.discoveredSynergyIds.includes(syn.id);
                    return (
                      <div
                        key={syn.id}
                        className={`rounded-lg p-3 border text-xs ${
                          seen
                            ? 'game-card border-[#b58942]'
                            : 'bg-[#160c08] border-[#362014] opacity-65'
                        }`}
                      >
                        <div className="font-display font-bold text-[#F6DA8D]">
                          {seen ? syn.name : '未知隐藏菜单流派'}
                        </div>
                        <p className="text-[11px] text-[#C5AE92] mt-1">
                          {seen
                            ? `${syn.effectText}（${syn.description}）`
                            : '在门店配置中心尝试不同档口菜品与秘制锅底卡牌组合以发掘隐藏共鸣'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Special Customers */}
              <div>
                <h3 className="font-display font-bold text-sm text-[#E8C97A] mb-2">
                  江湖奇遇贵客档案（{encyclopedia.discoveredSpecialCustomerIds.length}/{SPECIAL_STORIES.length}）
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {SPECIAL_STORIES.map((st) => {
                    const seen = encyclopedia.discoveredSpecialCustomerIds.includes(st.id);
                    return (
                      <div
                        key={st.id}
                        className={`rounded-lg p-3 border text-xs ${
                          seen
                            ? 'game-card border-[#6b472b]'
                            : 'bg-[#160c08] border-[#362014] opacity-65'
                        }`}
                      >
                        <div className="font-display font-bold" style={{ color: seen ? st.color : '#8C7058' }}>
                          {seen ? `${st.customerName} · ${st.roleTitle}` : '尚未结识的神秘食客'}
                        </div>
                        <p className="text-[11px] text-[#C5AE92] mt-1">
                          {seen
                            ? `专属机缘：${st.rewardTitle} — ${st.rewardDescription}`
                            : `来访餐位区间：¥${st.minTicketPrice} ~ ¥${st.maxTicketPrice}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Unlocked Endings */}
              <div>
                <h3 className="font-display font-bold text-sm text-[#E8C97A] mb-2">
                  已见证的命运终章结局
                </h3>
                {encyclopedia.unlockedEndings.length === 0 ? (
                  <div className="game-inset rounded-lg p-3 text-xs text-[#9C8168]">
                    尚未通关主线终章。达成第五章终极目标并做出最终抉择后，你的传奇结局将永久镌刻于此！
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {encyclopedia.unlockedEndings.map((title) => (
                      <div
                        key={title}
                        className="px-3.5 py-2 rounded-lg bg-[#2a1911] border border-[#E8C97A] text-xs font-display font-bold text-[#F6DA8D]"
                      >
                        ★ {title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
