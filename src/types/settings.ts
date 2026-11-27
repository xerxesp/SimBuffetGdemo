export type AspectRatioMode = 'auto' | '16:9' | '21:9' | '3:2';

export type ResolutionPreset = 'auto' | '720p' | '1080p' | '1440p';

export type BgmTrackId = 'TITLE' | 'PREP' | 'SERVICE' | 'RUSH' | 'CLOSING' | 'GAME_OVER';

export type BgmMode = 'auto' | 'TITLE' | 'PREP' | 'SERVICE' | 'RUSH' | 'CLOSING';

export const BGM_TRACK_META: Record<
  BgmTrackId,
  { title: string; subtitle: string }
> = {
  TITLE: { title: '海畔灯火', subtitle: '潮鲜序曲 · 悠远港湾' },
  PREP: { title: '晨市备鲜', subtitle: '雅集小调 · 筹备轻韵' },
  SERVICE: { title: '沸鼎欢歌', subtitle: '午市生财 · 欢快堂音' },
  RUSH: { title: '潮涌八方', subtitle: '高峰狂想 · 鼓点疾奏' },
  CLOSING: { title: '暮潮收炉', subtitle: '夜港晚风 · 温润收尾' },
  GAME_OVER: { title: '灯熄潮退', subtitle: '歇业余韵 · 静夜独白' },
};

export interface GameSettings {
  volume: number; // Master volume 0..100
  bgmVolume: number; // Background music volume 0..100
  sfxVolume: number; // Sound effects volume 0..100
  muted: boolean;
  bgmMuted: boolean;
  bgmMode: BgmMode;
  aspectRatio: AspectRatioMode;
  resolution: ResolutionPreset;
}

export const DEFAULT_SETTINGS: GameSettings = {
  volume: 78,
  bgmVolume: 65,
  sfxVolume: 85,
  muted: false,
  bgmMuted: false,
  bgmMode: 'auto',
  aspectRatio: 'auto',
  resolution: 'auto',
};

const SETTINGS_STORAGE_KEY = 'chaoxian_hotpot_settings_v2';
const LEGACY_SETTINGS_KEY = 'chaoxian_hotpot_settings_v1';

const VALID_BGM_MODES: BgmMode[] = ['auto', 'TITLE', 'PREP', 'SERVICE', 'RUSH', 'CLOSING'];

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        volume:
          typeof parsed.volume === 'number'
            ? Math.max(0, Math.min(100, Math.round(parsed.volume)))
            : DEFAULT_SETTINGS.volume,
        bgmVolume:
          typeof parsed.bgmVolume === 'number'
            ? Math.max(0, Math.min(100, Math.round(parsed.bgmVolume)))
            : DEFAULT_SETTINGS.bgmVolume,
        sfxVolume:
          typeof parsed.sfxVolume === 'number'
            ? Math.max(0, Math.min(100, Math.round(parsed.sfxVolume)))
            : DEFAULT_SETTINGS.sfxVolume,
        muted: Boolean(parsed.muted),
        bgmMuted: Boolean(parsed.bgmMuted),
        bgmMode: VALID_BGM_MODES.includes(parsed.bgmMode)
          ? parsed.bgmMode
          : DEFAULT_SETTINGS.bgmMode,
        aspectRatio: ['auto', '16:9', '21:9', '3:2'].includes(parsed.aspectRatio)
          ? parsed.aspectRatio
          : DEFAULT_SETTINGS.aspectRatio,
        resolution: ['auto', '720p', '1080p', '1440p'].includes(parsed.resolution)
          ? parsed.resolution
          : DEFAULT_SETTINGS.resolution,
      };
    }
    const legacyRaw = localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      return {
        ...DEFAULT_SETTINGS,
        volume:
          typeof parsed.volume === 'number'
            ? Math.max(0, Math.min(100, Math.round(parsed.volume)))
            : DEFAULT_SETTINGS.volume,
        bgmVolume:
          typeof parsed.bgmVolume === 'number'
            ? Math.max(0, Math.min(100, Math.round(parsed.bgmVolume)))
            : DEFAULT_SETTINGS.bgmVolume,
        sfxVolume:
          typeof parsed.sfxVolume === 'number'
            ? Math.max(0, Math.min(100, Math.round(parsed.sfxVolume)))
            : DEFAULT_SETTINGS.sfxVolume,
        muted: Boolean(parsed.muted),
        bgmMuted: Boolean(parsed.bgmMuted),
        bgmMode: VALID_BGM_MODES.includes(parsed.bgmMode)
          ? parsed.bgmMode
          : DEFAULT_SETTINGS.bgmMode,
        aspectRatio: 'auto',
        resolution: ['auto', '720p', '1080p', '1440p'].includes(parsed.resolution)
          ? parsed.resolution
          : DEFAULT_SETTINGS.resolution,
      };
    }
  } catch {
    // ignore storage errors
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: GameSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export const MAX_2K_WIDTH = 2560;
export const MAX_2K_HEIGHT = 1440;

export function getAspectRatioNumber(mode: AspectRatioMode): number | null {
  switch (mode) {
    case '16:9':
      return 16 / 9;
    case '21:9':
      return 21 / 9;
    case '3:2':
      return 3 / 2;
    case 'auto':
      return null;
  }
}

export function computeCanvasBackingSize(
  cssWidth: number,
  cssHeight: number,
  settings: GameSettings
): { width: number; height: number } {
  const safeCssW = Math.max(320, cssWidth);
  const safeCssH = Math.max(200, cssHeight);
  const ratio = getAspectRatioNumber(settings.aspectRatio) ?? safeCssW / safeCssH;

  if (settings.resolution === 'auto') {
    const dpr = Math.max(window.devicePixelRatio || 1, 1.5);
    let targetW = Math.round(safeCssW * dpr);
    let targetH = Math.round(targetW / ratio);

    if (targetW > MAX_2K_WIDTH) {
      targetW = MAX_2K_WIDTH;
      targetH = Math.round(targetW / ratio);
    }
    if (targetH > MAX_2K_HEIGHT) {
      targetH = MAX_2K_HEIGHT;
      targetW = Math.round(targetH * ratio);
    }
    return {
      width: Math.max(640, targetW),
      height: Math.max(360, targetH),
    };
  }

  const presetWidth =
    settings.resolution === '720p' ? 1280 : settings.resolution === '1080p' ? 1920 : 2560;
  let targetW = presetWidth;
  let targetH = Math.round(targetW / ratio);
  if (targetH > MAX_2K_HEIGHT) {
    targetH = MAX_2K_HEIGHT;
    targetW = Math.round(targetH * ratio);
  }
  return {
    width: Math.min(MAX_2K_WIDTH, targetW),
    height: Math.min(MAX_2K_HEIGHT, targetH),
  };
}
