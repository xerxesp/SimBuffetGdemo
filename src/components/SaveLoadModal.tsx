import { useState } from 'react';
import { Clock, Download, HardDrive, Save, Trash2, Trophy, X } from 'lucide-react';
import { getSeasonDef } from '../data/gameConfig';
import { getCharacterDef } from '../data/storyConfig';
import { SaveSlotId, SaveSlotMeta } from '../types/game';

interface SaveLoadModalProps {
  mode: 'IN_GAME' | 'MAIN_MENU';
  slots: Record<SaveSlotId, SaveSlotMeta | null>;
  onSaveSlot?: (slotId: SaveSlotId) => void;
  onLoadSlot: (slotId: SaveSlotId) => void;
  onDeleteSlot: (slotId: SaveSlotId) => void;
  onClose: () => void;
}

const SLOT_ORDER: Array<{ id: SaveSlotId; label: string; subtitle: string; isAuto: boolean }> = [
  {
    id: 'auto',
    label: '自动存档',
    subtitle: '每日开店筹备与闭店收尾时自动覆盖记录',
    isAuto: true,
  },
  {
    id: 'slot_1',
    label: '手动存档槽 1',
    subtitle: '自由留存关键经营节点或结局分支',
    isAuto: false,
  },
  {
    id: 'slot_2',
    label: '手动存档槽 2',
    subtitle: '可用于尝试不同店面类型或伙伴路线',
    isAuto: false,
  },
  {
    id: 'slot_3',
    label: '手动存档槽 3',
    subtitle: '长期经营备份档案',
    isAuto: false,
  },
];

export function SaveLoadModal({
  mode,
  slots,
  onSaveSlot,
  onLoadSlot,
  onDeleteSlot,
  onClose,
}: SaveLoadModalProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<SaveSlotId | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = (slotId: SaveSlotId) => {
    if (!onSaveSlot) return;
    onSaveSlot(slotId);
    setFeedback(`已成功保存当前经营进度至「${SLOT_ORDER.find((s) => s.id === slotId)?.label}」！`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0604]/82 backdrop-blur-[2px] flex items-center justify-center p-2.5 sm:p-4">
      <div className="game-panel w-full max-w-2xl rounded-xl p-4 sm:p-6 text-[#F7EFE2] flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-3.5 sm:pb-4 border-b border-[#593b25]">
          <div className="flex items-center gap-2.5 min-w-0">
            <HardDrive className="w-5 h-5 text-[#E8C97A] shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#FFF6E5] truncate">
                {mode === 'IN_GAME' ? '存档与读档管理' : '读取本地经营档案'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#C5AE92]">
                档案存储于当前设备本地，支持自动存档与 3 个手动槽位随时切换
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="game-btn-wood min-w-[40px] min-h-[40px] p-2 rounded-lg flex items-center justify-center cursor-pointer shrink-0"
            aria-label="关闭存档管理"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedback && (
          <div className="mt-3 px-3.5 py-2 rounded border border-[#2f7a57] bg-[#143024] text-xs text-[#86EFAC] font-medium">
            {feedback}
          </div>
        )}

        {/* Slot List */}
        <div className="mt-4 space-y-3 overflow-y-auto touch-scroll pr-1 flex-1">
          {SLOT_ORDER.map((slot) => {
            const meta = slots[slot.id];
            const charDef = meta ? getCharacterDef(meta.characterId) : null;
            const seasonDef = meta ? getSeasonDef(meta.season) : null;

            return (
              <div
                key={slot.id}
                className={`game-card rounded-lg p-4 border ${
                  slot.isAuto ? 'border-[#b58942]/80' : 'border-[#593b25]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {charDef ? (
                      <img
                        src={charDef.portraitUrl}
                        alt={charDef.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded object-cover object-top border border-[#b58942] shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded bg-[#180e0a] border border-[#4a2f1d] flex items-center justify-center text-[#7d5f47] shrink-0">
                        <Save className="w-5 h-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-[#FFF6E5]">
                          {slot.label}
                        </span>
                        {meta && (
                          <span className="font-mono-num text-[11px] text-[#C5AE92] inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {meta.savedAt}
                          </span>
                        )}
                      </div>

                      {meta && charDef && seasonDef ? (
                        <div className="mt-1 space-y-0.5">
                          <div className="text-xs text-[#E8C97A] font-medium">
                            {charDef.name} · 第{meta.year}年{seasonDef.shortName}季 · 第 {meta.day} 天 · Lv.{meta.shopLevel}（{meta.regimeName}）
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono-num text-[#DFCDB6]">
                            <span>资金 ¥{meta.cash.toLocaleString()}</span>
                            <span>口碑 {meta.reputation}</span>
                            <span className="text-[#F6DA8D] inline-flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              全城第 {meta.cityRank} 名
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-[#9C8168]">
                          空存档槽 · {slot.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {mode === 'IN_GAME' && !slot.isAuto && onSaveSlot && (
                      <button
                        onClick={() => handleSave(slot.id)}
                        className="game-btn-gold px-3 py-1.5 rounded text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {meta ? '覆盖保存' : '保存到此'}
                      </button>
                    )}

                    {meta && (
                      <button
                        onClick={() => onLoadSlot(slot.id)}
                        className="game-btn-wood px-3 py-1.5 rounded text-xs font-semibold text-[#86EFAC] inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        读取
                      </button>
                    )}

                    {meta && (
                      confirmDeleteId === slot.id ? (
                        <button
                          onClick={() => {
                            onDeleteSlot(slot.id);
                            setConfirmDeleteId(null);
                            setFeedback(`已删除「${slot.label}」。`);
                          }}
                          className="px-2.5 py-1.5 rounded text-xs font-bold bg-[#7f1d1d] border border-[#f87171] text-[#FEE2E2] cursor-pointer"
                        >
                          确认删除
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(slot.id)}
                          className="game-btn-wood p-1.5 rounded text-[#C5AE92] hover:text-[#FCA5A5] cursor-pointer"
                          title="删除此存档"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 mt-4 border-t border-[#593b25] flex justify-end">
          <button
            onClick={onClose}
            className="game-btn-wood px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
