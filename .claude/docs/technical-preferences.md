# Technical Preferences

<!-- project.yaml at the repo root is the machine-readable source of truth for
     engine, specialists, naming, performance, platform, and testing.framework.
     This file is the human-readable LEGACY FALLBACK: agents and skills resolve
     each key from project.yaml first and fall back here only when the
     project.yaml key is absent. /setup-engine dual-writes both.
     Forbidden patterns and allowed libraries are NOT migrated — they live only
     in this file. Populated by /setup-engine; updated as decisions are made. -->

## Engine & Language

- **Engine**: threejs 0.170.0 (three.js r170, not a CCGS-supported engine)
- **Language**: JavaScript (ES2020 modules, bundled by esbuild)
- **Rendering**: WebGL2 (WebGLRenderer) + EffectComposer post-processing
- **Physics**: None (heightmap/obstacle checks in game code)

## Input & Platform

<!-- Written by /setup-engine. Read by /ux-design, /ux-review, /test-setup, /team-ui, and /dev-story -->
<!-- to scope interaction specs, test helpers, and implementation to the correct input methods. -->

- **Target Platforms**: Web (mobile browsers first, desktop browsers supported)
- **Input Methods**: Touch, Keyboard/Mouse
- **Primary Input**: Touchscreen
- **Gamepad Support**: None
- **Touch Support**: Full
- **Platform Notes**: iOS Safari audio unlock on tap, background/screen-off audio suspension, ITP storage eviction; GitHub Pages static hosting (no COOP/COEP headers)

## Naming Conventions

- **Classes**: PascalCase
- **Variables**: camelCase
- **Signals/Events**: onEventName handlers
- **Files**: camelCase.js
- **Scenes/Prefabs**: camelCase (scene builder functions, e.g. createSpot)
- **Constants**: SCREAMING_SNAKE

## Performance Budgets

- **Target Framerate**: 30 fps minimum on mid-range Android browser, 60 fps desktop
- **Frame Budget**: [TO BE CONFIGURED — set in /create-architecture]
- **Draw Calls**: [TO BE CONFIGURED — set in /create-architecture]
- **Memory Ceiling**: [TO BE CONFIGURED — set in /create-architecture]

## Testing

- **Framework**: [TO BE CONFIGURED — run /test-setup]
- **Minimum Coverage**: [TO BE CONFIGURED]
- **Required Tests**: Balance formulas, gameplay systems, networking (if applicable)

## Forbidden Patterns

<!-- Add patterns that should never appear in this project's codebase -->
- WebRTC voice chat and any free-text chat (Pillar 2; no moderation without a server)
- Operator-run servers or paid backends (zero operating cost constraint)
- Changing three.js light count at runtime (shader recompile hitch) — use a fixed light pool

## Allowed Libraries / Addons

<!-- Add approved third-party dependencies here -->
- three 0.170.0
- @dgreenheck/ez-tree 1.1.0
- esbuild 0.24.0 (dev)
- trystero 0.25.4 — legacy, slated for removal by the Nostr transport ADR
- A Nostr client library — pending ADR

## Architecture Decisions Log

<!-- Quick reference linking to full ADRs in docs/architecture/ -->
- [No ADRs yet — use /architecture-decision to create one]

## Engine Specialists

<!-- Written by /setup-engine when engine is configured. -->
<!-- Read by /code-review, /architecture-decision, /architecture-review, and team skills -->
<!-- to know which specialist to spawn for engine-specific validation. -->

- **Primary**: technical-director (no three.js specialist exists)
- **Language/Code Specialist**: gameplay-programmer
- **Shader Specialist**: technical-artist
- **UI Specialist**: ui-programmer
- **Additional Specialists**: network-programmer, engine-programmer
- **Routing Notes**: Engine-agnostic agents stand in for engine specialists; they must read docs/engine-reference/threejs/VERSION.md before suggesting three.js APIs

### File Extension Routing

<!-- Skills use this table to select the right specialist per file type. -->
<!-- If a row says [TO BE CONFIGURED], fall back to Primary for that file type. -->

| File Extension / Type | Specialist to Spawn |
|-----------------------|---------------------|
| Game code (`src/*.js`) | gameplay-programmer |
| Shader / material code (GLSL in JS, post-processing) | technical-artist |
| UI / screen files (`index.html`, DOM UI) | ui-programmer |
| Scene builders (`src/world.js` etc.) | gameplay-programmer |
| Network transport (`src/net.js`) | network-programmer |
| General architecture review | Primary |
