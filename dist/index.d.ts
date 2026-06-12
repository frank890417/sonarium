import * as Tone from 'tone';

/** MAPPING.md §0 — the five scales reachable from a hostname hash. */
declare const SCALES: Record<string, readonly number[]>;
interface SiteKey {
    root: number;
    scaleName: string;
    scale: readonly number[];
    label: string;
}
/** Deterministic per-domain musical identity (T8 audio branding). Same host → same key, always. */
declare function siteKey(hostname: string): SiteKey;
/** Parse "D dorian" / "Eb pentMinor" → SiteKey. Returns null when unrecognized. */
declare function parseKey(spec: string): SiteKey | null;
/**
 * The Musical Quantizer (Invariant #2): degree ∈ [0,1] → MIDI note inside the key,
 * laid across OCTAVES octaves from BASE_MIDI + root. stepOffset shifts by whole scale steps
 * (sibling melodies S4, heading registers S6, kiki nudge G10).
 */
declare function degreeToMidi(degree: number, key: SiteKey, stepOffset?: number): number;
declare const midiToFreq: (m: number) => number;
declare function midiToNoteName(m: number): string;

type Wave = 'sine' | 'triangle' | 'sawtooth' | 'square';
type Role = 'toggle' | 'button' | 'link' | 'input' | 'heading' | 'media' | 'item' | 'container' | 'text';
type SynthKind = 'synth' | 'fm' | 'pluck' | 'membrane' | 'noise';
type Articulation = 'hit' | 'preview' | 'tick' | 'strum' | 'whisper' | 'toggle-on' | 'toggle-off' | 'motif';
interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}
/** Spherical source properties — the 聲球 (SPATIAL.md §2, §4). */
interface SphereProps {
    /** Radians, AmbiX convention: +azimuth = left. */
    azimuth: number;
    /** Radians, + = up. */
    elevation: number;
    /** Apparent angular size σ ∈ [0,1] — point source … wraps around the listener. */
    extent: number;
    /** δ ∈ [0,1]: 1 = focused beam at the listener, 0 = omni radiator. */
    directivity: number;
}
/** The spat5.oper surface (SPATIAL.md §5) — all ∈ [0,1], perceptually monotonic. */
interface PerceptualFactors {
    presence: number;
    roomPresence: number;
    envelopment: number;
    warmth: number;
    brilliance: number;
}
/** The contract between page reading (L1) and the audio substrate (L0). See ARCHITECTURE.md §2. */
interface SonicProfile {
    role: Role;
    rect: Rect;
    pan: {
        x: number;
        y: number;
        z: number;
    };
    sphere: SphereProps;
    midi: number;
    freqHz: number;
    degree: number;
    wave: Wave;
    attack: number;
    release: number;
    durationS: number;
    filterHz: number;
    filterQ: number;
    velocityScale: number;
    reverbSend: number;
    synthKind: SynthKind;
    octaveShift: number;
    /** Human-readable provenance of every parameter — describe() truth (PLAN.md Invariant #6). */
    reasons: Record<string, string>;
}
interface VoiceRecipe {
    synthKind: SynthKind;
    /** When set, geometry does not override the waveform (e.g. heading bells stay bells). */
    pinWave?: Wave;
    octaveShift: number;
    baseVelocity: number;
    releaseScale: number;
}
interface Theme {
    name: string;
    roles: Partial<Record<Role, Partial<VoiceRecipe>>>;
    defaults: VoiceRecipe;
}
interface SonariumOptions {
    /** Root element to sonify. Default: document.body */
    root?: Element;
    /** Sound palette. Default 'aurora'. */
    theme?: 'aurora' | 'mono' | 'paper' | Theme;
    /** 'auto' = deterministic per-hostname key (MAPPING.md §0), or e.g. 'D dorian'. */
    key?: string;
    /** Listener mode: cursor as ears, or fixed center. Default 'pointer'. */
    listener?: 'pointer' | 'center';
    /** Ambience level 0..1 (room tone + sparkles). Default 0.12; 0 disables. */
    ambient?: number;
    /** Enable device tilt/shake drivers on mobile. Default true. */
    motion?: boolean;
    /** Autoplay-unlock & mute UI. 'chip' = floating control, 'none' = bring your own. */
    gate?: 'chip' | 'none';
    /** Master volume in dB. Default -10. */
    volume?: number;
    /** Max concurrent voices (pool size). Default 18, hard cap 24. */
    maxVoices?: number;
    /** 'hrtf' (default) or 'equalpower' for low-end devices. */
    panning?: 'hrtf' | 'equalpower';
    /**
     * Spatial engine (SPATIAL.md): 'ambisonic' (default) encodes everything into one rotatable
     * FOA field, Spat-style; 'panner' is the v0.1 per-voice HRTF path (also the auto-fallback).
     */
    spatial?: 'ambisonic' | 'panner';
    /** Spat-style perceptual factors (presence, roomPresence, envelopment, warmth, brilliance). */
    perceptual?: Partial<PerceptualFactors>;
    /** Reverb: 'auto' sizes the room from viewport width, or a fixed decay in seconds. */
    reverb?: 'auto' | number;
    /** Respect prefers-reduced-motion by softening output. Default true. */
    respectReducedMotion?: boolean;
}
type SonariumEvent = 'start' | 'trigger' | 'mute' | 'dispose';
interface TriggerDetail {
    el: Element;
    profile: SonicProfile;
    velocity: number;
    articulation: Articulation;
}

declare const DEFAULT_FACTORS: PerceptualFactors;

/**
 * L0 Acoustic Substrate — VoicePool (ARCHITECTURE.md §4).
 * Profiles are data; voices are rented lanes configured at trigger time. Spatial placement is
 * delegated to the active SpatialBackend (ambisonic field or per-voice panners — SPATIAL.md §6).
 * Imports Tone only; never reads the DOM.
 */

interface VoiceBuses {
    dryIn: Tone.InputNode;
    wetIn: Tone.InputNode;
}
declare class VoicePool {
    private backend;
    private maxVoices;
    private lanes;
    constructor(backend: SpatialBackend, maxVoices: number);
    private createSynth;
    private createLane;
    private acquire;
    /** Configure a lane from the profile, then sound it. `when` lets strums schedule ahead. */
    trigger(profile: SonicProfile, velocity: number, when?: number): void;
    get activeCount(): number;
    dispose(): void;
}

/**
 * L0 Acoustic Substrate — the Room: master chain (spatial input → warmth/brilliance shelves →
 * volume → limiter), viewport-sized reverb (S7/S8), ambience (I13), visibility fading (I14),
 * mute. In 'panner' mode it also owns the classic dry/wet routing; in 'ambisonic' mode the
 * AmbisonicBackend consumes `reverb` and `spatialIn` directly (SPATIAL.md §6). Imports Tone only.
 */

interface RoomOptions {
    volumeDb: number;
    reverb: 'auto' | number;
    ambient: number;
    mode: 'panner' | 'ambisonic';
}
declare class Room {
    private opts;
    /** Classic v0.1 buses — meaningful in 'panner' mode (dryIn = spatialIn, wetIn = reverb). */
    readonly buses: VoiceBuses;
    /** Everything audible enters here (gets the perceptual EQ + limiter). */
    readonly spatialIn: Tone.Gain;
    readonly reverb: Tone.Reverb;
    private master;
    private limiter;
    private lowShelf;
    private highShelf;
    private wetGain;
    private noise;
    private noiseFilter;
    private noiseGain;
    private sparkle;
    private resizeTimer;
    private mutedNow;
    constructor(opts: RoomOptions, vw: number, factors: PerceptualFactors);
    setFactors(f: PerceptualFactors): void;
    private roomParams;
    /** Debounced: Tone.Reverb regenerates its impulse response when decay changes. */
    resize(vw: number): void;
    /** I13 — room tone + sparkles. pickSparkle returns a play-thunk for a random visible element. */
    startAmbience(vw: number, level: number, pickSparkle: () => (() => void) | null): void;
    /** I14 — never sound in a background tab. */
    setHidden(hidden: boolean): void;
    setMuted(muted: boolean): void;
    dispose(): void;
}

/**
 * Pure field rotation — SPATIAL.md §3.1. The 3×3 matrix acts on the (X, Y, Z) channel triple
 * (W is rotation-invariant). Row-major: m[r][c], applied as X' = m00·X + m01·Y + m02·Z, etc.
 * Composition R = Rz(yaw) · Ry(pitch) · Rx(roll). Angles in radians.
 */
type Mat3 = [
    [
        number,
        number,
        number
    ],
    [
        number,
        number,
        number
    ],
    [
        number,
        number,
        number
    ]
];
/** Acts on column vectors (X, Y, Z)ᵀ in the AmbiX frame (+x fwd, +y left, +z up). */
declare function rotationMatrix(yaw: number, pitch: number, roll?: number): Mat3;
declare function applyMat3(m: Mat3, v: [number, number, number]): [number, number, number];
/**
 * Look semantics (SPATIAL.md §3.1): the field rotation is the INVERSE of the head's intrinsic
 * yaw-then-pitch rotation. Looking right by α (head Rz(−α)) and up by β (head Ry(−β)) gives
 * field R = (Rz(−α)·Ry(−β))⁻¹ = Ry(β)·Rz(α). The sign/composition decision lives here and
 * only here, pinned by tests: look right → right-side sources arrive frontward; look up →
 * overhead sources arrive frontward.
 */
declare function lookMatrix(yawRight: number, pitchUp: number): Mat3;

/**
 * SpatialBackend — the seam between the voice pool and the spatial engine (SPATIAL.md §6).
 * 'ambisonic' encodes every lane into the shared FOA field; 'panner' is the v0.1 per-voice
 * HRTF path, kept as option and automatic fallback. Imports Tone only.
 */

interface LaneOutput {
    /** The lane's filter connects here. */
    input: Tone.InputNode;
    /** Place the voice in space from its profile (called at trigger time). */
    setPlacement(profile: SonicProfile, when?: number): void;
    dispose(): void;
}
interface SpatialBackend {
    readonly kind: 'ambisonic' | 'panner';
    createOutput(): LaneOutput;
    setFactors(factors: PerceptualFactors): void;
    /** Rotate the field (ambisonic) — no-op on the panner backend. */
    setRotation(m: Mat3): void;
    onViewport(vw: number): void;
    dispose(): void;
}

declare class FieldRig {
    private backend;
    private mode;
    private target;
    private tilt;
    private look;
    private raf;
    private running;
    constructor(backend: SpatialBackend, mode: 'pointer' | 'center');
    start(): void;
    /** I9 — cursor (viewport-normalized 0..1) becomes look direction: right edge = look right. */
    pointTo(tx: number, ty: number): void;
    /** I10 — device attitude: γ right-tilt = look right, β beyond ~40° = look up/down. */
    tiltTo(gamma: number, beta: number): void;
    /** Public look API (head tracking / WebXR later plugs in here). Radians, right/up positive. */
    lookAt(yawRight: number, pitchUp: number): void;
    get state(): {
        yaw: number;
        pitch: number;
    };
    dispose(): void;
}

declare class ListenerRig {
    private mode;
    private target;
    private tilt;
    private pos;
    private raf;
    private running;
    constructor(mode: 'pointer' | 'center');
    start(): void;
    /** I9 — pointer position (viewport-normalized 0..1) targets the ears. */
    pointTo(tx: number, ty: number): void;
    /** I10 — device tilt offsets the ears (γ → x ±4 m, β → y ±2 m). */
    tiltTo(gamma: number, beta: number): void;
    dispose(): void;
}

interface ProfileEnv {
    root: Element;
    key: SiteKey;
    theme: Theme;
    vw: number;
    vh: number;
}

/**
 * L1 Page Reading — eligibility, registry, observers, visible set (ARCHITECTURE.md §5).
 * Imports DOM only; produces data + callbacks, triggers nothing audible itself.
 */

interface Entry {
    profile: SonicProfile | null;
    visible: boolean;
}
interface ScannerCallbacks {
    /** Fired when an element scrolls/loads into view after the initial scan (I7 whisper). */
    onAppear: (el: Element) => void;
}
declare class Scanner {
    private env;
    private cb;
    readonly registry: Map<Element, Entry>;
    private io;
    private mo;
    private capWarned;
    private initialScanDone;
    private mutationTimer;
    constructor(env: ProfileEnv, cb: ScannerCallbacks);
    scan(): void;
    private register;
    private unregister;
    isOff(el: Element): boolean;
    private queueMutations;
    /** Profile with lazy compute + cache (cheap path: geometry invalidation only nulls it). */
    profileFor(el: Element): SonicProfile | null;
    /** Geometry changed globally (scroll/resize): rects are stale, voices params survive. */
    invalidateRects(): void;
    visibleElements(): Element[];
    /** The element (or nearest registered ancestor) the scanner knows about. */
    resolve(target: Element | null): Element | null;
    updateEnv(vw: number, vh: number): void;
    dispose(): void;
}

interface ResolvedOptions {
    root: Element;
    theme: Theme;
    key: SiteKey;
    listener: 'pointer' | 'center';
    ambient: number;
    motion: boolean;
    gate: 'chip' | 'none';
    volume: number;
    maxVoices: number;
    panning: 'HRTF' | 'equalpower';
    spatial: 'ambisonic' | 'panner';
    reverb: 'auto' | number;
    velocityFactor: number;
}
type State = 'idle' | 'armed' | 'running' | 'disposed';
declare class Engine {
    readonly opts: ResolvedOptions;
    state: State;
    muted: boolean;
    scanner: Scanner;
    pool: VoicePool | null;
    room: Room | null;
    rig: ListenerRig | FieldRig | null;
    backend: SpatialBackend | null;
    factors: PerceptualFactors;
    private gate;
    private env;
    private detachers;
    private listeners;
    private unlockHandler;
    private appearBucket;
    private bucketTimer;
    constructor(userOpts?: SonariumOptions);
    private arm;
    private removeUnlockListeners;
    private starting;
    start(): Promise<void>;
    /**
     * SPATIAL.md §6 — ambisonic field by default; if its construction throws on an exotic
     * browser, fall back to the v0.1 per-voice panner world rather than staying silent.
     */
    private buildAudioGraph;
    /** Live spat5.oper surface: adjust presence/roomPresence/envelopment/warmth/brilliance. */
    setPerceptual(partial: Partial<PerceptualFactors>): void;
    toggleMute(): void;
    dispose(): void;
    /**
     * The single entry point for anything that wants to sound an element (Invariant: L2 drivers
     * never touch Tone). Resolves the element to its profile and rents a voice.
     * `transpose` shifts in semitones relative to the quantized pitch — callers must pass
     * consonant intervals only (e.g. keyboard.ts FILL_INTERVALS).
     */
    excite(el: Element, velocity: number, articulation: Articulation, when?: number, transpose?: number): void;
    /** I3/I11 — strum a set of elements left→right. */
    strum(els: Element[], velocity: number, articulation?: Articulation): void;
    private whisper;
    private pickSparkle;
    /** I12 — the page introduces itself: its largest landmarks, in DOM order, in the site key. */
    private playIntroMotif;
    /** Invariant #6 — explain why an element sounds the way it does. Works before start(). */
    describe(el: Element): SonicProfile | null;
    geometryChanged(): void;
    roomResized(): void;
    on(event: SonariumEvent, fn: (detail?: unknown) => void): () => void;
    private emit;
}

/**
 * L3 Composition — themes are plain data (MAPPING.md §3). Adding a theme means adding an
 * object here; no engine code may special-case a theme name.
 */

declare const THEMES: Record<string, Theme>;

declare const ROOM_HALF_W = 8;
declare const ROOM_HALF_H = 4;
/** G1 — element center x → azimuth (positionX, meters). */
declare function panX(rect: Rect, vw: number): number;
/** G2 — element center y → elevation (positionY, meters; screen-top = up). */
declare function panY(rect: Rect, vh: number): number;
/** G3 — vertical position → brightness tilt multiplier on the filter cutoff. */
declare function brightnessTilt(rect: Rect, vh: number): number;
/** G4 — log-normalized size 0 (tiny) … 1 (viewport-filling). */
declare function sizeT(rect: Rect, vw: number, vh: number): number;
/**
 * G4 — pitch degree, inverted: big elements speak low (T2). Compressed into [0.1, 0.85] so
 * sibling/heading step offsets have melodic headroom instead of clamping at the edges.
 */
declare const degreeFromSize: (t: number) => number;
/** G5 — big elements speak louder (T2). */
declare const velocityFromSize: (t: number) => number;
/** G6 — roundness r ∈ [0,1]: 0 = razor corner (kiki), 1 = pill/circle (bouba). */
declare function roundness(radiusPx: number, rect: Rect): number;
/** G7 — the Kiki/Bouba waveform ladder. */
declare function waveFromRoundness(r: number): Wave;
/** G8 — sharp = plosive onset, round = soft bloom. Seconds. */
declare const attackFromRoundness: (r: number) => number;
/** G9 — sharp edges ring with resonance. */
declare const qFromRoundness: (r: number) => number;
/** G10 — sharper ↔ slightly higher (T1), in whole scale steps. */
declare const pitchNudgeFromRoundness: (r: number) => number;
/** G11 — elongation → duration: long elements sweep, squares tick. Seconds. */
declare function durationFromElongation(rect: Rect): number;
/** G13 — box-shadow blur lifts the element into the room's reverb. */
declare const sendFromShadowBlur: (blurPx: number) => number;
/** S1 — DOM depth → distance behind the sound stage (listener at z=0 facing −z). */
declare const zFromDepth: (depth: number) => number;
/** S2 — deeper nesting = duller voice. Hz. */
declare const cutoffFromDepth: (depth: number) => number;
/** S3 — deeper nesting = quieter (distance loudness, Zahorik 2002). */
declare const velocityFromDepth: (depth: number) => number;
/** S5 — positive z-index pulls the element toward the listener. Meters toward z=0. */
declare const zBonusFromZIndex: (z: number) => number;
/** S4 — siblings climb the scale, wrapping each octave (do-re-mi…-do) so long lists stay melodic. */
declare const stepsFromSiblingIndex: (i: number, scaleLen?: number) => number;
/** S6 — headings: h1 lands lowest/grandest. Whole scale steps (negative = down). */
declare const stepsFromHeadingLevel: (level: number) => number;
/** S7/S8 — the viewport is the room. */
declare function reverbFromViewport(vw: number): {
    decay: number;
    wet: number;
};
/** I13 — room tone color follows room size. Hz. */
declare const ambienceCutoffFromViewport: (vw: number) => number;

declare const mapping_ROOM_HALF_H: typeof ROOM_HALF_H;
declare const mapping_ROOM_HALF_W: typeof ROOM_HALF_W;
declare const mapping_ambienceCutoffFromViewport: typeof ambienceCutoffFromViewport;
declare const mapping_attackFromRoundness: typeof attackFromRoundness;
declare const mapping_brightnessTilt: typeof brightnessTilt;
declare const mapping_cutoffFromDepth: typeof cutoffFromDepth;
declare const mapping_degreeFromSize: typeof degreeFromSize;
declare const mapping_durationFromElongation: typeof durationFromElongation;
declare const mapping_panX: typeof panX;
declare const mapping_panY: typeof panY;
declare const mapping_pitchNudgeFromRoundness: typeof pitchNudgeFromRoundness;
declare const mapping_qFromRoundness: typeof qFromRoundness;
declare const mapping_reverbFromViewport: typeof reverbFromViewport;
declare const mapping_roundness: typeof roundness;
declare const mapping_sendFromShadowBlur: typeof sendFromShadowBlur;
declare const mapping_sizeT: typeof sizeT;
declare const mapping_stepsFromHeadingLevel: typeof stepsFromHeadingLevel;
declare const mapping_stepsFromSiblingIndex: typeof stepsFromSiblingIndex;
declare const mapping_velocityFromDepth: typeof velocityFromDepth;
declare const mapping_velocityFromSize: typeof velocityFromSize;
declare const mapping_waveFromRoundness: typeof waveFromRoundness;
declare const mapping_zBonusFromZIndex: typeof zBonusFromZIndex;
declare const mapping_zFromDepth: typeof zFromDepth;
declare namespace mapping {
  export { mapping_ROOM_HALF_H as ROOM_HALF_H, mapping_ROOM_HALF_W as ROOM_HALF_W, mapping_ambienceCutoffFromViewport as ambienceCutoffFromViewport, mapping_attackFromRoundness as attackFromRoundness, mapping_brightnessTilt as brightnessTilt, mapping_cutoffFromDepth as cutoffFromDepth, mapping_degreeFromSize as degreeFromSize, mapping_durationFromElongation as durationFromElongation, mapping_panX as panX, mapping_panY as panY, mapping_pitchNudgeFromRoundness as pitchNudgeFromRoundness, mapping_qFromRoundness as qFromRoundness, mapping_reverbFromViewport as reverbFromViewport, mapping_roundness as roundness, mapping_sendFromShadowBlur as sendFromShadowBlur, mapping_sizeT as sizeT, mapping_stepsFromHeadingLevel as stepsFromHeadingLevel, mapping_stepsFromSiblingIndex as stepsFromSiblingIndex, mapping_velocityFromDepth as velocityFromDepth, mapping_velocityFromSize as velocityFromSize, mapping_waveFromRoundness as waveFromRoundness, mapping_zBonusFromZIndex as zBonusFromZIndex, mapping_zFromDepth as zFromDepth };
}

/**
 * Pure spherical-harmonic encoding — SPATIAL.md §1–2. AmbiX: ACN order [W, Y, Z, X],
 * SN3D normalization, +x forward, +y left, +z up, +azimuth left. No DOM, no Tone.
 */
declare const DEG: number;
interface FoaGains {
    w: number;
    y: number;
    z: number;
    x: number;
}
/**
 * First-order encode of a plane wave from (azimuth, elevation), with extent σ blending the
 * directional components into the omni channel (SPATIAL.md §2). Angles in radians.
 */
declare function foaGains(azimuth: number, elevation: number, extent?: number): FoaGains;
/** Unit direction vector for (azimuth, elevation) in the AmbiX frame. */
declare function unitVector(azimuth: number, elevation: number): [number, number, number];

/**
 * Pure FOA decoding — SPATIAL.md §3.2. Sampling decoder with max-rE weighting over a fixed
 * virtual-speaker layout; each speaker is later rendered by one native HRTF panner.
 */

interface Speaker {
    /** Unit direction in the AmbiX frame. */
    dir: [number, number, number];
    label: string;
}
/** Cube vertices: full-sphere coverage including elevation, symmetric, M = 8. */
declare const CUBE_LAYOUT: Speaker[];
interface DecodeRow {
    /** Per-ACN gains [w, y, z, x] for one speaker: s = w·W + y·Y + z·Z + x·X. */
    w: number;
    y: number;
    z: number;
    x: number;
}
/**
 * Sampling decode matrix for SN3D input: sm = (1/M)·[g0·W + 3·g1·(X·xm + Y·ym + Z·zm)].
 * The 3 re-normalizes first-order SN3D to N3D inside the projection.
 */
declare function decodeMatrix(layout: Speaker[]): DecodeRow[];
/** Decode an encoded source to speaker signals (used by tests and the worklet path later). */
declare function decodeGains(rows: DecodeRow[], g: FoaGains): number[];

declare const AZ_MAX: number;
declare const EL_MAX: number;
/** SP1/SP2 — screen position → direction. Screen-right = −azimuth (sign tested). */
declare function sphereFromRect(rect: Rect, vw: number, vh: number): {
    azimuth: number;
    elevation: number;
};
/** SP4 — big elements wrap around the listener (T2 extended into space). */
declare function extentFromSize(sizeT: number): number;
/** SP5 — Kiki/Bouba in the spatial domain: sharp beams, round radiates. */
declare function directivityFromRoundness(roundness: number): number;
/** SP6 — early-reflection time scale follows the room (viewport). */
declare function reflectionScaleFromViewport(vw: number): number;

declare const sphere_AZ_MAX: typeof AZ_MAX;
declare const sphere_EL_MAX: typeof EL_MAX;
declare const sphere_directivityFromRoundness: typeof directivityFromRoundness;
declare const sphere_extentFromSize: typeof extentFromSize;
declare const sphere_reflectionScaleFromViewport: typeof reflectionScaleFromViewport;
declare const sphere_sphereFromRect: typeof sphereFromRect;
declare namespace sphere {
  export { sphere_AZ_MAX as AZ_MAX, sphere_EL_MAX as EL_MAX, sphere_directivityFromRoundness as directivityFromRoundness, sphere_extentFromSize as extentFromSize, sphere_reflectionScaleFromViewport as reflectionScaleFromViewport, sphere_sphereFromRect as sphereFromRect };
}

/**
 * Sonarium — drop-in acoustic UX.
 * One script tag turns any webpage into a spatial sound field: layout becomes a stereo stage,
 * geometry becomes timbre (Kiki/Bouba), the DOM tree becomes depth and harmony, the viewport
 * becomes a room, and your cursor becomes your ears.
 *
 *   import { create } from 'sonarium'         // ESM
 *   const space = create({ theme: 'aurora' })
 *
 *   <script src=".../sonarium.iife.js" data-auto></script>   // zero-code
 *
 * Docs: https://github.com/frank890417/sonarium — start with docs/PLAN.md.
 */

declare const version = "0.2.0";

/**
 * Create a Sonarium instance. Safe to call before any user gesture: audio arms itself and
 * starts on the first pointer/key interaction (browser autoplay policy treated as a feature).
 */
declare function create(options?: SonariumOptions): Engine;

export { type Articulation, CUBE_LAYOUT, DEFAULT_FACTORS, DEG, Engine, type PerceptualFactors, type Role, SCALES, type SonariumEvent, type SonariumOptions, type SonicProfile, type SphereProps, type SynthKind, THEMES, type Theme, type TriggerDetail, type VoiceRecipe, type Wave, applyMat3, create, decodeGains, decodeMatrix, degreeToMidi, foaGains, lookMatrix, mapping, midiToFreq, midiToNoteName, parseKey, rotationMatrix, siteKey, sphere as sphereMapping, unitVector, version };
