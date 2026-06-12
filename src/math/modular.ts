/**
 * The Modular patch — MODULAR.md made executable. CSS properties plug modulation cables:
 * border-width drives the wavefolder, texture×edge sets FM, mass thickens unison, animation
 * and dashed borders patch the LFO. Pure: no DOM, no Tone.
 */
import { clamp } from './util'

export interface ModularVisuals {
  /** seconds; 0 = no animation */
  animationS: number
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'none'
  borderWidthPx: number
  /** seconds; 0 = no transition */
  transitionS: number
}

export interface PatchParams {
  fold: { drive: number; mix: number }
  fm: { index: number }
  unison: { detuneCents: number; mix: number }
  lfo: { rateHz: number; shape: 'sine' | 'square'; vibratoCents: number; tremolo: number; filterDepth: number }
  portamentoS: number
}

/** M1 — heavy borders saturate: drive ∈ [0,1], mix follows. */
export function foldFromBorder(borderWidthPx: number, edge: number): PatchParams['fold'] {
  const drive = clamp(borderWidthPx / 6, 0, 1) * (0.25 + 0.75 * clamp(edge, 0, 1))
  return { drive, mix: drive > 0.01 ? 0.25 + 0.55 * drive : 0 }
}

/** M2 — rough sharp surfaces ring metallic (audio-rate FM index, × carrier Hz in-voice). */
export const fmIndex = (texture: number, edge: number): number =>
  1.5 * clamp(texture, 0, 1) * clamp(edge, 0, 1)

/** M3 — big elements are thick, not just low. */
export function unisonFromMass(mass: number): PatchParams['unison'] {
  const m = clamp(mass, 0, 1)
  return m >= 0.45 ? { detuneCents: 4 + 10 * m, mix: 0.4 } : { detuneCents: 0, mix: 0 }
}

/** M4/M5 — the LFO patch bay: animation owns it; dashed/dotted borders chop; else idle. */
export function lfoFromCss(animationS: number, borderStyle: ModularVisuals['borderStyle']): PatchParams['lfo'] {
  if (animationS > 0.05) {
    return {
      rateHz: clamp(1 / animationS, 0.08, 8),
      shape: borderStyle === 'dashed' || borderStyle === 'dotted' ? 'square' : 'sine',
      vibratoCents: 6,
      tremolo: 0.18,
      filterDepth: 0.25,
    }
  }
  if (borderStyle === 'dashed' || borderStyle === 'dotted') {
    return {
      rateHz: borderStyle === 'dotted' ? 7 : 3.5,
      shape: 'square',
      vibratoCents: 0,
      tremolo: 0.3,
      filterDepth: 0.35,
    }
  }
  return { rateHz: 0, shape: 'sine', vibratoCents: 0, tremolo: 0, filterDepth: 0 }
}

/** M6 — elements that ease visually ease in pitch. Seconds added to the glide. */
export const portamentoFromTransition = (transitionS: number): number =>
  clamp(transitionS / 2, 0, 0.25)

/** M7 — typography enters the weave: bold text carries weight (MASS bonus). */
export const massBonusFromFontWeight = (weight: number): number =>
  clamp((weight - 400) / 300, 0, 1) * 0.12

export function patchFrom(matter: { edge: number; mass: number; texture: number }, visuals: ModularVisuals): PatchParams {
  return {
    fold: foldFromBorder(visuals.borderWidthPx, matter.edge),
    fm: { index: fmIndex(matter.texture, matter.edge) },
    unison: unisonFromMass(matter.mass),
    lfo: lfoFromCss(visuals.animationS, visuals.borderStyle),
    portamentoS: portamentoFromTransition(visuals.transitionS),
  }
}

/**
 * The wavefolder transfer curve: y = sin(2.5·(π/2)·x). Near-linear for quiet signals,
 * folding for hot ones — the amp envelope sweeps the spectrum through the fold every note.
 */
export function foldCurve(samples = 2049): Float32Array {
  const out = new Float32Array(samples)
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1
    out[i] = Math.sin(2.5 * (Math.PI / 2) * x)
  }
  return out
}

/** Drag-glissando ribbon (MODULAR.md §3): horizontal travel → scale-step offset, ±1 octave. */
export function ribbonSteps(dxPx: number, vw: number, scaleLen: number): number {
  const t = clamp(dxPx / (vw * 0.6), -1, 1)
  return Math.round(t * scaleLen)
}
