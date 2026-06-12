/**
 * L1 Page Reading — element → SonicProfile. Imports math + DOM, never Tone
 * (ARCHITECTURE.md §1 dependency rules).
 */
import {
  attackFromRoundness, brightnessTilt, cutoffFromDepth, degreeFromSize, durationFromElongation,
  panX, panY, pitchNudgeFromRoundness, qFromRoundness, roundness, sendFromShadowBlur, sizeT,
  stepsFromHeadingLevel, stepsFromSiblingIndex, velocityFromDepth, velocityFromSize,
  waveFromRoundness, zBonusFromZIndex, zFromDepth,
} from '../math/mapping'
import { clamp } from '../math/util'
import { degreeToMidi, midiToFreq, midiToNoteName, type SiteKey } from '../math/scales'
import {
  breath, deriveMatter, detuneJitterCents, envelopeWeave, filterWeave, genPartials, glideS,
  reverbWeave, subShimmer, transient,
} from '../math/matter'
import {
  attackScaleFromWarmth, brightnessFromLuminance, chromaOf, parseCssColor,
  richnessFromSaturation, subBonusFromWarmth, velocityFromLuminance, type Chroma,
} from '../math/chroma'
import { directivityFromRoundness, extentFromSize, sphereFromRect } from '../spatial/sphere'
import { directivityFilterScale } from '../spatial/perceptual'
import { DEG } from '../spatial/sh'
import type { MatterVoiceParams, Rect, Role, SonicProfile, SphereProps, Theme, VoiceRecipe, Wave } from '../types'

const HEADING = /^H[1-6]$/

export function roleOf(el: Element): Role {
  const aria = (el.getAttribute('role') || '').toLowerCase()
  const override = (el as HTMLElement).dataset?.sonicRole as Role | undefined
  if (override) return override
  const tag = el.tagName
  const type = (el.getAttribute('type') || '').toLowerCase()
  if (tag === 'INPUT' && (type === 'checkbox' || type === 'radio')) return 'toggle'
  if (aria === 'switch' || aria === 'checkbox' || tag === 'SUMMARY') return 'toggle'
  if (tag === 'BUTTON' || aria === 'button' || (tag === 'INPUT' && (type === 'button' || type === 'submit' || type === 'reset'))) return 'button'
  if ((tag === 'A' && el.hasAttribute('href')) || aria === 'link') return 'link'
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable) return 'input'
  if (HEADING.test(tag) || aria === 'heading') return 'heading'
  if (tag === 'IMG' || tag === 'VIDEO' || tag === 'SVG' || tag === 'CANVAS' || tag === 'PICTURE' || tag === 'AUDIO') return 'media'
  if (tag === 'LI' || tag === 'TR' || ['listitem', 'option', 'menuitem', 'tab'].includes(aria)) return 'item'
  if (['NAV', 'SECTION', 'ARTICLE', 'ASIDE', 'FORM', 'FIELDSET', 'HEADER', 'FOOTER', 'MAIN', 'DIALOG'].includes(tag)) return 'container'
  if (['navigation', 'region', 'group', 'list', 'menu', 'tablist', 'dialog'].includes(aria)) return 'container'
  if (tag === 'P' || tag === 'BLOCKQUOTE' || tag === 'LABEL' || tag === 'SPAN') return 'text'
  return 'container'
}

export function domDepth(el: Element, root: Element): number {
  let d = 0
  let n: Element | null = el
  while (n && n !== root && d < 32) {
    n = n.parentElement
    d++
  }
  return d
}

function eligibleSiblingIndex(el: Element): number {
  const parent = el.parentElement
  if (!parent) return 0
  let i = 0
  for (const sib of Array.from(parent.children)) {
    if (sib === el) return i
    if (sib.tagName === el.tagName || roleOf(sib) === roleOf(el)) i++
  }
  return 0
}

function recipeFor(role: Role, theme: Theme): VoiceRecipe {
  return { ...theme.defaults, ...(theme.roles[role] ?? {}) }
}

function isQuiet(el: Element): boolean {
  let n: Element | null = el
  while (n) {
    if ((n as HTMLElement).dataset?.sonic === 'quiet') return true
    n = n.parentElement
  }
  return false
}

const NOTE_RE = /^([A-Ga-g][#b]?)(-?\d)$/
function pinnedMidi(spec: string | undefined): number | null {
  if (!spec) return null
  const m = spec.trim().match(NOTE_RE)
  if (!m) return null
  const pcs: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }
  const name = (m[1] as string).charAt(0).toUpperCase() + (m[1] as string).slice(1)
  const pc = pcs[name]
  if (pc === undefined) return null
  return (parseInt(m[2] as string, 10) + 1) * 12 + pc
}

export interface ProfileEnv {
  root: Element
  key: SiteKey
  theme: Theme
  vw: number
  vh: number
}

/** CSS custom property, trimmed; '' when unset. Inherits down the tree (the aural stylesheet). */
function sonicVar(cs: CSSStyleDeclaration, name: string): string {
  return cs.getPropertyValue(name).trim()
}

/** Compute the full acoustic identity of an element. Pure given (el state, env). */
export function profileOf(el: Element, env: ProfileEnv): SonicProfile {
  const { key, theme, vw, vh } = env
  const html = el as HTMLElement
  const reasons: Record<string, string> = {}

  const cs = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  const rect: Rect = { x: r.x, y: r.y, w: Math.max(1, r.width), h: Math.max(1, r.height) }
  // Priority: data-sonic-role > --sonic-role > inference (CHROMA.md §4).
  const role = (html.dataset?.sonicRole as Role | undefined)
    || (sonicVar(cs, '--sonic-role') as Role | '')
    || roleOf(el)
  const recipe = recipeFor(role, theme)
  reasons.role = `<${el.tagName.toLowerCase()}> reads as "${role}" → ${recipe.synthKind} voice (theme ${theme.name})`
  // border-radius percentages survive into computed style — resolve against the box.
  const radiusRaw = cs.borderTopLeftRadius
  const radiusPx = radiusRaw.endsWith('%')
    ? ((parseFloat(radiusRaw) || 0) / 100) * Math.min(rect.w, rect.h)
    : parseFloat(radiusRaw) || 0
  const opacity = parseFloat(cs.opacity)
  const shadowBlur = parseShadowBlur(cs.boxShadow)
  const zIndex = cs.position !== 'static' ? parseInt(cs.zIndex, 10) || 0 : 0

  // Space (G1, G2, S1, S5)
  const depth = domDepth(el, env.root)
  const pan = {
    x: panX(rect, vw),
    y: panY(rect, vh),
    z: zFromDepth(depth) + zBonusFromZIndex(zIndex),
  }
  reasons.position = `center (${Math.round(rect.x + rect.w / 2)}, ${Math.round(rect.y + rect.h / 2)}) px → (${pan.x.toFixed(1)}, ${pan.y.toFixed(1)}) m; depth ${depth} → ${pan.z.toFixed(1)} m away`

  // Pitch (G4, S4, S6, G10) through the quantizer
  const st = sizeT(rect, vw, vh)
  const degree = degreeFromSize(st)
  const round = roundness(radiusPx, rect)
  let steps = stepsFromSiblingIndex(eligibleSiblingIndex(el), key.scale.length) + pitchNudgeFromRoundness(round)
  if (role === 'heading') {
    const level = HEADING.test(el.tagName) ? parseInt(el.tagName[1] as string, 10) : 2
    steps += stepsFromHeadingLevel(level)
  }
  steps += recipe.octaveShift * key.scale.length
  const pinned = pinnedMidi(html.dataset?.sonicNote ?? sonicVar(cs, '--sonic-note') ?? undefined)
  const midi = pinned ?? degreeToMidi(degree, key, steps)
  reasons.pitch = pinned !== null
    ? `pinned by data-sonic-note → ${midiToNoteName(midi)}`
    : `area ${(rect.w * rect.h / 1000).toFixed(1)}k px² (size ${st.toFixed(2)}) + sibling/heading offsets → ${midiToNoteName(midi)} in ${key.label}`

  // Timbre (G6–G9) — Kiki/Bouba
  const wave: Wave = (html.dataset?.sonicWave as Wave)
    || (sonicVar(cs, '--sonic-wave') as Wave | '')
    || recipe.pinWave
    || waveFromRoundness(round)
  const attack = attackFromRoundness(round)
  reasons.timbre = `roundness ${round.toFixed(2)} (radius ${radiusPx}px) → ${wave} wave, ${(attack * 1000).toFixed(0)} ms attack`

  // Duration (G11)
  const durationS = durationFromElongation(rect)
  reasons.duration = `aspect ${(Math.max(rect.w, rect.h) / Math.min(rect.w, rect.h)).toFixed(1)}:1 → ${durationS.toFixed(2)} s`

  // Sphere — the 聲球 (SPATIAL.md SP1–SP5)
  const dir = sphereFromRect(rect, vw, vh)
  const extentOverride = parseFloat(html.dataset?.sonicExtent ?? sonicVar(cs, '--sonic-extent'))
  const sphere: SphereProps = {
    azimuth: dir.azimuth,
    elevation: dir.elevation,
    extent: isNaN(extentOverride) ? extentFromSize(st) : clamp(extentOverride, 0, 1),
    directivity: directivityFromRoundness(round),
  }
  reasons.sphere = `az ${(sphere.azimuth / DEG).toFixed(0)}°, el ${(sphere.elevation / DEG).toFixed(0)}°, extent ${sphere.extent.toFixed(2)} (size wraps the listener), directivity ${sphere.directivity.toFixed(2)} (sharp beams, round radiates)`

  // The Chroma weave (CHROMA.md §1) — the element's color as mood, extracted once, used below.
  const chroma = elementChroma(el, cs, role)

  // Filter (S2 · G3, G9, CH1) — depth, height, directivity and color luminance share the cutoff
  const filterHz = cutoffFromDepth(depth) * brightnessTilt(rect, vh)
    * directivityFilterScale(sphere.directivity) * brightnessFromLuminance(chroma.luminance)
  reasons.filter = `depth ${depth} + vertical position + directivity + luminance → low-pass ${Math.round(filterHz)} Hz`

  // Loudness (G5, G12, S3, CH2, quiet via attribute or --sonic custom property)
  let velocityScale = recipe.baseVelocity * velocityFromSize(st) * velocityFromDepth(depth)
    * (isNaN(opacity) ? 1 : opacity) * velocityFromLuminance(chroma.luminance)
  const sonicMode = sonicVar(cs, '--sonic')
  if (isQuiet(el) || sonicMode === 'quiet') velocityScale *= 0.4
  if (sonicMode === 'off') {
    velocityScale = 0
    reasons.silenced = '--sonic: off (aural stylesheet)'
  }
  velocityScale = clamp(velocityScale, 0, 1.5)

  // The Matter weave (MATTER.md §2) — one material, many co-varying cues.
  const elongation = Math.max(rect.w, rect.h) / Math.max(1, Math.min(rect.w, rect.h))
  const matter = deriveMatter({
    roundness: round,
    sizeT: st,
    depth,
    shadowBlurPx: shadowBlur,
    opacity: isNaN(opacity) ? 1 : opacity,
    dashedBorder: cs.borderTopStyle === 'dashed' || cs.borderTopStyle === 'dotted',
    isMedia: role === 'media',
    backdropBlurPx: parseBackdropBlur(cs),
  })
  // Chroma tints the matter (CH3–CH5) — never a second instrument.
  const env0 = envelopeWeave(matter.edge, matter.mass)
  const sub0 = subShimmer(matter.mass)
  const voice: MatterVoiceParams = {
    matter,
    partials: Array.from(genPartials(matter.edge, elongation, richnessFromSaturation(chroma.saturation))),
    transient: transient(matter.edge),
    breath: breath(matter.texture),
    subShimmer: {
      interval: sub0.interval,
      level: sub0.level + (sub0.interval < 0 ? subBonusFromWarmth(chroma.warmth) : 0),
    },
    glideS: glideS(matter.edge),
    jitterCents: detuneJitterCents(matter.texture),
    envelope: { ...env0, attackS: env0.attackS * attackScaleFromWarmth(chroma.warmth) },
    filter: filterWeave(matter.edge),
    reverb: reverbWeave(matter.edge, matter.mass, matter.texture),
  }
  reasons.chroma = `warmth ${chroma.warmth.toFixed(2)} · sat ${chroma.saturation.toFixed(2)} · lum ${chroma.luminance.toFixed(2)} → ${chroma.warmth > 0.6 ? 'eager onset, full body' : chroma.warmth < 0.4 ? 'cool, unhurried onset' : 'neutral temperament'}${chroma.saturation > 0.5 ? ', vivid spectrum' : ''}`
  reasons.matter = `edge ${matter.edge.toFixed(2)} · mass ${matter.mass.toFixed(2)} · texture ${matter.texture.toFixed(2)} · air ${matter.air.toFixed(2)} → ${voice.transient.level > 0.1 ? 'clicky' : 'soft'}, ${voice.breath.level > 0.05 ? 'breathy' : 'clean'}, ${voice.subShimmer.interval < 0 ? 'chest sub' : 'sparkle +8va'}, ${voice.reverb.bloom > 0.5 ? 'blooms into the room' : 'dry strike'}`

  // Room (G13 + MATTER reverb weave + SP3 distance wetness)
  const reverbSend = clamp(
    (0.18 + sendFromShadowBlur(shadowBlur) + 0.05 * Math.min(depth, 10) * 0.5) * voice.reverb.sendScale,
    0,
    1.2,
  )

  return {
    role, rect, pan, sphere,
    midi, freqHz: midiToFreq(midi), degree,
    wave, attack, release: 0.3 * recipe.releaseScale, durationS,
    filterHz, filterQ: qFromRoundness(round),
    velocityScale, reverbSend,
    synthKind: recipe.synthKind, octaveShift: recipe.octaveShift,
    voice, chroma,
    reasons,
  }
}

/** CHROMA.md §1 — text-ish roles speak in their text color; boxes speak in their background,
 *  walking up past transparent ancestors. */
function elementChroma(el: Element, cs: CSSStyleDeclaration, role: Role): Chroma {
  if (role === 'text' || role === 'heading' || role === 'link') {
    return chromaOf(parseCssColor(cs.color))
  }
  let probe: Element | null = el
  let style: CSSStyleDeclaration | undefined = cs
  for (let hops = 0; probe && hops < 6; hops++) {
    const rgb = parseCssColor((style ?? getComputedStyle(probe)).backgroundColor)
    if (rgb && rgb.a >= 0.05) return chromaOf(rgb)
    probe = probe.parentElement
    style = undefined
  }
  return chromaOf(parseCssColor(getComputedStyle(document.documentElement).backgroundColor))
}

function parseBackdropBlur(cs: CSSStyleDeclaration): number {
  const bf = cs.backdropFilter || (cs as unknown as Record<string, string>).webkitBackdropFilter || ''
  const m = bf.match(/blur\((\d+(\.\d+)?)px\)/)
  return m ? parseFloat(m[1] as string) : 0
}

function parseShadowBlur(boxShadow: string): number {
  if (!boxShadow || boxShadow === 'none') return 0
  // blur is the 3rd length in each shadow; take the max across shadows
  let max = 0
  for (const part of boxShadow.split(/,(?![^(]*\))/)) {
    const lengths = part.match(/-?\d+(\.\d+)?px/g)
    if (lengths && lengths.length >= 3) max = Math.max(max, parseFloat(lengths[2] as string))
  }
  return max
}
