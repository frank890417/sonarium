/**
 * MatterVoice — the woven instrument (MATTER.md §3). One voice = harmonic core (custom
 * per-trigger spectrum + sub/shimmer partner) + breath layer (texture) + transient burst
 * (edge), all gated by woven envelopes. Imports Tone only.
 */
import * as Tone from 'tone'
import type { MatterVoiceParams } from '../types'

export interface MatterTrigger {
  freqHz: number
  velocity: number
  durationS: number
  releaseScaleBase: number
  voice: MatterVoiceParams
}

export class MatterVoice {
  private oscA: Tone.Oscillator
  private oscB: Tone.Oscillator
  private oscBGain: Tone.Gain
  private breathNoise: Tone.Noise
  private breathFilter: Tone.Filter
  private breathGain: Tone.Gain
  private burstNoise: Tone.Noise
  private burstFilter: Tone.Filter
  private burstEnv: Tone.AmplitudeEnvelope
  private ampEnv: Tone.AmplitudeEnvelope
  private out: Tone.Gain
  private startedSources = false

  constructor() {
    this.out = new Tone.Gain(1)
    const mix = new Tone.Gain(0.9)

    this.oscA = new Tone.Oscillator({ frequency: 220 })
    this.oscB = new Tone.Oscillator({ frequency: 110, type: 'sine' })
    this.oscBGain = new Tone.Gain(0.2)
    this.oscA.connect(mix)
    this.oscB.connect(this.oscBGain)
    this.oscBGain.connect(mix)

    this.breathNoise = new Tone.Noise('pink')
    this.breathFilter = new Tone.Filter({ type: 'bandpass', frequency: 600, Q: 1.1 })
    this.breathGain = new Tone.Gain(0)
    this.breathNoise.connect(this.breathFilter)
    this.breathFilter.connect(this.breathGain)
    this.breathGain.connect(mix)

    this.ampEnv = new Tone.AmplitudeEnvelope({ attack: 0.01, decay: 0.2, sustain: 0.25, release: 0.3 })
    mix.connect(this.ampEnv)
    this.ampEnv.connect(this.out)

    // The /k/ of kiki: bypasses the amp envelope so it stays a crisp onset event.
    this.burstNoise = new Tone.Noise('white')
    this.burstFilter = new Tone.Filter({ type: 'highpass', frequency: 3000 })
    this.burstEnv = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 })
    this.burstNoise.connect(this.burstFilter)
    this.burstFilter.connect(this.burstEnv)
    this.burstEnv.connect(this.out)
  }

  connect(dest: Tone.InputNode): this {
    this.out.connect(dest)
    return this
  }

  trigger(t: MatterTrigger, when: number): void {
    const v = t.voice
    if (!this.startedSources) {
      this.startedSources = true
      this.oscA.start(when)
      this.oscB.start(when)
      this.breathNoise.start(when)
      this.burstNoise.start(when)
    }

    // Spectrum — synthesized for THIS element (the continuous kiki↔bouba ladder).
    this.oscA.partials = v.partials

    // Pitch behaviour: glide for round (bouba swoop), jitter for rough texture.
    const jitter = (Math.random() * 2 - 1) * v.jitterCents
    this.oscA.detune.setValueAtTime(jitter, when)
    if (v.glideS > 0.002) {
      this.oscA.frequency.setValueAtTime(t.freqHz * 0.917, when) // −1.5 semitones in
      this.oscA.frequency.rampTo(t.freqHz, v.glideS, when)
    } else {
      this.oscA.frequency.setValueAtTime(t.freqHz, when)
    }
    this.oscB.frequency.setValueAtTime(t.freqHz * Math.pow(2, v.subShimmer.interval / 12), when)
    this.oscBGain.gain.rampTo(v.subShimmer.level, 0.02, when)

    // Breath rides the tone (common fate = fusion).
    this.breathFilter.frequency.rampTo(Math.min(8000, t.freqHz * v.breath.bpRatio), 0.02, when)
    this.breathGain.gain.rampTo(v.breath.level, 0.02, when)

    // Envelope weave.
    this.ampEnv.attack = v.envelope.attackS
    this.ampEnv.decay = v.envelope.decayS
    this.ampEnv.sustain = v.envelope.sustain
    this.ampEnv.release = 0.3 * t.releaseScaleBase * v.envelope.releaseScale
    this.ampEnv.triggerAttackRelease(t.durationS, when, t.velocity)

    // The onset consonant.
    if (v.transient.level > 0.02) {
      this.burstFilter.frequency.setValueAtTime(v.transient.hpHz, when)
      this.burstEnv.decay = v.transient.lengthS
      this.burstEnv.triggerAttackRelease(v.transient.lengthS, when, t.velocity * v.transient.level)
    }
  }

  releaseTail(): number {
    return this.ampEnv.release as number
  }

  dispose(): void {
    for (const n of [
      this.oscA, this.oscB, this.oscBGain, this.breathNoise, this.breathFilter, this.breathGain,
      this.burstNoise, this.burstFilter, this.burstEnv, this.ampEnv, this.out,
    ]) n.dispose()
  }
}
