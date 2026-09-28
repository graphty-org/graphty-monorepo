# Undo and redo in graphty-element

GitHub issue #427. Related: #197 (the graphty app's Undo button reverts nothing) and #337 (the
command vocabulary for the `./commands` entry point, not yet implemented).

Paths are relative to the repository root. Line numbers are those of branch `feat/element-undo`
at its base commit, `082ecf35`. The four inventories beside this document list every mutation path
this design has to cover:

- `design/undo/inventory-session.md` -- the session's own verbs
- `design/undo/inventory-graph-and-managers.md` -- `Graph`, the element, the managers, render objects
- `design/undo/inventory-persistence.md` -- where each piece of state lives and whether the
  picture is derived from it
- `design/undo/inventory-app.md` -- every place the graphty app changes the element

---

## 1. Problem

graphty-element has no undo. `InputManager` recognises Ctrl+Z and Ctrl+Shift+Z and emits
`input:undo` / `input:redo` (`graphty-element/src/managers/InputManager.ts:297`, `:299`), and
nothing listens. The graphty app has its own history store
(`graphty/src/components/shell/topbar/undoStore.ts`) that two call sites push to and that
reverts nothing.

Undo cannot be added as a feature on top of today's code, because today's code has no single
place where state changes:

- Every model writes its own private state directly. The style stack has one choke point
  (`startEdit`, `graphty-element/src/session/styles/StylesApi.ts:1204`); visibility, scopes and
  runs each have their own; graph data is written by `DataManager`, `data/ingest.ts`,
  `Graph.updateNodes` (`Object.assign` into `node.data`, `Graph.ts:1970`), and by anyone holding
  a `Node`.
- Much of the state that a project would save has no record at all: the layout choice lives
  only on the running engine, 2D versus 3D lives in a mutable configuration object, saved camera
  views are a private map on `Graph`, and the element keeps its own copies of twenty-one values
  in private fields (`graphty-element.ts:437-461`: `#layout`, `#layoutConfig`, `#viewMode`,
  `#directed`, `#layoutBehavior`, `#background`, `#dataSource`, `#dataSourceConfig`, the six id
  and label paths, `#repeatedEdges`, `#edgeWeightPath`, `#positionScale`, `#selectionStyle`,
  `#algorithmsOnLoad`, `#runAlgorithmsOnLoad`, and the `#nodeData` / `#edgeData` arrays).
- Several read surfaces hand out writable objects: the positions lane on `session.positions`,
  the snapshot's attribute tables, nested values in `node.data`, a saved scope's spec, the
  visibility filter, nested fields of style layers.
- One gesture lands as several edits at different times. A run and the style layers applied on
  its completion commit separately (`graphty-element/src/session/styles/autoApply.ts:226`,
  "fire and forget"). `runs.remove` removes its layers as separate un-awaited edits. Loads do
  not go through the operation queue at all (`Graph.ts:620-622`), and the on-load algorithms are
  started, unawaited, once per `data-added` event (`Graph.ts:637-644`).
- `run.rerun()` throws the old result away before the new one exists (`resetForRerun`,
  `graphty-element/src/session/runs/Run.ts:1071`), so there is nothing to restore.
- Layout engines keep their own copy of the coordinates. `SimulationLayoutEngine` holds
  `#simPositions` and copies it over the shared positions lane on every publish
  (`layout/SimulationLayoutEngine.ts:377`, `:958`), so writing the lane alone does not move a
  node for long.

The architecture rules put all graph state inside graphty-element, so history belongs there too.
A consumer that wanted undo today would have to rebuild all of the above.

## 2. Goals and non-goals

### Goals

1. `session.undo()`, `session.redo()`, `canUndo`, `canRedo`, and `session.history`: a labelled
   list of steps, with change events.
2. Everything a project file would save is undoable, and nothing else is.
3. Every change to project state goes through one dispatcher. The dispatcher records each step's
   forward and inverse change. No command writes its own undo.
4. One gesture is one step. A dragged slider is one step; a run with its result, style and legend
   is one step; `session.transaction(label, fn)` groups a consumer's own steps.
5. Expensive results are kept, not recomputed. Undo and redo of a run hand back the same result
   object. History is capped by memory, not by step count, and works at a million nodes.
6. A run becomes a step when it finishes. Undo during a run cancels it.
7. Selection is not a step, but after an undo or redo the session selects what changed.
8. The picture is derived from project state, so restoring the state restores the picture.
9. The app's Undo, Redo and History call the session, and `undoStore.ts` is deleted. This
   closes #197.
10. Gaps are prevented by tests and a lint rule, not by review (section 12).
11. A third party can use all of it from the documentation alone (section 10.3).

### Non-goals

- **The project file itself.** This design defines the list of state a project file would hold,
  because undo needs that boundary. The file format, `saveDocument` / `openDocument`, and whether
  to publish the state shape are left to the project-file design
  (`design/element-api/element-api-design.md:2226`).
- **Persisting history across reloads.** History lives as long as the session.
- **The journal and recipes** (`element-api-design.md` section 4.11.2). History records op names
  and labels, which a journal can later be built from; this work does not build it.
- **Notes, groups and bookmarks.** They do not exist in the element. When they land they become
  slices of project state, and the vocabulary test (section 12) forces their commands to declare
  whether they are undoable.
- **Node merge and column operations** (`merge-nodes`, `add-column`, `drop-column`,
  `rename-column` in `element-api-design.md` section 4.3.3). They are not implemented. They join
  the vocabulary when they are, under the same rules.
- **Cost estimates for new ops.** `session.estimate` and `session.plan` answer
  `available: false` for any op that has no cost model.
- **The rest of #337.** Typed command builders, `parsePattern`, `formatCommand` and the generated
  JSON Schema are not part of this work (section 10.4).

### What this supersedes

`element-api-design.md` section 4.3.3 says "the element owns inverses; the consumer owns the undo
stack", and section 4.11.2 gives each journal entry an `inverse: Command`. Issue #427 reverses
the first half: the element owns the history. Inverses are not published as commands, because an
inverse that must hold a `RunResult` by reference, or a previous graph snapshot, cannot be a
serialisable command. Section 4.11.1's `view.mode` op is split in two (section 10.5). Those
sections of the element API design are updated to point here.

---

## 3. The state model

### 3.1 The rule

**Project state is the fixed list of slices below. A change to a slice is undoable. Anything
outside the slices is exempt.** The list is also the boundary of the future project file. A test
enforces the rule both ways (section 12): every slice change is recorded, and an exempt command
changes no slice.

| Slice         | Holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Kind        | Lives today in                                                                                                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `graph`       | Topology and row order, every builder column of every row (including the seed and edge-id columns), direction and its provenance, node and edge records (attributes), graph-level results, the import report, the import source descriptor, the graph token and the graph epoch                                                                                                                                                                                            | op-log      | `GraphStore.builder` (`data/GraphStore.ts:111`), `Node.data` / `Edge.data`, `DataManager.graphResults`, `DataManager.importReport` (`DataManager.ts:1050`, `:1606`), the element's `#dataSource` / `#dataSourceConfig` |
| `pins`        | The set of pinned node ids                                                                                                                                                                                                                                                                                                                                                                                                                                                 | op-log      | pin bytes in the positions lane (`data/positions.ts:314`)                                                                                                                                                              |
| `config`      | The keys of `ProjectConfig` (section 10.1): the whole data configuration in the element's existing shape (`data.knownFields.*` -- every id, label, weight and time path, the repeated-edge policy, position scale and id coercion -- plus `data.algorithms` and `data.directed`), whether the on-load algorithms run, background, selection style, and three layout-behaviour keys (`layout.preSteps`, `layout.stepMultiplier`, `layout.minDelta`). One slice key per leaf | keyed value | `Graph.styles.config`, written in place (`graphty-element.ts:777-1107`, `Graph.ts:998`, `:1038`, `:1060`); the element's private mirrors                                                                               |
| `layout`      | `{ id: LayoutId, engine: string, options, dimension: "2d" \| "3d" }`. `engine` is the registered engine that draws the layout; the catalogue maps several engines to one `LayoutId` (`force` is drawn by ngraph, d3 or forceatlas2, `catalog/layouts.ts:130-153`), so the id alone does not say which one was chosen                                                                                                                                                       | keyed value | the live engine (`managers/LayoutManager.ts:276`), `config.graph.viewMode`, `config.graph.twoD`, `scene.metadata.twoD`                                                                                                 |
| `arrangement` | The node coordinates at rest                                                                                                                                                                                                                                                                                                                                                                                                                                               | capture     | the positions lane (`data/positions.ts:130`), the engine's own copy, and the private `savedZPositions` map (`Graph.ts:271`)                                                                                            |
| `runs`        | `RunId -> RunEntry`: finished runs                                                                                                                                                                                                                                                                                                                                                                                                                                         | keyed value | `RunsApi` maps (`session/runs/RunsApi.ts:377-386`, `:677-682`), the auto-apply `painted` set (`styles/autoApply.ts:208`)                                                                                               |
| `styles`      | The frozen, compiled layer stack                                                                                                                                                                                                                                                                                                                                                                                                                                           | value       | `stack` closure (`StylesApi.ts:976`)                                                                                                                                                                                   |
| `visibility`  | `{ filter, window, showContext }`. The masks are derived from these, not state (section 3.4)                                                                                                                                                                                                                                                                                                                                                                               | keyed value | closures at `session/visibility/VisibilityApi.ts:422-424`                                                                                                                                                              |
| `sets`        | `SetId -> ElementSet`: the kept sets, deep-frozen records written only by the `set.*` ops. Beside the slice, never rewound: the issued-id register, the order high-water mark, the tombstones, the edge seeds and the resolution cache (design/sets/undo-integration.md section 1)                                                                                                                                                                                         | keyed value | `SetsStore` over the dispatcher (`session/sets/store.ts`)                                                                                                                                                              |
| `views`       | Saved camera views, `name -> CameraState`                                                                                                                                                                                                                                                                                                                                                                                                                                  | keyed value | `Graph.userCameraPresets` (`Graph.ts:185`)                                                                                                                                                                             |

A `RunEntry` is `{ command, record, result, painted, derived, stale }`: the command that
produced it, its run record, the `RunResult` by reference, whether auto-apply has painted it,
whether its id is a derived id (`RunsApi.ts:383-386`, what `isDerivedId` answers), and whether the
graph changed while it computed. The dedupe identity (`identities` today) is computed from
`command`, so it cannot drift out of step with the slice.

### 3.2 Exempt, and why

| State                                                                                           | Reason                                                                                                 |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Selection                                                                                       | Owner's rule: not a step. Undo and redo set it (section 8)                                             |
| Camera, hover, applying a saved view to the camera, `startingCameraDistance`                    | View state, not saved                                                                                  |
| Entering or leaving VR and AR, XR options                                                       | A device session, not the document (but see section 6.4 for the dimension)                             |
| Coordinates while a layout is moving; layout play, pause and step                               | In-flight computation. Where the layout comes to rest is state (section 6.4)                           |
| A run or import still in flight, and a mask evaluation                                          | In-flight computation. A run or import becomes a step when it commits; masks are derived (section 3.4) |
| Acceleration policy, `accelerationMinNodes`, injected accelerators                              | A preference about this machine's hardware                                                             |
| Input enabled, profiling, render settings                                                       | View and session control                                                                               |
| `pinOnDrag` (graph-wide `node.pinOnDrag` in layout behaviour, and per node)                     | An interaction preference                                                                              |
| `labels.declutter` in layout behaviour                                                          | A view preference                                                                                      |
| `layout.maxInFlight`, `layout.iterationsPerStep`, `layout.zoomStepInterval` in layout behaviour | Throughput tuning for this machine and view cadence, like the acceleration settings                    |
| `layout.type` in layout behaviour                                                               | Not a second home: it is derived from the `layout` slice                                               |
| `layoutBehavior.fetchNodes` / `fetchEdges`                                                      | Functions: code, not data                                                                              |
| Registries (algorithms, layouts, data sources, palettes, camera views, accelerators, log sinks) | Code, not data                                                                                         |
| A layer's `userData`                                                                            | Owned by the consumer, kept by reference, documented as outside the contract                           |
| Direct Babylon.js mesh, material and scene writes                                               | Rendering. The next derivation overwrites them; documented as outside the contract                     |

The exempt view settings that today share `Graph.styles.config` with project settings (camera
distance, the immersive mode, and the exempt layout-behaviour keys above, including the second
home of `pinOnDrag` at `Graph.ts:190`) move to a small mutable view-settings store on `Graph`. The
element's `layoutBehavior` setter splits its argument: the three project keys go to `config.set`,
the rest to the view-settings store, and a `layout.type` in it becomes a `layout.set` in the same
step. Reading `layoutBehavior` returns the merge of the three, with `layout.type` read from the
`layout` slice.

**The dimension has one home, the `layout` slice.** Today it has three: `config.graph.viewMode`,
`config.graph.twoD` (written at `Graph.ts:2587`, `:2690`, `:2751`) and `scene.metadata.twoD`
(`:2590`, `:2762`), and the readers disagree on which they trust: the layout manager and the graph
context test `viewMode === "2d" || twoD` (`LayoutManager.ts:505`, `GraphContext.ts:242`), edge
meshes read `scene.metadata.twoD` (`EdgeMesh.ts:222`). If `twoD` stayed in an exempt store,
undoing a switch to 2D would set the slice to 3D and leave `twoD` true, and the engine and camera
would go on treating the scene as flat. So `twoD` is not stored anywhere: in the merged view below,
`graph.viewMode` and `graph.twoD` are both computed from `layout.dimension`, and the `layout`
derivation hook writes `scene.metadata.twoD` from it. The vocabulary test asserts that no field of
`Styles.config.graph` that encodes the dimension can be written except by the `layout` hook.

**`Styles.config` becomes a frozen view** merged from the `config` and `layout` slices and the
view-settings store, so nothing that reads it changes. It is built once, when one of its three
sources changes (in the `config` and `layout` derivation hooks, and on a view-settings write), and
the same frozen object is returned until the next change. It is read per node in the render path
(`Node.ts:840`, and 44 reads of `styles.config` or `config.graph` across `src`), so a getter that
merged on every read would allocate per node per frame. Strict state asserts that two reads with no
change in between return the identical object.

Three classifications the requirements left open are settled here:

- **2D versus 3D is project state; VR and AR are not.** Switching dimension rebuilds the layout
  engine and changes the arrangement, so it must be restorable.
- **Coordinates count only at rest.** A running layout writes the lane every frame.
- **A failed import leaves no step.** Its draft is rolled back (section 4.8).

### 3.3 The baseline

The state a session starts from is its **baseline**, and history begins after it. The baseline
window closes when the first commit that writes the `graph` slice records, or when the first
`data.import` settles, whichever comes first.

Whether that first graph commit is itself a step depends on where it came from, not on timing:

- **A load declared at construction is baseline.** A `data.import` (or `data.apply`) dispatched by
  the element for attributes or properties present when it is constructed or first connected --
  `<graphty-element data-source=...>`, `node-data` / `edge-data` in the markup, or properties a
  framework sets before the first update -- is marked `setup` by the element. It commits into the
  baseline and records no step, and its on-load runs are baseline too. `<graphty-element
data-source=...>` on a fresh page therefore shows Undo disabled, and Ctrl+Z does not empty the
  graph the author declared.
- **A load dispatched after mount is a step,** through any door or `tx`. The app's
  "Loaded flights.csv" row (section 13.5) is one of these. The window still closes at it, so
  everything after it is recorded.

The random-sequence test starts from both kinds. A session whose first import fails therefore records the
reader's later style edits as steps instead of silently folding them into the baseline.
Everything written before the window closes is initial setup: element
attributes parsed at construction, properties a framework sets on mount (the app's
`layoutBehavior` at `graphty/src/components/Graphty.tsx:438`, the background from
`WelcomeState`), `styles.seed`, and any `config.set`, `layout.set`, `style.*` or `view.save`
dispatched in that window. Those writes change the baseline and record no step. A fresh page
therefore shows Undo disabled, and undoing everything returns to the consumer's own configuration,
not to the element's defaults. The random-sequence test starts from a baseline built this way.

The cost of this rule is that a style or layout change made before any data is loaded cannot be
undone. That is the accepted trade: with no graph there is nothing on screen that the change
affected.

`history.clear()` makes the current state the new baseline: it drops every step, takes a capture
of the lane as the baseline arrangement, and `restoreTo(null)` afterwards returns to that state.
The baseline arrangement is also updated in place when eviction folds the oldest steps into it
(section 7).

### 3.4 How each kind of slice is kept

**Keyed value slices** (`config`, `layout`, `runs`, `visibility`, `sets`, `views`) are records or
maps of frozen values. A patch records, for each key it wrote, the key's value just before the
write, read at the moment of the write, and the value it wrote. Undo puts the prior values back,
key by key, as the identical objects. Two writers of different keys of one slice therefore never
overwrite each other (section 4.3). A run result is already frozen and immutable once published
(`session/results/RunResult.ts:979-995`), so history holds it by reference and redo hands back
the same object.

**The `styles` slice** is one frozen stack, because layer order couples every layer to every other.
A patch holds the previous and next stack by reference. Unchanged layers are shared between the
two, so keeping the old stack costs a pointer array plus the layers that changed.

**The visibility masks are derived, not state.** The slice holds only `{ filter, window,
showContext }`. The masks (two `Uint8Array`s, about 1 MB for nodes and 5 MB for edges at a million
nodes and five million edges) stay what they are today: ONE long-lived `ElementMask` pair, rewritten
in place, whose revision counter is a cache key for the scope resolver and summaries
(`VisibilityApi.ts:409-414`). They can be neither kept by reference (every later pass overwrites
them) nor swapped for other objects (a new object would restart its revision at zero).

So that undoing a filter does not re-evaluate it, a filter step may keep a **mask copy**: the bytes
of both masks as they were after that step (its after-masks). A copy is a cache, counted in
`history.bytes` and dropped before any step is evicted (section 7), and it is taken only when it is
known to be correct and about to be useful, never per coalesced frame:

- when a filter step stops being the coalesce target (the next step records, or the window
  lapses), the live pair holds exactly that step's after-masks, and they are copied once;
- when a filter step is undone, before the hook re-evaluates, the live pair still holds that
  step's after-masks, and they are copied into it for its redo.

A slider drag at 60 frames a second therefore copies once, not 60 times a second. Each copy is
tagged with the **graph token** (below) and with the identity of every input the filter read other
than the graph: the `RunEntry` objects of each run whose `results.*` fields the filter names, and
the input signature of every set the filter names (`scopeSignature`, `session/sets/signature.ts`), so
masks copied before a redefine are never pasted back after one. On undo or redo the `visibility` hook
looks for the after-mask copy of the nearest filter step at or below the target position; it copies
the kept bytes into the live pair and bumps its revision only when every tag equals the current
value, and otherwise evaluates the filter, as `sync()` does today. A deferred run that merges into a
step (section 5.1) replaces a `RunEntry`, so a copy that read the old entry no longer matches and is
never copied onto the new results.

**The graph token** names one exact row order (node and edge ids, in order, and every builder
column). It is drawn from a session-wide counter that only ever increases and never issues a value
twice, so the same number can never name two different graphs, on two branches of history or after
a rollback:

- a forward graph commit takes a fresh token;
- undo and redo restore the token recorded with the state they restore, which is sound because they
  restore rows exactly (below) and because an open group that has written the graph is aborted
  before a history call touches the graph (section 6.1, rule 0);
- a rollback always takes a fresh token, because a rollback interleaved with another group's graph
  write can produce rows that no recorded state had.

The token is not a value key: key hand-over (section 4.3) never moves it between groups. Anything
derived per row -- mask copies, arrangement captures, a run's staleness check (section 6.3) --
compares tokens and copies without a mapping only when they are equal. The graph **epoch**
(section 6.4) is drawn from the same kind of counter under the same rules.

Values are made immutable where they enter state:

- A command argument that ends up stored -- a scope spec, a filter, a time window, a layer's
  nested encoding -- is copied with `structuredClone` once, when the command is dispatched, and
  deep-frozen. This closes the leaks where the element keeps the caller's own object today
  (`ScopeApi.ts:993`, `VisibilityApi.ts:730`, `styles/Layer.ts:963-980`).
- `buildLayer` deep-freezes every layer except `userData`.
- Freezing applies in production as well as in tests. It costs time proportional to what the
  command created, not to the size of the state.

**The `graph` slice is an op-log.** Graph-format snapshots share almost no buffers from one freeze
to the next (`graph-format/src/builder/freeze.ts:621`, `compact.ts:552`), so keeping a snapshot
per step would cost a whole graph per edit. Instead, commands write the graph only through these
primitives, and each primitive records its own inverse:

| Primitive                                 | Records for its inverse                                                                                                                                                                                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addNodes(records)`                       | The ids it added, and the prior records of ids it merged into                                                                                                                                                                                                                |
| `removeNodes(ids)`                        | The removed records, their incident edges with records, resolved endpoints, weights and element-assigned edge ids, the row index of every removed node and edge, the value of every registered builder column for each removed row, and which of the removed ids were pinned |
| `addEdges(records)`                       | The edge ids it assigned (redo reuses them), and each edge's resolved endpoints and weight                                                                                                                                                                                   |
| `removeEdges(ids)`                        | The removed edge records, ids, resolved endpoints and weights, their row indices, and the value of every registered builder column for each removed row                                                                                                                      |
| `setAttributes(target, updates)`          | The prior values of exactly the keys it patched                                                                                                                                                                                                                              |
| `setGraphValues(patch)`                   | The prior graph-level values, including the import report                                                                                                                                                                                                                    |
| `setDirected(flag, provenance)`           | The prior flag and the prior `directionSettledBy`                                                                                                                                                                                                                            |
| `replace(next)` (replacing import, clear) | The previous frozen snapshot, stripped of its position and pin columns, the previous records map, and the previous pin set, all by reference                                                                                                                                 |

**Inverses and redo work on resolved values, never through ingest.** Ingest reads live
configuration: the id path (`DataManager.ts:599`), the repeated-edge policy (`:1239`), the edge-id
path (`:1275`) and the known fields (`:932`, `:1086`). If any of those changed through
`config.set` after a removal, re-adding the removed records through ingest would extract ids
differently, merge or drop restored edges as repeats, or read weights from another field. So the
primitives record ids, endpoints and weights as they were resolved at forward time, and the
inverse of a remove, and the redo of an add, write those resolved values straight into the
builder. They never pass through ingest's extraction or the repeated-edge policy.

**Removals keep every column, not a chosen list.** Ingest writes per-row builder columns beside
the records: the node seed column from the file's coordinates (`data/ingest.ts:91-96`) and the
edge-id column (`:162-164`), and future ingest code may add more. A remove primitive therefore
iterates the builder's registered columns and records each removed row's value in every one, and
its inverse writes them all back. A restored node comes back seeded where the file put it, not
hash-seeded. The state digest hashes every builder column (section 12.4), so a column a primitive
forgot fails the round-trip test.

**Undo restores row order exactly.** graph-format revives a tombstoned id at its old index only
until the next freeze (`graph-builder.ts:402`); every freeze with tombstones compacts them
(`freeze.ts:551`). Re-adding removed nodes after that would append them at the end and give their
edges new indices, and the snapshot fingerprint (`statistics.ts:283-289`, "a hash of the node ids
in order"), the paint columns and the digest all depend on that order. So the inverse of
`removeNodes` and `removeEdges` rebuilds the builder with the removed rows merged back at their
recorded indices. When every removed row was at the end, it appends and no rebuild is needed.
The rebuild is one pass in the style of `GraphBuilder.from`, the same order of cost as the freeze
that any data undo already pays (section 7). The other primitives already preserve order: an add
appends and its inverse removes the ids it added -- by id, never "the last n rows", so the inverse
stays correct if another group's rows were appended after it; a remove's redo removes the same
ids again. The round-trip fixture for removals asserts the node and edge id order, not only the
id set, so the fingerprint, and every cache keyed on it, hits again after an undo.

**Structural inverses are applied lazily.** Rebuilding the builder at undo time would put an
O(N + E) pass inside the synchronous part of every press: a held Ctrl+Z over thirty removal or
import steps would run thirty full rebuilds before the first frame, and an undo followed by a redo
would pay two rebuilds that cancel. So a history call applies the parts of a graph inverse that are
proportional to the patch -- the records map, the graph-level values, the pins, the token --
synchronously, and appends the structural part (insert rows at recorded indices, remove ids,
replace the whole builder with a kept snapshot) to a pending list on `GraphStore`, which already
freezes lazily (`getSnapshot`). The builder is materialised once, on the next read of the snapshot
or the builder, or in the derivation pass, after the pending list is folded to its net effect: an
insert followed by the removal of the same ids cancels, a replace discards everything queued before
it, and of several replaces only the last target is built. The synchronous part of a history call
is therefore O(size of the patches), never O(N + E). The Node scale test undoes 30 mid-row removals
without awaiting, reads the snapshot once, and asserts that one rebuild ran.

The graph primitives own the pins of the nodes they remove: `removeNodes` and `replace` drop those
ids from the `pins` slice in the same draft and record them for their inverse. Pinning node `"1"`,
clearing, and importing a graph that reuses id `"1"` therefore leaves nothing pinned.

**The `pins` slice is an op-log too.** It is one private `Set<NodeId>` behind a read-only facade.
A patch records the ids it added and the ids it removed, so a pin toggle costs the ids it touched,
not a copy of every pinned id.

Records are a plain `Map` of frozen record objects, one per node and one per edge. That is the
same number of objects `Node.data` holds today. `Node.data` and `Edge.data` become getters that
return the slice's record (`graphty-element/src/Node.ts:89`, `Edge.ts:113`): the render half of
the derivation hands each node and edge the record the slice holds whenever a command, an undo or
a redo changes it, through a writer inside the module that no entry point exports, so nothing
else can make `data` answer differently from the slice. The map keeps a
running byte estimate, updated by each primitive as it runs (64 bytes per record plus 32 per key,
plus string lengths), so sizing a `replace` step reads one number instead of walking six million
records. The estimate is approximate and documented as such.

Undoing a `replace` rebuilds the store from the kept snapshot. `GraphStore.applyPositions`
(`GraphStore.ts:376-390`) attaches the live positions lane to every snapshot as its `position` and
`graphty.pinned` columns, and `GraphBuilder.from` (`graph-format/src/builder/graph-builder.ts:248`)
copies every column, so the snapshot is stored with those two roles removed. On undo,
`GraphStore` builds a new builder with `GraphBuilder.from(stripped)`, replaces its `builder` and
re-registers its `seedColumn` and `edgeIdColumn` handles (they stop being `readonly` for the life
of the store, `GraphStore.ts:111-117`), and the coordinates come only from the arrangement capture
(section 6.4). The edge-id counter is never wound back; redo reinstates the ids it recorded.

**The `arrangement` slice is a capture.** A capture is an immutable object: the node-id list of
the snapshot the coordinates belong to, its graph token and graph epoch, and a `Float32Array`
copy of the lane (stride 3). Section 6.4 says when captures are taken and how they are restored.

**The data source is a descriptor, not a payload.** The element's `dataSource` /
`dataSourceConfig` pair can carry the whole file inline (`data?: string`) or a `File`
(`data/DataSource.ts:15-17`). State keeps only a provenance descriptor in the `graph` slice's
import record -- the source type, the url or file name, and the format options -- and never the
inline text or the `File`. The records are captured, so nothing needs the payload again: redo does
not re-parse. The element's `dataSource` and `dataSourceConfig` getters report the descriptor, and
their TSDoc says they no longer return an inline payload.

### 3.5 The state layer's files

All new, all Node-safe, because the `./session` entry reaches them:

- `graphty-element/src/session/project/state.ts` -- the slice types, the baseline
- `graphty-element/src/session/project/ingest.ts` -- ingest, moved out of `DataManager`: id and
  endpoint extraction (jmespath), the repeated-edge policy, weight resolution, the declared
  direction, the import report and chunking, all written over the `graphOps.ts` primitives.
  `DataManager` imports `Node`, `Edge`, `MeshCache` and the style painter, all of which reach
  Babylon.js, so ingest cannot stay there if the headless `session.data` write verbs are to exist
  in the Node-safe `./session` entry. Every data door in section 11.1 calls this module, and
  `DataManager` keeps only the render half of the `graph` derivation hook. The module is added to
  the list the Node-safe entries test checks (`test/packaging/node-safe-entries.test.ts`)
- `graphty-element/src/session/project/draft.ts` -- the `Draft` (the only writer), the value-slice
  primitives, key holds, `Patch`, and applying a patch forward or backward
- `graphty-element/src/session/project/graphOps.ts` -- the `graph` and `pins` primitives and their
  inverses
- `graphty-element/src/session/project/arrangement.ts` -- captures of the positions lane
- `graphty-element/src/session/project/digest.ts` -- the canonical state digest used by tests
- `graphty-element/src/session/project/strict.ts` -- the strict-state checks (section 12.1)
- `graphty-element/src/session/project/Dispatcher.ts` -- the one mutation path, groups, key holds
- `graphty-element/src/session/project/History.ts` -- steps, merging, the byte budget, undo, redo,
  restore, eviction
- `graphty-element/src/session/project/derive.ts` -- the derivation lane (section 9)

`ProjectState` and `Patch` are internal. They are not exported from any entry point.

### 3.6 A session owns its state

`CreateGraphSessionOptions` (`session/types.ts:640-660`) today lets a host hand in its own `store`
(which the host keeps writing), a `records` source (the host owns the attribute bags) and
`config.data` as a function (for a host that replaces its configuration object). Each of these
makes the host a second writer of a slice, which contradicts the rule that the dispatcher is the
only writer: undo would fight the host's writes, and strict state would fire on legitimate host
mutation. So in 3.0.0 `store`, `records` and the function form of `config.data` are removed from
the published options of `createGraphSession`. A headless consumer hands data in through
`session.data.import` and the other write verbs, and settings through `config.set`. The element
builds its session with the internal `createElementSession`, which no entry point exports; it still
passes its store, and that store's only writer is the dispatcher. The removal is listed in
section 15.2.

A second host-writable surface closes with it: `SessionGraphStore.positions` (`session/types.ts:237`)
is typed as the full writable `ElementPositions`, so `session.data.store.positions.write(...)`
would reach the lane even after `session.positions` is narrowed. It narrows to
`ReadonlyElementPositions` (section 10.1).

---

## 4. The single mutation path

### 4.1 Command definitions

Each op has one definition, grouped by family in `graphty-element/src/session/commands/`
(`data.ts`, `algo.ts`, `style.ts`, `visibility.ts`, `scope.ts`, `positions.ts`, `layout.ts`,
`view.ts`, `config.ts`):

```ts
interface CommandDefinition<C extends SessionCommand> {
    readonly op: C["op"];
    readonly undo:
        | { readonly kind: "undoable"; label(c: C, state: ProjectState): string; coalesce?(c: C): string | null }
        | { readonly kind: "exempt"; readonly reason: string };
    /** Sets coordinates on purpose, so it seals a capture when it starts executing (section 6.4). */
    readonly moves: boolean;
    /** The keys it will write, known before it runs (section 4.3). */
    keys(c: C, state: ProjectState): readonly SliceKey[];
    /**
     * "immediate": executes synchronously at dispatch. "queued": takes a slot on the session's
     * queue under the named category, and is cancellable while pending.
     */
    readonly lane: { readonly kind: "immediate" } | { readonly kind: "queued"; readonly category: OperationCategory };
    execute(c: C, ctx: CommandContext<C>): unknown;
}
```

`execute` computes first and writes last. Awaiting after a write is allowed only for the
**slot-holding writers**, which keep their queue slot until their last await: the chunked graph
writers (a chunked import and a double-click expansion), which hold the whole `graph` slice while
they write (section 4.3), and `layout.set` and `view.dimension`, which await their pre-steps after
writing the `layout` slice (section 4.7). A slot-holding writer's group seals only after its last
await, and it is cancellable at every await.

**Which lane.** Only work that takes time, or that must see the graph a queued writer is still
building, is queued:

| Lane                                               | Ops                                                                                                                                                        |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| queued, `data-add` / `data-update` / `data-remove` | `data.import`, `data.apply`, `data.expand`                                                                                                                 |
| queued, `algorithm-run`                            | `algo.run`, `algo.legacy`                                                                                                                                  |
| queued, `layout-set`                               | `layout.set`, `view.dimension`                                                                                                                             |
| immediate                                          | `style.*`, `visibility.*`, `scope.*`, `positions.*`, `view.save`, `view.remove`, `config.set`, `algo.remove`, `batch` (its members follow their own lanes) |

Style, visibility, scope, view and config edits used to share the queue with runs
(`StylesApi.ts:1181`, `VisibilityApi.ts:640`, one queue of concurrency 1 per
`GraphSession.ts:1085-1089`, `OperationQueueManager.ts:197`), which put a colour edit behind a
minutes-long Betweenness run. They were queued so that their repaint or mask pass would not read the
graph under a running writer. Both are now derivations (section 9), which run on their own lane
against committed state, so the edit itself is a synchronous value write and needs no slot.

**Queue order and obsolescence.** Commit order, not dispatch order, is the contract: the queue's
batch sort (`OperationQueueManager.ts:512-566`) may run a queued command after an immediate one
dispatched later, and history records what committed, in the order it committed. The
random-sequence model follows the committed order it observes, not the order it dispatched. When
the queue obsoletes a command's slot (`constants/obsolescence-rules.ts:39-73`,
`OperationQueueManager.ts:336-423`), that is a cancellation with reason `"obsolete"`: the group is
rolled back, nothing is recorded, and the caller's promise or run handle reports cancelled. It is
never settled as resolved, so the dispatcher never seals a partial draft. The obsolescence rules
that remain are a newer `layout-set` replacing a running one (the same op replacing an older one,
as coalescing does) and a data edit cancelling a run below 90% progress, which is in-flight
computation, not yet a step, and is reported as cancelled.

An undoable command's `ctx` carries a `Draft`. The draft has the primitives of section 3.4 and a
typed setter per value slice (`draft.styles = next`, `draft.runs.set(id, entry)`,
`draft.sets.delete(id)`, `draft.pins.add(ids)`), and nothing else. The inverse of every
primitive is written once, in `draft.ts` and `graphOps.ts`. Adding a command adds no inverse code;
only adding a primitive does, and the round-trip test covers each primitive.

An exempt command's `ctx` has no draft, so writing project state from it is a type error.

### 4.2 Groups

A **group** is the internal unit that becomes one step. It has an id, a label, one draft, a list
of member commands, and a list of deferred members. Every dispatch belongs to exactly one group,
decided when it is dispatched, never by timing:

- A plain dispatch opens its own group.
- A dispatch made through a transaction handle (section 5) joins that transaction's group.
- A dispatch made through the group-tagged facade that `algo.legacy` hands a plugin joins that
  command's group (section 4.5).
- Work the element starts on behalf of a command is registered with that command's group
  explicitly: the on-load runs of a command that adds rows, the members of `runs.batch`, the
  layers auto-apply plans for a run, the suggested layers a run was asked to apply, the encodes and
  moves of `applySuggestedStyles`.
- Element code never starts work from an event listener. Today the `data-added` listener
  (`Graph.ts:625-645`) starts the layout, reframes the camera and starts every on-load algorithm,
  once per `data-added` event, and that event fires from every `addNodes` and every `addEdges`
  (`DataManager.ts:653`, `:1063`), separately for nodes and edges and once per batch. Under that
  listener one `addNodes` would record one step plus one step per on-load algorithm, and one import
  could start the on-load set more than once. The listener's side effects are deleted; section 4.7
  says where each one goes.

A group seals into a step when its own part is done: for a plain command, when `execute`
returns; for a transaction, when `fn` has settled and every non-run command dispatched through
its `tx` has executed; for a batch, when its last member finishes. Runs a group started and did
not wait for become **deferred members** (section 6.1).

There is no causal id threaded through callbacks. A group handle is passed only to element code
that starts work, which is a closed set, and a consumer reaches a group only through the handle
`transaction` gives it.

### 4.3 Key holds

A draft writes through to live state as it goes, and records each key's prior value at the moment
of the write. Two groups can be open at once -- a transaction whose `fn` is awaiting, and the
reader's own edit -- so the dispatcher needs a rule for two groups writing the same key. Holding
keys from a group's first command until it seals would deadlock: a transaction's `fn` that awaits
a door outside `tx` touching a key `tx` wrote would wait on the command, the command on the seal,
and the seal on `fn`. And a run that held the style stack from its start until its commit would
freeze every colour edit for the length of the run. So holds are short, and the rule differs by
kind of slice.

**Value slices hand the key over.** A command holds a key only while its own `execute` writes it,
which is synchronous (section 4.1). When a command of group P writes a key that another open group
G has already written, the key's prior value moves from G's patch to P's: P records G's recorded
prior (the value before G) as its own prior, and G drops the key from its patch. Consequences, all
of which keep undo-all equal to the baseline and redo-all equal to the end:

- If G then rolls back, the key is not in its patch, so the later write by P survives.
- If G seals above P and is undone, the key is not in its patch, so P's value stays; undoing P then
  restores the value from before both.
- If G writes the key again after P, it records P's value as its prior, as any later writer does.

The one visible effect is on the whole-stack `styles` key. A reader's style edit made while an
assistant message is still open absorbs that message's earlier style edits into the reader's step,
with two consequences:

- undoing the reader's edit also removes the message's earlier style edits;
- if the message then throws or is aborted, its style edits made before the reader's edit are
  **not** rolled back: they now belong to the reader's step, whose written value is the whole
  stack including them. "A throw rolls back" holds for every other key, and for the style stack
  whenever no one else wrote it while the transaction was open.

Both are documented beside `transaction` and in the guide. The alternative, a layer-level revert
on rollback, would have to rewrite the written value already recorded in the reader's step (or
redo would bring the layers back), which makes recorded steps mutable after the fact; rebasing one
stack onto another is the same machinery. Neither is worth it for a case that needs two concurrent
writers of the style stack and a failing message, and the result stays consistent: undo-all still
returns to the baseline and redo-all to the end.

**Op-log slices hold ids until the group seals.** An op-log (`graph`, `pins`) cannot hand an id
over: if G added node `x` and P then removed it, undoing G would try to remove a node that is not
there. So a group holds the node and edge ids its graph and pin primitives touched until it seals,
and:

- A dispatch from another group that needs an id an open **transaction** holds does not wait. It
  fails at once with `E_HELD_BY_TRANSACTION`, whose message names the transaction and says to
  dispatch through its `tx`. Failing instead of waiting is what removes the deadlock.
- A dispatch that needs an id a queued **chunked writer** holds (a chunked import or an expansion
  holds the whole `graph` slice while it writes) waits for it, off the queue, in a per-key wait
  list, because the writer depends on nothing and will finish. This matters for one door: a pin on
  a node that exists only in a chunked import's open draft lands when the import commits, and is
  dropped if the import rolls back, so a pin never outlives a rolled-back chunk.
  `session.positions.pin` returns a promise that settles when the pin lands; the element's
  synchronous `pin` documents the delay.
- Keys are coarse above 1024 ids: a command touching more than that holds the whole slice (`graph`
  or `pins`) instead of each id. `add-edges`, `remove-nodes`, `update-rows` over more than 1024
  rows, a merge import and a chunked writer always hold the whole slice, because their full id
  set is either large or not known before they run (incident edges need a scan, element-assigned
  edge ids do not exist yet, a merge import's ids come from parsing). Per-id holds exist only so
  that small synchronous doors -- a pin, one attribute edit -- proceed beside an unrelated small
  writer. The hold table therefore never grows past a few thousand entries, and the scale test
  asserts the dispatch overhead of a million-id command.

Every other door never waits, so a synchronous setter's write is visible to its getter as soon as
the setter returns.

The dispatcher asserts in the strict build that no two open groups hold the same op-log id and
that a hand-over leaves each value key in exactly one open patch.

### 4.4 `dispatch(command)`

1. Look the op up. An op with no definition, or a definition with no vocabulary entry, fails a
   test and cannot ship (section 12.2).
2. Copy and freeze the stored arguments (section 3.4). Bulk record payloads are not copied,
   because ingest copies them into the records map anyway.
3. Decide the group (section 4.2).
4. An immediate command executes now (step 6). A queued command is enqueued on the session's
   shared queue (`session/GraphSession.ts:1089`). **Coalesce while queued:** if a command with the
   same queued coalesce key is queued and not yet started, the new command replaces its arguments
   in that slot instead of taking a new one. The element uses two such keys for property pairs
   that frameworks and the attribute path assign one after the other: `element-source` for the
   `data.import` of the `dataSource` / `dataSourceConfig` pair, and `element-layout` for the
   `layout.set` of the `layout` / `layoutConfig` pair (the `layoutConfig` setter re-runs
   `setLayout` today, `graphty-element.ts:1171`). Both resolve late (below), so the two
   assignments become one slot, one load and one step. Data-source loads, which bypass the queue
   today (`Graph.ts:620-622`), are moved onto it as `data.import`.
5. When a queued command's slot comes up: acquire its op-log keys (section 4.3), and let any
   pending derivation pass finish (section 9.1).
6. If the group needs a before-arrangement (it is `moves`, or it is a slot-holding writer, or it is
   a transaction about to make its first graph write) and does not have one yet, take it now
   (section 6.4). This happens when the command starts executing, not when it was dispatched, so
   work queued ahead of it that changed the arrangement is already reflected in it. Then run
   `execute` with the group's draft. A queued command may await computation (an algorithm, parsing
   a file) before it writes.
7. When the group seals: hand its patch to `History`, publish events in the order of section 9.3,
   and schedule the derivation (section 9).

**Doors resolve late.** A door whose argument is not serialisable, or whose meaning depends on
state at the moment it runs, hands the dispatcher a function from current state to a concrete
command, called when the command executes. History records the concrete command. This is how
`styles.removeBySource(predicate)` becomes `style.patch { action: "removeBySource", ids }`, how
`styles.highlight` finds the highlight layers it replaces, and how the element's `dataSource` +
`dataSourceConfig` pair becomes a `data.import` of whatever the pair holds when the slot comes up.
The source descriptor (section 3.4) is written inside that `data.import` step, never as a separate
`config.set`. A resolve function reads state, never derived output: `styles.resolveToStatic`
computes the value it pins from the stack and the records, not from the paint columns, which the
derivation lane may not have updated yet after an undo (section 9.1).

### 4.5 Re-entrant dispatch

Code that runs inside a command's `execute` can call public doors. Enqueueing those behind the
running slot would deadlock if awaited, and split the step if not. Deciding membership by "is a
command executing right now" would be time-based membership again: a run or an import awaits its
computation for its whole execution, minutes at a million nodes, and every edit the reader made
through the app in that window would join "Ran Betweenness" and be destroyed when an undo cancelled
the run. So membership stays by origin, and the closed set of commands that call back into doors
hand that code an origin:

- **`algo.legacy`** runs foreign code: a descriptor-less plugin's constructor and `run(g)`
  (`Algorithm.ts:278`, `:427`). The command constructs the plugin with, and passes to `run`, a
  **group-tagged `Graph` facade**: the same doors as `Graph`, whose dispatches carry the command's
  group and run inline against its draft without enqueueing. A plugin that calls `g.addNodes` or
  `g.styles` therefore adds to its own step.
- **`applySuggestedStyles`** is element code; it plans its encodes and moves into its own group
  directly, as auto-apply does for a run (section 4.7).
- **Assistant tools** receive `tx` in their context (section 5.3).

No other command inlines anything. An untagged dispatch always opens its own group, whatever is
executing at the time. The strict build asserts that an inline dispatch through the facade touches
only keys that are free or its own group's.

### 4.6 Every door becomes a wrapper

Every public verb keeps its signature and its body becomes a dispatch: `styles.update(id, patch)`
becomes a `style.patch` command, `Graph.addNodes` becomes `data.apply { kind: "add-nodes" }`, and
so on. Chains of doors (`Graph.addNodes` -> `DataManager.addNodes` -> `ingestNode`) collapse onto
the command. The manager classes stay exported; their mutating methods dispatch, so reaching
through `getDataManager()` still takes the one path. Section 11 lists every door.

The element's properties read from the session. Every property whose setter dispatches a command
becomes a getter over the slice that command writes, and all twenty-one private mirrors that hold
them today (`graphty-element.ts:437-461`) are deleted: `#layout`, `#layoutConfig`, `#viewMode`,
`#directed`, `#layoutBehavior`, `#background`, `#dataSource`, `#dataSourceConfig`, `#nodeIdPath`,
`#edgeSrcIdPath`, `#edgeDstIdPath`, `#edgeIdPath`, `#repeatedEdges`, `#nodeLabelPath`,
`#edgeWeightPath`, `#positionScale`, `#selectionStyle`, `#algorithmsOnLoad`,
`#runAlgorithmsOnLoad`, `#nodeData` and `#edgeData`. So is the `#dataSourceInitialized` latch
(`graphty-element.ts:743`): assignments of the `dataSource` / `dataSourceConfig` pair dispatch a
`data.import` under the `element-source` coalesce key, so a pair assigned in one tick is one load
and one step (section 4.4). After an undo, every getter reports the restored value, and the
`layoutConfig` setter (`:1171`) no longer re-applies an undone layout.

- **`layout`** returns the engine it was given (`"d3"` after `layout = "d3"`), read from the
  slice's `engine` field, so a framework's two-way binding sees the value it wrote.
- **`nodeData` and `edgeData`** return the graph as it is: the node records (and edge records) in
  row order, as a frozen array of the slice's frozen records, built on first read and cached per
  graph token. Today they return the last array assigned, so after undoing an add made through
  `nodeData =` the getter still returned the undone array, and a declarative host re-rendering
  with that value would re-add the nodes. The attributes are not reflected (they have a
  `fromAttribute` converter only), and stay unreflected. The change of meaning is listed in
  section 15.2.

The doors test builds its getter-after-undo list from every property door in the door list -- every
row whose door is an element property setter, whatever op it dispatches -- not from a
hand-written list or a list of ops, so a property added later is covered automatically.

### 4.7 Commands the element starts itself

- A run's commit tail plans its auto-applied layers into the run's own group, through the styles
  model's internal `planInto(draft, ...)`, instead of the fire-and-forget `styles.highlight` /
  `styles.encode` (`autoApply.ts:226`). The run, its result, its layers and its legend commit
  together.
- **A run asked to apply its suggested styles does it in the same step.** `Graph.runAlgorithm(ns,
type, { applySuggestedStyles: true })` today awaits the run, or runs the legacy plugin, and then
  calls `applySuggestedStyles` (`Graph.ts:1623-1627`, `:1640-1644`, and `runLegacyAsRun` from
  `:1720`). As two dispatches that would be two steps, and the first Ctrl+Z would remove only the
  styles. So `applySuggestedStyles` is an argument of `algo.run` and `algo.legacy`, and the commit
  tail plans the suggested layers into the run's own group exactly as auto-apply does. The same
  holds when the old address runs through `runOnLoad` or the app's `RunAlgorithmModal`.
- **Adding rows starts the on-load algorithms once, from the command.** `data.import`, the add
  kinds of `data.apply` (`add-nodes`, `add-edges`) and `data.expand` each register the on-load
  runs, when `runAlgorithmsOnLoad` is set, as deferred members of their own group, once, after their
  own part commits. They are not awaited inside the slot, so nothing deadlocks on the queue's single
  slot (`OperationQueueManager.ts:197`). A `batch` that adds nodes and edges (`setData`, the
  `edgeData` setter) starts them once for the batch, not once per member.
  `Graph.runAlgorithmsFromTemplate` (`Graph.ts:782`), which loops `runOnLoad` per entry, becomes
  one group whose members are those runs.
- **Starting the layout and framing the camera after a forward add** move into the `graph`
  derivation hook, which does both in forward mode only and never while the `restoring` flag is set
  (section 9.1). They were the other two side effects of the `data-added` listener.
- `runs.batch` opens one group. Each member is a separate run as today (`RunsApi.ts:1020-1030`),
  started beside the queue as today (`:451-453`), registered with the batch's group. Each member's
  tail writes its entry into the group's draft. The styling hold and release (`:966`, `:996`,
  `autoApply.ts:269-290`) is replaced: at release, auto-apply plans the held layers into the
  group's draft. The group seals when the last member finishes.
- A run's group writes the `runs` and `styles` keys only in its commit tail, which is synchronous,
  so a run holds no key while it computes and never blocks a style edit (section 4.3).
- `algo.remove` removes the run and its bound layers in one draft (today `RunsApi.ts:563` removes
  the layers as separate edits).
- **`layout.set` and `view.dimension` are slot-holding writers.** They cannot write the slice and
  leave the engine to a derivation scheduled at seal, because their pre-steps
  (`LayoutManager.ts:762`) need the new engine, and for a GPU simulation the pre-steps are
  asynchronous (`spendPreSteps` awaits `engine.stepAsync` chunks and ends with an unconditional
  `engine.publishPositions()`). The order is:
    1. take the group's before-arrangement (section 6.4);
    2. write the `layout` slice;
    3. run the `layout` derivation hook inline, inside the slot, to build or reconfigure the engine;
    4. spend the pre-steps, passing the engine's arrangement generation and the command's liveness
       into `spendPreSteps`. After every await it checks both, and if either changed -- an undo or
       restore bumped the generation, or the command was cancelled or made obsolete by a newer
       `layout-set` -- it stops **without publishing**;
    5. seal the group after the pre-steps land.

    If the command is cancelled or obsoleted during the pre-steps, its rollback restores the slice,
    the `layout` hook rebuilds the previous engine in restore mode, and the arrangement hook writes
    the before-arrangement back (section 6.4). The round-trip fixtures include an undo, and a second
    `layout.set`, while GPU pre-steps are in flight.

### 4.8 Failure and cancellation

A command that throws or is cancelled has its draft rolled back by applying the patch's inverse,
the same path undo uses. Nothing is recorded, and the state is exactly as it was, except for keys
another group has since taken over (section 4.3), which keep that group's value. This is how a
failed import leaves no step.

Drafts write through to live state, and derivation runs on every state change, so a group's
writes are drawn and readable through getters before it seals. A rollback that reverts writes
that were already live therefore publishes `project:changed` with cause `"rollback"` and the
slices it reverted, followed by the per-domain events (section 9.3), so a consumer mirroring state
from events sees the revert. A rollback that reverts nothing live (a command that threw before its
first write) publishes nothing. A group that holds a before-arrangement has it written back in
restore mode, and its rollback is not a rest point (section 6.4).

- A group's rollback first removes every member that is still queued or waiting on a key, so
  nothing it dispatched executes after the rollback. It then reverts everything its members
  wrote, including members that already finished. When undo cancels a batch, members already committed into the group are reverted and
  the held auto-apply plan is dropped, not applied.
- A run cancelled with reason `"undo"` never writes a `runs` entry, including the partial result
  a `publishOnCancel` run (`Run.ts:690-695`) resolves with. The handle still settles with that
  partial result, as today.
- **A cancelled or failed run's late value is discarded.** `Run.cancel` settles the handle
  immediately while an accelerator's function may still be running
  (`AccelerationController.ts:523-555`). The commit tail checks, before touching its draft, that
  the run is still live (its settled flag, `Run.ts:826-830`, is unset) and that its group's
  generation matches the one it was dispatched under. A late value fails the check and is dropped.

### 4.9 How bypasses are closed

Every writable escape the inventories found is made unreachable, read-only or frozen. What cannot
be frozen (typed arrays) is checked in the strict build.

| Bypass                                                                                                                                                                                                                                                                                                    | Closed by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Node.data` / `Edge.data`, nested values from `session.data.node()` / `edge()` (`session/data.ts:98`, `:118`)                                                                                                                                                                                             | Getters over deep-frozen slice records                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `GraphStore.builder`, `touch()`, `nextEdgeId()`, `recordDirectionFromFile()` (`GraphStore.ts:111`, `:203`, `:213`, `:481`); the runtime `GraphStore` behind `session.data.store` (`session/data.ts:51`)                                                                                                   | Private to the store; `graphOps.ts` is the only caller; `data.store` becomes a read-only facade matching `SessionGraphStore`, whose `positions` narrows to `ReadonlyElementPositions` (section 3.6). Strict build compares `builder.mutationCount` (`graph-format/src/types/builder.ts:346`) at every commit with the count the last primitive left                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Writable attribute tables on the resident snapshot (`graph-format/src/types/columns.ts:636-653`)                                                                                                                                                                                                          | Fixed in graph-format: a new `snapshot.seal()` makes `set`, `remove` and `rename` throw `E_FROZEN`. `GraphStore` attaches the position and pin columns (`GraphStore.ts:379`, `:388`) and then seals. The other column arrays are typed arrays and cannot be frozen; the strict build checksums them (section 12.1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| The lane-backed `position` and `graphty.pinned` columns of a snapshot handed to a consumer (`session.snapshot()`, `session.data.snapshot`): their arrays are the live lane, so a write there would bypass `positions.set` with no error and be sealed into whatever step is on top at the next rest point | The snapshot a consumer receives shares the store's structure and columns but carries copies of the `position` and `graphty.pinned` columns, sealed; the published type stays `GraphSnapshot`, so an exporter reading `byRole("position").data` works unchanged, and a write into the copy moves nothing. The raw lane is reachable only from the renderer (the engines, `DataManager`) and the `arrangement` hook. Listed in section 15.2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `session.positions` writers (`write`, `setPinned`, `fillUnplaced`, `grow`, `remap`, `view`, `pinnedView`; `data/positions.ts:202-446`), `DataManager.positions`, `LayoutEngine.nodePositions`                                                                                                             | The raw-array escapes and lane writers are removed from `session.positions`; its write verbs (`set`, `pin`, `unpin`) dispatch (section 10.1). Pin bytes are derived from the `pins` slice; the strict build checks they agree at each commit, except rows a drag holds (section 12.1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `DataManager.nodes` / `edges` / `edgesByIndex` / `edgeCache` / `graphResults` (`DataManager.ts:161-188`)                                                                                                                                                                                                  | `ReadonlyMap` / `readonly` types over private fields; `graphResults` moves into the `graph` slice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `Graph.styles` / `getStyles()` written in place; `DataManager.updateStyles`, `LayoutManager.updateStyles`                                                                                                                                                                                                 | `Styles.config` becomes the frozen merged view of section 3.2. Element setters dispatch `config.set`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `RenderManager.setBackgroundColor` (`RenderManager.ts:266`)                                                                                                                                                                                                                                               | Private. The `config` derivation hook is its only caller                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `config.graph.twoD` and `scene.metadata.twoD` (`Graph.ts:2587`, `:2590`, `:2690`, `:2751`, `:2762`)                                                                                                                                                                                                       | Computed from `layout.dimension` in the merged view, and written to scene metadata only by the `layout` hook (section 3.2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| The `data-added` listener's side effects (`Graph.ts:625-645`)                                                                                                                                                                                                                                             | Deleted; the commands that add rows start the on-load runs, and the `graph` hook starts the layout and frames the camera in forward mode only (section 4.7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `LayoutManager.layoutEngine` field, `setLayout`, `applyTemplateLayout`, `updateLayoutDimension`; `LayoutEngine.setNodePosition` / `pin` / `unpin`                                                                                                                                                         | Private; they become the `layout`, `pins` and `arrangement` derivation hooks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `Graph.userCameraPresets`                                                                                                                                                                                                                                                                                 | The `views` slice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `Graph.operationQueue` (`Graph.ts:258`)                                                                                                                                                                                                                                                                   | Private. Code queued on it cannot write state without dispatching anyway                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Plugin algorithms without a descriptor writing `algorithmResults` on `node.data` or `edge.data`, or `DataManager.graphResults` (`Algorithm.get().run()`, `AlgorithmManager.runAlgorithm`, `AlgorithmManager.ts:249`, `Algorithm.ts:427`)                                                                  | They run inside the `algo.legacy` command. For its duration only, the `data` getters on `Node` and `Edge` are swapped (on the prototype, not branched on every read) for ones that return a copy-on-write proxy: reads pass through to the frozen record, and the first write to a path copies that subtree with `structuredClone`. One proxy per record is cached in a `WeakMap` for the command's duration, so a record read twice allocates once. The paint and render paths read the `graph` slice's records map directly, never `node.data`, so they never see a proxy. `graphResults` is a mutable bag for the same duration. When the command ends, the written paths, and only those, become one `setAttributes` and one `setGraphValues` in the command's draft, and the ordinary getters are restored. Outside that command a write throws. A long asynchronous legacy plugin slows every other `node.data` reader, including other sessions' readers, while it runs; that is documented in the plugin guide |
| Auto-apply's hidden `painted` set                                                                                                                                                                                                                                                                         | Moves into `RunEntry.painted`, so undo and redo carry it. `pending` is in-flight work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `selection.nodeMembers()` / `edgeMembers()`, `visibility.masks`                                                                                                                                                                                                                                           | Selection is exempt and the masks are derived (section 3.4). Both return copies, so neither can change without an event                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `Node.setRenderState`, `Edge.setRenderVisible`, mesh and material writes                                                                                                                                                                                                                                  | Rendering, overwritten by the next derivation; documented as outside the contract                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

---

## 5. Steps, gestures and transactions

- **One command is one step**, labelled by its definition's `label` ("Ran Degree", "Changed
  colour of Hubs", "Loaded flights.csv"). A door may pass a more specific label.
- **Compound verbs are one group.** `algo.remove` (run plus layers), `runs.batch`,
  `applySuggestedStyles` (an encode and a move per layer, today `Graph.ts:1764-1813`),
  `Graph.setData` (today one fire-and-forget queued op per record, `Graph.ts:4734`) and entering XR
  from 2D (section 6.4) each become one step.
- **Recording discards the redo tail.** Recording a new step, or merging into the top step,
  discards `steps[position..]` and publishes `history:changed` with reason `"record"`. This
  includes late commits: a run started before an undo that finishes after it records on top and
  discards the redo tail, and a consumer that starts work in reaction to an undo does the same.
  Re-sealing an arrangement capture (section 6.4) changes an existing step's bytes and never
  discards anything.

### 5.1 `session.transaction(label, fn, options)`

```ts
transaction<T>(label: string,
               fn: (tx: TransactionScope, signal: AbortSignal) => T | Promise<T>,
               options?: TransactionOptions): Promise<T>;
```

- **Membership is by origin, not by time.** Commands dispatched through `tx` join the
  transaction. `tx` is a `GraphSession` facade with the same doors (`tx.styles.update`,
  `tx.data.addNodes`, `tx.execute`, `tx.run`, ...) whose dispatches carry the transaction's group.
  A command dispatched any other way is its own step, even while `fn` is running. If it writes a
  value key the transaction wrote, it takes that key over (section 4.3); if it needs a node or
  edge id the transaction holds, it fails at once with `E_HELD_BY_TRANSACTION` rather than wait,
  so `fn` awaiting a door outside `tx` can never deadlock. Commands the element starts for user
  input (drag, keys, double-click expansion) and commands of another transaction never join.
- **The join window closes when `fn` settles.** The step is recorded once `fn` has settled and
  every non-run command dispatched through `tx` has executed, including ones `fn` dispatched
  without awaiting, so an assistant tool's un-awaited `tx.styles.update` is part of the message's
  step. A `tx` dispatch made after that point rejects with `E_TRANSACTION_CLOSED`.
- **Runs started through `tx` and still going when `fn` settles are deferred members.** When one
  commits: if its step is on top and applied, its patch is merged into the step
  (`history:changed` reason `"merge"`); if its step was undone, it has already been cancelled; if
  other steps have been recorded above its step, it records as its own step with
  `provenance.after` set to the transaction's step id. A deferred member that fails contributes no
  patch and does not roll anything back.
- **A `tx` write verb resolves when its own part is done.** `tx.data.import` resolves after the
  last chunk has been written, not when the slot starts, so `fn` can read the imported graph
  (`session.data`, statistics) and dispatch what depends on it -- a `tx.layout.set`, a
  `tx.styles.add` -- before it settles. Deferred on-load runs are not part of that promise.
- **Returning a run from `fn`.** `transaction` returns a `Promise<T>`, and a promise resolved with
  a thenable adopts it. `Run` is a thenable (`Run.ts:633-643`), so a `fn` that returns a `Run`
  makes `transaction` wait for the whole run and resolve with its result. The TSDoc says so and
  shows the alternative: return `{ run }` to hand the handle out.
- **Nested transactions** (`tx.transaction(...)`) flatten into the outermost one.
- **Throw or abort.** If `fn` throws, or the `AbortSignal` fires, runs started through `tx` are
  cancelled, every member still queued or waiting is removed, every patch in the group is rolled
  back in reverse order, nothing is recorded, and the error is rethrown. The transaction then
  stays **aborted** until `fn` settles: every dispatch through `tx` in that window rejects with an
  `AbortError`, so `fn`'s tail cannot write onto the rolled-back state.
- A transaction with no patches records no step.
- **`batchOperations`.** `Graph.batchOperations` (`Graph.ts:2089`) and the element's
  `batchOperations` become transactions whose callback receives `tx`. Their published examples
  (`graphty-element.ts:2573-2589`, `Graph.ts:2229-2236`) call `element.addNodes`,
  `element.addEdges` and `element.setLayout` on the outer object; those calls are not through `tx`,
  so under origin membership each would be its own step. The examples are rewritten to
  `tx.data.addNodes`, `tx.data.addEdges` and `tx.layout.set`, which is possible because `tx` now
  has typed data verbs (section 10.1). So that the old usage is not silently emptied, a door
  called on the same `Graph` or element while one of its `batchOperations` callbacks is open logs
  a warning naming the `tx` verb to use. The batch stops holding the queue, and a throw rolls
  back instead of keeping partial changes (section 15.2). A time-scoped exception that made every
  door call during the callback join was rejected: it is the time-based membership this section
  removes, and it would pull the reader's own edits into the batch.

### 5.2 Coalescing

A definition may return a coalesce key. A new step merges into the top step when the keys are
equal, no other step was recorded and no undo happened in between, no undoable work dispatched
after the top step is still pending, and less than `coalesceMs` (1000 ms) passed since the top
step's last merge.

The pending-work condition keeps section 6.1's order well defined. Undo decides between a step and
pending work by which came later, and a merge would make the top step both older than the work
(its first edit) and newer (its last). So an edit that would coalesce into a step does not extend
it across work queued after it: queued work starts a new step. Change a filter, start a slow run,
change the filter again within the window, and history holds two filter steps; the first undo
undoes the second filter change and leaves the run going, the next cancels the run. An edit that
changes nothing records nothing and extends nothing, so there the first undo cancels the run. A merged step keeps the first patch's prior
values, takes the last patch's written values, and concatenates op-logs. Commands with equal keys
also collapse while still queued (section 4.4, step 5).

| Op                               | Key                                     |
| -------------------------------- | --------------------------------------- |
| `style.patch` updating one layer | `style:<layerId>:<sorted patched keys>` |
| `visibility.set`                 | `filter`                                |
| `visibility.window`              | `window`                                |
| `config.set`                     | `config:<sorted key paths>`             |
| `positions.set`                  | `positions`                             |

A merged `positions.set` keeps, per row, the first prior value and the last written value, so a
script that places nodes one at a time in a tight loop becomes one step per `coalesceMs` window,
not one step per call (section 7 says why that matters for eviction).

Two keys collapse only while queued and never merge recorded steps: `element-source` on the
element's `data.import` and `element-layout` on the element's `layout.set` (section 4.4).

The app's colour picker fires `styles.update` on every drag frame
(`graphty/src/components/shell/sidebar/controls/CompactColorInput.tsx:176`); it becomes one step
with no change in the app. Each frame writes the stack at once and schedules one derivation pass,
so frames that arrive faster than a repaint are drawn once.

### 5.3 Gestures the element owns

- **A node drag is a transaction the element opens itself.** `NodeBehavior` opens it at the top
  of `onDragStart` (`NodeBehavior.ts:91`), before that handler reheats the layout
  (`context.setRunning(true)`, `:118`) and calls `beginDrag` (`:126`). Opening it takes the
  drag's before-arrangement (section 6.4) before anything has moved. The pointer moves write the
  lane and the engine as in-flight work (`onDragUpdate`, `:148`, `:183`). At the drop
  (`:193-217`) the drag dispatches `positions.set` for the dragged row, and `positions.pin` when
  `pinOnDrag`, through its own `tx`, so only its own commands join. A pointer held still long
  enough for the reheated layout to settle mid-drag (`Graph.ts:936-938` stops the engine while
  `beginDrag` is active) is a rest point while the drag is open, so its capture becomes the drag's
  provisional after-arrangement, never a capture of the step below. The coordinates the layout
  settles on after the drop are captured at rest into the drag's step.
- **Undo during a drag ends the drag.** An open drag transaction is newer than the top step, so
  Ctrl+Z pressed mid-drag aborts it (section 6.1). The abort releases the drag in the engine,
  writes the drag-start capture back, and stops the layout; `NodeBehavior` treats the rejected
  drop dispatch as a no-op, and further pointer moves of that gesture are ignored until the
  pointer is released.
- **An immersive session stamps its steps.** Steps recorded while VR or AR is active carry
  `provenance.xr = "<mode>:<session start, ISO 8601>"`, so the app can keep grouping them as it
  does today.
- **An assistant message is one step.** `AiManager.execute` (`graphty-element/src/ai/AiManager.ts`)
  wraps each message in `transaction(message, fn, { provenance: { via: "assistant" } })`.
  `CommandContext` (`ai/commands/types.ts:30-39`), which today carries only `graph`,
  `abortSignal`, `emitEvent` and `updateStatus`, gains `tx: TransactionScope`. Every built-in
  command is ported to it: the style commands to `tx.styles.*`, `setLayout`
  (`LayoutCommands.ts:53`) to `tx.layout.set`, `setDimension` (`:111`) to `tx.layout.setDimension`,
  and the algorithm commands (`AlgorithmCommands.ts:103`, `:113`) to `tx.run` for catalogue
  algorithms and `tx.execute({ op: "algo.legacy", ... })` for plugins. The `registerCommand` guide
  says a registered command must use `ctx.tx` to join the message; a call through `ctx.graph` is
  its own step, and a throw rolls back only what went through `ctx.tx`.
- **Aborting the message's transaction stops the assistant.** `AiManager.execute` links the
  transaction's `AbortSignal` to its own abort controller, so when an undo aborts the open
  message (section 6.1), the model loop ends, no further tool is called, and every running
  command sees `CommandContext.abortSignal` fire. The `registerCommand` guide says a registered
  command must stop on that signal. Without the link, the loop would keep calling the model and
  running tools after the reader pressed Ctrl+Z, and any tool writing through `ctx.graph` would
  go on changing the graph. An assistant fixture undoes mid-message and asserts that no further
  tool runs.

---

## 6. Undo, runs, and the arrangement

### 6.1 What undo does while work is pending

`history.pending` lists undoable work dispatched but not committed: queued commands (runs,
imports, expansions, data edits, layout and dimension changes), open transactions, and deferred
members. Style, visibility, scope, view, config and position edits are immediate (section 4.1), so
they are never pending and undo never waits behind a run for them.

`undo()` looks at the following in order and acts on the first that applies:

0. **An open group in the way of the step.** Key holds govern dispatches, and a history call is
   not a dispatch, so undo checks the open groups itself. If an open group -- a transaction, a
   chunked writer, a slot-holding `layout.set` -- holds an op-log key (an id, or a whole slice)
   that the top step's patches touch, or has written graph rows since the top step was recorded,
   that group is aborted and rolled back first. This covers a transaction opened _before_ the top
   step, which rule 1 does not reach: an assistant message still waiting on the model while the
   reader adds node `x` (a step), after which the message sets attributes on `x` through `tx`.
   Without rule 0, undoing the add would remove `x`, and the message's later rollback, or the undo
   of its step, would restore attributes on a node that no longer exists. Likewise, if the reader
   removes `y` (a step) and the open message then appends `z`, undoing the removal rebuilds the
   rows with `y` back at its old index, and an inverse that worked by position would remove the
   wrong row; rule 0 aborts the message first, and every op-log inverse works by id (section 3.4)
   in any case. The press returns `{ kind: "cancelled", pending }` and does not also undo the step.
1. **Pending work newer than the top step** (queued or running work, or an open transaction,
   dispatched after the top step was recorded, or a deferred member of the top step) is
   cancelled with reason `"undo"`. When several such items are pending, the press cancels the
   **newest** (last in, first out, by dispatch order), and with it every later-dispatched pending
   item that needs a key the cancelled item holds or would write. For op-log slices that is
   conservatively every later graph writer: a queued `add-edges x-y` behind a queued
   `add-nodes x` is cancelled with it, instead of later executing against a graph with no `x`
   and recording a step the forward timeline never had. Dispatch order is used, not queue order,
   because the queue's batch sort may reorder them (section 4.1). An open transaction is aborted
   and rolled back. `undo()` returns `{ kind: "cancelled", pending }` listing every item it
   cancelled, and does not also undo a step. A load whose own part has been recorded, and whose
   degree pass is still running as a deferred member, has that pass cancelled by the first press
   and the load undone by the second. A `data.apply` dispatched a moment before the press and still
   queued is cancelled the same way: it never appeared, so cancelling it is the undo.
2. **Otherwise the top step is undone.** Pending work dispatched before the top step keeps
   running, unless rule 0 applied. A Betweenness run started before a colour change is not
   cancelled by undoing the colour change; when it finishes it records on top and discards the
   redo tail.

`history.cancel(pending)` follows the same cascade: cancelling one item also cancels every
later-dispatched pending item that depends on its keys, and its return value lists them.

Undo never waits for pending work to finish, so it takes effect at call time (section 6.2) even
while a minutes-long run holds the queue.

`history.nextUndo` says which of these the next press will do, so a button can read
"Cancel Betweenness" or "Undo Changed colour". `canUndo` is true when `nextUndo` is not `null`.
The same rule is written in the `undo()` TSDoc.

`redo()` follows the same rules, with rule 0 checked against the step being redone: it cancels only
pending work dispatched after the undo that created the redo tail, and leaves older work running.
Key holds already keep that older work's writes disjoint from the redone step's, exactly as they do
for undo, so a Betweenness run that has been going for ten minutes survives an undo and redo of a
colour change. When the older work commits, it records on top and discards the redo tail, as
section 5 says.

`restoreTo(step)` is defined as the equivalent sequence of undos or redos, applied one step at a
time for the cancellation rules and all at once for the state: restoring backward applies the undo
rules for each step passed, and restoring forward applies the redo rules. So restoring forward to a
step in the redo tail does not cancel a long run dispatched before the undo, exactly as redoing to
the same point would not. `restoreTo(null)` and `history.clear()` cancel all pending work and abort
any open transaction; their TSDoc says so.

### 6.2 Undo takes effect at call time

`undo()`, `redo()`, `restoreTo()` and `history.clear()` act synchronously when called. In order:

1. Set the `restoring` flag, stop the layout engine, and suspend its publishing into the lane. The
   flag stays set until the `arrangement` hook has run in the derivation pass, not merely for the
   pass: synchronous listeners (step 4) run before the pass, and a listener that reads
   `session.data.snapshot` (a history panel, a count chip) triggers the lazy freeze, whose
   snapshot-replaced listener would otherwise reload the engine and set it running
   (`LayoutManager.ts:418-431`). The same holds for a run or a door that reads the snapshot
   between the call and the pass.
2. Seal: if the lane has moved since the current capture (section 6.4), capture it into the seal
   target **before** the cursor moves, whether or not the layout was running.
3. Choose the step, apply rules 0 and 1 of section 6.1, move the cursor, apply the
   patch-proportional part of the state change (the structural graph part is queued, section 3.4),
   and bump the engine's arrangement generation.
4. Schedule the derivation, then publish the synchronous events of section 9.3.
5. Return a promise that resolves when the derivation has finished.

Between step 3 and the end of the derivation the lane is **not at rest**: rest-point sealing and
the capture a `moves` command takes wait until the `arrangement` hook has run. Otherwise a settle
or a `positions.set` in that window would read the pre-undo coordinates and seal them into the new
top step.

Calls made while an earlier undo is still deriving act at their own call time, in call order, on
the state the earlier call left. A held-down Ctrl+Z, which auto-repeats around 30 times a second,
therefore moves the cursor once per press, and the picture catches up in one derivation
(section 9.1). A history call made from inside a listener of one of these events is not run
re-entrantly: it is queued as a microtask and runs after the current call has returned its
promise.

### 6.3 Runs

- A run in flight is a `ManagedRun` outside project state. Its executor reads the state current
  when it started. When it succeeds and passes the liveness check of section 4.8, its tail writes
  `draft.runs.set(id, entry)` plus its auto-applied layers into its group.
- **A run whose graph changed while it computed still commits**, with `entry.stale = true`. "The
  graph changed" means the graph token at commit differs from the token the run read at start;
  because tokens are never reissued (section 3.4), a run dispatched on one branch cannot pass as
  fresh against a different graph that happens to carry the same number. This
  is today's staleness caveat, made explicit. It applies to the runs that the queue's progress
  rule already lets finish (`OperationQueueManager.ts:11`, `:389-395`: a run at 90% or more is not
  cancelled by a data edit), and to runs started beside the queue. Throwing away minutes of
  computation because a node was added is worse than a flagged result the reader can rerun.
- **A run keeps one handle for its whole life.** `Run` becomes a stable facade keyed by `RunId`
  whose getters read the current `RunEntry` and the current execution. History swaps entries,
  never handles. `rerun()` returns `this`, as documented today. The handle keeps its last settled
  result and record until the new execution commits; `resetForRerun` (`Run.ts:1071`) is deleted,
  and the replaced entry is the step's prior value, so undoing a rerun restores the previous
  result without computing anything.
- A handle whose entry has been undone reports `status: "removed"` and `result: undefined`;
  `cancel()` on it does nothing and `rerun()` starts a new execution as `runs.start` would. A redo
  restores the entry and the same handle reports it again. `runs.get(id)` returns that same
  handle.
- `RunChange` gains `generation`, a count of executions of that id, so a watcher keyed on the id
  can tell an old execution's `end` from a new one's.

### 6.4 The arrangement

Coordinates are recorded **at rest**, not per command, because a running layout moves every
unpinned node every frame and most commands (an add, a style edit) do not say where anything
goes.

**Knowing whether the lane moved.** `ElementPositions` lends its array to the snapshot, so
layouts, drags and GPU readbacks write it without passing through the class, and a counter bumped
per write would miss them (`data/positions.ts:166-170`). Instead the lane gets a `generation`,
bumped once per batch at the few coarse sites that write it: the engine's publish or step, a
readback landing, a drag update, `positions.set`, and a restore. Nothing bumps it per row. The
first three are **layout writes**, the last two **command writes**. The dispatcher keeps one
current capture and the generation it corresponds to. After a restore, the current capture is the
capture just written and its generation the one the restore bumped to, so the next rest point
with no movement since copies nothing. A test writes the lane the way a GPU readback does and
asserts the write is sealed at the next rest point.

**What a step holds.** Each step holds at most one **before-capture**, at most one
**after-capture** and at most one **row patch**:

- the before-capture is the arrangement when the step's group started changing things. Only groups
  that need one have it (below). It belongs to the step itself and is never written into another
  step;
- the after-capture is the arrangement at rest after the step, sealed at a rest point or at commit;
- the row patch comes from `positions.set`: the rows written and their prior and new x, y, z.

The arrangement after applying steps 1..k is

    A(k) = after(k), if step k has one;
           otherwise (before(k) if step k has one, else A(k-1)) with row patch(k) applied.
    A(0) = the baseline capture.

Undoing step k restores `before(k)` when it has one, and `A(k-1)` otherwise. Redoing step k
restores `A(k)`. When a step gets an after-capture its row patch is dropped, because the capture
already contains it. The random-sequence model checks the lane against these two rules.

**Which groups take a before-arrangement.** A group takes one, once, when its first command that
needs it starts executing (section 4.4, step 6):

- a `moves` command: `layout.set`, `view.dimension`, a replacing import, `clear`, and the drag
  transaction at drag start;
- a slot-holding writer: a chunked import, an expansion, and `layout.set` / `view.dimension`
  while their pre-steps run;
- a transaction, at its first graph write or its first `moves` command.

The before-arrangement is the current capture, shared by reference, if no layout write has moved
the lane since it was taken; otherwise a fresh capture of the lane. Single-slot data edits (an
add, an attribute edit, a small removal) do not take one: they write synchronously at the end of
their slot, so a throw rolls them back in the same frame, before any layout write could have moved
the lane. That is what keeps adding nodes one at a time while a layout runs from copying the lane
per add.

A group's before-arrangement serves two purposes. If the group records, it becomes the step's
before-capture, so undo returns to exactly where things were when the group began. If the group
rolls back -- it threw, was cancelled by an undo while pending, or was made obsolete -- the
`arrangement` hook writes it back in restore mode, and the rollback is **not** a rest point.
Without this, cancelling a chunked import halfway would remove the added rows but leave every
existing node where the half-run layout had pushed it, and then seal that displaced arrangement
into the step below as if it had been recorded there. The same applies to a `layout.set` cancelled
during its pre-steps. The round-trip fixtures cancel a chunked import mid-load and a `layout.set`
mid-pre-steps by undo, and assert that the lane equals the capture taken before the cancelled
work.

**Epochs.** A replacing import and `clear` take a fresh graph **epoch** (section 3.4) and seal their
own after-capture at commit: the seeded coordinates of the new graph. So every epoch begins with a
capture, and a restore never reaches below its epoch's first capture. Without this, a style edit
made while a newly imported graph was still settling would restore the previous dataset's
coordinates on undo, mapped onto the new graph by id, and ids such as `"1"`, `"2"` are common to
many files.

**The seal target.** Every capture that is not a group's own before-arrangement -- a rest point, the
seal a history call makes before it moves the cursor (section 6.2), the seal `positions.set` makes
after a layout write -- goes to the **seal target**:

- if an open group holds a before-arrangement, the newest such group's **provisional
  after-capture**, replacing any provisional it had. When the group records, the provisional
  becomes its step's after-capture, unless a history call has restored the lane since the
  provisional was taken, in which case the provisional is dropped and the next rest point seals
  into the new top step. If the group rolls back, the provisional is dropped;
- otherwise the after-capture of the newest applied step that has to do with the arrangement:
  one that holds a before-capture, an after-capture or a row patch, or whose graph writes added
  or removed nodes or edges or changed an edge's weight (the changes that set a running layout
  moving). Steps that moved nothing -- a setting, a style, a visibility filter -- are skipped;
- otherwise the baseline.

Skipping steps that moved nothing is what keeps an undo from producing an arrangement the reader
never saw. If the reader adds nodes and changes a setting while the layout is still moving, where
the layout comes to rest belongs to the add, not to the setting. Filed under the setting, undoing
the setting would restore the arrangement from before the add for every older node while the new
nodes stayed where they settled. The same holds for a transport `play` after an unrelated step:
its movement lands in the newest step that has to do with the arrangement, or in the baseline,
and undoing the unrelated step moves nothing. A round-trip fixture adds a node, makes a style
edit before the layout settles, lets it settle, and asserts that undoing the style edit leaves
the lane where it settled.

A rest point therefore never writes into a step at or below an open group's before-arrangement.
Without this rule, a transaction whose `tx.layout.set` took the current arrangement as its before,
and whose new layout then settled while `fn` was still waiting on the model, would have its
before overwritten with the new layout's coordinates, and undoing the transaction would not move
anything back. The same would happen to a replacing import whose new graph settles between
chunks, and to a drag held still until the layout settles. Fixtures cover all three: a layout that
settles between the chunks of a replacing import, one that settles while an app-style load
transaction is open, and a drag held until the layout settles; each is undone, and the lane must
equal the capture from before the group, including the previous dataset's lane after undoing the
replacing import.

**Rest points.** The layout comes to rest when it settles (`Graph.ts:938`), when it is paused, when
a layout that does not iterate (circular, fixed) finishes a placement pass, and when `undo`,
`redo` or `restoreTo` stops it (section 6.2). A rollback stops it too, but a rollback is not a rest
point: the group's before-arrangement is written back instead (above). At a rest point, if a layout
write has moved the lane since the current capture, the lane is captured into the seal target,
replacing any capture it had with a new object (that step's bytes are updated, eviction runs, and
`history:changed` is published with reason `"size"`). This is how a settle after an import, a drag
release, an add or a transport `play` lands in history, with no step of its own. A history call
seals **before** it moves the cursor, so an in-flight arrangement is never attributed to the step
below. Rest points are suspended while the `restoring` flag is set (section 6.2).

**`positions.set` does not copy the lane for a few rows.** Code can call it in a loop. If no
layout write has moved the lane since the current capture, it records only a row patch; if one
has, it first seals a capture into the seal target, then records its row patch. A script placing
nodes one at a time therefore costs at most one capture per layout frame, and its calls coalesce
into one step per `coalesceMs` window (section 5.2). When one call writes more than a third of the
rows, a row patch would cost more than a capture (24 bytes per row against 12, plus an id lookup
per row on restore), so the call seals a full after-capture instead of a row patch. Row patches
are stored as typed arrays -- a `Uint32Array` of row indices tagged with the graph token, and one
`Float32Array` of prior and new values -- and are mapped by id only when the token differs.

**Adds, attribute edits and merge imports do not capture.** New rows start unplaced, and undoing
the add removes them. How the layout moved existing nodes after the add is recorded at the next
rest point, which at the latest is the next history call. Unplaced rows are seeded
deterministically from a hash of the node id (`fillUnplaced`, `GraphStore.ts:575`, today depends
on call order), so a redone add that no rest point captured seeds the same coordinates it did the
first time.

**Restoring writes the lane and the engine, and does not reheat.** The `arrangement` hook writes
the lane and then calls a new `LayoutEngine.loadArrangement(lane)`: the engine takes the lane's
coordinates as its own (`SimulationLayoutEngine` refills `#simPositions` and its envelope from
them), sets `running = false` explicitly, and is left at rest. Two other paths reheat today and are
closed while the `restoring` flag is set: the snapshot-replaced listener
(`LayoutManager.ts:418-431`, `engine.reload(...); this.running = true`) and the reload after an
acceleration change. Both honour the flag by reloading without setting `running`, and the `graph`
hook feeds the layout without stepping it (section 9.1). Because the flag is set when the history
call starts and cleared only after the `arrangement` hook has run (section 6.2), a lazy freeze
triggered by a listener between the call and the pass cannot reheat either. Without this, the
freeze that undoing any graph step causes would reheat the simulation, move every unpinned node
away from the restored capture, and seal the new rest point over the top step's recorded
arrangement. A fixture reads `session.data.snapshot` from a `project:changed` listener during an
undo of an add, advances N frames, and asserts that the lane equals the restored capture and that
the top step's capture bytes are unchanged. The next drag, add or `setRunning(true)` starts from
the restored coordinates. Nothing runs a layout, so non-deterministic layouts restore exactly.

**Stale readbacks and pre-steps are dropped.** The engine has an arrangement generation, bumped by
every restore. A GPU readback submitted under an older generation is discarded when it lands
(`SimulationLayoutEngine.ts:698-720`, where today "a swap does not cancel a readback already in
flight"), and `spendPreSteps` stops without publishing when the generation changes under it
(section 4.7).

**Mapping.** A capture holds the node-id list of the snapshot its rows follow, and its graph
token. Restoring onto the same token copies the array. Onto a different one in the same epoch, it
maps rows by id, and rows the capture lacks keep their current coordinates. The id list is shared
by reference only where graph-format guarantees it is never rewritten in place; otherwise the
capture copies it (8 bytes per node).

**No sparse deltas.** Storing a capture as a delta against the one below it would save little:
a layout settle moves nearly every unpinned row, and the case where few rows change is a
`positions.set`, which records a row patch instead. Deltas would also make captures depend on
other captures, which rest-point re-sealing and eviction both replace.

The private `savedZPositions` map (`Graph.ts:271`, written at `:2806`) is deleted. A switch from
3D to 2D takes a before-arrangement when it starts, so the z values live in its step's before-capture.

**Entering VR or AR from 2D.** `Graph._setViewModeInternal` today switches a 2D scene to 3D when
XR starts (`Graph.ts:2736-2870`), rebuilding the engine and changing the arrangement from inside an
exempt command. Under this design, entering XR from 2D is one element transaction ("Switched to 3D
for VR") that dispatches `view.dimension "3d"` and then starts the XR session with the exempt
`view.immersive`. If XR is unavailable or entry fails (the branches at `Graph.ts:2822`, `:2833`),
the transaction throws and rolls back, so no dimension step is left that the reader never asked
for. Leaving XR does not switch back; the reader can undo. While an immersive session is active,
an undo or redo that would make the scene 2D ends the XR session first and then applies the
step. Refusing the step instead would block every older step beneath it, because undo is last in,
first out. The alternative to the dimension step, showing a flat 2D layout inside the headset,
keeps XR free of steps but gives the reader a flat graph in a device whose point is depth, which
is a regression from today. The strict test asserts the state digest is unchanged across
`view.immersive` itself, from 2D and from 3D.

---

## 7. Memory and scale

- Each step records two sizes: what it retains while done (the prior values its inverse needs)
  and what it retains while undone (the values redo needs). `history.bytes` sums the side each
  step is on. Sizes are estimated when the step records, and re-estimated when a capture is sealed
  into it or a deferred member merges into it; each re-estimate runs eviction and publishes
  `history:changed`.
- Estimates use the real storage. Typed arrays count their `byteLength`; records use the records
  map's running estimate (section 3.4); a `RunResult` reports `byteSize` (below); a kept set's
  record reports `recordBytes` (`session/sets/prepare.ts`), counted once across the history like a
  run result. A set member edit keeps both whole records: about 8 bytes per node member and 24 per
  edge member (a 1M-edge set about 24 MB per step), refused above 1M edge members until a members
  op-log exists. A redefine that changes only the reading shares the member arrays. Every step also
  counts a fixed 512 bytes for its `HistoryStep`, patch and frozen arguments, so a history of tiny
  steps is bounded too.
- `history.limitBytes` defaults to 256 MiB and `history.limitSteps` to 1000; both are settable.
  When either is exceeded, mask copies (section 3.4) are dropped first, because they are a cache
  that can be recomputed. Then the oldest done steps are evicted, then the farthest redo steps.
  Eviction runs in batches: once a limit is exceeded, it evicts down to 90% of both limits, so its
  work is amortised over many records instead of paid on every one. The latest done step and the
  next redo step are never evicted, so the last action stays undoable even when it alone is over
  budget.
- Evicted steps are removed whole. They are never kept as "not undoable" rows: undo is last in,
  first out, so a step that cannot be undone blocks every step beneath it, which would then be
  retained and unreachable.
- **Eviction folds evicted steps into the baseline arrangement, in place.** `A(0)`, the baseline
  capture (section 6.4), is a private buffer that only `History` owns and nothing else references,
  so it is exempt from the rule that captures are immutable. Evicting the oldest steps writes their
  arrangement contribution into it in order, using the recursion of section 6.4: a step's
  after-capture (or, lacking one, its before-capture) is copied over the buffer, mapped by id when
  the graph token differs, and its row patch is applied in place. Every evicted step's
  contribution survives, including a row patch from a `positions.set` step that holds no capture,
  and each fold costs O(rows) with no allocation. Without the fold, dropping such a step would lose
  its patch and undoing to the oldest surviving step would put those rows back at stale
  coordinates; and folding by copying an immutable capture per eviction would cost one 12 MB copy
  per evicted step at a million nodes. The buffer is counted in `history.bytes` as
  baseline-retained. At a million nodes a capture is about 12 MB, so eviction starts after
  roughly twenty layout-touching steps and this is the ordinary case, not an edge. The
  random-sequence test records 2000 `positions.set` steps with coalescing off and `limitSteps`
  1000, undoes all, and asserts that the lane equals the baseline with every evicted step's patch
  applied.
- `history.steps` is published lazily: the history keeps an internal array, a coalesced merge
  replaces only its top element, and a frozen copy is built only when `steps` is read after a
  version change. A colour-picker drag merging 60 times a second therefore allocates one step
  object per merge, not a frozen array of every step.

**Run results become columnar.** A `RunResult` today stores each half as an ids array, one frozen
record object per element (with rank and percentile filled in) and a `Map` from id to row
(`RunResult.ts:154-190`). At a million nodes that is on the order of 100 to 200 MB for one node
result, and an edge result over five million edges approaches a gigabyte, which would make the
256 MiB budget hold less than one run. As part of this work, `RunResult` stores each numeric field
as a `Float64Array` column, rank and percentile as columns, and non-numeric fields as plain arrays,
over one id index per half that is shared with the resident snapshot's id order when the order
matches. `node(id)` and `edge(id)` build their record on demand. The public surface of
`RunResult` does not change, except that two calls to `node(id)` return equal records rather than
the identical object. Rankings, which today memoise a full `RankingEntry[]` per field
(`RunResult.ts:593`, `:675-680`, one object per element), are cached as a `Uint32Array`
permutation per field, 4 bytes per element. `byteSize` sums the columns and every cache the result
holds, and is re-read when a cache is built.

A result's id index is counted by `History`, not by `byteSize`, because whether it costs anything
depends on what else is alive. An index shared with the resident snapshot's id order costs nothing
extra while that snapshot is resident. After any data edit the result still references the old
snapshot's id map, which is now kept alive only by results and their history entries; at a million
nodes an id-to-row map is tens of MB, more than the degree columns. So `History` charges an index
to `history.bytes` whenever the snapshot that owns it is not the resident one, once per index
object however many results share it (a `WeakMap` of charged index objects), and re-estimates the
affected steps whenever the resident snapshot changes.

Retained cost of common steps at one million nodes and about five million edges. The scale test
asserts these (section 12.6).

| Step                                                     | Retained                                                                                                                                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit attributes of one node                              | The prior values of the patched keys, under 1 KB                                                                                                                              |
| Remove 1000 nodes                                        | Their records and incident edges, about 100 KB to 1 MB                                                                                                                        |
| Style, scope or config edit                              | The replaced values, a few KB                                                                                                                                                 |
| Filter edit                                              | The replaced filter value, a few KB; plus at most one mask copy of up to 6 MB, taken once when the step stops coalescing or is undone, and dropped first under pressure       |
| Pin toggle                                               | The ids toggled                                                                                                                                                               |
| Degree run                                               | One `Float64Array` of degrees plus rank and percentile columns, about 24 MB, shared by state and history                                                                      |
| Rest point, drag, dimension switch                       | One capture, up to 12 MB                                                                                                                                                      |
| `positions.set`                                          | A row patch: 4 bytes of row index plus 24 bytes of prior and new values per row written; a full capture (12 bytes per row) when one call writes more than a third of the rows |
| Chunked import, expansion, transaction with graph writes | A before-capture, shared with the current capture when no layout write has moved the lane, otherwise up to 12 MB                                                              |
| Add nodes or edges                                       | The added ids                                                                                                                                                                 |
| Merge import                                             | Proportional to what it added                                                                                                                                                 |
| Replacing import or clear                                | The previous snapshot and records map, often over 200 MB. Kept as the latest step, and after that only while the budget allows                                                |

Undoing a keyed value step is a pointer swap per key. The synchronous part of undoing a data step
is proportional to its patch; the structural part is folded and materialised once, at the next
read or in the derivation pass (section 3.4), and costs one freeze, the same order as the edit it
reverses, plus one rebuild in the recorded order when a removal's rows were not at the end. A run
of thirty undos pays that once, not thirty times. Undoing or redoing a replacing import costs one
`GraphBuilder.from` and rebuilding every render object, which at the render layer costs about as
much as the original load; only the parse is saved. Undoing a removal of many nodes likewise
re-creates their meshes. These render-side costs are measured by the browser scale test
(section 12.6), not the Node one, which has no renderer.

---

## 8. Selection after undo and redo

- Each primitive reports the ids it touched: node and edge ids from `graph` primitives, the ids
  in `positions.set` and `positions.pin`, and the members of a saved or removed scope.
- After an undo, redo or restore, the session calls
  `selection.applyNow({ nodes, edges }, "replace", "history")`, with ids that no longer exist
  dropped. `SelectionCause` (`session/selection/SelectionApi.ts:82`) gains `"history"`.
- Style, filter, run, layout-choice, config and view steps touch no ids and leave the selection
  as it is. Selecting every repainted element would select the whole graph and say nothing.
- `replace` and `clear` report no touched ids, for the same reason. When any other step touched
  more ids than the selection cap, the selection is left as it is rather than built and truncated.
- Selection never enters state or history.

---

## 9. Rendering follows the state

Each slice registers a derivation hook, `derive(rendered, target, dirty)`: from the state the
picture last showed, to the state it must show, with the merged set of what changed. Forward
commits, undo, redo, restore and rollback all reach the screen only through these hooks, so
restoring state restores the picture by construction.

### 9.1 The derivation lane

Derivation does not run on the operation queue, whose obsolescence rules cancel queued and running
work (`OperationQueueManager.ts:336-410`, `constants/obsolescence-rules.ts:39-84`) and whose batch
sort reorders it (`:512-566`). It runs on its own lane in `derive.ts`:

- The lane keeps `rendered`, the state the picture shows, and a dirty set per slice (touched node
  and edge ids, layer identities, run ids, keys, and the graph op-lists in order).
- Every state change adds to the dirty set and schedules one pass. A pass derives from `rendered`
  to the current state and then sets `rendered` to it. Changes that arrive during a pass wait for
  the next pass; nothing is skipped or reordered, and intermediate states are never drawn.
- So `restoreTo` across thirty steps, or undo-all at a million nodes, costs one repaint, one
  layout feed and one freeze, not thirty.
- Hooks run in a fixed order: `graph`, `layout`, `pins`, `arrangement`, then the rest. The engine
  exists before pins are applied to it, and the arrangement is loaded last so nothing moves it.
- While the `restoring` flag is set -- from the start of an undo, redo or restore until its
  `arrangement` hook has run (section 6.2), and during the pass that derives a rollback -- the
  `graph` hook feeds the layout without stepping it (`LayoutEngine.updatePositions`,
  `LayoutEngine.ts:318`, today runs up to ten `step()` calls when fed), does not start the layout
  or frame the camera, and the engine's snapshot-replaced and acceleration-change reloads do not
  set it running (section 6.4).
- The `graph` hook folds the dirty op-lists into a net difference against `rendered` -- ids
  added, removed and updated -- before it touches a render object. `restoreTo` across thirty
  steps, or a chunked expansion followed by its rollback, therefore creates or disposes only the
  net set, never a mesh that is created and disposed within the same pass.

**Chunked writers derive as they go.** A chunked import and a double-click expansion schedule a
pass after each chunk, on the open draft's partial state, so the graph grows on screen while it
loads, as it does today. If the writer is then cancelled or fails, its rollback changes the state
back and the next pass derives that, removing the chunks already drawn and shrinking the lane,
and the `arrangement` hook writes the writer's before-arrangement back (section 6.4).

### 9.2 The hooks

| Slice         | Hook                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `graph`       | `DataManager` folds the dirty op-lists into a net difference, creates or disposes only the net `Node` / `Edge` render objects, materialises and refreezes the store once, feeds the layout, and repaints the touched ids. In forward mode only (the `restoring` flag unset), when rows were added it also starts the layout and frames the camera, which the `data-added` listener did before (section 4.7). `Graph.updateNodes`' manual `repaintFromSession()` (`Graph.ts:1977`) goes away                                                                                                                                                                              |
| `layout`      | Swap or reconfigure the engine in restore mode: no pre-steps, not running. Write `scene.metadata.twoD` from `layout.dimension` and rebuild the merged `Styles.config` view (section 3.2). A forward `layout.set` runs this hook inline inside its slot (section 4.7)                                                                                                                                                                                                                                                                                                                                                                                                     |
| `pins`        | Write the lane's pin bytes; `engine.pin` / `unpin`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `arrangement` | Write the lane, then `engine.loadArrangement(lane)` (section 6.4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `runs`        | Forget prepared bindings (`painter.invalidate`), repaint the layers bound to changed run ids                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `styles`      | The existing plan-and-paint path in `styles/repaint.ts`. The dirty set is the difference in layer identities between the two stacks. The slice holds the compiled layers themselves, so a restored stack comes back compiled and nothing is compiled on undo or redo                                                                                                                                                                                                                                                                                                                                                                                                     |
| `visibility`  | Runs after `graph`. On undo or redo, when the nearest filter step at or below the target kept a mask copy whose tags all match (section 3.4), copy its bytes into the one live `ElementMask` pair and bump its revision; otherwise evaluate the filter into that pair, as `sync()` does today. Mark the pair evaluated against the current snapshot either way. A forward filter edit evaluates and copies nothing                                                                                                                                                                                                                                                       |
| `sets`        | Nothing to draw. The kept sets tell their change -- one `SetChange` per changed key, from the committed diff of the slice -- from `project:changed`, synchronously when a step seals and on undo, redo and restore alike (never for a rollback): the change notifier re-resolves the layers and the filter naming a changed set and repaints only the rows whose membership moved, then `set:changed` is published. The hook order puts `sets` after `runs`, which a set may read, and before `styles` and `visibility`, which read sets                                                                                                                                 |
| `config`      | Apply background, selection style and layout behaviour, and rebuild the merged `Styles.config` view. Import settings take effect at the next import, as today. The hook owns at most one skybox dome: it disposes the current dome when the background becomes a colour or a different skybox, and creates one only when the target is a skybox the scene does not already show. Today `setBackground` creates a new `PhotoDome` on every skybox value and never disposes the last (`Graph.ts:1004-1018`), so undoing a skybox would leave the dome visible and every redo would add another. An act-then-undo story and a picture test cover colour to skybox to colour |
| `views`       | Nothing to draw                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

The session is Node-safe, so the renderer-side hooks (`layout`, `pins`, `arrangement`, `config`,
and the render half of `graph`) are registered by `Graph.ts` on the element's session. A headless
session holds the same slices without them.

A headless session's own `graph` hook repaints every layer when the rows change (an add, a
removal, a replace, a weight or the direction, which the graph primitives mark with the
`rows:moved` key). When only records' attributes changed, it repaints only the layers that read a
field the edit changed -- a compiled layer lists every path its selector and its bindings read,
and the attribute writes announce the fields they changed -- and then the edited rows whole, so an
element an edit took out of a reader's match is repainted too. A record edit no layer reads paints
nothing. Measured on the development machine (i9-14900, one core, 49,000 nodes and 98,000 edges,
the element's two base layers): undoing one attribute edit took 76 to 95 ms before this, on the
undo branch and on the merged one alike, nearly all of it the repaint of every layer over every row;
it takes 0.2 ms now.

### 9.3 Event order

Every commit and every undo, redo, restore and rollback publishes in this order:

1. The state changes, the cursor moves (for a history call), and the derivation pass is
   scheduled. No listener runs before all three are done.
2. `project:changed` and `history:changed`, synchronously, so an Undo button updates at once.
3. The derivation pass.
4. The existing per-domain events for what changed -- `style:changed`, `visibility:changed`,
   `run:changed` and the rest -- each carrying a new `cause` field:
   `"command" | "undo" | "redo" | "restore" | "rollback"`. A run that an undo removes publishes
   `run:changed` with the new phase `"removed"`; one that a redo brings back publishes
   `"restored"`.
5. For a run's own commit, `run:changed` with phase `"end"`. A watcher that reads `runs.get()` or
   the style stack on `"end"` sees the committed entry and layers.
6. The promise of the command, `undo()`, `redo()` or `restoreTo()` resolves.

The per-domain events come after the derivation because `StyleChange.painted` is "How much was
repainted" (`StylesApi.ts:446-452`, `:563-564`): today the event fires after the repaint, and a
consumer that reads `painted` or `session.paint` on `style:changed` must keep seeing the painted
result. When one pass covers several edits (a held Ctrl+Z, a colour-picker drag), each edit's
event carries that pass's merged `RepaintReport`; the TSDoc of `painted` says so. `style:changed`
keeps its promise of one event per edit: an undo publishes one event per step undone.

**Which event a mirror listens to.** The session has per-domain events only for runs, selection,
visibility, styles and sets (and capabilities). The `graph`, `layout`, `pins`, `arrangement`,
`config` and `views` slices have none. For those, **`project:changed { slices, cause }` is the one
event**: a consumer that mirrors the layout choice, the dimension, the pinned set or a setting
re-reads the slices it names. A mirror of runs, styles, visibility or selection keeps listening to
its per-domain event, which now carries `cause`. Adding seven new per-domain events was rejected:
they would say nothing `project:changed` does not, and each would be one more published name.

**The element's graph events on undo and redo.** `data-added`, `elements-removed` and
`data-loaded` (`EventManager.ts:164`, `:182`) fire for every change of the rows, whatever caused
it, including undo, redo and rollback, and they gain the same `cause` field. A third party that
tracks nodes through them therefore stays in sync across undo. The element itself does no work in
response to any of them (section 4.7): undoing a removal fires `data-added` with cause `"undo"`,
and no layout starts, no on-load run starts and the camera does not move.

A rollback publishes these events too, with cause `"rollback"`, when it reverts writes that were
already live (section 4.8).

A listener that calls a door from inside any of these events opens its own group, as any other
caller does; a listener that calls `undo`, `redo` or `restoreTo` is serialised after the current
call (section 6.2).

---

## 10. Public API

Every name in this section is a **published contract** unless it says otherwise. They are
collected in section 15 as decisions for the owner.

### 10.1 On `GraphSession` (`graphty-element/src/session/types.ts`, exported from `./session`)

```ts
interface GraphSession {
    /**
     * Undo the last step, or cancel pending undoable work dispatched after it instead. Never
     * waits for pending work. Resolves once the picture matches the state.
     */
    undo(): Promise<HistoryOutcome>;
    redo(): Promise<HistoryOutcome>;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    readonly history: SessionHistory;
    /** Commands dispatched through `tx` are one step. Throw or abort to roll them all back. */
    transaction<T>(
        label: string,
        fn: (tx: TransactionScope, signal: AbortSignal) => T | Promise<T>,
        options?: TransactionOptions,
    ): Promise<T>;
    /**
     * Dispatch any op in the vocabulary. Returns the op's outcome directly, not wrapped in a
     * promise; every outcome is itself awaitable (a `Run` for `algo.run`, a `Promise` for the
     * rest), so `await session.execute(...)` waits for the op and a caller that wants the run
     * handle keeps the returned value without awaiting it.
     */
    execute<C extends SessionCommand>(command: C): CommandOutcome<C>;
    /** Unchanged: starts an algorithm run. */
    run(command: AlgorithmRunCommand, options?: RunOptions): Run;

    // Read surfaces with typed write verbs
    readonly data: SessionDataApi; // exists; gains the write verbs below
    readonly layout: SessionLayout;
    readonly positions: SessionPositions; // narrowed (breaking): no raw-array escapes
    readonly views: SessionViews;
    readonly config: SessionConfig; // exists; gains getters and set()
}

// SessionDataApi keeps its readers (snapshot, node, edge, lastImport, attributes) and gains:
interface SessionDataApi {
    /** Resolves after the last chunk is written; deferred on-load runs are not part of it. */
    import(source: DataSourceInput, options?: ImportOptions): Promise<void>; // data.import
    addNodes(records: readonly NodeRecordInput[]): Promise<void>; // data.apply add-nodes
    addEdges(records: readonly EdgeRecordInput[]): Promise<void>; // data.apply add-edges
    updateNodes(rows: readonly RowUpdate<NodeId>[]): Promise<void>; // data.apply update-rows
    updateEdges(rows: readonly RowUpdate<EdgeId>[]): Promise<void>; // data.apply update-rows
    removeNodes(ids: readonly NodeId[]): Promise<void>; // data.apply remove-nodes
    removeEdges(ids: readonly EdgeId[]): Promise<void>; // data.apply remove-edges
    clear(): Promise<void>; // data.apply clear
}

/**
 * A source to import: the same pair the element takes as `dataSource` / `dataSourceConfig`.
 * `type` is a registered data-source name ("json", "csv", "graphml", ...), detected from the
 * file name, the URL or the content when absent; `config` is that source's options (inline
 * `data`, a `file`, or a `url`, and what the source reads besides).
 */
interface DataSourceInput {
    readonly type?: string;
    readonly config: Readonly<Record<string, unknown>>;
    /** What the reader calls the data; the file's name or the URL's last part when absent. */
    readonly name?: string;
}

/**
 * Where the graph was loaded from, as the graph keeps it: never the inline text or the file
 * itself, which the loaded rows already hold. Part of the `graph` slice, so undo and redo move
 * it with the rows, and `clear` takes it away.
 */
interface DataSourceDescriptor {
    readonly type?: string; // the format named, or the one detected
    readonly name?: string;
    readonly size?: number; // bytes, when a file was read
    readonly config?: Readonly<Record<string, unknown>>; // without `data` and `file`
}

// SessionDataApi also gains a reader:
//     source(): DataSourceDescriptor | null;   // null before any load and after `clear`

interface ImportOptions {
    /** "replace" (default) clears the graph first, in the same step; "merge" adds to it. */
    readonly mode?: "replace" | "merge";
    /**
     * "recommended" applies `recommendLayout` for the imported graph inside the import's own
     * step, as a `layout.set` member of its group; "keep" (default) leaves the layout as it is.
     */
    readonly layout?: "recommended" | "keep";
}

/** A record to add: `NodeRecord` (`session/types.ts:55`) before the element has seen it. */
type NodeRecordInput = Readonly<Record<string, unknown>>; // its id is read through nodeIdPath
/** An edge to add; endpoints are read through the edge id paths, the id is assigned. */
type EdgeRecordInput = Readonly<Record<string, unknown>>;

/** New values for some attributes of one existing row; keys not named are left as they are. */
interface RowUpdate<Id> {
    readonly id: Id;
    readonly values: Readonly<Record<string, unknown>>;
}

interface SessionLayout {
    readonly id: LayoutId; // the catalogue name, e.g. "force"
    readonly engine: string; // the engine chosen for it, e.g. "d3"; stored in the slice
    readonly options: Readonly<Record<string, unknown>>;
    readonly dimension: "2d" | "3d";
    /** `engine` defaults to the catalogue's default engine for `id`; options are validated against it. */
    set(
        id: LayoutId,
        options?: { readonly engine?: string; readonly options?: Record<string, unknown> },
    ): Promise<void>; // layout.set
    setDimension(dimension: "2d" | "3d"): Promise<void>; // view.dimension
}

/** One node's coordinates for `positions.set`. `z` is ignored in 2D and defaults to 0. */
interface PositionEntry {
    readonly id: NodeId;
    readonly x: number;
    readonly y: number;
    readonly z?: number;
}

/** The read half of today's `ElementPositions` class (`data/positions.ts`), by row index. */
interface ReadonlyElementPositions {
    readonly capacity: number;
    readonly count: number;
    readonly placedCount: number;
    readonly pinnedCount: number;
    isPlaced(index: number): boolean;
    isPinned(index: number): boolean;
    read(index: number, out: { x: number; y: number; z: number }): void;
}

interface SessionPositions extends ReadonlyElementPositions {
    readonly pinned: ReadonlySet<NodeId>; // the pins slice
    set(entries: readonly PositionEntry[]): Promise<void>; // positions.set
    pin(ids: readonly NodeId[]): Promise<void>; // positions.pin
    unpin(ids: readonly NodeId[]): Promise<void>;
}

interface SessionViews extends ReadonlyMap<string, CameraState> {
    save(views: readonly { name: string; camera: CameraState }[]): Promise<void>; // view.save
    remove(names: readonly string[]): Promise<void>; // view.remove
}

/**
 * The project settings: the keys of the `config` slice, every one undoable. `data` is the
 * element's existing data configuration, `SessionDataConfig` (the zod `DataConfig`,
 * `config/DataConfig.ts:162`): `algorithms`, `directed`, and `knownFields` with every known
 * field (`nodeIdPath`, `nodeLabelPath`, `nodeWeightPath`, `nodeTimePath`, `edgeSrcIdPath`,
 * `edgeDstIdPath`, `edgeIdPath`, `repeatedEdges`, `edgeWeightPath`, `edgeTimePath`,
 * `positionScale`, `idCoercion`). One spelling: there is no flat `nodeIdPath` or
 * `algorithmsOnLoad` beside it.
 */
interface ProjectConfig {
    readonly data: SessionDataConfig;
    readonly runAlgorithmsOnLoad: boolean;
    readonly background: GraphBackgroundConfig;
    readonly selectionStyle: GraphSelectionStyleInput;
    readonly layoutBehavior: { readonly preSteps: number; readonly stepMultiplier: number; readonly minDelta: number };
}

/**
 * A partial `ProjectConfig`, nested: `{ data: { knownFields: { nodeIdPath: "key" } } }`. Plain
 * objects recurse; arrays (`data.algorithms`) and `background` / `selectionStyle` are replaced
 * whole. Setting a leaf to `undefined` returns it to its default.
 */
type ProjectConfigPatch = {
    readonly data?: {
        readonly algorithms?: SessionDataConfig["algorithms"];
        readonly directed?: SessionDataConfig["directed"];
        readonly knownFields?: Partial<SessionDataConfig["knownFields"]>;
    };
    readonly runAlgorithmsOnLoad?: boolean;
    readonly background?: GraphBackgroundConfig;
    readonly selectionStyle?: GraphSelectionStyleInput;
    readonly layoutBehavior?: Partial<ProjectConfig["layoutBehavior"]>;
};

/**
 * The session's settings as they are now (today's TSDoc, "the configuration this session was
 * built with", is replaced). `data` keeps its shape and now reads live; `acceleration` keeps its
 * meaning.
 */
interface SessionConfig extends ProjectConfig {
    // every ProjectConfig key, read live
    set(values: ProjectConfigPatch): Promise<void>; // config.set; resolves once derived
    // `acceleration` stays, visibly separate: a machine preference, exempt from history
}

/**
 * What `execute` returns, per op. No entry is wrapped in a promise, because a promise resolved
 * with a `Run` would adopt it and yield the result instead of the handle (`Run.ts:633-643`).
 */
interface CommandOutcomeMap {
    "algo.run": Run; // the handle; awaiting it yields the RunResult
    "algo.legacy": Promise<void>;
    "algo.remove": Promise<void>;
    "style.patch": Promise<void>;
    "style.encode": Promise<void>;
    "style.template": Promise<void>;
    "data.import": Promise<void>;
    "data.apply": Promise<void>;
    "data.expand": Promise<void>;
    "set.create": Promise<SetId>;
    // every other op in section 10.5: Promise<void>
}
type CommandOutcome<C extends SessionCommand> = CommandOutcomeMap[C["op"]];

type TransactionScope = Omit<GraphSession, "undo" | "redo" | "history" | "dispose">;

interface TransactionOptions {
    readonly provenance?: Readonly<Record<string, string>>;
}

type ProjectSlice =
    | "graph"
    | "config"
    | "layout"
    | "pins"
    | "arrangement"
    | "runs"
    | "styles"
    | "visibility"
    | "sets"
    | "views";

type HistoryStepId = string & { readonly __brand: "HistoryStepId" };
type PendingId = string & { readonly __brand: "PendingId" };

interface HistoryStep {
    readonly id: HistoryStepId;
    readonly label: string;
    readonly at: string; // ISO 8601 of the last commit or merge
    readonly ops: readonly SessionCommand["op"][]; // names only; payloads are not retained for display
    readonly slices: readonly ProjectSlice[]; // "graph" here is what a data-only view filters on
    readonly bytes: number; // retained on the side of the cursor it is on
    readonly provenance: Readonly<Record<string, string>>; // e.g. { via: "assistant" }, { xr: "vr:2026-09-26T14:21:00Z" }
}

interface PendingStep {
    readonly id: PendingId;
    readonly label: string;
    readonly since: string; // ISO 8601
    readonly runIds: readonly RunId[];
}

interface SessionHistory {
    readonly version: number; // bumped on every history:changed
    readonly steps: readonly HistoryStep[]; // oldest first; steps[position..] are undone
    readonly position: number; // count of applied steps
    readonly pending: readonly PendingStep[];
    readonly nextUndo:
        | { readonly kind: "cancel"; readonly pending: readonly PendingStep[] }
        | { readonly kind: "undo"; readonly step: HistoryStep }
        | null;
    readonly bytes: number;
    limitBytes: number; // default 256 MiB
    limitSteps: number; // default 1000
    restoreTo(step: HistoryStepId | null): Promise<HistoryOutcome>; // null: back to the baseline
    /** Cancels the item and every later-dispatched item that depends on its keys (section 6.1). */
    cancel(pending: PendingId): readonly PendingStep[];
    clear(): void; // the current state becomes the baseline
}

type HistoryOutcome =
    | { readonly kind: "undone" | "redone" | "restored"; readonly steps: readonly HistoryStep[] }
    | { readonly kind: "cancelled"; readonly pending: readonly PendingStep[] }
    | { readonly kind: "nothing" };

interface SessionEventMap {
    // added
    "history:changed": {
        readonly reason: "record" | "merge" | "undo" | "redo" | "restore" | "evict" | "clear" | "pending" | "size";
    };
    "project:changed": { readonly slices: readonly ProjectSlice[]; readonly cause: HistoryCause };
}

type HistoryCause = "command" | "undo" | "redo" | "restore" | "rollback";
```

`history.steps`, `history.pending` and `history.nextUndo` are frozen values, built on first read
after a change and the identical objects between changes (section 7), and `history.version`
counts changes.

**The key list of `config` is derived, not written.** The slice's keys are the leaves of the zod
`DataConfig` schema plus the four other `ProjectConfig` keys, enumerated from the schema at module
load, so a known field added to `DataConfig` joins the slice, `config.set` and the project-file
boundary automatically. The vocabulary test fails when a `DataConfig` leaf is neither a slice key
nor on a short exempt list with a reason.

**What the style and visibility verbs' `Run` handles mean now.** `styles.add`, `update`, `remove`,
`move`, `encode`, `applyTemplate` and the visibility verbs return a `Run` and accept `RunOptions`
(`StylesApi.ts:17-23`, "each returns a Run ... report progress, take an AbortSignal"). The edit is
now an immediate write and the repaint a derivation pass that may cover several edits, so the
TSDoc of each says:

- the handle settles when the derivation pass covering the edit has finished, and its progress
  reports that pass;
- an `AbortSignal` already aborted when the verb is called rejects without writing anything;
- `cancel()`, or an abort after the call, does **not** revert the edit, which has already been
  recorded and may have been coalesced into a larger step; undo is the way back. The handle then
  resolves with the edit applied;
- these handles are never listed in `history.pending` or in `runs`.

Reverting on cancel was rejected: a cancel landing after the edit had coalesced into the top step
would have to split that step or revert other frames' writes. The row is in section 15.2.

`TransactionScope` is derived from `GraphSession`, so it has every write verb above, including
`tx.data.*`. The element and `Graph` data doors become thin calls to `session.data` verbs, and a
headless `./session` consumer changes graph data through typed methods instead of raw
`execute({ op: "data.apply", ... })` objects. Two new error codes: `E_HELD_BY_TRANSACTION`
(section 4.3) and `E_TRANSACTION_CLOSED` (section 5.1). The documented React pattern is
`useSyncExternalStore(subscribe, () => session.history.version)`.

Changes to existing published types:

- `SessionCommand` (`session/planning.ts:67`, today `AlgorithmRunCommand`) widens to the full
  union. Widening an input type is safe. `run()` keeps accepting only `AlgorithmRunCommand`,
  because it returns an algorithm-run handle; every other op goes through `execute`.
- `StyleChange`, `VisibilityChange` and `RunChange` gain `cause: HistoryCause`. `RunChange` gains
  `generation`. `RunPhase` gains `"removed"` and `"restored"`. `RunStatus` gains `"removed"`.
- `SelectionCause` gains `"history"`. `SessionEventMap` gains two events. `RunResult` gains
  `byteSize`.
- `SessionDataApi` gains write verbs. `SessionConfig` gains a getter per `ProjectConfig` key and
  `set`. `SessionPositions` gains `pinned`; there is no separate `session.pins`, so the pinned set
  sits beside `pin` and `unpin`.
- `CreateGraphSessionOptions` loses `store`, `records` and the function form of `config.data`
  (section 3.6). `SessionGraphStore.positions` narrows to `ReadonlyElementPositions`.
- `AlgorithmRunCommand` and the `algo.legacy` arguments gain `applySuggestedStyles?: boolean`
  (section 4.7).
- The element's `data-added`, `elements-removed` and `data-loaded` events gain `cause`
  (section 9.3).
- Widening an output union breaks an exhaustive `switch` in a consumer, at type level only.
- `session.positions` narrows, `node.data` / `edge.data` become frozen, and the escape fields in
  section 4.9 become private. These break code that writes through them (section 15).

### 10.2 On the element

- Every element property reads from the session (section 4.6).
- `graphty-history-change`: a DOM event mirroring `history:changed`, beside the existing
  `graphty-*-change` events.
- `historyKeys` property, attribute `history-keys`, boolean, default on. When on, `InputManager`
  (`InputManager.ts:295-300`) calls `session.undo()` on Mod+Z and `session.redo()` on Shift+Mod+Z
  and Mod+Y, and calls `preventDefault()` on the key events it handles. For that,
  `convertKeyboardInfo` (`babylon-input-system.ts:72`) carries a `preventDefault` callback from the
  DOM event into the plain info object `InputManager` sees (`InputManager.ts:284-300`). The canvas
  receives keys only while it has focus. A host that binds the same keys skips events with
  `defaultPrevented` set (the graphty app already does,
  `graphty/src/components/shell/useShellKeyBindings.ts:155`), or turns `history-keys` off.
- `removeEdges`, and on `Graph` `removeEdges` and `updateEdges`: new doors for verbs that had
  none. `removeCameraPreset` on the element and `Graph`.
- `nodeData` and `edgeData` read the graph, not the last array assigned (section 4.6).
- No new camera or XR doors are needed to remove `GraphtyHandle.graph` (section 13): every camera
  and XR call the app makes through it (`design/undo/inventory-app.md`, the row "The raw `Graph` object") already has
  an element door -- `getCameraState`, `setCameraState`, `setCameraTarget`, `setCameraZoom`,
  `resetCamera`, `zoomToFit`, the `xrConfig` property and `addListener`
  (`graphty-element.ts:1856-1935`, `:2512`, `:1606`, `:2617`). `selectNode` / `deselectNode` move to
  `session.selection`, and `runAlgorithm` to `session.run`.

### 10.3 Documentation

A capability only the graphty app knows how to use is unfinished, so documentation is a
deliverable of this work, not a follow-up:

- An **"Undo and history"** guide in the graphty-element docs (`graphty-element/docs/guide/`):
  what is and is not undoable, as the slice table in plain words; the baseline, and why a load
  declared in markup is not a step; `transaction` and `tx`, with key hand-over,
  `E_HELD_BY_TRANSACTION`, and the case where a failed transaction's style edits survive because
  the reader edited the style stack meanwhile (section 4.3); returning a `Run` from `fn`; what
  undo does to an open transaction (section 6.1, rule 0); mirroring state from `project:changed`
  and the per-domain events (section 9.3); what the `Run` handle of a style or visibility verb
  means (section 10.1); the plugin facade of
  section 4.5; `ctx.tx` for registered assistant commands; coalescing; what undo does while a
  run is going (section 6.1), with `nextUndo`; coordinates recorded at rest; the memory budget and
  eviction; `history-keys` and how a host that binds the same keys cooperates; the React
  `useSyncExternalStore` pattern; and what is outside the contract (layer `userData`, direct mesh
  writes).
- A **3.0 migration** section: every row of section 15.2, with one line of replacement code for
  each.
- TSDoc on every new public name, checked by the existing TypeDoc run, and a runnable example in
  the guide.

### 10.4 `./commands`

`graphty-element/commands.ts` (today `export {}`) publishes, as data only so the entry stays
Node-safe (`graphty-element/test/packaging/node-safe-entries.test.ts:18`):

- `SessionCommand`, the full union, re-exported from `./session`. The header of `commands.ts`
  names the union `Command`; this design settles on `SessionCommand`, the name `./session` already
  publishes, and updates the header, because two names for one union is a spelling the element
  never settled.
- `COMMANDS`, the vocabulary table, declared
  `satisfies { readonly [Op in SessionCommand["op"]]: CommandMeta }`, so an op that declares
  neither undoable nor exempt fails to compile
- `type CommandMeta = { readonly undo: "undoable" } | { readonly undo: "exempt"; readonly reason: string }`
- `isSessionCommand(value): value is SessionCommand`

The header is updated to say that typed builders, `parsePattern`, `formatCommand` and the JSON
Schema remain for #337.

### 10.5 The vocabulary

Op names follow `element-api-design.md` section 4.11.1. New ops are marked.

**Undoable:**

| Op                         | Arguments                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data.import`              | `{ source, plan?, mode?: "replace" \| "merge", layout?: "recommended" \| "keep" }`; a `setup` import (section 3.3) commits into the baseline                                                                                                                                                                                      |
| `data.apply`               | `{ mutation }`, kinds `add-nodes`, `add-edges`, `set-attributes`, `update-rows` (new: per-row values, what `updateNodes` / `updateEdges` need), `remove-nodes`, `remove-edges`, `clear`                                                                                                                                           |
| `data.expand`              | as section 4.11.1; the fetched records are captured, so redo does not fetch again                                                                                                                                                                                                                                                 |
| `algo.run`                 | as section 4.11.1, plus `applySuggestedStyles?: boolean` (section 4.7)                                                                                                                                                                                                                                                            |
| `algo.remove`              | `{ runId }`; removes the run's bound layers in the same step                                                                                                                                                                                                                                                                      |
| `algo.legacy` (new)        | `{ namespace, type, options?, applySuggestedStyles? }`: a plugin algorithm with no descriptor                                                                                                                                                                                                                                     |
| `style.patch`              | `{ action, ... }`, one `action` per styles verb that reaches it: `add` (`spec`, `at?`), `update` (`id`, `patch`), `remove` (`id`), `move` (`id`, `before`), `removeBySource` (`ids`, the layers the predicate matched when dispatched), `highlight` (`spec`, naming the run by id) and `resolveToStatic` (`id`, `channel`, `at?`) |
| `style.encode`             | `{ spec }`, naming the run by id                                                                                                                                                                                                                                                                                                  |
| `style.template`           | `{ document, templateId? }`                                                                                                                                                                                                                                                                                                       |
| `visibility.set`           | `{ filter }`                                                                                                                                                                                                                                                                                                                      |
| `visibility.window`        | `{ window }`                                                                                                                                                                                                                                                                                                                      |
| `visibility.context` (new) | `{ show: boolean }`                                                                                                                                                                                                                                                                                                               |
| `set.create` (new)         | `{ definition, name? }` from a caller; the element's doors record the minted `{ id, order, createdFrom }` too, and a caller may not send them. Redo replays the patch, never mints                                                                                                                                                |
| `set.rename` (new)         | `{ id, name }`                                                                                                                                                                                                                                                                                                                    |
| `set.redefine` (new)       | `{ id, definition }`                                                                                                                                                                                                                                                                                                              |
| `set.members` (new)        | `{ id, add?, remove? }`                                                                                                                                                                                                                                                                                                           |
| `set.remove` (new)         | `{ id }`                                                                                                                                                                                                                                                                                                                          |
| `set.restore` (new)        | `{ id }`: puts back the record a removal tombstoned                                                                                                                                                                                                                                                                               |
| `layout.scope` (new)       | `{ scope }`: what layouts run over, `"graph"` for the whole graph; written at once, so a layout still waiting carries it; never refused for a scope that resolves to nothing                                                                                                                                                      |
| `layout.set`               | as section 4.11.1, with `id: LayoutId` and `engine?: string` (the catalogue default when absent; the slice stores the engine chosen)                                                                                                                                                                                              |
| `positions.set`            | `{ entries }`                                                                                                                                                                                                                                                                                                                     |
| `positions.pin` (new)      | `{ ids, pinned: boolean }`                                                                                                                                                                                                                                                                                                        |
| `view.dimension` (new)     | `{ dimension: "2d" \| "3d" }`; replaces the 2D/3D half of `view.mode`                                                                                                                                                                                                                                                             |
| `view.save` (new)          | `{ views: readonly { name, camera }[] }`; covers `saveCameraPreset` and `importCameraPresets`                                                                                                                                                                                                                                     |
| `view.remove` (new)        | `{ names }`; there is no way to delete a saved view today                                                                                                                                                                                                                                                                         |
| `config.set`               | `{ values: ProjectConfigPatch }`; project settings only. Setting a leaf to `undefined` returns it to its default                                                                                                                                                                                                                  |
| `batch`                    | `{ steps, label? }`: a serialisable transaction                                                                                                                                                                                                                                                                                   |

**Exempt:**

| Op                     | Reason                                                                                                                                                                                                                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `view.camera`          | Camera is view state                                                                                                                                                                                                                                                                            |
| `view.immersive` (new) | `{ mode: "vr" \| "ar" \| null }`; a device session. Replaces the VR/AR half of `view.mode`. Entering from 2D is one transaction with a `view.dimension` that rolls back if entry fails (section 6.4). A failed entry no longer writes `config.graph.viewMode = "3d"` (`Graph.ts:2822`, `:2833`) |
| `layout.transport`     | In-flight computation. Where the layout comes to rest is sealed into the seal target (section 6.4)                                                                                                                                                                                              |

Section 4.11.1 lists further ops (`data.inspect`, `data.export`, `view.capture`, `report`, ...)
that do not exist in code. `COMMANDS` lists only implemented ops; each future op declares itself
when it lands.

Selection has no op: it is not a step. Session verbs that are not commands (`acceleration =`,
`setAccelerator`, `Run.cancel`, `selection.apply` / `clear`, `history.cancel`, `on`, `dispose`)
are listed as exempt doors, with reasons, in the doors test (section 12.3).

---

## 11. Migrating every mutation path

Rule: each door keeps its signature; its body dispatches the op shown.

### 11.1 Graph data

| Door                                                                                                                                                                                                                                                                                                             | Becomes                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Graph.addDataFromSource` / `loadFromFile` / `loadFromUrl` (`Graph.ts:1107`, `:1134`, `:1198`); element `dataSource` + `dataSourceConfig` (`graphty-element.ts:655`, `:677`), `loadFromUrl`, `loadFromFile`, `addDataFromSource`; `DataManager.addDataFromSource` (`DataManager.ts:1396`); `session.data.import` | `data.import`, on the queue, through the Node-safe ingest module (section 3.5); the element pair under the `element-source` coalesce key, marked `setup` when it comes from construction (section 3.3). On-load algorithms are its deferred members |
| Element `nodeData` (`:539`, whose getter now reads the graph, section 4.6), `addNode(s)`; `Graph.addNode(s)` (`Graph.ts:1272`, `:1311`); `DataManager.addNodes` (`DataManager.ts:588`); `session.data.addNodes`                                                                                                  | `data.apply { add-nodes }`                                                                                                                                                                                                                          |
| `Graph.addEdge(s)` (`Graph.ts:1342`, `:1383`), element `addEdge(s)`; `DataManager.addEdges` (`DataManager.ts:929`); `session.data.addEdges`                                                                                                                                                                      | `data.apply { add-edges }`                                                                                                                                                                                                                          |
| Element `edgeData` (`:628`); `Graph.setEdges` (`Graph.ts:1423`); `DataManager.setEdges` (`DataManager.ts:1237`)                                                                                                                                                                                                  | `batch` of `remove-edges` (all, resolved in the slot) and `add-edges`: one step                                                                                                                                                                     |
| `Graph.removeNodes` (`Graph.ts:1893`), element `removeNodes`; `DataManager.removeNodeAndIncidentEdges` (`DataManager.ts:786`); `session.data.removeNodes`                                                                                                                                                        | `data.apply { remove-nodes }`                                                                                                                                                                                                                       |
| `DataManager.removeEdge` (`DataManager.ts:1318`); new `Graph.removeEdges`, element `removeEdges`; `session.data.removeEdges`                                                                                                                                                                                     | `data.apply { remove-edges }`                                                                                                                                                                                                                       |
| `Graph.updateNodes` (`Graph.ts:1963`), element `updateNodes`; new `Graph.updateEdges`; `session.data.updateNodes` / `updateEdges`                                                                                                                                                                                | `data.apply { update-rows }`                                                                                                                                                                                                                        |
| `Graph.setData` (`Graph.ts:4734`), element `setData`                                                                                                                                                                                                                                                             | `batch` of `add-nodes` and `add-edges`: one step                                                                                                                                                                                                    |
| `clearData` (element `:702`, `Graph.ts:2202`), `DataManager.clear` (`DataManager.ts:1667`); `session.data.clear`                                                                                                                                                                                                 | `data.apply { clear }`                                                                                                                                                                                                                              |
| Double-click expansion (`NodeBehavior.ts:653`)                                                                                                                                                                                                                                                                   | `data.expand`                                                                                                                                                                                                                                       |
| Repeated-edge weight merge during ingest (`DataManager.ts:1182`), declared direction (`ingest.ts:204`, `DataManager.ts:1348`), the import report (`DataManager.ts:1050`, `:1606`)                                                                                                                                | Primitives inside the command that caused them                                                                                                                                                                                                      |

### 11.2 Runs and results

| Door                                                                                                                                                                                                                | Becomes                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `runs.start`, `runs.batch`, `session.run`, `Graph.run` (`Graph.ts:1676`), element `run`, `Graph.runAlgorithm` for catalogue algorithms, `Run.rerun`                                                                 | `algo.run` (a batch is one group). `runAlgorithm`'s `applySuggestedStyles: true` becomes the command's `applySuggestedStyles` argument, so the run and its layers are one step |
| `Graph.runAlgorithm` for descriptor-less plugins (`Graph.ts:1623`), `AlgorithmManager.runAlgorithm` / `runAlgorithmsFromTemplate` (`AlgorithmManager.ts:198`, `:249`), `Algorithm.get().run()` (`Algorithm.ts:509`) | `algo.legacy`, with the plugin given a group-tagged `Graph` facade (section 4.5), and `applySuggestedStyles` as an argument as above                                           |
| `Graph.runAlgorithmsFromTemplate` (`Graph.ts:782`), `Graph.runOnLoad`                                                                                                                                               | One group whose members are the template's runs; one step                                                                                                                      |
| The on-load runs started by the `data-added` listener (`Graph.ts:637-644`)                                                                                                                                          | Deferred members of the command that added the rows (section 4.7)                                                                                                              |
| `runs.remove` (`RunsApi.ts:548`)                                                                                                                                                                                    | `algo.remove`                                                                                                                                                                  |
| `Run.cancel`                                                                                                                                                                                                        | Exempt door                                                                                                                                                                    |
| `applySuggestedStyles` (`Graph.ts:1764`, element `:2453`)                                                                                                                                                           | One group of `style.*`                                                                                                                                                         |

### 11.3 Styles, visibility, sets

| Door                                                                                                                                                                                                                                                                                       | Becomes                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `styles.add`, `update`, `remove`, `move`, `removeBySource`, `highlight`, `resolveToStatic` (`StylesApi.ts:1432-1680`)                                                                                                                                                                      | `style.patch`. `startEdit`'s plan becomes the command's draft write; `commit` is deleted                                                                                                                                                      |
| `styles.encode`, `applyTemplate` (`:1535`, `:1690`)                                                                                                                                                                                                                                        | `style.encode`, `style.template`                                                                                                                                                                                                              |
| `seed` (`StylesApi.ts:1396`)                                                                                                                                                                                                                                                               | Writes the baseline (section 3.3); no step                                                                                                                                                                                                    |
| AI style commands (`ai/commands/StyleCommands.ts:283`, `:441`, `:467`), AI layout and dimension commands (`LayoutCommands.ts:53`, `:111`), AI algorithm commands (`AlgorithmCommands.ts:103`, `:113`), commands added through `registerCommand`                                            | Reach `ctx.tx`, which dispatches into the message's transaction (section 5.3)                                                                                                                                                                 |
| `visibility.set`, `setWindow`, `showContext =` (`VisibilityApi.ts:816-828`)                                                                                                                                                                                                                | `visibility.set`, `visibility.window`, `visibility.context`, all immediate: the edit writes the filter value at once and the mask evaluation runs on the derivation lane against the latest filter, so a superseded filter is never evaluated |
| `sets.create`, `createFrom`, `createPath`, `combine`, `rename`, `redefine`, `addMembers`, `removeMembers`, `remove`, `restore` (`session/sets/SetsApi.ts`); the deprecated `scope.save` and `scope.remove` (`ScopeApi.ts`), which forward to them; `selection.promote` (`SelectionApi.ts`) | `set.create`, `set.rename`, `set.redefine`, `set.members`, `set.remove`, `set.restore`. The materialising doors resolve their source on their own time, then mint and dispatch one `set.create` with a concrete definition in one tick        |

### 11.4 Layout, positions, dimension, views, settings

| Door                                                                                                                                                                                                                                                                                                            | Becomes                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Element `layout =`, `layoutConfig =`, `setLayout` (`graphty-element.ts:1145`, `:1171`, `:2491`); `Graph.setLayout` (`Graph.ts:1492`); `LayoutManager.setLayout` / `applyTemplateLayout`; AI `setLayout`; `session.layout.set`                                                                                   | `layout.set`. The element property keeps accepting the engine name it takes today; it maps the name to its `LayoutId` and stores the engine itself in the slice's `engine`, so undo and redo restore the engine that was chosen (d3, not the default ngraph) with its own options, and the getter returns the name it was given |
| Element `viewMode = "2d" \| "3d"`, `layout2d =`, `setViewMode` (`Graph.ts:2670`); AI `setDimension`; `session.layout.setDimension`                                                                                                                                                                              | `view.dimension`                                                                                                                                                                                                                                                                                                                |
| Element `viewMode = "vr" \| "ar"`, `enterXR`; AI `setImmersiveMode`                                                                                                                                                                                                                                             | `view.immersive` (exempt), after `view.dimension "3d"` when the scene is 2D                                                                                                                                                                                                                                                     |
| Element `pin` / `unpin` (`graphty-element.ts:2212`, `:2223`), `Node.pin` / `unpin` (`Node.ts:1044`, `:1064`), `session.positions.pin` / `unpin`                                                                                                                                                                 | `positions.pin`                                                                                                                                                                                                                                                                                                                 |
| Drag (`NodeBehavior.ts:148-267`)                                                                                                                                                                                                                                                                                | Element-opened transaction: `positions.set` and `positions.pin`                                                                                                                                                                                                                                                                 |
| `saveCameraPreset`, `importCameraPresets` (`Graph.ts:4643`, `:4714`); new `removeCameraPreset`; `session.views.save` / `remove`                                                                                                                                                                                 | `view.save`, `view.remove`                                                                                                                                                                                                                                                                                                      |
| Import-setting setters (`graphty-element.ts:777-1107`), `algorithmsOnLoad` (`:1318`), `runAlgorithmsOnLoad` (`:1535`), `background` / `setBackground`, `selectionStyle` / `setSelectionStyle`, the three project keys of `layoutBehavior` / `setLayoutBehavior` (section 3.2), `directed`; `session.config.set` | `config.set` (or the baseline, section 3.3)                                                                                                                                                                                                                                                                                     |
| Camera verbs, `loadCameraPreset`, `applyCameraView`, `zoomToFit`, `setCameraMode`, `setRunning`, `setInputEnabled`, `setXRConfig`, `acceleration`, `setAccelerator`, `pinOnDrag`, profiling, screenshots                                                                                                        | Exempt doors, unchanged                                                                                                                                                                                                                                                                                                         |
| `Graph.batchOperations`, element `batchOperations`                                                                                                                                                                                                                                                              | A transaction whose callback receives `tx` (section 5.1)                                                                                                                                                                                                                                                                        |

---

## 12. Tests that guarantee there are no gaps

Unless noted, files are in `graphty-element/test/session/history/`.

### 12.1 Strict state (`strict-state.test.ts`)

The graphty-element Vitest setup enables strict state (`src/session/project/strict.ts`) for every
session. On top of the freezing that production already does, strict state:

- checksums each typed array state retains (snapshot columns, captures, run result columns and
  their ranking caches, mask copies) once, when it is first retained, and at each dispatch
  verifies the arrays its own session's current state retains (its store's resident snapshot and
  its arrangement's captures), so a dispatch costs the same however many other sessions a test
  file has left alive and however many snapshots its history keeps; a full sweep of every retained
  array, the snapshots history keeps included, runs in `afterEach`. The lane-backed `position` and `graphty.pinned` columns are excluded,
  because a running layout writes them every frame; the captures cover coordinates. The live
  `ElementMask` pair is excluded, because it is derived and rewritten in place;
- compares `builder.mutationCount` at each commit with the count the last primitive left;
- checks the lane's pin bytes against the `pins` slice at each commit, excluding rows a drag
  currently holds (`SimulationLayoutEngine.beginDrag` sets a pin byte for the drag's duration);
- asserts that no two open groups hold the same op-log id, that a key hand-over leaves each value
  key in exactly one open patch, and that a dispatch through the plugin facade touches only keys
  that are free or its group's own (sections 4.3 and 4.5);
- asserts that two reads of `Styles.config` with no change in between return the identical object
  (section 3.2), and that no graph token or epoch value is ever issued twice (section 3.4).

Digest comparisons across exempt commands run in the vocabulary and round-trip tests, not on every
dispatch. One case per bypass row of section 4.9 asserts that the write throws, or that the next
dispatch fails naming the slice.

### 12.2 Every command declares (`vocabulary.test.ts`)

`satisfies` makes a missing declaration a compile error. At run time the test also fails when:

- an exempt entry has an empty reason;
- an op has no definition, or a definition has no `COMMANDS` entry;
- an undoable op (and each `data.apply` kind) has no round-trip fixture in `fixtures.ts`;
- a definition's `undo.kind` disagrees with `COMMANDS`;
- an exempt op changes the state digest when dispatched, including `view.immersive` from 2D and
  from 3D and `layout.transport` measured around its dispatch;
- a `config.set` names a key outside `ProjectConfig`, and each exempt layout-behaviour key of
  section 3.2 leaves the digest unchanged when set;
- a leaf of the zod `DataConfig` schema is neither a `config` slice key nor on the exempt list with
  a reason (section 10.1);
- a field of `Styles.config.graph` that encodes the dimension (`viewMode`, `twoD`) can be written
  by anything other than the `layout` hook, or disagrees with `layout.dimension` after any command
  (section 3.2).

### 12.3 Every door dispatches (`doors.test.ts`, door list `doors.ts`)

The door list lives in `graphty-element/src/session/commands/doors.ts`, a source module that no
entry point exports, so the element's build and the app's lint rule (section 12.8) can read it
without reaching into a test directory. It lists every door from the four inventories, each with
one of three expectations: the op it dispatches, `exempt` with a reason, or `knownGap` naming an
issue. The test calls each door with a spy on the dispatcher. It fails when a door dispatches
something other than its expectation, and when a `knownGap` door now dispatches, so the gap list
can only shrink. Work lands in stages that each pass on their own, with the unported doors on the
gap list keeping today's behaviour; the last stage empties it.

The test also covers:

- every element property door, whatever it dispatches, with a getter-after-undo assertion. The
  list is built from every property row of the door list, not written by hand and not from a list
  of ops, so all twenty-one properties of section 4.6, including `nodeData` and `edgeData`, and any
  added later are covered;
- `runAlgorithm(ns, type, { applySuggestedStyles: true })`, for a catalogue algorithm and for a
  descriptor-less plugin, yields exactly one step, and one undo removes the run and its layers
  together (section 4.7);
- with `algorithmsOnLoad` set, `addNodes` yields exactly one step with the on-load runs as its
  deferred members, and a replacing import starts the on-load set once; undoing a removal starts no
  run and leaves the layout at rest and the camera where it was (section 4.7);
- `Graph.runAlgorithmsFromTemplate` yields one step;
- a descriptor-less plugin whose `run(g)` calls `g.addNodes` and `g.styles.add` yields exactly
  one step (section 4.5);
- one assistant message that sets a layout, runs an algorithm and adds a style yields one step,
  and a message that throws after all three rolls all three back (section 5.3);
- assigning `dataSource` and then `dataSourceConfig` in one tick yields one load and one step, and
  so does `layout` then `layoutConfig` (section 4.4);
- a door called on the element while its `batchOperations` callback is open logs the warning of
  section 5.1.

A type test (`test/types/execute.test-d.ts`) asserts that `execute({ op: "algo.run", ... })` yields
a value with `.cancel` and `.id`, and that no entry of `CommandOutcomeMap` is a promise of a
thenable.

### 12.4 Round trip per command (`round-trip.test.ts`)

For each fixture: take the state digest and the picture digest, run the command, undo, compare
both digests with the before-values, redo, compare with the after-values.

- The state digest (`digest.ts`) is the snapshot fingerprint (node ids in row order), the edge ids
  in row order, a hash of every registered builder column (so a column a remove primitive did not
  record, such as the seed column, fails the round trip), a hash of the records, the pins, a hash
  of the arrangement of the current history position, and a stable JSON of the value slices.
- The picture digest is the paint columns (`session.paint`), the visibility masks, and the lane
  once at rest.
- A redone `algo.run` returns the identical `RunResult` object, and the executor spy's call count
  does not change. The `Run` handle held before the undo is the handle `runs.get(id)` returns
  after the redo.

Fixtures written for specific failure modes:

- **Removal order.** Remove nodes from the middle of the rows, undo: node and edge id order equal
  the originals, and so does the fingerprint.
- **Removal under changed settings.** Remove edges, change `repeatedEdges` and `edgeWeightPath`
  through `config.set`, undo only the removal: the edge set and weights equal the originals.
- **Filter across a data step.** Set a filter, remove nodes, undo both: the masks equal a fresh
  evaluation of the original filter on the original graph.
- **Drag.** With the layout running at drag start, a drag moves the node through pointer moves
  before `positions.set` is dispatched; undo puts the dragged node, and every other unpinned node,
  back where it was at drag start.
- **Undo mid-drag.** Press Ctrl+Z between two pointer moves: the lane equals the drag-start
  capture, no step is recorded, and the drop does nothing.
- **Undo then reheat.** Undo a layout step, then drag another node and call `setRunning(true)`;
  the restored rows of unmoved pinned nodes survive, and no node snaps back to its pre-undo place.
- **No reheat on refreeze.** With a simulation layout, add nodes, let it settle, undo the add,
  advance N frames: the lane still equals the restored capture, and the capture bytes of the step
  below are unchanged.
- **Datasets do not share coordinates.** Import A, import B with the same ids, edit a style before
  the layout settles, undo the style: no row takes A's coordinates.
- **Direct lane write.** Write the lane the way a GPU readback does, then reach a rest point: the
  write is in the sealed capture.
- **Stale readback.** A deferred fake layout accelerator whose readback lands after an undo; the
  lane keeps the restored capture.
- **Late run value.** A deferred fake algorithm accelerator that resolves after `cancel()`; no
  entry and no layer is written.
- **Pins and ids.** Pin `"1"`, clear, import a graph that reuses `"1"`: nothing is pinned.
- **Replace undo.** Undo a replacing import; the store's column set equals the original's and the
  lane matches the capture.
- **Import report.** Undo a merge import and an `add-edges`; `data.lastImport()` returns the
  earlier report.
- **Legacy plugin.** A plugin that writes nested `algorithmResults` on nodes and edges and a
  `graphResults` value; one step, and undo removes all three.
- **XR entry fails.** Enter VR from 2D with XR unavailable: no step is recorded and the scene is
  still 2D.
- **Removed rows keep their seeds.** Import a file with coordinates, remove nodes from the middle,
  undo with no capture covering them: they return at the file's coordinates.
- **Alternate engine.** `layout.set("force", { engine: "d3", options })`, change the layout, undo:
  the engine is d3 and the options are identical.
- **Dimension.** Switch 3D to 2D and undo, and 2D to 3D and undo: `GraphContext.is2D`, the
  engine's dimension, `scene.metadata.twoD` and `Styles.config.graph.twoD` all agree with the
  slice after each.
- **Rest points under an open group.** A transaction runs `tx.layout.set`, the layout settles
  before `fn` returns, the transaction commits, undo: the lane equals the pre-transaction capture.
  The same with a layout that settles between the chunks of a replacing import (the previous
  dataset's lane is restored exactly), with an app-style load transaction, and with a drag held
  still until the layout settles.
- **Cancelled work restores the arrangement.** Undo cancels a chunked import mid-load, and a
  `layout.set` mid-pre-steps: the lane equals the capture taken before the cancelled work, and
  the step below keeps its capture bytes.
- **Pre-steps in flight.** Undo, and separately a second `layout.set`, while GPU pre-steps are in
  flight: nothing the first command computed is published.
- **Snapshot read during undo.** A `project:changed` listener reads `session.data.snapshot` during
  an undo of an add; after N frames the lane equals the restored capture and the top step's capture
  bytes are unchanged.
- **Assistant abort.** Undo mid-message: no further tool runs and `CommandContext.abortSignal`
  fired.
- **Background.** Colour, then skybox, then colour, undo twice and redo twice: the scene holds at
  most one dome, and none while the background is a colour.
- **Keys.** In `graphty-element/test/browser/history-keys.test.ts`, one Mod+Z on a focused canvas
  moves `history.position` by exactly one, with a window-level listener that honours
  `defaultPrevented` attached.

### 12.5 Random sequences (`random-sequences.test.ts`)

fast-check (already a devDependency, `graphty-element/package.json:192`) model-based
`fc.commands`, starting either from a baseline built by setup writes (section 3.3), from a
baseline whose graph came from a `setup` import (markup or construction-time properties), from a
state whose first load was dispatched after mount (a step), from the state after
`history.clear()`, or from a session whose first import failed, interleave:

- fixture commands, including runs through a fake accelerator whose completion the model controls;
- transactions, including ones that throw, ones that are aborted while `fn` is still dispatching,
  ones with deferred members, ones whose `fn` dispatches through `tx` without awaiting, and ones
  whose `fn` awaits a door outside `tx` on a key `tx` wrote (it must settle, never hang);
- a style edit dispatched during a long fake run; after an undo cancels the run, the style edit
  survives;
- redo while an older fake run is pending: the run survives;
- immediate doors dispatched while a queued writer is running;
- coalesced updates, queued and recorded;
- layout transport `play`, rest points, a layout that is not running, an undo immediately after
  an add, and a settle forced between an undo and its derivation;
- a run that commits after a data edit (the stale path);
- undo, redo and `restoreTo`, including repeated undo without awaiting and an undo called from
  inside a `history:changed` listener;
- a transaction opened, then a reader graph step recorded, then a graph change through `tx`, then
  undo, then the transaction committing or rolling back: undo-all equals the baseline, including
  row order (section 6.1, rule 0);
- dependent data edits queued behind each other (add nodes, then add edges between them), with
  undo or `history.cancel` in the middle of the queue: no dependent item executes after the item
  it depends on was cancelled;
- `restoreTo` forward into the redo tail while an older run is still running: the run survives;
- more `positions.set` steps than `limitSteps` with coalescing off, then undo-all: the lane equals
  the baseline with the evicted steps' patches applied (section 7).

The model follows the committed order it observes (section 4.1), not the order it dispatched. At
every history position the state digest equals the digest last sealed for that position.
The model's arrangement follows the two rules of section 6.4: undoing step k restores its
before-capture when it has one and `A(k-1)` otherwise, and redoing it restores `A(k)`.
Undo-all equals the baseline; redo-all equals the end. Recording after an undo empties the redo
tail. A low `limitBytes` and a low `limitSteps` exercise eviction, including an undo of the oldest
surviving step that moved nodes, whose lane must equal its before-arrangement.

### 12.6 Scale

The element refuses a graph larger than its render ceiling (`DEFAULT_LIMITS.renderCeiling`,
50,000 nodes and 100,000 edges today) with `E_TOO_LARGE`, so no test loads a million nodes into a
session. The scale tests run at that ceiling, and the million-node claims are checked without a
session: in Node, a snapshot and a run result of a million nodes and five million edges are built,
their byte estimates checked against their storage, and a history fed steps of those sizes is
checked to stay inside the 256 MiB default. The per-element retained sizes asserted at the ceiling
give the figures of section 7 at a million nodes by multiplication.

- **Node (`scale.test.ts`, with the time budgets in `scale.bench.test.ts`).** Runs at the render
  ceiling, less room for the steps to add nodes. It imports, runs 50 mixed steps (including adding nodes one at a time while
  the layout runs, and calling `positions.set` for one node at a time), and asserts the retained
  sizes of section 7, `history.bytes <= limitBytes` after eviction, the dispatch overhead of one
  command over a million ids (a list of ids, not a loaded graph), and time budgets for undoing an attribute edit, undoing a replacing
  import at the state layer, and `restoreTo(null)`. It undoes 30 mid-row removals without
  awaiting, asserts that the synchronous part of each call stays within a budget proportional to
  its patch, then reads the snapshot once and asserts that one rebuild ran (section 3.4). It also
  measures the cost of deep-freezing records at import.
- **Browser (`graphty-element/test/browser/history-scale.bench.test.ts`).** The Node test has no
  renderer, Babylon scene or layout engine, and the dominant costs of undo at scale are there. This
  test drives a real `Graph` at the render ceiling and times, including the derivation pass,
  undoing a replacing import, undoing the removal of 1000 nodes, undoing a drag at rest, and
  `restoreTo(null)`, against budgets. Tearing the whole graph down -- a replacing import, a clear,
  or undoing the load -- takes about 20 s at the ceiling, because each node's mesh dispose costs
  the size of the scene. That is reported, not budgeted, until
  https://github.com/graphty-org/graphty-monorepo/issues/543 is fixed.

Timing assertions in both run with strict state off; strict overhead is reported separately.

### 12.7 Pictures

- `graphty-element/stories/Undo.stories.ts`: an untouched baseline story, and act-then-undo
  stories for an import, a run with auto-applied styling, a style edit, a filter, a pin and a
  drag, a layout switch, a 2D to 3D switch and a 3D to 2D switch, a colour to skybox background
  change, and a saved view. Each play function acts and then awaits
  `session.undo()`. Chromatic locks each snapshot; the new snapshots need the owner's approval.
- Chromatic compares a story with its own previous snapshot, not with another story. Equality
  with the untouched picture is asserted by `graphty-element/test/browser/history-picture.test.ts`,
  which compares canvas pixels before the action and after the undo.

### 12.8 Lint rule in the app

A small type-aware rule, `graphty/eslint-rules/no-element-mutation.js`, built on
typescript-eslint's type checker, which the app's lint already runs with type information. ESLint's
built-in `no-restricted-syntax` was rejected: it sees only syntax, so it can match a call by its
property name but cannot tell whether the receiver is the element or a `Graph`. It would either
flag an unrelated `pin()` or miss a door called through a renamed variable.

The rule reads its door names from `graphty-element/build/doors.json`, which the element's build
writes from `src/session/commands/doors.ts` (section 12.3), so the rule and the doors test use one
list and the app never imports a test file. The file is written outside `dist/` on purpose:
`dist/` is published (`package.json` `files`), and a door list with its known gaps must not become
an undeclared public file third parties start depending on. `build/` is not in `files` and is
ignored by git. Nx already builds graphty-element before the app is
linted. The rule asks the type checker where each accessed member is declared. It reports, when
that is a renderer-side element type (`GraphtyElement`, `Graph`, `Node`, a manager) or an app-local
copy of one (next paragraph), so that `session.*` and `tx.*` are never reported:

- any read of a non-exempt door method not reached through `session` or `tx` (`addNode(s)`,
  `addEdge(s)`, `removeNodes`, `removeEdges`, `updateNodes`, `setData`, `applySuggestedStyles`,
  `saveCameraPreset`, `importCameraPresets`, `clearData`, `loadFromFile`, `loadFromUrl`,
  `addDataFromSource`, `runAlgorithm`, `setLayout`, `setViewMode`, ...): called, optionally
  chained, reached with a literal computed key (`element["addNodes"]`), passed on, `.call`ed,
  `.apply`d, bound, or destructured (`const { addNodes } = element`);
- `getDataManager`, `getStyles`, `getLayoutManager`, `getUpdateManager`, and any member access of
  `dataManager`, `layoutManager`, `operationQueue`, `layoutEngine`, and of the element's internal
  `graph`;
- an assignment to an element property that dispatches (`dataSource`, `dataSourceConfig`,
  `nodeData`, `edgeData`, `layout`, `layoutConfig`, `viewMode`, `layoutBehavior`, `background`,
  `selectionStyle`, `algorithmsOnLoad`, `runAlgorithmsOnLoad`, `directed`, the id-path setters);
- a local type or interface named after an element type, with or without an `Element` prefix or
  a `Like` or `Type` suffix (`ElementGraph`, `ElementNodeLike`, `GraphtyElementType`). The members
  of such a copy count as the element's for the checks above, so a call made through a duck type
  is reported where it is made.

Camera, screenshot, XR configuration and acceleration are not on the list, because they are
exempt. `GraphtyHandle.graph` is removed (section 13), and the app reaches the AI assistant
through the element's own `enableAiControl`, `aiCommand`, `onAiStatusChange`,
`cancelAiCommand` and `disableAiControl`, so the app has no `Graph` receiver at all outside the
element.

Attributes on the `<graphty-element>` tag and `setAttribute` are not checked. The element's
`layoutBehavior` carries view preferences (label declutter) and project settings (`preSteps`,
`stepMultiplier`, `minDelta`) in one property, so a check by name would report the app's
view-only declutter setting. A project key written that way is still recorded as a step inside
the element; only the grouping of one gesture into one step is at stake.

---

## 13. The app changes

Paths under `graphty/src`.

1. **Delete the store.** `components/shell/topbar/undoStore.ts` and
   `topbar/__tests__/undoStore.test.ts`; `UNDO_DEPTH` (`components/shell/constants.ts:816`) and its
   assertion. The confirmation helpers in that file (`needsConfirmation`,
   `isConfirmedIrreversibleAction`, `CONFIRMED_IRREVERSIBLE_ACTIONS`) have no callers outside it
   and its tests, so nothing loses a confirmation.
2. **Add `components/shell/topbar/useSessionHistory.ts`**: the documented
   `useSyncExternalStore` pattern over `history:changed` and `session.history.version`.
   `AppShell.tsx` feeds `TopBar`, `UndoSplitButton` and `HistoryPopover`
   (`AppShell.tsx:5127-5157`) from it; `onUndo` / `onRedo` call `session.undo()` / `redo()`;
   `onRestore` calls `history.restoreTo`. The Undo button's tooltip reads `history.nextUndo`. The
   rows are retyped over `HistoryStep`. The row's panel and its XR grouping (from
   `provenance.xr`) are presentation over the step, kept in `topbar/historyRows.ts`. The Data
   panel's Cleaning steps view (steps whose `slices` include `"graph"`) is deferred until
   something draws it: nothing in the app shows that view today, so the filter would have no
   reader. It goes in `historyRows.ts` when the view is built.
3. **Remove the manual pushes** at `AppShell.tsx:2896` and `:3215`.
4. **Keys.** The bindings at `AppShell.tsx:3654` / `:3660` call `session.undo()` / `redo()`. While
   the canvas has focus the element handles the keys and marks them `preventDefault`, and
   `useShellKeyBindings.ts:155` skips such events, so one press undoes once.
5. **A load is one transaction, and the load's decisions move into it.** Today the recommended
   layout and the top-degree label layer are not decided in `handleLoad`: a separate effect
   (`AppShell.tsx:3274-3355`) fires after `DATA_LOADED`, calls `recommendLayout`, awaits the degree
   run and only then adds the label layer, whose selector needs the run's id. Moved into a
   transaction as it stands, the label layer could only be dispatched after `fn` had settled: through
   `tx` it would reject with `E_TRANSACTION_CLOSED`, and through `session` it would be its own step,
   so the first Ctrl+Z after a load would remove the labels instead of the load. So:
    - `handleLoad` (`AppShell.tsx:2336`) and `loadSample` (`:2474`) wrap the style sweep and the
      import in `session.transaction(fileName, async (tx) => ...)`, through the typed verbs on `tx`.
      The import is `tx.data.import(source, { mode: "replace", layout: "recommended" })`: the
      element applies `recommendLayout` inside the import's own group (section 10.1,
      `ImportOptions.layout`), because choosing an arrangement for a freshly loaded graph is
      something every consumer that loads a file needs, not app chrome. The app's own
      `recommendLayout` call and its `setLayoutType` mirror are deleted.
    - `tx.data.import` resolves after the last chunk (section 5.1), so `fn` then reads the node
      count, starts the degree pass with `tx.run({ ..., as: degreeRunId })` (the run id is the
      caller's to choose, `session/planning.ts:63`), and adds the label layer with
      `tx.styles.add(topDegreeLabelLayer({ degreeRunId, labelCount }))`, both before `fn` settles.
      The layer selects nothing until the run's results exist, and the `runs` hook repaints it when
      they land (section 9.2). The degree pass and the optional Find groups are not awaited, so they
      are deferred members: the load is recorded as soon as the file is on screen, and the reader's
      own edits made while the degree pass runs are their own steps. The effect at `:3274-3355` is
      deleted; the label shortfall sentence is read on the degree run's `run:changed` `"end"`.
    - "Close dataset" (`:3743`) is one transaction of the clear and the style sweep.
    - **A failed load does not clear.** The failure branch at `AppShell.tsx:1980-1985` calls
      `graphtyRef.current?.clearData()` after the load failed. Under this design the transaction has
      already rolled back to the previous dataset by then, so that call would record a spurious
      "Cleared" step that wipes the dataset the rollback just restored. The call is deleted; the
      failure branch resets only the app's own React state.
    - Two AppShell tests: a load followed by one Undo (after the degree pass has finished) leaves
      no trace of the load, including the labels and the layout it chose; and a failed load leaves
      `history.steps` unchanged and the previous dataset on screen.
6. **Every mutation goes through session commands.**
    - Loads call `session.data.import`; clears call `session.data.clear`. The dead
      `graph.dataManager` path (`components/Graphty.tsx:422-428`) is deleted.
    - Layout and view mode stop being React props on `<Graphty>` (`Graphty.tsx:443-462`);
      `handleApplyLayout` and the 2D/3D control call `session.layout.set` and
      `session.layout.setDimension`. The layout "Re-run" control calls `session.layout.set` with the
      current id and options, so a re-run is its own step.
    - Pin and unpin call `session.positions.pin` / `unpin`; the pinned set is read from
      `session.positions.pinned`.
    - `RunAlgorithmModal.tsx` uses `algo.run` with `applySuggestedStyles` as an argument, so a
      run and its suggested layers are one step, and stops reading `graph.dataManager.nodes`
      (`:56-58`).
    - "Remove result" (`AppShell.tsx:4275`) dispatches `algo.remove`, which fixes the bug where
      the run stayed behind after its layers were removed.
    - `selectNode` / `deselectNode` (`graphCommands.ts`) stay on the element's doors. Selection is
      not a step, both doors write through the same selection model `session.selection` does, and
      `selectNode` also retries the other spelling of an integer id (a GML file's `1` against a
      row's `"1"`), which `session.selection.apply` does not. They are the supported path for
      selecting one node.
    - `GraphtyHandle` drops `graph`. Every camera and XR-configuration call the app made through it
      moves to the element door that already exists for it (section 10.2).
7. **Mirrors are re-read, not held.** `layers` and `legendChannels` are re-read on
   `style:changed`; `layoutType` / `layoutConfig`, `viewMode` and `pinnedNodes`
   (`AppShell.tsx:1102-1420`), whose slices have no per-domain event, are re-read on
   `project:changed` when its `slices` name `layout` or `pins` (section 9.3). Both fire on undo,
   redo and rollback with a `cause`, exactly as a third-party consumer would see them.
   `activeResult` and `degreePass` hold run ids and handle the `"removed"` phase.
8. **The spinner follows the element.** The metric spinner ends on `run:changed` cancellation or
   removal, because undo can cancel or remove the run.
9. `test/fakeSession.ts` gains `history`, `canUndo`, `canRedo`, `undo`, `redo`, `execute` and
   `transaction`. The AppShell tests at `:1463-1490`, `:2412-2431` and `:3607-3619` assert against
   `session.history`.
10. Close #197.

The app used to sniff file formats itself (`components/Graphty.tsx:108-186`), which is element
work in the app. That moved into the element with this work: `DataSourceInput.type` is optional
and detected from the file name, the URL or the content, `DataSourceInput.name` defaults to the
file name or the URL's last part, and `session.data.source()` reads back what was loaded (section
10.1). The app passes neither `type` nor `name` unless the reader chose one.

---

## 14. Risks

| Risk                                                                                                                                                                                                                                                            | Mitigation                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DataManager` stops owning ingest, which moves to the Node-safe `session/project/ingest.ts` (section 3.5), and becomes a derivation of the `graph` slice, and loads move onto the queue. It is the largest change and touches the load path every consumer uses | The doors ratchet lets it land in stages, each green; the round-trip and random-sequence tests cover every primitive; the existing browser tests exercise loading unchanged                                                                                                                           |
| Deep-freezing a million records at import costs time                                                                                                                                                                                                            | Measured by the scale test. If it is too slow, bulk records are deep-frozen lazily instead: the `node.data` / `edge.data` getter and `session.data.node()` freeze a record before first handing it out, so no record is ever reachable in a writable state while history holds it. That is reversible |
| Columnar `RunResult` changes record identity from `node(id)`                                                                                                                                                                                                    | Records are compared by value in every existing caller found; the change is listed in the migration notes                                                                                                                                                                                             |
| Freezing `node.data` and narrowing `session.positions` break third-party code that writes through them                                                                                                                                                          | An owner decision (section 15). Plugin algorithms keep working through `algo.legacy`. A plugin that keeps a reference to a record and writes to it later throws, and the error names the command to use                                                                                               |
| A reader's style edit made while an assistant message is open takes over the style stack, so undoing the edit also removes the message's earlier style edits, and a later throw in the message does not roll them back (section 4.3)                            | Documented beside `transaction` and in the guide. It needs two concurrent writers of the style stack, and the result is still consistent: undo-all returns to the baseline                                                                                                                            |
| Undo aborts an open transaction that holds keys the undone step touches, even one opened before that step (section 6.1, rule 0), so a press can cancel an assistant message the reader did not mean to cancel                                                   | Only when the message and the reader's step touch the same graph ids or rows; `nextUndo` names the message before the press, and the message's own step was never recorded, so nothing recorded is lost                                                                                               |
| A dispatch outside `tx` that needs a node id an open transaction holds fails with `E_HELD_BY_TRANSACTION`                                                                                                                                                       | Only op-log ids are held, only until the transaction seals, and the error names the `tx` to use. Waiting instead would deadlock a `fn` that awaits such a dispatch                                                                                                                                    |
| Coordinates are recorded per rest point, so undoing one of several steps made while the layout ran restores the coordinates of the last rest point below it                                                                                                     | Documented in the guide. Deliberate moves (drag, layout and dimension changes, replacing imports) and multi-frame graph writers keep their own before-arrangement, and `positions.set` records its prior rows                                                                                         |
| Structural graph inverses are applied lazily (section 3.4), so the first read of the snapshot after an undo pays the rebuild                                                                                                                                    | That read happens in the derivation pass at the latest, which already pays one freeze; a held Ctrl+Z pays it once instead of per press                                                                                                                                                                |
| A capture's shared node-id list is rewritten by graph-format                                                                                                                                                                                                    | The capture shares the list only where graph-format guarantees it is never rewritten; otherwise it copies it                                                                                                                                                                                          |
| The 1000 ms coalescing window merges two deliberate edits of the same keys on the same layer                                                                                                                                                                    | Acceptable: the merged step still undoes to the value before both                                                                                                                                                                                                                                     |
| New stories add Chromatic snapshots                                                                                                                                                                                                                             | They wait for the owner's approval; nothing is auto-accepted                                                                                                                                                                                                                                          |
| `graph-format` gains `seal()` and `E_FROZEN`                                                                                                                                                                                                                    | Additive to a published package. Code that wrote to a resident snapshot's tables after the store sealed it now throws; the only such writer in the repository is `GraphStore`, which writes before sealing                                                                                            |

---

## 15. Decisions for the owner

These are one-way doors: published names and shapes, or breaking changes.

### 15.1 Names and shapes

1. **The published API of section 10**: `undo`, `redo`, `canUndo`, `canRedo`, `history`,
   `transaction` with its `(tx, signal)` callback, `execute` and `CommandOutcome`;
   `session.layout` (`SessionLayout`, `id` typed as `LayoutId`), `session.positions`
   (`SessionPositions` with `pinned`, and `ReadonlyElementPositions`), `session.views`
   (`SessionViews`), the `session.data` write verbs, `session.config` with `ProjectConfig` and
   `set`; `history.limitSteps`; the error codes `E_HELD_BY_TRANSACTION` and `E_TRANSACTION_CLOSED`,
   and the `"history"` value of `GraphtyErrorSource` that both carry;
   `tx` on the assistant `CommandContext`;
   `HistoryStep`, `SessionHistory` (with `version`, `nextUndo`, `cancel`), `PendingStep` (with
   `id`), `HistoryOutcome`, `HistoryCause`, `ProjectSlice`, `TransactionOptions`,
   `TransactionScope`; the `history:changed` and `project:changed` events; `cause` on
   `StyleChange`, `VisibilityChange` and `RunChange`; `generation` on `RunChange`; `RunPhase`
   `"removed"` / `"restored"` and `RunStatus` `"removed"`; `SelectionCause` `"history"`;
   `RunResult.byteSize`; the `graphty-history-change` DOM event and the `history-keys` attribute;
   `./commands`' `COMMANDS`, `CommandMeta` and `isSessionCommand`, under the single union name
   `SessionCommand`; graph-format's `seal()` and `E_FROZEN`.
   Also: `CommandOutcomeMap` (no entry a promise of a thenable); `SessionLayout.engine` stored in
   the slice and the `{ engine?, options? }` argument of `layout.set`; `ProjectConfig` in the
   existing `SessionDataConfig` shape and `ProjectConfigPatch`; `DataSourceInput` (with `type`
   optional, detected when absent, `name`, and `config` typed as a plain record rather than
   `BaseDataSourceConfig & Record`), `DataSourceDescriptor` and `session.data.source()`; `ImportOptions`
   (with `mode` and `layout: "recommended"`), `NodeRecordInput`, `EdgeRecordInput`,
   `RowUpdate`, `PositionEntry`; `applySuggestedStyles` on `algo.run` and `algo.legacy`;
   `cause` on the element's `data-added`, `elements-removed` and `data-loaded` events;
   `HistoryOutcome` and `nextUndo` listing every cancelled item, and `history.cancel` returning
   them; and on the element and `Graph`: `removeEdges`, `updateEdges`, `removeCameraPreset` and
   the `historyKeys` property.
2. **The op names**, which follow `element-api-design.md` section 4.11.1, plus the new ops marked
   in section 10.5. The one departure is splitting `view.mode` into `view.dimension` (undoable)
   and `view.immersive` (exempt), because one op cannot be both.
3. **The transaction signature.** Membership by a `tx` handle is chosen now because changing
   from time-based to origin-based membership later would change what every existing transaction
   records.

### 15.2 Behaviour and type-level breaks

Each with the migration a consumer makes:

| Break                                                                                                                                                                                                                                                                                                              | Migration                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node.data` / `edge.data` are frozen                                                                                                                                                                                                                                                                               | Use `updateNodes` / `session.data.updateNodes`; plugin algorithms need no change                                                                                                                        |
| `session.positions` loses `write`, `setPinned`, `fillUnplaced`, `grow`, `remap`, `view`, `pinnedView`                                                                                                                                                                                                              | Use `session.positions.set` / `pin` / `unpin` / `pinned`; read through the read-only methods                                                                                                            |
| `DataManager` maps, `Graph.styles.config`, `Graph.operationQueue`, `LayoutManager.layoutEngine` become read-only or private                                                                                                                                                                                        | Use the session's read surfaces and doors                                                                                                                                                               |
| `batchOperations` on `Graph` and the element no longer holds the queue, groups only calls made through its `tx` argument, and a throw rolls back instead of keeping partial changes                                                                                                                                | Call `tx.data.addNodes`, `tx.layout.set` and so on instead of the element's doors; a door called on the element during the callback logs a warning. Catch and redo any part that should survive a throw |
| The element's `dataSource` / `dataSourceConfig` getters report a source descriptor, never an inline `data` string or a `File`                                                                                                                                                                                      | Keep your own reference to the payload if you need it again                                                                                                                                             |
| `layoutBehavior` settings `pinOnDrag`, `declutter`, `maxInFlight`, `iterationsPerStep` and `zoomStepInterval` are not undoable                                                                                                                                                                                     | None needed; they are preferences, as before                                                                                                                                                            |
| Per-domain events (`style:changed`, `visibility:changed`, ...) fire after the derivation pass, and `painted` may cover several edits drawn in one pass                                                                                                                                                             | Read state on the event as before; do not assume one repaint per edit                                                                                                                                   |
| Assistant commands registered with `registerCommand` join the message's step only through `ctx.tx`                                                                                                                                                                                                                 | Use `ctx.tx` instead of `ctx.graph` for writes                                                                                                                                                          |
| Ctrl+Z / Ctrl+Y on a focused canvas now undo and redo                                                                                                                                                                                                                                                              | Set `history-keys="false"`, or skip events with `defaultPrevented`                                                                                                                                      |
| `StyleChange`, `VisibilityChange`, `RunChange`, `RunPhase`, `RunStatus`, `SelectionCause`, `history:changed` reasons widen                                                                                                                                                                                         | Add the new cases to exhaustive switches                                                                                                                                                                |
| `RunResult.node(id)` returns an equal record, not the identical object, across calls                                                                                                                                                                                                                               | Compare by value                                                                                                                                                                                        |
| Configuration set before the first data load is baseline, not undoable                                                                                                                                                                                                                                             | None needed; documented                                                                                                                                                                                 |
| `SessionConfig` reports the live settings, not the ones the session was built with                                                                                                                                                                                                                                 | Read it when you need the current value                                                                                                                                                                 |
| `CreateGraphSessionOptions` loses `store`, `records` and the function form of `config.data` (section 3.6)                                                                                                                                                                                                          | Hand data in through `session.data.import` / `addNodes` / `addEdges` and settings through `session.config.set`; the session is then the only writer, which is what makes it undoable                    |
| `SessionGraphStore.positions` becomes read-only, and the `position` / `graphty.pinned` columns of a snapshot handed to a consumer are copies taken at the call                                                                                                                                                     | Read through `ReadonlyElementPositions`, or take a new snapshot to see coordinates that moved; write through `session.positions.set` / `pin`                                                            |
| The element's `nodeData` / `edgeData` getters return the graph's records in row order, not the last array assigned                                                                                                                                                                                                 | Keep your own reference to the array you assigned if you need it; the setters are unchanged                                                                                                             |
| The element's `layout` getter returns the engine name stored in the layout slice; after an undo it reports the restored engine                                                                                                                                                                                     | None for a host that reads what it wrote; a two-way binding sees undo as a change, which is the point                                                                                                   |
| The `Run` returned by a style or visibility verb settles when the repaint covering the edit finishes; `cancel()` or an abort after the call does not revert the edit                                                                                                                                               | Use `session.undo()` to take an edit back; an already-aborted signal still prevents the write                                                                                                           |
| Adding nodes or edges with `algorithmsOnLoad` set starts the on-load runs once per command, not once per `data-added` event, and undo and redo fire `data-added` / `elements-removed` with a `cause` without starting any work                                                                                     | None for most consumers; a listener that started work on `data-added` should check `cause`                                                                                                              |
| `LayoutEngine.nodePositions` and `DataManager.positions` hand out `ReadonlyElementPositions`; `LayoutEngine`'s `addNode`, `addEdge`, `addNodes`, `addEdges`, `removeNode`, `removeEdge` and `attachPositions` are protected                                                                                        | Place and pin through `session.positions`; change the graph through `session.data`. A custom engine still implements the membership methods, and the element calls them                                 |
| A settings getter (`nodeIdPath`, `repeatedEdges`, `edgeWeightPath`, `directed`, `runAlgorithmsOnLoad`, `background`, `selectionStyle`, `algorithmsOnLoad`, ...) returns the value in effect when none was set, instead of `undefined`; `layoutBehavior` always carries `preSteps`, `stepMultiplier` and `minDelta` | Compare with the default instead of `undefined`; assigning a default reads back and records no step                                                                                                     |

### 15.2a Sets under undo: decided

Sets (pull request #540) merged first, so undo carries the integration of
design/sets/undo-integration.md. Its five questions are decided, as recommended, because none of
the names had been released (the owner confirmed that unpublished names are not one-way doors):

1. `scope.save` and `scope.remove` do not survive as op names. The deprecated `scope.save` and
   `scope.remove` doors forward to `session.sets`, which dispatch `set.create` and `set.remove`, so
   history shows one vocabulary.
2. A caller may not supply `id`, `order` or `createdFrom` in `set.create`; `session.execute`
   refuses them with `E_BAD_COMMAND`. The element's own doors mint them and the recorded command
   carries them.
3. `ProjectSlice` spells the slice `"sets"`.
4. `SetChange.cause` gains `"undo"` and `"redo"`; a restore across several steps is told as the
   direction it moved, and a rollback tells nothing.
5. The op names are `set.create`, `set.rename`, `set.redefine`, `set.members` and `set.remove`,
   plus `set.restore` for the published `sets.restore`, with the same undo semantics.

Two more names follow from the port and are decided the same way: `layout.scope`, the op
`Graph.setLayoutScope` and the element's `layoutScope` property dispatch (a layout chosen with a
scope in `setLayout` records it in `layout.set`), and `scope` on the `layout` slice's
`LayoutChoice`. And one behaviour is settled in undo's favour: a re-run keeps the result it
replaces until it publishes a new one, because the result is project state in the `runs` slice.
The sets branch had cleared the result while a re-run was queued; its execution token and the
input tick now move only when the new result is published.

### 15.3 Release

**Recommendation: ship all of it as graphty-element 3.0.0, one major release.**

Splitting it -- undo, history and the event widenings in a 2.4.0 minor, and the closures (frozen
records, narrowed positions, private fields, new `batchOperations`) in 3.0.0 -- does not hold:

- Most of what it put in the minor is itself a break in the table above: widened output unions
  (`RunPhase`, `RunStatus`, `SelectionCause`, the change events) break exhaustive switches,
  `RunResult.node(id)` stops returning the identical object, and Ctrl+Z on a focused canvas starts
  undoing, which a host with its own window-level binding that ignores `defaultPrevented` sees as
  two undos per press.
- It is not safe. History holds records, removed records and whole records maps by reference
  (section 3.4). A 2.4.0 that left `node.data` writable in production would let ordinary consumer
  code (`node.data.x = 1`, legal until now) change the live record and the copy history holds at
  the same moment, so undo would restore an already-mutated object. A development warning cannot
  catch a write to a plain object without freezing it or wrapping it in a proxy, and a proxy on
  every record read in production costs more than freezing.
- Keeping additive alternatives for each break (a new `runs:changed` event beside `RunPhase`,
  `history-keys` off by default, identity-preserving results) would publish two ways to do each
  thing, and the second would be removed in 3.0.0 anyway.

So 3.0.0 ships undo, history, transactions, `execute`, the typed session verbs, the dispatcher,
columnar results, the event widenings, `history-keys` on by default, frozen records in production,
the narrowed `session.positions`, the private manager fields and the new `batchOperations`, with
the migration guide of section 10.3. The graphty app adopts it in the same change and runs with
strict state in its own tests.

If the owner prefers a minor release, the alternative is explicit: the owner accepts the breaks of
section 15.2 in a minor, recorded as a decision here, and records are still frozen in production,
because shipping history over writable records is not an option.

Everything else in this document is reversible and decided here.

---

## 16. Alternatives rejected

| Alternative                                                                                                               | Why not                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An inverse command written per door (`element-api-design.md` section 4.11.2's `inverse: Command`)                         | About 150 doors, each a place for undo to be wrong. An inverse that must hold a `RunResult` or a previous snapshot by reference is not a serialisable command. The issue forbids commands writing their own undo                                                                          |
| A consumer-owned undo stack (section 4.3.3)                                                                               | Every consumer would rebuild the same history; the architecture rules put it in the element                                                                                                                                                                                               |
| A graph snapshot per step                                                                                                 | Each freeze copies the whole graph (`freeze.ts:621`), so every data edit would cost a full graph                                                                                                                                                                                          |
| A persistent chunked record table shared between versions                                                                 | History keeps op-logs, never old versions of the graph, so structural sharing buys nothing a plain map of frozen records does not                                                                                                                                                         |
| Immer                                                                                                                     | It handles neither typed arrays nor million-entry maps efficiently, and the state has a handful of known slice shapes; no dependency is needed                                                                                                                                            |
| Plugin algorithm results in a separate sink, overlaid on `node.data` at read time                                         | Plugins write through arbitrary code against `Graph`, so a sink cannot intercept them without changing the plugin contract; and every record read would merge across every legacy run                                                                                                     |
| Grouping follow-on work by running it in the same queue slot                                                              | Loads bypass the queue, batches and `now` runs run beside it, and an import that awaited its on-load runs in its own slot would deadlock on the single-slot queue. Explicit groups name their members instead                                                                             |
| Transaction membership by time (every commit while open joins)                                                            | Browsers have no async-context tracking, so unrelated edits, including the reader's own drags and colour changes during a long load, would join and be rolled back with it. A `tx` handle scopes membership without holding the queue, so it does not deadlock                            |
| A transaction that stays open until every run it started finishes                                                         | A minutes-long run would hold the step open and swallow later edits. Deferred members join only while their step is on top                                                                                                                                                                |
| Whole-slice before and after values for every value slice                                                                 | A synchronous writer and a queued writer of different fields of one slice would overwrite each other on commit or rollback. Keyed prior values and key hand-over make them independent                                                                                                    |
| Holding every key a group declared from its first command until it seals                                                  | A transaction whose `fn` awaits a door outside `tx` on a key it wrote deadlocks, and a run holding the style stack until it commits freezes every colour edit for the run's length. Short holds with hand-over for values, and an immediate error for op-log ids, remove both             |
| Letting undo drain queued edits before it acts                                                                            | Style and filter edits shared the queue with runs, so undo waited behind a minutes-long run. Making those edits immediate removes the drain                                                                                                                                               |
| Inlining any untagged dispatch into whichever queued command is executing                                                 | Time-based membership again: a reader's edit during a long run joins the run and is destroyed when undo cancels it. Only the plugin facade inlines                                                                                                                                        |
| Declaring row order outside the undo contract and making the digest order-independent                                     | Row order feeds the fingerprint, the paint columns and every cache keyed on them; they would miss after every undo of a removal. Restoring order costs one rebuild, the same order as the freeze an undo already pays                                                                     |
| Storing captures as sparse deltas against the capture below                                                               | Settles move nearly every row, so deltas save little, and they tie each capture to a base that re-sealing and eviction replace. Row patches for `positions.set` cover the few-rows case                                                                                                   |
| Keeping kept visibility masks by reference in the patch                                                                   | The element has one long-lived mask pair rewritten in place, whose revision is a cache key; a reference would be overwritten and a new object would reset the revision. Masks are derived, with tagged byte copies as a cache                                                             |
| Keeping `batchOperations`' calls on the element grouped by time for the callback's duration                               | Time-based membership: other element calls during the callback, including the reader's, would join and roll back with it. The callback's `tx` and a warning are used instead                                                                                                              |
| A 2.4.0 minor with the closures deferred to 3.0.0                                                                         | Most of it is already breaking, and history over writable records is unsafe (section 15.3)                                                                                                                                                                                                |
| A capture per `moves` command, including adds                                                                             | At a million nodes with a running layout, adding nodes one at a time would copy 12 MB per add. Captures at rest points and deliberate moves cost one copy per thing a person does                                                                                                         |
| Recording a layout re-run from transport as its own step                                                                  | Every settle after an add or a drag would then need its own step as well. Sealing rest points into the seal target covers all of them; the app's explicit "Re-run" uses `layout.set` to be its own step                                                                                   |
| Showing a 2D layout flat in a VR or AR headset                                                                            | Keeps XR free of steps, but a flat graph in a device whose point is depth is a regression from today                                                                                                                                                                                      |
| Undo cancelling the newest pending item regardless of age                                                                 | A run started minutes ago would be cancelled by the press meant for the colour change after it, and a queued colour-picker frame would absorb a press with no visible effect                                                                                                              |
| Demoting old steps to "not undoable" before evicting them (section 4.11.2)                                                | Undo is last in, first out: a step that cannot be undone makes every older step unreachable while still paying for it                                                                                                                                                                     |
| Coalesce keys opened and closed by gesture ids (section 4.11.1's table)                                                   | Every consumer would have to report gesture boundaries. A key plus a time window needs no consumer code, and the element's own drag is a transaction                                                                                                                                      |
| An `undo-keys="element" \| "host"` attribute                                                                              | `preventDefault` plus a boolean covers both cases                                                                                                                                                                                                                                         |
| A hand-written lint selector list, or ESLint's built-in `no-restricted-syntax`                                            | A hand-written list drifts from the doors that exist; the built-in rule cannot tell an element receiver from any other. A type-aware rule reading the element's door list keeps one list and matches by type                                                                              |
| Widening `session.run` to every op                                                                                        | `run` returns an algorithm-run handle whose fields mean nothing for a style edit. `execute` returns a per-op result type                                                                                                                                                                  |
| Publishing `ProjectState` and the patch format                                                                            | The state shape is effectively the project-file format and should be decided with it                                                                                                                                                                                                      |
| Recording camera moves                                                                                                    | Owner's rule: camera is not saved in the project                                                                                                                                                                                                                                          |
| Suspending rest points while any group with a before-arrangement is open                                                  | The group's step would record no after-arrangement for a layout that settled while it was open, and the reader's own steps recorded meanwhile would get none either. Sending the capture to the open group as a provisional after-capture keeps it and still never writes below the group |
| Writing a group's before-arrangement into the step below it                                                               | A later rest point could replace it while the group was still open, so undoing the group would restore the wrong coordinates. A step's own before-capture cannot be overwritten by anything else                                                                                          |
| Applying graph inverses eagerly at undo time                                                                              | Every press would pay an O(N + E) rebuild before returning, and an undo followed by a redo would pay two that cancel. The store already freezes lazily; folding a pending list to its net effect costs one rebuild per read                                                               |
| A restorable `graphVersion` counter as the row-identity tag                                                               | Undo rewinds it and the next commit reissues the same number for different rows, and key hand-over can leave it unchanged across a rollback that changed rows. A never-reissued token avoids both                                                                                         |
| A flat `ProjectConfig` (`nodeIdPath`, `algorithmsOnLoad`, `directed` at the top) beside the existing `SessionConfig.data` | Two spellings of one value, and a hand-written key list that already missed four known fields. Reusing the `DataConfig` shape and deriving the keys from its schema keeps one spelling and follows the schema                                                                             |
| A per-domain event for each of the seven slices that have none                                                            | Seven new published names that say nothing `project:changed { slices, cause }` does not                                                                                                                                                                                                   |
| Reverting a style or visibility edit when its `Run` is cancelled                                                          | The edit is already recorded and may be coalesced into a larger step; a late cancel would have to split the step. Undo is the way back                                                                                                                                                    |
| Keeping `store` / `records` injection on `createGraphSession` with history disabled                                       | A session whose `canUndo` is always false for reasons invisible at the call site is a trap; the write verbs cover the headless case                                                                                                                                                       |
| `nodeData` / `edgeData` getters that return the last array assigned                                                       | After an undo they report a graph that no longer exists, and a declarative host that re-renders with that value re-adds the undone nodes                                                                                                                                                  |
