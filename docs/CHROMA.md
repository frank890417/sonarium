# The Chroma Weave — color is mood

> v0.4 "Alive 活", thread 1 of 2 (the other: [PULSE.md](./PULSE.md)). Color was the last silent
> visual dimension. This spec weaves it at two scales: **per element** (a color tints its voice)
> and **per page** (the palette chooses the musical *mode* — design becomes tonality).
> Code twin: `src/math/chroma.ts` (pure, tested). Canon status equal to MAPPING/SPATIAL/MATTER.

## 0. Research grounding

The thesis interview synthesis (T5): *"warmer colors map to a more energetic and happier sound,
colder colors to sad and slow sounds; color can represent both frequency combinations and speed."*
Cross-modal literature agrees: hue–temperature associations are robust (warm/cool is one of the
few color metaphors that replicates across cultures), luminance↔pitch/brightness and
saturation↔auditory "richness/intensity" correspondences appear consistently (Spence 2011 review;
Palmer et al. 2013 music–color associations: faster/major music ↔ warmer, more saturated colors —
we run that mapping in reverse). As everywhere in Sonarium: monotonic, explainable, quiet.

## 1. Color analysis (pure)

Computed styles give `rgb()/rgba()`. We derive HSL plus:

- **warmth** `w ∈ [0,1]` — cosine distance of hue from 30° (orange):
  `w = 0.5 + 0.5·cos((h − 30°)·π/180)`. Red/orange/yellow ≈ 1, cyan/blue ≈ 0, magenta/green ≈ 0.5.
  Desaturated colors regress to neutral: `w ← lerp(0.5, w, min(1, s·2))` (a grey is not "cold").
- **luminance** `l` and **saturation** `s` from HSL directly.
- Element color choice: text-ish roles (`text`, `heading`, `link`) read `color`; everything else
  reads `background-color`, walking up ≤ 6 ancestors past transparent backgrounds, falling back
  to the page color. (Impure walk lives in `profile.ts`; parsing stays pure.)

## 2. Element weave (CH1–CH5)

| # | Source | Target | Formula | Feel |
|---|---|---|---|---|
| CH1 | luminance `l` | filter brightness | `filterHz ×= lerp(0.78, 1.22, l)` | dark UI sounds dark |
| CH2 | luminance `l` | velocity | `vel ×= lerp(0.92, 1.06, l)` | bright lifts, gently |
| CH3 | warmth `w` | attack scale | `attackS ×= lerp(1.18, 0.82, w)` | warm = energetic onset (T5) |
| CH4 | warmth `w` | sub level bonus | `subShimmer.level += 0.08·w` (when sub, not shimmer) | warm = full-bodied |
| CH5 | saturation `s` | spectral richness | `genPartials(edge, e, richness = 0.35·s)` — richness subtracts from the rolloff exponent | vivid color = vivid spectrum |

All five ride the same trigger (common onset) — they tint the Matter voice rather than adding a
parallel system; chroma is a *glaze* over matter, never a second instrument.

## 3. Page weave — the palette chooses the mode (CH6–CH8)

When `key: 'auto'`:

- **Root pitch-class stays hostname-hashed** (S9 — identity is stable across redesigns).
- **Scale/mode comes from the palette** (body background + body text color, averaged by
  visual weight 0.7·bg + 0.3·text):

| palette | mode | character |
|---|---|---|
| warm (w ≥ 0.55) & bright (l ≥ 0.5) | `lydian` | radiant, open |
| warm & dark | `mixolydian` | golden, grounded |
| cool (w ≤ 0.45) & bright | `dorian` | clear, thoughtful |
| cool & dark | `pentMinor` | deep, nocturnal |
| neutral (0.45 < w < 0.55) | hostname-hashed scale | identity unchanged |

- CH7: **room tone color** — ambience noise cutoff `×= lerp(0.85, 1.25, w_page)`.
- CH8: **tempo factor** — warm pages run slightly faster (see [PULSE.md](./PULSE.md) §1).

A redesign from navy to amber *re-tunes the site* — audio branding that listens to the brand.

## 4. The aural stylesheet (`--sonic-*` custom properties)

Authoring moves into CSS, where design systems live. Custom properties **inherit**, so a single
rule themes a subtree — exactly the CSS2 aural-stylesheet dream, implementable today:

```css
:root        { --sonic-key: Eb dorian; --sonic-tempo: 84; }
nav          { --sonic-wave: sine; }
.danger-zone { --sonic: quiet; }
.silent      { --sonic: off; }
.alarm       { --sonic-note: G5; --sonic-extent: 0.1; }
```

Supported in v0.4: `--sonic` (`off|quiet`), `--sonic-note`, `--sonic-wave`, `--sonic-role`,
`--sonic-extent` (element-level, read via computed style), `--sonic-key`, `--sonic-tempo`
(root-level, read once at start). **Priority: `data-sonic-*` attribute > CSS custom property >
inference.** This section is the seed of the P-final standardization proposal.

## 5. Feelability acceptance (extends MATTER.md §4)

| Flip | Must hear |
|---|---|
| crimson card ↔ indigo card (same geometry) | "eager, full, quick" ↔ "cool, spacious, slower onset" |
| vivid ↔ greyed-out button | "rich" ↔ "plain" |
| white-on-dark ↔ dark-on-white page | mode changes character (nocturnal ↔ open); room tone darkens |
| `--sonic: quiet` on a subtree | that region recedes audibly |

## 6. References (adds to RESEARCH.md)

- Palmer, S. E., Schloss, K. B., Xu, Z., & Prado-León, L. R. (2013). Music–color associations
  are mediated by emotion. *PNAS*, 110(22).
- Spence, C. (2011). Crossmodal correspondences. *AP&P*, 73(4) — hue/temperature, lightness/pitch.
- Ward, J., Huckstep, B., & Tsakanikos, E. (2006). Sound–colour synaesthesia: to what extent
  does it use cross-modal mechanisms common to us all? *Cortex*, 42(2).
