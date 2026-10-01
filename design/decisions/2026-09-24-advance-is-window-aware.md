# `advance` executes arc windows; the relax and sweep kernels keep the refusal

Date: 2026-09-24
Decided by: the owner, through the P8 plan (`design/webgpu/plans/2026-09-23-webgpu-p8-frontier.md`,
departure DEP-P8-E; built by task P8-T12 on 2026-09-25, whose findings are folded in below)
Changes: `design/webgpu/webgpu-acceleration-plan.md` section 4.6, the "frontier advance /
compaction" row of the dispatch-limits table (line 1301), which reads "Windowed bindings (arc
ranges): no (v1: `E_TOO_LARGE`)" and "needs the whole `colIdx` bound"; the paragraph above that
table (lines 1176-1180), which says "the frontier family and sort-based algorithms throw
`E_TOO_LARGE` with `{ path: "windowed", algorithm }` until they are extended"; and risk R-9 of
section 14.1 (line 4321), "frontier algorithms on > 33M arcs at default limits throw
`E_TOO_LARGE`". None of those lines is edited. The row's own note, "window-aware advance lands
with P8 (section 13)", and design 13 row P8's deliverable "window-aware advance (lifting the
`E_TOO_LARGE`)" are the statements this record makes true, for the kernels it names.

## The decision

A windowed core -- `colIdx` above `maxStorageBufferBindingSize`, uploaded as arc windows by the
P4 residency -- is executed, not refused, by every frontier-walking kernel of the breadth-first
family: `advance-expand`, both `bfs-fused` dispatches, `bfs-bottom-up` and `sssp-pred`. Each is
dispatched once per window with the window's OWNED arc range in its params record, clips every
row it walks to `[arcBase, arcEnd)`, and accumulates into the same edge queue, the same
`edgeCount` reservation and the same `frontierDegreeSum` word, so the selector reads the whole
level's numbers. The claims are idempotent across windows (`atomicMin` on `depth`, the
bottom-up sweep's `depth[v] == INVALID_INDEX` entry test), so a vertex claimed in window 1 is
skipped in window 2. `breadthFirstSearch` therefore runs on a windowed core.

Three kernels keep `E_TOO_LARGE { path: "windowed", algorithm }` through `assertWholeCore`:
`sssp-relax` (the near-far queue relaxes arcs whose vertex may sit in any window and needs the
whole adjacency in one binding), `bf-relax` (edge-parallel over `edgeList()`, whose arc range IS
the dispatch range and which never had a window loop) and `closeness-sweep` (the bit-parallel
claim reads every in-neighbour's word in one pass). So `sssp` on a weighted run, `bellmanFord`
and `closenessCentrality` refuse a windowed core; `sssp`'s unit-weight route, which runs the
BFS, keeps its own `assertWholeCore` too, a choice the plan made before the lift and did not
revisit. Whether that route should inherit the lift is open and the owner's.

Two facts the build added to the decision:

- The P4 arc windows do NOT partition the arcs: each window opens at the previous window's end
  aligned DOWN to 64 arcs, so consecutive windows overlap by up to 63 arcs at an unaligned row
  boundary. A row-range kernel (`degree`) never revisits the overlap; a frontier-walking kernel
  clipping to the window's binding would expand an overlapped row twice. `coreWindows(core)`
  (`src/primitives/core-shape.ts`) is the one function that turns a core into dispatch ranges,
  and window `k` owns `[start_k, start_{k+1})`, an exact partition inside its binding. Every
  frontier-walking kernel takes its range from it; P9's betweenness and P11's k-core must too.
- The reverse view is never windowed (design 4.3), and the bottom-up sweep binds it whole. On an
  UNDIRECTED snapshot the forward arrays are the reverse (graph-format invariant I7), so the
  sweep runs once per forward window and the lift is complete. On a DIRECTED snapshot whose
  reverse adjacency exceeds one binding, `breadthFirstSearch` refuses up front with
  `E_TOO_LARGE { needed: 4 x arcCount, limit, path: "windowed", algorithm:
  "breadthFirstSearch" }` rather than failing at bind-group validation. The lift is therefore
  whole for undirected snapshots and, for directed ones, holds only while the reverse adjacency
  fits one binding.

## Why

Design 4.6 and design 13 row P8 say opposite things about the same row, and 13 is the later and
the more specific: it lists the lift as a deliverable of this phase and the row's own note says
so. What is true of both statements is the reason 4.6 gave: an expansion "needs the whole
`colIdx` bound" only if one dispatch must see every arc of every frontier vertex. It does not.
The expansion already reserves its output with a workgroup-granular `atomicAdd`, so two
dispatches over two windows append to one queue without coordination, and the clip to
`[arcBase, arcEnd)` is two instructions on the row bounds. The kernel side of the lift was
built into `advance-expand` from its first version; P8-T12 added the driver loop, the exact
partition and the ring sizing that loop needs.

The three kernels that keep the refusal each need something the loop cannot give: the near-far
relax and the bit-parallel sweep read arbitrary vertices' rows inside one dispatch, and the
edge-parallel relax has no row to clip. Extending them is a different piece of work per kernel,
and the tier it serves (10M / 100M at default limits, above 33,554,432 arcs) has a `node-limits`
item for BFS alone.

## What we are giving up, and why it is acceptable

The rejected argument was 4.6's: keep the whole family behind one refusal until windows are
understood for all of it, because a partial lift means a consumer who loads a 50M-arc snapshot
gets a BFS and then a thrown error from the same snapshot's Dijkstra.

It is right that the surface is uneven: `breadthFirstSearch` runs where `sssp` on the same
weighted snapshot refuses, and a directed snapshot can be refused by BFS for its reverse
adjacency while an undirected one of the same size runs.

It is acceptable because every refusal is loud, typed and immediate (`E_TOO_LARGE` with
`needed`, `limit` and `path`, before any device work); because the lift is measured where it
matters (the `windowed-200mb` fixture, 50M arcs at default limits, reaches all 2.5M nodes in
eight levels with one direction switch, bitwise against the CPU oracle, run twice); and because
the ring overrun the lift exposed -- the result batch outgrowing a ring pinned for the level
loop, which corrupted the sorted `order` silently on the card -- would have shipped unseen
behind a blanket refusal. `bfsRingSlots(windows, levelsPerSubmit)` and the exact overrun
counter of `UniformRing` are the lift's by-products and guard every driver that records into a
ring.

## What would reverse this

Three conditions, counted:

- A windowed reverse view in the residency. Then the directed refusal in `breadthFirstSearch`
  goes, the sweep runs once per reverse window, and the lift is whole for directed snapshots.
- A `node-limits` item, a benchmark row or a consumer that runs weighted `sssp`, `bellmanFord`
  or `closenessCentrality` above the binding limit. Then that kernel's window loop lands in the
  phase that carries the item, each on its own terms (the relax needs a per-window vertex
  filter; the sweep needs a per-window claim pass).
- The owner rules that `sssp`'s unit-weight route inherits the lift. That is one line -- the
  route's `assertWholeCore` -- and a record of its own that links back here.
