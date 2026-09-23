# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/graphty-element package.

## Project Overview

graphty-element is a Web Component library for 3D/2D graph visualization built with:

- **TypeScript** (ES2022, strict mode)
- **Lit** (Web Components framework)
- **Babylon.js** (3D rendering engine)
- **Vite** (build tool)

The main component `<graphty-element>` provides interactive graph visualizations with multiple layout algorithms, rich styling, AI integration, and XR support.

## Package Structure

```
graphty-element/
|-- index.ts                  # Entry point: "." (the custom element; pulls in Babylon + Lit)
|-- schema.ts                 # Entry point: "./schema"
|-- catalog.ts                # Entry point: "./catalog"
|-- extend.ts                 # Entry point: "./extend"
|-- format.ts                 # Entry point: "./format"
|-- logging.ts                # Entry point: "./logging"
|-- session.ts                # Entry point: "./session"
|-- commands.ts               # Entry point: "./commands" (reserved, exports nothing yet)
|-- react.ts                  # Entry point: "./react" (reserved, exports nothing yet)
|-- webgpu.ts                 # Entry point: "./webgpu" (side-effect: registers the accelerator)
|-- ai.ts                     # Entry point: "./ai"
|-- src/
|   |-- Graph.ts              # Central orchestrator
|   |-- graphty-element.ts    # Web Component entry point
|   |-- Node.ts / Edge.ts     # Graph element classes
|   |-- Styles.ts             # Style resolution
|   |-- acceleration/         # AccelerationController, accelerator registry, Capabilities, Limits
|   |-- ai/                   # AI/LLM integration
|   |   |-- commands/         # Natural language command handlers
|   |   |-- providers/        # LLM provider adapters
|   |   |-- schema/           # Schema extraction for AI
|   |   |-- prompt/           # System prompt construction
|   |   |-- input/            # Voice input
|   |   `-- keys/             # API key management
|   |-- algorithms/           # Algorithm wrappers and registry
|   |-- camera/               # Camera presets
|   |-- cameras/              # Camera implementations
|   |-- catalog/              # Plain-JSON descriptors: algorithms, layouts, formats,
|   |                         #   palettes, scales, optionsFromZod, descriptor + style types
|   |-- config/               # Configuration types and palettes
|   |-- constants/            # Mesh constants, obsolescence rules
|   |-- data/                 # Data source implementations
|   |-- errors/               # GraphtyError, GraphtyErrorCode (41 codes), isGraphtyError
|   |-- input/                # Input handling (keyboard, mouse, touch)
|   |-- layout/               # Layout engine wrappers
|   |-- logging/              # Logging infrastructure
|   |-- managers/             # Style, Data, Layout, Algorithm, Selection, Render, ... managers
|   |-- meshes/               # Babylon.js mesh factories
|   |-- screenshot/           # Screenshot capture utilities
|   |-- shaders/              # Custom GLSL shaders
|   |-- types/                # Shared type declarations
|   |-- ui/                   # UI overlay components
|   |-- utils/                # Utility functions (incl. styleHelpers)
|   |-- video/                # Video export functionality
|   `-- xr/                   # VR/AR support
|-- test/
|   |-- acceleration/         # Accelerator registry, controller, webgpu entry tests
|   |-- ai/                   # AI feature tests
|   |-- algorithms/           # Algorithm tests
|   |-- catalog/              # Descriptor table tests
|   |-- errors/               # Error model tests
|   |-- interactions/         # User interaction tests
|   |-- meshes/               # Mesh rendering tests
|   |-- packaging/            # Exports map + Node-safe entry point enforcement
|   `-- ...
|-- stories/                  # Storybook stories
`-- docs/                     # VitePress documentation
```

## Entry Points

This package is not one barrel. `package.json` publishes an exports map, and each subpath has a
source file of the same name at the package root:

| Subpath | Source | What it carries | Node-safe |
|---------|--------|-----------------|-----------|
| `.` | `index.ts` | The custom element; defines the tag; pulls in Babylon.js and Lit | No |
| `./schema` | `schema.ts` | Palettes, `NodeShapes`, `defaultNodeStyle`, `defaultEdgeStyle`, `defaultRichTextLabelStyle`, style config types, the colour helpers | Yes |
| `./catalog` | `catalog.ts` | Plain-JSON descriptors: `BUILT_IN_ALGORITHMS`, `LAYOUT_DESCRIPTORS`, formats, palettes, scales, `optionsFromZod`, descriptor types | Yes |
| `./extend` | `extend.ts` | The registration surface: `Algorithm`, `LayoutEngine`, `DataSource`, `registerAccelerator`, `GraphtyError` | Yes |
| `./format` | `format.ts` | The graph-format decode vocabulary (read-only half; no brand, no version) | Yes |
| `./session` | `session.ts` | Types only so far -- identities, scopes, result shapes, `Capabilities`, the error model | Yes |
| `./logging` | `logging.ts` | `GraphtyLogger`, `LogLevel`, `LogRecord`, `Sink`, the console and remote destinations, `formatLogRecord`, the stored configuration, `parseLoggingURLParams` and `lazy` | Yes |
| `./commands` | `commands.ts` | Nothing yet; the name is reserved for the serialisable command union | Yes (empty) |
| `./react` | `react.ts` | Nothing yet; the name is reserved for typed React wrappers | Yes (empty) |
| `./webgpu` | `webgpu.ts` | Side-effect import that registers the WebGPU accelerator; the only file that imports the optional peer | No |
| `./ai` | `ai.ts` | The natural-language layer and its LLM SDKs; needs a DOM | No |
| `./bundle` | `index.ts` via `vite.bundle.config.ts` | One self-contained file for a `<script>` tag (replaced the UMD build) | No |

**Node-safe means the module resolves with no Babylon.js, no Lit and no DOM anywhere in its
run-time import graph.** `test/packaging/node-safe-entries.test.ts` enforces it for `session.ts`,
`schema.ts`, `catalog.ts`, `commands.ts`, `extend.ts`, `format.ts`, `react.ts` and
`logging.ts`: it transpiles each one and everything it reaches (so `import type` is correctly
erased), fails if `@babylonjs/*`, `lit`, `@lit/*` or `@mlc-ai/*` appears, checks that `index.ts`
does reach Babylon and Lit so a walker that resolved nothing cannot pass, and then imports
`session`, `schema`, `catalog`, `extend`, `format` and `logging` in plain Node.
`test/packaging/exports-map.test.ts` checks the exports map, the `sideEffects` list and the peer
dependency declarations against the build.

So: **adding an import to a module a Node-safe entry point reaches will fail the build**, in a
test far away from the file you edited. Before importing something into `src/catalog/`,
`src/errors/`, `src/acceleration/`, `src/config/`, `src/utils/styleHelpers/` or anything else
those entry points reach, check what that import drags in. A type-only import is free -- write
`import type` and the emitter deletes the statement. A value import of anything that touches a
mesh, a material, a scene, a `LitElement` or `document` is not.

`@graphty/webgpu-graph-algorithms` is an optional peer dependency and `webgpu.ts` is the only
file in the package allowed to import it. A consumer who never imports `./webgpu` never resolves
the peer, which is why activation is an entry point rather than a dynamic import from the core.

The build runs Vite twice: the library build (`vite.config.ts`, every dependency external, one
output file per entry point) and the self-contained bundle (`vite.bundle.config.ts`, nothing
external, one file, `emptyOutDir: false` so it adds to `dist/` rather than replacing it).

## Extension Points

Six things can be brought to the element from outside. This list is the SUPPORTED set, and it is
closed: it is what a third party may build against, what the element promises not to break, and
what every change here is measured against.

| Extension point | What a third party brings |
|---|---|
| Palette | A named set of colour anchors a style layer ramps through |
| File format | A reader for a graph file the element does not ship, reached by the same routes the built-in formats are |
| Camera | A way of deciding where the viewer is and what they are looking at |
| Layout | An engine that decides where nodes sit, live or in a single pass |
| Algorithm | Something computed over the graph that publishes a result |
| Logging | A destination the element's log records are delivered to |

**The rule: an extension must be able to do everything its built-in peer can.** Whatever the
element's own palettes, importers, cameras, layouts, algorithms and log sinks can do, a third
party's must be able to do by the same route, with the same reach, and with types it can import.
A capability the element keeps for its own modules is a defect in the extension point, not a
design choice.

Concretely, parity means all of these, not only the registration call: appearing in
`session.catalog` so a picker can offer it; being addressable by the key a consumer types, and by
the key a saved document records wherever the element reads one back; reporting progress and
honouring cancellation where its built-in peer does; being configurable through the same options
mechanism; reporting failure as a `GraphtyError` with a code from `src/errors/codes.ts`; and being
writable in TypeScript against a published entry point without casting or re-declaring a type the
element already has.

**Anything else that looks registrable is internal.** A scale plugin, a node mesh shape, a
lifecycle manager, an AI command, an accelerator: these have registration machinery and are not
supported extension points today. They may be promoted later. Until then nothing is obliged to
keep them working for a third party who finds them, and a bug report about one is a feature
request.

**Why the list is closed rather than "whatever happens to be registrable".** A seam that is
half-reachable is worse than no seam: a consumer finds the registration call, builds against it,
and discovers at integration time that their extension cannot appear in a picker, cannot be
saved, or cannot be typed. Every entry above was audited against exactly that failure and the
gaps were the norm, not the exception -- a layout engine that registered and ran but could not
be written in TypeScript, an algorithm that computed and could not publish, a palette that could
not be registered at all.

Parity is pinned by seven files under `test/browser/extensions/`: one per extension point, plus
`all-extension-points.test.ts`, which registers one extension of every kind against a single graph
and is the only place the six are proved to work together rather than one at a time. Each of the
six registers a dummy extension and drives it through the routes its built-in equivalent is
reached by. **A capability that is not exercised there is not promised.**

### Where parity is vacuous or incomplete, stated rather than left to be found

These are the clauses a reader should not assume from the sentence above. None is a capability the
element keeps for its own modules -- each is an absence shared with the built-ins -- but a
plugin author who expected otherwise would be misled.

- **Progress and cancellation.** A palette does no work over time; a camera view computes
  synchronously; a log destination's `write` is fire-and-forget. None of those has progress or
  cancellation to be at parity about. An import cannot be cancelled and a layout reports no
  progress, for a built-in as much as for a plugin. Only the algorithm point has both, and it has
  them fully.
- **A saved document.** A palette travels in one (`toDocument` writes the descriptor of every
  non-built-in palette its layers name), a format id and an algorithm run are recorded in one, and
  a logging configuration round-trips by name. A camera view is recorded in no saved document at
  all, and a saved `graph.layout` is read back by nothing -- both true of the element's own views
  and layouts too.
- **A palette takes no options at all.** `PaletteDescriptor` is the only catalogue descriptor with
  no `options` field, because every knob -- scale, domain, clamp, midpoint, reverse, missing, bins
  -- belongs to the binding rather than to the palette. No built-in palette takes configuration
  either, so giving the point an options surface would be inventing a parity gap rather than
  closing one.
- **`scope`, `seed`, `exact`, `sample` and `timeBox`** are resolved by a run and not forwarded to
  `compute`, so no algorithm receives them: not a plugin's, and not one of the element's own.
- **The element's own importers still throw plain `Error`s.** A registered format reports
  `E_PARSE_FAILED` and `E_FETCH_FAILED`; the seven built-in readers do not yet. A plugin is ahead
  of the built-ins here rather than behind them.
- **An algorithm plugin cannot be unit-tested in Node.** `Algorithm`'s constructor takes the
  renderer-backed `Graph`. `./extend` resolving in Node buys type-checking, not a headless test.

## Essential Commands

```bash
# Development
npm run dev              # Start Vite dev server (HOST/PORT from the monorepo root .env)
npm run storybook        # Start Storybook (HOST/PORT from graphty-element/.env)
npm run dev:xr           # Start XR demo server

# Testing
npm test                 # Run all test shards + visual tests
npm run test:default     # Run default (unit) tests
npm run test:browser     # Run browser tests (Playwright)
npm run test:storybook   # Run Storybook component tests
npm run test:interactions # Run interaction tests
npm run test:llm-regression # Run LLM regression tests
npm run test:mesh        # Run mesh tests (separate vitest config)

# Coverage
npm run coverage         # Full coverage with shards
npm run coverage:fast    # Quick coverage (default project only)
npm run coverage:preview # Serve coverage report on port 9053

# Linting
npm run lint             # ESLint + TypeScript check
npm run lint:fix         # Auto-fix lint issues
npm run lint:knip        # Check for unused deps (knip, run from the monorepo root)

# Building
npm run build            # Vite library build + the ./bundle build + TypeScript declarations
npm run build-storybook  # Build Storybook for deployment

# Documentation
npm run docs:dev         # Start docs dev server
npm run docs:build       # Build documentation
```

The monorepo assigns this package port 9020 for the dev server and 9025 for Storybook; both are
read from `PORT`, so without an `.env` you get Vite's and Storybook's own defaults.

## Architecture

### Core Components

1. **graphty-element.ts** - Lit Web Component wrapper (thin layer)
2. **Graph.ts** - Central orchestrator with all logic
3. **Node.ts / Edge.ts** - Graph element classes with Babylon.js meshes
4. **Managers** - Handle side effects: StyleManager, DataManager, LayoutManager, AlgorithmManager

### Key Design Patterns

- **Registry Pattern**: Layouts, data sources, algorithms and accelerators are dynamically registered
- **Manager Pattern**: Side effects handled through managers (always use manager methods, not direct manipulation)
- **Observable Pattern**: Events via graphObservable, nodeObservable, edgeObservable
- **Stateless Design**: APIs work regardless of call order

### Error Model

Every failure the element reports is a `GraphtyError` carrying a `GraphtyErrorCode` from
`src/errors/codes.ts`. The code is the contract a consumer switches on; the message is for
people and may be reworded in any release. Sibling packages throw their own error classes, and
the element re-reports them as one of these codes with the original attached as `cause`. There
is deliberately no `E_NOT_READY`: every method is safe to call before the element is ready, and
work queues until it is.

### Acceleration

`src/acceleration/` owns hardware acceleration end to end: a registry an accelerator factory
registers into, an `AccelerationController` that probes, builds, attaches, watches for device
loss and applies the `acceleration.minNodes` threshold, and the `Capabilities` document a host
reads. The element exposes the `acceleration` attribute (`auto` | `off` | `required`, reflecting)
and emits `graphty-capabilities-change` on every transition. A consumer writes no probe, no
construction and no device-loss code -- that is the point. Nothing here names a GPU type; WebGPU
arrives only through the `./webgpu` entry point.

What actually uses an accelerator: the layouts `forceatlas2`, `spring` and `spring-electrical`
run on `SimulationLayoutEngine` over `@graphty/layout`'s `createSimulation`, which takes the
accelerator when the controller planned one and the CPU simulation when it did not; five
algorithm adapters (PageRank, Dijkstra, BFS, connected components, Kruskal) route through
`@graphty/algorithms`' `accelerated()` and label the result's `caveats.precision` with the
arithmetic that produced it. `src/testing/fakeAccelerator.ts` is the one fake, deterministic and
frame-count-independent, and it is shared by the tests and the stories -- write no second one.

### Test Projects

| Project | Environment | Purpose |
|---------|-------------|---------|
| `default` | happy-dom | Unit tests |
| `browser` | Playwright/Chromium | Browser integration tests |
| `storybook` | Playwright | Component tests via stories |
| `interactions` | Playwright | User interaction tests |
| `llm-regression` | Node | AI/LLM regression tests |

`GRAPHTY_BROWSER_GPU` picks the Chromium flag set the `browser` project launches with --
`swiftshader` for a workstation or a plain runner, `nvidia` for the GPU lane's card (add
`GRAPHTY_EGL_LIB_DIR` when the driver's libEGL is not where Chromium looks). Unset, Chromium
launches with no flags and sees no WebGPU at all, which is what the five CI shards do and why
`test/browser/webgpu-layout.test.ts` skips itself there.

## Common Pitfalls

**Entry point contamination**: Six published entry points carry exports that must resolve in
Node with no renderer (two more are checked but still empty). Importing a value from a module
that reaches Babylon.js, Lit or the DOM into anything `schema.ts`, `catalog.ts`, `extend.ts`,
`format.ts`, `logging.ts` or `session.ts` reaches fails
`test/packaging/node-safe-entries.test.ts`, not the file you edited. Use `import type` when you
only need the type -- it is erased and costs nothing. See "Entry Points" above.

**The colour helpers are total, and do not throw**: in
`src/utils/styleHelpers/color/interpolation.ts`, `hexToRgb` returns `null` for anything that is
not a six-digit hex string, and `interpolatePalette` returns `MISSING_DATA_COLOR` (`#ff00ff`)
for a value that is `undefined`, `null`, `NaN` or infinite, and for a palette anchor that does
not parse. They run once per node inside a repaint loop with no try/catch, so a throw would
abort the frame and silently leave every later node unstyled. Only an EMPTY palette throws --
that is a programmer error in the palette definition, caught before anything is painted.

Several older call sites were written around the previous throwing behaviour: a try/catch around
an interpolation call, or a pre-check for `undefined` before one, is now dead weight and should
be deleted rather than copied.

Seeing the magenta on screen is a bug report, not a design: it means a style layer asked a ramp
for an element the algorithm never measured. Fix the layer's selector so the unmeasured element
is never visited; do not pick a prettier colour.

**Manager Pattern**: Always use manager methods instead of direct manipulation:
- Right: `styleManager.addLayer(layer)` - uses manager
- Wrong: `graph.styles.layers.push(layer)` - bypasses cache invalidation

**Algorithm Registration**: All algorithm classes must auto-register:
```typescript
export class MyAlgorithm extends Algorithm {
    static namespace = "my-namespace";
    static type = "my-type";
}
Algorithm.register(MyAlgorithm);
```

## Testing Guidelines

- `assert` is the house style and is what the overwhelming majority of tests use: `import { assert, describe, it } from "vitest"`. Prefer it for new assertions.
- `expect` is used where it earns its place -- `expect.each`, `toEqual` on a whole array, and the async matchers -- mostly in the browser, packaging, catalog and acceleration tests. It is not a violation to find it; it is a violation to reach for it out of habit.
- `globals: true` is set, so `assert` and `expect` are available without an import, but every test file imports them explicitly anyway. Match that.
- Visual tests run sequentially (`--workers=1`) to avoid resource contention
- Store temporary files (screenshots, debug scripts) in `./tmp`
- Don't create `__screenshots__` directories under `./test` unless intended for commit. Vitest's browser-mode failure screenshots used to land there; `vitest.config.ts` now sends them to `tmp/vitest-screenshots` instead, so a failing run leaves `test/` alone
- Don't increase Playwright timeouts to fix timeout issues - find the root cause

## A story is a test, and a capability must never lose its last door quietly

These four rules exist because of one change set in September 2026, and they are written here
rather than inferred because every agent involved in it complied with every instruction it had.

- **A story is a test.** Everything the no-weakening rule says about a test applies to a story:
  never delete one, never hollow one out, never leave it named for something it no longer draws.
  A story that pins behaviour which is deliberately going away is REPLACED by one that pins the
  new behaviour, and the removal is recorded in `stories/story-roster.json`. Twenty stories were
  deleted in `ff12a515` under a rule that said "test" three times and "story" never; the commit
  subject is "drive a dummy extension through everything a built-in does", because
  `tools/commit-changes.sh` sorts `stories/` into the tests bucket and no message in the
  forty-one-commit branch mentions a story.

- **A capability that loses its only public route is a blocking finding, recorded in the
  repository before the change lands.** A row in `design/element-api/capability-losses.md`, and
  an entry in `src/catalog/unreachable.ts` so a gate can see it too. Not a comment in the file
  being gutted, and not a paragraph in an agent's report. The arrow head kept a size, a colour
  and an opacity through the whole of the 2.0 development -- declared, defaulted, rendered, and
  reachable by nothing. Three agents on three days noticed, wrote it down where they were
  working, and none of those places could reach a person.

- **An agent that computes a loss list writes it to a file before it reports**, and puts "what I
  could not do" at the TOP of its report. The converter that migrated the stories computed the
  exact list of dropped fields and printed it to stdout inside the run that caused the loss. The
  report that named the seventeen deleted stories was past the 9,656-character truncation of the
  notification that carried it, and the phrase "17 stories removed" appears nowhere in the 92 MB
  session transcript.

- **When one of the five contract tests goes red, the fix is to write the answer down, not to
  loosen the test.** `test/contracts/story-roster.test.ts` wants the story's id and the reason it
  went; `test/contracts/config-reachability.test.ts` wants the schema field and why no channel
  writes it; `test/browser/channel-paints.test.ts` wants the channel and what it fails to draw.
  Each of them is green only when a sentence exists in a file in the repository, which is the
  one place a truncated report, a partial read and a commit splitter cannot lose it.

- **A story named after a style channel has to paint that channel, and
  `test/contracts/story-demonstrates-its-subject.test.ts` is what enforces it.** The roster
  counts ids, and an id is a name, so a story kept by name whose body stops showing its subject
  passes it -- which is how `Styles/Layered::ArrowSizeVariations` spent the 2.0 migration
  promising three arrow sizes in a comment while all three of its layers wrote only a cap type.
  The gate splits every story name in the `Styles/` tree into words, keeps the ones that are
  words of a real channel name, and requires the story to write something that accounts for each
  of them. The vocabulary is derived from `CHANNELS`, so a newly published channel becomes a
  subject with nothing edited. A red here has two honest answers: put the missing layers back,
  or rename the story -- and renaming changes its id, so the roster is edited in the same breath
  and the lost demonstration is recorded rather than mislaid.

- **A waiver that records a DEFECT expires, and the fourth test is what happens when it does.**
  A sentence written into `src/catalog/unreachable.ts` says one of two things, and the entry now
  declares which: `by-design` records a decision and is permanent, `defect` records something
  broken and carries an owner and an expiry. `test/contracts/waiver-expiry.test.ts` goes red the
  day after that expiry, naming the subject, the reason, the date and the two moves available --
  fix the defect and delete the waiver, or decide it still stands and set a new date. Write the
  kind honestly: when it is arguable, it is a defect, because a decision waiver is silent for
  ever and that silence is what let every repaint defect in this package go quiet. Nothing
  automated may put a person's name in `owner`; agents write `WAIVER_OWNER_UNASSIGNED` and the
  owner replaces it.

## Storybook Notes

- Storybook auto-reloads on changes (no manual rebuild needed)
- Check if Storybook is running on port 9025 before starting a new instance
- All story data URLs must be fully qualified (non-local) for Chromatic compatibility
- Visual regression via Chromatic

## Edge Styling System

Comprehensive edge customization:
- **Line Types**: solid, dash, dot, star, diamond, dash-dot, sinewave, zigzag
- **Arrow Types**: normal, inverted, dot, diamond, box, vee, tee, half-open, crow, etc.
- **Bezier Curves**: Smooth curved edges with automatic control points
- **Opacity**: Full transparency control (0.0 - 1.0)

Key files: `src/Edge.ts`, `src/meshes/EdgeMesh.ts`, `src/meshes/PatternedLineMesh.ts`

## AI Integration

The `src/ai/` directory provides LLM-powered features:
- Natural language commands for graph manipulation
- Schema extraction for data understanding
- Multiple provider support (OpenAI, Anthropic, Google)
- Secure API key management

It is published from `@graphty/graphty-element/ai`, not from the root barrel, so an application
that only draws a graph does not ship three LLM provider SDKs and an encrypted key store. What a
coding agent needs in order to drive the element -- the algorithms, layouts, formats, palettes
and scales, with every option each accepts -- is published as plain JSON by
`@graphty/graphty-element/catalog` instead.

## XR Support

The `src/xr/` directory provides VR/AR support:
- WebXR integration with Babylon.js
- Controller input handling
- Immersive graph exploration

## Debugging

### Screenshot Capture
```bash
# Multi-angle 3D screenshots
npx tsx test/helpers/capture-3d-debug-screenshots.ts <story-id> [--axes]

# 2D screenshots, optionally at several zoom levels
npx tsx test/helpers/capture-2d-screenshots.ts <story-id> [--zoom-levels]
```

## Configuration Stability

The config interface in `src/config` should be stable:
- Don't remove or change existing config settings
- Adding new settings is acceptable for new features
