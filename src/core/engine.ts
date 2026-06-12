/**
 * The orchestrator — the only file allowed to know every layer (ARCHITECTURE.md §1).
 * Lifecycle: idle → armed → running ⇄ muted → disposed (§3).
 */
import * as Tone from 'tone'
import { parseKey, siteKey, type SiteKey } from '../math/scales'
import { clamp } from '../math/util'
import type { Articulation, PerceptualFactors, SonariumOptions, SonicProfile, SonariumEvent, Theme, TriggerDetail } from '../types'
import { resolveTheme } from '../themes/index'
import { mountGate, isMutedPersisted, persistMuted, type GateHandle } from '../ui/gate'
import { AmbisonicBackend, PannerBackend, type SpatialBackend } from '../spatial/backend'
import { FieldRig } from '../spatial/field'
import { resolveFactors } from '../spatial/perceptual'
import { ListenerRig } from './listener'
import type { ProfileEnv } from './profile'
import { Room } from './room'
import { Scanner } from './scanner'
import { VoicePool } from './voices'
import { attachPointer } from '../interact/pointer'
import { attachActivate } from '../interact/activate'
import { attachKeyboard } from '../interact/keyboard'
import { attachScroll } from '../interact/scroll'
import { attachMotion } from '../interact/motion'

interface ResolvedOptions {
  root: Element
  theme: Theme
  key: SiteKey
  listener: 'pointer' | 'center'
  ambient: number
  motion: boolean
  gate: 'chip' | 'none'
  volume: number
  maxVoices: number
  panning: 'HRTF' | 'equalpower'
  spatial: 'ambisonic' | 'panner'
  reverb: 'auto' | number
  velocityFactor: number
}

type State = 'idle' | 'armed' | 'running' | 'disposed'

export class Engine {
  readonly opts: ResolvedOptions
  state: State = 'idle'
  muted = false

  scanner!: Scanner
  pool: VoicePool | null = null
  room: Room | null = null
  rig: ListenerRig | FieldRig | null = null
  backend: SpatialBackend | null = null
  factors: PerceptualFactors

  private gate: GateHandle | null = null
  private env: ProfileEnv
  private detachers: Array<() => void> = []
  private listeners = new Map<SonariumEvent, Set<(detail?: unknown) => void>>()
  private unlockHandler: ((e: Event) => void) | null = null
  private appearBucket = 6
  private bucketTimer: ReturnType<typeof setInterval> | null = null

  constructor(userOpts: SonariumOptions = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('[sonarium] requires a browser environment (create() in the client only)')
    }
    const reduced = (userOpts.respectReducedMotion ?? true)
      && typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches

    const key = (userOpts.key && userOpts.key !== 'auto' ? parseKey(userOpts.key) : null)
      ?? siteKey(location.hostname)

    this.opts = {
      root: userOpts.root ?? document.body,
      theme: resolveTheme(userOpts.theme),
      key,
      listener: userOpts.listener ?? 'pointer',
      ambient: reduced ? 0 : clamp(userOpts.ambient ?? 0.12, 0, 1),
      motion: userOpts.motion ?? true,
      gate: userOpts.gate ?? 'chip',
      volume: userOpts.volume ?? -10,
      maxVoices: clamp(userOpts.maxVoices ?? 18, 4, 24),
      panning: userOpts.panning === 'equalpower' ? 'equalpower' : 'HRTF',
      spatial: userOpts.spatial === 'panner' ? 'panner' : 'ambisonic',
      reverb: userOpts.reverb ?? 'auto',
      velocityFactor: reduced ? 0.7 : 1,
    }
    this.factors = resolveFactors(userOpts.perceptual)

    this.env = {
      root: this.opts.root,
      key: this.opts.key,
      theme: this.opts.theme,
      vw: window.innerWidth,
      vh: window.innerHeight,
    }

    this.muted = isMutedPersisted()

    // L1 perception is always on: the page is readable (describe()) before it is audible.
    this.scanner = new Scanner(this.env, { onAppear: (el) => this.whisper(el) })
    this.scanner.scan()

    this.arm()
  }

  // ---------------------------------------------------------------- lifecycle

  private arm(): void {
    this.state = 'armed'
    if (this.opts.gate === 'chip') {
      this.gate = mountGate(() => this.toggleMute())
      this.gate.setState(this.muted ? 'muted' : 'armed')
    }
    if (!this.muted) {
      // Any gesture may unlock (standard autoplay pattern); the chip is the explicit path.
      // 'click' included for assistive tech and synthetic activation, which may skip pointerdown.
      // Listeners stay armed until start() actually succeeds — a gesture that fails to resume
      // the context (no user activation) must not consume the only unlock chance.
      this.unlockHandler = () => { void this.start() }
      window.addEventListener('pointerdown', this.unlockHandler, { capture: true })
      window.addEventListener('keydown', this.unlockHandler, { capture: true })
      window.addEventListener('click', this.unlockHandler, { capture: true })
    }
  }

  private removeUnlockListeners(): void {
    if (!this.unlockHandler) return
    window.removeEventListener('pointerdown', this.unlockHandler, { capture: true })
    window.removeEventListener('keydown', this.unlockHandler, { capture: true })
    window.removeEventListener('click', this.unlockHandler, { capture: true })
    this.unlockHandler = null
  }

  private starting = false

  async start(): Promise<void> {
    if (this.state === 'running' || this.state === 'disposed' || this.starting) return
    this.starting = true
    try {
      // Tone.start() can stay pending forever without user activation; don't wedge on it —
      // stay 'armed' and let the next (real) gesture try again.
      await Promise.race([Tone.start(), new Promise((r) => setTimeout(r, 1500))])
    } catch (err) {
      console.warn('[sonarium] audio context could not start yet', err)
    } finally {
      this.starting = false
    }
    if (Tone.getContext().state !== 'running' || (this.state as State) === 'disposed') return
    this.state = 'running'
    this.removeUnlockListeners()
    this.gate?.setState(this.muted ? 'muted' : 'on')

    this.buildAudioGraph()
    if (this.muted) this.room?.setMuted(true)

    this.detachers.push(
      attachPointer(this),
      attachActivate(this),
      attachKeyboard(this),
      attachScroll(this),
    )
    if (this.opts.motion) this.detachers.push(attachMotion(this))

    const onVis = () => this.room?.setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    this.detachers.push(() => document.removeEventListener('visibilitychange', onVis))

    this.bucketTimer = setInterval(() => { this.appearBucket = Math.min(6, this.appearBucket + 6) }, 1000)

    this.room?.startAmbience(this.env.vw, this.opts.ambient, () => this.pickSparkle())
    this.playIntroMotif()
    this.emit('start')
  }

  /**
   * SPATIAL.md §6 — ambisonic field by default; if its construction throws on an exotic
   * browser, fall back to the v0.1 per-voice panner world rather than staying silent.
   */
  private buildAudioGraph(): void {
    const roomOpts = { volumeDb: this.opts.volume, reverb: this.opts.reverb, ambient: this.opts.ambient }
    if (this.opts.spatial === 'ambisonic') {
      try {
        this.room = new Room({ ...roomOpts, mode: 'ambisonic' }, this.env.vw, this.factors)
        const decoderKind = this.opts.panning === 'equalpower' ? 'stereo' : 'binaural'
        this.backend = new AmbisonicBackend(this.room, decoderKind, this.env.vw, this.factors)
        this.rig = new FieldRig(this.backend, this.opts.listener)
        this.rig.start()
        this.pool = new VoicePool(this.backend, this.opts.maxVoices)
        return
      } catch (err) {
        console.warn('[sonarium] ambisonic backend unavailable, falling back to panner', err)
        this.room?.dispose()
        this.room = null
      }
    }
    this.room = new Room({ ...roomOpts, mode: 'panner' }, this.env.vw, this.factors)
    this.backend = new PannerBackend(this.room, this.opts.panning)
    this.rig = new ListenerRig(this.opts.listener)
    this.rig.start()
    this.pool = new VoicePool(this.backend, this.opts.maxVoices)
  }

  /** Live spat5.oper surface: adjust presence/roomPresence/envelopment/warmth/brilliance. */
  setPerceptual(partial: Partial<PerceptualFactors>): void {
    this.factors = resolveFactors({ ...this.factors, ...partial })
    this.backend?.setFactors(this.factors)
  }

  toggleMute(): void {
    if (this.state !== 'running') {
      // First tap on the chip both unlocks and (if persisted-muted) unmutes.
      this.muted = false
      persistMuted(false)
      void this.start()
      return
    }
    this.muted = !this.muted
    persistMuted(this.muted)
    this.room?.setMuted(this.muted)
    this.gate?.setState(this.muted ? 'muted' : 'on')
    this.emit('mute', this.muted)
  }

  dispose(): void {
    if (this.state === 'disposed') return
    this.state = 'disposed'
    this.removeUnlockListeners()
    if (this.bucketTimer) clearInterval(this.bucketTimer)
    for (const detach of this.detachers.splice(0)) {
      try { detach() } catch { /* already gone */ }
    }
    this.scanner?.dispose()
    this.rig?.dispose()
    this.pool?.dispose()
    this.backend?.dispose()
    this.room?.dispose()
    this.gate?.dispose()
    this.emit('dispose')
    this.listeners.clear()
  }

  // ---------------------------------------------------------------- sounding

  /**
   * The single entry point for anything that wants to sound an element (Invariant: L2 drivers
   * never touch Tone). Resolves the element to its profile and rents a voice.
   * `transpose` shifts in semitones relative to the quantized pitch — callers must pass
   * consonant intervals only (e.g. keyboard.ts FILL_INTERVALS).
   */
  excite(el: Element, velocity: number, articulation: Articulation, when?: number, transpose = 0): void {
    if (this.state !== 'running' || this.muted || !this.pool) return
    const target = this.scanner.resolve(el) ?? el
    let profile = this.scanner.profileFor(target)
    if (!profile) return
    if (transpose !== 0) {
      profile = { ...profile, midi: profile.midi + transpose, freqHz: profile.freqHz * Math.pow(2, transpose / 12) }
    }
    if (articulation === 'tick') {
      profile = { ...profile, durationS: Math.min(profile.durationS, 0.07), release: 0.05 }
    }
    if (articulation === 'toggle-on' || articulation === 'toggle-off') {
      const dir = articulation === 'toggle-on' ? 1 : -1
      const base = { ...profile, durationS: 0.12 }
      this.pool.trigger(base, velocity * this.opts.velocityFactor, when)
      // perfect-5th answer note (I6): 7 semitones up/down from the quantized pitch
      const second = { ...profile, midi: profile.midi + dir * 7, freqHz: profile.freqHz * Math.pow(2, (dir * 7) / 12), durationS: 0.16 }
      this.pool.trigger(second, velocity * this.opts.velocityFactor, (when ?? Tone.now()) + 0.09)
    } else {
      this.pool.trigger(profile, velocity * this.opts.velocityFactor, when)
    }
    this.emit('trigger', { el: target, profile, velocity, articulation } satisfies TriggerDetail)
  }

  /** I3/I11 — strum a set of elements left→right. */
  strum(els: Element[], velocity: number, articulation: Articulation = 'strum'): void {
    if (this.state !== 'running' || !this.pool) return
    const sorted = els
      .map((el) => ({ el, p: this.scanner.profileFor(el) }))
      .filter((x): x is { el: Element; p: SonicProfile } => !!x.p)
      .sort((a, b) => a.p.rect.x - b.p.rect.x)
      .slice(0, 6)
    const t0 = Tone.now()
    sorted.forEach(({ el }, i) => this.excite(el, velocity, articulation, t0 + i * 0.06))
  }

  private whisper(el: Element): void {
    if (this.appearBucket <= 0) return
    this.appearBucket--
    this.excite(el, 0.12, 'whisper')
  }

  private pickSparkle(): (() => void) | null {
    const visible = this.scanner?.visibleElements() ?? []
    if (!visible.length) return null
    const el = visible[Math.floor(Math.random() * visible.length)] as Element
    return () => this.excite(el, 0.07 * (this.opts.ambient / 0.12), 'whisper')
  }

  /** I12 — the page introduces itself: its largest landmarks, in DOM order, in the site key. */
  private playIntroMotif(): void {
    const candidates = Array.from(
      this.opts.root.querySelectorAll('h1, h2, nav, main, [role=banner], header, button, [role=button]'),
    ).filter((el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && r.top < this.env.vh
    })
    const byArea = candidates
      .map((el) => ({ el, area: el.getBoundingClientRect().width * el.getBoundingClientRect().height }))
      .sort((a, b) => b.area - a.area)
      .slice(0, 5)
      .map((x) => x.el)
    const inDomOrder = candidates.filter((el) => byArea.includes(el))
    const t0 = Tone.now() + 0.1
    inDomOrder.forEach((el, i) => this.excite(el, 0.3, 'motif', t0 + i * 0.09))
  }

  // ---------------------------------------------------------------- introspection

  /** Invariant #6 — explain why an element sounds the way it does. Works before start(). */
  describe(el: Element): SonicProfile | null {
    return this.scanner.profileFor(el)
  }

  geometryChanged(): void {
    this.env.vw = window.innerWidth
    this.env.vh = window.innerHeight
    this.scanner?.updateEnv(this.env.vw, this.env.vh)
    this.scanner?.invalidateRects()
  }

  roomResized(): void {
    this.geometryChanged()
    this.room?.resize(this.env.vw)
    this.backend?.onViewport(this.env.vw)
  }

  // ---------------------------------------------------------------- events

  on(event: SonariumEvent, fn: (detail?: unknown) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn)
    return () => this.listeners.get(event)?.delete(fn)
  }

  private emit(event: SonariumEvent, detail?: unknown): void {
    for (const fn of this.listeners.get(event) ?? []) {
      try { fn(detail) } catch (err) { console.warn('[sonarium] listener error', err) }
    }
  }
}
