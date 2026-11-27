import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Moon,
  ScrollText,
  ShieldAlert,
  Store,
  Sun,
  TrendingUp,
  X,
} from 'lucide-react';
import { BackstageRoomDock } from './components/BackstageRoomDock';
import { BusinessHubModal } from './components/BusinessHubModal';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { DaySummaryModal } from './components/DaySummaryModal';
import { EncyclopediaModal } from './components/EncyclopediaModal';
import { EndingEpilogueModal } from './components/EndingEpilogueModal';
import { GameOverModal } from './components/GameOverModal';
import { MainMenuScreen } from './components/MainMenuScreen';
import { OnboardingGuide } from './components/OnboardingGuide';
import { OfflineBanner, PWAInstallButton } from './components/PWAInstallButton';
import { SaveLoadModal } from './components/SaveLoadModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfigTab, StoreConfigModal } from './components/StoreConfigModal';
import { StoryChronicleModal } from './components/StoryChronicleModal';
import { StoryEventModal } from './components/StoryEventModal';
import { TopHud } from './components/TopHud';
import { useMobileDevice } from './hooks/useMobileDevice';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  generateCandidatePool,
  getFrontHallBounds,
  getFrontHallEntranceLayout,
  STATIONS,
} from './data/gameConfig';
import { getBackstageRoomRect } from './data/policyAndTechConfig';
import { getDaysUntilNextInspection, getNearFailureStatus } from './data/staffDialogueConfig';
import { getWeatherDef } from './data/tycoonSystemsConfig';
import { evaluateChapterObjectives, getCharacterDef, MAIN_CHAPTERS } from './data/storyConfig';
import {
  BACKSTAGE_OFFSET_Y,
  getIsoMapMetrics,
  getIsoViewportTransform,
  renderUnifiedIsoCanvas,
  screenBufToUnifiedWorld,
} from './engine/isoRenderer';
import {
  autoSlotPolicyCard,
  enterBackstageScene,
  equipPolicyCard,
  exitBackstageToDiningHall,
  handleBackstageCanvasClick,
  moveBackstagePlayerByKeys,
  purchaseDiningRegime,
  startTechNodeResearch,
  switchDiningRegime,
  tickBackstagePlayer,
  triggerSpecialStaffRecruitmentSideStory,
  unequipPolicySlot,
  walkBackstagePlayerToFrontHall,
} from './engine/policyAndTech';
import { SceneCamera } from './engine/renderer';
import {
  addAlert,
  addFloatingText,
  cancelPendingFire,
  claimCurrentChapter,
  completeClosingAndSettle,
  createInitialWorld,
  finishBusinessDay,
  fireStaff,
  formatClock,
  getClosingProgress,
  handleCanvasClick,
  hireCandidate,
  interactNearestStation,
  isActivePlayPhase,
  movePlayerByKeys,
  openShopForBusiness,
  promoteStaff,
  startNextDay,
  syncSeasonalVisualState,
  tickWorld,
  walkPlayerToBackstage,
} from './engine/simulation';
import {
  assignZoneToPad,
  confessOrProposeSpecialStaff,
  getAvailableSpecialStaffQuests,
  getPadForBuffetZone,
  interactWithSpecialStaff,
  performFacilityAction,
  placeClosingProcurementOrder,
  postPartTimeJob,
  procureRawIngredients,
  purchaseZonePad,
  resolveStoryChoice,
  spendTimeWithPartner,
  triggerFacilitySceneStory,
  triggerSpecialStaffQuest,
  unlockBuffetZone,
} from './engine/storyAndFacilities';
import {
  buyOrEquipDecorTheme,
  computeCityLeaderboard,
  deleteSaveSlot,
  launchMarketingCampaign,
  listSaveSlots,
  loadEncyclopedia,
  loadGameFromSlot,
  markOnboardingCompleted,
  repayEmergencyLoan,
  saveGameToSlot,
  syncWorldToEncyclopedia,
  takeEmergencyLoan,
} from './engine/tycoonSystems';
import { CarryItemType, CharacterId, GameWorld, SaveSlotId } from './types/game';
import {
  BGM_TRACK_META,
  BgmTrackId,
  computeCanvasBackingSize,
  GameSettings,
  getAspectRatioNumber,
  loadSettings,
  saveSettings,
} from './types/settings';
import { sound } from './utils/sound';

function resolveBgmTrack(world: GameWorld, settings: GameSettings): BgmTrackId {
  if (settings.bgmMode !== 'auto') {
    return settings.bgmMode;
  }
  const phase = world.phase === 'PAUSED' ? world.pausedFromPhase : world.phase;
  switch (phase) {
    case 'MAIN_MENU':
    case 'CHARACTER_SELECT':
      return 'TITLE';
    case 'PREP':
      return 'PREP';
    case 'PLAYING':
      return world.rushHourActive ? 'RUSH' : 'SERVICE';
    case 'CLOSING':
    case 'DAY_SUMMARY':
      return 'CLOSING';
    case 'GAME_OVER':
      return 'GAME_OVER';
    default:
      return 'PREP';
  }
}

const STORAGE_KEY = 'chaoxian_hotpot_best_v1';

type QuickActionType = 'WELCOME' | 'BROTH' | 'RESTOCK' | 'CLEAR' | 'WASH' | 'SET' | 'COOK';
type ActiveOverlay =
  | 'SETTINGS'
  | 'CONFIG'
  | 'STORY'
  | 'BUSINESS'
  | 'SAVE_LOAD'
  | 'ENCYCLOPEDIA'
  | 'SYSTEM_MENU'
  | null;

const CARRY_LABEL: Record<CarryItemType, string> = {
  NONE: '空手',
  SEAFOOD_TRAY: '生鲜补货托盘',
  BROTH_POT: '热腾锅底',
  DIRTY_DISHES: '脏餐具',
  CLEAN_TABLEWARE: '消毒餐具',
  COOKED_PLATTER: '现烹熟食热菜',
};

function loadBestRecord(): { bestDays: number; bestCash: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        bestDays: Number(parsed.bestDays) || 0,
        bestCash: Number(parsed.bestCash) || 0,
      };
    }
  } catch {
    // ignore storage errors
  }
  return { bestDays: 0, bestCash: 0 };
}

function saveBestRecord(days: number, cash: number) {
  try {
    const prev = loadBestRecord();
    const next = {
      bestDays: Math.max(prev.bestDays, days),
      bestCash: Math.max(prev.bestCash, cash),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

type HudResponsiveTier =
  | 'LANDSCAPE_ULTRA'
  | 'LANDSCAPE_COMPACT'
  | 'PORTRAIT_COMPACT'
  | 'PORTRAIT_STANDARD'
  | 'PORTRAIT_TALL'
  | 'TABLET'
  | 'DESKTOP';

interface MobileHudLayout {
  tier: HudResponsiveTier;
  isMobile: boolean;
  compactLandscape: boolean;
  topHudScale: number;
  leftMenuScale: number;
  hotbarScale: number;
  orbScale: number;
  topMenuTopPx: number;
  alertTopPx: number;
  hotbarCompact: boolean;
  hotbarBottomPx: number;
  hotbarSideBySideWithOrb: boolean;
  hotbarRightReservePx: number;
  orbBottomDiningPx: number;
  orbBottomBackstagePx: number;
  backstageDockBottomPx: number;
  cameraPanYBias: number;
}

const MOBILE_HUD_MEDIA_QUERIES = [
  '(orientation: landscape) and (max-height: 440px)',
  '(orientation: landscape) and (max-height: 560px) and (max-width: 1024px)',
  '(max-width: 767px) and (orientation: portrait) and (min-aspect-ratio: 9/17)',
  '(max-width: 767px) and (orientation: portrait) and (max-height: 700px)',
  '(max-width: 767px) and (orientation: portrait) and (max-aspect-ratio: 9/19)',
  '(max-width: 767px) and (orientation: portrait)',
  '(min-width: 768px) and (max-width: 1024px)',
] as const;

function computeMobileHudLayout(): MobileHudLayout {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return {
      tier: 'DESKTOP',
      isMobile: false,
      compactLandscape: false,
      topHudScale: 1,
      leftMenuScale: 1,
      hotbarScale: 1,
      orbScale: 1,
      topMenuTopPx: 62,
      alertTopPx: 62,
      hotbarCompact: false,
      hotbarBottomPx: 12,
      hotbarSideBySideWithOrb: true,
      hotbarRightReservePx: 256,
      orbBottomDiningPx: 14,
      orbBottomBackstagePx: 14,
      backstageDockBottomPx: 12,
      cameraPanYBias: 0,
    };
  }

  const mm = (query: string) => window.matchMedia(query).matches;

  // 1. Ultra-short mobile landscape (e.g. 667x375, 844x390, 915x412)
  if (mm(MOBILE_HUD_MEDIA_QUERIES[0])) {
    return {
      tier: 'LANDSCAPE_ULTRA',
      isMobile: true,
      compactLandscape: true,
      topHudScale: 0.84,
      leftMenuScale: 0.82,
      hotbarScale: 0.78,
      orbScale: 0.72,
      topMenuTopPx: 46,
      alertTopPx: 46,
      hotbarCompact: true,
      hotbarBottomPx: 6,
      hotbarSideBySideWithOrb: true,
      hotbarRightReservePx: 236,
      orbBottomDiningPx: 6,
      orbBottomBackstagePx: 6,
      backstageDockBottomPx: 6,
      cameraPanYBias: 44,
    };
  }

  // 2. Standard phone / phablet landscape (height 441px–560px)
  if (mm(MOBILE_HUD_MEDIA_QUERIES[1])) {
    return {
      tier: 'LANDSCAPE_COMPACT',
      isMobile: true,
      compactLandscape: true,
      topHudScale: 0.9,
      leftMenuScale: 0.88,
      hotbarScale: 0.85,
      orbScale: 0.8,
      topMenuTopPx: 50,
      alertTopPx: 50,
      hotbarCompact: true,
      hotbarBottomPx: 8,
      hotbarSideBySideWithOrb: true,
      hotbarRightReservePx: 262,
      orbBottomDiningPx: 8,
      orbBottomBackstagePx: 8,
      backstageDockBottomPx: 8,
      cameraPanYBias: 36,
    };
  }

  // 3. Compact 16:9 / 18:9 portrait phones (e.g. iPhone SE 375x667, 360x640)
  if (mm(MOBILE_HUD_MEDIA_QUERIES[2]) || mm(MOBILE_HUD_MEDIA_QUERIES[3])) {
    return {
      tier: 'PORTRAIT_COMPACT',
      isMobile: true,
      compactLandscape: false,
      topHudScale: 0.9,
      leftMenuScale: 0.86,
      hotbarScale: 0.86,
      orbScale: 0.78,
      topMenuTopPx: 76,
      alertTopPx: 76,
      hotbarCompact: true,
      hotbarBottomPx: 6,
      hotbarSideBySideWithOrb: false,
      hotbarRightReservePx: 10,
      orbBottomDiningPx: 62,
      orbBottomBackstagePx: 112,
      backstageDockBottomPx: 6,
      cameraPanYBias: 32,
    };
  }

  // 4. Ultra-tall 20:9 / 21:9 portrait phones (e.g. Huawei Mate/Pura, Android 20:9, iPhone Pro Max)
  if (mm(MOBILE_HUD_MEDIA_QUERIES[4])) {
    return {
      tier: 'PORTRAIT_TALL',
      isMobile: true,
      compactLandscape: false,
      topHudScale: 0.95,
      leftMenuScale: 0.92,
      hotbarScale: 0.93,
      orbScale: 0.88,
      topMenuTopPx: 84,
      alertTopPx: 84,
      hotbarCompact: false,
      hotbarBottomPx: 8,
      hotbarSideBySideWithOrb: false,
      hotbarRightReservePx: 10,
      orbBottomDiningPx: 92,
      orbBottomBackstagePx: 126,
      backstageDockBottomPx: 8,
      cameraPanYBias: 18,
    };
  }

  // 5. Standard 19.5:9 portrait phones (e.g. 390x844)
  if (mm(MOBILE_HUD_MEDIA_QUERIES[5])) {
    return {
      tier: 'PORTRAIT_STANDARD',
      isMobile: true,
      compactLandscape: false,
      topHudScale: 0.92,
      leftMenuScale: 0.9,
      hotbarScale: 0.9,
      orbScale: 0.84,
      topMenuTopPx: 80,
      alertTopPx: 80,
      hotbarCompact: false,
      hotbarBottomPx: 8,
      hotbarSideBySideWithOrb: false,
      hotbarRightReservePx: 10,
      orbBottomDiningPx: 88,
      orbBottomBackstagePx: 120,
      backstageDockBottomPx: 8,
      cameraPanYBias: 24,
    };
  }

  // 6. Tablets & unfolded foldables (768px–1024px)
  if (mm(MOBILE_HUD_MEDIA_QUERIES[6])) {
    return {
      tier: 'TABLET',
      isMobile: false,
      compactLandscape: false,
      topHudScale: 0.96,
      leftMenuScale: 0.94,
      hotbarScale: 0.92,
      orbScale: 0.9,
      topMenuTopPx: 62,
      alertTopPx: 62,
      hotbarCompact: false,
      hotbarBottomPx: 10,
      hotbarSideBySideWithOrb: true,
      hotbarRightReservePx: 274,
      orbBottomDiningPx: 12,
      orbBottomBackstagePx: 12,
      backstageDockBottomPx: 10,
      cameraPanYBias: 14,
    };
  }

  return {
    tier: 'DESKTOP',
    isMobile: false,
    compactLandscape: false,
    topHudScale: 1,
    leftMenuScale: 1,
    hotbarScale: 1,
    orbScale: 1,
    topMenuTopPx: 62,
    alertTopPx: 62,
    hotbarCompact: false,
    hotbarBottomPx: 12,
    hotbarSideBySideWithOrb: true,
    hotbarRightReservePx: 256,
    orbBottomDiningPx: 14,
    orbBottomBackstagePx: 14,
    backstageDockBottomPx: 12,
    cameraPanYBias: 0,
  };
}

function useMobileHudLayout(): MobileHudLayout {
  const [layout, setLayout] = useState<MobileHudLayout>(computeMobileHudLayout);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const sync = () => {
      const next = computeMobileHudLayout();
      setLayout((prev) => (prev.tier === next.tier ? prev : next));
    };

    const mqls = MOBILE_HUD_MEDIA_QUERIES.map((q) => window.matchMedia(q));
    mqls.forEach((mql) => {
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', sync);
      } else {
        mql.addListener(sync);
      }
    });
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);

    sync();

    return () => {
      mqls.forEach((mql) => {
        if (typeof mql.removeEventListener === 'function') {
          mql.removeEventListener('change', sync);
        } else {
          mql.removeListener(sync);
        }
      });
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      vv?.removeEventListener('resize', sync);
    };
  }, []);

  return layout;
}

export default function App() {
  const worldRef = useRef<GameWorld>(createInitialWorld('MAIN_MENU', 'harbor_heir'));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hoverPosRef = useRef<{ x: number; y: number } | null>(null);
  const keysPressedRef = useRef<Set<string>>(new Set());

  const [, setUiTick] = useState(0);
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const settingsRef = useRef<GameSettings>(settings);

  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  const activeOverlayRef = useRef<ActiveOverlay>(null);
  const [configInitialTab, setConfigInitialTab] = useState<ConfigTab>('POLICY');
  const [showChronicleDrawer, setShowChronicleDrawer] = useState(false);
  const [leftMenuOpen, setLeftMenuOpen] = useState(false);
  const leftMenuOpenRef = useRef(false);

  const [bestRecord, setBestRecord] = useState(loadBestRecord);
  const [saveSlots, setSaveSlots] = useState(() => listSaveSlots());
  const [encyclopedia, setEncyclopedia] = useState(() => loadEncyclopedia());
  const [manualGuideOpen, setManualGuideOpen] = useState(false);
  const [showOnboardingIntro, setShowOnboardingIntro] = useState(false);
  const showOnboardingIntroRef = useRef(false);
  const device = useMobileDevice();
  const hudLayout = useMobileHudLayout();
  const hudLayoutRef = useRef<MobileHudLayout>(hudLayout);
  hudLayoutRef.current = hudLayout;
  const [hotbarCollapsed, setHotbarCollapsed] = useState(false);
  const pwa = usePWAInstall(device.platform);
  const lastTouchTapAtRef = useRef(0);
  const cameraRef = useRef<SceneCamera>({ zoom: 1, panX: 0, panY: hudLayout.cameraPanYBias });
  const panDragRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  });

  const refreshPersistentData = useCallback(() => {
    setSaveSlots(listSaveSlots());
    setEncyclopedia(loadEncyclopedia());
  }, []);

  const forceUiSync = useCallback(() => {
    setUiTick((v) => v + 1);
  }, []);

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
    sound.setVolume(next.volume);
    sound.setBgmVolume(next.bgmVolume);
    sound.setSfxVolume(next.sfxVolume);
    sound.setMuted(next.muted);
    sound.setBgmMuted(next.bgmMuted);
  }, []);

  useEffect(() => {
    const s = settingsRef.current;
    sound.setVolume(s.volume);
    sound.setBgmVolume(s.bgmVolume);
    sound.setSfxVolume(s.sfxVolume);
    sound.setMuted(s.muted);
    sound.setBgmMuted(s.bgmMuted);
  }, []);

  useEffect(() => {
    activeOverlayRef.current = activeOverlay;
  }, [activeOverlay]);

  useEffect(() => {
    showOnboardingIntroRef.current = showOnboardingIntro;
  }, [showOnboardingIntro]);

  useEffect(() => {
    leftMenuOpenRef.current = leftMenuOpen;
  }, [leftMenuOpen]);

  const currentPhase = worldRef.current.phase;
  const isGameplayStage = currentPhase !== 'MAIN_MENU' && currentPhase !== 'CHARACTER_SELECT';

  useEffect(() => {
    if (!isGameplayStage) return;
    const el = stageRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize((prev) =>
          Math.abs(prev.width - rect.width) > 1 || Math.abs(prev.height - rect.height) > 1
            ? { width: Math.floor(rect.width), height: Math.floor(rect.height) }
            : prev
        );
      }
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      vv?.removeEventListener('resize', measure);
    };
  }, [isGameplayStage, currentPhase]);

  const targetRatio = getAspectRatioNumber(settings.aspectRatio);
  let fittedWidth = stageSize.width;
  let fittedHeight = stageSize.height;
  if (targetRatio !== null && stageSize.width > 0 && stageSize.height > 0) {
    const stageRatio = stageSize.width / stageSize.height;
    if (stageRatio > targetRatio) {
      fittedHeight = stageSize.height;
      fittedWidth = Math.floor(stageSize.height * targetRatio);
    } else {
      fittedWidth = stageSize.width;
      fittedHeight = Math.floor(stageSize.width / targetRatio);
    }
  }

  const fittedBoxRef = useRef({ width: fittedWidth, height: fittedHeight });
  fittedBoxRef.current = { width: fittedWidth, height: fittedHeight };

  const previewCssW = isGameplayStage ? fittedWidth : Math.max(1120, window.innerWidth);
  const previewCssH = isGameplayStage ? fittedHeight : Math.max(630, window.innerHeight - 64);
  const actualCanvasSize = computeCanvasBackingSize(previewCssW, previewCssH, settings);

  const handleQuickAction = useCallback(
    (action: QuickActionType) => {
      const w = worldRef.current;
      if (!isActivePlayPhase(w.phase) || w.pendingStoryModal || activeOverlayRef.current) return;
      if (w.activeScene === 'BACKSTAGE') {
        exitBackstageToDiningHall(w);
      }

      switch (action) {
        case 'WELCOME': {
          const rec = getFrontHallEntranceLayout(w.shopLevel).reception;
          handleCanvasClick(w, rec.x, rec.y);
          break;
        }
        case 'RESTOCK':
          handleCanvasClick(w, STATIONS.COLD_PREP.x, STATIONS.COLD_PREP.y);
          break;
        case 'BROTH':
          handleCanvasClick(w, STATIONS.BROTH_KITCHEN.x, STATIONS.BROTH_KITCHEN.y);
          break;
        case 'CLEAR': {
          const dirty = w.tables
            .filter((t) => t.status === 'DIRTY')
            .sort((a, b) => b.dirtyTime - a.dirtyTime)[0];
          if (dirty) {
            handleCanvasClick(w, dirty.x, dirty.y);
          } else {
            addFloatingText(w, w.player.x, w.player.y - 24, '当前没有待收脏桌', '#B6C7DC', 12);
          }
          break;
        }
        case 'WASH':
          handleCanvasClick(w, STATIONS.SINK.x, STATIONS.SINK.y);
          break;
        case 'SET': {
          const needy = w.tables.find((t) => t.status === 'NEEDS_TABLEWARE');
          if (needy) {
            handleCanvasClick(w, needy.x, needy.y);
          } else {
            addFloatingText(w, w.player.x, w.player.y - 24, '所有空桌均已摆好餐具', '#B6C7DC', 12);
          }
          break;
        }
        case 'COOK': {
          const cookedPad = getPadForBuffetZone(w, 'cooked_hot');
          if (cookedPad) {
            handleCanvasClick(w, cookedPad.x + cookedPad.w * 0.5, cookedPad.y + cookedPad.h * 0.5);
          } else {
            addFloatingText(w, w.player.x, w.player.y - 24, '尚未在前厅布置熟食区', '#FBBF24', 12);
            setConfigInitialTab('ZONES');
            setActiveOverlay('CONFIG');
          }
          break;
        }
      }
      forceUiSync();
    },
    [forceUiSync]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();

      if (key === 'escape') {
        if (activeOverlayRef.current) {
          setActiveOverlay(null);
          return;
        }
        if (leftMenuOpenRef.current) {
          sound.playClick();
          setLeftMenuOpen(false);
          setShowChronicleDrawer(false);
          return;
        }
        if (
          isActivePlayPhase(worldRef.current.phase) &&
          !worldRef.current.pendingStoryModal &&
          !showOnboardingIntroRef.current
        ) {
          sound.playClick();
          keysPressedRef.current.clear();
          setActiveOverlay('SYSTEM_MENU');
          return;
        }
      }
      if (activeOverlayRef.current || showOnboardingIntroRef.current) return;

      const activePhase = isActivePlayPhase(worldRef.current.phase);

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        if (activePhase) {
          e.preventDefault();
          keysPressedRef.current.add(key);
        }
      } else if (key === ' ') {
        if (activePhase && !worldRef.current.pendingStoryModal) {
          e.preventDefault();
          const res = interactNearestStation(worldRef.current);
          if (res === 'OPEN_ZONE_CONFIG') {
            setConfigInitialTab('ZONES');
            setActiveOverlay('CONFIG');
          }
          forceUiSync();
        }
      } else if (key === '1') {
        handleQuickAction('WELCOME');
      } else if (key === '2') {
        handleQuickAction('BROTH');
      } else if (key === '3') {
        handleQuickAction('RESTOCK');
      } else if (key === '4') {
        handleQuickAction('CLEAR');
      } else if (key === '5') {
        handleQuickAction('WASH');
      } else if (key === '6') {
        handleQuickAction('SET');
      } else if (key === '7') {
        handleQuickAction('COOK');
      } else if (key === 'c' && activePhase && !worldRef.current.pendingStoryModal) {
        sound.playClick();
        keysPressedRef.current.clear();
        if (worldRef.current.onboardingStep < 2) {
          worldRef.current.onboardingStep = 2;
        }
        setConfigInitialTab('POLICY');
        setActiveOverlay('CONFIG');
      } else if (key === 'b' && activePhase && !worldRef.current.pendingStoryModal) {
        sound.playClick();
        keysPressedRef.current.clear();
        setActiveOverlay('BUSINESS');
      } else if (key === 'm' && activePhase && !worldRef.current.pendingStoryModal) {
        keysPressedRef.current.clear();
        if (worldRef.current.activeScene === 'BACKSTAGE') {
          exitBackstageToDiningHall(worldRef.current);
          cameraRef.current = {
            zoom: 1.42,
            panX: -225,
            panY: 138 + Math.round(hudLayoutRef.current.cameraPanYBias * 0.65),
          };
          setZoomPercent(142);
        } else {
          enterBackstageScene(worldRef.current);
          cameraRef.current = { zoom: 1.42, panX: 230, panY: -88 };
          setZoomPercent(142);
          if (worldRef.current.phase === 'CLOSING' && worldRef.current.onboardingStep === 7) {
            worldRef.current.onboardingStep = 8;
          }
        }
        forceUiSync();
      } else if (key === 'p') {
        const w = worldRef.current;
        if (isActivePlayPhase(w.phase)) {
          w.pausedFromPhase = w.phase as 'PREP' | 'PLAYING' | 'CLOSING';
          w.phase = 'PAUSED';
          forceUiSync();
        } else if (w.phase === 'PAUSED') {
          w.phase = w.pausedFromPhase;
          forceUiSync();
        }
      } else if (key === 'escape') {
        const w = worldRef.current;
        if (w.pendingStoryModal) {
          w.pendingStoryModal = null;
          forceUiSync();
        } else if (isActivePlayPhase(w.phase) || w.phase === 'PAUSED') {
          sound.playTabSwitch();
          keysPressedRef.current.clear();
          setActiveOverlay('SYSTEM_MENU');
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [forceUiSync, handleQuickAction]);

  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let uiSyncAccum = 0;

    const frame = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      const world = worldRef.current;
      const prevPhase = world.phase;
      const prevModalId = world.pendingStoryModal?.id ?? null;

      if (
        isActivePlayPhase(world.phase) &&
        !world.pendingStoryModal &&
        !activeOverlayRef.current &&
        !showOnboardingIntroRef.current
      ) {
        const keys = keysPressedRef.current;
        let sx = 0;
        let sy = 0;
        if (keys.has('w') || keys.has('arrowup')) sy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) sy += 1;
        if (keys.has('a') || keys.has('arrowleft')) sx -= 1;
        if (keys.has('d') || keys.has('arrowright')) sx += 1;

        // Map screen-aligned WASD into 45° isometric world axes (+ix => +wx,-wy; +iy => +wx,+wy)
        const isoDx = sx + sy;
        const isoDy = sy - sx;

        if (world.activeScene === 'BACKSTAGE') {
          if (isoDx !== 0 || isoDy !== 0) {
            moveBackstagePlayerByKeys(world, isoDx, isoDy, dt);
          }
          const crossedFront = tickBackstagePlayer(world, dt);
          if (crossedFront) {
            const res = handleCanvasClick(world, crossedFront.x, crossedFront.y);
            if (res === 'OPEN_ZONE_CONFIG') {
              setConfigInitialTab('ZONES');
              setActiveOverlay('CONFIG');
            }
          }
        } else if (isoDx !== 0 || isoDy !== 0) {
          movePlayerByKeys(world, isoDx, isoDy, dt * world.speedMultiplier);
        }

        tickWorld(world, dt);

        // Smooth 3-stage Day-1 onboarding auto-progression across PREP -> PLAYING -> CLOSING!
        if (world.onboardingStep < 9) {
          if (world.phase === 'PLAYING') {
            if (world.onboardingStep < 3) {
              world.onboardingStep = 3;
            } else if (
              world.onboardingStep === 3 &&
              world.tables.some((t) => t.status === 'DINING')
            ) {
              world.onboardingStep = 4;
            } else if (
              world.onboardingStep === 4 &&
              world.todayStats.guestsServed >= 1
            ) {
              world.onboardingStep = 5;
            } else if (
              world.onboardingStep === 5 &&
              (world.incidentsTriggeredToday >= 1 || world.dayTime / Math.max(1, world.dayDuration) > 0.55)
            ) {
              world.onboardingStep = 6;
            }
          } else if (world.phase === 'CLOSING' && world.onboardingStep < 7) {
            world.onboardingStep = 7;
          } else if (world.phase === 'DAY_SUMMARY') {
            world.onboardingStep = 9;
            markOnboardingCompleted();
            setManualGuideOpen(false);
          }
        }

        const nextModalId = worldRef.current.pendingStoryModal?.id ?? null;
        if (world.phase !== prevPhase || nextModalId !== prevModalId) {
          saveBestRecord(world.day, world.totalCashEarned);
          setBestRecord(loadBestRecord());
          setSaveSlots(listSaveSlots());
          setEncyclopedia(loadEncyclopedia());
          forceUiSync();
        }
      }

      const canvas = canvasRef.current;
      if (
        canvas &&
        world.phase !== 'MAIN_MENU' &&
        world.phase !== 'CHARACTER_SELECT'
      ) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const box = fittedBoxRef.current;
          const backing = computeCanvasBackingSize(box.width, box.height, settingsRef.current);
          if (canvas.width !== backing.width || canvas.height !== backing.height) {
            canvas.width = backing.width;
            canvas.height = backing.height;
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          renderUnifiedIsoCanvas(
            ctx,
            world,
            now / 1000,
            hoverPosRef.current,
            canvas.width,
            canvas.height,
            cameraRef.current
          );
        }
      }

      uiSyncAccum += dt;
      if (
        uiSyncAccum >= 0.16 &&
        isActivePlayPhase(world.phase) &&
        !world.pendingStoryModal &&
        !activeOverlayRef.current
      ) {
        uiSyncAccum = 0;
        setUiTick((v) => v + 1);
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [forceUiSync]);

  const clampCameraPan = useCallback((zoom: number, panX: number, panY: number) => {
    const basePanY = hudLayoutRef.current.cameraPanYBias;
    if (zoom <= 0.92) {
      return { panX: 0, panY: basePanY };
    }
    const m = getIsoMapMetrics(worldRef.current.shopLevel);
    const maxPanX = (m.boundsW * Math.max(0.25, zoom - 0.85)) / (2 * zoom) + 220;
    const maxPanY = (m.boundsH * Math.max(0.25, zoom - 0.85)) / (2 * zoom) + 160 + basePanY;
    return {
      panX: Math.max(-maxPanX, Math.min(maxPanX, panX)),
      panY: Math.max(-maxPanY, Math.min(maxPanY, panY)),
    };
  }, []);

  const resetCameraZoom = useCallback(() => {
    cameraRef.current = { zoom: 1, panX: 0, panY: hudLayoutRef.current.cameraPanYBias };
    setZoomPercent(100);
  }, []);

  const focusFrontHallCamera = useCallback(() => {
    cameraRef.current = {
      zoom: 1.42,
      panX: -225,
      panY: 138 + Math.round(hudLayoutRef.current.cameraPanYBias * 0.65),
    };
    setZoomPercent(142);
  }, []);

  const focusBackstageCamera = useCallback(() => {
    cameraRef.current = { zoom: 1.42, panX: 230, panY: -88 };
    setZoomPercent(142);
  }, []);

  // Dynamically maintain bottom-scene camera clearance when rotating or crossing mobile media-query tiers
  useEffect(() => {
    if (!isGameplayStage) return;
    if (!hudLayout.isMobile) {
      setHotbarCollapsed(false);
    }
    if (cameraRef.current.zoom <= 1.05 && Math.abs(cameraRef.current.panX) < 12) {
      cameraRef.current = {
        ...cameraRef.current,
        panY: hudLayout.cameraPanYBias,
      };
    }
  }, [isGameplayStage, hudLayout.isMobile, hudLayout.cameraPanYBias]);

  useEffect(() => {
    if (!isGameplayStage) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      if (
        activeOverlayRef.current ||
        showOnboardingIntroRef.current ||
        worldRef.current.pendingStoryModal
      ) {
        return;
      }
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
        return;
      }

      const shopLevel = worldRef.current.shopLevel;
      const m = getIsoMapMetrics(shopLevel);
      const prevCam = cameraRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      let nextZoom = Math.max(0.65, Math.min(2.6, prevCam.zoom * factor));
      if (Math.abs(nextZoom - 1) < 0.03) {
        nextZoom = 1;
      }

      const bufX = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const bufY = ((e.clientY - rect.top) / rect.height) * canvas.height;
      const prevVt = getIsoViewportTransform(canvas.width, canvas.height, prevCam, shopLevel);
      const ix = (bufX - prevVt.offsetX) / prevVt.scale;
      const iy = (bufY - prevVt.offsetY) / prevVt.scale;

      if (nextZoom <= 0.96) {
        cameraRef.current = { zoom: nextZoom, panX: 0, panY: hudLayoutRef.current.cameraPanYBias };
      } else {
        const baseScale = Math.min(canvas.width / m.boundsW, canvas.height / m.boundsH) * 0.96;
        const nextScale = baseScale * nextZoom;
        const rawPanX = ix - m.centerX - (bufX - canvas.width / 2) / nextScale;
        const rawPanY = iy - m.centerY - (bufY - canvas.height / 2) / nextScale;
        const clamped = clampCameraPan(nextZoom, rawPanX, rawPanY);
        cameraRef.current = { zoom: nextZoom, panX: clamped.panX, panY: clamped.panY };
      }

      setZoomPercent(Math.round(cameraRef.current.zoom * 100));
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [isGameplayStage, clampCameraPan]);

  const clientPointToUnifiedWorld = useCallback(
    (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
        return { x: -9999, y: -9999 };
      }
      const bufX = ((clientX - rect.left) / rect.width) * canvas.width;
      const bufY = ((clientY - rect.top) / rect.height) * canvas.height;
      return screenBufToUnifiedWorld(
        bufX,
        bufY,
        canvas.width,
        canvas.height,
        cameraRef.current,
        worldRef.current.shopLevel
      );
    },
    []
  );

  const dispatchCanvasTapAtClientPoint = useCallback(
    (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
      if (activeOverlayRef.current || showOnboardingIntroRef.current) return;
      const pt = clientPointToUnifiedWorld(canvas, clientX, clientY);
      const w = worldRef.current;
      const frontBounds = getFrontHallBounds(w.shopLevel);

      // Unified Grand Map: Backstage Wing sits seamlessly at wy < -12; Expanded Front Hall at wy >= -12
      if (pt.y < -12 && pt.y >= BACKSTAGE_OFFSET_Y - 24 && pt.x >= -20 && pt.x <= 980) {
        const localY = pt.y - BACKSTAGE_OFFSET_Y;
        if (w.activeScene !== 'BACKSTAGE') {
          walkPlayerToBackstage(w, pt.x, localY);
        } else {
          handleBackstageCanvasClick(w, pt.x, localY);
        }
      } else if (
        pt.y >= -12 &&
        pt.y <= frontBounds.height + 36 &&
        pt.x >= -20 &&
        pt.x <= frontBounds.width + 24
      ) {
        if (w.activeScene !== 'DINING_HALL') {
          walkBackstagePlayerToFrontHall(w, pt.x, pt.y);
        } else {
          const res = handleCanvasClick(w, pt.x, pt.y);
          if (res === 'OPEN_ZONE_CONFIG') {
            setConfigInitialTab('ZONES');
            setActiveOverlay('CONFIG');
          }
        }
      }
      forceUiSync();
    },
    [clientPointToUnifiedWorld, forceUiSync]
  );

  // Full multi-touch gesture engine for Android, Huawei HarmonyOS/EMUI, and Apple iOS
  // Supports: 1-finger tap (interact), 1-finger drag (pan), 2-finger pinch (zoom anchored at midpoint + pan)
  useEffect(() => {
    if (!isGameplayStage) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mode: 'NONE' | 'SINGLE' | 'PINCH' = 'NONE';
    let startClientX = 0;
    let startClientY = 0;
    let startPanX = 0;
    let startPanY = 0;
    let moved = false;
    let hadPinch = false;

    let pinchStartDist = 1;
    let pinchStartZoom = 1;
    let pinchAnchorIx = 0;
    let pinchAnchorIy = 0;

    const getTouchDist = (t0: Touch, t1: Touch) =>
      Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);

    const beginPinch = (t0: Touch, t1: Touch) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) return;
      const midX = (t0.clientX + t1.clientX) * 0.5;
      const midY = (t0.clientY + t1.clientY) * 0.5;
      const bufX = ((midX - rect.left) / rect.width) * canvas.width;
      const bufY = ((midY - rect.top) / rect.height) * canvas.height;
      const vt = getIsoViewportTransform(
        canvas.width,
        canvas.height,
        cameraRef.current,
        worldRef.current.shopLevel
      );
      pinchAnchorIx = (bufX - vt.offsetX) / vt.scale;
      pinchAnchorIy = (bufY - vt.offsetY) / vt.scale;
      pinchStartDist = Math.max(12, getTouchDist(t0, t1));
      pinchStartZoom = cameraRef.current.zoom;
      mode = 'PINCH';
      moved = true;
      hadPinch = true;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (
        activeOverlayRef.current ||
        showOnboardingIntroRef.current ||
        worldRef.current.pendingStoryModal
      ) {
        return;
      }
      if (leftMenuOpenRef.current) {
        setLeftMenuOpen(false);
        setShowChronicleDrawer(false);
      }

      if (e.touches.length === 1) {
        const t = e.touches[0];
        mode = 'SINGLE';
        startClientX = t.clientX;
        startClientY = t.clientY;
        startPanX = cameraRef.current.panX;
        startPanY = cameraRef.current.panY;
        moved = false;
        hadPinch = false;
      } else if (e.touches.length >= 2) {
        e.preventDefault();
        beginPinch(e.touches[0], e.touches[1]);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (
        activeOverlayRef.current ||
        showOnboardingIntroRef.current ||
        worldRef.current.pendingStoryModal
      ) {
        return;
      }
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) return;

      if (e.touches.length >= 2) {
        if (mode !== 'PINCH') {
          beginPinch(e.touches[0], e.touches[1]);
          return;
        }
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.max(12, getTouchDist(t0, t1));
        const ratio = dist / pinchStartDist;
        let nextZoom = Math.max(0.65, Math.min(2.6, pinchStartZoom * ratio));
        if (Math.abs(nextZoom - 1) < 0.025) {
          nextZoom = 1;
        }

        const midX = (t0.clientX + t1.clientX) * 0.5;
        const midY = (t0.clientY + t1.clientY) * 0.5;
        const bufX = ((midX - rect.left) / rect.width) * canvas.width;
        const bufY = ((midY - rect.top) / rect.height) * canvas.height;
        const shopLevel = worldRef.current.shopLevel;
        const m = getIsoMapMetrics(shopLevel);

        if (nextZoom <= 0.94) {
          cameraRef.current = {
            zoom: nextZoom,
            panX: 0,
            panY: hudLayoutRef.current.cameraPanYBias,
          };
        } else {
          const baseScale = Math.min(canvas.width / m.boundsW, canvas.height / m.boundsH) * 0.96;
          const nextScale = baseScale * nextZoom;
          const rawPanX = pinchAnchorIx - m.centerX - (bufX - canvas.width / 2) / nextScale;
          const rawPanY = pinchAnchorIy - m.centerY - (bufY - canvas.height / 2) / nextScale;
          const clamped = clampCameraPan(nextZoom, rawPanX, rawPanY);
          cameraRef.current = { zoom: nextZoom, panX: clamped.panX, panY: clamped.panY };
        }
        setZoomPercent(Math.round(cameraRef.current.zoom * 100));
        return;
      }

      if (e.touches.length === 1 && mode === 'SINGLE') {
        const t = e.touches[0];
        const dx = t.clientX - startClientX;
        const dy = t.clientY - startClientY;
        if (!moved && Math.hypot(dx, dy) >= 10) {
          moved = true;
        }
        if (moved) {
          const vt = getIsoViewportTransform(
            canvas.width,
            canvas.height,
            cameraRef.current,
            worldRef.current.shopLevel
          );
          const dxBuf = (dx / rect.width) * canvas.width;
          const dyBuf = (dy / rect.height) * canvas.height;
          const clamped = clampCameraPan(
            cameraRef.current.zoom,
            startPanX - dxBuf / vt.scale,
            startPanY - dyBuf / vt.scale
          );
          cameraRef.current = {
            zoom: cameraRef.current.zoom,
            panX: clamped.panX,
            panY: clamped.panY,
          };
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (mode === 'PINCH' && e.touches.length === 1) {
        // Seamlessly transition remaining finger into pan mode without jumping
        const t = e.touches[0];
        mode = 'SINGLE';
        startClientX = t.clientX;
        startClientY = t.clientY;
        startPanX = cameraRef.current.panX;
        startPanY = cameraRef.current.panY;
        moved = true;
        return;
      }

      if (e.touches.length === 0) {
        if (mode === 'SINGLE' && !moved && !hadPinch && e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          lastTouchTapAtRef.current = performance.now();
          dispatchCanvasTapAtClientPoint(canvas, t.clientX, t.clientY);
        }
        mode = 'NONE';
        moved = false;
        hadPinch = false;
      }
    };

    const onTouchCancel = () => {
      mode = 'NONE';
      moved = false;
      hadPinch = false;
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [isGameplayStage, clampCameraPan, dispatchCanvasTapAtClientPoint]);

  const toCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) =>
    clientPointToUnifiedWorld(e.currentTarget, e.clientX, e.clientY);

  const onCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (leftMenuOpenRef.current) {
      setLeftMenuOpen(false);
      setShowChronicleDrawer(false);
    }
    // Middle-mouse or right-mouse drag to pan across the unified isometric grand map
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      panDragRef.current = {
        active: true,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: cameraRef.current.panX,
        startPanY: cameraRef.current.panY,
      };
    }
  };

  const onCanvasMouseUp = () => {
    panDragRef.current = null;
  };

  const onCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = panDragRef.current;
    if (drag && drag.active) {
      const canvas = e.currentTarget;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && canvas.width > 0 && canvas.height > 0) {
        const vt = getIsoViewportTransform(
          canvas.width,
          canvas.height,
          cameraRef.current,
          worldRef.current.shopLevel
        );
        const dxBuf = ((e.clientX - drag.startClientX) / rect.width) * canvas.width;
        const dyBuf = ((e.clientY - drag.startClientY) / rect.height) * canvas.height;
        const clamped = clampCameraPan(
          cameraRef.current.zoom,
          drag.startPanX - dxBuf / vt.scale,
          drag.startPanY - dyBuf / vt.scale
        );
        cameraRef.current = {
          zoom: cameraRef.current.zoom,
          panX: clamped.panX,
          panY: clamped.panY,
        };
      }
      return;
    }
    hoverPosRef.current = toCanvasCoords(e);
  };

  const onCanvasMouseLeave = () => {
    panDragRef.current = null;
    hoverPosRef.current = null;
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Ignore delayed synthetic browser click right after a handled touch tap
    if (performance.now() - lastTouchTapAtRef.current < 450) return;
    dispatchCanvasTapAtClientPoint(e.currentTarget, e.clientX, e.clientY);
  };

  const handleEnterCharacterSelect = () => {
    sound.playClick();
    setActiveOverlay(null);
    setLeftMenuOpen(false);
    setShowChronicleDrawer(false);
    setShowOnboardingIntro(false);
    setManualGuideOpen(false);
    worldRef.current = createInitialWorld('CHARACTER_SELECT', worldRef.current.characterId);
    forceUiSync();
  };

  const handleBackToMainMenu = () => {
    sound.playClick();
    keysPressedRef.current.clear();
    if (isActivePlayPhase(worldRef.current.phase)) {
      saveGameToSlot(worldRef.current, 'auto');
      syncWorldToEncyclopedia(worldRef.current);
    }
    setActiveOverlay(null);
    setLeftMenuOpen(false);
    setShowChronicleDrawer(false);
    setShowOnboardingIntro(false);
    setManualGuideOpen(false);
    resetCameraZoom();
    worldRef.current = createInitialWorld('MAIN_MENU', worldRef.current.characterId);
    refreshPersistentData();
    forceUiSync();
  };

  const handleConfirmCharacterAndPlay = (characterId: CharacterId) => {
    keysPressedRef.current.clear();
    setActiveOverlay(null);
    setLeftMenuOpen(false);
    setShowChronicleDrawer(false);
    setManualGuideOpen(false);
    resetCameraZoom();
    const freshWorld = createInitialWorld('PREP', characterId);
    freshWorld.onboardingStep = 0;
    worldRef.current = freshWorld;
    setShowOnboardingIntro(true);
    saveGameToSlot(worldRef.current, 'auto');
    refreshPersistentData();
    sound.playBell();
    forceUiSync();
  };

  const handleSaveSlot = (slotId: SaveSlotId) => {
    const meta = saveGameToSlot(worldRef.current, slotId);
    if (meta) {
      sound.playCoin();
      syncWorldToEncyclopedia(worldRef.current);
      addAlert(worldRef.current, `已手动保存经营进度至存档槽！`, 'success');
      refreshPersistentData();
      forceUiSync();
    }
  };

  const handleLoadSlot = (slotId: SaveSlotId) => {
    const loaded = loadGameFromSlot(slotId);
    if (!loaded) return;
    keysPressedRef.current.clear();
    setActiveOverlay(null);
    setShowChronicleDrawer(false);
    setShowOnboardingIntro(false);
    setManualGuideOpen(false);
    resetCameraZoom();
    syncSeasonalVisualState(loaded, false);
    worldRef.current = loaded;
    sound.setEnvironment(loaded.season, loaded.weather, true);
    sound.playBell();
    addAlert(worldRef.current, `已读取存档（第 ${loaded.day} 天 · Lv.${loaded.shopLevel}）！`, 'success');
    refreshPersistentData();
    forceUiSync();
  };

  const handleDeleteSlot = (slotId: SaveSlotId) => {
    deleteSaveSlot(slotId);
    sound.playClick();
    refreshPersistentData();
  };

  const handleOpenShop = () => {
    setActiveOverlay(null);
    openShopForBusiness(worldRef.current);
    if (worldRef.current.onboardingStep < 3) {
      worldRef.current.onboardingStep = 3;
    }
    forceUiSync();
  };

  const handleFinishClosing = () => {
    if (completeClosingAndSettle(worldRef.current, true)) {
      if (worldRef.current.onboardingStep < 9) {
        worldRef.current.onboardingStep = 9;
        markOnboardingCompleted();
      }
      setManualGuideOpen(false);
    }
    forceUiSync();
  };

  const handleTogglePause = () => {
    const w = worldRef.current;
    if (isActivePlayPhase(w.phase)) {
      w.pausedFromPhase = w.phase as 'PREP' | 'PLAYING' | 'CLOSING';
      w.phase = 'PAUSED';
    } else if (w.phase === 'PAUSED') {
      w.phase = w.pausedFromPhase;
    }
    forceUiSync();
  };

  const handleToggleSpeed = () => {
    const w = worldRef.current;
    w.speedMultiplier = w.speedMultiplier === 1 ? 2 : 1;
    sound.playClick();
    forceUiSync();
  };

  const handleToggleMute = () => {
    handleUpdateSettings({
      ...settingsRef.current,
      muted: !settingsRef.current.muted,
    });
  };

  const handleToggleBgm = () => {
    sound.playClick();
    handleUpdateSettings({
      ...settingsRef.current,
      bgmMuted: !settingsRef.current.bgmMuted,
    });
  };

  const handleOpenOverlay = (overlay: ActiveOverlay, tab?: ConfigTab) => {
    sound.playTabSwitch();
    keysPressedRef.current.clear();
    setLeftMenuOpen(false);
    setShowChronicleDrawer(false);
    if (tab) setConfigInitialTab(tab);
    if (overlay === 'CONFIG' && worldRef.current.onboardingStep < 2) {
      worldRef.current.onboardingStep = 2;
    }
    if (overlay === 'SAVE_LOAD' || overlay === 'ENCYCLOPEDIA') {
      if (isActivePlayPhase(worldRef.current.phase)) {
        syncWorldToEncyclopedia(worldRef.current);
      }
      refreshPersistentData();
    }
    setActiveOverlay(overlay);
  };

  const handleRefreshCandidates = () => {
    const w = worldRef.current;
    if (w.phase !== 'PREP') {
      addAlert(w, '刷新人才招募榜仅限在「开店前准备」阶段操作。', 'warning');
      forceUiSync();
      return;
    }
    if (w.cash < 40) {
      addAlert(w, '资金不足 ¥40，无法刷新人才市场。', 'warning');
      forceUiSync();
      return;
    }
    w.cash -= 40;
    w.candidates = generateCandidatePool(w.shopLevel, w.unlockedZones);
    sound.playClick();
    addAlert(w, '已花费 ¥40 刷新招聘人才池。', 'info');
    forceUiSync();
  };

  const handleClaimChapter = () => {
    if (claimCurrentChapter(worldRef.current)) {
      forceUiSync();
    }
  };

  const world = worldRef.current;
  const desiredBgmTrack = resolveBgmTrack(world, settings);
  const inGameplayAudio =
    world.phase !== 'MAIN_MENU' &&
    world.phase !== 'CHARACTER_SELECT' &&
    world.phase !== 'GAME_OVER';
  const prevSceneRef = useRef(world.activeScene);

  useEffect(() => {
    sound.setBgmTrack(desiredBgmTrack);
  }, [desiredBgmTrack]);

  useEffect(() => {
    sound.setEnvironment(world.season, world.weather, inGameplayAudio);
  }, [world.season, world.weather, inGameplayAudio]);

  useEffect(() => {
    if (prevSceneRef.current !== world.activeScene) {
      prevSceneRef.current = world.activeScene;
      if (inGameplayAudio) {
        sound.playBackstageDoor();
      }
    }
  }, [world.activeScene, inGameplayAudio]);

  if (world.phase === 'MAIN_MENU') {
    const hasAnySave = Object.values(saveSlots).some(Boolean);
    return (
      <>
        <MainMenuScreen
          bestDays={bestRecord.bestDays}
          bestCash={bestRecord.bestCash}
          autoSaveMeta={saveSlots.auto}
          hasAnySave={hasAnySave}
          platform={device.platform}
          pwa={pwa}
          onContinueAutoSave={() => handleLoadSlot('auto')}
          onStartGame={handleEnterCharacterSelect}
          onOpenLoadModal={() => handleOpenOverlay('SAVE_LOAD')}
          onOpenEncyclopedia={() => handleOpenOverlay('ENCYCLOPEDIA')}
          onOpenSettings={() => handleOpenOverlay('SETTINGS')}
        />
        <OfflineBanner isOffline={pwa.isOffline} />
        {activeOverlay === 'SAVE_LOAD' && (
          <SaveLoadModal
            mode="MAIN_MENU"
            slots={saveSlots}
            onLoadSlot={handleLoadSlot}
            onDeleteSlot={handleDeleteSlot}
            onClose={() => setActiveOverlay(null)}
          />
        )}
        {activeOverlay === 'ENCYCLOPEDIA' && (
          <EncyclopediaModal
            encyclopedia={encyclopedia}
            onClose={() => setActiveOverlay(null)}
          />
        )}
        {activeOverlay === 'SETTINGS' && (
          <SettingsModal
            settings={settings}
            activeBgmTrack={desiredBgmTrack}
            actualCanvasSize={actualCanvasSize}
            platform={device.platform}
            platformLabel={device.platformLabel}
            pwa={pwa}
            canFullscreen={device.canFullscreen}
            isFullscreen={device.isFullscreen}
            onToggleFullscreen={device.toggleFullscreen}
            onChange={handleUpdateSettings}
            onClose={() => setActiveOverlay(null)}
          />
        )}
      </>
    );
  }

  if (world.phase === 'CHARACTER_SELECT') {
    return (
      <>
        <CharacterSelectScreen
          initialCharacterId={world.characterId}
          onBackToMenu={handleBackToMainMenu}
          onConfirmStart={handleConfirmCharacterAndPlay}
        />
        <OfflineBanner isOffline={pwa.isOffline} />
        {activeOverlay === 'SETTINGS' && (
          <SettingsModal
            settings={settings}
            activeBgmTrack={desiredBgmTrack}
            actualCanvasSize={actualCanvasSize}
            platform={device.platform}
            platformLabel={device.platformLabel}
            pwa={pwa}
            canFullscreen={device.canFullscreen}
            isFullscreen={device.isFullscreen}
            onToggleFullscreen={device.toggleFullscreen}
            onChange={handleUpdateSettings}
            onClose={() => setActiveOverlay(null)}
          />
        )}
      </>
    );
  }

  const charDef = getCharacterDef(world.characterId);
  const readyTablesCount = world.tables.filter((t) => t.status === 'READY').length;
  const waitingBrothCount = world.tables.filter((t) => t.status === 'WAITING_BROTH').length;
  const lowBuffetCount = world.buffetSlots.filter((s) => s.stock <= 2).length;
  const dirtyTablesCount = world.tables.filter((t) => t.status === 'DIRTY').length;
  const needsTablewareCount = world.tables.filter((t) => t.status === 'NEEDS_TABLEWARE').length;

  const effectivePhase = world.phase === 'PAUSED' ? world.pausedFromPhase : world.phase;
  const closingProg = effectivePhase === 'CLOSING' ? getClosingProgress(world) : null;
  const chapterDef = MAIN_CHAPTERS[Math.min(world.mainChapter, MAIN_CHAPTERS.length) - 1];
  const chapterEval = evaluateChapterObjectives(world);
  const canClaimChapter = !world.mainStoryCompleted && chapterEval.allDone;
  const availableStaffQuests = getAvailableSpecialStaffQuests(world);
  const lowWarehouseDishesCount = world.buffetSlots.filter(
    (s) => (world.warehouseStock[s.itemId] ?? 0) <= 8
  ).length;
  const backstageUrgent =
    availableStaffQuests.length > 0 ||
    world.restroomCleanliness < 50 ||
    world.equipmentHealth < 50 ||
    world.rawIngredients < 8 ||
    (effectivePhase === 'CLOSING' && lowWarehouseDishesCount > 0);

  const dayProgress = Math.max(0, Math.min(1, world.dayTime / Math.max(1, world.dayDuration)));
  const orbCircumference = 2 * Math.PI * 52;
  const clockText = formatClock(world.dayTime, world.dayDuration, effectivePhase);
  const nearFailure = getNearFailureStatus(world);
  const daysToInspection = getDaysUntilNextInspection(world);
  const cityRanking = computeCityLeaderboard(world);
  const todayWeatherDef = getWeatherDef(world.weather);

  const hotbarItems: Array<{
    keyNum: string;
    action: QuickActionType;
    label: string;
    sub: string;
    accent: string;
    urgent: boolean;
  }> = [
    {
      keyNum: '1',
      action: 'WELCOME',
      label: '迎宾带位',
      sub:
        effectivePhase === 'PREP'
          ? '未开店'
          : effectivePhase === 'CLOSING'
            ? '已停迎'
            : `等${world.queue.length} · 空${readyTablesCount}`,
      accent: '#E8C97A',
      urgent: effectivePhase === 'PLAYING' && world.queue.length > 0 && readyTablesCount > 0,
    },
    {
      keyNum: '2',
      action: 'BROTH',
      label: '端锅上桌',
      sub: `待上 ${waitingBrothCount} 桌`,
      accent: '#FB923C',
      urgent: waitingBrothCount > 0,
    },
    {
      keyNum: '3',
      action: 'RESTOCK',
      label: '冰台补菜',
      sub: `低存 ${lowBuffetCount} 格`,
      accent: '#5EEAD4',
      urgent: lowBuffetCount > 0,
    },
    {
      keyNum: '4',
      action: 'CLEAR',
      label: '收拾脏桌',
      sub: `脏桌 ${dirtyTablesCount} 张`,
      accent: '#7DD3FC',
      urgent: dirtyTablesCount > 0,
    },
    {
      keyNum: '5',
      action: 'WASH',
      label: '洗碗清洗',
      sub: `待洗 ${world.dirtyDishes} 套`,
      accent: '#C4B5FD',
      urgent: world.dirtyDishes >= (effectivePhase === 'CLOSING' ? 1 : 3),
    },
    {
      keyNum: '6',
      action: 'SET',
      label: '摆放餐具',
      sub: `缺台 ${needsTablewareCount} · 净${world.cleanDishes}`,
      accent: '#86EFAC',
      urgent: needsTablewareCount > 0 && world.cleanDishes > 0,
    },
    {
      keyNum: '7',
      action: 'COOK',
      label: '烹制熟食',
      sub: `熟${world.cookedStock}/${world.cookedMaxStock} · 料${world.rawIngredients}`,
      accent: '#FDBA74',
      urgent: world.cookedStock <= 2,
    },
  ];

  const guideActive =
    !showOnboardingIntro &&
    !activeOverlay &&
    !world.pendingStoryModal &&
    nearFailure.level === 'NONE' &&
    (manualGuideOpen || (world.onboardingStep < 9 && world.day <= 2));
  const spotlightConfigBtn =
    guideActive && effectivePhase === 'PREP' && (world.onboardingStep === 0 || world.onboardingStep === 1);
  const spotlightOpenShopOrb =
    guideActive && effectivePhase === 'PREP' && world.onboardingStep === 2;
  const spotlightHotbar =
    guideActive && effectivePhase === 'PLAYING' && world.onboardingStep >= 3 && world.onboardingStep <= 5;
  const spotlightBackstageBtn =
    guideActive && effectivePhase === 'CLOSING' && world.onboardingStep === 7 && world.activeScene === 'DINING_HALL';
  const spotlightSettleOrb =
    guideActive && effectivePhase === 'CLOSING' && world.onboardingStep === 8;

  const canvasBoxStyle =
    settings.aspectRatio === 'auto'
      ? { width: '100%', height: '100%' }
      : { width: `${fittedWidth}px`, height: `${fittedHeight}px` };

  const hasLeftMenuNotice =
    spotlightConfigBtn ||
    canClaimChapter ||
    Boolean(world.activeRivalEvent) ||
    world.upgradePoints > 0;

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-[#0c1718] text-[#F7EFE2]">
      <OfflineBanner isOffline={pwa.isOffline} />
      {/* 100% Full-Viewport Edge-to-Edge 45° Isometric Stage + Layered Floating HUD Islands */}
      <main className="relative w-full h-full overflow-hidden bg-[#0c1718] isolate">
        {/* Layer 0 (z-0): Edge-to-Edge Adaptive Scene Canvas Container */}
        <div
          ref={stageRef}
          className="absolute inset-0 z-0 isolate flex items-center justify-center overflow-hidden"
        >
          <div
            style={canvasBoxStyle}
            className={
              settings.aspectRatio === 'auto'
                ? 'relative w-full h-full bg-[#0f1d1e]'
                : 'relative rounded-lg overflow-hidden border border-[#6e5534] shadow-[0_14px_44px_rgba(0,0,0,0.82)] bg-[#0f1d1e]'
            }
          >
            <canvas
              ref={canvasRef}
              onMouseDown={onCanvasMouseDown}
              onMouseUp={onCanvasMouseUp}
              onMouseMove={onCanvasMouseMove}
              onMouseLeave={onCanvasMouseLeave}
              onClick={onCanvasClick}
              onContextMenu={(e) => e.preventDefault()}
              className="touch-canvas w-full h-full block cursor-pointer"
            />
          </div>
        </div>

        {/* Layer 40 (z-40): Top Floating Translucent Status & Utility Islands */}
        <TopHud
          world={world}
          muted={settings.muted || settings.volume === 0}
          bgmMuted={settings.bgmMuted || settings.bgmVolume === 0}
          activeBgmTitle={BGM_TRACK_META[desiredBgmTrack].title}
          hudScale={hudLayout.topHudScale}
          compactLandscape={hudLayout.compactLandscape}
          canFullscreen={device.canFullscreen}
          isFullscreen={device.isFullscreen}
          onToggleFullscreen={device.toggleFullscreen}
          onTogglePause={handleTogglePause}
          onToggleSpeed={handleToggleSpeed}
          onToggleMute={handleToggleMute}
          onToggleBgm={handleToggleBgm}
          onOpenGuide={() => {
            sound.playClick();
            const w = worldRef.current;
            if (w.onboardingStep >= 9) {
              w.onboardingStep =
                w.phase === 'CLOSING' ? 7 : w.phase === 'PLAYING' ? 3 : 0;
            }
            setManualGuideOpen((v) => !v);
            forceUiSync();
          }}
          onOpenSaveLoad={() => handleOpenOverlay('SAVE_LOAD')}
          onOpenEncyclopedia={() => handleOpenOverlay('ENCYCLOPEDIA')}
          onOpenSettings={() => handleOpenOverlay('SETTINGS')}
          onOpenStory={() => handleOpenOverlay('STORY')}
          onOpenTechTree={() => handleOpenOverlay('CONFIG', 'TECH_TREE')}
          onOpenSystemMenu={() => handleOpenOverlay('SYSTEM_MENU')}
        />

        {/* ============================================================
            Layer 40 (z-40): TOP-LEFT CONSOLIDATED FLOATING MENU TRIGGER
            ============================================================ */}
        <div
          className="absolute z-40 flex flex-col items-start gap-2 pointer-events-none"
          style={{
            top: `calc(env(safe-area-inset-top, 0px) + ${hudLayout.topMenuTopPx}px)`,
            left: 'calc(env(safe-area-inset-left, 0px) + 10px)',
            ...(Math.abs(hudLayout.leftMenuScale - 1) > 0.005
              ? {
                  transform: `scale(${hudLayout.leftMenuScale})`,
                  transformOrigin: 'top left',
                }
              : {}),
          }}
        >
          {/* Single Master Button that Expands All Top-Left Labels */}
          <button
            onClick={() => {
              sound.playClick();
              setLeftMenuOpen((prev) => {
                if (prev) setShowChronicleDrawer(false);
                return !prev;
              });
            }}
            aria-expanded={leftMenuOpen}
            title={leftMenuOpen ? '收起掌柜功能菜单' : '点击展开门店配置、主线见闻、商战经营与堂口记事'}
            className={`pointer-events-auto hud-float backdrop-blur-md h-10 pl-1.5 pr-3 rounded-full inline-flex items-center gap-2 cursor-pointer transition-all ${
              spotlightConfigBtn
                ? 'border-[#FDE047] ring-2 ring-[#FDE047]/75 shadow-[0_0_20px_rgba(253,224,71,0.5)]'
                : leftMenuOpen
                  ? 'border-[#e8c97a] shadow-[0_10px_28px_rgba(0,0,0,0.65)]'
                  : 'hover:border-[#e8c97a]/90'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                leftMenuOpen || hasLeftMenuNotice
                  ? 'civ-medallion-gold'
                  : 'civ-medallion text-[#E8C97A]'
              }`}
            >
              {leftMenuOpen ? (
                <X className="w-3.5 h-3.5" />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5" />
              )}
            </span>
            <span className="font-display font-bold text-xs text-[#FFF6E5] whitespace-nowrap">
              掌柜菜单
            </span>
            {spotlightConfigBtn && !leftMenuOpen && (
              <span className="text-[10px] font-bold text-[#211208] bg-[#FDE047] px-1.5 py-0.5 rounded whitespace-nowrap">
                指引
              </span>
            )}
            {!spotlightConfigBtn &&
              (canClaimChapter || world.activeRivalEvent || world.upgradePoints > 0) &&
              !leftMenuOpen && (
                <span className="text-[10px] font-bold text-[#F6DA8D] font-mono-num whitespace-nowrap">
                  {world.activeRivalEvent
                    ? '挑衅'
                    : world.upgradePoints > 0
                      ? `天赋+${world.upgradePoints}点`
                      : '可领'}
                </span>
              )}
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#D6C3A8] transition-transform duration-150 ${
                leftMenuOpen ? 'rotate-180 text-[#F6DA8D]' : ''
              }`}
            />
          </button>

          {/* Expandable Frosted Floating Panel Containing All Top-Left Labels */}
          {leftMenuOpen && (
            <div className="pointer-events-auto flex flex-col sm:flex-row items-start gap-2 max-h-[calc(100dvh-160px)] overflow-y-auto no-scrollbar">
              <div className="hud-float backdrop-blur-md rounded-xl p-2 w-[min(276px,calc(100vw-24px))] flex flex-col gap-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.68)] shrink-0">
                {/* 1. Store Configuration */}
                <button
                  onClick={() =>
                    handleOpenOverlay(
                      'CONFIG',
                      effectivePhase !== 'PREP' && world.upgradePoints > 0 ? 'TECH_TREE' : 'POLICY'
                    )
                  }
                  title="打开门店配置中心：店面类型切换、菜单策略卡、天赋发展树、雇员团队 (快捷键 C)"
                  className={`w-full px-2.5 py-2 rounded-lg border flex items-center gap-2.5 text-left cursor-pointer transition-colors ${
                    spotlightConfigBtn
                      ? 'bg-[#3b2314]/88 border-[#FDE047] ring-1 ring-[#FDE047]/70'
                      : effectivePhase === 'PREP' || world.upgradePoints > 0
                        ? 'bg-[#2a1911]/72 border-[#d9b060]/65 hover:bg-[#382217]/90 hover:border-[#f0cf80]'
                        : 'bg-[#1f130d]/65 border-[#6b472b]/65 hover:bg-[#2d1c13]/85 hover:border-[#d9b060]/80'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      effectivePhase === 'PREP' || world.upgradePoints > 0
                        ? 'civ-medallion-gold'
                        : 'civ-medallion text-[#E8C97A]'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="font-display font-bold text-xs text-[#FFF6E5]">门店配置</span>
                      <span className="font-mono-num text-[10px] text-[#C5AE92]">[C]</span>
                      {spotlightConfigBtn ? (
                        <span className="text-[10px] font-bold text-[#211208] bg-[#FDE047] px-1.5 py-0.5 rounded">
                          指引 · 点此筹备
                        </span>
                      ) : world.upgradePoints > 0 ? (
                        <span className="text-[10px] font-bold font-mono-num text-[#211208] bg-[#E8C97A] px-1.5 py-0.5 rounded">
                          {world.upgradePoints}点可用
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[11px] font-mono-num text-[#E8C97A] truncate mt-0.5">
                      {world.upgradePoints > 0
                        ? `天赋树待加点 (${world.upgradePoints}点) · 店面与菜单`
                        : effectivePhase === 'PREP'
                          ? world.pendingOrders.length > 0
                            ? `店面·菜品·天赋树 · 排期${world.pendingOrders.length}`
                            : '店面类型 · 菜单卡 · 天赋树'
                          : world.pendingOrders.length > 0
                            ? `在办排期 ${world.pendingOrders.length} 项`
                            : '菜单配置 · 天赋树加点'}
                    </div>
                  </div>
                </button>

                {/* 2. Main Story & Discovered Encounters */}
                <button
                  onClick={() => handleOpenOverlay('STORY')}
                  title="查看创业主线、特殊店员个人线与已发现奇遇"
                  className={`w-full px-2.5 py-2 rounded-lg border flex items-center gap-2.5 text-left cursor-pointer transition-colors ${
                    canClaimChapter
                      ? 'bg-[#2a1911]/78 border-[#e8c97a]/75 hover:bg-[#382217]/90'
                      : 'bg-[#1f130d]/65 border-[#6b472b]/65 hover:bg-[#2d1c13]/85 hover:border-[#d9b060]/80'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      canClaimChapter ? 'civ-medallion-gold' : 'civ-medallion text-[#F6DA8D]'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-display font-bold text-xs text-[#FFF6E5] whitespace-nowrap">
                        主线见闻
                      </span>
                      {canClaimChapter && (
                        <span className="text-[10px] font-bold text-[#211208] bg-[#E8C97A] px-1.5 py-0.5 rounded whitespace-nowrap">
                          可领赏
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#D6C3A8] truncate mt-0.5">
                      {world.mainStoryCompleted
                        ? '无尽传奇 · 可重温结局'
                        : `第${world.mainChapter}/${MAIN_CHAPTERS.length}章 · ${chapterDef.title.replace(/^第.+?章\s*·\s*/, '')}`}
                    </div>
                  </div>
                </button>

                {/* 3. Business Hub */}
                <button
                  onClick={() => handleOpenOverlay('BUSINESS')}
                  title="打开商战经营总台：营销推广、小微贷款、前厅装潢定制、全城榜单与7日复盘报表 (快捷键 B)"
                  className={`w-full px-2.5 py-2 rounded-lg border flex items-center gap-2.5 text-left cursor-pointer transition-colors ${
                    world.activeRivalEvent
                      ? 'bg-[#2f1414]/82 border-[#f87171]/80 hover:bg-[#3d1919]/92'
                      : 'bg-[#1f130d]/65 border-[#6b472b]/65 hover:bg-[#2d1c13]/85 hover:border-[#d9b060]/80'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      world.activeRivalEvent || world.holiday !== 'NONE'
                        ? 'civ-medallion-gold'
                        : 'civ-medallion text-[#6EE7B7]'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="font-display font-bold text-xs text-[#FFF6E5]">商战经营</span>
                      <span className="font-mono-num text-[10px] text-[#C5AE92]">[B]</span>
                    </div>
                    <div className="text-[11px] font-mono-num text-[#86EFAC] truncate mt-0.5">
                      {world.activeRivalEvent
                        ? `⚔ 对手挑衅 · 全城#${cityRanking.playerRank}`
                        : world.activeMarketing
                          ? `推广中 · 全城#${cityRanking.playerRank}`
                          : `全城#${cityRanking.playerRank} · ${todayWeatherDef.shortName} · 装潢/报表`}
                    </div>
                  </div>
                </button>

                {/* 4. Chronicle / Alerts / Penalty Redline */}
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowChronicleDrawer((v) => !v);
                  }}
                  title="展开/收起堂口记事、排期与惩罚红线"
                  className={`w-full px-2.5 py-2 rounded-lg border flex items-center gap-2.5 text-left cursor-pointer transition-colors ${
                    showChronicleDrawer
                      ? 'bg-[#2e1c13]/88 border-[#f4d689]/85'
                      : 'bg-[#1f130d]/65 border-[#6b472b]/65 hover:bg-[#2d1c13]/85 hover:border-[#d9b060]/80'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      showChronicleDrawer
                        ? 'civ-medallion border-[#f4d689] text-[#FFF6E5]'
                        : 'civ-medallion text-[#E5C9A8]'
                    }`}
                  >
                    <ScrollText className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-display font-bold text-xs text-[#FFF6E5] whitespace-nowrap">
                        堂口记事
                      </span>
                      <span className="text-[10px] text-[#C5AE92] whitespace-nowrap">
                        {showChronicleDrawer ? '收起' : '查看'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono-num text-[#D6C3A8] truncate mt-0.5">
                      今日已迎 {world.todayStats.guestsServed} 桌 · 违规 {world.penaltyStrikes}/{world.maxPenaltyStrikes}
                    </div>
                  </div>
                </button>
              </div>

              {/* Compact Collapsible World Tracker / Chronicle Drawer Beside/Below Menu */}
              {showChronicleDrawer && (
                <div className="w-[min(320px,calc(100vw-24px))] sm:w-[332px] sm:max-w-[calc(100vw-310px)] max-h-[42dvh] sm:max-h-[54dvh] hud-float backdrop-blur-md rounded-xl overflow-hidden flex flex-col shrink-0">
              <div className="px-3.5 py-2.5 bg-[#24150e] border-b border-[#6b472b] flex items-center justify-between">
                <span className="font-display text-xs font-bold text-[#E8C97A]">
                  堂口动态 · 排期与红线
                </span>
                <button
                  onClick={() => setShowChronicleDrawer(false)}
                  className="text-[#C5AE92] hover:text-[#FFF6E5] cursor-pointer"
                  aria-label="收起记事"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 overflow-y-auto space-y-3 text-xs">
                {world.pendingOrders.length > 0 && (
                  <div className="game-inset p-2.5 rounded-lg space-y-1">
                    <div className="text-[11px] font-bold text-[#E8C97A] flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5" />
                      在办排期 ({world.pendingOrders.length})
                    </div>
                    {world.pendingOrders.slice(0, 4).map((ord) => (
                      <div key={ord.id} className="flex justify-between gap-2 text-[11px]">
                        <span className="text-[#D6DFEB] truncate">{ord.title}</span>
                        <span className="font-mono-num text-[#E8C97A] shrink-0">
                          {ord.daysRemaining === 1 ? '明晨' : `余${ord.daysRemaining}天`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="game-inset p-2.5 rounded-lg space-y-1 text-[11px] text-[#D6C3A8]">
                  <div className="font-bold text-[#FCA5A5] flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    经营红线
                  </div>
                  <div className="flex justify-between">
                    <span>违规处罚记点（满5失败）</span>
                    <span className="font-mono-num font-bold text-[#FFF6E5]">
                      {world.penaltyStrikes}/{world.maxPenaltyStrikes}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>逃单 / 断供累计（每满3记+1）</span>
                    <span className="font-mono-num">
                      {world.totalWalkouts} / {world.totalStockoutComplaints}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>距下次半月联合检查</span>
                    <span className="font-mono-num font-bold text-[#F6DA8D]">
                      {daysToInspection === 0 ? '今晚闭店后' : `还有 ${daysToInspection} 天`}
                    </span>
                  </div>
                  <div className="text-[#B59876] pt-0.5">
                    卫生低于35触发整改；单日逃单≤1且卫生≥78撤1点违规（前2日免记违规）。
                  </div>
                </div>

                <div className="space-y-1 divide-y divide-[#4a3020]">
                  {world.alerts.slice(0, 10).map((al) => (
                    <div key={al.id} className="pt-1.5 flex gap-2 items-start text-[11px]">
                      <span className="font-mono-num text-[#9E856B] shrink-0">{al.timeText}</span>
                      <span
                        className={
                          al.severity === 'penalty'
                            ? 'text-[#FCA5A5]'
                            : al.severity === 'warning'
                              ? 'text-[#FCD34D]'
                              : al.severity === 'success'
                                ? 'text-[#86EFAC]'
                                : 'text-[#EFE2D0]'
                        }
                      >
                        {al.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
            </div>
          )}
        </div>

        {/* DAY-1 FULL 3-STAGE INTERACTIVE ONBOARDING GUIDE */}
        {(showOnboardingIntro ||
          (!activeOverlay && !world.pendingStoryModal && nearFailure.level === 'NONE')) && (
          <OnboardingGuide
            world={world}
            forceOpen={manualGuideOpen}
            showIntroModal={showOnboardingIntro}
            topOffsetPx={hudLayout.topMenuTopPx}
            hudScale={hudLayout.leftMenuScale}
            onConfirmStartGuide={() => {
              sound.playClick();
              setShowOnboardingIntro(false);
              worldRef.current.onboardingStep = 0;
              forceUiSync();
            }}
            onSetStep={(nextStep) => {
              sound.playClick();
              worldRef.current.onboardingStep = Math.max(0, Math.min(8, nextStep));
              forceUiSync();
            }}
            onSkipAll={() => {
              sound.playClick();
              setShowOnboardingIntro(false);
              worldRef.current.onboardingStep = 9;
              markOnboardingCompleted();
              setManualGuideOpen(false);
              forceUiSync();
            }}
            onOpenConfig={() => handleOpenOverlay('CONFIG', 'POLICY')}
            onEnterBackstage={() => {
              enterBackstageScene(worldRef.current);
              if (worldRef.current.phase === 'CLOSING' && worldRef.current.onboardingStep === 7) {
                worldRef.current.onboardingStep = 8;
              }
              forceUiSync();
            }}
            onOpenBusiness={() => handleOpenOverlay('BUSINESS')}
          />
        )}

        {/* ============================================================
            NEAR-FAILURE SCREEN WARNING VIGNETTE & CRISIS ALERT STRIP
            ============================================================ */}
        {nearFailure.level !== 'NONE' && (
          <>
            <div
              className={`pointer-events-none fixed inset-0 z-20 ${
                nearFailure.level === 'CRITICAL'
                  ? 'danger-vignette-critical'
                  : 'danger-vignette-warning'
              }`}
            />
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-40 max-w-[620px] w-[92vw] sm:w-max"
              style={{
                top: `calc(env(safe-area-inset-top, 0px) + ${hudLayout.alertTopPx}px)`,
              }}
            >
              <div
                className={`rounded-xl px-4 py-2 border-2 shadow-2xl backdrop-blur-md flex items-center gap-2.5 ${
                  nearFailure.level === 'CRITICAL'
                    ? 'bg-[#3b0b0b]/94 border-[#f87171] animate-pulse'
                    : 'bg-[#331909]/92 border-[#f59e0b]'
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 ${
                    nearFailure.level === 'CRITICAL' ? 'text-[#FCA5A5]' : 'text-[#FCD34D]'
                  }`}
                />
                <div className="min-w-0 text-xs leading-snug">
                  <div
                    className={`font-display font-bold ${
                      nearFailure.level === 'CRITICAL' ? 'text-[#FEE2E2]' : 'text-[#FEF3C7]'
                    }`}
                  >
                    {nearFailure.level === 'CRITICAL' ? '⚠ 经营濒临失败预警：' : '⚠ 经营风险预警：'}
                    {nearFailure.reasons[0].title}
                    {nearFailure.reasons.length > 1
                      ? `（另有 ${nearFailure.reasons.length - 1} 项告急）`
                      : ''}
                  </div>
                  <div className="text-[11px] text-[#FDE68A]/90 truncate">
                    {nearFailure.reasons[0].tip}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================
            BOTTOM HUD: DINING HALL HOTBAR OR WALKABLE BACKSTAGE DOCK
            (Dynamically scaled & positioned via media queries so bottom hotbar never obscures key scene content)
            ============================================================ */}
        {world.activeScene === 'DINING_HALL' ? (
          (() => {
            const isCollapsed = hudLayout.isMobile && hotbarCollapsed && !spotlightHotbar;
            const urgentCount = hotbarItems.filter((item) => item.urgent).length;
            const hotbarIsScaled = Math.abs(hudLayout.hotbarScale - 1) > 0.005;
            const hotbarMaxWidthExpr = hudLayout.hotbarSideBySideWithOrb
              ? `calc((100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px) - ${hudLayout.hotbarRightReservePx + 18}px) / ${hudLayout.hotbarScale})`
              : `calc((100vw - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px) - 20px) / ${hudLayout.hotbarScale})`;

            return (
              <div
                className="absolute z-30 pointer-events-none"
                style={{
                  left: 'calc(env(safe-area-inset-left, 0px) + 10px)',
                  bottom: `calc(env(safe-area-inset-bottom, 0px) + ${hudLayout.hotbarBottomPx}px)`,
                  width: isCollapsed
                    ? 'auto'
                    : hudLayout.hotbarSideBySideWithOrb
                      ? undefined
                      : hotbarMaxWidthExpr,
                  maxWidth: isCollapsed ? undefined : hotbarMaxWidthExpr,
                  ...(hotbarIsScaled
                    ? {
                        transform: `scale(${hudLayout.hotbarScale})`,
                        transformOrigin: 'bottom left',
                      }
                    : {}),
                }}
              >
                {spotlightHotbar && (
                  <div className="mb-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FDE047] text-[#211208] text-[11px] font-black shadow-lg">
                    <span>
                      {world.onboardingStep === 3
                        ? '👇 指引：先点「迎宾带位」，再点「端锅上桌」'
                        : world.onboardingStep === 4
                          ? '👇 指引：点「冰台补菜」补海鲜，点「烹制熟食」出热菜'
                          : '👇 指引：客人离席后依次点「收桌 → 洗碗 → 摆台」'}
                    </span>
                  </div>
                )}

                {isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setHotbarCollapsed(false);
                    }}
                    className="pointer-events-auto hud-float backdrop-blur-md rounded-full px-3.5 py-2 min-h-[40px] inline-flex items-center gap-2 text-xs font-bold text-[#FFF6E5] border-[#d9b060]/80 cursor-pointer shadow-lg"
                    title="展开底部快捷调度栏"
                  >
                    <ChevronUp className="w-4 h-4 text-[#E8C97A] shrink-0" />
                    <span className="font-display whitespace-nowrap">快捷调度</span>
                    {urgentCount > 0 && (
                      <span className="font-mono-num text-[10px] font-black bg-[#FDE047] text-[#211208] px-1.5 py-0.5 rounded">
                        {urgentCount}待办
                      </span>
                    )}
                    <span className="font-mono-num text-[11px] text-[#E8C97A] whitespace-nowrap">
                      {CARRY_LABEL[world.player.carrying]}
                    </span>
                  </button>
                ) : (
                  <div
                    className={`pointer-events-auto hud-float backdrop-blur-md rounded-xl flex flex-col ${
                      hudLayout.hotbarCompact
                        ? 'px-2 py-1.5 gap-1'
                        : 'px-2.5 sm:px-3 py-1.5 sm:py-2 gap-1.5'
                    } ${
                      spotlightHotbar
                        ? 'border-2 border-[#FDE047] shadow-[0_0_24px_rgba(253,224,71,0.4)]'
                        : ''
                    }`}
                  >
                    {/* Hide verbose status row in ultra-compact landscape/16:9 phones to protect vertical scene visibility */}
                    {!hudLayout.hotbarCompact && (
                      <div className="flex items-center justify-between gap-2 sm:gap-3 text-[11px] px-0.5">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <span className="font-display font-bold text-[#FFF6E5] whitespace-nowrap">
                            {charDef.name}
                          </span>
                          <span className="text-[#8a6544]">·</span>
                          <span className="text-[#E8C97A] font-semibold whitespace-nowrap truncate">
                            手持：{CARRY_LABEL[world.player.carrying]}
                            {world.player.carryAmount > 0 ? ` ×${world.player.carryAmount}` : ''}
                          </span>
                          <span className="text-[#C5AE92] truncate hidden sm:inline">
                            — {world.player.activeTaskLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono-num text-[#D6C3A8] whitespace-nowrap">
                            今日{' '}
                            <strong className="text-[#F6DA8D]">
                              ¥{(world.todayStats.ticketRevenue + world.todayStats.tipRevenue).toLocaleString()}
                            </strong>
                          </span>
                          {hudLayout.isMobile && !spotlightHotbar && (
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                setHotbarCollapsed(true);
                              }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#271810] border border-[#6b472b] text-[10px] text-[#DFCDB6] hover:text-[#FFF6E5] cursor-pointer whitespace-nowrap"
                              title="收起快捷栏以查看完整厅堂"
                            >
                              <ChevronDown className="w-3 h-3" />
                              <span>收起</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex lg:grid lg:grid-cols-7 gap-1.5 overflow-x-auto no-scrollbar touch-scroll pb-0.5 lg:pb-0 items-stretch">
                      {hudLayout.hotbarCompact && hudLayout.isMobile && !spotlightHotbar && (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setHotbarCollapsed(true);
                          }}
                          className="game-btn-wood px-2 py-1 min-h-[42px] rounded-lg flex flex-col items-center justify-center text-[#DFCDB6] cursor-pointer shrink-0"
                          title="收起快捷栏以查看完整厅堂"
                          aria-label="收起快捷栏"
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-[#E8C97A]" />
                          <span className="text-[9px] font-semibold whitespace-nowrap">收起</span>
                        </button>
                      )}
                      {hotbarItems.map((item) => (
                        <button
                          key={item.action}
                          onClick={() => handleQuickAction(item.action)}
                          className={`game-btn-wood rounded-lg text-left cursor-pointer shrink-0 lg:shrink ${
                            hudLayout.hotbarCompact
                              ? 'px-2 py-1 min-h-[42px] min-w-[76px]'
                              : 'px-2.5 lg:px-2 py-1.5 min-h-[44px] lg:min-h-0 min-w-[84px]'
                          } ${item.urgent ? 'border-[#e8c97a]' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className="text-xs font-bold whitespace-nowrap"
                              style={{ color: item.accent }}
                            >
                              {item.label}
                            </span>
                            {!device.isTouchDevice && (
                              <span className="font-mono-num text-[10px] text-[#C5AE92] bg-[#160c08] border border-[#593b25] px-1 rounded">
                                {item.keyNum}
                              </span>
                            )}
                          </div>
                          <div className="font-mono-num text-[10px] text-[#DFCDB6] mt-0.5 truncate">
                            {item.sub}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <BackstageRoomDock
            world={world}
            isTouchDevice={device.isTouchDevice}
            hudScale={hudLayout.hotbarScale}
            compactLayout={hudLayout.hotbarCompact}
            bottomOffsetPx={hudLayout.backstageDockBottomPx}
            rightReservePx={
              hudLayout.hotbarSideBySideWithOrb ? hudLayout.hotbarRightReservePx : 0
            }
            onExitBackstage={() => {
              exitBackstageToDiningHall(worldRef.current);
              forceUiSync();
            }}
            onWalkToRoom={(roomId) => {
              const r = getBackstageRoomRect(roomId);
              handleBackstageCanvasClick(worldRef.current, r.consoleX, r.consoleY);
              forceUiSync();
            }}
            onPerformRoomAction={(roomId) => {
              performFacilityAction(worldRef.current, roomId);
              forceUiSync();
            }}
            onTriggerRoomStory={(roomId) => {
              triggerFacilitySceneStory(worldRef.current, roomId);
              forceUiSync();
            }}
            onTriggerRecruitmentSideStory={(staffId) => {
              triggerSpecialStaffRecruitmentSideStory(worldRef.current, staffId);
              forceUiSync();
            }}
            onTriggerSpecialQuest={(staffId) => {
              triggerSpecialStaffQuest(worldRef.current, staffId);
              forceUiSync();
            }}
            onInteractSpecialStaff={(staffId, mode) => {
              interactWithSpecialStaff(worldRef.current, staffId, mode);
              forceUiSync();
            }}
            onConfessOrPropose={(staffId) => {
              confessOrProposeSpecialStaff(worldRef.current, staffId);
              forceUiSync();
            }}
            onSpendTimePartner={(staffId, fulfillWish) => {
              spendTimeWithPartner(worldRef.current, staffId, fulfillWish);
              forceUiSync();
            }}
            onProcureIngredients={(amount) => {
              procureRawIngredients(worldRef.current, amount);
              forceUiSync();
            }}
            onPlaceWarehouseOrder={(itemId, quantity) => {
              placeClosingProcurementOrder(worldRef.current, itemId, quantity);
              forceUiSync();
            }}
            onPostPartTime={(jobId) => {
              postPartTimeJob(worldRef.current, jobId);
              forceUiSync();
            }}
          />
        )}

        {/* ============================================================
            BOTTOM-RIGHT ICONIC CIRCULAR PHASE & ACTION ORB
            (Dynamically scaled & positioned via media queries to stay clear of the bottom hotbar)
            ============================================================ */}
        <div
          className="absolute z-30 flex items-end gap-2 md:gap-2.5 pointer-events-none transition-[bottom] duration-200"
          style={{
            right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
            bottom: `calc(env(safe-area-inset-bottom, 0px) + ${
              world.activeScene === 'BACKSTAGE'
                ? hudLayout.orbBottomBackstagePx
                : hudLayout.isMobile &&
                    hotbarCollapsed &&
                    !spotlightHotbar &&
                    !hudLayout.hotbarSideBySideWithOrb
                  ? hudLayout.hotbarBottomPx
                  : hudLayout.orbBottomDiningPx
            }px)`,
            ...(Math.abs(hudLayout.orbScale - 1) > 0.005
              ? {
                  transform: `scale(${hudLayout.orbScale})`,
                  transformOrigin: 'bottom right',
                }
              : {}),
          }}
        >
          {/* Quick Open Config Dock beside the Turn Orb during PREP */}
          {effectivePhase === 'PREP' && world.activeScene === 'DINING_HALL' && (
            <button
              onClick={() => handleOpenOverlay('CONFIG', 'POLICY')}
              className="pointer-events-auto mb-3 hud-float backdrop-blur-md hover:border-[#e8c97a] px-4 py-2 rounded-lg text-left cursor-pointer hidden xl:block transition-colors"
            >
              <div className="flex items-center gap-1.5 font-display font-bold text-xs text-[#E8C97A] whitespace-nowrap">
                <Store className="w-3.5 h-3.5" />
                门店配置中心
              </div>
              <div className="text-[11px] text-[#DFCDB6] mt-0.5 whitespace-nowrap">
                店面类型 · 菜单卡 · 天赋树
                {world.upgradePoints > 0
                  ? ` (${world.upgradePoints}点待用)`
                  : world.pendingOrders.length > 0
                    ? ` (${world.pendingOrders.length}排期)`
                    : ''}
              </div>
            </button>
          )}

          {/* Unified Grand Map Camera Preset & Zoom Controls */}
          <div className="pointer-events-auto mb-1.5 md:mb-3 flex items-center gap-1 hud-float backdrop-blur-md rounded-lg p-1">
            <button
              onClick={() => {
                sound.playClick();
                resetCameraZoom();
              }}
              title="复位全图视角（同时俯瞰前厅大堂与7大后场房间）"
              className={`px-2 py-1.5 md:py-1 rounded text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                zoomPercent === 100
                  ? 'bg-[#3b2517] text-[#F6DA8D] border border-[#c4974b]'
                  : 'text-[#DFCDB6] hover:text-[#FFF6E5]'
              }`}
            >
              全景 {zoomPercent}%
            </button>
            <button
              onClick={() => {
                sound.playClick();
                if (worldRef.current.activeScene === 'BACKSTAGE') {
                  exitBackstageToDiningHall(worldRef.current);
                }
                focusFrontHallCamera();
                forceUiSync();
              }}
              title="推进镜头聚焦前厅自助大堂"
              className="px-2 py-1.5 md:py-1 rounded text-[11px] font-semibold text-[#DFCDB6] hover:text-[#FFF6E5] hover:bg-[#2a1a12] cursor-pointer whitespace-nowrap"
            >
              前厅
            </button>
            <button
              onClick={() => {
                sound.playClick();
                if (worldRef.current.activeScene !== 'BACKSTAGE') {
                  enterBackstageScene(worldRef.current);
                }
                if (worldRef.current.phase === 'CLOSING' && worldRef.current.onboardingStep === 7) {
                  worldRef.current.onboardingStep = 8;
                }
                focusBackstageCamera();
                forceUiSync();
              }}
              title="推进镜头聚焦后场 7 大功能区 (快捷键 M)"
              className={`px-2 py-1.5 md:py-1 rounded text-[11px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                spotlightBackstageBtn
                  ? 'bg-[#FDE047] text-[#211208] font-bold shadow-[0_0_14px_rgba(253,224,71,0.75)]'
                  : backstageUrgent
                    ? 'text-[#F6DA8D] bg-[#362214] border border-[#d9b060]/80 hover:bg-[#442b1a]'
                    : 'text-[#99F6E4] hover:text-[#CCFBF1] hover:bg-[#192c2d]'
              }`}
            >
              后场
              {effectivePhase === 'CLOSING' && lowWarehouseDishesCount > 0 ? `(${lowWarehouseDishesCount}缺)` : ''}
            </button>
          </div>

          {/* Giant Circular Action Orb (Scaled cleanly on mobile phones) */}
          <div className="pointer-events-auto relative w-[82px] h-[82px] md:w-[116px] md:h-[116px] flex items-center justify-center shrink-0">
            {(spotlightOpenShopOrb || spotlightSettleOrb) && (
              <div className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap bg-[#FDE047] text-[#211208] font-black text-[11px] px-2.5 py-1 rounded shadow-[0_4px_16px_rgba(0,0,0,0.6)] animate-bounce">
                {spotlightOpenShopOrb ? '👇 指引：点此正式开店' : '👇 指引：点此手动打烊结算'}
              </div>
            )}
            {/* Outer SVG Radial Clock / Progress Ring */}
            <svg
              viewBox="0 0 116 116"
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
            >
              <circle
                cx="58"
                cy="58"
                r="52"
                fill="none"
                stroke="rgba(24, 13, 8, 0.88)"
                strokeWidth="5"
              />
              {effectivePhase === 'PLAYING' && (
                <circle
                  cx="58"
                  cy="58"
                  r="52"
                  fill="none"
                  stroke={world.rushHourActive ? '#F87171' : '#E8C97A'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={orbCircumference}
                  strokeDashoffset={orbCircumference * (1 - dayProgress)}
                />
              )}
            </svg>

            {effectivePhase === 'PREP' && (
              <button
                onClick={handleOpenShop}
                className={`civ-turn-orb w-[70px] h-[70px] md:w-[100px] md:h-[100px] rounded-full flex flex-col items-center justify-center text-center cursor-pointer px-1.5 md:px-2 ${
                  spotlightOpenShopOrb
                    ? 'ring-4 ring-[#FDE047] shadow-[0_0_28px_rgba(253,224,71,0.85)] animate-pulse'
                    : ''
                }`}
                title="结束筹备并挂牌正式开店营业"
              >
                <Sun className="w-4 h-4 md:w-5 md:h-5 text-[#F6DA8D] mb-0.5" />
                <span className="font-display font-black text-xs md:text-base text-[#FFF9EE] leading-tight">
                  正式开店
                </span>
                <span className="font-mono-num text-[9px] md:text-[10px] text-[#FFE8C8] mt-0.5">
                  第 {world.day} 天
                </span>
              </button>
            )}

            {effectivePhase === 'PLAYING' && (
              <div
                className="civ-turn-orb-idle w-[70px] h-[70px] md:w-[100px] md:h-[100px] rounded-full flex flex-col items-center justify-center text-center px-1.5 md:px-2"
                title="今日营业倒计时（11:00 - 22:00）"
              >
                <span className="text-[9px] md:text-[10px] font-bold text-[#C5AE92]">
                  {world.rushHourActive ? '高峰' : '营业中'}
                </span>
                <span className="font-mono-num font-bold text-sm md:text-xl text-[#FFF6E5] leading-tight mt-0.5">
                  {clockText}
                </span>
                <span className="font-mono-num text-[9px] md:text-[10px] text-[#E8C97A] mt-0.5">
                  第 {world.day} 天
                </span>
              </div>
            )}

            {effectivePhase === 'CLOSING' && closingProg && (
              <button
                onClick={handleFinishClosing}
                disabled={!closingProg.canFinishEarly}
                className={`w-[70px] h-[70px] md:w-[100px] md:h-[100px] rounded-full flex flex-col items-center justify-center text-center px-1.5 md:px-2 ${
                  closingProg.canFinishEarly
                    ? 'civ-turn-orb-gold cursor-pointer'
                    : 'civ-turn-orb-idle cursor-not-allowed'
                } ${
                  spotlightSettleOrb && closingProg.canFinishEarly
                    ? 'ring-4 ring-[#FDE047] shadow-[0_0_28px_rgba(253,224,71,0.85)] animate-pulse'
                    : ''
                }`}
                title={
                  closingProg.allClean
                    ? '全厅已清扫完毕！请手动点击进入本日结算总簿（不会自动跳转）'
                    : closingProg.canFinishEarly
                      ? '可随时手动点击打烊结算（继续清完脏桌脏碗可获额外卫生奖励）'
                      : '需接待完店内余客后方可手动打烊结算'
                }
              >
                <Moon
                  className={`w-3.5 h-3.5 md:w-4 md:h-4 mb-0.5 ${
                    closingProg.canFinishEarly ? 'text-[#211208]' : 'text-[#F6DA8D]'
                  }`}
                />
                <span
                  className={`font-display font-black text-xs md:text-sm leading-tight ${
                    closingProg.canFinishEarly ? 'text-[#211208]' : 'text-[#FFF6E5]'
                  }`}
                >
                  {closingProg.allClean
                    ? '手动结算'
                    : closingProg.canFinishEarly
                      ? '打烊结算'
                      : '闭店收尾'}
                </span>
                <span
                  className={`font-mono-num text-[9px] md:text-[10px] mt-0.5 ${
                    closingProg.canFinishEarly ? 'text-[#3A220B] font-bold' : 'text-[#E8C97A]'
                  }`}
                >
                  {closingProg.allClean
                    ? '全清就绪'
                    : closingProg.canFinishEarly
                      ? `余脏 ${closingProg.dirtyTables + closingProg.dirtyDishes}`
                      : `余客 ${closingProg.seatedGuests} 桌`}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* SYSTEM MENU MODAL (triggered by top-right Home icon button or Escape) */}
        {activeOverlay === 'SYSTEM_MENU' && (
          <div
            onClick={() => {
              sound.playClick();
              setActiveOverlay(null);
            }}
            className="absolute inset-0 z-50 bg-[#0c0604]/76 backdrop-blur-[4px] flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="game-panel rounded-xl px-6 sm:px-7 py-5 sm:py-6 text-center space-y-4 max-w-sm w-full border border-[#c9a45c]/75 max-h-[90dvh] overflow-y-auto touch-scroll"
            >
              <div>
                <h2 className="font-display text-2xl font-bold text-[#FFF6E5]">系统菜单</h2>
                <p className="text-[11px] text-[#C5AE92] mt-1 font-mono-num">
                  第 {world.day} 天 · {charDef.name} · 资金 ¥{Math.round(world.cash).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  onClick={() => {
                    sound.playClick();
                    setActiveOverlay(null);
                  }}
                  className="game-btn-primary w-full min-h-[44px] py-2.5 rounded-lg font-display font-bold text-sm cursor-pointer"
                >
                  {device.isTouchDevice ? '继续经营' : '继续经营 [Esc]'}
                </button>
                <button
                  onClick={() => handleOpenOverlay('CONFIG', 'POLICY')}
                  className="game-btn-wood w-full min-h-[44px] py-2.5 rounded-lg font-semibold text-xs text-[#E8C97A] cursor-pointer"
                >
                  {device.isTouchDevice ? '门店配置中心' : '门店配置中心 [C]'}
                </button>
                <button
                  onClick={() => handleOpenOverlay('SAVE_LOAD')}
                  className="game-btn-wood w-full min-h-[44px] py-2.5 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  存档 / 读档
                </button>
                <button
                  onClick={() => handleOpenOverlay('SETTINGS')}
                  className="game-btn-wood w-full min-h-[44px] py-2.5 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  画面与音效设置
                </button>
                <PWAInstallButton platform={device.platform} pwa={pwa} variant="menu" />
                <button
                  onClick={handleBackToMainMenu}
                  className="game-btn-wood w-full min-h-[44px] py-2.5 rounded-lg font-semibold text-xs text-[#FCA5A5] cursor-pointer"
                >
                  返回主菜单
                </button>
              </div>
              <div className="pt-2 border-t border-[#5a3b24]/65 text-[10px] text-[#B89E82] leading-relaxed">
                {device.isTouchDevice
                  ? '单指拖动平移地图 · 双指捏合缩放视野 · 点击工位或底部快捷栏即时调度'
                  : 'WASD 移动 · 1–7 快捷调度 · M 切后场 · B 商战 · P 暂停 · 滚轮缩放 · 右键拖拽视角'}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* UNIFIED DEDICATED STORE CONFIGURATION PAGE (Civ 6 Policy Cards & 5-Stage Tech Tree) */}
      {activeOverlay === 'CONFIG' && (
        <StoreConfigModal
          world={world}
          initialTab={configInitialTab}
          onClose={() => setActiveOverlay(null)}
          onOpenShopAndClose={handleOpenShop}
          onEnterBackstageOffice={() => {
            setActiveOverlay(null);
            enterBackstageScene(worldRef.current, 'office');
            forceUiSync();
          }}
          onEquipPolicyCard={(slotId, cardId) => {
            equipPolicyCard(worldRef.current, slotId, cardId);
            forceUiSync();
          }}
          onUnequipPolicySlot={(slotId) => {
            unequipPolicySlot(worldRef.current, slotId);
            forceUiSync();
          }}
          onAutoSlotPolicyCard={(cardId) => {
            autoSlotPolicyCard(worldRef.current, cardId);
            forceUiSync();
          }}
          onAssignZonePad={(padId, zoneId) => {
            assignZoneToPad(worldRef.current, padId, zoneId);
            forceUiSync();
          }}
          onPurchaseZonePad={(padId) => {
            purchaseZonePad(worldRef.current, padId);
            forceUiSync();
          }}
          onBuildBuffetZone={(zoneId) => {
            unlockBuffetZone(worldRef.current, zoneId);
            forceUiSync();
          }}
          onPurchaseRegime={(regimeId) => {
            purchaseDiningRegime(worldRef.current, regimeId);
            forceUiSync();
          }}
          onSwitchRegime={(regimeId) => {
            switchDiningRegime(worldRef.current, regimeId);
            forceUiSync();
          }}
          onStartTechResearch={(nodeId) => {
            startTechNodeResearch(worldRef.current, nodeId);
            forceUiSync();
          }}
          onHire={(id) => {
            hireCandidate(worldRef.current, id);
            forceUiSync();
          }}
          onPromote={(id) => {
            promoteStaff(worldRef.current, id);
            forceUiSync();
          }}
          onFire={(id) => {
            fireStaff(worldRef.current, id);
            forceUiSync();
          }}
          onCancelFire={(id) => {
            cancelPendingFire(worldRef.current, id);
            forceUiSync();
          }}
          onRefreshCandidates={handleRefreshCandidates}
        />
      )}

      {/* DEDICATED STORY & DISCOVERED ENCOUNTERS CHRONICLE MODAL */}
      {activeOverlay === 'STORY' && (
        <StoryChronicleModal
          world={world}
          onClaimChapter={() => {
            handleClaimChapter();
            if (worldRef.current.pendingStoryModal) {
              setActiveOverlay(null);
            }
          }}
          onOpenEnding={() => {
            worldRef.current.showEndingModal = true;
            setActiveOverlay(null);
            forceUiSync();
          }}
          onTriggerSpecialQuest={(staffId) => {
            if (triggerSpecialStaffQuest(worldRef.current, staffId)) {
              setActiveOverlay(null);
            }
            forceUiSync();
          }}
          onOpenDormitory={() => {
            setActiveOverlay(null);
            enterBackstageScene(worldRef.current, 'dormitory');
            forceUiSync();
          }}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {/* BUSINESS HUB MODAL (MARKETING, LOANS, DECOR, CITY LEADERBOARD & ANALYTICS) */}
      {activeOverlay === 'BUSINESS' && (
        <BusinessHubModal
          world={world}
          onLaunchMarketing={(id) => {
            launchMarketingCampaign(worldRef.current, id);
            forceUiSync();
          }}
          onTakeLoan={(amount) => {
            takeEmergencyLoan(worldRef.current, amount);
            forceUiSync();
          }}
          onRepayLoan={() => {
            repayEmergencyLoan(worldRef.current);
            forceUiSync();
          }}
          onBuyOrEquipDecor={(id) => {
            buyOrEquipDecorTheme(worldRef.current, id);
            syncWorldToEncyclopedia(worldRef.current);
            refreshPersistentData();
            forceUiSync();
          }}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {/* SAVE / LOAD MODAL */}
      {activeOverlay === 'SAVE_LOAD' && (
        <SaveLoadModal
          mode="IN_GAME"
          slots={saveSlots}
          onSaveSlot={handleSaveSlot}
          onLoadSlot={handleLoadSlot}
          onDeleteSlot={handleDeleteSlot}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {/* CROSS-RUN ENCYCLOPEDIA & ACHIEVEMENTS MODAL */}
      {activeOverlay === 'ENCYCLOPEDIA' && (
        <EncyclopediaModal
          encyclopedia={encyclopedia}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {/* GAME SETTINGS MODAL */}
      {activeOverlay === 'SETTINGS' && (
        <SettingsModal
          settings={settings}
          activeBgmTrack={desiredBgmTrack}
          actualCanvasSize={actualCanvasSize}
          platform={device.platform}
          platformLabel={device.platformLabel}
          pwa={pwa}
          canFullscreen={device.canFullscreen}
          isFullscreen={device.isFullscreen}
          onToggleFullscreen={device.toggleFullscreen}
          onChange={handleUpdateSettings}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {/* VISUAL NOVEL DIALOGUE & BRANCHING CHOICE STORY EVENT POPUP */}
      {world.pendingStoryModal && (
        <StoryEventModal
          event={world.pendingStoryModal}
          characterId={world.characterId}
          onSelectChoice={(choice) => {
            resolveStoryChoice(worldRef.current, choice);
            forceUiSync();
          }}
          onClose={() => {
            const shouldFinish = Boolean(worldRef.current.pendingStoryModal?.finishDayAfterClose);
            worldRef.current.pendingStoryModal = null;
            if (shouldFinish && worldRef.current.phase === 'CLOSING') {
              finishBusinessDay(worldRef.current);
            }
            forceUiSync();
          }}
        />
      )}

      {/* MULTI-DIMENSIONAL ENDING EPILOGUE MODAL */}
      {world.showEndingModal && world.endingReport && !world.pendingStoryModal && (
        <EndingEpilogueModal
          world={world}
          report={world.endingReport}
          onContinueEndless={() => {
            worldRef.current.showEndingModal = false;
            forceUiSync();
          }}
          onBackToMenu={handleBackToMainMenu}
        />
      )}

      {/* DAY SUMMARY LEDGER */}
      {world.phase === 'DAY_SUMMARY' && !world.pendingStoryModal && !world.showEndingModal && (
        <DaySummaryModal
          world={world}
          onNextDay={() => {
            startNextDay(worldRef.current);
            forceUiSync();
          }}
        />
      )}

      {/* GAME OVER */}
      {world.phase === 'GAME_OVER' && (
        <GameOverModal
          world={world}
          onChooseCharacter={handleEnterCharacterSelect}
          onBackToMenu={handleBackToMainMenu}
        />
      )}
    </div>
  );
}
