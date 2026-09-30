# graphty today: what is modelled, what is published, and where the words disagree

This is an inventory, not a design. It records what graphty-element 2.0.0 and the graphty app
model today, which names are already a published contract, which concepts exist only in the app
or only in earlier design documents, what the requirements base (personas, workflows and
capabilities) asks for, and where the vocabulary disagrees with itself. Later framework
documents cite it for facts; it recommends only where a fact forces a question.

Two package names are used throughout. **graphty-element** (`@graphty/graphty-element`, version
2.0.0, published on npm) is the web component that owns all graph functionality. **The graphty
app** (`@graphty/graphty`, private) is the React shell around it. A **published contract** is a
name a third party can depend on: an exported type or constant, a string value inside one, a
config key, an HTML attribute, an event name, or a field of a saved document. Renaming any of
them is a breaking change and needs a major release, so it is a one-way door. A string that is
only DATA inside a published table (a `plainName` such as "Bridges") is softer: changing it is
not a type break, but a consumer that displays or matches on it would notice.

Paths below are relative to `/home/apowers/Projects/graphty-monorepo/`.

**Which version.** Sections 1 to 6 were first written against graphty-element 2.0.0. The
behaviour recorded in section 7 was checked against the source of 2.3.1, the current release on
the remote `master` branch; where 2.3.1 differs from 2.0.0 the earlier sections now say so. Line
numbers cite 2.3.1. Sections 7.19 to 7.29 were also checked by running the published 2.3.1
package from npm, in Node and in headless Chromium; those measurements say so where they appear.

## Sources read

- The element's package manifest and entry points: `graphty-element/package.json`,
  `graphty-element/{index,session,schema,catalog,commands,extend,format}.ts`.
- The element source: `graphty-element/src/catalog/types.ts`, `src/catalog/algorithms.ts`,
  `src/catalog/layouts.ts`, `src/catalog/formats.ts`, `src/session/types.ts`,
  `src/session/runs/types.ts`, `src/session/results/types.ts`,
  `src/session/selection/{targets,SelectionApi}.ts`, `src/session/scope/ScopeApi.ts`,
  `src/session/visibility/{VisibilityApi,filter}.ts`, `src/session/styles/{StylesApi,Layer,autoApply}.ts`,
  `src/config/{ViewMode,DataConfig}.ts`, `src/camera/{types,presets}.ts`, `src/events.ts`,
  `src/errors/`, `src/session/limits.ts`, `src/data/positions.ts`, `src/graphty-element.ts`.
- The element's docs: `graphty-element/docs/guide/` (file list and `styling.md` headings).
- The element's design record: `design/element-api/element-api-design.md` (sections 3, 4.8,
  9.2, 9.3) and `design/element-api/owner-decisions-2026-09-22.md`.
- The app: `graphty/src/components/shell/` (types, constants, inspector constants, panels,
  analysis, readings, insights, defaults, undo store, legend), `graphty/src/components/algorithmCatalog.ts`,
  `graphty/src/data/layoutMetadata.ts`.
- Earlier design rounds: `design/ui/object-first-ux/object-model.md`,
  `design/ui/object-first-ux/round-2/decisions.md`,
  `design/ui/object-first-ux/round-3/gaps.md`, `design/ui/object-first-ux/round-3/file-project.md`,
  `design/ui/object-first-ux/round-4/revision-round-4.md` (sections 0 to 2).
- The requirements base: all 12 files in `design/designloom/personas/`, all 25 in
  `design/designloom/workflows/`, all 61 in `design/designloom/capabilities/`, read by a script
  that extracted and cross-checked their fields.
- For section 7 (graphty-element 2.3.1): `src/session/runs/{RunsApi,Run,runId,types}.ts`,
  `src/session/scope/ScopeApi.ts`, `src/session/styles/{StylesApi,selector,Layer,autoApply,repaint}.ts`,
  `src/session/{GraphSession,data,statistics,planning,query,limits}.ts`,
  `src/session/results/{types,RunResult,reading}.ts`, `src/session/selection/SelectionApi.ts`,
  `src/session/visibility/VisibilityApi.ts`, `src/constants/obsolescence-rules.ts`,
  `src/managers/{AlgorithmManager,DataManager,SelectionManager}.ts`, `src/data/{GraphStore,edgeIdentity}.ts`,
  `src/catalog/{algorithms,types}.ts`, `src/config/DataConfig.ts`, `src/Graph.ts`, `src/Node.ts`,
  `src/Edge.ts`, `src/ai/commands/QueryCommands.ts`, and the algorithm classes for Louvain,
  Leiden, label propagation, min cut and PageRank in `src/algorithms/`.
- `algorithms/src/algorithms/community/{louvain,leiden}.ts`, `graph-format/README.md`,
  `graph-format/src/types/columns.ts`, `webgpu-graph-algorithms/CLAUDE.md` (the verified-facts
  table) and `webgpu-graph-algorithms/test/kernel/determinism.test.ts`.
- `design/element-api/element-api-design.md` sections 3.2, 3.3, 4.2, 9.2, 9.3 and the
  `GraphtyDocument` envelope; `design/element-api/edge-model-and-layout-state.md` (edge-click);
  `design/ui/object-first-ux/object-model.md` section 2, `round-2/decisions.md` (rows S1 and
  T10), `round-3/history-errors.md` section 1, `proposal.md` ("Settled").
- GitHub issues in `graphty-org/graphty-monorepo`: #145 (notes and journal), #148, #149, #186
  (Compare), #197, #297, #299 (node type role), #301 (project file), #319, #337 (command
  vocabulary), #427 (undo and redo on the session), #405 and its measurement comment (the render
  ceiling), #412 (per-edge ray tests), #419 (edges as instances), #25 (arrowhead draw calls).
- For sections 7.11, 7.12 and 7.14 (identity, picking and undo coverage), 7.17 (colours) and 7.18
  (size), all at 2.3.1 on the remote `master`: `src/session/runs/runId.ts` (file header,
  `deriveRunId`), `src/session/styles/StylesApi.ts` (`toDocument`, `DEFAULT_HIGHLIGHT`),
  `src/config/GraphStyle.ts` (`GraphSelectionStyle`), `src/config/palettes/{categorical,sequential,diverging,binary}.ts`,
  `src/Node.ts` (halo and context overlays), `src/NodeBehavior.ts` (hover and click picking),
  `src/Edge.ts` (`setSelected`, `isPickable`), `src/managers/DataManager.ts` (`refuseAboveCeiling`),
  `src/session/limits.ts`, `src/session/GraphSession.ts` (`createGraphSession`, `resolveStore`),
  `src/session/selection/SelectionApi.ts` (the cap), `graphty-element/docs/guide/styling.md` and
  `algorithms.md`; the installed Babylon.js 8.43.0 declaration
  `node_modules/.pnpm/@babylonjs+core@8.43.0/node_modules/@babylonjs/core/Collisions/gpuPicker.d.ts`;
  the app's `shell/AppShell.tsx`, `shell/canvas/DataTableDrawer.tsx`, `shell/panel/ExplorePanel.tsx`,
  `shell/ShellContext.tsx`, `shell/insights/insightsMemory.ts`, `shell/analysis/runs.ts`,
  `shell/panel/panelButtons.tsx` and `compact-mantine/src/constants/panel.ts`;
  `design/element-api/element-api-design.md` section 4.6.3a (the `GraphtyDocument` envelope);
  `design/ui/object-first-ux/round-3/{history-errors,file-project}.md`; the capability
  `design/designloom/capabilities/large-graph-rendering.yaml` and every persona file.
- For sections 7.19 to 7.29, at 2.3.1 on the remote `master`: `src/session/query.ts`,
  `src/session/styles/{predicate,sources}.ts`, `src/session/runs/{RunsApi,Run,runId,types}.ts`,
  `src/session/results/RunResult.ts`, `src/session/statistics.ts`, `src/session/types.ts`,
  `src/catalog/{algorithms,types}.ts`, `src/algorithms/{Betweenness,Closeness}CentralityAlgorithm.ts`,
  `src/algorithms/{ConnectedComponents,StronglyConnectedComponents}Algorithm.ts`,
  `src/data/{GraphMLDataSource,GEXFDataSource,GraphStore,ingest}.ts`, `src/graphty-element.ts`
  (the `session` getter), the `this.accelerated(...)` calls in `src/algorithms/`;
  `graph-format/src/builder/graph-builder.ts`, `graph-format/src/types/builder.ts`,
  `graph-io/src/common/direction.ts`, `graph-io/src/formats/graphml/exporter.ts`;
  `design/element-api/element-api-design.md` sections 1.4, 3.2, 3.3, 4.3.3, 4.6.3a, 4.8, 4.15.3,
  9.2, 9.3 and the `ViewPreset` / `AnnotationSet` types; `design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md`
  and the CPU measurements behind it (`tmp/gpu-cost-model/cpu-measurements.md` in the main
  checkout); `design/ui/object-first-ux/object-model.md` sections 8 and 11 and `round-2/decisions.md`
  (row P4); the app's `shell/AppShell.tsx` (the `drawer` block) and `shell/canvas/CanvasRegion.tsx`;
  issues #100, #145, #147, #191, #297, #301, #309, #310, #319, #329, #330, #389, #419, #420, #421,
  #426 and #427; the workflow files for dataset names.
- Measurements on the published npm package `@graphty/graphty-element@2.3.1` (2026-09-26): the
  retained heap of one result in Node 22, through the package's own result factory; run times in
  headless Chromium 143 through Playwright, with the element's GPU path off. The scripts live in
  no repository file; each table says exactly what was run, so it can be repeated.

---

## 1. What graphty-element already has, by its published names

### 1.1 Entry points

The package publishes a map of entry points rather than one barrel. Five of them are enforced
by a test to stay free of Babylon.js, Lit and the DOM so they run in Node.

| Entry point | What it carries | Node-safe |
|---|---|---|
| `.` | the custom element, the `Graph`, `Node` and `Edge` classes, style config classes and defaults, palettes, event types, managers, screenshot and video types, errors | no |
| `./session` | `createGraphSession`, the session types, runs, results, scope, selection, visibility, cost and plan, styles, capabilities, errors, `recommendLayout` | yes |
| `./schema` | the style vocabulary as data: identity types, `Channel`, `LayerSpec`, `StyleDocument`, node shapes, style defaults, palettes, colour-blind helpers | yes |
| `./catalog` | every descriptor table: algorithms, layouts, formats, palettes, cameras, log sinks, scales, channels | yes |
| `./extend` | the six registration points and the option-descriptor mechanism | yes |
| `./format` | read-only graph snapshot vocabulary re-exported from `@graphty/graph-format` | yes |
| `./commands` | reserved and deliberately EMPTY: "Nothing of that exists yet" | -- |
| `./logging`, `./react`, `./webgpu`, `./ai`, `./bundle` | logging, a React wrapper, the optional GPU accelerator hook, the AI assistant, a no-bundler build | no |

### 1.2 The custom element

Tag `graphty-element`, class `Graphty`. HTML attributes and properties (each a contract):

| Group | Attribute (property) |
|---|---|
| Data in | `node-data` (`nodeData`), `edge-data` (`edgeData`), `data-source` (`dataSource`), `data-source-config` (`dataSourceConfig`) |
| Field mapping | `node-id-path`, `edge-src-id-path`, `edge-dst-id-path`, `edge-id-path`, `node-label-path`, `edge-weight-path`, `position-scale`, `repeated-edges`, `directed` (`true`, `false` or `"auto"`) |
| Layout | `layout`, `layout-config`, `layout-2d`; property-only `layoutBehavior` |
| View | `view-mode` (`"2d"`, `"3d"`, `"vr"`, `"ar"`), `starting-camera-distance`; property-only `background`, `selectionStyle`, `xr` |
| Runs at load | `run-algorithms-on-load`; property-only `algorithmsOnLoad` |
| Other | `enable-detailed-profiling`; property `acceleration` (the GPU policy) |

Methods on the element fall into these families, all public today:

- **Session doors**: `session` (the `GraphSession`), `run(algorithm, params, options)`,
  `select(target, op)`.
- **1.x-style data and query verbs**: `addNode(s)`, `addEdge(s)`, `removeNodes`, `updateNodes`,
  `setData`, `clearData`, `addDataFromSource`, `loadFromUrl`, `loadFromFile`, `getNode(s)`,
  `getNodeCount`, `getEdgeCount`.
- **Single-node selection (1.x)**: `selectNode`, `deselectNode`, `getSelectedNode`,
  `isNodeSelected` -- beside the set-based `session.selection`.
- **Pinning**: `pin(ids)`, `unpin(ids)`, `isPinned(id)`, `pinnedNodes`.
- **Algorithms (1.x)**: `runAlgorithm`, `applySuggestedStyles`, `getSuggestedStyles`.
- **Layout**: `setLayout`, `waitForSettled`, `waitForStableFrame`, `isFrameStable`.
- **Camera**: `getCameraState`, `setCameraState`, `setCameraPosition`, `setCameraTarget`,
  `setCameraZoom`, `setCameraPan`, `resetCamera`, `zoomToFit`, `saveCameraPreset(name)`,
  `loadCameraPreset`, `getCameraPresets`, `exportCameraPresets`, `importCameraPresets`,
  `resolveCameraPreset`, `applyCameraView`, `setCameraMode`.
- **View mode and XR**: `getViewMode`, `setViewMode`, `isVRSupported`, `isARSupported`,
  `setXRConfig`, `getXRConfig`, `exitXR`.
- **Capture**: `captureScreenshot`, `canCaptureScreenshot`, `captureAnimation`,
  `cancelAnimationCapture`, `isAnimationCapturing`, `estimateAnimationCapture`.
- **AI and voice**: `enableAiControl`, `aiCommand`, `getAiStatus`, `startVoiceInput`, and more.
- **Internals exposed**: `graph`, `getStyles`, `getDataManager`, `getLayoutManager`,
  `getSelectionManager`, `getScene`, `getMeshCache`, `getNodeMesh`, `worldToScreen`,
  `screenToWorld`, `setInputEnabled`, `shutdown`.

### 1.3 The session (`el.session`, or `createGraphSession()` headless)

`GraphSession` members: `data`, `runs`, `results`, `scope`, `selection`, `visibility`,
`styles`, `positions`, `seededNodeCount`, `status`, `catalog`, `config`, `capabilities`,
`snapshot()`, `fingerprint()`, `run(command)`, `estimate(command)`, `plan(command)`,
`dispose()`, and a typed event map (1.12).

Its own header states what is NOT there: "`createComparison`, and the layout, camera, export
and journal verbs that hang off a session. They are absent rather than stubbed." In 2.0.0 the
scope and filter forms that need a query engine (`{ where }`, a `text` selection target, an
`expression` filter) were refused with `E_UNSUPPORTED`. In 2.3.1 they work: one query engine
(`src/session/query.ts`) serves scopes, selections, filters and style selectors with the same
compiler, although issue #149, which reports the refusal, is still open. `session.types.ts`
adds: "What is deliberately NOT here yet: the layout transport, notes and the journal."

### 1.4 Identities

| Type | Definition | Notes |
|---|---|---|
| `NodeId` | `string \| number` | as loaded |
| `EdgeId` | `string` | ALWAYS minted by the element (a decimal counter), even when the file names its edges; see 7.15 |
| `RunId` | `string` matching `/^[a-z][a-z0-9_-]*$/` | "stable, selector-safe and author-assignable" (`StartOptions.as`); a derived id is designed to be persisted in saved layers, recipes and templates, and does not depend on the data (7.11) |
| `LayerId` | `string` | element-minted; "never an array index" |
| `ScopeId` | `string` | the id of a saved scope; `selection.promote(name)` returns one |
| `JournalId` | `string` | declared on `Run.journalId`; the journal itself does not exist |
| `Path` | `string` | a JMESPath expression over the result root |
| `Query` | `string` | a JMESPath predicate |

There is no identity for an object, a set, a group, a view, a note or a project.

### 1.5 Data

- **Records**: `NodeRecord { id, ...attributes }`, `EdgeRecord { id, source, target, ...attributes }`.
- **Data config keys** (`DataConfig`): `nodeIdPath` (default `"id"`), `nodeLabelPath`,
  `nodeWeightPath`, `nodeTimePath`, `edgeSrcIdPath`, `edgeDstIdPath`, `edgeIdPath`,
  `repeatedEdges` (default `"keep"`), `edgeWeightPath` (default `"weight"`), `edgeTimePath`,
  `positionScale`, `idCoercion`, `directed` (default `"auto"`), `algorithms`, `knownFields`.
- **Graph statistics** (`session.data.statistics()`): `nodeCount`, `edgeCount`, `density`,
  `directedness` (`directed | undirected | mixed | unknown`) with `directednessSource`,
  `weighted`, `selfLoopCount`, `repeatedEdgeCount`, `degreeRange`, `meanDegree`, and
  `components` (`count`, `sizes`, `largestSize`, `isolatedCount`, `componentOf(id)`).
  There is no degree distribution here: a degree histogram needs a `degree` run and
  `RunResult.histogram("value")`. The statistics always describe the whole loaded graph, never
  the filtered view (7.7, 7.8).
- **Attributes** (`AttributeDescriptor`): `path`, `token`, `name`, `plainName`,
  `technicalName`, `kind` (`node | edge`), `type` (one of `ATTRIBUTE_TYPES`: `string`,
  `number`, `integer`, `boolean`, `time`, `category`, `mixed`), `origin`
  (`imported | joined | computed | result`), `completeness`, `uniqueCount`, `min`, `max`,
  `sampleValues`, `runId`.
- **Import report** (`ImportReport`, `session.data.lastImport()`), and the status counts
  (`nodes`, `edges`, `visibleNodes`, `visibleEdges`).
- **Positions** (`session.positions`, type `ElementPositions`): `count`, `placedCount`,
  `pinnedCount`, `isPinned`, `setPinned`, `isPlaced`, `read`, `write`. A pin is a per-node flag
  on the positions, not a set.
- **Formats**: `KNOWN_FORMAT_IDS` = `json, csv, graphml, gexf, gml, dot, pajek, sif, cx2`. Seven
  import; `sif` and `cx2` are listed as unserved. `canExport` is false for every format: the
  element exports no data today. The element reads files with its own `DataSource` classes and
  does not depend on `@graphty/graph-io`, which has its own importers and exporters.

### 1.6 Runs and results

- **Algorithm keys** (`KNOWN_ALGORITHMS`, 25): `degree, betweenness, closeness, pagerank,
  eigenvector, katz, hits, louvain, leiden, label-propagation, components, shortest-path,
  all-pairs-distance, all-paths, max-flow, min-cut, k-core, clustering-coefficient,
  girvan-newman, bfs, dfs, kruskal, prim, bipartite-matching, link-prediction`. Twenty-one
  ship; `all-paths`, `k-core`, `clustering-coefficient` and `link-prediction` are reserved names
  with no implementation. 1.x keys survive as `legacyKeys` (`dijkstra`, `bellman-ford`,
  `floyd-warshall`, `connected-components`, `scc`), and the app notes the run registry "still
  answers to dijkstra and scc".
- **Algorithm categories**: `centrality, community, path, flow, structure, prediction`.
- **Run**: `id, label, algorithm, params, scope, status, progress, determinate, cancellable,
  queuePosition, startedAt, durationMs, partial, stale, engine, fields, shape, caveats, result,
  error, record, journalId, cancel(), rerun(), suggestEncodings()`. `RunRecord` is its
  serialisable form.
- **Run status** (`RUN_STATUSES`): `queued, running, succeeded, failed, canceled`. **Run phase**:
  `queued, start, progress, end`. **Queue policy**: `append, replace, now`.
- **Staleness**: `StaleNote { ranOn, nowVisible, scopeSpec }`. **Caveats**: `exact, sampleSize,
  seed, converged, iterations, componentScope, filterScope, windowScope, direction, weight,
  precision, method, partialReason, notes`. `RunDirection` = `directed | undirected | as-loaded`.
- **Start options**: `scope, seed, timeBoxMs, as, style, exact, sample` plus `signal,
  onProgress, queue, dryRun, transitionMs`. `runs.batch(specs)` runs several.
- **Result root**: every result is addressable at `results.<runId>.<field>` (`RESULT_ROOT`
  = `"results"`), readable through `session.results` and in any selector or binding.
- **Result shapes** (`RESULT_SHAPES`, 11 values; the doc comments say "ten"): `node-metric,
  edge-metric, community, layered-grouping, category-table, path, node-set, edge-set, pair-list,
  temporal, fact`. Each shape fixes its field names:

| Shape | Per-element fields | Graph fields | Layer role |
|---|---|---|---|
| node-metric, edge-metric | `value, rank, percentile` | `min, max, median, mean, measured, normalization, tiedAtMin` | encoding |
| community | `group, groupSize` | `groupCount, sizes`, optional `modularity` | encoding |
| layered-grouping | `level, levelSize` | `levelCount, sizes` | encoding |
| category-table | `category, score, rank` | `categories` | encoding |
| path | `onPath, order` (edges: `onPath`) | `length, cost, hops` | highlight |
| node-set, edge-set | `in` | `count` | highlight |
| pair-list | -- | `pairs` | none |
| temporal | -- | `steps, series, rates, changeThreshold` | none |
| fact | -- | algorithm's own | none |

- **Reading a result**: `RunResult.node(id)`, `edge(id)`, `column`, `ranking`, `histogram`,
  `summary`, `reading()` (a plain-language sentence).
- **Cost**: `session.estimate(command)` (synchronous), `session.plan(command)`, `COST_CLASSES`
  = `instant, iterative, heavy, cubic, unbounded`; `DEFAULT_LIMITS` in 2.0.0: `largeGraphThreshold`
  10,000, `renderCeiling` 200,000, `selectionCap` 5,000, `edgesDrawn` 500,000,
  `approximateAboveNodes` 2,000. In 2.3.1 `renderCeiling` is 50,000 nodes and `edgesDrawn`
  100,000 edges, and both are ENFORCED: a load past either fails whole with `E_TOO_LARGE`
  (`src/session/limits.ts`, `src/managers/DataManager.ts` `refuseAboveCeiling`). So the element
  with a view holds at most 50,000 nodes today, not a million. The ceiling is a temporary
  renderer limit, and a headless `createGraphSession()` does not enforce it (7.18).
  `approximateAboveNodes` is published but nothing approximates (7.9).

### 1.7 Four grammars for "which elements"

The element already has four overlapping ways to name a collection of elements. The owner has
decided there will be one set vocabulary; this is what exists before that decision lands.

| Grammar | Where | Arms |
|---|---|---|
| `Scope` | what a run, layout or export may look at | `"visible"`, `"graph"`, `"selection"`, `"largest-component"`, `{ set: ScopeId }`, `{ where: Query }`, `{ nodes: NodeId[] }` |
| `Selector` | what a style layer matches | `{ match: "expression", where }`, `{ match: "has", path }`, `{ match: "ids", nodes, edges }`, `{ match: "everything" }`, and since 2.3 `{ match: "top", path, n }`; no arm names a saved scope (7.2) |
| `SelectionTarget` | what `selection.apply` adds | ids, `neighborsOf` + `depth` (1 to 3) + `direction`, `{ where }`, `{ text, mode }`, `{ ids }`, `{ scope }`, `{ top: { run, field, n } }`, `{ above: { run, field, threshold } }`, `{ edgesBetween }`, `{ invert }` |
| `Filter` | what `visibility.set` shows | kinds `expression, range, categories, degree, component, neighborhood, edges, all, any, not`, plus a separate `TimeWindow { attribute, from, to, step }` |

Set operations: `SetOp` = `replace, add, remove, toggle, intersect` (every published set-operation
name across the packages is listed in 7.6). A saved scope is
`SavedScope { id, name, spec, bound }` (`scope.save`, `list`, `remove`). The selection holds two
sets (nodes, edges), caps at 5,000, and `promote(name)` turns it into a saved scope. Only
`Scope` has a saved, named form; nothing else can be referenced by id. `Scope` has no edge
list and no run-result arm, so an edge set (a path, a spanning tree) cannot be saved as a scope.

### 1.8 Style layers

- **The stack**: `session.styles` holds layers bottom first (index 0 paints first). Verbs:
  `list, get, validate, add, update, remove, move, removeBySource, encode, highlight, legend,
  settled, explain, resolveToStatic, applyTemplate, toDocument`. Writes return a `Run`.
- **Layer**: `id, name, kind, source, locked, enabled, target (node | edge), selector, set,
  encode, userData`. `LayerKind` = `base, encoding, highlight, custom`.
- **Layer source** (`LayerSource`): `{ by: "element", reason: "default" | "selection" | "hover"
  | "notes" }`, `{ by: "run", runId, algorithm, params }`, `{ by: "user" }`,
  `{ by: "template", templateId }`, `{ by: "plugin", name }`. Element layers are locked. Only
  the reason `"default"` is ever used: the stack holds exactly two element layers, "Node
  defaults" and "Edge defaults". `"selection"`, `"hover"` and `"notes"` are published values
  that no layer carries (7.2).
- **Channels** (`Channel`, 35): node `color, size, shape, label, labelStyle, tooltip,
  tooltipStyle, opacity, outline, glow, glowStrength, wireframe, flat, marker`; edge `color,
  width, opacity, style, patternCount, curvature, arrowHead, arrowHeadSize, arrowHeadColor,
  arrowHeadOpacity, arrowHeadText, arrowHeadTextStyle, arrowTail, ...Tail variants,
  animationSpeed, label, labelStyle`. `CHANNEL_DESCRIPTORS` publishes them as data.
- **Bindings**: `{ value }` or `{ by: Path, scale, palette, domain, clamp, range, map, other,
  overflow, missing, reverse, midpoint, bins, exponent }`. Scales: `linear, log, neglog10,
  sqrt, pow, bins, quantile, ordinal, passthrough`. Overflow: `other, shape, extend`.
- **Palettes** (`KNOWN_PALETTE_IDS`, 18): 7 sequential, 5 categorical (default `okabe-ito`), 3
  diverging, 3 highlight pairs.
- **Saved form**: `StyleDocument { version: 1, layers, palettes }` is the ONLY versioned
  document the element publishes today. `ThemeDescriptor` names a whole style document.
- **Two rules the element enforces**: `encode()` keeps ONE analysis layer per run and channel,
  replacing in place. `highlight()` is EXCLUSIVE: "every highlight layer already in the stack
  is taken away first, because a second route or a second chosen set REPLACES the first"
  (`src/session/styles/StylesApi.ts` lines 32 to 35 and 311; `src/session/results/types.ts`
  `ResultLayerRole`; `src/session/styles/autoApply.ts` line 28).

### 1.9 The catalogue

Descriptor types, each with `plainName` and `technicalName` beside the key:
`AlgorithmDescriptor` (`key, category, shape, fields, options, costClass, complexity,
approximable, requires`), `LayoutDescriptor`, `FormatDescriptor`, `PaletteDescriptor`,
`CameraDescriptor`, `LogSinkDescriptor`, `ScaleDescriptor`, `ThemeDescriptor`,
`FunctionDescriptor`, `FieldDescriptor`, `OptionDescriptor` (types `number, integer, boolean,
string, enum, seed, node-id, node-set, attribute, partition, ordering, unknown`, and data-bound
limits such as `graph.maxDegree`), `MetricAvailability` (per algorithm: available, reason,
cost, `hasRun`, `runIds`).

The algorithm `plainName` values are data inside a published table: `degree` "Connections",
`betweenness` "Bridges", `closeness` "Reach", `pagerank` "Influence", `eigenvector` "Influence
by association", `katz` "Influence at a distance", `components` "Separate pieces",
`louvain` "Communities", `shortest-path` "Shortest route", `bfs` "Steps away", `kruskal`
"Cheapest connecting network", `min-cut` "Weakest link", `max-flow` "Most that can flow",
`bipartite-matching` "Best pairing". The owner has ruled out exactly these friendly substitutes
("keep betweenness, keep components, degree, PageRank"). They are data, not type names, so
correcting them is a content change in the element, not a breaking type change.

### 1.10 Layout

- **Public layout ids** (`KNOWN_LAYOUT_IDS`, 12): `force, force-2d, circular, radial,
  hierarchical, grid, shell, spectral, bipartite, layers, fixed, random`. `radial` and `grid`
  are unserved.
- **Engine names** (16): `ngraph, d3, forceatlas2, spring, kamada-kawai, arf, circular, shell,
  spiral, spectral, planar, bfs, bipartite, multipartite, fixed, random`.
- **The element's `layout` property and registry answer to ENGINE names**, while the catalogue
  publishes arrangement ids; the property's own doc comment lists `ngraph`, `d3-force`,
  `grid`, `hierarchical`. The app keys its picker by engine for this reason
  (`graphty/src/data/layoutMetadata.ts`).
- Layout `plainName` values are also friendly inventions: "Spread Out", "Ring", "Concentric
  Rings", "Natural Grouping", "No Crossings", "Scattered", "Tree", "Two Columns", "Columns by
  Group", "Keep Positions".
- `recommendLayout(...)` in `./session` picks an arrangement from the graph's shape.
- There is no layout transport (play, pause, step) on the session.

### 1.11 Camera and view

- `ViewMode` = `"2d" | "3d" | "ar" | "vr"` (`VIEW_MODE_VALUES`, default `"3d"`). A separate
  `DrawingMode` = `"2d" | "3d"` for what a camera view can be computed in, and a separate
  `layout-2d` attribute for flat layout.
- Built-in camera views (`KNOWN_CAMERA_IDS`): `fitToGraph, topView, sideView, frontView,
  isometric` (camelCase, unlike every other id list). Extension: `registerCameraView`.
- `CameraState` is the saved camera. User-saved cameras are "camera presets"
  (`saveCameraPreset`, `exportCameraPresets` returning `Record<string, CameraState>`). A preset
  name that shadows a built-in view is refused. A preset holds a camera only: no view mode, no
  visibility, no layout.

### 1.12 Events: three naming conventions

| Surface | Convention | Examples |
|---|---|---|
| Session event map | `noun:verb-past` | `run:changed`, `selection:changed`, `visibility:changed`, `style:changed`, `style:problem` |
| `Graph` events (`on`, `addListener`) | `noun-verb-past` | `selection-changed`, `style-changed`, `data-loaded`, `graph-settled`, `node-click`, `camera-state-changed`, `data-loading-complete` |
| DOM `CustomEvent` | `graphty-noun-verb-present` | `graphty-selection-change`, `graphty-run-change`, `graphty-visibility-change`, `graphty-node-click`, `graphty-capabilities-change` |

There is no edge click or hover event (edges are not pickable) and no event for objects, notes
or the project.

### 1.13 Errors and extension

- `GraphtyError` with 43 codes, including `E_UNSUPPORTED`, `E_PROTECTED`, `E_UNKNOWN_RUN`,
  `E_SCOPE_EMPTY`, `E_CAP_EXCEEDED`, `E_NO_WEBGPU`, `E_TOO_LARGE`, `E_UNSTABLE_RUN_ID`.
- Six extension points, "the list is closed": palette, file format, camera view, layout,
  algorithm, log destination (`./extend`). Registration is global with no unregister.

---

## 2. Concepts that exist only in the app

These live in `graphty/src/` and have no element counterpart. Several are app-side graph logic
or copies of element facts, which the root `CLAUDE.md` forbids; they are marked.

| App concept | Where | Element counterpart | Note |
|---|---|---|---|
| Activities: Data, Explore, Analyze, Style, Present, AI (+ Settings, Help) | `shell/types.ts` `PrimaryActivityId` | none | chrome; "Present" holds image and data export |
| Inspector selection kinds: `node, edge, multiple, none, algorithm-result, style-layer, pattern-match, cleaning-step` | `shell/types.ts` `SelectionKind` | partial: node, edge, run, layer exist; pattern match and cleaning step do not | "cleaning step" and "pattern match" name element features that do not exist |
| Graph summary with Counts, Schema, Attributes, "Most connected" | `inspector/GraphSummary.tsx`, `inspectorConstants.ts` | `data.statistics()`, `data.attributes()` | reads element values; labels invent words (see section 5) |
| Node-type and edge-type "Schema" rows | `inspectorConstants.ts` | none: the element has no node-type role | the reading template notes "a node-type role ... exists in neither package" |
| Plain-language readings for the graph, communities and node metrics | `shell/readings/*.ts` | `RunResult.reading()`; no graph-level reading | duplicate prose layer; app templates are spec-driven copy |
| Insights strip (suggestion cards, eight-rule table, retirement) | `shell/insights/` | `catalog.metrics()` for availability and cost | the owner has since ruled out suggestion cards |
| Cost gate policy (ask above 10 s, warn above 30 min) | `analysis/metricCost.ts` | `session.estimate` supplies the number | policy is legitimately the app's |
| Label budget at load (top N by degree) | `defaults/loadDefaults.ts` | none; would be a top-N selector | product default |
| Undo and history store (depth 50, categories such as "node merges", "cell edits", "note edits") | `topbar/undoStore.ts` | none; `Run.journalId` placeholder only | "PRODUCERS ARE NOT CONNECTED. Nothing in the application pushes to this store yet" |
| Canvas legend blocks | `canvas/legendChannels.ts` | `styles.legend()` | now reads the element; keeps a five-category cap |
| Time slider | `canvas/TimeSlider.tsx` | `visibility.setWindow` | chrome over the element's window |
| Views menu, three view presets, zoom | `toolbar/ViewsMenu.tsx`, `graphCommands.ts` | camera methods | uses 1.x `selectNode`/`deselectNode` |
| Neighbour list in the node inspector | `analysis/graphShape.ts` | none: "the element's data surface still publishes no neighbour verb" | app reads endpoints off its own record copy: a workaround |
| Layout picker keyed by engine; hard-coded `grid` (enabled), `radial` and `sugiyama` ("Coming") | `panel/StylePanel.tsx` lines 75 to 78 | catalogue says `grid` and `radial` are unserved; no `sugiyama` engine | hard-coded list outside the catalogue; offers a layout the element refuses |
| Algorithm list expanded back over legacy keys | `components/algorithmCatalog.ts` | `BUILT_IN_ALGORITHMS` | workaround for the run registry not folding keys |
| Data export targets (CSV, CX2, GEXF, GraphML, JSON) | `panel/PresentPanel.tsx` | `canExport: false` everywhere | handlers are wired to no-ops |
| Case notes ("Add a case note") and a note count in the status bar | `inspectorConstants.ts`, `StatusBarNotes` | layer source reason `"notes"` and a `node.marker` channel only | no note model anywhere |
| Recipes ("Save as recipe...") | `panel/AnalyzePanel.tsx` | none; commands entry point is empty | a menu row only |
| Settings: AI providers, Appearance, Data management, Defaults, Extensions, Keyboard shortcuts, Performance | `panel/SettingsOverlay.tsx` | `capabilities`, `DEFAULT_LIMITS` | reader preferences, legitimately the app's |
| Keybinding table | `shell/bindings.ts` | none | legitimately the app's |

---

## 3. Concepts in the earlier design rounds that are not in code

The object-first rounds (`design/ui/object-first-ux/`) and the element API design
(`design/element-api/element-api-design.md`) name these. None exist in code. The right column
says whether the concept would become a published contract if built.

| Concept | Where it is described | Would it be a published contract |
|---|---|---|
| **Object tree** (`session.objects`: list, create, move, rename, setVisible, setLocked, setScope, rerun, remove, focus, `objects:changed`) with kinds Dataset, Set, Group, Measure, Grouping | `object-model.md` sections 2 and 11 | yes; the owner has decided the element owns it |
| **Project file** (`objects.save({ data: "include" \| "link" })`, `openProject(doc)`, a `.graphty` file, include or link the data, restore report) | `round-3/file-project.md` section 4 | yes; the file shape is the largest one-way door |
| **One set vocabulary**: `Scope` gains filters, top-N, above-threshold, a group, an edge list, a run-result set and combinators; a layer selector accepts a scope | `round-2/decisions.md` (settled decision 2), `object-model.md` section 11 | yes; the owner has decided it |
| **Stacking highlights** (a path is an edge layer that stacks) | `round-2/decisions.md` (settled decision 3) | a behaviour change in the element (today exclusive) |
| **Object states**: current, computing, waiting, stale, failed, frozen | `object-model.md` section 5 | yes; runs have only five statuses and a stale note |
| **Nesting means "computed within the parent"**; **linked** derived objects (Top N, Above, Combine); frozen on deleted input | `object-model.md` section 6 | yes, as tree semantics |
| **Precedence per channel**, "Covered by X on N of M" | `object-model.md` section 6.2 | partly exists: `styles.explain` |
| **Focus** (set the one visibility mask to an object's members) | `object-model.md` section 7 | built on `visibility.set` |
| **Group identity across re-runs** (match by overlap), group names | `object-model.md` section 5 | yes |
| **Saved View** (camera + view mode + mask) and **Compare** (two canvases) | `object-model.md` sections 4.7 and 9; `element-api-design.md` 3.3 (`createComparison`, `shareDataWith`) | yes; today a camera preset holds a camera only |
| **Notes** anchored to an element, object or point; markers | `object-model.md` 2.2; `element-api-design.md` 4.15.3 gives note storage and text to the element, while its 9.2 still says the consumer; issues #145 and #427 side with 4.15.3 | yes; element-owned, resolved in 7.28 |
| **Journal, undo and redo, recipes, methods text** | `round-2/decisions.md` S1 puts undo in the element; `element-api-design.md` 9.2 puts the undo stack with the consumer and the journal and inverses in the element; issue #427 puts `session.undo()`, `redo()` and `history` in the element | yes; element-owned by #427 (section 6, finding 5) |
| **Commands** (plain-JSON form of every verb) | `element-api-design.md` 3.4 | yes; the entry point is reserved and empty |
| **Session layout transport** (play, pause, step, settle) | `element-api-design.md` 3.2 | yes |
| **Neighbour verb** `session.data.neighbours(id, { direction })` | `round-2/decisions.md` R1 | yes (small) |
| **Selection by value band** `{ between: { run, field, min, max } }` | `round-2/decisions.md` R2 | yes |
| **`scope.statistics(spec)`**, **graph-level `statistics().reading()`** | `round-2/decisions.md` I8, I9 | yes |
| **`backend` on runs and estimates** (GPU or CPU) | `round-2/decisions.md` T9 | yes |
| **Interval time windows** (start and end, spells) | `round-2/decisions.md` L4 | yes |
| **Several datasets in one session**, combine by id | `round-3/file-project.md` section 7; `element-api-design.md` 9.3 (deferred to 2.1) | yes |
| **Edge picking**, edge click and hover | named as the prerequisite for an edge tooltip in `owner-decisions-2026-09-22.md` section 2; `edge-click` deleted until picking exists (`edge-model-and-layout-state.md`); no element issue schedules it (7.12) | yes (events) |
| **Marquee selection**, **lock mask for picking**, **fit camera to a scope** | `object-model.md` section 11 | yes (small each) |
| **Query engine and text search** (`{ where }`, `text`) | `object-model.md` 11 (issue #149) | the types are published; the engine is not built |
| **Computed attributes** (formula) | `object-model.md` 10; `AttributeDescriptor.origin` already has `"computed"` | yes |
| **Data editing**: cell edits, merge nodes, delete elements, join a table, map identifiers | `round-3/gaps.md` cluster 3 | yes |

Two words in these rounds were later overruled by the owner: friendly metric names (the rounds
use "Bridges", "Influence", "Connections", "Separate pieces" throughout) and the rail (removed
in one round, restored in the next).

---

## 4. The requirements base

The personas, workflows and capabilities are YAML files in `design/designloom/`. They validate
a design; they do not dictate it.

### 4.1 Personas (12)

| Persona | Role | Expertise, literacy, frequency | Workflows |
|---|---|---|---|
| Explorer Elena | new graph user | novice, none, as needed | First Exploration, Visual Exploration, First-Time Onboarding, Data Import |
| Analyst Alex | intermediate graph analyst (Gephi, NetworkX) | intermediate, moderate, weekly | First Exploration, Visual Exploration, Iterative Analysis, Community Analysis, Path Investigation, Anomaly Detection, Findings Communication, Hub Investigation, Data Import, Network Evolution |
| Expert Emma | power user, keyboard-driven | expert, advanced, daily | First Exploration, Visual Exploration, Iterative Analysis, Community Analysis, Findings Communication, Data Import, Network Evolution |
| Fraud Detection Analyst | financial crime investigator | intermediate, moderate, daily | First Exploration, Community Analysis, Path Investigation, Fraud Ring, Anomaly Detection, Findings Communication, Hub Investigation |
| Intelligence Analyst | criminal network analyst | intermediate, moderate, daily | First Exploration, Path Investigation, Criminal Network, Findings Communication, Hub Investigation |
| Cybersecurity Threat Analyst | SOC analyst, threat hunter | expert, advanced, daily | Threat Hunting, Anomaly Detection |
| Bioinformatics Researcher | computational biologist | expert, advanced, weekly | First Exploration, Iterative Analysis, Drug Target, Network Evolution, and the five genomics workflows |
| Genomics Cytoscape User | genomics postdoc used to Cytoscape | intermediate, intermediate, weekly | the five genomics workflows (its own list also names First Exploration and Data Import, which those workflows do not list back) |
| Knowledge Graph Engineer | ontologist, data architect | expert, advanced, daily | Knowledge Graph Construction |
| Marketing Network Analyst | social network analyst | intermediate, moderate, weekly | Community Analysis, Influencer Identification |
| ML Engineer, Recommendation Systems | ML engineer | expert, advanced, daily | Graph-Based Recommendation |
| Supply Chain Network Analyst | supply chain risk manager | intermediate, moderate, weekly | Supply Chain Risk |

Recurring frustrations across personas: too many clicks and hidden features (Alex, Emma); no
way to save, annotate or share investigation state (Alex, Intelligence, Genomics); identifier
mismatches and data joins (Genomics, Knowledge Engineer, Supply Chain); scale beyond millions of
elements (Marketing, ML, Cybersecurity); explaining metrics to non-experts (Marketing);
overwhelming options and unclear terms (Elena).

### 4.2 Workflows (25), each goal in one line

| Workflow | Goal | Personas |
|---|---|---|
| First Exploration - Quick Data Assessment | understand an unfamiliar dataset: is it suitable, what is wrong with it, first hypotheses | Elena, Alex, Emma, Fraud, Intelligence, Bioinformatics |
| Visual Exploration - Overview to Detail | navigate the picture to build a mental map before targeted analysis | Elena, Alex, Emma |
| Iterative Analysis Cycle | test a hypothesis by repeated metric runs, filters and comparison | Alex, Emma, Bioinformatics |
| Community Analysis | find groups, say what defines each, see how groups relate | Alex, Emma, Fraud, Marketing |
| Path Investigation | see how two entities are connected and what the paths reveal | Fraud, Intelligence, Alex |
| Fraud Ring Investigation | from one flagged entity, find its ring and document evidence | Fraud |
| Threat Hunting | query for suspicious patterns before an alert exists | Cybersecurity |
| Drug Target Discovery | find proteins central to disease pathways and druggable | Bioinformatics |
| Criminal Network Analysis | map an organisation's key players, hierarchy and weak points | Intelligence |
| Influencer Identification | find people who amplify messages, by several kinds of influence | Marketing |
| Supply Chain Risk Assessment | find single points of failure and model what-if removals | Supply Chain |
| Anomaly Detection | find entities that deviate from expected structure | Fraud, Cybersecurity, Alex |
| Knowledge Graph Construction | integrate sources into one graph and validate it | Knowledge Engineer |
| First-Time User Onboarding | load a first graph and accomplish something meaningful | Elena |
| Findings Communication | produce pictures, legends and reports for non-experts | Alex, Emma, Fraud, Intelligence |
| Graph-Based Recommendation | use link prediction and neighbourhoods to recommend | ML Engineer |
| Hub Investigation | decide whether high-degree nodes are important, problematic or artefacts | Alex, Fraud, Intelligence |
| Data Import and Validation | get data in and catch quality problems | Elena, Alex, Emma |
| Network Evolution Analysis | track how a network changes over time | Alex, Emma, Bioinformatics |
| Gene List to Interaction Network with Expression Overlay | turn a gene list into a network and paint measurements on it | Genomics, Bioinformatics |
| Cluster and Functionally Annotate a Molecular Network | split into modules and label what each module does | Genomics, Bioinformatics |
| Enrichment Map - Pathway Similarity Network | collapse many pathways into themes via a similarity network | Genomics, Bioinformatics |
| Hub Gene Identification and Ranking | defend a top-10 hub list with more than one measure | Genomics, Bioinformatics |
| Condition Comparison - Disease vs Control Networks | compare two networks: shared, specific, rewired | Genomics, Bioinformatics |
| Reproducible Session and Network Publication | freeze an analysis to reopen, reproduce and hand to reviewers | Genomics, Bioinformatics |

### 4.3 Capabilities (61), grouped by their own category, with how many workflows need each

- **Interaction (15)**: filtering 18, details-on-demand 12, search 6, keyboard-shortcuts 6,
  node-selection 5, neighborhood-expansion 5, overview-minimap 5, saved-filters 5,
  tooltip-display 4, view-bookmarks 4, path-highlighting 3, temporal-navigation 3, zoom-pan 2,
  hover-highlight 2, guided-onboarding 1.
- **Analysis (21)**: community-detection 12, centrality-betweenness 8, basic-statistics 7,
  centrality-degree 6, computed-attributes 6, temporal-analysis 5, component-analysis 4,
  centrality-eigenvector 4, selection-statistics 4, centrality-closeness 3, ego-network 3,
  anomaly-detection 3, pattern-search 3, shortest-path 3, clustering-coefficient 3,
  removal-impact-analysis 3, centrality-pagerank 2, all-paths-finding 2, community-profiling 2,
  degree-analysis 2, link-prediction 1.
- **Visualization (10)**: visual-encoding-nodes 15, legend-display 6, layout-force-directed 6,
  metric-histograms 6, visual-encoding-edges 5, comparison-view 5, graph-rendering 3,
  animated-transitions 2, layout-hierarchical 1, layout-radial 1.
- **Data (6)**: data-export 10, data-import 9, data-validation 5, node-merging 4,
  data-preview 4, sample-datasets 1.
- **Export (5)**: statistics-panel 10, export-image 8, annotation 6, style-presets 3,
  report-generation 3.
- **Performance (3)**: algorithm-progress 8, large-graph-rendering 2, progressive-loading 2.
- **Collaboration (1)**: analysis-history 7.

The counts above are computed from the workflows' `requires_capabilities`. Most-needed across
all 25: filtering, node visual encoding, details on demand, community detection, statistics,
data export, data import, image export, betweenness, algorithm progress, analysis history.

### 4.4 Quality of the requirements base

- Every capability's `status` is `planned`, although most are built in the element.
- 37 of the 61 capabilities' `used_by_workflows` back-references disagree with the workflows
  that actually require them (for example community-detection lists 9 workflows; 12 require it).
- The Genomics Cytoscape User persona has an empty `goals` list, and lists two workflows that
  do not list it back.
- Capability ids use American "neighborhood" (`neighborhood-expansion`); the category
  `export` holds statistics-panel, annotation and style-presets, which are not exports.

---

## 5. Where the vocabulary disagrees

### 5.1 Across the element's own contract

| Concept | Spellings in use | Where |
|---|---|---|
| A named collection of elements | `Scope` / saved scope / `{ set: ScopeId }` / `promote` / `Selector` / `SelectionTarget` / `Filter` | section 1.7; four grammars, and a saved one is called a scope but addressed as `set` |
| Direction | `SelectionDirection` and `FilterDirection` = `in, out, all`; `RunDirection` = `directed, undirected, as-loaded`; `directed` attribute = `true, false, "auto"`; `directedness` = `directed, undirected, mixed, unknown` | four value sets for two ideas (edge direction of the graph; which way to walk) |
| Edge endpoints | `source`, `target` (records); `edgeSrcIdPath`, `edgeDstIdPath` (config) | src/dst beside source/target |
| Repeated edges | `repeatedEdges`, `repeatedEdgeCount` (element); "Parallel edges" (app) | |
| Group of a partition | shape `community`; field `group`; option type `partition`; `layered-grouping`; `components` has shape `community` and category `structure` | `components` is a community-shaped result |
| Neighbourhood | `neighborsOf` (selection), `neighborhood` (filter kind); prose and design docs spell "neighbours" | source counts: "neighbour" 43, "neighbor" 49 in `src/` |
| Cancel | run status `canceled`; `AnimationCancelledError`, `animation-cancelled` event | American and British in one API |
| Colour | identifiers `color`; prose `colour` | consistent by layer (code vs prose), but visible in plain names |
| Result shape count | 11 values; comments say "ten" | `src/catalog/types.ts`, `src/session/results/types.ts` |
| The word "view" | a renderer bound to a session ("a view"); `ViewMode`; a camera view (`CameraDescriptor`, `registerCameraView`); a camera preset (`saveCameraPreset`); `DrawingMode`; `layout-2d` | one word, four meanings; the design rounds add a fifth (a saved View) |
| Camera view ids | `fitToGraph, topView, sideView, frontView, isometric` (code); `top, side, front, isometric` (element API design 4.8) | camelCase with a "View" suffix vs short ids |
| Layout key | arrangement id (`force`, `hierarchical`) vs engine (`ngraph`, `d3`, `bfs`); the `layout` property takes engines; its doc names `d3-force`, which is neither | section 1.10 |
| Algorithm key | 2.0 keys (`shortest-path`, `components`) vs registry keys still answering `dijkstra`, `scc` | `components/algorithmCatalog.ts` header |
| Events | `selection:changed` / `selection-changed` / `graphty-selection-change` | section 1.12 |
| "notes" | `Caveats.notes` (run qualifications) vs `LayerSource.reason: "notes"` (user annotations) | same word, two meanings |
| "label" | `Run.label` (the run's name) vs a node's label | |
| Highlight | `LayerKind: "highlight"`, `styles.highlight()` (exclusive) vs owner decision that highlights stack | section 6 |

### 5.2 Between the element, the app and the design rounds

| Concept | Element | App | Design rounds |
|---|---|---|---|
| Degree | key `degree`, plain "Connections" | "Most connected (Degree centrality)", unit "links" | "Connections" |
| Betweenness | plain "Bridges", field "Bridging" | "Bridges (Betweenness centrality)" | "Bridges" |
| PageRank | plain "Influence" | "Influence (PageRank)" | "Influence" |
| Connected components | key `components`, plain "Separate pieces", scope `largest-component` | "Connected parts (components)" | "Parts", "Separate pieces" |
| Edge | edge | "links" (unit), "edges" (counts) | edge |
| Density, mean degree | `density`, `meanDegree` | "How tightly linked (density)", "Average links per node (mean degree)" | "Density", "Mean links" |
| A result | `Run`, `RunResult` | "algorithm result", "result card" | Measure, Grouping, Set |
| A style layer | `Layer` | "style layer" | "Fill", "Style" (layers never shown) |
| Visibility of a layer | `enabled` | -- | "eye", "Visible" |
| Visibility of elements | `visibility` (filter mask) | "filter", "loaded-subset" | "mask", "Showing", "Focus" |
| Export | image capture only; data `canExport: false` | "Present" activity | "Share", "Export" |
| Saved camera | camera preset | "view presets", "Views" | View (camera + mode + mask) |
| Pin | `pin()`, `isPinned` | "Pinned card", "Pin as A" (compare slot) | "Pinned" system set |
| Selection | `session.selection` (sets) and `selectNode` (one node) | uses both | element selection vs object selection |

### 5.3 In the project's own instructions

The root `CLAUDE.md` section "Algorithm Styles" still gives the 1.x selector
`algorithmResults.graphty.dijkstra.isInPath`. In 2.0 that namespace is gone: the path is
`results.<runId>.onPath` (`src/session/results/types.ts`), and the element's own source
describes `algorithmResults` only as what was replaced.

---

## 6. Findings that constrain the framework

1. **The object model is unbuilt, and so is the project file.** The only versioned saved
   document the element publishes is `StyleDocument` version 1. There is no object, set, group,
   view, note or project identity, no tree order across runs, scopes and layers, and no
   journal. The ontology can still be chosen freely at that level; the names it must live
   beside are the ones in section 1.
2. **Existing published names that the ontology will sit on**: `Run`, `RunResult`, `RunId`,
   `results.<runId>.<field>`, the 11 result shapes and their field names (`value`, `rank`,
   `group`, `level`, `onPath`, `in`, ...), `Layer` with `enabled` and `locked`, `Scope`,
   `Selector`, `SelectionTarget`, `Filter`, `SetOp`, `Channel`, `ViewMode`, `CameraState`,
   `NodeId`, `EdgeId`, `source`/`target`. The result shapes already sort results into
   measures (`node-metric`, `edge-metric`), partitions (`community`, `layered-grouping`,
   `category-table`), subsets (`path`, `node-set`, `edge-set`) and tables or facts
   (`pair-list`, `temporal`, `fact`). An ontology that matches this sorting costs no rename.
3. **Two owner decisions contradict shipped element behaviour.** Highlights are exclusive in
   code (`styles.highlight()` removes every highlight layer first, and `ResultLayerRole` says so
   in a published doc comment); the owner has decided they stack. And the "one set vocabulary"
   does not exist: four grammars do. Both are element changes, not app changes.
4. **The element publishes friendly metric and layout names the owner has ruled out**
   ("Bridges", "Influence", "Separate pieces", "Spread Out", "Natural Grouping"). They are data
   values, so fixing them in the element is a content change, not a breaking rename, and the
   app inherits the fix.
5. **Ownership of notes and undo was contested in the design record, and is now resolved.** The
   element API design's section 9.2 gives note content and the undo stack to the consumer; its
   own notes section (4.15.3) rejects that shape for notes, and issues #145 and #427 put notes,
   saved views and undo in the element. Note text is element state and a member of the project
   file (7.28); undo is the element's by #427. Section 9.2 is leftover text.
6. **"View" is overloaded four ways in the published API** (renderer, view mode, camera view,
   camera preset). The ontology needs one meaning for "view" and other words for the rest.
7. **Understanding the whole graph** (an owner-named key task) is well served by
   `data.statistics()` except for a degree distribution, which needs a `degree` run, and a
   graph-level reading, which the app writes itself.
8. **The app still works around the element** in five places: the neighbour list, the layout
   picker keyed by engine with a hard-coded `grid` the element cannot draw, the algorithm list
   expanded over legacy keys, 1.x single-node selection calls, and its own reading templates.
   Each points at an element defect or gap.
9. **The requirements base needs light repair before it can validate anything** (stale
   capability statuses, 37 broken back-references, one persona without goals).
10. **A run's recorded scope is not the scope it computed over.** Every run defaults to the
    scope `"visible"` and records it, but the algorithm executor never reads the resolved scope:
    every built-in algorithm computes over the whole loaded graph (7.7). A filter therefore
    changes what a run CLAIMS to have measured, and flags it stale, without changing what it
    measured. This is an element defect with no issue filed, and it decides what every value
    means after a filter.
11. **A run's identity is its definition.** Re-running with the same definition keeps the
    `RunId`; changing a parameter, the seed or the scope specification makes a different run
    with a different id, and the old run stays (7.1). A project file that references runs by id
    inherits this rule: an object that must survive a parameter edit (the object-first design's
    "edited runs keep the object id") needs an identity of its own above the run.
12. **References to a run are either owned or dangling, never refused.** Layers the element
    made from a run are removed with it; anything else that names `results.<runId>` (a
    hand-written layer, a saved `{ where }` scope) keeps pointing at nothing and matches nothing
    in silence (7.1). Before notes, sets and views reference runs in a published file, the
    element needs one rule for these references.
13. **The two style lists are already different lists.** `styles.list()` holds every layer,
    including the two locked defaults; selection and hover are drawn outside the stack and are
    not layers at all (7.2). A user-facing list that hides the defaults is a filtered view of the
    stack.
14. **Nothing in the element is approximated, and most randomness is seeded but not recorded
    consistently** (7.9). The published start option `seed` never reaches an algorithm.
15. **Minted edge ids are a load-order counter** (7.15). Anything keyed by `EdgeId` (an
    edge-set result, a saved edge set, a note on an edge) rebinds to a different edge when the
    same file is reloaded after an edit that inserts an edge earlier. This is a one-way-door
    problem for the project file.
16. **Many state changes bypass the session** (7.14): data edits, layout choice, camera, view
    mode and XR go through the element or `Graph`, not through any session verb, so an undo
    journal or project file built on the session cannot see them yet.
17. **What one row of the analysis tree is has three incompatible answers in the record and none
    in code or issues** (7.11): a kept output object (the object-first model), a run's result
    (`graph-analysis.md`), or a graph state reached by an action (`design-method.md`). Issues
    #427, #301 and #145 describe a history, a file and a journal of COMMANDS and never mention a
    tree. This is the largest open one-way door.
18. **Derived `RunId`s are already a designed persistence key.** The element's own source says a
    derived id exists so that "a saved style layer, recipe or template" resolves to the same
    run, and the published `StyleDocument` version 1 writes `results.<runId>` text verbatim. No
    known consumer has saved one (the app persists no style or run), but the id derivation is a
    contract as of 2.0. An identity above `RunId` can still be ADDED; `RunId` cannot be replaced
    or re-derived (7.11).
19. **Edges cannot be pointed at, and nothing schedules it** (7.12). The installed renderer
    library can pick instances and thin instances on the GPU, so the cost of edge picking hangs
    on the edge renderer rewrite (#419). Until then an edge can be selected only by script; the
    app has no pointer, table or menu route that selects one, and a selected edge is not drawn.
20. **The selection colour is not reserved** (7.17): the default halo gold `#FFD700` is 2.8 to
    3.8 OKLab units from the brightest colour of Okabe-Ito, viridis and inferno, and the default
    highlight colour IS Okabe-Ito vermilion. The app's accent is a different colour again (blue).
21. **The 50,000-node / 100,000-edge ceiling is a temporary renderer limit, not a session limit**
    (7.18). The requirements base's own ceiling is 200,000 nodes / 500,000 edges drawn, with a
    "Graph too large" warning above 200,000 nodes; millions appear only in persona frustrations.
22. **A result group can be named by run and value, but not durably** (7.19). The one query engine
    lets `results.<runId>.group == \`3\`` serve as a scope, a saved scope, a layer selector and a
    selection target without copying ids, but a group number is not an identity across re-runs,
    a saved scope that read a removed run keeps answering with its old members, notes cannot
    target a set, and no algorithm returns more than one path. In-place community actions need a
    stable group key first; until then the flow is keep the group, then act on it.
23. **The element selection holds nodes and edges only, and no design or issue adds objects**
    (7.20). An object selection that the assistant or a headset must see is an element addition
    and a published name; one that only drives the inspector can stay presentation state.
24. **Filters and style layers are session state by design, and two views cannot differ in them**
    (7.21). A second canvas with a different mask is a second session over shared data, which is
    unbuilt. A headless session can hold positions, visibility, styles and saved scopes, but not a
    camera or a view mode; only styles have a serialiser.
25. **An author-assigned run id can serve as a stable measure name, but rebinding it is
    remove-then-start** (7.22): the old result is lost, owned layers go, readers of
    `results.<id>` follow the new run. Nothing evicts runs; one metric result is about 38 MB of
    heap at 100,000 nodes and 57 MB at 200,000, so undo that keeps replaced runs must be capped.
    Every run record also states the wrong package versions (1.10.0 for a 2.3.1 element).
26. **Run time is dominated by the default paint, not by the computation, and exact closeness and
    betweenness freeze the page while they run** (7.23). 100,000 nodes cannot be run in the element at all today.
27. **`components` is weakly connected by default and so is `statistics().components`**; strength
    is recorded in the parameters and caveats but not in the field names or the statistics
    object (7.24).
28. **Mixed direction is kept only as a per-edge attribute in the element**; graph-format's
    expansion columns exist but the element does not use them, and no workflow names a mixed
    dataset (7.25). Separately, `directed="false"` did not make a JSON graph undirected in two
    probes, so today an undirected graph from a format that states no direction reads as directed.
29. **Attributes cannot be written through the session, algorithms do not declare what they read,
    and nothing keeps per-column revisions** (7.26, 7.27). All three are element work; none needs
    graph-format's frozen contract to change.
30. **Edge routes have no schedule** (7.29). The table's Edges tab is the buildable route to an
    edge, but a table-selected edge is not drawn and edge ids move on reload.

---

## 7. Behaviour behind the published names (graphty-element 2.3.1)

Section 1 lists names. This section records what the element DOES with them in the cases a
project file, an analysis tree and an undo history depend on. Each subsection states the fact,
cites the code, and says which contract it constrains. Paths are under `graphty-element/src/`
unless stated.

### 7.1 What happens to things that refer to a run when the run changes

Four facts decide every case below.

- **A run id is derived from the run's definition.** An id the author did not assign is
  `<algorithm>_<digest>`, where the digest is taken over the algorithm key, the canonicalised
  parameters, the scope SPECIFICATION (not its membership), the seed, the sample size and the
  `exact` flag (`session/runs/runId.ts`, `deriveRunId` and `canonicalIdentity`). Starting the
  same definition again returns the run that already exists (`RunsApi.reuse`, line 696); an
  author-assigned id (`as:`) reused for a different definition is refused with `E_DUPLICATE_ID`.
- **A layer "belongs" to a run only through its own `source`.** `runs.bindings(id)` and
  `runs.remove(id)` find a run's layers by `layer.source.by === "run" && layer.source.runId === id`
  (`session/GraphSession.ts` around line 1163). A layer whose selector or encoding merely READS
  `results.<runId>.<field>` but was added by a person (`source.by === "user"`) or a template is
  not counted.
- **Staleness is derived, never stored.** A finished run is stale when its scope specification,
  resolved again now, has a different membership digest from the one it ran over
  (`RunsApi.staleOf`, line 802). The digest covers node ids and edge ids and nothing else
  (`session/scope/ScopeApi.ts`, `membershipDigest`).
- **Result values are keyed by element id, not by index** (`session/results/RunResult.ts`, the
  `index: Map<NodeId, number>` tables), so a result stays attached to the ids it measured through
  any re-freeze or reload.

| Case | RunId | Layers the element made from the run | Other references (a hand-written layer, a saved `{ where }` scope, a selector copied from the run) | What the element does |
|---|---|---|---|---|
| **Re-run, same definition** (`run.rerun()`, or `runs.start` with the same definition after the data moved) | kept (`Run.rerun`, `session/runs/Run.ts` line 713: "The run keeps its id, so every style layer, legend and saved reference bound to it survives") | kept and repainted from the new values; not re-added ("A run paints on its FIRST completion, and never again", `session/styles/autoApply.ts`) | follow the new output, because they read `results.<runId>` live | follows |
| **Re-run with changed parameters** (there is no verb that edits a run's parameters; the only route is a new `runs.start`) | NEW id; the old run stays in `runs.list()` with its result | the new run auto-paints. An encoding STACKS on the old run's layer for the same channel, because `encode()` replaces only a layer bound to the SAME run (`StylesApi.ts` `isDerivedFor`, line 919). A highlight REPLACES every earlier highlight, because `highlight()` is exclusive | keep reading the OLD run | keeps both; nothing is marked superseded |
| **Run removed** (`runs.remove(id)`) | gone | removed with it, and counted in the returned `RunRemoval` so a consumer can say "Removes 1 style layer" first (`RunsApi.remove`, line 548) | DANGLING. A hand-written layer keeps its selector and matches nothing; `styles.validate()` would report the path in `unresolvedPaths`, but nothing re-checks existing layers. A saved scope whose `{ where }` reads the run stays `bound: true` (`ScopeApi.canBind` checks only that a query engine exists, line 854); run on the published 2.3.1, it goes on returning the members it resolved BEFORE the removal, while the same expression typed fresh resolves to none (7.19) | keeps a dangling binding, silently |
| **Run goes stale** (its scope now resolves to different elements) | kept | kept, painting the OLD values | kept, reading the old values | flags it: `run.stale` returns `{ ranOn, nowVisible, scopeSpec }`. Nothing re-runs by itself; starting the same definition again re-executes in place (`RunsApi.shouldReexecute`, line 727) |
| **Data changes under it** | kept | kept | kept | see below |

Data changes, in detail:

- **Adding, removing or updating elements** cancels any run still queued or running (unless it is
  more than 90 percent done), because the operation queue's rule is that data operations make
  `algorithm-run` work obsolete (`constants/obsolescence-rules.ts`). A FINISHED run is untouched.
- **Adding or removing nodes or edges** changes the membership digest, so every finished run
  whose scope covers the change is flagged stale. New elements have no value; `{ match: "has" }`
  layers skip them, so they keep the base look.
- **An attribute edit or a weight change does NOT flag anything stale**, because the digest covers
  ids only. A betweenness run computed with the old weights looks current.
- **Clearing and reloading** (`clearData()`, a new `node-data`, `loadFromUrl`) does not remove any
  run (`Graph.clearData`, `DataManager.resetStore`). Node-keyed values re-attach to whatever nodes
  in the new data share their ids. Edge-keyed values re-attach to whatever edge now holds the same
  counter id, which after any change in load order is a DIFFERENT edge (7.15).
- **Merging two nodes into one** does not exist as an operation. Adding a node whose id already
  exists merges attributes into it (issue #355 records that the old attributes survive).

So the element's rule today is: **stable id per definition, owned layers deleted, foreign
references left dangling, staleness derived from membership only, never refused, never frozen to
static values.** A frozen copy exists only on request: `styles.resolveToStatic(layerId, channel)`
rewrites one channel of one layer as fixed values. On import, `styles.applyTemplate()` adds a layer
whose paths nothing answers as DISABLED and reports it in `unbound`; that is the one place the
element already turns a dangling reference into a visible state.

What the design record says on top of this: the object-first design settled that "a parameter
edit starts a new run that replaces the old under the same object id and keeps the replaced
result in the journal" (`design/ui/object-first-ux/round-2/decisions.md`, row T10). The code has
no object id, so that rule needs an identity above `RunId`; `RunId` itself cannot stay the same
across a parameter change without breaking the "same definition, same id" rule every saved layer
already relies on.

### 7.2 Style selectors, saved scopes and the locked layers

- **A layer selector cannot name a saved scope.** The five selector kinds are `everything`,
  `expression`, `has`, `ids` and `top` (`session/styles/selector.ts` lines 55 to 80). There is no
  `{ set: ScopeId }` arm. A layer can paint a saved scope's members only by copying them into an
  `ids` selector, or by copying the scope's `{ where }` text into an `expression` selector; either
  copy stops following the scope when the scope changes or is removed.
- **A layer selector CAN refer to a run's output live**, by path. `encode()` writes
  `{ match: "has", path: "results.<runId>.<field>" }` (`session/styles/EncodingSpec.ts` line 493)
  and `highlight()` writes `{ match: "expression", where: "results.<runId>.in == \`true\`" }` or
  the `onPath` equivalent (`StylesApi.ts` line 1643). These follow a re-run of the same run and
  dangle when it is removed (7.1).
- **A saved scope is a stored specification, resolved every time**: `scope.save(name, spec)`
  keeps the spec, not a membership (`ScopeApi.ts` line 947). `selection.promote(name)` saves
  `{ nodes: [...ids] }` and drops the selected EDGES (`session/selection/SelectionApi.ts`,
  `scope.save(name, { nodes: this.#nodes.ids() })`), because `Scope` has no edge arm.
- **What `styles.list()` returns**: every layer, bottom first, including the element's two locked
  layers "Node defaults" and "Edge defaults" (`source: { by: "element", reason: "default" }`,
  `session/GraphSession.ts` `elementBaseLayers`, lines 745 to 761). Nothing filters them out.
- **Selection is not a layer.** The same comment says so: selection "used to be a layer ...
  The session holds selection as a mask and the renderer draws the highlight by construction,
  outside the stack entirely". Its look is element configuration (`selectionStyle`), not a layer.
- **Hover is not a layer either.** Hovering a node emits `node-hover` and shows the node tooltip
  (`NodeBehavior.ts`); nothing is painted through the stack.
- **Notes do not exist**, so no notes layer exists (issue #145).
- Consequence: the reason values `"selection"`, `"hover"` and `"notes"` in the published
  `LayerSource` type are reserved words with nothing behind them.

### 7.3 Node type and edge type

The element has **no type role**. The data configuration has roles for id, label, weight, time,
edge endpoints and edge id (`config/DataConfig.ts`), and nothing for type. An attribute whose
string values are few relative to the records is classified as type `"category"`
(`session/attributes.ts` line 143), which is a value type, not a role. The one place that treats a
column as "the type" is the AI assistant, which looks for an attribute literally named `type`
(`ai/commands/QueryCommands.ts` lines 282 to 315) -- an informal convention, not a contract.
Issue #299 asks for a node-type and edge-type role assignable at import, detected from formats
that declare types (Neo4j labels, GraphML and GEXF kinds), with per-type counts. The app's
Schema section and its "Filter to type" and "Select all of type" actions are no-ops waiting on it.

### 7.4 What a community or component result publishes, and whether one block is addressable

- The `community` shape publishes, per node, `group` (integer or string) and `groupSize`; per
  graph, `groupCount`, `sizes` and optionally `modularity` (`session/results/types.ts`,
  `RESULT_FIELD_CONTRACT` and the `community` row). `louvain`, `leiden`, `label-propagation`,
  `girvan-newman` and `components` all publish this shape. So `group` is a published field name
  inside `results.<runId>.group`, and "group" is also the natural word for a user-defined set.
- **One block can be addressed only by writing its value into an expression**:
  `results.<runId>.group == \`3\`` works as a style selector, a `{ where }` scope, a selection
  target and a filter, because all four share one query engine (2.3.1). There is no block
  identity: `RunResult` has no accessor for one group's members (its methods are `node`, `edge`,
  `column`, `ranking`, `top`, `histogram`, `summary`, `reading`), no group can be saved as a
  named scope by reference, and a group number is not stable across re-runs. Group names and
  group identity across re-runs are open issues (#191; the object-first design's "overlap
  matching" is element work that has not started).

### 7.5 How many graphs one element or session holds

**Exactly one.** A `<graphty-element>` owns one session, and a session owns one graph store.
Several headless sessions can exist side by side (`createGraphSession()`), but they share
nothing: no data core and no node identity.

What is designed but not built (`design/element-api/element-api-design.md` sections 3.2, 3.3 and
4.2): `createGraphSession({ shareDataWith })` (two sessions over one immutable data core, each
with its own runs, styles, selection and visibility; structural edits refused on the sharer) and
`createComparison({ a, b, match: { on: "id" | "attribute" | "pairs" } })`, which reports
`matched`, `unmatchedA`, `unmatchedB` and `onlyIn("a" | "b")`, and offers `copyPositions`,
`settleUnmatched`, `delta(field)` and per-node `statistics(id)`. Neither name appears in the source.
Section 9.3 of the same design defers "several named graphs open at once" to 2.1 as
`Map<string, GraphSession>`. The design has no "both" set as a named operation (it is `matched`,
a count) and no symmetric difference. The app's Compare toggle does nothing (issue #186).

For the project file this means the top of the containment hierarchy is one graph today, and
the designed route to two conditions is two sessions joined by a comparison object, not two
graphs inside one session.

### 7.6 Published set-operation names

| Name | Where it ships | Meaning |
|---|---|---|
| `SetOp` = `replace, add, remove, toggle, intersect`, and `SET_OPS` | `./session` (`session/selection/SelectionApi.ts` line 70); taken by `selection.apply(target, op)` and the element's `select(target, op)` | how a selection target combines with the current selection |
| `{ invert: true }` | a `SelectionTarget` arm (`session/selection/targets.ts` line 135) | the complement of the current selection |
| Filter kinds `all`, `any`, `not` | `Filter` in `./session` (`session/visibility/filter.ts` lines 75 to 77) | intersection, union and complement of filters, spelled as logic, not set theory |
| `ElementMask.union`, `intersect`, `subtract`, `invert` | `session/scope/ElementMask.ts`; NOT exported from `./session` | internal only |
| `DuplicatePolicy` = `keep, error, first, last, sum, min, max`; `WeightReducer` | `@graphty/graph-format` (`src/types/columns.ts` line 103); the element's `repeatedEdges` reuses it | what happens to a repeated edge, not a set operation |
| `append(snapshot, { onDuplicateNode: "merge" \| "error" })` | `@graphty/graph-format` builder ("disjoint union, or merge by id") | combining two graphs |
| `UnionFind`, `IntUnionFind` | `@graphty/algorithms` | a data structure, not a set verb |

No package publishes `union`, `intersection`, `difference` or `symmetricDifference` as a set
verb. `@graphty/layout` publishes none. So adopting set-theory names for the one set vocabulary
is an ADDITION alongside `SetOp`, and renaming `SetOp`'s values (for example `add` to `union`,
`remove` to `subtract`) is a breaking change to a published type. The object-first design's
Combine buttons (Union, Intersect, Subtract, Exclude, after Figma's boolean operations) have no
element counterpart; `Exclude` would be the symmetric difference the comparison workflow needs.

### 7.7 Which scope a run uses when a filter is active

- **Default scope**: every run and every plan that names no scope gets `"visible"`
  (`session/runs/RunsApi.ts` line 399, `session/GraphSession.ts` line 1119). "Visible" means the
  filter and time-window masks, not what the renderer managed to draw
  (`session/visibility/VisibilityApi.ts` file header).
- **What the run records**: `run.scope` is a `ResolvedScope` (the specification, node and edge
  counts, the membership digest and when it was resolved), and `run.record.scope` is its
  serialisable form. So the scope CAN be shown beside a result: "visible, 120 nodes".
- **What the run computes over: the whole loaded graph.** The executor receives the resolved
  scope in `RunExecutionContext.scope` and never reads it: `managers/AlgorithmManager.ts`
  `execute` uses only the algorithm, parameters, run id, signal, progress channel and seed, and
  the algorithm classes read the full graph snapshot. No algorithm reads a visibility mask. This
  is a defect: the recorded scope says "the 120 visible nodes" while the values describe all
  nodes. No issue records it.
- **The caveat meant to say so is never set by an algorithm run.** `Caveats.filterScope` and
  `windowScope` are filled only for the visibility change itself (`VisibilityApi.ts` line 387);
  every algorithm run leaves them absent.
- **Consequences today.** After a filter change, every `"visible"` run is flagged stale although
  its values did not depend on the filter; re-running it recomputes the same whole-graph values;
  two runs "on different filters" are not actually different computations. Every value's meaning
  after a filter is "over the whole loaded graph", whatever the record says.
- **`data.statistics()` describes the whole loaded graph**, always: it is computed from the
  snapshot, which holds every loaded element (`session/data.ts` line 161,
  `session/statistics.ts`). There is no statistics call over a scope (`scope.statistics(spec)` is a
  design proposal). `selection.statistics()` exists and gives the selection's node, edge,
  induced-edge and cut-edge counts and per-attribute summaries.

### 7.8 Standing statistics: what is computed without a run, and when

- `data.statistics()` is LAZY and CACHED per snapshot: computed on the first call after the graph
  changes, then reused (`session/data.ts` lines 161 to 164). Nothing computes it unasked except
  the cost planner (`session.estimate`, `session.plan`) and the `"largest-component"` scope, which
  both call it. There is no size threshold: the work is linear (degrees and a component walk), and
  the load ceiling of 50,000 nodes and 100,000 edges bounds it.
- It contains counts, density, directedness, weightedness, self-loops, repeated edges, degree range,
  mean degree and component sizes. It does NOT contain the degree distribution, a clustering
  coefficient, a diameter or an average path length.
- The degree distribution needs a `degree` run and `RunResult.histogram("value")`; that run is a
  row in `runs.list()` like any other. The diameter and radius exist only as graph fields of the
  `all-pairs-distance` run, which is cubic. `clustering-coefficient` is a reserved algorithm key
  with no implementation. Average path length exists nowhere.
- `session.fingerprint()` hashes node ids in order and the arcs; attributes and positions are not
  in it (`session/statistics.ts` line 282).

### 7.9 Approximation, randomness and reproducibility

| Source of variation | What the element does | Recorded in the run's caveats? |
|---|---|---|
| Sampling above `approximateAboveNodes` (2,000) | never happens. No algorithm descriptor declares `approximable` (`catalog/algorithms.ts`), and the cost gate that would choose a sample is consulted only by `session.plan()`, not when a run starts | `exact` is always true from sampling |
| The `seed` start option | folded into the run id and copied into `caveats.seed`, but NOT passed to any algorithm (`AlgorithmManager.execute` reads `context.seed` only for an empty result) | recorded, but describes nothing |
| Louvain | no random draw in `algorithms/src/algorithms/community/louvain.ts`; the result depends only on node order, which graph-format keeps as order of first appearance | no seed, correctly |
| Leiden | seeded by its own `randomSeed` parameter, default 42 (`algorithms/LeidenAlgorithm.ts` line 29) | the parameter is in `run.params`; `caveats.seed` is not set from it |
| Label propagation | seeded by `randomSeed`, default 42 | yes, `caveats.seed`, with `converged` and `iterations` |
| Min cut by Karger's method | unseeded `Math.random` (`algorithms/src/flow/min-cut.ts` line 393) | `exact: false` and a note that it is randomised; no seed, so not reproducible |
| PageRank, eigenvector, Katz, HITS | deterministic power iteration with a convergence limit | `converged` and `iterations` on PageRank (the delta method reports neither honestly; see `PageRankAlgorithm.ts` line 329) |
| Force layout positions | not a run at all; the ngraph engine ignores its seed (issue #114), so a force layout is not reproducible | not recorded anywhere |
| GPU versus CPU | PageRank, shortest path, BFS, components and Kruskal can run on the optional WebGPU accelerator | `precision: "f32"` on the GPU, `"f64"` on the CPU |

On reproducibility: the WebGPU package's own tests assert bitwise identical output on two runs on
the same adapter for its reductions, BFS and shortest-path distances
(`webgpu-graph-algorithms/test/kernel/determinism.test.ts`; `webgpu-graph-algorithms/CLAUDE.md`,
the verified-facts rows on `atomicMin` and on the BFS and SSSP counters). CPU and GPU agree
within a tolerance (single against double precision), not bitwise, so the same definition can
publish different last digits depending on whether an accelerator was attached.

For the project file: a recipe (the definition) restores Louvain, Leiden, label propagation and
the deterministic metrics exactly on the same engine; it cannot restore a Karger cut, a force
layout, or GPU-versus-CPU digits. The designed saved document (`GraphtyDocument` in
`element-api-design.md`) carries a `recipe` and no result values, so as designed it could not
restore those shapes.

### 7.10 What `RunResult.reading()` says

The readings are **measurements, worded with interpretive plain names**. The sentence templates
(`session/results/reading.ts`) only restate published numbers, and the file header says why: "a
reading is a claim about the reader's data", so every figure comes from the result. Examples of
what they produce:

- a node metric: "<label> has the highest <field words>, at <value>. The typical element sits at
  <median>." with a tie clause and an unmeasured-count clause;
- a partition: "6 groups were found, the largest holding 12 of 34. Modularity is 0.419.";
- a route: "The route runs 3 hops. Its total cost is 3.";
- a chosen set: "5 nodes were selected.".

The interpretation enters through the field's `plainName`, which the node-metric sentence uses
lowercased: betweenness reads "has the highest bridging", PageRank "has the highest influence",
closeness "has the highest reach", eigenvector "influence by association". With
`{ audience: "technical" }` the same sentence uses the technical name ("betweenness", "PageRank
score"). Some caveat notes describe the model rather than the data (PageRank: "A reader follows a
link with probability 0.85 and jumps to a random node otherwise.").

The APP's own readings go further and do interpret: its node-metric headlines are "Main bridge"
and "Most influential", and its template was written from a spec sentence "Mr_Whiskers is the
main bridge" (`graphty/src/components/shell/readings/nodeMetricReading.ts`). That is also app
copy duplicating an element capability (section 2).

### 7.11 The analysis tree and undo: what a row is, and one structure or two

Nothing is built: there is no tree, no history and no journal in the code. What the record says:

**What one row represents.** Three documents answer, and they disagree.

| Source | A row is | Consequence for the file |
|---|---|---|
| The object-first object model (`design/ui/object-first-ux/object-model.md` sections 2.1 and 2.2) | a KEPT OUTPUT OBJECT: Dataset (root), Set, Group, Measure, Grouping, View. "The tree shows one object per run that produced members"; a run that produced a fact or a pair list is a Findings section; runs are "deliberately not an object" and appear as the object's Definition and Made-by record. Nesting means only "computed within the parent" | the file is a list of objects, each carrying a definition (a run recipe) and, where needed, stored values |
| `graph-analysis.md` (sections 6.2, 6.3 and the community answer) | a RUN'S RESULT: "a community result is one row", and a single community "becomes a tree row of its own only when kept" | the same shape as above in practice: a result row plus kept-set rows |
| `design-method.md` section 3.5, item 2 | a GRAPH STATE reached by an action (the VisTrails model): "every step that changes the graph or its results (load, clean, run, derive a subgraph) is a tree node and also an undo step" | the file is a version tree of states, with results attached to states |

The first two agree on substance (rows are outputs; the run is provenance). The third is a
different structure: a tree of states is a history, so under it the tree and undo are one
structure seen at two granularities, while under the first two they are two structures.

**What the issues say.** None of them names a tree or a row.

- **#427** (undo and redo, opened 2026-09-26) records "each step as a forward and inverse change
  to project state" through one dispatcher (the command vocabulary of #337), with
  `session.history` as "a labelled list of steps". Linear, and made of COMMANDS.
- **#145** (notes and journal) is "the record of commands run, which recipes and undo replay
  through"; a run's `journalId` points at its entry.
- **#301** (project file) asks for "one versioned document" holding "data, style layers,
  algorithm runs, layout positions, filters, camera", and says the format "is a published
  contract (a one-way door); decide it explicitly".
- The element API design's saved-document envelope, `GraphtyDocument` (section 4.6.3a), has
  members `data`, `dataPlan`, `style`, `recipe`, `view` and `annotations`: no tree, no objects, no
  result values, no filters and no positions.

So the record describes a history (#427), a journal (#145) and a file (#301, `GraphtyDocument`)
that are all lists of commands or documents, and a tree (object model) that is a list of kept
outputs. Nothing describes a BRANCHING history, and nothing but `design-method.md` makes the tree
a history. The owner's settled decision is that "graphty-element owns the tree ... Undo goes with
it: the objects API keeps the history (the #145 journal) and exposes undo() and redo()"
(`round-2/decisions.md`, row S1), and the object-first History design is linear with its own rows
(step, object, by, when), where "Undo after a creation removes the row and cancels its run"
(`round-3/history-errors.md` section 1; `object-model.md` section 3). Read together: TWO
structures, a tree of outputs and a linear history of commands that adds and removes tree rows.
The element API design still says the undo stack belongs to the consumer (section 9.2); #427
and the settled decision supersede that.

**Are run-bound paths already persisted?** Checked in the app, the element docs, stories and
examples on the remote `master`.

- **The app saves no style document, run or result path.** Its only persisted state is reader
  preferences in `localStorage`: the shell layout (`shell/ShellContext.tsx`), the canvas layout
  and the insights memory (`shell/insights/insightsMemory.ts`). It starts runs without `as:`
  (`shell/analysis/runs.ts` lines 189 and 211, `analysis/nodeMetrics.ts` line 474), so every id
  it holds is derived, and it holds them only in memory. `results.${runId}` appears only in the
  app's test double (`graphty/src/test/fakeSession.ts`).
- **Stories and examples embed no `results.` path.**
- **The element's docs TEACH embedding a derived id in a layer.** `docs/guide/styling.md` line
  127 and `docs/guide/algorithms.md` line 177 both write
  ``selector: { match: "expression", where: `results.${run.id}.value > \`10\`` }`` after
  `element.run("degree")`, and `styling.md` lines 69 and 71 show `results.degree.value` -- a path
  that only resolves if the run was started with `as: "degree"`, which the example does not show
  (a derived degree id is `degree_<digest>`). That is a docs defect.
- **`styles.toDocument()` writes those paths verbatim.** It serialises every unlocked layer's
  spec (`StylesApi.ts` line 1778), so any `StyleDocument` a consumer saved from 2.0 onward
  carries `results.<derived id>` text inside selectors and bindings.
- **The derived id is designed to be persisted, and does not depend on the data.** The file
  header of `session/runs/runId.ts` says an id minted from an execution counter "would mean a
  saved style layer, recipe or template resolves to a different run ... and changing that
  afterwards is a behavioural break in everything already persisted". The digest is taken over
  the algorithm, the canonicalised parameters (declared defaults dropped), the scope
  SPECIFICATION, the seed, the sample size and `exact` -- not over the data. So the same
  definition on a different dataset gets the SAME id, and a saved style re-binds to it.

Consequence: derived `RunId`s are a published contract by design, not by accident, although no
known consumer has saved one yet. The derivation itself (the canonical form and the FNV-1a
digest) is part of that contract: changing either re-keys every saved layer. An identity ABOVE
`RunId` (an object id whose definition points at a run) can still be introduced additively,
because nothing today names one; what cannot happen cheaply is replacing `RunId` in selectors or
re-deriving it. A row identity that survives a parameter edit (the object-first rule "a parameter
edit starts a new run that replaces the old under the same object id", `round-2/decisions.md`
row T10) therefore has to be that separate object id, and the layers painting the object would
have to follow the object rather than a run path, or be rewritten on each edit.

### 7.12 Edge picking, edge selection routes, and an edge arm for `Scope`

- **Edges cannot be picked.** `Edge.ts` sets `isPickable = false` in three places (lines 348, 470
  and 675) and the patterned line mesh declares it false. `edge-click` was deleted from the 2.0
  event map rather than left declared and never fired (`design/element-api/edge-model-and-layout-state.md`),
  and the edge tooltip channel was withdrawn for the same reason (`design/element-api/owner-decisions-2026-09-22.md`
  section 2). Both are said to "come back with edge picking".
- **Nothing schedules edge picking.** No graphty-element issue, open or closed, asks for it. It
  appears only as a prerequisite in app issue #319 (a canvas context menu) and in the object-first
  feature-fit documents, which call it "medium" element work. It is not committed before any
  information architecture ships.
- **What it would cost depends on the edge renderer rewrite.** Today every edge is its own
  `InstancedMesh` of a per-style line mesh plus, by default, an arrow-head mesh with its own
  material (#405, #25), and that renderer is being replaced by one mesh per edge style drawn
  with per-instance attributes, thin instances or a merged line system (#419, target 200,000
  nodes / 500,000 edges). The Babylon.js release the element installs (8.43.0) ships a
  `GPUPicker` that "can pick meshes, instances and thin instances" and offers `pickAsync(x, y)`,
  `multiPickAsync` and `boxPickAsync` (a rectangle, which is also what marquee selection needs)
  and reports a `thinInstanceIndex` (`@babylonjs/core/Collisions/gpuPicker.d.ts`). It works by
  drawing the pick list into an off-screen id texture and reading pixels back
  (`gpuPicker.js`, `RenderTargetTexture` and `_readTexturePixelsAsync`), so its cost is one
  extra draw of the pickable meshes per pick, asynchronous, rather than a per-element CPU ray
  test. If #419 draws edges as thin instances, a GPU pick returns the edge index directly; if it
  merges lines into one line system, a pick returns only the mesh and edge picking needs a
  per-vertex id of its own. Either way a line one or two pixels wide needs a wider pick
  footprint than it draws. No measurement of any of this exists.
- **Today's node picking is itself expensive, and edge hover would inherit its shape.** Every
  node registers its own `onPrePointerObservable` observer, and on every pointer move each
  observer calls `scene.pick` over the whole scene to ask whether the pointer is over IT
  (`NodeBehavior.ts` lines 379 to 400; the click path at line 297 does the same). One pointer
  move therefore makes one full-scene pick per node. No issue records this; #412 records the
  neighbouring per-frame cost of every edge ray-testing its endpoint meshes to trim its line.
  Adding edge hover the same way would multiply the same pattern.
- **How an edge can be selected today, other than by pointer.**
  - By script: `session.selection` is two sets, so `selection.apply({ ids })`, `{ where }` over
    `data.source` / `data.target`, and `{ edgesBetween: true }` all select edges.
  - In the app: NO route. The Explore panel's Select menu lists "Select edges between selected"
    as one of nine rows that are drawn disabled because "multi-select and edge selection are new
    work" (`shell/panel/ExplorePanel.tsx` lines 64 to 76). The data table drawer has an Edges
    tab and row selection props ("The row selection IS the canvas selection",
    `canvas/DataTableDrawer.tsx` line 169), but `AppShell.tsx` does not pass
    `onSelectionChange` or `selectedIds` to it, and the app's selection handler reads only
    `currentNodeId` (`AppShell.tsx` line 2700). The edge inspector has a component and no
    producer: nothing in the app creates an inspector selection of kind `"edge"`.
- **A selected edge is not drawn.** `Edge.setSelected` records the state and draws nothing: "a
  per-edge colour or alpha is not available without giving the selected edge a mesh of its own"
  (`Edge.ts` lines 907 to 915). So an edge selected by script is invisible as selected. The same
  instancing change (#419) is what would let a selected edge be drawn.
- **`Scope` has no edge arm and no run-result arm** (`catalog/types.ts` line 716). The owner's
  settled decision adds both ("the session contract moves to one set vocabulary (plus an
  edge-list scope and a run-result set)", `proposal.md`), but no issue or code exists. Until then
  a path or a spanning tree can be painted (through its run) but not saved as a set, and
  promoting a selection drops its edges (7.2).

For the design: until edge picking and edge selection drawing land, the only way a person can
act on an edge is through a result that contains it (a path, a spanning tree, painted by its run)
or through a future table route; an edge note, an edge inspector opened from the canvas, or an
edge highlight chosen by pointing has no route at all.

### 7.13 Can the visibility mask dim as well as hide

**Only globally, and only for nodes.** `visibility.showContext` (a boolean on the session) makes
the renderer draw HIDDEN nodes as a faint, low-alpha point layer instead of removing them
(`session/visibility/VisibilityApi.ts` lines 230 to 238; honoured through `Graph.ts` and
`Node.ts`). The masks do not change: a context node is still hidden, still outside every run's
default scope, and its own mesh is not drawn (a point stands in its place, `Node.ts` `NodeRenderState`). It is one flag for the whole mask, not an outcome chosen per
filter, and hidden edges are not drawn faintly. There is no "dim but keep in scope" outcome, and
dimming what an algorithm did not select is, by the root instructions, a reader's layer, not the
element's.

### 7.14 State changes that bypass the session

The session's own mutations take three forms: verbs that return a `Run` (`runs.start`, every
`styles` write, `visibility.set` and `setWindow`), synchronous verbs with no `Run`
(`selection.apply` and `clear`, `scope.save` and `remove`, `selection.promote`,
`positions.setPinned` and `write`, `visibility.showContext`, `acceleration`), and nothing else.
Everything below changes state OUTSIDE those.

| Operation | Path today | Session equivalent |
|---|---|---|
| 1.x `selectNode`, `deselectNode` | `SelectionManager` writes through to the session's selection masks | yes, `selection.apply` and `clear`; same state, no command |
| `pin`, `unpin`, dragging a node | `Node.pin()` sets the pinned bit on the positions store and tells the layout engine | partly: `positions.setPinned` sets the same bit, but it is not a command and returns no `Run` |
| `setLayout`, `layout`, `layout-config` | `LayoutManager` through the operation queue | none; no session layout API (issue #144) |
| Camera setters, camera presets | `Graph`; user presets live in a map on `Graph` | none |
| `setViewMode`, XR, `setXRConfig` | `Graph` | none |
| Data: `addNodes`, `addEdges`, `removeNodes`, `updateNodes`, `setData`, `clearData`, `loadFromUrl`, `loadFromFile`, `node-data` | `DataManager` | none: `session.data` is read-only |
| 1.x `runAlgorithm`, `applySuggestedStyles` | routed into `runs.start` and `styles.encode`/`highlight` | yes |
| `selectionStyle`, `background` | element configuration | none |
| Registering palettes, formats, layouts, algorithms | global registries in `./extend`, with no unregister | none, and global to the page |
| AI commands (`aiCommand`) | a mix of the above | inherits whatever each command calls |

Issue #427 requires every change to the project to go through one dispatcher (#337) and every
command to declare itself undoable or exempt, enforced by a test. Each row marked "none" is a
decision that has to be made before that contract ships: move it into the session, or declare it
outside the history and the file (as #427 already does for the camera).

**What undo and the project file will cover once #427 lands.** #427's rule is "What is
undoable: everything that is saved in the project file. Camera, hover, UI state and a computation
still in flight are not undoable"; its problem statement lists "data edits, imports, filters,
analysis runs and their results, style layers, groups, notes, saved views, layout choice and
settings". Set against the other sources, per kind of state:

| State | #427 (undo) | #301 (file) | `GraphtyDocument` design | Object-first design (history and file) | Route today | Reading |
|---|---|---|---|---|---|---|
| Data edits and imports | undoable | "data" | `data`, `dataPlan` | a step; saved | outside the session | covered, once data verbs move into the session |
| Filters and visibility | undoable ("filters") | "filters" | no member | a filter becomes a Set object; Focus sets the mask; "the eye" is a step | `visibility.set` (session) | covered by #427 and #301; the envelope design has no place for it |
| Analysis runs and results | undoable; redo restores the stored result | "algorithm runs" | `recipe` only, no values | a step; values saved | `runs.start` (session) | covered; whether values or recipes are saved is open (7.9) |
| Style layers and edits | undoable | "style layers" | `style` | a step | `styles.*` (session) | covered |
| Layout choice and settings | undoable ("layout choice and settings") | implied | no member | "a layout change" is a step; the Dataset's Layout setting is saved | outside the session (issue #144) | covered once a session layout verb exists |
| Node positions (layout result, a drag, a pin) | not named | "layout positions" | no member | "a node moved by hand" is unsaved work; positions saved | `positions.write` / `setPinned` (session, not commands); drag and `pin` outside | by #427's own rule a drag must be a step, because positions are in the file; no document says so |
| Camera | NOT undoable | "camera" | `view` (mode, camera, presets) | not a step and "not work"; a named View (camera + mode + mask) is saved | outside the session | CONTRADICTION, see below |
| View mode (2D, 3D, VR, AR) | not named | not named | `view` | not a step; part of a named View | outside the session | undecided |
| Saved views | undoable | not named | `view` | creating one is a step | camera presets outside the session | covered as objects |
| Notes | undoable | not named | `annotations` | a step; saved | do not exist (#145) | covered once built |
| Selection | not a step; restored after undo | not named | no member | not a step | session | outside history by every source |
| Hover, open panels, UI state | not undoable | -- | -- | not steps | app | outside the session by every source |
| Registered palettes, layouts, algorithms | not named | not named | `style.palettes` carries palette descriptors | -- | global registries | outside the session (a page-wide registry cannot be undone per session) |

The camera row is the one contradiction. #427 says undoable equals saved-in-the-file and excludes
the camera, while #301 and the envelope's `view` member put the camera in the file. The object-first
design resolves it in a way consistent with both halves: the LIVE camera is neither a step nor
unsaved work, and a camera is saved only inside a named View, whose creation is a step. Under
that reading the rule holds if "camera" in #301 means "the cameras of saved Views". Nothing
records that reading as decided.

So a visible History surface would cover data, filters, runs, styles, layout choice, views and
notes, and would NOT cover the camera, the view mode, the selection or hover. Of those, only
the view mode is undecided. None of it covers anything until the rows marked "outside the
session" move behind the #337 dispatcher, which #427 requires and enforces with a test.

### 7.15 Embedding data in graph-format's wire form, and edge id stability

What the element holds today: the graph-format snapshot inside the element carries only
topology, weights, the seed-position column and one edge column, `graphty.edgeId` (`u32`, role
`id`, unique; `data/GraphStore.ts` line 156). Every attribute lives in plain JavaScript record
objects beside it, and attribute types are inferred by walking those records each time
(`session/attributes.ts`); `time` is a type only because the data configuration names a time
path.

If a project file embedded the snapshot's wire form (`toWire` / `toBytes`) as it stands:

| Would it keep... | Answer |
|---|---|
| attributes | NO: none are columns today. The element would have to write them as columns first. graph-format can hold them (`f32 f64 i32 u32 u8 bool dict string list json`, validity bitmaps, roles), and nested record fields would need `json` columns |
| attribute types | only as column dtypes; the element's `AttributeType` (`integer`, `category`, `time`, `mixed`) is inferred, not stored, so it would be re-inferred on load unless the file adds it |
| time values | as whatever column the value was written to; graph-format has extension tables for temporal attributes that the element does not use, and the GEXF importer already drops spells (issue #109) |
| minted edge ids | YES, as the `graphty.edgeId` column |
| repeated edges | YES: graph-format keeps multigraphs under `keep`, and the `multigraph` flag says so |
| node ids of mixed type | YES: the id map's `mixed` kind keeps `1` and `"1"` apart |

The element's `GraphtyDocument` design takes the other road: its `data` member is
`{ format, inline?, url? }`, one of the importable text formats, re-imported on open
(`element-api-design.md`, the saved-document section). That road keeps whatever the format keeps
and REMINTS every edge id on load.

**Are minted edge ids deterministic across reloads?** Only for the same records, in the same
order, under the same repeated-edge policy, into a fresh store. The id is the decimal printing of
a counter taken at `addEdge` time (`data/GraphStore.ts` line 213; `data/edgeIdentity.ts`), and the
counter restarts at 0 when the store is replaced. A file's own edge id (`edgeIdPath`) is used only
to recognise a repeated record (`managers/DataManager.ts`, `knownEdgeFor`); it never becomes the
`EdgeId`. So an edge inserted earlier in an edited file, a changed repeat policy, or edges added
after load in a different order shift the ids of later edges, and anything keyed by `EdgeId` (an
edge-set or path result, a future saved edge set, a note on an edge) re-attaches to a different
edge without any error.

### 7.16 Where this note corrects the other research notes

- `design-method.md` section 3.5 says "graphty-element owns a branching tree of the analysis".
  The element owns the tree by the owner's decision, but no design document or code describes a
  BRANCHING history: the tree is a tree of objects nested by scope, and the designed history is
  linear (7.11). Whether history should branch is an open design question, not a fact.
- `graph-analysis.md` (the persistence table) says the element "already caches" graph statistics
  including the degree distribution, clustering and path length. It caches counts, density,
  degree range and components; the distribution, clustering coefficient, diameter and average
  path length are not computed at all (7.8). Its section 5 list of what is missing is correct.
- `graph-analysis.md` says Louvain depends on seeds. In general it does; graphty's Louvain has no
  random draw and depends only on node order, while Leiden and label propagation are seeded with a
  default of 42 (7.9).
- `figma.md` describes "graphty-element's journal" as recording data edits, style layers, runs,
  visibility and pinning. That is a proposal consistent with issue #427, not existing behaviour:
  there is no journal (issue #145), and most data, layout and camera changes do not pass through
  the session at all (7.14).
- `design-method.md` section 3.5 says "a tree node is a graph state reached by an action" and
  that a style tweak and the camera are undo steps. The object-first model and `graph-analysis.md`
  make a row a kept output, not a state, and every source on undo (#427, the object-first
  History design, `figma.md` section 5.5) excludes the camera from history. The row kind is an
  open one-way door (7.11), not settled by either note; the camera exclusion is consistent across
  every source except that one sentence, and #427's own rule leaves one contradiction about the
  camera in the file, recorded in 7.14.
- `figma.md` section 5.5 lists "visibility" and "pinning" in the journal and "modes" outside it.
  That agrees with #427 for filters; #427 does not name pinning or the view mode, and by its own
  rule a pin or a drag must be undoable because positions are in the file (7.14).
- `graph-analysis.md` section 6.3 says "five personas" work on "10,000-to-1,000,000-node graphs".
  The persona and workflow files state no such range: two personas mention millions as a goal or
  frustration, one says tens of thousands, one says 100 to 600 nodes, and the capabilities set
  the ceiling at 200,000 nodes (7.18). The per-workflow sizes in that table are estimates, which
  weakens nothing in its conclusion (rule-made sets exceed 5,000 at 100,000 nodes too).
- Section 1.12 of this note says there is no edge hover event; section 7.17 adds that there is
  no hover COLOUR for nodes either: hover shows a tooltip only.
- Section 1 of this note, as first written against 2.0.0, gave the old render ceiling, four
  selector kinds, a refused `{ where }`, and an `EdgeId` "minted when the file has none". Those
  entries are corrected in place above.
- `graph-analysis.md` section 6.15 recommends that "the snapshot keeps a revision counter per
  attribute column". In graphty-element the attributes are not in the snapshot at all; they live
  in record objects beside it (7.15), so the per-column counter belongs in the element's attribute
  store, and graph-format's frozen snapshot need not change (7.27). The same section's "built-in
  algorithms already know theirs" is true only implicitly: every built-in reads topology and the
  load-time weight, and nothing declares it (7.27).
- `graph-analysis.md` section 6.5 plans "Compute (about N s)" rows from computation cost. On
  2.3.1 the element's default first paint, not the computation, sets what a reader waits for on a
  graph with many edges (7.23); a label that quotes the computation understates the wait.
- The design record contradicts itself on notes: `element-api-design.md` section 4.15.3 gives note
  storage to the element, and sections 9.2 and 9.3 give it to the consumer. Section 4.15.3 and
  issues #145 and #427 decide it (7.28); earlier text in this note that called notes "disputed" is
  corrected in place.
- The object-first decision that "Compare's second canvas can take a View as its mask"
  (`round-2/decisions.md` row P4) is a per-view filter, which the element design refuses; the
  framework should read a View's mask as session state that applying the View writes (7.21).
- The published 2.3.1 `session.d.ts` header still says `{ where }`, `text` and `expression` are
  refused with `E_UNSUPPORTED`. They work (1.3); the header is stale documentation in the element.

### 7.17 Selection, hover and highlight colours against the data palettes

**What the element draws.**

| Mark | Colour | How it is drawn | Source |
|---|---|---|---|
| A selected node | halo `#FFD700` (gold) at opacity 0.4, 1.45 times the node's drawn radius | an unlit translucent sphere, one shared material, outside the style stack; configurable through `element.selectionStyle` / `graph.setSelectionStyle()` (`color`, `scale`, `opacity`) | `config/GraphStyle.ts` lines 41 to 53; `Node.ts` `paintHalo` |
| A selected edge | nothing | the state is recorded and not drawn (7.12) | `Edge.ts` line 907 |
| A hovered node | no colour at all | hover shows the node's tooltip and emits `node-hover`; nothing is painted | `NodeBehavior.ts` lines 379 to 426 |
| A hidden node with context on | `#8A8A8A` at alpha 0.18 | a small point | `Node.ts` `CONTEXT_POINT_COLOR` |
| A highlight (a path, a chosen set) with no style named | `#D55E00` (Okabe-Ito vermilion); edges three times as wide | an ordinary layer in the stack | `StylesApi.ts` `DEFAULT_HIGHLIGHT`, line 608 |
| An encoding group past the palette's capacity | `#505050` | an ordinary layer | `config/palettes/categorical.ts` `OTHER_GROUP_COLOR` |

The default categorical palette, Okabe-Ito, is ordered orange `#E69F00`, sky blue `#56B4E9`,
bluish green `#009E73`, blue `#0072B2`, vermilion `#D55E00`, reddish purple `#CC79A7`, black
`#000000`, yellow `#F0E442` (yellow last because it is faint on the light background).

**Distance from the selection gold to the nearest colour of each palette**, in OKLab units times
100 (the same scale the element's own palette-quality test uses: it quotes `#505050` as 16.5
from `#0072B2`, which this computation reproduces), computed from the palette files above:

| Palette | Nearest colour to `#FFD700` | Distance |
|---|---|---|
| okabe-ito (default categorical) | `#F0E442` yellow | 3.5 |
| inferno (sequential) | `#f7d13d`, the top | 2.8 |
| viridis (sequential) | `#fde724`, the top | 3.8 |
| plasma (sequential) | `#febd2a` | 6.7 |
| tol-muted | `#DDCC77` sand | 8.8 |
| pastel | `#FFF099` | 9.6 |
| tol-vibrant, carbon, ylorbr | -- | 20 or more |

The element's own threshold for "measurably apart" is about 15 to 16 on this scale (the
`OTHER_GROUP_COLOR` comment). So the selection gold is effectively the same hue as the eighth
Okabe-Ito colour and as the HIGHEST value of the viridis and inferno scales: on a node coloured by
a metric, a selected low-value node and an unselected top-value node can read alike. The halo is a
ring at 0.4 opacity rather than a fill, which separates it by shape, but not by colour.

The default highlight is worse for a "reserved colour" rule: `#D55E00` is not near a palette
colour, it IS the fifth Okabe-Ito colour, 1.0 from the `ylorbr` sequential scale's second step and
5.5 from inferno's `#ed6925`. A route highlighted with defaults over a community encoding with
five or more groups shares a colour with one community.

**The app's accent is a third colour.** The graphty app's accent (the Mantine primary colour,
`#228be6` light / `#1971c2` dark, `compact-mantine/src/constants/panel.ts`) is a RESERVED role in
the chrome ("a checked box, the highlighted bin, a filled micro-bar, the Run button",
`shell/panel/panelButtons.tsx` header). It is not the canvas selection colour, and in the dark scheme it is
2.7 from Okabe-Ito blue `#0072B2` (10.1 in the light scheme), so there the chrome's "selected"
blue is also a data colour.

So Figma's "one accent means selected" does not hold today in any of its three parts: the canvas
selection colour differs from the chrome's selection colour, it is not excluded from the data
palettes, and the default highlight is a data-palette colour. Reserving one colour would be an
element change (the halo default, `DEFAULT_HIGHLIGHT`, and a palette-quality test that measures
the reserved colour against every shipped palette), not an app change. Changing the halo's
DEFAULT is a visual change, not a type break; `DEFAULT_HIGHLIGHT` and `DEFAULT_SELECTION_STYLE`
are exported values, so their numbers are data a consumer may read.

### 7.18 The size ceiling: renderer or session, and what size the requirements imply

- **It is a temporary renderer limit.** `DEFAULT_LIMITS.renderCeiling` (50,000 nodes) and
  `edgesDrawn` (100,000 edges) were lowered from the design's 200,000 / 500,000 on 2026-09-26 and
  enforced, because the renderer's JavaScript heap, not the GPU and not any algorithm, runs out:
  about 20 KB of heap per edge and 10 KB per node, a 3,586 MB heap cap in that Chromium, the
  renderer process dying at 18,000 nodes / 180,000 edges (`session/limits.ts` file header; the
  measurement comment on #405). 200,000 nodes with no edges load in 2.6 s at 2.0 GB. The limits
  file says to "re-measure and raise" once shared arrow materials (PR #394) and one mesh per edge
  style (#419) land; #419's target is 200,000 nodes / 500,000 edges and its done-when includes
  measuring 100,000 nodes / 1,000,000 edges.
- **Only the element's data manager enforces it.** `refuseAboveCeiling` lives in
  `managers/DataManager.ts` (lines 606, 942, 1240 and 1645), which is the rendered element's
  loading path. A headless `createGraphSession()` builds its own `GraphStore` in `resolveStore`
  (`session/GraphSession.ts` line 551) with no check, and nothing else reads `DEFAULT_LIMITS` for
  counts. So a headless session in Node holds whatever graph-format can hold; the ceiling is not a
  session limit. The error text says as much: "past the N this renderer can draw".
- **The selection cap is a session limit, and truncates rather than refuses.** `selectionCap` is
  5,000 (`session/selection/SelectionApi.ts` line 54), applies to headless and rendered sessions
  alike, and drops members past the cap in index order, nodes before edges (`#enforceCap`), so a
  truncated selection is at least reproducible. `selection.promote(name)` saves the truncated
  node ids. A saved scope made from a SPEC (`{ where }`, `"largest-component"`) resolves every time
  and has no cap. So the cap constrains kept sets only when they are made THROUGH the selection.
- **What the requirements base says about size.**
  - Explicit numbers in the personas: the Genomics Cytoscape User works on "100 to 600 proteins"
    (and an example of "about 150 nodes"); the Bioinformatics Researcher on "tens of thousands of
    nodes"; the Marketing Network Analyst's frustration is "social graphs with millions of users";
    the ML Engineer's goal is "millions of users and items" and frustration "millions of edges".
    No other persona states a size.
  - The workflows state no graph sizes. Enrichment Map names "thousands of nodes and a slow
    canvas" as a pain point; Threat Hunting and Influencer Identification require the
    large-graph-rendering capability.
  - The capabilities are specific. Large Graph Rendering asks for 60 fps to 10,000 nodes / 50,000
    edges, 30 fps to 50,000 / 200,000, 15 fps to 100,000 / 500,000, and "'Graph too large'
    warning when node count exceeds 200,000"
    (`design/designloom/capabilities/large-graph-rendering.yaml`). Analysis timings are stated for
    graphs under 5,000 (exact betweenness) to under 100,000 nodes (degree, PageRank, Louvain,
    components, shortest path).
  - Reading: the requirements base's DESIGN TARGET is a graph of up to about 100,000 nodes /
    500,000 edges drawn, 200,000 nodes as the refusal point, with "millions" as a stated
    frustration that no workflow or capability turns into a requirement. #419 aims the
    renderer at the same place: 200,000 nodes / 500,000 edges. The "10,000-to-1,000,000-node graphs that five personas describe" in
    `graph-analysis.md` section 6.3 are not in the persona or workflow files; they are that
    note's own estimates per workflow.
- **What the target implies.** At 100,000 nodes: the linear standing statistics (7.8) are cheap
  to show at rest; exact betweenness and all-pairs measures are not (the capabilities themselves
  switch to "approximate" above 5,000 for betweenness); a Louvain run on such a graph routinely
  returns hundreds of communities (`graph-analysis.md` section 6.8 cites 261 communities above
  100 members on 2.6 million nodes), so a partition must be browsable as a list, not only as
  eight colours; kept sets from rules routinely exceed 5,000 and must not pass through the
  selection. For the file, 4 to 8 bytes per node per stored column is 0.4 to 0.8 MB per column at
  100,000 nodes (`graph-analysis.md` section 6.11's arithmetic): a JSON text file of a few stored
  columns is still workable at the target, while a file meant for a million nodes, or for edge
  columns at 500,000 edges, argues for a binary columnar member such as graph-format's wire form
  (7.15).

### 7.19 Addressing one group of a result without copying its members

Whether "community 3 of this run" (or "the second of the k shortest paths") can be named by
reference to the run and the group value -- as a scope, a style selector, a selection target and
a note anchor -- so that nothing copies member ids. It decides whether acting on one community in
place is something the framework can assume, or whether the reader must keep the group first.

| Use | Works by reference today? | How | What breaks it |
|---|---|---|---|
| Scope (what a run or a count covers) | yes | `{ where: "results.<runId>.group == \`3\`" }`, and `scope.save(name, that spec)` keeps the TEXT, resolved on every use (7.2) | see the three limits below |
| Style selector | yes | `{ match: "expression", where: "results.<runId>.group == \`3\`" }` | same |
| Selection target | yes, but the selection itself is ids | `selection.apply({ where }, op)` resolves the text once and stores the resulting node and edge ids; the selection keeps no reference and is capped at 5,000 (7.18) | the selection is a copy by construction |
| Note anchor | no | notes do not exist (issue #145); the designed `Note.target` is `{ node }`, `{ edge }` or `{ point }` only (`element-api-design.md` section 4.15.3), with no set, group, run or object arm | a note on a community is not in the design at all |

All four accept the same expression because one query engine compiles every one of them
(`session/query.ts` file header: "a layer selector and a scope with the same text match the same
elements, because they are the same code reading the same values"). A run id that carries a
hyphen (`label-propagation_x`, or an author id like `my-run`) must be written as a quoted segment,
`results."my-run".group`; the compiler refuses the unquoted form at the character, and the
element's own highlight writer quotes it (`session/styles/predicate.ts`, the quoting helper near
line 1080).

Three limits make "by reference" weaker than it looks:

1. **Group values are not identities.** `group` is whatever integer the algorithm assigned on this
   execution. Louvain numbers communities by node order, label propagation by its seeded draw
   (7.9), and a re-run of the same definition after the data moved re-numbers them. A reference
   that says "group 3" follows the run but may land on a different community. Group names and
   identity across re-runs are unbuilt (issue #191; 7.4).
2. **A removed run leaves the reference wrong in silence.** Run on the published 2.3.1 (Louvain
   as `as: "comm"` on two joined five-node cliques; `scope.save("A", { where:
   "results.comm.group == \`0\`" })`; then `runs.remove("comm")`): the saved scope stays
   `bound: true` and still resolves to the 5 members it had before the removal, while the same
   expression typed fresh resolves to 0. So a saved reference to a removed run does not even
   dangle visibly: it keeps answering with a stale membership until something forces a new
   resolution. A hand-written layer with the same selector matches nothing (7.1).
3. **Paths have no group dimension.** A path result publishes `onPath` and `order` for ONE path
   per run (`session/results/types.ts`, the `path` row). No built-in algorithm returns k shortest
   paths: `shortest-path` returns one route, and `all-paths` is a reserved key with no
   implementation (issue #329, "implement all simple paths between two nodes"). So "the second of
   k paths" has no value to refer to; each alternative route would be a separate run.

What is missing for an in-place community action: (a) a group identity that survives a re-run
(an overlap-matched stable key, issue #191), exposed as a field the query engine reads; (b) a
`Scope` arm that names a run-result block directly (the owner's "run-result set", 7.12), so a
reference is structured data rather than expression text a consumer assembles; (c) a note target
arm for a set or object; (d) a published rule for what a reference to a removed run becomes
(finding 12). Without (a), the framework cannot assume in-place community actions are durable:
the honest flow is to keep the group first (freeze its members, or bind to a stable group key
once one exists), then act on it.

### 7.20 What the selection can hold

**Only nodes and edges.** `session.selection` is two id sets and nothing else: its members are
`nodes`, `edges`, `size`, `cap`, `truncated`, `has`, `nodeMask`, `edgeMask`, `apply`, `clear`,
`promote` and `statistics` (read from the published 2.3.1 prototype). `SelectionTarget` arms all
resolve to node and edge ids (1.7). There is no selection of a run, a saved scope, a layer or a
note, and no event for one.

**No design or issue gives the element an object selection.** The object-first model describes
two selections -- "Object selection: tree rows, one or more" and "Element selection: nodes and
edges, the element's own `session.selection`" (`design/ui/object-first-ux/object-model.md`
section 8) -- and its proposed `session.objects` API lists `list`, `create`, `move`, `rename`,
`setVisible`, `setLocked`, `setScope`, `rerun`, `remove`, `focus` and `objects:changed`, with no
selection member (same file, section 11). The element API design has no object noun at all. No
issue asks for one. The app's inspector already switches on an app-side `SelectionKind` that
includes `algorithm-result` and `style-layer` (section 2).

What that means for the framework. An object selection is "which object the inspector is showing
and which rows are highlighted". Two readings are defensible under the root instructions:

- It is presentation state (like which panel is open), so the app may hold it as long as every
  object it names is an element-minted id and every property it shows is read from the element.
  This reading holds while nothing but this one UI needs to know the selected object.
- It is shared state, because the object-first design routes the same selection to the canvas,
  the table, a headset and the assistant ("shared with the canvas, the table, a headset and the
  assistant"). Anything a headset or an assistant must see belongs in the element, since those
  are other consumers.

The element selection already takes the second role for elements. If the framework needs the
assistant or an XR view to act on "the selected community" or "the selected layer", object
selection must be an element addition (a third set of object ids on `session.selection`, or a
selection member on the objects API), and it becomes a published name. If it only drives the
inspector, the app can hold it without owning graph state. Either way it needs object identities
first, which do not exist (1.4).

### 7.21 Who owns visibility and style layers, and what a saved view can hold

**Ownership: the session, and two views of one session cannot differ.** The element API design
states one placement rule: "If two synchronised views of one dataset would disagree about it, it
belongs to the view. Otherwise it belongs to the session." Views disagree about "the camera, the
pointer, the hovered element, the view mode, the viewport, the screenshot and the XR session";
they "must agree about the data, the runs, the selection, the filter, the layers and the
positions" (`element-api-design.md` section 1.4, repeated in the header of the published
`session/types.d.ts`). The design refuses per-view filters or layers explicitly: two pictures
that must differ are two sessions over one data core, `createGraphSession({ shareDataWith })`,
because "a view-owned filter, layer stack or run binding ... would make 'which picture is this?'
unanswerable from the session" (section 3.3). So visibility (filter mask and time window) and
style layers are session state by design.

**What exists in 2.3.1:** one element, one session. The element's `session` is a getter only
(`graphty-element.ts` line 113), so two elements cannot share a session, and `shareDataWith` and
`createComparison` appear nowhere in the source. Neither the synchronised nor the divergent form
of two views is buildable today.

**A contradiction to resolve in the IA.** The object-first decisions let "Compare's second canvas
take a View as its mask" (`round-2/decisions.md`, row P4), and the object model's saved View is
"camera + view mode + mask". A per-canvas mask is exactly the view-owned filter the element
design refuses. Under the element design, a View that carries a mask is legitimate only as a
SESSION-level object (applying it sets the one mask), and a second canvas with a different mask
is a second session. The framework should adopt that reading: a saved View's mask member is a
visibility specification that applying the View writes into the session, not a property of a
canvas.

**What a headless `createGraphSession()` can hold today**, per saved-view part:

| Part | Held by a headless session? | Serialisable today? | Published type |
|---|---|---|---|
| Camera | no: camera lives on the element's `Graph` (`getCameraState`, presets) | the element's `getCameraState()` returns plain data; presets export as `Record<string, CameraState>` | `CameraState` in `.` (renderer entry) |
| View mode (2D, 3D, VR, AR) | no: element only (`setViewMode`) | as a string | `ViewMode` in `.` |
| Positions | yes: `session.positions` (`read`, `write`, `isPinned`, `setPinned`, `placedCount`) | readable per node as numbers; no session serialiser | `ElementPositions` (type only) in `./session` |
| Visibility | yes: `visibility.filter` and `visibility.window` read back as plain `Filter` / `TimeWindow` specs | the specs are plain JSON; no session serialiser | `Filter`, `TimeWindow` in `./session` |
| Style layers | yes | yes, the only one: `styles.toDocument()` gives `StyleDocument` version 1 | `./session`, `./schema` |
| Saved scopes | yes: `scope.list()` gives `SavedScope { id, name, spec, bound }` | the specs are plain JSON; no document type | `./session` |

Consequences. The session contract (`./session`) can carry positions, visibility, styles and
saved scopes. The camera and the view mode are renderer-only, so a saved View's camera is either
(a) a member the session carries OPAQUELY -- stored and returned, never interpreted, the way the
designed `ViewPreset { mode, camera }` sits inside `GraphtyDocument` -- or (b) a type that moves
into a Node-safe entry. Only (b) lets a headless consumer (a Node script building a project file)
create a View; (a) is enough for round-tripping. Choosing is a published-contract decision,
because `ViewPreset` would then be exported from `./session` or `./schema`. Note that the published
`CameraState` and the designed `ViewPreset.camera { position, target, zoomPercent }` are different
shapes already.

### 7.22 Rebinding an author-assigned run id, undo of a parameter change, and run memory

**Can an `as:` id be rebound to a new definition?** Not in place. Starting a different definition
under an id the session holds is refused with `E_DUPLICATE_ID` ("The run id ... already names a
different computation. Choose another id, or remove the run that holds it.",
`session/runs/RunsApi.ts` `reuse`). The only route is `runs.remove(id)` followed by
`runs.start(..., { as: id })`. That route:

- deletes every layer the old run painted and forgets its first-paint flag, so the new run paints
  afresh (`RunsApi.remove`);
- deletes the old result, with no way back (there is no history);
- leaves hand-written layers and saved `{ where }` scopes that read `results.<id>` in place, and
  they read the NEW run whenever they are next evaluated, because the value source looks the id
  up with `runs.get(x)` at read time (`session/styles/sources.ts`, the `results` reader). The
  alias is the run's id; there is no second alias table. A saved scope can go on answering with a
  membership it cached before the swap until something forces a new resolution (7.19).

**Does it break "same definition, same id"?** No, because that rule governs DERIVED ids only
(`<algorithm>_<digest>`, 7.11). An author id is outside it by construction: the element records
the definition under it and refuses a different one while the run exists. Rebinding through
remove-and-start keeps derived ids untouched. Two cautions: nothing stops an author id from
spelling a derived id (both match `/^[a-z][a-z0-9_-]*$/`), and a saved `StyleDocument` that names
an author id binds to whatever run holds that id when it is applied, so the author id is a
stable NAME, not a stable definition.

So measure identity can reuse the existing results root: an object id used as an `as:` alias
gives every reader (`results.<objectId>.<field>`) a path that survives a parameter edit, and no
new namespace is needed for READING. What the element lacks is a verb that rebinds atomically
(swap the definition under an author id, keep the reference, record the old run for undo).

**Undo of a parameter change.** There is no undo (issue #427 is open; section 7.14). #427 states
the intended behaviour: "undo removes an analysis result and redo restores the stored result";
"an algorithm run that adds a result, a style and a legend is one step"; "the history is capped
by memory, not by step count". So the designed answer is one step restoring both the previous
values and the previous style layers, from stored results rather than a recompute. Nothing
implements it.

**Are replaced runs kept after the session ends?** No. A run changed by starting a new
definition (7.1) stays in `runs.list()` with its result until removed or until the session is
disposed; nothing persists any run, and no project file exists (#301).

**Does the session evict runs?** No. No cap, eviction or LRU exists in `session/runs` or
`session/results`; every run and its result live until `runs.remove` or `dispose`.

**Memory of one result.** Measured on the published 2.3.1 package in Node 22 (`createRunResult`,
the factory every run's result passes through; retained heap after a forced collection, including
the input values the result keeps as frozen per-node records, string node ids, one node per id):

| Nodes | Node metric (value, rank, percentile), after reading a ranking, a column, a histogram and the summary | Partition (group, groupSize) |
|---|---|---|
| 10,000 | 3.9 MB | 2.4 MB |
| 50,000 | 18.7 MB | 11.5 MB |
| 100,000 | 37.8 MB (28 MB before the reads) | 15.1 MB |
| 200,000 | 56.7 MB (37 MB before the reads) | 30.7 MB |

That is about 280 to 390 bytes per node for a metric and 150 to 240 for a partition: plain
JavaScript objects, not typed columns, and the ranking and column caches a reader triggers add
about a third. An edge metric scales the same way per edge. The script is not in the
repository; the numbers carry the normal noise of heap measurement, about 10 percent.

Consequence for keeping replaced runs: at 100,000 nodes a history of 20 kept metric runs is
roughly 0.5 to 0.8 GB of JavaScript heap on top of the graph, against a renderer that already dies
near 3.6 GB (7.18). Keeping every replaced run in memory for undo is affordable for a handful of
steps at the design target and not for an unbounded history; #427's "capped by memory" rule is
therefore load-bearing, and a file that must restore replaced runs should store deterministic ones
as a recipe (7.9) and only non-reproducible ones as values. Typed-array result columns would cut
the metric figure to about 8 to 24 bytes per node per field; that is an element change with no
effect on published names.

**The run record misstates the versions that produced it.** Every run on 2.3.1 reports
`engine: { element: "1.10.0", algorithms: "1.4.0", layout: "1.3.0" }` (seen on every benchmark
run in 7.23), because the versions are hand-kept constants that were not updated for 2.x
(`session/runs/engine.ts`, whose header says "Keep them in step with" the package manifests). A
file that stores run records to judge whether a restored value is comparable would record wrong
versions today; it is an element defect with no issue.

### 7.23 Measured run times in the element, CPU, and what the GPU changes

**What was measured.** The published graphty-element 2.3.1 (its self-contained `graphty.bundle.js`)
in headless Chromium 143 through Playwright, `acceleration="off"`, a seeded random undirected
graph with integer weights 1 to 100, `layout="fixed"` with coordinates supplied,
`session.runs.start(key, {}, { scope: "graph" })`, one run per row. The element read these graphs
as DIRECTED although the page set `directed="false"` (7.25), so direction-sensitive runs used
their directed reading; that changes no order of magnitude below. "Compute" is the run's own
`durationMs` (execution start to result). "Wall" is from `start` to the awaited run, which also
includes waiting in the element's operation queue and the first-completion paint the element
applies by default (the auto-apply policy of `element-api-design.md` section 4.4.5). The box is
shared: the 1-minute load average was 13 to 48 on 32 logical cores during these runs, so every
number is an upper estimate. The script is not in the repository.

**Two things cap the question before timing does.**

- **100,000 nodes cannot be run in graphty-element today by any route.** A rendered element
  refuses a load above 50,000 nodes or 100,000 edges with `E_TOO_LARGE` (7.18), and a headless
  `createGraphSession()` has no algorithm executor: `runs.start` fails with `E_UNSUPPORTED`, "This
  session has no algorithm executor ... every algorithm this package ships is built from the
  renderer" (reproduced on 2.3.1 in Node). So at 100,000 the only numbers are for
  `@graphty/algorithms` itself.
- **At the 50,000-node ceiling the edge limit forces a sparse graph** (at most 2 edges per node),
  so 50,000 is measured at 100,000 edges.

**Compute time inside the element (CPU):**

| Algorithm | 1,000 n / 10,000 e | 10,000 n / 20,000 e | 10,000 n / 100,000 e | 50,000 n / 100,000 e |
|---|---|---|---|---|
| degree | 9 ms | 14 ms | 31 to 74 ms | 132 to 185 ms |
| PageRank | 7 ms | 20 ms | 15 to 33 ms | 146 to 167 ms |
| components | 8 ms | 9 ms | 19 to 22 ms | 44 to 75 ms |
| Louvain | 17 ms | 63 ms | 198 to 367 ms | 440 to 617 ms |
| closeness (exact, every source) | 350 ms | 14.9 s | 35.5 s | no result: the page closed about 6 minutes into the run |
| betweenness (exact, every source) | 0.74 s | 38 s | 91 s | not run; roughly 15 to 40 minutes, scaled from the 10,000-node rate |
| all-pairs distance (Floyd-Warshall) | 34.8 s | about 10 hours (cubic) | same | same |
| triangle count / clustering coefficient | not in the element | -- | -- | -- |
| average path length, diameter (sampled) | not in the element | -- | -- | -- |

**What the default paint costs.** With the element's default first-completion paint, the wall
time is dominated by the paint, not by the computation, once the graph has many edges:

| Graph | Run | Compute | Wall, default paint | Wall, `style: false` |
|---|---|---|---|---|
| 10,000 n / 20,000 e | PageRank | 20 ms | 21 ms | -- |
| 10,000 n / 100,000 e | PageRank | 15 to 33 ms | 5.0 to 26 s | 15 to 26 ms |
| 10,000 n / 100,000 e | Louvain | 198 to 367 ms | 12.6 to 47 s | 198 ms |
| 10,000 n / 100,000 e | degree | 31 to 74 ms | 11.5 to 47 s | 76 ms |
| 50,000 n / 100,000 e | degree, first run after the load | 132 to 185 ms | 306 s | 399 s |
| 50,000 n / 100,000 e | degree, a later run | 159 ms | -- | 160 ms |
| 50,000 n / 100,000 e | PageRank | 167 ms | 186 s | 146 ms |
| 50,000 n / 100,000 e | components | 75 ms | 247 s | 44 ms |
| 50,000 n / 100,000 e | Louvain | 617 ms | 388 s | 440 ms |

With `style: false` wall time equals compute time, except for the FIRST run after a load, which
waits in the element's operation queue behind the load's own rendering work: 7 s at 10,000 nodes
and 100,000 edges, 5 to 7 minutes at 50,000 nodes (under a load average of 30 to 45), painted or
not. So the multi-second to multi-minute cost is the first paint of an encoding layer on a graph
with many edges, which matches the renderer's
per-edge mesh cost recorded in issues #405 and #419 (one mesh and one material per edge). This is
a renderer cost, not a measure's cost, and it will move when edges are drawn as instances (#419);
it is recorded here because a "Compute (about N s)" label that quotes the computation would
understate what the reader waits for by two to three orders of magnitude today.

**The long exact runs freeze the page.** Closeness and betweenness call one synchronous function
of `@graphty/algorithms` on the main thread (`BetweennessCentralityAlgorithm.ts` line 55,
`ClosenessCentralityAlgorithm.ts` line 53), and the element has no worker host (deferred,
`element-api-design.md` section 9.3). While one runs, nothing on the page responds, and a
`run.cancel()` cannot take effect until the call returns, because the cancel arrives as an event
the blocked thread cannot handle. A "Compute" row for either measure above a few
thousand nodes therefore needs a worker, a sampled form, or both, before it can promise a Cancel.

**`@graphty/algorithms` at 100,000 nodes and above** (Node, one thread, random graphs with ten
edges per node, minimum of up to 14 runs at load 8 to 64; from
`tmp/gpu-cost-model/cpu-measurements.md`, the measurement behind
`design/decisions/2026-09-26-which-algorithms-earn-the-gpu.md` on the remote `master`):

| Algorithm | 10,000 n | 100,000 n | 1,000,000 n |
|---|---|---|---|
| PageRank to tolerance 1e-6 (typed-array code) | 3.1 ms | 28 ms | 0.87 s |
| connected components (typed-array code) | 1.4 ms | 14 ms | 0.19 s |
| Louvain (the shipped code) | 172 ms | 2.5 s | 82 s |
| closeness, one source (the shipped code) | 6.7 ms | 536 ms | 80 s |
| closeness, every source | 67 to 108 s, extrapolated from one source | about 15 hours | about 2.5 years |
| betweenness, every source (the shipped code) | 150 s | about 4 hours, predicted | -- |
| betweenness, 100 sampled sources (a reference typed-array Brandes, not package code) | 226 ms | 3.1 s | 84 s |
| triangle count (a reference implementation, not package code) | 11 ms | 142 ms | 2.0 s |
| Floyd-Warshall | 42 s at 1,000 n | -- | -- |

The element's own 10,000-node figures above (closeness 35.5 s, betweenness 91 s) are lower than
these library figures because the element read its graph as directed (half the arcs) and ran on a
different graph; the order of magnitude agrees.

The package has no triangle count, no clustering coefficient (issue #330), no sampled
betweenness entry point, no `sources` option on closeness (issue #426), and no diameter,
eccentricity or average path length (issue #310). The element passes no sampling option to any
algorithm and publishes no `approximable` descriptor (7.9).

**What the GPU changes.** Inside the element only PageRank, connected components, BFS, shortest
path and minimum spanning tree have a WebGPU route (`this.accelerated(...)` calls in
`src/algorithms/`); betweenness, closeness, Louvain, triangles and all-pairs have none. The
decision record gives the GPU's speedup over the CPU at 100,000 nodes in Chromium on an RTX 4070
SUPER: PageRank to convergence 3.0x (crossover about 29,000 nodes), connected components 0.77x
(slower below about 132,000), and for unbuilt kernels: sampled betweenness 3.1 to 13x, sampled
closeness 27x, triangles 2.3 to 9.7x (unverified), all-pairs refused above 5,792 nodes, Louvain
2.3x against a CPU port that does not exist. At the renderer's 50,000-node ceiling the GPU changes
nothing a reader would notice for the measures asked about: the fast ones already take under a
quarter of a second on the CPU, and the slow ones have no GPU route.

**Reading for "at rest" versus "Compute".**

- Degree, PageRank, components and Louvain compute in under a second at every size the element
  can hold (at most 0.62 s, Louvain at 50,000 nodes). They qualify for at-rest display on computation cost alone;
  what disqualifies them today is the paint, and only when the at-rest value is painted.
- Exact closeness and betweenness cross 10 seconds near 10,000 nodes and freeze the page while
  they run. They are "Compute (about N s)" rows at 10,000 and not offerable as exact values at
  50,000.
- All-pairs distance is cubic: 35 s at 1,000 nodes. It is not a graph-statistics route to a
  diameter at any size the personas describe.
- Average path length, diameter and a clustering coefficient cannot be offered at any size until
  the algorithms exist (#310, #330). When they do, the sizes above say they must be SAMPLED above
  a few thousand nodes, so "estimated (sampled)" has to be a value state with the sample size and
  seed in the caveats (the `Caveats.sampleSize` and `seed` fields already exist), and the element
  needs a sampler that honours `StartOptions.sample` (published, unused today).

### 7.24 Weak or strong components on a directed graph

- **The `components` run computes WEAKLY connected components by default.** Its catalogue entry
  merges the old `connected-components` and `scc` keys behind one parameter, `strength`,
  `"weak" | "strong"`, default `"weak"`, described as "Weak follows an edge in either direction.
  Strong needs a directed path each way, and only differs from weak on a directed graph"
  (`catalog/algorithms.ts`, `componentStrengthOptions`); the legacy key `scc` maps to
  `{ strength: "strong" }`.
- **The run records which.** The parameter is in `run.params` (a default is dropped from the
  canonical form, so a weak run's derived id equals the id of a run with no parameters, and a
  strong run gets a different id). The caveats say so as well: weak sets `method:
  "connected-components"`, `direction: "undirected"` and the note "Strength: weak. An edge joins
  its two nodes whichever way it was declared."; strong sets `method:
  "strongly-connected-components"`, `direction: "directed"` and "Strength: strong. Two nodes share
  a piece only when a directed path runs each way." (`ConnectedComponentsAlgorithm.ts`,
  `StronglyConnectedComponentsAlgorithm.ts`).
- **The published fields and names do not.** Both strengths publish the same community shape with
  the same field names (`group`, `groupSize`) and the same plain name ("Separate pieces") and field
  words ("Piece"). A legend or reading that shows only the field cannot tell the two apart.
- **`data.statistics().components` uses the weak definition**, "ignoring arc direction", because
  "how many pieces is this network in?" is read as a connectivity question (`session/statistics.ts`,
  `labelComponents`). The `ComponentStatistics` type (`count`, `sizes`, `largestSize`,
  `isolatedCount`, `truncatedSizes`, `componentOf`) carries no field naming its kind.

For the vocabulary: weakly and strongly connected components are two distinct measures on a
directed graph, and the element already treats them as two parameterisations of one run. An at-rest
component count on a directed graph must name its kind ("3 weakly connected pieces"), because the
statistics object does not; the words can come from the run's caveat note or from a field the
element adds to `ComponentStatistics` (an additive change).

### 7.25 Direction per edge

- **graph-format can represent it, but only as an expansion.** A snapshot carries one `directed`
  flag for the whole graph (`graph-format/src/types/snapshot.ts`). For a mixed file, the builder
  can hold a DIRECTED snapshot in which each undirected edge is expanded into two directed halves,
  with reserved edge columns `graphty.directed` (0 on both halves of an undirected edge) and
  `graphty.pair` linking the halves, plus `graphty.mutual` for a GEXF `mutual` edge
  (`graph-format/src/builder/graph-builder.ts` lines 67 to 70 and 355; graph-io's
  `src/common/direction.ts` header). graph-io's GraphML and GEXF importers use this under their
  default `onMixedDirection: "expand"`, and the GraphML exporter writes the mixed file back with
  `edgedefault` plus per-edge `directed`. Issue #309 ("graph-format: cannot represent a graph with
  both directed and undirected edges") asks for a true per-edge column with a role and calls the
  change "a one-way door" for the data format.
- **graphty-element does not use any of it.** It reads files with its own importers, not graph-io
  (1.5). Its GraphML importer adopts `edgedefault` for the whole graph and keeps each edge's own
  `directed` attribute on the edge RECORD as `directed`, where a style or filter expression can
  read it, and counts the disagreements (`data/GraphMLDataSource.ts` lines 263 to 272). Its GEXF
  importer keeps the edge's `type` on the record and resolves the graph's direction from
  `defaultedgetype` or, when that is absent, from whether any edge says directed
  (`data/GEXFDataSource.ts`). The element's store never writes `graphty.directed` or
  `graphty.pair`, `DataConfig` has no per-edge direction key, and `statistics().directedness`
  never returns `"mixed"` although the type allows it (`session/types.ts` line 162).
- **Setting the whole graph's direction did not take effect in two probes.** On the published
  2.3.1, a JSON graph loaded into an element whose `directed` attribute was `"false"` -- written in
  the markup before the element connected, or set after it connected and before data arrived --
  reported `statistics().directedness` `"directed"` and `status.directed` true. The likely
  mechanism: the store reads `data.directed` when it is created (`DataManager.createStore`, at
  construction and on `clearData`), no other reader in `DataManager` re-applies it, and the
  builder's own default is directed. No issue records this. Until it is fixed,
  an undirected graph loaded from a format that states no direction is treated as directed.
- **The workflows' named datasets are not mixed.** The datasets the workflows name are STRING and
  BioGRID protein interaction networks, loaded as edge lists (TSV) or through STRING queries
  ("Gene List to Interaction Network with Expression Overlay", "Hub Gene Identification and
  Ranking", "Drug Target Discovery", "Condition Comparison"); both are undirected interaction
  data, and a TSV edge list states no direction at all. KEGG and Reactome appear only as
  annotation sources. GraphML appears only as an import and export format ("Data Import and
  Validation", "Reproducible Session and Network Publication"), with no workflow naming a
  mixed-direction file. No persona or workflow file describes a mixed graph.

Reading: mixed directedness does not need to enter the ontology or the first file format as a
first-class concept. The element can keep a load-time caveat ("12 edges declared undirected in a
directed file were read as directed") plus the per-edge attribute it already keeps, which a
reader can filter and style on. If it is ever wanted, graph-format's expansion columns are the
route that exists; #309's per-edge role is the one-way door, and nothing in the requirements asks
for it before the project file ships.

### 7.26 Writing attribute values through the session

**Not possible today.** `session.data` is read-only (1.3; 7.14). The element has 1.x-style
mutators (`addNodes`, `updateNodes`, `removeNodes`, `setData`) that bypass the session, write
through `DataManager`, are not undoable and would not be saved because nothing is saved. There is
no edge update at all: issue #297, "no getEdges() and no API to update node or edge attributes",
asks for "an attribute update API for nodes and edges (single and batch) that repaints affected
style layers and invalidates statistics", notes that the method names are "a one-way door", and
carries a reversible decision to "build it when scheduled" with names that "follow the session
API's existing verbs".

**What is designed:** `session.data.apply({ kind: "set-attributes", scope, values, target })`
returning a `MutationReceipt` whose `inverse` is a serialisable command (`element-api-design.md`
section 4.3.3). #427 would route it through the one dispatcher and make it an undo step; #301
would save the result.

**Is data editing planned before notes?** No order exists. #297 (attribute writes), #145 (notes
and journal), #427 (undo), #301 (project file) and #337 (the command vocabulary) are all open and
none says which lands first. Two dependencies are real: #427 needs #337, and both attribute
writes and notes need the journal of #145 to be undoable. Attribute storage adds one more: a
headless session has no attribute columns at all (issue #147), so a written value has nowhere to
live except the renderer's record objects until attributes move into the store.

Reading: recording a judgement ("reviewed", "confirmed fraud") as an attribute depends on three
unbuilt pieces (#297, #147 and the journal). If notes ship first, the note schema is the only
place a structured judgement can go, and whatever fields it carries become published format. The
lower-risk order for the file is: attribute writes through the session, then notes as free text
plus targets, so the note schema does not have to carry judgement fields.

### 7.27 Declaring what an algorithm reads, and per-column revisions

- **The catalogue does not declare inputs.** `AlgorithmDescriptor` has `key`, names,
  `description`, `category`, `shape`, `fields`, `options`, `costClass`, `complexity`,
  `approximable` and `requires { directed, weighted, accelerator, connected }`
  (`catalog/types.ts` lines 529 to 562). No member lists attribute columns read.
- **What a built-in actually reads is small and fixed.** Every built-in reads topology and, when
  weighted, the edge weight array the element built at load from `edgeWeightPath`; none has an
  attribute-typed option (`"attribute"` is a published `OptionDescriptor` type that no built-in
  uses). After a run, `Caveats.weight` records "the attribute the weight was read from" and its
  meaning (`session/runs/types.ts` line 168). So for built-ins the input list is derivable today:
  topology, plus the weight path when `caveats.weight` is non-null. A plugin can declare nothing.
- **Revision counters.** graph-format's builder has ONE counter, `mutationCount`, and its
  published contract says "column writes and freeze() do not count" (`graph-format/src/types/builder.ts`
  line 345). Issue #100 records that this makes caches go stale on attribute writes and carries a
  decision to widen `mutationCount` to count them. The element keeps its own single `revision`
  counter in `GraphStore` (`data/GraphStore.ts` line 123, bumped by `touch()`). Neither is per
  column.
- **A per-column counter does not need graph-format's frozen contract to change.** The element
  keeps its attributes in plain record objects outside the snapshot (7.15), so a per-column
  revision map belongs in the element's own attribute store, beside the store's `revision`, and
  graph-format is not involved. Should attributes move into graph-format columns (#147), a
  per-column counter on the BUILDER is an additive member of a 1.0 package (a minor release),
  and the frozen SNAPSHOT still need not carry it: the element can stamp the counters it read onto
  the run at start.
- **Staleness today reads neither.** A run is stale only when its scope's membership digest changes
  (7.1): an attribute or weight edit never marks anything stale.

So "mark a result out of date only when an input it read changed" needs three element changes,
none of them in graph-format: publish an input list on the descriptor (built-ins: topology and the
weight path), keep a per-column revision map beside the attribute records, and record the
counters a run read in its record. The file would then carry those counters (the `graph-analysis.md`
recommendation in its section 6.15), which is the part that is published format.

### 7.28 Who owns note content: the design record, resolved

The sources, on the remote `master`:

- `element-api-design.md` section 4.15.3 (notes): "**The element owns note storage, and notes are
  a document.** The alternative -- primitives here, storage and text with the consumer -- was the
  first shape of this design, and it fails the same test the rest of the API is built on: every
  consumer would write the same store, and no note would be portable between two of them." It
  specifies `session.notes` with `add`, `update`, `remove`, `list`, `toDocument(): AnnotationSet`
  and `applyDocument`, and a `Note` with `text`, `tags`, `author`, `target`, timestamps and an
  `orphaned` stamp.
- The same document, sections 9.2 and 9.3: "Note content: the text, the author, the tags, the
  storage and the hover card" stay with the consumer, "not the element's at all".
- Both passages come from the same commit (`dad72f06`, 2026-09-19). Section 4.15.3 names the
  consumer-storage shape as the REJECTED first shape, so sections 9.2 and 9.3 read as that first
  shape surviving in the summary tables.
- Issue #145 asks for "`session.notes` as designed", with acceptance "`session.notes` can add, list
  and remove notes and round-trips its document", tested "on a standalone session".
- Issue #427 lists "notes" and "saved views" among "every piece of state" the element owns, and
  makes "everything that is saved in the project file" undoable.
- Issue #301 lists "data, style layers, algorithm runs, layout positions, filters, camera" and does
  not mention notes or saved views.
- `owner-decisions-2026-09-22.md` does not mention notes.

Resolution: section 9.2's "note content belongs to the consumer" does NOT stand. The later-written
issues (#145, #427) and the design's own notes section put note text in element state, and the
root instructions' rule that a capability every consumer would need belongs in the element decides
the same way. Notes and saved views are members of the element-owned project file by #427's rule;
#301 simply predates the wording. This supersedes the "disputed" entries for notes in section 3
and finding 5 of this note. It has a cost: the note schema
(`Note`, `AnnotationSet`) becomes published format when notes ship, so its target arms and any
structured fields must be settled first (7.19 and 7.26 each add a reason). The self-contradiction
in `element-api-design.md` is a documentation defect worth fixing in the element's design record.

### 7.29 Edge picking, edge drawing and an edge arm, relative to the file and the IA

- **No order is planned.** Edge picking has no issue (7.12). Drawing a selected edge is blocked on
  the edge renderer rewrite (issue #419), whose text mentions neither picking nor selection. An edge arm
  for `Scope` is an owner decision with no issue. The project file (#301), undo (#427) and notes
  (#145) are open and unordered. Nothing places any edge route before or after the first file or
  the IA.
- **The table does not drive the selection on the remote `master` either.** The app's
  `DataTableDrawer` accepts `selectedIds` and `onSelectionChange` and `CanvasRegion` forwards them,
  but the `drawer` block `AppShell.tsx` builds (around line 4563) passes neither, and nothing in
  the app creates an inspector selection of kind `"edge"` (the edge inspector is reachable only
  from a test). So the table is not yet a route to an edge.
- **The element side of a table route exists.** `selection.apply({ ids })` selects edges by id
  from script, `selection:changed` reports it, and `selection.statistics()` describes it. Wiring
  the table's Edges tab to it is app wiring over an existing element API, which the root
  instructions allow. What stays missing is the canvas half: a selected edge is not drawn (7.12),
  so a table-selected edge is invisible on the canvas until #419 lands.
- **Edge ids are unstable across reloads** (7.15), which is the constraint that matters most for
  the file: an edge-targeted note or override keyed by `EdgeId` can re-attach to a different edge
  after an edit that changes load order.

Reading: until picking exists, the table's Edges tab is the only practical canonical route to an
edge, and it is buildable now. Edge-targeted notes can be DESIGNED into the first file format (the
designed `Note.target` already has an `{ edge }` arm), but only once edge identity is stable across
reloads -- either by keying on the file's own edge id when it has one (`edgeIdPath`, used today
only to recognise repeats) or by an endpoint-plus-ordinal key -- because a note that silently
moves to another edge is worse than no edge note.

## Follow-up: what the figure-producing phases encode

Question: when a workflow in the requirements base (`design/designloom/workflows/*.yaml`) puts
colour, size or a highlight on the canvas, is the value an imported data column or an algorithm's
result? The answer decides whether "colour or size by attribute" should be reached from the data
or from a result.

A phase counts as figure-producing when it maps values onto the canvas for reading or export.
Each workflow's task phases, information needs and required capabilities were read and coded.
Only five workflows name the encoding in words; the rest were coded from what the phase reads.

| Encoding source | Workflows | Count |
|---|---|---|
| Imported column only | Gene List to Interaction Network with Expression Overlay (fill by logFC, size by a second column); Enrichment Map (size by gene-set size, colour by FDR or NES from the imported enrichment table) | 2 |
| Algorithm result only | Iterative Analysis Cycle (centralities, communities); Community Analysis; Path Investigation (the path highlighted); Criminal Network Analysis (leaders by centrality, subgroups); Influencer Identification; Anomaly Detection (anomaly scores); First-Time User Onboarding (first community run); Hub Investigation; Network Evolution Analysis; Cluster and Functionally Annotate (colour by cluster); Hub Gene Identification and Ranking (size or colour by combined score); Condition Comparison (edges by "in A only / in B only / both", computed by the merge) | 12 |
| Both | Fraud Ring Investigation (the imported alert flag, plus community and risk scores); Drug Target Discovery (centrality, plus imported expression and druggability); Supply Chain Risk Assessment (betweenness, plus imported tier and geography) | 3 |
| Source not stated | Visual Exploration - Overview to Detail; Findings Communication ("highlight key findings"); Reproducible Session (re-exports what is already encoded) | 3 |
| No figure-producing phase | First Exploration, Threat Hunting, Knowledge Graph Construction, Graph-Based Recommendation, Data Import and Validation | 5 |

**Result.** Of the 20 workflows with a figure-producing phase, 15 encode an algorithm's result
and 5 encode an imported column (3 of those encode both). Counting only the five workflows that
name the encoding in words, 3 encode a result and 2 an imported column. Either way, encoding a
result is the common case.

**What it means for ranking.** Colour or size by a value is a top task, but it usually follows a
run: the analyst computes something and then wants to see it. The paved route is therefore from
the result ("colour by this"), with colour by an imported column as the same control reached from
the data. Ranking "colour by attribute" as a data-first task would serve the two expression and
enrichment workflows and make the other fifteen take the longer way.

## Follow-up: how many frequent users need shortest path in most sessions

Source: `design/designloom/personas/*.yaml`, field `context.frequency`, plus each persona's
quote, behaviours, goals and assigned workflows. No persona records how often a single task
recurs within its sessions, so "most sessions" was judged from whether paths are the persona's
stated way of working (quote, bio, first behaviours), not one tool among several.

Eleven of twelve personas use graphty weekly or daily (Explorer Elena is "as-needed").

| Persona | Frequency | Needs a path in most sessions? | Evidence |
|---|---|---|---|
| Fraud Detection Analyst | daily | yes | quote "I need to see the money trail"; "Traces multi-hop paths to follow money through layering schemes"; assigned Path Investigation and Fraud Ring Investigation |
| Cybersecurity Threat Analyst | daily | yes | "She thinks in terms of attack paths, not individual events"; "Traces lateral movement paths" |
| Intelligence Analyst | daily | yes | frustration "Losing context when exploring deep paths"; goal "Trace flows of money, drugs, weapons"; assigned Path Investigation |
| ML Engineer - Recommendation Systems | daily | sometimes | "Explain recommendations through network paths"; Graph-Based Recommendation requires shortest path, but as a batch feature, not an interactive question |
| Analyst Alex | weekly | sometimes | paths are one of three families he picks from; Path Investigation is 1 of his 10 workflows |
| Supply Chain Network Analyst | weekly | sometimes | "Identifies alternative paths and backup suppliers"; his one workflow does not require a path capability |
| Bioinformatics Researcher | weekly | rarely | Drug Target Discovery uses proximity to disease genes; 1 of 11 workflows |
| Marketing Network Analyst | weekly | rarely | "information flow paths for campaign presentations" |
| Expert Emma, Genomics Cytoscape User, Knowledge Graph Engineer | daily or weekly | no | no path in quote, behaviours or workflows |

**Result: 3 of 11** frequent users need shortest path in most sessions (fraud, cybersecurity,
intelligence), all daily users and all investigators; 3 more use it sometimes. A mismatch worth
fixing in the requirements base: the Cybersecurity Threat Analyst's two workflows (Threat Hunting,
Anomaly Detection) require no path capability although her persona is built around paths.

## Follow-up: paths reached from a node versus a dedicated path entry

Two workflows walked through with only three tools: find (which selects a node), neighbourhood
expansion on the selected node, and a "Path to..." command on the selected node whose target is
chosen by clicking a node on the canvas or typing in the command's own search field. The
comparison is a dedicated path entry: a path tool with a source field, a target field and Run.
A step is one click, one keystroke sequence into one field, or one choice in a menu.

**Path Investigation** (source and target are both known by name at the start):

| Step | From the node | Dedicated entry |
|---|---|---|
| open | Ctrl+F | open the path tool |
| source | type the name, pick the result (2) | type into Source, pick (2) |
| command | "Path to..." on the selected node (1, from the context menu or inspector) | -- |
| target | type into the target field, pick (2); or click it if visible (1) | type into Target, pick (2) |
| run | the command runs on pick (0) | Run (1) |
| total | 6 (5 if the target is on screen) | 6 |

Options (shortest only or all paths up to N hops, weighted or not) cost the same in both, one
field each. Context Visualization and Intermediate Interpretation then happen on the selection
the path produced, identically.

**Fraud Ring Investigation** (starts from a flagged entity; needs "paths to known fraud cases"):

| Step | From the node | Dedicated entry |
|---|---|---|
| reach the alert | Ctrl+F, type, pick (3) | Ctrl+F, type, pick (3) |
| 1-2 hop context | expand neighbourhood (1-2) | expand neighbourhood (1-2) |
| paths to known fraud | "Path to..." on the selected node, choose the set "known fraud" as target (2) | open the path tool, re-enter the alert as Source (2-3), then the target (2), Run (1) |
| total for the path part | 2 | 5-6 |

The dedicated entry makes the analyst restate a source that is already selected, and a
two-field dialog has no natural slot for a set of targets.

**Neighbourhood expansion alone** is not a substitute: finding a path of length k takes k
expansions and shows every neighbour on the way, which is unusable beyond two or three hops in the
10,000 to 1,000,000 node graphs Fraud Ring Investigation starts from.

**Result.** Reached from the node, a path costs the same as a dedicated entry in Path
Investigation (6 against 6, 5 when the target is visible) and 3 to 4 fewer steps in Fraud Ring
Investigation. A dedicated top-level path entry earns nothing in these two workflows; a path
command on the selected node, with a set allowed as the target, covers both.

## Follow-up: validating a result with comparison placed in the tail

Question: if comparing two results is placed at the tail of the information architecture (an
overflow menu or a secondary panel, not on the result), does validating a result take more than
about three steps? If it does, comparison moves up.

Both workflows require the `comparison-view` capability. graphty-element has no API that compares
two runs today (no compare function in `graphty-element/src/session/`), so the steps are counted
against the designed surfaces, not the code.

**Iterative Analysis Cycle, Test phase** ("Apply appropriate algorithms, validate against
baselines"; information need "comparison to null models/baselines"):

| Step | Comparison in the tail | Comparison on the result |
|---|---|---|
| run the measure (A) | 1-2 | 1-2 |
| run the baseline or alternative (B) | 1-2 | 1-2 |
| open the tail (overflow menu or panel) | 1 | -- |
| choose Compare | 1 | 1 ("Compare with..." on A's row or inspector) |
| pick A | 1 | -- (A is where the command started) |
| pick B | 1 | 1 |
| comparison steps beyond the two runs | 4 | 2 |

**Community Analysis, Validation phase.** Two different checks:
- "modularity > 0.3?" is a single number on the run's result: 1 step (select the run, read), no
  comparison needed wherever comparison lives.
- "Are communities stable across different algorithms/parameters?" is a comparison of two
  partitions: the same 4 steps from the tail against 2 from the result, plus reading an agreement
  number that neither the element nor the designed surfaces provide yet.

**Result.** With comparison in the tail, validation by comparison takes 4 steps beyond the runs,
over the three-step bar, in both workflows; reached from the result it takes 2. The single-number
check (modularity) does not need comparison at all. So comparison moves up, but only as far as
the result: a "Compare with..." command on a run, not a top-level destination. The element owns
the comparison itself (agreement of two partitions, correlation of two score columns), per the
architectural rule that computing about a graph belongs in graphty-element.

## Follow-up: "reduce to a subgraph, then read the overview again"

Question: do the requirements support the practitioners' claim that restricting scope happens
every week? Every workflow's phases were coded for a step that reduces the graph to a subgraph
followed by a step that reads whole-graph numbers or a whole-graph view again over the reduced
graph.

| Pattern | Workflows | Reduce by | Re-read is computed or drawn |
|---|---|---|---|
| Clear | Visual Exploration - Overview to Detail | a filter ("What percentage of data remains, did important nodes disappear?") | drawn, plus counts |
| Clear | Drug Target Discovery | "Define the disease-relevant subnetwork", then rank by centrality | computed |
| Clear | Supply Chain Risk Assessment | "What if supplier X fails?" (removal), then quantify impact | computed |
| Clear | Network Evolution Analysis | time windows, then "Compute key metrics per time period" | computed |
| Clear | Gene List to Interaction Network | "Select the largest connected component and make it the working network", then lay out and read | computed (the layout and every later run use the component) |
| Clear | Enrichment Map | "Slide the node q-value and edge similarity cutoffs to thin the map; re-run layout", then cluster | computed |
| Clear | Condition Comparison | union, intersection or difference, then "Node and edge counts, density, component count and community count for each network and for the merged one" | computed |
| Partial | Community Analysis (input "typically giant component"), Threat Hunting ("expand or narrow scope"), Cluster and Functionally Annotate ("lay out each cluster as its own subnetwork"), Criminal Network Analysis (case scope and time frame), First Exploration ("does it require sampling/filtering?") | a scope set once, or a local view | mixed |
| Local, not an overview | Fraud Ring Investigation (1-2 hop neighbourhood), Hub Gene Identification ("expand one step around them") | a neighbourhood | drawn |
| Drawing only | Findings Communication ("Filter to relevant subset" for the figure) | a filter | drawn |

**Result.** 7 of 25 workflows show the full pattern and 5 more show part of it. In 6 of the 7
the reduced graph is what gets computed over (a module, a component, a time window, a set
operation, a removal, a threshold); only Visual Exploration reduces purely to draw.

Who does this weekly: of the 11 personas who use graphty weekly or daily, 5 are assigned at least
one of the 7 clear workflows (Analyst Alex, Expert Emma, Bioinformatics Researcher, Genomics
Cytoscape User, Supply Chain Network Analyst); 4 more have only partial ones (Cybersecurity,
Fraud, Intelligence, Marketing); 2 have none (Knowledge Graph Engineer, ML Engineer). The weekly
claim holds for about half of frequent users, and for them restricting scope mostly means
**computing** over a subgraph, not hiding part of the drawing. See the follow-up on Gephi and
Cytoscape in `graph-tools.md` for how established tools define that scope.

## Follow-up: the cost of autosaving a 100,000-node project

graphty-element has no project file yet (no save or load in `graphty-element/src/session/`, and
no autosave in the app), so the cost was measured on the two encodings a project file could use,
in Node 22 on the development machine (Intel i9-14900). The script is
`tmp/autosave-cost/bench.mjs`; each number is the median of five runs.

Test project: 100,000 nodes, 500,000 edges with weights, three imported numeric columns and one
categorical, three algorithm result columns (degree, PageRank, community), 3D positions, one
style layer.

| Operation | Median time | Size |
|---|---|---|
| JSON: build the object tree | 50 ms | -- |
| JSON: `JSON.stringify` | 236 ms | 58.3 MB |
| JSON: gzip level 1 / level 6 | 476 ms / 1,122 ms | 17.1 MB / 15.2 MB |
| Binary: build a graph-format snapshot (`fromEdgeArrays`, topology plus imported columns) | 80 ms | -- |
| Binary: `snapshot.toBytes()` | 6 ms | 18.2 MB |
| Binary: copy positions plus the three result columns | 0.9 ms | 3.6 MB |
| Binary: deflate level 1 of the snapshot bytes | 352 ms | 13.0 MB |
| Positions only (what a layout change alters) | 0.2 ms | 1.2 MB |

Not measured: the browser write itself (IndexedDB or the Origin Private File System), which
needs a browser run, and any Babylon-side work to read positions out of meshes.

**Reading.**
- A whole-document JSON autosave costs about 290 ms of main-thread work before compression and
  writes 58 MB each time. Run on every edit it would freeze interaction for a third of a second;
  compressing it to a manageable size adds half a second to a second.
- The imported graph does not change during a session: the snapshot is frozen and its bytes are
  ready in 6 ms. An autosave only needs to write what changes -- positions, result columns,
  styles, selection, notes -- which is 3.6 MB and under 1 ms to copy at this size, cheap enough to
  run on every committed change and to hand to a worker for the write.
- So autosave at 100,000 nodes is affordable if the project file is split into the frozen graph
  (written once, on import) and the changing session state (written on each change), and is not
  affordable as one re-serialized JSON document. That split is a data-format decision, which is a
  published contract, so it should be made before the first file format ships.

## Follow-up: whether a selector can name "a value of a computed column" by a stable id

Question: can graphty-element's selector grammar express "the nodes whose value in a computed
result equals X", naming the result by a stable id rather than a derived run id or a free column
name? If so, a community is already a rule, and the project file needs no new address format for
one.

What the code says:
- A style selector is one of four kinds: `everything`, `expression` (a JMESPath predicate in
  `where`), `has` (a column-presence test on a `path`) and `ids` (`graphty-element/src/session/styles/selector.ts`,
  `catalog/types.ts` `Selector`). A run's scope takes the same predicate form, `{ where: Query }`,
  beside `{ set: ScopeId }` and `{ nodes }` (`catalog/types.ts` `Scope`).
- A result value lives at `results.<runId>.<field>`, which the file header calls public API:
  "what a style selector matches on, what a filter reads, what an expression editor completes and
  what an export writes" (`session/results/types.ts`, `resultPath`).
- The field name is fixed by the result's shape, not by the algorithm: a partition always
  publishes `group`, a metric always `value` (`RESULT_SHAPE_CONTRACTS`). So the column name is
  not something the reader or the algorithm invents.
- The run id can be author-assigned with `as`, restricted to `^[a-z][a-z0-9_-]*$`, and the docs
  say it "is REQUIRED the moment anything that names the run is persisted: a derived id is a
  function of the algorithm, the parameters and the scope" (`session/runs/types.ts`,
  `StartOptions.as`, `RUN_ID_PATTERN`).
- An id with a hyphen must be quoted inside an expression (`quotePath`), because the lexer reads a
  bare hyphen as minus.

So "community 3 of the partition the reader calls `communities`" is already expressible:

    { match: "expression", where: "\"results.communities\".group == `3`" }

built with `quotePath(resultPath("communities", "group"))`. The same form works as a run scope
(`{ where: ... }`) for "within this community".

**Answer: yes, with one gap.** The grammar needs nothing new, and the stable id is the `as` id,
so a community is "result id plus group value" -- a rule, with no new address format in the
project file. The gap is the id's lifecycle, not the grammar: an `as` id cannot be moved to a
new definition in place. A different definition under a held id is refused with
`E_DUPLICATE_ID`; the only route is `runs.remove(id)` then `runs.start(..., { as: id })`, which
deletes the old result and its layers (section 7.22). Selectors, scopes and notes that read
`results.<id>` then silently read the new run. Two consequences for the ontology:

1. The stable id belongs to the measure (the thing the reader names), and a run is a version
   under it. The element needs an atomic "rebind this id to a new definition" that keeps the
   earlier run's record, or every tuning re-run destroys the history the analyst needs.
2. A group value is not an identity across re-runs (community 3 at resolution 1.0 is not
   community 3 at 1.5). A rule "communities.group == 3" is correct only for the run it was
   written against. That is why a labelled or kept community must be stored as a fixed member
   list with its origin, or matched by overlap on re-run -- the selector cannot solve that, and it
   should not try.

## Follow-up: which algorithms write more than one column, or none

Question: across graphty-element's result shapes (node-metric, edge-metric, community,
layered-grouping, category-table, path, node-set, edge-set, pair-list, temporal, fact), which
algorithms write more than one per-element column, and which write none? If many do either,
the result record has to sit above the column.

Read from the field declarations in `graphty-element/src/catalog/algorithms.ts` (with the
`metricFields`, `communityFields` and `setFields` helpers) and the shape contracts in
`session/results/types.ts`. "Column" here means a per-element field (node or edge); graph-level
fields such as `modularity` or `diameter` are not columns.

| Algorithm key | Shape | Per-element columns |
|---|---|---|
| degree | node-metric | 5 node: value, rank, percentile, inDegree, outDegree |
| betweenness, closeness, pagerank, eigenvector, katz | node-metric | 3 node each: value, rank, percentile |
| hits | node-metric | 5 node: value, rank, percentile, hub, authority |
| all-pairs-distance | node-metric | 3 node (eccentricity as value, rank, percentile) |
| dfs | node-metric | 4 node: value, rank, percentile, visited |
| louvain, leiden, label-propagation, girvan-newman, components | community | 2 node: group, groupSize |
| bfs | layered-grouping | 3 node: level, levelSize, order |
| shortest-path | path | 3 node (onPath, order, distance) and 1 edge (onPath) |
| kruskal, prim | edge-set | 1 edge: in |
| bipartite-matching | edge-set | 1 edge (in) and 2 node (side, matched) |
| min-cut | edge-set | 1 edge (in) and 1 node (side) |
| max-flow | edge-metric | 5 edge (value, rank, percentile, capacity, utilization) and 2 node (netFlow, role) |

No registered algorithm has the category-table, node-set, pair-list or temporal shape;
`link-prediction`, `k-core`, `clustering-coefficient` and `all-paths` are known keys with no
descriptor.

Zero-column results exist, and they are not algorithms. Three session operations are recorded as
runs of shape `fact` with no fields: a batch of runs (`session/runs/RunsApi.ts`), a visibility
(filter) pass, "fact rather than node-set: a pass publishes two counts about the graph, not a set
of elements to paint" (`session/visibility/VisibilityApi.ts`), and a style edit, "an edit
publishes what changed about the stack, not a column of values" (`session/styles/StylesApi.ts`).
The pair-list and temporal shapes, once something produces them, also write no column: their
values are graph-level tables (`pairs`; `steps`, `series`, `rates`).

**Answer.** 19 of the 21 registered algorithm keys write more than one column; only kruskal and
prim write exactly one; 4 (shortest-path, bipartite-matching, min-cut, max-flow) write to both
nodes and edges; and every non-algorithm run writes none.
A column therefore cannot be the unit the reader names, notes, compares or re-runs: the record
(the measure or partition, with its runs) sits above its columns, and a column is addressed as
"record plus field". This matches the element's own path, `results.<runId>.<field>`. Of the
columns, `rank`, `percentile`, `groupSize` and `levelSize` are derivable from the primary field
in one pass, which matters for what the project file must store (next follow-up).

## Follow-up: file size of keeping each result's previous run

Question: what does it cost the project file to keep one extra stored column of values per
computed result -- the previous run's values -- at 50,000 and at 1,000,000 nodes, against the
positions? This decides whether the previous run is kept in the file.

Measured in Node 22 on the development machine with a throwaway script (random values: a
heavy-tailed float for a metric, a skewed integer for a community id, uniform floats for 3D
positions; deflate level 1, the setting the autosave follow-up above used):

| Stored array | 50,000 nodes raw | deflated | 1,000,000 nodes raw | deflated |
|---|---|---|---|---|
| 3D positions, float32 (12 bytes a node) | 586 KB | 525 KB | 11.4 MB | 10.3 MB |
| one metric column, float64 | 391 KB | 373 KB | 7.6 MB | 7.2 MB |
| one metric column, float32 | 195 KB | 178 KB | 3.8 MB | 3.5 MB |
| one community column, int32 | 195 KB | 70 KB | 3.8 MB | 1.4 MB |

For scale: the 100,000-node, 500,000-edge test project in the autosave follow-up above has an
18.2 MB frozen graph snapshot, so a 1,000,000-node graph at the same density is about 180 MB of
topology before any session state.

Only the primary field needs storing: `rank`, `percentile`, `groupSize` and `levelSize` are
recomputed from it on load in one pass (previous follow-up). Edge metrics (max-flow, and any
future edge measure) cost about the edge-to-node ratio more -- five times at the density above.

**Reading.**
- One previous metric column costs about two-thirds of the 3D positions in float64 and one-third
  in float32; a previous partition costs about an eighth of the positions after compression.
- With five computed results (three metrics, two partitions), keeping each one's previous run
  adds about 1.3 MB at 50,000 nodes and about 25 MB at 1,000,000 nodes (float64 metrics,
  deflated) -- roughly 2.5 times the positions, but about 13 per cent of the 1,000,000-node
  topology. It also doubles the changing state an autosave writes on each re-run, not on each
  edit: result columns change only when a run finishes.
- The run **record** (parameters, seed, scope, data revision) is a few hundred bytes and answers
  "which resolution did I use"; only re-reading the old values, or comparing with them, needs the
  column.

**Answer.** Keep every run's record in the file always -- it is free and it is what makes last
week's parameters findable. Keep the previous run's values for community and other integer
results always (cheap after compression, and needed to match communities by overlap on re-run).
Keep the previous values of float metrics too at 50,000 nodes; at 1,000,000 nodes a previous
float64 column costs as much as the positions, so store metric columns as float32 (a published
precision decision, since it changes what an export reads back) or keep previous values only for
results the reader has noted, kept or compared. Whether values are float32 or float64 in the file
is a data-format decision and so a one-way door.

## Follow-up: whether the element's cost model can give a time on both the CPU and WebGPU paths

Question: does graphty-element have, or could it have, a cost model with measured times on both
the CPU and the WebGPU paths? This decides whether a run's estimate shows a time, a coarse word,
or the complexity class.

**What exists** (`graphty-element/src/session/cost/estimate.ts`, `calibrate.ts`, `index.ts`;
reached through `session.estimate(command)`, synchronous, and `session.plan(command)`):
- `CostEstimate` carries `seconds`, `confidence`, `costClass` (one of `COST_CLASSES`: "instant",
  "iterative", "heavy", "cubic", "unbounded", `catalog/types.ts`), `blocksFrame`, `cancellable`,
  `available`, `reason` and `basis` ("the sizes, the work term and the provenance").
- `confidence` is a ladder: "measured" (this machine ran this algorithm; scaled from that run, and
  only within a factor of `MEASUREMENT_EXTRAPOLATION_LIMIT` = 10 of its work), "calibrated" (this
  machine's throughput was probed), "modelled" (built-in rates), "unknown". Its doc comment says
  confidence "decides whether the sentence beside it reads 'about' or 'at least'".
- `DEFAULT_COST_RATES` are pinned to the floor of runs measured on 2026-09-23, per cost class,
  and held to a stopwatch by `test/session/cost/estimate-against-measured-runs.test.ts`; the cubic
  rate "has never been measured and is a placeholder".
- `calibrateCost` times three synthetic workloads (250 ms budget) and `CostMeasurementLog` keeps
  the most recent timing of each algorithm.

**What stops it from giving a trustworthy time today.**
1. **Nothing turns the measuring on.** The session accepts `calibration` and `measurements`
   readers (`session/types.ts` lines 679-682) and passes them to the planner
   (`session/GraphSession.ts` lines 1343-1344), but no code in `graphty-element/src` constructs a
   `CostMeasurementLog`, calls `calibrateCost`, or passes either option. In the shipped element
   every estimate is therefore "modelled".
2. **There is no engine dimension.** `CostMeasurement` records algorithm, nodes, edges,
   iterations, seconds, time and machine, and not the engine; the log keeps one entry per
   algorithm (`byAlgorithm = new Map<AlgorithmKey, CostMeasurement>()`). A WebGPU run of PageRank
   would replace the CPU timing and then be scaled into a CPU estimate, or the reverse. There are no
   GPU rates at all; the accelerator enters the model only as `acceleratorAvailable`, to mark an
   algorithm that requires one as unavailable.
3. **It estimates the computation, not the wait.** Section 7.23 measured wall time 100 to 1,000
   times the compute time on graphs with many edges, because of the first paint of the result's
   style layer (for example PageRank at 10,000 nodes and 100,000 edges: 15 to 33 ms compute, 5 to
   26 s wall). The model has no paint term.
4. **The GPU differs in kind, not by a constant.** From the decision record cited in 7.23: GPU
   PageRank is 3.0x faster at 100,000 nodes with a crossover near 29,000; GPU components are slower
   (0.77x) below about 132,000. A single per-class rate cannot express a crossover, so a GPU time
   needs its own measured entry per algorithm, not a scaled CPU one.

**Could it have one?** Yes, with element changes and no new concept: add the engine to
`CostMeasurement` and key the log by algorithm and engine; construct the log in the element and
record every finished run (the code is written, only the wiring is missing); persist it per
machine fingerprint; add the first-paint cost, or report `seconds` for compute and a separate
figure for paint. Until the log holds a same-engine run within a factor of 10 of the work,
the honest confidence is "modelled".

**What the estimate should show.**
- The reader does not need the class name or "O(n m)": the four waits that matter are the ones
  Nielsen's limits name -- 0.1 s "feel that the system is reacting instantaneously", 1 s "flow of
  thought to stay uninterrupted", 10 s "keeping the user's attention focused", and beyond 10 s a
  "percent-done indicator" and "feedback indicating when the computer expects to be done"
  (https://www.nngroup.com/articles/response-times-3-important-limits/).
- So: a coarse word by default ("instant", "a few seconds", "about a minute", "several minutes",
  "cannot estimate"), chosen from `seconds` rounded UP to the band when confidence is "modelled"
  or "calibrated"; a number ("about 40 s") only when confidence is "measured" on the same engine.
  A run over 10 s shows progress while it runs. The complexity class and the `basis` sentence
  belong under Details.
- "Unbounded" and "unknown" are words, never a time; `seconds` is `Infinity` for them by design.

## Follow-up: memory of kept runs at 100,000 nodes against a cap, and how often a session reaches it

Question: how much memory do kept runs take at 100,000 nodes, against a realistic cap, and how
often does a typical session reach the cap? This decides the undo wording for a run whose values
were evicted.

**Per run at 100,000 nodes.** Measured (section 7.22, published 2.3.1, retained heap after a
forced collection): a node metric 28 MB before any read and 37.8 MB after a ranking, column,
histogram and summary were read; a partition 15.1 MB. As typed columns holding only the primary
field (rank, percentile and group size are recomputed from it in one pass, per the column-size
follow-up above): float64 metric 100,000 x 8 B = 0.8 MB; int32 partition 0.4 MB (arithmetic, not a
heap measurement).

**The cap.** graphty-element has a per-run budget, not a pool cap: `runColumnBudgetBytes`
defaults to 512 MB (`DEFAULT_MEMORY_BUDGET_BYTES`, `session/cost/estimate.ts` line 831). Issue #427
asks for history "capped by memory, not by step count" with no figure. The renderer dies near
3.6 GB (7.18). A pool of a quarter gigabyte (256 MB) for kept values -- about 7 percent of that
ceiling, leaving room for the graph, meshes and positions -- is used below; 512 MB is shown for
comparison.

**Runs per session.** From the workflows: a session computes 1 to 6 distinct measures (Hub Gene
Identification: five rankings plus clustering; Influencer Identification: four centralities plus
communities), doubled when two conditions are each measured (Condition Comparison), plus retunes
of the partition (Community Analysis and Cluster and Annotate choose a resolution or inflation).
A heavy session is about 10 runs: 5 measures and 5 retunes or reruns. Only 6 of the 25 workflows
reach 100,000 nodes at all (Community Analysis at its upper end, Fraud Ring Investigation, Threat
Hunting, Influencer Identification, Knowledge Graph Construction, Graph-Based Recommendation);
the other 19 state 20,000 nodes or fewer, or "any".

| Storage | Heavy 100,000-node session (4 metrics, 1 partition, 5 metric retunes = 10 runs) | Runs that fit in 256 MB | Runs that fit in 512 MB |
|---|---|---|---|
| Today's objects (37.8 MB metric, 15.1 MB partition) | about 355 MB | 6 metrics or 16 partitions | 13 metrics |
| Typed primary column (0.8 MB metric, 0.4 MB partition) | about 7.6 MB | 320 metrics | 640 metrics |

**Reading.**
- With today's per-node objects, a heavy analysis session at 100,000 nodes passes a 256 MB cap
  after its seventh metric run, i.e. in most such sessions, and passes 512 MB with a few more.
  Eviction would be routine and undo would regularly meet missing values.
- With typed primary columns, 256 MB holds more runs than any workflow makes. Even a 50-step undo
  history (the analysis-history capability's limit) of metric runs is 40 MB. Eviction becomes a
  rare edge case at 100,000 nodes and appears only near the 1,000,000-node sizes the renderer
  cannot draw.
- At the sizes 19 of 25 workflows state (20,000 nodes or fewer), even today's objects keep 20
  metric runs in about 150 MB.

**Undo wording.** Treat eviction as rare, not as a normal state, provided the element moves to
typed result columns (an element change with no effect on published names, 7.22). For the rare
case the model's existing state line fits: "Values not kept", with one verb. Which verb depends on
reproducibility (7.9): a deterministic or seeded run says "Values not kept -- Redo recomputes
(a few seconds)" and redo recomputes from the record; a run that cannot be reproduced exactly (a
Karger min cut, a force layout, GPU digits restored on the CPU) says "Values not kept -- cannot be
recomputed exactly" before the step that would evict it, not after. If results stay as per-node
objects, eviction is routine at 100,000 nodes and the undo step itself must say, before it runs,
that it will recompute.

## Follow-up: whether the cost model covers diameter, average path length and exact closeness, and whether it can record the engine

Question: `session.estimate(command)` answers betweenness. Does it answer the all-pairs measures
-- diameter, average path length, exact closeness -- the same way, and can each timing record the
engine it ran on?

| Measure | How the element computes it | What the estimate charges | Measured? |
|---|---|---|---|
| Betweenness | catalogue key `betweenness`, class "heavy", "O(n * m)" (`graphty-element/src/catalog/algorithms.ts` line 371) | the heavy class term n * m at 5,000,000 pairs per second (`session/cost/estimate.ts`, `DEFAULT_COST_RATES`) | yes, held to a stopwatch in `test/session/cost/estimate-against-measured-runs.test.ts` |
| Exact closeness | catalogue key `closeness`, class "heavy" | its own model, n(n + m) at 3x the heavy rate, because it is one BFS per source (`OWN_COST_MODELS.closeness`, `estimate.ts` line 435) | yes, 20M to 57M n(n + m) per second over eight graph shapes; the class model was 2.2x to 9.3x pessimistic |
| Diameter (and radius) | only as graph fields of `all-pairs-distance`, which runs Floyd-Warshall and writes eccentricity (`catalog/algorithms.ts` line 581; `algorithms/FloydWarshallAlgorithm.ts`) | the cubic class term n^3 at a placeholder 20,000,000 per second: "The cubic rate has never been measured and is a placeholder" (`estimate.ts` line 126) | no |
| Average path length | not computed anywhere: no catalogue key, and no function in `@graphty/algorithms` (`algorithms/src` has no diameter, eccentricity or average-path function besides `floydWarshall`) | nothing; `session.estimate` cannot be asked | -- |

**Readings.**
- **Closeness is covered well; diameter is covered badly; average path length not at all.** The
  estimate for diameter describes the wrong algorithm for large graphs: one BFS per node gives
  every eccentricity in n(n + m), exactly closeness' cost, where Floyd-Warshall is n^3. At 10,000
  nodes and 50,000 edges that is 6 x 10^8 against 10^12 -- about 40 s against about 14 hours at the
  rates in force. Diameter and average path length could both ride on closeness' BFS sweep (the
  distances it already walks give each node's eccentricity and its mean distance), so one run and
  one cost model would serve all three.
- **The memory gate does not see the all-pairs matrix.** `resultBytes` charges only the published
  columns (8 bytes per node plus 1 KB per graph field, `estimate.ts` lines 904 to 932), so
  Floyd-Warshall's n x n distance table -- 10^8 entries at 10,000 nodes, held as nested Maps -- is
  never charged and never refused. A BFS sweep needs only O(n) working memory per source.
- **Nothing can be sampled yet.** The estimate scales work by `sample / nodes` and the planner
  sets `caveats.sampleSize`, but only a descriptor that declares `approximable`
  (`catalog/types.ts` line 524) is ever sampled, and no built-in descriptor declares it. So
  "sampled betweenness above a few thousand nodes" is a planned state, not a reachable one. The
  sampling approach the model assumes -- a BFS from each of a sample of sources -- serves
  betweenness, closeness and average distance alike, so the existing n(n + m) model scales by
  the sample share without a new term.
- **Removal Impact Analysis needs diameter and average path length before and after a removal**
  (`design/designloom/capabilities/removal-impact-analysis.yaml`, used by Supply Chain Risk
  Assessment and Criminal Network Analysis), so both measures are required, not tail.

**Recording the engine: yes, as an additive change.** Today `CostMeasurement` has algorithm,
nodes, edges, iterations, seconds, at and machine, and no engine (`estimate.ts` lines 165 to 180);
`CostMeasurementLog` keeps one entry per algorithm (`calibrate.ts` line 444), and `Run.engine` holds
package versions (`session/types.ts` line 672, type `EngineVersions`). The change:
- add `engine: "cpu" | "webgpu"` (and the adapter name for WebGPU) to `CostMeasurement`;
- key the log by algorithm and engine, and scale a measurement only into an estimate for the same
  engine;
- record every finished run into the log from the element itself (the log exists; nothing
  constructs it, as the follow-up on CPU and WebGPU times above found).
Nothing published reads the log's key today, so this is reversible. The run record's own engine
field (the additive `Run.accelerator` in `glossary.md`) is the part that is published.

For the all-pairs family the engine dimension is empty for now: the accelerator contract has slots
for betweenness and all-pairs distances (`BetweennessAcceleratorOptions` and `ApspResultLike`,
re-exported by `webgpu-graph-algorithms/src/types/accelerator.ts`), but the GPU package's
`src/algorithms/` holds only components, degree, PageRank, power iteration and spectral kernels.
Every all-pairs run is on the CPU, and its record line can say so only as a difference from the
default once a GPU path exists.

## Follow-up: whether the algorithm catalogue already carries the family, cost band and (i) text the catalogue panel needs

Read from `graphty-element/src/catalog/types.ts` (`AlgorithmDescriptor`, lines 503 to 536;
`COST_CLASSES`, line 197; `MetricAvailability`, lines 675 to 691),
`graphty-element/src/catalog/algorithms.ts` (`BUILT_IN_ALGORITHMS`, 46 entries) and
`graphty-element/src/session/cost/estimate.ts` (`CostEstimate`, lines 60 to 84).

| Needed on screen | What the element has today | Verdict |
|---|---|---|
| **Algorithm family** (the bare headings: centrality, community, path, flow, structure, prediction) | `AlgorithmDescriptor.category`, typed as exactly those six plus any string, set on every built-in | Present. The rename `category` to `family` is already an item of the published-names list (`glossary.md` section 17, item 6), so it is not a new contract item |
| **(i) text** | `description` (one plain sentence, e.g. degree: "Counts how many edges each node has, incoming, outgoing and in total."), `technicalName`, `plainName`, `complexity` ("O(n + m)") | Present. `glossary.md` section 17, item 6 already turns `plainName` into (i) text and adds `displayName` for the row label; no new item |
| **Cost band** ("under a minute" ... "over a day", or a clock time once measured on this device) | No band anywhere. `costClass` is a complexity class ("instant", "iterative", "heavy", "cubic", "unbounded"), not a time band. `session.estimate(command)` returns `seconds` and `confidence` ("measured", "calibrated", "modelled", "unknown"), which together decide band or clock time. The catalogue listing `MetricAvailability` carries `costClass` and `estimateSeconds` but drops `confidence` | Partly present. The band itself is already a contract item ("The cost estimate comes from graphty-element ... a band ... and a time only when a run of that algorithm on the same engine was measured. The app shows it and never computes it": `element-contract.md`, the cost estimate item). What the catalogue adds to that item: the band (or its inputs, `confidence` beside `estimateSeconds`) must also appear on each `MetricAvailability` entry, so the panel lists every algorithm with its band without calling `estimate` per row and without mapping seconds to band words in the app |

**Result: no new contract item.** Family and (i) text exist and are already scheduled for renaming;
the cost band extends the existing cost-estimate item to the catalogue listing. Mapping `seconds`
to a band word in the app would compute something every consumer needs, which the architectural
principles in `CLAUDE.md` place in graphty-element.

## Follow-up: whether an expansion stored as neighborhood seeds survives Replace data, and whether missing seeds are reported

**Question.** In "Fraud Ring Investigation" the analyst expands a flagged entity with "Filter to
neighbors", which the framework stores as a neighborhood filter step naming its start nodes
(`research/archive/information-architecture-long-form.md` 9). Next week the analyst runs **Replace data** (reload the same
source with new transactions). Does the expansion survive, and is a start node that is no longer
in the data reported?

**What the framework says.** Replace data replays filter steps on the new data version
(`conceptual-model.md` 7.3: "Rules, joins, removals, corrections, the field mapping, filter steps,
style layers and runs replay"). Fixed sets, notes and authored values carry over by id through the
forwarding map, and "removed ones are listed in the import report". Matching across versions
promises "unmatched elements are reported on both sides and nothing is dropped silently". Nothing
says a filter step's own start nodes are checked, or where a missing one would be shown.

**What graphty-element does today.** The neighborhood filter stores seeds as ids
(`graphty-element/src/session/visibility/filter.ts:73`, `{ kind: "neighborhood"; seeds; depth }`).
When it is compiled against a graph, a seed the graph does not hold is skipped with no record:
the doc comment says "ones the graph does not hold are skipped", and the loop only keeps seeds
whose `graph.ids.indexOf(id)` is found (`filter.ts` 766-790). The compile context reports
unresolved attribute paths (`unresolvedPaths()`, `filter.ts` 192-197) but has no equivalent for
unresolved node ids. The selection target that "Select neighbors" uses behaves the same way:
"Ids the graph no longer holds are ignored, the way a scope ignores them"
(`src/session/selection/targets.ts`, `ElementIdTarget`).

**Walk, one Replace data.** Seeds: the flagged account A and two accounts found through a shared
device, B and C; depth 2. The new export has closed account C (not in the data).

| Step | Framework | graphty-element today |
|---|---|---|
| The step replays | yes, filter steps replay | yes, the step is data and recompiles |
| A and B | re-expanded two hops over the new edges, so the membership can grow or shrink | same |
| C missing | the general import report lists removed nodes, but nothing ties C to this step | C is skipped silently; the working set is now the 2-hop neighborhood of A and B only |
| Nodes added to the working set afterwards by Select neighbors (a Union of the rule and fixed members) | carried by id; removed ones in the import report | a fixed member id that is gone is ignored the same way |
| What the analyst sees | "Working set: N nodes" with a new N and no reason | the same |

**Result: the expansion survives as a rule, but a missing seed is not reported, in the design or
in the code.** The working set silently loses C's whole neighborhood, which in a fraud ring can be
the part that mattered, and the only symptom is a changed count. It also re-expands over new
edges, which is correct for a rule but means the reviewed set changes without a diff.

**Recommendation (graphty-element, per the architectural principles in `CLAUDE.md`).** The
filter compile context should collect unresolved node ids the way it collects unresolved
attribute paths, and a filter step's state should expose them, so the step row can read "1 of 3
start nodes not found" with the ids under Details, and Replace data's report can list each step
whose start nodes went missing. Replace data's report should also give each working set's count
before and after, since a rule that re-expands changes membership by design.

Sources: `graphty-element/src/session/visibility/filter.ts`;
`graphty-element/src/session/selection/targets.ts`; `design/ui/framework/conceptual-model.md`
5.2, 7.2, 7.3; `design/ui/framework/research/archive/information-architecture-long-form.md` 9;
`design/designloom/workflows/W06.yaml` ("Fraud Ring Investigation").
