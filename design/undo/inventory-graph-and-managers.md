# Mutation paths into graphty-element outside the session

Undo can only be complete if every change to what the project file saves passes through one
recorder. This document lists every way code outside the session object (`element.session`) can
change graphty-element's state today: the `Graph` class, the `<graphty-element>` properties and
methods, the manager classes, the render objects (`Node`, `Edge`), and a few objects the session
itself hands out that are writable. A path missing from this list is a place undo would silently
fail to reach.

All paths are relative to `graphty-element/src/` unless they start with another package name.
Line numbers are the declaration line.

## How to read the tables

- **Reach** -- who can call it.
  - `public` -- a documented method or property on `<graphty-element>`, or on `Graph`, which the
    root entry point exports and which `element.graph` (`graphty-element.ts:1993`) returns.
  - `escape` -- reachable by a third party, but only by reaching into internals: a manager
    returned by `element.getDataManager()` and its siblings (`graphty-element.ts:2903-2980`), a
    manager class exported from the root entry (`index.ts`, "Managers" section), a live `Node`
    or `Edge` returned by `getNode()` / `getNodes()`, or a public mutable field.
  - `internal` -- only the element's own code calls it.
- **Project?** -- whether the thing changed is part of the project (what a saved project must
  hold, and therefore what undo must cover):
  - `yes` -- data, import settings, layout choice and settings, positions a reader fixed,
    analysis runs and results, style layers and graph appearance settings, filters, saved scopes,
    saved views.
  - `no` -- camera, hover, selection, UI or input state, in-flight work, hardware, lifecycle,
    diagnostics.
  - `decide` -- the issue does not settle it; noted with the question.
- **Session twin** -- the session method that already does the same thing, if any. `none` means
  the session has no way to make this change, so a dispatcher command must be created for it.

## 1. Graph data: nodes, edges, attributes

The session has NO data-editing API: `session.data` (`session/types.ts:306-355`) is read-only.
Every data edit today goes through the paths below, none of which records anything.

| Path | What it changes | Reach | Project? | Session twin |
|---|---|---|---|---|
| `graphty-element.ts:539` `nodeData =` / `node-data` attribute | Adds the records as nodes (calls `Graph.addNodes`); never removes earlier ones | public | yes | none |
| `graphty-element.ts:628` `edgeData =` / `edge-data` attribute | Replaces the whole edge set (calls `Graph.setEdges`) | public | yes | none |
| `graphty-element.ts:655`, `:677` `dataSource =`, `dataSourceConfig =` | Imports from a registered source once both are set (`#tryInitializeDataSource`, `:743`) | public | yes | none |
| `graphty-element.ts:702` `clearData()` | Clears all nodes and edges, forgets the data source | public | yes | none |
| `graphty-element.ts:2013`, `:2036` `addNode`, `addNodes` | Adds nodes | public | yes | none |
| `graphty-element.ts:2055`, `:2080` `addEdge`, `addEdges` | Adds edges | public | yes | none |
| `graphty-element.ts:2098` `removeNodes` | Removes nodes and their edges | public | yes | none |
| `graphty-element.ts:2118` `updateNodes` | Merges fields into node records | public | yes | none |
| `graphty-element.ts:2136` `addDataFromSource` | Imports through a data source | public | yes | none |
| `graphty-element.ts:2156`, `:2186` `loadFromUrl`, `loadFromFile` | Imports a file or URL | public | yes | none |
| `graphty-element.ts:2885` `setData` | Adds nodes then edges, one fire-and-forget queued op per record | public | yes | none |
| `Graph.ts:1107` `addDataFromSource` | Import; calls `DataManager.addDataFromSource` then repaints | public | yes | none |
| `Graph.ts:1134` `loadFromFile`, `Graph.ts:1198` `loadFromUrl` | Import, via `addDataFromSource` | public | yes | none |
| `Graph.ts:1272`, `:1311` `addNode`, `addNodes` | Adds nodes, queued as `data-add` (or immediate with `skipQueue`) | public | yes | none |
| `Graph.ts:1342`, `:1383` `addEdge`, `addEdges` | Adds edges, queued as `data-add` | public | yes | none |
| `Graph.ts:1423` `setEdges` | Replaces all edges | public | yes | none |
| `Graph.ts:1893` `removeNodes` | Removes nodes and incident edges, prunes selection, emits `elements-removed` | public | yes | none |
| `Graph.ts:1963` `updateNodes` | `Object.assign(node.data, update)` on the live record (`:1971`, `:1992`); no store bump, relies on a repaint | public | yes | none |
| `Graph.ts:2202` `clearData` | `DataManager.clear()` | public | yes | none |
| `Graph.ts:4734` `setData` | Same as the element's `setData` | public | yes | none |
| `managers/DataManager.ts:579`, `:588` `addNode`, `addNodes` | Adds nodes directly, bypassing the queue | escape | yes | none |
| `managers/DataManager.ts:903`, `:929` `addEdge`, `addEdges` | Adds edges directly | escape | yes | none |
| `managers/DataManager.ts:1237` `setEdges` | Replaces all edges directly | escape | yes | none |
| `managers/DataManager.ts:1318` `removeEdge` | Removes ONE edge. The only single-edge removal anywhere; no `Graph` or element wrapper exists | escape | yes | none |
| `managers/DataManager.ts:786` `removeNodeAndIncidentEdges` | Removes one node and its edges without the selection pruning `Graph.removeNodes` does | escape | yes | none |
| `managers/DataManager.ts:1396` `addDataFromSource` | Import without the repaint `Graph` adds | escape | yes | none |
| `managers/DataManager.ts:1667` `clear` | Clears everything, including `graphResults` (`:1694`) | escape | yes | none |
| `managers/DataManager.ts:161`, `:169`, `:180` `nodes`, `edges`, `edgesByIndex` | Public mutable `Map`s and array of live render objects; `set` / `delete` corrupts the element | escape | yes | none |
| `managers/DataManager.ts:188` `graphResults` | Public mutable graph-level result bag written by plugin algorithms | escape | yes | none |
| `Node.ts:89` `node.data` | The live node record; any assignment changes an attribute the session and style layers read | escape (via `getNode`, `getNodes`, events) | yes | none |
| `Edge.ts:113` `edge.data` | The live edge record, same as above. No `updateEdges` exists at any level | escape | yes | none |
| `NodeBehavior.ts:584` `addClickBehavior` (double-click on a node) | **Found in the completeness check.** Expands the node: calls the `fetchEdges` / `fetchNodes` functions set through `layoutBehavior` (`Graph.ts:1079-1080`), then `DataManager.addNodes` and `addEdges` directly (`NodeBehavior.ts:653-654`), bypassing the operation queue, and resumes the layout (`:617`). The only data edit a reader can make with the pointer | internal (pointer gesture), live whenever a consumer supplies both fetchers | yes: one expansion is one step (the new nodes, the new edges, and the positions the resumed layout moves) | none |
| `managers/DataManager.ts:173` `edgeCache` | **Found in the completeness check.** Public mutable source-to-target index of live `Edge` objects (an `EdgeMap`, whose `set`, `delete` and `clear` are at `Edge.ts:1650-1742`). An add consults it to find repeated edges (`DataManager.ts:451`), so a write changes what the next import keeps or merges | escape | yes | none |

There is no edge-update path at all, and no single-edge remove on `Graph` or the element.

## 2. Import settings

These are read at import time and some are re-read later (`positionScale` through a thunk,
`managers/DataManager.ts:328`; `nodeLabelPath` by result labels, `algorithms/results/labels.ts:35`).
All of them write into `graph.styles.config.data`, a plain mutable object.

| Path | What it changes | Reach | Project? | Session twin |
|---|---|---|---|---|
| `graphty-element.ts:777` `nodeIdPath` | `config.data.knownFields.nodeIdPath` | public | yes | none (read-only in `session.config.data`, `session/GraphSession.ts:305`) |
| `graphty-element.ts:805`, `:830`, `:865` `edgeSrcIdPath`, `edgeDstIdPath`, `edgeIdPath` | `knownFields` endpoint and id paths | public | yes | none |
| `graphty-element.ts:901` `repeatedEdges` | `knownFields.repeatedEdges` | public | yes | none |
| `graphty-element.ts:944` `nodeLabelPath` | `knownFields.nodeLabelPath` | public | yes | none |
| `graphty-element.ts:975` `edgeWeightPath` | `knownFields.edgeWeightPath` | public | yes | none |
| `graphty-element.ts:1012` `positionScale` | `knownFields.positionScale`; re-read on every seed | public | yes | none |
| `graphty-element.ts:1091` `directed` | `config.data.directed` | public | yes | none |

Clearing any of these to `undefined` does not clear the config value (each setter writes only when
the value is truthy or defined), so the property and the config can disagree.

## 3. Layout choice, layout settings, positions and pins

The layout choice and its options have no state record: they live only on the running engine
instance (`LayoutManager.layoutEngine`, `managers/LayoutManager.ts:276`; `layoutType` at `:911`).
Undo needs a record to restore, so one has to be created.

| Path | What it changes | Reach | Project? | Session twin |
|---|---|---|---|---|
| `graphty-element.ts:1145` `layout =` | Calls `Graph.setLayout` with template options merged with `layoutConfig` | public | yes | none |
| `graphty-element.ts:1171` `layoutConfig =` | Re-runs `setLayout` with new options when a layout is set | public | yes | none |
| `graphty-element.ts:2491` `setLayout` | Layout choice and options | public | yes | none |
| `graphty-element.ts:1218` `layoutBehavior =` | `Graph.setLayoutBehavior` | public | yes | none |
| `Graph.ts:1492` `setLayout` | Queued `layout-set`, calls `LayoutManager.setLayout` | public | yes | none |
| `Graph.ts:1060` `setLayoutBehavior` | Replaces `config.behavior` (layout pre-steps, node, labels) and `fetchNodes` / `fetchEdges` functions (`:1076-1077`), which cannot be serialised | public | yes (the functions: no) | none |
| `managers/LayoutManager.ts:738` `setLayout` | Swaps the engine directly | escape | yes | none |
| `managers/LayoutManager.ts:919` `updateLayoutDimension` | Rebuilds the engine for 2D or 3D | escape | yes (follows view mode) | none |
| `managers/LayoutManager.ts:958` `applyTemplateLayout` | Applies a layout from the old template config | escape | yes | none |
| `managers/LayoutManager.ts:1041` `updatePositions` | Feeds nodes to the engine | escape / internal (data-add trigger, `Graph.ts:494`) | derived | none |
| `managers/LayoutManager.ts:836`, `:854` `step`, `stepBatch` | Advances the simulation, moving every position | escape | decide: positions a layout computed are an expensive result; keep or recompute | none |
| `layout/LayoutEngine.ts:256`, `:260`, `:261` `setNodePosition`, `pin`, `unpin` on `layoutManager.layoutEngine` | Moves or pins one node in the engine only | escape | yes | none |
| `graphty-element.ts:2212`, `:2223` `pin`, `unpin` | Pins or releases nodes (via `Node.pin`) | public | yes | none |
| `Node.ts:1044`, `:1064` `pin`, `unpin` | Writes the pinned flag into the positions lane and tells the engine | escape | yes | none |
| `NodeBehavior.ts:148` `onDragUpdate`, `:257` `setPositionDirect` | Moves a node during a drag (`setNodePosition`, `:183`, `:267`) | internal (pointer, XR) | yes, as one step at drag end | none |
| `NodeBehavior.ts:193` `onDragEnd` | Ends the drag, pins when `pinOnDrag` (`:216-217`) | internal | yes: one drag is one step (move + pin) | none |
| `GraphSession.ts:279` `session.positions` -> `data/positions.ts:417` `write`, `:314` `setPinned`, `:446` `fillUnplaced`, `:202` `view` (returns a writable `Float32Array`) | Writes positions and pins straight into the store | public (on the session object, typed as the exported `ElementPositions`) | yes | none -- the session hands out a writable lane |
| `graphty-element.ts:2817` `setRunning`, `Graph.ts:2928`, `managers/LayoutManager.ts:312` `running =` | Pauses or resumes the simulation | public / escape | no (in-flight work) | none |
| `Graph.ts` field `pinOnDrag` (`:190`), `GraphContext.ts:273` `updateConfig({ pinOnDrag })` | Whether a drag pins | public field / escape | decide: an interaction preference, probably no | none |
| `Node.ts:147` field `pinOnDrag` | **Found in the completeness check.** Per-node copy of whether a drag pins, read at the drop (`NodeBehavior.ts:212`, `:216`); a write overrides the graph-wide setting for one node | escape | decide, as `Graph.pinOnDrag` | none |
| `managers/LayoutManager.ts:276` field `layoutEngine`; on the engine, `addNode(s)`, `addEdge(s)`, `removeNode`, `removeEdge` (`layout/LayoutEngine.ts:253-305`) and `attachPositions` (`:361`) | **Found in the completeness check.** Assigning the field swaps the engine without `setLayout`: no pre-steps, no pins re-applied, and `layoutType` reports the new engine. The engine methods add or drop elements in the simulation only | escape | yes | none |
| `managers/DataManager.ts:281` `positions`, `layout/LayoutEngine.ts:348` `nodePositions`, `data/positions.ts:351` `pinnedView` | **Found in the completeness check.** The same writable positions lane `session.positions` hands out, reached through the data manager or the engine. `pinnedView` returns a writable window over the pin bytes | escape | yes | none |
| `managers/UpdateManager.ts:561`, `:576` `stepFrames`, `renderFrames` | **Found in the completeness check.** Run whole update passes, each of which steps a running layout, so every unpinned node moves | escape (`getUpdateManager()`) | decide, as `step` above | none |
| `layout/SimulationLayoutEngine.ts:764` `beginDrag`, `:779` `endDrag` (called at `NodeBehavior.ts:125`, `:212`) | **Found in the completeness check.** A drag sets the node's pin byte for its duration and clears it at the drop unless the drop pins. A history entry taken mid-drag would capture a pin the reader never made | internal | no by itself: part of the drag step | none |

## 4. Analysis runs and results

| Path | What it changes | Reach | Project? | Session twin |
|---|---|---|---|---|
| `graphty-element.ts:139` `run`, `Graph.ts:1676` `run` | Starts a run | public | yes (when it finishes) | `session.runs.start` (`session/runs/RunsApi.ts:412`) -- pure delegation |
| `graphty-element.ts:2425` `runAlgorithm`, `Graph.ts:1561` `runAlgorithm` | Legacy `namespace:type` address. A catalogue or descriptor algorithm becomes `session.runs.start` (`Graph.ts:1696`); a plugin WITHOUT a descriptor runs through `AlgorithmManager.runAlgorithm` (`Graph.ts:1623`, `:1641`) and writes straight onto `node.data` / `edge.data` / `graphResults` | public | yes | runs.start for catalogue algorithms; none for descriptor-less plugins |
| `managers/AlgorithmManager.ts:249` `runAlgorithm` | Runs a plugin algorithm that writes result fields into live records | escape | yes | none |
| `managers/AlgorithmManager.ts:198` `runAlgorithmsFromTemplate` | Runs a list of plugin algorithms | escape | yes | none |
| `managers/AlgorithmManager.ts:121` `execute` | The executor the session's runs call | internal | covered by the run | runs |
| `Graph.ts:782` `runAlgorithmsFromTemplate` | Runs `config.data.algorithms` when `runAlgorithmsOnLoad` is true; also triggered on data load (`Graph.ts:637-639`) | public | yes: should fold into the import step that caused it | runs.start / legacy path |
| `graphty-element.ts:1318` `algorithmsOnLoad =` | Writes `config.data.algorithms` | public | yes | none |
| `graphty-element.ts:1535` `runAlgorithmsOnLoad =`, `Graph.ts:195` field | Whether on-load runs happen | public | yes | none |
| `algorithms/Algorithm.ts:470` `Algorithm.register` | Global algorithm registry | public (root export) | no (code, not project) | none |
| `algorithms/Algorithm.ts:509` `Algorithm.get(graph, namespace, type)`, then `.run(graph)` (`:427`) | **Found in the completeness check.** Builds and runs a registered plugin algorithm with no manager and no run, writing its results onto `node.data`, `edge.data` and `graphResults` | escape (`Algorithm` is exported from the root entry and `./extend`) | yes | none |

## 5. Styles and graph appearance settings

Style layers themselves are session state. The paths below write graph-level appearance settings
that are NOT layers and that the session does not record.

| Path | What it changes | Reach | Project? | Session twin |
|---|---|---|---|---|
| `graphty-element.ts:2453` `applySuggestedStyles`, `Graph.ts:1764` | Adds encode / highlight layers, then moves them to the top (`Graph.ts:1813`, one `styles.move` per layer) -- several session edits for one gesture | public | yes | `session.styles.encode` / `highlight` / `move` -- a wrapper; must become one transaction |
| `graphty-element.ts:1459` `background =`, `Graph.ts:998` `setBackground` | `config.graph.background`, scene clear colour or a new PhotoDome (the previous dome is never disposed) | public | yes | none |
| `managers/RenderManager.ts:266` `setBackgroundColor` | Scene clear colour only; the saved `config.graph.background` is not updated, so picture and state diverge | escape | yes | none |
| `graphty-element.ts:1265` `selectionStyle =`, `Graph.ts:1038` `setSelectionStyle` | `config.graph.selection` (how the selection is drawn) | public | yes | none |
| `Graph.ts:176` field `styles` and `Graph.ts:2249` `getStyles()` / `graphty-element.ts:2903` | The whole mutable `Styles` object: `config.data`, `config.graph`, `config.behavior`. Any write bypasses every setter above | escape (public field on an exported class) | yes | none |
| `managers/DataManager.ts:481`, `managers/LayoutManager.ts:452` `updateStyles` | Swaps the `Styles` object a manager reads | escape | yes | none |
| `Graph.ts:186` field `skybox` | Unused string field | escape | no | none |
| `managers/StylePainter.ts:547` `bind`, `:660` `invalidate`; `Node.ts:347`, `:380` `updateStyle`, `applySessionPaint`; `Edge.ts:519`, `:550` | Rendering only, derived from the style stack | escape | no (derived) | n/a |
| `Node.ts:755` `setRenderState`, `Edge.ts:887` `setRenderVisible` | Per-element render visibility | escape | no (derived from filters) | n/a -- a write here is overwritten by the next repaint |
| `ai/commands/StyleCommands.ts:283`, `:441`, `:467` | AI adds and removes layers | public (via `aiCommand`) | yes | goes through `session.styles` |
| `Node.ts:90` `node.mesh`; `Edge.ts:114-116` `mesh`, `arrowMesh`, `arrowTailMesh`; `graphty-element.ts:3042` `getNodeMesh`, `:2971` `getScene`, `:2980` `getMeshCache`; `Graph.ts:180-181` fields `engine`, `scene` | **Found in the completeness check.** Direct Babylon.js writes: material colour, scale, visibility, `scene.clearColor`. The picture changes with no state behind it. Mesh positions are overwritten on the next frame (`Node.ts:325-330`); material and scene writes last until the next repaint of that element, or indefinitely | escape | no (never state), but picture and state diverge | n/a |

## 6. Filters, scopes and selection

Filters and saved scopes already live in the session. The paths outside it are selection paths.

| Path | What it changes | Reach | Project? | Session twin |
|---|---|---|---|---|
| `graphty-element.ts:167` `select`, `Graph.ts:2474` | Selection | public | no (not a step) | `session.selection.apply` -- delegation |
| `graphty-element.ts:2342` `selectNode`, `Graph.ts:2415`, `managers/SelectionManager.ts:170` `selectById`, `:152` `select` | Single-node selection | public / escape | no | `session.selection.apply` |
| `graphty-element.ts:2358` `deselectNode`, `Graph.ts:2445`, `managers/SelectionManager.ts:189` | Clears selection | public / escape | no | `session.selection.clear` |
| `Graph.ts:2516` background click | Clears selection on an empty-canvas click | internal | no | -- |
| `Node.ts:779` `setSelected`, `Edge.ts:918` `setSelected` | Selection overlay only | escape | no (derived) | -- |
| `managers/UpdateManager.ts:326` `bindViewMasks` | Which masks drive visibility | escape | no (wiring) | -- |

## 7. Saved views (camera presets)

Saved views are project state, but they are held in a private map on `Graph`
(`Graph.ts:185` `userCameraPresets`), outside the session.

| Path | What it changes | Reach | Project? | Session twin |
|---|---|---|---|---|
| `graphty-element.ts:1944` `saveCameraPreset`, `Graph.ts:4643` | Adds or overwrites a named view | public | yes | none |
| `graphty-element.ts:1985` `importCameraPresets`, `Graph.ts:4714` | Adds or overwrites many views | public | yes | none |
| (none) | There is no way to delete or rename a saved view | -- | yes | none |

The project groups and notes the issue lists do not exist in graphty-element at all. Before they
can be undone they need an element home; they are not an existing mutation path.

## 8. Camera, view mode and XR -- not undoable

| Path | What it changes | Reach | Project? | Session twin |
|---|---|---|---|---|
| `graphty-element.ts:1866-1935`, `Graph.ts:3680`, `:4436`, `:4455`, `:4471`, `:4483`, `:4495` `setCameraState`, `setCameraPosition`, `setCameraTarget`, `setCameraZoom`, `setCameraPan`, `resetCamera` | Camera | public | no | none |
| `graphty-element.ts:1955` / `Graph.ts:4665` `loadCameraPreset`; `graphty-element.ts:2739` / `Graph.ts:4617` `applyCameraView` | Moves the camera to a view | public | no | none |
| `graphty-element.ts:2512` / `Graph.ts:2239` `zoomToFit`; `managers/UpdateManager.ts:508`, `:525` | Camera framing | public / escape | no | none |
| `graphty-element.ts:2999` / `Graph.ts:2020` `setCameraMode`; `cameras/CameraManager.ts:71` `activateCamera` | Active camera | public / escape | no | none |
| `graphty-element.ts:1501` `startingCameraDistance =`, `Graph.ts:2617` | `config.graph.startingCameraDistance` and the orbit distance | public | decide: a camera default stored in config; probably no | none |
| `graphty-element.ts:1352` `viewMode =`, `:1387` `layout2d =`, `:1802` / `Graph.ts:2670` `setViewMode` | 2D / 3D / VR / AR; `config.graph.viewMode` and `twoD` (`Graph.ts:2688-2690`); switching 2D and 3D rebuilds the layout engine | public | decide: 2D vs 3D changes positions and is a document setting; VR / AR are sessions and are not | none |
| `graphty-element.ts:1600` `xr =`, `:2669` / `Graph.ts:2945` `setXRConfig`; `managers/GraphContext.ts:273` `updateConfig` | XR options | public / escape | no (device preference) | none |
| `graphty-element.ts:2691` `exitXR`, `xr/XRSessionManager.ts:116`, `:189`, `:252` `enterVR`, `enterAR`, `exitXR` | XR session | public / escape | no | none |
| `ai/commands/CameraCommands.ts:126`, `:145`, `:254`; `ai/commands/LayoutCommands.ts:111` | AI camera and view mode | public (via `aiCommand`) | no (view mode: decide) | none |
| `ai/commands/ModeCommands.ts:22` `setImmersiveMode` | **Found in the completeness check.** AI enters or leaves VR / AR | public (via `aiCommand`) | no | none |
| `Graph.ts:271` private `savedZPositions`, written at `:2806`, read and cleared at `:2868-2875` | **Found in the completeness check.** Switching 3D to 2D saves every node's mesh z in a private map and flattens it; switching back restores z from the map and clears it. This is a second copy of the z coordinates outside the positions lane, so undoing a view-mode change by restoring the lane and undoing it by calling `setViewMode` give different pictures | internal (via `setViewMode`) | decide, with view mode | none |

## 9. Hardware, input, lifecycle, diagnostics -- not undoable

| Path | What it changes | Reach | Project? |
|---|---|---|---|
| `graphty-element.ts:3276` `acceleration =`, `GraphSession.ts:382` `session.acceleration =`, `acceleration/AccelerationController.ts:341` `setPolicy` | Accelerator policy | public | decide: a machine preference; the session reports it in `session.config` |
| `graphty-element.ts:3320` `accelerationMinNodes =`, `acceleration/AccelerationController.ts:374` `setMinNodes` | Accelerator threshold | public | decide, as above |
| `GraphSession.ts:393` `setAccelerator` | Injects or removes an accelerator | public | no |
| `graphty-element.ts:2762` / `Graph.ts:3012` `setInputEnabled`; `managers/InputManager.ts:145` `setEnabled`, `:443` `updateConfig` | Input on or off | public / escape | no |
| `managers/InputManager.ts:222` `startPlayback`; `Graph.ts:3019` `startInputRecording` | Replays recorded input, which can drag nodes and select | escape / public | no itself; the drags it replays are steps through section 3 |
| `managers/InputManager.ts:297`, `:299` | Emits `input:undo` / `input:redo` on Ctrl+Z / Ctrl+Shift+Z; nothing handles them | internal | the keys the element should bind to `session.undo` / `redo` |
| `graphty-element.ts:1562` `enableDetailedProfiling =`, `Graph.ts:196`; `managers/StatsManager.ts` (all) | Profiling | public / escape | no |
| `graphty-element.ts:3022` / `Graph.ts:2061` `setRenderSettings` | Nothing (the body is empty) | public | no |
| `graphty-element.ts:2587` / `Graph.ts:2089` `batchOperations`; `managers/OperationQueueManager.ts:887`, `:895` | Groups queued operations. The closest existing thing to `session.transaction`, but it records nothing | public / escape | no itself; candidate to become a transaction |
| `managers/OperationQueueManager.ts:260` `queueOperation`, `:939` `queueOperationAsync` | Runs arbitrary code in the queue | escape (`Graph.operationQueue`, `Graph.ts:258`, public field) | depends on the code |
| `managers/OperationQueueManager.ts:832`, `:839`, `:846`, `:999`, `:1041` `pause`, `resume`, `clear`, `cancelOperation`, `cancelByCategory` | Queue control and cancellation | escape | no (in-flight work); cancellation is how "undo during a run cancels it" can be done |
| `managers/OperationQueueManager.ts:1078` `registerTrigger` | Adds a follow-on operation after a category | escape | no itself; see section 10 |
| `managers/EventManager.ts:119-445` `emit*` | Fires element events, including `emitSelectionChanged` (`:412`) and `emitElementsRemoved` (`:180`), with no state change | escape | no -- but a listener can be told a change happened that did not |
| `Graph.ts:842` `init`, `:922` `update`, `:4770` `render`, `:679` `shutdown`, `:5254` `dispose`; `graphty-element.ts:2778` `shutdown` | Lifecycle and frame | public | no |
| `Graph.ts:4800`, `:4817`, `:4841`, `:4904`, `:4949` AI control; `:5072`, `:5115` voice | AI enable / disable / command / retry | public | no itself; each AI command lands on a path in sections 3-8 |
| `Graph.ts:3295`, `:3366`, `:3513` screenshot, animation capture | Temporarily drive the camera | public | no |
| `layout/LayoutEngine.ts:618` `LayoutEngine.register`, `data/DataSource.ts:597` `DataSource.register` | Global registries | public (root export) | no |
| `catalog/paletteRegistry.ts:83` `registerPalette` (and `clearRegisteredPalettesForTesting`), `catalog/cameraRegistry.ts:39` `registerCameraView`, `acceleration/registry.ts:196` `registerAccelerator`, `catalog/logSinkRegistry.ts:53` `registerLogSink`, all exported from `./extend`; `ai/AiManager.ts:224` `registerCommand`; `meshes/NodeMesh.ts:559` `NodeMesh.registerShapeCreator` (internal) | **Found in the completeness check.** Global registries beyond the ones above | public / internal | no (code, not project). A saved layer naming a palette or shape must still resolve when undo restores it, so these are dependencies of a restore, not steps |
| `managers/InputManager.ts:300-301` Ctrl/Cmd+A | **Found in the completeness check.** Emits `input:select-all`; nothing handles it | internal | no (selection) |

## 10. Changes the element makes on its own

These follow another change automatically. Undo must fold them into the step that caused them,
or restoring state must re-derive them.

| Path | Trigger | Effect | Project? |
|---|---|---|---|
| `Graph.ts:444` | every `data-add` | repaint from the style stack | no (derived) |
| `Graph.ts:457` | every `data-remove` | repaint | no (derived) |
| `Graph.ts:494` | every `data-add` | `LayoutManager.updatePositions` -- new nodes enter the layout and every position moves | yes (positions) -- part of the data step |
| `Graph.ts:637-639` | data load with `runAlgorithmsOnLoad` | runs `config.data.algorithms` | yes -- part of the import step |
| `Graph.ts:478` | a run ends | repaint | no (derived) |
| `session/styles/autoApply.ts` | a run ends | may add result style layers | yes -- the issue requires run + style + legend to be one step |
| `managers/LayoutManager.ts:762` `spendPreSteps` | layout set, or first data after it | steps the layout `preSteps` times | yes (positions) -- part of the layout step |
| `Graph.ts:938` (found in the completeness check) | the layout settles while running | the update loop sets `running = false`, and frames the camera the first time | yes (positions): the moment a layout's arrangement becomes final, so the natural point to record a layout step |
| `managers/LayoutManager.ts:312` `running` setter -> `layout/SimulationLayoutEngine.ts:749` `reheat` (found in the completeness check) | anything that resumes a settled simulation: drag start and drop (`NodeBehavior.ts:119`, `:205`), node expansion (`:617`), `setRunning(true)` | every unpinned node moves again | yes (positions): after a drop every other node keeps moving, so a drag step that restores only the dragged node's row does not restore the picture |
| `Graph.ts:2822`, `:2833` (found in the completeness check) | `setViewMode("vr")` or `("ar")` when XR is unavailable or entering it fails | writes `config.graph.viewMode = "3d"` itself | decide, with view mode: the change a caller asked for and the state that results differ |

## 11. The session's own mutation paths, for reference

These are the paths a dispatcher can wrap directly. Everything above that says `none` in the
session-twin column needs a new session command before it can be undone.

| Path | What it changes |
|---|---|
| `session/styles/StylesApi.ts:236`, `:250`, `:258`, `:271`, `:289`, `:308`, `:325`, `:385`, `:403` `add`, `update`, `remove`, `move`, `removeBySource`, `encode`, `highlight`, `resolveToStatic`, `applyTemplate` | Style layers |
| `session/visibility/VisibilityApi.ts:215`, `:228` `set`, `setWindow` | Filter and time window |
| `session/scope/ScopeApi.ts:314`, `:324` `save`, `remove`; `session/selection/SelectionApi.ts:228` `promote` | Saved scopes |
| `session/runs/RunsApi.ts:412`, `:458`, `:548` `start`, `batch`, `remove` | Runs and their results |
| `session/selection/SelectionApi.ts:213`, `:218` `apply`, `clear` | Selection (not a step) |
| `session/GraphSession.ts:421` `run(command)` | The existing command entry point |
| `session/GraphSession.ts:382`, `:393` `acceleration =`, `setAccelerator` | Hardware (see section 9) |

## What the application calls today outside the session

The graphty app reaches these non-session paths, all of which need a session command before the
app's Undo can cover them:

- `graphty/src/components/Graphty.tsx:326-369`, `:426-428` -- `dataSource =`, `dataSourceConfig =`
- `graphty/src/components/Graphty.tsx:372`, `:375`; `graphty/src/components/shell/AppShell.tsx:1131`, `:4100`, `:4102` -- `pin`, `unpin`
- `graphty/src/components/Graphty.tsx:438`, `:445`, `:447`, `:460` -- `layoutBehavior =`, `layout =`, `layoutConfig =`, `viewMode =`
- `graphty/src/components/shell/AppShell.tsx:694`, `:1908-1909` -- `addDataFromSource`, `dataSourceConfig =`
- `graphty/src/components/shell/AppShell.tsx:1985`, `:2383`, `:2506`, `:3743` -- `clearData`
- `graphty/src/components/shell/AppShell.tsx:2388`, `:2394`, `:2523` -- `loadFromUrl`, `loadFromFile`
- `graphty/src/components/RunAlgorithmModal.tsx` -- `runAlgorithm`
- `graphty/src/components/shell/canvas/WelcomeState.tsx` -- `background`

## Gaps this inventory exposes

1. **No session command exists for data edits, import settings, layout choice and settings,
   positions, pins, graph appearance settings (background, selection style, layout behaviour) or
   saved views.** Each needs one before it can be recorded.
2. **Layout choice and options have no state record** -- only the live engine knows them.
3. **Saved views are private to `Graph`**, cannot be deleted, and are not in the session.
4. **Writable internals reachable by third parties:** `graph.styles.config`, `node.data`,
   `edge.data`, `DataManager.nodes` / `edges` / `edgesByIndex` / `graphResults`,
   `graph.operationQueue`, every exported manager class, and the writable positions lane on
   `session.positions`. Freezing project state in tests has to cover these, or they have to stop
   being reachable.
5. **Missing verbs:** no single-edge remove on `Graph` or the element, no edge update, no
   saved-view delete.
6. **One gesture, several edits today:** `applySuggestedStyles` (add then move per layer), a
   drag (move then pin), an import (data, layout positions, on-load runs, auto-applied styles).
7. **Picture and state can diverge:** `RenderManager.setBackgroundColor` changes the picture
   without the config; `Node.setRenderState` and `Edge.setRenderVisible` are overwritten by the
   next repaint; `Graph.updateNodes` changes records without telling the store.
8. **Descriptor-less plugin algorithms** write results into live records outside any run, so
   their results cannot be kept and restored the way a run's can.
9. **Found in the completeness check:** the node double-click expansion is a data edit made
   by a gesture straight into `DataManager`; resuming a settled simulation (drag start and drop,
   expansion, `setRunning(true)`) moves every unpinned node, so a step that touches positions
   must hold the whole arrangement, not only the rows it meant to change; and 3D-to-2D keeps a
   private copy of every z coordinate outside the positions lane.
