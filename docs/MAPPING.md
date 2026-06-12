# The Mapping Canon

> The canonical visual→acoustic specification. **Code and this document must never disagree**:
> every formula here is implemented as a pure, tested function in `src/math/`, and every constant
> in `src/math/` traces back to a row here. To change a mapping: amend this file and the code in
> the same commit, citing [RESEARCH.md](./RESEARCH.md).
>
> Notation: `t = norm(v, a, b)` is `clamp((v−a)/(b−a), 0, 1)`; `lerp(a, b, t) = a + (b−a)t`.

## 0. The musical substrate (applies to every mapping)

Nothing reaches the speaker without quantization (Invariant #2).

- **Site key.** `siteKey(hostname)` → FNV-1a 32-bit hash `h`. Root pitch-class = `h % 12`.
  Scale = `SCALES[(h >> 4) % 5]` from:
  `pentMajor [0,2,4,7,9]` · `pentMinor [0,3,5,7,10]` · `dorian [0,2,3,5,7,9,10]` ·
  `lydian [0,2,4,6,7,9,11]` · `mixolydian [0,2,4,5,7,9,10]`.
  Pentatonics dominate the hash space intentionally? No — uniform 1/5 each; pentatonic is merely
  the *default* when `key:'auto'` fails (no hostname, e.g. `file:`). Override: `key: 'D dorian'`.
- **Pitch space.** 3 octaves spanning MIDI 45–81 region: `degreeToMidi(degree∈[0,1])` selects
  index `round(degree · (len·OCTAVES − 1))` into the scale laid across octaves from `BASE = 48`
  (C3) + root. Conversion `midiToFreq(m) = 440 · 2^((m−69)/12)`.
- **Velocity space.** All velocities ∈ [0,1], multiplied by role/theme base, opacity, and the
  size bonus; final clamp [0.03, 1].

## 1. Geometry → voice (the element's identity)

| # | Source | Target | Formula | Constants | Research |
|---|--------|--------|---------|-----------|----------|
| G1 | center x / viewport width | azimuth `positionX` | `(2t − 1) · ROOM_HALF_W` | `ROOM_HALF_W = 8` (m) | spatial literalism (PLAN §3 law 1) |
| G2 | center y / viewport height | elevation `positionY` | `(1 − 2t) · ROOM_HALF_H` | `ROOM_HALF_H = 4` | screen-top = up |
| G3 | center y | brightness tilt | filter cutoff ×`lerp(1.45, 0.7, t)` | — | pitch/brightness–height (Spence 2011) |
| G4 | area `a = w·h`, viewport area `A` | scale degree (pitch) | `sizeT = norm(log(1 + 100·a/A), 0, log(101))`; `degree = 0.1 + 0.75·(1 − sizeT)` (compressed so step offsets keep melodic headroom) | range `[0.1, 0.85]` | T2 big = low (log per Kramer) |
| G5 | area | velocity bonus | `vel ×= lerp(0.85, 1.25, sizeT)` | — | T2 big = loud |
| G6 | `border-radius` vs `min(w,h)/2` | **roundness** `r ∈ [0,1]` | `r = clamp(radius / (min(w,h)/2), 0, 1)` | — | T1 Kiki/Bouba |
| G7 | roundness | waveform | `r<0.15 →'square'; <0.45→'sawtooth'; <0.8→'triangle'; else 'sine'` | thresholds `.15/.45/.8` | T1 |
| G8 | roundness | attack | `lerp(0.002, 0.045, r)` s | — | sharp = plosive onset |
| G9 | roundness | filter Q | `lerp(2.4, 0.5, r)` | — | sharp = resonant edge |
| G10 | roundness | pitch nudge | `+(1 − r) · 1` scale step | — | T1 sharper ↔ slightly higher |
| G11 | elongation `e = max(w,h)/min(w,h)` | duration | `0.18 · √e`, clamp [0.12, 1.6] s | — | T3 length = duration |
| G12 | opacity | velocity scale | `vel ×= opacity` | — | fading things sound faint |
| G13 | `box-shadow` blur px | reverb send | `clamp(blur/40, 0, 0.5)` | base send `0.18` | elevation floats in the room |

> **v0.3 note:** for the default `'matter'` voice, G7's four-step ladder generalizes to a
> *continuous* spectrum (`genPartials`: EDGE rolloff × elongation hollowness) and G8–G10 become
> threads of the EDGE weave — see [MATTER.md](./MATTER.md) §2. The ladder remains authoritative
> for `data-sonic-wave` overrides and non-matter synth kinds.

## 2. Structure → space & harmony (the page's identity)

| # | Source | Target | Formula | Constants | Research |
|---|--------|--------|---------|-----------|----------|
| S1 | DOM depth `d` (root=0) | distance `positionZ` | `−(1 + 0.7·min(d,10))` | listener at z=0 facing −z | Zahorik distance cues |
| S2 | DOM depth | low-pass cutoff | `max(700, 9000 · 0.82^d)` Hz | floor 700, base 9000, ratio 0.82 | deeper = farther = duller |
| S3 | DOM depth | velocity scale | `vel ×= max(0.55, 0.97^d)` | — | distance loudness |
| S4 | sibling index `i` (among eligible siblings) | scale-step offset | `+(i mod scaleLen)` steps — runs wrap each octave (do-re-mi…-do) so long lists stay melodic | — | earcons: family = motif |
| S5 | `z-index` (resolved, if positioned) | z bonus toward listener | `+clamp(z/50, 0, 1) · 0.8` | — | stacking = closer |
| S6 | heading level `h1…h6` | register shift | `degree −= (7−level) · step·2` (h1 lowest/grandest) | — | mass hierarchy |
| S7 | viewport width `vw` | reverb decay | `lerp(0.6, 4.5, norm(vw, 360, 2200))` s | — | room = viewport (RESEARCH §4.4) |
| S8 | viewport width | reverb wet | `lerp(0.08, 0.32, norm(vw, 360, 2200))` | — | same |
| S9 | hostname | key + scale | §0 | — | T8 sonic identity |

## 3. Role classification → voice family

Determined in order (first match wins). Themes map roles to synth recipes; geometry then bends
the recipe (G7–G11 override oscillator/envelope where the recipe allows).

| Role | Detection | Default articulation | Aurora recipe | Mono | Paper |
|------|-----------|----------------------|--------------|------|-------|
| `toggle` | `input[type=checkbox|radio]`, `[role=switch|checkbox]`, `<summary>` | two-note interval (up=on, down=off, perfect 5th) | triangle blip | filtered tick | pluck |
| `button` | `<button>`, `[role=button]`, `input[type=button|submit]` | single hit | synth, geometry wave | square micro-hit | pluck |
| `link` | `<a href>`, `[role=link]` | short hit, +1 octave | sine blip | tick | bright pluck |
| `input` | `<input>`, `<textarea>`, `<select>`, `[contenteditable]` | sustained while focused; typing ticks | soft triangle pad | low sine | muted pluck |
| `heading` | `<h1>`–`<h6>`, `[role=heading]` | bell, long release | FM bell | sine octave | harmonic pluck |
| `media` | `<img>`, `<video>`, `<svg>`, `<canvas>`, `<picture>` | low thud/pad | membrane | noise tap | low pluck |
| `item` | `<li>`, `<tr>`, `[role=listitem|option|menuitem|tab]` | run member (S4 prominent) | triangle | tick | pluck |
| `container` | `<nav> <section> <article> <aside> <form> <fieldset>`, `[role=navigation|…]`, generic divs with ≥2 eligible children | strum of children on activate | — (children sound) | — | — |
| `text` | `<p>`, `<blockquote>`, leaf text blocks | quiet pad on hover only | airy sine | — (silent) | soft |

## 4. Interaction → excitation

| # | Event | Sound | Velocity | Notes |
|---|-------|-------|----------|-------|
| I1 | `pointerenter` (interactive roles) | preview note | 0.25 | throttle 80 ms/element |
| I2 | `pointerdown` / `click` (kbd) | full note | 0.75 | dedupe 80 ms window |
| I3 | activate on `container` | strum visible children L→R | 0.5 | ≤ 6 children, 60 ms apart |
| I4 | `focusin` (Tab) | preview, slightly longer | 0.35 | keyboard parity (a11y) |
| I5 | `keydown` in text input | tick; degree rises with `value.length` | 0.15 | the field "fills up" audibly; 30 ms throttle |
| I6 | toggle change | up/down 5th | 0.5 | checked = up |
| I7 | element enters viewport | airy whisper | 0.12 | global bucket: ≤ 6/s, skip initial scan |
| I8 | scroll | listener rides (rect refresh); velocity → future air swell (P1) | — | rAF-throttled |
| I9 | `pointermove` | listener position target (lerp 0.12/frame) | — | mode `listener:'pointer'` |
| I10 | `deviceorientation` | listener offset (γ→x ±4 m, β→y ±2 m) | — | iOS permission via chip tap |
| I11 | shake (`devicemotion` ‖a‖ > 18 m/s², 600 ms refractory) | strum all visible L→R | 0.5 | the "gravity strum" |
| I12 | `start()` | intro motif: ≤ 5 landmarks by area desc, DOM order, 90 ms apart | 0.3 | the site's signature (S9) |
| I13 | ambience | room tone (filtered noise, −46 dB, cutoff `lerp(400, 1400, vwT)`) + sparkle loop (every 2 s, p=0.4, random visible element) | 0.07 | scaled by `ambient` option (default 0.12; 0 = off) |
| I14 | `visibilitychange` hidden | fade master to −∞ in 0.3 s; restore on visible | — | never sound in background |

## 5. Authoring overrides (always win over inference)

- `data-sonic="off"` — silence element + subtree (scanner prunes).
- `data-sonic="quiet"` — velocities ×0.4 for element + subtree.
- `data-sonic-note="E4"` — pin pitch (still placed/spatialized normally).
- `data-sonic-wave="square|sawtooth|triangle|sine"` — pin waveform.
- `data-sonic-role="button|…|text"` — pin role.
- JS option `key`, `theme`, `listener`, `ambient`, `volume`, `panning`, `spatial`, `perceptual`,
  `maxVoices`, `reverb`.
- **CSS custom properties (v0.4 — the aural stylesheet, [CHROMA.md](./CHROMA.md) §4):**
  `--sonic` (`off|quiet`), `--sonic-note`, `--sonic-wave`, `--sonic-role`, `--sonic-extent`
  per element (inheriting!), `--sonic-key` and `--sonic-tempo` at the root.
  Priority: `data-sonic-*` attribute > custom property > inference.

## 5.5 Sphere mappings (v0.2)

The ambisonic engine adds spherical source properties — azimuth/elevation from screen position,
**extent from size** (SP4: big elements wrap around the listener), **directivity from roundness**
(SP5: kiki beams, bouba radiates). Those rows live in [SPATIAL.md](./SPATIAL.md) §4 with the same
canon status as this file.

## 6. Master bus & safety rails

```
voice lane: Synth → Filter(lowpass) → Panner3D ─┬─→ dry Gain ──→ Master Volume(−10 dB) → Limiter(−1 dB) → out
                                                └─→ send Gain → Reverb(decay S7, wet 1.0 internal) ┘
```

- Limiter −1 dBFS: clipping is a bug, by definition.
- Master volume option `volume` (dB, default −10).
- Panner: `panningModel:'HRTF'` (option `'equalpower'`), `distanceModel:'inverse'`,
  `refDistance 1`, `rolloffFactor 0.4` (gentle — distance shading, not silence).
- Reverb regeneration on resize: debounced 400 ms.
- `prefers-reduced-motion: reduce` → `ambient ×0`, all velocities ×0.7 (unless options set
  explicitly).
- Mute: localStorage `sonarium:muted` = `"1"`; checked before any unlock; chip reflects state.

## 7. Worked example

A 240×56 px button at viewport position (80% x, 90% y), `border-radius: 28px` (pill), depth 6,
3rd of four siblings, on a 1440 px-wide page whose hostname hashes to D pentMinor:

- G1: x t=0.8 → posX = +4.8 m (right). G2: y t=0.9 → posY = −3.2 m (low). S1: posZ = −5.2.
- G6: r = 28/(56/2) = 1.0 → **sine**, attack 45 ms, Q 0.5 (G7–G9), no pitch nudge (G10).
- G4: small-ish area → degree ≈ 0.78 high… minus S4 (+2 steps from index) etc. → quantized to,
  say, **F4** in D pentMinor. G11: e = 4.29 → duration ≈ 0.37 s.
- S2: cutoff = 9000·0.82⁶ ≈ 2740 Hz, with G3 tilt ×0.74 → ≈ 2030 Hz.
- S7/S8: decay ≈ 2.9 s, wet ≈ 0.22 — a medium hall, button sounding soft, low-right, mid-far.
- `describe(el)` must output exactly this chain of reasons.
