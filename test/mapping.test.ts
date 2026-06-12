import { describe, expect, it } from 'vitest'
import {
  ROOM_HALF_W, attackFromRoundness, brightnessTilt, cutoffFromDepth, degreeFromSize,
  durationFromElongation, panX, panY, qFromRoundness, reverbFromViewport, roundness,
  sendFromShadowBlur, sizeT, stepsFromSiblingIndex, velocityFromDepth, velocityFromSize,
  waveFromRoundness, zBonusFromZIndex, zFromDepth,
} from '../src/math/mapping'
import type { Rect } from '../src/types'

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })

describe('G1/G2 — position is literal space', () => {
  it('centered element sits at the center of the field', () => {
    expect(panX(rect(460, 0, 80, 40), 1000)).toBeCloseTo(0)
  })
  it('left edge → hard left, right edge → hard right', () => {
    expect(panX(rect(0, 0, 10, 10), 1000)).toBeLessThan(-ROOM_HALF_W * 0.9)
    expect(panX(rect(990, 0, 10, 10), 1000)).toBeGreaterThan(ROOM_HALF_W * 0.9)
  })
  it('screen-top = up (positive y)', () => {
    expect(panY(rect(0, 0, 10, 10), 800)).toBeGreaterThan(0)
    expect(panY(rect(0, 790, 10, 10), 800)).toBeLessThan(0)
  })
})

describe('G4/G5 — size: big = low & loud (thesis T2)', () => {
  it('sizeT grows with area, in [0,1]', () => {
    const small = sizeT(rect(0, 0, 20, 20), 1440, 900)
    const big = sizeT(rect(0, 0, 800, 600), 1440, 900)
    expect(small).toBeGreaterThanOrEqual(0)
    expect(big).toBeLessThanOrEqual(1)
    expect(big).toBeGreaterThan(small)
  })
  it('degree is inverted (big = low pitch)', () => {
    expect(degreeFromSize(0.9)).toBeLessThan(degreeFromSize(0.1))
  })
  it('degree is compressed to [0.1, 0.85] for melodic headroom', () => {
    expect(degreeFromSize(0)).toBeCloseTo(0.85)
    expect(degreeFromSize(1)).toBeCloseTo(0.1)
  })
  it('sibling runs wrap per octave', () => {
    expect(stepsFromSiblingIndex(0, 5)).toBe(0)
    expect(stepsFromSiblingIndex(4, 5)).toBe(4)
    expect(stepsFromSiblingIndex(5, 5)).toBe(0)
    expect(stepsFromSiblingIndex(12, 5)).toBe(2)
  })
  it('velocity rises with size', () => {
    expect(velocityFromSize(1)).toBeGreaterThan(velocityFromSize(0))
  })
})

describe('G6–G10 — the Kiki/Bouba ladder (thesis T1)', () => {
  it('roundness: square corner = 0, pill = 1', () => {
    expect(roundness(0, rect(0, 0, 100, 40))).toBe(0)
    expect(roundness(20, rect(0, 0, 100, 40))).toBe(1)
    expect(roundness(999, rect(0, 0, 100, 40))).toBe(1) // clamp
  })
  it('waveform ladder thresholds (MAPPING.md G7)', () => {
    expect(waveFromRoundness(0)).toBe('square')
    expect(waveFromRoundness(0.14)).toBe('square')
    expect(waveFromRoundness(0.15)).toBe('sawtooth')
    expect(waveFromRoundness(0.44)).toBe('sawtooth')
    expect(waveFromRoundness(0.45)).toBe('triangle')
    expect(waveFromRoundness(0.79)).toBe('triangle')
    expect(waveFromRoundness(0.8)).toBe('sine')
    expect(waveFromRoundness(1)).toBe('sine')
  })
  it('sharp = plosive attack, round = soft bloom', () => {
    expect(attackFromRoundness(0)).toBeCloseTo(0.002)
    expect(attackFromRoundness(1)).toBeCloseTo(0.045)
  })
  it('sharp edges resonate harder', () => {
    expect(qFromRoundness(0)).toBeGreaterThan(qFromRoundness(1))
  })
})

describe('G11 — elongation = duration (thesis T3)', () => {
  it('squares tick, long bars sweep', () => {
    expect(durationFromElongation(rect(0, 0, 50, 50))).toBeLessThan(durationFromElongation(rect(0, 0, 500, 50)))
  })
  it('clamped to [0.12, 1.6] s', () => {
    expect(durationFromElongation(rect(0, 0, 10, 10))).toBeGreaterThanOrEqual(0.12)
    expect(durationFromElongation(rect(0, 0, 100000, 1))).toBeLessThanOrEqual(1.6)
  })
})

describe('S1–S3 — depth is distance', () => {
  it('cutoff decreases monotonically with depth, floored at 700 Hz', () => {
    let prev = Infinity
    for (let d = 0; d < 30; d++) {
      const c = cutoffFromDepth(d)
      expect(c).toBeLessThanOrEqual(prev)
      expect(c).toBeGreaterThanOrEqual(700)
      prev = c
    }
  })
  it('z recedes with depth and saturates', () => {
    expect(zFromDepth(0)).toBeCloseTo(-1)
    expect(zFromDepth(5)).toBeLessThan(zFromDepth(1))
    expect(zFromDepth(50)).toBe(zFromDepth(10))
  })
  it('velocity fades with depth but never below 0.55', () => {
    expect(velocityFromDepth(0)).toBe(1)
    expect(velocityFromDepth(100)).toBe(0.55)
  })
  it('positive z-index pulls toward the listener, capped', () => {
    expect(zBonusFromZIndex(0)).toBe(0)
    expect(zBonusFromZIndex(25)).toBeCloseTo(0.4)
    expect(zBonusFromZIndex(9999)).toBeCloseTo(0.8)
  })
})

describe('S7/S8 — the viewport is the room', () => {
  it('phone = dry booth, wide desktop = hall', () => {
    const phone = reverbFromViewport(390)
    const desktop = reverbFromViewport(2560)
    expect(phone.decay).toBeLessThan(desktop.decay)
    expect(phone.wet).toBeLessThan(desktop.wet)
    expect(desktop.decay).toBeLessThanOrEqual(4.5)
    expect(phone.decay).toBeGreaterThanOrEqual(0.6)
  })
})

describe('G3/G13 — secondary cues', () => {
  it('higher on screen = brighter', () => {
    expect(brightnessTilt(rect(0, 0, 10, 10), 800)).toBeGreaterThan(brightnessTilt(rect(0, 780, 10, 10), 800))
  })
  it('shadow blur lifts into the reverb, capped at 0.5', () => {
    expect(sendFromShadowBlur(0)).toBe(0)
    expect(sendFromShadowBlur(20)).toBeCloseTo(0.5)
    expect(sendFromShadowBlur(400)).toBe(0.5)
  })
})
