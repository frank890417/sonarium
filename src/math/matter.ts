/**
 * The Matter weave — MATTER.md made executable. Four macro-dimensions condensed from visual
 * properties, each woven into bundles of co-varying synthesis parameters so the ear hears one
 * coherent object (Bregman fusion; Grey/McAdams timbre axes). Pure: no DOM, no Tone.
 * Change a formula here ⇄ change MATTER.md §2 in the same commit (Invariant #3).
 */
import { clamp, lerp } from './util'

export interface Matter {
  /** boundary abruptness, kiki↔bouba: 1 − roundness */
  edge: number
  /** size/weight: log-area sizeT */
  mass: number
  /** surface noisiness/airiness: shadows, translucency, dashed borders, media */
  texture: number
  /** distance into the room: normalized DOM depth */
  air: number
}

export interface MatterVisuals {
  roundness: number
  sizeT: number
  depth: number
  shadowBlurPx: number
  opacity: number
  dashedBorder: boolean
  isMedia: boolean
  backdropBlurPx: number
}

export function deriveMatter(v: MatterVisuals): Matter {
  const texture = clamp(
    clamp(v.shadowBlurPx / 40, 0, 0.4) +
      (1 - clamp(v.opacity, 0, 1)) * 0.6 +
      (v.dashedBorder ? 0.15 : 0) +
      (v.isMedia ? 0.35 : 0) +
      clamp(v.backdropBlurPx / 40, 0, 0.2),
    0,
    1,
  )
  return {
    edge: clamp(1 - v.roundness, 0, 1),
    mass: clamp(v.sizeT, 0, 1),
    texture,
    air: clamp(Math.min(v.depth, 10) / 10, 0, 1),
  }
}

// ------------------------------------------------------------------ spectrum (MATTER.md §2.1)

export const PARTIAL_COUNT = 24

/**
 * Continuous spectrum: EDGE sets the rolloff (bright↔pure), elongation sets hollowness
 * (long thin elements = pipes = odd harmonics), richness (CHROMA.md CH5: saturation)
 * subtracts from the rolloff exponent — vivid color = vivid spectrum. Normalized to Σa² = 1
 * so the whole continuum sits at equal loudness.
 */
export function genPartials(edge: number, elongation: number, richness = 0): Float32Array {
  const p = Math.max(0.8, 1 + 2.6 * (1 - clamp(edge, 0, 1)) - clamp(richness, 0, 0.5))
  const evenness = lerp(1, 0.12, clamp((elongation - 1) / 4, 0, 1))
  const a = new Float32Array(PARTIAL_COUNT)
  let energy = 0
  for (let k = 1; k <= PARTIAL_COUNT; k++) {
    const amp = (k % 2 === 1 ? 1 : evenness) / Math.pow(k, p)
    a[k - 1] = amp
    energy += amp * amp
  }
  const norm = 1 / Math.sqrt(energy || 1)
  for (let i = 0; i < PARTIAL_COUNT; i++) a[i] = (a[i] as number) * norm
  return a
}

// ------------------------------------------------------------------ noise weaves

export interface TransientSpec {
  /** noise burst length, seconds */
  lengthS: number
  /** high-pass corner of the burst, Hz */
  hpHz: number
  /** burst level relative to the voice (×velocity) */
  level: number
}

/** EDGE → the /k/ of kiki: a filtered click at onset. edge 0 → none. */
export function transient(edge: number): TransientSpec {
  const e = clamp(edge, 0, 1)
  return {
    lengthS: lerp(0.005, 0.025, e),
    hpHz: 2000 + 4000 * e,
    level: 0.7 * e,
  }
}

export interface BreathSpec {
  /** sustained airy layer level (0 = pure tone) */
  level: number
  /** band-pass center as a ratio of the fundamental */
  bpRatio: number
}

/** TEXTURE → breath: translucent/soft-shadowed things are airy. */
export function breath(texture: number): BreathSpec {
  const t = clamp(texture, 0, 1)
  return { level: 0.22 * t, bpRatio: lerp(2.5, 1.2, t) }
}

/** TEXTURE → detune jitter in cents (rough surfaces are pitch-unstable). */
export const detuneJitterCents = (texture: number): number => 6 * clamp(texture, 0, 1)

// ------------------------------------------------------------------ pitch behaviour

export interface SubShimmerSpec {
  /** semitone offset of osc B: −12 chest sub for massive, +12 sparkle for tiny */
  interval: number
  level: number
}

/** MASS → the second oscillator: big = chest, tiny = sparkle. */
export function subShimmer(mass: number): SubShimmerSpec {
  const m = clamp(mass, 0, 1)
  return {
    interval: m >= 0.45 ? -12 : 12,
    level: lerp(0.1, 0.38, clamp(Math.abs(m - 0.45) * 2, 0, 1)),
  }
}

/** ROUND → glide: the bouba swoop-in. Returns portamento seconds (0 for sharp). */
export const glideS = (edge: number): number => lerp(0.028, 0, clamp(edge, 0, 1))

// ------------------------------------------------------------------ envelope weave

export interface EnvelopeSpec {
  attackS: number
  decayS: number
  sustain: number
  releaseScale: number
}

/** EDGE strikes, MASS adds inertia. */
export function envelopeWeave(edge: number, mass: number): EnvelopeSpec {
  const e = clamp(edge, 0, 1)
  const m = clamp(mass, 0, 1)
  return {
    attackS: lerp(0.045, 0.002, e) + 0.008 * m,
    decayS: lerp(0.4, 0.12, e),
    sustain: lerp(0.35, 0.15, e),
    releaseScale: lerp(0.8, 1.5, m),
  }
}

// ------------------------------------------------------------------ filter weave

export interface FilterWeaveSpec {
  q: number
  /** transient brightness bite: cutoff multiplier at onset, decaying to 1 */
  biteAmount: number
  biteDecayS: number
}

/** EDGE rings and bites. (Base cutoff itself comes from AIR via S2 + tilt, as before.) */
export function filterWeave(edge: number): FilterWeaveSpec {
  const e = clamp(edge, 0, 1)
  return {
    q: lerp(0.5, 2.4, e),
    biteAmount: 1 + 3 * e,
    biteDecayS: lerp(0.15, 0.06, e),
  }
}

// ------------------------------------------------------------------ reverb weave

export interface ReverbWeaveSpec {
  /** multiplier on the profile's base send */
  sendScale: number
  /** low-pass on the way into the reverb: dark sources bloom dark. Hz */
  sendCutoffHz: number
  /** 0 = arrive at full send immediately (sharp); 1 = swell from 35% over the note (round) */
  bloom: number
  /** spatial extent bonus from airy texture */
  extentBonus: number
}

export function reverbWeave(edge: number, mass: number, texture: number): ReverbWeaveSpec {
  const e = clamp(edge, 0, 1)
  const m = clamp(mass, 0, 1)
  const t = clamp(texture, 0, 1)
  return {
    sendScale: lerp(1.3, 0.7, e) * lerp(0.85, 1.15, m),
    sendCutoffHz: lerp(1200, 7000, e),
    bloom: 1 - e,
    extentBonus: 0.15 * t,
  }
}

// ------------------------------------------------------------------ interaction weave

/** I8 — scroll velocity (px/ms) → air-rush gain on the room tone, decaying over ~400 ms. */
export const airRushGain = (pxPerMs: number): number => clamp(pxPerMs * 0.06, 0, 0.18)
