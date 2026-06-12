import { describe, expect, it } from 'vitest'
import { DEG, foaGains, unitVector } from '../src/spatial/sh'
import { applyMat3, lookMatrix, rotationMatrix } from '../src/spatial/rotation'
import { CUBE_LAYOUT, decodeGains, decodeMatrix, decodedEnergy } from '../src/spatial/decoder'
import { AZ_MAX, directivityFromRoundness, extentFromSize, sphereFromRect } from '../src/spatial/sphere'
import { DEFAULT_FACTORS, directGain, resolveFactors, roomGain, tailLevel, warmthDb } from '../src/spatial/perceptual'

describe('FOA encoding — AmbiX ACN/SN3D (SPATIAL.md §1)', () => {
  it('front (az 0, el 0) → pure X', () => {
    const g = foaGains(0, 0)
    expect(g.w).toBeCloseTo(1)
    expect(g.x).toBeCloseTo(1)
    expect(g.y).toBeCloseTo(0)
    expect(g.z).toBeCloseTo(0)
  })
  it('left (az +90°) → pure +Y (AmbiX: +azimuth = left)', () => {
    const g = foaGains(90 * DEG, 0)
    expect(g.y).toBeCloseTo(1)
    expect(g.x).toBeCloseTo(0)
  })
  it('up (el +90°) → pure +Z', () => {
    const g = foaGains(0, 90 * DEG)
    expect(g.z).toBeCloseTo(1)
    expect(g.x).toBeCloseTo(0)
  })
  it('extent dissolves direction into W with energy compensation', () => {
    const point = foaGains(30 * DEG, 10 * DEG, 0)
    const wide = foaGains(30 * DEG, 10 * DEG, 1)
    expect(wide.x).toBeCloseTo(0)
    expect(wide.y).toBeCloseTo(0)
    expect(wide.z).toBeCloseTo(0)
    expect(wide.w).toBeGreaterThan(point.w)
  })
})

describe('Field rotation (SPATIAL.md §3.1)', () => {
  it('yaw +90° (CCW) takes front to the left (+y)', () => {
    const m = rotationMatrix(90 * DEG, 0)
    const [x, y, z] = applyMat3(m, [1, 0, 0])
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(1)
    expect(z).toBeCloseTo(0)
  })
  it('pitch +90° takes up to the front (right-handed about +y)', () => {
    const m = rotationMatrix(0, 90 * DEG)
    const [x, , z] = applyMat3(m, [0, 0, 1])
    expect(x).toBeCloseTo(1)
    expect(z).toBeCloseTo(0)
  })
  it('LOOK INVARIANT: looking right brings right-side sources to the front', () => {
    const src = unitVector(-40 * DEG, 0) // a source on the right
    const m = lookMatrix(40 * DEG, 0) //    look right by the same amount
    const [x, y] = applyMat3(m, src)
    expect(x).toBeCloseTo(1)
    expect(y).toBeCloseTo(0)
  })
  it('LOOK INVARIANT: looking up brings overhead sources to the front', () => {
    const src = unitVector(0, 50 * DEG)
    const m = lookMatrix(0, 50 * DEG)
    const [x, , z] = applyMat3(m, src)
    expect(x).toBeCloseTo(1)
    expect(z).toBeCloseTo(0)
  })
  it('rotation preserves vector length (orthonormality)', () => {
    const m = rotationMatrix(33 * DEG, -21 * DEG, 12 * DEG)
    const v = applyMat3(m, [0.36, -0.48, 0.8])
    expect(Math.hypot(...v)).toBeCloseTo(1)
  })
})

describe('Decoding — cube virtual speakers (SPATIAL.md §3.2)', () => {
  const rows = decodeMatrix(CUBE_LAYOUT)

  it('a source at a speaker direction peaks at that speaker', () => {
    CUBE_LAYOUT.forEach((spk, i) => {
      const az = Math.atan2(spk.dir[1], spk.dir[0])
      const el = Math.asin(spk.dir[2])
      const gains = decodeGains(rows, foaGains(az, el))
      const max = Math.max(...gains)
      expect(gains[i]).toBeCloseTo(max)
    })
  })
  it('decoded energy is direction-independent within ±1.5 dB', () => {
    const energies: number[] = []
    for (let az = -180; az < 180; az += 20)
      for (let el = -60; el <= 60; el += 30)
        energies.push(decodedEnergy(rows, az * DEG, el * DEG))
    const min = Math.min(...energies)
    const max = Math.max(...energies)
    expect(10 * Math.log10(max / min)).toBeLessThan(1.5)
  })
})

describe('Sphere mappings (SPATIAL.md §4)', () => {
  const rect = (x: number, y: number, w: number, h: number) => ({ x, y, w, h })

  it('SP1 sign: screen-right element gets NEGATIVE azimuth (AmbiX right)', () => {
    const right = sphereFromRect(rect(900, 400, 50, 50), 1000, 800)
    const left = sphereFromRect(rect(50, 400, 50, 50), 1000, 800)
    expect(right.azimuth).toBeLessThan(0)
    expect(left.azimuth).toBeGreaterThan(0)
    expect(Math.abs(left.azimuth)).toBeLessThanOrEqual(AZ_MAX + 1e-9)
  })
  it('SP2: screen-top = positive elevation', () => {
    expect(sphereFromRect(rect(500, 10, 20, 20), 1000, 800).elevation).toBeGreaterThan(0)
    expect(sphereFromRect(rect(500, 770, 20, 20), 1000, 800).elevation).toBeLessThan(0)
  })
  it('SP4: extent grows with size, bounded', () => {
    expect(extentFromSize(0)).toBeCloseTo(0.05)
    expect(extentFromSize(1)).toBeLessThanOrEqual(0.95)
    expect(extentFromSize(0.8)).toBeGreaterThan(extentFromSize(0.2))
  })
  it('SP5: kiki beams (δ=1), bouba radiates (δ=0)', () => {
    expect(directivityFromRoundness(0)).toBe(1)
    expect(directivityFromRoundness(1)).toBe(0)
  })
})

describe('Perceptual factors (SPATIAL.md §5)', () => {
  it('defaults resolve and clamp', () => {
    const f = resolveFactors({ presence: 2, warmth: -1 })
    expect(f.presence).toBe(1)
    expect(f.warmth).toBe(0)
    expect(f.envelopment).toBe(DEFAULT_FACTORS.envelopment)
  })
  it('factors are monotonic in the right direction', () => {
    expect(directGain(1)).toBeGreaterThan(directGain(0))
    expect(roomGain(1)).toBeGreaterThan(roomGain(0))
    expect(tailLevel(1)).toBeGreaterThan(tailLevel(0))
    expect(warmthDb(1)).toBeGreaterThan(warmthDb(0))
  })
})
