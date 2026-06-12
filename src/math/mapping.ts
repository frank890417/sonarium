/**
 * Every formula in MAPPING.md §1–2, one named pure function each.
 * This file is the executable form of the Mapping Canon: no DOM, no Tone, no side effects.
 * Change a formula here ⇄ change MAPPING.md in the same commit (PLAN.md Invariant #3).
 */
import { clamp, lerp, norm } from './util'
import type { Rect, Wave } from '../types'

export const ROOM_HALF_W = 8 // meters — G1
export const ROOM_HALF_H = 4 // meters — G2

/** G1 — element center x → azimuth (positionX, meters). */
export function panX(rect: Rect, vw: number): number {
  return (2 * norm(rect.x + rect.w / 2, 0, vw) - 1) * ROOM_HALF_W
}

/** G2 — element center y → elevation (positionY, meters; screen-top = up). */
export function panY(rect: Rect, vh: number): number {
  return (1 - 2 * norm(rect.y + rect.h / 2, 0, vh)) * ROOM_HALF_H
}

/** G3 — vertical position → brightness tilt multiplier on the filter cutoff. */
export function brightnessTilt(rect: Rect, vh: number): number {
  return lerp(1.45, 0.7, norm(rect.y + rect.h / 2, 0, vh))
}

/** G4 — log-normalized size 0 (tiny) … 1 (viewport-filling). */
export function sizeT(rect: Rect, vw: number, vh: number): number {
  const a = Math.max(1, rect.w * rect.h)
  const A = Math.max(1, vw * vh)
  return norm(Math.log(1 + (100 * a) / A), 0, Math.log(101))
}

/**
 * G4 — pitch degree, inverted: big elements speak low (T2). Compressed into [0.1, 0.85] so
 * sibling/heading step offsets have melodic headroom instead of clamping at the edges.
 */
export const degreeFromSize = (t: number): number => 0.1 + 0.75 * (1 - t)

/** G5 — big elements speak louder (T2). */
export const velocityFromSize = (t: number): number => lerp(0.85, 1.25, t)

/** G6 — roundness r ∈ [0,1]: 0 = razor corner (kiki), 1 = pill/circle (bouba). */
export function roundness(radiusPx: number, rect: Rect): number {
  const half = Math.min(rect.w, rect.h) / 2
  return half <= 0 ? 0 : clamp(radiusPx / half, 0, 1)
}

/** G7 — the Kiki/Bouba waveform ladder. */
export function waveFromRoundness(r: number): Wave {
  if (r < 0.15) return 'square'
  if (r < 0.45) return 'sawtooth'
  if (r < 0.8) return 'triangle'
  return 'sine'
}

/** G8 — sharp = plosive onset, round = soft bloom. Seconds. */
export const attackFromRoundness = (r: number): number => lerp(0.002, 0.045, r)

/** G9 — sharp edges ring with resonance. */
export const qFromRoundness = (r: number): number => lerp(2.4, 0.5, r)

/** G10 — sharper ↔ slightly higher (T1), in whole scale steps. */
export const pitchNudgeFromRoundness = (r: number): number => (1 - r) * 1

/** G11 — elongation → duration: long elements sweep, squares tick. Seconds. */
export function durationFromElongation(rect: Rect): number {
  const e = Math.max(rect.w, rect.h) / Math.max(1, Math.min(rect.w, rect.h))
  return clamp(0.18 * Math.sqrt(e), 0.12, 1.6)
}

/** G13 — box-shadow blur lifts the element into the room's reverb. */
export const sendFromShadowBlur = (blurPx: number): number => clamp(blurPx / 40, 0, 0.5)

/** S1 — DOM depth → distance behind the sound stage (listener at z=0 facing −z). */
export const zFromDepth = (depth: number): number => -(1 + 0.7 * Math.min(depth, 10))

/** S2 — deeper nesting = duller voice. Hz. */
export const cutoffFromDepth = (depth: number): number => Math.max(700, 9000 * Math.pow(0.82, depth))

/** S3 — deeper nesting = quieter (distance loudness, Zahorik 2002). */
export const velocityFromDepth = (depth: number): number => Math.max(0.55, Math.pow(0.97, depth))

/** S5 — positive z-index pulls the element toward the listener. Meters toward z=0. */
export const zBonusFromZIndex = (z: number): number => clamp(z / 50, 0, 1) * 0.8

/** S4 — siblings climb the scale, wrapping each octave (do-re-mi…-do) so long lists stay melodic. */
export const stepsFromSiblingIndex = (i: number, scaleLen = 7): number => i % Math.max(1, scaleLen)

/** S6 — headings: h1 lands lowest/grandest. Whole scale steps (negative = down). */
export const stepsFromHeadingLevel = (level: number): number => -(7 - clamp(level, 1, 6)) * 2

/** S7/S8 — the viewport is the room. */
export function reverbFromViewport(vw: number): { decay: number; wet: number } {
  const t = norm(vw, 360, 2200)
  return { decay: lerp(0.6, 4.5, t), wet: lerp(0.08, 0.32, t) }
}

/** I13 — room tone color follows room size. Hz. */
export const ambienceCutoffFromViewport = (vw: number): number => lerp(400, 1400, norm(vw, 360, 2200))
