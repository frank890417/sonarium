# Agent orientation — Sonarium

You are working on Sonarium, a library that turns webpages into spatial acoustic spaces.
**Read [docs/PLAN.md](./docs/PLAN.md) before changing anything** — it is the single source of
truth (vision, layer model, roadmap, and §11 Invariants, which are non-negotiable). Then:
[docs/MAPPING.md](./docs/MAPPING.md) (the visual→acoustic canon), [docs/RESEARCH.md](./docs/RESEARCH.md)
(why each mapping exists), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) (module rules).

## Commands

- `npm run build` — tsup dual build → `dist/index.js` (ESM, tone external) +
  `dist/sonarium.iife.js` (Tone bundled, global `Sonarium`). **`dist/` is committed** (jsDelivr
  serves it) — rebuild and include dist in any PR that touches `src/`.
- `npm test` — Vitest over `src/math/` (the executable form of MAPPING.md).
- `npm run serve` — Vite static server; demos at `/examples/`. Demos expose
  `window.__sonariumDebug` (`started`, `triggers[]`, `errors[]`) and `window.sonarium`/`space`
  for browser verification; `sonarium.describe(el)` works before audio unlock.

## Hard rules (from PLAN.md §11 — change PLAN.md first if you must break one)

1. Silence until user gesture; mute is persistent and sacred.
2. Every pitch passes the quantizer (`degreeToMidi`); no raw frequencies to the speaker.
3. Mapping formulas live ONLY in `src/math/` as pure functions, tested, and must stay in sync
   with MAPPING.md (same commit).
4. Layer boundaries: `src/math/` imports nothing; `core/profile.ts` + `core/scanner.ts` = DOM
   only, never Tone; `core/voices|room|listener.ts` = Tone only, never DOM; `interact/*` talks
   to the engine exclusively through `excite()/strum()/rig`; only `engine.ts` knows everyone.
5. The one-script-tag IIFE path (`data-auto`) must always keep working.
6. `describe(el)` must truthfully explain every parameter (the `reasons` map).

## Recipes

- **New mapping:** RESEARCH.md justification → MAPPING.md row (formula + constants) → pure fn in
  `src/math/mapping.ts` + test → consume in `core/profile.ts` → add to `reasons` → demo it.
- **New theme:** add a data object in `src/themes/index.ts`. Themes are data; engine code must
  not special-case theme names.
- **New input driver:** `src/interact/foo.ts` exporting `attach(engine): () => void`; wire in
  `engine.start()`; never import Tone there.
- **Releasing:** bump `version` in `package.json` + `src/index.ts`, update README roadmap,
  rebuild dist, tag. Pushing `main` auto-deploys demos to GitHub Pages via
  `.github/workflows/pages.yml`.
