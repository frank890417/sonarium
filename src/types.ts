export type Wave = 'sine' | 'triangle' | 'sawtooth' | 'square'

export type Role =
  | 'toggle'
  | 'button'
  | 'link'
  | 'input'
  | 'heading'
  | 'media'
  | 'item'
  | 'container'
  | 'text'

export type SynthKind = 'matter' | 'synth' | 'fm' | 'pluck' | 'membrane' | 'noise'

export type Articulation = 'hit' | 'preview' | 'tick' | 'strum' | 'whisper' | 'toggle-on' | 'toggle-off' | 'motif'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Spherical source properties — the 聲球 (SPATIAL.md §2, §4). */
export interface SphereProps {
  /** Radians, AmbiX convention: +azimuth = left. */
  azimuth: number
  /** Radians, + = up. */
  elevation: number
  /** Apparent angular size σ ∈ [0,1] — point source … wraps around the listener. */
  extent: number
  /** δ ∈ [0,1]: 1 = focused beam at the listener, 0 = omni radiator. */
  directivity: number
}

/** The spat5.oper surface (SPATIAL.md §5) — all ∈ [0,1], perceptually monotonic. */
export interface PerceptualFactors {
  presence: number
  roomPresence: number
  envelopment: number
  warmth: number
  brilliance: number
}

/** The Matter weave, resolved per element (MATTER.md) — consumed by MatterVoice + backends. */
export interface MatterVoiceParams {
  matter: { edge: number; mass: number; texture: number; air: number }
  /** 24 additive partial amplitudes, energy-normalized (the continuous spectrum). */
  partials: number[]
  transient: { lengthS: number; hpHz: number; level: number }
  breath: { level: number; bpRatio: number }
  subShimmer: { interval: number; level: number }
  glideS: number
  jitterCents: number
  envelope: { attackS: number; decayS: number; sustain: number; releaseScale: number }
  filter: { q: number; biteAmount: number; biteDecayS: number }
  reverb: { sendScale: number; sendCutoffHz: number; bloom: number; extentBonus: number }
}

/** The contract between page reading (L1) and the audio substrate (L0). See ARCHITECTURE.md §2. */
export interface SonicProfile {
  role: Role
  rect: Rect
  pan: { x: number; y: number; z: number }
  sphere: SphereProps
  midi: number
  freqHz: number
  degree: number
  wave: Wave
  attack: number
  release: number
  durationS: number
  filterHz: number
  filterQ: number
  velocityScale: number
  reverbSend: number
  synthKind: SynthKind
  octaveShift: number
  /** The full Matter weave (MATTER.md) — always computed; the 'matter' voice consumes all of
   *  it, other synth kinds consume the reverb/filter threads. */
  voice: MatterVoiceParams
  /** Human-readable provenance of every parameter — describe() truth (PLAN.md Invariant #6). */
  reasons: Record<string, string>
}

export interface VoiceRecipe {
  synthKind: SynthKind
  /** When set, geometry does not override the waveform (e.g. heading bells stay bells). */
  pinWave?: Wave
  octaveShift: number
  baseVelocity: number
  releaseScale: number
}

export interface Theme {
  name: string
  roles: Partial<Record<Role, Partial<VoiceRecipe>>>
  defaults: VoiceRecipe
}

export interface SonariumOptions {
  /** Root element to sonify. Default: document.body */
  root?: Element
  /** Sound palette. Default 'aurora'. */
  theme?: 'aurora' | 'mono' | 'paper' | Theme
  /** 'auto' = deterministic per-hostname key (MAPPING.md §0), or e.g. 'D dorian'. */
  key?: string
  /** Listener mode: cursor as ears, or fixed center. Default 'pointer'. */
  listener?: 'pointer' | 'center'
  /** Ambience level 0..1 (room tone + sparkles). Default 0.12; 0 disables. */
  ambient?: number
  /** Enable device tilt/shake drivers on mobile. Default true. */
  motion?: boolean
  /** Autoplay-unlock & mute UI. 'chip' = floating control, 'none' = bring your own. */
  gate?: 'chip' | 'none'
  /** Master volume in dB. Default -10. */
  volume?: number
  /** Max concurrent voices (pool size). Default 18, hard cap 24. */
  maxVoices?: number
  /** 'hrtf' (default) or 'equalpower' for low-end devices. */
  panning?: 'hrtf' | 'equalpower'
  /**
   * Spatial engine (SPATIAL.md): 'ambisonic' (default) encodes everything into one rotatable
   * FOA field, Spat-style; 'panner' is the v0.1 per-voice HRTF path (also the auto-fallback).
   */
  spatial?: 'ambisonic' | 'panner'
  /** Spat-style perceptual factors (presence, roomPresence, envelopment, warmth, brilliance). */
  perceptual?: Partial<PerceptualFactors>
  /** Reverb: 'auto' sizes the room from viewport width, or a fixed decay in seconds. */
  reverb?: 'auto' | number
  /** Respect prefers-reduced-motion by softening output. Default true. */
  respectReducedMotion?: boolean
}

export type SonariumEvent = 'start' | 'trigger' | 'mute' | 'dispose'

export interface TriggerDetail {
  el: Element
  profile: SonicProfile
  velocity: number
  articulation: Articulation
}
