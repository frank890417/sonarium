# The Spatial Spec — Ambisonics & the Sound Sphere (聲球)

> v0.2 "Spherical". This document specifies Sonarium's IRCAM-Spat-inspired spatial engine:
> every element becomes a **sound sphere** (聲球) encoded into one **ambisonic field** that
> surrounds the listener; perceptual factors manage the DSP behind a simple surface, and the
> whole field rotates with the body (mouse / device attitude). Like MAPPING.md, this file and
> `src/spatial/` are one artifact — change both or neither (PLAN.md Invariant #3 applies).

## 0. Why ambisonics (and why this is the Spat move)

v0.1 spatialized each voice with its own HRTF `PannerNode`: cost grows per voice, "the listener"
is a point you translate, and there is no notion of a *field*. The Spat architecture inverts
this:

```
v0.1  source → HRTF panner ────────────────┐  (N sources = N HRTF convolutions)
                                            Σ → out

v0.2  source → FOA encoder (4 gains) ──┐
      source → FOA encoder ────────────┤Σ→ [W X Y Z] → rotate (3×3) → decode (8 virtual
      room (reflections, diffuse) ─────┘    ambisonic bus              speakers → HRTF) → out
```

- **Constant render cost.** Encoding is 4 multiplies per source; binaural rendering is 8 fixed
  HRTF panners *total*, however many elements sound.
- **The field is a first-class object.** Rotating the whole acoustic sphere = one 3×3 matrix —
  which is exactly what device tilt and "looking around" with the mouse need. Translation-style
  listener movement was v0.1's approximation; rotation is the ambisonic-native gesture.
- **Sources gain spherical properties** — extent (apparent width) and directivity — which map
  beautifully onto element geometry (§4).
- **Compatibility.** The internal field is standard **AmbiX (ACN/SN3D)**: Sonarium fields could
  later be exported, exchanged, or decoded by any ambisonic toolchain (Omnitone, Reaper, Spat).

## 1. Conventions (never mix these)

- **Coordinate frame:** right-handed, **+x forward (out of the screen toward the viewer's
  front), +y left, +z up** (AmbiX / acoustics standard).
- **Azimuth φ:** counter-clockwise from front; **+φ = left**. **Elevation θ:** +θ = up.
- **Channel order:** ACN — `0:W, 1:Y, 2:Z, 3:X`.
- **Normalization:** SN3D. First-order encoding gains for a plane wave from (φ, θ):

```
W = 1
Y = sin φ · cos θ
Z = sin θ
X = cos φ · cos θ
```

- Screen-space note: screen-right maps to **negative** azimuth (right of the listener), i.e.
  `φ = −(2tx − 1)·AZ_MAX` — the sign lives in ONE place, `sphereFromRect()` (§4), and is tested.

## 2. Encoding, extent, directivity (the sound sphere)

Each lane's voice passes through a **SourceEncoder**: four `GainNode`s feeding the W/Y/Z/X buses.

- **Point source:** gains exactly as §1.
- **Extent σ ∈ [0,1]** (apparent angular size — the "radius" of the 聲球): blend the directional
  components toward the omni channel:

```
W' = 1 + 0.41·σ          (energy compensation as the source widens)
Y',Z',X' = (1 − σ) · (Y,Z,X)
```

  σ=0 is a point; σ=1 surrounds the listener completely (pure W). Implemented in
  `foaGains(az, el, extent)` — pure, tested.
- **Directivity δ ∈ [0,1]** (1 = focused beam at the listener, 0 = omni radiator): affects the
  *sound*, not the encoding — focused sources are more present and brighter:
  `directGain ×= lerp(0.75, 1.1, δ)`, `reverbSend ×= lerp(1.35, 0.8, δ)`,
  high-shelf `+lerp(−1.5, +1.5, δ)` dB at 4 kHz (folded into the lane filter stage as a cutoff
  nudge in v0.2: `filterHz ×= lerp(0.85, 1.15, δ)`).
- **Distance d:** stays where v0.1 put it (depth → velocity & low-pass = air absorption analog)
  plus the direct-to-reverberant ratio: `reverbSend += 0.05·min(d,10)` (farther = wetter,
  Zahorik's D/R cue).

## 3. The field: rotation and decoding

### 3.1 Rotation

The bus applies `R = Rz(yaw)·Ry(pitch)·Rx(roll)` to the (X, Y, Z) channel triple (W invariant) —
nine `GainNode`s as a live 3×3 matrix, ramped (20 ms) to avoid zipper noise.

```
Rz(ψ): X' = cosψ·X − sinψ·Y ;  Y' = sinψ·X + cosψ·Y       (yaw, about +z)
Ry(θ): X' = cosθ·X + sinθ·Z ;  Z' = −sinθ·X + cosθ·Z      (pitch, about +y)
Rx(ρ): Y' = cosρ·Y − sinρ·Z ;  Z' = sinρ·Y + cosρ·Z       (roll, about +x)
```

**Look semantics:** turning your head right by α must bring right-side sources to the front, so
the *field* rotates by `yaw = +α` with our sign conventions? No — by **−α**. The FieldRig owns
this sign exactly once: `field.lookAt(yawRight, pitchUp)` applies `Rz(−yawRight)·Ry(+pitchUp)`†.
The invariant is encoded as a test: a source at screen-right (φ<0) plus `lookAt(yawRight>0)`
must move toward φ≈0 (front).

† pitch sign likewise fixed by test: looking up brings overhead sources frontward.

- **Pointer mode (desktop):** cursor x → look yaw ±40°, y → look pitch ±20°, lerped per frame.
- **Device mode (mobile):** orientation γ → yaw, β−40° → pitch (the v0.1 tilt ranges).
- Rotation is exact and lossless at any order — this is the structural reason ambisonics wins
  for embodied input.

### 3.2 Binaural decoding — virtual speakers through native HRTF

FOA is decoded to **8 virtual speakers on cube vertices** `(±1, ±1, ±1)/√3` (full-sphere
coverage incl. elevation), each rendered by one **fixed** Web Audio HRTF `PannerNode` at that
direction (×2.5 m). No HRIR assets, no convolver management, no new dependencies — the browser
does the binaural part; we do the field math.

Sampling (projection) decoder with max-rE weighting, SN3D input → speaker m at unit vector
`(xm, ym, zm)`:

```
sm = (1/M) · [ g0·W + 3·g1·(X·xm + Y·ym + Z·zm) ]      M = 8, g0 = 1, g1 = 1/√3 (max-rE, 3D)
```

(The 3 is the N3D re-normalization of first-order SH; g1 trades source sharpness against
side-lobe energy.) Properties enforced by test, not by trust:
- decode(encode(dir at a speaker)) peaks at that speaker;
- total decoded energy is direction-independent within ±1.5 dB (energy flatness).

`decoder: 'stereo'` fallback (no HRTF, e.g. `equalpower` budget devices): two virtual cardioids
at ±90°: `L = W/2 + Y/2`, `R = W/2 − Y/2` — loses elevation, keeps lateral imaging.

### 3.3 Room in the field (the Spat room model, minimal honest version)

- **Early reflections:** mono tap of all direct sources → 4 delays (times scale with viewport
  room size: 13/19/27/34 ms · decay/2.5) each encoded at mirror-ish directions
  (φ = ±110°, θ = ±30°), gain `0.22·roomPresence`.
- **Diffuse tail:** the existing `Tone.Reverb` output (stereo) feeds two encoders at φ = ±120°
  whose **extent = envelopment** — envelopment 0 keeps the tail frontal-ish; 1 dissolves it into
  pure W, wrapping the listener. This is Spat's envelopment control reduced to one parameter.

## 4. Sphere mappings (new canon rows — same status as MAPPING.md)

| # | Source | Target | Formula | Research |
|---|--------|--------|---------|----------|
| SP1 | center x | azimuth | `φ = −(2tx−1)·70°` | page laid on the front hemisphere |
| SP2 | center y | elevation | `θ = (1−2ty)·45°` | screen-top = up, literally |
| SP3 | DOM depth d | distance | as v0.1 (S1–S3) + D/R: `send += 0.05·min(d,10)` | Zahorik 2002 |
| SP4 | area (sizeT) | **extent σ** | `σ = 0.05 + 0.75·sizeT^1.2` | big things wrap around you (T2 extended to space) |
| SP5 | roundness r | **directivity δ** | `δ = 1 − r` (sharp beams, round radiates) | Kiki/Bouba in the spatial domain |
| SP6 | viewport width | early-reflection times | `× lerp(0.6, 1.6, vwT)` | room = viewport (S7 extended) |
| SP7 | `data-sonic-extent` | extent override | clamp [0,1] | authoring |

## 5. Perceptual factors (the spat5.oper surface)

Five factors, options on `create()` and per-engine setters, each ∈ [0,1] (defaults in **bold**):

| Factor | Default | Maps to |
|---|---|---|
| `presence` | **0.7** | direct-path gain `lerp(0.5, 1.2, p)` — how *here* sources feel |
| `roomPresence` | **0.5** | early-reflection + reverb send master `lerp(0, 1.6, p)` |
| `envelopment` | **0.55** | diffuse-tail extent (§3.3) + tail level `lerp(0.7, 1.25, p)` |
| `warmth` | **0.5** | master low-shelf at 250 Hz, `lerp(−3, +3, p)` dB |
| `brilliance` | **0.5** | master high-shelf at 4 kHz, `lerp(−4, +3, p)` dB |

These are deliberately the *names Spat users know* (Jullien/IRCAM perceptual factor research);
they must remain perceptually monotonic (more warmth = warmer, always) and live in
`src/spatial/perceptual.ts` as pure formulas.

## 6. Architecture & fallback policy

```
src/spatial/
├── sh.ts          pure: foaGains(az, el, extent), DEG, sphere helpers      [tested]
├── rotation.ts    pure: rotationMatrix(yaw, pitch, roll) → 3×3             [tested]
├── decoder.ts     pure: CUBE_LAYOUT, decodeMatrix(layout) → M×4            [tested]
├── sphere.ts      pure: sphereFromRect, extentFromSize, directivityFromRoundness [tested]
├── perceptual.ts  pure: factor → DSP param formulas                        [tested]
├── encoder.ts     SourceEncoder node group (4 gains into the bus)
├── bus.ts         AmbisonicBus: W/Y/Z/X buses, rotation matrix, virtual-speaker decode
└── room-foa.ts    early reflections + diffuse-tail encoders (envelopment)
```

- Engine option `spatial: 'ambisonic' | 'panner'` — **ambisonic is the default**; `'panner'`
  keeps the v0.1 per-voice path (also the automatic fallback if bus construction throws).
  `VoicePool` talks to either through one interface: `SpatialBackend.createOutput()` →
  `{ input, setPlacement(profile), dispose }`.
- Layer rules extend: `src/spatial/{sh,rotation,decoder,sphere,perceptual}.ts` import nothing
  (pure, portable — they are the future WebXR/worklet core); `encoder/bus/room-foa` import Tone
  only.
- The legacy `ListenerRig` serves `'panner'`; the **FieldRig** serves `'ambisonic'`.

## 7. Future (specified so the path is visible, not promised)

- **HOA (order 2–3):** `sh.ts` already exposes the general real-SH signature; needs per-order
  max-rE weights, ≥16-speaker layouts (or SH-domain binaural via worklet+MagLS HRIR), and
  Ivanic–Ruedenberg rotation recurrence. The bus channel count is the only structural change.
- **AudioWorklet decode** with measured HRIRs (SADIE II) for externalization beyond native HRTF.
- **Near-field compensation** for sources inside the speaker radius; **head tracking** via
  webcam/WebXR pose feeding `FieldRig.lookAt` (the API is already the right shape).
- **Field export**: record the 4-channel bus to an AmbiX `.wav` — "save this page's sound".

## 8. References

- Gerzon, M. A. (1973). Periphony: With-height sound reproduction. *JAES* 21(1) — ambisonics' origin.
- Daniel, J. (2000). *Représentation de champs acoustiques…* PhD, Paris 6 — HOA encoding/decoding, max-rE.
- Zotter, F., & Frank, M. (2019). *Ambisonics* (Springer, open access) — the modern reference; decoder weights & energy measures used here.
- Nachbar, C., Zotter, F., Deleflie, E., & Sontacchi, A. (2011). AmbiX — a suggested ambisonics format (ACN/SN3D).
- Jot, J.-M. (1999). Real-time spatial processing of sounds for music, multimedia and interactive human-computer interfaces. *Multimedia Systems* 7 — Spat's architecture.
- Jullien, J.-P. (1995). Structured model for the representation and the control of room acoustical quality. *ICA* — the perceptual factors (presence, warmth, envelopment…).
- Carpentier, T., Noisternig, M., & Warusfel, O. (2015). Twenty years of Ircam Spat. *ICMC*.
- Ivanic, J., & Ruedenberg, K. (1996). Rotation matrices for real spherical harmonics. *J. Phys. Chem.* 100 — the HOA rotation path.
- Google **Omnitone** (FOA/HOA binaural renderer for Web Audio) & **Resonance Audio** Web SDK — prior art for browser ambisonics; Sonarium differs by deriving the *scene itself* from the DOM.
