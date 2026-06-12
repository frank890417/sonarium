# Architecture

> How the code implements [MAPPING.md](./MAPPING.md) under the invariants of
> [PLAN.md](./PLAN.md) §11. Layer model: L0 substrate / L1 page reading / L2 embodied input /
> L3 composition — see PLAN §4.

## 1. Module map

```
src/
├── index.ts                 entry: create(), version, auto-init (<script data-auto>)
├── types.ts                 SonicProfile, SonariumOptions, Theme, Role, events
├── math/                    L0 PURE — no DOM, no Tone imports, fully unit-tested
│   ├── util.ts              clamp, lerp, norm, fnv1a
│   ├── scales.ts            SCALES, siteKey, parseKey, degreeToMidi, midiToFreq
│   └── mapping.ts           every formula in MAPPING.md §1–2 as a named function
├── core/
│   ├── profile.ts           L1: element → SonicProfile (geometry, role, depth, overrides)
│   ├── scanner.ts           L1: eligibility, registry, observers, visible set
│   ├── voices.ts            L0: VoicePool — lanes, stealing, trigger(profile)
│   ├── room.ts              L0: master bus, reverb sizing, ambience, mute/visibility
│   ├── listener.ts          L0/L2 bridge: ListenerRig (pointer/center modes, tilt offset, lerp)
│   └── engine.ts            orchestrator: lifecycle, event hub, excite(), describe()
├── interact/                L2 drivers — each exports attach(engine): () => void (detach)
│   ├── pointer.ts           hover preview + listener targeting
│   ├── activate.ts          pointerdown/click + container strum + toggle intervals
│   ├── keyboard.ts          focusin preview + typing ticks
│   ├── scroll.ts            rect refresh on scroll/resize + room resize hook
│   └── motion.ts            deviceorientation tilt + shake strum (iOS permission flow)
├── spatial/                 v0.2 ambisonic engine — full spec in SPATIAL.md
│   ├── sh.ts, rotation.ts, decoder.ts, sphere.ts, perceptual.ts   pure, tested, import nothing
│   ├── encoder.ts, bus.ts, room-foa.ts                            Tone only
│   └── (VoicePool reaches it through the SpatialBackend interface; 'panner' = v0.1 fallback)
├── themes/index.ts          L3: aurora / mono / paper as plain data (Theme objects)
└── ui/gate.ts               unlock & mute chip (Shadow DOM, ARIA, localStorage)
```

Dependency rules (Invariant #4): `math/` imports nothing. `core/profile.ts`, `core/scanner.ts`
import `math/` + DOM only — **never Tone**. `core/voices.ts`, `core/room.ts`,
`core/listener.ts` import `math/` + Tone only — **never query the DOM** (they receive data).
`interact/` talks to `engine` exclusively via `excite()/ listener rig API`. `engine.ts` is the
only file allowed to know everyone.

## 2. Data flow

```
                 MutationObserver / IntersectionObserver / ResizeObserver
                                      │
 DOM ──scan──► Scanner ──register──► registry: Map<Element, ProfileCache>
                                      │  (profiles computed lazily, invalidated on mutate/resize)
 pointer/keys/motion ──► interact/* ──► engine.excite(el, velocity, articulation)
                                      │
                              profileOf(el)  ← math/mapping.ts (pure)
                                      │
                              VoicePool.trigger(profile, velocity, when)
                                      │   lane = acquire(profile.synthKind)
                                      ▼
              lane: Synth → Filter → Panner3D ─┬→ dry → Volume → Limiter → destination
                                               └→ send → Reverb ┘
 viewport resize ──► Room.resize(vw) (debounced reverb IR)
 pointermove/tilt ──► ListenerRig.target(x, y) → rAF lerp → Tone.Listener position
```

`SonicProfile` (the contract between L1 and L0):

```ts
interface SonicProfile {
  el: WeakRef<Element>; role: Role;
  rect: { x: number; y: number; w: number; h: number };   // viewport-relative
  pan: { x: number; y: number; z: number };               // meters, G1/G2/S1/S5
  midi: number; freqHz: number; degree: number;           // post-quantizer
  wave: 'sine'|'triangle'|'sawtooth'|'square';            // G7 or override
  attack: number; release: number; durationS: number;     // G8, G11
  filterHz: number; filterQ: number;                      // S2·G3, G9
  velocityScale: number;                                  // G5·G12·S3·quiet
  reverbSend: number;                                     // G13
  synthKind: 'synth'|'fm'|'pluck'|'membrane'|'noise';     // theme recipe
  reasons: Record<string, string>;                        // describe() truth (Invariant #6)
}
```

## 3. Lifecycle & autoplay gate

1. `create(options)` — synchronous, safe before user gesture: resolves options, builds Gate chip,
   **builds and runs the Scanner** (L1 perception is always on — `describe()` works pre-gesture),
   registers unlock listeners (`pointerdown`/`keydown`/`click`, capture). **No AudioContext yet.**
   Unlock listeners stay armed until a start attempt actually succeeds: a gesture that fails to
   resume the context (e.g. synthetic activation) must not consume the only unlock chance, and
   `Tone.start()` is raced against a 1.5 s timeout so a pending resume can't wedge the engine.
2. First successful gesture (or chip tap) → `engine.start()`: `Tone.start()`, build Room +
   VoicePool + ListenerRig, attach interact drivers, play intro motif (I12), start ambience.
3. If `localStorage['sonarium:muted'] === '1'`, the unlock is deferred until the chip is tapped.
4. `dispose()` reverses everything (observers, listeners, Tone nodes); idempotent.

States: `idle → armed (gate shown) → running ⇄ muted → disposed`. Events emitted: `start`,
`trigger` (el, profile, velocity), `mute`, `dispose` — demos visualize via `on('trigger')`.

## 4. Voice pool

- Lanes keyed by `synthKind`; created lazily; global cap `maxVoices` (default 18, ≤ 24).
- A lane = `{ synth, filter, panner, dry, send, busyUntil }`. `acquire(kind)`: free lane → else
  oldest `busyUntil` of same kind (steal: fast release then retrigger) → else create if under cap.
- `trigger()` sets oscillator/envelope/filter/panner/send from the profile **then**
  `triggerAttackRelease(freqHz, durationS, now, velocity)`; `busyUntil = now + duration + release`.
- Panner position set via `setTargetAtTime`-style ramps (`rampTo(value, 0.02)`) to avoid zipper
  noise; never re-instantiate panners per trigger.
- NoiseSynth has no pitch: ticks ignore `freqHz`, keep envelope/filter (mono theme relies on this).

## 5. Scanner

- Eligibility = `ELIGIBLE_SELECTOR` (roles table MAPPING §3) + containers that have ≥ 2 eligible
  children; subtree pruning at `data-sonic="off"`; hard cap 400 elements (overflow logged once).
- Registry holds `{ profile?: SonicProfile, visible: boolean }`; profiles **computed on demand**
  (first excite/intersect) and invalidated by: ResizeObserver (per-element), scroll/resize
  (rects only — cheap path recomputes rect + pan, keeps voice params), MutationObserver
  (attribute/class changes → full invalidate; added/removed nodes → register/unregister,
  debounced 150 ms).
- IntersectionObserver maintains the `visible` set (ambience sparkles, strums, shake pool) and
  fires I7 whispers through a token bucket (6/s).

## 6. Performance budget & tactics

| Budget | Target | Tactic |
|---|---|---|
| trigger latency | < 30 ms | pointerdown (not click); profiles cached; no layout reads in trigger path when cached |
| main-thread per interaction | < 3 ms | pure-math profile; single `getBoundingClientRect` on cache miss |
| concurrent voices | ≤ 24 | pool + steal |
| tracked elements | ≤ 400 | eligibility + cap |
| idle CPU | ~0 when hidden | I14 fade + loops paused on `visibilitychange` |
| memory | no leaks on SPA navigation | WeakRef in profiles, full `dispose()`, MutationObserver unregister |

## 7. Build & distribution

- **tsup**, two configs: ESM (`dist/index.js`, `external: ['tone']`, with `.d.ts`) and IIFE
  (`dist/sonarium.iife.js`, Tone bundled, `globalName: 'Sonarium'`, minified). `dist/` is
  committed so jsDelivr can serve `cdn.jsdelivr.net/gh/frank890417/sonarium@main/dist/…`
  (the one-script-tag promise needs no npm publish; npm comes in P1).
- Demos are plain HTML in `examples/` referencing `../dist/sonarium.iife.js` — they work locally
  with any static server and on GitHub Pages unchanged (CI copies `examples/` + `dist/` into the
  site artifact preserving relative paths).
- CI (`.github/workflows/pages.yml`): push to `main` → install, test, build, assemble
  `site/{index.html→redirect, examples/, dist/}`, deploy to Pages.

## 8. Testing strategy

- **Unit (Vitest, node env):** everything in `src/math/` — quantizer determinism, scale
  membership, threshold boundaries (G7), monotonicity (S2 decreasing in depth, G4 decreasing in
  area), range clamps (G11, S7/S8), `siteKey` stability across runs, `parseKey('D dorian')`.
  These tests are the spec's executable form; a mapping change without a test change is a smell.
- **Smoke (manual + preview tooling):** demos load with zero console errors; `__sonariumDebug`
  event log fills on synthetic clicks; gate chip renders; mute persists across reload.
- **Not tested (accepted):** actual audio output (no ears in CI). Risk is contained because the
  audible layer is a thin, declarative consumption of the tested math layer.
- **P1:** add Playwright + OfflineAudioContext render hash ("does this profile render a non-silent
  buffer") and /lab perceptual telemetry.

## 9. Error policy

- Sonarium must **never break the host page**: every public entry point and event handler wraps
  in try/catch routing to `console.warn('[sonarium] …')` once per error class; failures degrade
  to silence, never to thrown exceptions in the host's frame.
- Missing browser APIs (no `DeviceOrientationEvent`, no `IntersectionObserver`) → feature
  detection, driver simply doesn't attach.
- SSR: importing the ESM module is side-effect-free; `create()` throws a clear error without
  `window` (documented); auto-init only runs in browsers.
