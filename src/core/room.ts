/**
 * L0 Acoustic Substrate — the Room: master chain (spatial input → warmth/brilliance shelves →
 * volume → limiter), viewport-sized reverb (S7/S8), ambience (I13), visibility fading (I14),
 * mute. In 'panner' mode it also owns the classic dry/wet routing; in 'ambisonic' mode the
 * AmbisonicBackend consumes `reverb` and `spatialIn` directly (SPATIAL.md §6). Imports Tone only.
 */
import * as Tone from 'tone'
import { ambienceCutoffFromViewport, reverbFromViewport } from '../math/mapping'
import { clamp } from '../math/util'
import { brillianceDb, warmthDb, type PerceptualFactors } from '../spatial/perceptual'
import type { VoiceBuses } from './voices'

export interface RoomOptions {
  volumeDb: number
  reverb: 'auto' | number
  ambient: number
  mode: 'panner' | 'ambisonic'
}

export class Room {
  /** Classic v0.1 buses — meaningful in 'panner' mode (dryIn = spatialIn, wetIn = reverb). */
  readonly buses: VoiceBuses
  /** Everything audible enters here (gets the perceptual EQ + limiter). */
  readonly spatialIn: Tone.Gain
  readonly reverb: Tone.Reverb

  private master: Tone.Volume
  private limiter: Tone.Limiter
  private lowShelf: Tone.Filter
  private highShelf: Tone.Filter
  private wetGain: Tone.Gain | null = null
  private noise: Tone.Noise | null = null
  private noiseFilter: Tone.Filter | null = null
  private noiseGain: Tone.Gain | null = null
  private rushGain: Tone.Gain | null = null
  private sparkle: Tone.Loop | null = null
  private resizeTimer: ReturnType<typeof setTimeout> | null = null
  private mutedNow = false

  constructor(private opts: RoomOptions, vw: number, factors: PerceptualFactors) {
    this.limiter = new Tone.Limiter(-1).toDestination()
    this.master = new Tone.Volume(opts.volumeDb).connect(this.limiter)
    this.highShelf = new Tone.Filter({ type: 'highshelf', frequency: 4000, gain: brillianceDb(factors.brilliance) }).connect(this.master)
    this.lowShelf = new Tone.Filter({ type: 'lowshelf', frequency: 250, gain: warmthDb(factors.warmth) }).connect(this.highShelf)
    this.spatialIn = new Tone.Gain(1).connect(this.lowShelf)

    const { decay, wet } = this.roomParams(vw)
    this.reverb = new Tone.Reverb({ decay, preDelay: 0.02, wet: 1 })
    if (opts.mode === 'panner') {
      this.wetGain = new Tone.Gain(wet).connect(this.spatialIn)
      this.reverb.connect(this.wetGain)
    }
    this.buses = { dryIn: this.spatialIn, wetIn: this.reverb }
  }

  setFactors(f: PerceptualFactors): void {
    this.lowShelf.gain.rampTo(warmthDb(f.warmth), 0.1)
    this.highShelf.gain.rampTo(brillianceDb(f.brilliance), 0.1)
  }

  private roomParams(vw: number): { decay: number; wet: number } {
    if (this.opts.reverb !== 'auto') {
      const decay = clamp(Number(this.opts.reverb) || 1.5, 0.1, 12)
      return { decay, wet: 0.25 }
    }
    return reverbFromViewport(vw)
  }

  /** Debounced: Tone.Reverb regenerates its impulse response when decay changes. */
  resize(vw: number): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer)
    this.resizeTimer = setTimeout(() => {
      const { decay, wet } = this.roomParams(vw)
      try {
        this.reverb.decay = decay
        this.wetGain?.gain.rampTo(wet, 0.3)
        this.noiseFilter?.frequency.rampTo(ambienceCutoffFromViewport(vw), 0.5)
      } catch (err) {
        console.warn('[sonarium] room resize failed', err)
      }
    }, 400)
  }

  /** I13 — room tone + sparkles. pickSparkle returns a play-thunk for a random visible element. */
  startAmbience(vw: number, level: number, pickSparkle: () => (() => void) | null): void {
    if (level <= 0) return
    this.noise = new Tone.Noise('brown')
    this.noiseFilter = new Tone.Filter({ frequency: ambienceCutoffFromViewport(vw), type: 'lowpass' })
    this.noiseGain = new Tone.Gain(Tone.dbToGain(-46) * clamp(level / 0.12, 0, 3))
    this.noise.connect(this.noiseFilter)
    this.noiseFilter.connect(this.noiseGain)
    this.noiseGain.connect(this.spatialIn)
    // Air-rush path (MATTER.md §2.2): scroll velocity swells the same room-tone noise.
    this.rushGain = new Tone.Gain(0)
    this.noiseFilter.connect(this.rushGain)
    this.rushGain.connect(this.spatialIn)
    this.noise.start()

    this.sparkle = new Tone.Loop((time) => {
      if (Math.random() > 0.4) return
      const play = pickSparkle()
      if (play) Tone.getDraw().schedule(play, time)
    }, 2)
    this.sparkle.start(1)
    Tone.getTransport().start()
  }

  /** MATTER.md §2.2 — moving through the page moves air. Swells fast, decays in ~450 ms. */
  rush(level: number): void {
    if (!this.rushGain || this.mutedNow) return
    const now = Tone.now()
    this.rushGain.gain.cancelScheduledValues(now)
    this.rushGain.gain.rampTo(level, 0.05, now)
    this.rushGain.gain.rampTo(0, 0.45, now + 0.07)
  }

  /** I14 — never sound in a background tab. */
  setHidden(hidden: boolean): void {
    if (this.mutedNow) return
    this.master.volume.rampTo(hidden ? -Infinity : this.opts.volumeDb, 0.3)
  }

  setMuted(muted: boolean): void {
    this.mutedNow = muted
    this.master.volume.rampTo(muted ? -Infinity : this.opts.volumeDb, 0.15)
  }

  dispose(): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer)
    this.sparkle?.dispose()
    this.noise?.dispose()
    this.noiseFilter?.dispose()
    this.noiseGain?.dispose()
    this.rushGain?.dispose()
    this.reverb.dispose()
    this.wetGain?.dispose()
    this.spatialIn.dispose()
    this.lowShelf.dispose()
    this.highShelf.dispose()
    this.master.dispose()
    this.limiter.dispose()
  }
}
