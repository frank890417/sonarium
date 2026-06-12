# The Pulse — the page as a score

> v0.4 "Alive 活", thread 2 of 2 (the other: [CHROMA.md](./CHROMA.md)). Until now Sonarium was
> purely reactive — sound happened *at* events. Music is temporal organization (the thesis's
> core subject: melody, tempo, phrase). This spec gives the page a pulse, makes the room answer
> interactions *in time*, turns the ambience into phrases that read the layout, and adds the
> calm system that keeps long sessions humane. Code twin: `src/math/pulse.ts` (pure, tested).

## 0. The latency invariant (never break this)

**The primary sound of any user action is NEVER quantized, delayed, or scheduled.** It fires
within the < 30 ms budget (PLAN R4), exactly as in v0.1–v0.3. The grid expresses itself only
through *secondary* voices: echoes, phrases, strums' internal spacing, the intro motif. Feel
first, meter second.

## 1. Tempo — the layout sets the pace (P1–P2)

| # | Source | Formula |
|---|---|---|
| P1 | element density `n` = tracked-element count at start | `base = lerp(66, 104, clamp(n/120, 0, 1))` bpm |
| P2 | page warmth `w` ([CHROMA.md](./CHROMA.md) CH8) | `bpm = round(base · lerp(0.94, 1.06, w))`, clamp [56, 116] |

A sparse portfolio breathes at ~68 bpm; a dense dashboard ticks at ~100. `--sonic-tempo`
overrides. `Tone.Transport` runs at this bpm from `start()` (it also drives I13 ambience).

## 2. Echoes — the room answers in time (P3)

On every full **hit** with velocity ≥ 0.55, schedule one echo of the same element:
**+12 semitones, velocity ×0.22, at the next 8th-note boundary** at least 80 ms away
(`nextGridOffset(nowInGrid, spb/2, 0.08)`); articulation `'echo'`, same spatial placement.
The immediate hit is the touch; the echo is the room's metered reply — interaction becomes
call-and-response with the page's pulse, without costing a millisecond of feel (§0).

## 3. Phrases — the ambience reads the page (P4)

The v0.1 random sparkle is replaced by a **phrase engine** (one `Tone.Loop` per measure):

- Each bar, with probability 0.55: take the visible elements **in reading order**
  (sorted by `(row ≈ top/80, left)`), window them by scroll progress, pick a run of 2–4
  consecutive elements, and play them on 8th-note offsets at velocity ≈ 0.07·ambience.
- The melody is therefore *the layout itself*, in the page's key, at the page's tempo — scrolling
  moves the playhead through the score. Articulation `'phrase'`; rate-limited by design (≤ 4
  notes/bar); silent when `ambient: 0`, hidden tabs, or muted.

Strums (I3/I11) become metered: internal spacing = a 32nd note (`60/bpm/8` s) instead of a fixed
60 ms — at 90 bpm that's ~83 ms, same gesture, now *in* the groove. The intro motif (I12) walks
16th notes at the page's tempo.

## 4. The calm system — sounds that repeat, recede (P5)

Fatigue is the death of sound UX (RQ3). Per element, an activity count decays over time:

```
count ← max(0, count − Δt/2000ms) + 1   on each excite
duck  = max(0.4, 0.85^count)             velocity ×= duck
```

The 6th rapid press of the same button sounds at ~40% — present, polite. Motifs, echoes and
phrases are exempt (already quiet); hits, previews and ticks duck. Fully recovered after ~12 s
of leaving an element alone. Pure functions `decayCount` / `duckFactor`, tested.

## 5. Feelability acceptance (extends MATTER.md §4)

| Do | Must hear |
|---|---|
| click a button once, hard | immediate hit, then a quiet high reply *on the beat* |
| leave the page idle with ambience on | an occasional short melody that follows the layout left→right, top→bottom |
| scroll to a different section, idle again | the phrase material changes (the playhead moved) |
| mash one button eight times | it politely fades back, never disappears; stops mashing → recovers |
| open a dense app vs a sparse essay | the dense one pulses noticeably faster |

## 6. Future (specified, not promised)

- Phrase grammar: containers as bars (a nav = one motif), heading levels as cadences.
- Swing/groove parameter; per-theme rhythmic personalities.
- `requestIdleCallback`-driven "rests" — phrases avoid moments of heavy interaction.
- Beat-aligned visual ripples (demos already listen to `trigger`; add `'phrase'` styling).
