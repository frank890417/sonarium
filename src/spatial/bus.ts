/**
 * AmbisonicBus — the field itself (SPATIAL.md §3): W/Y/Z/X summing buses → live 3×3 rotation
 * (nine GainNodes; W invariant) → binaural decode through fixed virtual speakers, each rendered
 * by one native HRTF PannerNode. Imports Tone only.
 */
import * as Tone from 'tone'
import { CUBE_LAYOUT, decodeMatrix } from './decoder'
import { IDENTITY, type Mat3 } from './rotation'
import type { BusInputs } from './encoder'

const SPEAKER_RADIUS = 2.5

export class AmbisonicBus {
  readonly inputs: BusInputs
  private rot: Tone.Gain[][] // rot[out][in] over (X, Y, Z) = indices 0,1,2
  private outW: Tone.Gain
  private outXYZ: [Tone.Gain, Tone.Gain, Tone.Gain]
  private nodes: { dispose(): void }[] = []

  constructor(destination: Tone.InputNode, decoderKind: 'binaural' | 'stereo') {
    this.inputs = { w: new Tone.Gain(1), y: new Tone.Gain(1), z: new Tone.Gain(1), x: new Tone.Gain(1) }
    this.outW = new Tone.Gain(1)
    this.outXYZ = [new Tone.Gain(1), new Tone.Gain(1), new Tone.Gain(1)]
    this.inputs.w.connect(this.outW)

    // Rotation matrix acts on the (X, Y, Z) triple: out = R · in.
    const inXYZ = [this.inputs.x, this.inputs.y, this.inputs.z]
    this.rot = []
    for (let r = 0; r < 3; r++) {
      const row: Tone.Gain[] = []
      for (let c = 0; c < 3; c++) {
        const g = new Tone.Gain(IDENTITY[r]![c]!)
        inXYZ[c]!.connect(g)
        g.connect(this.outXYZ[r]!)
        row.push(g)
      }
      this.rot.push(row)
    }

    if (decoderKind === 'stereo') this.buildStereoDecode(destination)
    else this.buildVirtualSpeakerDecode(destination)

    this.nodes.push(this.inputs.w, this.inputs.y, this.inputs.z, this.inputs.x, this.outW, ...this.outXYZ, ...this.rot.flat())
  }

  /** SPATIAL.md §3.2 — 8 cube speakers, each a static mix of (W, X', Y', Z') into a fixed HRTF panner. */
  private buildVirtualSpeakerDecode(destination: Tone.InputNode): void {
    const rows = decodeMatrix(CUBE_LAYOUT)
    rows.forEach((row, i) => {
      const dir = CUBE_LAYOUT[i]!.dir
      const sum = new Tone.Gain(1)
      const mw = new Tone.Gain(row.w)
      const mx = new Tone.Gain(row.x)
      const my = new Tone.Gain(row.y)
      const mz = new Tone.Gain(row.z)
      this.outW.connect(mw)
      this.outXYZ[0]!.connect(mx)
      this.outXYZ[1]!.connect(my)
      this.outXYZ[2]!.connect(mz)
      mw.connect(sum)
      mx.connect(sum)
      my.connect(sum)
      mz.connect(sum)
      // AmbiX (+x fwd, +y left, +z up) → WebAudio (+x right, +y up, −z fwd).
      const panner = new Tone.Panner3D({
        panningModel: 'HRTF',
        distanceModel: 'inverse',
        refDistance: SPEAKER_RADIUS,
        rolloffFactor: 0, // fixed-radius speakers: direction only, no distance shading
        positionX: -dir[1] * SPEAKER_RADIUS,
        positionY: dir[2] * SPEAKER_RADIUS,
        positionZ: -dir[0] * SPEAKER_RADIUS,
      })
      sum.connect(panner)
      panner.connect(destination)
      this.nodes.push(sum, mw, mx, my, mz, panner)
    })
  }

  /** Fallback decode without HRTF: two virtual cardioids at ±90° (SPATIAL.md §3.2). */
  private buildStereoDecode(destination: Tone.InputNode): void {
    const L = new Tone.Gain(1)
    const R = new Tone.Gain(1)
    const wL = new Tone.Gain(0.5)
    const wR = new Tone.Gain(0.5)
    const yL = new Tone.Gain(0.5)
    const yR = new Tone.Gain(-0.5)
    this.outW.connect(wL)
    this.outW.connect(wR)
    this.outXYZ[1]!.connect(yL)
    this.outXYZ[1]!.connect(yR)
    wL.connect(L)
    yL.connect(L)
    wR.connect(R)
    yR.connect(R)
    const merge = new Tone.Merge()
    L.connect(merge, 0, 0)
    R.connect(merge, 0, 1)
    merge.connect(destination)
    this.nodes.push(L, R, wL, wR, yL, yR, merge)
  }

  /** Rotate the whole field (FieldRig calls this with lookMatrix output). Ramped, zipper-free. */
  setRotation(m: Mat3, rampS = 0.04): void {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        this.rot[r]![c]!.gain.rampTo(m[r]![c]!, rampS)
  }

  dispose(): void {
    for (const n of this.nodes) n.dispose()
    this.nodes = []
  }
}
