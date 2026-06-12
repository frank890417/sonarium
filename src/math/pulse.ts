/**
 * The Pulse — PULSE.md made executable: tempo from the layout, grid offsets for echoes,
 * metered strum spacing, and the calm system. Pure: no DOM, no Tone.
 * THE LATENCY INVARIANT (PULSE.md §0): nothing here ever delays a primary hit.
 */
import { clamp, lerp } from './util'

/** P1+P2 — layout density × page warmth → bpm, clamped to [56, 116]. */
export function tempoFromPage(elementCount: number, warmthScale: number): number {
  const base = lerp(66, 104, clamp(elementCount / 120, 0, 1))
  return Math.round(clamp(base * warmthScale, 56, 116))
}

export const secondsPerBeat = (bpm: number): number => 60 / Math.max(1, bpm)

/**
 * P3 — offset (seconds from now) to the next grid boundary of `gridS` seconds that is at
 * least `minAheadS` away. `phaseS` = seconds elapsed since the grid's epoch.
 */
export function nextGridOffset(phaseS: number, gridS: number, minAheadS: number): number {
  if (gridS <= 0) return minAheadS
  let offset = gridS - (((phaseS % gridS) + gridS) % gridS)
  while (offset < minAheadS) offset += gridS
  return offset
}

/** Strums step in 32nd notes — the same gesture, now in the groove. Seconds. */
export const strumStepS = (bpm: number): number => secondsPerBeat(bpm) / 8

/** Echoes answer on 8ths, one octave up, quiet (PULSE.md §2). */
export const ECHO_TRANSPOSE = 12
export const ECHO_VELOCITY_SCALE = 0.22
export const ECHO_MIN_AHEAD_S = 0.08
export const echoGridS = (bpm: number): number => secondsPerBeat(bpm) / 2

// ------------------------------------------------------------- the calm system (P5)

export const DUCK_RECOVERY_MS = 2000

/** Activity count decays linearly: fully forgiven after count·2 s of silence. */
export const decayCount = (count: number, dtMs: number): number =>
  Math.max(0, count - dtMs / DUCK_RECOVERY_MS)

/** Velocity multiplier: the 6th rapid repeat sits at ~40%, never below. */
export const duckFactor = (count: number): number =>
  Math.max(0.4, Math.pow(0.85, Math.max(0, count)))

// ------------------------------------------------------------- phrases (P4)

export const PHRASE_PROBABILITY = 0.55
export const PHRASE_MIN_NOTES = 2
export const PHRASE_MAX_NOTES = 4

/** Reading order: rows of ~80 px, then left→right. Sort key for (top, left). */
export const readingOrderKey = (top: number, left: number): number =>
  Math.round(top / 80) * 100000 + clamp(left, 0, 99999)

/**
 * Window the score by scroll progress: with n elements and a phrase of len, the playhead
 * starts at `progress·(n − len)`.
 */
export function phraseWindow(n: number, len: number, progress: number): number {
  return Math.round(clamp(progress, 0, 1) * Math.max(0, n - len))
}
