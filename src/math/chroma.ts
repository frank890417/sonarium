/**
 * The Chroma weave — CHROMA.md made executable. Color tints the Matter voice per element and
 * chooses the musical mode per page. Pure: no DOM, no Tone.
 */
import { clamp, lerp } from './util'

export interface Rgb {
  r: number
  g: number
  b: number
  a: number
}

export interface Hsl {
  h: number
  s: number
  l: number
}

export interface Chroma {
  /** 0 cool … 1 warm (desaturated colors regress to 0.5) */
  warmth: number
  saturation: number
  luminance: number
}

/** Computed styles emit rgb()/rgba(). Returns null for anything else (treat as no color). */
export function parseCssColor(css: string): Rgb | null {
  const m = css.trim().match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(\d*(?:\.\d+)?)\s*)?\)$/)
  if (!m) return null
  return {
    r: clamp(parseFloat(m[1] as string) / 255, 0, 1),
    g: clamp(parseFloat(m[2] as string) / 255, 0, 1),
    b: clamp(parseFloat(m[3] as string) / 255, 0, 1),
    a: m[4] === undefined ? 1 : clamp(parseFloat(m[4] as string), 0, 1),
  }
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d < 1e-6) return { h: 0, s: 0, l }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s: clamp(s, 0, 1), l }
}

/** CHROMA.md §1 — cosine distance of hue from 30° (orange); greys regress to neutral 0.5. */
export function warmthFromHue(h: number, s: number): number {
  const raw = 0.5 + 0.5 * Math.cos(((h - 30) * Math.PI) / 180)
  return lerp(0.5, raw, clamp(s * 2, 0, 1))
}

export function chromaOf(rgb: Rgb | null): Chroma {
  if (!rgb || rgb.a < 0.05) return { warmth: 0.5, saturation: 0, luminance: 0.5 }
  const { h, s, l } = rgbToHsl(rgb)
  return { warmth: warmthFromHue(h, s), saturation: s, luminance: l }
}

// ------------------------------------------------------------- element weave (CH1–CH5)

/** CH1 — dark UI sounds dark. */
export const brightnessFromLuminance = (l: number): number => lerp(0.78, 1.22, clamp(l, 0, 1))

/** CH2 — bright lifts, gently. */
export const velocityFromLuminance = (l: number): number => lerp(0.92, 1.06, clamp(l, 0, 1))

/** CH3 — warm = energetic onset (thesis T5). Multiplier on the woven attack. */
export const attackScaleFromWarmth = (w: number): number => lerp(1.18, 0.82, clamp(w, 0, 1))

/** CH4 — warm = full-bodied: bonus on the sub oscillator level (subs only, not shimmer). */
export const subBonusFromWarmth = (w: number): number => 0.08 * clamp(w, 0, 1)

/** CH5 — vivid color = vivid spectrum: richness passed to genPartials (rolloff reduction). */
export const richnessFromSaturation = (s: number): number => 0.35 * clamp(s, 0, 1)

// ------------------------------------------------------------- page weave (CH6–CH8)

export type ModeName = 'lydian' | 'mixolydian' | 'dorian' | 'pentMinor' | null

/**
 * CH6 — the palette chooses the mode; null = neutral, keep the hostname-hashed scale
 * (identity unchanged). Root pitch-class always stays hostname-hashed (S9).
 */
export function modeFromPalette(pal: Chroma): ModeName {
  if (pal.warmth >= 0.55) return pal.luminance >= 0.5 ? 'lydian' : 'mixolydian'
  if (pal.warmth <= 0.45) return pal.luminance >= 0.5 ? 'dorian' : 'pentMinor'
  return null
}

/** Visual weight of the page: bg dominates, text tints. */
export function pagePalette(bg: Chroma, text: Chroma): Chroma {
  return {
    warmth: bg.warmth * 0.7 + text.warmth * 0.3,
    saturation: bg.saturation * 0.7 + text.saturation * 0.3,
    luminance: bg.luminance * 0.7 + text.luminance * 0.3,
  }
}

/** CH7 — warm rooms hum warmer. Multiplier on the ambience cutoff. */
export const roomToneScaleFromWarmth = (w: number): number => lerp(0.85, 1.25, clamp(w, 0, 1))

/** CH8 — warm pages run slightly faster (consumed by PULSE.md P2). */
export const tempoScaleFromWarmth = (w: number): number => lerp(0.94, 1.06, clamp(w, 0, 1))
