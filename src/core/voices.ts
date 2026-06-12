/**
 * L0 Acoustic Substrate — VoicePool (ARCHITECTURE.md §4).
 * Profiles are data; voices are rented lanes configured at trigger time. Imports Tone only;
 * never reads the DOM.
 */
import * as Tone from 'tone'
import { clamp } from '../math/util'
import type { SonicProfile, SynthKind } from '../types'

type AnySynth = Tone.Synth | Tone.FMSynth | Tone.PluckSynth | Tone.MembraneSynth | Tone.NoiseSynth

interface Lane {
  kind: SynthKind
  synth: AnySynth
  filter: Tone.Filter
  panner: Tone.Panner3D
  dry: Tone.Gain
  send: Tone.Gain
  busyUntil: number
}

export interface VoiceBuses {
  dryIn: Tone.InputNode
  wetIn: Tone.InputNode
}

export class VoicePool {
  private lanes: Lane[] = []

  constructor(
    private buses: VoiceBuses,
    private maxVoices: number,
    private panningModel: 'HRTF' | 'equalpower',
  ) {
    this.maxVoices = clamp(maxVoices, 4, 24)
  }

  private createSynth(kind: SynthKind): AnySynth {
    switch (kind) {
      case 'fm':
        return new Tone.FMSynth({ harmonicity: 3, modulationIndex: 8, envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 1.4 }, modulationEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 1 } })
      case 'pluck':
        return new Tone.PluckSynth({ attackNoise: 1, dampening: 3000, resonance: 0.92 })
      case 'membrane':
        return new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 5, envelope: { attack: 0.001, decay: 0.35, sustain: 0.01, release: 0.6 } })
      case 'noise':
        return new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 } })
      default:
        return new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.25, release: 0.3 } })
    }
  }

  private createLane(kind: SynthKind): Lane {
    const synth = this.createSynth(kind)
    const filter = new Tone.Filter({ frequency: 4000, type: 'lowpass', rolloff: -12, Q: 1 })
    const panner = new Tone.Panner3D({
      panningModel: this.panningModel,
      distanceModel: 'inverse',
      refDistance: 1,
      rolloffFactor: 0.4,
      positionX: 0, positionY: 0, positionZ: -2,
    })
    const dry = new Tone.Gain(1)
    const send = new Tone.Gain(0.18)
    synth.connect(filter)
    filter.connect(panner)
    panner.connect(dry)
    panner.connect(send)
    dry.connect(this.buses.dryIn)
    send.connect(this.buses.wetIn)
    const lane: Lane = { kind, synth, filter, panner, dry, send, busyUntil: 0 }
    this.lanes.push(lane)
    return lane
  }

  private acquire(kind: SynthKind): Lane {
    const now = Tone.now()
    let candidate: Lane | null = null
    let oldestSameKind: Lane | null = null
    let oldestAny: Lane | null = null
    for (const lane of this.lanes) {
      if (lane.kind === kind) {
        if (lane.busyUntil <= now) { candidate = lane; break }
        if (!oldestSameKind || lane.busyUntil < oldestSameKind.busyUntil) oldestSameKind = lane
      }
      if (!oldestAny || lane.busyUntil < oldestAny.busyUntil) oldestAny = lane
    }
    if (candidate) return candidate
    if (this.lanes.length < this.maxVoices) return this.createLane(kind)
    if (oldestSameKind) return oldestSameKind
    // Cap reached and no lane of this kind: recycle the globally oldest lane into this kind.
    const victim = oldestAny ?? (this.lanes[0] as Lane)
    victim.synth.dispose()
    victim.synth = this.createSynth(kind)
    victim.synth.connect(victim.filter)
    victim.kind = kind
    return victim
  }

  /** Configure a lane from the profile, then sound it. `when` lets strums schedule ahead. */
  trigger(profile: SonicProfile, velocity: number, when?: number): void {
    const raw = velocity * profile.velocityScale
    if (raw <= 0.01) return // silent roles (e.g. mono theme text) stay silent
    const t = when ?? Tone.now()
    const vel = clamp(raw, 0.03, 1)
    const lane = this.acquire(profile.synthKind)

    lane.filter.frequency.rampTo(Math.max(200, profile.filterHz), 0.02, t)
    lane.filter.Q.rampTo(profile.filterQ, 0.02, t)
    lane.panner.positionX.rampTo(profile.pan.x, 0.02, t)
    lane.panner.positionY.rampTo(profile.pan.y, 0.02, t)
    lane.panner.positionZ.rampTo(profile.pan.z, 0.02, t)
    lane.send.gain.rampTo(clamp(profile.reverbSend, 0, 1), 0.02, t)

    const dur = profile.durationS
    try {
      switch (lane.kind) {
        case 'noise': {
          ;(lane.synth as Tone.NoiseSynth).triggerAttackRelease(Math.min(dur, 0.2), t, vel)
          break
        }
        case 'pluck': {
          const pluck = lane.synth as Tone.PluckSynth
          pluck.set({ dampening: clamp(profile.filterHz, 400, 7000) })
          pluck.triggerAttackRelease(profile.freqHz, dur, t, vel)
          break
        }
        case 'membrane': {
          const mem = lane.synth as Tone.MembraneSynth
          mem.set({ envelope: { attack: Math.max(0.001, profile.attack / 4), release: profile.release } })
          mem.triggerAttackRelease(Math.max(30, profile.freqHz / 4), dur, t, vel)
          break
        }
        case 'fm': {
          const fm = lane.synth as Tone.FMSynth
          fm.set({ envelope: { attack: profile.attack, release: profile.release * 2 } })
          fm.triggerAttackRelease(profile.freqHz, dur, t, vel)
          break
        }
        default: {
          const syn = lane.synth as Tone.Synth
          syn.set({
            oscillator: { type: profile.wave },
            envelope: { attack: profile.attack, decay: 0.08, sustain: 0.25, release: profile.release },
          })
          syn.triggerAttackRelease(profile.freqHz, dur, t, vel)
        }
      }
      lane.busyUntil = t + dur + profile.release
    } catch (err) {
      console.warn('[sonarium] trigger failed', err)
    }
  }

  get activeCount(): number {
    const now = Tone.now()
    return this.lanes.filter((l) => l.busyUntil > now).length
  }

  dispose(): void {
    for (const lane of this.lanes) {
      lane.synth.dispose()
      lane.filter.dispose()
      lane.panner.dispose()
      lane.dry.dispose()
      lane.send.dispose()
    }
    this.lanes = []
  }
}
