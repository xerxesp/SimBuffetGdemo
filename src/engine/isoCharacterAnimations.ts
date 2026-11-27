import { CarryItemType, GameWorld, HiredStaff, PlayerState, StaffRole, TaskStep } from '../types/game';

/**
 * 4-Direction Isometric Facing:
 * - SE: Screen Down-Right  (World +X, Front-Right 3/4 view)
 * - SW: Screen Down-Left   (World +Y, Front-Left  3/4 view)
 * - NE: Screen Up-Right    (World -Y, Back-Right  3/4 view)
 * - NW: Screen Up-Left     (World -X, Back-Left   3/4 view)
 */
export type IsoFacing = 'SE' | 'SW' | 'NE' | 'NW';

export type IsoAnimState =
  | 'IDLE'
  | 'WALK'
  | 'CARRY_POT'
  | 'CARRY_TRAY'
  | 'CARRY_DISHES'
  | 'WASH_DISHES'
  | 'WELCOME_GUEST'
  | 'SERVE_POT'
  | 'COOK_WOK'
  | 'PREP_CHOP'
  | 'CLEAR_WIPE'
  | 'SET_TABLE'
  | 'RESTOCK'
  | 'DINING_EAT'
  | 'DINING_WAIT'
  | 'QUEUE_WAIT';

export interface CharacterPoseFrame {
  /** Vertical body bounce in iso units */
  bodyBob: number;
  /** Torso forward lean (+ forward along facing X, - upright/recline) */
  torsoLean: number;
  /** Head nod / polite bow offset Y (+ nods down) */
  headNod: number;
  /** Back leg stride along facing axis (-1..+1) */
  backLegStride: number;
  /** Front leg stride along facing axis (-1..+1) */
  frontLegStride: number;
  /** Back foot lift off floor (0..1) */
  backFootLift: number;
  /** Front foot lift off floor (0..1) */
  frontFootLift: number;
  /** Back hand target offset from back shoulder (in facing-aligned coords) */
  backHandX: number;
  backHandY: number;
  /** Front hand target offset from front shoulder (in facing-aligned coords) */
  frontHandX: number;
  frontHandY: number;
  /** Prop / carried item micro offset */
  propX: number;
  propY: number;
  propTilt: number;
  /** Effect trigger phase (0..1) for splashes, steam, sparkles, chops */
  fxPhase: number;
}

export interface IsoAnimationClip {
  fps: number;
  loop: boolean;
  frames: CharacterPoseFrame[];
}

function f(partial: Partial<CharacterPoseFrame>): CharacterPoseFrame {
  return {
    bodyBob: 0,
    torsoLean: 0,
    headNod: 0,
    backLegStride: 0,
    frontLegStride: 0,
    backFootLift: 0,
    frontFootLift: 0,
    backHandX: -1.0,
    backHandY: 11.2,
    frontHandX: 1.1,
    frontHandY: 11.2,
    propX: 0,
    propY: 0,
    propTilt: 0,
    fxPhase: 0,
    ...partial,
  };
}

/**
 * Multi-frame Isometric Animation Sequence Tables matching the slender
 * 1:4.8 architectural Ligne Claire proportions of style_isometric_tycoon.
 */
export const ISO_ANIMATION_SEQUENCES: Record<IsoAnimState, IsoAnimationClip> = {
  // 4-frame subtle breathing & poise
  IDLE: {
    fps: 2.6,
    loop: true,
    frames: [
      f({ bodyBob: 0.0, backHandX: -1.0, backHandY: 11.1, frontHandX: 1.2, frontHandY: 11.0, fxPhase: 0 }),
      f({ bodyBob: 0.32, backHandX: -0.9, backHandY: 10.9, frontHandX: 1.3, frontHandY: 10.8, fxPhase: 0.33 }),
      f({ bodyBob: 0.45, backHandX: -1.0, backHandY: 10.8, frontHandX: 1.1, frontHandY: 10.9, fxPhase: 0.66 }),
      f({ bodyBob: 0.2, backHandX: -1.1, backHandY: 11.0, frontHandX: 1.0, frontHandY: 11.1, fxPhase: 0.9 }),
    ],
  },

  // 8-frame crisp isometric walk cycle (contact -> down -> passing -> high -> mirror)
  WALK: {
    fps: 10.5,
    loop: true,
    frames: [
      f({
        bodyBob: 0.2,
        torsoLean: 0.65,
        backLegStride: -0.95,
        frontLegStride: 0.95,
        backFootLift: 0.08,
        frontFootLift: 0.0,
        backHandX: 2.4,
        backHandY: 10.2,
        frontHandX: -2.2,
        frontHandY: 10.8,
      }),
      f({
        bodyBob: -0.45,
        torsoLean: 0.8,
        backLegStride: -0.6,
        frontLegStride: 0.55,
        backFootLift: 0.35,
        frontFootLift: 0.0,
        backHandX: 1.6,
        backHandY: 10.7,
        frontHandX: -1.5,
        frontHandY: 11.0,
      }),
      f({
        bodyBob: 0.85,
        torsoLean: 0.55,
        backLegStride: 0.05,
        frontLegStride: -0.05,
        backFootLift: 0.85,
        frontFootLift: 0.0,
        backHandX: 0.0,
        backHandY: 11.2,
        frontHandX: 0.1,
        frontHandY: 11.2,
      }),
      f({
        bodyBob: 1.3,
        torsoLean: 0.6,
        backLegStride: 0.68,
        frontLegStride: -0.62,
        backFootLift: 0.45,
        frontFootLift: 0.05,
        backHandX: -1.6,
        backHandY: 10.8,
        frontHandX: 1.7,
        frontHandY: 10.4,
      }),
      f({
        bodyBob: 0.2,
        torsoLean: 0.65,
        backLegStride: 0.95,
        frontLegStride: -0.95,
        backFootLift: 0.0,
        frontFootLift: 0.08,
        backHandX: -2.3,
        backHandY: 10.7,
        frontHandX: 2.5,
        frontHandY: 10.0,
      }),
      f({
        bodyBob: -0.45,
        torsoLean: 0.8,
        backLegStride: 0.55,
        frontLegStride: -0.6,
        backFootLift: 0.0,
        frontFootLift: 0.35,
        backHandX: -1.5,
        backHandY: 11.0,
        frontHandX: 1.7,
        frontHandY: 10.6,
      }),
      f({
        bodyBob: 0.85,
        torsoLean: 0.55,
        backLegStride: -0.05,
        frontLegStride: 0.05,
        backFootLift: 0.0,
        frontFootLift: 0.85,
        backHandX: 0.1,
        backHandY: 11.2,
        frontHandX: 0.0,
        frontHandY: 11.2,
      }),
      f({
        bodyBob: 1.3,
        torsoLean: 0.6,
        backLegStride: -0.62,
        frontLegStride: 0.68,
        backFootLift: 0.05,
        frontFootLift: 0.45,
        backHandX: 1.7,
        backHandY: 10.5,
        frontHandX: -1.6,
        frontHandY: 10.8,
      }),
    ],
  },

  // 6-frame careful two-handed steaming copper hotpot carry (端锅)
  CARRY_POT: {
    fps: 9.0,
    loop: true,
    frames: [
      f({
        bodyBob: 0.15,
        torsoLean: 0.85,
        headNod: 0.35,
        backLegStride: -0.7,
        frontLegStride: 0.7,
        backFootLift: 0.1,
        frontFootLift: 0,
        backHandX: 5.2,
        backHandY: 6.4,
        frontHandX: 4.5,
        frontHandY: 7.4,
        propX: 6.8,
        propY: 6.8,
        propTilt: -0.03,
        fxPhase: 0.0,
      }),
      f({
        bodyBob: -0.35,
        torsoLean: 0.95,
        headNod: 0.4,
        backLegStride: -0.25,
        frontLegStride: 0.25,
        backFootLift: 0.55,
        frontFootLift: 0,
        backHandX: 5.3,
        backHandY: 6.7,
        frontHandX: 4.6,
        frontHandY: 7.6,
        propX: 6.9,
        propY: 7.1,
        propTilt: 0.0,
        fxPhase: 0.2,
      }),
      f({
        bodyBob: 0.75,
        torsoLean: 0.75,
        headNod: 0.3,
        backLegStride: 0.35,
        frontLegStride: -0.35,
        backFootLift: 0.35,
        frontFootLift: 0.05,
        backHandX: 5.2,
        backHandY: 6.1,
        frontHandX: 4.5,
        frontHandY: 7.0,
        propX: 6.8,
        propY: 6.5,
        propTilt: 0.03,
        fxPhase: 0.4,
      }),
      f({
        bodyBob: 0.15,
        torsoLean: 0.85,
        headNod: 0.35,
        backLegStride: 0.7,
        frontLegStride: -0.7,
        backFootLift: 0,
        frontFootLift: 0.1,
        backHandX: 5.2,
        backHandY: 6.4,
        frontHandX: 4.5,
        frontHandY: 7.4,
        propX: 6.8,
        propY: 6.8,
        propTilt: 0.03,
        fxPhase: 0.6,
      }),
      f({
        bodyBob: -0.35,
        torsoLean: 0.95,
        headNod: 0.4,
        backLegStride: 0.25,
        frontLegStride: -0.25,
        backFootLift: 0,
        frontFootLift: 0.55,
        backHandX: 5.3,
        backHandY: 6.7,
        frontHandX: 4.6,
        frontHandY: 7.6,
        propX: 6.9,
        propY: 7.1,
        propTilt: 0.0,
        fxPhase: 0.8,
      }),
      f({
        bodyBob: 0.75,
        torsoLean: 0.75,
        headNod: 0.3,
        backLegStride: -0.35,
        frontLegStride: 0.35,
        backFootLift: 0.05,
        frontFootLift: 0.35,
        backHandX: 5.2,
        backHandY: 6.1,
        frontHandX: 4.5,
        frontHandY: 7.0,
        propX: 6.8,
        propY: 6.5,
        propTilt: -0.03,
        fxPhase: 0.95,
      }),
    ],
  },

  // 6-frame poised elevated seafood / cooked platter carry (端盘)
  CARRY_TRAY: {
    fps: 9.5,
    loop: true,
    frames: [
      f({
        bodyBob: 0.2,
        torsoLean: 0.35,
        backLegStride: -0.8,
        frontLegStride: 0.8,
        backFootLift: 0.1,
        backHandX: 4.8,
        backHandY: 6.0,
        frontHandX: 5.4,
        frontHandY: 5.8,
        propX: 7.2,
        propY: 5.0,
        propTilt: -0.04,
      }),
      f({
        bodyBob: -0.25,
        torsoLean: 0.45,
        backLegStride: -0.2,
        frontLegStride: 0.2,
        backFootLift: 0.6,
        backHandX: 4.9,
        backHandY: 6.2,
        frontHandX: 5.5,
        frontHandY: 6.0,
        propX: 7.3,
        propY: 5.2,
        propTilt: 0.0,
      }),
      f({
        bodyBob: 0.85,
        torsoLean: 0.3,
        backLegStride: 0.45,
        frontLegStride: -0.45,
        backFootLift: 0.3,
        backHandX: 4.7,
        backHandY: 5.7,
        frontHandX: 5.3,
        frontHandY: 5.5,
        propX: 7.1,
        propY: 4.7,
        propTilt: 0.04,
      }),
      f({
        bodyBob: 0.2,
        torsoLean: 0.35,
        backLegStride: 0.8,
        frontLegStride: -0.8,
        frontFootLift: 0.1,
        backHandX: 4.8,
        backHandY: 6.0,
        frontHandX: 5.4,
        frontHandY: 5.8,
        propX: 7.2,
        propY: 5.0,
        propTilt: 0.04,
      }),
      f({
        bodyBob: -0.25,
        torsoLean: 0.45,
        backLegStride: 0.2,
        frontLegStride: -0.2,
        frontFootLift: 0.6,
        backHandX: 4.9,
        backHandY: 6.2,
        frontHandX: 5.5,
        frontHandY: 6.0,
        propX: 7.3,
        propY: 5.2,
        propTilt: 0.0,
      }),
      f({
        bodyBob: 0.85,
        torsoLean: 0.3,
        backLegStride: -0.45,
        frontLegStride: 0.45,
        frontFootLift: 0.3,
        backHandX: 4.7,
        backHandY: 5.7,
        frontHandX: 5.3,
        frontHandY: 5.5,
        propX: 7.1,
        propY: 4.7,
        propTilt: -0.04,
      }),
    ],
  },

  // 6-frame balancing stacked porcelain bowls (端碗盘)
  CARRY_DISHES: {
    fps: 9.0,
    loop: true,
    frames: [
      f({
        bodyBob: 0.1,
        torsoLean: 0.65,
        backLegStride: -0.75,
        frontLegStride: 0.75,
        backHandX: 4.6,
        backHandY: 6.8,
        frontHandX: 4.8,
        frontHandY: 7.4,
        propX: 6.5,
        propY: 6.4,
        propTilt: -0.06,
      }),
      f({
        bodyBob: -0.3,
        torsoLean: 0.75,
        backLegStride: -0.2,
        frontLegStride: 0.2,
        backFootLift: 0.55,
        backHandX: 4.7,
        backHandY: 7.0,
        frontHandX: 4.9,
        frontHandY: 7.6,
        propX: 6.6,
        propY: 6.6,
        propTilt: 0.0,
      }),
      f({
        bodyBob: 0.7,
        torsoLean: 0.55,
        backLegStride: 0.4,
        frontLegStride: -0.4,
        backFootLift: 0.3,
        backHandX: 4.5,
        backHandY: 6.5,
        frontHandX: 4.7,
        frontHandY: 7.1,
        propX: 6.4,
        propY: 6.1,
        propTilt: 0.06,
      }),
      f({
        bodyBob: 0.1,
        torsoLean: 0.65,
        backLegStride: 0.75,
        frontLegStride: -0.75,
        backHandX: 4.6,
        backHandY: 6.8,
        frontHandX: 4.8,
        frontHandY: 7.4,
        propX: 6.5,
        propY: 6.4,
        propTilt: 0.06,
      }),
      f({
        bodyBob: -0.3,
        torsoLean: 0.75,
        backLegStride: 0.2,
        frontLegStride: -0.2,
        frontFootLift: 0.55,
        backHandX: 4.7,
        backHandY: 7.0,
        frontHandX: 4.9,
        frontHandY: 7.6,
        propX: 6.6,
        propY: 6.6,
        propTilt: 0.0,
      }),
      f({
        bodyBob: 0.7,
        torsoLean: 0.55,
        backLegStride: -0.4,
        frontLegStride: 0.4,
        frontFootLift: 0.3,
        backHandX: 4.5,
        backHandY: 6.5,
        frontHandX: 4.7,
        frontHandY: 7.1,
        propX: 6.4,
        propY: 6.1,
        propTilt: -0.06,
      }),
    ],
  },

  // 6-frame leaning forward scrubbing dishes at the celadon wash basin (洗碗)
  WASH_DISHES: {
    fps: 8.5,
    loop: true,
    frames: [
      f({ bodyBob: -0.3, torsoLean: 1.9, headNod: 1.0, backHandX: 5.4, backHandY: 8.2, frontHandX: 4.6, frontHandY: 8.9, fxPhase: 0.0 }),
      f({ bodyBob: -0.5, torsoLean: 2.15, headNod: 1.15, backHandX: 6.5, backHandY: 7.4, frontHandX: 5.9, frontHandY: 8.2, fxPhase: 0.18 }),
      f({ bodyBob: -0.25, torsoLean: 1.85, headNod: 0.95, backHandX: 4.8, backHandY: 7.7, frontHandX: 6.4, frontHandY: 7.5, fxPhase: 0.36 }),
      f({ bodyBob: -0.45, torsoLean: 2.1, headNod: 1.1, backHandX: 6.3, backHandY: 8.5, frontHandX: 5.0, frontHandY: 9.0, fxPhase: 0.55 }),
      f({ bodyBob: -0.2, torsoLean: 1.8, headNod: 0.9, backHandX: 5.0, backHandY: 7.3, frontHandX: 6.6, frontHandY: 7.9, fxPhase: 0.74 }),
      f({ bodyBob: -0.4, torsoLean: 2.0, headNod: 1.05, backHandX: 6.0, backHandY: 8.0, frontHandX: 5.4, frontHandY: 8.6, fxPhase: 0.92 }),
    ],
  },

  // 6-frame gracious hospitality bow & inviting palm sweep (迎宾)
  WELCOME_GUEST: {
    fps: 5.2,
    loop: true,
    frames: [
      f({ bodyBob: 0.0, torsoLean: 0.3, headNod: 0.2, backHandX: 1.5, backHandY: 8.8, frontHandX: 2.6, frontHandY: 8.8, fxPhase: 0.0 }),
      f({ bodyBob: -0.35, torsoLean: 1.45, headNod: 1.15, backHandX: 2.2, backHandY: 9.2, frontHandX: 3.4, frontHandY: 8.5, fxPhase: 0.2 }),
      f({ bodyBob: -0.45, torsoLean: 1.75, headNod: 1.35, backHandX: 2.4, backHandY: 9.0, frontHandX: 6.8, frontHandY: 6.4, fxPhase: 0.45 }),
      f({ bodyBob: -0.2, torsoLean: 1.2, headNod: 0.9, backHandX: 2.0, backHandY: 8.9, frontHandX: 7.6, frontHandY: 5.2, fxPhase: 0.7 }),
      f({ bodyBob: 0.1, torsoLean: 0.6, headNod: 0.4, backHandX: 1.6, backHandY: 8.8, frontHandX: 5.8, frontHandY: 6.8, fxPhase: 0.88 }),
      f({ bodyBob: 0.0, torsoLean: 0.2, headNod: 0.15, backHandX: 1.5, backHandY: 8.9, frontHandX: 2.8, frontHandY: 8.8, fxPhase: 0.98 }),
    ],
  },

  // 6-frame lowering steaming copper pot smoothly onto hotpot table (上锅)
  SERVE_POT: {
    fps: 6.5,
    loop: true,
    frames: [
      f({ bodyBob: 0.1, torsoLean: 1.0, headNod: 0.4, backHandX: 5.2, backHandY: 6.4, frontHandX: 4.8, frontHandY: 7.0, propX: 7.2, propY: 6.6, fxPhase: 0.1 }),
      f({ bodyBob: -0.2, torsoLean: 1.6, headNod: 0.8, backHandX: 6.4, backHandY: 7.6, frontHandX: 6.0, frontHandY: 8.2, propX: 8.5, propY: 7.8, fxPhase: 0.3 }),
      f({ bodyBob: -0.5, torsoLean: 2.1, headNod: 1.1, backHandX: 7.2, backHandY: 8.8, frontHandX: 6.8, frontHandY: 9.2, propX: 9.4, propY: 9.0, fxPhase: 0.55 }),
      f({ bodyBob: -0.45, torsoLean: 1.9, headNod: 0.95, backHandX: 6.8, backHandY: 8.4, frontHandX: 6.4, frontHandY: 8.8, propX: 9.0, propY: 8.6, fxPhase: 0.75 }),
      f({ bodyBob: -0.1, torsoLean: 1.2, headNod: 0.5, backHandX: 5.6, backHandY: 7.2, frontHandX: 5.2, frontHandY: 7.8, propX: 7.8, propY: 7.4, fxPhase: 0.9 }),
      f({ bodyBob: 0.1, torsoLean: 0.8, headNod: 0.3, backHandX: 5.0, backHandY: 6.6, frontHandX: 4.6, frontHandY: 7.2, propX: 7.0, propY: 6.8, fxPhase: 1.0 }),
    ],
  },

  // 6-frame dynamic chef wok-tossing & ladle stir (炒菜/熬汤)
  COOK_WOK: {
    fps: 8.5,
    loop: true,
    frames: [
      f({ bodyBob: 0.0, torsoLean: 1.2, headNod: 0.5, backHandX: 5.2, backHandY: 7.4, frontHandX: 6.2, frontHandY: 7.8, propX: 7.8, propY: 7.6, propTilt: -0.1, fxPhase: 0.0 }),
      f({ bodyBob: -0.35, torsoLean: 1.55, headNod: 0.7, backHandX: 6.0, backHandY: 8.2, frontHandX: 7.0, frontHandY: 8.4, propX: 8.6, propY: 8.2, propTilt: 0.12, fxPhase: 0.2 }),
      f({ bodyBob: 0.55, torsoLean: 0.9, headNod: 0.25, backHandX: 5.8, backHandY: 5.6, frontHandX: 6.8, frontHandY: 5.8, propX: 8.4, propY: 5.8, propTilt: -0.26, fxPhase: 0.45 }),
      f({ bodyBob: 0.25, torsoLean: 1.15, headNod: 0.45, backHandX: 5.4, backHandY: 6.8, frontHandX: 5.2, frontHandY: 6.4, propX: 7.8, propY: 6.8, propTilt: -0.08, fxPhase: 0.65 }),
      f({ bodyBob: -0.2, torsoLean: 1.45, headNod: 0.65, backHandX: 6.1, backHandY: 7.8, frontHandX: 6.9, frontHandY: 7.6, propX: 8.4, propY: 7.6, propTilt: 0.08, fxPhase: 0.85 }),
      f({ bodyBob: 0.1, torsoLean: 1.15, headNod: 0.45, backHandX: 5.3, backHandY: 7.2, frontHandX: 6.0, frontHandY: 7.4, propX: 7.8, propY: 7.3, propTilt: -0.04, fxPhase: 0.98 }),
    ],
  },

  // 6-frame rhythmic knife slicing / cold-prep plating (切配)
  PREP_CHOP: {
    fps: 9.5,
    loop: true,
    frames: [
      f({ bodyBob: 0.0, torsoLean: 1.45, headNod: 0.9, backHandX: 5.0, backHandY: 8.0, frontHandX: 5.6, frontHandY: 6.0, propX: 7.2, propY: 6.2, propTilt: -0.35, fxPhase: 0.0 }),
      f({ bodyBob: -0.25, torsoLean: 1.65, headNod: 1.0, backHandX: 5.1, backHandY: 8.1, frontHandX: 6.2, frontHandY: 8.6, propX: 7.8, propY: 8.4, propTilt: 0.18, fxPhase: 0.3 }),
      f({ bodyBob: 0.05, torsoLean: 1.4, headNod: 0.85, backHandX: 4.9, backHandY: 7.9, frontHandX: 5.5, frontHandY: 6.2, propX: 7.1, propY: 6.4, propTilt: -0.3, fxPhase: 0.5 }),
      f({ bodyBob: -0.25, torsoLean: 1.65, headNod: 1.0, backHandX: 5.1, backHandY: 8.1, frontHandX: 6.3, frontHandY: 8.7, propX: 7.9, propY: 8.5, propTilt: 0.2, fxPhase: 0.75 }),
      f({ bodyBob: 0.05, torsoLean: 1.35, headNod: 0.8, backHandX: 4.8, backHandY: 7.8, frontHandX: 5.4, frontHandY: 6.6, propX: 7.0, propY: 6.8, propTilt: -0.2, fxPhase: 0.9 }),
      f({ bodyBob: -0.15, torsoLean: 1.55, headNod: 0.95, backHandX: 5.0, backHandY: 8.0, frontHandX: 6.0, frontHandY: 8.2, propX: 7.6, propY: 8.1, propTilt: 0.1, fxPhase: 1.0 }),
    ],
  },

  // 6-frame sweeping wiping cloth over table (收桌擦台)
  CLEAR_WIPE: {
    fps: 8.0,
    loop: true,
    frames: [
      f({ bodyBob: -0.2, torsoLean: 1.8, headNod: 0.9, backHandX: 4.2, backHandY: 8.6, frontHandX: 4.4, frontHandY: 8.2, propX: 5.8, propY: 8.4, fxPhase: 0.0 }),
      f({ bodyBob: -0.45, torsoLean: 2.15, headNod: 1.1, backHandX: 4.6, backHandY: 8.8, frontHandX: 7.2, frontHandY: 7.4, propX: 8.2, propY: 7.6, fxPhase: 0.25 }),
      f({ bodyBob: -0.3, torsoLean: 1.95, headNod: 0.95, backHandX: 4.4, backHandY: 8.4, frontHandX: 6.8, frontHandY: 9.0, propX: 7.8, propY: 9.0, fxPhase: 0.5 }),
      f({ bodyBob: -0.15, torsoLean: 1.7, headNod: 0.85, backHandX: 4.0, backHandY: 8.5, frontHandX: 4.8, frontHandY: 8.8, propX: 6.0, propY: 8.8, fxPhase: 0.72 }),
      f({ bodyBob: -0.4, torsoLean: 2.1, headNod: 1.05, backHandX: 4.5, backHandY: 8.6, frontHandX: 7.0, frontHandY: 7.8, propX: 8.0, propY: 7.8, fxPhase: 0.88 }),
      f({ bodyBob: -0.2, torsoLean: 1.85, headNod: 0.9, backHandX: 4.2, backHandY: 8.5, frontHandX: 5.2, frontHandY: 8.4, propX: 6.4, propY: 8.4, fxPhase: 1.0 }),
    ],
  },

  // 6-frame neatly arranging tableware bowls & chopsticks (摆台)
  SET_TABLE: {
    fps: 6.5,
    loop: true,
    frames: [
      f({ bodyBob: 0.0, torsoLean: 1.2, headNod: 0.6, backHandX: 4.2, backHandY: 7.4, frontHandX: 5.4, frontHandY: 7.8, fxPhase: 0.1 }),
      f({ bodyBob: -0.3, torsoLean: 1.75, headNod: 0.95, backHandX: 4.6, backHandY: 7.8, frontHandX: 7.0, frontHandY: 8.8, fxPhase: 0.35 }),
      f({ bodyBob: -0.1, torsoLean: 1.35, headNod: 0.7, backHandX: 4.4, backHandY: 7.4, frontHandX: 5.2, frontHandY: 7.4, fxPhase: 0.55 }),
      f({ bodyBob: -0.3, torsoLean: 1.8, headNod: 0.95, backHandX: 5.2, backHandY: 8.2, frontHandX: 6.6, frontHandY: 8.4, fxPhase: 0.78 }),
      f({ bodyBob: 0.05, torsoLean: 1.0, headNod: 0.45, backHandX: 4.0, backHandY: 7.6, frontHandX: 4.8, frontHandY: 7.6, fxPhase: 0.92 }),
      f({ bodyBob: 0.0, torsoLean: 1.15, headNod: 0.55, backHandX: 4.2, backHandY: 7.5, frontHandX: 5.2, frontHandY: 7.7, fxPhase: 1.0 }),
    ],
  },

  // 6-frame arranging fresh seafood onto ice / buffet bar (补菜)
  RESTOCK: {
    fps: 7.2,
    loop: true,
    frames: [
      f({ bodyBob: 0.0, torsoLean: 1.35, headNod: 0.65, backHandX: 4.8, backHandY: 7.0, frontHandX: 5.4, frontHandY: 7.2, propX: 6.6, propY: 6.8, fxPhase: 0.1 }),
      f({ bodyBob: -0.35, torsoLean: 1.9, headNod: 1.0, backHandX: 5.8, backHandY: 8.2, frontHandX: 6.8, frontHandY: 8.4, propX: 7.8, propY: 8.0, fxPhase: 0.35 }),
      f({ bodyBob: -0.15, torsoLean: 1.55, headNod: 0.8, backHandX: 5.2, backHandY: 7.4, frontHandX: 6.2, frontHandY: 7.0, propX: 7.0, propY: 7.2, fxPhase: 0.55 }),
      f({ bodyBob: -0.35, torsoLean: 1.85, headNod: 0.95, backHandX: 6.0, backHandY: 8.0, frontHandX: 7.0, frontHandY: 8.2, propX: 7.9, propY: 7.9, fxPhase: 0.78 }),
      f({ bodyBob: 0.05, torsoLean: 1.2, headNod: 0.55, backHandX: 4.6, backHandY: 7.2, frontHandX: 5.2, frontHandY: 7.4, propX: 6.5, propY: 7.0, fxPhase: 0.92 }),
      f({ bodyBob: 0.0, torsoLean: 1.3, headNod: 0.6, backHandX: 4.8, backHandY: 7.1, frontHandX: 5.4, frontHandY: 7.3, propX: 6.6, propY: 6.9, fxPhase: 1.0 }),
    ],
  },

  // 6-frame lively seated hotpot dining sequence (dip chopsticks -> lift -> taste -> nod)
  DINING_EAT: {
    fps: 3.4,
    loop: true,
    frames: [
      f({ bodyBob: 0.0, torsoLean: 0.35, headNod: 0.1, frontHandX: 5.2, frontHandY: 7.8, propTilt: 0.05, fxPhase: 0.0 }),
      f({ bodyBob: -0.2, torsoLean: 1.25, headNod: 0.6, frontHandX: 7.4, frontHandY: 8.8, propTilt: 0.32, fxPhase: 0.2 }),
      f({ bodyBob: -0.1, torsoLean: 0.95, headNod: 0.45, frontHandX: 7.0, frontHandY: 7.2, propTilt: 0.12, fxPhase: 0.42 }),
      f({ bodyBob: 0.25, torsoLean: 0.3, headNod: -0.15, frontHandX: 4.4, frontHandY: 4.2, propTilt: -0.32, fxPhase: 0.65 }),
      f({ bodyBob: 0.1, torsoLean: 0.45, headNod: 0.35, frontHandX: 4.8, frontHandY: 5.2, propTilt: -0.18, fxPhase: 0.82 }),
      f({ bodyBob: 0.0, torsoLean: 0.3, headNod: 0.05, frontHandX: 5.4, frontHandY: 7.6, propTilt: 0.02, fxPhase: 0.96 }),
    ],
  },

  // 4-frame seated waiting for broth (glancing & gently tapping fingers)
  DINING_WAIT: {
    fps: 2.8,
    loop: true,
    frames: [
      f({ bodyBob: 0.0, torsoLean: 0.2, headNod: 0.0, frontHandX: 4.8, frontHandY: 8.2, fxPhase: 0.0 }),
      f({ bodyBob: 0.15, torsoLean: 0.35, headNod: -0.25, frontHandX: 5.2, frontHandY: 7.5, fxPhase: 0.35 }),
      f({ bodyBob: 0.0, torsoLean: 0.25, headNod: 0.15, frontHandX: 5.0, frontHandY: 8.3, fxPhase: 0.68 }),
      f({ bodyBob: -0.1, torsoLean: 0.15, headNod: 0.0, frontHandX: 4.7, frontHandY: 8.0, fxPhase: 0.95 }),
    ],
  },

  // 4-frame expressive queuing stance (VIP reads menu, Elder strokes chin, Guest shifts weight)
  QUEUE_WAIT: {
    fps: 2.4,
    loop: true,
    frames: [
      f({ bodyBob: 0.0, torsoLean: 0.1, headNod: 0.0, backHandX: -0.8, backHandY: 10.6, frontHandX: 2.4, frontHandY: 8.6, fxPhase: 0.0 }),
      f({ bodyBob: 0.25, torsoLean: 0.2, headNod: 0.35, backHandX: -0.6, backHandY: 10.4, frontHandX: 2.8, frontHandY: 7.8, fxPhase: 0.33 }),
      f({ bodyBob: 0.35, torsoLean: 0.15, headNod: 0.25, backHandX: -0.7, backHandY: 10.5, frontHandX: 2.5, frontHandY: 8.0, fxPhase: 0.66 }),
      f({ bodyBob: 0.1, torsoLean: 0.05, headNod: -0.1, backHandX: -0.9, backHandY: 10.7, frontHandX: 2.2, frontHandY: 8.8, fxPhase: 0.92 }),
    ],
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Samples the multi-frame isometric animation sequence at `animTime` (seconds),
 * smoothly blending adjacent keyframes while preserving crisp animation rhythm.
 */
export function sampleIsoPose(state: IsoAnimState, animTime: number): CharacterPoseFrame {
  const clip = ISO_ANIMATION_SEQUENCES[state] ?? ISO_ANIMATION_SEQUENCES.IDLE;
  const count = clip.frames.length;
  if (count <= 1) return clip.frames[0];

  const rawFrame = Math.max(0, animTime) * clip.fps;
  const wrapped = clip.loop ? rawFrame % count : Math.min(count - 1.0001, rawFrame);
  const idx0 = Math.floor(wrapped) % count;
  const idx1 = clip.loop ? (idx0 + 1) % count : Math.min(count - 1, idx0 + 1);
  // Subtle eased step blend gives lively hand-drawn sprite energy without robotic stiffness
  const frac = wrapped - Math.floor(wrapped);
  const t = frac * frac * (3 - 2 * frac);

  const a = clip.frames[idx0];
  const b = clip.frames[idx1];
  return {
    bodyBob: lerp(a.bodyBob, b.bodyBob, t),
    torsoLean: lerp(a.torsoLean, b.torsoLean, t),
    headNod: lerp(a.headNod, b.headNod, t),
    backLegStride: lerp(a.backLegStride, b.backLegStride, t),
    frontLegStride: lerp(a.frontLegStride, b.frontLegStride, t),
    backFootLift: lerp(a.backFootLift, b.backFootLift, t),
    frontFootLift: lerp(a.frontFootLift, b.frontFootLift, t),
    backHandX: lerp(a.backHandX, b.backHandX, t),
    backHandY: lerp(a.backHandY, b.backHandY, t),
    frontHandX: lerp(a.frontHandX, b.frontHandX, t),
    frontHandY: lerp(a.frontHandY, b.frontHandY, t),
    propX: lerp(a.propX, b.propX, t),
    propY: lerp(a.propY, b.propY, t),
    propTilt: lerp(a.propTilt, b.propTilt, t),
    fxPhase: lerp(a.fxPhase, b.fxPhase, t),
  };
}

/**
 * Converts a world-space vector (dx, dy) into the 4 isometric facing directions
 * matching the 2:1 projection ix = (wx - wy) * 0.72, iy = (wx + wy) * 0.36.
 */
export function facingFromDelta(dx: number, dy: number, fallback: IsoFacing = 'SE'): IsoFacing {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return fallback;
  const ix = dx - dy;
  const iy = dx + dy;
  if (iy >= 0) {
    return ix >= 0 ? 'SE' : 'SW';
  }
  return ix >= 0 ? 'NE' : 'NW';
}

export function facingFromRadians(rad: number | undefined, fallback: IsoFacing = 'SE'): IsoFacing {
  if (typeof rad !== 'number' || !Number.isFinite(rad)) return fallback;
  return facingFromDelta(Math.cos(rad), Math.sin(rad), fallback);
}

function carryingWalkState(carrying: CarryItemType): IsoAnimState {
  if (carrying === 'BROTH_POT') return 'CARRY_POT';
  if (carrying === 'SEAFOOD_TRAY' || carrying === 'COOKED_PLATTER') return 'CARRY_TRAY';
  if (carrying === 'DIRTY_DISHES' || carrying === 'CLEAN_TABLEWARE') return 'CARRY_DISHES';
  return 'WALK';
}

function taskStepToInteractAnim(step: TaskStep): IsoAnimState {
  switch (step.type) {
    case 'WASH_DISHES':
      return 'WASH_DISHES';
    case 'WELCOME_GUEST':
      return 'WELCOME_GUEST';
    case 'SERVE_BROTH':
      return 'SERVE_POT';
    case 'COOK_FOOD':
      return 'COOK_WOK';
    case 'PICKUP_SEAFOOD':
      return 'PREP_CHOP';
    case 'CLEAR_TABLE':
      return 'CLEAR_WIPE';
    case 'SET_TABLEWARE':
      return 'SET_TABLE';
    case 'RESTOCK_BUFFET':
    case 'DELIVER_COOKED':
      return 'RESTOCK';
    case 'PICKUP_BROTH':
      return 'COOK_WOK';
    case 'DROP_DIRTY':
      return 'WASH_DISHES';
    case 'PICKUP_CLEAN_DISH':
      return 'SET_TABLE';
    default:
      return 'IDLE';
  }
}

function resolveInteractFacing(
  step: TaskStep,
  actorX: number,
  actorY: number,
  world: GameWorld,
  fallback: IsoFacing
): IsoFacing {
  switch (step.type) {
    case 'WASH_DISHES':
    case 'DROP_DIRTY':
    case 'PICKUP_CLEAN_DISH':
    case 'COOK_FOOD':
    case 'PICKUP_BROTH':
    case 'PICKUP_SEAFOOD':
      // Top kitchen stations sit on the north edge (-Y -> NE in iso view)
      return 'NE';
    case 'WELCOME_GUEST':
      // Reception desk faces the outdoor entrance queue (+Y -> SW in iso view)
      return 'SW';
    case 'SERVE_BROTH':
    case 'CLEAR_TABLE':
    case 'SET_TABLEWARE': {
      // Face precisely toward the center of the target hotpot table
      const table =
        typeof step.targetId === 'number'
          ? world.tables.find((t) => t.id === step.targetId)
          : undefined;
      if (table) {
        return facingFromDelta(table.x - actorX, table.y - actorY, fallback);
      }
      return facingFromDelta(step.targetX - actorX, step.targetY - actorY, fallback);
    }
    case 'RESTOCK_BUFFET': {
      const slot =
        typeof step.targetId === 'number'
          ? world.buffetSlots.find((s) => s.slotIndex === step.targetId)
          : undefined;
      if (slot) {
        return facingFromDelta(slot.x - actorX, slot.y - actorY, fallback);
      }
      return facingFromDelta(step.targetX - actorX, step.targetY - actorY, fallback);
    }
    default:
      return facingFromDelta(step.targetX - actorX, step.targetY - actorY, fallback);
  }
}

export function resolveStaffAnimAndFacing(
  staff: HiredStaff,
  world: GameWorld,
  timeSec: number
): { animState: IsoAnimState; facing: IsoFacing; animTime: number } {
  const step = staff.taskQueue[0];
  const defaultFacing: IsoFacing =
    staff.role === 'HOST'
      ? 'SW'
      : staff.role === 'CHEF' || staff.role === 'DISHWASHER'
        ? 'NE'
        : 'SE';
  let facing = facingFromRadians(staff.facing, defaultFacing);

  if (step) {
    const dist = Math.hypot(step.targetX - staff.x, step.targetY - staff.y);
    const isWorking = (step.progress ?? 0) > 0 || (step.type !== 'WALK_TO' && dist <= 18);
    if (isWorking) {
      facing = resolveInteractFacing(step, staff.x, staff.y, world, facing);
      return {
        animState: taskStepToInteractAnim(step),
        facing,
        animTime: timeSec + (staff.id.charCodeAt(0) % 7) * 0.37,
      };
    }
    // Walking to task
    if (dist > 2) {
      facing = facingFromDelta(step.targetX - staff.x, step.targetY - staff.y, facing);
    }
    return {
      animState: carryingWalkState(staff.carrying),
      facing,
      animTime: staff.walkCycle * 0.14,
    };
  }

  // Idle ambient role animations so idle staff still feel alive at their posts!
  const seedPhase = (staff.id.charCodeAt(staff.id.length - 1) % 11) * 0.43;
  if (staff.carrying !== 'NONE') {
    return { animState: carryingWalkState(staff.carrying), facing, animTime: timeSec * 0.35 + seedPhase };
  }
  if (staff.role === 'HOST' && world.queue.length > 0) {
    return { animState: 'WELCOME_GUEST', facing: 'SW', animTime: timeSec + seedPhase };
  }
  if (staff.role === 'CHEF' && world.phase === 'PLAYING') {
    return { animState: 'COOK_WOK', facing: 'NE', animTime: timeSec + seedPhase };
  }
  if (staff.role === 'SUSHI_CHEF' && world.phase === 'PLAYING') {
    return { animState: 'PREP_CHOP', facing: 'NE', animTime: timeSec + seedPhase };
  }
  if (staff.role === 'DISHWASHER' && world.dirtyDishes > 0) {
    return { animState: 'WASH_DISHES', facing: 'NE', animTime: timeSec + seedPhase };
  }
  return { animState: 'IDLE', facing, animTime: timeSec + seedPhase };
}

export function resolveManagerAnimAndFacing(
  player: PlayerState,
  world: GameWorld,
  timeSec: number,
  isBackstage: boolean
): { animState: IsoAnimState; facing: IsoFacing; animTime: number } {
  if (isBackstage) {
    const bp = world.backstagePlayer;
    const isMoving = bp.targetX !== null && bp.targetY !== null;
    const facing = facingFromRadians(bp.facing, 'SE');
    return {
      animState: isMoving ? 'WALK' : 'IDLE',
      facing,
      animTime: isMoving ? bp.walkCycle * 0.14 : timeSec,
    };
  }

  const step = player.taskQueue[0];
  let facing = facingFromRadians(player.facing, 'SE');

  if (step) {
    const dist = Math.hypot(step.targetX - player.x, step.targetY - player.y);
    const isWorking =
      (step.progress ?? 0) > 0 ||
      (step.type !== 'WALK_TO' && step.type !== 'ENTER_BACKSTAGE' && dist <= 22);
    if (isWorking) {
      facing = resolveInteractFacing(step, player.x, player.y, world, facing);
      return {
        animState: taskStepToInteractAnim(step),
        facing,
        animTime: timeSec,
      };
    }

    return {
      animState: carryingWalkState(player.carrying),
      facing,
      animTime: player.walkCycle * 0.14,
    };
  }

  const isManualWalking = (player.manualMoveTimer ?? 0) > 0;
  if (player.carrying !== 'NONE') {
    return {
      animState: carryingWalkState(player.carrying),
      facing,
      animTime: isManualWalking ? player.walkCycle * 0.14 : timeSec * 0.18,
    };
  }
  return {
    animState: isManualWalking ? 'WALK' : 'IDLE',
    facing,
    animTime: isManualWalking ? player.walkCycle * 0.14 : timeSec,
  };
}
