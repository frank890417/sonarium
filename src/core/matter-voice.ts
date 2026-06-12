/**
 * MatterVoice — the woven, modular instrument (MATTER.md §3 + MODULAR.md §2).
 * Harmonic core (custom spectrum + sub/shimmer partner + unison twin) through a wavefolder,
 * audio-rate FM cable from oscB, breath + burst noise layers, and one LFO patched from CSS
 * (vibrato / tremolo / filter wobble). Supports one-shot triggers, sustained ribbon gating,
 * and sleeping (all sources stop when idle; restart in place). Imports Tone only.
 */
import * as Tone from 'tone'
import { foldCurve } from '../math/modular'
import type { MatterVoiceParams } from '../types'

export interface MatterTrigger {
  freqHz: number
  velocity: number
  durationS: number
  releaseScaleBase: number
  voice: MatterVoiceParams
}

const FOLD_CURVE = foldCurve()

export class MatterVoice {
  /** Pool connects this to the lane filter's frequency param (LFO wobble tap). */
  readonly modFilterOut: Tone.Gain

  private oscA: Tone.Oscillator
  private oscA2: Tone.Oscillator
  private oscB: Tone.Oscillator
  private oscBGain: Tone.Gain
  private fmGain: Tone.Gain
  private foldPre: Tone.Gain
  private foldShaper: Tone.WaveShaper
  private foldWet: Tone.Gain
  private foldDry: Tone.Gain
  private unisonGain: Tone.Gain
  private breathNoise: Tone.Noise
  private breathFilter: Tone.Filter
  private breathGain: Tone.Gain
  private burstNoise: Tone.Noise
  private burstFilter: Tone.Filter
  private burstEnv: Tone.AmplitudeEnvelope
  private ampEnv: Tone.AmplitudeEnvelope
  private mix: Tone.Gain
  private lfo: Tone.LFO
  private lfoVib: Tone.Gain
  private lfoTrem: Tone.Gain
  private out: Tone.Gain
  private startedSources = false
  private held = false

  constructor() {
    this.out = new Tone.Gain(1)
    this.mix = new Tone.Gain(0.9)

    this.oscA = new Tone.Oscillator({ frequency: 220 })
    this.oscA2 = new Tone.Oscillator({ frequency: 220 })
    this.oscB = new Tone.Oscillator({ frequency: 110, type: 'sine' })
    this.oscBGain = new Tone.Gain(0.2)

    // The wavefolder (MODULAR.md M1): oscA splits dry/folded; envelope sweeps the fold.
    this.foldPre = new Tone.Gain(0.3)
    this.foldShaper = new Tone.WaveShaper(FOLD_CURVE)
    this.foldWet = new Tone.Gain(0)
    this.foldDry = new Tone.Gain(1)
    this.oscA.connect(this.foldPre)
    this.foldPre.connect(this.foldShaper)
    this.foldShaper.connect(this.foldWet)
    this.foldWet.connect(this.mix)
    this.oscA.connect(this.foldDry)
    this.foldDry.connect(this.mix)

    // Unison twin stays clean (thickness without mud).
    this.unisonGain = new Tone.Gain(0)
    this.oscA2.connect(this.unisonGain)
    this.unisonGain.connect(this.mix)

    // The FM cable (M2): oscB modulates oscA's frequency at audio rate.
    this.fmGain = new Tone.Gain(0)
    this.oscB.connect(this.fmGain)
    this.fmGain.connect(this.oscA.frequency)
    this.oscB.connect(this.oscBGain)
    this.oscBGain.connect(this.mix)

    this.breathNoise = new Tone.Noise('pink')
    this.breathFilter = new Tone.Filter({ type: 'bandpass', frequency: 600, Q: 1.1 })
    this.breathGain = new Tone.Gain(0)
    this.breathNoise.connect(this.breathFilter)
    this.breathFilter.connect(this.breathGain)
    this.breathGain.connect(this.mix)

    this.ampEnv = new Tone.AmplitudeEnvelope({ attack: 0.01, decay: 0.2, sustain: 0.25, release: 0.3 })
    this.mix.connect(this.ampEnv)
    this.ampEnv.connect(this.out)

    // The /k/ of kiki: bypasses the amp envelope so it stays a crisp onset event.
    this.burstNoise = new Tone.Noise('white')
    this.burstFilter = new Tone.Filter({ type: 'highpass', frequency: 3000 })
    this.burstEnv = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 })
    this.burstNoise.connect(this.burstFilter)
    this.burstFilter.connect(this.burstEnv)
    this.burstEnv.connect(this.out)

    // One LFO, three depth taps (M4/M5): vibrato, tremolo, filter wobble.
    this.lfo = new Tone.LFO({ frequency: 0.5, min: -1, max: 1, type: 'sine' })
    this.lfoVib = new Tone.Gain(0)
    this.lfoTrem = new Tone.Gain(0)
    this.modFilterOut = new Tone.Gain(0)
    this.lfo.connect(this.lfoVib)
    this.lfo.connect(this.lfoTrem)
    this.lfo.connect(this.modFilterOut)
    this.lfoVib.connect(this.oscA.detune)
    this.lfoVib.connect(this.oscA2.detune)
    this.lfoTrem.connect(this.mix.gain)
  }

  connect(dest: Tone.InputNode): this {
    this.out.connect(dest)
    return this
  }

  private ensureRunning(when: number): void {
    if (this.startedSources) return
    this.startedSources = true
    this.oscA.start(when)
    this.oscA2.start(when)
    this.oscB.start(when)
    this.breathNoise.start(when)
    this.burstNoise.start(when)
    this.lfo.start(when)
  }

  /** MODULAR.md §4 — idle lanes power down completely; the next trigger restarts in place. */
  sleep(): void {
    if (!this.startedSources || this.held) return
    this.startedSources = false
    try {
      this.oscA.stop()
      this.oscA2.stop()
      this.oscB.stop()
      this.breathNoise.stop()
      this.burstNoise.stop()
      this.lfo.stop()
    } catch { /* already stopped */ }
  }

  /** Everything both trigger() and gateOn() share: spectrum, patch, pitch, modulation. */
  private applyVoice(t: MatterTrigger, when: number, baseCutoffHz: number): void {
    const v = t.voice
    this.ensureRunning(when)
    this.oscA.partials = v.partials
    this.oscA2.partials = v.partials

    // Pitch behaviour: glide for round (+M6 portamento), jitter for rough texture.
    const jitter = (Math.random() * 2 - 1) * v.jitterCents
    this.oscA.detune.setValueAtTime(jitter, when)
    const glide = v.glideS + v.patch.portamentoS
    if (glide > 0.002 && !this.held) {
      this.oscA.frequency.setValueAtTime(t.freqHz * 0.917, when)
      this.oscA.frequency.rampTo(t.freqHz, glide, when)
    } else {
      this.oscA.frequency.setValueAtTime(t.freqHz, when)
    }
    this.oscA2.frequency.setValueAtTime(t.freqHz, when)
    this.oscA2.detune.setValueAtTime(jitter + v.patch.unison.detuneCents, when)
    this.unisonGain.gain.rampTo(v.patch.unison.mix, 0.02, when)
    this.oscB.frequency.setValueAtTime(t.freqHz * Math.pow(2, v.subShimmer.interval / 12), when)
    this.oscBGain.gain.rampTo(v.subShimmer.level, 0.02, when)

    // Modular patch: fold drive/mix, FM index (× carrier), LFO rate/shape/depths.
    this.foldPre.gain.rampTo(0.3 + v.patch.fold.drive * 1.2, 0.02, when)
    this.foldWet.gain.rampTo(v.patch.fold.mix, 0.02, when)
    this.foldDry.gain.rampTo(1 - v.patch.fold.mix * 0.7, 0.02, when)
    this.fmGain.gain.rampTo(v.patch.fm.index * t.freqHz, 0.02, when)
    const lfoOn = v.patch.lfo.rateHz > 0.01
    this.lfo.frequency.value = Math.max(0.01, v.patch.lfo.rateHz)
    this.lfo.type = v.patch.lfo.shape
    this.lfoVib.gain.rampTo(lfoOn ? v.patch.lfo.vibratoCents : 0, 0.05, when)
    this.lfoTrem.gain.rampTo(lfoOn ? 0.9 * v.patch.lfo.tremolo : 0, 0.05, when)
    this.modFilterOut.gain.rampTo(lfoOn ? v.patch.lfo.filterDepth * baseCutoffHz : 0, 0.05, when)

    // Breath rides the tone (common fate = fusion).
    this.breathFilter.frequency.rampTo(Math.min(8000, t.freqHz * v.breath.bpRatio), 0.02, when)
    this.breathGain.gain.rampTo(v.breath.level, 0.02, when)

    // Envelope weave.
    this.ampEnv.attack = v.envelope.attackS
    this.ampEnv.decay = v.envelope.decayS
    this.ampEnv.sustain = v.envelope.sustain
    this.ampEnv.release = 0.3 * t.releaseScaleBase * v.envelope.releaseScale
  }

  trigger(t: MatterTrigger, when: number, baseCutoffHz = 4000): void {
    this.applyVoice(t, when, baseCutoffHz)
    this.ampEnv.triggerAttackRelease(t.durationS, when, t.velocity)
    if (t.voice.transient.level > 0.02) {
      this.burstFilter.frequency.setValueAtTime(t.voice.transient.hpHz, when)
      this.burstEnv.decay = t.voice.transient.lengthS
      this.burstEnv.triggerAttackRelease(t.voice.transient.lengthS, when, t.velocity * t.voice.transient.level)
    }
  }

  // ----------------------------------------------------------- ribbon (MODULAR.md §3)

  gateOn(t: MatterTrigger, when: number, baseCutoffHz = 4000): void {
    this.applyVoice(t, when, baseCutoffHz)
    this.held = true
    this.ampEnv.sustain = Math.max(0.4, t.voice.envelope.sustain)
    this.ampEnv.triggerAttack(when, t.velocity)
  }

  /** Ribbon pitch move — quantized upstream; the portamento IS the glissando feel. */
  setFreq(freqHz: number, glideS: number, subInterval: number, fmIndex: number): void {
    const g = Math.max(0.015, glideS)
    this.oscA.frequency.rampTo(freqHz, g)
    this.oscA2.frequency.rampTo(freqHz, g)
    this.oscB.frequency.rampTo(freqHz * Math.pow(2, subInterval / 12), g)
    this.fmGain.gain.rampTo(fmIndex * freqHz, g)
  }

  gateOff(when?: number): number {
    this.held = false
    this.ampEnv.triggerRelease(when ?? Tone.now())
    return this.ampEnv.release as number
  }

  releaseTail(): number {
    return this.ampEnv.release as number
  }

  dispose(): void {
    for (const n of [
      this.oscA, this.oscA2, this.oscB, this.oscBGain, this.fmGain,
      this.foldPre, this.foldShaper, this.foldWet, this.foldDry, this.unisonGain,
      this.breathNoise, this.breathFilter, this.breathGain,
      this.burstNoise, this.burstFilter, this.burstEnv,
      this.lfo, this.lfoVib, this.lfoTrem, this.modFilterOut,
      this.ampEnv, this.mix, this.out,
    ]) n.dispose()
  }
}
