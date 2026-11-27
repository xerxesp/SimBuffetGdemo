import { useCallback, useEffect, useState } from 'react';

export type DevicePlatform = 'ios' | 'huawei' | 'android' | 'desktop';

export interface MobileDeviceState {
  platform: DevicePlatform;
  platformLabel: string;
  isTouchDevice: boolean;
  isMobileViewport: boolean;
  isCompactHeight: boolean;
  isPortrait: boolean;
  isStandalone: boolean;
  canFullscreen: boolean;
  isFullscreen: boolean;
  viewportWidth: number;
  viewportHeight: number;
  toggleFullscreen: () => void;
}

function detectPlatform(): DevicePlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const platform = (navigator.platform || '').toLowerCase();
  const maxTouch = navigator.maxTouchPoints || 0;

  // Apple iPhone / iPod / iPad (including iPadOS 13+ reporting Macintosh with touch points)
  if (/iphone|ipad|ipod/i.test(ua) || (platform === 'macintel' && maxTouch > 1)) {
    return 'ios';
  }

  // Huawei HarmonyOS / OpenHarmony / EMUI / HuaweiBrowser / HMSCore / Honor
  if (/harmonyos|openharmony|arkweb|huawei|huaweibrowser|hmscore|hbpc|honor/i.test(ua)) {
    return 'huawei';
  }

  // Standard Android devices
  if (/android/i.test(ua)) {
    return 'android';
  }

  return 'desktop';
}

function detectTouch(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    (navigator.maxTouchPoints ?? 0) > 0 ||
    window.matchMedia?.('(pointer: coarse)').matches
  );
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function readViewport() {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 720 };
  }
  const vv = window.visualViewport;
  return {
    width: Math.round(vv?.width ?? window.innerWidth),
    height: Math.round(vv?.height ?? window.innerHeight),
  };
}

export function useMobileDevice(): MobileDeviceState {
  const [platform] = useState<DevicePlatform>(detectPlatform);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(detectTouch);
  const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);
  const [vp, setVp] = useState(readViewport);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() =>
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  );

  useEffect(() => {
    const sync = () => {
      setVp(readViewport());
      setIsTouchDevice(detectTouch());
      setIsStandalone(detectStandalone());
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    document.addEventListener('fullscreenchange', sync);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);

    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      document.removeEventListener('fullscreenchange', sync);
      vv?.removeEventListener('resize', sync);
    };
  }, []);

  const canFullscreen =
    typeof document !== 'undefined' &&
    platform !== 'ios' &&
    typeof document.documentElement?.requestFullscreen === 'function';

  const toggleFullscreen = useCallback(() => {
    if (!canFullscreen) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, [canFullscreen]);

  const isMobileViewport = vp.width < 820 || (isTouchDevice && vp.height < 540);
  const isCompactHeight = vp.height < 560;
  const isPortrait = vp.height > vp.width;

  const platformLabel =
    platform === 'ios'
      ? 'Apple iOS'
      : platform === 'huawei'
        ? '华为 HarmonyOS / EMUI'
        : platform === 'android'
          ? 'Android'
          : '桌面端';

  return {
    platform,
    platformLabel,
    isTouchDevice,
    isMobileViewport,
    isCompactHeight,
    isPortrait,
    isStandalone,
    canFullscreen,
    isFullscreen,
    viewportWidth: vp.width,
    viewportHeight: vp.height,
    toggleFullscreen,
  };
}
