# The Modular Patch — 模組

> v0.5 "Modular". The Matter voice (MATTER.md) gave every element a coherent material; this spec
> gives it a **modular synthesizer's depth**: a wavefolder, audio-rate FM, unison thickness, and
> LFOs patched from live CSS — so timbre gains variability (no two elements identical), finesse
> (continuous behaviours, not switches), and complexity (dynamic spectra, not static ones).
> Code twin: `src/math/modular.ts` (pure, tested). Canon status equal to the other six docs.

## 0. The modular argument

A modular synth's expressiveness comes from three properties Sonarium lacked:

1. **Dynamic spectra** — modules like wavefolders make harmonic content *move* with drive and
   envelope; additive tables alone are static photographs.
2. **Modulation as material behaviour** — LFOs/envelopes patched to pitch/amp/filter make a
   voice *behave*, not just sound. Co-varying modulation fuses (Bregman again).
3. **Patch identity** — the same modules, patched differently, are different instruments.
   In Sonarium the **page is the patch**: CSS properties literally plug modulation cables.

This is also the thesis full circle: the 2020 thesis built a *visual patcher* for humans;
v0.5 makes the *page itself* the patcher.

## 1. New visual sources → patch points

| # | Source (CSS) | Module | Formula | Feel |
|---|---|---|---|---|
| M1 | `border-width` w px × EDGE | **wavefolder drive** | `drive = clamp(w/6, 0, 1) · (0.25 + 0.75·edge)`; `mix = drive > 0 ? 0.25 + 0.55·drive : 0` | heavy borders saturate — thick-framed UI sounds driven |
| M2 | TEXTURE × EDGE | **FM index** (oscB → oscA frequency, audio-rate) | `index = 1.5·texture·edge` (× carrier Hz in-voice) | rough sharp surfaces ring metallic |
| M3 | MASS | **unison** (detuned twin oscillator) | `mass ≥ 0.45 → {detune: 4+10·mass cents, mix: 0.4}` else off | big elements are *thick*, not just low |
| M4 | `animation`/`animation-duration` d s | **LFO** (vibrato + tremolo + filter) | `rate = clamp(1/d, 0.08, 8) Hz`, sine; vibrato 6 cents, tremolo 0.18, filter ±0.25·cutoff | an element that visibly pulses audibly pulses — one cycle per animation cycle |
| M5 | `border-style: dashed\|dotted` | **square-wave chop LFO** (the S&H of CSS) | dashed → 3.5 Hz, dotted → 7 Hz; tremolo 0.3, filter ±0.35 | visually segmented = audibly segmented |
| M6 | `transition-duration` t s | **portamento** | `+clamp(t/2, 0, 0.25)` s onto the glide | elements that ease visually ease in pitch |
| M7 | `font-weight` (text-ish roles) | **MASS bonus** (typography enters the weave) | `mass += clamp((weight−400)/300, 0, 1)·0.12` | bold text carries weight |

Priorities: an explicit `animation` owns the LFO; otherwise dashed/dotted borders patch it;
otherwise the LFO idles (rate 0 — silence is a valid patch).

## 2. The voice as a patch (extends MATTER.md §3)

```
oscA (partials) ─ preGain(drive) ─ FOLD (sin shaper) ─┐ (dry/wet mix M1)
oscA′ (unison twin, M3) ─────────────────────────────┤
oscB (sub/shimmer) ── fmGain (M2 · f₀) → oscA.frequency   [the FM cable]
breath noise (BP) ───────────────────────────────────┴→ mix → ampEnv → out
burst noise (HP) → burstEnv → out
LFO (M4/M5) → vibrato (oscA.detune) + tremolo (mix.gain) + filter wobble (lane filter)
```

- Fold curve: `y = sin(2.5 · π/2 · x)` — monotone (near-linear) for small drive, folding for
  hot signals; the *envelope sweeps the spectrum through the fold* every note (dynamic spectra).
- All modulation routes carry common onset with the note → fusion, not vibrato soup.
- One LFO per lane, three depth taps; rate/shape/depths are set per trigger from the profile.

## 3. Sustained voices — drag glissando (the keyboard's ribbon)

Press an interactive element and **drag**: the voice gates on and the pointer becomes a ribbon
controller. Horizontal travel sweeps ±1 octave of *scale degrees* (quantized — Invariant #2
holds; the glide between steps is the portamento, so it plays like a harp run, not a siren).
Release gates off. Latency invariant untouched (the initial hit is still immediate; the ribbon
starts only after 14 px of travel).

## 4. Performance — voices sleep (the power switch)

A matter lane now runs up to 6 sources. Idle lanes (no trigger for 30 s) **stop** all sources;
the next trigger restarts them in-place (Tone sources rebuild natively). Steady-state CPU of a
silent page returns to ~zero regardless of pool size. Sweep runs every 10 s inside the pool.

## 5. Ghost-trigger fixes (v0.5, user-reported)

"Things sound without hover" had three real causes, all fixed:

1. **Scroll-hover**: scrolling slides elements under a stationary cursor → `pointerover` fires.
   Hover previews are now suppressed for 250 ms after any scroll.
2. **Focus-after-click**: clicking also focuses, so `focusin` previews stacked a second sound on
   every click. Focus previews now require *no pointerdown in the last 500 ms* (Tab-only).
3. **Distant resolution**: hovering blank space inside a section resolved up to far-away
   registered ancestors. Preview resolution is now capped at 4 ancestor hops.

(There is no uuid/binding system to corrupt — the registry keys raw `Element` references and
engine dispose/rebind was verified clean. The audible "phantoms" beyond these three are the
*designed* quiet layers: appearance whispers, echoes, and phrases — all of which scale with
`ambient` and vanish at `ambient: 0`.)

## 6. Feelability acceptance (extends MATTER.md §4)

| Flip | Must hear |
|---|---|
| 1 px ↔ 6 px border | clean ↔ driven/overdriven (fold) |
| static ↔ CSS-animated element | steady tone ↔ pulsing tone at the animation's own rate |
| solid ↔ dashed border | smooth ↔ chopped (square LFO) |
| normal ↔ bold heading | lighter ↔ weightier voice |
| click ↔ click-and-drag | note ↔ harp run under the finger |
| scroll a page with a still mouse | **no hover sounds at all** (the fix, blindfold-tested in reverse) |
