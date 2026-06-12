# Research Foundations

> Why Sonarium's mappings are what they are. This document grounds every design decision in
> cross-modal perception research, the author's master's thesis, and forty years of auditory
> display literature. When a mapping is challenged, the argument happens here first, then in
> [MAPPING.md](./MAPPING.md), then in code.

## 1. Primary source: the author's thesis

Che-Yu Wu, *Sound and Cognition — Building an experimental web-based visual music composing tool*,
M.S. Integrated Digital Media, NYU Tandon School of Engineering, May 2020.

The thesis investigated how people without musical training map **shapes to sounds**, through
interviews, drawing experiments ("draw the sound of eating a cookie / a rainstorm / a door knock"),
and a sound-mismatch experiment, then built a web-based node patcher (p5.js + Tone.js) exposing
musical concepts through everyday language (emotions, animals, emojis instead of ADSR and EQ).

### 1.1 Empirical findings carried into Sonarium

| # | Thesis finding | Evidence in thesis | Sonarium mapping |
|---|---|---|---|
| T1 | Sharper shapes ↔ higher-frequency, harsher sounds (Kiki/Bouba) | Köhler replication discussion; interviewee drawings | `roundness()` → waveform (square→sine), attack, filter Q, pitch nudge |
| T2 | Larger shapes are described as **louder** and **lower** | Interview synthesis ("size of the shape") | log-area → velocity bonus + inverted scale degree |
| T3 | Shape **length** ↔ sound **duration**; "long curvy lines = wind, flute, continuous vibration" | Drawing experiments | elongation → note duration |
| T4 | **Closed** shapes = short "particle" sounds; **open** shapes = continuous | Drawing experiments (cookie = shattered squares; rainstorm = boundaryless curves) | role classification: buttons/toggles percussive, inputs/containers sustained |
| T5 | Warm colors ↔ energetic/happy; cold ↔ sad/slow; color ↔ spectral distribution | Interview synthesis ("color of the shape") | Phase 1: luminance → filter cutoff; hue warmth → detune/chorus |
| T6 | Drawn sound shapes cluster into four vocabularies: **Curve, Block, Steps, Volumes** | Mismatch experiment | articulation set: glide (curve), hit (block), arpeggio (steps), pad (volume) |
| T7 | "Rules are the basic foundation of all kinds of creations" — constraint turns noise into music | Conclusion chapter | the Musical Quantizer: nothing sounds without scale quantization |
| T8 | Audio branding: signature sonic identity per company | Introduction (project origin) | deterministic hostname → key/scale/motif |
| T9 | Web distribution lowers the barrier and grows creative communities | "Why Web based" chapter | one-script-tag IIFE; themes as shareable JSON; future remix registry |
| T10 | Tools should explain themselves in daily language | Whole UX argument | `describe(el)` returns human-readable reasons |

### 1.2 What the thesis did *not* resolve (open threads Sonarium inherits)

- Emotion filters beyond happy/sad (the "Lazy filter" idea: probabilistic delays, softening,
  drops). → Sonarium P1+ "articulation moods" research.
- Multiplayer/real-time collaboration (thesis V7, planned but unbuilt). → Sonarium P2.
- A module-sharing platform ("npm for sound systems"). → Sonarium P3 theme registry.

## 2. Cross-modal correspondence literature

Sonarium's mappings sit on well-replicated psychology, not taste:

- **Köhler (1929/1947); Ramachandran & Hubbard (2001)** — the Kiki/Bouba effect: ~95% of subjects
  map jagged shapes to plosive/sharp sounds and round shapes to soft/sonorant ones.
- **Bremner, Caparos, Davidoff, de Fockert, Linnell & Spence (2012)** — the Himba of Namibia make
  the *same* shape–sound matches as Westerners (but different shape–taste matches): shape–sound
  correspondence is a strong candidate for a cultural universal — crucial for a global web library.
  (Cited in the thesis references.)
- **Pitch–height association (Pratt 1930; Spence 2011 review)** — higher spatial position ↔ higher
  pitch/brightness across cultures and ages. Sonarium maps screen-y to elevation *and* brightness
  tilt rather than raw pitch (pitch is reserved for size, which has the stronger loudness/mass
  correspondence), a deliberate compromise documented in MAPPING.md §2.
- **Size–pitch / size–loudness (Spence 2011; Parise & Spence 2009)** — big things resonate low and
  loud. Physical resonance is the likely common cause; it makes the mapping *predictable without
  learning*, which is the property Sonarium optimizes for everywhere: **zero-training legibility**.
- **Auditory distance cues (Zahorik 2002)** — loudness, direct-to-reverberant ratio, and high-
  frequency attenuation signal distance. Sonarium's depth mapping uses all three (velocity scale,
  per-voice reverb send vs dry, low-pass by DOM depth), which is why nesting reads as "farther in."

## 3. Auditory display & interface-sound lineage

- **Gaver (1986, 1989) — Auditory Icons / the SonicFinder:** everyday-sound metaphors for desktop
  events; files "thud" by size. Sonarium generalizes the *size→weight* idea but synthesizes rather
  than samples.
- **Blattner, Sumikawa & Greenberg (1989) — Earcons:** abstract musical motifs encode hierarchy
  through systematic variation. Sonarium's sibling-index→scale-degree and depth→register are
  earcon theory applied to a *live DOM tree* instead of a designed menu tree.
- **Brewster (1994+)** — earcon guidelines (register, timbre, rhythm separation) inform why roles
  get distinct synth families (button=pluck-like, heading=bell, input=held tone).
- **Kramer (1994); ICAD community** — sonification framing: parameter mapping with perceptual
  scaling (log not linear, JNDs) — Sonarium's log-area and exponential depth-cutoff follow this.
- **CSS2 Aural Stylesheets / CSS3 Speech Module (W3C)** — the web's abandoned acoustic layer
  (`cue`, `voice-family`, spatial `azimuth`!). CSS2 §19 even specified `azimuth`/`elevation` —
  the web *intended* spatial UI sound in 1998 and never shipped it. Sonarium implements the dream
  with Web Audio, and P1's `--sonic-*` custom properties deliberately echo that syntax.
- **Game audio middleware (Wwise, FMOD)** — the "objects in a room + listener + buses" model is
  standard in games; Sonarium ports the model to the DOM, where the scene graph is the DOM tree
  and the camera is the cursor/viewport.
- **Timbre spaces & auditory fusion (v0.3)** — Grey's and McAdams' multidimensional timbre
  scaling (attack / spectral centroid / flux are *the* perceptual axes) and Bregman's auditory
  scene analysis (co-varying cues fuse into one object) justify the Matter weave: macro
  visual dimensions drive bundles of co-varying parameters instead of isolated knobs.
  Full treatment: [MATTER.md](./MATTER.md).
- **Ambisonics & IRCAM Spat (v0.2)** — Gerzon's periphony, Daniel's HOA theory, the AmbiX
  convention, Jot's Spat architecture and Jullien's perceptual factors (presence, warmth,
  envelopment…) ground the v0.2 spatial engine; full treatment and citations in
  [SPATIAL.md](./SPATIAL.md). Browser prior art (Google Omnitone, Resonance Audio) renders
  ambisonics but does not *derive the scene from the page* — that remains Sonarium's territory.
- **Modern web toys** — Patatap (Jono Brandel & Lullatone) and Typatone proved that keystroke-level
  audiovisual mapping delights mainstream users; Blokdust and Scratch (both discussed in the
  thesis) prove shareable browser instruments build communities. None of them *read an existing
  page* — that's Sonarium's unclaimed territory (prior-art scan 2026-06: data-sonification
  libraries only: Fluid sonification core, athersharif/sonifier, Apple Audio Graphs).

## 4. Perceptual engineering decisions

Decisions that follow from the literature rather than from code convenience:

1. **Quantize everything (T7).** Raw parameter→frequency mapping produces inharmonic chaos within
   seconds of browsing. Western-scale quantization (pentatonic default: no semitone clashes)
   guarantees consonance even when many elements sound together. Scale set chosen for
   cross-cultural safety: pentatonics appear in Chinese, West African, Celtic, Andean traditions.
2. **Pitch belongs to size, not to y-position.** Both correspondences exist; size–pitch wins the
   conflict because (a) y already maps to literal elevation via the panner — duplicating it onto
   pitch would waste a channel; (b) size–pitch carries the mass/resonance metaphor that makes big
   CTAs feel "heavy". y gets the *brightness tilt* (a weaker, compatible cue).
3. **HRTF over equal-power by default.** RQ2 (eyes-free locatability) is a core claim; HRTF
   azimuth error is roughly half of intensity-panning error in front-field tasks. Perf fallback
   exists (`panning:'equalpower'`).
4. **The room is the viewport, not the document.** Reverb from *viewport* width means the same
   site feels intimate on a phone and grand on a desktop — device context becomes acoustic
   context for free. Document height instead would conflate length-of-content with size-of-space.
5. **Quiet, sparse, decaying.** Annoyance is the field's graveyard (every prior "sonified UI"
   demo died by fatigue). Defaults: −10 dB master, hover previews at vel 0.25, ambience at 0.12,
   rate-limited appearance sounds, P1 adaptive ducking. The mute chip is one tap and persistent.

## 5. Experiment designs (for /lab, P1)

Reusing the thesis methodology, instrumented:

- **E1 Mismatch test (RQ1):** show a button (parameterized roundness r ∈ {0,.33,.66,1}), play two
  candidate voices (matched/mismatched waveform), 2AFC "which sounds like this button?". Success
  criterion >70% matched choice; per-mapping Bayesian update of constants.
- **E2 Pointing test (RQ2):** hidden element sounds; participant clicks where they hear it;
  log angular error vs panning model. Mobile + headphones cohort separated.
- **E3 Longitudinal mute telemetry (RQ3):** opt-in anonymous; time-to-mute distribution per
  default loudness; tune until median session never reaches for mute.
- **E4 Identity recognition (RQ4):** after a week of browsing two Sonarium sites, play motifs,
  ask which site; chance = 50%, target > 75%.
- **E5 Culture replication (RQ5):** E1 across EN/中文 communities (author's 12k-student creative-
  coding community in Taiwan is the recruitment pool).

## 6. References

- Wu, C.-Y. (2020). *Sound and Cognition — Building an experimental web-based visual music
  composing tool.* M.S. thesis, NYU Tandon. <https://cheyuwu.com/thesis>
- Köhler, W. (1947). *Gestalt Psychology.* Liveright.
- Ramachandran, V. S., & Hubbard, E. M. (2001). Synaesthesia — a window into perception, thought
  and language. *Journal of Consciousness Studies*, 8(12).
- Bremner, A. J., Caparos, S., Davidoff, J., de Fockert, J., Linnell, K. J., & Spence, C. (2012).
  "Bouba" and "Kiki" in Namibia? *Cognition*, 126(2).
- Spence, C. (2011). Crossmodal correspondences: A tutorial review. *Attention, Perception, &
  Psychophysics*, 73(4).
- Parise, C. V., & Spence, C. (2009). "When birds of a feather flock together": synesthetic
  correspondences modulate audiovisual integration. *PLoS ONE*, 4(5).
- Zahorik, P. (2002). Assessing auditory distance perception using virtual acoustics. *JASA*, 111(4).
- Gaver, W. W. (1989). The SonicFinder: An interface that uses auditory icons. *Human-Computer
  Interaction*, 4(1).
- Blattner, M. M., Sumikawa, D. A., & Greenberg, R. M. (1989). Earcons and icons: Their structure
  and common design principles. *Human-Computer Interaction*, 4(1).
- Brewster, S. A. (1994). *Providing a structured method for integrating non-speech audio into
  human-computer interfaces.* PhD thesis, University of York.
- Kramer, G. (Ed.) (1994). *Auditory Display: Sonification, Audification, and Auditory Interfaces.*
  Addison-Wesley / ICAD.
- W3C. CSS2 §19 Aural style sheets (1998); CSS Speech Module (2012/2020).
  <https://www.w3.org/TR/CSS2/aural.html>, <https://www.w3.org/TR/css-speech-1/>
- Mann, Y. *Tone.js.* <https://tonejs.github.io/>
- Sievers, B. *A Young Person's Guide to the Principles of Music Synthesis.*
  <http://beausievers.com/synth/synthbasics/>
- Assayag, G., et al. (1999). Computer-Assisted Composition at IRCAM: From PatchWork to OpenMusic.
  *Computer Music Journal*, 23(3).
