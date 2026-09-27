# Undo inventory: what state exists, where it changes, and how it is saved

This is the ground truth for building undo and redo into graphty-element: every piece of state a
user would expect to undo, where it is stored, every code path that changes it, whether anything
can serialise or restore it today, and whether the picture on screen is derived from it. A
mutation path missing from these tables is a gap in undo, so the tables aim to be complete rather
than readable.

All paths are relative to the repository root. Line numbers are as of branch `feat/element-undo`
at commit `f449e107`.

## 1. Headline facts

1. **There is no project file.** Nothing in graphty-element or the graphty app writes or reads a
   document holding the graph plus its analysis. The design describes one
   (`design/element-api/element-api-design.md:2226-2266`, a `GraphtyDocument` envelope with
   optional `data`, `dataPlan`, `style`, `recipe`, `view` and `annotations` members, opened by
   `data.openDocument` and written by `data.saveDocument`), and the app's UI design defers it
   (`design/ui/app-shell-progressive-disclosure-design.md:71`, `:7884-7936`). None of
   `GraphtyDocument`, `saveDocument`, `openDocument`, `journal` or `MutationReceipt` exists in
   code. "Everything saved in the project file" therefore has to be defined by the undo work
   itself; section 6 proposes the list.
2. **The only serialisable state today is the style stack**: `session.styles.toDocument()`
   (`graphty-element/src/session/styles/StylesApi.ts:1778`) writes it and
   `session.styles.applyTemplate(document)` (`StylesApi.ts:1690`) reads it back. Camera presets
   have `exportCameraPresets` / `importCameraPresets` (`graphty-element/src/Graph.ts:4702`,
   `:4714`). `Styles.fromJson` / `fromObject` (`graphty-element/src/Styles.ts:36`, `:46`) parse
   the configuration document but nothing writes one back out.
3. **The `./commands` entry exports nothing.** `graphty-element/commands.ts:1-22` is `export {}`
   with a header describing the plan. It is still in the exports map (`graphty-element/package.json:26`,
   `graphty-element/vite.config.ts:30`) and in the Node-safe entry test
   (`graphty-element/test/packaging/node-safe-entries.test.ts:18`). Issue #337 (publish the
   command vocabulary) is OPEN; issue #59 (the entry is published but empty) is OPEN. The only
   command the session accepts is `algo.run`: `SessionCommand = AlgorithmRunCommand`
   (`graphty-element/src/session/planning.ts:67`), executed by `GraphSession.run`
   (`graphty-element/src/session/GraphSession.ts:421-432`), which forwards to `runs.start`.
4. **There is no dispatcher.** Every model mutates its own private closure or class state
   directly. The style stack comes closest: every style verb goes through one `startEdit`
   (`StylesApi.ts:1204`) that ends in one `commit(next)` (`StylesApi.ts:985`) swapping a frozen
   array, which is the shape an undo step wants.
5. **Consecutive graph-format snapshots share almost no buffers.** Each freeze copies every core
   array into a fresh arena (`graph-format/src/builder/freeze.ts:621`,
   `graph-format/src/builder/arena.ts:178`) and copies every column out of staging into
   exact-length buffers (`graph-format/src/builder/compact.ts:552-600`). Only the id array and
   the id-to-index `Map` are shared with the builder by reference, guarded by `index < size`
   (`graph-format/src/ids/node-id-map.ts:827-844`, `freeze.ts:367-380`). Keeping one snapshot per
   undo step therefore costs a full copy of the graph per data step, not a delta.
6. **Snapshots are not the whole graph.** Node and edge attributes live on mutable `Node.data` /
   `Edge.data` objects, not in the snapshot (`graphty-element/src/Graph.ts:354-367`, the session's
   record source), and `Graph.updateNodes` edits them with `Object.assign`
   (`Graph.ts:1963-1999`). The position column attached to every snapshot is the live, mutable
   `ElementPositions` array lent by reference (`graphty-element/src/data/GraphStore.ts:88-95`,
   `:108-111`), so an old snapshot's positions change under it.
7. **The picture is mostly derived from session state** (style stack plus run results, the
   selection masks, the visibility masks), with named exceptions in section 5: positions, the
   configuration document (`Styles.config`), and data edits that do not repaint on their own.
8. **The app's history store records two things and reverts nothing.**
   `graphty/src/components/shell/topbar/undoStore.ts` says so in its header (lines 15-17); its
   only producers are two `algorithmResult` pushes (`graphty/src/components/shell/AppShell.tsx:2896`,
   `:3215`); Undo/Redo/History are wired at `AppShell.tsx:3654`, `:3660`, `:5127-5152`. The
   element emits `input:undo` / `input:redo` (`graphty-element/src/managers/InputManager.ts:297`,
   `:299`) and nothing, in the element or the app, listens.

## 2. The state a user would undo, and where it lives

| State | Owner and storage | Mutable how | Serialised today | Rendering derived from it |
|---|---|---|---|---|
| Graph topology (nodes, edges, direction) | `GraphStore.builder`, one `GraphBuilder` for the life of the Graph (`graphty-element/src/data/GraphStore.ts:109-111`); snapshot frozen lazily by `getSnapshot()` (`GraphStore.ts:241`) | In place, via `DataManager` and `data/ingest.ts`; `touch()` bumps the revision (`GraphStore.ts:203`) | No (only the source file the user loaded) | Yes: Node/Edge render objects are built from `DataManager` |
| Node and edge attributes | Mutable `Node.data` / `Edge.data` (`graphty-element/src/Node.ts:248`); read by the session through `records.nodeAttributes` / `edgeAttributes` (`Graph.ts:360-367`) | `Object.assign` in `Graph.updateNodes` (`Graph.ts:1970`, `:1990`); anything holding a `Node` | No | Only after an explicit repaint (`Graph.ts:1977`, `:1994`) |
| Import report | `DataManager.importReport`, sealed by `sealLoad` (`graphty-element/src/managers/DataManager.ts:1591`) | Replaced per load; nulled by `clear()` (`DataManager.ts:1667`) | No | No |
| Node coordinates | `GraphStore.positions`, an `ElementPositions` stride-3 Float32Array (`graphty-element/src/data/positions.ts:130`), attached to every snapshot by reference | `write` (`positions.ts:417`) from every layout step (`graphty-element/src/layout/LayoutEngine.ts:469`); `fillUnplaced` seeding (`GraphStore.ts:575`); `remap`/`grow` at freeze (`GraphStore.ts:366-368`) | No (design has `positions.snapshot/restore`, `element-api-design.md:2329`, not built) | Yes, every frame |
| Pins | One byte per node in `ElementPositions` (`positions.ts:314`, `:351`), attached as the `graphty.pinned` column (`GraphStore.ts:47-53`) | `Node.pin/unpin` (`Node.ts:1045`, `:1065`); drag (`graphty-element/src/NodeBehavior.ts:217`); element `pin/unpin` (`graphty-element/src/graphty-element.ts:2212`, `:2223`); `LayoutManager.ts:685` | No | Yes (layout respects it) |
| Layout choice and options | `LayoutManager` engine (`graphty-element/src/managers/LayoutManager.ts:738`); element `#layout` / `#layoutConfig` (`graphty-element.ts:1139-1180`); template default in `Styles.config.graph.layoutOptions` | `setLayout` (`Graph.ts:1492`), `applyTemplateLayout` (`LayoutManager.ts:958`), `updateLayoutDimension` (`LayoutManager.ts:919`) | No | Positions follow, non-deterministically unless seeded |
| Runs and their results | `RunsApi.runs` / `identities` / `derivedIds` maps (`graphty-element/src/session/runs/RunsApi.ts:677-678`); each `Run` holds its `RunResult` | `start` (`RunsApi.ts:412`), `batch` (`:458`), `remove` (`:548`), `Run.rerun` (`graphty-element/src/session/runs/Run.ts:713`), `Run.cancel` (`Run.ts:682`) | `Run.record` (`Run.ts:598`) is a structured-cloneable description, not the values | Yes, through run-bound layers |
| Result values | `RunResult` built by `createRunResult` (`graphty-element/src/session/results/RunResult.ts:979-995`): one frozen record object per element plus a frozen graph bag | Immutable once built | No | Yes (layers bind to `results.<runId>.<field>`) |
| Style stack | `stack` closure in `createStylesApi` (`StylesApi.ts:976`), a frozen array of compiled layers replaced whole by `commit` (`StylesApi.ts:985`) | See section 3 | `toDocument()` / `applyTemplate()` | Yes: the repaint pass (`graphty-element/src/session/styles/repaint.ts`) |
| Auto-applied run styling | `createAutoApplyPolicy` (`graphty-element/src/session/styles/autoApply.ts:206`), fire-and-forget layer adds on a run's first completion (`autoApply.ts:226`), `forget` (`:291`) | Asynchronous, not awaited by anyone | As part of the stack | Yes |
| Filter, time window, show-context | `filterValue`, `windowValue`, `showContextValue` closures (`graphty-element/src/session/visibility/VisibilityApi.ts:422-424`) | `set` (`VisibilityApi.ts:816`), `setWindow` (`:820`) -> commit (`:598`, assignment at `:730`); `showContext` setter (`:828`) | No | Yes (visibility masks -> `setEnabled` in `Node.ts:806`, `graphty-element/src/Edge.ts:946-969`) |
| Selection | Two byte masks in `SelectionApi` (`graphty-element/src/session/selection/SelectionApi.ts:475`) | `apply` (`:622`), `applyNow` (`:641`), `clear` (`:679`), `remapNodes/Edges` (`:601`, `:611`); `Graph.select/selectNode/deselectNode` (`Graph.ts:2474`, `:2415`, `:2445`) | No | Yes (halo mesh, `Node.ts:981`) |
| Saved scopes | `saved` map in `createScopeApi` (`graphty-element/src/session/scope/ScopeApi.ts:947-1026`) | `scope.save` (`:947`), `scope.remove` (`:1012`), `selection.promote` (`SelectionApi.ts:696`) | No | No |
| Camera presets (saved views) | `Graph.userCameraPresets` map | `saveCameraPreset` (`Graph.ts:4643`), `importCameraPresets` (`:4714`) | `exportCameraPresets` (`Graph.ts:4702`) | No |
| Configuration document | `Graph.styles.config` (`Graph.ts:291`, `Styles.ts:20-29`): id paths, direction, algorithms on load, background, view mode, layout options, behaviour | Written in place by element property setters (`graphty-element.ts:782-1107` via `setDeep`, `:1322`), `setBackground` (`Graph.ts:998`), `setSelectionStyle` (`:1038`), `setLayoutBehavior` (`:1060`), `setViewMode` (`:2670`) | Parsed only (`Styles.fromJson`) | Partly: background and view mode yes, id paths only at the next load |
| Acceleration policy | `AccelerationController`, published by `session.acceleration` (`GraphSession.ts:374-391`) | Setter (`:382`), `setAccelerator` (`:393`) | No | No (a setting, not project state) |
| Notes, groups, bookmarks | Do not exist in the element or the app | - | - | - |

## 3. Every mutation path, grouped by the state it changes

A row is a public door a consumer (or the app, or the AI command layer) can reach. "Internal"
rows are the choke points those doors end in; a dispatcher that wraps the internal row catches
every door above it.

### 3.1 Graph data

| Door | File:line | Ends in |
|---|---|---|
| `Graph.addNode` / `addNodes` | `Graph.ts:1272`, `:1311` | `DataManager.addNodes` (`DataManager.ts:588`) -> `ingestNode` (`graphty-element/src/data/ingest.ts:81`, touch `:102`) |
| `Graph.addEdge` / `addEdges` | `Graph.ts:1342`, `:1383` | `DataManager.addEdges` (`DataManager.ts:929`) -> `ingestEdge` (`ingest.ts:152`, touch `:165`) |
| `Graph.setEdges` | `Graph.ts:1423` | `DataManager.setEdges` (`DataManager.ts:1237`, touch `:1327`) |
| `Graph.removeNodes` | `Graph.ts:1893` | `DataManager.removeNodeAndIncidentEdges` (`DataManager.ts:786`, touch `:825`) |
| (no public door) | - | `DataManager.removeEdge` (`DataManager.ts:1318`) |
| `Graph.updateNodes` | `Graph.ts:1963` | `Object.assign(node.data, ...)`; no store touch, no revision |
| `Graph.setData` | `Graph.ts:4734` | per-record `addNode` / `addEdge`, fire-and-forget |
| `Graph.addDataFromSource`, `loadFromFile`, `loadFromUrl` | `Graph.ts:1107`, `:1134`, `:1198` | `DataManager.addDataFromSource` (`DataManager.ts:1396`); declared direction via `ingestDeclaredDirection` (`ingest.ts:204`, touch `:231`) and `applyDeclaredDirection` (`DataManager.ts:1348`) |
| Element `nodeData`, `edgeData`, `dataSource`, `dataSourceConfig` setters | `graphty-element.ts:539`, `:628`, `:655`, `:677` | the loads above |
| Element / Graph `clearData` | `graphty-element.ts:702`, `Graph.ts:2202` | `DataManager.clear` (`DataManager.ts:1667`): drops nodes, edges, store, import report, graph results, mesh cache |
| Element id-path, weight, label, repeat-policy, position-scale, direction setters | `graphty-element.ts:777-1107` | `setDeep` into `Styles.config.data`, applied at the next load |
| `runAlgorithmsFromTemplate`, `algorithmsOnLoad` | `Graph.ts:782`, `graphty-element.ts:1318` | runs started on load |

### 3.2 Runs and results

| Door | File:line | Notes |
|---|---|---|
| `session.runs.start` | `RunsApi.ts:412` | Registers at `:677-678`; result lands asynchronously |
| `session.runs.batch` | `RunsApi.ts:458` | One Run holding several steps |
| `session.run(command)` | `GraphSession.ts:421` | Only `algo.run` |
| `Graph.run`, element `run` | `Graph.ts:1676`, `graphty-element.ts:139` | Forward to `runs.start` |
| `Graph.runAlgorithm` (1.x path) | `Graph.ts:1561` | Used by the AI layer (`graphty-element/src/ai/commands/AlgorithmCommands.ts:103`) |
| `Run.rerun` | `Run.ts:713` | New run, same command |
| `Run.cancel` | `Run.ts:682` | In-flight only |
| `session.runs.remove` | `RunsApi.ts:548` | Cancels, forgets identity, calls `styling.forget` and removes bound layers in one call |
| Auto-applied suggested styling | `autoApply.ts:206-295` | Adds layers on first completion, not awaited: the run and its layers land as separate style edits today |
| `applySuggestedStyles` | `Graph.ts:1764`, `graphty-element.ts:2453` | Adds a run's suggested layers |

### 3.3 Style stack

Every verb below runs `startEdit` (`StylesApi.ts:1204`), which plans the next stack, repaints
the dirty set, then `commit`s (`StylesApi.ts:1250`) and announces `style:changed`. The one
exception is `seed` (`StylesApi.ts:1396`, commit `:1408`), which lays down the element's own
locked bottom layers without a run.

| Verb | File:line |
|---|---|
| `add` | `StylesApi.ts:1432` |
| `update` | `StylesApi.ts:1449` |
| `remove` | `StylesApi.ts:1453` |
| `move` | `StylesApi.ts:1475` |
| `removeBySource` | `StylesApi.ts:1516` |
| `encode` | `StylesApi.ts:1535` |
| `highlight` | `StylesApi.ts:1576` |
| `resolveToStatic` | `StylesApi.ts:1680` |
| `applyTemplate` | `StylesApi.ts:1690` |
| (bindings removed by `runs.remove`) | `RunsApi.ts:563` via `RunLayerBindings.remove` (`RunsApi.ts:147`) |

### 3.4 Visibility, selection, scopes, positions, view, configuration

| Door | File:line | Undoable per the issue |
|---|---|---|
| `visibility.set` | `VisibilityApi.ts:816` | Yes |
| `visibility.setWindow` | `VisibilityApi.ts:820` | Yes (slider drags must merge) |
| `visibility.showContext =` | `VisibilityApi.ts:828` | Yes, as part of the filter state |
| `selection.apply` / `applyNow` / `clear` | `SelectionApi.ts:622`, `:641`, `:679` | No (selection is not a step) |
| `Graph.select`, `selectNode`, `deselectNode` | `Graph.ts:2474`, `:2415`, `:2445` | No |
| `scope.save` / `scope.remove` / `selection.promote` | `ScopeApi.ts:947`, `:1012`; `SelectionApi.ts:696` | Yes (a saved subset is project state) |
| Layout engine writes | `LayoutEngine.ts:469` | No per tick; the settled arrangement is the question in section 6 |
| Drag | `NodeBehavior.ts:217` (pin), position write through the engine | Yes (move plus pin as one step) |
| `pin` / `unpin` | `graphty-element.ts:2212`, `:2223`; `Node.ts:1045`, `:1065` | Yes |
| `setLayout`, element `layout` / `layoutConfig` | `Graph.ts:1492`; `graphty-element.ts:1145`, `:1171` | Yes |
| `setViewMode`, element `viewMode` | `Graph.ts:2670`; `graphty-element.ts:1352`, `:1802` | Open question (2D/3D is saved state, VR/AR is not) |
| `setBackground`, `setSelectionStyle`, `setLayoutBehavior` | `Graph.ts:998`, `:1038`, `:1060` | Open question (appearance settings) |
| `saveCameraPreset`, `importCameraPresets` | `Graph.ts:4643`, `:4714` | Yes if presets are the saved views |
| Camera moves (`setCameraState`, position, target, zoom, pan, reset, `zoomToFit`) | `Graph.ts:3680`, `:4436-4495`, `:2239` | No (camera is exempt) |
| `setCameraMode`, `setRenderSettings`, `setStartingCameraDistance`, `setXRConfig`, `enterXR`/`exitXR`, `setInputEnabled`, `setRunning` | `Graph.ts:2020`, `:2061`, `:2617`, `:2945`, `:5183`, `:5226`, `:3012`, `:2928` | No (view and session control) |
| `session.acceleration =`, `setAccelerator` | `GraphSession.ts:382`, `:393` | No (a machine setting) |

### 3.5 The AI command layer, a second command vocabulary

`graphty-element/src/ai/commands/` is a separate, LLM-facing registry that reaches the same
state through the doors above: `setLayout` (`LayoutCommands.ts:53`), `setDimension`
(`LayoutCommands.ts:111`, `graph.setViewMode`), `runAlgorithm` (`AlgorithmCommands.ts:103`,
`:113`), and three style commands that call `styles.add`, `removeBySource` and `remove`
(`StyleCommands.ts:283`, `:441`, `:467`). Undo must see these as ordinary steps; they will if
the doors they call are routed through the dispatcher.

## 4. Where the graphty app changes the element

Every row is a place the app must end up calling a session command instead.

| App site | File:line | What it does |
|---|---|---|
| Load a file or URL | `graphty/src/components/Graphty.tsx:326-369`, `:426-428` | Assigns `dataSource` / `dataSourceConfig` |
| Layout and view | `Graphty.tsx:438`, `:445`, `:447`, `:460` | Assigns `layoutBehavior`, `layout`, `layoutConfig`, `viewMode` |
| Pin / unpin | `Graphty.tsx:372`, `:375`; `graphty/src/components/shell/AppShell.tsx:4100-4102` | Element `pin` / `unpin` |
| Clear data | `AppShell.tsx:1985`, `:2383`, `:2506`, `:3743` | `clearData()` |
| Run an analysis | `graphty/src/components/shell/analysis/runs.ts:189`, `:211`; `graphty/src/components/shell/analysis/nodeMetrics.ts:474` | `runs.start` |
| Style layer edits | `AppShell.tsx:2166` (`removeBySource`), `:2579` (`update`), `:2603` (`resolveToStatic`), `:2658` (`move`), `:2687` (`add`), `:3079` (`encode`), `:3344` (`add`), `:3777` (`removeBySource`); `graphty/src/components/shell/defaults/encodingReport.ts:118` (`removeBySource`) | Style stack |
| Selection | `AppShell.tsx:1650`, `:1653` | `selection.clear` / `apply` (not a step) |
| History | `AppShell.tsx:1483` (`useUndoStore`), `:2896`, `:3215` (push), `:3654`, `:3660` (key bindings), `:5127-5152` (top bar and History popover) | The store to delete |

The app also mirrors element state in React state that a restored element would contradict:
`layers` (`AppShell.tsx:1102`), `layoutType` / `layoutConfig` (`:1125-1126`), `viewMode`
(`:1124`), `pinnedNodes` (`:1146`), `legendChannels` (`:1420`), `activeResult` (`:1342`),
`degreePass` (`:1330`). Each must be re-read from the element on the change events rather than
held, or undo will leave the panels describing the state before it.

## 5. Is the picture derived from state?

| Channel | Derived? | Evidence and caveat |
|---|---|---|
| Node and edge style (colour, size, shape, labels, effects) | Yes | The repaint pass turns the stack plus run results into columns (`repaint.ts:1-60`), consumed by `StylePainter` (`graphty-element/src/managers/StylePainter.ts:1-70`). Caveat: the repaint is a DIRTY-SET pass driven by the edit (`repaint.ts:17-27`); restoring a stack by assigning the array without an edit plan would leave stale paint. Undo must restore through the same plan-and-paint path, not a bare `commit`. |
| Visibility | Yes | Masks drive `setEnabled` (`Node.ts:806`, `:814`; `Edge.ts:946-969`) |
| Selection highlight | Yes | Halo mesh from the session's masks (`graphty-element/src/managers/SelectionManager.ts:17-20`, `Node.ts:981`) |
| Positions | Partly | Drawn from the live array every frame, but the array is written by the running layout. Restoring the layout choice does not restore an arrangement; restoring positions needs the array itself, copied (`Float32Array` of `3 x nodeCount`). |
| Node attributes after `updateNodes` | Only on request | `Graph.updateNodes` calls `repaintFromSession()` itself (`Graph.ts:1977`, `:1994`); an attribute restore must do the same |
| Background, view mode, selection style, layout behaviour | Yes, from `Styles.config` | Not session state; written in place (`graphty-element.ts:782-1107`), so there is no prior value kept anywhere |
| Label declutter, hover, animations | View-only | `graphty-element/src/managers/LabelDeclutter.ts`, `graphty-element/src/meshes/RichTextAnimator.ts:107`; not project state |

## 6. What this means for the undo design

- **Define the project state explicitly**, since no file does. The candidates, from sections 2
  and 3: graph data (topology, attributes, direction), the run list with results, the style
  stack, filter / time window / show-context, saved scopes, pins, layout choice and options,
  the settled positions, and camera presets. Exempt: selection, camera, hover, view-only
  settings, acceleration, in-flight runs.
- **Cheap to snapshot, already immutable**: the style stack (a frozen array; keep the old
  array), run results (frozen records; keep the object, do not recompute), filter and window
  (plain values), saved scopes (small map). These can be stored as before/after values.
- **Expensive, and mutable in place**: topology (every freeze copies), attributes (live objects),
  positions (live array). These need forward and inverse deltas (the added ids, the removed
  records with their attributes and incident edges, the prior attribute values, a copy of the
  moved rows), not snapshots, if the history is to fit at a million nodes. `DataManager.clear`
  and a replacing import are the exceptions where the inverse is the whole previous graph.
- **Choke points a dispatcher can wrap**: `startEdit` / `commit` for styles; `RunsApi.start`,
  `remove`; the visibility `commit`; `ScopeApi.save` / `remove`; `DataManager.addNodes`,
  `addEdges`, `setEdges`, `removeNodeAndIncidentEdges`, `removeEdge`, `clear`,
  `addDataFromSource`; `Graph.updateNodes`; `ElementPositions.write` / `setPinned` for drags
  and pins; `LayoutManager.setLayout`.
- **One gesture, one step, needs work**: a run and its auto-applied layers currently land as
  separate, un-awaited edits (`autoApply.ts:226`); `runs.remove` removes layers as a side effect
  (`RunsApi.ts:563`); `setData` fires one queued add per record (`Graph.ts:4734`).
- **Freezing state in tests** has obvious targets for the style stack, visibility values and
  run results (already frozen), and none for `Node.data`, the builder or the positions array,
  which are mutated in place by design.
- **Tooling already present**: `fast-check` is a devDependency of graphty-element
  (`graphty-element/package.json:192`) for the random-sequence tests; the app has its own
  `graphty/eslint.config.js` for the lint rule against mutating the element outside session
  commands.
- **The command vocabulary** the issue wants every change to pass through is specified in the
  design (`element-api-design.md:2636-2760`, including a per-op inverse table) and absent from
  code. Building undo means building at least the undoable half of #337.
