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
progress channel. `SimpleLayoutEngine` keeps working through 3.x, so nothing has to change now; a
live layout, stepped frame by frame, still extends `LayoutEngine`. See
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
