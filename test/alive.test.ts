import { describe, expect, it } from 'vitest'
import {
  attackScaleFromWarmth, brightnessFromLuminance, chromaOf, modeFromPalette, pagePalette,
  parseCssColor, rgbToHsl, richnessFromSaturation, roomToneScaleFromWarmth, subBonusFromWarmth,
  tempoScaleFromWarmth, velocityFromLuminance, warmthFromHue,
} from '../src/math/chroma'
import {
  decayCount, duckFactor, echoGridS, nextGridOffset, phraseWindow, readingOrderKey,
  secondsPerBeat, strumStepS, tempoFromPage,
} from '../src/math/pulse'
import { genPartials } from '../src/math/matter'

describe('color parsing (CHROMA.md §1)', () => {
  it('parses rgb()/rgba() computed styles', () => {
    expect(parseCssColor('rgb(255, 0, 0)')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    expect(parseCssColor('rgba(0, 0, 0, 0)')!.a).toBe(0)
    expect(parseCssColor('rgba(128, 64, 32, 0.5)')!.a).toBe(0.5)
    expect(parseCssColor('transparent')).toBeNull()
    expect(parseCssColor('color(srgb 1 0 0)')).toBeNull()
  })
  it('rgb→hsl basics', () => {
    expect(rgbToHsl({ r: 1, g: 0, b: 0, a: 1 }).h).toBeCloseTo(0)
    expect(rgbToHsl({ r: 0, g: 0, b: 1, a: 1 }).h).toBeCloseTo(240)
    expect(rgbToHsl({ r: 0.5, g: 0.5, b: 0.5, a: 1 }).s).toBe(0)
  })
  it('warmth poles: orange warm, blue cool, grey neutral', () => {
    expect(warmthFromHue(30, 1)).toBeCloseTo(1)
    expect(warmthFromHue(210, 1)).toBeCloseTo(0)
    expect(warmthFromHue(30, 0)).toBeCloseTo(0.5) // desaturated regresses to neutral
    expect(chromaOf(parseCssColor('rgba(0,0,0,0)')).warmth).toBe(0.5)
  })
})

describe('chroma element weave is monotonic in the right direction (CH1–CH5)', () => {
  it('dark sounds dark, bright lifts', () => {
    expect(brightnessFromLuminance(0)).toBeLessThan(brightnessFromLuminance(1))
    expect(velocityFromLuminance(0)).toBeLessThan(velocityFromLuminance(1))
  })
  it('warm = quicker onset + fuller sub (thesis T5)', () => {
    expect(attackScaleFromWarmth(1)).toBeLessThan(attackScaleFromWarmth(0))
    expect(subBonusFromWarmth(1)).toBeCloseTo(0.08)
  })
  it('saturation enriches the spectrum through genPartials', () => {
    const plain = genPartials(0.5, 1, 0)
    const vivid = genPartials(0.5, 1, richnessFromSaturation(1))
    const upper = (a: Float32Array) => Array.from(a).slice(6).reduce((s, x) => s + x * x, 0)
    expect(upper(vivid)).toBeGreaterThan(upper(plain))
  })
})

describe('palette → mode (CH6) — design becomes tonality, identity keeps the root', () => {
  const pal = (warmth: number, luminance: number) => ({ warmth, saturation: 0.6, luminance })
  it('the four quadrants and the neutral fallback', () => {
    expect(modeFromPalette(pal(0.8, 0.7))).toBe('lydian')
    expect(modeFromPalette(pal(0.8, 0.2))).toBe('mixolydian')
    expect(modeFromPalette(pal(0.2, 0.7))).toBe('dorian')
    expect(modeFromPalette(pal(0.2, 0.2))).toBe('pentMinor')
    expect(modeFromPalette(pal(0.5, 0.5))).toBeNull()
  })
  it('page palette weighs bg 0.7 / text 0.3', () => {
    const p = pagePalette(pal(1, 1), pal(0, 0))
    expect(p.warmth).toBeCloseTo(0.7)
    expect(p.luminance).toBeCloseTo(0.7)
  })
  it('room tone + tempo scales are monotonic in warmth', () => {
    expect(roomToneScaleFromWarmth(1)).toBeGreaterThan(roomToneScaleFromWarmth(0))
    expect(tempoScaleFromWarmth(1)).toBeGreaterThan(tempoScaleFromWarmth(0))
  })
})

describe('the pulse (PULSE.md)', () => {
  it('P1/P2: sparse pages breathe, dense pages tick, clamped [56,116]', () => {
    const sparse = tempoFromPage(10, 1)
    const dense = tempoFromPage(200, 1)
    expect(sparse).toBeLessThan(dense)
    expect(tempoFromPage(0, 0.5)).toBeGreaterThanOrEqual(56)
    expect(tempoFromPage(10000, 2)).toBeLessThanOrEqual(116)
    expect(tempoFromPage(60, tempoScaleFromWarmth(1))).toBeGreaterThan(tempoFromPage(60, tempoScaleFromWarmth(0)))
  })
  it('grid offsets land on boundaries and respect the minimum lead', () => {
    expect(nextGridOffset(0.1, 0.5, 0.08)).toBeCloseTo(0.4)
    expect(nextGridOffset(0.45, 0.5, 0.08)).toBeCloseTo(0.55) // 0.05 away is too soon → next
    expect(nextGridOffset(7.3, 0.25, 0.08)).toBeCloseTo(0.2)
    // never negative, always ≥ minAhead
    for (let phase = 0; phase < 2; phase += 0.13) {
      const off = nextGridOffset(phase, 0.33, 0.08)
      expect(off).toBeGreaterThanOrEqual(0.08)
      expect(off).toBeLessThanOrEqual(0.33 + 0.08 + 1e-9)
    }
  })
  it('strums step in 32nds; echoes ride 8ths', () => {
    expect(strumStepS(120)).toBeCloseTo(0.0625)
    expect(echoGridS(120)).toBeCloseTo(0.25)
    expect(secondsPerBeat(60)).toBe(1)
  })
  it('calm system: repeats recede to 40%, silence forgives (P5)', () => {
    let count = 0
    for (let i = 0; i < 8; i++) count = decayCount(count, 100) + 1
    expect(duckFactor(count)).toBeLessThan(0.5)
    expect(duckFactor(count)).toBeGreaterThanOrEqual(0.4)
    count = decayCount(count, 20000) // ~20 s of leaving it alone
    expect(count).toBe(0)
    expect(duckFactor(count)).toBe(1)
  })
  it('phrases read in rows then columns; the window follows scroll', () => {
    expect(readingOrderKey(10, 500)).toBeLessThan(readingOrderKey(200, 0))
    expect(readingOrderKey(10, 100)).toBeLessThan(readingOrderKey(15, 200))
    expect(phraseWindow(50, 4, 0)).toBe(0)
    expect(phraseWindow(50, 4, 1)).toBe(46)
    expect(phraseWindow(3, 4, 0.7)).toBe(0)
  })
})
