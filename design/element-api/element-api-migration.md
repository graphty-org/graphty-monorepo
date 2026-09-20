# graphty-element 2.0: the breaking change register and migration guide

Status: draft, for review
Date: 2026-09-19
Subject: `@graphty/graphty-element`, today **1.10.0** (`graphty-element/package.json:3`)
Proposed next version: **2.0.0**

See `design/element-api/element-api-design.md` for the 2.0 API itself.

Plain ASCII only. Every claim about the code as it stands today carries a `path:line` read on
2026-09-19 at repo root `/home/apowers/Projects/graphty-monorepo`. Paths are repo-relative.

---

## 0. Contents

1. What this document is, and how to read a row
2. The breaking change register, area by area
3. Behaviour changes that are not signature changes
4. Edge endpoints: `source`/`target` versus `src`/`dst`
5. Migrating the one existing consumer, the graphty app
6. The deprecation policy: what is public, what is not, and how long
7. Should a 1.x bridge release ship?
8. The version number and the release mechanics in this repo
9. The codemod inventory
10. Open placements, and what is deliberately NOT breaking

---

## 1. What this document is, and how to read a row

This is the complete list of every way a program written against `@graphty/graphty-element`
1.10.0 can stop working when it is pointed at 2.0.0. It exists for two reasons.

1. **It justifies the major version bump.** Under this repo's release mechanics a major happens
   only because a commit message says so. This document is the evidence for that commit.
2. **A missed row is an unflagged break.** The package has exactly one consumer today (the
   graphty app, `graphty/`), which is what makes this exercise cheap; it is also what makes an
   omission invisible until a third party hits it. Anything not listed here is, under the
   deprecation policy below, promised to keep working.

### 1.1 Column meanings

| Column | Meaning |
|---|---|
| Old | the exact symbol, attribute, event name or behaviour in 1.10.0, with a `path:line` |
| New | what replaces it in 2.0, or `REMOVED` |
| Why | the defect or principle that forces the change |
| Migrate | what a consumer does |
| Codemod | `YES` mechanical / `PARTIAL` mechanical plus review / `NO` needs a human decision |

---

## 2. The breaking change register

Seventy-seven surface changes, grouped by the part of the package they touch: packaging, the
custom element, data, runs and algorithms, selection, style layers, layout, events, extension
points, input and camera, and errors and types.

### 2.1 Packaging, entry points and dependencies

| Change | Old | New | Why | Migrate | Codemod |
|---|---|---|---|---|---|
| One entry point | One export: `exports["."]` with `types`/`import`/`require`, plus `main: "./dist/graphty.umd.cjs"` and `module` (`graphty-element/package.json:7-14`). No `customElements` field although `dist/custom-elements.json` ships inside `files` (`package.json:23-27`) | A full exports map with `.`, `./session`, `./schema`, `./catalog`, `./commands`, `./extend`, `./format`, `./react`, `./webgpu`, `./io/*`, `./ai`, `./bundle`, `./custom-elements.json`, and a `customElements` field | One entry drags Babylon into every import, which is why the one consumer imported element `src/` by relative path in a test (`graphty/src/constants/__tests__/style-options.test.ts:8`) and copied ten viridis anchors (`graphty/src/components/shell/defaults/nodeMetricStyle.ts:176`) | Nothing for `import "@graphty/graphty-element"`. Move pure-data imports to the new subpaths | PARTIAL |
| The CommonJS entry | `require: "./dist/graphty.umd.cjs"` | REMOVED; the package is ESM-only (`"type": "module"`) | A UMD build of a package whose default entry defines a custom element has no honest CJS consumer; the new exports map has no `require` condition | A CJS consumer moves to dynamic `import()`, or to the `./bundle` script tag | NO |
| Babylon and Lit as required peers | `@babylonjs/core ^8.0.0` and `lit ^3.0.0` are **required** peers (`graphty-element/package.json` peerDependencies), externalised by the build (`graphty-element/vite.config.ts:36-44`), which is why the package's own example hand-writes an import map (`graphty-element/examples/basic.html:24-30`) | Babylon and Lit are bundled implementation detail of `.`; `@babylonjs/core` becomes an **optional** peer for consumers who want the externalised build; a new self-contained `./bundle` entry exists for the CDN | A stranger must never hand-write an import map to use a web component | Drop `@babylonjs/core` and `lit` from your install line unless you deliberately share a Babylon instance | PARTIAL |
| The AI surface in the root barrel | ~45 AI symbols in the root barrel (`AiManager`, `createAiManager`, `AiController`, `CommandRegistry`, `ApiKeyManager`, `MockLlmProvider`, `VercelAiProvider`, `SchemaManager`, `TextInputAdapter`, `VoiceInputAdapter`, 16 command functions, ~25 types -- `graphty-element/index.ts`), with `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`, `ai` and `encrypt-storage` as hard runtime dependencies (`package.json` dependencies) | The AI surface moves to `./ai`; those five become optional peers | Three LLM provider SDKs and an encrypted key store are not runtime dependencies of a graph renderer. The name collisions alone force it: `runAlgorithm`, `setLayout`, `captureScreenshot` and `setCameraPosition` are exported from the root as AI *command functions* with the same names as element *methods* | `import { AiManager } from "@graphty/graphty-element/ai"`; add the five peers to your own install | YES |
| Sourcemaps in the tarball | `dist/` is 39 MB, of which **26.4 MB is 490 `.map` files** (measured 2026-09-19), and `files: ["dist/","README.md","LICENSE"]` publishes all of it. `sourcemap: true` at `graphty-element/vite.config.ts:33` | Sourcemaps leave the published tarball | "Install graphty-element" must not be a 39 MB download for someone evaluating the library | None. Debug against a source checkout | YES |
| `sideEffects` names unpublished paths | `sideEffects` lists `./src/layout/index.ts`, `./src/data/index.ts`, `./src/algorithms/index.ts` (`package.json:15-20`) -- three paths that are **not published**, since `files` ships only `dist/` | `sideEffects` lists real published paths: `./dist/graphty.js`, `./dist/graphty.bundle.js`, `./dist/webgpu.js`, `./dist/io/*.js`, `./dist/compat.js` | The current list is inert, so a bundler's tree-shaking decisions about this package are made on wrong information | None | YES |
| The 23 logging exports | `clearLoggingConfig`, `configureLogging`, `ConsoleSinkOptions`, `createConsoleSink`, `createRemoteSink`, `getLoggingConfig`, `GraphtyLogger`, `GraphtyLoggerConfig`, `isModuleEnabled`, `loadLoggingConfig`, `LOG_LEVEL_NAMES`, `LOG_LEVEL_TO_NAME`, `Logger`, `LoggerConfig`, `LogLevel`, `LogRecord`, `ParsedLoggingParams`, `parseLoggingURLParams`, `parseLogLevel`, `RemoteSinkOptions`, `resetLoggingConfig`, `saveLoggingConfig`, `Sink` (`graphty-element/index.ts:200-230`) | **UNDECIDED.** Recommended: a `./logging` subpath, or removal from the public surface. The open placements section states the case | `parseLoggingURLParams` is load-bearing for the URL-parameter change below, because the element configures global logging from `window.location.search` today. A logging facade is a legitimate public surface; an accidental one is not | Whichever is picked, the root barrel stops exporting them | YES if a subpath; NO if removed |
| The 7 accessibility exports | `areDistinguishableInGrayscale`, `colorDifference`, `isPaletteSafe`, `simulateDeuteranopia`, `simulateProtanopia`, `simulateTritanopia`, `toGrayscale` (`graphty-element/index.ts:336-343`) | **UNDECIDED.** Recommended: keep them, behind `./schema`, beside the palettes, since `PaletteDescriptor.colorblindSafe` is derived from exactly this code | They are pure data functions with no Babylon dependency, so `./schema` costs nothing, and they are the only shipped way to check a custom palette | `import { isPaletteSafe } from "@graphty/graphty-element/schema"` | YES |
| `BUILTIN_PRESETS` | `BUILTIN_PRESETS` (`graphty-element/index.ts:195`, from `src/camera/presets`) | Catalogue data reachable through `camera.preset` and `ViewPreset` | Camera presets become a named union on `CameraApi["preset"]` plus `bookmark()`/`apply()`; a raw constant export of the built-in table is no longer the door | Use `camera.preset` names and `camera.apply(preset)` | PARTIAL |
| Renderer tuning constants | `EDGE_CONSTANTS`, `SHAPE_CONSTANTS`, `PolyhedronType` (`graphty-element/index.ts`, Constants block) | REMOVED from the public surface; the facts a consumer needs are in catalogue descriptors and `./schema` | These are renderer tuning constants (`EDGE_CONSTANTS.DEFAULT_LINE_WIDTH` is read at `graphty-element/src/Edge.ts:159,173,187,338,429,447,472`); exporting them freezes internal rendering choices into the API | Read the equivalent from a `LayerSpec` default or a descriptor | NO |

### 2.2 The custom element: tag, lifecycle, attributes, escape hatches

| Change | Old | New | Why | Migrate | Codemod |
|---|---|---|---|---|---|
| The element's type | `export type GraphtyElement = Graphty` exists at `src/graphty-element.ts:2161` but is **not** re-exported (`index.ts` exports only `{ Graphty }`), and no `HTMLElementTagNameMap` augmentation exists anywhere in the package (`grep -rn "HTMLElementTagNameMap" src/ index.ts` finds only `src/ai/input/VoiceInputAdapter.ts:53`) | `GraphtyGraphElement` is exported from `.`, and the package ships the `HTMLElementTagNameMap` and `GraphtyEventMap` augmentations | A class named `Graphty` that carries the whole element surface is replaced by an interface named for the tag. Both the name and the identity change | `import type { GraphtyGraphElement }`; delete your own tag-map augmentation | PARTIAL |
| `element.graph` and the manager getters | `get graph(): Graph` (`src/graphty-element.ts:1060-1063`, JSDoc "for debugging purposes"), plus the 11 exported manager classes `AlgorithmManager`, `DataManager`, `EventManager`, `InputManager`, `LayoutManager`, `OperationQueueManager`, `RenderManager`, `SelectionManager`, `StatsManager`, `StyleManager`, `UpdateManager` (`graphty-element/index.ts`, Managers block), plus `Graph` itself (4,147 lines, ~100 public methods, 17 bare mutable public fields at `src/Graph.ts:88-133`) | `element.session: GraphSession` plus the eight element forwarders (`ready`, `run`, `encode`, `select`, `load`, `get`, `on`, `data`) and the element's own view verbs; exactly one unsupported door, `readonly unstable_internals: unknown`, documented as not semver-protected | A god object documented "for debugging" that is also the only consumer's main road is not an API. The app reaches `element.graph.dataManager` -- a `private` field (`src/Graph.ts:125`) -- at `graphty/src/components/Graphty.tsx:307` and `:435` | Every use of `element.graph.*` maps to a named session API; the member-by-member table below gives the mapping | PARTIAL |
| Teardown on disconnect | `disconnectedCallback()` disconnects the resize observer and calls `this.#graph.shutdown()` (`src/graphty-element.ts:134-142`). `Graph.dispose()` at `src/Graph.ts:4134` -- which cleans the voice adapter, the AI manager, the XR UI and the XR session before calling `shutdown()` -- is **never called by the element**. There is no `element.dispose()` | `element.dispose()` exists and is honest; the view releases renderer resources on disconnect and recreates them on connect; teardown is deferred one frame so a React StrictMode double-mount does not destroy the engine; the session outlives both | The AI, voice and XR resources leak today on every DOM removal. Re-attaching an element is not expressible | Call `element.dispose()` when you are finished with the element; stop treating removal from the DOM as destruction | PARTIAL |
| Reading the host page's URL | `connectedCallback()` calls `parseURLParams()` (`src/graphty-element.ts:40-53`), which constructs `new URLSearchParams(window.location.search)` at `src/graphty-element.ts:58` and configures profiling and global logging from the host page's query string | Opt-in: `<graphty-element url-params="profiling logging">` | An embedded component that reconfigures itself from its host's URL is a surprise a third-party host cannot anticipate and cannot diagnose | Add the `url-params` attribute if you relied on `?profiling=true` | YES |
| The fourteen observed attributes | Cited at their `@property` decorator line (`grep -n '@property' graphty-element/src/graphty-element.ts`; the getter is the next line): `node-data` :187, `edge-data` :233, `data-source` :257, `data-source-config` :279, `node-id-path` :344, `edge-src-id-path` :368, `edge-dst-id-path` :392, `layout` :435, `layout-config` :461, `view-mode` :501, `layout-2d` :527, `style-template` :580, `run-algorithms-on-load` :604, `enable-detailed-profiling` :631 | Eleven attributes: `src`, `sample`, `format`, `layout`, `view-mode`, `theme`, `filter`, `acceleration`, `interactive`, `hover`, `url-params`. **Twelve of the fourteen are removed; `layout` and `view-mode` survive.** Rich data is property-only, a JSON slot, or `src` | `grep -n converter graphty-element/src/graphty-element.ts` returns nothing, so no Lit converter is declared on any of them: `node-data='[{"id":1}]'` hands the setter a string, `Array.isArray` is false, and the rows are dropped with no error. No test or story in the repo exercises the attribute path | See the per-attribute table below | PARTIAL |
| `data-source` and `data-source-config` | The two attributes at :257 and :279 occupy the HTML `data-*` custom-data namespace, so `el.dataset.source` aliases the API | REMOVED. Recorded separately from the attribute cull because the reason is different | Any tool that assumes `data-*` is author data collides with the element's API | Use `src` plus `format`, or `session.data.import()` | YES |
| `asyncFirstUpdated` | It is **public** and re-callable (`src/graphty-element.ts:92`); calling it twice double-subscribes the DOM event forwarder | REMOVED from the public surface | An internal Lit lifecycle step surfaced as API, with a documented double-subscribe hazard | Await `element.ready` instead | YES |
| `render()` | Returns the raw inner `div` rather than a Lit `TemplateResult` (`src/graphty-element.ts:127`) | REMOVED from the public surface | Lit's `render` is not a consumer API | Nothing; nobody should call it | YES |
| `setRenderSettings` | `setRenderSettings(_settings, options?)` on the element (`:1942`) forwarding to `Graph.setRenderSettings(_settings: Record<string, unknown>, options?)` at `src/Graph.ts:1455`, whose entire body queues an empty operation with the parameter unused | REMOVED | A documented, `@example`-carrying public method that is a no-op is worse than a missing one | Delete the call; it never did anything | YES |

#### Where each of the element's 98 members goes

Line numbers are `graphty-element/src/graphty-element.ts`. The element forwards eight things in
2.0 and keeps its own view verbs; everything else either moves to a named session API or is
removed. Nothing in this table is silently preserved.

| Group | Members (1.10.0) | 2.0 replacement | Codemod |
|---|---|---|---|
| Lifecycle | `constructor` :27, `connectedCallback` :40, `firstUpdated` :81, `render` :127, `disconnectedCallback` :134 | internal; plus a new public `dispose()` | n/a |
| Lifecycle, leaked | `asyncFirstUpdated` :92 | REMOVED; use `await element.ready` | YES |
| Data, add | `addNode` :1089, `addNodes` :1112, `addEdge` :1133, `addEdges` :1158 | `session.data.apply({kind:"add-nodes"\|"add-edges", rows})`, returning a `MutationReceipt` with an inverse | PARTIAL |
| Data, remove/update | `removeNodes` :1178, `updateNodes` :1198, `clearData` :311 | `session.data.apply({kind:"remove-nodes"\|"set-attributes"\|"clear"})` | PARTIAL |
| Data, load | `addDataFromSource` :1216, `loadFromUrl` :1235, `loadFromFile` :1264, `setData` :1809 | `element.load(source, plan?, options?)` / `session.data.import()`; `data.inspect()` for the two-phase path | PARTIAL |
| Data, read | `getNode` :1289, `getNodes` :1303, `getNodeCount` :1316, `getEdgeCount` :1329 | `element.get(id)` -> `ElementView`; `session.data.node/edge/nodeIds/edgeIds`; `session.status.counts` | PARTIAL |
| Selection | `selectNode` :1349, `deselectNode` :1361, `getSelectedNode` :1377, `isNodeSelected` :1393 | `session.selection.apply(target, op)`, `.nodes`, `.edges`, `.clear()` | NO |
| Algorithms | `runAlgorithm` :1414, `applySuggestedStyles` :1434, `getSuggestedStyles` :1454 | `session.runs.start()` returning a `Run`; auto-apply is a policy with `{style:false}` to opt out; `run.suggestEncodings()` | NO |
| Style | `setStyleTemplate` :1475, `getStyleManager` :1495, `getStyles` :1827 | `session.styles.applyTemplate(StyleDocument)` and the `session.styles` verbs | NO |
| Layout | `setLayout` :1516 | `session.layout.set(id, params, o)` with semantic names and a loud unknown-name failure | PARTIAL |
| View mode / XR | `getViewMode` :860, `setViewMode` :878, `is2D` :1632, `isVRSupported` :899, `isARSupported` :920, `setXRConfig` :1652, `getXRConfig` :1661, `exitXR` :1674, `getXRSessionManager` :1971 | `element.viewMode` (a property), `session.capabilities.xr`, `session.config` for the `xr*` keys; `getXRSessionManager` is REMOVED | PARTIAL |
| Camera | `getCameraState` :932, `setCameraState` :942, `setCameraPosition` :958, `setCameraTarget` :974, `setCameraZoom` :987, `setCameraPan` :999, `resetCamera` :1011, `saveCameraPreset` :1020, `loadCameraPreset` :1031, `getCameraPresets` :1043, `exportCameraPresets` :1052, `importCameraPresets` :1061, `resolveCameraPreset` :1693, `setCameraMode` :1919, `zoomToFit` :1537 | `element.camera`: `moveTo`, `fit`, `zoomToNodes`, `followNode`, `linkTo`, `bookmark`, `apply`, plus `position`/`target`/`zoomPercent`/`preset`. Fifteen methods become nine | NO |
| Camera, leaked | `getCameraController` :1931 | REMOVED | YES |
| Capture | `captureScreenshot` :712, `canCaptureScreenshot` :735, `captureAnimation` :768, `cancelAnimationCapture` :806, `isAnimationCapturing` :815, `estimateAnimationCapture` :841 | `element.capture(CaptureOptions)`, `element.recordVideo(VideoOptions): Run<VideoResult>` (cancel via the `Run`), `session.plan({op:"view.capture"})` for the estimate, `session.capabilities.capture` for the capability check | NO |
| Events | `on` :1590, `addListener` :1600, `listenerCount` :1613 | `element.on(type, handler, options?)` returning its own unsubscribe; `listenerCount` REMOVED | NO |
| Ops | `waitForSettled` :1552, `batchOperations` :1570, `isRunning` :1741, `shutdown` :1726 | `session.layout.settle()`, `{op:"batch"}` / `runs.batch()`, `session.status.phase`, `element.dispose()` | PARTIAL |
| Input / geometry | `setInputEnabled` :1710, `worldToScreen` :1768, `screenToWorld` :1787 | `element.interactive` (a property), `element.worldToScreen`, `element.screenToWorld` -- the two geometry calls survive unchanged | YES |
| Manager escape hatches | `getDataManager` :1836, `getLayoutManager` :1845, `getUpdateManager` :1854, `getStatsManager` :1868, `getSelectionManager` :1877, `getEventManager` :1886, `getScene` :1895 (raw Babylon `Scene`), `getMeshCache` :1904, `getNodeMesh` :1962 (raw `AbstractMesh`) | REMOVED. `unstable_internals` is the one unsupported door | NO |
| Render | `setRenderSettings` :1942 | REMOVED; it is a no-op today | YES |
| AI (15) | `enableAiControl` :1991, `disableAiControl` :1999, `aiCommand` :2014, `getAiStatus` :2023, `onAiStatusChange` :2040, `cancelAiCommand` :2048, `getAiManager` :2057, `isAiEnabled` :2066, `retryLastAiCommand` :2075, `getApiKeyManager` :2084, `static createApiKeyManager` :2099, `getVoiceAdapter` :2108, `startVoiceInput` :2132, `stopVoiceInput` :2146, `isVoiceActive` :2155 | Move behind `./ai`; they leave the element class | PARTIAL |
| Properties (cited at the `@property` decorator) | `nodeData` :187, `edgeData` :233, `dataSource` :257, `dataSourceConfig` :279, `nodeIdPath` :344, `edgeSrcIdPath` :368, `edgeDstIdPath` :392, `layout` :435, `layoutConfig` :461, `viewMode` :501, `layout2d` :527, `styleTemplate` :580, `runAlgorithmsOnLoad` :604, `enableDetailedProfiling` :631, `xr` :669 | `element.data` (which replaces rather than appends -- see the behaviour section), `element.src`/`format`, `element.layout`, `element.viewMode`, `session.config` for the rest. Twelve of fifteen are removed | PARTIAL |
| Escape hatch | `get graph()` :1060 | REMOVED; `element.session` and `unstable_internals` | NO |

Two `Graph` methods are worth naming because they exist and the element never forwarded them,
so a consumer who found them through `element.graph` loses them with no element-level
replacement: `Graph.enterXR(mode)` (`src/Graph.ts:4063`) and the input-recording pair
`startInputRecording` / `stopInputRecording` (`src/Graph.ts:2143`, `:2151`). `enterXR` is
replaced by setting `element.viewMode = "vr" | "ar"`; input recording has **no 2.0
replacement**, and the 2.0 design refuses it deliberately.

#### The fourteen attributes, one row each

Every line number below is the `@property` decorator line in
`graphty-element/src/graphty-element.ts`, re-derived with
`grep -n '@property' graphty-element/src/graphty-element.ts` on 2026-09-19; the accessor
declaration is the following line.

| Attribute (declaration) | Fate in 2.0 | Migrate |
|---|---|---|
| `node-data` :187 | REMOVED | property `element.data = {nodes, edges}`, which now REPLACES rather than appends, or `<script type="application/json" slot="data">` |
| `edge-data` :233 | REMOVED | as above |
| `data-source` :257 | REMOVED | `src` + `format` |
| `data-source-config` :279 | REMOVED | `src`, or `session.data.import(source, plan, options)` |
| `node-id-path` :344 | REMOVED | `ImportPlan.nodeId` via `data.inspect()` / `data.import()` |
| `edge-src-id-path` :368 | REMOVED | `ImportPlan.edgeSource` |
| `edge-dst-id-path` :392 | REMOVED | `ImportPlan.edgeTarget` |
| `layout` :435 | **KEPT**, values change | rename the value: `ngraph` -> `force`, and so on. See the layout section |
| `layout-config` :461 | REMOVED | `session.layout.set(id, params)` |
| `view-mode` :501 | **KEPT** | none |
| `layout-2d` :527 (already `@deprecated`; the `console.warn` is in `set layout2d` at :543-547) | REMOVED | `view-mode="2d"` |
| `style-template` :580 | REMOVED | `session.styles.applyTemplate(StyleDocument)`; the document also splits four ways |
| `run-algorithms-on-load` :604 | REMOVED | call `session.runs.start()` after `await element.ready`, or use a `Recipe` |
| `enable-detailed-profiling` :631 (the only one declaring `type: Boolean`) | REMOVED | `url-params="profiling"`, or a config key |
| new: `src`, `sample`, `format`, `theme`, `filter`, `acceleration`, `interactive`, `hover`, `url-params` | ADDED | nine additions; `sample` names a built-in dataset, and `url-params` is the opt-in for reading the host page's query string. Eleven attributes in 2.0 |

Counting the object-valued attributes precisely, because it is easy to get wrong: **five** of
the fourteen are object-valued (`node-data`, `edge-data`, `data-source-config`, `layout-config`,
`style-template`), plus one object-valued property with no attribute at all (`xr`,
`@property({attribute: false})` at :669). Twelve of the fourteen attributes are removed, five of
them object-valued, and 2.0 declares eleven attributes in total.

### 2.3 Data: records, loading, export

| Change | Old | New | Why | Migrate | Codemod |
|---|---|---|---|---|---|
| Edge endpoint field names | The runtime defaults are `src` / `dst` (`graphty-element/src/config/DataConfig.ts:7-8`, consumed at `src/managers/DataManager.ts:405-406` and `:227`), while the JSDoc and every docs page say `source` / `target` | `source` / `target` are canonical. `src`/`dst` and `from`/`to` are accepted on input and never emitted; unresolved endpoints fail with `E_EDGE_ENDPOINTS_UNRESOLVED`; the resolved pair is reported on `ImportReport` and `graphty-data-loaded` | This is the package's most common first-afternoon failure and it is invisible: the JSDoc path yields nodes, no edges and no error. The edge endpoint section covers it in full | Spell edges `{source, target}`; read them back as `source`/`target` | YES for authored data; NO for code that reads `edge.src` |
| `Edge.id` | `` `${srcNodeId}:${dstNodeId}` `` (`graphty-element/src/Edge.ts:111`) | An element-assigned stable counter, surfaced as a string `EdgeId` | Two parallel edges cannot have two ids under the old scheme, which is one reason parallel edges are dropped today | Stop parsing an edge id for its endpoints; read `detail.source` / `detail.target` off the event, or `session.data.edge(id)` | NO |
| The default edge weight attribute | `"value"` (`graphty-element/src/algorithms/utils/graphConverter.ts:35`, `src/algorithms/utils/graphUtils.ts:101`, `src/algorithms/utils/communityUtils.ts:67`) | `"weight"` | It is the graph-io importers' default, and the converter's `"value"` default was never actually read | Rename the attribute in your data, or set `ImportPlan.roles.weight` | PARTIAL |
| Unresolved edge endpoints | An edge whose endpoints do not resolve is pushed onto `bufferedEdges` and retried silently (`src/managers/DataManager.ts:414-421`); if the nodes never arrive it stays buffered with no error | Unresolved endpoints are counted on `ImportReport.counts.unresolvedEndpoints` and reported as `ImportIssue`s; the policy is `ImportPlan.policies.unknownEndpoints: "report" \| "create" \| "drop"` | Silent buffering is indistinguishable from a successful load | Read `report.issues`; set the policy if you want the old silence | PARTIAL |
| Export | There is **no export path at all**: `graphty-element/src/data/` holds seven importers and zero exporters | `session.data.export(format, options)` and `exportStream()`, through the format registry, carrying a run manifest and `LossNote`s | Additive in the sense that nothing breaks, but it changes the format registry's contract (`FormatDescriptor` now declares `canImport` / `canExport`), so a consumer-registered `DataSource` must be re-declared as a format plugin. That part is breaking | Re-register custom formats as `{kind:"format", descriptor, importer?, exporter?}` | NO |
| The `DataSource` class and its registry | `DataSource.register/get/getRegisteredTypes`, `BaseDataSourceConfig`, `DataSourceChunk`, `ErrorAggregator`, `DataLoadingError`, `ErrorSummary` (`graphty-element/index.ts`, Data block; `src/data/DataSource.ts`), with seven registered sources `json`, `graphml`, `csv`, `gml`, `gexf`, `dot`, `pajek` (`src/data/index.ts:11-17`), **none of whose concrete classes is exported** | The `format` plugin kind on the one registry, with `Importer` / `Exporter` function shapes over streams | The current registry calls `new SourceClass(opts)` with an object (`src/data/DataSource.ts:290`) while the base constructor is `(errorLimit = 100, chunkSize = 1000)`, so every subclass must override the constructor. `DataSource` also has no `getClass`, unlike the other two registries | Rewrite a custom source as a `format` plugin | NO |
| Five ways to load data | Property assignment (additive), `addNode(s)`/`addEdge(s)` (awaitable), `setData()` (**fire-and-forget, returns `void`**, `src/Graph.ts:3646`), the `dataSource`+`dataSourceConfig` attribute pair (latched by `#dataSourceInitialized`), and `loadFromUrl`/`loadFromFile` (format-detecting) | Two: `element.src` / `element.data` declaratively, and `session.data.inspect()` + `session.data.import()` imperatively. Every imperative route is awaitable and returns an `ImportReport` | `setData` returning `void` means a consumer cannot learn that a load failed. The latched data-source guard is resettable only by `clearData()` | Replace all five with `load()` / `data.import()` | NO |
| `clearData` | `element.clearData()` (`src/graphty-element.ts:311`) reaches `graph.getDataManager().clear()` and resets the data-source guard; `Graph` itself has **no** `clear()` | `session.data.apply({kind:"clear"})`, which returns an inverse | The app already learned this one the hard way: `graphty/src/components/Graphty.tsx` uses `clearData?.()` rather than `dataManager.clear()` because only the element can reach the per-load guard | `session.data.apply({kind:"clear"})` | YES |
| The missing edge verbs | There is **no** `removeEdges`, no `updateEdges`, no `getEdge(id)`, no `getEdges()` on `Graph`, although `DataManager` has `getEdge` :465, `getEdgeBetween` :475, `removeEdge` :484, `removeNode` :350, `clear` :649 -- reachable only through the manager escape hatch | `session.data.edge(id)`, `edgeIds(scope)`, `apply({kind:"remove-edges"})` | Listed here because removing the manager escape hatch breaks code that reached these through `getDataManager()`; the break arrives with the hatch, not with the method | Use the named `DataApi` verbs | PARTIAL |

### 2.4 Runs, results and algorithms

| Change | Old | New | Why | Migrate | Codemod |
|---|---|---|---|---|---|
| `runAlgorithm` returns nothing useful | `Graph.runAlgorithm(namespace: string, type: string, options?): Promise<void>` (`src/Graph.ts:1207`), forwarded at `src/graphty-element.ts:1414`. No `AbortSignal`, no progress, no cancellation, and **the result is unreachable from the call** | `session.runs.start(algorithm, params?, options?): Run`, where `Run extends PromiseLike<RunResult>` and carries `id`, `label`, `status`, `progress`, `cancel()`, `rerun()`, `record`, `caveats`, `partial`, `stale` | A long run on a large graph needs progress, cancellation and a cost gate before the click. Reading a result today means walking `node.algorithmResults` or reaching `graph.getDataManager().graphResults` through an escape hatch | `const run = el.run("degree"); const result = await run;` -- **bind the `Run`, then await it**. `await el.run(...)` gives you the `RunResult`, which is a different object: `encode({run})` and every other helper takes the `Run` (it also accepts a `RunResult` or a bare `RunId`) | NO |
| The two-part algorithm address | `(namespace, type)` with the registry key `` `${namespace}:${type}` `` (`src/algorithms/Algorithm.ts:282`), all 23 built-ins in namespace `graphty` (`src/algorithms/index.ts:36-72`) | One `AlgorithmKey` string: `"degree"`, `"betweenness"`, and `"vendor:name"` for a plugin | A namespace that is the same constant for every built-in is a parameter with one value | `runAlgorithm("graphty","degree")` -> `run("degree")` | YES |
| Where results land | `node.algorithmResults[namespace][type][resultName]` (`src/algorithms/Algorithm.ts:219-246`), graph-level at `graph.getDataManager().graphResults[...]` (`:264-270`); selectors and `calculatedStyle.inputs` address the same path | `results.<runId>.<field>`, with `session.results.path(run, field)` to build the string | The old path carries no parameters, so MCL at granularity 2.5 and MCL at 3.0 write to the same path and a style layer cannot say which run it draws. This is the defect the whole run model exists to fix | Rewrite every selector and every stored template. Not mechanical: a run id must be chosen | NO |
| Metrics with no graph-level summary | Betweenness and closeness publish **no** graph-level result, so a maximum cannot be read off the data manager for them (`graphty/src/components/shell/analysis/nodeMetrics.ts:52-58` documents the workaround) | Every node-metric and edge-metric result publishes `min`, `max`, `median`, `mean`, `measured`, `normalisation`, `tiedAtMin` | Uniform fields are a lie unless every algorithm fills them | Delete your own max-scan | YES |
| Per-algorithm result field names | `degreePct`, `rankPct`, `scorePct`, `isInPath`, `communityId` and so on, each algorithm with its own vocabulary | Uniform per-shape field names: `value`/`rank`/`percentile` for metrics, `group`/`groupSize` for communities, `onPath`/`order` for paths, `in` for sets | A result path becomes guessable without opening the catalogue. But every existing selector, every `calculatedStyle.input` and every result read names the old field | Rewrite field names alongside the result-path change | NO |
| The 23 registered algorithm keys | Each a `static type` on its class, registered at `graphty-element/src/algorithms/index.ts:36-72`: `degree`, `dijkstra` (`DijkstraAlgorithm.ts:57`), `pagerank`, `louvain`, `betweenness`, `closeness`, `eigenvector`, `hits` (`HITSAlgorithm.ts:88`), `katz`, `girvan-newman`, `leiden`, `label-propagation`, `bellman-ford` (`BellmanFordAlgorithm.ts:46`), `floyd-warshall` (`FloydWarshallAlgorithm.ts:13`), `bfs`, `dfs`, `connected-components` (`ConnectedComponentsAlgorithm.ts:12`), `scc` (`StronglyConnectedComponentsAlgorithm.ts:12`), `kruskal`, `prim`, `bipartite-matching`, `max-flow`, `min-cut` | The 2.0 `KnownAlgorithm` set. Eighteen keys are unchanged (their result **field names** still change). **Five change**: `dijkstra` -> `shortest-path`; `bellman-ford` -> `shortest-path` with `{method:"bellman-ford"}`; `floyd-warshall` -> `shortest-path` with `{method:"floyd-warshall", allPairs:true}`; `connected-components` -> `components`; `scc` -> `components` with `{strength:"strong"}`. Four keys in the 2.0 set are **not implemented today** and are implementation work rather than API work: `all-paths` and `clustering-coefficient` are new algorithms, and `k-core` and `link-prediction` exist in `@graphty/algorithms` but are not registered in the element | Naming the shortest-path engine in the key freezes the engine into the API, exactly as naming the layout engine does: which of the three runs is a weight-sign decision, not a consumer decision. `connected-components` versus `scc` is one algorithm with a directedness flag. No capability is lost; three keys become a parameter on two keys, and the parameter is reported in `caveats.method` | Rename the key; move the engine choice into `params.method` where you relied on a specific one. A stored recipe or template naming an old key must be rewritten -- there is no alias, because an alias would reintroduce the two-spellings defect the edge endpoint section exists to end | PARTIAL |
| Zod schemas across the package boundary | Option schemas cross as Zod objects: `Algorithm.getZodOptionsSchema()` (`src/algorithms/Algorithm.ts`), `LayoutEngine.getZodOptionsSchema()`. The element imports `zod/v4` while depending on `zod ^3.25.28` (`graphty-element/package.json` dependencies) | Plain-JSON `OptionDescriptor[]` on every catalogue entry: `{name, plainName, type, default, min, max, step, values, group, advanced, internal, description}` | Shipping Zod across a boundary makes the consumer's Zod version part of the element's API. The one consumer reads Zod's private `_def` in two modules to recover type, default, min and max (`graphty/src/utils/zodSchemaParser.ts:22-28`, and again in `graphty/src/components/options/OptionsForm.tsx:65-115` with a v3/v4 branch) | Read `catalog.algorithms()[i].options`; delete the Zod introspection | NO |
| Two parallel option systems | On `Algorithm`, both shipped: the deprecated `static optionsSchema: OptionsSchema` and `static zodOptionsSchema?: ZodOptionsSchema`, with `resolveOptions` (`src/algorithms/Algorithm.ts:162-172`) using **the deprecated one** -- so an algorithm that defines only `zodOptionsSchema` resolves to `{}` | One `options: OptionDescriptor[]` on the descriptor | Two option systems where the live one is the deprecated one is a trap for every plugin author | Declare options once, in `defineAlgorithm` | NO |
| The algorithm plugin contract | `abstract run(g: Graph): Promise<void>` on `Algorithm` (`src/algorithms/Algorithm.ts`), with results written by side effect through `addNodeResult` / `addEdgeResult` / `addGraphResult`. `AlgorithmStatics` is declared at `:24` but is **not** in the barrel; `toAlgorithmGraph` is not exported either | `defineAlgorithm({... , run(ctx: AlgorithmContext): Promise<AlgorithmOutput>})` over a `ReadonlyGraphData` (id arrays, CSR adjacency, attribute columns), returning results rather than writing them | The current contract forces a plugin author onto the 4,147-line `Graph` and onto `Node`/`Edge` objects that carry Babylon meshes. Returning results is what makes a run pure, cancellable and structured-cloneable, which is the difference between "we can move this to a worker later" and "we cannot" | Rewrite custom algorithms against `AlgorithmContext` | NO |
| Algorithm discovery | `Algorithm` is the single algorithm symbol in the barrel (`graphty-element/index.ts`, Algorithms block). Discovery is `Algorithm.getRegisteredAlgorithms(ns?)` / `getRegisteredTypes()` -- bare strings. `getAllAlgorithmInfo()` (`src/algorithms/index.ts:108`) and `getAllAlgorithmSchemas()` (`:161`) are **not exported**, and `AlgorithmInfo` (`:80`) is not even `export`ed from its own module. `getAllAlgorithmInfo` also does not read the registry: it iterates a hardcoded 23-class array at `:112-136`, so a consumer-registered algorithm is invisible to it | `session.catalog.algorithms(): AlgorithmDescriptor[]`, registry-backed, plus `catalog.metrics()` including not-yet-run metrics, and `catalog.applicable()` | The app built its own 279-line catalogue (`graphty/src/components/algorithmCatalog.ts`) because there was no metadata on the registry | Read `catalog.algorithms()` | NO |

### 2.5 Selection, scope and visibility

| Change | Old | New | Why | Migrate | Codemod |
|---|---|---|---|---|---|
| One selected node | `SelectionManager` holds `private selectedNode: Node \| null = null` (`src/managers/SelectionManager.ts:46`): one node, nodes only. The public surface is `selectNode(id): boolean`, `deselectNode(): void`, `getSelectedNode(): Node \| null`, `isNodeSelected(id): boolean` | Two sets (nodes and edges) with five set verbs (`replace`, `add`, `remove`, `toggle`, `intersect`), ten `SelectionTarget` shapes, a cap, `promote(name)` and `statistics()`; one selection per session, shared by every view | Two-set selection with set algebra is needed by almost every real reading task, and the set must be shared: a selection made in XR and a selection made in a table have to be the same set | `selection.apply({nodes:[id]}, "replace")`; read `selection.nodes` (an array, not a `Node`) | NO |
| Selection hands out `Node` objects | `getSelectedNode(): Node \| null` returns, and `selectNode` accepts, live objects | Ids in, ids out (`readonly nodes: readonly NodeId[]`) | A `Node` carries a Babylon mesh; handing one to a consumer is the same defect as `getScene()` | `session.data.node(id)` for the record, `element.get(id)` for an `ElementView` | PARTIAL |
| No filtering or visibility | There is no visibility or filter concept in the element at all; `grep` finds no filter API | `session.visibility` with one id-set mask, ten `Filter` kinds, a `TimeWindow` with the same mask, playback, and `showContext` | Additive as a feature, but breaking in one respect: `"visible"` becomes the **default scope** for every run, layout and export, so a run's measured set changes the moment a filter is on | Pass `{scope: "graph"}` where you want the old whole-graph behaviour | NO |

### 2.6 Style layers

| Change | Old | New | Why | Migrate | Codemod |
|---|---|---|---|---|---|
| Layers addressed by array index | `StyleManager.removeLayerByIndex(index)` :168, `updateLayerByIndex(index, layer)` :183, `insertLayer(position, layer)` :145, `reorderLayers(from, to)` :198, `getLayers()` :211 (`graphty-element/src/managers/StyleManager.ts`), mirrored on `Styles` at `src/Styles.ts:140,161,175,189` | `LayerId` addressing: `styles.get(id)`, `update(id, patch)`, `remove(id)`, `move(id, beforeId)`, `add(spec, at?)` | Index addressing forced the one consumer to write an index-reconciliation module (`graphty/src/utils/layerConversion.ts`, 84 lines) and to delete highest-index-first; one off-by-one took the element's own `default` layer with it and the next load died in mesh building | Keep the `LayerId` returned by `add()` / `encode()` | NO |
| Adding a layer does not apply it | `Styles.addLayer(layer)` is `this.#layers.push(layer); // TODO: recalculate` (`src/Styles.ts:130-133`). The compensating `style-changed` handler (`src/Graph.ts:382-400`) diverges from the correct path (`src/managers/DataManager.ts:85-101`) three ways: `getStyleForNode(n.data)` without `algorithmResults`, so an `algorithmResults.*` selector cannot match; `loadCalculatedValues(...)` without the `runImmediately` argument, so calculated values are registered and never run; and no `n.update()`, so a value that did run is never merged into a style id | Every style mutation validates and repaints, or rejects; the write verbs return a `Run` | The documented public door for adding a layer does not apply the layer. That defect is the entire reason `graphty/src/components/shell/analysis/elementBridge.ts` exists | Delete every forced repaint; await the write verbs; expect rejections where a malformed layer used to be accepted | PARTIAL |
| No validation on layer writes | `StyleManager.addLayer` / `insertLayer` / `updateLayerByIndex` do **no validation** whatsoever (`src/Styles.ts:130,140,175` -- no `StyleLayer.parse`), so a malformed layer is accepted in silence and simply never matches | `styles.add()` rejects with `E_BAD_LAYER` carrying the offending path, `E_BAD_SELECTOR` with a character offset, `E_SELECTOR_EMPTY` for an empty `where`, and `E_UNKNOWN_RUN` / `E_UNKNOWN_ATTRIBUTE` for a path nothing in the session answers; `styles.validate(spec)` answers the same synchronously | Silent acceptance of a wrong shape is the defect class that also produced the buffered-edge silence and the dropped nested encoding below | Handle the throw | NO |
| `calculatedStyle` expressions | `calculatedStyle: {inputs, output, expr}` (`src/config/StyleTemplate.ts:12-16`), where `expr` is a **JavaScript source string** evaluated at `src/CalculatedValue.ts:77-87` with `StyleHelpers` in scope and inputs as `arguments[0..n]` | `Layer.encode: Encoding` -- declarative `{by, scale, palette, domain, clamp, range, map, missing, ...}` bindings per `Channel`. Anything beyond the closed grammar is a **registered scale** (`use({kind:"scale", name, map})`) | Three reasons, in order of severity: (1) a third party under `script-src` without `unsafe-eval` loses every calculated style, and therefore every algorithm's suggested styles, in silence; (2) it crashes -- an unmeasured element reaches the palette lookup as `undefined`, the throw escapes, and the repaint stops half way through (the behaviour section traces it); (3) a string of JavaScript cannot be diffed, validated, legend-derived or retargeted at another dataset | Rewrite every `calculatedStyle` as an `Encoding`, or as a registered scale plugin | NO |
| `StyleHelpers` as a public namespace | The value export (`graphty-element/index.ts`) used inside `expr`: `color.sequential.*`, `color.categorical.*`, `color.diverging.*`, `color.binary.*`, `size.*`, `opacity.*`, `label.*`, `edgeWidth.*`, `combined.*` (`src/config/StyleHelpers.ts`, 254 lines) | The palettes and scales become catalogue data (`PaletteDescriptor`, `ScaleDescriptor`) reachable from `./schema` and `./catalog`; the helper namespace as a callable API is REMOVED with the evaluator | `StyleHelpers` exists to be called from inside an `expr` string. With no `expr`, its reason to be public goes with it. Root `CLAUDE.md` already warns that `blueHighlight(false)` returns `#CCCCCC`, turning "not in my result" into a paint instruction | Use `Binding.palette` / `Binding.scale`; read palette colours from `./schema` | NO |
| One `StyleTemplate` document | One Zod document holding appearance (`layers`, `graph`), column roles (`data.knownFields`), run-on-load (`data.algorithms`), view mode (`graph.viewMode`) and an inline skybox image (`GraphBackground.data` accepts a `data:image/png;base64,` string, `src/config/common.ts:60-68`); shipped as `StyleSchema`, `StyleSchemaV1`, `StyleLayerType`, `StyleTemplate` from the barrel | Four independently versioned documents: `StyleDocument` (layers and encodings), `DataPlan` (column roles and policies), `ViewPreset` (mode, camera, presets), `Recipe` (a batch command) | Importing "a style" can silently rewrite column roles, spend compute, change the view mode and ship a multi-megabyte image | Split your saved templates. A one-time converter is feasible: see the codemod inventory | PARTIAL |
| The documented partial `styleTemplate` | `StyleTemplateV1` is a `z.strictObject` requiring `graphtyTemplate: z.literal(true)` and `majorVersion: z.literal("1")` (`src/config/StyleTemplate.ts:57-65`), so the `styleTemplate` property's documented "partial configuration object to override defaults" (`src/graphty-element.ts:559-572`) **cannot parse** | `StyleDocument { version: 1; layers; palettes? }` | A documented example that throws is a break the moment it is fixed: code written around the throw changes behaviour | None; the documented call never worked | n/a |
| Units and spellings | They disagree between the element and every UI that wraps it: opacity is `0..1` internally versus `0..100` in wrappers; node colour lives at `texture.color`, not `color`; `effect` singular with **presence** as the enabling versus `effects`; two shape names absent from `NodeShapes` and two spelled differently (`graphty/src/utils/styleBridge.ts` header, 918 lines, documents all four) | One spelling, settled in the element: opacity `0..1` everywhere, one shape spelling, `effect` singular | Half of `styleBridge.ts` exists to translate; picking the element's own representation means the translation is deleted rather than moved | Multiply by 100 in one place if your UI wants percent | PARTIAL |
| Unscoped suggested layers | Ten suggested-layer halves across seven algorithm files use `selector: ""`, which matches every node and every edge (`src/Styles.ts:452` `node.selector.length === 0`; `src/Styles.ts:323` and `:355` `edge?.selector === ""`): `DegreeAlgorithm.ts:16`, `BetweennessCentralityAlgorithm.ts:26`, `ClosenessCentralityAlgorithm.ts:26`, `EigenvectorCentralityAlgorithm.ts:142`, `KatzCentralityAlgorithm.ts:179`, `HITSAlgorithm.ts:143` and `:160`, `PageRankAlgorithm.ts:165`, `MaxFlowAlgorithm.ts:85` and `:100` | Suggested layers are **derived** from the algorithm's declared shape and fields, not authored per algorithm; `Selector` is a tagged union with no empty string; `missing` defaults to `"skip"`; `E_UNSCOPED_RUN_ENCODING` rejects a universal selector over run values | Twenty other suggested layers in the same directory are correctly scoped, so the pattern is already the majority and these seven are the outliers. The rule is in root `CLAUDE.md` and is enforced by nothing | **The pictures change.** A consumer who accepted the old suggested styles sees a different graph | NO |
| Suggested layers that write node size | `PageRankAlgorithm.ts:165` writes `style.shape.size` via `StyleHelpers.size.linear(arguments[0], 1, 5)`; `HITSAlgorithm.ts:160` does the same with `(1, 4)` | Neither writes a size channel by default | The channel collides with the element's own tuned node defaults, which is the app's stated second reason for refusing the whole mechanism (`graphty/src/components/shell/analysis/nodeMetrics.ts:21-28`) | Ask for it explicitly with `encode({run, channel:"node.size"})` | YES |
| Element layers identified by name | The element's own layers are identified **by name**: `"default"` (unshifted by the `Styles` constructor at `src/Styles.ts:54-67`) and `"selection"`; the app hardcodes both (`graphty/src/components/shell/defaults/nodeMetricStyle.ts:347,358`) and its own comment admits a person who renames their layer to "default" loses the suppression | `layer.source.by === "element"` and `layer.locked: true`; removing one is `E_PROTECTED` | Identification by a user-editable string is a documented footgun | Test `layer.locked` / `layer.source.by` | PARTIAL |
| The loose metadata bag | `StyleLayerMetadata` is `z.object({name: z.string()}).loose()` (`src/config/StyleTemplate.ts`), and the app writes private bookkeeping (`handBound`, `graphty/src/components/shell/defaults/nodeMetricStyle.ts:411`) into it, surviving only because of the looseness. `#applyStyleLayers` (`src/Graph.ts:1305-1313`) also stamps `metadata.algorithmSource`, which is not in the declared metadata type | `layer.userData?: Record<string, unknown>` -- a documented consumer bag that round-trips untouched; `layer.source` is the typed provenance | Either document the bag or give it a field. Silence is the one option that must end | Move consumer keys from `metadata` to `userData` | YES |
| A nested `calculatedStyle` is dropped | `Styles.getCalculatedStylesForNode` reads only the **sibling** `calculatedStyle`, so one nested inside `style` is dropped with no error -- which is exactly what `graphty/src/components/RunAlgorithmModal.tsx:236-247` does, silently discarding the calculated half of every suggested layer | The shape no longer exists: a layer has `set` (literals) and `encode` (bindings), with no nesting to get wrong; an unknown key is `E_BAD_LAYER` | A silently dropped encoding has nothing to debug from | Nothing to migrate; the shape is gone | n/a |
| `Styles.config` is a live alias | `Styles.config` is `readonly` at the field level (`src/Styles.ts:31`) but deeply mutable, and `Styles.#layers` **aliases** `config.layers` (`src/Styles.ts:33`), so `styles.config.layers` and `styles.layers` are the same array. The element itself deep-writes into it: `setDeep(this.#graph.styles.config, "data.knownFields.nodeIdPath", value)` (`src/graphty-element.ts:347`, and :371, :403) | There is no publicly reachable live config object. `session.config` is a typed document with `set` / `reset` / `toDocument` / `applyDocument`, and `styles.list()` returns `readonly Layer[]` | A mutable alias of internal state reachable from two names is not a contract | Use `config.set(patch)` and the `styles` verbs | NO |

### 2.7 Layout

| Change | Old | New | Why | Migrate | Codemod |
|---|---|---|---|---|---|
| Layout ids are engine names | The 16 registered types (`src/layout/index.ts:19-34`) with their `static type` strings: `d3` (`D3GraphLayoutEngine.ts:118`), `ngraph` (`NGraphLayoutEngine.ts:86`), `spiral`, `circular`, `shell`, `random`, `spring`, `planar`, `kamada-kawai`, `forceatlas2` (`ForceAtlas2LayoutEngine.ts:123`), `arf`, `spectral`, `bfs`, `bipartite`, `multipartite`, `fixed` | Semantic names: `force`, `force-2d`, `circular`, `radial`, `hierarchical`, `grid`, `shell`, `spectral`, `bipartite`, `layers`, `fixed`, `random`. Which engine implements `force` is catalogue data, carried on `LayoutDescriptor.engine` | Naming the implementation freezes it into the API: swapping ngraph for GPU ForceAtlas2 would be a rename a consumer can see. Under semantic names it is a catalogue edit and a minor | Rename layout values. The mapping is not one-to-one -- see the note below | PARTIAL |
| An unknown layout name fails silently | `LayoutEngine.get(type)` returns `null` for an unknown type (`src/layout/LayoutEngine.ts`), so `setLayout("nope")` fails somewhere inside the operation queue rather than rejecting | `E_UNKNOWN_LAYOUT` with `details.available` | The shipped JSDoc for the `layout` property (`src/graphty-element.ts:414-420`) lists `d3-force`, `grid` and `hierarchical`, **none of which is registered**, and omits twelve that are (seven names are listed; four of them -- `ngraph`, `circular`, `random`, `fixed` -- are among the sixteen registered at `src/layout/index.ts:19-34`). A consumer following the docs gets silence | Handle the throw; read `catalog.layouts()` for the real list | PARTIAL |
| Three places to name a layout | `graph.layout` (`GraphStyle`, no default), `graph.layoutOptions`, and `behavior.layout.type` (`GraphBehaviorOpts`, default `"ngraph"`, `src/config/GraphBehavior.ts:20-26`), plus the `layout` element property. Only `Graph.setLayout()` actually runs | One setter: `session.layout.set(id, params, options)`, mirrored by the `layout` attribute | Three sources of truth for one setting | Set it once | PARTIAL |
| The `LayoutEngine` contract | It is expressed entirely in terms of the element's internal `Node` and `Edge` classes: `addNode(n: Node)`, `addEdge(e: Edge)`, `getNodePosition(n: Node)`, `setNodePosition(n, p)`, `getEdgePosition(e)`, `pin(n)`, `unpin(n)`, `get nodes(): Iterable<Node>` (`src/layout/LayoutEngine.ts`). `LayoutEngineStatics` (`:25-31`) is declared **without `export`**, and none of the 16 concrete classes is exported | `defineLayout({descriptor, create: LayoutFactory})` where the factory takes an `AlgorithmContext & {positions: Float32Array}` and returns `{step, settled, stop}` | `Node` and `Edge` carry Babylon meshes, so "map ids to coordinates" currently requires the 3D engine. The extension point is unusable as shipped | Rewrite custom layouts against `LayoutFactory` | NO |
| `SimpleLayoutEngine` | `src/layout/LayoutEngine.ts:194-344`, with public fields `stale`, `positions: Record<string\|number, number[]>`, `scalingFactor` and `abstract doLayout()`; plus `SimpleLayoutConfig`, `SimpleLayoutConfigType`, `SimpleLayoutOpts`, `Position`, `EdgePosition` exported from the barrel | REMOVED; `Position` is redefined once as `{x,y,z}` rather than `{x, y, z?}` | Two `Position` shapes (`src/layout/LayoutEngine.ts` has `z?: number`) and two `NodeIdType` declarations (`src/Node.ts:16` and `src/config/GraphBehavior.ts:29`) cannot both be the public one | Use the `LayoutFactory` contract and the single `Position` | PARTIAL |

**On the layout rename.** It is `PARTIAL`, not `YES`, because the sets are not congruent. Five
registered engines have no semantic name in the 2.0 list (`spiral`, `planar`, `arf`,
`multipartite`, `kamada-kawai`) and three semantic names (`radial`, `hierarchical`, `grid`)
have no registered engine today -- ego-radial and Sugiyama are 2.0 implementation work, and
`grid` is the third. A codemod can rewrite `ngraph`/`d3`/`forceatlas2`/`spring` -> `force`,
`bfs` -> `layers`, and pass `circular`/`shell`/`spectral`/`bipartite`/`fixed`/`random` through,
but it must flag any name it cannot map rather than guess. The five names listed here and the
guard on the layout codemod are the same five names.

### 2.8 Events

| Change | Old | New | Why | Migrate | Codemod |
|---|---|---|---|---|---|
| Blanket event forwarding | The element blanket-forwards **every** graph-observable event to the DOM under its raw, unprefixed internal name, with `detail` set to the whole internal event object (`src/graphty-element.ts:96-104`). That includes ~50 internal names such as `layout-changed`, `stats-update` (once per frame, `src/managers/StatsManager.ts:305`), `operation-progress` and `input:undo`, and `detail.graph` hands a `Graph` -- and therefore the Babylon engine -- to any listener on `document` | Twenty-two `graphty-`prefixed DOM events with spelled-out, serialisable `detail`s, plus thirteen session events; all declared in `custom-elements.json` and in `GraphtyEventMap` | Unprefixed event names on `document` collide with anything; a per-frame `CustomEvent` allocation bubbling to `document` is a cost nobody asked for; and `detail.graph` is the `element.graph` escape hatch through a side door | Rename every listener; read the new `detail` shapes | PARTIAL |
| Four documented events throw on subscribe | `EventManager.addListener`'s switch has no case for them and ends in `throw new TypeError` (`src/managers/EventManager.ts:450`): `node-click` (emitted at `src/NodeBehavior.ts:425`), `node-hover` (`:379`), `node-drag-start` (`:120`), `node-drag-end` (`:206`). Twenty more emitted names throw the same way | `graphty-node-click`, `graphty-node-hover`, `graphty-node-drag-start`, `graphty-node-drag-end` are emitted and subscribable, with the contract sentence "every declared event is emitted, and every emitted event is subscribable" enforced by a CI test over the three lists | The shipped docs (`graphty-element/docs/guide/events.md:19-22, :39-58, :148-160`) and `Graph.ts:1698`'s own JSDoc show a call that throws | Subscribe to the prefixed name | YES |
| `edge-click` never fires | It is declared (`src/events.ts:235`) and documented (`docs/guide/events.md:20`) and **never emitted**; the entire 11-member AI event union is dead too, because `AiManager.init()` constructs `new AiController({...})` without the optional `emitEvent` (`src/ai/AiManager.ts:137-142`) | `graphty-edge-click` is emitted; the AI events move to `./ai` and are emitted there | A declared event that never fires is a documented lie | Subscribe to `graphty-edge-click` | YES |
| No way to unsubscribe | `Graph.on(type, cb): void` discards the `symbol` that `EventManager.addListener` returns (`src/Graph.ts:1518-1520`), and `Graph` has **no** `off`, `removeListener`, `once` or `waitFor` -- while the shipped docs advertise `graph.off(...)` (`docs/guide/events.md:120-127`), which does not exist | `on(type, handler, options?)` returns its own unsubscribe function; `ListenOptions` adds `where`, `once` and `signal` | Through the documented API a listener can never be removed today | `const off = el.on(...); off()` | PARTIAL |
| The exported event types | `CameraStateChangedEvent`, `DataLoadingCompleteEvent`, `DataLoadingErrorEvent`, `DataLoadingErrorSummaryEvent`, `DataLoadingProgressEvent`, `EdgeAddEvent`, `EdgeClickEvent`, `EdgeEvent`, `EdgeEventType`, `EdgeGenericEvent`, `EventCallbackType`, `EventType`, `GraphDataAddedEvent`, `GraphDataLoadedEvent`, `GraphErrorEvent`, `GraphEvent`, `GraphEventType`, `GraphGenericEvent`, `GraphLayoutInitializedEvent`, `GraphSettledEvent`, `NodeAddEvent`, `NodeClickEvent`, `NodeDragEndEvent`, `NodeDragStartEvent`, `NodeEvent`, `NodeEventType`, `NodeGenericEvent` (`graphty-element/index.ts`, Events block) -- while `SelectionChangedEvent` (`src/events.ts:146`), the one event the app actually subscribes to, and all 11 AI event interfaces (`src/events.ts:242-328`) are **not** exported | `GraphtyEventMap` plus the per-event `detail` interfaces | `EventCallbackType` is un-discriminated: a handler for `node-click` receives the union of every event type and must narrow by hand. `GraphGenericEvent` is an index-signature escape hatch with a hardcoded 17-member `type` union plus `[key: string]: unknown` | Use `GraphtyEventMap` and the named detail types | PARTIAL |
| `style-changed` carries no payload | It is a bare notification (`src/managers/StyleManager.ts:248-250`, whose comment says "consumers should query getLayers() for current state"), which is why the app re-reads `element.graph.getLayers()` on every fire (`graphty/src/components/Graphty.tsx:514`, `:527`) | `styles:changed` carries `{layers, changed}` | An event that forces a re-read is a polling loop with extra steps | Read `detail.layers` | PARTIAL |
| The custom-elements manifest | `dist/custom-elements.json` records `events: [{ type: { text: "CustomEvent" } }]` -- **one nameless entry** -- 129 members of which 34 are `field`s, **including 18 `#private` fields** (19 `#`-prefixed members in all; counted from `graphty-element/dist/custom-elements.json` on 2026-09-19), no slots, no CSS parts, and package.json has no `customElements` field so no tool can find the file | A complete manifest with every attribute and default, every property, every method, all twenty-two DOM events with their `detail` types, both slots, and no `#private` members; `customElements` declared in package.json | Tooling (VS Code, JetBrains, Storybook) reads the manifest or nothing | None; tooling improves | n/a |

### 2.9 Extension and registries

| Change | Old | New | Why | Migrate | Codemod |
|---|---|---|---|---|---|
| Three module-global registries | Three singleton `Map`s (`src/algorithms/Algorithm.ts:43`, `src/layout/LayoutEngine.ts:19`, `src/data/DataSource.ts:17`), each reading `type`/`namespace` off the class with an `any` cast, so a class missing its statics registers under `"undefined"` / `"undefined:undefined"`. None has `unregister`, `has`, or a duplicate-key warning: `map.set` silently overwrites. Two elements on a page share one registry | One `Registry` with `use`, `remove`, `has`, `list`, `enable`, `load(url)`, instance-scopable via `createRegistry()`; double registration is defined (identical is a no-op, different warns once and wins, `{strict:true}` throws `E_DUPLICATE_PLUGIN`) | Silent overwrite plus HMR is a debugging hole; `"undefined:undefined"` is a registration that appears to have worked | `use(defineAlgorithm({...}))` | NO |
| Registry names that do not exist | Root `CLAUDE.md`'s "Plugin System" section advertises `LayoutRegistry.register(...)`, `DataSourceRegistry.register(...)` and `AlgorithmRegistry.register(...)` -- **none of those three names exists** in the package | `use()` and `createRegistry()` from `./extend` | Documented names that do not exist are a break the moment they are corrected | n/a | n/a |
| Ten missing extension points | There is no style-helper registry, no node-shape/mesh registry (shapes are a static block in `NodeMesh`), no camera-controller registry, no renderer registry; a consumer cannot add a node shape, an arrow type, a line pattern or a style helper | Ten plugin kinds: `algorithm`, `layout`, `format`, `scale`, `palette`, `accelerator`, `command`, `identifier-mapper`, `enrichment`, `data-source` | Additive, except that it changes `NodeShapes` from a closed `z.enum` (25 members, `src/config/NodeStyle.ts:50-76`) into an extensible vocabulary, so exhaustive switches over it stop being exhaustive | Stop assuming the shape list is closed | NO |

### 2.10 Input, camera and view

| Change | Old | New | Why | Migrate | Codemod |
|---|---|---|---|---|---|
| Keyboard bindings and the focus grab | The element binds W/A/S/D, the four arrow keys, `+`/`=`/`-`/`_` and Q/E to camera pan, zoom and rotate (`src/cameras/TwoDInputController.ts:246-277`), and **grabs canvas focus**: `this.canvas.setAttribute("tabindex","0")` (`:60`), `this.cam.canvas.focus()` (`:38`), and `this.canvas.focus()` at attach time in the orbit controller (`src/cameras/OrbitInputController.ts:121`, and `:30`) | Both removed. The element emits the events; keyboard navigation bindings stay with the consumer | A component that steals focus on attach and claims W/A/S/D takes them from the host page's own shortcuts and from a form field next to it | Bind your own keys on your own element and call `camera.moveTo` / `camera.fit` | NO |
| 17 mutable public fields on `Graph` | `src/Graph.ts:88-133`, including raw Babylon objects `engine: WebGPUEngine \| Engine` :94, `scene: Scene` :95, `canvas: HTMLCanvasElement` :93, `camera: CameraManager` :96, plus `initialized` :108 (settable to `false`, which would make `init()` re-run), `needRays` :102, `pinOnDrag` :104, `xrHelper` :101, `operationQueue` :133, `fetchNodes`/`fetchEdges` :106-107 | All internal. `pinOnDrag` becomes `config.pinOnDrag`; `fetchNodes`/`fetchEdges` become the `data-source` plugin kind's hooks | Writable public fields that control lifecycle are not a contract | See the element member table above | NO |

### 2.11 Errors and types

| Change | Old | New | Why | Migrate | Codemod |
|---|---|---|---|---|---|
| Ad hoc error types | `ScreenshotError` / `ScreenshotErrorCode` and `AnimationCancelledError` are the only exported error types (`graphty-element/index.ts`, Screenshot and Video blocks); everything else throws bare `Error` / `TypeError` (for example `src/managers/EventManager.ts:450`) | One `GraphtyError` carrying `code`, `source`, `recoverable`, `details`, `target`, `cause`, with a closed `GraphtyErrorCode` union. Codes cross the boundary; classes do not. Cancellation is a `DOMException` named `AbortError`, never a code | A consumer's error UI must switch on something stable, and a sibling's error class (graph-io's `ImportError`, the GPU peer's `WebGpuGraphError`) must not become a type dependency of every consumer | Switch on `err.code`; catch `AbortError` by name | NO |
| No readiness signal | There is none, so the one consumer duck-types it: `REQUIRED_GRAPH_METHODS = ["runAlgorithm","getNodes","getDataManager","getStyleManager"]` and a `typeof === "function"` probe (`graphty/src/components/shell/analysis/elementBridge.ts:76`, `:108`) | `element.ready: Promise<void>`, and **there is no `E_NOT_READY`**: every method is safe to call before the element is ready; work queues and resolves when it runs | Readiness being unobservable is the reason the probe exists | `await element.ready`; delete the probe | YES |
| `NodeIdType` declared twice | `src/Node.ts:16` and `src/config/GraphBehavior.ts:29`, exported from `./src/Node` while `src/config/index.ts:6` re-exports the other one | `NodeId` is declared once | A public API cannot have two sources of truth for its id type | `import type { NodeId }` | YES |
| Core classes exported | `Node`, `Edge`, `Graph`, `Styles` are exported as **classes** from the barrel (`graphty-element/index.ts`, Core block) | REMOVED. `NodeRecord` / `EdgeRecord` are plain data; `ElementView` is the read handle; `Layer` is the styling noun | `@graphty/algorithms` and `@graphty/layout` export incompatible `Node`/`Edge` pairs (`algorithms/src/types/index.ts:9,18` versus `layout/src/types/graph.ts:5,7`) and the element exports classes with the same names. Three incompatible pairs cannot coexist in one barrel | Use the record types | NO |

---

## 3. Behaviour changes that are not signature changes

These compile, type-check and run. They are the rows most likely to be missed in review, so
every one is verified against the repository here.

All fifteen ship as **registered breaking changes in 2.0**, each named in the changelog, rather
than arriving unannounced in a minor. They are observable through public events and public
results: a consumer's edge count, degree distribution and layout all move. Letting changes of
that size arrive as "a minor" is how a package earns a second, unplanned major.

| Behaviour today (verified) | Behaviour in 2.0 | Who notices |
|---|---|---|
| **`Edge.id` is `` `${src}:${dst}` ``** -- `graphty-element/src/Edge.ts:111`, `this.id = \`${srcNodeId}:${dstNodeId}\``. The id also keys `DataManager.edges` (`src/managers/DataManager.ts:316`, `:435`) | An element-assigned stable counter, as a string | Anyone who split an edge id on `:` to recover endpoints, or constructed an id to look one up. Note the old scheme is already ambiguous for ids containing a colon |
| **`element.nodeData = X` is additive, not replacing**, although the JSDoc says "Setting this property replaces all existing nodes" (`src/graphty-element.ts:161`, and `:199` for edges). The setter calls `graph.addNodes()`, and `DataManager.addNodes` skips ids already in `nodeCache` (`src/managers/DataManager.ts:229-231`). There is no replace path through any property | `element.data = {nodes, edges}` **replaces** | Anyone who set the property twice expecting to accumulate. The JSDoc has been wrong the whole time, so code written from the docs already assumed replace |
| **Parallel edges are silently dropped.** `if (this.edgeCache.get(srcNodeId, dstNodeId)) { continue; }` at `src/managers/DataManager.ts:304` and `:414`; the `${src}:${dst}` id would collide in `this.edges` in any case | Parallel edges are kept; `ImportReport.counts.repeatedEdges` reports them and `ImportPlan.policies.repeatedEdges` (`keep-all` / `keep-first` / `sum-weights` / `drop`) chooses | Edge counts go up on any multigraph. Every downstream count, density and degree changes with them |
| **Incident edges are NOT removed with their node.** `DataManager.removeNode` (`src/managers/DataManager.ts:350`) carries a 12-line comment headed "TODO: Remove connected edges -- LEFT OPEN DELIBERATELY", and states the consequence: "an edge can outlive an endpoint: `Edge.update` keeps ray-casting against the removed node's mesh" | `{kind:"remove-nodes"}` removes incident edges, and the `MutationReceipt.inverse` restores both | Anyone who removed a node and then removed its edges themselves starts seeing edges that are already gone. Edge counts after a removal change |
| **The default edge weight attribute is `"value"`** -- `src/algorithms/utils/graphConverter.ts:35` (`weightAttribute = "value"`), `src/algorithms/utils/graphUtils.ts:101`, `src/algorithms/utils/communityUtils.ts:67`. It was never actually read | `"weight"`, matching the graph-io importers | Weighted results change for any dataset carrying a `weight` column and no `value` column: today those runs are unweighted, and become weighted |
| **Raw centrality values are computed over a mirrored directed graph.** `toAlgorithmGraph(g, options = {})` defaults to `directed = false, addReverseEdges = true` and therefore builds `new AlgorithmGraph({directed: true})` with both `(src,dst)` and `(dst,src)` (`src/algorithms/utils/graphConverter.ts:35`, `:43`, `:66-71`). Six algorithms call it bare: `BetweennessCentralityAlgorithm.ts:60`, `ClosenessCentralityAlgorithm.ts:60`, `EigenvectorCentralityAlgorithm.ts:181`, `KatzCentralityAlgorithm.ts:216`, `DijkstraAlgorithm.ts:164`, `DFSAlgorithm.ts:171` | Betweenness is halved and normalised with the undirected factor; closeness, eigenvector and Katz use the undirected convention. The percentile fields do not change | Anyone who stored or compared **raw** centrality values across versions. Rankings and percentiles are stable; absolute numbers are not. `graphty/src/components/shell/analysis/nodeMetrics.ts:41-50` already documents that today's score is "a RELATIVE ranking only" |
| **Ids from text sources are typed by the parser, not by a rule.** CSV runs through papaparse with `dynamicTyping: true` (`src/data/CSVDataSource.ts:67`, `:134`, `:591`, `:613`), so `"1"` becomes `1` and `"01"` also becomes `1`; the XML sources set `parseAttributeValue: false` and keep every id a string (`src/data/GraphMLDataSource.ts:84`, `src/data/GEXFDataSource.ts:49`) | The `"canonical"` rule: a CSV `"1"` becomes the number `1`, matching a JSON `1`; **`"01"` stays a string** | Any dataset with zero-padded numeric ids. A CSV id that used to collapse to a number now keeps its padding, so a join that accidentally worked stops, and one that accidentally failed starts |
| **`viridis(undefined)` throws and aborts the repaint loop part way through.** With an empty selector a calculated value runs on a node the algorithm never measured, so `arguments[0]` is `undefined`. Trace: `src/utils/styleHelpers/color/sequential.ts:26` -> `interpolatePalette`; `color/interpolation.ts:64` computes `Math.max(0, Math.min(1, undefined))` = `NaN`, so `index1 = Math.floor(NaN) = NaN` and `colors[NaN]` is `undefined`; `interpolation.ts:45` calls `hexToRgb(undefined)`, which at `interpolation.ts:11-14` runs a regex and throws `Invalid hex color: undefined`. `CalculatedValue.run` has no try/catch (`src/CalculatedValue.ts:77-87`) and neither does `ChangeManager.runAllCalculatedValues`, so the throw escapes into `DataManager.applyStylesToExistingNodes` (`src/managers/DataManager.ts:85-101`) and **every node after the offender keeps its old style** | The whole class of failure dies with the expression evaluator; a registered scale's `map` is guarded per element, disabling the layer with a reason and emitting one deduped `style:error` | Anyone whose graph "mostly repainted". The visible change is that it now repaints completely -- which will look like a styling change |
| **An unmatched node is hidden, not default-styled.** `if (styles.length === 0) { mergedStyle.enabled = false; }` (`src/Styles.ts:228-230`). This is survivable today only because the `Styles` constructor unshifts a `"default"` layer with an empty selector when `graph.addDefaultStyle` is true (`src/Styles.ts:54-67`) -- and a consumer can delete that layer by index | The element's base layer is `locked` and cannot be removed (`E_PROTECTED`), so no node can be unmatched | Anyone who removed the default layer deliberately to hide unstyled nodes loses that trick |
| **`runAlgorithmsOnLoad` re-runs the whole algorithm list on every `data-added` event**, not once per load. `Graph.ts:337` subscribes to `data-added` and `:352` runs `styles.config.data.algorithms` each time; `data-added` is emitted once per `addNodes` call (`src/managers/DataManager.ts:269`) and once per `addEdges` call (`:456`), and a chunked data source calls each once per chunk (`DataSource.DEFAULT_CHUNK_SIZE = 1000`) | Runs once per load | Anyone watching run counts, progress, or timing on a large file. The attribute itself is removed anyway, so this only affects a `Recipe`-equivalent |
| **Edge weights never reach Kamada-Kawai or ForceAtlas2.** Both engines build a 2-tuple with no weight: `const edges = () => this._edges.map((e) => [e.srcId, e.dstId] as LayoutEdge)` at `src/layout/KamadaKawaiLayoutEngine.ts:89` and `src/layout/ForceAtlas2LayoutEngine.ts:153` -- while both still pass a weight option down (`KamadaKawaiLayoutEngine.ts:95` `this.config.weightProperty`, `ForceAtlas2LayoutEngine.ts:166` `this.config.weightPath`), so the option is accepted and ignored | Weights reach both | **Every layout of a weighted graph moves.** This is the single largest visual change in the release, and the reason a one-time Chromatic and Storybook re-baseline is already accepted as a cost of this major |
| **An all-undirected GEXF / GML / GraphML loads as a directed graph with mirrored edges**, because there is no graph-level directedness at all: `DataConfig` (`src/config/DataConfig.ts`, the whole 17-line file) has no `directed` key, and `graphty/src/components/shell/analysis/graphShape.ts:13-15` states the consequence plainly -- "graphty-element has no graph-level directed flag" | One edge per file edge under `data.directed: "auto"`; `data.statistics().directedness` is a real tri-state `directed \| undirected \| mixed \| unknown` | Edge counts halve on undirected files. Every degree, density and centrality moves with them |
| **A run paints nothing unless asked.** `runAlgorithm(ns, type, {applySuggestedStyles})` is opt-in per call, and the one consumer always passes `false` | On a run's **first** completion the element applies the derived encoding layer, suppressed when a user layer already drives that channel, once per batch, with `{style:false}` to opt out | Everyone. A consumer who ran an algorithm for its numbers now gets a repaint. The app passes `false` today only because the element's own suggested layers are the unscoped, crash-prone ones; 2.0 removes the reason for the refusal |
| **Every run measures the whole graph**, because there is no filter and no scope | `"visible"` is the default scope for every run, layout and export | A run under an active filter measures fewer elements. `run.stale` reports it, but the numbers differ from 1.x on the same dataset |
| **Layer order semantics are knowable only from a 40-line source comment** (`src/Styles.ts:234-276`): `getStyleForNode` **unshifts** matches then `defaultsDeep` (first-wins), while `getCalculatedStylesForNode` **pushes** because `CalculatedValue.run` ends in an unconditional `deepSet` (last-writer-wins). Both arrive at "the top layer wins" | Stated once in the docs: `styles.list()` index 0 is the BOTTOM, the top layer wins | **This is not a behaviour change** -- it is recorded here so a reviewer does not mistake the new documentation for a new rule. Today's effective order is already "highest array index wins" |

One neighbouring item is **not** a graphty-element behaviour change and is named here only so
nothing is left dangling: `topPageRankNodes` keeps returning `String(id)` for numeric ids until
its own 2.0. It is a `@graphty/algorithms` facade, not element surface.

---

## 4. Edge endpoints: `source`/`target` versus `src`/`dst`

This is the one disagreement in the package that has already cost a shipped bug, and it is the
thing a third party is most likely to hit in their first hour. It gets its own section because
the decision, the evidence and the migration are all different from a normal rename.

### 4.1 Both spellings ship today, and they disagree

| Where | Spelling | Evidence |
|---|---|---|
| The runtime default | **`src` / `dst`** | `graphty-element/src/config/DataConfig.ts:7-8`: `edgeSrcIdPath: z.string().default("src")`, `edgeDstIdPath: z.string().default("dst")`; consumed at `src/managers/DataManager.ts:405-406` and `:227` |
| The element's JSDoc | `source` / `target` | `src/graphty-element.ts:1122-1123` and `:1146-1147` say `(default: "source")` / `(default: "target")`; `:202` says edge objects "should have source and target fields (default: 'source', 'target')" |
| The published README quickstart | **`src` / `dst`** | `graphty-element/README.md:39-43`: `graph.edgeData = [{ src: 1, dst: 2 }, ...]` |
| The published getting-started guide | `source` / `target` | `graphty-element/docs/guide/getting-started.md:38` and `:83-85`; `docs/guide/installation.md:41`, `:96`, `:162` |
| The GML importer | **`src` / `dst`, and it deletes the others** | `src/data/GMLDataSource.ts:302-310` builds `{src: edge.source, dst: edge.target, ...edge}` and then `delete edgeData.source; delete edgeData.target;` |
| A JSON file spelled `{source,target}` | both, accidentally | the `...edge.data` spread restores `source`/`target` alongside the `src`/`dst` the element wrote |
| The app's reader | both, defensively | `graphty/src/components/shell/analysis/graphShape.ts:129-136`: `edgeEndpointId(edge.src) ?? edgeEndpointId(edge.source)` |

So the package contradicts itself in its own two shipped documents, and following the JSDoc
produces **a graph with nodes, no edges and no error**.

### 4.2 The shipped bug

Verbatim from `graphty/src/components/shell/analysis/graphShape.ts:104-116`:

> EXPORTED ON 2026-09-14, and the reason is the defect it retires. `AppShell` had a SECOND,
> private reader of the same fact -- an `edgeEndpoint` helper and a `neighborsOf` loop that read
> `edge.source` and `edge.target` and nothing else. Those two fields are exactly the two
> `getData` never writes (`Graphty.tsx:280-286` builds `{id, src, dst, ...edge.data}`), so every
> edge yielded no endpoint, every iteration was skipped, and the node inspector reported "Expand
> 0 neighbors" for every node on every dataset. It read as an id-type bug and was not one: a
> JSON file whose edge records happen to be spelled `{"source":..,"target":..}` restored the two
> names through the `...edge.data` spread and worked, while karate.gml could not --
> `GMLDataSource.ts:302-310` builds `{src, dst, ...edge}` and then deliberately DELETES `source`
> and `target` from the data. **Verified in the browser: node 34 on Karate Club reported 0
> neighbours while its own result card said 17 links.**

Two properties of that bug decide the migration. It was **format-dependent**, so it passed on
one dataset and failed on another. And it was **silent**: no error, no warning, a plausible
number on screen.

### 4.3 The decision: `source` / `target`

Canonical on output, permissive on input.

- **Emitted:** `source` / `target`, always. `EdgeRecord` is `{id?, source, target, ...attrs}`,
  and `graphty-edge-click`'s `detail` carries `source` and `target`.
- **Accepted:** when endpoint columns are not declared in an `ImportPlan`, the element tries
  `source`/`target`, then `src`/`dst`, then `from`/`to`.
- **Reported:** `Inspection.endpoints.resolvedFrom` and `ImportReport` say which pair was used,
  and `graphty-data-loaded` carries it. A consumer can assert on it.
- **Never silent:** a file with none of the three fails with `E_EDGE_ENDPOINTS_UNRESOLVED`
  carrying the column list. There is no edgeless-graph-with-no-error path.

Three reasons `source`/`target` wins over `src`/`dst`, in order.

1. **It is what the ecosystem writes.** D3, Cytoscape, NetworkX JSON, GEXF, GraphML and GML all
   spell it `source`/`target`; `src`/`dst` appears in none of them. A stranger pasting a D3
   dataset is the modal first user.
2. **It is what this package's own guides already say**, so the docs stop being wrong instead of
   the code starting to be.
3. **The importers already carry it and throw it away.** `GMLDataSource.ts:302-310` reads
   `edge.source` / `edge.target` and then deletes them. Choosing `source`/`target` deletes the
   translation rather than moving it -- the same argument that settles the opacity units.

### 4.4 Migrating

| You have | Do |
|---|---|
| Edge data authored as `{src, dst}` | Nothing required: the fallback resolves it and reports `resolvedFrom: "src/dst"`. Rename when convenient |
| `edgeSrcIdPath` / `edgeDstIdPath` set to custom columns | Move them to `ImportPlan.edgeSource` / `edgeTarget`, either from `data.inspect()`'s proposed plan or written by hand |
| Code reading `edge.src` / `edge.dst` off a record the element returned | **Rename to `edge.source` / `edge.target`.** This is the one place a codemod is safe and required, because the old names stop being emitted |
| A defensive `edge.src ?? edge.source` reader | Delete the fallback. Two spellings of one fact is what let them disagree |
| An `EdgeRecord` you build to pass in | Either spelling works; prefer `source`/`target` |

### 4.5 What must be true before this is called done

Three tests, because the bug class was "passes on one file, fails on another":

1. A fixture per registered format (json, csv, graphml, gexf, gml, dot, pajek), each asserting a
   non-zero edge count and the `resolvedFrom` value.
2. A negative fixture: a CSV whose endpoint columns are named `a` and `b`, asserting
   `E_EDGE_ENDPOINTS_UNRESOLVED` and that the error's `details` names the available columns.
3. The `neighbors()` assertion that would have caught the shipped bug: Karate Club node 34 has
   17 neighbours, loaded from `.gml` and from `.json`, both spellings.

---

## 5. Migrating the one existing consumer, the graphty app

`@graphty/graphty-element` has exactly one consumer, the React app at `graphty/`, which depends
on it as `"@graphty/graphty-element": "workspace:*"` and maps it in `graphty/tsconfig.json:29`
to `../graphty-element/index.ts`. That is what makes this major cheap: the whole migration is
in-repo and lands in the same commit range as the element work.

Only eleven files in `graphty/src` touch the package at all, and the two real value imports are
`import { Graphty } from "@graphty/graphty-element"` (`graphty/src/main.tsx:10`) and
`import { Algorithm } from "@graphty/graphty-element"`
(`graphty/src/components/RunAlgorithmModal.tsx:1`). Everything else is a mock, a type shim, or
a comment -- which is itself the diagnosis: the app does not consume the element's API, it
reimplements around it.

### 5.1 The six files that go away

They total **2,665 lines**, each count verified with `wc -l` on 2026-09-19.

#### `graphty/src/components/shell/analysis/nodeMetrics.ts` (923 lines) -- DELETED

| App code deleted | Element API that replaces it |
|---|---|
| `summariseReadings` (:385) -- max / min / median / tiedAtMinimum | `RunResult.summary(): ResultSummary`, which carries exactly `{min, max, median, mean, tiedAtMin, normalisation, top, caveats}` |
| `deriveFraction` (:355) -- per-metric normalisation reconstruction, and the comments at :30-40 recording that `degreePct`/`rankPct` are value/max while `scorePct` is min-max | `ResultSummary.normalisation` and the uniform `value` / `rank` / `percentile` fields |
| `readNodeMetricResults` (:463), `rankingFromDegreeResults` (:592) | `RunResult.ranking(field, limit)` and `RunResult.node(id)` |
| `metricDistribution` (:872), `linearBandPlan` (:722), `logBandPlan` (:789), `METRIC_DISTRIBUTION_MAX_BINS = 20` (:633), `LOG_X_RATIO_THRESHOLD = 100` (:639) | `RunResult.histogram(field, {bins, scale})` and `RunResult.column(field): NumericColumnView` |
| The max-scan workaround at :52-58, written because "betweenness and closeness publish NO graph-level result" | Every metric publishes graph-level `min` and `max` |
| The refusal of `applySuggestedStyles` documented at :21-28 | Suggested layers are derived and scoped, so the refusal has no cause |
| The app's own guard expression `'{ return typeof arguments[0] === "number" ? ... : "#6366F1" }'` (:317-340 of `nodeMetricStyle.ts`, quoted here because it guards the same defect) | The declarative encoding model plus `missing: "skip"`: an unmeasured element is not painted at all |

Residue: none. The card copy and the reading templates stay in the app.

#### `graphty/src/components/shell/defaults/nodeMetricStyle.ts` (671 lines) -- DELETED

| App code deleted | Element API that replaces it |
|---|---|
| `VIRIDIS_RAMP` (:176) -- the element's ten viridis anchors copied verbatim, with the reason at :168-175: "the app cannot reach the element's palettes" | `./schema` exports the palettes with **no Babylon** |
| `viridisAt(fraction)` (:250) and its own `channelsOf` hex slicer, written because "the element's own hexToRgb runs a regex and throws on a miss" | `Binding.palette` plus `PaletteDescriptor.colors`; the throw is the repaint-aborting crash, and it is gone |
| `nodeMetricColourLayer(metric)` (:317) -- hand-building a `StyleLayer` with an empty selector and a `calculatedStyle` | `styles.encode({run, channel, palette, scale})`, which **writes the selector itself** as `{match:"has", path:"results.<runId>.<field>"}` |
| `NODE_METRIC_LAYER_SOURCES` (:117) -- the app minting the element's own `metadata.algorithmSource` tag format | `LayerSource = {by:"run", runId, algorithm, params}`, typed and element-minted |
| `ELEMENT_DEFAULT_LAYER_NAME = "default"` (:347), `ELEMENT_SELECTION_LAYER_NAME = "selection"` (:358), `ELEMENT_OWN_LAYER_NAMES` (:371) | `layer.source.by === "element"` and `layer.locked` |
| `HAND_BOUND_METADATA_KEY = "handBound"` (:411) and `markHandBound` (:431) | `layer.userData`, a documented consumer bag |
| `styleSetsNodeColour` (~:494), `calculatedStyleSetsNodeColour` (~:522) -- deciding which channel a layer drives by prefix-matching `output.startsWith("style.texture.color")` | `styles.explain(target).channels`, which returns `{channel, layerId, mode, editable, reason}` |
| `handAuthoredColourLayerName` (:599), `autoApplyDecision` (:654) | The element owns auto-apply policy; the app keeps the cap and priority policy only |

Residue: none.

#### `graphty/src/components/shell/analysis/metricCost.ts` (449 lines) -- DELETED

| App code deleted | Element API that replaces it |
|---|---|
| `LINEAR_ELEMENTS_PER_SECOND = 20_000_000` (:158), `PAGERANK_ELEMENTS_PER_SECOND = 3_000_000` (:177), `BETWEENNESS_PAIRS_PER_SECOND = 5_000_000` (:184) -- throughput constants calibrated against a **built element bundle** | `session.estimate(command): CostEstimate` -- **synchronous**, so it can gate a button click -- plus `session.calibrate()`, the element's own once-per-device probe |
| `PAGERANK_ITERATION_BOUND = 100` (:166) -- a literal copy of a default declared in the element's own Zod schema | `OptionDescriptor.default`, as plain JSON |
| The cost model at :274-281 (`betweenness: (n,m) => (n*m)/...`) | `AlgorithmDescriptor.cost(n, m)` and `costClass`, and `CostEstimate.basis` naming the calibration |
| The applicability half of the model | `catalog.metrics(): MetricAvailability[]` with `available`, `reason`, `costClass`, `estimateSeconds`, `hasRun` |

Residue: `ASK_LIMIT_SECONDS = 10` (:144) and `WARN_LIMIT_SECONDS = 1800` (:151) **stay**, as
reader preferences -- but they move into `session.config` as `askLimitSeconds` /
`warnLimitSeconds`, so they round-trip in an exported configuration.

This file also carries the strongest argument for putting the cost model in the element at all:
its own history (:120-148) records the model being wrong in production by 6.9x at n = 200,000,
so a 70,000-node graph estimated 2.10 s, the button showed no confirm, and the frame locked for
10.4 s.

#### `graphty/src/components/shell/analysis/graphShape.ts` (353 lines) -- DELETED

| App code deleted | Element API that replaces it |
|---|---|
| `class UnionFind` (:138-220) -- an 80-line disjoint-set forest with path compression and union-by-size, in a React app | `data.statistics().components` -- `{count, largestSize, isolatedCount, componentOf(id)}` |
| `readDirectedness(edges)` (:227) -- a tri-state vote over every edge record's `directed` key, written because "graphty-element has no graph-level directed flag" (:13-15) | `GraphStatistics.directedness: "directed" \| "undirected" \| "mixed" \| "unknown"`, now that the element has the flag |
| `computeGraphShape(input)` (:269) -- one O(n+m) pass for counts, self loops, parallel edges, giant component | `data.statistics(): GraphStatistics`, **O(1) and maintained incrementally** |
| `edgeEndpointId` (:78) and `edgeEndpoints` (:129) -- the two-spelling coercion | One canonical spelling settles it; `data.neighbors(id, options)` retires the reader |
| The flattened second copy of the graph this file runs over: `GraphtyHandle.getData()` materialises `Array.from(dataManager.nodes.values()).map(...)` on every call (`graphty/src/components/Graphty.tsx:306-329`) | `session.status.counts` and `data.statistics()` count in place. The React-state copy of the whole graph goes with them |

Residue: none.

#### `graphty/src/components/shell/analysis/elementBridge.ts` (196 lines) -- DELETED

| App code deleted | Element API that replaces it |
|---|---|
| `REQUIRED_GRAPH_METHODS = ["runAlgorithm","getNodes","getDataManager","getStyleManager"]` (:76) and `asElementGraph(candidate)` (:108) -- a four-method duck-typing probe for "has the element finished coming up" | `await element.ready`, and no `E_NOT_READY` anywhere |
| Five hand-written structural mirror interfaces `ElementNodeLike`, `ElementDataManagerLike`, `ElementStyleLayerLike`, `ElementStyleManagerLike`, `ElementGraph` (:24-74) | The real exported types (`ElementView`, `Layer`, `RunResult`), reachable because of the exports map and the shipped element interface |
| `readResultPath(root, path)` (:135) -- a nested-property walker, because `node.algorithmResults` is `unknown` | `ElementView.results` and `RunResult.node(id)`, both typed |
| `repaintStyles(graph)` (:160) -- calling `applyStylesToExistingNodes()` + `...Edges()` by hand | Style mutations repaint, so there is nothing to compensate for. `applyStylesToExistingNodes` stops being public |
| `addStyleLayers` (:175), `removeLayersFromSource` (:191) with its highest-index-first deletion dance | `styles.add(spec, at?)` and `styles.removeBySource(pred)`, with layer ids instead of indices |

Residue: none. This file's own header (:12-19) names the element defect it exists for: adding a
layer does not apply the layer.

#### `graphty/src/types/graphty-element.d.ts` (73 lines) -- DELETED

| App code deleted | Element API that replaces it |
|---|---|
| `declare module "@graphty/graphty-element" { ... }` -- an **ambient external module declaration that shadows the real `.d.ts`**, which is why the app sees no real types at all | A real exports map, plus a typed element interface and the `HTMLElementTagNameMap` and `GraphtyEventMap` augmentations shipped from `.` |
| `class Graphty extends HTMLElement {}` -- **empty, no members** | `GraphtyGraphElement`, carrying every property and method |
| `interface GraphtyElementAttributes` (13 attributes), `interface GraphtyElement` (13 properties) -- including five that **do not exist on the element**: `algorithms`, `nodePathStyles`, `edgePathStyles`, `width`, `height`, and two attributes `node-path-styles` / `edge-path-styles` | The manifest and the type map, generated from one declaration and CI-checked against the emitter |
| `interface OptionsSchema` / `OptionDefinition` | `OptionDescriptor`, as plain JSON |
| `interface AlgorithmClass`, `const Algorithm: {getClass, register}` | `catalog.algorithms()` and `use(defineAlgorithm(...))` |
| The `HTMLElementTagNameMap` augmentation at :68-72 | Shipped by the element |

Residue: none. Deleting this one file is what makes the other five deletions type-check, so it
is the **first** step in the sequence below.

### 5.2 The wider sweep: the other ~4,900 lines

Not among the six files above, but the same defect. Counts verified with `wc -l`.

| App file (lines) | Deleted by |
|---|---|
| `graphty/src/utils/styleBridge.ts` (918) | roughly half by settling the units and spellings once in the element; the other half by `./schema` exporting the canonicalisers `normalizeNodeStyle` / `normalizeEdgeStyle`, so a consumer cannot mint a duplicate interned style id |
| `graphty/src/components/shell/insights/insightsRules.ts` (489) -- the eligibility half | `catalog.applicable()` and `session.estimate()`. The card copy, `INSIGHTS_CARD_CAP` and the priority order stay |
| `graphty/src/components/shell/inspector/calculatedChannels.ts` (311) | `styles.explain().channels` plus `styles.resolveToStatic(id, channel)` |
| `graphty/src/data/layoutSchemas.ts` (282) | `catalog.layouts()` with plain-JSON `OptionDescriptor`s |
| `graphty/src/components/algorithmCatalog.ts` (279) | `catalog.algorithms()`; role-tagged option types (`"node-id"`, `"node-set"`) kill `sourceOptionKey` / `targetOptionKey` |
| `graphty/src/components/shell/canvas/legendChannels.ts` (263) | `styles.legend(): LegendBlock[]`, derived from the encoding model rather than from the canvas |
| `graphty/src/types/ai.ts` (250) | the `./ai` subpath |
| `graphty/src/utils/zodSchemaParser.ts` (249), plus the duplicate in `graphty/src/components/options/OptionsForm.tsx:65-115` | plain-JSON option descriptors |
| `graphty/src/data/layoutMetadata.ts` (167) | `catalog.layouts()` |
| `graphty/src/utils/layerConversion.ts` (84) | layer ids instead of array indices |
| `graphty/src/components/Graphty.tsx:150-225` (format sniffing) | `data.inspect()`; the two implementations have already drifted (the app defaults unknown XML to GraphML, the element resolves `.xml` by content) |
| `graphty/src/components/shell/defaults/loadDefaults.ts:466-494` (layout choice by node count) | `layout.recommend()` |
| `graphty/src/hooks/useGraphInfo.ts:38-52` (density arithmetic, and `directed` defaulting to `true`) | `data.statistics()` |
| `graphty/src/constants/style-options.ts` and its relative-path test (`graphty/src/constants/__tests__/style-options.test.ts:8`) | `./schema` exporting `NodeShapes`; the drift-guard test becomes unnecessary because the fact is imported |

### 5.3 What the app KEEPS

So the migration does not over-correct. All of this is consuming, not computing.

- Every user-visible string: card copy, reading templates, the insights card bodies.
- Cap and priority policy: `INSIGHTS_CARD_CAP = 4`, "Search always last", and the two second
  limits (now read from `session.config`).
- Persistence of the reader's own preferences (`LABEL_SETTINGS_STORAGE_KEY` and friends).
- The undo **stack**, its depth, its redo rule and its keyboard binding. The element owns the
  inverses, the journal and the `coalesceKey`; the stack is product policy.
- Panel layout, keyboard bindings, the layer list UI.
- Dimming, fading or greying what an algorithm did **not** select. Root `CLAUDE.md` assigns
  that to the reader, and it must never ship in a suggested layer.
- Note storage, note text, tags and the hover card. The element keeps the four primitives and
  the never-drop rule.

### 5.4 Sequencing

The app cannot migrate incrementally against a half-built 2.0, because step 1 is deleting the
shim that shadows the real types. The order that works:

1. **Delete `graphty/src/types/graphty-element.d.ts`** and fix the resulting type errors against
   the 2.0 `.d.ts`. Nothing else compiles honestly until this is gone.
2. Adopt `./schema` and `./catalog` -- the pure-data entries. This deletes the copied palettes,
   shape lists, defaults and Zod introspection with no runtime behaviour change.
3. Adopt `element.ready` and `element.session`, deleting `elementBridge.ts`.
4. Adopt `runs.start()` / `RunResult`, deleting `nodeMetrics.ts` and `runs.ts`'s re-derivations.
5. Adopt `styles.encode()` and layer ids, deleting `nodeMetricStyle.ts` and `layerConversion.ts`.
6. Adopt `data.statistics()` / `data.neighbors()`, deleting `graphShape.ts` and the
   `getData()` React-state copy.
7. Adopt `estimate()` / `catalog.metrics()`, deleting `metricCost.ts` and the eligibility half
   of `insightsRules.ts`.
8. Re-baseline Chromatic and Storybook once, at the end. It is a one-time cost, already
   accepted, and edge weights reaching the force layouts is why it is needed.

---

## 6. The deprecation policy

A register of breaking changes is only meaningful beside a statement of what was promised. Today
the package has no such statement, which is why "for debugging purposes"
(`src/graphty-element.ts:1060-1063`) became the only consumer's main road. The policy below
ships in `API.md` and in the README, and takes effect with 2.0.0.

### 6.1 What IS public API

Public means: semver-protected, listed in the documentation, covered by a test, and removable
only in a major.

1. **The tag `<graphty-element>`**, its eleven attributes, its two slots, and the reflection
   behaviour of each attribute.
2. **Every symbol reachable through a declared `exports` subpath**: `.`, `./session`,
   `./schema`, `./catalog`, `./commands`, `./extend`, `./format`, `./react`, `./webgpu`,
   `./io/*`, `./ai`, `./bundle`.
3. **The twenty-two prefixed DOM events and the thirteen session events**, each with its
   `detail` shape.
4. **`dist/custom-elements.json`** and **`dist/graphty-commands.json`** plus its JSON Schema.
   These are published artifacts, not build by-products: a tool reads them and breaks if their
   shape changes.
5. **The `Command` union**, including every `op` string and its parameter names. A recipe
   recorded by 2.0.0 replays on 2.9.0.
6. **`GraphtyErrorCode`** values. Codes are the contract.
7. **Catalogue descriptor shapes** (`AlgorithmDescriptor`, `LayoutDescriptor`, `FormatDescriptor`,
   `PaletteDescriptor`, `ScaleDescriptor`, `OptionDescriptor`, `FieldDescriptor`,
   `ConfigKeyDescriptor`) and the **result field names per `ResultShape`**.
8. **The document formats** `StyleDocument`, `DataPlan`, `ViewPreset`, `Recipe`, each with its
   own `version` field, and the `ConfigDocument` round-trip.
9. **The plugin contracts** in `./extend`: the ten `Plugin` kinds and their function shapes.
10. **The expression root** `{data: {...}, results: {<runId>: {...}}}` and the two languages over
    it (the JMESPath predicate dialect, and the `[name]` formula grammar).

### 6.2 What is NOT public API

Not public means: it may change in any release, including a patch, with no note.

1. **`unstable_internals`.** One door, named so it greps, documented in one line as not
   semver-protected. If you need it, that is a missing API and it should be filed as one.
2. **Anything not reachable through a declared subpath.** Deep imports into `dist/src/**` are
   not supported even though the files exist, and the `.d.ts` layout under `dist/` is not a
   contract.
3. **Error `message` text.** Switch on `code`. Messages are localised and improved freely.
4. **`Run` ids derived rather than assigned.** A derived id is documented as opaque and stable
   *for a given `(algorithm, params, scope)`*; the derivation itself may change. This is why
   `as:` is **required** the moment an artifact naming a run is persisted, enforced by
   `E_UNSTABLE_RUN_ID`.
5. **`LayerId` values.** Element-minted, stable within a session, not stable across a reload.
   Persist a `StyleDocument`, not a list of ids.
6. **Internal event names**, the manager decomposition, the Babylon scene graph, mesh names,
   interned style ids, cache keys, and the layout engine chosen to implement a semantic layout
   id (`LayoutDescriptor.engine` is *reported*, not promised).
7. **Performance characteristics**, except where a `CostEstimate.costClass` or a
   `ConfigValues` key states one.
8. **The contents of the built-in catalogue.** Algorithms, layouts, formats, palettes, scales,
   themes and sample datasets are **added** in minors. A consumer who switches exhaustively over
   `KnownAlgorithm` will see new members; that is why `AlgorithmKey` is
   `KnownAlgorithm | (string & {})`. Nothing is **removed** from the catalogue outside a major.

### 6.3 How long a deprecation lives

| Stage | Rule |
|---|---|
| Introduced | A replacement ships first, in a **minor**. The old symbol keeps working, unchanged |
| Marked | The old symbol gets `@deprecated` with the replacement named in the tag, an entry in `custom-elements.json`, and a **warn-once-per-process** console warning naming the symbol and linking to the migration page. Once per process, never per call, never per frame |
| Honoured | The deprecated symbol survives **at least two minor releases and at least ninety days**, whichever is longer, measured from the release that marked it |
| Removed | Only in a **major**, only with a row in that major's register, and only with a `./compat/<previous major>` shim where the symbol can be shimmed |

Two rules that follow from it, stated because both were broken in 1.x:

- **A deprecated symbol must still work.** `layout-2d` is marked `@deprecated` (the decorator
  is at `src/graphty-element.ts:527`) and does warn -- the `console.warn` is the first
  statement of `set layout2d`, `src/graphty-element.ts:543-547`, and it is the only
  `console.warn` in the file -- which is correct; `style-template`'s documented "partial
  configuration object" (`:559-572`) cannot parse at all, which is not a deprecation but a
  breakage that was never registered.
- **A symbol is not deprecated by being undocumented.** The eleven manager exports carry JSDoc
  and `@example` blocks; by the repo's own standard they are documented API, which is precisely
  why removing them is a major rather than a tidy-up.

---

## 7. Is a 1.x bridge release worth shipping?

**Recommendation: no. Do not ship a 1.11 deprecation-warning bridge. Ship one docs-only patch
(1.10.1) instead, then go straight to 2.0.0.**

### 7.1 What a 1.11 bridge would have to do

A bridge earns its keep by letting a consumer move in two steps instead of one: first upgrade
to 1.11, fix every warning, then upgrade to 2.0 with nothing left to fix. For that to work the
warnings have to be **actionable in 1.x**, which means the 1.11 surface must contain the
replacement for whatever it warns about.

Check that against this document: seventy-seven surface changes and fifteen behaviour changes.

| Bridgeable in 1.11? | Count | Examples |
|---|---|---|
| Yes -- a warn-once is actionable | roughly 10 | the tag rename, `layout-2d`, the AI barrel exports, the logging and accessibility exports, `setRenderSettings`, the manager getters, the `data-source` attribute pair |
| No -- the replacement is the whole 2.0 model | roughly 67 | `Run` objects, run-scoped result paths, uniform result field names, two-set selection, layer ids, declarative encodings, prefixed events, the plugin contracts. Warning about these in 1.11 means warning about a thing with no 1.x replacement, which is a scold, not a migration aid |
| No -- behaviour, not surface | 15 | parallel edges, incident-edge removal, undirected centrality, weighted layouts, graph-level directedness. A console warning cannot tell you that your edge count is about to change |

So a 1.11 bridge would warn about ten things and be silent about the eighty-two that actually
cost work. A consumer who fixed every 1.11 warning would still face essentially the whole
migration at 2.0, having paid for an extra release cycle to learn that.

### 7.2 The population it would serve

- **In-repo consumers: one.** The graphty app, which migrates in the same commit range as the
  element and never sees a 1.11 at all.
- **External consumers: unknown, and the evidence says very few.** Every documentation link the
  package has ever published points at `https://graphty.app/docs/graphty/`, which is a **404**
  (verified 2026-09-19; `graphty-element/README.md` carries ten occurrences and the repo root
  README one more). The docs the package advertises have never been reachable from npm. A
  quickstart that is wrong in three independent ways at once -- `source`/`target` against a
  `src`/`dst` runtime, two layout names that are not registered
  (`src/graphty-element.ts:414-420`), and `style-template="dark"`
  (`docs/guide/getting-started.md:112`), which is not a value the property accepts -- is not a
  quickstart anyone completed.

The cost of a bridge is real: one more release to cut, one more branch to keep green, one more
version matrix in CI, and a set of `@deprecated` tags that have to be written twice (once for
1.11 and once against the 2.0 surface).

### 7.3 What to ship instead

1. **`1.10.1`, docs-only, patch.** Re-point all eleven `graphty.app/docs/graphty/` links to
   `/docs/graphty-element/`, and publish a redirect at the old path so the URLs already printed
   on npm for 1.0.0 through 1.10.0 stop being dead. This is the only 1.x work that pays for
   itself: it rescues every historical link and it costs one `fix(graphty-element)` commit.
   It is a `fix`, so it bumps the patch.
2. **`2.0.0`**. The tag name is unchanged, so there is no aliasing shim and nothing to deprecate.
3. **A migration page in the 2.0 docs** built from the register, the behaviour changes and the
   edge endpoint section of this document, with the codemod inventory beside it.

### 7.4 When to revisit

If telemetry or an npm-download check before the 2.0 cut shows meaningful external adoption of
1.x, reconsider -- but reconsider by **widening the documented migration guidance**, not
by adding a 1.11. A shim in the new major that keeps the old tag alive is worth more than a
warning in the old major that names a replacement the old major does not have.

---

## 8. The version number and the release mechanics

### 8.1 The number

**`@graphty/graphty-element@2.0.0`**, from today's `1.10.0` (`graphty-element/package.json:3`).

Note that root `CLAUDE.md`'s package table says 1.5.0; it is stale. This document and the
release both read the manifest.

### 8.2 How releases work in this repo

`nx release`, configured at `nx.json:4-33`:

| Setting | Value | Consequence for this major |
|---|---|---|
| `release.projects` | `["*"]` | every package is a release unit |
| `release.projectsRelationship` | `"independent"` | graphty-element goes to 2.0.0 **alone**; no sibling's version moves because of it |
| `release.releaseTagPattern` | `"{projectName}@{version}"` | the tag is `graphty-element@2.0.0`, and the changelog range starts at `graphty-element@1.10.0` |
| `release.version.conventionalCommits` | `true` | the bump is computed from commit messages, not chosen by a human |
| `release.version.updateDependents` | `"auto"` | dependents get a version bump. `graphty/` is private, so it is not published; it still needs its dependency range updated |
| `release.version.preserveLocalDependencyProtocols` | `true` | `workspace:^` ranges survive |
| `release.git` | `commit`, `tag`, `push` all true, `commitArgs: "--no-verify"` | the release commit is made by CI |

The workflow is `.github/workflows/release.yml`, which runs
`pnpm exec nx release --skip-publish --verbose` (line 226) and then, as a separate step,
`pnpm exec nx release publish` (line 243). Per root `CLAUDE.md`, `release.yml` runs after CI on
`master` and **waits for `gpu.yml` and `hosts.yml` and requires them green**.

### 8.3 What actually causes a major

Under conventional commits, only two types bump a version at all:

| Commit type | Bump |
|---|---|
| `feat` | minor |
| `fix` | patch |
| anything else (`chore`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, `style`) | **none** |

A major requires an explicit breaking marker, in one of two forms:

```
feat(graphty-element)!: replace runAlgorithm with a Run object

BREAKING CHANGE: runAlgorithm(namespace, type) returning Promise<void> is replaced by
runs.start(algorithm, params) returning a Run.
```

or the footer alone on a `feat`/`fix` commit. **The `!` and the footer are interchangeable for
the bump; use both.** The `!` is what a human sees in `git log --oneline`; the footer body is
what lands in `CHANGELOG.md` under "Breaking Changes" and is therefore the only part a consumer
reads.

Three repo-specific rules:

1. **Scope is mandatory and enumerated.** `commitlint.config.js` sets
   `"scope-enum": [2, "always", [...]]` with `graphty-element` in the list. A commit with no
   scope or an unlisted scope is rejected by the hook.
2. **nx attributes a commit to a project by the files it touches.** A breaking commit whose
   diff is entirely under `graphty/` will not bump graphty-element however it is worded. Keep
   the element change and its documentation in the same commit, touching `graphty-element/`.
3. **One `BREAKING CHANGE` footer per entry in this document**, naming the symbol or behaviour
   it changes. Seventy-seven surface changes plus fifteen behaviour changes is far more than one
   commit's worth, so the footers accumulate across the commit range and `nx release` renders
   them all into one changelog section. That changelog section is the public form of this
   document.

### 8.4 The release checklist for 2.0.0

1. Every surface change in the register has a commit carrying a `BREAKING CHANGE` footer naming
   it.
2. Every behaviour change has one too -- these are the ones that will be forgotten, because they
   are not signature changes and their commits look like `fix`.
3. `graphty/` compiles and its tests pass against the new element.
4. Chromatic and Storybook re-baselined once, after the weighted-layout change lands.
5. `dist/` no longer carries sourcemaps; check the packed size with `npm pack --dry-run`.
6. `package.json` has `customElements`, a real `exports` map, a corrected `sideEffects`, and no
   `main`/`require`.
7. The docs-only `1.10.1` is already out, so the npm page for every historical version links
   somewhere real.
8. `gpu.yml` and `hosts.yml` are green, because `release.yml` waits on them.

---

## 9. The codemod inventory

Of the seventy-seven surface changes, nineteen are mechanically fixable, twenty-four are
mechanical plus review, twenty-eight need a human decision, four need nothing, and two split
(edge endpoint renames are mechanical in authored data but not in code that reads `edge.src`;
the logging exports depend on whether they get a subpath or are removed). The nine codemods
below cover the mechanical cases and the larger review cases -- the ones a consumer hits first
and can fix without understanding the new model.

| Codemod | Applies to | Transform | Guard |
|---|---|---|---|
| `tag-rename` | the tag rename | `graphty-element` -> `graphty-element` in HTML, `querySelector` strings, JSX and CSS selectors | Skip the string inside `import "@graphty/graphty-element"` -- the package name does not change |
| `edge-endpoints` | the endpoint spelling | `.src` -> `.source`, `.dst` -> `.target` on values known to be edge records | Type-directed only. A bare `x.src` on an unknown type must be reported, not rewritten |
| `ai-subpath` | the AI surface moving to `./ai` | move the ~45 AI symbols from `"@graphty/graphty-element"` to `"@graphty/graphty-element/ai"` | The four name collisions (`runAlgorithm`, `setLayout`, `captureScreenshot`, `setCameraPosition`) are AI command functions **only** when imported from the barrel, never when called on an element |
| `schema-subpath` | the exports map | move `NodeShapes`, `defaultNodeStyle`, `defaultEdgeStyle`, `defaultRichTextLabelStyle`, `colorToHex`, `palettes` and the accessibility helpers to `"@graphty/graphty-element/schema"` | -- |
| `algorithm-key` | the one-string algorithm key | `runAlgorithm("graphty", "x", o)` -> `run("x", o)` | Only for the literal namespace `"graphty"`; a variable namespace is reported |
| `layout-name` | semantic layout names | `ngraph`/`d3`/`forceatlas2`/`spring` -> `force`, `bfs` -> `layers`, pass through `circular`/`shell`/`spectral`/`bipartite`/`fixed`/`random` | **Must fail loudly** on `spiral`, `planar`, `arf`, `multipartite`, `kamada-kawai`, which have no semantic name in the 2.0 list |
| `event-names` | the prefixed DOM events | prefix and kebab the twenty-two public event names; `graph.on(...)` -> `element.on(...)` returning an unsubscribe | Any listener for one of the ~30 internal names (`stats-update`, `operation-progress`, `input:undo`, ...) is **reported and deleted**, not renamed: those names are not public in 2.0 |
| `dead-calls` | the removed no-ops and leaked lifecycle methods | delete calls to `setRenderSettings`, `asyncFirstUpdated`, `render()`, `listenerCount()` | `setRenderSettings` is a no-op today, so deletion is behaviour-preserving |
| `template-split` | the four-document split | split one `StyleTemplate` JSON document into `StyleDocument` + `DataPlan` + `ViewPreset` (+ a `Recipe` when `data.algorithms` is non-empty) | Pure data transform, runnable offline over saved templates. It **cannot** convert a `calculatedStyle` -- those are emitted as a report with the `expr` text and the layer name, for a human to rewrite as an `Encoding` |

Everything a codemod does not cover -- the twenty-eight changes needing a human decision, and
all fifteen behaviour changes -- needs a person. The four largest are run-scoped result paths,
two-set selection, declarative encodings and the plugin contracts. They are the actual cost of
this major.

---

## 10. Open placements, and what is deliberately NOT breaking

### 10.1 Two placements still to decide

Both need a decision before 2.0 is cut, because either answer is a breaking change and silence
is not an option.

**The 23 logging exports** (`graphty-element/index.ts:200-230`).
*Recommendation: a `./logging` subpath.* A component that ships a structured logger with a
remote sink is offering a real integration; `configureLogging`, `createRemoteSink` and
`LogLevel` are a coherent surface. But they have no business in a barrel whose other job is to
define a custom element, and `parseLoggingURLParams` must stop being called from
`connectedCallback` regardless.

**The 7 accessibility exports** (`graphty-element/index.ts:336-343`).
*Recommendation: keep them, under `./schema`.* They are pure functions with no Babylon and no
DOM dependency, they are the only shipped way to check a custom palette, and
`PaletteDescriptor.colorblindSafe` is computed from exactly this code -- so the element is
already relying on them to answer a public question.

### 10.2 What is deliberately NOT a breaking change

Recorded so a reviewer does not add an entry that costs the major more than it should.

| Not breaking | Why |
|---|---|
| `worldToScreen` / `screenToWorld` | Same names, same shapes, same semantics (`src/graphty-element.ts:1768`, `:1787`) |
| The `layout` and `view-mode` attributes | Both survive. `layout`'s **values** change; the attribute does not |
| Layer order semantics | "The top layer wins" and "index 0 is the bottom" are today's effective behaviour. Only the documentation is new |
| The JMESPath selector dialect | Still JMESPath, over a new root. The dialect itself is unchanged, and `catalog.validate(query)` is additive |
| `NodeShapes` membership | The 25 shape names are preserved; the enum becomes extensible, which widens rather than narrows |
| Adding an algorithm, layout, format, palette, scale, theme or sample dataset | Catalogue growth is a **minor**. Twenty-three of the 130 symbols `@graphty/algorithms` exports are wired today; the rest arrive in minors |
| Worker hosting | `createGraphSession({host:"worker"})` ships in 2.0 and throws `E_UNSUPPORTED` with a reason until the host exists. The API does not change when it lands |
| The deferred XR items and named network collections | Deferred to 2.1 as **additive** work, because the session/view split and the shared selection set already exist in 2.0 |
