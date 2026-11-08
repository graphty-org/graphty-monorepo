# A row-based renderer for graphty-element: one million nodes, nothing lost

Status: design, revised from the proving experiments; stages 0, 1, 2, 34, 35 and 36 are done. Code read at origin/master da23953226 and Babylon.js
8.56.2 on 2026-11-04. Paths are under `graphty-element/src/` unless named otherwise. The research note is
`design/ui/framework/research/cosmos-gl.md`; section 5 summarizes what the experiments showed.

## 1. The problem and the answer

graphty-element holds one JavaScript `Node` and one Babylon `InstancedMesh` per node, and one `Edge` per edge. Beside cosmos.gl, at
100,000 nodes and 1,000,000 edges, that costs 151 ms a still frame against 28 ms, 1.6 s a frame while the layout runs against 12 ms,
about 76 s to a first frame against 0.6 s, and 3.0 GB of heap against 161 MB. A million nodes is refused outright.

Six large issues cover the fix: #3247 (nodes drawn from a GPU position table), #3248 (layout to renderer with no per-node loop), #3249
(typed-array columns), #3250 (ID-buffer picking, edge picking, lasso), #3251 (edge trim and curves in the shader), #3252 (GPU label
sampling, glyph-atlas text). All six, and the small #3253-#3257, are delivered in 40 stages, each its own pull request into
master. **No breaking change is needed.** Two changes are optional and held for the owner (section 10).

1. **Two ways to draw a row, chosen per row.** A _batched row_ is drawn by a shared batch reading a GPU table; an _object row_ by today's
   code, unchanged. A row is batched when the batch supports all its paint needs, a set that grows stage by stage, so no feature is lost.
2. **The lazy facade is the existing `Node` and `Edge` class.** A batched row has no `Node` until someone asks, then gets the same class.
3. **A node batch is today's source mesh, redrawn**: a plugin on its `StandardMaterial` adds only the position, so lit looks hold.
4. **One RGBA32F texture is how positions reach a shader**, on both engines, for nodes and edges, in 2D, 3D and XR. The CPU array
   `ElementPositions` (the "lane") stays the truth, so `session.positions`, undo, save and context-loss recovery do not change.
5. **The new renderer is an option; the default stays today's.** `renderPath: "batched"` turns it on; `"objects"` is unchanged for every
   existing consumer. The graphty app opts in (stage 13) through its `cosmograph` experiment flag
   (design/ci/channels-pipeline/features.md), as does the comparison harness. The flag graduates (features.md, section 8) when stage 38
   decides the defaults.
6. **Prove before removing.** The spikes are done (section 5); batches first draw with the old meshes kept as hidden proxies.

## 2. Facts from the code that shape this

- **A lit batch needs real thin instances**: with `forcedInstanceCount`, a `StandardMaterial` wants `world0..3` (`mesh.js:220`).
- **The plugin hook is `CUSTOM_VERTEX_UPDATE_WORLDPOS`**, after `finalWorld` and before `gl_Position` (`default.vertex.js:138`). Thin
  instances compute normals by another formula (`:129-130`), so the plugin rewrites that line (section 4.2).
- **Effect layers and the outline renderer have no plugin path**, so glow and flat-outline rows stay object rows, permanently.
- **Babylon keeps thin-instance buffers on the `Geometry`** (`mesh.js:1392-1396`), so a batch needs its own `Geometry.copy()`, which also
  survives disposing the source.
- **Babylon's move pick runs only with a registered action** (`scene.inputManager.js:635`), so not building the shared node
  `ActionManager` is the whole saving.
- **Reads.** `updateTextureData` makes partial float uploads on both engines. `Engine._readPixelsAsync` (`engine.js:606`, reading the
  bound framebuffer) serves WebGL hover. On WebGPU every read is asynchronous. No press needs a read (section 4.4).
- **The measured layout numbers are WebGPU compute with WebGL drawing**, and VR and AR need WebGL, so no device is shared there and the
  upload path is the main path. The slow part is the frames, not the per-node work after readback: at 100,000 nodes one
  `publishPositions` took 13.7 ms before stage 1 and takes 4-6 ms after it, and `stepAsync` does not publish at all. A step with readback
  takes about 800 ms while frames draw and 5 ms with the frame loop stopped, because the readback queues behind the frames on the card.
- **`pass` is a reserved word in WGSL**, and `edgeJoinShader.ts:591` uses it, so on master `renderer="webgpu"` with any edge draws a blank
  canvas. A fix is landing separately; stages 8 and 15 need it.
- **Device loss on the WebGPU engine is a defect today**, with no sharing and no layout (stage 39). Babylon does not await `initAsync`
  when it restores, so it rebuilds on the lost device and `onContextRestoredObservable` fires on the old one. After `device.destroy()` a
  stock page floods validation errors; after a GPU process crash it dies in `createBuffer`. Two more gaps found building stage 39: the
  WebGPU engine never calls `scene._rebuildGeometries` (only the WebGL `Engine` does), and `Mesh._rebuild` keeps the per-render-pass copies of
  a mesh's per-instance buffers, the only ones WebGPU uses. A write to one from the lost device is a validation error after a destroy and
  aborts the renderer after a crash. A resting loop also wakes by accident after a restore, while the rebuilt effects compile; the event is
  what does not depend on that, and what has the batches upload again. After a second crash Chromium refuses the page an adapter (domain
  blocking of 3D APIs), which the engine reports as `E_DEVICE_LOST` with `rendererStatus.drawing` false.
- **The graphty app reads no `.mesh`, `getScene`, `getNode` or `getNodes`**; it touches the element only through the session.
- **Stale issue text**: #3251's radial table is dropped; #3248's "no CPU copy" means none on a frame's path.

## 3. Rows and options

A row is an object row for one of two reasons. _Paint or view_: `batchableOf(paint, view)`, one pure function in
`managers/StylePainter.ts` with a test table, says the batch cannot draw it. `view` is the scene state paint does not hold: lighting
(until stage 14 also `depthIndependentSize` and a map's `nodeScale`, which a batched row now carries in its matrix). The row returns at the repaint that makes it eligible, and a change to a `view` input runs one
re-batch pass. _Mesh read_: someone holds its mesh; this is permanent. An _object edge_ is the same idea for edges; the fast form is a
_pulled edge_.

New option `renderPath` (attribute `render-path`, read but not reflected, so an element on the default gains no attribute), additive:

- `"objects"`, the default: every node and edge is today's object. No picture, event or Babylon object changes.
- `"batched"`: eligible rows are batched and eligible edges pulled. Reading `Node.mesh` makes that one row an object row; `getScene()`
  returns a scene with batches instead of per-row meshes. Changing the value live rebuilds in the existing dispose-and-repaint order.

New read `graph.rowCounts`: `{ batchedNodes, objectNodes, pulledEdges, objectEdges }`. Tests and the harness assert on it, so a row that
quietly left the fast path fails a run.

## 4. Architecture

### 4.1 Row tables (`render/RowTable.ts`, one per Graph)

Two RGBA32F textures, width 1024, read by `texelFetch` at `(row % 1024, row / 1024)`, as `shaders/runtime/nodePrograms.ts:87` does.
`rowPosition` (16 MB at a million rows, with a CPU copy) holds x, y, z and w, a multiplier on the row's size: 1 normal, 0 hidden or
unplaced, between while a particle transition shrinks it. It is the _drawn_ position, which is not always the lane:

| Case                         | Drawn value                                | Written by                             |
| ---------------------------- | ------------------------------------------ | -------------------------------------- |
| Normal                       | Lane row                                   | Typed repack when `lane.changes` moved |
| 2D                           | Lane row with z = 0                        | The repack                             |
| Layout transition            | Eased position; w for a `particles` shrink | Transition runner, rows in motion only |
| Drag, group set-back         | That place                                 | `setMeshPosition` funnel, one texel    |
| Unplaced (NaN), filtered out | w = 0, vertex collapses                    | The repack; a mask change              |

`rowExtent` holds 3 texels a row, written at repaint, never on a move: drawn scale, round radius, half extents and outline half extents
(x, y, z each), border reach, flags. A still graph uploads nothing. Tables follow `snapshot-replaced` and join `batchUploadFrames`, so
context restore re-uploads.

As built (stage 4): the tables exist only once `Graph.openRowTable` is called, so a graph on `"objects"` pays one null check a move; stage 8
opens them under `"batched"`. Every drawn case except the repack reaches a row through the `setMeshPosition` funnel, which compares the place
with the lane: a row drawn off its lane is _held_, and the repack skips it until the funnel lands it on the lane again, so a drag, a transition
and a group set-back need no signal of their own. A particle shrink is the one extra write, `Node.drawShrunk`. Uploads go in whole texture
lines (16 KB), not single texels. `rowExtent`'s texels are scale, round radius, border reach, flags; half extents and bounding radius;
outline half extents and a spare. A freeze remaps rows from the report, then measures any node whose row is new.

`rowBounds` is a CPU `Float32Array` of 16 bytes a row (16 MB at a million), the table picking walks: x, y, z and bounding radius times w, so
radius 0 means hidden. The same writers keep it current. Reading radius from `rowExtent` instead walks 64 MB a scan and misses the bar.

### 4.2 Node batches (`meshes/NodeBatch.ts`, #3247)

`MeshCache.batchFor(key)` makes a sibling `Mesh` keyed as sources are, sharing the source's material with its own `Geometry.copy()`. It
cannot be the source: a mesh with thin instances ignores ordinary instances. The batch is under `graph-root`,
`alwaysSelectAsActiveMesh`, not pickable, disabled at zero slots (Babylon draws a count of zero as one plain mesh), and in `scene.meshes`.

The batch co-owns the material: `prune` skips a source whose batch has live slots, `forget` and `clear` dispose both, and `sourceFor(key)`
gives a source with no instance (stage 5 adds it, before any batch exists, for the row scan). The lighting walk skips batches, or the outline would draw every row at the root's origin. `#drawOverMap`
adds batches to its node meshes.

Per instance: `matrix` (local scale only), `instanceColor` (`INSTANCESCOLOR` feeds `baseColor` as today's `VERTEXCOLOR` does but also
multiplies alpha, so alpha stays 1 until stage 14) and a float `graphtyRow`, exact to 16.7M: 84 bytes a row. Every matrix is identity today,
since size is baked into the source mesh, so a batch whose rows are all identity drops `matrix` for a row-only attribute: 20 bytes a row
(stage 28; unproven how the plugin stands in for `world0..3`, so `render-parity` decides). A batch with per-instance size keeps 84.

`RowPullPlugin` (GLSL and WGSL) places the row and applies w. It is attached when the material is made (a frozen material stops evaluating
defines); its define turns on per mesh, so object rows share the material. It rewrites Babylon's thin-instance normal line to the ordinary
instance line, `vNormalW=normalize(normalWorld*normalUpdated);`, by a `!regex` custom code key as in `InstanceColorShading` (the WGSL source
has a space after the `/`, so the pattern needs `\s*`). With it any scale in `matrix` passes parity at 0 pixels; without it non-uniform scale
differs by 85 levels.

**Slots stay in row order**, opaque and translucent alike: draw order decides which of two intersecting solids wins a depth tie, so
swap-with-last breaks parity. Freeing a slot stays one write: `graphtyRow` becomes -1, a hole, which the plugin collapses as it does w = 0.
(The hole is in the slot, not the table: a row leaving for the object path keeps w = 1 for its edges.) A row coming back refills its own
hole. At a repaint, once holes pass a quarter of the slots, one typed pass compacts them, preserves ascending row order and uploads once;
never during a drag. A row whose hole is gone rewrites its batch's list at that repaint. There is no per-instance culling.

As built (stage 8): `MeshCache.batchFor` takes the source mesh, and `NodeBatches` keeps one group per source. A proxy is hidden by
`source.visibility = 0`, as `NodeShaderDrawing` already does: `InstancedMesh.visibility` is the source's, so one write hides every row of a
source, while `isVisible`, `isEnabled` and `isPickable` stay as they were, so `scene.pick`, the element's picks and XR all land on the proxy.
That is why `raySelectionPredicate` needs no change while proxies exist: Babylon leaves it unset and its default reads `isVisible`, and
`node-batch-xr.test.ts` shows both eyes equal, laser included. A read of `mesh.visibility` answers 0 until stage 11. `RowPullPlugin` is
attached when a batch is built, not when the material is made, thawing a frozen material for the moment: `render-path` can change live and
materials then already exist, and with the proxies kept, neither direction rebuilds a row. A row whose number the table does not hold yet
keeps its whole source on the object path until the freeze brings it in; a group measures its highest row at the flush, not at the freeze, since a
node the freeze removed has lost its row but stays a member until it disposes. `batchableOf` is an allow list of style keys, so a new style option
stays an object row until a batch is proven to draw it.

As built (stage 11, first pull request): `Node.mesh` is an accessor over the private field `#mesh`, which is what `Node.ts` reads,
and `releaseNodeMesh` reads it through a module-private reader set in the class's static block. `Edge.ts` reads a node's mesh only on
the object path, through `drawnPickMesh`. `local/node-mesh-funnel` now covers `Node.ts` and `Edge.ts` too, so the only read of the
accessor left in `src` is `Graph.getNodeMesh`. Nothing changes yet for a consumer's read: the accessor answering by making the row an
object row, and batched rows losing their mesh, are the stage's later pull requests. One consequence for tests: internal code no
longer reads the accessor, so `edge-trim-mirror.test.ts` cannot count reads of it (the lint rule does not help either: it matches
only `.mesh`, not `drawnPickMesh`). The test instead sets each batched row's mesh to a counting proxy for the call and counts every
use of it, however it reaches `#mesh`; with the batched branch of `getInterceptPoints` removed it counts 436 uses on one edge.

As built (stage 11, second pull request): the first read of `Node.mesh` (or `getNodeMesh`, which reads it) sets a private flag
and syncs the node with `NodeBatches`; `batchableIn` answers false while the flag is set, so the row is an object row from
the next flush and stays one, through repaints and render-path changes. Setting `mesh` does not set the flag. Its source
group then leaves the batch, since hiding is still all or nothing per source until the proxies go. Tests that look at
internals read `drawnPickMesh`, which does not set it.
The `local/node-mesh-funnel` lint rule covers `stories/**` and `test/helpers/*.ts` too, so no play function or shared
helper sets the flag and turns a batched render-parity or forced-batched run into an objects one. Individual files under
`test/browser` and `test/interactions` still read `Node.mesh` (365 reads in 109 files when this was written); each such test
runs those nodes on the objects path even in the forced-batched project.

As built (stage 11, third pull request, first commit): `NodeBatches` now calls `Node.drawInBatch` -- with the source when it
settles a group onto the batch or syncs a row into a batched group whose row the table holds, with null on leave, forget,
and at the start of every sync (so a repaint that moves a node to another source is read from its mesh, not the batch).
So a batched row's `drawn*` reads, edge ends and ray hits come from the row tables while the proxies still exist.
`RowTable.moves` counts every write that can move a row (a repack from the lane, `place`, a freeze, a clear), and
`nodesMoved` skips batched rows while it is unchanged since the last walk: a frame at rest calls `centerOf` for no
batched row. This is a correction to the row: `lane.changes` alone is not enough, since an eased or dragged row is
`place`d off its lane row without the lane changing; `node-batch.test.ts` holds a glide at its midpoint and checks the
edge is drawn where the objects path draws it. The node loop itself still visits every node. Batched rows still hold
their mesh: removing it is the stage's remaining work.

As built (stage 11, third pull request, later commits): `Node.drawInBatch(source)` swaps a batched row's instance for a plain
`TransformNode` anchor (position, scaling, rotation, parent, metadata, enabled state and children move across) and disposes
the instance; `drawInBatch(null)` rebuilds the instance from the last mesh key and style and moves everything back. So
`NodeBatches.sync` no longer calls `drawInBatch(null)` first: it reads `Node.paintedSourceMesh`, the source recorded when
the mesh was built, and releases the row only when it is not batched. Reading `Node.mesh` gives a batched row its mesh
back at once. `drawnPickMesh` is null for a batched row; a row pick answers with `drawnAnchor`, which carries the
metadata, so `pickAsDrawn` and `DrawnHit.mesh` return a `TransformNode`. Bounds of a meshless row come from the source's
local box at the anchor's world matrix (`drawnBoundingInfo`). A meshless row is still batchable (`batchableIn` accepts a
null mesh), and `RowTable.hide` leaves a shrinking row's W alone when it was and stays drawn, so rebuilding a row's
instance mid-shrink does not draw it whole.

As built (stage 11, third pull request, XR laser): `src/xr/laserOnRows.ts`, started and stopped with each XR session.
Babylon's laser (`WebXRControllerPointerSelection`) picks with `scene.pickWithRay`, which sees no meshless row. At the
head of `onXRFrameObservable` each controller's ray goes through `pickRayAsDrawn`'s scan; when it lands on a meshless
row, an instance of the row's source, named and labeled as the row's mesh was, is parented to the row's anchor with an
identity local transform (an instance starts at its source's place, which a batched source keeps far below the scene).
An observer at the tail of the same observable takes it off again, so it exists only while Babylon's laser picks:
it is never drawn (its visibility is the batched source's 0, and it is disabled before the frame renders) and no
other pick sees it. Three corrections to section 4.4's text: there is one stand-in per controller, not one, since
each controller casts its own ray in the same frame; it is admitted by Babylon's default predicates
(`enablePointerMoveEvents` set), not through `raySelectionPredicate`; and `XRInputHandler` needed no change, as it
already picks through `pickRayAsDrawn`. A trigger tap selects a meshless row (Babylon's tap names it from the
stand-in's metadata) and a trigger drag moves it with no mesh built; `node-batch-xr.test.ts` drives both through
IWER.

As built (stage 12): `NodeBatches.roster` is the set a frame's walks visit under `"batched"`: every member a batch
does not draw, plus batched rows with a halo or context point enabled, plus batched rows the row table holds off
their layout place (`Node.walksEachFrame`), kept by `NodeBatches.rewalk` on every batch change, overlay change and
change of the held flag in `Node.setMeshPosition`. A held row has to stay on the roster: only `RowTable.place`
clears the flag and the repack skips a held row, and a drag writes the mesh before the layout, so a row
dropped while the layout publishes every frame would stay where it was dropped. It answers null, and the walks visit every node,
while some node is not yet a member. `Node.update` walks the roster and the group nodes, and the row table is
flushed in the same pass, so the edge walk and the framing measure read this frame's places; the moved-node
check on a frame at rest and the screen-width border check walk the roster too. A batched row's anchor
follows its table row only when read (`getPosition`, `drawnAnchor`, framing, bounds, the world matrix,
leaving the batch), stamped by `RowTable.moves`, with its world matrix recomputed, since stories read
`absolutePosition`. Correction to the row: the roster walk applies only on a frame whose layout step
published (`LayoutManager.steppedPublishes`). The position array is not always the engine's answer
otherwise: a static or snapshot layout computes its answer in `getNodePosition` (Graphviz placed every node
at the origin without that read), and d3 publishes a row when it is read. Frames that walk for a transition,
a zoom to fit or a redrawn arrangement still visit every node. Measured at 100,000 nodes (`benchmarks/results/stage-12`):
the moved-node and border walks, 3 and 4.5 ms of CPU a frame before, are gone from the profile; the moving
frame is 88 ms against 95 before at similar load, the still frame 87 against 90, both bound by the GPU.
The 10,000-node still frame stays 26 ms, all of it the card drawing 100,000 edges, so its 8 ms target
waits for the edge stages.

As built (stage 14, first pull request: per-instance size): a source mesh is still built per size, and its rows still
read their bounds, radius, edge ends and picks from it; what changed is which batch draws them. `NodeBatches` puts each
source's group in a family keyed by its look without the size (`Node.batchLook`: shape type, detail, texture, effect)
and its geometry's vertex and index counts, and the family's one batch is built from its first source. Every other
source joins only if `scaleAgainst` finds one factor that maps every vertex of the first source onto its own (normals
and indices equal), so a creator whose geometry does not follow its size gets a family of its own and draws as before;
that factor goes into the row's `matrix` (uniform, so the normal rewrite above keeps it at 0 pixels). A change to which
groups a family draws rebuilds its batch at that flush in the objects path's draw order: a source's rows after those of every
source drawn before it (Babylon sorts opaque sources by material, then by when it met them), each source's in row order. Plain
row order across sizes lost depth ties between rows of two sizes, invisible on SwiftShader and 5 to 57 pixels on the RTX in 2D
(#6287). For the same reason a source joins a family only when no other opaque family's source draws inside the family's span
and it draws inside no other's: one batch draws its rows together. A size ramp of one shape is now one draw; a size made live
after another shape's sources draws from a batch of its own.
`MeshCache.batchedSources` keeps a prune from taking a source whose rows a batch draws, since such a source has no
instance and no batch of its own; when the first source is disposed, its family dissolves and its groups find a family
again at the same flush. Nothing changes under `"objects"`: `NodeBatches` exists only under `"batched"`, and the prune
guard's set is empty without it.

As built (stage 14, second pull request): `PajekShapesAndMidLineArrows` failed only on `"batched"` because its play read
the shape-`none` node's source through `drawnPickMesh`, which is null for a batched row since stage 11; it reads
`Node.paintedSourceMesh` now, and both paths pass. A fact for the opacity pull request, from the code: a node's opacity
is its source mesh's `visibility` (`NodeMesh`, beside `material.alpha`), which a batched source gives up for 0, so a
translucent batch must carry its look's rest visibility. With that, translucent rows batched per look match in 2D, but
3D differs by about 600 pixels even with one opacity, and one batch per source breaks 2D as well: the batch's place in
Babylon's back-to-front order of translucent meshes is what differs, and it has to be settled before opacity batches.

As built (stage 14, third pull request: per-instance opacity): `batchableOf` takes a solid color at any opacity.
An opacity is in its source's mesh key, so each opacity is a source and a look of its own, and a translucent
source keeps a family of its own (no sharing across sizes): objects draw a translucent source's rows together,
and one batch across sizes would draw them in row order. The batch takes its source's rest visibility.
Correction to the second pull request's note, from the code: the order Babylon draws translucent meshes in
is not decided by distance here. Every source sits at y = -10000 and every batch at the root's origin, so the
back-to-front sort ties all of them and keeps the order they reach it in: a source's at its first instance
in `scene.meshes`, a batch's at its own place there. Batches were made in row order, sources in paint order,
which was the whole 563 and 654 pixel difference. `NodeBatches.orderTranslucent` puts a new translucent batch
before every translucent batch whose source was made later, so batches tie in their sources' creation order.
That stands in for the objects path's instance order, which repaint history can reorder; `render-parity`
decides. A batched row's opacity reads as `Node.drawnOpacity` (its mesh's visibility, or the batch's).

As built (stage 14, fourth pull request: z order): `batchableOf` takes `shape.zIndex` and `shape.drawOrder`.
Both are in the mesh key and, in 2D, baked into the source's vertices (`placeByZIndex` moves the geometry
back, `placeByDrawOrder` flattens its front half onto its level's plane); in 3D they change nothing. The
batch draws a `Geometry.copy()` of its family's first source, so it carries the bake. `batchLook` leaves
them out, but `scaleAgainst` compares every vertex, so a source at another level joins a family only when
one factor maps its baked vertices exactly, and otherwise gets a family of its own. Opaque rows at
different levels differ in depth, so no draw-order tie arises. This brings file styles' nodes onto the
batch: every imported file but graphty's own gives each node a `node.drawOrder` level.

As built (stage 14, fifth pull request: pictures): `batchableOf` takes `texture.image` (`node.texture`, a
picture on a built-in shape). The picture is in its source's material, as a color is, so the batch draws it
by sharing that material; `Node.drawnInstanceColor` gives a pictured row white, as `applyInstanceColor`
gives its instance, since a picture replaces the shape's color. `batchLook` adds whether the picture is
drawn: while it loads (or after it fails) the row's source is the plain shape's, with the same geometry, so
without that flag a loaded row joined the plain family and drew the plain material (42,864 pixels off).
`texture.icon` (which draws nothing) and the face picture `node.image` stay object rows.

As built (stage 14, sixth pull request: gradients): `batchableOf` takes any `texture.color`, linear and
radial gradients included. A gradient is a ramp texture in its source's material, and its start color is in
the mesh key (`StylePainter`), so each gradient is a source and a look of its own and its batch shares that
material. A gradient row paints no instance color (`paint.color` is null), so the batch writes white, which
leaves the ramp as the object row draws it. Nothing else changed: `batchLook` already carries the
gradient inside `texture`.

As built (stage 14, seventh pull request: screen-scale size): `batchableOf` no longer turns every row into
an object under `depthIndependentSize` or a map's `nodeScale: "screen"`; `BatchView` keeps only the flat
outline. The update loop still scales each node every frame through `Node.drawnScale`, which scales the
anchor and re-measures the row as before, and now also keeps `Node.wholeScale`, the view's scale without a
particle shrink (the shrink is the row table's w). When it changes, `NodeBatches.rescale` writes the
batched row's matrix as its family factor times that scale. The `Edge.capScale` mirror needed no code:
`drawnScale` of a batched row reads `RowTable.extentOf`, measured from the scaled anchor, so arrowheads,
edge trims and the row scan's picks follow the same scale. With the matrix left at the family factor, the
orbit case of `node-batch.test.ts` is 17,594 pixels off and the map zoom cases about 380.

Stays an object row: models, decorations, tables, group regions, glow, flat outline, outline ring, halo, borders, underlays, overlays,
shader surfaces and effects, rowless nodes, and before stage 31 labels and tooltips. Stage 14 widened the batch (see its row and the notes above).

### 4.3 Edges (#3251)

The join shader reads six points as attributes. A new define `EDGE_PULLED` builds those six values at the top of the vertex stage from
`gl_VertexID`, an edge table texture of two row numbers (8 MB at a million) and `texelFetch`; every later line is untouched, so the line
draws the same pixels (0 on all four renderer and API pairs), and a million-edge move uploads 1.5 MB, not 80 MB. **Pulled edges are one
non-instanced `gl_VertexID` draw on every renderer, never instanced**: instancing gains nothing on the RTX and is 4 to 6 times slower on
SwiftShader. The 14-vertex form needs an index buffer, 120 MB at capacity 2^20; expanded lines take 1,408 MB.

`repeatPerVertex` is deleted at stage 16, once pulled edges are the path: expanded lines die past 524,288 pieces on SwiftShader, which is why
software renderers cannot load a million edges. Object lines there then draw instanced as on hardware: 0 pixels different, 15-53% slower.

**The 6-vertex straight program is needed for stage 30's 40 ms frame**, the nearest this design comes to cosmos.gl's 29 ms at a million
nodes. The benchmark's million long edges take 83 ms on the RTX at 14 vertices
and 68 ms at 6, paying for pixels covered at 4x antialiasing, not vertices. With antialiasing off they take 60 and 20.8 ms, so 40 ms needs
that program and `antialias: false`, a picture change and so an option, off by default. On the RTX the program leaves one stray pixel in
some scenes (up to 58 levels), which SwiftShader, and so `render-parity`, cannot see; it follows the fragment stage. Stage 15 traces it. If it
survives, the program stays off and the million-node frame target is 100 ms, not 40 ms, unless the owner rules otherwise; stage 15
supplies a picture of the pixel for that ruling.

Pulled edges read `rowExtent`, so rows sized per view need their batched form (stage 14) before stage 16.

Trim is one GLSL include shared by line and cap shaders, with a TypeScript mirror for CPU readers:

| Edge                                 | Ends come from                                                             | Cached per edge       |
| ------------------------------------ | -------------------------------------------------------------------------- | --------------------- |
| Straight, no cap, gap or group       | Node centers                                                               | No                    |
| Straight, two round ends, or a box   | Closed form                                                                | No                    |
| Straight, other shape                | Two floats from `rowRayHitOn`; bounding radius while moving, exact at rest | Yes                   |
| Bezier, arc, fan, loop, great circle | Shader evaluates pieces i-2 to i+3, then today's miter and ownership code  | `t` range, run length |
| File and layout routes               | Per-edge slice of a route texture                                          | `t` range, run length |

As built (stage 6): `meshes/edgeTrim.ts` holds `EDGE_TRIM_GLSL`, a string a shader takes in by interpolation as it takes `edgeJoinShader.ts`, and
`trimEnds`, its mirror. `Edge.trimInput` gives both their numbers. `test/browser/edge-trim-mirror.test.ts` holds the mirror to
`getInterceptPoints` on every node shape, in 2D and 3D, and the shader to the mirror through transform feedback on WebGL2, both within 1e-4.
WebGPU was not run. Corrections to the table, from that test:

- An ellipse is not a closed form. `surfaceReach`'s ellipse is 0.88 off on a line through depth, which meets the slab's face, and 0.003 off across
  the view, which meets a facet. It takes two floats. A turned rectangle does too.
- A round end is closed only across from another round end. Across from anything else today's ray meets the sphere's facets, so that end takes a
  float as well, or it moves by up to the facet depth.
- 1e-4 holds near the origin only: at y = 3000 a float's spacing is 2.4e-4, and the shader takes rows as floats, so the test moves each edge to the
  origin before reading it back.
- The first row is `Edge.bareEnd`, not `getInterceptPoints`: a line with no cap never asks for a surface, so the include does not cover it, and a
  line with a gap and no cap leaves at `leaveNode`. Stage 16 needs both.
- A group's end in the include knows a box and an ellipse only. A group is `round-rectangle` by default, whose outline only the mirror reads, so an
  edge ending on such a group stays an object edge until something supplies that reach.

As built (stage 7): `Node.drawInBatch(source)` says a batch draws a row, from that shared source mesh, and `null` says it no longer does. No code calls it
yet: `NodeBatch` must, on sync and on leave, by stage 11 at the latest. Until then a row keeps answering from its mesh, which is right while it holds one.
Once a batch draws either end of an edge, `Edge.getInterceptPoints` answers from `trimEnds`. `Node`'s `drawnPosition`, `drawnWorldPosition`, `drawnScale`,
`drawnScaling`, `roundRadius`, `drawnHalfExtents` and `drawnSourceMesh` read the row, so every other helper of an edge's ends reads no mesh either; `reachOutline` is
keyed on the source mesh for the same reason. `test/browser/edge-trim-mirror.test.ts` holds both answers within 1e-4 on every shape, in 2D and 3D, with either
end or both batched, under a moved, turned and scaled graph root, and counts 0 reads of a batched row's mesh. Corrections, from the code:

- `rowRayHit` cannot give an end. It answers the nearest row, and an end's ray starts inside one node and may cross others, so `RowScan.rowRayHitOn(row, ray)`
  tests the one row, as `Ray.intersectsMeshes([mesh])` does.
- `rowExtent` keeps a shrunk row's whole size, as `RowTable.measure` skips it, so `RowTable.extentOf` multiplies by w. Hiding zeroes w, so a row both
  shrunk and hidden reads whole.
- `rowExtent` holds one scale, which is enough only because a stretched node (a group, a model) is never batched.
- `RowTable.measure` still reads the mesh, the one read left: `Node.measureRow` steps around the row reads so paint sees the mesh and not the table's own
  old values. Stage 11 has to measure from the source mesh and the style.

As built (stage 15, first pull request): `EDGE_PULLED` is in `meshes/edgeJoinShader.ts` and `PulledLineBatch` (`meshes/PulledLineBatch.ts`) draws
with it, from `CustomLineRenderer.createJoinedLineMesh({ pulled: true })`. No edge uses it yet: `Edge` joining it behind the internal switch, the
6-vertex program, the stray pixel, `render-parity` with the switch on and WebGPU are the stage's later pull requests. The draw is the join
template's 30 indices per piece, `piece * 14 + k`, so `gl_VertexID / 14` names the piece; the material declares no attribute. A piece pulls
only a straight line between node centres, written as `EdgeLineBatch.place` writes one (neighbours its own ends, run zero), so its vertex inputs
equal a placed slot's. A row of w = 0, or a freed piece (rows -1), puts every point at the origin, as a hidden slot does.
`test/browser/pulled-edge-lines.test.ts` holds it on SwiftShader WebGL with anti-aliasing, for screen, world and minimum widths: 0 pixels differ
from the placed line at rest, after every row moves (0 edge bytes uploaded), and with a row at w = 0 and a piece freed. Found building it: the
batch must not dispose its mesh with its textures, since `rowPosition` belongs to the row table.

As built (stage 15, second pull request): `Edge.createLine` pulls a line when the internal switch `pulledEdgesDefault` is on, the graph
keeps a row table (the switch opens it) and `Edge.pullsLine` passes: 3D, two different nodes, neither drawn as a group, `route`
straight, no head or tail cap or caption, no label words, no band color, and no style or line key beyond `line`, `label`, `arrowHead`,
`arrowTail`, `band`, `visible` and `type` (solid), `animationSpeed` (0), `width`, `color`, `opacity`, `minScreenWidth`. The test is made
when the line is built. One batch a look lives in `MeshCache.pulledBatchMap`, so a 2D switch clears it and rebuilds its edges as flat
lines. A pulled edge holds no slot: hiding writes rows -1, `update` rewrites its rows only when a renumbering moved them,
`drawnLine` answers from the two nodes' places, and `rowCounts.pulledEdges` counts it. `test/browser/pulled-edges-on-graph.test.ts`
holds a graph with the switch on to the placed picture, 0 pixels, at rest, after a mouse drag (0 edge bytes) and with an edge hidden,
on WebGL and WebGPU, and holds 2D to no pulled edge. `render-parity` with `VITE_PARITY_PULLED=1` compares the object loads with a
switched-on third: on WebGL 325 stories pass, but only 4 of them draw a pulled edge (309 edges), since a directed graph caps every
edge. Found building it: a pulled line follows the row table, which takes the layout's places, so a place written to the layout
engine and not yet to the node's mesh moves the line before the node; the update loop writes both in one frame.

As built (stage 16, first pull request): `Edge.pullsLine` passes on the `"batched"` path, read as the graph keeping node batches,
so `pulledEdgesDefault` is needed only to pull on `"objects"`. A line's rebuild test (`Edge.paintFrom`) compares whether it is
pulled with whether it should be, and `Graph` repaints every edge, then walks them, when the path changes live, so an edge moves
between a pulled piece and a placed slot both ways. `test/browser/pulled-edges-batched.test.ts` holds `"batched"` to the
`"objects"` picture, 0 pixels, at rest, after a mouse drag and across a live switch each way, on WebGL and WebGPU. `repeatPerVertex`
and the 1M-edge SwiftShader load are the stage's second pull request.

Correction from stage 16: this pull request cannot move the stage's targets, because the harness pulls no edge. `lean` is 2D, and a
2D solid line is a flat rectangle (`Simple2DLineRenderer`), which `Edge.pullsLine` refuses; `default` is 3D but every edge has a
head, which waits for stage 17. One `lean-m` run each under `"batched"`, RTX, interleaved: before (`benchmarks/results/stage-16-before`,
load average 5.4) moving 87.6 ms (p99 90.6), layout frame 942 ms; after (`benchmarks/results/stage-16`, 4.2) moving 86.9 ms (p99 89.5),
layout frame 997 ms, `rowCounts.pulledEdges` 0 in both. The 2D targets need a pulled 2D line, which no stage yet builds.

Also fixed in stage 16 (a `"batched"`-only defect already on master): a node source mesh whose batch group lost its last member
stayed in `MeshCache.batchedSources` until the next flush, but the cache prunes right after the repaint, before that flush, so a
toggled node size left one mesh and one material behind per look (`session-style-paint.test.ts` under the `forced-batched`
project). `NodeBatches.leave` now drops an emptied group's source from `batchedSources` at once.

Correction from stage 16: a pulled piece carries no age, so `Edge.pullsLine` also refuses while the scene's lines fade by age (the
timeline's `ageFade`), and `UpdateManager.followAgeFade` repaints every edge when the fade turns on or off while node batches exist.
Without it, `"batched"` drew every plain edge unfaded (`edge-age-fade.test.ts` under `forced-batched`).

As built (stage 16, second pull request): `EdgeLineBatch`'s expanded form (`drawsExpandedLines`, `forceExpandedLines`,
`repeatPerVertex`) is deleted, so every renderer draws a placed batch's pieces as instances. This changes no pixel on
either path, but object lines on SwiftShader draw slower again (the #3095 table in `design/edges/sharp-corners.md`).
`test/browser/million-edge-lines.test.ts` places a million pieces in one `EdgeLineBatch` and pulls a million in one
`PulledLineBatch`, and holds both to no GL error and the millionth piece drawn on whatever renderer the browser has.
Before the deletion it failed on SwiftShader with `GL_INVALID_OPERATION` (1282) on the placed batch. Correction: a
frame of a million lines that each cross the canvas takes about 45 s on SwiftShader, from fill rather than from the
draw, so the test draws all but the last as specks. `test/browser/million-edge-element.test.ts` holds the bar through the
element: a `"batched"` element loads a million edges (all pulled) on 1,416 nodes and draws the millionth with no
GL error, about 55 s on SwiftShader, almost all of it the load.

As built (stage 19): a pulled piece carries its own look, so color, width and opacity key no batch.
`EdgeMesh.pulledBatch` keys on the minimum screen width and the pass only (`edge-pulled|<minScreenWidth>|opaque`,
`translucent` or `unblended`: a line under full opacity draws in the transparent pass, as the plain line's batch does,
and a line with blending off neither blends in place nor goes there). A translucent batch reaches the transparent pass
through its material's `needAlphaBlending`, never through its mesh's `visibility`: the mesh is shared, so the first
edge's opacity would be every edge's, and an opacity of 0 would stop Babylon drawing the batch at all. The edge table
takes two texels a piece, (source row, target row, width, opacity) then (red, green, blue), written by
`PulledLineBatch.setRows` and `setLook` when an edge joins or restyles, never on a move. The shader reads them as
`pieceWidth` and a flat varying `vLook` in place of the `width`, `color` and `opacity` uniforms, with the values
`createStaticLine` would hand a material, so the pixels are the same. `Edge.drawnLine` keeps answering each edge's own
look name and visibility. `test/browser/pulled-edge-look.test.ts` loads 1,000 edges of 1,000 colors, four widths and
two opacities: the `"objects"` path draws at least 1,000 draws, `"batched"` at most 8, 0 pixels apart, and a restyled
edge rewrites its piece with no draw more, on WebGL and WebGPU. Only `"batched"` (or the internal switch) pulls an edge,
so `"objects"` is untouched. Correction: the edge table is 32 bytes a piece, not 8, so 32 MB at capacity 2^20, not 8 MB;
a move still uploads no edge byte.

As built (stage 20, first pull request): the GPU trim pass is measured, not built into the element.
`test/browser/edge-trim-gpu.bench.test.ts` (`browser-bench`, skipped without `GRAPHTY_BROWSER_GPU`) runs it as a WebGL2
fragment pass, one texel per edge holding both ends' reach (an RGBA32F target), each a ray from the node's center toward
the other node against the shared shape's triangles (an RGB32F texture, a corner and two edges each), keeping the farthest
crossing no farther than the other node, the one a ray from that node meets first. Against it, `RowScan.rowRayHitOn` per
end as `Edge.interceptPointsFromRows` casts it, timed on 50,000 edges and scaled. Both are held to the same ray in float64.
100,000 nodes on a 2D plane of side 4000, 1,000,000 edges (one in a hundred between overlapping nodes), RTX 4070 SUPER,
load average 11.6-12.9:

| Shape        | Triangles | CPU rays, 1M edges | GPU pass | Pass and 16 MB readback | CPU off float64 | GPU off float64 |
| ------------ | --------- | ------------------ | -------- | ----------------------- | --------------- | --------------- |
| tetrahedron  | 4         | 832 ms             | 1.9 ms   | 17.7 ms                 | 4.9e-3          | 4.0e-7          |
| dodecahedron | 36        | 1,962 ms           | 6.1 ms   | 21.5 ms                 | 7.6e-4          | 3.4e-7          |
| cone         | 96        | 4,814 ms           | 12.2 ms  | 31.4 ms                 | 3.1e-3          | 5.0e-7          |
| torus        | 578       | 17,928 ms          | 7.6 ms   | 15.8 ms                 | 1.4e-4, 4 flips | 2.2e-7          |
| torus knot   | 8,192     | 278,728 ms         | 90.7 ms  | 99.4 ms                 | 1.2e-5          | 2.6e-7          |

A flip is an end, of 100,000, where one path hits and float64 misses or the reverse; the pass has none. The CPU path's
error is its own: Babylon carries the ray into the node's space in float32 from an origin at the far node, up to 5,600
away, where the pass starts at the center. So the pass beats the CPU path at a million edges by 90 to 3,000 times and is
nearer the exact ray, which also means that on large coordinates it can differ from the `"objects"` path, which casts the
CPU's ray, by that path's own error (5e-3 world units here, far below a pixel at the harness's zoom).

Correction from stage 20: the section 7 pixel bar cannot be run on the pass yet, so it is not adopted. No shader reads a
trimmed end on master: a pulled line has no cap and no gap (`Edge.pullsLine`), so it runs center to center and needs no
reach, and the trim include is still read only by its CPU mirror. The two floats per pulled edge first have a reader in a
pulled cap (stage 17), so stage 20 depends on 17 as well as 7 and 16. Until then the per-edge rays left on a move are those
of object edges with a cap whose end is batched, through `Edge.interceptPointsFromRows`; the stage's later pull request
caches their two floats at rest and takes the bounding radius while moving, keeping the CPU path as the reference and as
the fallback for meshes too heavy for the pass (at 8,192 triangles a pass takes 91 ms, more than a frame).

As built (stage 20, second pull request): an edge placed because an end moved (`Edge.endsMoving`: a placed end
changed, not a first placement or one after `invalidatePositionCache`) gives a batched end that only a ray reaches its
node's bounding radius, the length of `drawnHalfExtents`, and casts no ray; it tells `UpdateManager.endsByRadius`. Once
`STILL_PASSES` (8) edge passes in a row place no edge that way, `UpdateManager.settleEnds` invalidates and places those
edges again, measured by `rowRayHitOn` as before, and a pending-work entry ("sizing") holds `waitForStableFrame` until
then. Only a batched end takes the radius, so `"objects"` draws as on master. `test/browser/edge-ends-cached.test.ts`
drags the middle of seven `man` figures, each edge capped, on `"batched"`: 0 rays over 8 mouse moves (96 before), and
at rest 0 pixels differ from the `"objects"` picture after the same drag (2,244 with the re-measure switched off).
Correction: the plan cached the two floats at rest for a shader to read; nothing reads them yet (stage 17), so the
measured end is placed straight into the cap and line, and keeping the floats waits for their reader. An end that
moves while another drag rests is measured with the rest of the set: one quiet stretch of passes measures them all.

As built (stage 17, dark): `PulledCapBatch` (`meshes/PulledCapBatch.ts`) draws 3D billboarded caps with `CAP_PULLED` in
the cap shader (`FilledArrowRenderer.applyPulledShader`): a cap is its two rows, head end last (a tail is the head of its edge
turned round), its gaps and how far its centre sits behind its tip, and the shader stands it where `Edge.placeArrowHead` would
over `EDGE_TRIM_GLSL`'s ends, reading `rowExtent` for scale, round radius and border. Where the ends meet nothing (overlapping
nodes) it stands the tip at the target's box, as `Edge.placeArrowFromCentres` does. **It is switched off**: the batch cannot be
built while the internal switch `pulledCapsOn` is off, which it is on every render path, so every edge, batched or not, keeps
drawing its caps as objects and no picture changes. `test/browser/pulled-arrow-caps.test.ts` turns it on and holds 30 pulled caps
to the placed ones on SwiftShader WebGL: 0 cap bytes uploaded on a move, and a known, counted difference -- 3 pixels at rest, 1
after a move, 1 with a row at w = 0, each by one anti-aliasing sample (at most 64 levels) -- asserted exactly, so a change in it is
a change in the picture. The `render-parity` bar is not widened. Not a depth tie: with one cap per head row each differing pixel is
a cap's tip against the background (the placed cap covers one sample of it, the pulled cap none; picture in section 10), and they
stay put when the shader takes the direction from the centres. So the GPU's float32 place differs from the CPU's float64 place by
enough to move a sample; the trim include was held to 1e-4 (stage 6), which is not pixel-exact. Caps meeting at one node also tie
in depth, which a float's last bit settles. Turning pulled caps on is the owner's question in section 10; stage 20 may build on
the dark caps meanwhile.

As built (stage 21, first pull request): `meshes/pulledCurve.ts` holds a lone curve's path (`line.bezier`) in plain numbers and
as `PULLED_CURVE_GLSL`, for the pulled curve to come. No edge draws with it yet; every curve is still an object edge.
`bezierSamples` is `EdgeMesh.createBezierLine`'s samples, `curveSpan` the numbers `Edge.placeRoute`'s cut leaves (samples,
first sample outside the source, pieces, and how far along each cut chord the path starts and stops), and `curvePathPoint`
any point of the cut path from the two centers and those numbers. `test/pulled-curve.test.ts` holds the mirror to the object
path's cut curve within 1e-9 on 400 seeded edges between spheres, chords along z among them; `test/browser/pulled-curve-glsl.test.ts`
holds the GLSL to the mirror within 1e-4 through transform feedback on WebGL2. WebGPU was not run. Corrections to the table, from the code:

- A curve's ends are not points of the cubic at a `t` range. `Edge.placeRoute` keeps the samples outside both nodes and cuts
  on the straight chord between the last sample inside and the first outside (`crossingOf`), so what is kept per edge is a
  sample index and a fraction along that chord at each end, plus the sample count (from 10 to 64 by length). The pieces a curve
  draws with change as its nodes move, so a pulled curve holds a run as long as its longest cut.
- A fanned curve's shape depends on the other edges between its two nodes (`DataManager.drawnBundle`), which change without
  the curve being rebuilt, and `Edge.pullsLine` is read only when a line is built. So the first kind pulled is a curve that
  does not fan (`line.fanned: false`), or a lone fanned curve once a bundle change rebuilds its members.
- A curve whose center lies outside its own node (`span.first` 0) leaves from `Edge.leaveNode`, which the mirror does not
  cover: `curveSpan` answers null and such an edge stays an object edge.

Lone curves are pulled on `"batched"` in the same pull request. `Edge.pullsLine` takes `line.bezier: true` with
`line.fanned: false` (no `arcRadius`, `supportModel` or gap, as before, since those keys keep any edge an object edge), in 3D
only. Such an edge goes into a curve batch of its own (`EdgeMesh.pulledBatch` keys it `|curve`; the mesh compiles with
`EDGE_PULLED_CURVE`), whose pieces take four texels: (source row, target row, width, opacity), (red, green, blue, point),
(samples, first, pieces, startAt), (endAt). The shader picks the piece's six points along the cut path by
`EdgeLineBatch.writeFlat`'s neighbour rules and sets `run` to zero: a solid line that does not taper never reads it
(`perTotal` is 0 and the pattern branch is off). `Edge.pullCurve` writes the span from `placeLine`, so it is refreshed on
every placement, which a moved end causes; it takes pieces while a cut needs more than the edge holds and never hands them
back, so an edge holds a run as long as its longest cut, and a piece at or past the span's last point draws nothing. A
straight pulled batch keeps two texels a piece and draws as before. `test/browser/pulled-curves-batched.test.ts` draws nine
lone curves and one fanned curve (which stays an object edge) at 0 pixels against `"objects"`, at rest and after a mouse
drag, on WebGL and on WebGPU (SwiftShader).

Corrections, from the code:

- A curve whose span is null on a later placement (its nodes come to overlap, so no sample is outside both) draws nothing
  when pulled, where the object path draws a straight line between the cut ends; the edge is not moved back to an object
  edge, since `Edge.pullsLine` is read only when the line is built.
- Moving a node still writes edge bytes for a pulled curve: its span changes with its length, so every piece of a moved
  curve is rewritten (16 floats a piece, against the object path's slot plus its matrix), and the CPU still samples the
  curve to find its cut. The measurement on 100,000 curves waits for a curve scenario in `benchmarks/compare`.

As built (stage 21, second pull request): a fanned curve alone between its two nodes is pulled too, on `"batched"`.
`Edge.pullsLine` takes `line.bezier: true` with `line.fanned` unset or true when no other edge joins the two nodes in
either direction (`Edge.aloneBetween`, asked of the store through `DataManager.getEdgesBetween`, since
`DataManager.drawnBundle` works its answer out over the whole edge set once per change and an edge built during a load
would pay that per edge). Such a curve draws `EdgeMesh.createBezierLine`'s curve, as a lone curve does. A change to the
edge set already re-places every edge; on that placement a fanned curve whose answer changed is built again
(`Edge.repullLine`): a pulled curve that gains a parallel edge becomes an object edge and fans, and one whose parallel
edge goes is pulled again. Neither draws caps, so only the line is rebuilt. `test/browser/pulled-curves-batched.test.ts`
adds and removes a parallel edge on a pulled fanned curve: 0 pixels against `"objects"` with it and after, the bundle's two
edges object edges while it is there, every curve pulled after, on WebGL and WebGPU (SwiftShader). Still object edges: a
curve in a bundle of two or more, a curve with caps, `arcRadius`, `supportModel`, `fanSpacing` or a gap, routes
(`line.route`), bends, and self-loops.

As built (stage 21, third pull request): a curve fanned out of a bundle is pulled too, on `"batched"`, so every curve
(`line.bezier`) with no caps, `arcRadius`, `supportModel`, `fanSpacing` or gap is pulled, whatever shares its two nodes.
A fanned curve's shape is `edgeRoute.fanArc`'s quadratic, which is set by the two centers and one signed number: how far
its middle bows to the left of its own chord in the x-y plane (`fanOffset`, negated for an edge drawn against its
bundle's first). `Edge.pullCurve` works that bow out on each placement (`Edge.fanOf`, the code `Edge.bundleRoute` uses),
and `curveSpan` cuts the arc as it cuts a lone curve, so the span gains `bow`, null for a lone curve. The fourth texel
of a curve piece is (endAt, bow, 1 for an arc, unused), and the shader samples a quadratic or the lone cubic by that
flag. The middle of an evenly spread bundle (bow 0) is the 2-piece arc through the midpoint, the object path's route
there. Since the bundle no longer decides whether a curve is pulled, `Edge.aloneBetween` and `Edge.repullLine` are gone:
a change to the edge set re-places every edge, and that placement writes the new bow. `test/pulled-curve.test.ts` holds
the arc mirror to `fanArc`'s cut within 1e-9 on 400 seeded edges, both ways round, bow 0 among them;
`test/browser/pulled-curve-glsl.test.ts` holds the GLSL to it within 1e-4; `test/browser/pulled-curves-batched.test.ts`
pulls a bundle of five between two nodes (a curve that does not fan, three fanned curves one drawn the other way, and a
straight edge) at 0 pixels against `"objects"`, at rest and after a mouse drag, and a fanned curve that gains and loses
a parallel edge, on WebGL and WebGPU (SwiftShader). Still object edges: a curve with caps, `arcRadius`, `supportModel`,
`fanSpacing` or a gap, routes (`line.route`), bends and self-loops.

An object edge has labels, gradients, effects, halos, or anything not yet pulled. `UpdateManager` walks only those. Straight patterns stay
on `PatternedLineMesh`, permanently. Caps read the same rows and include, so a cap and a line end cannot disagree.

### 4.4 Picking (#3250)

`pickAsDrawn` stays the single entry, so a click and `elementAt` cannot disagree. Three answers merge behind it:

- **Object meshes** (labels, tooltips, object rows) keep `scene.pick`, cheap now that `scene.meshes` is short.
- **`shapeRayHit(row, x, y)`**, the row scan. It takes the screen point because `scene.pick` derives a separate float32 ray per mesh from
  it, so it matches `scene.pick` where a world ray cannot. It walks `rowBounds` nearest first with the radius padded by 1.001, stopping past
  the best hit by 0.001 relative. Each candidate gets Babylon's own narrow phase on the shared source mesh from `sourceFor(key)`: build the
  row's translation-and-scale matrix, `scene.createPickingRayToRef(x, y, world, ray, null, false)`, then
  `source.intersects(ray, false, undefined, false, world, false)`. Closed forms and a hand-written triangle test disagreed at about 50,000
  of 2,120,000 points; this form at 0. It needs no frame or GPU, and is the oracle ID answers are tested against. `rowRayHit(ray)` is
  the same walk for a world ray: XR, where it stands in for `pickWithRay`. Edge ends take `rowRayHitOn(row, ray)`, one row with no walk (4.3).
- **ID targets**, for hover only: RGBA8 with row + 1, no antialiasing. One for node rows with depth; one for edge rows with none, as today's
  edge hit ignores depth. Redrawn when a read finds them stale. Edges read a 13 x 13 window, then today's exact distance test.

**Same-depth ties.** 2D flat rows share a depth. The rule is `scene.pick`'s: nearest float32 distance, and on an exact tie the lower row. It
holds only while row order equals `scene.meshes` order, which the tests assert. The scan reproduces it by running the same arithmetic. An ID
target settles overlap by draw order, so it probably cannot (inferred; none was built). So a press never reads one: the scan is 2.7-3.0 ms
median at a million rows, narrow phase included, and no synchronous read is needed. Hover may name the other row of a same-depth overlap,
which the agreement test lists. `"objects"` answers do not change.

| Question                                      | WebGL                     | WebGPU                    | XR, NullEngine, a transition |
| --------------------------------------------- | ------------------------- | ------------------------- | ---------------------------- |
| Hover                                         | Window, async             | Window, async             | Scan in a transition         |
| Press, release, `elementAt`, `groupOutlineAt` | Row scan, typed edge scan | Row scan, typed edge scan | Row scan                     |
| `screenToWorld`                               | Row scan                  | Row scan                  | Row scan                     |

A transition click scans `rowBounds` inside `atLayout`, whose move through the mesh funnel puts each row at its destination and whole size
for the length of the pick. Batched rows' expand clicks and `hoverCursor` go through
`NodePointerRoster`. Under `"batched"` the shared `ActionManager` is built at the first object row; until then Babylon's move pick does not
run, and any consumer action turns it back on.

As built (stage 5): every pick lives in `render/PickService.ts`. The twelve sites are `pickAsDrawn`, `pickNodeId`, `alongRay`, the pointer
predicates, the close-label hover, `screenToWorld`, the edge pick, the XR drag start, and their callers on press, release, background click
and `elementAt`. `groupOutlineAt` is a 2D test in `RenderManager` and stays there; `Edge.ts`'s own ray waits for stage 7. `RowScan` exists once
`Graph.openRowTable` runs, so `"objects"` graphs take the old path unchanged. With a table open, a press answers from the scan (stage 10
removed the shadow `scene.pick` and its `shadow.differ` counter; `row-scan-parity.test.ts` compares with `scene.pick` directly); a pick
during a transition and an XR ray take the merged answer. `screenToWorld`
stays on `scene.pick` until a row has no mesh. The narrow phase places rows under `graph-root`: the walk takes the ray into the root's space,
and each candidate's matrix is multiplied by the root's, so an XR gesture changes nothing. Four things differ from the text above:

- A row's per-axis scale comes from `Node.drawnScaling`, read for candidates only. `rowExtent` holds one scale and one spare float, and a
  group's box is stretched, so the row with no `Node` (stage 30) needs a place for two more floats. The source likewise comes from
  `node.drawnSourceMesh`; `MeshCache.sourceFor(name, creator)` is the half of `get` that makes no instance, there for rows with no mesh.
- Models stay on `scene.pick`: `createModelInstance` tests only the box, on the instance, which the source's triangles cannot reproduce.
  `Node.drawnByRowScan` is false for them and the scan leaves them to the mesh pick. Every other kind passed: all 52 bodied shapes in both
  views, hidden rows, non-uniform size, `shape.rotation`, custom shapes, mixed rows, rig cameras, a turned and scaled root, NullEngine.
- Row order equals `scene.meshes` order after a load, but not after a restyle: a rebuilt mesh goes to the end of `scene.meshes`. On an exact
  tie `scene.pick` then answers the other row, and the scan keeps the lower row, the section 9 rule. Only a pick on an open table can
  see this, and a batched row has no place in `scene.meshes` to lose.
- An exact tie between a row and an object mesh goes to the row, whose mesh was built first.

As built (stage 9): `NodePointerRoster.byId` names nodes, not handlers, and `Node.dragHandler` is an accessor that
builds the handler on first read, on both paths, so a node the pointer never reaches has none (`dragHandlersBuilt`
counts them). A batched row's click and double-click arrive as Babylon's own `POINTERTAP` and `POINTERDOUBLETAP`, so
the click detection is the one the actions use; the roster names the node from the picked mesh, else from
`pickNodeId`, and answers only when `NodeBatches.draws(node)`. The shared actions skip such a node, since its hidden
proxy still carries them until stage 11. The roster sets `hoverCursor` over a batched row after Babylon resets the
cursor. The shared `ActionManager` is built at scene setup only under `"objects"`; under `"batched"` the first mesh
makes it, which while proxies exist is the first node. Two corrections to the stage 9 row: `XRInputHandler` was
already on the merged ray pick (`pickRayAsDrawn`, stage 5), and the one XR laser proxy moves to stage 11, since with
hidden proxies the predicate alone serves and nothing could prove the proxy before the meshes go.

As built (stage 10): `render/NodeIdTarget.ts`, created and disposed with the `"batched"` path. Six things differ from the text above:

- A node read is one pixel, not a window. On WebGL it is synchronous: a stale target is drawn on the spot and read with
  `_readTexturePixelsSync`. On WebGPU the next frame draws it and the read follows asynchronously. `NodeBehavior` drops an asynchronous
  answer from an older move. While reads keep coming the target is redrawn once in each frame; `counts = {draws, reads}`.
- What the target draws is the scene's own active-mesh list, copied in `onAfterActiveMeshesEvaluationObservable` (between frames
  `scene.getActiveMeshes()` is empty). Batches write row + 1; every other pickable mesh writes white, which means "ask the mesh pick".
  Shader-surface rows, whose proxies are hidden, read empty and fall back to the mesh pick through `NodeBatches.hiddenRows()`.
- Babylon draws `customRenderTargets` before it evaluates the frame's active meshes, so the in-frame drawing uses the last frame's list.
  It is kept only while the new list is the same; any change makes the target stale.
- `RenderTargetTexture.isReadyForRendering()` notifies every observer a drawing does (before bind, before and after render, after unbind)
  and draws nothing, so no observer can mark a drawing. A small subclass overrides `render()` to say when it really drew.
- Against `shapeRayHit`, the target differs at same-depth overlaps and at pixel centers within an eighth of a pixel of a triangle's
  edge, where the rasterizer's rule and the ray test may keep opposite sides. `node-id-target.test.ts` lists both and bounds the second at
  2% of sampled points.
- A row under 1.5 device pixels in radius is drawn 1.5 px in radius around its center in the target (the batch's largest half-extent
  sets the measure). Drawn as it is, a row smaller than a pixel covers no pixel center, so hover read nothing over it while the scan
  named it: at 100,000 nodes in the benchmark (radius 0.32 px) no hover ever came. Hover over such a row may therefore name it, or a
  neighbor drawn later, up to 1.5 px from its center, where the scan names nothing.

As built (stage 18, first pull request): `render/EdgeIdTarget.ts`, created and disposed with the node target. The pointer-move
cursor test, the one edge hover there is, reads it through `hoverEdgeAt`; press, release and `elementAt` still walk every edge
until the stage's second pull request makes that walk typed. Four things differ from the text above:

- The target draws no edge mesh. Each straight edge is one 1-pixel line from its two nodes' rows in `rowPosition`, so moving
  nodes moves the lines with no upload, and its id is its place in a list of the visible edges. The list is rebuilt when
  `edgeDrawChanges` moved: an edge painted, shown or hidden, added or removed, turned between straight and bent, or a node
  renumbered. An edge the target cannot draw (a curve, a route, a loop, an end drawn as a group) is measured on every hover.
- The window is `2 * (ceil(6 / scaling) + 1) + 1` pixels a side, 15 x 15 at a scaling of 1, not 13 x 13: a line 6 CSS pixels
  from the pointer can be rasterized half a pixel further out. The edges it names, with the ones it cannot draw, go to
  today's exact distance test, in walk order, so ties settle as before.
- Where two lines cover the same pixels in the window (an edge and its reverse, lines that run on from each other) the target
  names only the one drawn last, so hover may miss the other. `edge-id-target.test.ts` lists each such point.
- A move over empty canvas measures only the edges the target cannot draw, and over a line only those near it
  (`edgePickWork.measured`); on `"objects"` every move still measures every edge.
- On WebGPU the read is asynchronous and takes three things the text above does not say. Babylon's readback pads each row to
  256 bytes inside the buffer it is given, so the buffer is `h * align(w * 4, 256)` bytes; each read gets its own buffer,
  because a later move's read can land first; and the draw in the frame that rebuilt the lines' vertex buffer comes out
  empty (measured on SwiftShader), so a read waits for a draw in a later frame. `edge-id-target.test.ts` runs the agreement
  test and a real-pointer hover on WebGPU when `GRAPHTY_BROWSER_GPU` is set.

As built (stage 18, second pull request): the typed edge scan is `pickEdgeId` in `render/PickService.ts`. On the `"batched"`
path a press, a release, `elementAt` and the hover's measure of its window all take it. It still walks the edges in order with
today's distance test, so it gives the same answer on the same ties. The difference is where a straight edge between two batched
rows gets its ends: from `rowBounds` and the root's matrix, which is what `Node.drawnWorldPosition` returns for such a row, put on
screen through one `screenProjector` per pick. So it needs no `worldToScreen` call and no new vector for that edge.
`Graph.worldToScreen` is that same projector, with the same arithmetic. Every other edge (a curve, a route, a loop, an end
outside a batch) is still measured point by point, and `edgePickWork.measured` counts only those, so a move or a press over the
stage 18 test graph counts 1, its loop. Two things differ from the stage row:

- The row says "a typed scan for clicks". The hover's window measure takes the scan too, since it is the same test.
- A press still walks every edge. The scan does not use the target's window, because a press needs no read. It is a typed walk,
  not an index.

**XR.** Babylon's `WebXRControllerPointerSelection` runs its own `scene.pickWithRay` to end the laser and place the selection dot, so with no
mesh a beam runs through the row. Row picks reach it through one invisible pickable proxy moved to the row `rowRayHit` finds, admitted by
`raySelectionPredicate`; while hidden proxies exist (stages 8 to 10) the predicate alone serves. `XRInputHandler`'s direct `pickWithRay`
(`:814`) gets the same change, so beam and dot match the object path: 0 pixels in each eye.

**Rectangle and lasso** are additive and off by default: a `{ region: { polygon } }` selection target and an opt-in gesture. One typed walk
projects visible rows.

As built (stage 23): the target is `{ region: { polygon } }` in canvas CSS pixels (a rectangle is its four
corners); a node is inside when its center is, by the even-odd rule. The session takes it as an optional
`region` capability, so `createGraphSession()` with no canvas refuses it with `E_UNSUPPORTED`. On `"batched"`
it is `RowScan.rowsInRegion`, one walk over `rowBounds` (a bound of 0 is a hidden or unplaced row) with the
root's matrix folded into the view and projection; `regionWork` counts the rows read. Three things differ
from the text above:

- The target works on `"objects"` too, each node placed as `nodeScreenPosition` places it, so both paths
  select the same set. It is a new target, so nothing on `"objects"` changes for a caller that does not use it.
- The gesture is `layoutBehavior.selection.region` (`"off"` by default, `"rectangle"`, `"lasso"`): Shift
  and a drag from empty canvas, the camera held for the drag; it adds to the selection, as Shift-click does,
  and a press on a node still drags it. A dashed gray outline follows the pointer over the canvas.
- The 5,000 cap is the selection's own (`DEFAULT_SELECTION_CAP`), not a region limit. Measured at 100,000
  rows with the middle half of the canvas, which the cap cuts to 5,000: 16.8 ms median per
  `selection.apply`, against the 2 ms target (load average 16-20). That figure is the whole apply, the
  walk and the cap's truncation and delta together; the walk alone was not timed.

### 4.5 Layout to renderer (#3248)

**WebGL, and WebGPU with no shared device.** Readback lands as today. The engines' `publishPositions` overrides become one typed loop
keeping every guard (fixed, held, followers, first placement, envelope); the base version, for a third party's engine, stays. The repack
and one upload follow.

**WebGPU renderer with a shared device.** Built because #3248 is delivered whole; the two bars its spike missed fail the same on the upload
path, for reasons unrelated to sharing (slow frames with no layout; stock engine loss). Babylon cannot adopt a device, so the accelerator
adopts Babylon's through an additive, opaque `device` option. A new kernel `to_drawn` writes `(sim - center) * scale + target`, w, and z = 0
in 2D, into a ring of stride-4 buffers the simulation owns, one per batch in flight, skipping held rows and followers, whose values the
element writes there. **The table moves at the landing, not ahead of it**: one `copyBufferToTexture` from the batch's ring slot fills
`rowPosition`, and the typed loop keeps the CPU copy and lane current with no upload. So object rows, labels, patterned lines,
`Node.getPosition`, the row scan and pulled edges show the same batch. No render bind group holds a simulation buffer. The envelope is the
last landing's CPU measurement, as a uniform. A landing costs 0.8 ms median against 3 ms for the upload.

Rules of sharing:

- Decide before the engine opens and pass `setMaximumLimits`, `enableAllFeatures`, `high-performance`; the factory waits for the engine.
  The decision is a registration's `sharesDevice(adapter)`, asked by `openWebGPUEngine`; the device reaches the factory as
  `AcceleratorFactoryOptions.device`. The element's core cannot tell a software adapter, so that test sits with the peer in `webgpu.ts`.
  An adopted device takes the caps a device of the accelerator's own would have (`captureCaps` on `device.adapterInfo`), so the same
  kernels are chosen. A browser whose device has no `adapterInfo` (Safari, Chromium before 132) still shares: the caps then have empty
  adapter names and subgroup sizes of 0, which the kernels floor to 4. A `sharesDevice` that throws means no, so a browser whose adapter
  has no `info` (Chromium before 127) opens the engine unshared; `AccelerationController.sharesDevice` catches it for every registration.
  `enableAllFeatures` brings `timestamp-query` to the engine, and with it Babylon's frame timing, which `StatsManager` turned on: every
  `mapAsync` on the device then went unanswered, the layout's readback first, on SwiftShader and on the RTX. Why is not known; a
  bisection of the features named `timestamp-query`, and no frame timing cleared it on SwiftShader. `StatsManager` no longer asks for it on
  WebGPU, where it measured nothing before.
- **A software adapter never shares**: it reports `layoutDevice: "separate"`, decided before the run.
- `GpuContext.from` skips the `uncapturederror` sink through an additive third argument, `{ errorSink: false }`; with the sink one Babylon
  validation error fails the layout's next step.
- Scopes pop synchronously after submit; **a landing waits for its batch's scope result and rejects on error**, or a bad batch lands and
  the table parts from the lane. The scope holds `encoder.finish` and `queue.submit` only, because the commands before them are recorded
  across awaits a frame could fall into. A bad bind group is still caught there, at the `finish` of the pass that used it; its first
  report, at `createBindGroup`, goes to the renderer's log with the renderer's errors.
- **Recovery decides from `ctx.state`, never the error code** (a step reports `E_DEVICE_LOST`, then `E_DISPOSED`), and **never starts from
  `onContextRestoredObservable`**. It starts when stage 39's engine has the new device (0.2 s after a destroy, 2.1 s after a crash):
  the controller's build awaits `RecoveringWebGPUEngine.drawingDevice()`. The engine hears of a loss first, because Babylon attaches its
  `device.lost` handler while the device opens, before anyone can be handed it.
- On the new device rebuild the ring, bind groups, simulation and texture handle, refill the table from the lane, and `ctx.release` the old
  snapshot.
- **A stale landing skips the copy** (a batch in flight across a reload).
- The controller disposes before the engine: it is a lifecycle manager of its own, disposed after the layout and before the data and the
  render managers.
  What it frees is read before any manager is disposed, because managers reading rows on the way out freeze a cleared graph's fresh store.
- The controller's build waits for the renderer only when one is on its way: `Graph.init` has started, or a connected element has promised
  it with `expectRenderer`. Accelerated work asked for before that, or on a graph asking for WebGL, gets a device of the accelerator's own
  and finishes, even if the graph never opens. An accelerator built that early stays on its own device until a loss rebuilds it.

**Frames and iterations.** A frame target is p99 on an unloaded card: with no layout at all, 5 of 8 runs at 100,000 rows showed p95 of 74-90
ms against a p50 of 9-10 ms, while other sessions used the machine. Iterations per batch stay 1 up to 250,000 rows
(`ITERATIONS_AUTO_RAISE_NODES` on master); 4 bought no better frame and 16 raised the median to 26 ms. The fourfold raise above that line
needs its own measurement, in stage 30.

A settling batch repacks from the lane, so the rest picture matches the upload path. The new coded field
`rendererStatus.layoutDevice: "shared" | "separate" | null` is detection before the run, never a fallback during one.

As built (stage 25, first pull request): `layoutDevice` is set when the renderer opens, from the engine's own `sharesDevice` answer:
`"shared"`, `"separate"` under WebGL and on a software adapter, and null when no accelerator is offered (policy `"off"`, or nothing
registered before the renderer opened). The type is exported as `LayoutDevice`.

As built (stage 25, second pull request): webgpu-graph-algorithms has the kernel and the ring; the element does not use them yet.
`to-drawn` reads the stride-3 scene array `to_scene` already writes, so it applies the element's own formula,
`(scene - center) * scale + target`, and runs in a pass of its own after the iteration pass of every batch. Correction to the text
above: the kernel never writes w. The ring is seeded from the owner's stride-4 rows (`setDrawn({ slots, rows })`) and w, like the rows
in the skip mask (`setDrawnSkip`), is only ever what the owner wrote, through `writeDrawn`, which writes every slot; so a hidden or
shrunk row keeps its w while it moves, and the element never needs a ring-wide w pass. `setDrawnTransform` sets the uniform the next
batches use. `landedDrawn` is the slot of the last batch that landed, null after a load, so a batch in flight across a reload never
lands as one (the stale skip). The methods are optional members of `GpuLayoutSimulation`, so no implementer breaks.
The element's copy at landing follows; `copyBufferToTexture` needs `bytesPerRow` a multiple of 256, which the `rowPosition`
texture's width must allow.

### 4.6 Columns and load (#3249)

- **Lazy objects.** Under `"batched"`, `buildNode` and `buildEdge` stop running at load for eligible rows. `nodes`, `edges`, `edgesByIndex`,
  `nodeCache` become views with their full `Map` interface. A strong `Map` by id keeps every object handed out until removal, so
  `evt.node === graph.getNode(id)` holds. `getNodes()` makes N objects; nothing internal may, so a transition, fit, filter and layout swap
  go by row. `srcNode` and `dstNode` become accessors. Shipped engines key on rows; a third party's `LayoutEngine`, `defineLayout` and
  `SimpleLayoutEngine` still get `Node`s. `node-add-before` is gated on its observers. `StylePainter` writes columns into batch buffers.
- **The typed door**, the advanced path; `addNodes` and `addEdges` stay the simple one. `session.data.importColumns({ sources, targets,
nodeCount })` takes zero-based row numbers; `ids`, `weights`, `positions`, `attributes` are optional. Same ceilings, report and undo step,
  with one range entry in the op log. graph-io and graph-samples route through it.
- **Staging.** Stage 28 releases `GraphBuilder`'s staging arrays after load, skips id maps for typed input (without both its 400 MB has no
  margin) and cuts batch data toward 20 bytes. New `session.data.count()` serves `JoinScreen.tsx:636`.
- **Records into columns is conditional.** Records and op log are 3.8% of the heap; removing `Edge`, `Node` and per-node Babylon objects
  alone leaves about 515 MB. Stage 29 is built only if stage 30's harness run misses the heap target; otherwise #3249 closes at stage 28,
  citing that measurement. If built: attribute columns where `storedAttributeOf` already looks first, the rest in
  `overlay: Map<row, record>`, records built on demand and kept, so `Node.data` stays one object.

### 4.7 Labels (#3252)

- **`RichTextLabel`, unchanged**, for anything rich: markup, panels, badges, animation, tooltips.
- **Anchors.** A labelled row needs an anchor, not a real mesh: a geometry-free `Mesh` with a hand-set bounding box keeps `attachTo`,
  `targetBounds` and declutter unchanged, so the row stays batched.
- **Glyph atlas**, option `labelText: "glyphs"`, off by default because its pixels differ from `fillText`: one instanced draw over a
  signed-distance atlas. Plain single-style labels only, placed by Canvas `measureLine`, so wraps and declutter hold. Rules:
    - No mipmaps on the distance texture: they cost thin stems about 30% of their ink at 11 and 14 px.
    - Place each glyph at `width(text through glyph) - width(glyph)`, which keeps kerning ("AVATAR" was 6 px off at 48 px).
    - Fallback list, by script-property regular expression: right-to-left, Indic, emoji, ligature fonts, panels and markup use
      `RichTextLabel`, per label.
    - Full atlas (a 4096 square holds about 2,500 tiles): no second page, no eviction; a label with a glyph that does not fit falls back to
      `RichTextLabel`, per label.
    - Correction from stage 33 (`meshes/GlyphAtlas.ts`): no regular expression can see a ligature font, and widths cannot either (a
      font keeps a ligature as wide as its parts: DejaVu Serif "fi" is 29.32 px at 48 px, "f" plus "i" the same). A ligature font is found
      by its ink: each of a few probes ("fi", "fl", "ff", "ffi", "ffl", "->", "=>", "!=", "==", "<=", ">=", "www") is drawn as one run and
      glyph by glyph at the placed x; any difference over 0.5% of the ink is a ligature, and a label holding that probe falls back
      (not every label in the font: DejaVu Sans, the Linux fallback for Verdana, draws "fi" as one, which sent every label back). In Chromium a
      font without ligatures draws identically both ways (0.000); DejaVu Sans and Serif "fi" differ by 0.065 and 0.112. Combining marks (`\p{M}`) fall back too, since only the font's positioning table places
      them; "Indic" covers the other Brahmic scripts (Thai, Lao, Tibetan, Myanmar, Khmer). Tiles are 80 texels (56 px glyphs, a 12-texel
      reach): 2,601 to the page. A label falls back whole when its glyphs do not all fit.
    - Correction from stage 33 (`meshes/GlyphLabels.ts`): "plain" is not judged from the style. The label's own painting runs on a
      recording canvas context, and a label is plain when that painting inks nothing but `fillText` (a transparent panel path is
      fine; a fill, stroke, shadow or alpha is not). Runs in several fonts and colors (markup) are therefore glyph-drawn too. Each
      label keeps its plane for placement, declutter and picking, with layer mask 0 so it draws nothing; the one draw rebuilds its
      glyph instances from each shown plane's world matrix every frame. A web font not yet loaded falls back, so no tile is drawn
      in a fallback font.
- **Sampling**, off by default with its cell size a setting (`layoutBehavior.labels.sampleCell`, CSS pixels; unset is off). When the view
  settles, one label per screen cell is picked (selected, then degree, then id); only the winners get built, and
  `nodeLabelCounts.hiddenBySampling` (present only while it is on) counts the rest.
  Correction from stage 32: built on the CPU (`managers/LabelSampler.ts`), not as a GPU point draw with a readback. The pass runs once per
  settled view, not per frame, and projects each labelled row's CPU position (`drawnPosition`, which every path keeps) through one matrix:
  a few milliseconds at 100,000 rows, with no render target, no readback stall and no WebGL/WebGPU split. A settled frame costs
  one comparison of the camera, the canvas size, the position lane's generation and the edge version.

### 4.8 The small issues

#3253 and #3254 (edge fade, blending), #3255 (force guards) and #3256 (collision) are done. **#3257 cluster force**, in pull request 5812, is
an option on the force layouts, off by default, CPU and GPU kernels, centroids on the GPU.

## 5. What the proving experiments showed (stage 0, done)

Each ran on the RTX 4070 SUPER and on SwiftShader, with one gap: picking on SwiftShader with WebGPU was not run, because the renderer crashed
on all three attempts. That browser lacked the Vulkan flags section 7 adds, so it is probably the same crash (inferred, not tested). Picking
runs on the CPU, and the other three renderer and API pairs agreed.

| Question                                       | Result                                                                                                                 | Consequence                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Batch against today's rows, GLSL and WGSL      | 0 pixels, 1 level for gradients (untraced); still frame CPU 0.2-0.4 ms at 100,000                                      | Section 4.2; fallbacks dropped      |
| Two rig cameras under `iwer`, tap, drag, pinch | 0 pixels each eye once the laser lands on rows                                                                         | Section 4.4                         |
| 53 shapes, 1M-row scan                         | Bound table and narrow phase: 0 differ; p95 3.2-6.3 ms, worst call 25 ms                                               | Section 4.4; the bar is read as p95 |
| `texelFetch` of RGBA32F on WebGPU              | Bit exact                                                                                                              | No WGSL twin of the line shaders    |
| Edge programs at 1M                            | `gl_VertexID` level with or faster than expanded on SwiftShader, but 8% slower at worst on WebGPU, which never expands | Section 4.3                         |
| Shared device, 100,000 rows                    | Table equals lane; quiet runs p99 16-33 ms; drills pass with the engine patch                                          | Section 4.5, stage 39               |
| Heap by holder                                 | `Edge` 54%, per-node meshes 24%, `Node` 4%                                                                             | Section 4.6                         |
| 200 labels, atlas against `fillText`           | Closer to `fillText` than today's texture when small; pictures not yet reviewed                                        | Section 4.7                         |

The shared-device experiment's bars were no uncaptured error, recovery from the lane, and frames under 40 ms. It has no written report, so
this list comes from its raw runs at 100,000 rows. Each failure and its answer:

- **Frames over 40 ms**: 2 of 4 shared runs and 2 of 4 separate runs under load reached p99 of 79-84 ms, and 5 of 8 runs with no layout at all
  reached 81-97 ms, so sharing is not the cause. A frame target is p99 on an unloaded card (section 4.5).
- **`device.destroy()` on a stock engine** floods uncaptured validation errors, with or without a layout. With the engine patch there are
  none. Stage 39.
- **A GPU process crash on a stock engine** kills the page in `createBuffer` on the RTX and fails `requestDevice` on SwiftShader. Stage 39.
- **The crash drill on the headless shell** fails even with the patch: the page dies or no adapter comes back. On full Chromium it
  passes, with the table equal to the lane. Stage 39's test project.
- **The stock `uncapturederror` sink** turns one Babylon validation error into a failed layout step. `errorSink: false` (section 4.5).
- **A deliberately broken batch** still landed, 79 times, with no step error, and the table parted from the lane in 299,997 of 400,000 values.
  A landing waits for its scope result.
- **Error codes after a loss** go from `E_DEVICE_LOST` to `E_DISPOSED`, and Babylon's restored event fires on the old device. Recovery
  decides from `ctx.state` and starts from stage 39's engine.
- **Disposing the engine first** loses the device under the layout. The controller disposes first.
- **SwiftShader sharing** drew a frame in 4.5 s against 3.4 s separate, one run each. A software adapter never shares.

Passed outright: ten dispose cycles left nothing resident, and five reloads in flight skipped their stale landings with the table equal to
the lane.

## 6. Public API: how nothing breaks

Under the default `"objects"` every public member is what it was. Under `"batched"`, which a consumer chooses:

| Surface                                                                         | Under `"batched"`                                                                                                                                  |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Node.mesh`, `getNodeMesh`                                                      | Accessors, same type, writable. A consumer's read makes that row an object row; internal code reads private fields (stage 11)                      |
| `Edge.mesh`, `transformEdgeMesh`, `transformArrowCap`, `Edge.ray`               | `mesh` is the shared batch mesh, as today; `drawnLine` gives the edge's own. On a pulled edge the transforms do nothing and `ray` is not refreshed |
| `getScene`, `Graph.scene`, `engine`, `xrHelper`, `getMeshCache`, `parentGraph`  | Same objects; never change a row. The scene holds batches, not per-row meshes                                                                      |
| `Node.update`, `updateStyle`, `opts`, `size`, `dragHandler`; the `Edge` twins   | Same class. `updateStyle` queues a repaint. Assigning `opts` or `size` makes an object row. `dragHandler` builds on read                           |
| `Node.getPosition()`                                                            | `rowPosition`'s CPU copy: the drawn position, including mid-transition                                                                             |
| `drawn*`, `getInterceptPoints`                                                  | Synchronous, from the mirror (stage 6) and `rowRayHitOn`, moved there by stage 7                                                                   |
| `getNode`, `getNodes`, `nodes`, `edges`, `edgesByIndex`, `nodeCache`            | Views that make objects on demand, stable identity                                                                                                 |
| `session.positions`, undo, save; `elementAt`, `groupOutlineAt`, `screenToWorld` | Unchanged, synchronous                                                                                                                             |
| `getStats().cachedMeshes`, `drawCalls`                                          | Count batches                                                                                                                                      |

Accessors keep source compiling, except a subclass redeclaring `mesh`, `srcNode` or `dstNode` as a property (TS2610); the element never
builds a consumer subclass.

**Additive, no owner approval, each stated on its pull request:** `renderPath`, `rowCounts`, `limits` (option, and in `capabilities`),
`rendererStatus.layoutDevice`, `session.data.importColumns` and `count`, the `{ region }` target and gesture option, label sampling options,
`labelText`, `antialias`, a `hiddenBySampling` count, the warning `W_OBJECT_CAP` on the existing `{ code, params }` event, the 4.8 options, and in webgpu-graph-algorithms `device`, `to_drawn` and `GpuContext.from`'s `errorSink`. Each gets a `doors.ts` entry and a
blind-author example under 15 lines. `GraphContext` gains optional members only.

## 7. Proving a faster path draws the same picture

Options that change a picture stay off. Existing tests, unedited, prove `"objects"` on each pull request. `"batched"` is proven by:

1. **`render-parity`**, a new test project. Every story renders under both paths on SwiftShader (`GRAPHTY_BROWSER_GPU=swiftshader`), whole
   canvas, same run, bytes compared. That flag set gains
   `--enable-features=Vulkan --disable-vulkan-surface`, or the GPU process aborts on a WebGPU canvas. The bar is zero differing
   pixels, or at most one level per channel, the value the batch spike measured (gradients), set once and never widened to pass. Stage 8
   first runs `"objects"` against itself: a story not byte-stable between two loads is seeded, or listed by name with its reason
   (`stories/Layout.stories.ts:301`, D3 physics). Fixtures add a mid-transition frame with animation parked, flat lighting set live, and a
   zoom on a `nodeScale: "screen"` map. The 6-vertex program also runs on the RTX (`GRAPHTY_BROWSER_GPU=nvidia`), locally, for the Proof.
2. **`forced-batched`**, a new test project: the browser, interaction and `xr` suites under `"batched"`. A file that inspects mesh
   structure goes on a committed list with a reason each. Real-input tests and `rowCounts` carry the proof.
3. **Where they run.** Neither joins a pull request or the full run. A stage runs the files it touches locally. The whole of both runs by
   dispatching a new `render-proof.yml` on the branch of stages 11, 13 and 16, and the Proof file cites it.
4. **A row moving between batch and object path** changes pixels only where solids intersect: 10-35 silhouette pixels, a depth tie (inferred;
   zero on the one run with no intersections). No slot order fixes a mixed scene. **The bar is not widened for this.** A `render-parity`
   miss of this kind is reported by name, and stage 13 settles it.
5. **The screenshot gate is the final word.** Stage 13 puts the app on `"batched"` behind the `cosmograph` flag; its stories are compared on `"batched"` once the flag graduates. Any changed image there goes to the owner's
   review, or those rows stay ineligible. A wanted picture change becomes an option, off by default, under the same review. Agents accept
   nothing, and never touch the gate, what is captured or any threshold.

As built (stage 8): `test/render-parity/stories.test.ts` loads each captured story twice on `"objects"` and once on `"batched"`, composing it
in the browser with a one-function renderer, on the URL a capture uses. WebGPU's canvas holds nothing once a frame ends, so every read
happens inside a frame, by `engine.readPixels` (`test/helpers/whole-canvas.ts`). `test/render-parity/unstable.json` names each story left out
and why; most fail on `"objects"` here because their play needs Storybook itself. `unstable-webgpu.json` adds the stories that fail only on WebGPU,
all with no batch involved, so WebGL keeps them; `SWAP_REJECTS` leaves out the two scene shader files there, which reject on either path. `VITE_PARITY_RENDERER` picks the engine: the story is built off the page so it is set before the element connects, and each load asserts the engine that drew.

A missed millisecond target does not block a parity-clean stage: the Proof file states it and stage 38 reports it. Counts (uploads, walks,
`Node`s built, draws) are tests.

## 8. The 100,000-node ceiling

`DEFAULT_LIMITS.renderCeiling` (100,000) and `edgesDrawn` (1,000,000) in `session/limits.ts` were measured against V8's heap with one
object per element. Stages 26 to 28 remove that reason.

- Stage 30 adds `limits: { renderCeiling?, edgesDrawn?, objectRows?, objectEdges? }` on the element and session; `Ingest` reads the effective
  value. `session.capabilities` and `capabilities:changed` widen with `limits`. The app's `fitsInBrowser` and `isLarge` take limits as a
  parameter, because the start screens have no element.
- With `"batched"`, that option loads a million nodes. `"objects"` with a higher limit refuses with `E_TOO_LARGE`: its heap reason stands.
  **The default stays 100,000** (section 10).
- **Object budgets.** `objectRows` defaults to 100,000 and `objectEdges` to 1,000,000, the default ceilings, so a budget cannot bind at or
  below them. Past a budget under a raised ceiling, later rows draw as plain bodies and edges as plain lines, and
  `{ code: "W_OBJECT_CAP", params: { wanted, cap } }` reports it.

## 9. Edge-case rulings (input -> expected result)

Rows and drawing

- Unplaced row (NaN) -> w = 0; not drawn, picked or lassoed; edges to it not drawn.
- Paint gains a border -> object row in the same frame (`drawHeld`). Removed -> back to the batch at that repaint.
- Source with any object row before stage 11 -> not batched: hiding a source hides all its rows.
- Data before the WebGPU engine swap -> tables and batches rebuild from the lane on the new scene.
- Row leaves for the object path -> its slot is a hole; it draws once; edges still read its w = 1.
- NullEngine -> every row an object row; data, lane and `shapeRayHit` work (stage 5 proves it).
- 1M rows, a layer asks for a border, ceiling raised -> first `objectRows` by row order become object rows, the rest plain, `W_OBJECT_CAP`.

- Load, hover, select, repaint, layout, `"batched"`, default style -> `rowCounts.objectNodes` stays 0.

Picking

- `elementAt` before the first frame -> `shapeRayHit` answers nodes; edges null, as today.
- Node and edge under the cursor -> node.
- Two 2D rows overlap at one depth -> `scene.pick`'s answer, the lower row on an exact tie; hover may name the other.
- Lasso: hidden row not selected, occluded row selected; past 5,000 rows, `truncated` true.

Layout and device

- Pinned row, GPU layout -> `to_drawn` skips it; no write-back into the simulation.
- Dragged node, shared device -> a drag beats an older batch.
- GPU error mid-run -> the batch's landing rejects; layout stops and reports; no CPU finish.
- Babylon validation error, shared device -> no layout batch fails.
- Shared device lost -> both stop; engine rebuilds on the new device; tables refill from the lane; layout resumes.

Labels

- `labelText: "glyphs"`, Arabic text -> that label is a `RichTextLabel`.

## 10. Breaking changes

**Required: none.** The default stays `"objects"` and every other change is additive. Rows that cannot reach parity stay ineligible.

**Optional, for the owner after stage 38; none blocks a stage:**

| Change                                                         | Why it cannot be additive                                                                                                                                                                                                            | Without it                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| Default `renderPath` to `"batched"`                            | `scene.meshes`, per-node action managers and Babylon move picks change for a consumer who set nothing                                                                                                                                | A consumer sets one attribute   |
| Default `renderCeiling` to 1,000,000, `edgesDrawn` as measured | It changes what today refuses                                                                                                                                                                                                        | A consumer sets `limits`        |
| Turn pulled caps on (`pulledCapsOn`, stage 17)                 | A pulled cap places in float32 on the GPU and differs from the placed cap by one anti-aliasing sample at a cap's tip (3 pixels in 30 caps; [picture](pulled-caps-one-sample.png): circled, then placed and pulled side by side, 16x) | Caps stay objects on every path |

## 11. Alternatives rejected

- **Default batched, any Babylon read demoting every row**: the routes cannot all be caught, and it is still a changed default.

## 12. Risks and what is unverified

- **Experiments are not the product**: harness shaders, tables filled from real meshes, machine load 15-77, so timings are upper bounds.
- **Babylon's laser misses in about one page load in six**, on objects too, cause unknown; beam tests count only loads where it hits.
  Stage 8 found one candidate, untested as the cause: with no `preferredHandedness`, Babylon casts from one controller only, whichever attached
  first, so a test that aims one controller can miss. `node-batch-xr.test.ts` aims both.
  Hand-tracked pinch, AR and translucent batches were not run.
- **Heap at a million is 850-920 MB by estimate** against 800 MB, before 20-byte batches and released staging. Holders at 100,000 are scaled
  from 50,000, because the snapshot crashed the renderer.
- **`Node.roundRadiusMesh`** (`Node.ts:776`) kept about 183 MB of replaced meshes alive in a sparse 30,000-node graph: probably a defect today.
- **`engine._device`, `_readPixelsAsync` and stage 39's engine overrides are Babylon internals**, each behind one tested function, and a
  Babylon upgrade reruns the loss drills.
- **Other sessions** edit `Node.ts` and `Edge.ts` daily; the wide edits are stages 3 and 11, each alone.

## 13. Stages

Each stage is one pull request into master (or several where marked), passes CI, and leaves master shippable: under `"objects"` it
changes nothing a consumer sees. Only 32-34, 36 and 37 add picture changes, with their options on. CI proves _counted work_; milliseconds
come from the harness (`benchmarks/compare/`) under `render-path="batched"`, in the Proof file.

Targets are 2D lean at 100,000 nodes and 1,000,000 edges, RTX 4070 SUPER, WebGL, unless stated. Today, with cosmos.gl in brackets, from the committed run `benchmarks/results/baseline` (commit
7a09c31e, before the load fix #5841): still 151 ms (28), moving 224 ms (29), layout frame 1,632 ms (12), step with readback 548 ms (7), hover
32 ms (28), heap 3,039 MB (161). Its first frame of 436 s (0.57) no longer holds: after the fix it is about 76 s, from one run on a loaded
machine at the fix's commit fe8f5e1a7, whose still frame was 161 ms. Stage 1 committed a full run since the fix as
`benchmarks/results/reference`, with p99, before it changed any code, and every Proof compares against that run. Its card was not unloaded
(load average 9.8-59 as runs began), so compare at a similar load: still 166 ms (p99 231), moving 303 ms (p99 493), layout frame 2,317 ms,
step with readback 833 ms, hover 57 ms, heap 2,848 MB, first frame 81 s. Targets are
absolute: the rerun changes the starting figures, not the targets. At a million nodes cosmos.gl has
first frame 1.02 s, 29 ms frames, 29 ms hover, 270 MB and 64 ms during layout, measurable here only from stage 30. A frame target is p99 on
an unloaded card, and with the benchmark's long edges cannot go below their fill: 83 ms on WebGL, 108 ms on WebGPU, as drawn by default.

Stage numbers are names, not order: stage 39 was added without renumbering. Depends on is exact. A Done row needs no scheduling. Stage 29 is
conditional: it starts only if stage 30 misses its heap target, and otherwise counts as done for stage 38. The WGSL fix (section 2) is not a
stage; 8 and 15 start after it reaches master. R is risk.

Correction from stage 2: this row carried the moving target of 160 ms, but the harness's moving frame is a camera move, which moves no node,
so it walks no edge and uploads nothing, and stage 2 cannot change it (346 ms before, 357 ms after, one run each at load average 36-37). What
it costs is the unfreeze: a moved camera thaws Babylon's list of active meshes, so the frame walks every node mesh again. That target stays
open for the stages that take those meshes away. Stage 2's own measure is the harness's new drag frame, one node moved each frame: 907 ms
before, 326 ms after, against a still frame of 170 ms in the same runs (`benchmarks/results/stage-2-before`, `benchmarks/results/stage-2`).
That run is the static layout (`skip-layout`). Force layouts used to walk every edge on every frame, because their engines hand back an iterator
that cannot be counted; the walk now reads `DataManager.edgeVersion` for them, so a settled force layout also takes this path and, for the first
time, freezes its active meshes on a still frame. d3 hands back an array, because it takes an edge up at a later step than the store's version.

Correction from stage 26 (code read at origin/master 8593e8751a): three facts the row did not carry. First, `Edge`'s constructor
resolves both ends through `nodeCache.get` and stores the `Node`s in plain `srcNode` and `dstNode` fields, so while edges are built
eagerly every endpoint of every edge is a built `Node`; the count at 0 on a load with edges needs the end accessors, which therefore
move from stage 27 into this stage. Second, `node-add-before` carries `nodeId` and the record, never a `Node`, so it can be emitted
for an unbuilt row and needs no gate; and since the element's own DOM forwarder and `Graph`'s click handler always observe the node
observable, a gate on its observers would never close anyway. Third, under `"batched"` everything that reaches a row today reaches
it as a `Node`: `NodeBatches` (`groupOf`, `sync`, `roster`, keyed by `Node`), `StylePainter`, the shipped layout engines'
`addNode`, `RowTable.replaced`, `nodesByIndex` and about 40 internal walks of `nodes`. The stage is therefore several pull requests,
each changing nothing under `"objects"`: (1) the count, `dataManagerInternals.nodesBuilt`, a test door every later pull request
asserts on; (2) `NodeBatches` and `StylePainter` keyed by row, painting an unbuilt row from columns; (3) shipped engines, transitions,
fit and filter by row, with a third party's engine still handed `Node`s; (4) the end accessors; (5) ingest skips `buildNode` for
rows that need no object, `nodes`, `nodeCache` and `getNode` become materializing views with a strong map for identity, and the
row's proving test runs.

| #   | Stage                               | Issues                          | What it changes                                                                                                                                                                                                                                                                                         | Depends on                                                                                                                                       | R   | Target                                                                                                                                                                                               | Proving test                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ----------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | Done: baseline, spikes              | all                             | Harness, `baseline` run, section 5                                                                                                                                                                                                                                                                      | --                                                                                                                                               | L   | None                                                                                                                                                                                                 | Harness and `baseline` committed                                                                                                                                                                                                                                                                                                                                                                 |
| 39  | WebGPU engine loss                  | #3248                           | `WebGPUEngine` subclass in graphty-element, from `openWebGPUEngine`: skips Babylon's rebuild on the lost device, rebuilds after `initAsync` finishes, wakes the resting loop (which hears only `webglcontextrestored`). New test project on full Chromium; the headless shell dies with its GPU process | 0                                                                                                                                                | M   | Frames back 0.2 s after a destroy, 2 s after a crash                                                                                                                                                 | Destroy and crash drills, no layout: no uncaptured error, page alive, picture back                                                                                                                                                                                                                                                                                                               |
| 1   | Reference run, column publish       | #3248                           | Harness reports p99; the reference run is committed first; then engine `publishPositions` overrides become one typed loop                                                                                                                                                                               | 0                                                                                                                                                | L   | Step with readback 40 ms, reachable only once frames are short (section 2); stage 1 moves `publish`                                                                                                  | Reference run in `benchmarks/results/` at a commit before the loop; floats equal the old loop; `writeNodePosition` counted at 0                                                                                                                                                                                                                                                                  |
| 2   | Walk only what moved                | #3251                           | Drag walks incident edges; batches upload to `highWater`                                                                                                                                                                                                                                                | 1                                                                                                                                                | L   | Drag frame; moving 160 ms is not this stage's, see below                                                                                                                                             | `Edge.update` and bytes counted                                                                                                                                                                                                                                                                                                                                                                  |
| 3   | Mesh funnel (3 PRs)                 | #3247                           | `node.mesh` readers move to `drawn*` accessors; lint stops new ones                                                                                                                                                                                                                                     | 0                                                                                                                                                | L   | None                                                                                                                                                                                                 | Lint at zero outside `Node.ts` and `Edge.ts` until stage 7, and `Graph.getNodeMesh`, the consumer's own read                                                                                                                                                                                                                                                                                     |
| 4   | Row tables in shadow                | #3247                           | `RowTable`, `rowBounds`, drawn cases, `snapshot-replaced`, restore; nothing reads it                                                                                                                                                                                                                    | 1, 3                                                                                                                                             | L   | Repack and upload 3 ms                                                                                                                                                                               | Row equals `node.drawnPosition` each frame through load, transition, drag, freeze, 2D switch; `rowBounds` agrees; zero uploads when still                                                                                                                                                                                                                                                        |
| 5   | Pick service, row scan              | #3250                           | Twelve sites in one module; `sourceFor`, `shapeRayHit`, `rowRayHit`; scan in shadow, then for transition picks and XR                                                                                                                                                                                   | 3, 4                                                                                                                                             | M   | Synthetic scan p95 under 10 ms at 1M rows                                                                                                                                                            | Differential test on every shape, 0 differ, `shapeRayHit` against `scene.pick` and `rowRayHit` against `pickWithRay`; row order equals `scene.meshes` order; `flat-shape-click`; `xr/*`. One row each for what is unproven: NullEngine, XR rig cameras, transitions, hidden rows, non-uniform size, `shape.rotation`, models, custom shapes, mixed rows. A kind that fails stays on `scene.pick` |
| 6   | Trim include, mirror                | #3251                           | GLSL include and TypeScript mirror in shadow                                                                                                                                                                                                                                                            | 4                                                                                                                                                | L   | None                                                                                                                                                                                                 | Mirror equals `getInterceptPoints`, `pastBorders`, `lineEndBefore` within 1e-4; readback holds shader to mirror                                                                                                                                                                                                                                                                                  |
| 7   | Mesh-free ends                      | #3251                           | `getInterceptPoints` and its helpers work with no mesh, by mirror and `rowRayHitOn`; object rows keep today's ray                                                                                                                                                                                       | 5, 6                                                                                                                                             | M   | No mesh read for a batched row                                                                                                                                                                       | Mesh and mesh-free ends equal on every shape, directed and capped                                                                                                                                                                                                                                                                                                                                |
| 8   | Node batch, proxies                 | #3247                           | `NodeBatch`, `RowPullPlugin`, `batchableOf`, `renderPath`, `rowCounts` and its harness check, both test projects, `render-proof.yml`, SwiftShader flags, `raySelectionPredicate`; meshes stay as hidden proxies                                                                                         | 3, 4                                                                                                                                             | H   | Parity only                                                                                                                                                                                          | `render-parity` both engines; scale in `matrix`; free and compact change no pixel; mixed-key colors; prune keeps a live batch's material; `channel-paints`; `iwer` two-eye test, whole frame                                                                                                                                                                                                     |
| 9   | Pointer on rows                     | #3250                           | Roster for batched rows; manager at the first object row; `dragHandler` on read; XR proxy, `XRInputHandler` on `rowRayHit`                                                                                                                                                                              | 5, 8                                                                                                                                             | M   | Batched rows: handlers counted at 0                                                                                                                                                                  | `expand-real-input`, `hover-ends-on-leave`; consumer action on both paths; laser equals the object path                                                                                                                                                                                                                                                                                          |
| 10  | ID buffer, nodes                    | #3250                           | Node target; asynchronous hover; press on the scan; stale redraw                                                                                                                                                                                                                                        | 5, 8                                                                                                                                             | M   | Hover flat from 10k to 100k within 3 ms                                                                                                                                                              | ID against `shapeRayHit`, same-depth overlap listed; `real-input`, `selection/*`; per-element work per move counted at 0                                                                                                                                                                                                                                                                         |
| 11  | Remove proxies (3 PRs)              | #3247                           | Private fields; accessors; batched rows lose their mesh; `nodesMoved` compares object rows only, batched rows use `lane.changes`                                                                                                                                                                        | 7, 9, 10                                                                                                                                         | H   | Still 90 ms; `scene.meshes` counted near batch count                                                                                                                                                 | `forced-batched` by dispatch; `objectNodes` stays 0; edges track eased nodes; XR tap and drag with no mesh                                                                                                                                                                                                                                                                                       |
| 12  | Object roster                       | #3247                           | Per-frame walks visit object rows only                                                                                                                                                                                                                                                                  | 2, 11                                                                                                                                            | L   | Moving 130 ms; 10k still 8 ms                                                                                                                                                                        | `Node.update` per frame equals object rows                                                                                                                                                                                                                                                                                                                                                       |
| 13  | App opts in                         | #3247                           | The graphty app sets `renderPath: "batched"` while its `cosmograph` experiment is on (canary and `?features=cosmograph`); the flag graduates when stage 38 decides the defaults                                                                                                                         | 12                                                                                                                                               | H   | App at stage 12's numbers                                                                                                                                                                            | Section 7's gate: a changed image goes to the owner's review or those rows stay ineligible; `check:quick --with-dry-run`                                                                                                                                                                                                                                                                         |
| 14  | Widen eligibility (PRs)             | #3247 closes                    | Per-instance size, opacity, z order, pictures, gradients, screen-scale size                                                                                                                                                                                                                             | 12                                                                                                                                               | M   | Size ramp: draws counted at one per shape                                                                                                                                                            | `render-parity` per kind                                                                                                                                                                                                                                                                                                                                                                         |
| 15  | Pulled lines, dark                  | #3251                           | `EDGE_PULLED`, one `gl_VertexID` draw, behind an internal switch; 6-vertex program; `antialias`; trace the stray pixel, or that program stays off, with a picture for the owner                                                                                                                         | 6, 8                                                                                                                                             | H   | Zero edge bytes on a move; 1M long edges 83 ms, 6 vertices 68, also no antialiasing 21                                                                                                               | `render-parity` with the switch on; RTX parity of the 6-vertex program; `curves-rest-the-same-however-frames-split`; w = 0 ends                                                                                                                                                                                                                                                                  |
| 16  | Pulled lines join `"batched"`       | #3251                           | One line; `repeatPerVertex` deleted                                                                                                                                                                                                                                                                     | 11, 13, 14, 15                                                                                                                                   | H   | Moving 90 ms; layout frame 90 ms                                                                                                                                                                     | Both projects by dispatch; no changed image in the app; 1M edges load on SwiftShader                                                                                                                                                                                                                                                                                                             |
| 17  | Caps pulled                         | #3251                           | Caps on the same rows and include; 2D, image, stacked caps wait for parity                                                                                                                                                                                                                              | 16                                                                                                                                               | M   | 3D default moving 100 ms (176 today)                                                                                                                                                                 | `render-parity`; line end equals cap place                                                                                                                                                                                                                                                                                                                                                       |
| 18  | ID buffer, edges                    | #3250                           | Edge target, window read for hover; `pickEdgeId` a typed scan for clicks                                                                                                                                                                                                                                | 10, 16                                                                                                                                           | M   | Hover 20 ms                                                                                                                                                                                          | Agreement test; per-edge `worldToScreen` per move counted at 0                                                                                                                                                                                                                                                                                                                                   |
| 19  | Per-slot edge look                  | #3251                           | Color, width, opacity per slot, out of the mesh key, under `"batched"`                                                                                                                                                                                                                                  | 16                                                                                                                                               | M   | 1,000 colors: draws counted, a handful                                                                                                                                                               | `render-parity`                                                                                                                                                                                                                                                                                                                                                                                  |
| 20  | Cached non-round ends               | #3251                           | Two floats per pulled edge, refreshed at rest                                                                                                                                                                                                                                                           | 7, 16, 17                                                                                                                                        | M   | No per-edge ray on a move                                                                                                                                                                            | `render-parity` at rest, figure-shaped node                                                                                                                                                                                                                                                                                                                                                      |
| 21  | Curves, routes (PRs)                | #3251                           | Curves in the shader; route texture; a kind stays an object edge until its parity passes                                                                                                                                                                                                                | 16                                                                                                                                               | H   | 100,000 curved edges: moving 40 ms                                                                                                                                                                   | `render-parity` per kind; `test/fidelity`                                                                                                                                                                                                                                                                                                                                                        |
| 22  | Animated lines                      | #3251 closes                    | Fragment scroll replaces GreasedLine if parity holds                                                                                                                                                                                                                                                    | 21                                                                                                                                               | M   | CPU per animated edge per frame counted at 0                                                                                                                                                         | `render-parity`, animation parked                                                                                                                                                                                                                                                                                                                                                                |
| 23  | Rectangle and lasso                 | #3250 closes                    | `{ region }` target, opt-in gesture                                                                                                                                                                                                                                                                     | 18                                                                                                                                               | L   | Lasso over 100,000 rows 2 ms                                                                                                                                                                         | Real-input drag selects a known set; blind-author example                                                                                                                                                                                                                                                                                                                                        |
| 24  | Device sharing, no data             | #3248                           | `device`, engine limits, `errorSink`, scope wait, recovery, dispose order; software adapters decline                                                                                                                                                                                                    | 0, 39                                                                                                                                            | H   | Step within 5% of separate, by harness                                                                                                                                                               | Destroy and crash mid-layout; a Babylon validation error fails no batch; a layout error rejects its landing; ten dispose cycles leave nothing resident                                                                                                                                                                                                                                           |
| 25  | GPU fills the table                 | #3248 closes                    | `to_drawn`, ring, copy at landing; rebuild on a new device; `layoutDevice`; transitions suspend it                                                                                                                                                                                                      | 1, 4, 16, 24                                                                                                                                     | H   | `renderer="webgpu"` layout frame 115 ms                                                                                                                                                              | Rest positions equal the upload path within 1e-6; uploads in a run counted at 0; mid-run click; reload in flight skips its copy; table equals lane after loss; software adapter reports `"separate"`                                                                                                                                                                                             |
| 26  | Lazy `Node`                         | #3249                           | `buildNode` for object rows only; views; engines and transitions by row; events gated; paint from columns                                                                                                                                                                                               | 1, 12, 16                                                                                                                                        | H   | `Node`s built counted at 0                                                                                                                                                                           | Counted after load, transition, fit, filter, layout swap; `evt.node === graph.getNode(id)`; `defineLayout` cases                                                                                                                                                                                                                                                                                 |
| 27  | Lazy `Edge`                         | #3249                           | The same; `reconcile`, pending edges, end accessors                                                                                                                                                                                                                                                     | 26                                                                                                                                               | H   | First frame 8 s; heap 600 MB                                                                                                                                                                         | Counted; `heldEdgeProblems`; undo across a load                                                                                                                                                                                                                                                                                                                                                  |
| 28  | Column door                         | #3249 closes unless 29 is built | `importColumns`, `count`, bulk op-log entry; graph-io, graph-samples routed; staging released; no id maps for typed input; 20-byte batches                                                                                                                                                              | 27                                                                                                                                               | M   | Typed input: first frame 2 s, heap 400 MB                                                                                                                                                            | Digest equals the record path; bulk undo, redo; `render-parity` on 20-byte batches; blind-author example                                                                                                                                                                                                                                                                                         |
| 29  | Conditional: records into columns   | #3249 closes                    | Attribute columns, overlay, records on demand                                                                                                                                                                                                                                                           | 28, 30                                                                                                                                           | H   | Stage 30's heap target                                                                                                                                                                               | Digest and fingerprint equal on every sample dataset                                                                                                                                                                                                                                                                                                                                             |
| 30  | The ceiling                         | ceiling                         | `limits`, budgets, `W_OBJECT_CAP`, `capabilities`; app passes limits to `fitsInBrowser`, `isLarge`; measure the iteration raise                                                                                                                                                                         | 18, 21, 22, 23, 25, 28                                                                                                                           | M   | 1M nodes and edges, typed: first frame 6 s, frames 100 ms (40 with the 6-vertex program and no antialiasing), hover 30 ms, heap 800 MB, layout frame 120 ms, `renderer="webgpu"` 125 ms, lasso 15 ms | Harness run, which settles stage 29; refusal at default limits unchanged; `StartPageFrame.real-element`                                                                                                                                                                                                                                                                                          |
| 31  | Label anchors                       | #3252                           | Geometry-free anchor; labelled and tooltip rows stay batched                                                                                                                                                                                                                                            | 12                                                                                                                                               | M   | 10k labelled still at least 20 ms below stage 0                                                                                                                                                      | `render-parity`; `label-scaling`                                                                                                                                                                                                                                                                                                                                                                 |
| 32  | Grid sampling                       | #3252                           | Option, off by default                                                                                                                                                                                                                                                                                  | 4, 31                                                                                                                                            | M   | Sampling on, 100k labelled: still within 8 ms of labels off                                                                                                                                          | Labels built bounded by cell count; off leaves `nodeLabelCounts` unchanged                                                                                                                                                                                                                                                                                                                       |
| 33  | Glyph atlas                         | #3252 closes                    | Option, off by default; section 4.7's rules; stories to the owner's review                                                                                                                                                                                                                              | 32                                                                                                                                               | H   | 10,000 labels in one draw; 5,000 build under 1 s, on the RTX (SwiftShader's first frame alone is 1.4 s)                                                                                              | Off shows zero pixel change; `test/fidelity` unchanged; fallback list and full atlas by unit test                                                                                                                                                                                                                                                                                                |
| 34  | Done: edge options                  | #3253, #3254                    | Pull request 5803                                                                                                                                                                                                                                                                                       | 0                                                                                                                                                | L   | None                                                                                                                                                                                                 | Merged                                                                                                                                                                                                                                                                                                                                                                                           |
| 35  | Done: force guards                  | #3255                           | Pull request 5819                                                                                                                                                                                                                                                                                       | 0                                                                                                                                                | L   | None                                                                                                                                                                                                 | Merged                                                                                                                                                                                                                                                                                                                                                                                           |
| 36  | Done: collision force               | #3256                           | Pull request 5806                                                                                                                                                                                                                                                                                       | 0                                                                                                                                                | M   | None                                                                                                                                                                                                 | Merged                                                                                                                                                                                                                                                                                                                                                                                           |
| 37  | In pull request 5812: cluster force | #3257                           | Section 4.8                                                                                                                                                                                                                                                                                             | 0                                                                                                                                                | M   | Layout step within 15% of off, 100,000 nodes                                                                                                                                                         | Community spread falls on a known graph; off byte-equal                                                                                                                                                                                                                                                                                                                                          |
| 38  | Close out                           | all, #1910                      | Full matrix into the research note; guide page; misses listed                                                                                                                                                                                                                                           | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39 | L   | Final numbers; both defaults to the owner                                                                                                                                                            | Docs example compiled against published types                                                                                                                                                                                                                                                                                                                                                    |
