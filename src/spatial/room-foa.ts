/**
 * FoaRoom — the Spat room model in the field (SPATIAL.md §3.3): early reflections encoded at
 * mirror directions + the diffuse tail whose extent IS the envelopment factor. Imports Tone only.
 */
import * as Tone from 'tone'
import { foaGains, DEG } from './sh'
import { reflectionScaleFromViewport } from './sphere'
import { roomGain, tailExtent, tailLevel, type PerceptualFactors } from './perceptual'
import { SourceEncoder, type BusInputs } from './encoder'

const ER_BASE_TIMES = [0.013, 0.019, 0.027, 0.034]
const ER_TAP_LEVELS = [1, 0.85, 0.7, 0.6]
const ER_DIRECTIONS: Array<[number, number]> = [
  [110 * DEG, 30 * DEG],
  [-110 * DEG, 30 * DEG],
  [110 * DEG, -30 * DEG],
  [-110 * DEG, -30 * DEG],
]

export class FoaRoom {
  /** Lanes tap their direct signal here (mono sum). */
  readonly erIn: Tone.Gain
  private erMaster: Tone.Gain
  private delays: Tone.Delay[] = []
  private split: Tone.Split
  private tailL: SourceEncoder
  private tailR: SourceEncoder
  private nodes: { dispose(): void }[] = []

  constructor(bus: BusInputs, reverb: Tone.Reverb, vw: number, factors: PerceptualFactors) {
    this.erIn = new Tone.Gain(1)
    this.erMaster = new Tone.Gain(0.22 * roomGain(factors.roomPresence))
    this.erIn.connect(this.erMaster)

    const scale = reflectionScaleFromViewport(vw)
    ER_BASE_TIMES.forEach((t, i) => {
      const delay = new Tone.Delay({ delayTime: t * scale, maxDelay: 0.12 })
      const tap = new Tone.Gain(ER_TAP_LEVELS[i] as number)
      const enc = new SourceEncoder(bus)
      const [az, el] = ER_DIRECTIONS[i] as [number, number]
      enc.set(foaGains(az, el, 0.35), 1)
      this.erMaster.connect(delay)
      delay.connect(tap)
      tap.connect(enc.input)
      this.delays.push(delay)
      this.nodes.push(delay, tap, enc)
    })

    // Diffuse tail: reverb L/R become two wide sources at ±120°; their extent = envelopment.
    this.split = new Tone.Split()
    reverb.connect(this.split)
    this.tailL = new SourceEncoder(bus)
    this.tailR = new SourceEncoder(bus)
    this.split.connect(this.tailL.input, 0)
    this.split.connect(this.tailR.input, 1)
    this.applyTail(factors)
    this.nodes.push(this.erIn, this.erMaster, this.split, this.tailL, this.tailR)
  }

  private applyTail(f: PerceptualFactors): void {
    const ext = tailExtent(f.envelopment)
    const level = tailLevel(f.envelopment)
    this.tailL.set(foaGains(120 * DEG, 0, ext), level)
    this.tailR.set(foaGains(-120 * DEG, 0, ext), level)
  }

  setFactors(f: PerceptualFactors): void {
    this.erMaster.gain.rampTo(0.22 * roomGain(f.roomPresence), 0.1)
    this.applyTail(f)
  }

  setViewport(vw: number): void {
    const scale = reflectionScaleFromViewport(vw)
    this.delays.forEach((d, i) => d.delayTime.rampTo((ER_BASE_TIMES[i] as number) * scale, 0.3))
  }

  dispose(): void {
    for (const n of this.nodes) n.dispose()
    this.nodes = []
  }
}
