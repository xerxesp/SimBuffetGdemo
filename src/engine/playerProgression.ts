import { GameWorld } from '../types/game';
import { sound } from '../utils/sound';

let xpUidCounter = 1;
function nextXpUid(prefix: string): string {
  xpUidCounter += 1;
  return `${prefix}_${Date.now()}_${xpUidCounter}`;
}

/**
 * Revenue-to-XP curve (1 ¥ earned = 1 EXP).
 * Smooth quadratic scaling rounded to clean 50-EXP steps:
 *   Lv.1 -> 2:   450 EXP (earned ¥450 — Day 1 milestone!)
 *   Lv.2 -> 3:   750 EXP
 *   Lv.3 -> 4: 1,150 EXP
 *   Lv.4 -> 5: 1,600 EXP (Lv.5 grants +2 bonus upgrade points!)
 *   Lv.5 -> 6: 2,150 EXP
 */
export function getXpRequiredForNextLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level || 1));
  const raw = 450 + (lv - 1) * 280 + (lv - 1) * (lv - 1) * 35;
  return Math.round(raw / 50) * 50;
}

/**
 * Upgrade points granted upon reaching `newLevel`.
 * Regular level-ups award +1 upgrade point; every 5th level (Lv.5, 10, 15...) awards +2!
 */
export function getPointsForReachingLevel(newLevel: number): number {
  return newLevel > 1 && newLevel % 5 === 0 ? 2 : 1;
}

export function getPlayerLevelTitle(level: number): string {
  if (level >= 21) return '沸鼎传奇';
  if (level >= 15) return '潮鲜宗师';
  if (level >= 10) return '海市巨贾';
  if (level >= 6) return '鲜味名厨';
  if (level >= 3) return '港湾掌柜';
  return '初出茅庐';
}

/**
 * Converts earned revenue/cash rewards into player XP (¥1 = 1 EXP) and handles level-ups + upgrade point grants.
 */
export function awardPlayerXpFromCash(
  world: GameWorld,
  earnedCash: number,
  floatPos?: { x: number; y: number }
): { levelsGained: number; pointsGained: number } {
  const xpGain = Math.max(0, Math.round(earnedCash));
  if (xpGain <= 0) return { levelsGained: 0, pointsGained: 0 };

  if (typeof world.playerLevel !== 'number' || world.playerLevel < 1) world.playerLevel = 1;
  if (typeof world.playerXp !== 'number' || world.playerXp < 0) world.playerXp = 0;
  if (typeof world.upgradePoints !== 'number' || world.upgradePoints < 0) world.upgradePoints = 0;
  if (typeof world.totalUpgradePointsEarned !== 'number' || world.totalUpgradePointsEarned < 0) {
    world.totalUpgradePointsEarned = 0;
  }

  world.playerXp += xpGain;
  world.todayStats.xpEarned = (world.todayStats.xpEarned ?? 0) + xpGain;

  let levelsGained = 0;
  let pointsGained = 0;

  while (world.playerXp >= getXpRequiredForNextLevel(world.playerLevel)) {
    world.playerXp -= getXpRequiredForNextLevel(world.playerLevel);
    world.playerLevel += 1;
    const pts = getPointsForReachingLevel(world.playerLevel);
    world.upgradePoints += pts;
    world.totalUpgradePointsEarned += pts;
    levelsGained += 1;
    pointsGained += pts;
  }

  if (levelsGained > 0) {
    world.todayStats.levelsGained = (world.todayStats.levelsGained ?? 0) + levelsGained;
    sound.playBell();

    const fx = floatPos?.x ?? world.player.x;
    const fy = (floatPos?.y ?? world.player.y) - 46;
    world.floatingTexts.push({
      id: nextXpUid('lvl'),
      x: fx,
      y: fy,
      text: `店长升级 Lv.${world.playerLevel}！升级点 +${pointsGained}`,
      color: '#FDE047',
      life: 2.3,
      maxLife: 2.3,
      size: 14,
    });

    const totalMinutes = 11 * 60 + Math.floor((world.dayTime / Math.max(1, world.dayDuration)) * 11 * 60);
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    const timeText =
      world.phase === 'PREP'
        ? '筹备'
        : `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

    world.alerts.unshift({
      id: nextXpUid('lvl_alert'),
      timeText,
      message: `【店长升级】累计营收达标，升至 Lv.${world.playerLevel}「${getPlayerLevelTitle(world.playerLevel)}」，获得 +${pointsGained} 升级点（当前可用 ${world.upgradePoints} 点，可在门店配置 → 天赋发展树立即解锁节点）！`,
      severity: 'success',
    });
    if (world.alerts.length > 26) world.alerts.pop();
  }

  return { levelsGained, pointsGained };
}

/**
 * Migrates older saves that predate the player level & upgrade-point system
 * by computing earned level, remaining XP, and net unspent points from `totalCashEarned`.
 */
export function syncLegacyPlayerProgression(world: GameWorld, alreadySpentPoints: number): void {
  if (typeof world.playerLevel === 'number' && world.playerLevel >= 1) {
    world.playerXp = typeof world.playerXp === 'number' ? Math.max(0, world.playerXp) : 0;
    world.upgradePoints =
      typeof world.upgradePoints === 'number' ? Math.max(0, world.upgradePoints) : 0;
    world.totalUpgradePointsEarned =
      typeof world.totalUpgradePointsEarned === 'number'
        ? Math.max(0, world.totalUpgradePointsEarned)
        : world.upgradePoints + alreadySpentPoints;
    return;
  }

  let level = 1;
  let xp = Math.max(0, Math.round(world.totalCashEarned || 0));
  let totalPts = 0;

  while (xp >= getXpRequiredForNextLevel(level)) {
    xp -= getXpRequiredForNextLevel(level);
    level += 1;
    totalPts += getPointsForReachingLevel(level);
  }

  world.playerLevel = level;
  world.playerXp = xp;
  world.totalUpgradePointsEarned = totalPts;
  world.upgradePoints = Math.max(0, totalPts - alreadySpentPoints);
}
