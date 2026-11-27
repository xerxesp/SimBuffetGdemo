import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  ChevronDown,
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
import { SaveLoadModal } from './components/SaveLoadModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfigTab, StoreConfigModal } from './components/StoreConfigModal';
import { StoryChronicleModal } from './components/StoryChronicleModal';
import { StoryEventModal } from './components/StoryEventModal';
import { TopHud } from './components/TopHud';
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
  const cameraRef = useRef<SceneCamera>({ zoom: 1, panX: 0, panY: 0 });
  const panDragRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: 1280,
    height: 720,
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
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
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
          cameraRef.current = { zoom: 1.42, panX: -225, panY: 138 };
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
    if (zoom <= 0.92) {
      return { panX: 0, panY: 0 };
    }
    const m = getIsoMapMetrics(worldRef.current.shopLevel);
    const maxPanX = (m.boundsW * Math.max(0.25, zoom - 0.85)) / (2 * zoom) + 220;
    const maxPanY = (m.boundsH * Math.max(0.25, zoom - 0.85)) / (2 * zoom) + 160;
    return {
      panX: Math.max(-maxPanX, Math.min(maxPanX, panX)),
      panY: Math.max(-maxPanY, Math.min(maxPanY, panY)),
    };
  }, []);

  const resetCameraZoom = useCallback(() => {
    cameraRef.current = { zoom: 1, panX: 0, panY: 0 };
    setZoomPercent(100);
  }, []);

  const focusFrontHallCamera = useCallback(() => {
    cameraRef.current = { zoom: 1.42, panX: -225, panY: 138 };
    setZoomPercent(142);
  }, []);

  const focusBackstageCamera = useCallback(() => {
    cameraRef.current = { zoom: 1.42, panX: 230, panY: -88 };
    setZoomPercent(142);
  }, []);

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
        cameraRef.current = { zoom: nextZoom, panX: 0, panY: 0 };
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

  const toCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || canvas.width <= 0 || canvas.height <= 0) {
      return { x: -9999, y: -9999 };
    }
    const bufX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const bufY = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return screenBufToUnifiedWorld(
      bufX,
      bufY,
      canvas.width,
      canvas.height,
      cameraRef.current,
      worldRef.current.shopLevel
    );
  };

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
    if (activeOverlayRef.current || showOnboardingIntroRef.current) return;
    const pt = toCanvasCoords(e);
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
    worldRef.current = loaded;
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

  useEffect(() => {
    sound.setBgmTrack(desiredBgmTrack);
  }, [desiredBgmTrack]);

  if (world.phase === 'MAIN_MENU') {
    const hasAnySave = Object.values(saveSlots).some(Boolean);
    return (
      <>
        <MainMenuScreen
          bestDays={bestRecord.bestDays}
          bestCash={bestRecord.bestCash}
          autoSaveMeta={saveSlots.auto}
          hasAnySave={hasAnySave}
          onContinueAutoSave={() => handleLoadSlot('auto')}
          onStartGame={handleEnterCharacterSelect}
          onOpenLoadModal={() => handleOpenOverlay('SAVE_LOAD')}
          onOpenEncyclopedia={() => handleOpenOverlay('ENCYCLOPEDIA')}
          onOpenSettings={() => handleOpenOverlay('SETTINGS')}
        />
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
        {activeOverlay === 'SETTINGS' && (
          <SettingsModal
            settings={settings}
            activeBgmTrack={desiredBgmTrack}
            actualCanvasSize={actualCanvasSize}
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
    <div className="relative h-screen w-screen overflow-hidden bg-[#0c1718] text-[#F7EFE2]">
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
              className="w-full h-full block cursor-pointer"
            />
          </div>
        </div>

        {/* Layer 40 (z-40): Top Floating Translucent Status & Utility Islands */}
        <TopHud
          world={world}
          muted={settings.muted || settings.volume === 0}
          bgmMuted={settings.bgmMuted || settings.bgmVolume === 0}
          activeBgmTitle={BGM_TRACK_META[desiredBgmTrack].title}
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
        <div className="absolute top-[62px] left-3 z-40 flex flex-col items-start gap-2 pointer-events-none">
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
            <div className="pointer-events-auto flex items-start gap-2.5">
              <div className="hud-float backdrop-blur-md rounded-xl p-2 w-[276px] flex flex-col gap-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.68)]">
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
                        : `第${world.mainChapter}章 · ${chapterDef.title}`}
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

              {/* Compact Collapsible World Tracker / Chronicle Drawer Beside Menu */}
              {showChronicleDrawer && (
                <div className="w-[332px] max-w-[calc(100vw-310px)] max-h-[54vh] hud-float backdrop-blur-md rounded-xl overflow-hidden flex flex-col">
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
                    卫生低于45触发重罚；单日零逃单且卫生≥85撤1点违规。
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
            <div className="pointer-events-none absolute top-[62px] left-1/2 -translate-x-1/2 z-40 max-w-[620px] w-[92vw] sm:w-max">
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
            ============================================================ */}
        {world.activeScene === 'DINING_HALL' ? (
          <div className="absolute bottom-3 left-3.5 z-30 max-w-[calc(100vw-240px)] pointer-events-none">
            {spotlightHotbar && (
              <div className="mb-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FDE047] text-[#211208] text-[11px] font-black shadow-lg">
                <span>
                  {world.onboardingStep === 3
                    ? '👇 指引操作：先按 1 迎宾带位，再按 2 端锅上桌'
                    : world.onboardingStep === 4
                      ? '👇 指引操作：按 3 补充冰台海鲜，按 7 现烹熟食热菜'
                      : '👇 指引操作：客人离席后依次按 4 收桌 → 5 洗碗 → 6 摆台'}
                </span>
              </div>
            )}
            <div
              className={`pointer-events-auto hud-float backdrop-blur-md rounded-xl px-3 py-2 flex flex-col gap-1.5 ${
                spotlightHotbar
                  ? 'border-2 border-[#FDE047] shadow-[0_0_24px_rgba(253,224,71,0.4)]'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3 text-[11px] px-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-display font-bold text-[#FFF6E5] whitespace-nowrap">
                    {charDef.name}
                  </span>
                  <span className="text-[#8a6544]">·</span>
                  <span className="text-[#E8C97A] font-semibold whitespace-nowrap">
                    手持：{CARRY_LABEL[world.player.carrying]}
                    {world.player.carryAmount > 0 ? ` ×${world.player.carryAmount}` : ''}
                  </span>
                  <span className="text-[#C5AE92] truncate hidden sm:inline">
                    — {world.player.activeTaskLabel}
                  </span>
                </div>
                <span className="font-mono-num text-[#D6C3A8] whitespace-nowrap shrink-0">
                  今日营收{' '}
                  <strong className="text-[#F6DA8D]">
                    ¥{(world.todayStats.ticketRevenue + world.todayStats.tipRevenue).toLocaleString()}
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {hotbarItems.map((item) => (
                  <button
                    key={item.action}
                    onClick={() => handleQuickAction(item.action)}
                    className={`game-btn-wood px-2 py-1.5 rounded-lg text-left cursor-pointer min-w-[84px] ${
                      item.urgent ? 'border-[#e8c97a]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="text-xs font-bold whitespace-nowrap"
                        style={{ color: item.accent }}
                      >
                        {item.label}
                      </span>
                      <span className="font-mono-num text-[10px] text-[#C5AE92] bg-[#160c08] border border-[#593b25] px-1 rounded">
                        {item.keyNum}
                      </span>
                    </div>
                    <div className="font-mono-num text-[10px] text-[#DFCDB6] mt-0.5 truncate">
                      {item.sub}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <BackstageRoomDock
            world={world}
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
            ============================================================ */}
        <div className="absolute bottom-3.5 right-4 z-30 flex items-end gap-2.5 pointer-events-none">
          {/* Quick Open Config Dock beside the Turn Orb during PREP */}
          {effectivePhase === 'PREP' && world.activeScene === 'DINING_HALL' && (
            <button
              onClick={() => handleOpenOverlay('CONFIG', 'POLICY')}
              className="pointer-events-auto mb-3 hud-float backdrop-blur-md hover:border-[#e8c97a] px-4 py-2 rounded-lg text-left cursor-pointer hidden sm:block transition-colors"
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
          <div className="pointer-events-auto mb-3 flex items-center gap-1 hud-float backdrop-blur-md rounded-lg p-1">
            <button
              onClick={() => {
                sound.playClick();
                resetCameraZoom();
              }}
              title="复位全图视角（同时俯瞰前厅大堂与7大后场房间）"
              className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
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
              className="px-2 py-1 rounded text-[11px] font-semibold text-[#DFCDB6] hover:text-[#FFF6E5] hover:bg-[#2a1a12] cursor-pointer whitespace-nowrap"
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
              className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer whitespace-nowrap transition-colors ${
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

          {/* Giant Circular Action Orb */}
          <div className="pointer-events-auto relative w-[116px] h-[116px] flex items-center justify-center shrink-0">
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
                className={`civ-turn-orb w-[100px] h-[100px] rounded-full flex flex-col items-center justify-center text-center cursor-pointer px-2 ${
                  spotlightOpenShopOrb
                    ? 'ring-4 ring-[#FDE047] shadow-[0_0_28px_rgba(253,224,71,0.85)] animate-pulse'
                    : ''
                }`}
                title="结束筹备并挂牌正式开店营业"
              >
                <Sun className="w-5 h-5 text-[#F6DA8D] mb-0.5" />
                <span className="font-display font-black text-base text-[#FFF9EE] leading-tight">
                  正式开店
                </span>
                <span className="font-mono-num text-[10px] text-[#FFE8C8] mt-0.5">
                  第 {world.day} 天
                </span>
              </button>
            )}

            {effectivePhase === 'PLAYING' && (
              <div
                className="civ-turn-orb-idle w-[100px] h-[100px] rounded-full flex flex-col items-center justify-center text-center px-2"
                title="今日营业倒计时（11:00 - 22:00）"
              >
                <span className="text-[10px] font-bold text-[#C5AE92]">
                  {world.rushHourActive ? '高峰客流' : '营业中'}
                </span>
                <span className="font-mono-num font-bold text-xl text-[#FFF6E5] leading-tight mt-0.5">
                  {clockText}
                </span>
                <span className="font-mono-num text-[10px] text-[#E8C97A] mt-0.5">
                  第 {world.day} 天
                </span>
              </div>
            )}

            {effectivePhase === 'CLOSING' && closingProg && (
              <button
                onClick={handleFinishClosing}
                disabled={!closingProg.canFinishEarly}
                className={`w-[100px] h-[100px] rounded-full flex flex-col items-center justify-center text-center px-2 ${
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
                  className={`w-4 h-4 mb-0.5 ${
                    closingProg.canFinishEarly ? 'text-[#211208]' : 'text-[#F6DA8D]'
                  }`}
                />
                <span
                  className={`font-display font-black text-sm leading-tight ${
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
                  className={`font-mono-num text-[10px] mt-0.5 ${
                    closingProg.canFinishEarly ? 'text-[#3A220B] font-bold' : 'text-[#E8C97A]'
                  }`}
                >
                  {closingProg.allClean
                    ? '全清就绪 · 点此'
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
              className="game-panel rounded-xl px-7 py-6 text-center space-y-4 max-w-sm w-full border border-[#c9a45c]/75"
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
                  className="game-btn-primary w-full py-2.5 rounded-lg font-display font-bold text-sm cursor-pointer"
                >
                  继续经营 [Esc]
                </button>
                <button
                  onClick={() => handleOpenOverlay('CONFIG', 'POLICY')}
                  className="game-btn-wood w-full py-2.5 rounded-lg font-semibold text-xs text-[#E8C97A] cursor-pointer"
                >
                  门店配置中心 [C]
                </button>
                <button
                  onClick={() => handleOpenOverlay('SAVE_LOAD')}
                  className="game-btn-wood w-full py-2.5 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  存档 / 读档
                </button>
                <button
                  onClick={() => handleOpenOverlay('SETTINGS')}
                  className="game-btn-wood w-full py-2.5 rounded-lg font-semibold text-xs cursor-pointer"
                >
                  画面与音效设置
                </button>
                <button
                  onClick={handleBackToMainMenu}
                  className="game-btn-wood w-full py-2.5 rounded-lg font-semibold text-xs text-[#FCA5A5] cursor-pointer"
                >
                  返回主菜单
                </button>
              </div>
              <div className="pt-2 border-t border-[#5a3b24]/65 text-[10px] text-[#B89E82] leading-relaxed">
                WASD 移动 · 1–7 快捷调度 · M 切后场 · B 商战 · P 暂停 · 滚轮缩放 · 右键拖拽视角
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
