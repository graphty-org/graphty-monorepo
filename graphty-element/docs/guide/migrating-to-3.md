# Migrating to 3.0

graphty-element 3.0 adds undo and redo for every change a project saves (see
[Undo and History](./undo)). To make every change undoable, every change now goes through the
session, and the places that let code change the graph without it are closed. This page lists
what that breaks, each with the code that replaces it.

Most applications need only the first few rows: records are read-only, positions are written
through `session.positions`, and `batchOperations` groups what goes through its `tx`.

## Records are read-only

`node.data` and `edge.data`, and the records `session.data` returns, are frozen. Writing to one
throws in strict mode and does nothing otherwise.

```typescript
// 2.x: node.data.team = "red";
await element.session.data.updateNodes([{ id: node.id, values: { team: "red" } }]);
```

A plugin algorithm that writes values onto records while it runs needs no change: those writes
are recorded as its step.

## Positions are written through their verbs

`session.positions` keeps its readers (`count`, `isPlaced`, `isPinned`, `read`) and loses
`write`, `setPinned`, `fillUnplaced`, `grow`, `remap`, `view` and `pinnedView`.

```typescript
// 2.x: session.positions.write(index, x, y, z);
await session.positions.set([{ id: "a", x: 0, y: 10, z: 0 }]);

// 2.x: session.positions.setPinned(index, true);
await session.positions.pin(["a"]); // unpin(["a"]) releases; session.positions.pinned lists them
```

`SessionGraphStore.positions`, `DataManager.positions` and a layout engine's `nodePositions` are
read-only in the same way. The `position` and `graphty.pinned`
columns of a snapshot are copies taken when the snapshot is read; read a new snapshot to see nodes
that moved since.

## Internal maps and managers are read-only or private

`DataManager`'s node and edge maps, `Graph.styles.config`, `Graph.operationQueue` and
`LayoutManager.layoutEngine` can no longer be written from outside.

```typescript
// 2.x: wrote the background straight into Graph.styles.config
await element.session.config.set({ background: { backgroundType: "color", color: "#000" } });
```

Read through the session instead: `session.data`, `session.layout`, `session.config`.

## A layout engine's membership is the element's

`LayoutEngine`'s `addNode`, `addEdge`, `addNodes`, `addEdges`, `removeNode`, `removeEdge` and
`attachPositions` are protected. A custom engine still implements `addNode`, `addEdge` and, when it
keeps a node list, `removeNode` and `removeEdge`, and the element calls them as the graph changes.
Calling them on the element's engine from outside would leave it out of step with the graph.

```typescript
// 2.x: graph.getLayoutManager().layoutEngine.addNode(node);
await element.session.data.addNodes([{ id: "a" }]); // the engine follows the graph
```

## SimpleLayoutEngine is deprecated

A one-pass layout is now a descriptor and a function, registered with `registerSnapshotLayout`
from `@graphty/graphty-element/extend` (or the bundle). The element's own one-pass layouts are
built on it, and it hands the layout pins, the rows an add introduced, an abort signal and a
progress channel. `SimpleLayoutEngine` keeps working through 3.x, so nothing has to change now,
and so does its protected `pairWeights` helper (with `pairWeightKey`): the summed weight of the
parallel edges between two nodes, read from the element's graph store. Both are deprecated; a
snapshot layout reads the weights from the `stored` graph its input carries. The protected
`reportClampedWeights` helper is removed: the warning it logged about edge weights at or below
zero is now logged by the Kamada-Kawai engine itself, and a subclass that called it should drop
the call or log its own warning. A live layout,
stepped frame by frame, still extends `LayoutEngine`. See
[Custom layouts](./extending/custom-layouts).

```typescript
// 2.x: class MyLayout extends SimpleLayoutEngine { doLayout() { /* fill this.positions */ } }
registerSnapshotLayout({ descriptor, compute: (input) => myCoordinates(input.graph) });
```

## Setting getters read the value in effect

A settings getter such as `nodeIdPath`, `repeatedEdges`, `edgeWeightPath`, `directed`,
`runAlgorithmsOnLoad`, `background` or `selectionStyle` returns the value set on the element, or
the value in effect when none was set, instead of `undefined`. Assigning a setting its default
reads back and records no undo step, because nothing changed. `layoutBehavior` always includes
`preSteps`, `stepMultiplier` and `minDelta`.

```typescript
element.nodeIdPath; // "id" on a fresh element, not undefined
```

## batchOperations groups what goes through tx

`batchOperations` on the element and on `Graph` is a transaction. Its callback receives `tx`, and
only calls made through `tx` join the batch; a throw rolls the batch back instead of keeping what
was done before it. It no longer holds the operation queue.

```typescript
// 2.x: await element.batchOperations(async () => { await element.addNodes(nodes); });
await element.batchOperations(async (tx) => {
    await tx.data.addNodes(nodes);
});
```

A door called on the element during the callback still works, as a step of its own, and logs a
warning naming the `tx` verb to use. To keep part of a batch when a later part throws, catch the
error inside the callback.

## Data source getters report a descriptor

The `dataSource` and `dataSourceConfig` getters report where data came from, never an inline
`data` string or a `File`.

```typescript
// 2.x: const text = element.dataSourceConfig.data;
const text = myOwnCopyOfTheData; // keep your own reference to the payload you assigned
```

## Some layout behaviour settings are preferences

`layoutBehavior`'s `pinOnDrag`, `declutter`, `maxInFlight`, `iterationsPerStep` and
`zoomStepInterval` are not undoable. Nothing to change: they are preferences, as before.

```typescript
element.layoutBehavior = { node: { pinOnDrag: true } }; // unchanged, and not a step
```

## Per-domain events follow the repaint

`style:changed`, `visibility:changed` and the other per-domain events fire after the repaint that
draws the change, and one repaint may cover several quick edits.

```typescript
// Read state on the event as before; do not assume one repaint per edit
session.on("style:changed", ({ painted }) => console.log(painted));
```

## Assistant commands write through ctx.tx

A command registered with `registerCommand` joins the message's undo step only through `ctx.tx`.

```typescript
// 2.x: await ctx.graph.getSession().styles.add(spec);
await ctx.tx.styles.add(spec);
```

## Ctrl+Z and Ctrl+Y undo and redo on a focused canvas

A host that binds the same keys at the window sees one press twice unless it skips handled keys:

```typescript
window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented) return; /* your binding */
});
```

Or turn the element's keys off with `<graphty-element history-keys="false">`.

## Event and status unions are wider

`StyleChange`, `VisibilityChange` and `RunChange` gain `cause`; `RunPhase` gains `"removed"` and
`"restored"`; `RunStatus` gains `"removed"`; `SelectionCause` gains `"history"`;
`history:changed` is new. An exhaustive `switch` over one of them fails to compile until it
handles the new cases.

```typescript
switch (change.phase) {
    /* ...existing cases... */ case "removed":
    case "restored":
        break;
}
```

## Result records compare by value

`RunResult.node(id)` and `edge(id)` return an equal record on each call, not the identical object.

```typescript
// 2.x: result.node("a") === previous
assert.deepEqual(result.node("a"), previous);
```

## Settings made before the first load are the baseline

Configuration, layouts and style layers set before any data arrives are where history starts, and
are not undoable. Nothing to change.

```typescript
element.layout = "circular"; // before data: part of the starting state, not a step
```

## session.config reads the live settings

`session.config` reports the settings as they are now, not the ones the session was created with.

```typescript
const directed = session.config.data.directed; // read it when you need the current value
```

## createGraphSession takes data through the session

`CreateGraphSessionOptions` loses `store`, `records` and the function form of `config.data`.

```typescript
// 2.x: createGraphSession({ store, records });
const session = createGraphSession();
await session.data.addNodes(nodes); // or session.data.import(...); settings through session.config.set
```

## nodeData and edgeData read the graph

The element's `nodeData` and `edgeData` getters return the graph's records in row order, not the
array last assigned. The setters are unchanged.

```typescript
const mine = nodes;
element.nodeData = nodes; // keep your own reference if you need the array again
```

## The layout getter reads the layout that is drawn

The element's `layout` getter returns the engine stored for the project, so after an undo it
reports the restored engine. A two-way binding sees an undo as a change, which is the point.

```typescript
element.addEventListener("graphty-history-change", () => setLayoutPicker(element.layout));
```

## Style and visibility handles do not revert on cancel

The `Run` a style or visibility verb returns settles when the repaint drawing the edit finishes.
`cancel()`, or an abort after the call, does not take the edit back. A signal already aborted when
the verb is called still prevents it.

```typescript
// 2.x: const run = session.styles.add(spec); run.cancel();
await session.styles.add(spec);
await session.undo();
```

## On-load algorithms run once per command

Adding nodes or edges with `algorithmsOnLoad` set starts the on-load runs once per command, not
once per `data-added` event. Undo and redo fire `data-added` and `elements-removed` with a `cause`,
and start no work.

```typescript
element.on("data-added", (e) => {
    if (e.cause !== undefined && e.cause !== "command") return; /* ... */
});
```

## Edge pairs are answered by the graph store

`DataManager.edgeCache` and the `EdgeMap` class are removed. Ask the data manager for the edges of
an ordered pair; the answer comes from the graph store and lists every parallel edge, oldest first.

```typescript
// 2.x: dataManager.edgeCache.get("a", "b");
dataManager.getEdgesBetween("a", "b");
```

`DataManager.getStats()` now reports the store's node and edge counts, the same numbers as
`statistics()`, so a pending edge and an endpoint no record declared are counted.

## Static layouts run on @graphty/layout 2.0

The static layout engines read the graph snapshot through `@graphty/layout` 2.0. Positions are
32-bit floats, so a seeded chaotic layout (ARF, 3D Kamada-Kawai) can end in a different drawing of
the same graph. After a reader adds to a finished graph, a static layout places only the new
nodes and keeps every existing one where it was.

CSV, JSON, GEXF and GraphML files are read through `@graphty/graph-io`: JSON keys with null values
are dropped, mixed-type CSV columns widen to text, and CSV node ids stay text.

## Some algorithm results differ from 2.x

The built-in algorithms now run on the graph snapshot through the `@graphty/algorithms` 3.0
ports, and some of their answers change on purpose. These are the differences from 2.x, grouped
by kind of algorithm.

### Traversal and path algorithms

- **PageRank and strongly connected components on an undirected graph** read every edge both ways.
  2.x read each undirected edge as one arc in the direction it was declared, so an undirected edge
  A-B gave A=0.351, B=0.649 and two components. Now it gives A=0.5, B=0.5 and one component: the
  strong components of an undirected graph are its connected pieces.
- **Prim and Bellman-Ford break equal-cost ties by edge order.** Prim takes the lower edge index
  and Bellman-Ford relaxes arcs in row order, where 2.x broke ties by heap insertion order. Total
  tree weight and every distance are unchanged, but on an unweighted graph another tree or another
  route of the same cost may be flagged.
- **Bellman-Ford with a negative cycle marks no route.** 2.x walked the predecessor chain round the
  cycle.
- **A node option naming no node is refused** with a `GraphtyError` coded `E_OPTION_RANGE`: a BFS
  target, a DFS source, a DFS target on a pre-order walk, a Bellman-Ford source or target, and a
  Prim start node. Dijkstra and the BFS source already were. 2.x walked everything and reported
  the target not found (BFS, DFS), returned no result (DFS source), marked no route (Bellman-Ford
  target) or threw a plain `Error` (Bellman-Ford source, Prim start node). A post-order DFS never
  reads its target, so a missing one is still accepted there.
- **PageRank personalization entries naming no node** are left out instead of taking a share of
  the random jump, and a one-node graph whose personalization gives it 0 ranks 1, not 0.
- **PageRank always reports `method: "power-iteration"`.** 2.x named a delta method for large
  personalized runs; that method no longer exists, and the `useDelta` option is accepted and
  ignored.
- **Under `acceleration: "required"`** with an accelerator attached, a PageRank with a
  personalization, initial ranks or an undirected graph, and a BFS with a target, throw
  `E_NO_ACCELERATOR`. 2.x answered them on the CPU.

### Centrality and community algorithms

- **k-core no longer counts a self-loop** toward a node's core number, so a self-looped node, and
  any node whose core leaned on self-looped neighbours, can sit lower. The result equals the 2.x
  result on the same graph with every self-loop removed.
- **Louvain can find a different partition.** On the cat network of the algorithm stories it finds
  four communities (modularity 0.462) where 2.x found six (0.402); on some graphs it lands lower,
  for example 0.26 against 0.30 on a six-node path. `useOptimized: false` is refused with
  `E_OPTION_RANGE`.
- **Label Propagation communities change for the same seed** on any graph with more than one valid
  partition: the run uses a work queue, a uniform tie draw and another random generator, and stops
  as soon as every label is dominant, so `iterations` and `converged` change too.
- **HITS `mode` now picks the published score**: authority for `in`, hub for `out`, their average
  for `total`. **Katz `mode`** picks the path direction on a directed graph. HITS, Katz and
  eigenvector centrality refuse `endpoints: true` with `E_OPTION_RANGE`, where 2.x accepted and
  ignored it. Katz with an alpha too large to be sure of converging stays on the CPU, and under
  `acceleration: "required"` throws `E_NO_ACCELERATOR`.

### Flow, cut and matching algorithms

- **Max flow reports the net flow** of a pair of opposite directed edges, each within its
  capacity.
- **Max flow publishes a negative summed capacity as 0**: when the capacities between one pair of
  nodes add up to a negative number, each of its edges publishes `capacity: 0`.
- **Max flow publishes no result on a graph with fewer than two nodes.**
- **Max flow and min cut refuse a `source` equal to the `sink`** with `E_OPTION_RANGE`. 2.x ran and
  published a meaningless result.
- **Max flow and min cut match `source` and `sink` against node ids exactly first**, and by string
  form only when no node matches exactly. In a graph holding both the number 1 and the string "1",
  `source: "1"` names the string. 2.x compared every id as a string.
- **Stoer-Wagner min cut adds the weights of two opposite directed edges.**
- **The s-t min cut reports its cut edges** on graphs with numeric ids, where 2.x reported none.
- **Karger's min cut is seeded**, so it gives the same cut on every run.
- **Bipartite matching visits nodes in index order and ignores arc direction.** It finds a
  matching of the same size, but may pair different nodes.

### All-pairs and link prediction algorithms

- **Floyd-Warshall eccentricity, diameter and radius** change on graphs with parallel edges (the
  cheapest edge sets the distance, where 2.x used the last one added) and on graphs with
  self-loops (a self-loop no longer overwrites a node's distance to itself).
- **Floyd-Warshall refuses a graph above 5,792 nodes** with `E_TOO_LARGE` before the run starts.
  2.x had no bound and ran a large graph until the tab ran out of memory.
- **Adamic-Adar link prediction scores can differ in the last bits** (up to about 2e-11), so pairs
  whose scores tie exactly can come out in another order, and at the `topK` cut-off another of the
  tied pairs can be kept. The common-neighbours method is unchanged.
