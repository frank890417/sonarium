import { describe, expect, it } from 'vitest'
import { BASE_MIDI, OCTAVES, SCALES, degreeToMidi, midiToFreq, midiToNoteName, parseKey, siteKey } from '../src/math/scales'

describe('siteKey — deterministic per-domain identity (MAPPING.md S9)', () => {
  it('is stable across calls', () => {
    const a = siteKey('example.com')
    const b = siteKey('example.com')
    expect(a).toEqual(b)
  })
  it('different hosts usually get different keys', () => {
    const keys = ['github.com', 'cheyuwu.com', 'example.com', 'wikipedia.org'].map((h) => siteKey(h).label)
    expect(new Set(keys).size).toBeGreaterThan(1)
  })
  it('always yields a valid root and a known scale', () => {
    for (const host of ['a.com', 'b.io', 'long.subdomain.example.co.uk', '']) {
      const k = siteKey(host)
      expect(k.root).toBeGreaterThanOrEqual(0)
      expect(k.root).toBeLessThan(12)
      expect(SCALES[k.scaleName]).toBeDefined()
    }
  })
})

describe('parseKey', () => {
  it('parses "D dorian"', () => {
    const k = parseKey('D dorian')
    expect(k).not.toBeNull()
    expect(k!.root).toBe(2)
    expect(k!.scaleName).toBe('dorian')
  })
  it('parses flats: "Eb pentMinor"', () => {
    expect(parseKey('Eb pentMinor')!.root).toBe(3)
  })
  it('rejects junk', () => {
    expect(parseKey('purple monkey')).toBeNull()
    expect(parseKey('H major')).toBeNull()
  })
})

describe('degreeToMidi — the Musical Quantizer (Invariant #2)', () => {
  const key = parseKey('C pentMajor')!

  it('stays inside the 3-octave space', () => {
    for (let d = 0; d <= 1.0001; d += 0.05) {
      const m = degreeToMidi(d, key)
      expect(m).toBeGreaterThanOrEqual(BASE_MIDI)
      expect(m).toBeLessThan(BASE_MIDI + OCTAVES * 12 + 12)
    }
  })
  it('every output is in the scale', () => {
    for (let d = 0; d <= 1; d += 0.01) {
      const pc = (degreeToMidi(d, key) - key.root) % 12
      expect(key.scale).toContain(pc)
    }
  })
  it('is monotonic in degree', () => {
    let prev = -Infinity
    for (let d = 0; d <= 1; d += 0.02) {
      const m = degreeToMidi(d, key)
      expect(m).toBeGreaterThanOrEqual(prev)
      prev = m
    }
  })
  it('clamps step offsets at the boundaries instead of escaping the space', () => {
    expect(degreeToMidi(1, key, 99)).toBe(degreeToMidi(1, key, 0))
    expect(degreeToMidi(0, key, -99)).toBe(degreeToMidi(0, key, 0))
  })
})

describe('midi helpers', () => {
  it('A4 = 440', () => {
    expect(midiToFreq(69)).toBeCloseTo(440)
  })
  it('names notes', () => {
    expect(midiToNoteName(60)).toBe('C4')
    expect(midiToNoteName(69)).toBe('A4')
  })
})
