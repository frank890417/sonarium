import { describe, expect, it } from 'vitest'
import {
  foldCurve, foldFromBorder, fmIndex, lfoFromCss, massBonusFromFontWeight,
  patchFrom, portamentoFromTransition, ribbonSteps, unisonFromMass,
} from '../src/math/modular'
import { parseKey, stepInScale } from '../src/math/scales'
import { deriveMatter } from '../src/math/matter'

describe('M1 — the wavefolder (border drives saturation)', () => {
  it('no border → no fold; heavy sharp border → hot fold', () => {
    expect(foldFromBorder(0, 1).mix).toBe(0)
    const hot = foldFromBorder(6, 1)
    expect(hot.drive).toBeCloseTo(1)
    expect(hot.mix).toBeGreaterThan(0.7)
  })
  it('round elements fold less at equal border', () => {
    expect(foldFromBorder(4, 0).drive).toBeLessThan(foldFromBorder(4, 1).drive)
  })
  it('the curve actually folds: hot input wraps back down', () => {
    const c = foldCurve(2049)
    const at = (x: number) => c[Math.round(((x + 1) / 2) * 2048)] as number
    expect(Math.abs(at(0))).toBeLessThan(0.01)
    expect(at(0.4)).toBeGreaterThan(0.9 * Math.sin(2.5 * (Math.PI / 2) * 0.4) - 0.05)
    expect(at(1)).toBeLessThan(at(0.4)) // folding, not clipping
    expect(at(-1)).toBeCloseTo(-(at(1) as number), 2) // odd symmetry
    for (const y of c) expect(Math.abs(y)).toBeLessThanOrEqual(1)
  })
})

describe('M2/M3 — FM and unison', () => {
  it('FM rings only for rough sharp matter', () => {
    expect(fmIndex(0, 1)).toBe(0)
    expect(fmIndex(1, 0)).toBe(0)
    expect(fmIndex(1, 1)).toBeCloseTo(1.5)
  })
  it('unison thickens past the mass threshold', () => {
    expect(unisonFromMass(0.2).mix).toBe(0)
    expect(unisonFromMass(0.9).mix).toBeCloseTo(0.4)
    expect(unisonFromMass(0.9).detuneCents).toBeGreaterThan(unisonFromMass(0.5).detuneCents)
  })
})

describe('M4/M5/M6 — the LFO patch bay and portamento', () => {
  it('a CSS animation owns the LFO at one cycle per animation cycle', () => {
    const l = lfoFromCss(2, 'solid')
    expect(l.rateHz).toBeCloseTo(0.5)
    expect(l.shape).toBe('sine')
    expect(l.vibratoCents).toBeGreaterThan(0)
  })
  it('dashed borders chop square; dotted chops faster', () => {
    expect(lfoFromCss(0, 'dashed').shape).toBe('square')
    expect(lfoFromCss(0, 'dotted').rateHz).toBeGreaterThan(lfoFromCss(0, 'dashed').rateHz)
  })
  it('silence is a valid patch', () => {
    expect(lfoFromCss(0, 'solid').rateHz).toBe(0)
    expect(lfoFromCss(0, 'none').tremolo).toBe(0)
  })
  it('LFO rate clamps to a musical range', () => {
    expect(lfoFromCss(0.01, 'solid').rateHz).toBeLessThanOrEqual(8)
    expect(lfoFromCss(60, 'solid').rateHz).toBeGreaterThanOrEqual(0.08)
  })
  it('transitions ease pitch, capped', () => {
    expect(portamentoFromTransition(0)).toBe(0)
    expect(portamentoFromTransition(0.3)).toBeCloseTo(0.15)
    expect(portamentoFromTransition(10)).toBe(0.25)
  })
})

describe('M7 — typography enters the weave', () => {
  it('bold carries weight; light carries none', () => {
    expect(massBonusFromFontWeight(400)).toBe(0)
    expect(massBonusFromFontWeight(700)).toBeCloseTo(0.12)
    expect(massBonusFromFontWeight(300)).toBe(0)
  })
  it('flows into deriveMatter mass', () => {
    const base = { roundness: 0.5, sizeT: 0.3, depth: 2, shadowBlurPx: 0, opacity: 1, dashedBorder: false, isMedia: false, backdropBlurPx: 0 }
    expect(deriveMatter({ ...base, massBonus: 0.12 }).mass).toBeCloseTo(0.42)
  })
})

describe('the ribbon (MODULAR.md §3)', () => {
  it('quantizes travel to whole scale steps, ±1 octave', () => {
    expect(ribbonSteps(0, 1000, 5)).toBe(0)
    expect(ribbonSteps(600, 1000, 5)).toBe(5)
    expect(ribbonSteps(-600, 1000, 5)).toBe(-5)
    expect(Number.isInteger(ribbonSteps(123, 1000, 7))).toBe(true)
  })
  it('stepInScale walks the key pitch classes only', () => {
    const key = parseKey('C pentMajor')!
    const pcs = key.scale.map((s) => (s + key.root) % 12)
    let m = 60
    for (const steps of [1, 2, 5, -1, -5, 3]) {
      m = stepInScale(60, key, steps)
      expect(pcs).toContain(((m % 12) + 12) % 12)
    }
    expect(stepInScale(60, key, 5)).toBe(72) // a full pentatonic lap = one octave
    expect(stepInScale(60, key, -5)).toBe(48)
    expect(stepInScale(60, key, 0)).toBe(60)
  })
})

describe('patchFrom — the full patch is coherent', () => {
  it('a plain element gets an idle patch; a heavy animated bordered one lights up', () => {
    const matter = { edge: 0.8, mass: 0.6, texture: 0.5 }
    const plain = patchFrom(matter, { animationS: 0, borderStyle: 'none', borderWidthPx: 0, transitionS: 0 })
    expect(plain.fold.mix).toBe(0)
    expect(plain.lfo.rateHz).toBe(0)
    const alive = patchFrom(matter, { animationS: 1.5, borderStyle: 'dashed', borderWidthPx: 5, transitionS: 0.2 })
    expect(alive.fold.mix).toBeGreaterThan(0.4)
    expect(alive.lfo.rateHz).toBeCloseTo(1 / 1.5)
    expect(alive.lfo.shape).toBe('square')
    expect(alive.fm.index).toBeGreaterThan(0)
    expect(alive.unison.mix).toBeGreaterThan(0)
    expect(alive.portamentoS).toBeCloseTo(0.1)
  })
})
