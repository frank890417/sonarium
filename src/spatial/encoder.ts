/**
 * SourceEncoder — one per voice lane: four GainNodes carrying the lane's mono signal into the
 * W/Y/Z/X buses with first-order SH gains (SPATIAL.md §2). Imports Tone only.
 */
import * as Tone from 'tone'
import type { FoaGains } from './sh'

export interface BusInputs {
  w: Tone.Gain
  y: Tone.Gain
  z: Tone.Gain
  x: Tone.Gain
}

export class SourceEncoder {
  readonly input: Tone.Gain
  private gw: Tone.Gain
  private gy: Tone.Gain
  private gz: Tone.Gain
  private gx: Tone.Gain

  constructor(bus: BusInputs) {
    this.input = new Tone.Gain(1)
    this.gw = new Tone.Gain(1)
    this.gy = new Tone.Gain(0)
    this.gz = new Tone.Gain(0)
    this.gx = new Tone.Gain(1)
    this.input.connect(this.gw)
    this.input.connect(this.gy)
    this.input.connect(this.gz)
    this.input.connect(this.gx)
    this.gw.connect(bus.w)
    this.gy.connect(bus.y)
    this.gz.connect(bus.z)
    this.gx.connect(bus.x)
  }

  /** Apply SH gains × an overall direct-path gain, ramped to avoid zipper noise. */
  set(g: FoaGains, directGain: number, when?: number, rampS = 0.015): void {
    const t = when ?? Tone.now()
    this.gw.gain.rampTo(g.w * directGain, rampS, t)
    this.gy.gain.rampTo(g.y * directGain, rampS, t)
    this.gz.gain.rampTo(g.z * directGain, rampS, t)
    this.gx.gain.rampTo(g.x * directGain, rampS, t)
  }

  dispose(): void {
    this.input.dispose()
    this.gw.dispose()
    this.gy.dispose()
    this.gz.dispose()
    this.gx.dispose()
  }
}
