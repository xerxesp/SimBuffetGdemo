import { SeasonId, WeatherId } from '../types/game';
import { BgmTrackId } from '../types/settings';

// MIDI note number to frequency (Hz)
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface TrackPattern {
  bpm: number;
  stepsPerBeat: number; // 2 = eighth notes, 4 = sixteenth notes
  length: number; // total steps in loop
  pluck: Array<number | null>; // Guzheng / Pipa melodic line (MIDI)
  flute?: Array<number | null>; // Bamboo Dizi / lyrical lead (MIDI)
  bass: Array<number | null>; // Warm plucked / cello bass (MIDI)
  chords: Record<number, number[]>; // Step -> sustained chord MIDI array
  perc?: Record<number, 'WOOD' | 'TAIKO' | 'SHAKER' | 'CLAP' | 'BELL'>;
  ambient?: 'HARBOR' | 'SIMMER' | 'NONE';
}

// 6 distinct hand-crafted pentatonic soundtracks for 《潮鲜沸鼎》
const TRACKS: Record<BgmTrackId, TrackPattern> = {
  // 1. 《海畔灯火 · 潮鲜序曲》 — Grand serene coastal harbor title theme (D Major Pentatonic)
  TITLE: {
    bpm: 78,
    stepsPerBeat: 2,
    length: 32,
    pluck: [
      62, 66, 69, 74, 71, 69, 66, null,
      64, 69, 71, 76, 74, 71, 69, null,
      62, 66, 69, 74, 78, 76, 74, 71,
      69, 66, 64, 66, 62, null, 69, null,
    ],
    flute: [
      null, null, null, null, 74, null, 76, null,
      78, null, null, 76, 74, null, null, null,
      null, null, 71, null, 74, null, 76, null,
      74, null, 71, null, 69, null, null, null,
    ],
    bass: [
      50, null, null, null, 57, null, null, null,
      47, null, null, null, 54, null, null, null,
      43, null, null, null, 50, null, null, null,
      45, null, null, null, 50, null, null, null,
    ],
    chords: {
      0: [50, 57, 62, 66],
      8: [47, 54, 59, 66],
      16: [43, 50, 55, 62],
      24: [45, 52, 57, 64],
    },
    perc: {
      0: 'BELL',
      8: 'WOOD',
      16: 'BELL',
      24: 'WOOD',
      28: 'SHAKER',
    },
    ambient: 'HARBOR',
  },

  // 2. 《晨市备鲜 · 雅集小调》 — Crisp, cozy morning prep & configuration theme (G Major Pentatonic)
  PREP: {
    bpm: 94,
    stepsPerBeat: 2,
    length: 32,
    pluck: [
      67, null, 71, 74, 76, null, 74, 71,
      69, null, 71, 74, 71, null, 67, null,
      67, 69, 71, 74, 79, null, 76, 74,
      71, null, 69, 67, 69, null, 71, null,
    ],
    flute: [
      null, null, null, null, null, null, null, null,
      74, null, 76, null, 79, null, null, null,
      null, null, null, null, 76, null, 74, null,
      71, null, null, null, 67, null, null, null,
    ],
    bass: [
      43, null, 50, null, 43, null, 50, null,
      45, null, 52, null, 47, null, 54, null,
      48, null, 55, null, 43, null, 50, null,
      45, null, 50, null, 43, null, null, null,
    ],
    chords: {
      0: [55, 59, 62],
      8: [57, 60, 64],
      16: [55, 60, 64],
      24: [57, 62, 67],
    },
    perc: {
      0: 'WOOD',
      4: 'SHAKER',
      8: 'WOOD',
      12: 'SHAKER',
      16: 'WOOD',
      20: 'SHAKER',
      24: 'WOOD',
      28: 'BELL',
    },
    ambient: 'NONE',
  },

  // 3. 《沸鼎欢歌 · 午市生财》 — Lively, upbeat bustling seafood hotpot hall (C Major Pentatonic)
  SERVICE: {
    bpm: 114,
    stepsPerBeat: 2,
    length: 32,
    pluck: [
      72, 74, 76, null, 79, 76, 74, 72,
      69, 72, 74, null, 76, null, 72, null,
      76, 79, 81, null, 79, 76, 74, 76,
      72, null, 74, 72, 69, 67, 72, null,
    ],
    flute: [
      null, null, 76, null, 79, null, null, null,
      null, null, 74, null, 72, null, null, null,
      null, null, 81, null, 84, null, 81, null,
      79, null, null, null, 76, null, null, null,
    ],
    bass: [
      48, null, 55, null, 48, null, 55, 52,
      45, null, 52, null, 43, null, 50, null,
      41, null, 48, null, 43, null, 50, null,
      48, null, 55, null, 48, null, 52, null,
    ],
    chords: {
      0: [55, 60, 64],
      8: [57, 60, 64],
      16: [53, 57, 60],
      24: [55, 59, 62],
    },
    perc: {
      0: 'TAIKO',
      2: 'SHAKER',
      4: 'WOOD',
      6: 'SHAKER',
      8: 'TAIKO',
      10: 'SHAKER',
      12: 'CLAP',
      14: 'SHAKER',
      16: 'TAIKO',
      18: 'SHAKER',
      20: 'WOOD',
      22: 'SHAKER',
      24: 'TAIKO',
      26: 'WOOD',
      28: 'CLAP',
      30: 'SHAKER',
    },
    ambient: 'SIMMER',
  },

  // 4. 《潮涌八方 · 高峰狂想》 — Energetic dinner-rush taiko + pipa groove (A Minor / D Dorian Pentatonic)
  RUSH: {
    bpm: 132,
    stepsPerBeat: 2,
    length: 32,
    pluck: [
      69, 72, 74, 76, 79, 76, 74, 72,
      69, 67, 69, 72, 74, null, 76, null,
      81, 79, 76, 74, 76, 79, 81, 84,
      81, 79, 76, 74, 72, 74, 69, null,
    ],
    flute: [
      81, null, null, 79, 76, null, 74, null,
      76, null, null, null, 72, null, 74, null,
      84, null, 81, null, 79, null, 76, null,
      79, null, 76, 74, 69, null, null, null,
    ],
    bass: [
      45, 45, 52, null, 45, null, 52, 50,
      43, 43, 50, null, 45, null, 52, null,
      41, 41, 48, null, 43, 43, 50, null,
      45, null, 52, 50, 45, null, 43, null,
    ],
    chords: {
      0: [52, 57, 60],
      8: [50, 55, 59],
      16: [48, 53, 57],
      24: [52, 55, 59],
    },
    perc: {
      0: 'TAIKO',
      2: 'WOOD',
      4: 'CLAP',
      6: 'TAIKO',
      8: 'TAIKO',
      10: 'SHAKER',
      12: 'CLAP',
      14: 'WOOD',
      16: 'TAIKO',
      18: 'WOOD',
      20: 'CLAP',
      22: 'TAIKO',
      24: 'TAIKO',
      26: 'WOOD',
      28: 'CLAP',
      30: 'TAIKO',
    },
    ambient: 'SIMMER',
  },

  // 5. 《暮潮收炉 · 夜港晚风》 — Warm late-night closing & ledger theme (F Major Pentatonic)
  CLOSING: {
    bpm: 72,
    stepsPerBeat: 2,
    length: 32,
    pluck: [
      65, null, 69, null, 72, null, 74, null,
      72, null, 69, null, 67, null, null, null,
      62, null, 65, null, 69, null, 72, null,
      69, null, 67, null, 65, null, null, null,
    ],
    flute: [
      null, null, null, null, 77, null, 74, null,
      72, null, null, null, null, null, null, null,
      null, null, null, null, 74, null, 72, null,
      69, null, 67, null, 65, null, null, null,
    ],
    bass: [
      41, null, null, null, 48, null, null, null,
      45, null, null, null, 52, null, null, null,
      46, null, null, null, 53, null, null, null,
      48, null, null, null, 41, null, null, null,
    ],
    chords: {
      0: [53, 57, 60, 65],
      8: [52, 57, 60, 64],
      16: [50, 53, 58, 62],
      24: [53, 55, 60, 65],
    },
    perc: {
      0: 'BELL',
      16: 'BELL',
    },
    ambient: 'HARBOR',
  },

  // 6. 《灯熄潮退 · 歇业余韵》 — Quiet melancholic closing theme (D Minor Pentatonic)
  GAME_OVER: {
    bpm: 60,
    stepsPerBeat: 2,
    length: 16,
    pluck: [
      62, null, 65, null, 69, null, 65, null,
      64, null, 62, null, 57, null, null, null,
    ],
    bass: [
      38, null, null, null, 45, null, null, null,
      41, null, null, null, 38, null, null, null,
    ],
    chords: {
      0: [50, 53, 57],
      8: [48, 53, 57],
    },
    perc: {
      0: 'BELL',
    },
    ambient: 'HARBOR',
  },
};

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  public muted = false;
  public bgmMuted = false;
  public volume = 0.78; // Master 0..1
  public bgmVolume = 0.65; // BGM 0..1
  public sfxVolume = 0.85; // SFX 0..1

  private currentTrack: BgmTrackId | null = null;
  private desiredTrack: BgmTrackId = 'TITLE';
  private stepIndex = 0;
  private nextNoteTime = 0;
  private schedulerId: number | null = null;
  private gestureBound = false;

  // Weather & Season atmospheric audio engine
  private ambientBus: GainNode | null = null;
  private bgmWarmFilter: BiquadFilterNode | null = null;
  private weatherBedSource: AudioBufferSourceNode | null = null;
  private weatherBedFilter: BiquadFilterNode | null = null;
  private weatherBedGain: GainNode | null = null;
  private weatherWindLfo: OscillatorNode | null = null;
  private weatherWindLfoGain: GainNode | null = null;
  private activeSeason: SeasonId = 'SPRING';
  private activeWeather: WeatherId = 'SUNNY';
  private inGameplayEnv = false;
  private lastCheckoutMs = 0;
  private checkoutComboCount = 0;
  private lastDialogueTickMs = 0;

  constructor() {
    this.bindUnlockGesture();
  }

  private bindUnlockGesture() {
    if (this.gestureBound || typeof window === 'undefined') return;
    this.gestureBound = true;
    const unlock = () => {
      const audio = this.ensureContext(true);
      if (audio) {
        this.startSchedulerIfNeeded();
      }
      if (this.ctx && this.ctx.state === 'running') {
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('touchend', unlock);
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('touchend', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });

    // Resume AudioContext cleanly when returning to the app on iOS/Android/HarmonyOS
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.visibilityState === 'visible') {
        if (this.ctx.state !== 'running') {
          this.ctx.resume().catch(() => {});
        }
        this.nextNoteTime = this.ctx.currentTime + 0.1;
      }
    });
  }

  private ensureContext(forBgm = false): {
    ctx: AudioContext;
    sfxOut: GainNode;
    bgmOut: GainNode;
    reverb: GainNode;
  } | null {
    if (!forBgm && (this.muted || this.volume <= 0.001 || this.sfxVolume <= 0.001)) {
      return null;
    }
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        this.ctx = ctx;

        // Soft mastering compressor to keep layered BGM + SFX smooth and clip-free
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -14;
        compressor.knee.value = 18;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.006;
        compressor.release.value = 0.2;
        compressor.connect(ctx.destination);

        const master = ctx.createGain();
        master.gain.value = this.muted ? 0 : this.volume;
        master.connect(compressor);
        this.masterGain = master;

        // SFX Bus
        const sfx = ctx.createGain();
        sfx.gain.value = this.sfxVolume;
        sfx.connect(master);
        this.sfxBus = sfx;

        // BGM Bus with warm low-pass rolloff (seasonally tuned) so music sits comfortably behind gameplay
        const bgm = ctx.createGain();
        bgm.gain.value = this.bgmMuted ? 0 : this.bgmVolume * 0.42;
        const bgmWarmFilter = ctx.createBiquadFilter();
        bgmWarmFilter.type = 'lowpass';
        bgmWarmFilter.frequency.value = 4600;
        bgm.connect(bgmWarmFilter);
        bgmWarmFilter.connect(master);
        this.bgmBus = bgm;
        this.bgmWarmFilter = bgmWarmFilter;

        // Dedicated Weather & Season Ambient Bus
        const ambient = ctx.createGain();
        ambient.gain.value = this.computeAmbientBusGain();
        ambient.connect(master);
        this.ambientBus = ambient;

        // Gentle studio feedback-delay space for guzheng / flute warmth
        const delaySend = ctx.createGain();
        delaySend.gain.value = 0.24;
        const delayNode = ctx.createDelay(0.6);
        delayNode.delayTime.value = 0.29;
        const feedback = ctx.createGain();
        feedback.gain.value = 0.28;
        const delayFilter = ctx.createBiquadFilter();
        delayFilter.type = 'lowpass';
        delayFilter.frequency.value = 2200;

        delaySend.connect(delayNode);
        delayNode.connect(delayFilter);
        delayFilter.connect(feedback);
        feedback.connect(delayNode);
        delayFilter.connect(bgm);
        this.reverbSend = delaySend;

        // Reusable 2-second white-noise buffer for percussion, steam, ice, waves, rain & wind
        const bufLen = ctx.sampleRate * 2;
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buf;

        // Continuous crossfaded weather noise bed (rain / typhoon gale / snow breeze / harbor air)
        this.initWeatherBed(ctx, ambient, buf);
      }
    }

    if (!this.ctx || !this.masterGain || !this.bgmBus || !this.sfxBus || !this.reverbSend) {
      return null;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.syncGains();
    this.applyEnvironmentAudio();
    return {
      ctx: this.ctx,
      sfxOut: this.sfxBus,
      bgmOut: this.bgmBus,
      reverb: this.reverbSend,
    };
  }

  private computeAmbientBusGain(): number {
    if (this.muted || this.volume <= 0.001) return 0;
    const base = Math.max(this.sfxVolume * 0.72, this.bgmMuted ? 0 : this.bgmVolume * 0.6);
    const sceneMult = this.inGameplayEnv ? 1.0 : 0.22;
    return base * sceneMult;
  }

  private initWeatherBed(ctx: AudioContext, ambientOut: GainNode, noiseBuf: AudioBuffer) {
    if (this.weatherBedSource) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = 0.0001;

    // Slow organic wind gust LFO modulating the weather filter cutoff
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.16;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 40;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ambientOut);

    src.start();
    lfo.start();

    this.weatherBedSource = src;
    this.weatherBedFilter = filter;
    this.weatherBedGain = gain;
    this.weatherWindLfo = lfo;
    this.weatherWindLfoGain = lfoGain;
  }

  private applyEnvironmentAudio() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Seasonal timbral warmth on the BGM master filter
    if (this.bgmWarmFilter) {
      const seasonCutoff: Record<SeasonId, number> = {
        SPRING: 4950,
        SUMMER: 5300,
        AUTUMN: 4200,
        WINTER: 3650,
      };
      this.bgmWarmFilter.frequency.setTargetAtTime(seasonCutoff[this.activeSeason], now, 0.35);
    }

    // 2. Continuous Weather Bed crossfade
    if (this.weatherBedFilter && this.weatherBedGain && this.weatherWindLfo && this.weatherWindLfoGain) {
      switch (this.activeWeather) {
        case 'SUNNY':
          this.weatherBedFilter.type = 'lowpass';
          this.weatherBedFilter.frequency.setTargetAtTime(420, now, 0.45);
          this.weatherBedFilter.Q.setTargetAtTime(0.6, now, 0.35);
          this.weatherWindLfo.frequency.setTargetAtTime(0.11, now, 0.3);
          this.weatherWindLfoGain.gain.setTargetAtTime(45, now, 0.35);
          this.weatherBedGain.gain.setTargetAtTime(0.014, now, 0.5);
          break;
        case 'RAINY':
          this.weatherBedFilter.type = 'bandpass';
          this.weatherBedFilter.frequency.setTargetAtTime(1650, now, 0.45);
          this.weatherBedFilter.Q.setTargetAtTime(0.62, now, 0.35);
          this.weatherWindLfo.frequency.setTargetAtTime(0.22, now, 0.3);
          this.weatherWindLfoGain.gain.setTargetAtTime(190, now, 0.35);
          this.weatherBedGain.gain.setTargetAtTime(0.062, now, 0.5);
          break;
        case 'TYPHOON':
          this.weatherBedFilter.type = 'bandpass';
          this.weatherBedFilter.frequency.setTargetAtTime(760, now, 0.4);
          this.weatherBedFilter.Q.setTargetAtTime(1.15, now, 0.35);
          this.weatherWindLfo.frequency.setTargetAtTime(0.29, now, 0.3);
          this.weatherWindLfoGain.gain.setTargetAtTime(340, now, 0.35);
          this.weatherBedGain.gain.setTargetAtTime(0.095, now, 0.45);
          break;
        case 'SNOWY':
          this.weatherBedFilter.type = 'bandpass';
          this.weatherBedFilter.frequency.setTargetAtTime(1020, now, 0.45);
          this.weatherBedFilter.Q.setTargetAtTime(1.35, now, 0.35);
          this.weatherWindLfo.frequency.setTargetAtTime(0.14, now, 0.3);
          this.weatherWindLfoGain.gain.setTargetAtTime(180, now, 0.35);
          this.weatherBedGain.gain.setTargetAtTime(0.036, now, 0.55);
          break;
        case 'HEATWAVE':
          this.weatherBedFilter.type = 'lowpass';
          this.weatherBedFilter.frequency.setTargetAtTime(520, now, 0.45);
          this.weatherBedFilter.Q.setTargetAtTime(0.7, now, 0.35);
          this.weatherWindLfo.frequency.setTargetAtTime(0.09, now, 0.3);
          this.weatherWindLfoGain.gain.setTargetAtTime(35, now, 0.35);
          this.weatherBedGain.gain.setTargetAtTime(0.016, now, 0.5);
          break;
      }
    }

    if (this.ambientBus) {
      this.ambientBus.gain.setTargetAtTime(this.computeAmbientBusGain(), now, 0.25);
    }
  }

  /** Sync continuous weather & season soundscape with live world state */
  setEnvironment(season: SeasonId, weather: WeatherId, inGameplay = true) {
    const changed =
      this.activeSeason !== season ||
      this.activeWeather !== weather ||
      this.inGameplayEnv !== inGameplay;
    this.activeSeason = season;
    this.activeWeather = weather;
    this.inGameplayEnv = inGameplay;
    if (changed && this.ctx) {
      this.applyEnvironmentAudio();
    }
  }

  private syncGains() {
    if (!this.ctx || !this.masterGain || !this.bgmBus || !this.sfxBus) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, now, 0.03);
    this.bgmBus.gain.setTargetAtTime(
      this.bgmMuted ? 0 : this.bgmVolume * 0.42,
      now,
      0.08
    );
    this.sfxBus.gain.setTargetAtTime(this.sfxVolume, now, 0.02);
    if (this.ambientBus) {
      this.ambientBus.gain.setTargetAtTime(this.computeAmbientBusGain(), now, 0.08);
    }
  }

  setVolume(percent: number) {
    this.volume = Math.max(0, Math.min(1, percent / 100));
    this.syncGains();
  }

  setBgmVolume(percent: number) {
    this.bgmVolume = Math.max(0, Math.min(1, percent / 100));
    this.syncGains();
  }

  setSfxVolume(percent: number) {
    this.sfxVolume = Math.max(0, Math.min(1, percent / 100));
    this.syncGains();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.syncGains();
  }

  setBgmMuted(bgmMuted: boolean) {
    this.bgmMuted = bgmMuted;
    this.syncGains();
  }

  // Switch active dynamic soundtrack smoothly
  setBgmTrack(track: BgmTrackId) {
    this.desiredTrack = track;
    if (this.currentTrack === track) return;
    this.currentTrack = track;
    this.stepIndex = 0;

    if (this.ctx && this.bgmBus) {
      const now = this.ctx.currentTime;
      // Soft brief dip on track switch for musical transition
      this.bgmBus.gain.setTargetAtTime(0.0001, now, 0.06);
      window.setTimeout(() => {
        this.syncGains();
      }, 120);
      this.nextNoteTime = now + 0.14;
      this.startSchedulerIfNeeded();
    }
  }

  getActiveTrack(): BgmTrackId {
    return this.currentTrack ?? this.desiredTrack;
  }

  private startSchedulerIfNeeded() {
    if (this.schedulerId !== null || typeof window === 'undefined') return;
    if (!this.ctx) return;
    if (!this.currentTrack) {
      this.currentTrack = this.desiredTrack;
    }
    this.nextNoteTime = this.ctx.currentTime + 0.08;
    this.schedulerId = window.setInterval(() => this.schedulerTick(), 65);
  }

  private schedulerTick() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.muted || this.bgmMuted || this.volume <= 0.001 || this.bgmVolume <= 0.001) {
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      return;
    }

    const trackId = this.currentTrack ?? this.desiredTrack;
    const pattern = TRACKS[trackId];
    // Seasonal tempo nuance during active gameplay (Summer lively, Winter cozy)
    const seasonBpmMult =
      this.inGameplayEnv && (trackId === 'PREP' || trackId === 'SERVICE' || trackId === 'RUSH' || trackId === 'CLOSING')
        ? this.activeSeason === 'SUMMER'
          ? 1.05
          : this.activeSeason === 'WINTER'
            ? 0.94
            : this.activeSeason === 'AUTUMN'
              ? 0.97
              : 1.01
        : 1.0;
    const stepDur = 60 / (pattern.bpm * seasonBpmMult) / pattern.stepsPerBeat;

    // Schedule notes 180ms ahead for rock-solid Web Audio timing
    while (this.nextNoteTime < this.ctx.currentTime + 0.18) {
      this.scheduleStep(pattern, trackId, this.stepIndex, this.nextNoteTime, stepDur);
      this.nextNoteTime += stepDur;
      this.stepIndex = (this.stepIndex + 1) % pattern.length;
    }
  }

  private scheduleStep(
    pattern: TrackPattern,
    trackId: BgmTrackId,
    step: number,
    time: number,
    stepDur: number
  ) {
    if (!this.ctx || !this.bgmBus || !this.reverbSend) return;

    // Distinct Seasonal Melodic & Harmonic Coloration on Gameplay Tracks
    const applySeasonShift =
      this.inGameplayEnv &&
      (trackId === 'PREP' || trackId === 'SERVICE' || trackId === 'RUSH' || trackId === 'CLOSING');
    const seasonTranspose = applySeasonShift
      ? this.activeSeason === 'SPRING'
        ? 2
        : this.activeSeason === 'SUMMER'
          ? 0
          : this.activeSeason === 'AUTUMN'
            ? -2
            : -3
      : 0;

    // 1. Plucked Guzheng / Pipa melody (+ seasonal ornament phrases!)
    const pluckMidi = pattern.pluck[step];
    if (pluckMidi != null) {
      const shifted = pluckMidi + seasonTranspose;
      this.synthPluck(midiToFreq(shifted), time, stepDur * 2.1, 0.18);
      // Summer: lively upper-octave coastal shimmer on offbeat accents
      if (applySeasonShift && this.activeSeason === 'SUMMER' && step % 8 === 4) {
        this.synthPluck(midiToFreq(shifted + 12), time + stepDur * 0.5, stepDur * 1.4, 0.085);
      }
      // Spring: delicate ascending blossom grace note on bar starts
      if (applySeasonShift && this.activeSeason === 'SPRING' && step % 16 === 0) {
        this.synthPluck(midiToFreq(shifted + 7), time + stepDur * 0.45, stepDur * 1.6, 0.08);
      }
    }

    // 2. Bamboo Flute lyrical counter-melody (Autumn adds warm lyrical passing tones)
    const fluteMidi = pattern.flute?.[step];
    if (fluteMidi != null) {
      this.synthFlute(
        midiToFreq(fluteMidi + seasonTranspose),
        time,
        stepDur * (applySeasonShift && this.activeSeason === 'AUTUMN' ? 3.8 : 3.2),
        applySeasonShift && this.activeSeason === 'AUTUMN' ? 0.13 : 0.11
      );
    } else if (applySeasonShift && this.activeSeason === 'AUTUMN' && (step === 6 || step === 22) && pluckMidi != null) {
      this.synthFlute(midiToFreq(pluckMidi + seasonTranspose + 5), time, stepDur * 2.4, 0.075);
    }

    // 3. Acoustic Bassline
    const bassMidi = pattern.bass[step];
    if (bassMidi != null) {
      this.synthBass(midiToFreq(bassMidi + seasonTranspose), time, stepDur * 2.4, 0.2);
    }

    // 4. Warm Chord Pad (+ Winter crystalline hearth-chime overtone on chord roots)
    const chord = pattern.chords[step];
    if (chord) {
      const chordDur = stepDur * 8;
      for (const m of chord) {
        this.synthPadVoice(midiToFreq(m + seasonTranspose), time, chordDur, 0.042);
      }
      if (applySeasonShift && this.activeSeason === 'WINTER' && chord.length > 0) {
        this.synthPadVoice(midiToFreq(chord[chord.length - 1] + seasonTranspose + 12), time + 0.04, stepDur * 3.5, 0.032);
      }
    }

    // 5. Rhythmic Percussion
    const perc = pattern.perc?.[step];
    if (perc) {
      this.synthPerc(perc, time);
    }

    // 6. Subtle Ambient Bed Pulse (Harbor waves or gentle hotpot simmer)
    if (pattern.ambient === 'HARBOR' && step % 16 === 0) {
      this.synthHarborWave(time, stepDur * 14);
    } else if (pattern.ambient === 'SIMMER' && step % 8 === 0) {
      this.synthGentleSimmer(time, stepDur * 6);
    }

    // 7. Live Weather & Season Atmospheric Accents (audible during active gameplay)
    if (this.inGameplayEnv && this.ambientBus) {
      this.scheduleEnvironmentAccent(step, time, stepDur);
    }
  }

  private scheduleEnvironmentAccent(step: number, time: number, stepDur: number) {
    if (!this.ctx || !this.ambientBus || !this.noiseBuffer) return;

    // Weather-driven accents
    if (this.activeWeather === 'RAINY' && (step % 6 === 2 || step % 11 === 5)) {
      this.synthRaindropPlink(time, 0.028);
    } else if (this.activeWeather === 'TYPHOON') {
      if (step % 4 === 1) {
        this.synthRaindropPlink(time, 0.032);
      }
      if (step === 12 || step === 28) {
        this.synthDistantThunder(time, 0.085);
      }
    } else if (this.activeWeather === 'SNOWY' && step === 16) {
      this.synthSnowWindBell(time, 0.03);
    } else if (this.activeWeather === 'HEATWAVE' && (step === 4 || step === 20)) {
      this.synthSummerCicada(time, stepDur * 6.5, 0.032);
    }

    // Seasonal ambient signature motifs (delicate, non-intrusive)
    if (step === 0) {
      if (this.activeSeason === 'SPRING' && this.activeWeather !== 'TYPHOON') {
        this.synthSpringBirdChirp(time + 0.12, 0.028);
      } else if (this.activeSeason === 'SUMMER' && this.activeWeather === 'SUNNY') {
        this.synthSummerCicada(time + 0.08, stepDur * 5, 0.018);
      } else if (this.activeSeason === 'AUTUMN') {
        this.synthAutumnLeafRustle(time + 0.1, stepDur * 6, 0.026);
      } else if (this.activeSeason === 'WINTER') {
        this.synthWinterHearthCrackle(time + 0.1, 0.032);
      }
    }
  }

  private synthRaindropPlink(time: number, peak: number) {
    if (!this.ctx || !this.ambientBus) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const base = 1150 + Math.random() * 950;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, time);
    osc.frequency.exponentialRampToValueAtTime(base * 1.48, time + 0.055);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.075);
    osc.connect(gain);
    gain.connect(this.ambientBus);
    osc.start(time);
    osc.stop(time + 0.09);
  }

  private synthDistantThunder(time: number, peak: number) {
    if (!this.ctx || !this.ambientBus || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(170, time);
    filter.frequency.exponentialRampToValueAtTime(52, time + 1.5);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.65);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientBus);
    src.start(time);
    src.stop(time + 1.72);
  }

  private synthSnowWindBell(time: number, peak: number) {
    if (!this.ctx || !this.ambientBus) return;
    const ctx = this.ctx;
    const freqs = [1567.98, 2093.0];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = time + idx * 0.18;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
      osc.connect(gain);
      gain.connect(this.ambientBus!);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  }

  private synthSummerCicada(time: number, dur: number, peak: number) {
    if (!this.ctx || !this.ambientBus || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4350;
    filter.Q.value = 4.2;

    const gain = ctx.createGain();
    const am = ctx.createOscillator();
    const amGain = ctx.createGain();
    am.type = 'sine';
    am.frequency.value = 14.5;
    amGain.gain.value = peak * 0.45;
    am.connect(amGain);
    amGain.connect(gain.gain);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.25);
    gain.gain.setValueAtTime(peak * 0.85, time + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientBus);
    src.start(time);
    am.start(time);
    src.stop(time + dur + 0.05);
    am.stop(time + dur + 0.05);
  }

  private synthSpringBirdChirp(time: number, peak: number) {
    if (!this.ctx || !this.ambientBus) return;
    const ctx = this.ctx;
    [0, 0.14].forEach((offset, idx) => {
      const t = time + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 1980 : 2240, t);
      osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 2760 : 3080, t + 0.055);
      osc.frequency.exponentialRampToValueAtTime(2150, t + 0.11);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ambientBus!);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  private synthAutumnLeafRustle(time: number, dur: number, peak: number) {
    if (!this.ctx || !this.ambientBus || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2100, time);
    filter.frequency.linearRampToValueAtTime(3200, time + dur * 0.5);
    filter.frequency.linearRampToValueAtTime(1600, time + dur);
    filter.Q.value = 1.6;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + dur * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientBus);
    src.start(time);
    src.stop(time + dur + 0.04);
  }

  private synthWinterHearthCrackle(time: number, peak: number) {
    if (!this.ctx || !this.ambientBus || !this.noiseBuffer) return;
    const ctx = this.ctx;
    [0, 0.16, 0.42].forEach((offset) => {
      const t = time + offset;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3400;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(peak, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientBus!);
      src.start(t);
      src.stop(t + 0.045);
    });
  }

  // --- BGM Instrument Synthesizers ---

  private synthPluck(freq: number, time: number, dur: number, peak: number) {
    if (!this.ctx || !this.bgmBus || !this.reverbSend) return;
    const ctx = this.ctx;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5.5, time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(420, freq * 1.4), time + dur * 0.65);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.25;

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmBus);
    gain.connect(this.reverbSend);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur + 0.03);
    osc2.stop(time + dur + 0.03);
  }

  private synthFlute(freq: number, time: number, dur: number, peak: number) {
    if (!this.ctx || !this.bgmBus || !this.reverbSend) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.992, time);
    osc.frequency.linearRampToValueAtTime(freq, time + 0.09);

    lfo.type = 'sine';
    lfo.frequency.value = 5.2;
    lfoGain.gain.value = freq * 0.009;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.14);
    gain.gain.setValueAtTime(peak * 0.85, time + dur * 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(gain);
    gain.connect(this.bgmBus);
    gain.connect(this.reverbSend);

    osc.start(time);
    lfo.start(time);
    osc.stop(time + dur + 0.04);
    lfo.stop(time + dur + 0.04);
  }

  private synthBass(freq: number, time: number, dur: number, peak: number) {
    if (!this.ctx || !this.bgmBus) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.value = 340;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmBus);

    osc.start(time);
    osc.stop(time + dur + 0.03);
  }

  private synthPadVoice(freq: number, time: number, dur: number, peak: number) {
    if (!this.ctx || !this.bgmBus) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + Math.min(0.45, dur * 0.25));
    gain.gain.setValueAtTime(peak * 0.8, time + dur * 0.72);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(gain);
    gain.connect(this.bgmBus);

    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  private synthPerc(kind: 'WOOD' | 'TAIKO' | 'SHAKER' | 'CLAP' | 'BELL', time: number) {
    if (!this.ctx || !this.bgmBus || !this.noiseBuffer) return;
    const ctx = this.ctx;

    if (kind === 'WOOD') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(860, time);
      osc.frequency.exponentialRampToValueAtTime(610, time + 0.045);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.09, time + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
      osc.connect(gain);
      gain.connect(this.bgmBus);
      osc.start(time);
      osc.stop(time + 0.07);
    } else if (kind === 'TAIKO') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(145, time);
      osc.frequency.exponentialRampToValueAtTime(58, time + 0.18);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.22, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
      osc.connect(gain);
      gain.connect(this.bgmBus);
      osc.start(time);
      osc.stop(time + 0.24);
    } else if (kind === 'SHAKER' || kind === 'CLAP') {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = kind === 'SHAKER' ? 'highpass' : 'bandpass';
      filter.frequency.value = kind === 'SHAKER' ? 5400 : 1850;
      const gain = ctx.createGain();
      const dur = kind === 'SHAKER' ? 0.045 : 0.09;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(kind === 'SHAKER' ? 0.035 : 0.075, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmBus);
      src.start(time);
      src.stop(time + dur + 0.02);
    } else if (kind === 'BELL' && this.reverbSend) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1568, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.055, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.55);
      osc.connect(gain);
      gain.connect(this.bgmBus);
      gain.connect(this.reverbSend);
      osc.start(time);
      osc.stop(time + 0.58);
    }
  }

  private synthHarborWave(time: number, dur: number) {
    if (!this.ctx || !this.bgmBus || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, time);
    filter.frequency.linearRampToValueAtTime(520, time + dur * 0.45);
    filter.frequency.linearRampToValueAtTime(180, time + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.028, time + dur * 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmBus);
    src.start(time);
    src.stop(time + dur + 0.05);
  }

  private synthGentleSimmer(time: number, dur: number) {
    if (!this.ctx || !this.bgmBus || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 1.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.015, time + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmBus);
    src.start(time);
    src.stop(time + dur + 0.04);
  }

  // =========================================================================
  // INTERACTIVE GAMEPLAY & UI SOUND EFFECTS (18+ Bespoke Layered SFX)
  // =========================================================================

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.1,
    endFreq?: number,
    delay = 0
  ) {
    const audio = this.ensureContext();
    if (!audio) return;
    const { ctx, sfxOut } = audio;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(sfxOut);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoiseBurst(
    duration: number,
    filterType: BiquadFilterType,
    freq: number,
    gainPeak: number,
    delay = 0,
    q = 1
  ) {
    const audio = this.ensureContext();
    if (!audio || !this.noiseBuffer) return;
    const { ctx, sfxOut } = audio;

    const now = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, now);
    filter.Q.value = q;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxOut);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  // Cash register / brass coin settlement chime
  playCoin() {
    this.playTone(987.77, 0.09, 'triangle', 0.11);
    this.playTone(1318.51, 0.16, 'sine', 0.12, undefined, 0.065);
    this.playTone(1975.53, 0.19, 'sine', 0.06, undefined, 0.11);
  }

  // Warm copper reception desk bell
  playBell() {
    this.playTone(1046.5, 0.28, 'sine', 0.095);
    this.playTone(2093, 0.18, 'sine', 0.045, undefined, 0.01);
    this.playTone(1568, 0.22, 'sine', 0.055, undefined, 0.045);
  }

  // Hotpot broth boiling sizzle + bubbling pop
  playSizzle() {
    this.playNoiseBurst(0.22, 'bandpass', 2700, 0.1, 0, 1.2);
    this.playTone(210, 0.08, 'sine', 0.06, 360, 0.03);
    this.playTone(260, 0.07, 'sine', 0.05, 420, 0.1);
  }

  // Heavy cast-iron broth pot pickup + ladle clink
  playPotPickup() {
    this.playTone(190, 0.11, 'triangle', 0.09, 130);
    this.playTone(1240, 0.06, 'sine', 0.055, undefined, 0.05);
    this.playNoiseBurst(0.12, 'bandpass', 2200, 0.06, 0.04);
  }

  // Crushed-ice seafood buffet restock crunch + fresh sparkle
  playIceRestock() {
    this.playNoiseBurst(0.14, 'highpass', 3600, 0.085, 0);
    this.playNoiseBurst(0.11, 'bandpass', 4800, 0.065, 0.05, 1.8);
    this.playTone(1480, 0.1, 'sine', 0.055, 1760, 0.06);
  }

  // Bubbly sink dishwashing splash + rinse
  playSplash() {
    this.playNoiseBurst(0.16, 'bandpass', 1450, 0.08, 0, 1.5);
    this.playTone(390, 0.11, 'sine', 0.075, 780);
    this.playTone(620, 0.09, 'triangle', 0.055, 360, 0.065);
  }

  // Crisp porcelain dishware clink
  playClink() {
    this.playTone(1760, 0.07, 'sine', 0.07);
    this.playTone(2349, 0.09, 'sine', 0.055, undefined, 0.035);
  }

  // Civ 6 civic / upgrade / morning completion chime
  playUpgrade() {
    this.playTone(523.25, 0.13, 'triangle', 0.1);
    this.playTone(659.25, 0.13, 'triangle', 0.1, undefined, 0.08);
    this.playTone(783.99, 0.16, 'triangle', 0.11, undefined, 0.16);
    this.playTone(1046.5, 0.3, 'sine', 0.11, undefined, 0.24);
  }

  // Ink-seal stamp thud + affirmative chime when scheduling staff / menu / expansion orders
  playHireStamp() {
    this.playTone(150, 0.08, 'triangle', 0.12, 72);
    this.playNoiseBurst(0.05, 'lowpass', 700, 0.07, 0);
    this.playTone(587.33, 0.11, 'triangle', 0.085, undefined, 0.07);
    this.playTone(880, 0.18, 'sine', 0.09, undefined, 0.14);
  }

  // Celebratory grand opening bell + ascending pentatonic gong fanfare
  playOpenShop() {
    this.playTone(196, 0.35, 'triangle', 0.12, 185);
    this.playTone(587.33, 0.14, 'triangle', 0.095, undefined, 0.04);
    this.playTone(739.99, 0.14, 'triangle', 0.095, undefined, 0.12);
    this.playTone(880, 0.18, 'triangle', 0.1, undefined, 0.2);
    this.playTone(1174.66, 0.36, 'sine', 0.11, undefined, 0.28);
  }

  // Warm dusk harbor bell when 22:00 closing begins
  playClosingBell() {
    this.playTone(440, 0.55, 'sine', 0.11);
    this.playTone(880, 0.38, 'sine', 0.05, undefined, 0.02);
    this.playTone(329.63, 0.65, 'sine', 0.09, undefined, 0.32);
  }

  // Ledger settlement coin cascade + warm major chord
  playDaySummary() {
    this.playTone(523.25, 0.12, 'triangle', 0.09);
    this.playTone(659.25, 0.12, 'triangle', 0.09, undefined, 0.08);
    this.playTone(783.99, 0.14, 'triangle', 0.095, undefined, 0.16);
    this.playTone(1046.5, 0.24, 'sine', 0.1, undefined, 0.24);
    this.playTone(1318.5, 0.28, 'sine', 0.085, undefined, 0.32);
  }

  // Energetic double taiko drumroll + brass swell for Rush Hour!
  playRushWarning() {
    this.playTone(130, 0.14, 'triangle', 0.16, 65, 0);
    this.playTone(145, 0.14, 'triangle', 0.17, 70, 0.14);
    this.playTone(165, 0.18, 'triangle', 0.18, 75, 0.28);
    this.playTone(440, 0.24, 'sawtooth', 0.055, 587.33, 0.34);
  }

  // Mysterious shimmering guzheng glissando when a Special Story Guest arrives
  playSpecialArrival() {
    const notes = [587.33, 659.25, 783.99, 880, 1174.66, 1318.51];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.28, 'sine', 0.075, undefined, idx * 0.055);
    });
  }

  // Grand Era-Moment fanfare for Main Story Chapters & Special Story Completion
  playStoryFanfare() {
    this.playTone(293.66, 0.45, 'triangle', 0.11, undefined, 0);
    this.playTone(440, 0.18, 'triangle', 0.095, undefined, 0.06);
    this.playTone(587.33, 0.2, 'triangle', 0.1, undefined, 0.16);
    this.playTone(739.99, 0.22, 'triangle', 0.105, undefined, 0.26);
    this.playTone(880, 0.32, 'sine', 0.11, undefined, 0.36);
    this.playTone(1174.66, 0.55, 'sine', 0.11, undefined, 0.46);
  }

  // Customer walkout sigh + door chime
  playWalkout() {
    this.playTone(420, 0.16, 'triangle', 0.09, 280);
    this.playTone(290, 0.24, 'triangle', 0.085, 195, 0.14);
  }

  // Food safety inspection failure whistle + heavy warning gong
  playInspectionAlarm() {
    this.playTone(1480, 0.12, 'sine', 0.08, 1220, 0);
    this.playTone(1480, 0.16, 'sine', 0.08, 1100, 0.15);
    this.playTone(185, 0.38, 'sawtooth', 0.09, 110, 0.24);
  }

  // Standard penalty warning
  playPenalty() {
    this.playTone(220, 0.18, 'sawtooth', 0.08, 165);
    this.playTone(165, 0.28, 'sawtooth', 0.08, 118, 0.16);
  }

  // Solemn Game Over descending gong
  playGameOver() {
    this.playTone(293.66, 0.35, 'triangle', 0.11, 261.63, 0);
    this.playTone(220, 0.42, 'triangle', 0.11, 196, 0.28);
    this.playTone(146.83, 0.85, 'sawtooth', 0.08, 110, 0.55);
  }

  // Subtle brass/parchment modal & tab flip
  playTabSwitch() {
    this.playNoiseBurst(0.04, 'bandpass', 2400, 0.045);
    this.playTone(620, 0.05, 'sine', 0.045, 760);
  }

  // Crisp UI click
  playClick() {
    this.playTone(540, 0.045, 'sine', 0.055, 700);
  }

  // =========================================================================
  // SEASON, WEATHER, HOLIDAY & TACTILE SCENE TRANSITION SOUND EFFECTS
  // =========================================================================

  /** Distinct Chaoshan pentatonic musical signature when a new season arrives */
  playSeasonChange(season: SeasonId) {
    switch (season) {
      case 'SPRING': {
        // Ascending blossom guzheng arpeggio + delicate spring bird chime
        const notes = [587.33, 659.25, 739.99, 880, 1174.66];
        notes.forEach((f, i) => {
          this.playTone(f, 0.34, 'triangle', 0.085, undefined, i * 0.075);
        });
        this.playTone(2180, 0.11, 'sine', 0.05, 2960, 0.42);
        this.playTone(2360, 0.12, 'sine', 0.045, 3140, 0.54);
        break;
      }
      case 'SUMMER': {
        // Bright coastal harbor cascade + warm surf shimmer
        const notes = [783.99, 880, 987.77, 1174.66, 1567.98];
        notes.forEach((f, i) => {
          this.playTone(f, 0.28, 'sine', 0.08, undefined, i * 0.065);
        });
        this.playNoiseBurst(0.55, 'lowpass', 620, 0.06, 0.08);
        break;
      }
      case 'AUTUMN': {
        // Warm golden harvest chime + lyrical resonant brass gong + crisp leaf wind
        this.playTone(220, 0.55, 'triangle', 0.1, 214, 0);
        const notes = [880, 783.99, 659.25, 587.33, 880];
        notes.forEach((f, i) => {
          this.playTone(f, 0.32, 'triangle', 0.08, undefined, 0.06 + i * 0.09);
        });
        this.playNoiseBurst(0.45, 'bandpass', 2400, 0.055, 0.12, 1.4);
        break;
      }
      case 'WINTER': {
        // Solemn warm temple bell + crystalline winter frost harmony
        this.playTone(196, 0.65, 'sine', 0.1, 192, 0);
        this.playTone(659.25, 0.55, 'sine', 0.08, undefined, 0.08);
        this.playTone(987.77, 0.58, 'sine', 0.075, undefined, 0.18);
        this.playTone(1318.51, 0.68, 'sine', 0.07, undefined, 0.28);
        this.playTone(1975.53, 0.62, 'sine', 0.05, undefined, 0.38);
        break;
      }
    }
  }

  /** Distinct atmospheric cue when daily weather shifts */
  playWeatherChange(weather: WeatherId) {
    switch (weather) {
      case 'SUNNY': {
        // Radiant morning triad chime
        this.playTone(523.25, 0.24, 'triangle', 0.075, undefined, 0);
        this.playTone(659.25, 0.26, 'sine', 0.08, undefined, 0.07);
        this.playTone(783.99, 0.32, 'sine', 0.08, undefined, 0.14);
        this.playTone(1046.5, 0.42, 'sine', 0.075, undefined, 0.21);
        break;
      }
      case 'RAINY': {
        // Soft rain onset swell + translucent falling raindrops
        this.playNoiseBurst(0.62, 'bandpass', 1750, 0.075, 0, 0.8);
        const drops = [1480, 1760, 1318, 1975, 1568];
        drops.forEach((f, idx) => {
          this.playTone(f, 0.08, 'sine', 0.055, f * 1.38, 0.06 + idx * 0.09);
        });
        break;
      }
      case 'TYPHOON': {
        // Deep coastal thunder rumble + dramatic howling gale sweep
        this.playTone(88, 0.72, 'triangle', 0.15, 34, 0);
        this.playNoiseBurst(0.95, 'lowpass', 240, 0.14, 0.02);
        this.playNoiseBurst(0.85, 'bandpass', 780, 0.1, 0.15, 1.3);
        this.playTone(145, 0.45, 'sawtooth', 0.055, 62, 0.18);
        break;
      }
      case 'SNOWY': {
        // Sparkling winter frost wind-bell harmonics + hushed crisp air
        this.playNoiseBurst(0.55, 'bandpass', 1250, 0.05, 0, 1.5);
        const bells = [1567.98, 2093, 2637.02, 3135.96];
        bells.forEach((f, idx) => {
          this.playTone(f, 0.48, 'sine', 0.055, undefined, 0.05 + idx * 0.095);
        });
        break;
      }
      case 'HEATWAVE': {
        // Shimmering golden heat chord + brief cicada chorus pulse
        this.playTone(587.33, 0.32, 'triangle', 0.07, 602, 0);
        this.playTone(880, 0.36, 'sine', 0.07, 898, 0.08);
        this.playNoiseBurst(0.52, 'bandpass', 4300, 0.065, 0.1, 3.6);
        break;
      }
    }
  }

  /** Celebratory Chaoshan festival gong & rapid guzheng flourish on holiday mornings */
  playHolidayFanfare() {
    this.playTone(174.61, 0.65, 'triangle', 0.13, 168, 0);
    const gliss = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1318.51];
    gliss.forEach((f, i) => {
      this.playTone(f, 0.28, 'triangle', 0.085, undefined, 0.05 + i * 0.05);
    });
  }

  /** Crisp porcelain plate placement + warm subtle steam hiss when serving dishes */
  playDishServed() {
    this.playTone(1640, 0.065, 'sine', 0.065);
    this.playTone(2180, 0.08, 'sine', 0.05, undefined, 0.03);
    this.playNoiseBurst(0.11, 'bandpass', 2600, 0.045, 0.02, 1.4);
  }

  /** Tactile timber sliding door sound when moving between front hall and backstage */
  playBackstageDoor() {
    this.playNoiseBurst(0.18, 'lowpass', 540, 0.085, 0);
    this.playTone(135, 0.14, 'triangle', 0.075, 92, 0.02);
    this.playTone(720, 0.045, 'sine', 0.05, 560, 0.15);
  }

  /** Crisp sashimi knife swish + wooden cutting board tap */
  playSashimiSlice() {
    this.playNoiseBurst(0.09, 'highpass', 4200, 0.08, 0);
    this.playTone(1850, 0.055, 'sine', 0.04, 1280, 0.01);
    this.playTone(320, 0.045, 'triangle', 0.065, 220, 0.065);
  }

  /** Fiery cast-iron teppan sear burst + crisp oil crackle */
  playTeppanSizzle() {
    this.playNoiseBurst(0.28, 'bandpass', 3100, 0.115, 0, 1.0);
    this.playNoiseBurst(0.12, 'highpass', 5200, 0.065, 0.08);
    this.playTone(185, 0.1, 'triangle', 0.06, 120, 0);
    this.playTone(420, 0.06, 'sine', 0.045, 680, 0.09);
  }

  /** Live seafood aquarium oxygen-bubble cascade & splash */
  playTankBubbles() {
    const bubbles = [340, 480, 620, 790];
    bubbles.forEach((f, i) => {
      this.playTone(f, 0.07, 'sine', 0.065, f * 1.48, i * 0.048);
    });
    this.playNoiseBurst(0.14, 'bandpass', 1200, 0.055, 0.02, 1.8);
  }

  /** Feather-light woodblock/brush tick during VN typewriter dialogue */
  playDialogueTick() {
    const nowMs = Date.now();
    if (nowMs - this.lastDialogueTickMs < 68) return;
    this.lastDialogueTickMs = nowMs;
    const pitch = 740 + (nowMs % 5) * 28;
    this.playTone(pitch, 0.024, 'triangle', 0.024, pitch * 0.88);
  }

  /** Tactile scroll/parchment page turn for story advancement & ending epilogue */
  playPageFlip() {
    this.playNoiseBurst(0.095, 'bandpass', 2200, 0.055, 0, 1.1);
    this.playNoiseBurst(0.06, 'highpass', 3800, 0.035, 0.04);
    this.playTone(480, 0.05, 'sine', 0.03, 640, 0.02);
  }

  /** Escalating pentatonic brass prosperity chime for rapid consecutive table checkouts */
  playCheckoutCombo() {
    const nowMs = Date.now();
    if (nowMs - this.lastCheckoutMs <= 4800) {
      this.checkoutComboCount = Math.min(5, this.checkoutComboCount + 1);
    } else {
      this.checkoutComboCount = 1;
    }
    this.lastCheckoutMs = nowMs;

    const pentatonic = [987.77, 1108.73, 1318.51, 1479.98, 1760.0, 1975.53];
    const baseIdx = Math.min(3, this.checkoutComboCount - 1);
    this.playTone(pentatonic[baseIdx], 0.09, 'triangle', 0.11);
    this.playTone(pentatonic[baseIdx + 1], 0.16, 'sine', 0.12, undefined, 0.06);
    this.playTone(pentatonic[baseIdx + 2], 0.21, 'sine', 0.075, undefined, 0.115);
    if (this.checkoutComboCount >= 3) {
      this.playTone(pentatonic[5] * 1.25, 0.26, 'sine', 0.065, undefined, 0.165);
    }
  }
}

export const sound = new SoundManager();
