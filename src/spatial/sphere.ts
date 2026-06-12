/**
 * Pure sphere mappings — SPATIAL.md §4 (canon rows SP1–SP5). The page is laid on the front
 * hemisphere of a sphere around the listener; geometry becomes spherical source properties.
 * No DOM, no Tone.
 */
import { clamp, norm } from '../math/util'
import { DEG } from './sh'
import type { Rect } from '../types'

export const AZ_MAX = 70 * DEG
export const EL_MAX = 45 * DEG

/** SP1/SP2 — screen position → direction. Screen-right = −azimuth (sign tested). */
export function sphereFromRect(rect: Rect, vw: number, vh: number): { azimuth: number; elevation: number } {
  const tx = norm(rect.x + rect.w / 2, 0, vw)
  const ty = norm(rect.y + rect.h / 2, 0, vh)
  return {
    azimuth: -(2 * tx - 1) * AZ_MAX,
    elevation: (1 - 2 * ty) * EL_MAX,
  }
}

/** SP4 — big elements wrap around the listener (T2 extended into space). */
export function extentFromSize(sizeT: number): number {
  return clamp(0.05 + 0.75 * Math.pow(clamp(sizeT, 0, 1), 1.2), 0, 0.95)
}

/** SP5 — Kiki/Bouba in the spatial domain: sharp beams, round radiates. */
export function directivityFromRoundness(roundness: number): number {
  return clamp(1 - roundness, 0, 1)
}

/** SP6 — early-reflection time scale follows the room (viewport). */
export function reflectionScaleFromViewport(vw: number): number {
  return 0.6 + norm(vw, 360, 2200) * 1.0
}
