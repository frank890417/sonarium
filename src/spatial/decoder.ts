/**
 * Pure FOA decoding — SPATIAL.md §3.2. Sampling decoder with max-rE weighting over a fixed
 * virtual-speaker layout; each speaker is later rendered by one native HRTF panner.
 */
import { unitVector, type FoaGains } from './sh'

export interface Speaker {
  /** Unit direction in the AmbiX frame. */
  dir: [number, number, number]
  label: string
}

const C = 1 / Math.sqrt(3)

/** Cube vertices: full-sphere coverage including elevation, symmetric, M = 8. */
export const CUBE_LAYOUT: Speaker[] = [
  { dir: [C, C, C], label: 'front-left-up' },
  { dir: [C, -C, C], label: 'front-right-up' },
  { dir: [C, C, -C], label: 'front-left-down' },
  { dir: [C, -C, -C], label: 'front-right-down' },
  { dir: [-C, C, C], label: 'back-left-up' },
  { dir: [-C, -C, C], label: 'back-right-up' },
  { dir: [-C, C, -C], label: 'back-left-down' },
  { dir: [-C, -C, -C], label: 'back-right-down' },
]

/** max-rE weights for 3D first order (Zotter & Frank): g0 = 1, g1 = 1/√3. */
export const MAXRE_G0 = 1
export const MAXRE_G1 = 1 / Math.sqrt(3)

export interface DecodeRow {
  /** Per-ACN gains [w, y, z, x] for one speaker: s = w·W + y·Y + z·Z + x·X. */
  w: number
  y: number
  z: number
  x: number
}

/**
 * Sampling decode matrix for SN3D input: sm = (1/M)·[g0·W + 3·g1·(X·xm + Y·ym + Z·zm)].
 * The 3 re-normalizes first-order SN3D to N3D inside the projection.
 */
export function decodeMatrix(layout: Speaker[]): DecodeRow[] {
  const M = layout.length
  return layout.map(({ dir }) => ({
    w: (1 / M) * MAXRE_G0,
    x: (3 / M) * MAXRE_G1 * dir[0],
    y: (3 / M) * MAXRE_G1 * dir[1],
    z: (3 / M) * MAXRE_G1 * dir[2],
  }))
}

/** Decode an encoded source to speaker signals (used by tests and the worklet path later). */
export function decodeGains(rows: DecodeRow[], g: FoaGains): number[] {
  return rows.map((r) => r.w * g.w + r.y * g.y + r.z * g.z + r.x * g.x)
}

/** Total decoded energy for a direction — tests assert flatness across the sphere. */
export function decodedEnergy(rows: DecodeRow[], azimuth: number, elevation: number): number {
  const v = unitVector(azimuth, elevation)
  const g: FoaGains = { w: 1, x: v[0], y: v[1], z: v[2] }
  return decodeGains(rows, g).reduce((acc, s) => acc + s * s, 0)
}
