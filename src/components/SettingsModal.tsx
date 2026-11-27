import { Monitor, Music, Sliders, Volume2, VolumeX, X } from 'lucide-react';
import {
  AspectRatioMode,
  BGM_TRACK_META,
  BgmMode,
  BgmTrackId,
  GameSettings,
  ResolutionPreset,
} from '../types/settings';
import { sound } from '../utils/sound';

interface SettingsModalProps {
  settings: GameSettings;
  activeBgmTrack: BgmTrackId;
  actualCanvasSize: { width: number; height: number } | null;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

const ASPECT_OPTIONS: Array<{ value: AspectRatioMode; label: string; desc: string }> = [
  { value: 'auto', label: '100% 全屏铺满', desc: '推荐 · 贴合屏幕无黑边' },
  { value: '16:9', label: '16:9 宽屏', desc: '固定宽屏视野' },
  { value: '21:9', label: '21:9 超宽屏', desc: '固定超宽视野' },
  { value: '3:2', label: '3:2 经典', desc: '固定经典比例' },
];

const RESOLUTION_OPTIONS: Array<{ value: ResolutionPreset; label: string; desc: string }> = [
  { value: 'auto', label: '自适应高清', desc: '按屏幕最高至 2K' },
  { value: '720p', label: '1280×720', desc: 'HD 轻量化流畅' },
  { value: '1080p', label: '1920×1080', desc: 'FHD 全高清' },
  { value: '1440p', label: '2560×1440', desc: '2K 极致锐利' },
];

const BGM_MODE_OPTIONS: Array<{ value: BgmMode; label: string; desc: string }> = [
  { value: 'auto', label: '随阶段自动切换', desc: '序曲/筹备/营业/高峰/打烊' },
  { value: 'TITLE', label: BGM_TRACK_META.TITLE.title, desc: BGM_TRACK_META.TITLE.subtitle },
  { value: 'PREP', label: BGM_TRACK_META.PREP.title, desc: BGM_TRACK_META.PREP.subtitle },
  { value: 'SERVICE', label: BGM_TRACK_META.SERVICE.title, desc: BGM_TRACK_META.SERVICE.subtitle },
  { value: 'RUSH', label: BGM_TRACK_META.RUSH.title, desc: BGM_TRACK_META.RUSH.subtitle },
  { value: 'CLOSING', label: BGM_TRACK_META.CLOSING.title, desc: BGM_TRACK_META.CLOSING.subtitle },
];

export function SettingsModal({
  settings,
  activeBgmTrack,
  actualCanvasSize,
  onChange,
  onClose,
}: SettingsModalProps) {
  const update = (patch: Partial<GameSettings>) => {
    const next = { ...settings, ...patch };
    onChange(next);
  };

  const nowPlaying = BGM_TRACK_META[activeBgmTrack];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0d0604]/82 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="game-panel w-full max-w-2xl max-h-[90vh] rounded-xl overflow-hidden text-[#F7EFE2] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-b from-[#331f15] to-[#1d110c] border-b-2 border-[#b58942] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#E8C97A]" />
            <h2 className="font-display text-2xl font-bold text-[#FFF6E5]">游戏设置</h2>
          </div>
          <button
            onClick={onClose}
            className="game-btn-wood p-1.5 rounded cursor-pointer"
            aria-label="关闭设置"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* 1. Audio Mixer (Master + BGM + SFX) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#FFF6E5]">
                {settings.muted || settings.volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-[#F87171]" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#E8C97A]" />
                )}
                <span>声音与混音控制</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => update({ muted: !settings.muted })}
                  className="game-btn-wood px-2.5 py-1 rounded text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  {settings.muted ? '取消静音' : '全部静音'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (settings.muted) update({ muted: false });
                    sound.playOpenShop();
                  }}
                  className="game-btn-wood px-2.5 py-1 rounded text-xs font-semibold text-[#E8C97A] cursor-pointer whitespace-nowrap"
                >
                  试听开店音效
                </button>
              </div>
            </div>

            <div className="game-inset px-4 py-3.5 rounded-lg space-y-3">
              {/* Master */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#EFE2D0] w-16 shrink-0">主音量</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.muted ? 0 : settings.volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    update({ volume: v, muted: v === 0 });
                  }}
                  className="flex-1 accent-[#E5BF69] cursor-pointer h-2"
                />
                <span className="font-mono-num text-xs font-bold text-[#E8C97A] w-10 text-right">
                  {settings.muted ? '静音' : `${settings.volume}%`}
                </span>
              </div>

              {/* BGM */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#C5AE92] w-16 shrink-0">背景音乐</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.bgmMuted ? 0 : settings.bgmVolume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    update({ bgmVolume: v, bgmMuted: v === 0 });
                  }}
                  className="flex-1 accent-[#81E6D9] cursor-pointer h-2"
                />
                <span className="font-mono-num text-xs font-semibold text-[#81E6D9] w-10 text-right">
                  {settings.bgmMuted ? '关闭' : `${settings.bgmVolume}%`}
                </span>
              </div>

              {/* SFX */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#C5AE92] w-16 shrink-0">互动音效</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={settings.sfxVolume}
                  onChange={(e) => {
                    update({ sfxVolume: Number(e.target.value) });
                  }}
                  className="flex-1 accent-[#6EE7B7] cursor-pointer h-2"
                />
                <span className="font-mono-num text-xs font-semibold text-[#6EE7B7] w-10 text-right">
                  {settings.sfxVolume}%
                </span>
              </div>
            </div>
          </section>

          {/* 2. Background Music Track Jukebox */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#FFF6E5]">
                <Music className="w-4 h-4 text-[#E8C97A]" />
                <span>背景音乐曲目（6 首原声动态配乐）</span>
              </div>
              <span className="text-xs text-[#81E6D9] whitespace-nowrap">
                {settings.muted || settings.bgmMuted
                  ? '音乐已暂停'
                  : `正在演奏：${nowPlaying.title}`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BGM_MODE_OPTIONS.map((opt) => {
                const active = settings.bgmMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      sound.playTabSwitch();
                      update({
                        bgmMode: opt.value,
                        bgmMuted: false,
                        muted: false,
                      });
                    }}
                    className={`p-2.5 rounded-lg text-left cursor-pointer transition-all ${
                      active
                        ? 'bg-[#422a1d] border-2 border-[#E8C97A] text-[#FFF6E5]'
                        : 'game-btn-wood text-[#DFCDB6]'
                    }`}
                  >
                    <div className="text-xs font-bold whitespace-nowrap truncate">{opt.label}</div>
                    <div className="text-[11px] text-[#B59876] mt-0.5 truncate">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Aspect Ratio */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[#FFF6E5]">
                <Monitor className="w-4 h-4 text-[#E8C97A]" />
                <span>画面比例（支持宽屏延展）</span>
              </div>
              <span className="text-xs text-[#C5AE92]">两侧厅堂场景无缝延展</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ASPECT_OPTIONS.map((opt) => {
                const active = settings.aspectRatio === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      update({ aspectRatio: opt.value });
                    }}
                    className={`p-2.5 rounded-lg text-left cursor-pointer transition-all ${
                      active
                        ? 'bg-[#422a1d] border-2 border-[#E8C97A] text-[#FFF6E5]'
                        : 'game-btn-wood text-[#DFCDB6]'
                    }`}
                  >
                    <div className="text-xs font-bold whitespace-nowrap">{opt.label}</div>
                    <div className="text-[11px] text-[#B59876] mt-0.5 truncate">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. Render Resolution (up to 2K) */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#FFF6E5]">
                渲染分辨率（最高支持 2K）
              </span>
              {actualCanvasSize && (
                <span className="font-mono-num text-xs text-[#6EE7B7]">
                  当前输出 {actualCanvasSize.width} × {actualCanvasSize.height}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RESOLUTION_OPTIONS.map((opt) => {
                const active = settings.resolution === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      update({ resolution: opt.value });
                    }}
                    className={`p-2.5 rounded-lg text-left cursor-pointer transition-all ${
                      active
                        ? 'bg-[#422a1d] border-2 border-[#E8C97A] text-[#FFF6E5]'
                        : 'game-btn-wood text-[#DFCDB6]'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono-num whitespace-nowrap">
                      {opt.label}
                    </div>
                    <div className="text-[11px] text-[#B59876] mt-0.5 truncate">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="px-6 py-4 bg-[#160c08] border-t border-[#593b25] flex items-center justify-between shrink-0">
          <span className="text-xs text-[#B59876]">设置实时生效并自动保存</span>
          <button
            onClick={onClose}
            className="game-btn-primary px-6 py-2 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            确定返回
          </button>
        </div>
      </div>
    </div>
  );
}
