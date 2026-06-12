# The Matter Weave — one object, many co-varying cues

> v0.3 "Woven" (織). This document replaces the *mapping-table* mental model with a *material*
> model. It specifies how visual properties condense into four macro-dimensions of **Matter**,
> and how each macro-dimension is woven simultaneously into timbre, noise, pitch behaviour,
> envelope, and reverb — so the ear hears **one coherent object**, not five parameters.
> Canon status: equal to MAPPING.md/SPATIAL.md. Code twin: `src/math/matter.ts` (pure, tested).

## 0. Why weaving (the perceptual argument)

Two findings make this *the* correct move, not a stylistic one:

1. **Timbre has known perceptual axes.** Multidimensional scaling of instrument timbres
   (Grey 1977; McAdams et al. 1995) consistently finds ~3 axes: **attack time**, **spectral
   centroid** (brightness), and **spectral flux/irregularity**. If we want a visual property to
   be *felt*, it must drive these axes — not an arbitrary DSP knob.
2. **Co-varying cues fuse; independent cues split.** Auditory scene analysis (Bregman 1990):
   cues with common onset and correlated modulation are heard as ONE source with a character;
   uncorrelated cues are heard as separate events. v0.1/v0.2 mapped each visual property to its
   own isolated parameter — perceptually, a mixing desk. v0.3 makes every macro-dimension move
   *bundles* of parameters with common onset — perceptually, a material.

Also fixed: the 4-step waveform ladder (G7) was discrete — thresholds flipped timbre and nothing
changed between them. v0.3 **synthesizes the spectrum per trigger** (additive partial tables),
making roundness a *continuum* with hundreds of audibly distinct points.

## 1. The four macro-dimensions of Matter

Every element condenses to `Matter = { edge, mass, texture, air }`, each ∈ [0,1]:

| Dim | Meaning | Derived from (v0.3) | Future sources |
|---|---|---|---|
| **EDGE 銳** | boundary abruptness — kiki↔bouba | `1 − roundness` (G6) | clip-path angularity, font serifs |
| **MASS 質** | size/weight/inertia | `sizeT` (G4 log-area) | font-weight, visual density |
| **TEXTURE 紋** | surface noisiness/airiness | shadow softness `clamp(blur/40,0,.4)` + translucency `(1−opacity)·0.6` + dashed/dotted border `+0.15` + media element `+0.35` + backdrop-filter blur `+0.2`; clamp [0,1] | background images, pattern detection, color noise |
| **AIR 距** | distance into the room | `min(depth,10)/10` (S1–S3 normalized) | scroll distance, transform scale |

(Elongation stays a direct voice input — see hollowness §2.1 — because it is a *shape* of the
resonator, not an amount of a material property.)

## 2. The weave matrix

Each row is one macro-dimension; each cell is a formula in `src/math/matter.ts`. **A dimension
must touch every column it can plausibly touch — that is the weave.**

| | Spectrum | Noise | Pitch behaviour | Envelope | Filter | Reverb |
|---|---|---|---|---|---|---|
| **EDGE** | rolloff exponent `p = 1 + 2.6·(1−edge)` (bright↔dark) | **transient burst**: white noise, HP `2k + 4k·edge` Hz, length `lerp(5,25,edge)` ms, level `0.7·edge·vel` — the literal /k/ of kiki | pitch nudge `+edge` step (G10); **no glide** | attack `lerp(45,2,edge)` ms; decay shortens `lerp(.4,.12,edge)` | Q `lerp(.5,2.4,edge)`; **filter envelope**: bite `cutoff×(1+3·edge)` decaying over `lerp(150,60,edge)` ms | send `×lerp(1.3,.7,edge)` (sharp = dry); **send color**: tail LP `lerp(1.2k,7k,edge)` Hz — dark things bloom dark |
| **MASS** | sub/shimmer osc B: interval `mass ≥ .45 ? −12 : +12` semitones, level `lerp(.1,.38,|mass−.45|·2)` — big = chest, tiny = sparkle | — | register (G4, existing) | attack `+8·mass` ms (inertia); release `×lerp(.8,1.5,mass)` | — | send `×lerp(.85,1.15,mass)` (big objects excite rooms) |
| **TEXTURE** | — | **breath layer**: pink noise, BP at `ratio lerp(2.5,1.2,texture)·f₀`, level `0.22·texture`, follows the amp envelope — translucent/soft things are airy | detune jitter `±6·texture` cents (rough = unstable) | — | — | extent bonus `+0.15·texture` (airy things diffuse spatially) |
| **AIR** | — | — | — | — | LP `9000·0.82^d` (S2, existing) | send `+0.05·min(d,10)` (SP3, existing); presence falls (S3) |
| **ELONGATION** | **hollowness**: even-harmonic scale `lerp(1,.12,clamp((e−1)/4,0,1))` — long thin elements sound like pipes (odd-harmonic, physically true) | — | — | duration `0.18·√e` (G11, existing) | — | — |
| **ROUND (=1−edge)** | fundamental dominance (via `p`) | — | **glide**: portamento `lerp(0,28,round)` ms from `−1` scale step — the bouba "swoop-in" | soft onset (via attack) | low Q | **bloom**: send ramps `0.35→1×` over the note's duration (round swells into the room; sharp arrives dry-then-done) |

### 2.1 The spectrum synthesizer (replaces the G7 wave ladder)

`genPartials(edge, elongation) → Float32Array(24)`:

```
p        = 1 + 2.6·(1 − edge)                  // rolloff exponent: 1 (saw-bright) … 3.6 (near-pure)
evenness = lerp(1, 0.12, clamp((e−1)/4, 0, 1)) // e = elongation; pipes suppress even harmonics
a(k)     = (k odd ? 1 : evenness) / k^p        // k = 1…24
normalize so Σa² = 1                            // equal loudness across the continuum
```

- `edge=1, e=1` → rich full spectrum (bright strike). `edge=0` → fundamental-dominant (pure hum).
- `e≫1` (a long bar) → odd-only hollow tone — a **pipe**, which a long thin element literally is.
- G7's four waves remain as *reference points* on this continuum (and as `data-sonic-wave`
  overrides + non-matter synth kinds), but the default voice lives between them.

### 2.2 Interaction weaves (motion ↔ noise)

- **Scroll air-rush** (I8 completed): scroll velocity `v` (px/ms) → room-tone noise swells
  `gain += clamp(v·0.06, 0, 0.18)`, decaying over 400 ms — moving through the page moves air.
  Requires `ambient > 0` (the rush rides the existing room-tone noise).
- Typing ticks, toggles, strums: unchanged, but now articulated by the matter voice (a sharp
  input field ticks with real /k/ bursts; a round one pats softly).

## 3. The voice architecture (synthKind `'matter'`)

```
oscA: custom partials (genPartials)  ─┐
oscB: sine, sub −12 / shimmer +12     ├─ mix ─ ampEnv ─┐
breath: pink noise → BP(ratio·f₀)  ───┘ (breath env)    ├─→ lane filter (LP, Q, bite env) → encoder/panner
burst: white noise → HP(edge) → burstEnv ───────────────┘        + send → sendColor LP → reverb (bloom ramp)
```

- One MatterVoice per lane (pool unchanged, default 18 lanes). Oscillators idle ~free; envelopes
  gate everything.
- `'matter'` becomes the default recipe for most roles in the `aurora` theme (and the theme
  default). `fm` (heading bells), `pluck` (paper), `membrane` (media), `noise` (mono ticks)
  remain as deliberate *character* voices — their params still read the matter weave where
  applicable (e.g. pluck dampening ← filter weave).

## 4. Feelability acceptance (the contract of "可以感受到")

Every weave must pass a blindfold A/B: flip ONE visual property between extremes on an otherwise
identical element; a first-time listener must reliably notice and describe the difference in the
right direction. The shipped checks (manual now, /lab-instrumented in v0.4):

| Flip | Must hear |
|---|---|
| radius 0 ↔ pill | "click & bright & dry" ↔ "soft & warm & blooms into the room" (≥4 co-varying cues) |
| 40px ↔ 400px block | "small high sparkle" ↔ "low chest with sub" |
| opacity 1 ↔ 0.4 | "solid tone" ↔ "breathy/airy" |
| flat ↔ soft shadow | "in your face" ↔ "floating in the room" |
| square ↔ long bar | "full tone" ↔ "hollow pipe" |
| shallow ↔ deeply nested | "present" ↔ "far, muffled, wetter" |
| still ↔ fast scroll | silence ↔ air rushing past |

If a weave can't pass its blindfold test, its constants are wrong — fix the constants, not the
expectation (or remove the weave; an unfeelable mapping is dead weight).

## 5. References (adds to RESEARCH.md §6)

- Grey, J. M. (1977). Multidimensional perceptual scaling of musical timbres. *JASA*, 61(5).
- McAdams, S., Winsberg, S., Donnadieu, S., De Soete, G., & Krimphoff, J. (1995). Perceptual
  scaling of synthesized musical timbres. *Psychological Research*, 58.
- Bregman, A. S. (1990). *Auditory Scene Analysis.* MIT Press — fusion by common fate/onset.
- Risset, J.-C., & Wessel, D. (1999). Exploration of timbre by analysis and synthesis. In
  *The Psychology of Music* — additive synthesis as a perceptual instrument.
- Fletcher, N. H., & Rossing, T. D. (1998). *The Physics of Musical Instruments* — pipes and
  odd-harmonic spectra (the hollowness weave's physical grounding).
