var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/core/engine.ts
import * as Tone4 from "tone";

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
function midiToNoteName(m) {
  const pc = (m % 12 + 12) % 12;
  return `${PC_TO_NOTE[pc]}${Math.floor(m / 12) - 1}`;
}

// src/themes/index.ts
var aurora = {
  name: "aurora",
  defaults: { synthKind: "synth", octaveShift: 0, baseVelocity: 0.8, releaseScale: 1 },
  roles: {
    toggle: { synthKind: "synth", pinWave: "triangle", baseVelocity: 0.7, releaseScale: 0.8 },
    button: { synthKind: "synth", baseVelocity: 0.9 },
    link: { synthKind: "synth", pinWave: "sine", octaveShift: 1, baseVelocity: 0.6, releaseScale: 0.7 },
    input: { synthKind: "synth", pinWave: "triangle", baseVelocity: 0.55, releaseScale: 1.6 },
    heading: { synthKind: "fm", octaveShift: 0, baseVelocity: 0.75, releaseScale: 2.2 },
    media: { synthKind: "membrane", octaveShift: -1, baseVelocity: 0.8 },
    item: { synthKind: "synth", pinWave: "triangle", baseVelocity: 0.6, releaseScale: 0.8 },
    text: { synthKind: "synth", pinWave: "sine", baseVelocity: 0.35, releaseScale: 1.8 }
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

// src/core/listener.ts
import * as Tone from "tone";

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
    const listener = Tone.getListener();
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
import * as Tone2 from "tone";
var Room = class {
  constructor(opts, vw) {
    this.opts = opts;
    this.noise = null;
    this.noiseFilter = null;
    this.noiseGain = null;
    this.sparkle = null;
    this.resizeTimer = null;
    this.mutedNow = false;
    this.limiter = new Tone2.Limiter(-1).toDestination();
    this.master = new Tone2.Volume(opts.volumeDb).connect(this.limiter);
    const { decay, wet } = this.roomParams(vw);
    this.reverb = new Tone2.Reverb({ decay, preDelay: 0.02, wet: 1 });
    this.wetGain = new Tone2.Gain(wet).connect(this.master);
    this.reverb.connect(this.wetGain);
    this.buses = { dryIn: this.master, wetIn: this.reverb };
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
        this.wetGain.gain.rampTo(wet, 0.3);
        this.noiseFilter?.frequency.rampTo(ambienceCutoffFromViewport(vw), 0.5);
      } catch (err) {
        console.warn("[sonarium] room resize failed", err);
      }
    }, 400);
  }
  /** I13 — room tone + sparkles. pickSparkle returns a play-thunk for a random visible element. */
  startAmbience(vw, level, pickSparkle) {
    if (level <= 0) return;
    this.noise = new Tone2.Noise("brown");
    this.noiseFilter = new Tone2.Filter({ frequency: ambienceCutoffFromViewport(vw), type: "lowpass" });
    this.noiseGain = new Tone2.Gain(Tone2.dbToGain(-46) * clamp(level / 0.12, 0, 3));
    this.noise.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.master);
    this.noise.start();
    this.sparkle = new Tone2.Loop((time) => {
      if (Math.random() > 0.4) return;
      const play = pickSparkle();
      if (play) Tone2.getDraw().schedule(play, time);
    }, 2);
    this.sparkle.start(1);
    Tone2.getTransport().start();
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
    this.sparkle?.dispose();
    this.noise?.dispose();
    this.noiseFilter?.dispose();
    this.noiseGain?.dispose();
    this.reverb.dispose();
    this.wetGain.dispose();
    this.master.dispose();
    this.limiter.dispose();
  }
};

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
function profileOf(el, env) {
  const { key, theme, vw, vh } = env;
  const html = el;
  const reasons = {};
  const r = el.getBoundingClientRect();
  const rect = { x: r.x, y: r.y, w: Math.max(1, r.width), h: Math.max(1, r.height) };
  const role = roleOf(el);
  const recipe = recipeFor(role, theme);
  reasons.role = `<${el.tagName.toLowerCase()}> reads as "${role}" \u2192 ${recipe.synthKind} voice (theme ${theme.name})`;
  const cs = getComputedStyle(el);
  const radiusPx = parseFloat(cs.borderTopLeftRadius) || 0;
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
  const pinned = pinnedMidi(html.dataset?.sonicNote);
  const midi = pinned ?? degreeToMidi(degree, key, steps);
  reasons.pitch = pinned !== null ? `pinned by data-sonic-note \u2192 ${midiToNoteName(midi)}` : `area ${(rect.w * rect.h / 1e3).toFixed(1)}k px\xB2 (size ${st.toFixed(2)}) + sibling/heading offsets \u2192 ${midiToNoteName(midi)} in ${key.label}`;
  const wave = html.dataset?.sonicWave || recipe.pinWave || waveFromRoundness(round);
  const attack = attackFromRoundness(round);
  reasons.timbre = `roundness ${round.toFixed(2)} (radius ${radiusPx}px) \u2192 ${wave} wave, ${(attack * 1e3).toFixed(0)} ms attack`;
  const durationS = durationFromElongation(rect);
  reasons.duration = `aspect ${(Math.max(rect.w, rect.h) / Math.min(rect.w, rect.h)).toFixed(1)}:1 \u2192 ${durationS.toFixed(2)} s`;
  const filterHz = cutoffFromDepth(depth) * brightnessTilt(rect, vh);
  reasons.filter = `depth ${depth} + vertical position \u2192 low-pass ${Math.round(filterHz)} Hz`;
  let velocityScale = recipe.baseVelocity * velocityFromSize(st) * velocityFromDepth(depth) * (isNaN(opacity) ? 1 : opacity);
  if (isQuiet(el)) velocityScale *= 0.4;
  velocityScale = clamp(velocityScale, 0, 1.5);
  const reverbSend = 0.18 + sendFromShadowBlur(shadowBlur);
  return {
    role,
    rect,
    pan,
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
    reasons
  };
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
import * as Tone3 from "tone";
var VoicePool = class {
  constructor(buses, maxVoices, panningModel) {
    this.buses = buses;
    this.maxVoices = maxVoices;
    this.panningModel = panningModel;
    this.lanes = [];
    this.maxVoices = clamp(maxVoices, 4, 24);
  }
  createSynth(kind) {
    switch (kind) {
      case "fm":
        return new Tone3.FMSynth({ harmonicity: 3, modulationIndex: 8, envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 1.4 }, modulationEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.2, release: 1 } });
      case "pluck":
        return new Tone3.PluckSynth({ attackNoise: 1, dampening: 3e3, resonance: 0.92 });
      case "membrane":
        return new Tone3.MembraneSynth({ pitchDecay: 0.04, octaves: 5, envelope: { attack: 1e-3, decay: 0.35, sustain: 0.01, release: 0.6 } });
      case "noise":
        return new Tone3.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 1e-3, decay: 0.06, sustain: 0, release: 0.05 } });
      default:
        return new Tone3.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.25, release: 0.3 } });
    }
  }
  createLane(kind) {
    const synth = this.createSynth(kind);
    const filter = new Tone3.Filter({ frequency: 4e3, type: "lowpass", rolloff: -12, Q: 1 });
    const panner = new Tone3.Panner3D({
      panningModel: this.panningModel,
      distanceModel: "inverse",
      refDistance: 1,
      rolloffFactor: 0.4,
      positionX: 0,
      positionY: 0,
      positionZ: -2
    });
    const dry = new Tone3.Gain(1);
    const send = new Tone3.Gain(0.18);
    synth.connect(filter);
    filter.connect(panner);
    panner.connect(dry);
    panner.connect(send);
    dry.connect(this.buses.dryIn);
    send.connect(this.buses.wetIn);
    const lane = { kind, synth, filter, panner, dry, send, busyUntil: 0 };
    this.lanes.push(lane);
    return lane;
  }
  acquire(kind) {
    const now3 = Tone3.now();
    let candidate = null;
    let oldestSameKind = null;
    let oldestAny = null;
    for (const lane of this.lanes) {
      if (lane.kind === kind) {
        if (lane.busyUntil <= now3) {
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
    const t = when ?? Tone3.now();
    const vel = clamp(raw, 0.03, 1);
    const lane = this.acquire(profile.synthKind);
    lane.filter.frequency.rampTo(Math.max(200, profile.filterHz), 0.02, t);
    lane.filter.Q.rampTo(profile.filterQ, 0.02, t);
    lane.panner.positionX.rampTo(profile.pan.x, 0.02, t);
    lane.panner.positionY.rampTo(profile.pan.y, 0.02, t);
    lane.panner.positionZ.rampTo(profile.pan.z, 0.02, t);
    lane.send.gain.rampTo(clamp(profile.reverbSend, 0, 1), 0.02, t);
    const dur = profile.durationS;
    try {
      switch (lane.kind) {
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
    const now3 = Tone3.now();
    return this.lanes.filter((l) => l.busyUntil > now3).length;
  }
  dispose() {
    for (const lane of this.lanes) {
      lane.synth.dispose();
      lane.filter.dispose();
      lane.panner.dispose();
      lane.dry.dispose();
      lane.send.dispose();
    }
    this.lanes = [];
  }
};

// src/interact/pointer.ts
var PREVIEW_ROLES = /* @__PURE__ */ new Set(["button", "link", "toggle", "input", "item", "heading", "media", "text"]);
var HOVER_THROTTLE_MS = 80;
function attachPointer(engine) {
  const lastHover = /* @__PURE__ */ new WeakMap();
  const onMove = (e) => {
    engine.rig?.pointTo(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
  };
  const onOver = (e) => {
    const el = engine.scanner?.resolve(e.target);
    if (!el) return;
    const profile = engine.scanner.profileFor(el);
    if (!profile || !PREVIEW_ROLES.has(profile.role)) return;
    const now3 = performance.now();
    if (now3 - (lastHover.get(el) ?? -Infinity) < HOVER_THROTTLE_MS) return;
    lastHover.set(el, now3);
    engine.excite(el, 0.25, "preview");
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerover", onOver, { passive: true });
  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerover", onOver);
  };
}

// src/interact/activate.ts
var DEDUPE_MS = 80;
function attachActivate(engine) {
  const lastHit = /* @__PURE__ */ new WeakMap();
  const activate = (target) => {
    const el = engine.scanner?.resolve(target);
    if (!el) return;
    const now3 = performance.now();
    if (now3 - (lastHit.get(el) ?? -Infinity) < DEDUPE_MS) return;
    lastHit.set(el, now3);
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
  const onFocus = (e) => {
    const el = engine.scanner?.resolve(e.target);
    if (el) engine.excite(el, 0.35, "preview");
  };
  const onKeydown = (e) => {
    const t = e.target;
    const editable = t instanceof HTMLElement && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable);
    if (!editable) return;
    const now3 = performance.now();
    if (now3 - lastTick < TICK_THROTTLE_MS) return;
    lastTick = now3;
    const len = t.value?.length ?? t.textContent?.length ?? 0;
    const interval = FILL_INTERVALS[Math.min(FILL_INTERVALS.length - 1, Math.floor(len / 4))];
    engine.excite(t, 0.15, "tick", void 0, interval);
  };
  window.addEventListener("focusin", onFocus, { passive: true });
  window.addEventListener("keydown", onKeydown, { passive: true });
  return () => {
    window.removeEventListener("focusin", onFocus);
    window.removeEventListener("keydown", onKeydown);
  };
}

// src/interact/scroll.ts
function attachScroll(engine) {
  let scrollQueued = false;
  const onScroll = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      engine.geometryChanged();
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
    const now3 = performance.now();
    if (magnitude > SHAKE_THRESHOLD && now3 - lastShake > SHAKE_REFRACTORY_MS) {
      lastShake = now3;
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

// src/core/engine.ts
var Engine = class {
  constructor(userOpts = {}) {
    this.state = "idle";
    this.muted = false;
    this.pool = null;
    this.room = null;
    this.rig = null;
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
    const key = (userOpts.key && userOpts.key !== "auto" ? parseKey(userOpts.key) : null) ?? siteKey(location.hostname);
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
      reverb: userOpts.reverb ?? "auto",
      velocityFactor: reduced ? 0.7 : 1
    };
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
      await Promise.race([Tone4.start(), new Promise((r) => setTimeout(r, 1500))]);
    } catch (err) {
      console.warn("[sonarium] audio context could not start yet", err);
    } finally {
      this.starting = false;
    }
    if (Tone4.getContext().state !== "running" || this.state === "disposed") return;
    this.state = "running";
    this.removeUnlockListeners();
    this.gate?.setState(this.muted ? "muted" : "on");
    this.room = new Room({ volumeDb: this.opts.volume, reverb: this.opts.reverb, ambient: this.opts.ambient }, this.env.vw);
    this.pool = new VoicePool(this.room.buses, this.opts.maxVoices, this.opts.panning);
    this.rig = new ListenerRig(this.opts.listener);
    this.rig.start();
    if (this.muted) this.room.setMuted(true);
    this.detachers.push(
      attachPointer(this),
      attachActivate(this),
      attachKeyboard(this),
      attachScroll(this)
    );
    if (this.opts.motion) this.detachers.push(attachMotion(this));
    const onVis = () => this.room?.setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    this.detachers.push(() => document.removeEventListener("visibilitychange", onVis));
    this.bucketTimer = setInterval(() => {
      this.appearBucket = Math.min(6, this.appearBucket + 6);
    }, 1e3);
    this.room.startAmbience(this.env.vw, this.opts.ambient, () => this.pickSparkle());
    this.playIntroMotif();
    this.emit("start");
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
    for (const detach of this.detachers.splice(0)) {
      try {
        detach();
      } catch {
      }
    }
    this.scanner?.dispose();
    this.rig?.dispose();
    this.pool?.dispose();
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
    const target = this.scanner.resolve(el) ?? el;
    let profile = this.scanner.profileFor(target);
    if (!profile) return;
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
      this.pool.trigger(second, velocity * this.opts.velocityFactor, (when ?? Tone4.now()) + 0.09);
    } else {
      this.pool.trigger(profile, velocity * this.opts.velocityFactor, when);
    }
    this.emit("trigger", { el: target, profile, velocity, articulation });
  }
  /** I3/I11 — strum a set of elements left→right. */
  strum(els, velocity, articulation = "strum") {
    if (this.state !== "running" || !this.pool) return;
    const sorted = els.map((el) => ({ el, p: this.scanner.profileFor(el) })).filter((x) => !!x.p).sort((a, b) => a.p.rect.x - b.p.rect.x).slice(0, 6);
    const t0 = Tone4.now();
    sorted.forEach(({ el }, i) => this.excite(el, velocity, articulation, t0 + i * 0.06));
  }
  whisper(el) {
    if (this.appearBucket <= 0) return;
    this.appearBucket--;
    this.excite(el, 0.12, "whisper");
  }
  pickSparkle() {
    const visible = this.scanner?.visibleElements() ?? [];
    if (!visible.length) return null;
    const el = visible[Math.floor(Math.random() * visible.length)];
    return () => this.excite(el, 0.07 * (this.opts.ambient / 0.12), "whisper");
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
    const t0 = Tone4.now() + 0.1;
    inDomOrder.forEach((el, i) => this.excite(el, 0.3, "motif", t0 + i * 0.09));
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
var version = "0.1.0";
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
  SCALES,
  THEMES,
  create,
  degreeToMidi,
  mapping_exports as mapping,
  midiToFreq,
  midiToNoteName,
  parseKey,
  siteKey,
  version
};
//# sourceMappingURL=index.js.map