import { clamp, fnv1a } from './util'

/** MAPPING.md §0 — the five scales reachable from a hostname hash. */
export const SCALES: Record<string, readonly number[]> = {
  pentMajor: [0, 2, 4, 7, 9],
  pentMinor: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
} as const

export const SCALE_NAMES = Object.keys(SCALES) as (keyof typeof SCALES)[]

export const OCTAVES = 3
/** C3 — the bottom of the 3-octave pitch space. */
export const BASE_MIDI = 48

const NOTE_TO_PC: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6,
  Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
}

const PC_TO_NOTE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const

export interface SiteKey {
  root: number
  scaleName: string
  scale: readonly number[]
  label: string
}

/** Deterministic per-domain musical identity (T8 audio branding). Same host → same key, always. */
export function siteKey(hostname: string): SiteKey {
  const host = hostname || 'localhost'
  const h = fnv1a(host)
  const root = h % 12
  const scaleName = SCALE_NAMES[(h >>> 4) % SCALE_NAMES.length] as string
  const scale = SCALES[scaleName] as readonly number[]
  return { root, scaleName, scale, label: `${PC_TO_NOTE[root]} ${scaleName}` }
}

/** Parse "D dorian" / "Eb pentMinor" → SiteKey. Returns null when unrecognized. */
export function parseKey(spec: string): SiteKey | null {
  const m = spec.trim().match(/^([A-Ga-g][#b]?)\s+(\w+)$/)
  if (!m) return null
  const note = (m[1] as string).charAt(0).toUpperCase() + (m[1] as string).slice(1)
  const root = NOTE_TO_PC[note]
  const scaleName = m[2] as string
  const scale = SCALES[scaleName]
  if (root === undefined || !scale) return null
  return { root, scaleName, scale, label: `${PC_TO_NOTE[root]} ${scaleName}` }
}

/**
 * The Musical Quantizer (Invariant #2): degree ∈ [0,1] → MIDI note inside the key,
 * laid across OCTAVES octaves from BASE_MIDI + root. stepOffset shifts by whole scale steps
 * (sibling melodies S4, heading registers S6, kiki nudge G10).
 */
export function degreeToMidi(degree: number, key: SiteKey, stepOffset = 0): number {
  const steps = key.scale.length * OCTAVES
  let idx = Math.round(clamp(degree, 0, 1) * (steps - 1)) + Math.round(stepOffset)
  idx = clamp(idx, 0, steps - 1)
  const oct = Math.floor(idx / key.scale.length)
  const pc = key.scale[idx % key.scale.length] as number
  return BASE_MIDI + key.root + oct * 12 + pc
}

export const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12)

/**
 * Walk N scale steps up/down from a midi note, staying on the key's pitch classes
 * (the ribbon controller's quantizer — MODULAR.md §3; Invariant #2 holds under drag).
 */
export function stepInScale(midi: number, key: SiteKey, steps: number): number {
  if (steps === 0) return midi
  const pcs = key.scale.map((s) => (s + key.root) % 12)
  const dir = steps > 0 ? 1 : -1
  let m = midi
  for (let i = 0; i < Math.abs(steps); i++) {
    do {
      m += dir
    } while (!pcs.includes(((m % 12) + 12) % 12) && m > 12 && m < 120)
  }
  return clamp(m, 12, 120)
}

export function midiToNoteName(m: number): string {
  const pc = ((m % 12) + 12) % 12
  return `${PC_TO_NOTE[pc]}${Math.floor(m / 12) - 1}`
}
