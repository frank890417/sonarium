/**
 * L0 Acoustic Substrate — the Room: master bus, viewport-sized reverb (S7/S8),
 * ambience (I13), visibility fading (I14), mute. Imports Tone only.
 */
import * as Tone from 'tone'
import { ambienceCutoffFromViewport, reverbFromViewport } from '../math/mapping'
import { clamp } from '../math/util'
import type { VoiceBuses } from './voices'

export interface RoomOptions {
  volumeDb: number
  reverb: 'auto' | number
  ambient: number
}

export class Room {
  readonly buses: VoiceBuses
  private master: Tone.Volume
  private limiter: Tone.Limiter
  private reverb: Tone.Reverb
  private wetGain: Tone.Gain
  private noise: Tone.Noise | null = null
  private noiseFilter: Tone.Filter | null = null
  private noiseGain: Tone.Gain | null = null
  private sparkle: Tone.Loop | null = null
  private resizeTimer: ReturnType<typeof setTimeout> | null = null
  private mutedNow = false

  constructor(private opts: RoomOptions, vw: number) {
    this.limiter = new Tone.Limiter(-1).toDestination()
    this.master = new Tone.Volume(opts.volumeDb).connect(this.limiter)

    const { decay, wet } = this.roomParams(vw)
    this.reverb = new Tone.Reverb({ decay, preDelay: 0.02, wet: 1 })
    this.wetGain = new Tone.Gain(wet).connect(this.master)
    this.reverb.connect(this.wetGain)

    this.buses = { dryIn: this.master, wetIn: this.reverb }
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
        this.wetGain.gain.rampTo(wet, 0.3)
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
    this.noiseGain.connect(this.master)
    this.noise.start()

    this.sparkle = new Tone.Loop((time) => {
      if (Math.random() > 0.4) return
      const play = pickSparkle()
      if (play) Tone.getDraw().schedule(play, time)
    }, 2)
    this.sparkle.start(1)
    Tone.getTransport().start()
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
    this.reverb.dispose()
    this.wetGain.dispose()
    this.master.dispose()
    this.limiter.dispose()
  }
}
