/**
 * Pure spherical-harmonic encoding — SPATIAL.md §1–2. AmbiX: ACN order [W, Y, Z, X],
 * SN3D normalization, +x forward, +y left, +z up, +azimuth left. No DOM, no Tone.
 */

export const DEG = Math.PI / 180

/** ACN channel indices, for readability everywhere else. */
export const ACN = { W: 0, Y: 1, Z: 2, X: 3 } as const

export interface FoaGains {
  w: number
  y: number
  z: number
  x: number
}

/**
 * First-order encode of a plane wave from (azimuth, elevation), with extent σ blending the
 * directional components into the omni channel (SPATIAL.md §2). Angles in radians.
 */
export function foaGains(azimuth: number, elevation: number, extent = 0): FoaGains {
  const s = Math.min(1, Math.max(0, extent))
  const cosEl = Math.cos(elevation)
  const dir = 1 - s
  return {
    w: 1 + 0.41 * s,
    y: dir * Math.sin(azimuth) * cosEl,
    z: dir * Math.sin(elevation),
    x: dir * Math.cos(azimuth) * cosEl,
  }
}

/** Unit direction vector for (azimuth, elevation) in the AmbiX frame. */
export function unitVector(azimuth: number, elevation: number): [number, number, number] {
  const cosEl = Math.cos(elevation)
  return [Math.cos(azimuth) * cosEl, Math.sin(azimuth) * cosEl, Math.sin(elevation)]
}
