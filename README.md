# Sonarium 🔊

**Drop-in acoustic UX — one script tag turns any webpage into a spatial sound field.**

[Live demo](https://frank890417.github.io/sonarium/) ·
[Mapping Canon](./docs/MAPPING.md) ·
[Research](./docs/RESEARCH.md) ·
[Master Plan](./docs/PLAN.md) ·
[繁體中文](#繁體中文簡介)

![deploy](https://github.com/frank890417/sonarium/actions/workflows/pages.yml/badge.svg)

```html
<script src="https://cdn.jsdelivr.net/gh/frank890417/sonarium@main/dist/sonarium.iife.js" data-auto></script>
```

That's the whole integration. The page now *hears itself*:

- **The page becomes an ambisonic field.** Every element is encoded into one rotatable
  full-sphere sound field (AmbiX FOA) around your head, IRCAM-Spat style — a button on the left
  *sounds* from the left, decoded binaurally through virtual speakers. Moving the mouse doesn't
  move a listener point: it **rotates the entire field**, like turning your head.
  Spec: [docs/SPATIAL.md](./docs/SPATIAL.md) · live: [the Sound Sphere 聲球 demo](https://frank890417.github.io/sonarium/examples/sphere.html).
- **Every element is a sound sphere (聲球).** Size sets its *extent* — big blocks wrap around
  you, buttons are point sources; roundness sets its *directivity* — sharp elements beam at you,
  round ones radiate (Kiki/Bouba extended into space). Five Spat-style perceptual factors
  (presence, room presence, envelopment, warmth, brilliance) steer the whole scene.
- **Geometry becomes timbre.** Corner radius morphs each element's voice from biting **square**
  through **sawtooth** and **triangle** to breathing **sine** — the
  [Kiki/Bouba effect](./docs/RESEARCH.md#2-cross-modal-correspondence-literature), made executable.
  Big elements speak low and loud; long elements sweep, small ones tick.
- **The DOM tree becomes harmony.** Nesting depth pushes sounds farther away and muffles them;
  siblings climb one shared scale, so a nav is a melodic run and a list is an arpeggio.
- **The viewport becomes the room.** Page width sets the reverb — a phone is a dry booth,
  a wide desktop is a concert hall.
- **Your body becomes the listener.** The cursor is your ears on desktop; on mobile, tilting the
  device steers the listener and a shake strums everything on screen, left to right.
- **Every site gets a sonic identity.** The hostname deterministically picks a musical key and
  scale — same site, same key, every visit. Nothing ever plays outside that scale.

🎧 *Wear headphones. Then go click around the [demo](https://frank890417.github.io/sonarium/).*

## Why

The visual web has CSS; the acoustic web has nothing. W3C actually specced spatial UI audio in
1998 (CSS2 aural stylesheets, with `azimuth` and `elevation`!) and it never shipped. Sonarium
implements that dream with the 2026 toolchain — Web Audio `PannerNode`, Tone.js synthesis, DOM
observers — and grounds every mapping in cross-modal perception research rather than taste.
The long-term goal is a **universal interactive sound framework for the web**: read
[docs/PLAN.md](./docs/PLAN.md) for the full vision, layer model, and roadmap.

It grew out of the author's NYU master's thesis,
[*Sound and Cognition — Building an experimental web-based visual music composing tool*](https://cheyuwu.com/thesis)
(2020), which studied how people without musical training map shapes to sounds — those findings
(sharp ↔ bright, big ↔ low/loud, long ↔ sustained, closed ↔ percussive) are now formulas in
[`src/math/mapping.ts`](./src/math/mapping.ts), each one unit-tested against
[docs/MAPPING.md](./docs/MAPPING.md).

## Install

**Zero-code (recommended for trying it):**

```html
<script src="https://cdn.jsdelivr.net/gh/frank890417/sonarium@main/dist/sonarium.iife.js"
        data-auto data-theme="aurora" data-ambient="0.12"></script>
```

**As a module:**

```bash
npm install github:frank890417/sonarium   # npm publish coming in v0.2
```

```js
import { create } from 'sonarium'

const space = create({
  theme: 'aurora',        // 'aurora' | 'mono' | 'paper' | custom Theme object
  key: 'auto',            // 'auto' = per-domain identity, or e.g. 'D dorian'
  spatial: 'ambisonic',   // the FOA field (default) | 'panner' = v0.1 per-voice HRTF
  listener: 'pointer',    // mouse-look rotates the field ('center' to fix it)
  perceptual: { presence: 0.7, envelopment: 0.55 },  // the spat5.oper surface
  ambient: 0.12,          // room tone + sparkles, 0 to disable
  volume: -10,            // master dB
})

space.setPerceptual({ warmth: 0.8 })   // live perceptual control

space.on('trigger', ({ el, profile }) => { /* drive visuals from sound */ })
space.describe(document.querySelector('button'))  // → why does it sound like that?
```

No sound plays before the user's first gesture (autoplay policy treated as a feature). A small
floating chip handles unlock + mute; mute persists across visits.

## How it hears your page

| Visual property | Acoustic property | In one line |
|---|---|---|
| x position | azimuth (pan) | left button = left sound |
| y position | elevation + brightness | top of page rings brighter |
| area | pitch (inverted) + loudness | big = low & loud, small = high & quiet |
| border-radius | waveform, attack, resonance | kiki ◻ = square/2 ms; bouba ◯ = sine/45 ms |
| aspect ratio | note duration | a divider sweeps, a chip ticks |
| DOM depth | distance + low-pass | deeper = farther & duller |
| sibling index | scale steps | a nav is a melody |
| viewport width | reverb size | phone = booth, desktop = hall |
| box-shadow blur | reverb send | elevated UI floats in the room |
| hostname | key + scale | every site has a signature |

Interactions: hover/focus previews (quiet), press = full note, pressing a container strums its
children left→right, typing ticks rise as the field fills, checkboxes answer with rising/falling
fifths, elements whisper when they scroll into view (rate-limited), tab-focus sounds like hover
(keyboard parity), shake-to-strum on mobile, and the page plays a 5-note **intro motif** of its
own landmarks when sound first unlocks.

Formulas, constants, and the research citation for every row:
[docs/MAPPING.md](./docs/MAPPING.md) · [docs/RESEARCH.md](./docs/RESEARCH.md).

## Authoring overrides

```html
<div data-sonic="off">…this subtree is silent…</div>
<div data-sonic="quiet">…40% velocity…</div>
<button data-sonic-note="E4" data-sonic-wave="square">pinned voice</button>
<div data-sonic-role="button">sound like a button</div>
```

## API surface

| | |
|---|---|
| `create(options) → engine` | safe pre-gesture; arms and waits for the first interaction |
| `engine.start()` | manual unlock (call from your own gesture handler) |
| `engine.describe(el)` | full acoustic profile **with human-readable reasons** |
| `engine.strum(els, velocity)` | play a set of elements left→right |
| `engine.excite(el, velocity, articulation)` | sound one element through its profile |
| `engine.toggleMute()` / `engine.dispose()` | what they say |
| `engine.on('start'\|'trigger'\|'mute'\|'dispose', fn)` | event hooks (demos draw ripples from `trigger`) |
| `engine.setPerceptual({...})` | live Spat factors: presence, roomPresence, envelopment, warmth, brilliance |
| `engine.rig.lookAt(yaw, pitch)` | rotate the field directly (head tracking / WebXR plug here) |
| `siteKey(host)`, `parseKey('D dorian')`, `THEMES`, `mapping.*` | the pure layer, exported for reuse |
| `foaGains`, `lookMatrix`, `decodeMatrix`, `sphereMapping.*` | the pure ambisonic layer (SPATIAL.md), reusable beyond the DOM |

Options: `root, theme, key, listener, ambient, motion, gate ('chip'|'none'), volume, maxVoices,
panning ('hrtf'|'equalpower'), reverb ('auto'|seconds), respectReducedMotion`.

## Sound ethics

Sound UX died once already (`<bgsound>`, autoplay ads). Sonarium's defaults are deliberately
humble: **silent until a gesture, −10 dB master with a −1 dB limiter, quiet hover previews,
persistent one-tap mute, fades out in background tabs, softens under `prefers-reduced-motion`,
and never, ever plays a note outside the page's scale.** If you ship it, keep it that way.
Screen-reader users: Sonarium never speaks and the mute chip is keyboard-reachable; treat it as
a layer SR users can opt out of in one tap (a formal audit is on the roadmap).

## Project layout

```
docs/        PLAN.md (vision/roadmap/handoff) · RESEARCH.md (theory) · MAPPING.md (the canon) ·
             SPATIAL.md (ambisonics & the sound sphere) · ARCHITECTURE.md (how code implements it)
src/math/    pure mapping formulas + musical quantizer — no DOM, no Tone, fully tested
src/spatial/ the ambisonic engine: pure SH/rotation/decode math (tested) + FOA bus, encoders,
             field rig, Spat room model, perceptual factors
src/core/    profile (element→sound identity), scanner, voice pool, room, engine
src/interact/ pointer, activate, keyboard, scroll, motion drivers
src/themes/  sound palettes as plain data
examples/    landing playground · sound sphere 聲球 · one-line dashboard · depth · motion
```

Build `npm run build` · test `npm test` · demos `npm run serve` → `/examples/`.

## Roadmap

**v0.2 "Spherical" — shipped**: the ambisonic field, the sound sphere, Spat perceptual factors
([docs/SPATIAL.md](./docs/SPATIAL.md)); next there: HOA orders 2–3, worklet decode with measured
HRIRs, head tracking, AmbiX field export.
**v0.3 "Chromatic"** — color→brightness mapping, `--sonic-*` CSS custom properties (a real aural
stylesheet), drag glissandi, adaptive ducking, npm publish, and `/lab`: an online replication of
the thesis mismatch experiment to validate every mapping with real listeners.
**v0.4 "Embodied"** — gesture grammar, Web MIDI, WebXR listener, multi-user rooms (hear other
cursors). **v0.5 "Ecosystem"** — visual theme editor + shareable/remixable theme registry.
**v1.0 "Standard"** — stability, formal a11y audit, and a community spec for `--sonic-*`.
Details and research questions (RQ1–RQ5): [docs/PLAN.md](./docs/PLAN.md).

## 繁體中文簡介

**Sonarium 讓任何網頁加上一行 script，就變成一個立體聲學空間。**

- **整個頁面是一個 Ambisonic 聲場**（v0.2）：所有元素編碼進同一個可旋轉的全球面聲場（AmbiX FOA），
  以 IRCAM Spat 的架構管理 — 滑鼠移動不是移動「聽者的點」，而是**旋轉整個聲場**，就像轉頭一樣；
  手機上則由裝置姿態驅動。規格書：[docs/SPATIAL.md](./docs/SPATIAL.md)，
  現場展示：[聲球 demo](https://frank890417.github.io/sonarium/examples/sphere.html)。
- **每個元素是一顆聲球**：尺寸決定它的「張角」（大區塊把你包進去、小按鈕是點音源）；
  圓角決定指向性（尖銳的元素像光束射向你、圓潤的元素全向放射）。五個 Spat 知覺參數
  （presence／room presence／envelopment／warmth／brilliance）即時控制整個場景。
- **版面變成聲場**：元素在畫面上的位置，就是聲音在 3D 空間裡的位置 — 左邊的按鈕從左邊發聲。
- **幾何變成音色**：圓角半徑讓波形從銳利的 square 一路滑到柔軟的 sine（Kiki/Bouba 效應的可執行版本）；
  越大的元素音高越低、越大聲；越長的元素音越長。
- **DOM 樹變成和聲**：巢狀越深聲音越遠、越悶；同層兄弟元素爬同一個音階 — 導覽列是一句旋律，清單是一段琶音。
- **視窗變成房間**：頁面寬度決定殘響 — 手機是錄音間，寬螢幕是音樂廳。
- **身體變成聆聽者**：桌機上滑鼠就是你的耳朵；手機上傾斜裝置移動聽者位置、搖一搖就由左至右掃過整頁。
- **每個網站有自己的調性**：域名雜湊決定調與音階，所有聲音都經過音階量化 — 永遠不會走音。

這個專案源自作者的 NYU 碩士論文《Sound and Cognition》（2020）：研究沒有音樂背景的人如何把形狀對應到聲音，
那些發現（尖銳↔明亮、大↔低沉、長↔延續、封閉↔顆粒）現在都是 `src/math/mapping.ts` 裡有單元測試的公式。
終極目標是建立**網頁版的互動聲音通用框架** — 完整願景、分層架構與路線圖請讀
[docs/PLAN.md](./docs/PLAN.md)（為後續接手的協作者或 AI agent 而寫，越詳細越好）。

預設非常克制：使用者互動前完全靜音、主音量 −10 dB、一鍵永久靜音、背景分頁自動淡出。
試玩：**[frank890417.github.io/sonarium](https://frank890417.github.io/sonarium/)**（請戴耳機 🎧）。

## Credits & license

Built on [Tone.js](https://tonejs.github.io/) by Yotam Mann. Research lineage: Köhler, Gaver's
auditory icons, Blattner's earcons, Spence's crossmodal correspondences — full citations in
[docs/RESEARCH.md](./docs/RESEARCH.md).

MIT © 2026 [Che-Yu Wu](https://cheyuwu.com)
