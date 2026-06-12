import { describe, expect, it } from 'vitest'
import {
  PARTIAL_COUNT, airRushGain, breath, deriveMatter, detuneJitterCents, envelopeWeave,
  filterWeave, genPartials, glideS, reverbWeave, subShimmer, transient,
} from '../src/math/matter'

const visuals = (over: Partial<Parameters<typeof deriveMatter>[0]> = {}) => ({
  roundness: 0.5, sizeT: 0.3, depth: 4, shadowBlurPx: 0, opacity: 1,
  dashedBorder: false, isMedia: false, backdropBlurPx: 0, ...over,
})

describe('deriveMatter (MATTER.md §1)', () => {
  it('edge inverts roundness; all dims clamped to [0,1]', () => {
    expect(deriveMatter(visuals({ roundness: 0 })).edge).toBe(1)
    expect(deriveMatter(visuals({ roundness: 1 })).edge).toBe(0)
    const m = deriveMatter(visuals({ shadowBlurPx: 999, opacity: 0, isMedia: true, dashedBorder: true, backdropBlurPx: 999 }))
    expect(m.texture).toBe(1)
  })
  it('texture accumulates from soft shadows, translucency, dashed borders, media', () => {
    expect(deriveMatter(visuals()).texture).toBe(0)
    expect(deriveMatter(visuals({ opacity: 0.5 })).texture).toBeCloseTo(0.3)
    expect(deriveMatter(visuals({ shadowBlurPx: 12 })).texture).toBeCloseTo(0.3)
    expect(deriveMatter(visuals({ shadowBlurPx: 999 })).texture).toBeCloseTo(0.4) // capped
    expect(deriveMatter(visuals({ dashedBorder: true })).texture).toBeCloseTo(0.15)
  })
  it('air saturates at depth 10', () => {
    expect(deriveMatter(visuals({ depth: 0 })).air).toBe(0)
    expect(deriveMatter(visuals({ depth: 25 })).air).toBe(1)
  })
})

describe('genPartials — the continuous spectrum (MATTER.md §2.1)', () => {
  it('is energy-normalized across the whole continuum (equal loudness)', () => {
    for (const edge of [0, 0.3, 0.7, 1])
      for (const e of [1, 2.5, 6]) {
        const a = genPartials(edge, e)
        const energy = Array.from(a).reduce((s, x) => s + x * x, 0)
        expect(energy).toBeCloseTo(1, 5)
      }
  })
  it('edge brightens: high edge puts more relative energy in upper partials', () => {
    const sharp = genPartials(1, 1)
    const round = genPartials(0, 1)
    const upper = (a: Float32Array) => Array.from(a).slice(8).reduce((s, x) => s + x * x, 0)
    expect(upper(sharp)).toBeGreaterThan(upper(round) * 5)
  })
  it('round is fundamental-dominant', () => {
    const a = genPartials(0, 1)
    expect((a[0] as number) ** 2).toBeGreaterThan(0.9)
  })
  it('elongation hollows: even harmonics collapse for pipes', () => {
    const square = genPartials(0.8, 1)
    const pipe = genPartials(0.8, 6)
    const evenRatio = (a: Float32Array) => (a[1] as number) / (a[0] as number)
    expect(evenRatio(pipe)).toBeLessThan(evenRatio(square) * 0.2)
  })
  it('always 24 partials, all finite & non-negative', () => {
    const a = genPartials(0.5, 3)
    expect(a.length).toBe(PARTIAL_COUNT)
    for (const x of a) {
      expect(Number.isFinite(x)).toBe(true)
      expect(x).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('the weave is coherent — one dimension moves many cues in the right direction', () => {
  it('EDGE↑ ⇒ attack↓ ∧ burst↑ ∧ Q↑ ∧ bite↑ ∧ send↓ ∧ brighter tail ∧ no glide', () => {
    const lo = { env: envelopeWeave(0, 0.3), tr: transient(0), fl: filterWeave(0), rv: reverbWeave(0, 0.3, 0), gl: glideS(0) }
    const hi = { env: envelopeWeave(1, 0.3), tr: transient(1), fl: filterWeave(1), rv: reverbWeave(1, 0.3, 0), gl: glideS(1) }
    expect(hi.env.attackS).toBeLessThan(lo.env.attackS)
    expect(hi.tr.level).toBeGreaterThan(lo.tr.level)
    expect(lo.tr.level).toBe(0)
    expect(hi.fl.q).toBeGreaterThan(lo.fl.q)
    expect(hi.fl.biteAmount).toBeGreaterThan(lo.fl.biteAmount)
    expect(hi.rv.sendScale).toBeLessThan(lo.rv.sendScale)
    expect(hi.rv.sendCutoffHz).toBeGreaterThan(lo.rv.sendCutoffHz)
    expect(hi.rv.bloom).toBeLessThan(lo.rv.bloom)
    expect(hi.gl).toBe(0)
    expect(lo.gl).toBeGreaterThan(0.02)
  })
  it('MASS↑ ⇒ chest sub ∧ slower attack ∧ longer release ∧ wetter', () => {
    const tiny = subShimmer(0.05)
    const big = subShimmer(0.95)
    expect(tiny.interval).toBe(12)
    expect(big.interval).toBe(-12)
    expect(big.level).toBeGreaterThan(0.2)
    expect(envelopeWeave(0.5, 1).attackS).toBeGreaterThan(envelopeWeave(0.5, 0).attackS)
    expect(envelopeWeave(0.5, 1).releaseScale).toBeGreaterThan(1)
    expect(reverbWeave(0.5, 1, 0).sendScale).toBeGreaterThan(reverbWeave(0.5, 0, 0).sendScale)
  })
  it('TEXTURE↑ ⇒ breath↑ ∧ jitter↑ ∧ spatial extent bonus↑', () => {
    expect(breath(1).level).toBeGreaterThan(breath(0).level)
    expect(breath(0).level).toBe(0)
    expect(detuneJitterCents(1)).toBe(6)
    expect(reverbWeave(0.5, 0.5, 1).extentBonus).toBeCloseTo(0.15)
  })
  it('breath band sits above the fundamental and descends as texture thickens', () => {
    expect(breath(0.1).bpRatio).toBeGreaterThan(breath(0.9).bpRatio)
    expect(breath(1).bpRatio).toBeGreaterThanOrEqual(1.2)
  })
})

describe('air rush (I8)', () => {
  it('grows with scroll velocity and caps', () => {
    expect(airRushGain(0)).toBe(0)
    expect(airRushGain(1)).toBeCloseTo(0.06)
    expect(airRushGain(100)).toBe(0.18)
  })
})
