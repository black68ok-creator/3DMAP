# three.js — Version Reference

| Field | Value |
|-------|-------|
| **Engine** | three.js (npm `three`) — WebGL library, not an editor engine |
| **Engine Version** | 0.170.0 (r170) |
| **Installed at pin time** | 0.170.0 — pinned exactly in `package.json` |
| **Project Pinned** | 2026-11-02 |
| **Last Docs Verified** | 2026-11-02 (local `package.json` only; no web lookup of newer releases) |
| **Framework support** | CCGS ships specialists and references for Godot/Unity/Unreal only. Engine-specific steps in `/test-setup`, `/smoke-check` and `/setup-engine refresh` have no three.js row; treat their engine-specific checks as NOT ASSESSED rather than passed. |

## Project stack

- Bundler: esbuild 0.24.0, single IIFE bundle `app.js` (ES2020 target), committed and served by GitHub Pages.
- Addons in use: `GLTFLoader`, `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `OutputPass` (import path `three/addons/...`).
- Other deps: `@dgreenheck/ez-tree` 1.1.0; `trystero` 0.25.4 (legacy, to be replaced by a Nostr transport per the concept's TD-FEASIBILITY review).

## Known pitfalls relevant to this project

- Changing the number of lights in a scene triggers material shader recompilation (frame hitch). Preallocate a fixed light pool sized to seat count and change only `intensity`.
- Post-processing (bloom, watercolor passes) is fill-rate bound on mobile; use dynamic resolution (`renderer.setPixelRatio`) and cap pixel ratio.
- Web Audio on iOS Safari: `AudioContext` must be resumed from a user gesture; audio suspends when the screen turns off or the tab is backgrounded.
- `three/examples/jsm` was moved to `three/addons` long before r170; use `three/addons/...` imports.

## Before suggesting APIs

The pinned version is r170. If an API's behaviour changed after r170 or you are unsure, check the three.js migration guide (github.com/mrdoob/three.js/wiki/Migration-Guide) and confirm against the r170 tag rather than recalling from memory.
