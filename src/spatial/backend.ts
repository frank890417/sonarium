/**
 * SpatialBackend — the seam between the voice pool and the spatial engine (SPATIAL.md §6).
 * 'ambisonic' encodes every lane into the shared FOA field; 'panner' is the v0.1 per-voice
 * HRTF path, kept as option and automatic fallback. Imports Tone only.
 */
import * as Tone from 'tone'
import { clamp } from '../math/util'
import type { SonicProfile } from '../types'
import type { Room } from '../core/room'
import { AmbisonicBus } from './bus'
import { SourceEncoder } from './encoder'
import { FoaRoom } from './room-foa'
import { foaGains } from './sh'
import type { Mat3 } from './rotation'
import {
  directGain, directivityDirectGain, directivitySendScale, resolveFactors,
  roomGain, type PerceptualFactors,
} from './perceptual'

export interface LaneOutput {
  /** The lane's filter connects here. */
  input: Tone.InputNode
  /** Place the voice in space from its profile (called at trigger time). */
  setPlacement(profile: SonicProfile, when?: number): void
  dispose(): void
}

export interface SpatialBackend {
  readonly kind: 'ambisonic' | 'panner'
  createOutput(): LaneOutput
  setFactors(factors: PerceptualFactors): void
  /** Rotate the field (ambisonic) — no-op on the panner backend. */
  setRotation(m: Mat3): void
  onViewport(vw: number): void
  dispose(): void
}

// ---------------------------------------------------------------------------- ambisonic

export class AmbisonicBackend implements SpatialBackend {
  readonly kind = 'ambisonic' as const
  private bus: AmbisonicBus
  private foaRoom: FoaRoom
  private factors: PerceptualFactors

  constructor(private room: Room, decoderKind: 'binaural' | 'stereo', vw: number, factors?: Partial<PerceptualFactors>) {
    this.factors = resolveFactors(factors)
    this.bus = new AmbisonicBus(room.spatialIn, decoderKind)
    this.foaRoom = new FoaRoom(this.bus.inputs, room.reverb, vw, this.factors)
  }

  createOutput(): LaneOutput {
    const enc = new SourceEncoder(this.bus.inputs)
    const send = new Tone.Gain(0.15)
    // MATTER.md reverb weave: dark sources bloom dark — the tail is colored per voice.
    const sendColor = new Tone.Filter({ type: 'lowpass', frequency: 5000, rolloff: -12 })
    enc.input.connect(send)
    send.connect(sendColor)
    sendColor.connect(this.room.reverb)
    enc.input.connect(this.foaRoom.erIn)
    const backend = this
    return {
      input: enc.input,
      setPlacement(profile: SonicProfile, when?: number) {
        const t = when ?? Tone.now()
        const s = profile.sphere
        const w = profile.voice.reverb
        const extent = clamp(s.extent + w.extentBonus, 0, 0.95)
        const g = foaGains(s.azimuth, s.elevation, extent)
        const direct = directGain(backend.factors.presence) * directivityDirectGain(s.directivity)
        enc.set(g, direct, when)
        const wetSend = clamp(
          profile.reverbSend * directivitySendScale(s.directivity) * roomGain(backend.factors.roomPresence),
          0,
          1.5,
        )
        sendColor.frequency.rampTo(w.sendCutoffHz, 0.02, t)
        send.gain.cancelScheduledValues(t)
        if (w.bloom > 0.35) {
          // round sources swell into the room over the note; sharp ones arrive dry-then-done
          send.gain.setValueAtTime(wetSend * 0.35, t)
          send.gain.rampTo(wetSend, Math.max(0.08, profile.durationS), t)
        } else {
          send.gain.rampTo(wetSend, 0.02, t)
        }
      },
      dispose() {
        enc.dispose()
        send.dispose()
        sendColor.dispose()
      },
    }
  }

  setFactors(factors: PerceptualFactors): void {
    this.factors = factors
    this.foaRoom.setFactors(factors)
    this.room.setFactors(factors)
  }

  setRotation(m: Mat3): void {
    this.bus.setRotation(m)
  }

  onViewport(vw: number): void {
    this.foaRoom.setViewport(vw)
  }

  dispose(): void {
    this.foaRoom.dispose()
    this.bus.dispose()
  }
}

// ---------------------------------------------------------------------------- panner (v0.1)

export class PannerBackend implements SpatialBackend {
  readonly kind = 'panner' as const

  constructor(private room: Room, private panningModel: 'HRTF' | 'equalpower') {}

  createOutput(): LaneOutput {
    const panner = new Tone.Panner3D({
      panningModel: this.panningModel,
      distanceModel: 'inverse',
      refDistance: 1,
      rolloffFactor: 0.4,
      positionX: 0, positionY: 0, positionZ: -2,
    })
    const dry = new Tone.Gain(1)
    const send = new Tone.Gain(0.18)
    const sendColor = new Tone.Filter({ type: 'lowpass', frequency: 5000, rolloff: -12 })
    panner.connect(dry)
    panner.connect(send)
    send.connect(sendColor)
    dry.connect(this.room.buses.dryIn)
    sendColor.connect(this.room.buses.wetIn)
    return {
      input: panner,
      setPlacement(profile: SonicProfile, when?: number) {
        const t = when ?? Tone.now()
        panner.positionX.rampTo(profile.pan.x, 0.02, t)
        panner.positionY.rampTo(profile.pan.y, 0.02, t)
        panner.positionZ.rampTo(profile.pan.z, 0.02, t)
        sendColor.frequency.rampTo(profile.voice.reverb.sendCutoffHz, 0.02, t)
        send.gain.rampTo(clamp(profile.reverbSend, 0, 1), 0.02, t)
      },
      dispose() {
        panner.dispose()
        dry.dispose()
        send.dispose()
        sendColor.dispose()
      },
    }
  }

  setFactors(factors: PerceptualFactors): void {
    this.room.setFactors(factors)
  }

  setRotation(): void { /* the panner world rotates via Tone.Listener (ListenerRig) */ }

  onViewport(): void { /* room resize handled by Room */ }

  dispose(): void { /* lane outputs disposed by the pool */ }
}
