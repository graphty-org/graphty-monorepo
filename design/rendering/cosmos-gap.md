# Closing graphty-element's three largest gaps to cosmos.gl

Status: design, not built. Code read at origin/master 5de23d248a (2026-11-08). Paths are under `graphty-element/src/` unless
named otherwise. This document extends `design/rendering/row-renderer.md` (the row renderer, whose stages are named here by
their number there, for example "stage 26, lazy `Node`") and draws on `design/ui/framework/research/cosmos-gl.md`. Its own
stages are named G1, G2 and so on.

## 1. What this closes, and by how much

cosmos.gl is the WebGL engine under Cosmograph: two draw calls that read positions from a texture, and no JavaScript object
per node or edge. graphty-element's opt-in batched render path (`renderPath: "batched"`) draws nodes from shared batches
and a GPU row table, but still builds per-row JavaScript on load. Measured side by side on one machine, three gaps stand out:

| Gap                                | cosmos.gl                  | graphty-element, batched, today | After this design (projected)                                               |
| ---------------------------------- | -------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
| First load, 100k nodes + 1M edges  | 0.63 s                     | 27.1 s (43x)                    | 3.5-5 s typed, files and samples; 4.7-6.3 s record arrays                   |
| First load, 100k nodes + 1k edges  | 0.16 s                     | 5.2 s (33x)                     | 1.3-1.9 s                                                                   |
| Still frame, 100k nodes + 1M edges | 28.4 ms                    | 89.6 ms (3.2x)                  | 72-90 ms default; 60-65 ms with `antialias: false`; 25-40 ms 6-vertex lines |
| 1M nodes + 10k edges               | 0.67 s load, 1.5 ms frames | refused with `E_TOO_LARGE`      | loads; 8.5-14.5 s typed; frames 6-21 ms of GPU                              |
| 1M nodes + 1M edges                | 1.09 s load, 29 ms frames  | refused with `E_TOO_LARGE`      | loads; frames 77-92 ms default, 27-61 ms with faster lines                  |
| Still frame, 10k nodes + 100 edges | 0.9 ms                     | 19.0 ms                         | about 1.5 ms                                                                |

The verdict, in three lines:

- **First load**: the cost is per-row JavaScript in graphty-element, exactly where the planned stages cut, so it can come
  down about 6x. It stays 5-8x behind cosmos.gl, because the session's history, derivation pass and Babylon's first render
  remain. Going further needs ingest off the main thread or a load that skips the session's history, which this design
  does not attempt.
- **Million-edge frame**: the frame is bound by GPU fill, not JavaScript. Only drawing cheaper lines moves it, and that
  changes the picture, so it is an option a consumer turns on. With the default picture it stays about 2.5-3.2x cosmos.gl.
- **Million nodes**: a consumer option makes them loadable on the batched path. The node batch should draw them in
  6-21 ms of GPU. The load is the per-row cost above, times ten.

Every projection is arithmetic on section 2's measurements (static layout); each stage's Proof replaces one with a measurement.

## 2. The evidence

### 2.1 The interim measurement

Committed at `benchmarks/results/interim-gap/`, measuring origin/master 02d59ed614 on 2026-11-08: RTX 4070 SUPER through
ANGLE/Vulkan, headless Chromium, the 2D lean look (box nodes, plain lines), the static layout, the GPU lock held, load
average 2-24. Five interleaved rounds of cosmos.gl, batched and objects; three at a million nodes. Medians, range in brackets:

| Graph      | Metric               | cosmos.gl       | batched                | objects      |
| ---------- | -------------------- | --------------- | ---------------------- | ------------ |
| 10k + 100  | First frame          | 0.13 s          | 0.61 s                 | 0.56 s       |
| 10k + 100  | Still frame          | 0.90 ms         | 19.0 ms (2.5-19.2)     | 22.5 ms      |
| 10k + 100k | First frame          | 0.44 s          | 2.89 s                 | 2.79 s       |
| 10k + 100k | Still frame          | 3.90 ms         | 25.8 ms                | 34.5 ms      |
| 100k + 1k  | First frame          | 0.16 s          | 5.20 s                 | 4.98 s       |
| 100k + 1k  | Still frame          | 1.30 ms         | 23.5 ms                | 68.5 ms      |
| 100k + 1k  | JS heap              | 19 MB           | 454 MB                 | 961 MB       |
| 100k + 1M  | First frame          | 0.63 s          | 27.1 s (25.3-30.2)     | 25.7 s       |
| 100k + 1M  | Still frame (p99)    | 28.4 ms (29.1)  | 89.6 ms (92.1)         | 130 ms (164) |
| 100k + 1M  | Moving frame         | 28.6 ms         | 90.0 ms                | 170 ms       |
| 100k + 1M  | Drag frame           | -               | 107 ms                 | 174 ms       |
| 100k + 1M  | Hover                | 28.5 ms         | 1.65 ms                | 23.4 ms      |
| 100k + 1M  | JS heap              | 161 MB          | 1,994 MB               | 2,501 MB     |
| 1M + 1M    | First frame / frames | 1.09 s / 29 ms  | refused, `E_TOO_LARGE` | refused      |
| 1M + 10k   | First frame / frames | 0.67 s / 1.5 ms | refused, `E_TOO_LARGE` | refused      |

In those batched runs every node was on a batch and no edge was pulled (drawn from the row table): `Edge.pullsLine`
(`Edge.ts:2538`) refuses any 2D line, so every edge was an object edge in a placed line batch. The benchmark hands graphty-element arrays of record objects and hands cosmos.gl typed
arrays (`benchmarks/compare/main.js`), so the load comparison is not yet like for like.

### 2.2 Where the load goes

Chrome CPU profiles of the batched path, sampled every 0.5 ms. Profiling stretches a load by up to 35% (the 100k + 1M load
took 37.9 s profiled, 27.1 s unprofiled, a ratio of 0.715). The buckets below do not overlap: each sample is charged to the
nearest listed function on its stack.

**100k nodes + 1M edges, 37.9 s profiled:**

- Session `addEdge`: 7,064 ms. `GraphOps.addEdge` (`session/project/graphOps.ts:1317`): record copy, endpoint filter, builder append, id stamp, `Map.set`, one operation object per edge
- `drawArrivedPaint`: 4,894 ms. The frame's paint of arrived rows: `syncStyles`, `applySessionPaint`, paint objects per row
- `edgeStored`: 4,717 ms. `DataManager.buildEdge` (`managers/DataManager.ts:2211`): one `Edge` object per edge
- `touch`: 4,644 ms. `DerivationLane.touch` (`session/project/derive.ts:294`): a fresh `e:<id>` string per edge into one dirty `Set`
- Garbage collection: 2,967 ms
- `reconcile`: 2,815 ms. `DataManager.reconcile` (`DataManager.ts:1008`) revisiting every dirty key after a load it already drew
- Mesh-key interning (unbucketed): about 1,765 ms. `pushAbsent`, `pushNumber`, `pushMeshValue` (`session/styles/intern.ts`, `session/styles/repaint.ts:805`), per row
- `runUpdatePass` placement: 2,584 ms. `syncPlacement`, the `drawnPosition` getter, one placed line slot per edge
- `Ingest.addEdgeRecord`: 1,618 ms. `session/project/ingest.ts:1244`: endpoint reads, weight, tally, record-id map
- Babylon first render, other pass hooks: 2,458 ms. `_renderFrame` remainder (about 1.3 s) and the derivation pass's other hooks (about 1.2 s)
- `nodeStored`: 756 ms. `DataManager.buildNode`: one `Node` per node
- Row loops (`addNodeRows`, `addEdgeRows`): 611 ms

**100k nodes + 1k edges, 5.3 s profiled:** `drawArrivedPaint` 1,627 ms (31%); garbage collection 800 ms; mesh-key interning
about 430 ms; per-node Babylon instance work 1,075 ms (`createInstance` 357, `notifyObservers` 348, `_evaluateActiveMeshes`
320, `freezeActiveMeshes` 50); `runUpdatePass` 271 ms; `nodeStored` 234 ms; ingest about 200 ms. Every one of these is per row.
At 100k rows Babylon holds 100,002 transform nodes (one anchor per batched row) in a scene of only 4 meshes.

GPU time during either load is under 1%. The load is CPU-bound JavaScript in graphty-element.

### 2.3 Where the frame goes

- **100k + 1M, moving frames:** 82% waiting on the GPU, 17% idle, under 1 ms of JavaScript per 90 ms frame. A one-run probe in
  3D, where all 1M edges are pulled, gave 77 ms moving and 92 ms still: moving the edges to the row table removed the CPU cost
  and left the frame unchanged.
- **GPU timer queries** (`EXT_disjoint_timer_query_webgl2`, the element's loop stopped, 60 frames drawn by the probe):

    | Graph      | Whole frame  | Without the node batch | Node batch alone |
    | ---------- | ------------ | ---------------------- | ---------------- |
    | 10k + 100  | 0.22 ms      | 0.16 ms                | 0.19 ms          |
    | 10k + 100k | 7.07 ms      | 7.10 ms                | 0.20 ms          |
    | 100k + 1k  | 2.40-2.63 ms | 0.68-0.83 ms           | 2.02-2.05 ms     |
    | 100k + 1M  | 71.5 ms      | 70.9 ms                | 0.61 ms          |

    So 1M benchmark edges take 70.9 ms of GPU by themselves, and the harness records 18 ms more than the GPU spends (89.6 ms).
    100k boxes cost 0.6-2.0 ms depending on the pixels they cover, not their vertex count.

- **Line programs** (the row renderer's spike, `row-renderer.md` 4.3): 1M long edges take 83 ms with the 14-vertex join
  program at 4x multisampling, 68 ms with a 6-vertex straight program, 60 ms with 14 vertices and no multisampling, and 20.8
  ms with 6 vertices and none. The 6-vertex program leaves one stray pixel in some scenes on the RTX; stage 15 traces it, and
  until it is gone or the owner accepts it, that program stays off.

### 2.4 The small-graph floor is a missing flush

Below about 20 ms a batched frame measures the loop's pacing, not drawing. `RenderManager.gpuBehind`
(`managers/RenderManager.ts:1374`) skips a loop tick while the previous frame's fence is unsignalled, keeping one frame in
flight, which a software GPU needs (it once ran 850 ms behind). But `fenceFrame` (`:1394-1407`) issues `gl.fenceSync` and
never flushes, so the GPU does not see the fence until Chrome flushes at its own present cadence, about every 18 ms. The same
file already flushes after its other fence (`:344-345`). A probe that patched one `gl.flush()` after the `fenceSync`, one run
each:

| Graph     | Serial still frame, before | After the flush  | cosmos.gl |
| --------- | -------------------------- | ---------------- | --------- |
| 10k + 100 | 17.6 ms (p95 19.0)         | 1.5 ms (p95 1.5) | 0.9 ms    |
| 100k + 1k | 23.2 ms (p95 24.1)         | 1.1 ms (p95 6.1) | 1.3 ms    |

The 1.1 ms median is below that graph's 2.4 ms of GPU time, so the harness may stamp frames early; p95 is the safer
figure. This floor inflates every small-graph ratio (6-32x) and hides the drawing cost later stages measure, so it goes first.

## 3. The mechanism

### 3.1 Frames: flush the fence (G1)

Under `"batched"`, `fenceFrame` calls `gl.flush()` right after `gl.fenceSync`. Pacing stays one frame deep, so the software
GPU guard holds. No pixel changes. `RenderManager` does not know the render path today, so `Graph` passes it in (and again on
a live `renderPath` change). Two frames in flight without a flush would at best halve the 18 ms floor.

### 3.2 Million nodes: the ceilings become an option (G2)

`DEFAULT_LIMITS.renderCeiling` (100,000) and `edgesDrawn` (1,000,000) in `session/limits.ts` are read directly by `Ingest`
(`session/project/ingest.ts:1030, 1181, 1187, 1434, 1456`). G2 takes over the `renderCeiling` and `edgesDrawn` fields of the
`limits` option and the `capabilities` member that `row-renderer.md` first gave stage 30, so a million rows can be loaded and
measured long before stage 30's other dependencies land:

- The element computes the effective ceilings (the consumer's value under `"batched"`, the defaults under `"objects"`, whose
  heap reason stands) and hands the session plain numbers; `Ingest` reads them instead of `DEFAULT_LIMITS`. The session stays
  free of Babylon.
- `limits` set off `"batched"` raises `W_LIMITS_IGNORED` (`{ renderPath }`). A live switch to `"objects"` above its
  defaults is refused with `E_TOO_LARGE` on the element's `{ code, params }` event, and the path stays `"batched"`.
- `session.capabilities` gains `limits`, reporting the effective values for the current render path, and
  `capabilities:changed` fires when either `limits` or `renderPath` changes them. Today no capability reports the ceilings,
  so a consumer has nothing to read once they can change.
- The same stage gives the ingest's host a `batched` flag. Nothing in `session/` reads the render path today, and G4 and G8
  need it.

The graphty app does not change here; its `fitsInBrowser` and `isLarge` keep refusing million-node samples until stage 30
passes them limits. Stage 30 then adds only the object budgets (`objectRows`, `objectEdges`, `W_OBJECT_CAP`).

### 3.3 Load: remove each per-row bucket with the cheapest change that removes it

1. **Pulled 2D straight lines (G3).** A 2D solid line is the same joined-line program as a 3D one, with its width in world
   units (`meshes/Simple2DLineRenderer.ts` calls `CustomLineRenderer.createJoinedLineMesh` with `worldWidth: true`). So
   `Edge.pullsLine` drops its `drawsFlat` refusal, `EdgeMesh.pulledBatch` builds its mesh with `worldWidth: true` and the
   line's `minScreenWidth`, and the pulled batch is keyed by view so a 2D/3D switch rebuilds it. Every other refusal stands.
   This removes per-edge placement and is what lets stage 27 skip 2D edges at all.
2. **Bulk lane keys and one history entry per forward load (G4, on stages 27 and 28).** Stage 28 owns the single bulk
   history entry (its "bulk op-log entry", one range entry per `importColumns` load) and stage 27 owns the rewrite of
   `DataManager.reconcile`. G4 builds on both and adds no second entry format: under `"batched"`, a forward `addNodes` or
   `addEdges` batch of records is recorded as one stage-28 range entry, and touches one range key
   (`e+:<firstIndex>:<count>`) instead of one operation and one `e:<id>` string per edge. Every reader of the per-row keys
   learns the range form: stage 27's `reconcile` (which then walks a forward range only on undo, redo or restore),
   `session/GraphSession.ts` (`editedRows`, `changesRowsOnly` and three more), `session/project/derive.ts`,
   `session/project/arrangement.ts:631` and `session/commands/data.ts:816`. Removes `touch` and
   `reconcile` (7.5 s profiled) and a million operation objects. Under `"objects"` every edge is recorded and touched as today.
3. **Paint once per mesh key, and a uniform mesh-key fill (G6, on stage 26).** Stage 26 builds no `Node` for a row that needs
   none and paints it as a `ColumnRow` through `NodeBatches.paintRow`. G6 makes that paint cost per mesh key, not per row:
   it caches one `NodePaint` per key from `meshStyleOf(key)` instead of building a channel bag, a key array and a style
   object per row (`StylePainter.nodePaint`, `managers/StylePainter.ts:1191`), and writes the row's color straight from the
   color column into the batch buffer. And under `"batched"` (G2's flag; `repaint.ts` also runs for `"objects"`), when every
   mesh channel of a target is absent or constant over the rows being painted, the repaint interns one sequence and fills `meshKeys` with it instead of hashing per row; a data-driven size or
   shape keeps the per-row path. Removes most of `drawArrivedPaint`, the per-node Babylon instance work and the interning.
4. **Lazy edges, 2D included (G7, on stage 27).** Stage 27 as planned, for pulled edges in both views now that G3 pulls 2D
   ones, painted from columns as nodes are.
5. **The column door, used by every feeder (G8, on stage 28).** Stage 28 adds `session.data.importColumns`, `count()` and
   the bulk history entry, routes graph-io file imports and graph-samples (`generate`, `loadSample`) through the door,
   releases the builder's staging arrays, skips id maps for typed input and cuts batch data toward 20 bytes. G8 covers what
   stage 28 leaves out, so the rest of the simple path reaches the door with no consumer code, under `"batched"` only:
    - `nodeData`/`edgeData` and `addNodes`/`addEdges` record arrays are turned into columns by one read pass when every record
      is plain enough;
    - which loads qualify is one pure function, `columnsEligible(load)` in `session/project/ingest.ts`, with a test table. A
      load qualifies when every policy it uses has a column form (`session.data.import`'s `duplicateIds` `"first"` or `"refuse"`, repeats `"keep"` or
      `"sum"`, one endpoint spelling for the batch, weights from one column). Anything else takes today's records path as a
      whole load, never row by row;
    - the import report states which path ran and why, as a neutral fact (`{ code, params }`), so a consumer who gets the slow
      path can see the reason;
    - an install is a load (`openLoad`/`closeLoad`), so `GraphStore.completeIdentity` (`data/GraphStore.ts:2158`) takes its
      existing whole-column branch instead of the per-cell one every `edgeData` load takes today.
      The comparison harness gains a `columns` mode that hands graphty-element the typed arrays cosmos.gl gets, and keeps the
      record mode, so both are measured.

    Correction (G8's first pull request): `importColumns` builds the records the record doors take, so there is no column
    path to route record arrays to yet. `columnsEligible`, the routing and the report's path wait for stage 29's
    records-into-columns; install-as-a-load is written off (1.9 ms of an 11.6 s 100k + 1M load). G8 is now the harness
    `columns` mode, the parity half of its proving test, and the per-edge bookkeeping its profile found
    (row-renderer.md, "Every feeder through the column door").

### 3.4 The million-edge frame: an option for cheaper lines (G5, G12)

No CPU change moves a fill-bound frame. Two picture changes do, so both are opt-in:

- **`antialias` (G5)**, default `true`. Only G5 adds it; stage 15 uses it. Today `antialias: true` is hard-wired where the engine is created
  (`managers/RenderManager.ts:237` for WebGPU, `:275` for WebGL). `false` creates the canvas without 4x multisampling, on
  either render path, and means only that. It is read from the element when the engine is built (section 6 says when that
  is); graphty-element has no engine rebuild, and one would put context loss, XR and WebGPU at risk. Projected 100k + 1M
  still frame: about 60-65 ms.
- **The 6-vertex straight program (G12)**, stage 15's remaining pull request. It stays behind stage 15's internal switch
  until the stray pixel is traced or the owner accepts it. After that ruling it is used for plain straight pulled lines when
  `antialias` is `false` on `"batched"`, and the `antialias` documentation says so in one sentence. Projected 25-40 ms.

With the default picture the frame stays at 72-90 ms (71.5 ms of GPU, 89.6 ms measured), about 2.5-3.2x cosmos.gl. G1's Proof checks whether the flush also
recovers part of the 18 ms between the harness's 89.6 ms and the GPU's 71.5 ms.

### 3.5 What is kept out on purpose

- **Drawing batches outside Babylon.** Under `"batched"` the scene is 4 meshes at 100k nodes, Babylon's share of a frame is
  0.4-0.8%, and `scene.render()` is 0.5 ms of CPU at 10k nodes. Leaving Babylon would save under a millisecond and cost XR,
  WebGPU, render order, picking and context restore.
- **Records as a view over columns, edge ids as a range, and no anchor for a batched row that keeps a `Node`.** Each cuts
  heap and touches code with wide reach (`data/GraphStore.ts:1690-1799`, 29 readers of `slice.nodes`). They are G11, built
  only if G9 measures the million-row heap over its target.

No feature is removed. A row or edge that needs a `Node`, an `Edge`, a mesh, a cap, a label, a group or any style a batch
cannot draw stays an object row or edge, as today.

## 4. Stages

Each stage is one pull request into master (two where marked), passes CI, and changes nothing under `"objects"`. CI proves
counted work; milliseconds come from the comparison harness (`benchmarks/compare/`) on the RTX under
`render-path="batched"`, in 5 interleaved rounds with cosmos.gl, in the stage's Proof, with the GPU timer probe beside every
frame figure. Targets are 2D lean unless stated. Row-renderer stages are landed by another workflow; the stages here that
build on one are follow-on pull requests after its last pull request merges, never edits to its branch.

**G1. Flush the frame fence.** `fenceFrame` flushes after `fenceSync` under `"batched"`; `Graph` passes the render path to `RenderManager`; GPU timer probe, 10-node floor probe and a check of the serial-stage frame stamping committed in `benchmarks/compare/`.

- Depends on: none.
- Proving test: Recording WebGL2 stub: `flush` follows `fenceSync` on `"batched"`, absent on `"objects"`; the existing SwiftShader pacing tests still hold one frame in flight; a SwiftShader harness row in the Proof.
- Measured target: Serial still frame: 10k + 100 at most 2.5 ms median; 100k + 1k at most 7 ms p95; 10k + 100k at most 9 ms.

**G2. Ceilings as an option.** `limits: { renderCeiling?, edgesDrawn? }` on the element and session; `Ingest` reads the effective value; `session.capabilities.limits`; the ingest host's `batched` flag.

- Depends on: this document merged into master, so stage 30's builder reads the narrowed scope.
- Proving test: Default refusal unchanged (code and text at 100,001 nodes); `"objects"` with a raised limit still refuses; `"batched"` with a raised limit loads 200,000 nodes on SwiftShader with `objectNodes` 0; `capabilities.limits` and `capabilities:changed` follow a `renderPath` change; `limits` under `"objects"` raises `W_LIMITS_IGNORED`; a switch to `"objects"` above its defaults is refused and the path stays `"batched"`; blind-author example compiled against the built types.
- Measured target: 1M + 10k and 1M + 1M load on the RTX (records, so slow: about 50 s); the time is recorded, not targeted.

**G3. Pulled 2D straight lines.** `Edge.pullsLine`, `EdgeMesh.pulledBatch` width units and view key.

- Depends on: stage 16 (merged); after stage 20's and stage 21's open pull requests merge, which also edit `Edge.ts`.
- Proving test: `pulled-edges-batched.test.ts` extended to 2D: 0 pixels against `"objects"` at rest, after a mouse drag, across a 2D/3D switch, at sub-pixel widths; `render-parity` 2D stories; `rowCounts.pulledEdges` equals the edge count.
- Measured target: Lean 100k + 1M: `pulledEdges` 1,000,000; drag frame p99 at most the still frame's p99 (107 ms median today).

**G4. Bulk lane keys, one history entry.** `GraphOps.addEdge`/`addNode`/`record` write stage 28's range entry, `DerivationLane`, every per-row key reader in section 3.3 item 2.

- Depends on: G2 (the `batched` flag); stage 27 (`reconcile`) and stage 28 (the bulk history entry).
- Proving test: Graph digest (`session/project/digest.ts`) and undo, redo, restore and autosave equal the per-edge form, including a load followed by per-edge edits and a restore across it; the lane's dirty set after a 1M-edge load holds a count of keys independent of the edge count (test door); `"objects"` records per edge, unchanged.
- Measured target: 100k + 1M records: `touch` plus `reconcile` under 0.1 s profiled; first frame recorded; whichever of G4 and G7 lands second: first frame at most 12 s.

**G5. `antialias` option.** Property and attribute, default `true`, read from the element when its engine is built; `W_ANTIALIAS_LATE` on a later change.

- Depends on: none.
- Proving test: `true`: 0 pixels different from today on every story; `false`: only multisampling changes, both as the last attribute after `view-mode` and `render-path` and as a property set before `appendChild`; device-loss and context-restore tests run with it set either way.
- Measured target: 100k + 1M still frame, `antialias: false`: at most 65 ms.

**G6. Paint by mesh key, uniform keys (2 PRs).** `StylePainter` paint cache by key and color column to batch buffer; `repaint.ts` uniform mesh-key fill; scene-object guard.

- Depends on: G2 (the `batched` flag); all of stage 26's pull requests.
- Proving test: `dataManagerInternals.nodesBuilt` 0 after load; `render-parity` under `"batched"`; paint objects counted per mesh key; a data-driven size still interns per row; under `"objects"` the mesh keys and retain/release counts equal today's; scene-object guard: `scene.transformNodes` count at 1k and 10k rows equal within a constant, after hover, select and drag (100,002 at 100k today).
- Measured target: 100k + 1k records: first frame at most 2.0 s.

**G7. Lazy edges, 2D included.** Stage 27 extended to G3's 2D pulled edges, painted from columns.

- Depends on: stage 27, G3, G6.
- Proving test: Stage 27's counted test (`Edge`s built 0 on the lean load), in 2D and 3D; undo across a load.
- Measured target: 100k + 1M records: first frame at most 17 s (12 s needs G4 too, which does not depend on G7).

**G8. Every feeder through the column door.** Harness `columns` mode; the per-edge load bookkeeping (`GraphOps.addEdge`, `DataManager.builtUnpainted`, `edgePaint`). `columnsEligible`, routing and the report's path wait for stage 29; install as a load is written off (section 3.3 item 5).

- Depends on: stage 28, G4, G7.
- Proving test: Digest, counts and graph-level values of `importColumns` equal the record doors' on every dataset in the repository (the 17 small ones; the six hosted ones hold no data here), every generator and every graph-io corpus format, both render paths (built). The counted halves (an ineligible load takes the records path whole, counted; records built during an eligible file import counted at 0) and import-report equality move to stage 29's row (row-renderer.md), since they need a column path that skips the record.
- Measured target: 100k + 1M typed: first frame at most 5 s; records at most 6.5 s; 100k + 1k typed at most 0.8 s (raised from 1.9 s, which the 1.30 s of 2026-11-11 met; 0.89-0.94 s at G8's first pull request, not yet met). At G8's second pull request: 100k + 1M typed 5.5-5.7 s, records 5.6 s (met), 100k + 1k 0.90 s. At its third: 100k + 1M typed 5.36-5.37 s, 100k + 1k 0.93 s. At its fourth (the painter's row queue off a Set): 100k + 1M typed 4.975 s and 5.003 s against master's 5.35 s and 5.15 s in the same session (met in one run, missed by 3 ms in the other), 100k + 1k 0.90 s; the 0.8 s left in `addEdge` is keeping a record per edge, which stage 29 removes (row-renderer.md). At its fifth (a batched load's node batches sized by the rows taken): 100k + 1k 0.63-0.87 s against master's 0.98-1.26 s in the same session (met in three runs of four, load average 13-22); 100k + 1M typed unchanged at 5.8-6.8 s (master 5.9-6.1 s, load average 7.6-13.8), which still needs the duplicate-edge checks (stage 117) and `publishPositions` gone. At its sixth (session edges' identity hashes read each node's hash once instead of hashing both end ids per edge): correction to the fifth's note, neither of those is left. The duplicate-edge checks went with stage 117's stored pairs, and `publishPositions` itself is a few ms; the 0.5-0.66 s profiled under it is the load's first snapshot freeze, which the publish is the first to ask for (`getSnapshot`): identity completion 0.37-0.47 s (`writeSessionColumnsWhole`, a hash per edge) and the freeze 0.13 s. This pull request cuts the completion from 450 to 355 ms of CPU (profiled, one run each, load average 14-24); the rest is hashing each edge's minted id `graphty:e<n>`. Wall-clock first frames in the same session were within noise of master (100k + 1M typed: master 6.85 and 8.22 s, branch 8.44 and 9.35 s; 100k + 1k: master 0.92 and 1.04 s, branch 1.17 and 0.69 s; load average 15-40). What is left of the 100k + 1M load is `GraphOps.addEdge` (1.4 s self, the record kept per edge, stage 29), the edge paint (1.4 s: `unbuiltEdgeEnds`, `endBehindEdges` reading a node's look twice per edge, and growing the line table), the freeze, `readPixels` 0.5 s and garbage collection 0.3 s.

**G9. The million-row run.** Harness matrix at 1M + 10k and 1M + 1M, typed and records, 3 rounds, GPU timer probe; committed to `benchmarks/results/cosmos-gap/`.

- Depends on: G1, G2, G8.
- Proving test: Every row clean (no void or dirty rows), GPU lock held, load average recorded before and after.
- Measured target: 1M + 10k typed: first frame at most 14.5 s; decides G10 (still frame over 10 ms) and G11 (heap over 800 MB).

**G10. Conditional: cheaper node batch.** On top of stage 28's 20-byte instance stream (landed before G9), in 2D only, a front-face-only box family (2D boxes are unlit and seen straight on).

- Depends on: G9.
- Proving test: `render-parity` at 0 pixels per family, 2D, both engines; RTX run in the Proof.
- Measured target: 1M + 10k still frame at most 10 ms.

**G11. Conditional: heap.** In order, until the target holds: no anchor for a batched row that keeps a `Node`; edge ids as a range; records as a view (stage 29).

- Depends on: G9; stage 29's own dependencies for its part.
- Proving test: Each part's counted test (anchors, map entries, records materialized after a load and a first frame: 0), digest equality, `render-parity`.
- Measured target: 1M + 1M heap at most 800 MB.

**G12. 6-vertex lines under `antialias: false`.** Stage 15's 6-vertex program used for plain straight pulled lines when `antialias` is `false` on `"batched"`.

- Depends on: G5; stage 15's stray-pixel trace, and the owner's ruling if the pixel survives.
- Proving test: Stage 15's `render-parity` with the program on; the stray-pixel picture to the owner.
- Measured target: 100k + 1M still frame with `antialias: false`: at most 40 ms.

G1 and G5 can start now. Stage 30 depends on G2 as well as its own stages (18, 21, 22, 23, 25, 28), and adds only the object budgets to G2's option and the app's limits.

## 5. Projections, and where each gap stops

Each projection takes the profiled buckets of section 2.2, sets the ones a stage removes to zero (or to a named residual),
keeps every other bucket whole, and scales by the measured unprofiled ratio. Keeping buckets whole makes these upper bounds,
except where a bucket is said to shrink.

### 5.1 First load, 100k nodes + 1M edges (today 27.1 s; cosmos.gl 0.63 s)

| After                                             | Removed (profiled)                                                                                    | Projected    | Against cosmos.gl |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------ | ----------------- |
| G4                                                | `touch` 4.64 s, `reconcile` 2.82 s                                                                    | about 21.8 s | 35x               |
| G3, G6, G7                                        | `edgeStored` 4.72, `nodeStored` 0.76, `drawArrivedPaint` 4.89, placement 2.31 of 2.58, interning 1.77 | about 11.4 s | 18x               |
| G8, typed                                         | `addEdge` 7.06, `addEdgeRecord` 1.62, row loops 0.52; 0.4 kept for the builder (assumed)              | about 5.1 s  | 8x                |
| G8, typed, garbage collection 75% lower (assumed) | 2.2 s of the 2.97 s                                                                                   | about 3.5 s  | 5.6x              |
| G8, record arrays                                 | typed (3.5-5.1 s) plus a read pass of at most `addEdgeRecord`'s 1.16 s unprofiled                     | 4.7-6.3 s    | 7.5-10x           |

Files, samples and generators get the typed figure, because stage 28 hands their snapshots over directly. **It stops at about
3.5-5 s**: Babylon's render of the first frames (1.3 s profiled), the derivation pass's other hooks (1.2 s), garbage
collection, the graph-format builder and engine start. graph-format builds this graph from typed arrays in 54-81 ms
(`design/graph-format/STATUS.md`), so the builder is not the floor; the session is. The fixed floor is real: the 10k + 100
load already takes 0.61 s against cosmos.gl's 0.13 s, and G1's floor probe measures it.

**These projections replace `row-renderer.md`'s stage 27 and 28 load targets** (8 s and, for typed input, 2 s), and its
stage table now points here. The profile shows what no stage removes: the session's history, the derivation pass's other hooks, garbage
collection and Babylon's first render, about 3.5 s together. Stages 27 and 28 land before the stages that remove most
buckets (in 2D lean, stage 27 alone removes nothing, since 2D edges are not pulled until G3), so their Proofs record the
first frame with no gate. The 12 s target is met when both G4 and G7 have landed (G7 alone about 16.7 s), the 5 s typed
target by G8.

Heap: no heap profile was taken. The row renderer's estimates stand (600 MB after stage 27, 400 MB after stage 28, from
1,994 MB). G4 also drops one operation object per edge.

### 5.2 First load, 100k nodes + 1k edges (today 5.2 s; cosmos.gl 0.16 s)

G6 removes `drawArrivedPaint` (1.58 s of 1.63 s), the per-node Babylon instance work (1.11 s),
`nodeStored` (0.23 s) and interning (0.43 s), leaving about 1.9 s. G8's typed
input removes about 0.2 s more: about 1.7 s, or 1.3 s if garbage collection halves. **About 1.3-1.9 s, 8-12x cosmos.gl**,
mostly fixed cost.

### 5.3 Frames

| Graph and frame  | Today   | After                                                        | cosmos.gl | Basis                                       |
| ---------------- | ------- | ------------------------------------------------------------ | --------- | ------------------------------------------- |
| 10k + 100 still  | 19.0 ms | about 1.5 ms (G1)                                            | 0.9 ms    | Flush probe                                 |
| 100k + 1k still  | 23.5 ms | p95 about 6 ms (G1)                                          | 1.3 ms    | Flush probe; GPU frame 2.4-2.6 ms           |
| 10k + 100k still | 25.8 ms | about 7.5 ms (G1)                                            | 3.9 ms    | 7.07 ms of GPU plus 0.5 ms of CPU           |
| 100k + 1M still  | 89.6 ms | 72-90 ms (G1); about 60-65 ms (G5, `false`); 25-40 ms (G12)  | 28.4 ms   | 71.5 ms of GPU; line program spike          |
| 100k + 1M drag   | 107 ms  | at most the still frame (G3)                                 | -         | Placement per edge removed                  |
| 1M + 10k still   | refused | 6-21 ms of GPU plus about 0.5 ms of CPU (G2, measured in G9) | 1.5 ms    | Node batch alone 0.61-2.05 ms per 100k rows |
| 1M + 1M still    | refused | 77-92 ms; 27-61 ms with G5 and G12                           | 29.1 ms   | Edges plus nodes, as above                  |

**The million-edge frame stops** at the fill of multisampled lines with the default picture, 72-90 ms, about 2.5-3.2x cosmos.gl. Near
parity needs a consumer to set `antialias: false` and, for the last step, the owner's ruling on the stray pixel.

### 5.4 Million nodes (today refused)

After G2 and G8, scaling the 100k + 1k figure's per-row part (0.8-1.4 s per 100k rows once about 0.5 s of fixed cost is taken
off) tenfold and adding the fixed cost back gives **about 8.5-14.5 s at 1M + 10k typed, 13-22x cosmos.gl's 0.67 s**, against
stage 30's 6 s target. That assumes linear growth; garbage collection may grow faster. Heap is the row renderer's estimate, 850-920 MB before 20-byte batches, against
an 800 MB target; G9 measures it and G11 exists for a miss. **It stops** at the per-row work the session keeps: the
derivation pass over a million rows, the style repaint's column writes, the position repack and the builder.

## 6. Public API

All additive, so under the root `CLAUDE.md` rule no owner approval is needed. Each gets a `doors.ts` entry, an API report
update, a blind-author example compiled against the published types, and an `@experimental` tag in its first pull
request, kept until G9 has measured it, so a revert or a reshape stays a minor release.

- **`limits`** (G2): a property on `<graphty-element>` and an option on the session, typed
  `Partial<Pick<Limits, "renderCeiling" | "edgesDrawn">>`. Honored under `render-path="batched"`; under `"objects"` the
  defaults (100,000 nodes, 1,000,000 edges) stand, a larger load still refuses with `E_TOO_LARGE`, and setting `limits`
  raises `W_LIMITS_IGNORED` (`{ renderPath }`). Switching to `"objects"` above those defaults is refused, and the path stays
  `"batched"`. Stage 30 later adds
  `objectRows` and `objectEdges`.
- **`session.capabilities.limits`** (G2): the effective limits; `capabilities:changed` fires when they change. Its type:
  `Pick<Capabilities, "acceleration" | "xr"> & { readonly limits: Readonly<DefaultableLimits> }` (no
  `graphMemoryBudgetBytes`, which the session cannot report).
- **`antialias`** (G5): boolean property and attribute, default `true`; `false` turns off multisampling, and after G12 also
  selects the cheaper straight-line program on `"batched"`. The documentation says, in these words: "Set it as an attribute,
  in any position in the tag, or as a property before using any other property or method of the element. A later change
  takes effect only on a new element and raises the warning `W_ANTIALIAS_LATE`." The engine is built when any property,
  attribute or method first reaches the element, so G5 reads the attribute or stored property itself at that moment.
- **`session.data.importColumns(columns): Promise<LoadReport>`** and **`session.data.count()`**: stage 28's. `columns`
  holds `nodeCount`, and `sources` and `targets` (`Uint32Array`, one entry per edge, zero-based node numbers); optional
  `ids` (one string per node), `weights` (`Float64Array`, per edge), `positions` (`Float32Array`, x, y and z per node) and
  `attributes` (per-node columns by name). It refuses with `E_TOO_LARGE` above the effective limits, which under `"objects"`
  are the defaults, and with `E_INVALID_COLUMNS` when a length disagrees or a node number is out of range. Like
  `nodeData`, it places rows with the element's `layout`.
- **The load report's path** (G8, moved to stage 29: not built, since there is no column path for a load to take yet;
  and `importColumns` as built resolves to `void`, not a `LoadReport`): `LoadReport.path`, read through `session.data.lastImport()`, is
  `{ code: "PATH_COLUMNS", params: {} }` or `{ code: "PATH_RECORDS", params: { reason } }`, where `reason` is
  `"objects"`, `"duplicateIds"` (import only), `"repeatedEdges"`, `"endpoints"`, `"weights"` or `"records"`.

Under `render-path="batched"`, `nodeData`, `edgeData`, `addNodes`, `addEdges`, `session.data.import` and `loadSample` take
the fast path with no new code when the load meets every condition below; otherwise it takes the usual path, whole, and
`reason` names the first condition that failed:

- `session.data.import`'s `duplicateIds` option is `"first"` (the default) or `"refuse"`; `nodeData`, `addNodes`,
  `edgeData` and `addEdges` have no such option and always use `"first"`, so they never fail this condition;
- `repeated-edges` is `"keep"` (the default) or `"sum"`;
- every edge record in the batch names its endpoints with the same keys;
- weights, if any, come from one attribute;
- every record is a plain object, not a class instance.

Canonical example, a million nodes from records (13 lines; a static layout, since force would not settle):

```html
<graphty-element view-mode="2d" render-path="batched" layout="random"></graphty-element>
<script type="module">
    import "@graphty/graphty-element";
    const graph = document.querySelector("graphty-element");
    graph.limits = { renderCeiling: 1_000_000 };
    const n = 1_000_000;
    const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${i}` }));
    const edges = nodes.map((_, i) => ({ source: `n${i}`, target: `n${(i * 7919) % n}` }));
    await graph.session.data.addNodes(nodes);
    await graph.session.data.addEdges(edges);
    console.log(graph.session.data.lastImport()?.path); // { code: "PATH_COLUMNS", params: {} }
</script>
```

The advanced path, for data already in typed arrays, replaces the four lines that build and add `nodes` and `edges`:

```js
const sources = new Uint32Array(n),
    targets = new Uint32Array(n);
for (let i = 0; i < n; i++) [sources[i], targets[i]] = [i, (i * 7919) % n];
await graph.session.data.importColumns({ nodeCount: n, sources, targets });
```

For faster frames at a million edges, add `antialias="false"` to the tag (harder line edges).

## 7. Rollback

- **G1** runs only under `"batched"`; the objects path's fence and pacing are untouched. Undoing it removes one call.
- **G2**'s defaults equal `DEFAULT_LIMITS` and it is ignored under `"objects"`. A consumer who sets nothing reads the same
  numbers and the same refusals as today.
- **G3, G6's paint cache, G7, G10** run only when the graph keeps node batches, which happens only under `"batched"` (`pullsLine` already
  reads it that way). Each sits behind an internal switch in the style of `pulledEdgesDefault`
  (`meshes/PulledLineBatch.ts:43`), so one line turns it off.
- **G4**, **G6's uniform fill** and **G8** act only when the ingest host's `batched` flag is set, their session-level switch;
  under `"objects"` every write, key, mesh key and record is as today, and `columnsEligible` is never consulted.
- **G5**'s default `true` creates the engine exactly as today. **G12** runs only under `antialias: false` and `"batched"`.
- **G11**'s parts change only rows a batch draws.
- A stage with no landed dependents comes out with `git revert -m 1 <merge sha>`. One with dependents comes out through
  its internal switch (G3, G6, G7, G10) or the `batched` flag (G4, G6's fill, G8), or by reverting in reverse dependency
  order. G2 cannot be reverted alone once stage 30 lands; its fallback keeps the option and resets the effective ceilings
  to `DEFAULT_LIMITS`. For G2, G5 and G8, which add
  public API, that holds while the member is `@experimental`; once the tag is dropped, a rollback keeps the member and
  changes its behavior, through the owner. Existing tests run unedited, and
  `render-parity` holds the objects picture in every stage. No default changes; making `"batched"` the default or raising the
  default ceilings stays with the owner (`row-renderer.md` section 10).

## 8. Risks

- **The projections are arithmetic on one profile per size**, under profiler overhead and load 2-24; the
  garbage-collection and bulk-builder figures are labelled assumptions.
- **The flush probe is one run per size**, with a median below the GPU time; G1 repeats it and checks frame stamping.
- **A flush per frame on a software GPU** may cost frame time; G1's pacing tests and SwiftShader row check it.
- **The uniform mesh-key fill flatters the benchmark**, whose styles give every node one shape. A data-driven encoding keeps
  per-row interning and its 0.4-1.8 s.
- **Range keys change the session's lane and history**, which undo, redo, restore, autosave and the timeline read; G4's
  tests cover a load mixed with later per-edge edits and a restore across it.
- **Two ingest paths can drift.** G8's digest, count and graph-level value equality on every repository dataset, generator and
  graph-io corpus file holds them together; report equality comes with the column path itself (stage 29).
- **Pulled 2D lines** must keep drawing a sub-pixel line one pixel wide and fainter; G3's sub-pixel parity case proves it.
- **The stray pixel may survive stage 15's trace** and the owner may refuse it. The million-edge frame then stops at G5's
  60-65 ms.
- **A million-node frame has never been drawn here**, and the node batch's cost follows covered pixels, which overlap at a
  million rows; G9 replaces the 6-21 ms extrapolation with a measurement.
- **Line width**: the fill comparison assumes cosmos.gl's links and the lean lines cover the same pixels; G9 checks it.
- **Work in flight**: row-renderer stages 20-30 are landing now; G3, G4, G6, G7 and G8 start only after the stage each builds
  on has merged its last pull request.

## 9. Re-profile, 2026-11-09: what the plan missed, and the revised order

A second profile of master d8da5debd1 (batched path, 2D lean look, RTX 4070 SUPER), each finding re-measured by an
independent run, found one blocker no stage planned and several costs no stage targets.

- **WebGPU frames were never paced.** The WebGL loop skips a tick while the last frame's fence is unsignalled; on WebGPU
  that check did not exist. A still 100k + 1M scene queued a frame every 0.8-3 ms against about 89 ms of GPU work, a
  backlog of minutes built, and every GPU readback waited behind it: hover never answered, the GPU layout's position
  readback never landed so the layout stopped moving, and a fresh 256-byte buffer map did not answer in 120 s. The
  benchmark still counted iterations requested, so the 187-205 ms "layout frame" was the zoom-to-fit walk over a stalled
  layout. Paced, hover answered in 0.17-0.4 s still and 1.6-3.0 s during the layout, and the real layout frame was
  1.07-1.28 s, CPU-bound: about 617 ms in the per-`Edge` update walk, 230 ms in the zoom-to-fit walk, 152 ms in garbage
  collection, with the 89 ms line draw overlapped.
- **Lazy Node is partial**: a `Node` is still built for every stored row, and each batched row gets a Babylon anchor. A
  million nodes crash at about 450-500k rows in.
- **Costs no stage targets**: the zoom-to-fit walk over every row each layout frame (about 70% of the 10k-node layout
  frame); about 6.5 s of the 100k + 1M load (garbage collection 3.2 s, first render 1.3 s, `publishPositions` 1.0 s); and
  about 500 B per node and 290 B per edge of heap.

Stage 113 paces WebGPU frames under renderPath "batched": the loop skips a tick while the last frame's
`queue.onSubmittedWorkDone()` is unresolved, the WebGPU twin of G1's fence, and `benchmarks/compare` counts landed layout
batches, refuses a layout-frame row where none landed, and measures hover during the layout as well as before it.

The revised order:

1. Pace WebGPU frames, with the benchmark fixes.
2. Lazy Node, with a load-peak heap gate (moved up; it unblocks a million nodes).
3. Paint by mesh key.
4. Lazy Edge, with the placement credit and a layout-frame gate (a counted test that the per-frame update walk visits
   no pulled edge).
5. Bulk history keys.
6. Fit without a per-row walk: zoom-to-fit bounds from the layout's own envelope, not a walk over every row.
7. The column door and every feeder through it, with a bulk `publishPositions`.
8. The million-row run, then the heap trims, now expected to be needed.

Raw data and the full write-up stay outside the repository, in the main checkout's `tmp/cosmos-profile-2/`.
