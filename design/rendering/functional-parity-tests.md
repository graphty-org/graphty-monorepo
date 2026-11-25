# Functional parity tests for the renderer optimizations

## Why this plan exists

Over November 2026 graphty-element gained a second renderer, `renderPath: "batched"`, which draws
nodes and edges from a row table on the GPU instead of one Babylon.js mesh per node and edge. The
default stays `renderPath: "objects"`. The work also rewrote code that the default path runs on
every frame: UpdateManager, DataManager, LayoutManager, Edge, Node, repaint, style painting and the
layout engines. The speed gains are measured by `benchmarks/compare/perf-matrix.mjs`. Nothing yet
checks, with equal care, that every feature still behaves as it did before.

Three problems have already been reported: edges not moving with their nodes during animated
layouts, WebXR pointing and selection on batched nodes (which have no per-node mesh), and hover and
selection of nodes and edges.

This document lists the tests that close those gaps. It reuses existing tests and helpers wherever
it can and says which tests are quick enough for every pull request and which run only in the
6-hour full run or by hand.

## What "behaves as before" means

Each check compares against one of two oracles:

- **The objects path in the same build.** Batched must draw and answer the same as objects: same
  ink in the same places, same node or edge under the pointer, same selection. This is a parity
  check. It cannot catch a regression that both paths share.
- **The objects path at commit 57c0ee700e**, the build from before the optimizations
  (`benchmarks/results/reference`). Current objects must match it. This catches regressions in the
  shared code. Where the reference build cannot run a test, the test asserts a stated invariant
  instead (for example "an edge's ink lies on the segment between its two drawn nodes").

The checks follow four rules:

1. **Check during motion, not only at rest.** Every existing force-layout check waits for a stable
   frame, so it cannot see an edge that lags while the layout runs. The new checks read many frames
   while a layout runs, a node is dragged, a transition plays, the camera moves or data is edited,
   and assert an invariant on each frame.
2. **Read pixels and the public API, not bookkeeping.** The per-frame transition check in
   `test/browser/transitions/layout-transition.test.ts` reads the element's own record of where it
   drew each edge end. Bookkeeping like that has already passed on a blank canvas. The new checks
   read the canvas inside the frame (`engine.readPixels` in `scene.onAfterRenderObservable`) and
   take node centers from `nodeScreenPosition`.
3. **Real input.** Mouse moves, clicks, drags and wheel through the real-input helpers
   (`test/helpers/real-input.ts`, `test/interactions/helpers/interaction-helpers.ts`); emulated XR
   controllers and hands through the IWER helpers (`test/interactions/helpers/iwer-setup.ts`,
   `xr-input-driver.ts`). No `notifyObservers`, private controller state or fake sessions.
4. **Wait on conditions.** A test waits for the layout to report settled, for a stable frame, or
   for a counted number of drawn frames (`test/helpers/drawn-frames.ts`). It never sets a timeout,
   interval or deadline of its own (lint rule `local/no-test-timing`).

### Fixtures must keep batched rows lazy

On batched, building one Node object builds every Node in its connected component, and any edge
with an arrowhead is built as an Edge object. A connected fixture with directed edges therefore
turns into object rows as soon as anything touches it, and the test then exercises the objects code
while claiming to test batched. The one confirmed defect below hides on a connected ring and shows
on disjoint pairs.

Every new batched case uses a fixture of several disjoint components (pairs and a triangle) with
both directed and undirected edges, adds its data after the first frame (the state the graphty app
reaches), and asserts before the action under test that fewer Nodes are built than there are nodes,
as `assertLazy` in `test/browser/drawn-invariants.test.ts` does.

## What the probes already found

Scratch probes run against master 925f9b6151 and the reference build, with SwiftShader WebGL.
Probe sources are under `tmp/parity/risks/probes/` and `tmp/parity/features/`.

Confirmed defect:

- **Arrowed, dashed, curved and labeled edges stay at their old place through and after a layout
  transition, on batched only.** A node row with no Node object is moved during a transition by
  `RowTable.place`, which counts the write as a move of a node that has a mesh. UpdateManager's
  moved-row walk only re-lays object edges for moves counted as rows without a mesh, so the Edge
  objects joining those rows keep their old ends for good. It shows on any component with no built
  Node, which is the usual state of a freshly loaded multi-component graph. Repro:
  `tmp/parity/risks/probes/zz-glide-disjoint.test.ts`.

Found, not yet reduced to a cause:

- On batched, hovering a node while a force layout moves it finds nothing; objects finds the node.
  Batched hover answers from an ID buffer a frame or more after the move. (One sample per case.)
- On batched during a 300-node GPU layout with render on demand off, `nodeScreenPosition` disagrees
  with the drawn node for one frame per run.
- On objects, after hovering a node that was grown by a restyle, removing another node and moving
  the pointer to its empty place still reports the first node as hovered while `elementAt` says
  nothing. Not yet checked against the reference build.
- With the GPU test flags on, ngraph (a CPU layout) never reported settled within 300 frames on
  either path, against about 30 frames without them.

Open findings from the batched audit (`tmp/audit-batched/report/findings.json`) that these tests
will pin: a click or right-click on a node restarts a settled layout (both paths); a settled layout
restarts after a shared-device loss (both paths); a consumer mesh hidden with `setEnabled(false)`
stays drawn at rest with on-demand off (both paths); `nodeScreenPosition` throws before the first
frame; `screenToWorld` returns null over batched nodes; Babylon picks, `pointerInfo.pickInfo` and
ActionManager never see a batched node; GlowLayer and consumer lights do not apply to batched
nodes; `session.positions.set` before the first frame is overwritten on batched; `node.visible =
false` also hides every pulled edge touching the node on batched; Graphviz routes are drawn
straight on batched; the GPU landing ring is too small for four batches in flight and is lost after
a node-only edit; after a WebGL restore mid-layout the first batched frames show an older landing;
the gpu-loss picture checks compare a blank frame with a blank frame on WebGPU.

Checked and fine: on CPU simulations (ngraph, d3, forceatlas2) at 16 nodes, and on the GPU lane
(forceatlas2, spring, spring-electrical through WebGL) at 16 and 300 nodes, both paths, 2D and 3D,
arrowed, undirected and curved edges, and node drags, no frame drew an edge off its nodes. The
reference objects path gives the same result. At rest, hover, click and `elementAt` agree across
paths for normal, tiny and overlapping nodes and six edge kinds. The XR laser lands on the same node
at the same distance on both paths. XR has no hover on either path today; that is not a regression.

Test tooling gaps found: under the WebGPU renderer the pixel helpers in
`test/helpers/drawn-invariants.ts` report every edge undrawn on both paths (the picture is read in
the wrong orientation or from an empty swap chain), so nothing on WebGPU is checked by pixels yet.
An assertion inside `vi.waitFor` on what the XR laser hit, as `node-batch-xr.test.ts` writes it,
waits until the global hang guard when the laser hits an edge or nothing; read the hit after a
counted number of frames instead.

## The suites

Eight suites, each buildable on its own branch. Suites 1 and 2 add the shared per-frame recorder;
the others reuse it, so suite 1 lands first.

### 1. Edges, arrowheads and labels follow their nodes on every drawn frame

**Scope.** Both paths, 2D and 3D, edges undirected, arrowed, curved, dashed, labeled and self-loop,
while nodes move by: a running CPU simulation (ngraph seeded, d3, forceatlas2, fruchterman-reingold);
a layout transition (glide, particles, and a transition into a simulation layout); a real-mouse
drag of a hub node. Includes the confirmed transition defect and its fix.

**Method.**

- Refactor `test/helpers/drawn-invariants.ts` so `undrawnEdges`, `undrawnNodes` and `strayInk`
  accept a frame already read, and add `recordDrawnFrames(element, n, check)` in
  `test/helpers/drawn-frames.ts`: an observer inserted first on `scene.onAfterRenderObservable`
  reads the canvas synchronously and runs `check` with that frame and the frame's
  `nodeScreenPosition` centers. Classify ink by hue (fixture node color `#2040ff`, edge color
  `#ff00ff`), not by a fixed brightness delta, so thin antialiased lines in a zoomed-out 3D view
  still count. Give fixture nodes a minimum screen size so no node falls below a pixel.
- New `test/browser/edges-follow-running-layout.test.ts`: `describe.each` over path x view x edge
  kind x layout on the lazy multi-component fixture (about 30 nodes). Assert on each of the first
  30 moving frames: no edge undrawn, no stray edge ink, and the arrowhead tip within a node radius
  of the target's surface. Assert at least N moving frames were checked and that later frames
  differ from earlier ones, so a frozen layout cannot pass. Wait on settled, never on time.
- "And then" rows: part way through the run, call `getNode(id)` and `getEdges()` (lazy objects built
  mid-move), restyle one edge and one node through `session.styles`, hover a node with real input,
  add a node, set `node.visible = false`, switch 2D and 3D, apply a filter, call `zoomToFit`, take a
  screenshot. Each row runs the same per-frame check for the next frames, and the restyle row also
  checks the edge midpoint takes the new color.
- Extend `test/browser/transitions/layout-transition.test.ts` with curved, labeled, self-loop and 3D
  arrow edges and the disjoint fixture, and run the pixel check in its existing per-frame watcher.
- Add a case to `test/interactions/node-gesture-edges.test.ts`: drag a hub in about ten real mouse
  moves; each frame, every incident edge (straight, curved, self-loop, to a group) stays attached and
  edges not touching the hub do not move.
- Add the new file to `MINIMUM_WORK_TESTS` so frames split across ticks are exercised.
- Fix the transition defect under batched only: a transition's row moves must reach the walk that
  re-lays object edges (count `RowTable.place` writes for rows without a Node as unplaced moves, or
  have the transition runner mark the moved rows).

**Reuse.** `test/helpers/drawn-invariants.ts`, `drawn-frames.ts`, `canvas-pixels.ts`,
`real-input.ts`; the per-frame watcher and `drawnEnds` in `layout-transition.test.ts`; `assertLazy`
in `drawn-invariants.test.ts`; probes `tmp/parity/features/edges-follow-simulation.probe.ts`,
`tmp/parity/risks/probes/zz-parity-edges-follow.test.ts` and `zz-glide-disjoint.test.ts`.

**CI tier.** Pull request: browser and minimum-work projects. forced-batched skips
`edges-follow-running-layout.test.ts` (listed in `test/forced-batched/skipped.json`), since each case
sets its render path itself. About 8 seconds per path and view at this size.

**Run.** `tools/low-priority.sh npx vitest run --project=browser --project=minimum-work
test/browser/edges-follow-running-layout.test.ts test/browser/view-switch-draws-every-node.test.ts`

### 2. GPU layout landings, skipped frames, WebGPU pictures and device loss

**Scope.** Batched mainly, objects as control: WebGPU-accelerated layouts (forceatlas2, spring,
spring-electrical through the `./webgpu` entry point) at about 300 and 2,000 nodes, frames skipped
between landings, smooth-at-rest, the WebGPU renderer's picture, edits during a run, WebGL context
loss and WebGPU device loss mid-layout.

**Method.**

- Make `readFrame` in `test/helpers/paint-assertions.ts` and the suite 1 recorder return rows in
  one orientation on WebGL and WebGPU, and read the WebGPU frame in the same task as the frame. A
  positive control asserts the at-rest helpers see every edge on a known picture under WebGPU
  before anything is compared, so the current "every edge undrawn" result cannot recur silently.
- Add GPU rows to the suite 1 file gated on `GRAPHTY_BROWSER_GPU`, so the batched WebGPU full-run
  shard picks them up: steady landings; `addNodes` of a node only, mid-run (the lost ring); a
  restyle and a real-input hover between two landings, checking the next drawn frame; a dragged and
  pinned node. Each frame also asserts `nodeScreenPosition` is within a node radius of the drawn
  node blob.
- In `test/gpu-loss/shared-device-drawn.test.ts` and `shared-device-drawn-moves.test.ts`, assert
  ink is present before comparing frames (blank compared with blank fails), and run the per-frame
  edge check on the first frames after recovery while the layout moves. Assert a layout that was
  settled before the loss stays settled after it.
- One case for the ngraph-never-settles observation with the GPU flags on, to find out whether it is
  a test-environment effect or a defect.

**Reuse.** `test/browser/webgpu-layout.test.ts`, `test/gpu-loss/*` (on-demand-landing-gaps,
shared-device-drawn, shared-device-drawn-moves, engine-loss), the suite 1 recorder,
`test/browser/accelerated-run-holds-frames.test.ts`.

**CI tier.** Full run and `render-proof.yml` by hand: needs real or SwiftShader WebGPU and takes
minutes.

### 3. Pointing at nodes and edges: hover, click, elementAt, selection

**Scope.** Both paths, real mouse. Nodes: normal, tiny (size 0.05), mixed sizes, overlapping in 2D
and 3D, under labels, added after the first frame, grown by a restyle, next to a removed node, and
moving under a running layout. Edges: undirected, arrowed (on the line and on the cap), no
arrowhead, dashed, patterned, curved, self-loop, labeled, wide, two parallel edges, near the point
where a trimmed edge meets its node. Readers: the hover event, `session.selection.hovered`, the
Hovered and Selected style layers by pixels, `elementAt`, `screenToWorld`, selection after click,
shift and ctrl click, right-click keeping the selection, click on empty canvas clearing it.

**Method.**

- New `test/interactions/pick-parity.test.ts`, which sets the path per case (so forced-batched skips
  it, as with `drawn-invariants.test.ts`). For each case and both paths record the hovered id, the
  hover event, `elementAt`, `screenToWorld` and the selection after a click; assert hover and click
  name the same element and that both paths agree. A point 2 px off a line selects nothing.
- Hover every node: a seeded 200-node layout, hover each node's center with real input and check it
  reads as hovered, then click and check it is selected. A few hundred hovers keeps it PR sized.
- Hover during motion: on a running ngraph layout, move the pointer onto a node during the first
  frames, wait for a stable frame and read what is hovered. The contract to assert: the node under
  the pointer in the frame the pointer move arrived. This pins the batched miss found by the probe.
- A click on a node of a settled layout leaves it settled: over the next counted frames no node
  moves and the layout status stays settled (open finding, both paths).
- Undirected edges on the lazy fixture: hover paints the Hovered layer on the edge's pixels, a click
  paints Selected and the menu names the edge (the plain-edge case the old directed fixtures cannot
  see).
- Run the objects cases once against the reference build (suite 7's runner) and store their answers
  as a fixture, so the stale-hover-after-remove observation is decided against the old behavior.

**Reuse.** `test/browser/edge-pick-row-lines.test.ts`, `element-at.test.ts`,
`drawn-invariants.test.ts` (hover and click on a ring), `test/interactions/pointer-on-rows.test.ts`,
`union-hover.test.ts`, `hover-ends-on-leave.test.ts`, `test/interactions/selection/*`, probe
`tmp/parity/risks/probes/zz-parity-hover.test.ts`. Note that the iframe is narrower than a 500 px
element; keep fixtures inside the visible area.

**CI tier.** Pull request: interactions project (and forced-batched for the files that do not pin a
path).

### 4. WebXR on batched rows

**Scope.** Both paths, IWER controllers and hands: laser on a row through the stand-in mesh for node
sizes unset, 0.3 and 3; two rows on one ray (nearer wins); laser on an edge; trigger tap select and
drag with edges present; edges following an XR-dragged row in each eye; hand pinch drag; pointing
while ngraph moves the rows; two controllers on two rows; voice naming the row under the ray; the XR
menu over rows; a renderPath set before load as well as switched after it.

**Method.** Extend `test/browser/node-batch-xr.test.ts` and add
`test/interactions/xr/xr-batched-rows.test.ts` on the lazy fixture with directed and undirected
edges. Compare both eyes' whole frames across paths with edges present. During a trigger drag run
the suite 1 recorder on the left-eye half of the canvas. Read the laser's hit after a counted number
of frames, never in `vi.waitFor` (it hangs when the laser hits an edge or nothing). XR hover does not
exist on either path today: assert the current behavior and leave the feature to its own issue. The
probe found taps during a running layout racy on both paths; define the contract (the row under the
ray in the frame the press arrived) and assert it.

**Reuse.** `test/interactions/helpers/iwer-setup.ts`, `xr-input-driver.ts`, `node-batch-xr.test.ts`,
`test/interactions/xr/*`, `test/browser/xr-drag-amplification.test.ts`, probe
`tmp/parity/risks/probes/zz-parity-xr.test.ts`.

**CI tier.** Pull request: xr project (about a second per case).

### 5. Make forced-batched test batched, and pin the consumer scene contract

**Scope.** The `forced-batched` project reruns the browser and interactions suites with batched as
the default, but tests that read `node.mesh`, call `getNode`, `getEdges` or `edges.values()`, or load
directed data build object rows first and quietly test objects. Also the Babylon.js APIs a consumer
uses on the element's scene.

**Method.**

- A check (a contract test over the file list, cheaper than a lint rule) that fails when a file run
  by forced-batched builds objects before its action without either asserting a batched row count
  (`graph.rowCounts.batchedNodes`) or being listed in `test/forced-batched/skipped.json` with a
  reason.
- Widen forced-batched's include to the browser project's whole include (managers, edge-cases,
  integration, `Edge.bezier`). The audit got 316 of 331 passing; record the 15 failures as batched
  defects with issues, not skips.
- Add a forced-batched twin of minimum-work (`MINIMUM_WORK_TESTS` with
  `test/forced-batched/setup.ts`). Remove `time-ghost.test.ts` from `skipped.json`; its reason is
  stale (6 of 6 pass).
- New `test/contracts/consumer-scene.test.ts`, objects and batched: `scene.pick` at a node's screen
  point, an ActionManager `OnPickTrigger` on a node, a GlowLayer pixel at a node, a consumer light
  changing a node's color, `screenToWorld` over a node, `nodeScreenPosition` before the first frame,
  a consumer mesh hidden with `setEnabled(false)` leaving the canvas at rest with on-demand off.
  Objects must work as at the reference build. Batched asserts the documented behavior; the open
  batched failures stay failing as tracked issues, never skipped.

**Reuse.** `vitest.config.ts` project lists, `test/forced-batched/setup.ts` and `skipped.json`,
`test/browser/NodeBehavior-xr-compatibility.test.ts`, the audit's run notes in
`tmp/audit-batched/setup.md`.

**CI tier.** Pull request (the include change adds files to existing forced-batched bins; the
contract test is a few seconds).

### 6. Story pictures in motion across both paths

**Scope.** `test/render-parity/stories.test.ts` compares each story's final picture on objects and
batched. It never sees a mid-animation picture, skips the two transition stories, and drops all
label stories as hanging.

**Method.**

- A hold mode, `VITE_PARITY_HOLD=0.5`, that sets `layoutTransition` hold on stories with a
  transition so both paths draw a final picture part way through the move. Then drop
  LayoutTransitions Glide and Particles from `unstable.json`: this changes what is held still, not
  how strictly pictures are compared.
- A frame-count mode for simulation stories: seeded layout, render on demand, N drawn frames, then
  compare.
- Recheck the LabelStyles hang and remove the `HANGS` exclusion if it no longer hangs.
- New `test/render-parity/feature-matrix.test.ts`: the lazy 8-node fixture drawn on both paths for
  each style channel and for `positions.set` before the first frame, `node.visible = false` with
  incident plain edges, a Graphviz dot layout and two overlapping nodes; compare node-ink and
  edge-ink masks, not exact pixels. Reuse the parity-table probes in
  `tmp/audit-batched/parity-table`.
- Framing parity: for the same seeded graph, after settled, the public camera state agrees across
  paths within a tolerance.

**Reuse.** The render-parity project, its unstable lists and `VITE_PARITY_STORIES` filter,
`test/browser/node-batch.test.ts`, `batched-fit-envelope.test.ts`, `auto-frame.test.ts`.

**CI tier.** Full run (`graphty-element-render-parity-*`) and `render-proof.yml` by hand; pull
requests keep drawing only the stories they add or change.

### 7. Differential run against the build from before the optimizations

**Scope.** Current objects (and batched) against objects at 57c0ee700e, for regressions shared by
both paths, which no same-build parity check can see.

**Method.** One script, `benchmarks/compare/parity-vs-reference.mjs`, beside `perf-matrix.mjs`:

- Builds both commits in detached scratch worktrees (graph-format, graph-io, graph-samples,
  algorithms, layout, webgpu-graph-algorithms, babylonjs-map, babylonjs-models, remote-logger, then
  graphty-element), reusing `benchmarks/compare/builds/<label>`.
- Pictures: captures HEAD's Storybook with `visual-review/capture/capture.mjs` into `tmp/parity` and
  compares each story present at both commits against
  `git show 57c0ee700e:visual-baselines/graphty-element/<story>.png`, read only. Stories whose id or
  content changed are listed apart.
- Behavior: runs suite 1, 3 and 5 files that need no new API on both builds and diffs the recorded
  public facts per step (positions per frame, hovered and clicked ids, layout status after a click,
  pixels after hiding a consumer mesh, picture after a resize).
- Loosened tests: checks out the reference's versions of `test/interactions/**` and
  `test/browser/**` files whose imports still resolve and runs them on HEAD under browser and
  forced-batched; each failure is reviewed against HEAD's version of that test.
- A per-frame correctness probe on the benchmarks/compare page records node centers and edge
  midpoint ink during the layout-running stage, for the reference and for HEAD on both paths, at the
  sizes the perf matrix uses (where large-graph lag would show).

Timed parts run under `flock tmp/cosmos-impl/gpu-bench.lock tmp/bench-cores/bench-cores.sh run`.

**Reuse.** `benchmarks/compare` (`main.js` already loads old builds with an old-API fallback,
`run.mjs`, `RUNBOOK.md`), `visual-review/capture/capture.mjs`, `tmp/parity/features` build logs (the
reference builds and runs browser tests).

**CI tier.** By hand before a release; never on pull requests.

**Run.** `benchmarks/compare/PARITY-VS-REFERENCE.md` (branch `test/reference-build-diff`): `node
parity-vs-reference.mjs build | pictures | behavior | loosened | frames | report` from `benchmarks/compare/`.

### 8. The graphty app's acceptance routes on batched

**Scope.** The app turns batched on only when the `cosmograph` feature is on
(`graphty/src/workspace/frame/ElementHost.tsx`), and neither acceptance runner turns it on, so every
route has run on objects only.

**Method.** Add `--features <list>` to `graphty/acceptance/run.mjs` and
`selection-workspace-uat.mjs` (the latter already builds `features=` for the timeline experiment).
Run every route with and without `cosmograph` and diff outcomes and errors per route. Add two routes:
open a sample, hover and click three named nodes and an edge and check the status and selection
readers; change the layout and, while it animates, check through `elementAt` that a point between
an edge's two `nodeScreenPosition` ends hits that edge.

**Reuse.** `graphty/acceptance/run.mjs`, `routes.mjs`, `readers.mjs`, `selection-workspace-uat.mjs`,
`tools/acceptance.mjs`, `tools/with-browser.sh`.

**CI tier.** By hand and in `check:quick --with-dry-run`; the UAT stays report-only in CI as it is.

### 9. Hover, click and edges in motion in WebKit (the iPad path)

**Scope.** Both paths, in WebKit. Until now only still pictures were compared in WebKit
(render-parity's WebKit shard); every pointing and edge-follow check ran in Chromium. Batched
picking reads a pixel back from an ID render target, and WebKit's WebGL2 differs from Chromium's in
read-back formats, integer and float targets and antialias resolve, so a WebKit-only failure would
mean hover and selection are broken on an iPad with no test showing it.

**Method.** A vitest project, `interactions-webkit`, runs a subset of two existing files in WebKit
by test name: `pick-parity.test.ts`'s nodes and edges at rest with the shift, ctrl, right-click and
empty-canvas selection cases, and `edges-follow-running-layout.test.ts`'s ngraph and glide cases,
on both paths. WebKit has no DevTools protocol, so `test/helpers/real-input.ts` sends its mouse
events to a `dispatchMouseEvent` browser command that makes them with Playwright's mouse and
keyboard (Chromium keeps the protocol path).

**Reuse.** The two test files unchanged; the render-parity and models-webkit project setup.

**CI tier.** Full run only: shard `graphty-element-interactions-webkit` in
`tools/ci-test-matrix.mjs`. By hand: `npm run test:interactions-webkit` in
graphty-element (test/interactions/README.md).

### 8b. The app's dry-run routes on batched, compared with the default

**Scope.** Section 8 added the canvas test on both paths, but `check:quick --with-dry-run` still
walked the dry run's routes and the selection workspace's test on objects only, so the Inspector, the
style panel writing styles, layout switching, file load and project reload, undo, the selection
workspace and the statistics and table views were never checked where lazily built Node and Edge
objects, column-loaded rows and batched style painting meet app code.

**Method.** `run.mjs` once as is and once with `--features cosmograph`, then `compare-reports.mjs` on
the two reports; the same for `selection-workspace-uat.mjs` (Chromium, `--report`). Every route whose
result differs between the two is a graphty-element defect under batched. `run.mjs` also asserts the
cosmograph run really drew with `renderPath === "batched"`.

**Reuse.** `run.mjs --features`, `compare-reports.mjs`, `selection-workspace-uat.mjs --features
--report`, the dry-run step of `tools/check-quick.sh` (tested by `tools/check-quick.test.mjs`).

**CI tier.** Manual and `check:quick --with-dry-run` only (branch `test/app-routes-on-batched`, issue
#9905); it needs this machine's NVIDIA card and several minutes, so it stays out of pull-request CI.

**How to run.** `pnpm exec nx run graphty:build`, then `pnpm run check:quick --with-dry-run`, or the
commands in `graphty/acceptance/README.md`, "On both render paths".

### 10. Picking and edges after a resize, a pixel ratio change, a camera wheel or drag, and a remount

**Scope.** Both paths. Batched hover and click answer from picking buffers sized to the canvas and
redrawn for the camera; every other pick test uses one fixed-size element that never changes, and
the element-remount test checks only through the API. After a resize (bigger, smaller, odd size), a
pixel ratio of 2 or 1.5, a real wheel zoom and a real drag on empty canvas, and after the element is
removed while ngraph runs and inserted again in a later task (a new engine, row table and buffers),
hover and click must name the node or edge under the pointer and edges must stay on their nodes.

**Method.**

- `test/interactions/pick-parity.test.ts`, "pointing after the view changes": per view and change,
  mount the lazy fixture at 320 px on each path, pick once (so the buffers exist at the old size),
  make the change, then point at every node and three edge middles with the real mouse. Both paths
  must answer alike, each answer's readers must agree, and objects must match the reference build
  (answers stored in `pick-parity.reference.json`).
- `test/browser/edges-follow-running-layout.test.ts`: three more "and then" steps (a real wheel
  zoom, a real drag on empty canvas, a resize of the element), at least five frames checked after
  each step; a node pushed past the canvas edge is not required to be drawn. A remount case removes
  the element part way through ngraph, inserts it again, checks every frame of the resumed run and
  hovers four nodes with the real mouse.

**Reuse.** The pick-parity readers (`answer`, `problems`), `real-input.ts` (`wheel`, `drag`), the
edges-follow frame check and recorder, the remount sequence of `element-comes-back-after-removal`.

**CI tier.** Pull request, in the existing interactions and browser projects (about 70 s and 25 s
more). The pixel-ratio edge pick fails on both paths and on the reference build: the projects stay
red there until that defect is fixed.

**Run.** From graphty-element: `../tools/with-browser.sh ../tools/low-priority.sh npx vitest run
--project=interactions test/interactions/pick-parity.test.ts -t "pointing after the view changes"`
and `... --project=browser test/browser/edges-follow-running-layout.test.ts -t "after 'a re|inserted again"`.
Branch `test/resize-camera-remount-picking`.

### 11. Removing nodes and edges, and undo and redo of a removal, while a layout runs

**Scope.** Both paths, 2D and 3D. A removal renumbers the batched rows (the store freezes again)
while the layout still places nodes by row and GPU landings are copied by row, with three or four
batches in flight; undo brings the rows back through the records. No suite removed anything mid-run.

**Method.**

- `edges-follow-running-layout.test.ts`: six more "and then" steps part way through ngraph -- a node
  of an arrowed pair removed, a plain edge removed, an arrowed edge removed (by the id the element
  gave it, so no Edge is built first), a node removed and another added, a removal undone, a removal
  undone and redone. Frames drawn while the step's promise is pending are not checked (either state
  may be on screen); every frame after it is, and at least five moving frames must follow. Each
  removal step also checks in layout space that every kept node keeps its own place
  (`keptPlaceJump` in `test/helpers/drawn-invariants.ts`: no kept node moves more than twice the
  median kept node or three times the layout's speed per frame drawn); "a node added" is the
  control. Undo and redo stop a running layout and restore the history's arrangement by design
  (design/undo/undo-design.md 6.2), as at 57c0ee700e, so those steps check the picture at rest.
- `gpu-landings-drawn.test.ts` (GPU shards only): the first node removed (every row renumbered), an
  edge removed, the first node removed and another added, the removal undone, undone and redone, on
  both paths and both renderers. Pure removals also check that every kept edge keeps its length in
  layout space (`keptEdgeStretch`); an add is not checked that way because forceatlas2 starts again
  from new places on an add, on both paths and at the reference. Undo cases read ten still frames
  (`stillFrames` in `test/helpers/frame-recorder.ts`) and require no node to move.
- `gpu-loss/landings-drawn.test.ts`: with 3 and 4 batches in flight, a mid-run removal, 20 moving
  frames checked, then its undo, ten still frames and the row texture against the CPU copy.
- `pick-parity.test.ts`: with m0 hovered and selected, ngraph starts, m0 is removed (and, in a
  second case, the removal undone); hover must not name m0, the selection must drop it, a real hover
  on a renumbered node while the layout still runs names the node under the pointer when the move
  arrived, and after the run hover, its event, `elementAt` and a click name m1, m5, m13, m23 (and m0
  when restored) and the last pair's edge.

**Proved able to fail** (scratch edits, reverted): row lines ignoring the node remap (edges-follow
node removal, batched); the positions lane ignoring the remap (edges-follow and GPU pure removals);
the hover ID buffer keeping a row's first id (pick-parity, batched).

**Found.** Removing a node and then adding one mid-run under ngraph hands the nodes on rows after
the removed one other places (rows after it jump 3 to 5 times as far as the rest, both paths; the
build 57c0ee700e does the same with smaller jumps). On a GPU layout the same edit tears joined
pairs apart, but forceatlas2 restarts on any add, at the reference too, so it is not checked there.

**CI tier.** Pull request for the browser, minimum-work and interactions parts (about 30 s and 20 s
more); the GPU cases run only in the full run's GPU shards and the gpu-loss shard.

**Run.** From graphty-element: `../tools/with-browser.sh ../tools/low-priority.sh npx vitest run
--project=browser test/browser/edges-follow-running-layout.test.ts -t "removed|removal|a node added"`
(and `--project=minimum-work`); `... --project=interactions test/interactions/pick-parity.test.ts -t
"after a removal"`; `GRAPHTY_BROWSER_GPU=swiftshader-unthrottled ... --project=browser
test/browser/gpu-landings-drawn.test.ts -t "mid-run"`; `... --project=gpu-loss
test/gpu-loss/landings-drawn.test.ts -t "removal"`. Branch `test/removal-and-undo-mid-layout`
(issue #9902).

## Order of work

Suite 1 first: it adds the recorder the others use and fixes the confirmed defect. Suites 2 to 6
and 8 can then proceed in parallel. Suite 7 runs last, over the files the others added, before the
next release.

## What stays out

The visual-review capture set, its baselines and its thresholds are not changed; the batched
pictures come from render-parity. Every failure these tests find is a defect to fix (batched fixes
stay under `renderPath: "batched"`; an objects regression is restored to its behavior at
57c0ee700e), never a skip, a retry or a longer wait.
