# Sonarium — Master Plan

> **The single source of truth for this project.** If you are a human contributor or an AI agent
> picking this project up cold: read this file first, then [RESEARCH.md](./RESEARCH.md) (why the
> mappings are what they are), then [MAPPING.md](./MAPPING.md) (the canonical visual→acoustic
> mapping spec), then [ARCHITECTURE.md](./ARCHITECTURE.md) (how the code implements it).
> Nothing in those documents may be changed casually — see §11 "Invariants".

---

## 0. Vision in one paragraph

**Sonarium turns any webpage into an acoustic space by adding one script tag.** The library reads
the page the way an ear would read a room: an element's *position* becomes its position in a
stereo/3D sound field, its *size and roundness* shape its voice (the Kiki/Bouba effect, made
executable), the *viewport width* becomes the room's reverberation, the *DOM tree's depth and
grouping* become acoustic distance and harmony, and the user's *body* — mouse on desktop,
accelerometer and touch on mobile — becomes the listener moving through that space. The long-term
goal is a **universal interactive sound framework for the web**: a principled, shareable,
remixable layer that binds the web's virtual space to embodied, spatial, musical sound — doing for
acoustic UX what CSS did for visual styling.

## 1. Why this project exists

### 1.1 The gap

- The visual web has a complete styling system (CSS), a layout model, and design languages.
  The *acoustic* web has nothing: pages are silent, or they bolt on hand-authored bleeps with no
  system behind them. There is no "stylesheet for sound."
- Existing sonification work targets **data** (charts → audio graphs: Fluid Project's sonification
  core, `sonifier`, Apple Audio Graphs). Nobody sonifies the **interface itself** — its layout,
  geometry, hierarchy — automatically and spatially.
- CSS actually tried once: CSS2 *aural stylesheets* and the CSS3 Speech module defined `pause`,
  `cue`, `voice-family` — but they were speech-centric, never implemented broadly, and had no
  spatial or musical model. Sonarium is the spiritual successor with a 2026 toolchain
  (Web Audio API, `PannerNode` HRTF, Tone.js synthesis, observers).

### 1.2 The research lineage (full treatment in RESEARCH.md)

This project operationalizes the author's master's thesis (*Sound and Cognition — Building an
experimental web-based visual music composing tool*, NYU IDM, 2020):

| Thesis finding | Sonarium feature |
|---|---|
| Kiki/Bouba: sharp shapes ↔ high-frequency, harsh sound | `border-radius` → waveform/attack mapping |
| Larger shapes are perceived as louder & lower | element area → velocity + inverse pitch |
| Shape length ↔ sound duration | element elongation → note duration |
| Closed shapes = "particle" sounds; open/long = continuous | role classification → percussive vs. sustained voices |
| Warm/cold color ↔ energetic/dark sound | (Phase 1) color → filter brightness |
| "Rules transform noise into music" | the Musical Quantizer: every mapped value snaps to a per-site key/scale |
| Audio branding: signature melodies identify companies | deterministic per-domain key/scale = every site gets an automatic sonic identity |
| Web tools spread because they're shareable/remixable | theme system designed as shareable JSON "sound packs" |

### 1.3 Who it's for

1. **Creative developers / digital artists** — instant audiovisual installations from any DOM.
2. **Product teams exploring acoustic UX** — a tasteful, systematic interaction-sound layer.
3. **Accessibility researchers** — spatial audio conveys layout to low-vision users; structure
   becomes audible (this is a serious research direction, not a gimmick — see §8 RQ2).
4. **Educators** — `describe(el)` explains *why* an element sounds the way it does; the page
   becomes a teaching instrument for synthesis and cross-modal perception (thesis: education goal).

## 2. Product definition — v0.1 "Resonant MVP"

### 2.1 The promise

```html
<script src="https://cdn.jsdelivr.net/gh/frank890417/sonarium@main/dist/sonarium.iife.js" data-auto></script>
```

One line. The page now: plays a short "introduction motif" derived from its landmarks when sound
is first enabled; gives every interactive element a voice shaped by its geometry; places every
sound where the element is on screen; sizes the reverb to the viewport; lets the cursor act as
the listener's head; arpeggiates groups; ticks while you type; strums when you shake your phone.

### 2.2 Hard requirements

- **R1 — Zero markup changes required.** Works on unmodified pages. All customization is opt-in
  (`data-sonic-*` attributes, JS options).
- **R2 — Respect the user.** No sound before a user gesture (browser autoplay policy is treated
  as a feature). Persistent mute (localStorage). Default loudness is *quiet* (master −10 dB,
  limiter at −1 dBFS). `prefers-reduced-motion` lowers intensity. One-keystroke disposal.
- **R3 — Musical, never noisy.** Every pitch passes through a scale quantizer. Random ≠ musical;
  constraint is the product (thesis §"freedom and regulations").
- **R4 — Performance budget.** ≤ 24 concurrent voices, voice pooling with stealing, lazy audio
  graph (built on first gesture), ≤ 400 tracked elements per page, scan cost O(eligible), no
  per-frame layout reads except the lerped listener. Interaction → sound latency target < 30 ms.
- **R5 — Deterministic identity.** Same domain → same key/scale/motif on every visit
  (hash of hostname), overridable. This is the audio-branding thesis thread.
- **R6 — Explainable.** `sonarium.describe(element)` returns the full acoustic profile *and the
  reasons* (which visual property produced which sonic parameter).

### 2.3 Out of scope for v0.1 (deliberately)

Color mappings, drag-glissandi, multi-user rooms, WebXR, React/Vue wrappers, npm publish,
visual theme editor, ML mapping. All staged in §7.

## 3. The conceptual model

Sonarium models a page as a **room containing sounding objects, heard by a movable listener**:

```
                    THE PAGE AS A ROOM
  ┌──────────────────────────────────────────────┐
  │  viewport width  →  room size (reverb)       │
  │                                              │
  │   [logo]♪            [nav nav nav nav]♫      │   x → azimuth (pan)
  │     left/quiet         right, melodic run    │   y → elevation + brightness
  │                                              │   DOM depth → distance (z) + muffling
  │   ┌─card─────┐  ┌─card─────┐  ┌─card─────┐   │   siblings → scale degrees (chords/runs)
  │   │ ◉ round  │  │ ▢ sharp  │  │ ◉ round  │   │   round → sine/soft, sharp → square/bright
  │   │  sine    │  │  square  │  │  sine    │   │   big → louder & lower, small → quiet & high
  │   └──────────┘  └──────────┘  └──────────┘   │
  │                                              │
  │            👂 listener = cursor / device     │
  └──────────────────────────────────────────────┘
```

Three laws derived from the research (these are the design constitution):

1. **Space is literal.** Screen position maps to sound-field position 1:1. No abstraction.
2. **Geometry is timbre.** What a shape looks like is what it sounds like (cross-modal
   correspondences: Kiki/Bouba, size–pitch, length–duration).
3. **Structure is music.** The DOM tree supplies harmony (scale membership, chord grouping,
   octave register); without structure-derived constraint the output is noise, not sound design.

## 4. Layer model (the path to the "universal framework")

The ultimate goal is bigger than v0.1. The architecture is layered so each phase extends, never
rewrites:

- **L0 — Acoustic Substrate.** Audio engine: voice pool, spatial bus (per-voice `Panner3D` →
  master reverb/limiter), musical quantizer, room model, theme instantiation. *Knows nothing
  about the DOM.* Could later drive a game, a data viz, a VR scene.
- **L1 — Page Reading.** DOM → acoustic scene graph: scanner, role classifier, geometry profiler,
  observers (Mutation/Intersection/Resize). Pure "perception" — produces `SonicProfile`s,
  triggers nothing.
- **L2 — Embodied Input.** Pointer, scroll, keyboard focus, typing, touch, device orientation,
  shake → listener movement + excitation events. This is where "physical space ↔ virtual space"
  lives, and the layer that grows the most over time (gesture grammar, gamepad, MIDI, camera).
- **L3 — Composition.** Themes (role → synth recipes), the mapping constants, the intro motif,
  ambience. Everything aesthetic, all data-driven, designed to be serializable/shareable.
- **L4 — Ecosystem.** Authoring tools, theme remix platform, framework bindings, standards
  proposal (`--sonic-*` CSS custom properties as a de-facto "aural stylesheet"). Thesis dream:
  the npm/CodePen of sound systems.

## 5. Mapping canon — summary

Full spec with formulas and constants: [MAPPING.md](./MAPPING.md). The ten core mappings of v0.1:

1. Element center **x** → azimuth (`positionX` −8…8 m).
2. Element center **y** → elevation (`positionY` +4…−4 m) + brightness tilt (screen-top = brighter).
3. **Area** (log-normalized vs viewport) → scale degree, inverted (big = low) + velocity bonus.
4. **Border-radius / roundness** → oscillator waveform (square→saw→triangle→sine), attack time,
   filter Q. *The Kiki/Bouba mapping; the heart of the library.*
5. **Elongation** (aspect ratio) → note duration (long elements sweep, square elements tick).
6. **DOM depth** → low-pass cutoff (deeper = more muffled) + distance (`positionZ`).
7. **Sibling index** → melodic degree offset within the parent's scale (groups become runs/chords).
8. **Viewport width** → reverb decay + wet (narrow phone = dry booth, wide desktop = hall).
9. **`box-shadow` blur** → per-element reverb send (elevated UI floats in the room).
10. **Hostname hash** → musical key + scale (site identity); `data-sonic-*` overrides everything.

Interaction events of v0.1: hover/focus preview (quiet), activate (full note; containers strum
their children left→right), typing ticks that rise as the field fills, toggle up/down intervals,
element-appearance whispers (rate-limited), scroll-coupled listener, pointer-as-listener,
device-tilt listener offset, shake-to-strum, page intro motif, ambient room tone + sparkles.

## 6. Technical plan — summary

Full detail: [ARCHITECTURE.md](./ARCHITECTURE.md).

- **Language/stack:** TypeScript (strict), Tone.js ^15.1 (the only runtime dependency), tsup for
  dual build (ESM with `tone` external + IIFE with Tone bundled for the one-script-tag promise),
  Vitest for the pure math layer, Vite as the dev/demo server, GitHub Actions → GitHub Pages.
- **Key classes:** `Engine` (orchestrator/event hub), `Scanner` (L1), `profileOf()` (geometry →
  `SonicProfile`), `VoicePool` (L0 polyphony with stealing), `Room` (master bus + ambience),
  `ListenerRig` (L2 movement), input drivers (pointer/activate/keyboard/motion/scroll), `Gate`
  (autoplay-unlock chip, Shadow DOM), themes as plain data.
- **Everything mappable is a pure function** in `src/math/` — no DOM, no Tone imports — so the
  perceptual core is unit-tested and portable (L0 reuse).
- **Voice pooling, not per-element synths:** profiles are data; voices are rented at trigger time
  and configured from the profile. 16-lane default, kind-keyed, oldest-steal.

## 7. Roadmap

### P0 — v0.1.0 "Resonant MVP" *(this session)*
Library core (all §5 mappings, all §5 interactions), 3 themes (`aurora`, `mono`, `paper`),
4 demos (landing playground + inspector, one-line dashboard, depth/hierarchy explorer, mobile
motion), docs (this set), README (EN + 中文), MIT, repo public on GitHub, Pages-deployed demos,
CI (build + test + deploy). **Acceptance:** demos run with zero console errors; `npm test` green;
a stranger can hear the concept within 10 seconds of the landing page.

### P1 — v0.2 "Chromatic" (next 1–2 sessions)
- Color → brightness/warmth mapping (parse computed `background-color`/`color`, map luminance →
  filter cutoff, hue warmth → detune/chorus). Thesis: warm = energetic.
- Typography mapping (font-size/weight → register/velocity; `font-family` serif/sans → ?
  research question RQ5).
- `--sonic-*` CSS custom property support (true "aural stylesheet" authoring).
- Drag → continuous glissando voice (theremin model); scroll velocity → air-noise swell.
- Adaptive ducking: repeated identical triggers decay in velocity (annoyance control, RQ3).
- npm publish (`sonarium`), versioned CDN docs, CHANGELOG discipline.
- Listening-test page (`/lab`): the thesis mismatch experiment, online, collecting anonymous
  agreement scores for every mapping (data → MAPPING.md revisions).

### P2 — v0.3 "Embodied"
- Gesture grammar: flick/circle/shake-direction vocabulary on mobile; gamepad; Web MIDI in/out.
- WebXR listener (page becomes a literal room in AR/VR); head-tracked HRTF where available.
- Multi-user shared rooms (WebRTC data channels): hear other cursors as positioned voices —
  the thesis V7 multiplayer thread.
- React/Vue/Svelte bindings (`<Sonarium>` provider; hooks for custom triggers).

### P3 — v0.4 "Ecosystem"
- Theme editor (visual mapper: drag curves between CSS properties and synth params — the thesis
  patcher, reborn); theme share/remix registry (JSON packs + gallery).
- Site-author API for narrative scoring (sections as movements, scroll as timeline).
- Performance: AudioWorklet ambience, shared HRTF panner pool benchmark.

### P4 — v1.0 "Standard"
- Stability guarantees, full a11y audit with screen-reader users, i18n docs,
  spec write-up proposing `--sonic-*` conventions as a community standard, academic paper
  (CHI/NIME/ICAD) reporting RQ1–RQ5 results.

## 8. Research program (the "deep research" thread)

Each phase feeds an empirical loop — the same methodology as the thesis (draw-what-you-hear,
mismatch tests), now instrumented on the web at scale:

- **RQ1 — Mapping validity.** Do users match sharp UI to sharp timbres above chance? Online
  Kiki/Bouba-style forced-choice tests per mapping (P1 `/lab`). Success: >70% agreement on
  waveform/roundness; revise constants otherwise.
- **RQ2 — Eyes-free locatability.** Can users point to a heard element with eyes closed within
  ±15° azimuth? Compare HRTF vs equal-power panning. This is the accessibility claim's evidence.
- **RQ3 — Annoyance & habituation.** Session-length telemetry (opt-in): mute-rate over time,
  velocity-decay tuning. A sound UX that gets muted is a failed sound UX.
- **RQ4 — Sonic identity.** Can users recognize a site by its motif/key alone after N visits?
  (Audio branding, measured.)
- **RQ5 — Cross-cultural stability.** The thesis cites Bremner et al. (Namibia study): shape–sound
  matches transfer across cultures, shape–taste don't. Which Sonarium mappings are universal?
  Run /lab in EN + 中文 communities first.

## 9. Risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Annoyance** — sound UX has a hostile prior (`<bgsound>`, autoplay ads) | High | Quiet defaults, instant persistent mute, no-gesture-no-audio, ducking (P1), "tasteful by default" as a design law |
| Performance on huge DOMs | Med | Eligibility selectors + 400-element cap + lazy profiles + visible-set culling |
| HRTF cost on low-end mobile | Med | `panning: 'equalpower'` option; auto-fallback when `hardwareConcurrency ≤ 4` |
| Screen-reader collision (double audio) | Med | Document loudly; `gate:'chip'` is keyboard/SR-accessible; never speak; P4 audit with SR users |
| Tone.js bundle weight (~150 KB gz IIFE) | Low | ESM build externalizes Tone; IIFE is the convenience path; substrate isolates Tone for a future raw-WebAudio core |
| Reverb regeneration cost on resize | Low | Debounced 400 ms; IR generated off-thread by Tone.Reverb |
| Name/brand collision | Low | Checked 2026-06: npm `sonarium` free, GitHub free, no JS/audio product found |
| Browser autoplay policy changes | Low | Gate chip is policy-proof (explicit gesture); never fight the policy |

## 10. Success metrics

- v0.1: working public demo; README explains every mapping; a cold agent can extend it using docs alone.
- P1: ≥ 200 GitHub stars or equivalent qualitative signal (talks, writeups); /lab collecting data.
- P2+: one external site ships Sonarium in production; one a11y study cites RQ2 data.
- v1.0: the `--sonic-*` convention is used by someone we've never met.

## 11. Invariants — never violate these

1. **Silence until gesture; mute is sacred and persistent.**
2. **Every pitch goes through the quantizer.** No raw-frequency mapping reaches the speaker.
3. **Mappings live only in `src/math/` as pure functions with tests.** No magic numbers inline in
   engine code; constants belong to MAPPING.md and `src/math/` together (change both or neither).
4. **L0 never imports DOM types; L1 never imports Tone.** The layer boundary is the product.
5. **One script tag must always work.** Whatever else ships, the IIFE auto-init path stays.
6. **`describe(el)` must always tell the truth** — explainability is a feature contract.

## 12. Handoff guide for future agents

- Repo: `https://github.com/frank890417/sonarium` (owner: Che-Yu Wu, frank890417@gmail.com).
- Build: `npm ci && npm run build`. Test: `npm test`. Demos: `npm run dev` then open
  `/examples/`. Deploy: push to `main` → Actions builds + deploys Pages.
- To add a mapping: (1) justify it in RESEARCH.md from a correspondence or experiment; (2) spec
  formula + constants in MAPPING.md; (3) implement as a pure function in `src/math/mapping.ts`
  with a test; (4) consume it in `profileOf()`/`VoicePool.trigger()`; (5) surface it in
  `describe()`; (6) demo it.
- To add a theme: copy a theme object in `src/themes/index.ts`; themes are data, not code.
- To add an input driver: implement `attach(engine): () => void` in `src/interact/`, emit via
  `engine.excite(el, velocity, articulation)` — never touch Tone directly from L2.
- Style: small files, pure functions where possible, no new runtime dependencies without a
  PLAN.md amendment.
- The author's thesis (summarized in RESEARCH.md) is the design authority for perceptual
  questions; when in doubt, run the experiment (§8) rather than argue from taste.
