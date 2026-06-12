/**
 * L3 Composition — themes are plain data (MAPPING.md §3). Adding a theme means adding an
 * object here; no engine code may special-case a theme name.
 */
import type { Theme } from '../types'

// v0.3: aurora speaks through the woven MatterVoice — geometry IS the instrument
// (MATTER.md). fm bells (headings) and membrane thuds (media) stay as character voices.
const aurora: Theme = {
  name: 'aurora',
  defaults: { synthKind: 'matter', octaveShift: 0, baseVelocity: 0.8, releaseScale: 1 },
  roles: {
    toggle: { synthKind: 'matter', baseVelocity: 0.7, releaseScale: 0.8 },
    button: { synthKind: 'matter', baseVelocity: 0.9 },
    link: { synthKind: 'matter', octaveShift: 1, baseVelocity: 0.6, releaseScale: 0.7 },
    input: { synthKind: 'matter', baseVelocity: 0.55, releaseScale: 1.6 },
    heading: { synthKind: 'fm', octaveShift: 0, baseVelocity: 0.75, releaseScale: 2.2 },
    media: { synthKind: 'membrane', octaveShift: -1, baseVelocity: 0.8 },
    item: { synthKind: 'matter', baseVelocity: 0.6, releaseScale: 0.8 },
    text: { synthKind: 'matter', baseVelocity: 0.35, releaseScale: 1.8 },
  },
}

const mono: Theme = {
  name: 'mono',
  defaults: { synthKind: 'synth', octaveShift: 0, baseVelocity: 0.7, releaseScale: 0.5 },
  roles: {
    toggle: { synthKind: 'noise', baseVelocity: 0.6 },
    button: { synthKind: 'synth', pinWave: 'square', baseVelocity: 0.7, releaseScale: 0.4 },
    link: { synthKind: 'noise', baseVelocity: 0.45, releaseScale: 0.3 },
    input: { synthKind: 'synth', pinWave: 'sine', octaveShift: -1, baseVelocity: 0.5 },
    heading: { synthKind: 'synth', pinWave: 'sine', octaveShift: 1, baseVelocity: 0.6 },
    media: { synthKind: 'noise', baseVelocity: 0.55 },
    item: { synthKind: 'noise', baseVelocity: 0.4, releaseScale: 0.3 },
    text: { synthKind: 'synth', pinWave: 'sine', baseVelocity: 0 },
  },
}

const paper: Theme = {
  name: 'paper',
  defaults: { synthKind: 'pluck', octaveShift: 0, baseVelocity: 0.8, releaseScale: 1 },
  roles: {
    toggle: { synthKind: 'pluck', baseVelocity: 0.7 },
    button: { synthKind: 'pluck', baseVelocity: 0.9 },
    link: { synthKind: 'pluck', octaveShift: 1, baseVelocity: 0.65 },
    input: { synthKind: 'synth', pinWave: 'triangle', baseVelocity: 0.5, releaseScale: 1.4 },
    heading: { synthKind: 'pluck', octaveShift: -1, baseVelocity: 0.85, releaseScale: 1.6 },
    media: { synthKind: 'membrane', octaveShift: -1, baseVelocity: 0.7 },
    item: { synthKind: 'pluck', baseVelocity: 0.6 },
    text: { synthKind: 'synth', pinWave: 'sine', baseVelocity: 0.3, releaseScale: 1.6 },
  },
}

export const THEMES: Record<string, Theme> = { aurora, mono, paper }

export function resolveTheme(theme: string | Theme | undefined): Theme {
  if (!theme) return aurora
  if (typeof theme === 'string') return THEMES[theme] ?? aurora
  return theme
}
