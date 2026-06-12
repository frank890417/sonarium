/**
 * Sonarium — drop-in acoustic UX.
 * One script tag turns any webpage into a spatial sound field: layout becomes a stereo stage,
 * geometry becomes timbre (Kiki/Bouba), the DOM tree becomes depth and harmony, the viewport
 * becomes a room, and your cursor becomes your ears.
 *
 *   import { create } from 'sonarium'         // ESM
 *   const space = create({ theme: 'aurora' })
 *
 *   <script src=".../sonarium.iife.js" data-auto></script>   // zero-code
 *
 * Docs: https://github.com/frank890417/sonarium — start with docs/PLAN.md.
 */
import { Engine } from './core/engine'
import type { SonariumOptions } from './types'

export const version = '0.3.0'

export type {
  SonariumOptions, SonicProfile, Theme, VoiceRecipe, Role, Wave, SynthKind,
  Articulation, TriggerDetail, SonariumEvent, SphereProps, PerceptualFactors,
} from './types'
export { THEMES } from './themes/index'
export { siteKey, parseKey, degreeToMidi, midiToFreq, midiToNoteName, SCALES } from './math/scales'
export * as mapping from './math/mapping'
export * as matter from './math/matter'
// The pure spatial layer (SPATIAL.md) — reusable beyond the DOM.
export { foaGains, unitVector, DEG } from './spatial/sh'
export { rotationMatrix, lookMatrix, applyMat3 } from './spatial/rotation'
export { CUBE_LAYOUT, decodeMatrix, decodeGains } from './spatial/decoder'
export * as sphereMapping from './spatial/sphere'
export { DEFAULT_FACTORS } from './spatial/perceptual'
export type { Engine }

/**
 * Create a Sonarium instance. Safe to call before any user gesture: audio arms itself and
 * starts on the first pointer/key interaction (browser autoplay policy treated as a feature).
 */
export function create(options: SonariumOptions = {}): Engine {
  return new Engine(options)
}

// ---------------------------------------------------------------------------- auto-init
// <script src="sonarium.iife.js" data-auto data-theme="paper" data-ambient="0.2"></script>
function autoInit(): void {
  if (typeof document === 'undefined') return
  const script = document.currentScript as HTMLScriptElement | null
  if (!script || script.dataset.auto === undefined) return
  const opts: SonariumOptions = {}
  if (script.dataset.theme) opts.theme = script.dataset.theme as SonariumOptions['theme']
  if (script.dataset.key) opts.key = script.dataset.key
  if (script.dataset.ambient) opts.ambient = parseFloat(script.dataset.ambient)
  if (script.dataset.listener) opts.listener = script.dataset.listener as SonariumOptions['listener']
  if (script.dataset.volume) opts.volume = parseFloat(script.dataset.volume)
  if (script.dataset.panning) opts.panning = script.dataset.panning as SonariumOptions['panning']
  const boot = () => {
    try {
      const engine = create(opts)
      ;(window as unknown as Record<string, unknown>).sonarium = engine
    } catch (err) {
      console.warn('[sonarium] auto-init failed', err)
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true })
  } else {
    boot()
  }
}

autoInit()
