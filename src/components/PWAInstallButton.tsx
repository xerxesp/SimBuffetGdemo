import { useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { DevicePlatform } from '../hooks/useMobileDevice';
import { PWAInstallState } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  platform: DevicePlatform;
  pwa: PWAInstallState;
  variant?: 'menu' | 'compact' | 'settings';
}

export function PWAInstallButton({
  platform,
  pwa,
  variant = 'menu',
}: PWAInstallButtonProps) {
  const [showGuide, setShowGuide] = useState(false);

  if (pwa.isInstalled || !pwa.canShowInstallAction) {
    return null;
  }

  const handleClick = async () => {
    if (pwa.hasNativePrompt) {
      const outcome = await pwa.triggerNativeInstall();
      if (outcome === 'unavailable') {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  const label =
    platform === 'ios'
      ? '添加到主屏幕 (iOS)'
      : platform === 'huawei'
        ? '安装到华为桌面'
        : platform === 'android'
          ? '安装到手机桌面'
          : '安装桌面应用';

  return (
    <>
      {variant === 'menu' && (
        <button
          type="button"
          onClick={handleClick}
          className="game-btn-wood w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg font-semibold text-xs text-[#99F6E4] border-[#4EAFA2]/65 cursor-pointer whitespace-nowrap"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>{label}</span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          type="button"
          onClick={handleClick}
          className="game-btn-wood inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold text-[#99F6E4] border-[#4EAFA2]/65 cursor-pointer whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </button>
      )}

      {variant === 'settings' && (
        <button
          type="button"
          onClick={handleClick}
          className="game-btn-gold inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>{label}</span>
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-[70] bg-[#0d0604]/84 backdrop-blur-[3px] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
        >
          <div className="game-panel w-full max-w-md rounded-2xl p-5 text-[#F7EFE2] space-y-4">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#593b25]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#E8C97A]" />
                <h3 className="font-display text-lg font-bold text-[#FFF6E5]">
                  安装《潮鲜沸鼎》至手机桌面
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="game-btn-wood p-2 rounded-lg cursor-pointer"
                aria-label="关闭安装引导"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {platform === 'ios' ? (
              <div className="space-y-3 text-xs text-[#DFCDB6] leading-relaxed">
                <p className="text-[#E8C97A] font-semibold">
                  Apple iPhone / iPad (Safari 浏览器) 安装步骤：
                </p>
                <ol className="space-y-2 game-inset rounded-xl p-3.5 list-decimal list-inside">
                  <li>
                    点击浏览器底部（或顶部）的{' '}
                    <span className="inline-flex items-center gap-0.5 text-[#FFF6E5] font-bold">
                      <Share className="w-3.5 h-3.5 inline text-[#7DD3FC]" /> 分享
                    </span>{' '}
                    按钮。
                  </li>
                  <li>
                    在弹出菜单中向上滑动，选择{' '}
                    <strong className="text-[#FFF6E5]">「添加到主屏幕」</strong>。
                  </li>
                  <li>
                    点击右上角 <strong className="text-[#F6DA8D]">「添加」</strong>，即可像原生 App 一样全屏离线畅玩。
                  </li>
                </ol>
              </div>
            ) : platform === 'huawei' ? (
              <div className="space-y-3 text-xs text-[#DFCDB6] leading-relaxed">
                <p className="text-[#E8C97A] font-semibold">
                  华为 HarmonyOS / EMUI (华为浏览器) 安装步骤：
                </p>
                <ol className="space-y-2 game-inset rounded-xl p-3.5 list-decimal list-inside">
                  <li>
                    点击华为浏览器底部菜单栏的 <strong className="text-[#FFF6E5]">「☰ / ⋮ 更多」</strong> 图标。
                  </li>
                  <li>
                    在工具箱中选择 <strong className="text-[#FFF6E5]">「添加书签/桌面」</strong> →{' '}
                    <strong className="text-[#FFF6E5]">「手机桌面」</strong>（或「安装应用」）。
                  </li>
                  <li>
                    确认添加后，桌面将生成《潮鲜沸鼎》独立图标，支持全屏无地址栏畅玩与离线存档。
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-[#DFCDB6] leading-relaxed">
                <p className="text-[#E8C97A] font-semibold">
                  Android 手机浏览器 (Chrome / Edge / 手机自带浏览器) 安装步骤：
                </p>
                <ol className="space-y-2 game-inset rounded-xl p-3.5 list-decimal list-inside">
                  <li>
                    点击浏览器右上角或底部的 <strong className="text-[#FFF6E5]">「⋮ 菜单」</strong> 按钮。
                  </li>
                  <li>
                    选择 <strong className="text-[#FFF6E5]">「安装应用」</strong> 或{' '}
                    <strong className="text-[#FFF6E5]">「添加到主屏幕」</strong>。
                  </li>
                  <li>
                    确认后即可全屏独立运行，支持双指缩放、单指拖图与离线畅玩。
                  </li>
                </ol>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="game-btn-gold px-5 py-2.5 rounded-lg text-xs font-bold cursor-pointer"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineBanner({ isOffline }: { isOffline: boolean }) {
  if (!isOffline) return null;
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[65] pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 54px)' }}
    >
      <div className="hud-float rounded-full px-3.5 py-1 flex items-center gap-1.5 text-[11px] text-[#FCD34D] border-[#f59e0b]/70">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <span>当前处于离线模式 · 单机经营与本地存档正常运行</span>
      </div>
    </div>
  );
}
