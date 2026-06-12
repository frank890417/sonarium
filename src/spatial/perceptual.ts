/**
 * Pure perceptual-factor formulas — SPATIAL.md §5. The spat5.oper surface: five factors in
 * [0,1], each mapping monotonically to DSP parameters. Defaults mirror the spec table.
 */
import { clamp, lerp } from '../math/util'
import type { PerceptualFactors } from '../types'

export type { PerceptualFactors }

export const DEFAULT_FACTORS: PerceptualFactors = {
  presence: 0.7,
  roomPresence: 0.5,
  envelopment: 0.55,
  warmth: 0.5,
  brilliance: 0.5,
}

export function resolveFactors(partial: Partial<PerceptualFactors> | undefined): PerceptualFactors {
  const f = { ...DEFAULT_FACTORS, ...(partial ?? {}) }
  for (const k of Object.keys(f) as (keyof PerceptualFactors)[]) f[k] = clamp(f[k], 0, 1)
  return f
}

/** presence → direct-path gain (linear). */
export const directGain = (presence: number): number => lerp(0.5, 1.2, clamp(presence, 0, 1))

/** roomPresence → early-reflection + reverb-send master (linear). */
export const roomGain = (roomPresence: number): number => lerp(0, 1.6, clamp(roomPresence, 0, 1))

/** envelopment → diffuse-tail extent (σ of the tail encoders) and tail level. */
export const tailExtent = (envelopment: number): number => clamp(envelopment, 0, 1)
export const tailLevel = (envelopment: number): number => lerp(0.7, 1.25, clamp(envelopment, 0, 1))

/** warmth → low-shelf dB at 250 Hz. */
export const warmthDb = (warmth: number): number => lerp(-3, 3, clamp(warmth, 0, 1))

/** brilliance → high-shelf dB at 4 kHz. */
export const brillianceDb = (brilliance: number): number => lerp(-4, 3, clamp(brilliance, 0, 1))

/** directivity δ → source presence/brightness/room behaviour (SPATIAL.md §2). */
export const directivityDirectGain = (d: number): number => lerp(0.75, 1.1, clamp(d, 0, 1))
export const directivitySendScale = (d: number): number => lerp(1.35, 0.8, clamp(d, 0, 1))
export const directivityFilterScale = (d: number): number => lerp(0.85, 1.15, clamp(d, 0, 1))
