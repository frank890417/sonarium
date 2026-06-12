var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/core/engine.ts
import * as Tone9 from "tone";

// src/math/util.ts
var clamp = (v, a, b) => Math.min(b, Math.max(a, v));
var lerp = (a, b, t) => a + (b - a) * t;
var norm = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// src/math/scales.ts
var SCALES = {
  pentMajor: [0, 2, 4, 7, 9],
  pentMinor: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10]
};
var SCALE_NAMES = Object.keys(SCALES);
var OCTAVES = 3;
var BASE_MIDI = 48;
var NOTE_TO_PC = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11
};
var PC_TO_NOTE = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
function siteKey(hostname) {
  const host = hostname || "localhost";
  const h = fnv1a(host);
  const root = h % 12;
  const scaleName = SCALE_NAMES[(h >>> 4) % SCALE_NAMES.length];
  const scale = SCALES[scaleName];
  return { root, scaleName, scale, label: `${PC_TO_NOTE[root]} ${scaleName}` };
}
function parseKey(spec) {
  const m = spec.trim().match(/^([A-Ga-g][#b]?)\s+(\w+)$/);
  if (!m) return null;
  const note = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  const root = NOTE_TO_PC[note];
  const scaleName = m[2];
  const scale = SCALES[scaleName];
  if (root === void 0 || !scale) return null;
  return { root, scaleName, scale, label: `${PC_TO_NOTE[root]} ${scaleName}` };
}
function degreeToMidi(degree, key, stepOffset = 0) {
  const steps = key.scale.length * OCTAVES;
  let idx = Math.round(clamp(degree, 0, 1) * (steps - 1)) + Math.round(stepOffset);
  idx = clamp(idx, 0, steps - 1);
  const oct = Math.floor(idx / key.scale.length);
  const pc = key.scale[idx % key.scale.length];
  return BASE_MIDI + key.root + oct * 12 + pc;
}
var midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
function stepInScale(midi, key, steps) {
  if (steps === 0) return midi;
  const pcs = key.scale.map((s) => (s + key.root) % 12);
  const dir = steps > 0 ? 1 : -1;
  let m = midi;
  for (let i = 0; i < Math.abs(steps); i++) {
    do {
      m += dir;
    } while (!pcs.includes((m % 12 + 12) % 12) && m > 12 && m < 120);
  }
  return clamp(m, 12, 120);
}
function midiToNoteName(m) {
  const pc = (m % 12 + 12) % 12;
  return `${PC_TO_NOTE[pc]}${Math.floor(m / 12) - 1}`;
}

// src/math/modular.ts
var modular_exports = {};
__export(modular_exports, {
  fmIndex: () => fmIndex,
  foldCurve: () => foldCurve,
  foldFromBorder: () => foldFromBorder,
  lfoFromCss: () => lfoFromCss,
  massBonusFromFontWeight: () => massBonusFromFontWeight,
  patchFrom: () => patchFrom,
  portamentoFromTransition: () => portamentoFromTransition,
  ribbonSteps: () => ribbonSteps,
  unisonFromMass: () => unisonFromMass
});
function foldFromBorder(borderWidthPx, edge) {
  const drive = clamp(borderWidthPx / 6, 0, 1) * (0.25 + 0.75 * clamp(edge, 0, 1));
  return { drive, mix: drive > 0.01 ? 0.25 + 0.55 * drive : 0 };
}
var fmIndex = (texture, edge) => 1.5 * clamp(texture, 0, 1) * clamp(edge, 0, 1);
function unisonFromMass(mass) {
  const m = clamp(mass, 0, 1);
  return m >= 0.45 ? { detuneCents: 4 + 10 * m, mix: 0.4 } : { detuneCents: 0, mix: 0 };
}
function lfoFromCss(animationS, borderStyle) {
  if (animationS > 0.05) {
    return {
      rateHz: clamp(1 / animationS, 0.08, 8),
      shape: borderStyle === "dashed" || borderStyle === "dotted" ? "square" : "sine",
      vibratoCents: 6,
      tremolo: 0.18,
      filterDepth: 0.25
    };
  }
  if (borderStyle === "dashed" || borderStyle === "dotted") {
    return {
      rateHz: borderStyle === "dotted" ? 7 : 3.5,
      shape: "square",
      vibratoCents: 0,
      tremolo: 0.3,
      filterDepth: 0.35
    };
  }
  return { rateHz: 0, shape: "sine", vibratoCents: 0, tremolo: 0, filterDepth: 0 };
}
var portamentoFromTransition = (transitionS) => clamp(transitionS / 2, 0, 0.25);
var massBonusFromFontWeight = (weight) => clamp((weight - 400) / 300, 0, 1) * 0.12;
function patchFrom(matter, visuals) {
  return {
    fold: foldFromBorder(visuals.borderWidthPx, matter.edge),
    fm: { index: fmIndex(matter.texture, matter.edge) },
    unison: unisonFromMass(matter.mass),
    lfo: lfoFromCss(visuals.animationS, visuals.borderStyle),
    portamentoS: portamentoFromTransition(visuals.transitionS)
  };
}
function foldCurve(samples = 2049) {
  const out = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = i / (samples - 1) * 2 - 1;
    out[i] = Math.sin(2.5 * (Math.PI / 2) * x);
  }
  return out;
}
function ribbonSteps(dxPx, vw, scaleLen) {
  const t = clamp(dxPx / (vw * 0.6), -1, 1);
  return Math.round(t * scaleLen);
}

// src/math/chroma.ts
var chroma_exports = {};
__export(chroma_exports, {
  attackScaleFromWarmth: () => attackScaleFromWarmth,
  brightnessFromLuminance: () => brightnessFromLuminance,
  chromaOf: () => chromaOf,
  modeFromPalette: () => modeFromPalette,
  pagePalette: () => pagePalette,
  parseCssColor: () => parseCssColor,
  rgbToHsl: () => rgbToHsl,
  richnessFromSaturation: () => richnessFromSaturation,
  roomToneScaleFromWarmth: () => roomToneScaleFromWarmth,
  subBonusFromWarmth: () => subBonusFromWarmth,
  tempoScaleFromWarmth: () => tempoScaleFromWarmth,
  velocityFromLuminance: () => velocityFromLuminance,
  warmthFromHue: () => warmthFromHue
});
function parseCssColor(css) {
  const m = css.trim().match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*(\d*(?:\.\d+)?)\s*)?\)$/);
  if (!m) return null;
  return {
    r: clamp(parseFloat(m[1]) / 255, 0, 1),
    g: clamp(parseFloat(m[2]) / 255, 0, 1),
    b: clamp(parseFloat(m[3]) / 255, 0, 1),
    a: m[4] === void 0 ? 1 : clamp(parseFloat(m[4]), 0, 1)
  };
}
function rgbToHsl({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 1e-6) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = (g - b) / d % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s: clamp(s, 0, 1), l };
}
function warmthFromHue(h, s) {
  const raw = 0.5 + 0.5 * Math.cos((h - 30) * Math.PI / 180);
  return lerp(0.5, raw, clamp(s * 2, 0, 1));
}
function chromaOf(rgb) {
  if (!rgb || rgb.a < 0.05) return { warmth: 0.5, saturation: 0, luminance: 0.5 };
  const { h, s, l } = rgbToHsl(rgb);
  return { warmth: warmthFromHue(h, s), saturation: s, luminance: l };
}
var brightnessFromLuminance = (l) => lerp(0.78, 1.22, clamp(l, 0, 1));
var velocityFromLuminance = (l) => lerp(0.92, 1.06, clamp(l, 0, 1));
var attackScaleFromWarmth = (w) => lerp(1.18, 0.82, clamp(w, 0, 1));
var subBonusFromWarmth = (w) => 0.08 * clamp(w, 0, 1);
var richnessFromSaturation = (s) => 0.35 * clamp(s, 0, 1);
function modeFromPalette(pal) {
  if (pal.warmth >= 0.55) return pal.luminance >= 0.5 ? "lydian" : "mixolydian";
  if (pal.warmth <= 0.45) return pal.luminance >= 0.5 ? "dorian" : "pentMinor";
  return null;
}
function pagePalette(bg, text) {
  return {
    warmth: bg.warmth * 0.7 + text.warmth * 0.3,
    saturation: bg.saturation * 0.7 + text.saturation * 0.3,
    luminance: bg.luminance * 0.7 + text.luminance * 0.3
  };
}
var roomToneScaleFromWarmth = (w) => lerp(0.85, 1.25, clamp(w, 0, 1));
var tempoScaleFromWarmth = (w) => lerp(0.94, 1.06, clamp(w, 0, 1));

// src/math/pulse.ts
var pulse_exports = {};
__export(pulse_exports, {
  DUCK_RECOVERY_MS: () => DUCK_RECOVERY_MS,
  ECHO_MIN_AHEAD_S: () => ECHO_MIN_AHEAD_S,
  ECHO_TRANSPOSE: () => ECHO_TRANSPOSE,
  ECHO_VELOCITY_SCALE: () => ECHO_VELOCITY_SCALE,
  PHRASE_MAX_NOTES: () => PHRASE_MAX_NOTES,
  PHRASE_MIN_NOTES: () => PHRASE_MIN_NOTES,
  PHRASE_PROBABILITY: () => PHRASE_PROBABILITY,
  decayCount: () => decayCount,
  duckFactor: () => duckFactor,
  echoGridS: () => echoGridS,
  nextGridOffset: () => nextGridOffset,
  phraseWindow: () => phraseWindow,
  readingOrderKey: () => readingOrderKey,
  secondsPerBeat: () => secondsPerBeat,
  strumStepS: () => strumStepS,
  tempoFromPage: () => tempoFromPage
});
function tempoFromPage(elementCount, warmthScale) {
  const base = lerp(66, 104, clamp(elementCount / 120, 0, 1));
  return Math.round(clamp(base * warmthScale, 56, 116));
}
var secondsPerBeat = (bpm) => 60 / Math.max(1, bpm);
function nextGridOffset(phaseS, gridS, minAheadS) {
  if (gridS <= 0) return minAheadS;
  let offset = gridS - (phaseS % gridS + gridS) % gridS;
  while (offset < minAheadS) offset += gridS;
  return offset;
}
var strumStepS = (bpm) => secondsPerBeat(bpm) / 8;
var ECHO_TRANSPOSE = 12;
var ECHO_VELOCITY_SCALE = 0.22;
var ECHO_MIN_AHEAD_S = 0.08;
var echoGridS = (bpm) => secondsPerBeat(bpm) / 2;
var DUCK_RECOVERY_MS = 2e3;
var decayCount = (count, dtMs) => Math.max(0, count - dtMs / DUCK_RECOVERY_MS);
var duckFactor = (count) => Math.max(0.4, Math.pow(0.85, Math.max(0, count)));
var PHRASE_PROBABILITY = 0.55;
var PHRASE_MIN_NOTES = 2;
var PHRASE_MAX_NOTES = 4;
var readingOrderKey = (top, left) => Math.round(top / 80) * 1e5 + clamp(left, 0, 99999);
function phraseWindow(n, len, progress) {
  return Math.round(clamp(progress, 0, 1) * Math.max(0, n - len));
}

// src/themes/index.ts
var aurora = {
  name: "aurora",
  defaults: { synthKind: "matter", octaveShift: 0, baseVelocity: 0.8, releaseScale: 1 },
  roles: {
    toggle: { synthKind: "matter", baseVelocity: 0.7, releaseScale: 0.8 },
    button: { synthKind: "matter", baseVelocity: 0.9 },
    link: { synthKind: "matter", octaveShift: 1, baseVelocity: 0.6, releaseScale: 0.7 },
    input: { synthKind: "matter", baseVelocity: 0.55, releaseScale: 1.6 },
    heading: { synthKind: "fm", octaveShift: 0, baseVelocity: 0.75, releaseScale: 2.2 },
    media: { synthKind: "membrane", octaveShift: -1, baseVelocity: 0.8 },
    item: { synthKind: "matter", baseVelocity: 0.6, releaseScale: 0.8 },
    text: { synthKind: "matter", baseVelocity: 0.35, releaseScale: 1.8 }
  }
};
var mono = {
  name: "mono",
  defaults: { synthKind: "synth", octaveShift: 0, baseVelocity: 0.7, releaseScale: 0.5 },
  roles: {
    toggle: { synthKind: "noise", baseVelocity: 0.6 },
    button: { synthKind: "synth", pinWave: "square", baseVelocity: 0.7, releaseScale: 0.4 },
    link: { synthKind: "noise", baseVelocity: 0.45, releaseScale: 0.3 },
    input: { synthKind: "synth", pinWave: "sine", octaveShift: -1, baseVelocity: 0.5 },
    heading: { synthKind: "synth", pinWave: "sine", octaveShift: 1, baseVelocity: 0.6 },
    media: { synthKind: "noise", baseVelocity: 0.55 },
    item: { synthKind: "noise", baseVelocity: 0.4, releaseScale: 0.3 },
    text: { synthKind: "synth", pinWave: "sine", baseVelocity: 0 }
  }
};
var paper = {
  name: "paper",
  defaults: { synthKind: "pluck", octaveShift: 0, baseVelocity: 0.8, releaseScale: 1 },
  roles: {
    toggle: { synthKind: "pluck", baseVelocity: 0.7 },
    button: { synthKind: "pluck", baseVelocity: 0.9 },
    link: { synthKind: "pluck", octaveShift: 1, baseVelocity: 0.65 },
    input: { synthKind: "synth", pinWave: "triangle", baseVelocity: 0.5, releaseScale: 1.4 },
    heading: { synthKind: "pluck", octaveShift: -1, baseVelocity: 0.85, releaseScale: 1.6 },
    media: { synthKind: "membrane", octaveShift: -1, baseVelocity: 0.7 },
    item: { synthKind: "pluck", baseVelocity: 0.6 },
    text: { synthKind: "synth", pinWave: "sine", baseVelocity: 0.3, releaseScale: 1.6 }
  }
};
var THEMES = { aurora, mono, paper };
function resolveTheme(theme) {
  if (!theme) return aurora;
  if (typeof theme === "string") return THEMES[theme] ?? aurora;
  return theme;
}

// src/ui/gate.ts
var STORAGE_KEY = "sonarium:muted";
var isMutedPersisted = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};
var persistMuted = (muted) => {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
  }
};
function mountGate(onToggle) {
  const host = document.createElement("div");
  host.setAttribute("data-sonic", "off");
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      button {
        position: fixed; right: 16px; bottom: 16px; z-index: 2147483646;
        width: 44px; height: 44px; border-radius: 50%; border: 1px solid rgba(255,255,255,.25);
        background: rgba(20, 22, 30, .82); color: #fff; font-size: 18px; line-height: 1;
        cursor: pointer; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 4px 16px rgba(0,0,0,.35); transition: transform .15s ease, opacity .3s ease;
      }
      button:hover { transform: scale(1.08); }
      button:focus-visible { outline: 2px solid #7cd4fd; outline-offset: 2px; }
      button.armed { animation: pulse 1.6s ease-in-out infinite; }
      @keyframes pulse { 0%,100% { box-shadow: 0 4px 16px rgba(0,0,0,.35); } 50% { box-shadow: 0 0 0 10px rgba(124,212,253,.18); } }
    </style>
    <button type="button" class="armed" aria-label="Enable sound" title="Sonarium \u2014 enable sound">\u{1F507}</button>
  `;
  const btn = shadow.querySelector("button");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    onToggle();
  });
  document.body.appendChild(host);
  return {
    setState(state) {
      btn.classList.toggle("armed", state === "armed");
      if (state === "on") {
        btn.textContent = "\u{1F50A}";
        btn.setAttribute("aria-label", "Mute Sonarium");
      } else if (state === "muted") {
        btn.textContent = "\u{1F507}";
        btn.setAttribute("aria-label", "Unmute Sonarium");
      } else {
        btn.textContent = "\u{1F507}";
        btn.setAttribute("aria-label", "Enable sound");
      }
    },
    dispose() {
      host.remove();
    }
  };
}

// src/spatial/backend.ts
import * as Tone4 from "tone";

// src/spatial/bus.ts
import * as Tone from "tone";

// src/spatial/sh.ts
var DEG = Math.PI / 180;
function foaGains(azimuth, elevation, extent = 0) {
  const s = Math.min(1, Math.max(0, extent));
  const cosEl = Math.cos(elevation);
  const dir = 1 - s;
  return {
    w: 1 + 0.41 * s,
    y: dir * Math.sin(azimuth) * cosEl,
    z: dir * Math.sin(elevation),
    x: dir * Math.cos(azimuth) * cosEl
  };
}
function unitVector(azimuth, elevation) {
  const cosEl = Math.cos(elevation);
  return [Math.cos(azimuth) * cosEl, Math.sin(azimuth) * cosEl, Math.sin(elevation)];
}

// src/spatial/decoder.ts
var C = 1 / Math.sqrt(3);
var CUBE_LAYOUT = [
  { dir: [C, C, C], label: "front-left-up" },
  { dir: [C, -C, C], label: "front-right-up" },
  { dir: [C, C, -C], label: "front-left-down" },
  { dir: [C, -C, -C], label: "front-right-down" },
  { dir: [-C, C, C], label: "back-left-up" },
  { dir: [-C, -C, C], label: "back-right-up" },
  { dir: [-C, C, -C], label: "back-left-down" },
  { dir: [-C, -C, -C], label: "back-right-down" }
];
var MAXRE_G0 = 1;
var MAXRE_G1 = 1 / Math.sqrt(3);
function decodeMatrix(layout) {
  const M = layout.length;
  return layout.map(({ dir }) => ({
    w: 1 / M * MAXRE_G0,
    x: 3 / M * MAXRE_G1 * dir[0],
    y: 3 / M * MAXRE_G1 * dir[1],
    z: 3 / M * MAXRE_G1 * dir[2]
  }));
}
function decodeGains(rows, g) {
  return rows.map((r) => r.w * g.w + r.y * g.y + r.z * g.z + r.x * g.x);
}

// src/spatial/rotation.ts
var IDENTITY = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1]
];
function mul(a, b) {
  const out = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      out[r][c] = a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c];
  return out;
}
function rotationMatrix(yaw, pitch, roll = 0) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const Rz = [
    [cy, -sy, 0],
    [sy, cy, 0],
    [0, 0, 1]
  ];
  const Ry = [
    [cp, 0, sp],
    [0, 1, 0],
    [-sp, 0, cp]
  ];
  const Rx = [
    [1, 0, 0],
    [0, cr, -sr],
    [0, sr, cr]
  ];
  return mul(mul(Rz, Ry), Rx);
}
function applyMat3(m, v) {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
  ];
}
function lookMatrix(yawRight, pitchUp) {
  const pitch = rotationMatrix(0, pitchUp, 0);
  const yaw = rotationMatrix(yawRight, 0, 0);
  return mul(pitch, yaw);
}

// src/spatial/bus.ts
var SPEAKER_RADIUS = 2.5;
var AmbisonicBus = class {
  constructor(destination, decoderKind) {
    this.nodes = [];
    this.inputs = { w: new Tone.Gain(1), y: new Tone.Gain(1), z: new Tone.Gain(1), x: new Tone.Gain(1) };
    this.outW = new Tone.Gain(1);
    this.outXYZ = [new Tone.Gain(1), new Tone.Gain(1), new Tone.Gain(1)];
    this.inputs.w.connect(this.outW);
    const inXYZ = [this.inputs.x, this.inputs.y, this.inputs.z];
    this.rot = [];
    for (let r = 0; r < 3; r++) {
      const row = [];
      for (let c = 0; c < 3; c++) {
        const g = new Tone.Gain(IDENTITY[r][c]);
        inXYZ[c].connect(g);
        g.connect(this.outXYZ[r]);
        row.push(g);
      }
      this.rot.push(row);
    }
    if (decoderKind === "stereo") this.buildStereoDecode(destination);
    else this.buildVirtualSpeakerDecode(destination);
    this.nodes.push(this.inputs.w, this.inputs.y, this.inputs.z, this.inputs.x, this.outW, ...this.outXYZ, ...this.rot.flat());
  }
  /** SPATIAL.md §3.2 — 8 cube speakers, each a static mix of (W, X', Y', Z') into a fixed HRTF panner. */
  buildVirtualSpeakerDecode(destination) {
    const rows = decodeMatrix(CUBE_LAYOUT);
    rows.forEach((row, i) => {
      const dir = CUBE_LAYOUT[i].dir;
      const sum = new Tone.Gain(1);
      const mw = new Tone.Gain(row.w);
      const mx = new Tone.Gain(row.x);
      const my = new Tone.Gain(row.y);
      const mz = new Tone.Gain(row.z);
      this.outW.connect(mw);
      this.outXYZ[0].connect(mx);
      this.outXYZ[1].connect(my);
      this.outXYZ[2].connect(mz);
      mw.connect(sum);
      mx.connect(sum);
      my.connect(sum);
      mz.connect(sum);
      const panner = new Tone.Panner3D({
        panningModel: "HRTF",
        distanceModel: "inverse",
        refDistance: SPEAKER_RADIUS,
        rolloffFactor: 0,
        // fixed-radius speakers: direction only, no distance shading
        positionX: -dir[1] * SPEAKER_RADIUS,
        positionY: dir[2] * SPEAKER_RADIUS,
        positionZ: -dir[0] * SPEAKER_RADIUS
      });
      sum.connect(panner);
      panner.connect(destination);
      this.nodes.push(sum, mw, mx, my, mz, panner);
    });
  }
  /** Fallback decode without HRTF: two virtual cardioids at ±90° (SPATIAL.md §3.2). */
  buildStereoDecode(destination) {
    const L = new Tone.Gain(1);
    const R = new Tone.Gain(1);
    const wL = new Tone.Gain(0.5);
    const wR = new Tone.Gain(0.5);
    const yL = new Tone.Gain(0.5);
    const yR = new Tone.Gain(-0.5);
    this.outW.connect(wL);
    this.outW.connect(wR);
    this.outXYZ[1].connect(yL);
    this.outXYZ[1].connect(yR);
    wL.connect(L);
    yL.connect(L);
    wR.connect(R);
    yR.connect(R);
    const merge = new Tone.Merge();
    L.connect(merge, 0, 0);
    R.connect(merge, 0, 1);
    merge.connect(destination);
    this.nodes.push(L, R, wL, wR, yL, yR, merge);
  }
  /** Rotate the whole field (FieldRig calls this with lookMatrix output). Ramped, zipper-free. */
  setRotation(m, rampS = 0.04) {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        this.rot[r][c].gain.rampTo(m[r][c], rampS);
  }
  dispose() {
    for (const n of this.nodes) n.dispose();
    this.nodes = [];
  }
};

// src/spatial/encoder.ts
import * as Tone2 from "tone";
var SourceEncoder = class {
  constructor(bus) {
    this.input = new Tone2.Gain(1);
    this.gw = new Tone2.Gain(1);
    this.gy = new Tone2.Gain(0);
    this.gz = new Tone2.Gain(0);
    this.gx = new Tone2.Gain(1);
    this.input.connect(this.gw);
    this.input.connect(this.gy);
    this.input.connect(this.gz);
    this.input.connect(this.gx);
    this.gw.connect(bus.w);
    this.gy.connect(bus.y);
    this.gz.connect(bus.z);
    this.gx.connect(bus.x);
  }
  /** Apply SH gains × an overall direct-path gain, ramped to avoid zipper noise. */
  set(g, directGain2, when, rampS = 0.015) {
    const t = when ?? Tone2.now();
    this.gw.gain.rampTo(g.w * directGain2, rampS, t);
    this.gy.gain.rampTo(g.y * directGain2, rampS, t);
    this.gz.gain.rampTo(g.z * directGain2, rampS, t);
    this.gx.gain.rampTo(g.x * directGain2, rampS, t);
  }
  dispose() {
    this.input.dispose();
    this.gw.dispose();
    this.gy.dispose();
    this.gz.dispose();
    this.gx.dispose();
  }
};

// src/spatial/room-foa.ts
import * as Tone3 from "tone";

// src/spatial/sphere.ts
var sphere_exports = {};
__export(sphere_exports, {
  AZ_MAX: () => AZ_MAX,
  EL_MAX: () => EL_MAX,
  directivityFromRoundness: () => directivityFromRoundness,
  extentFromSize: () => extentFromSize,
  reflectionScaleFromViewport: () => reflectionScaleFromViewport,
  sphereFromRect: () => sphereFromRect
});
var AZ_MAX = 70 * DEG;
var EL_MAX = 45 * DEG;
function sphereFromRect(rect, vw, vh) {
  const tx = norm(rect.x + rect.w / 2, 0, vw);
  const ty = norm(rect.y + rect.h / 2, 0, vh);
  return {
    azimuth: -(2 * tx - 1) * AZ_MAX,
    elevation: (1 - 2 * ty) * EL_MAX
  };
}
function extentFromSize(sizeT2) {
  return clamp(0.05 + 0.75 * Math.pow(clamp(sizeT2, 0, 1), 1.2), 0, 0.95);
}
function directivityFromRoundness(roundness2) {
  return clamp(1 - roundness2, 0, 1);
}
function reflectionScaleFromViewport(vw) {
  return 0.6 + norm(vw, 360, 2200) * 1;
}

// src/spatial/perceptual.ts
var DEFAULT_FACTORS = {
  presence: 0.7,
  roomPresence: 0.5,
  envelopment: 0.55,
  warmth: 0.5,
  brilliance: 0.5
};
function resolveFactors(partial) {
  const f = { ...DEFAULT_FACTORS, ...partial ?? {} };
  for (const k of Object.keys(f)) f[k] = clamp(f[k], 0, 1);
  return f;
}
var directGain = (presence) => lerp(0.5, 1.2, clamp(presence, 0, 1));
var roomGain = (roomPresence) => lerp(0, 1.6, clamp(roomPresence, 0, 1));
var tailExtent = (envelopment) => clamp(envelopment, 0, 1);
var tailLevel = (envelopment) => lerp(0.7, 1.25, clamp(envelopment, 0, 1));
var warmthDb = (warmth) => lerp(-3, 3, clamp(warmth, 0, 1));
var brillianceDb = (brilliance) => lerp(-4, 3, clamp(brilliance, 0, 1));
var directivityDirectGain = (d) => lerp(0.75, 1.1, clamp(d, 0, 1));
var directivitySendScale = (d) => lerp(1.35, 0.8, clamp(d, 0, 1));
var directivityFilterScale = (d) => lerp(0.85, 1.15, clamp(d, 0, 1));

// src/spatial/room-foa.ts
var ER_BASE_TIMES = [0.013, 0.019, 0.027, 0.034];
var ER_TAP_LEVELS = [1, 0.85, 0.7, 0.6];
var ER_DIRECTIONS = [
  [110 * DEG, 30 * DEG],
  [-110 * DEG, 30 * DEG],
  [110 * DEG, -30 * DEG],
  [-110 * DEG, -30 * DEG]
];
var FoaRoom = class {
  constructor(bus, reverb, vw, factors) {
    this.delays = [];
    this.nodes = [];
    this.erIn = new Tone3.Gain(1);
    this.erMaster = new Tone3.Gain(0.22 * roomGain(factors.roomPresence));
    this.erIn.connect(this.erMaster);
    const scale = reflectionScaleFromViewport(vw);
    ER_BASE_TIMES.forEach((t, i) => {
      const delay = new Tone3.Delay({ delayTime: t * scale, maxDelay: 0.12 });
      const tap = new Tone3.Gain(ER_TAP_LEVELS[i]);
      const enc = new SourceEncoder(bus);
      const [az, el] = ER_DIRECTIONS[i];
      enc.set(foaGains(az, el, 0.35), 1);
      this.erMaster.connect(delay);
      delay.connect(tap);
      tap.connect(enc.input);
      this.delays.push(delay);
      this.nodes.push(delay, tap, enc);
    });
    this.split = new Tone3.Split();
    reverb.connect(this.split);
    this.tailL = new SourceEncoder(bus);
    this.tailR = new SourceEncoder(bus);
    this.split.connect(this.tailL.input, 0);
    this.split.connect(this.tailR.input, 1);
    this.applyTail(factors);
    this.nodes.push(this.erIn, this.erMaster, this.split, this.tailL, this.tailR);
  }
  applyTail(f) {
    const ext = tailExtent(f.envelopment);
    const level = tailLevel(f.envelopment);
    this.tailL.set(foaGains(120 * DEG, 0, ext), level);
    this.tailR.set(foaGains(-120 * DEG, 0, ext), level);
  }
  setFactors(f) {
    this.erMaster.gain.rampTo(0.22 * roomGain(f.roomPresence), 0.1);
    this.applyTail(f);
  }
  setViewport(vw) {
    const scale = reflectionScaleFromViewport(vw);
    this.delays.forEach((d, i) => d.delayTime.rampTo(ER_BASE_TIMES[i] * scale, 0.3));
  }
  dispose() {
    for (const n of this.nodes) n.dispose();
    this.nodes = [];
  }
};

// src/spatial/backend.ts
var AmbisonicBackend = class {
  constructor(room, decoderKind, vw, factors) {
    this.room = room;
    this.kind = "ambisonic";
    this.factors = resolveFactors(factors);
    this.bus = new AmbisonicBus(room.spatialIn, decoderKind);
    this.foaRoom = new FoaRoom(this.bus.inputs, room.reverb, vw, this.factors);
  }
  createOutput() {
    const enc = new SourceEncoder(this.bus.inputs);
    const send = new Tone4.Gain(0.15);
    const sendColor = new Tone4.Filter({ type: "lowpass", frequency: 5e3, rolloff: -12 });
    enc.input.connect(send);
    send.connect(sendColor);
    sendColor.connect(this.room.reverb);
    enc.input.connect(this.foaRoom.erIn);
    const backend = this;
    return {
      input: enc.input,
      setPlacement(profile, when) {
        const t = when ?? Tone4.now();
        const s = profile.sphere;
        const w = profile.voice.reverb;
        const extent = clamp(s.extent + w.extentBonus, 0, 0.95);
        const g = foaGains(s.azimuth, s.elevation, extent);
        const direct = directGain(backend.factors.presence) * directivityDirectGain(s.directivity);
        enc.set(g, direct, when);
        const wetSend = clamp(
          profile.reverbSend * directivitySendScale(s.directivity) * roomGain(backend.factors.roomPresence),
          0,
          1.5
        );
        sendColor.frequency.rampTo(w.sendCutoffHz, 0.02, t);
        send.gain.cancelScheduledValues(t);
        if (w.bloom > 0.35) {
          send.gain.setValueAtTime(wetSend * 0.35, t);
          send.gain.rampTo(wetSend, Math.max(0.08, profile.durationS), t);
        } else {
          send.gain.rampTo(wetSend, 0.02, t);
        }
      },
      dispose() {
        enc.dispose();
        send.dispose();
        sendColor.dispose();
      }
    };
  }
  setFactors(factors) {
    this.factors = factors;
    this.foaRoom.setFactors(factors);
    this.room.setFactors(factors);
  }
  setRotation(m) {
    this.bus.setRotation(m);
  }
  onViewport(vw) {
    this.foaRoom.setViewport(vw);
  }
  dispose() {
    this.foaRoom.dispose();
    this.bus.dispose();
  }
};
var PannerBackend = class {
  constructor(room, panningModel) {
    this.room = room;
    this.panningModel = panningModel;
    this.kind = "panner";
  }
  createOutput() {
    const panner = new Tone4.Panner3D({
      panningModel: this.panningModel,
      distanceModel: "inverse",
      refDistance: 1,
      rolloffFactor: 0.4,
      positionX: 0,
      positionY: 0,
      positionZ: -2
    });
    const dry = new Tone4.Gain(1);
    const send = new Tone4.Gain(0.18);
    const sendColor = new Tone4.Filter({ type: "lowpass", frequency: 5e3, rolloff: -12 });
    panner.connect(dry);
    panner.connect(send);
    send.connect(sendColor);
    dry.connect(this.room.buses.dryIn);
    sendColor.connect(this.room.buses.wetIn);
    return {
      input: panner,
      setPlacement(profile, when) {
        const t = when ?? Tone4.now();
        panner.positionX.rampTo(profile.pan.x, 0.02, t);
        panner.positionY.rampTo(profile.pan.y, 0.02, t);
        panner.positionZ.rampTo(profile.pan.z, 0.02, t);
        sendColor.frequency.rampTo(profile.voice.reverb.sendCutoffHz, 0.02, t);
        send.gain.rampTo(clamp(profile.reverbSend, 0, 1), 0.02, t);
      },
      dispose() {
        panner.dispose();
        dry.dispose();
        send.dispose();
        sendColor.dispose();
      }
    };
  }
  setFactors(factors) {
    this.room.setFactors(factors);
  }
  setRotation() {
  }
  onViewport() {
  }
  dispose() {
  }
};

// src/spatial/field.ts
var POINTER_YAW_MAX = 40 * DEG;
var POINTER_PITCH_MAX = 20 * DEG;
var TILT_YAW_MAX = 35 * DEG;
var TILT_PITCH_MAX = 25 * DEG;
var FieldRig = class {
  constructor(backend, mode) {
    this.backend = backend;
    this.mode = mode;
    this.target = { yaw: 0, pitch: 0 };
    this.tilt = { yaw: 0, pitch: 0 };
    this.look = { yaw: 0, pitch: 0 };
    this.raf = 0;
    this.running = false;
  }
  start() {
    if (this.running) return;
    this.running = true;
    const step = () => {
      if (!this.running) return;
      const gy = clamp(this.target.yaw + this.tilt.yaw, -Math.PI / 2, Math.PI / 2);
      const gp = clamp(this.target.pitch + this.tilt.pitch, -Math.PI / 3, Math.PI / 3);
      const ny = lerp(this.look.yaw, gy, 0.1);
      const np = lerp(this.look.pitch, gp, 0.1);
      if (Math.abs(ny - this.look.yaw) > 1e-4 || Math.abs(np - this.look.pitch) > 1e-4) {
        this.look.yaw = ny;
        this.look.pitch = np;
        this.backend.setRotation(lookMatrix(this.look.yaw, this.look.pitch));
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  /** I9 — cursor (viewport-normalized 0..1) becomes look direction: right edge = look right. */
  pointTo(tx, ty) {
    if (this.mode !== "pointer") return;
    this.target.yaw = (2 * clamp(tx, 0, 1) - 1) * POINTER_YAW_MAX;
    this.target.pitch = (1 - 2 * clamp(ty, 0, 1)) * POINTER_PITCH_MAX;
  }
  /** I10 — device attitude: γ right-tilt = look right, β beyond ~40° = look up/down. */
  tiltTo(gamma, beta) {
    this.tilt.yaw = clamp(gamma / 45, -1, 1) * TILT_YAW_MAX;
    this.tilt.pitch = clamp((beta - 40) / 45, -1, 1) * -TILT_PITCH_MAX;
  }
  /** Public look API (head tracking / WebXR later plugs in here). Radians, right/up positive. */
  lookAt(yawRight, pitchUp) {
    this.target.yaw = yawRight;
    this.target.pitch = pitchUp;
  }
  get state() {
    return { yaw: this.look.yaw, pitch: this.look.pitch };
  }
  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
};

// src/core/listener.ts
import * as Tone5 from "tone";

// src/math/mapping.ts
var mapping_exports = {};
__export(mapping_exports, {
  ROOM_HALF_H: () => ROOM_HALF_H,
  ROOM_HALF_W: () => ROOM_HALF_W,
  ambienceCutoffFromViewport: () => ambienceCutoffFromViewport,
  attackFromRoundness: () => attackFromRoundness,
  brightnessTilt: () => brightnessTilt,
  cutoffFromDepth: () => cutoffFromDepth,
  degreeFromSize: () => degreeFromSize,
  durationFromElongation: () => durationFromElongation,
  panX: () => panX,
  panY: () => panY,
  pitchNudgeFromRoundness: () => pitchNudgeFromRoundness,
  qFromRoundness: () => qFromRoundness,
  reverbFromViewport: () => reverbFromViewport,
  roundness: () => roundness,
  sendFromShadowBlur: () => sendFromShadowBlur,
  sizeT: () => sizeT,
  stepsFromHeadingLevel: () => stepsFromHeadingLevel,
  stepsFromSiblingIndex: () => stepsFromSiblingIndex,
  velocityFromDepth: () => velocityFromDepth,
  velocityFromSize: () => velocityFromSize,
  waveFromRoundness: () => waveFromRoundness,
  zBonusFromZIndex: () => zBonusFromZIndex,
  zFromDepth: () => zFromDepth
});
var ROOM_HALF_W = 8;
var ROOM_HALF_H = 4;
function panX(rect, vw) {
  return (2 * norm(rect.x + rect.w / 2, 0, vw) - 1) * ROOM_HALF_W;
}
function panY(rect, vh) {
  return (1 - 2 * norm(rect.y + rect.h / 2, 0, vh)) * ROOM_HALF_H;
}
function brightnessTilt(rect, vh) {
  return lerp(1.45, 0.7, norm(rect.y + rect.h / 2, 0, vh));
}
function sizeT(rect, vw, vh) {
  const a = Math.max(1, rect.w * rect.h);
  const A = Math.max(1, vw * vh);
  return norm(Math.log(1 + 100 * a / A), 0, Math.log(101));
}
var degreeFromSize = (t) => 0.1 + 0.75 * (1 - t);
var velocityFromSize = (t) => lerp(0.85, 1.25, t);
function roundness(radiusPx, rect) {
  const half = Math.min(rect.w, rect.h) / 2;
  return half <= 0 ? 0 : clamp(radiusPx / half, 0, 1);
}
function waveFromRoundness(r) {
  if (r < 0.15) return "square";
  if (r < 0.45) return "sawtooth";
  if (r < 0.8) return "triangle";
  return "sine";
}
var attackFromRoundness = (r) => lerp(2e-3, 0.045, r);
var qFromRoundness = (r) => lerp(2.4, 0.5, r);
var pitchNudgeFromRoundness = (r) => (1 - r) * 1;
function durationFromElongation(rect) {
  const e = Math.max(rect.w, rect.h) / Math.max(1, Math.min(rect.w, rect.h));
  return clamp(0.18 * Math.sqrt(e), 0.12, 1.6);
}
var sendFromShadowBlur = (blurPx) => clamp(blurPx / 40, 0, 0.5);
var zFromDepth = (depth) => -(1 + 0.7 * Math.min(depth, 10));
var cutoffFromDepth = (depth) => Math.max(700, 9e3 * Math.pow(0.82, depth));
var velocityFromDepth = (depth) => Math.max(0.55, Math.pow(0.97, depth));
var zBonusFromZIndex = (z) => clamp(z / 50, 0, 1) * 0.8;
var stepsFromSiblingIndex = (i, scaleLen = 7) => i % Math.max(1, scaleLen);
var stepsFromHeadingLevel = (level) => -(7 - clamp(level, 1, 6)) * 2;
function reverbFromViewport(vw) {
  const t = norm(vw, 360, 2200);
  return { decay: lerp(0.6, 4.5, t), wet: lerp(0.08, 0.32, t) };
}
var ambienceCutoffFromViewport = (vw) => lerp(400, 1400, norm(vw, 360, 2200));

// src/core/listener.ts
var ListenerRig = class {
  constructor(mode) {
    this.mode = mode;
    this.target = { x: 0, y: 0 };
    this.tilt = { x: 0, y: 0 };
    this.pos = { x: 0, y: 0 };
    this.raf = 0;
    this.running = false;
  }
  start() {
    if (this.running) return;
    this.running = true;
    const listener = Tone5.getListener();
    listener.forwardX.value = 0;
    listener.forwardY.value = 0;
    listener.forwardZ.value = -1;
    listener.upY.value = 1;
    const step = () => {
      if (!this.running) return;
      const gx = clamp(this.target.x + this.tilt.x, -ROOM_HALF_W, ROOM_HALF_W);
      const gy = clamp(this.target.y + this.tilt.y, -ROOM_HALF_H, ROOM_HALF_H);
      this.pos.x = lerp(this.pos.x, gx, 0.12);
      this.pos.y = lerp(this.pos.y, gy, 0.12);
      try {
        listener.positionX.value = this.pos.x;
        listener.positionY.value = this.pos.y;
        listener.positionZ.value = 0;
      } catch {
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  /** I9 — pointer position (viewport-normalized 0..1) targets the ears. */
  pointTo(tx, ty) {
    if (this.mode !== "pointer") return;
    this.target.x = (2 * clamp(tx, 0, 1) - 1) * ROOM_HALF_W * 0.8;
    this.target.y = (1 - 2 * clamp(ty, 0, 1)) * ROOM_HALF_H * 0.8;
  }
  /** I10 — device tilt offsets the ears (γ → x ±4 m, β → y ±2 m). */
  tiltTo(gamma, beta) {
    this.tilt.x = clamp(gamma / 45, -1, 1) * 4;
    this.tilt.y = clamp((beta - 40) / 45, -1, 1) * -2;
  }
  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
};

// src/core/room.ts
import * as Tone6 from "tone";
var Room = class {
  constructor(opts, vw, factors) {
    this.opts = opts;
    this.wetGain = null;
    this.noise = null;
    this.noiseFilter = null;
    this.noiseGain = null;
    this.rushGain = null;
    this.resizeTimer = null;
    this.mutedNow = false;
    this.toneScale = 1;
    this.limiter = new Tone6.Limiter(-1).toDestination();
    this.master = new Tone6.Volume(opts.volumeDb).connect(this.limiter);
    this.highShelf = new Tone6.Filter({ type: "highshelf", frequency: 4e3, gain: brillianceDb(factors.brilliance) }).connect(this.master);
    this.lowShelf = new Tone6.Filter({ type: "lowshelf", frequency: 250, gain: warmthDb(factors.warmth) }).connect(this.highShelf);
    this.spatialIn = new Tone6.Gain(1).connect(this.lowShelf);
    const { decay, wet } = this.roomParams(vw);
    this.reverb = new Tone6.Reverb({ decay, preDelay: 0.02, wet: 1 });
    if (opts.mode === "panner") {
      this.wetGain = new Tone6.Gain(wet).connect(this.spatialIn);
      this.reverb.connect(this.wetGain);
    }
    this.buses = { dryIn: this.spatialIn, wetIn: this.reverb };
  }
  setFactors(f) {
    this.lowShelf.gain.rampTo(warmthDb(f.warmth), 0.1);
    this.highShelf.gain.rampTo(brillianceDb(f.brilliance), 0.1);
  }
  roomParams(vw) {
    if (this.opts.reverb !== "auto") {
      const decay = clamp(Number(this.opts.reverb) || 1.5, 0.1, 12);
      return { decay, wet: 0.25 };
    }
    return reverbFromViewport(vw);
  }
  /** Debounced: Tone.Reverb regenerates its impulse response when decay changes. */
  resize(vw) {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      const { decay, wet } = this.roomParams(vw);
      try {
        this.reverb.decay = decay;
        this.wetGain?.gain.rampTo(wet, 0.3);
        this.noiseFilter?.frequency.rampTo(ambienceCutoffFromViewport(vw) * this.toneScale, 0.5);
      } catch (err) {
        console.warn("[sonarium] room resize failed", err);
      }
    }, 400);
  }
  /** I13 — room tone (sparkles became the phrase engine, PULSE.md §3). toneScale = CH7 warmth. */
  startAmbience(vw, level, toneScale = 1) {
    if (level <= 0) return;
    this.toneScale = toneScale;
    this.noise = new Tone6.Noise("brown");
    this.noiseFilter = new Tone6.Filter({ frequency: ambienceCutoffFromViewport(vw) * toneScale, type: "lowpass" });
    this.noiseGain = new Tone6.Gain(Tone6.dbToGain(-46) * clamp(level / 0.12, 0, 3));
    this.noise.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.spatialIn);
    this.rushGain = new Tone6.Gain(0);
    this.noiseFilter.connect(this.rushGain);
    this.rushGain.connect(this.spatialIn);
    this.noise.start();
  }
  /** MATTER.md §2.2 — moving through the page moves air. Swells fast, decays in ~450 ms. */
  rush(level) {
    if (!this.rushGain || this.mutedNow) return;
    const now7 = Tone6.now();
    this.rushGain.gain.cancelScheduledValues(now7);
    this.rushGain.gain.rampTo(level, 0.05, now7);
    this.rushGain.gain.rampTo(0, 0.45, now7 + 0.07);
  }
  /** I14 — never sound in a background tab. */
  setHidden(hidden) {
    if (this.mutedNow) return;
    this.master.volume.rampTo(hidden ? -Infinity : this.opts.volumeDb, 0.3);
  }
  setMuted(muted) {
    this.mutedNow = muted;
    this.master.volume.rampTo(muted ? -Infinity : this.opts.volumeDb, 0.15);
  }
  dispose() {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.noise?.dispose();
    this.noiseFilter?.dispose();
    this.noiseGain?.dispose();
    this.rushGain?.dispose();
    this.reverb.dispose();
    this.wetGain?.dispose();
    this.spatialIn.dispose();
    this.lowShelf.dispose();
    this.highShelf.dispose();
    this.master.dispose();
    this.limiter.dispose();
  }
};

// src/math/matter.ts
var matter_exports = {};
__export(matter_exports, {
  PARTIAL_COUNT: () => PARTIAL_COUNT,
  airRushGain: () => airRushGain,
  breath: () => breath,
  deriveMatter: () => deriveMatter,
  detuneJitterCents: () => detuneJitterCents,
  envelopeWeave: () => envelopeWeave,
  filterWeave: () => filterWeave,
  genPartials: () => genPartials,
  glideS: () => glideS,
  reverbWeave: () => reverbWeave,
  subShimmer: () => subShimmer,
  transient: () => transient
});
function deriveMatter(v) {
  const texture = clamp(
    clamp(v.shadowBlurPx / 40, 0, 0.4) + (1 - clamp(v.opacity, 0, 1)) * 0.6 + (v.dashedBorder ? 0.15 : 0) + (v.isMedia ? 0.35 : 0) + clamp(v.backdropBlurPx / 40, 0, 0.2),
    0,
    1
  );
  return {
    edge: clamp(1 - v.roundness, 0, 1),
    mass: clamp(v.sizeT + (v.massBonus ?? 0), 0, 1),
    texture,
    air: clamp(Math.min(v.depth, 10) / 10, 0, 1)
  };
}
var PARTIAL_COUNT = 24;
function genPartials(edge, elongation, richness = 0) {
  const p = Math.max(0.8, 1 + 2.6 * (1 - clamp(edge, 0, 1)) - clamp(richness, 0, 0.5));
  const evenness = lerp(1, 0.12, clamp((elongation - 1) / 4, 0, 1));
  const a = new Float32Array(PARTIAL_COUNT);
  let energy = 0;
  for (let k = 1; k <= PARTIAL_COUNT; k++) {
    const amp = (k % 2 === 1 ? 1 : evenness) / Math.pow(k, p);
    a[k - 1] = amp;
    energy += amp * amp;
  }
  const norm2 = 1 / Math.sqrt(energy || 1);
  for (let i = 0; i < PARTIAL_COUNT; i++) a[i] = a[i] * norm2;
  return a;
}
function transient(edge) {
  const e = clamp(edge, 0, 1);
  return {
    lengthS: lerp(5e-3, 0.025, e),
    hpHz: 2e3 + 4e3 * e,
    level: 0.7 * e
  };
}
function breath(texture) {
  const t = clamp(texture, 0, 1);
  return { level: 0.22 * t, bpRatio: lerp(2.5, 1.2, t) };
}
var detuneJitterCents = (texture) => 6 * clamp(texture, 0, 1);
function subShimmer(mass) {
  const m = clamp(mass, 0, 1);
  return {
    interval: m >= 0.45 ? -12 : 12,
    level: lerp(0.1, 0.38, clamp(Math.abs(m - 0.45) * 2, 0, 1))
  };
}
var glideS = (edge) => lerp(0.028, 0, clamp(edge, 0, 1));
function envelopeWeave(edge, mass) {
  const e = clamp(edge, 0, 1);
  const m = clamp(mass, 0, 1);
  return {
    attackS: lerp(0.045, 2e-3, e) + 8e-3 * m,
    decayS: lerp(0.4, 0.12, e),
    sustain: lerp(0.35, 0.15, e),
    releaseScale: lerp(0.8, 1.5, m)
  };
}
function filterWeave(edge) {
  const e = clamp(edge, 0, 1);
  return {
    q: lerp(0.5, 2.4, e),
    biteAmount: 1 + 3 * e,
    biteDecayS: lerp(0.15, 0.06, e)
  };
}
function reverbWeave(edge, mass, texture) {
  const e = clamp(edge, 0, 1);
  const m = clamp(mass, 0, 1);
  const t = clamp(texture, 0, 1);
  return {
    sendScale: lerp(1.3, 0.7, e) * lerp(0.85, 1.15, m),
    sendCutoffHz: lerp(1200, 7e3, e),
    bloom: 1 - e,
    extentBonus: 0.15 * t
  };
}
var airRushGain = (pxPerMs) => clamp(pxPerMs * 0.06, 0, 0.18);

// src/core/profile.ts
var HEADING = /^H[1-6]$/;
function roleOf(el) {
  const aria = (el.getAttribute("role") || "").toLowerCase();
  const override = el.dataset?.sonicRole;
  if (override) return override;
  const tag = el.tagName;
  const type = (el.getAttribute("type") || "").toLowerCase();
  if (tag === "INPUT" && (type === "checkbox" || type === "radio")) return "toggle";
  if (aria === "switch" || aria === "checkbox" || tag === "SUMMARY") return "toggle";
  if (tag === "BUTTON" || aria === "button" || tag === "INPUT" && (type === "button" || type === "submit" || type === "reset")) return "button";
  if (tag === "A" && el.hasAttribute("href") || aria === "link") return "link";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable) return "input";
  if (HEADING.test(tag) || aria === "heading") return "heading";
  if (tag === "IMG" || tag === "VIDEO" || tag === "SVG" || tag === "CANVAS" || tag === "PICTURE" || tag === "AUDIO") return "media";
  if (tag === "LI" || tag === "TR" || ["listitem", "option", "menuitem", "tab"].includes(aria)) return "item";
  if (["NAV", "SECTION", "ARTICLE", "ASIDE", "FORM", "FIELDSET", "HEADER", "FOOTER", "MAIN", "DIALOG"].includes(tag)) return "container";
  if (["navigation", "region", "group", "list", "menu", "tablist", "dialog"].includes(aria)) return "container";
  if (tag === "P" || tag === "BLOCKQUOTE" || tag === "LABEL" || tag === "SPAN") return "text";
  return "container";
}
function domDepth(el, root) {
  let d = 0;
  let n = el;
  while (n && n !== root && d < 32) {
    n = n.parentElement;
    d++;
  }
  return d;
}
function eligibleSiblingIndex(el) {
  const parent = el.parentElement;
  if (!parent) return 0;
  let i = 0;
  for (const sib of Array.from(parent.children)) {
    if (sib === el) return i;
    if (sib.tagName === el.tagName || roleOf(sib) === roleOf(el)) i++;
  }
  return 0;
}
function recipeFor(role, theme) {
  return { ...theme.defaults, ...theme.roles[role] ?? {} };
}
function isQuiet(el) {
  let n = el;
  while (n) {
    if (n.dataset?.sonic === "quiet") return true;
    n = n.parentElement;
  }
  return false;
}
var NOTE_RE = /^([A-Ga-g][#b]?)(-?\d)$/;
function pinnedMidi(spec) {
  if (!spec) return null;
  const m = spec.trim().match(NOTE_RE);
  if (!m) return null;
  const pcs = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
  const name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  const pc = pcs[name];
  if (pc === void 0) return null;
  return (parseInt(m[2], 10) + 1) * 12 + pc;
}
function sonicVar(cs, name) {
  return cs.getPropertyValue(name).trim();
}
function profileOf(el, env) {
  const { key, theme, vw, vh } = env;
  const html = el;
  const reasons = {};
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const rect = { x: r.x, y: r.y, w: Math.max(1, r.width), h: Math.max(1, r.height) };
  const role = html.dataset?.sonicRole || sonicVar(cs, "--sonic-role") || roleOf(el);
  const recipe = recipeFor(role, theme);
  reasons.role = `<${el.tagName.toLowerCase()}> reads as "${role}" \u2192 ${recipe.synthKind} voice (theme ${theme.name})`;
  const radiusRaw = cs.borderTopLeftRadius;
  const radiusPx = radiusRaw.endsWith("%") ? (parseFloat(radiusRaw) || 0) / 100 * Math.min(rect.w, rect.h) : parseFloat(radiusRaw) || 0;
  const opacity = parseFloat(cs.opacity);
  const shadowBlur = parseShadowBlur(cs.boxShadow);
  const zIndex = cs.position !== "static" ? parseInt(cs.zIndex, 10) || 0 : 0;
  const depth = domDepth(el, env.root);
  const pan = {
    x: panX(rect, vw),
    y: panY(rect, vh),
    z: zFromDepth(depth) + zBonusFromZIndex(zIndex)
  };
  reasons.position = `center (${Math.round(rect.x + rect.w / 2)}, ${Math.round(rect.y + rect.h / 2)}) px \u2192 (${pan.x.toFixed(1)}, ${pan.y.toFixed(1)}) m; depth ${depth} \u2192 ${pan.z.toFixed(1)} m away`;
  const st = sizeT(rect, vw, vh);
  const degree = degreeFromSize(st);
  const round = roundness(radiusPx, rect);
  let steps = stepsFromSiblingIndex(eligibleSiblingIndex(el), key.scale.length) + pitchNudgeFromRoundness(round);
  if (role === "heading") {
    const level = HEADING.test(el.tagName) ? parseInt(el.tagName[1], 10) : 2;
    steps += stepsFromHeadingLevel(level);
  }
  steps += recipe.octaveShift * key.scale.length;
  const pinned = pinnedMidi(html.dataset?.sonicNote ?? sonicVar(cs, "--sonic-note") ?? void 0);
  const midi = pinned ?? degreeToMidi(degree, key, steps);
  reasons.pitch = pinned !== null ? `pinned by data-sonic-note \u2192 ${midiToNoteName(midi)}` : `area ${(rect.w * rect.h / 1e3).toFixed(1)}k px\xB2 (size ${st.toFixed(2)}) + sibling/heading offsets \u2192 ${midiToNoteName(midi)} in ${key.label}`;
  const wave = html.dataset?.sonicWave || sonicVar(cs, "--sonic-wave") || recipe.pinWave || waveFromRoundness(round);
  const attack = attackFromRoundness(round);
  reasons.timbre = `roundness ${round.toFixed(2)} (radius ${radiusPx}px) \u2192 ${wave} wave, ${(attack * 1e3).toFixed(0)} ms attack`;
  const durationS = durationFromElongation(rect);
  reasons.duration = `aspect ${(Math.max(rect.w, rect.h) / Math.min(rect.w, rect.h)).toFixed(1)}:1 \u2192 ${durationS.toFixed(2)} s`;
  const dir = sphereFromRect(rect, vw, vh);
  const extentOverride = parseFloat(html.dataset?.sonicExtent ?? sonicVar(cs, "--sonic-extent"));
  const sphere = {
    azimuth: dir.azimuth,
    elevation: dir.elevation,
    extent: isNaN(extentOverride) ? extentFromSize(st) : clamp(extentOverride, 0, 1),
    directivity: directivityFromRoundness(round)
  };
  reasons.sphere = `az ${(sphere.azimuth / DEG).toFixed(0)}\xB0, el ${(sphere.elevation / DEG).toFixed(0)}\xB0, extent ${sphere.extent.toFixed(2)} (size wraps the listener), directivity ${sphere.directivity.toFixed(2)} (sharp beams, round radiates)`;
  const chroma = elementChroma(el, cs, role);
  const filterHz = cutoffFromDepth(depth) * brightnessTilt(rect, vh) * directivityFilterScale(sphere.directivity) * brightnessFromLuminance(chroma.luminance);
  reasons.filter = `depth ${depth} + vertical position + directivity + luminance \u2192 low-pass ${Math.round(filterHz)} Hz`;
  let velocityScale = recipe.baseVelocity * velocityFromSize(st) * velocityFromDepth(depth) * (isNaN(opacity) ? 1 : opacity) * velocityFromLuminance(chroma.luminance);
  const sonicMode = sonicVar(cs, "--sonic");
  if (isQuiet(el) || sonicMode === "quiet") velocityScale *= 0.4;
  if (sonicMode === "off") {
    velocityScale = 0;
    reasons.silenced = "--sonic: off (aural stylesheet)";
  }
  velocityScale = clamp(velocityScale, 0, 1.5);
  const elongation = Math.max(rect.w, rect.h) / Math.max(1, Math.min(rect.w, rect.h));
  const textish = role === "text" || role === "heading" || role === "link" || role === "button";
  const fontWeight = textish ? parseInt(cs.fontWeight, 10) || 400 : 400;
  const matter = deriveMatter({
    roundness: round,
    sizeT: st,
    depth,
    shadowBlurPx: shadowBlur,
    opacity: isNaN(opacity) ? 1 : opacity,
    dashedBorder: cs.borderTopStyle === "dashed" || cs.borderTopStyle === "dotted",
    isMedia: role === "media",
    backdropBlurPx: parseBackdropBlur(cs),
    massBonus: massBonusFromFontWeight(fontWeight)
  });
  const modVisuals = {
    animationS: cs.animationName && cs.animationName !== "none" ? firstSeconds(cs.animationDuration) : 0,
    borderStyle: ["solid", "dashed", "dotted"].includes(cs.borderTopStyle) ? cs.borderTopStyle : "none",
    borderWidthPx: parseFloat(cs.borderTopWidth) || 0,
    transitionS: firstSeconds(cs.transitionDuration)
  };
  const patch = patchFrom(matter, modVisuals);
  const env0 = envelopeWeave(matter.edge, matter.mass);
  const sub0 = subShimmer(matter.mass);
  const voice = {
    matter,
    partials: Array.from(genPartials(matter.edge, elongation, richnessFromSaturation(chroma.saturation))),
    transient: transient(matter.edge),
    breath: breath(matter.texture),
    subShimmer: {
      interval: sub0.interval,
      level: sub0.level + (sub0.interval < 0 ? subBonusFromWarmth(chroma.warmth) : 0)
    },
    glideS: glideS(matter.edge),
    jitterCents: detuneJitterCents(matter.texture),
    envelope: { ...env0, attackS: env0.attackS * attackScaleFromWarmth(chroma.warmth) },
    filter: filterWeave(matter.edge),
    reverb: reverbWeave(matter.edge, matter.mass, matter.texture),
    patch
  };
  if (patch.fold.mix > 0.05 || patch.fm.index > 0.05 || patch.lfo.rateHz > 0.01 || patch.unison.mix > 0) {
    reasons.patch = [
      patch.fold.mix > 0.05 ? `border drives the wavefolder \xD7${patch.fold.drive.toFixed(2)}` : "",
      patch.fm.index > 0.05 ? `FM ring ${patch.fm.index.toFixed(2)}` : "",
      patch.unison.mix > 0 ? `unison +${patch.unison.detuneCents.toFixed(0)}\xA2` : "",
      patch.lfo.rateHz > 0.01 ? `${patch.lfo.shape} LFO ${patch.lfo.rateHz.toFixed(2)} Hz (${modVisuals.animationS > 0 ? "css animation" : "dashed border"})` : ""
    ].filter(Boolean).join(" \xB7 ");
  }
  reasons.chroma = `warmth ${chroma.warmth.toFixed(2)} \xB7 sat ${chroma.saturation.toFixed(2)} \xB7 lum ${chroma.luminance.toFixed(2)} \u2192 ${chroma.warmth > 0.6 ? "eager onset, full body" : chroma.warmth < 0.4 ? "cool, unhurried onset" : "neutral temperament"}${chroma.saturation > 0.5 ? ", vivid spectrum" : ""}`;
  reasons.matter = `edge ${matter.edge.toFixed(2)} \xB7 mass ${matter.mass.toFixed(2)} \xB7 texture ${matter.texture.toFixed(2)} \xB7 air ${matter.air.toFixed(2)} \u2192 ${voice.transient.level > 0.1 ? "clicky" : "soft"}, ${voice.breath.level > 0.05 ? "breathy" : "clean"}, ${voice.subShimmer.interval < 0 ? "chest sub" : "sparkle +8va"}, ${voice.reverb.bloom > 0.5 ? "blooms into the room" : "dry strike"}`;
  const reverbSend = clamp(
    (0.18 + sendFromShadowBlur(shadowBlur) + 0.05 * Math.min(depth, 10) * 0.5) * voice.reverb.sendScale,
    0,
    1.2
  );
  return {
    role,
    rect,
    pan,
    sphere,
    midi,
    freqHz: midiToFreq(midi),
    degree,
    wave,
    attack,
    release: 0.3 * recipe.releaseScale,
    durationS,
    filterHz,
    filterQ: qFromRoundness(round),
    velocityScale,
    reverbSend,
    synthKind: recipe.synthKind,
    octaveShift: recipe.octaveShift,
    voice,
    chroma,
    reasons
  };
}
function elementChroma(el, cs, role) {
  if (role === "text" || role === "heading" || role === "link") {
    return chromaOf(parseCssColor(cs.color));
  }
  let probe = el;
  let style = cs;
  for (let hops = 0; probe && hops < 6; hops++) {
    const rgb = parseCssColor((style ?? getComputedStyle(probe)).backgroundColor);
    if (rgb && rgb.a >= 0.05) return chromaOf(rgb);
    probe = probe.parentElement;
    style = void 0;
  }
  return chromaOf(parseCssColor(getComputedStyle(document.documentElement).backgroundColor));
}
function firstSeconds(list) {
  const first = (list || "").split(",")[0]?.trim() ?? "";
  if (!first) return 0;
  const v = parseFloat(first);
  if (isNaN(v)) return 0;
  return first.endsWith("ms") ? v / 1e3 : v;
}
function parseBackdropBlur(cs) {
  const bf = cs.backdropFilter || cs.webkitBackdropFilter || "";
  const m = bf.match(/blur\((\d+(\.\d+)?)px\)/);
  return m ? parseFloat(m[1]) : 0;
}
function parseShadowBlur(boxShadow) {
  if (!boxShadow || boxShadow === "none") return 0;
  let max = 0;
  for (const part of boxShadow.split(/,(?![^(]*\))/)) {
    const lengths = part.match(/-?\d+(\.\d+)?px/g);
    if (lengths && lengths.length >= 3) max = Math.max(max, parseFloat(lengths[2]));
  }
  return max;
}

// src/core/scanner.ts
var ELIGIBLE_SELECTOR = [
  "button",
  "[role=button]",
  "input",
  "textarea",
  "select",
  "[contenteditable]",
  "a[href]",
  "[role=link]",
  "summary",
  "[role=switch]",
  "[role=checkbox]",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "[role=heading]",
  "img",
  "video",
  "canvas",
  "svg",
  "picture",
  "li",
  "tr",
  "[role=listitem]",
  "[role=option]",
  "[role=menuitem]",
  "[role=tab]",
  "nav",
  "section",
  "article",
  "aside",
  "form",
  "fieldset",
  "dialog",
  "[data-sonic-role]",
  "[data-sonic-note]"
].join(",");
var MAX_TRACKED = 400;
var Scanner = class {
  constructor(env, cb) {
    this.env = env;
    this.cb = cb;
    this.registry = /* @__PURE__ */ new Map();
    this.io = null;
    this.mo = null;
    this.capWarned = false;
    this.initialScanDone = false;
    this.mutationTimer = null;
  }
  scan() {
    if (typeof IntersectionObserver !== "undefined") {
      this.io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const entry = this.registry.get(e.target);
          if (!entry) continue;
          const was = entry.visible;
          entry.visible = e.isIntersecting;
          if (e.isIntersecting) entry.profile = null;
          if (e.isIntersecting && !was && this.initialScanDone) this.cb.onAppear(e.target);
        }
      }, { threshold: 0.15 });
    }
    this.register(this.env.root);
    for (const el of Array.from(this.env.root.querySelectorAll(ELIGIBLE_SELECTOR))) this.register(el);
    if (typeof MutationObserver !== "undefined") {
      this.mo = new MutationObserver((muts) => this.queueMutations(muts));
      this.mo.observe(this.env.root, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "data-sonic", "data-sonic-note", "data-sonic-wave", "data-sonic-role"] });
    }
    setTimeout(() => {
      this.initialScanDone = true;
    }, 300);
  }
  register(el) {
    if (this.registry.has(el) || this.isOff(el)) return;
    if (this.registry.size >= MAX_TRACKED) {
      if (!this.capWarned) {
        this.capWarned = true;
        console.warn(`[sonarium] page exceeds ${MAX_TRACKED} tracked elements; extra elements stay silent`);
      }
      return;
    }
    this.registry.set(el, { profile: null, visible: false });
    this.io?.observe(el);
  }
  unregister(el) {
    if (!this.registry.has(el)) return;
    this.registry.delete(el);
    this.io?.unobserve(el);
  }
  isOff(el) {
    let n = el;
    while (n) {
      if (n.dataset?.sonic === "off") return true;
      n = n.parentElement;
    }
    return false;
  }
  queueMutations(muts) {
    if (this.mutationTimer) clearTimeout(this.mutationTimer);
    const records = muts;
    this.mutationTimer = setTimeout(() => {
      for (const m of records) {
        if (m.type === "attributes" && m.target instanceof Element) {
          const entry = this.registry.get(m.target);
          if (entry) entry.profile = null;
          continue;
        }
        for (const node of Array.from(m.addedNodes)) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.(ELIGIBLE_SELECTOR)) this.register(node);
          for (const el of Array.from(node.querySelectorAll?.(ELIGIBLE_SELECTOR) ?? [])) this.register(el);
        }
        for (const node of Array.from(m.removedNodes)) {
          if (!(node instanceof Element)) continue;
          this.unregister(node);
          for (const el of Array.from(node.querySelectorAll?.(ELIGIBLE_SELECTOR) ?? [])) this.unregister(el);
        }
      }
    }, 150);
  }
  /** Profile with lazy compute + cache (cheap path: geometry invalidation only nulls it). */
  profileFor(el) {
    if (this.isOff(el)) return null;
    let entry = this.registry.get(el);
    if (!entry) {
      return safeProfile(el, this.env);
    }
    if (!entry.profile) entry.profile = safeProfile(el, this.env);
    return entry.profile;
  }
  /** Geometry changed globally (scroll/resize): rects are stale, voices params survive. */
  invalidateRects() {
    for (const entry of this.registry.values()) entry.profile = null;
  }
  visibleElements() {
    const out = [];
    for (const [el, entry] of this.registry) if (entry.visible) out.push(el);
    return out;
  }
  /** The element (or nearest registered ancestor) the scanner knows about. */
  resolve(target) {
    let n = target;
    while (n) {
      if (this.registry.has(n)) return n;
      n = n.parentElement;
    }
    return null;
  }
  updateEnv(vw, vh) {
    this.env.vw = vw;
    this.env.vh = vh;
  }
  dispose() {
    if (this.mutationTimer) clearTimeout(this.mutationTimer);
    this.io?.disconnect();
    this.mo?.disconnect();
    this.registry.clear();
  }
};
function safeProfile(el, env) {
  try {
    return profileOf(el, env);
  } catch (err) {
    console.warn("[sonarium] profile failed", err);
    return null;
  }
}

// src/core/voices.ts
import * as Tone8 from "tone";

// src/core/matter-voice.ts
import * as Tone7 from "tone";
var FOLD_CURVE = foldCurve();
var MatterVoice = class {
  constructor() {
    this.startedSources = false;
    this.held = false;
    this.out = new Tone7.Gain(1);
    this.mix = new Tone7.Gain(0.9);
    this.oscA = new Tone7.Oscillator({ frequency: 220 });
    this.oscA2 = new Tone7.Oscillator({ frequency: 220 });
    this.oscB = new Tone7.Oscillator({ frequency: 110, type: "sine" });
    this.oscBGain = new Tone7.Gain(0.2);
    this.foldPre = new Tone7.Gain(0.3);
    this.foldShaper = new Tone7.WaveShaper(FOLD_CURVE);
    this.foldWet = new Tone7.Gain(0);
    this.foldDry = new Tone7.Gain(1);
    this.oscA.connect(this.foldPre);
    this.foldPre.connect(this.foldShaper);
    this.foldShaper.connect(this.foldWet);
    this.foldWet.connect(this.mix);
    this.oscA.connect(this.foldDry);
    this.foldDry.connect(this.mix);
    this.unisonGain = new Tone7.Gain(0);
    this.oscA2.connect(this.unisonGain);
    this.unisonGain.connect(this.mix);
    this.fmGain = new Tone7.Gain(0);
    this.oscB.connect(this.fmGain);
    this.fmGain.connect(this.oscA.frequency);
    this.oscB.connect(this.oscBGain);
    this.oscBGain.connect(this.mix);
    this.breathNoise = new Tone7.Noise("pink");
    this.breathFilter = new Tone7.Filter({ type: "bandpass", frequency: 600, Q: 1.1 });
    this.breathGain = new Tone7.Gain(0);
    this.breathNoise.connect(this.breathFilter);
    this.breathFilter.connect(this.breathGain);
    this.breathGain.connect(this.mix);
    this.ampEnv = new Tone7.AmplitudeEnvelope({ attack: 0.01, decay: 0.2, sustain: 0.25, release: 0.3 });
    this.mix.connect(this.ampEnv);
    this.ampEnv.connect(this.out);
    this.burstNoise = new Tone7.Noise("white");
    this.burstFilter = new Tone7.Filter({ type: "highpass", frequency: 3e3 });
    this.burstEnv = new Tone7.AmplitudeEnvelope({ attack: 1e-3, decay: 0.02, sustain: 0, release: 0.02 });
    this.burstNoise.connect(this.burstFilter);
    this.burstFilter.connect(this.burstEnv);
    this.burstEnv.connect(this.out);
    this.lfo = new Tone7.LFO({ frequency: 0.5, min: -1, max: 1, type: "sine" });
    this.lfoVib = new Tone7.Gain(0);
    this.lfoTrem = new Tone7.Gain(0);
    this.modFilterOut = new Tone7.Gain(0);
    this.lfo.connect(this.lfoVib);
    this.lfo.connect(this.lfoTrem);
    this.lfo.connect(this.modFilterOut);
    this.lfoVib.connect(this.oscA.detune);
    this.lfoVib.connect(this.oscA2.detune);
    this.lfoTrem.connect(this.mix.gain);
  }
  connect(dest) {
    this.out.connect(dest);
    return this;
  }
  ensureRunning(when) {
    if (this.startedSources) return;
    this.startedSources = true;
    this.oscA.start(when);
    this.oscA2.start(when);
    this.oscB.start(when);
    this.breathNoise.start(when);
    this.burstNoise.start(when);
    this.lfo.start(when);
  }
  /** MODULAR.md §4 — idle lanes power down completely; the next trigger restarts in place. */
  sleep() {
    if (!this.startedSources || this.held) return;
    this.startedSources = false;
    try {
      this.oscA.stop();
      this.oscA2.stop();
      this.oscB.stop();
      this.breathNoise.stop();
      this.burstNoise.stop();
      this.lfo.stop();
    } catch {
    }
  }
  /** Everything both trigger() and gateOn() share: spectrum, patch, pitch, modulation. */
  applyVoice(t, when, baseCutoffHz) {
    const v = t.voice;
    this.ensureRunning(when);
    this.oscA.partials = v.partials;
    this.oscA2.partials = v.partials;
    const jitter = (Math.random() * 2 - 1) * v.jitterCents;
    this.oscA.detune.setValueAtTime(jitter, when);
    const glide = v.glideS + v.patch.portamentoS;
    if (glide > 2e-3 && !this.held) {
      this.oscA.frequency.setValueAtTime(t.freqHz * 0.917, when);
      this.oscA.frequency.rampTo(t.freqHz, glide, when);
    } else {
      this.oscA.frequency.setValueAtTime(t.freqHz, when);
    }
    this.oscA2.frequency.setValueAtTime(t.freqHz, when);
    this.oscA2.detune.setValueAtTime(jitter + v.patch.unison.detuneCents, when);
    this.unisonGain.gain.rampTo(v.patch.unison.mix, 0.02, when);
    this.oscB.frequency.setValueAtTime(t.freqHz * Math.pow(2, v.subShimmer.interval / 12), when);
    this.oscBGain.gain.rampTo(v.subShimmer.level, 0.02, when);
    this.foldPre.gain.rampTo(0.3 + v.patch.fold.drive * 1.2, 0.02, when);
    this.foldWet.gain.rampTo(v.patch.fold.mix, 0.02, when);
    this.foldDry.gain.rampTo(1 - v.patch.fold.mix * 0.7, 0.02, when);
    this.fmGain.gain.rampTo(v.patch.fm.index * t.freqHz, 0.02, when);
    const lfoOn = v.patch.lfo.rateHz > 0.01;
    this.lfo.frequency.value = Math.max(0.01, v.patch.lfo.rateHz);
    this.lfo.type = v.patch.lfo.shape;
    this.lfoVib.gain.rampTo(lfoOn ? v.patch.lfo.vibratoCents : 0, 0.05, when);
    this.lfoTrem.gain.rampTo(lfoOn ? 0.9 * v.patch.lfo.tremolo : 0, 0.05, when);
    this.modFilterOut.gain.rampTo(lfoOn ? v.patch.lfo.filterDepth * baseCutoffHz : 0, 0.05, when);
    this.breathFilter.frequency.rampTo(Math.min(8e3, t.freqHz * v.breath.bpRatio), 0.02, when);
    this.breathGain.gain.rampTo(v.breath.level, 0.02, when);
    this.ampEnv.attack = v.envelope.attackS;
    this.ampEnv.decay = v.envelope.decayS;
    this.ampEnv.sustain = v.envelope.sustain;
    this.ampEnv.release = 0.3 * t.releaseScaleBase * v.envelope.releaseScale;
  }
  trigger(t, when, baseCutoffHz = 4e3) {
    this.applyVoice(t, when, baseCutoffHz);
    this.ampEnv.triggerAttackRelease(t.durationS, when, t.velocity);
    if (t.voice.transient.level > 0.02) {
      this.burstFilter.frequency.setValueAtTime(t.voice.transient.hpHz, when);
      this.burstEnv.decay = t.voice.transient.lengthS;
      this.burstEnv.triggerAttackRelease(t.voice.transient.lengthS, when, t.velocity * t.voice.transient.level);
    }
  }
  // ----------------------------------------------------------- ribbon (MODULAR.md §3)
  gateOn(t, when, baseCutoffHz = 4e3) {
    this.applyVoice(t, when, baseCutoffHz);
    this.held = true;
    this.ampEnv.sustain = Math.max(0.4, t.voice.envelope.sustain);
    this.ampEnv.triggerAttack(when, t.velocity);
  }
  /** Ribbon pitch move — quantized upstream; the portamento IS the glissando feel. */
  setFreq(freqHz, glideS2, subInterval, fmIndex2) {
    const g = Math.max(0.015, glideS2);
    this.oscA.frequency.rampTo(freqHz, g);
    this.oscA2.frequency.rampTo(freqHz, g);
    this.oscB.frequency.rampTo(freqHz * Math.pow(2, subInterval / 12), g);
    this.fmGain.gain.rampTo(fmIndex2 * freqHz, g);
  }
  gateOff(when) {
    this.held = false;
    this.ampEnv.triggerRelease(when ?? Tone7.now());
    return this.ampEnv.release;
  }
  releaseTail() {
    return this.ampEnv.release;
  }
  dispose() {
    for (const n of [
      this.oscA,
      this.oscA2,
      this.oscB,
      this.oscBGain,
      this.fmGain,
      this.foldPre,
      this.foldShaper,
      this.foldWet,
      this.foldDry,
      this.unisonGain,
      this.breathNoise,
      this.breathFilter,
      this.breathGain,
      this.burstNoise,
      this.burstFilter,
      this.burstEnv,
      this.lfo,
      this.lfoVib,
      this.lfoTrem,
      this.modFilterOut,
      this.ampEnv,
      this.mix,
      this.out
    ]) n.dispose();
  }
};

// src/core/voices.ts
var VoicePool = class {
  constructor(backend, maxVoices) {
    this.backend = backend;
    this.maxVoices = maxVoices;
    this.lanes = [];
    this.maxVoices = clamp(maxVoices, 4, 24);
    this.sleepTimer = setInterval(() => {
      const now7 = Tone8.now();
      for (const lane of this.lanes) {
        if (lane.synth instanceof MatterVoice && lane.busyUntil < now7 - 30) lane.synth.sleep();
      }
    }, 1e4);
  }
  createSynth(kind) {
    switch (kind) {
      case "matter":
        return new MatterVoice();
      case "fm":
        return new Tone8.FMSynth({ harmonicity: 3, modulationIndex: 8, envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 1.4 }, modulationEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 1 } });
      case "pluck":
        return new Tone8.PluckSynth({ attackNoise: 1, dampening: 3e3, resonance: 0.92 });
      case "membrane":
        return new Tone8.MembraneSynth({ pitchDecay: 0.04, octaves: 5, envelope: { attack: 1e-3, decay: 0.35, sustain: 0.01, release: 0.6 } });
      case "noise":
        return new Tone8.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 1e-3, decay: 0.06, sustain: 0, release: 0.05 } });
      default:
        return new Tone8.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.25, release: 0.3 } });
    }
  }
  createLane(kind) {
    const synth = this.createSynth(kind);
    const filter = new Tone8.Filter({ frequency: 4e3, type: "lowpass", rolloff: -12, Q: 1 });
    const out = this.backend.createOutput();
    synth.connect(filter);
    filter.connect(out.input);
    if (synth instanceof MatterVoice) synth.modFilterOut.connect(filter.frequency);
    const lane = { kind, synth, filter, out, busyUntil: 0 };
    this.lanes.push(lane);
    return lane;
  }
  acquire(kind) {
    const now7 = Tone8.now();
    let candidate = null;
    let oldestSameKind = null;
    let oldestAny = null;
    for (const lane of this.lanes) {
      if (lane.kind === kind) {
        if (lane.busyUntil <= now7) {
          candidate = lane;
          break;
        }
        if (!oldestSameKind || lane.busyUntil < oldestSameKind.busyUntil) oldestSameKind = lane;
      }
      if (!oldestAny || lane.busyUntil < oldestAny.busyUntil) oldestAny = lane;
    }
    if (candidate) return candidate;
    if (this.lanes.length < this.maxVoices) return this.createLane(kind);
    if (oldestSameKind) return oldestSameKind;
    const victim = oldestAny ?? this.lanes[0];
    victim.synth.dispose();
    victim.synth = this.createSynth(kind);
    victim.synth.connect(victim.filter);
    victim.kind = kind;
    return victim;
  }
  /** Configure a lane from the profile, then sound it. `when` lets strums schedule ahead. */
  trigger(profile, velocity, when) {
    const raw = velocity * profile.velocityScale;
    if (raw <= 0.01) return;
    const t = when ?? Tone8.now();
    const vel = clamp(raw, 0.03, 1);
    const lane = this.acquire(profile.synthKind);
    const baseCutoff = Math.max(200, profile.filterHz);
    if (lane.kind === "matter") {
      const w = profile.voice;
      lane.filter.Q.rampTo(w.filter.q, 0.02, t);
      lane.filter.frequency.cancelScheduledValues(t);
      lane.filter.frequency.setValueAtTime(Math.min(12e3, baseCutoff * w.filter.biteAmount), t);
      lane.filter.frequency.exponentialRampTo(baseCutoff, w.filter.biteDecayS, t);
    } else {
      lane.filter.frequency.rampTo(baseCutoff, 0.02, t);
      lane.filter.Q.rampTo(profile.filterQ, 0.02, t);
    }
    lane.out.setPlacement(profile, t);
    const dur = profile.durationS;
    try {
      switch (lane.kind) {
        case "matter": {
          const mv = lane.synth;
          mv.trigger({
            freqHz: profile.freqHz,
            velocity: vel,
            durationS: dur,
            releaseScaleBase: profile.release / 0.3,
            voice: profile.voice
          }, t, baseCutoff);
          lane.busyUntil = t + dur + mv.releaseTail();
          return;
        }
        case "noise": {
          ;
          lane.synth.triggerAttackRelease(Math.min(dur, 0.2), t, vel);
          break;
        }
        case "pluck": {
          const pluck = lane.synth;
          pluck.set({ dampening: clamp(profile.filterHz, 400, 7e3) });
          pluck.triggerAttackRelease(profile.freqHz, dur, t, vel);
          break;
        }
        case "membrane": {
          const mem = lane.synth;
          mem.set({ envelope: { attack: Math.max(1e-3, profile.attack / 4), release: profile.release } });
          mem.triggerAttackRelease(Math.max(30, profile.freqHz / 4), dur, t, vel);
          break;
        }
        case "fm": {
          const fm = lane.synth;
          fm.set({ envelope: { attack: profile.attack, release: profile.release * 2 } });
          fm.triggerAttackRelease(profile.freqHz, dur, t, vel);
          break;
        }
        default: {
          const syn = lane.synth;
          syn.set({
            oscillator: { type: profile.wave },
            envelope: { attack: profile.attack, decay: 0.08, sustain: 0.25, release: profile.release }
          });
          syn.triggerAttackRelease(profile.freqHz, dur, t, vel);
        }
      }
      lane.busyUntil = t + dur + profile.release;
    } catch (err) {
      console.warn("[sonarium] trigger failed", err);
    }
  }
  get activeCount() {
    const now7 = Tone8.now();
    return this.lanes.filter((l) => l.busyUntil > now7).length;
  }
  /** MODULAR.md §3 — a sustained ribbon voice. Returns null when no matter lane can gate. */
  sustain(profile, velocity) {
    const raw = velocity * profile.velocityScale;
    if (raw <= 0.01) return null;
    const lane = this.acquire("matter");
    if (!(lane.synth instanceof MatterVoice)) return null;
    const mv = lane.synth;
    const t = Tone8.now();
    const baseCutoff = Math.max(200, profile.filterHz);
    lane.filter.Q.rampTo(profile.voice.filter.q, 0.02, t);
    lane.filter.frequency.cancelScheduledValues(t);
    lane.filter.frequency.setValueAtTime(Math.min(12e3, baseCutoff * profile.voice.filter.biteAmount), t);
    lane.filter.frequency.exponentialRampTo(baseCutoff, profile.voice.filter.biteDecayS, t);
    lane.out.setPlacement(profile, t);
    mv.gateOn({
      freqHz: profile.freqHz,
      velocity: clamp(raw, 0.03, 1),
      durationS: 9999,
      releaseScaleBase: profile.release / 0.3,
      voice: profile.voice
    }, t, baseCutoff);
    lane.busyUntil = t + 9999;
    const voice = profile.voice;
    return {
      setFreq(hz, glideS2) {
        mv.setFreq(hz, glideS2, voice.subShimmer.interval, voice.patch.fm.index);
      },
      release() {
        const tail = mv.gateOff();
        lane.busyUntil = Tone8.now() + tail;
      }
    };
  }
  dispose() {
    clearInterval(this.sleepTimer);
    for (const lane of this.lanes) {
      lane.synth.dispose();
      lane.filter.dispose();
      lane.out.dispose();
    }
    this.lanes = [];
  }
};

// src/interact/pointer.ts
var PREVIEW_ROLES = /* @__PURE__ */ new Set(["button", "link", "toggle", "input", "item", "heading", "media", "text"]);
var HOVER_THROTTLE_MS = 80;
var SCROLL_SUPPRESS_MS = 250;
var MOVE_FRESHNESS_MS = 400;
var MAX_RESOLVE_HOPS = 4;
function attachPointer(engine) {
  const lastHover = /* @__PURE__ */ new WeakMap();
  let lastScrollT = -Infinity;
  let lastMoveT = -Infinity;
  const onMove = (e) => {
    lastMoveT = performance.now();
    engine.rig?.pointTo(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
  };
  const onScroll = () => {
    lastScrollT = performance.now();
  };
  const withinHops = (target, resolved) => {
    let n = target;
    for (let d = 0; n && d <= MAX_RESOLVE_HOPS; d++) {
      if (n === resolved) return true;
      n = n.parentElement;
    }
    return false;
  };
  const onOver = (e) => {
    const now7 = performance.now();
    if (now7 - lastScrollT < SCROLL_SUPPRESS_MS) return;
    if (now7 - lastMoveT > MOVE_FRESHNESS_MS) return;
    const target = e.target;
    const el = engine.scanner?.resolve(target);
    if (!el || !target || !withinHops(target, el)) return;
    const profile = engine.scanner.profileFor(el);
    if (!profile || !PREVIEW_ROLES.has(profile.role)) return;
    if (now7 - (lastHover.get(el) ?? -Infinity) < HOVER_THROTTLE_MS) return;
    lastHover.set(el, now7);
    engine.excite(el, 0.25, "preview");
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerover", onOver, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerover", onOver);
    window.removeEventListener("scroll", onScroll, { capture: true });
  };
}

// src/interact/activate.ts
var DEDUPE_MS = 80;
function attachActivate(engine) {
  const lastHit = /* @__PURE__ */ new WeakMap();
  const activate = (target) => {
    const el = engine.scanner?.resolve(target);
    if (!el) return;
    const now7 = performance.now();
    if (now7 - (lastHit.get(el) ?? -Infinity) < DEDUPE_MS) return;
    lastHit.set(el, now7);
    const profile = engine.scanner.profileFor(el);
    if (!profile) return;
    if (profile.role === "toggle") return;
    if (profile.role === "container") {
      const children = Array.from(el.querySelectorAll(ELIGIBLE_SELECTOR)).filter((c) => c.parentElement && engine.scanner.resolve(c) === c).filter((c) => {
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
      });
      if (children.length >= 2) {
        engine.strum(children, 0.5);
        return;
      }
    }
    engine.excite(el, 0.75, "hit");
  };
  const onPointerDown = (e) => activate(e.target);
  const onClick = (e) => activate(e.target);
  const onChange = (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.type !== "checkbox" && t.type !== "radio") return;
    const on = t.checked;
    engine.excite(t, 0.5, on ? "toggle-on" : "toggle-off");
  };
  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("click", onClick, { passive: true });
  window.addEventListener("change", onChange, { passive: true });
  return () => {
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("click", onClick);
    window.removeEventListener("change", onChange);
  };
}

// src/interact/keyboard.ts
var TICK_THROTTLE_MS = 30;
var FILL_INTERVALS = [0, 2, 4, 7, 9, 12, 14, 16];
function attachKeyboard(engine) {
  let lastTick = 0;
  let lastPointerDownT = -Infinity;
  const onPointerDown = () => {
    lastPointerDownT = performance.now();
  };
  const onFocus = (e) => {
    if (performance.now() - lastPointerDownT < 500) return;
    const el = engine.scanner?.resolve(e.target);
    if (el) engine.excite(el, 0.35, "preview");
  };
  const onKeydown = (e) => {
    const t = e.target;
    const editable = t instanceof HTMLElement && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable);
    if (!editable) return;
    const now7 = performance.now();
    if (now7 - lastTick < TICK_THROTTLE_MS) return;
    lastTick = now7;
    const len = t.value?.length ?? t.textContent?.length ?? 0;
    const interval = FILL_INTERVALS[Math.min(FILL_INTERVALS.length - 1, Math.floor(len / 4))];
    engine.excite(t, 0.15, "tick", void 0, interval);
  };
  window.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
  window.addEventListener("focusin", onFocus, { passive: true });
  window.addEventListener("keydown", onKeydown, { passive: true });
  return () => {
    window.removeEventListener("pointerdown", onPointerDown, { capture: true });
    window.removeEventListener("focusin", onFocus);
    window.removeEventListener("keydown", onKeydown);
  };
}

// src/interact/scroll.ts
function attachScroll(engine) {
  let scrollQueued = false;
  let lastY = window.scrollY;
  let lastT = performance.now();
  const onScroll = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      engine.geometryChanged();
      const now7 = performance.now();
      const dt = Math.max(1, now7 - lastT);
      const v = Math.abs(window.scrollY - lastY) / dt;
      lastY = window.scrollY;
      lastT = now7;
      engine.airRush(airRushGain(v));
    });
  };
  let resizeQueued = false;
  const onResize = () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      engine.roomResized();
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  window.addEventListener("resize", onResize, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll, { capture: true });
    window.removeEventListener("resize", onResize);
  };
}

// src/interact/motion.ts
var SHAKE_THRESHOLD = 18;
var SHAKE_REFRACTORY_MS = 600;
function attachMotion(engine) {
  if (typeof DeviceOrientationEvent === "undefined") return () => {
  };
  let lastShake = 0;
  let attached = false;
  const onOrientation = (e) => {
    if (e.gamma == null || e.beta == null) return;
    engine.rig?.tiltTo(e.gamma, e.beta);
  };
  const onMotion = (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null || a.z == null) return;
    const magnitude = Math.abs(Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) - 9.81);
    const now7 = performance.now();
    if (magnitude > SHAKE_THRESHOLD && now7 - lastShake > SHAKE_REFRACTORY_MS) {
      lastShake = now7;
      engine.strum(engine.scanner.visibleElements(), 0.5);
    }
  };
  const listen = () => {
    if (attached) return;
    attached = true;
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    window.addEventListener("devicemotion", onMotion, { passive: true });
  };
  const request = DeviceOrientationEvent.requestPermission;
  if (typeof request === "function") {
    request.call(DeviceOrientationEvent).then((state) => {
      if (state === "granted") listen();
    }).catch(() => {
    });
  } else {
    listen();
  }
  return () => {
    if (!attached) return;
    window.removeEventListener("deviceorientation", onOrientation);
    window.removeEventListener("devicemotion", onMotion);
  };
}

// src/interact/drag.ts
var START_PX = 14;
function attachDrag(engine) {
  let session = null;
  const onDown = (e) => {
    if (!e.isPrimary) return;
    const el = engine.scanner?.resolve(e.target);
    if (!el) return;
    const p = engine.scanner.profileFor(el);
    if (!p || p.role === "container" || p.role === "text") return;
    session = { x0: e.clientX, el, handle: null };
  };
  const onMove = (e) => {
    if (!session) return;
    const dx = e.clientX - session.x0;
    if (!session.handle) {
      if (Math.abs(dx) < START_PX) return;
      session.handle = engine.ribbon(session.el);
      if (!session.handle) {
        session = null;
        return;
      }
    }
    session.handle.move(dx);
  };
  const end = () => {
    session?.handle?.release();
    session = null;
  };
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", end, { passive: true });
  window.addEventListener("pointercancel", end, { passive: true });
  return () => {
    end();
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
  };
}

// src/core/engine.ts
var Engine = class {
  constructor(userOpts = {}) {
    this.state = "idle";
    this.muted = false;
    this.pool = null;
    this.room = null;
    this.rig = null;
    this.backend = null;
    this.phraseLoop = null;
    this.activity = /* @__PURE__ */ new WeakMap();
    this.gate = null;
    this.detachers = [];
    this.listeners = /* @__PURE__ */ new Map();
    this.unlockHandler = null;
    this.appearBucket = 6;
    this.bucketTimer = null;
    this.starting = false;
    if (typeof window === "undefined" || typeof document === "undefined") {
      throw new Error("[sonarium] requires a browser environment (create() in the client only)");
    }
    const reduced = (userOpts.respectReducedMotion ?? true) && typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    this.palette = pagePalette(
      chromaOf(parseCssColor(bodyStyle.backgroundColor)),
      chromaOf(parseCssColor(bodyStyle.color))
    );
    const cssKey = rootStyle.getPropertyValue("--sonic-key").trim();
    let key = (userOpts.key && userOpts.key !== "auto" ? parseKey(userOpts.key) : null) ?? (cssKey ? parseKey(cssKey) : null);
    if (!key) {
      const hashed = siteKey(location.hostname);
      const mode = modeFromPalette(this.palette);
      key = mode ? { ...hashed, scaleName: mode, scale: SCALES[mode], label: `${hashed.label.split(" ")[0]} ${mode}` } : hashed;
    }
    this.opts = {
      root: userOpts.root ?? document.body,
      theme: resolveTheme(userOpts.theme),
      key,
      listener: userOpts.listener ?? "pointer",
      ambient: reduced ? 0 : clamp(userOpts.ambient ?? 0.12, 0, 1),
      motion: userOpts.motion ?? true,
      gate: userOpts.gate ?? "chip",
      volume: userOpts.volume ?? -10,
      maxVoices: clamp(userOpts.maxVoices ?? 18, 4, 24),
      panning: userOpts.panning === "equalpower" ? "equalpower" : "HRTF",
      spatial: userOpts.spatial === "panner" ? "panner" : "ambisonic",
      reverb: userOpts.reverb ?? "auto",
      velocityFactor: reduced ? 0.7 : 1
    };
    this.factors = resolveFactors(userOpts.perceptual);
    this.env = {
      root: this.opts.root,
      key: this.opts.key,
      theme: this.opts.theme,
      vw: window.innerWidth,
      vh: window.innerHeight
    };
    this.muted = isMutedPersisted();
    this.scanner = new Scanner(this.env, { onAppear: (el) => this.whisper(el) });
    this.scanner.scan();
    const cssTempo = parseFloat(rootStyle.getPropertyValue("--sonic-tempo"));
    this.tempo = cssTempo > 0 ? clamp(Math.round(cssTempo), 30, 200) : tempoFromPage(this.scanner.registry.size, tempoScaleFromWarmth(this.palette.warmth));
    this.arm();
  }
  // ---------------------------------------------------------------- lifecycle
  arm() {
    this.state = "armed";
    if (this.opts.gate === "chip") {
      this.gate = mountGate(() => this.toggleMute());
      this.gate.setState(this.muted ? "muted" : "armed");
    }
    if (!this.muted) {
      this.unlockHandler = () => {
        void this.start();
      };
      window.addEventListener("pointerdown", this.unlockHandler, { capture: true });
      window.addEventListener("keydown", this.unlockHandler, { capture: true });
      window.addEventListener("click", this.unlockHandler, { capture: true });
    }
  }
  removeUnlockListeners() {
    if (!this.unlockHandler) return;
    window.removeEventListener("pointerdown", this.unlockHandler, { capture: true });
    window.removeEventListener("keydown", this.unlockHandler, { capture: true });
    window.removeEventListener("click", this.unlockHandler, { capture: true });
    this.unlockHandler = null;
  }
  async start() {
    if (this.state === "running" || this.state === "disposed" || this.starting) return;
    this.starting = true;
    try {
      await Promise.race([Tone9.start(), new Promise((r) => setTimeout(r, 1500))]);
    } catch (err) {
      console.warn("[sonarium] audio context could not start yet", err);
    } finally {
      this.starting = false;
    }
    if (Tone9.getContext().state !== "running" || this.state === "disposed") return;
    this.state = "running";
    this.removeUnlockListeners();
    this.gate?.setState(this.muted ? "muted" : "on");
    this.buildAudioGraph();
    if (this.muted) this.room?.setMuted(true);
    this.detachers.push(
      attachPointer(this),
      attachActivate(this),
      attachKeyboard(this),
      attachScroll(this),
      attachDrag(this)
    );
    if (this.opts.motion) this.detachers.push(attachMotion(this));
    const onVis = () => this.room?.setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    this.detachers.push(() => document.removeEventListener("visibilitychange", onVis));
    this.bucketTimer = setInterval(() => {
      this.appearBucket = Math.min(6, this.appearBucket + 6);
    }, 1e3);
    Tone9.getTransport().bpm.value = this.tempo;
    Tone9.getTransport().start();
    this.room?.startAmbience(this.env.vw, this.opts.ambient, roomToneScaleFromWarmth(this.palette.warmth));
    if (this.opts.ambient > 0) {
      this.phraseLoop = new Tone9.Loop((time) => this.playPhrase(time), "1m");
      this.phraseLoop.start("1m");
    }
    this.playIntroMotif();
    this.emit("start");
  }
  /** PULSE.md §3 — the ambience reads the layout as a score; scroll moves the playhead. */
  playPhrase(time) {
    if (this.state !== "running" || this.muted || document.hidden) return;
    if (time === void 0 || !Number.isFinite(time)) time = Tone9.now();
    if (Math.random() > PHRASE_PROBABILITY) return;
    const pool = this.scanner.visibleElements().map((el) => ({ el, p: this.scanner.profileFor(el) })).filter((x) => !!x.p && x.p.role !== "container" && x.p.velocityScale > 0.01).sort((a, b) => readingOrderKey(a.p.rect.y, a.p.rect.x) - readingOrderKey(b.p.rect.y, b.p.rect.x));
    if (pool.length < PHRASE_MIN_NOTES) return;
    const len = Math.min(pool.length, PHRASE_MIN_NOTES + Math.floor(Math.random() * (PHRASE_MAX_NOTES - PHRASE_MIN_NOTES + 1)));
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const start2 = phraseWindow(pool.length, len, window.scrollY / scrollable);
    const step = secondsPerBeat(this.tempo) / 2;
    const level = 0.07 * (this.opts.ambient / 0.12);
    pool.slice(start2, start2 + len).forEach(({ el }, i) => this.excite(el, level, "phrase", time + i * step));
  }
  /**
   * SPATIAL.md §6 — ambisonic field by default; if its construction throws on an exotic
   * browser, fall back to the v0.1 per-voice panner world rather than staying silent.
   */
  buildAudioGraph() {
    const roomOpts = { volumeDb: this.opts.volume, reverb: this.opts.reverb, ambient: this.opts.ambient };
    if (this.opts.spatial === "ambisonic") {
      try {
        this.room = new Room({ ...roomOpts, mode: "ambisonic" }, this.env.vw, this.factors);
        const decoderKind = this.opts.panning === "equalpower" ? "stereo" : "binaural";
        this.backend = new AmbisonicBackend(this.room, decoderKind, this.env.vw, this.factors);
        this.rig = new FieldRig(this.backend, this.opts.listener);
        this.rig.start();
        this.pool = new VoicePool(this.backend, this.opts.maxVoices);
        return;
      } catch (err) {
        console.warn("[sonarium] ambisonic backend unavailable, falling back to panner", err);
        this.room?.dispose();
        this.room = null;
      }
    }
    this.room = new Room({ ...roomOpts, mode: "panner" }, this.env.vw, this.factors);
    this.backend = new PannerBackend(this.room, this.opts.panning);
    this.rig = new ListenerRig(this.opts.listener);
    this.rig.start();
    this.pool = new VoicePool(this.backend, this.opts.maxVoices);
  }
  /**
   * MODULAR.md §3 — the ribbon controller: press-and-drag turns an element into a sustained
   * voice swept across scale degrees (quantized — the glide between steps is the glissando).
   */
  ribbon(el) {
    if (this.state !== "running" || this.muted || !this.pool) return null;
    const target = this.scanner.resolve(el) ?? el;
    const profile = this.scanner.profileFor(target);
    if (!profile) return null;
    const handle = this.pool.sustain(profile, 0.6);
    if (!handle) return null;
    this.emit("trigger", { el: target, profile, velocity: 0.6, articulation: "ribbon" });
    const key = this.opts.key;
    const glide = 0.03 + profile.voice.patch.portamentoS;
    let lastMidi = profile.midi;
    return {
      move: (dxPx) => {
        const midi = stepInScale(profile.midi, key, ribbonSteps(dxPx, this.env.vw, key.scale.length));
        if (midi !== lastMidi) {
          lastMidi = midi;
          handle.setFreq(midiToFreq(midi), glide);
        }
      },
      release: () => handle.release()
    };
  }
  /** MATTER.md §2.2 — scroll drivers report air movement; rides the room-tone noise. */
  airRush(level) {
    if (this.state !== "running" || this.muted || level <= 5e-3) return;
    this.room?.rush(level);
  }
  /** Live spat5.oper surface: adjust presence/roomPresence/envelopment/warmth/brilliance. */
  setPerceptual(partial) {
    this.factors = resolveFactors({ ...this.factors, ...partial });
    this.backend?.setFactors(this.factors);
  }
  toggleMute() {
    if (this.state !== "running") {
      this.muted = false;
      persistMuted(false);
      void this.start();
      return;
    }
    this.muted = !this.muted;
    persistMuted(this.muted);
    this.room?.setMuted(this.muted);
    this.gate?.setState(this.muted ? "muted" : "on");
    this.emit("mute", this.muted);
  }
  dispose() {
    if (this.state === "disposed") return;
    this.state = "disposed";
    this.removeUnlockListeners();
    if (this.bucketTimer) clearInterval(this.bucketTimer);
    this.phraseLoop?.dispose();
    for (const detach of this.detachers.splice(0)) {
      try {
        detach();
      } catch {
      }
    }
    this.scanner?.dispose();
    this.rig?.dispose();
    this.pool?.dispose();
    this.backend?.dispose();
    this.room?.dispose();
    this.gate?.dispose();
    this.emit("dispose");
    this.listeners.clear();
  }
  // ---------------------------------------------------------------- sounding
  /**
   * The single entry point for anything that wants to sound an element (Invariant: L2 drivers
   * never touch Tone). Resolves the element to its profile and rents a voice.
   * `transpose` shifts in semitones relative to the quantized pitch — callers must pass
   * consonant intervals only (e.g. keyboard.ts FILL_INTERVALS).
   */
  excite(el, velocity, articulation, when, transpose = 0) {
    if (this.state !== "running" || this.muted || !this.pool) return;
    if (when !== void 0 && !Number.isFinite(when)) when = void 0;
    const target = this.scanner.resolve(el) ?? el;
    let profile = this.scanner.profileFor(target);
    if (!profile) return;
    if (articulation !== "motif" && articulation !== "echo" && articulation !== "phrase" && articulation !== "whisper") {
      const now7 = performance.now();
      const a = this.activity.get(target) ?? { c: 0, t: now7 };
      a.c = decayCount(a.c, now7 - a.t) + 1;
      a.t = now7;
      this.activity.set(target, a);
      velocity *= duckFactor(a.c - 1);
    }
    if (transpose !== 0) {
      profile = { ...profile, midi: profile.midi + transpose, freqHz: profile.freqHz * Math.pow(2, transpose / 12) };
    }
    if (articulation === "tick") {
      profile = { ...profile, durationS: Math.min(profile.durationS, 0.07), release: 0.05 };
    }
    if (articulation === "toggle-on" || articulation === "toggle-off") {
      const dir = articulation === "toggle-on" ? 1 : -1;
      const base = { ...profile, durationS: 0.12 };
      this.pool.trigger(base, velocity * this.opts.velocityFactor, when);
      const second = { ...profile, midi: profile.midi + dir * 7, freqHz: profile.freqHz * Math.pow(2, dir * 7 / 12), durationS: 0.16 };
      this.pool.trigger(second, velocity * this.opts.velocityFactor, (when ?? Tone9.now()) + 0.09);
    } else {
      this.pool.trigger(profile, velocity * this.opts.velocityFactor, when);
    }
    if (articulation === "hit" && velocity >= 0.55) {
      const offset = nextGridOffset(Tone9.getTransport().seconds, echoGridS(this.tempo), ECHO_MIN_AHEAD_S);
      this.excite(target, velocity * ECHO_VELOCITY_SCALE, "echo", Tone9.now() + offset, ECHO_TRANSPOSE);
    }
    this.emit("trigger", { el: target, profile, velocity, articulation });
  }
  /** I3/I11 — strum a set of elements left→right. */
  strum(els, velocity, articulation = "strum") {
    if (this.state !== "running" || !this.pool) return;
    const sorted = els.map((el) => ({ el, p: this.scanner.profileFor(el) })).filter((x) => !!x.p).sort((a, b) => a.p.rect.x - b.p.rect.x).slice(0, 6);
    const t0 = Tone9.now();
    const step = strumStepS(this.tempo);
    sorted.forEach(({ el }, i) => this.excite(el, velocity, articulation, t0 + i * step));
  }
  whisper(el) {
    if (this.appearBucket <= 0) return;
    this.appearBucket--;
    this.excite(el, 0.12, "whisper");
  }
  /** I12 — the page introduces itself: its largest landmarks, in DOM order, in the site key. */
  playIntroMotif() {
    const candidates = Array.from(
      this.opts.root.querySelectorAll("h1, h2, nav, main, [role=banner], header, button, [role=button]")
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top < this.env.vh;
    });
    const byArea = candidates.map((el) => ({ el, area: el.getBoundingClientRect().width * el.getBoundingClientRect().height })).sort((a, b) => b.area - a.area).slice(0, 5).map((x) => x.el);
    const inDomOrder = candidates.filter((el) => byArea.includes(el));
    const t0 = Tone9.now() + 0.1;
    const step = secondsPerBeat(this.tempo) / 4;
    inDomOrder.forEach((el, i) => this.excite(el, 0.3, "motif", t0 + i * step));
  }
  // ---------------------------------------------------------------- introspection
  /** Invariant #6 — explain why an element sounds the way it does. Works before start(). */
  describe(el) {
    return this.scanner.profileFor(el);
  }
  geometryChanged() {
    this.env.vw = window.innerWidth;
    this.env.vh = window.innerHeight;
    this.scanner?.updateEnv(this.env.vw, this.env.vh);
    this.scanner?.invalidateRects();
  }
  roomResized() {
    this.geometryChanged();
    this.room?.resize(this.env.vw);
    this.backend?.onViewport(this.env.vw);
  }
  // ---------------------------------------------------------------- events
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, /* @__PURE__ */ new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }
  emit(event, detail) {
    for (const fn of this.listeners.get(event) ?? []) {
      try {
        fn(detail);
      } catch (err) {
        console.warn("[sonarium] listener error", err);
      }
    }
  }
};

// src/index.ts
var version = "0.5.0";
function create(options = {}) {
  return new Engine(options);
}
function autoInit() {
  if (typeof document === "undefined") return;
  const script = document.currentScript;
  if (!script || script.dataset.auto === void 0) return;
  const opts = {};
  if (script.dataset.theme) opts.theme = script.dataset.theme;
  if (script.dataset.key) opts.key = script.dataset.key;
  if (script.dataset.ambient) opts.ambient = parseFloat(script.dataset.ambient);
  if (script.dataset.listener) opts.listener = script.dataset.listener;
  if (script.dataset.volume) opts.volume = parseFloat(script.dataset.volume);
  if (script.dataset.panning) opts.panning = script.dataset.panning;
  const boot = () => {
    try {
      const engine = create(opts);
      window.sonarium = engine;
    } catch (err) {
      console.warn("[sonarium] auto-init failed", err);
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}
autoInit();
export {
  CUBE_LAYOUT,
  DEFAULT_FACTORS,
  DEG,
  SCALES,
  THEMES,
  applyMat3,
  chroma_exports as chroma,
  create,
  decodeGains,
  decodeMatrix,
  degreeToMidi,
  foaGains,
  lookMatrix,
  mapping_exports as mapping,
  matter_exports as matter,
  midiToFreq,
  midiToNoteName,
  modular_exports as modular,
  parseKey,
  pulse_exports as pulse,
  rotationMatrix,
  siteKey,
  sphere_exports as sphereMapping,
  stepInScale,
  unitVector,
  version
};
//# sourceMappingURL=index.js.map