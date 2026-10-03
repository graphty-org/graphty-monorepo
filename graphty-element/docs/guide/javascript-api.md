# JavaScript API

Complete reference for programmatic control via the `Graph` class.

## Overview

The JavaScript API provides full programmatic control over graph visualizations through the `Graph` class. This is separate from the [Web Component API](./web-component), which provides declarative configuration via HTML attributes.

**Use the JavaScript API when you need:**

- Dynamic data manipulation (add/remove nodes at runtime)
- Algorithm execution and result handling
- Camera control and animation
- Custom style layers
- Screenshot and video capture
- Event-driven interactions

**Use the [Web Component API](./web-component) instead for:**

- Declarative HTML configuration
- Framework property binding
- Simple static graphs

## Accessing the Graph Instance

The `Graph` class is accessed via the `.graph` property on the `<graphty-element>`:

```typescript
const element = document.querySelector("graphty-element");
const graph = element.graph;
```

In TypeScript, no cast is needed. Importing the package declares the tag, so
`document.querySelector("graphty-element")` and `document.createElement("graphty-element")` both
answer the element's own type:

```typescript
import "@graphty/graphty-element";
import type { Graph } from "@graphty/graphty-element";

const element = document.querySelector("graphty-element");
const graph: Graph | undefined = element?.graph;
```

::: tip
The Web Component handles initialization. Access `.graph` after the element is connected to the DOM, or use the `graph-ready` event.
:::

## Core Methods

### Data Management

**Adding Nodes:**

```typescript
// Add single node
await graph.addNode({ id: "node1", label: "First" });

// Add multiple nodes
await graph.addNodes([
    { id: "node1", label: "First" },
    { id: "node2", label: "Second" },
]);
```

**Adding Edges:**

```typescript
// Add single edge
await graph.addEdge({ source: "node1", target: "node2" });

// Add multiple edges
await graph.addEdges([
    { source: "node1", target: "node2", weight: 1.5 },
    { source: "node2", target: "node3" },
]);
```

**Removing Elements:**

```typescript
// Remove nodes. The edges attached to them go too.
await graph.removeNodes(["node1"]);
await graph.removeNodes(["node1", "node2"]);
```

One `elements-removed` event follows each call, naming the node ids you asked for and every edge
id that went with them -- including edges you never mentioned:

```typescript
graph.on("elements-removed", ({ nodes, edges }) => {
    console.log(`${nodes.length} nodes and ${edges.length} edges left the graph`);
});
```

In 1.x the edges stayed behind: lines drawn to a node that no longer existed, which a filter could
not reach and nothing could hide.

**Bulk Data Loading:**

```typescript
// Load nodes and edges in one call
graph.setData({
    nodes: [
        { id: "node1", label: "First" },
        { id: "node2", label: "Second" },
    ],
    edges: [{ source: "node1", target: "node2" }],
});
```

**Updating Data:**

```typescript
// Update node properties
await graph.updateNodes([{ id: "node1", label: "Updated Label" }]);

// Update multiple nodes
await graph.updateNodes([
    { id: "node1", label: "Updated 1" },
    { id: "node2", label: "Updated 2" },
]);
```

**Accessing Data:**

```typescript
// Get a single node by ID
const node = graph.getNode("node1");

// Get all nodes
const allNodes = graph.getNodes();

// Get counts
const nodeCount = graph.getNodeCount();
const edgeCount = graph.getEdgeCount();
```

Records are read through the session: one at a time by id, or every one at once.

```typescript
const session = element.session;
const { nodes, edges } = await session.scope.resolve("graph");

const record = session.data.edge(id); // { id, source, target, ...the file's own keys }
const everyNode = session.data.nodes(); // [{ id, ...the file's own keys }, ...]
const everyEdge = session.data.edges(); // [{ id, source, target, ... }, ...]
```

`nodes()` and `edges()` walk the whole graph on each call, so read them when the graph changes
rather than every frame. Every record is read-only; change the graph through `session.data`'s
verbs, each of which is one undoable step.

### Reading records a page at a time

A table that shows thirty rows of a 100,000-node graph should read thirty records, not copy the
graph. `nodePage` and `edgePage` answer one window of the records, the total, and a revision:

```typescript
const page = session.data.nodePage({ offset: 0, limit: 30 });
page.records; // the 30 records, read-only
page.total; // how many there are in all, for the scrollbar
page.revision; // changes whenever any record, the selection or a set changes

// Sorted by an attribute, over any scope:
session.data.nodePage({ offset: 30, limit: 30, sort: { key: "weight", descending: true } });
session.data.nodePage({ scope: "selection" });

// The edges at one node:
session.data.edgePage({ touching: "alice", limit: Infinity });

// Read the page again when the graph changes (and, for a "selection" scope, the selection):
const reread = () => {
    if (session.data.nodePage({ limit: 0 }).revision !== page.revision) {
        // read the page again and redraw
    }
};
session.on("project:changed", reread);
session.on("selection:changed", reread);
```

Every option is optional: `offset` defaults to 0, `limit` to 100 (`Infinity` reads to the end),
`scope` to `"graph"`. Without `sort`, records come in the order they were added, and an edit
never reorders them: an updated record stays where it was, a removed one leaves a gap that
closes, an added one goes last. With `sort`, numbers come before text, text sorts naturally
("2" before "10"), a record without the key comes last either way, and records that sort equal
keep the order they were added in. The order is computed once per revision, so paging through
it costs only the records on each page.

### Result values as table columns

A table that ranks nodes by an algorithm shows the measure as a column and sorts by it. Name the
run's field as a column, and sort by the same name; the element reads the values and sorts them,
so the table never reads the result itself:

```typescript
const run = element.run("pagerank");
await run;
const column = `results.${run.id}.value`;

const page = element.session.data.nodePage({
    columns: [column],
    sort: { key: column, descending: true },
    limit: 50,
});
for (const record of page.records) {
    console.log(record.id, record[column]); // the highest-ranked node first
}
```

A column is a run's field, `results.<run>.<field>`, and each record carries its value under that
same name. A node the run gave no value (outside its scope, or before it finished) has no key
for the column and sorts last in either direction. `edgePage` takes edge fields the same way.
When the run is run again, the page's `revision` changes, and the next page read shows the new
values. Anything else in `columns` is refused with `E_OPTION_RANGE`.

"The edge between two nodes" is plural, because a graph may hold more than one:

```typescript
const between = graph.getDataManager().getEdgesBetween("node1", "node2"); // readonly Edge[]
```

In 1.x this was `getEdgeBetween`, singular, and an edge's id was its two endpoints joined with a
colon. Neither could represent a graph that holds two edges between one pair -- see
[Data Sources](./data-sources#two-edges-between-the-same-pair).

### Selection

```typescript
// Select a node
graph.selectNode("node1");

// Deselect
graph.deselectNode();

// Get currently selected node
const selected = graph.getSelectedNode();
if (selected) {
    console.log("Selected:", selected.id);
}
```

### Layout Control

```typescript
// Set layout algorithm
graph.setLayout("ngraph");

// With options
graph.setLayout("ngraph", {
    springLength: 100,
    springCoefficient: 0.0008,
    gravity: -1.2,
    dimensions: 3,
});

// Wait for the picture to stop changing: the layout converged, the camera framed it,
// and a frame was drawn showing that
await graph.waitForStableFrame();
```

### Algorithms

```typescript
// Run an algorithm. The run hands back its own result.
const run = await graph.run("degree");

// One element's value
const degree = run.result.node("node1")?.value;

// Put the algorithm's own suggested picture back, after a reader cleared it
graph.applySuggestedStyles("degree");
```

### Sets

A set is a named group of nodes and edges that a run, a layout, a style layer, the visibility
filter, the selection and the camera all accept as their `scope`. See [Sets](./sets).

```typescript
const team = element.session.sets.create(
    { kind: "fixed", nodes: ["a", "b", "c"], reading: "induced" },
    { name: "Team" },
);

await element.run("degree", {}, { scope: { set: team } });
await element.setLayout("ngraph", {}, { scope: { set: team } });

const { nodes, edges } = await element.session.scope.count({ set: team });
```

### Camera Control

```typescript
// Fit all nodes in view
graph.zoomToFit();

// Get current camera state
const state = graph.getCameraState();
// { position: {x, y, z}, target: {x, y, z}, up: {x, y, z} }

// Set camera position
graph.setCameraPosition({ x: 0, y: 0, z: 100 });
graph.setCameraTarget({ x: 0, y: 0, z: 0 });

// Animate camera
graph.setCameraState(newState, {
    animate: true,
    duration: 1000,
});
```

### Managers

Access internal managers for advanced control:

```typescript
// Data management
const dataManager = graph.getDataManager();

// Layout control
const layoutManager = graph.getLayoutManager();

// Event handling
const eventManager = graph.getEventManager();

// Selection state
const selectionManager = graph.getSelectionManager();

// Performance statistics
const statsManager = graph.getStatsManager();
```

### Selecting by search or by expression

`element.session.selection.apply()` takes a target. Two of them search the graph:

```typescript
const { selection } = element.session;

// Text: a case-insensitive substring of a node's id or any of its attribute values.
await selection.apply({ text: "alpha" });

// The text may carry a prefix that says how to match:
await selection.apply({ text: "exact:Alpha" }); // the id or a value is exactly this
await selection.apply({ text: "regex:^A[0-9]+$" }); // a regular expression
await selection.apply({ text: "id:a17" }); // this id, ignoring case
await selection.apply({ text: "type:person" }); // data.type is "person", ignoring case
await selection.apply({ text: "=data.weight > `5`" }); // a leading = is an expression, as below

// An expression, in the same language a style layer selector uses. It selects edges as well
// as nodes, and reports on `unresolvedPaths` any path nothing in the graph answers.
const delta = await selection.apply({ where: "data.type == 'server'" });

// Either one can be narrowed to a scope, such as what is currently visible.
await selection.apply({ text: "alpha", scope: "visible" });
```

A prefix that names no attribute is searched as plain text, so `http://example.com` still finds
the node that carries it. An invalid regular expression is refused with `E_BAD_COMMAND`, and an
expression that does not parse with `E_BAD_SELECTOR`.

### Screenshot and Video Capture

```typescript
// Take a screenshot
const result = await graph.captureScreenshot({
    width: 1920,
    height: 1080,
    format: "png",
});

// Copy to clipboard
await graph.captureScreenshot({ destination: { clipboard: true } });

// Capture video animation
const video = await graph.captureAnimation({
    duration: 5000,
    fps: 30,
});
```

### AI Control

Enable AI-powered natural language commands:

```typescript
import type { AiManagerConfig } from "@graphty/graphty-element";

// Enable AI control
await graph.enableAiControl({
    provider: "anthropic",
    apiKey: "your-api-key",
});

// Execute natural language commands
const result = await graph.aiCommand("Select the node with the highest degree");

// Check AI status
const status = graph.getAiStatus();

// Listen for status changes
const unsubscribe = graph.onAiStatusChange((status) => {
    console.log("AI status:", status.stage);
});

// Disable AI control
graph.disableAiControl();
```

One message is one undoable step. A command you register with
`graph.getAiManager()?.registerCommand(...)` joins that step only through `ctx.tx`; see
[Undo and History](./undo#commands-you-register-with-the-ai-assistant).

### Remembering API Keys

`ApiKeyManager` from `@graphty/graphty-element/ai` holds the reader's provider keys. It
restores itself after a reload: a new manager finds the keys an earlier page saved and turns
remembering back on, so the host only enables, disables and sets keys.

```typescript
import { ApiKeyManager } from "@graphty/graphty-element/ai";

const keys = new ApiKeyManager(); // restores keys saved by an earlier page

keys.enablePersistence(); // save keys in localStorage, encrypted, from now on
keys.setKey("anthropic", apiKey);
keys.setDefaultProvider("anthropic"); // saved with the keys

const provider = keys.getDefaultProvider() ?? keys.getConfiguredProviders()[0];

keys.disablePersistence(); // forget them on the next load (they stay in memory)
```

With no argument, `enablePersistence()` encrypts with a built-in key: the keys are not stored
in plain text, but anyone who can run script on the page can read them. Pass
`{ encryptionKey }` (at least 10 characters) to use the reader's own password instead. The
manager remembers that password in `sessionStorage`, so a reload in the same tab restores the
keys and closing the tab ends it; after that, call `enablePersistence({ encryptionKey })` again
to unlock them. `new ApiKeyManager({ storage, prefix })` changes where the keys are kept
(default `localStorage` and `"@graphty-ai-keys"`).

### Voice Input

Enable voice commands:

```typescript
// Get voice adapter
const voiceAdapter = graph.getVoiceAdapter();

// Start listening
const started = graph.startVoiceInput({
    language: "en-US",
    continuous: false,
});

// Check if active
if (graph.isVoiceActive()) {
    console.log("Listening...");
}

// Stop listening
graph.stopVoiceInput();
```

## Async Operations

Graph operations are queued and executed in order. Use `await` for operations that need to complete before continuing:

```typescript
// These execute in order
await graph.addNodes(nodes);
await graph.addEdges(edges);
await graph.waitForSettled();
graph.zoomToFit();
```

## Batch Operations

To make several changes one undoable step, make them through the `tx` the callback receives:

```typescript
await graph.batchOperations(async (tx) => {
    await tx.data.addNodes(manyNodes);
    await tx.data.addEdges(manyEdges);
    await tx.layout.set("circular");
});
```

One undo takes the whole batch back, and a throw inside the callback rolls it back. A call on
`graph` itself during the callback is a step of its own, and logs a warning naming the `tx` verb
to use instead.

## Undo and Redo

Every change a project saves is one undoable step, and the session keeps the history:

```typescript
const session = graph.getSession();

await session.undo();
await session.redo();
session.canUndo; // whether undo() would do anything
session.history.steps; // [{ label: "Added 3 nodes", ... }, ...]

// Several changes as one step, through the tx the callback receives
await session.transaction("Recolour", async (tx) => {
    await tx.styles.add(spec);
    await tx.layout.set("circular");
});

// Any command in the vocabulary, as data
await session.execute({ op: "visibility.context", show: false });
```

See [Undo and History](./undo) for what is and is not undoable, transactions, work still
running, events and the memory budget.

## Event Handling

Subscribe to events using `on()`:

```typescript
// Graph events
graph.on("graph-settled", () => {
    console.log("Layout complete!");
    graph.zoomToFit();
});

// Node events
graph.on("node-click", ({ node }) => {
    console.log("Clicked:", node.id);
    graph.selectNode(node.id);
});

graph.on("node-hover", ({ node }) => {
    console.log("Hovering:", node.id);
});

// Data events
graph.on("data-loaded", ({ nodeCount, edgeCount }) => {
    console.log(`Loaded ${nodeCount} nodes, ${edgeCount} edges`);
});
```

**Removing Listeners:**

```typescript
const stop = graph.on("graph-settled", () => console.log("Settled"));

// Later, remove the listener
stop();
```

## Complete Example

```typescript
import "@graphty/graphty-element";
import type { Graph } from "@graphty/graphty-element";

async function initGraph() {
    const element = document.querySelector("graphty-element");
    if (element === null) {
        return;
    }

    const graph: Graph = element.graph;

    // Load data
    await graph.addNodes([
        { id: "a", label: "Node A" },
        { id: "b", label: "Node B" },
        { id: "c", label: "Node C" },
    ]);

    await graph.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
        { source: "c", target: "a" },
    ]);

    // Wait for the queued operations to finish
    await graph.waitForSettled();

    // Run algorithm
    const run = await graph.run("degree");

    // Fit view
    graph.zoomToFit();

    // Set up interaction
    graph.on("node-click", ({ node }) => {
        console.log(`Clicked ${node.id} (degree: ${String(run.result.node(node.id)?.value)})`);
        graph.selectNode(node.id);
    });
}

initGraph();
```

## Related Guides

- [Web Component API](./web-component) - Declarative configuration via HTML attributes
- [Styling](./styling) - Style layers and selectors
- [Algorithms](./algorithms) - Available graph algorithms
- [Camera](./camera) - Camera control and animation
- [Events](./events) - Complete event reference

## Interactive Examples

- [Data Loading](https://graphty.app/storybook/graphty-element/?path=/story/data--basic) - Data management
- [Selection](https://graphty.app/storybook/graphty-element/?path=/story/selection--mode-3-d) - Selection handling
- [Algorithms](https://graphty.app/storybook/graphty-element/?path=/story/algorithms-centrality--degree) - Algorithm execution
- [Camera](https://graphty.app/storybook/graphty-element/?path=/story/camera-controls--three-d) - Camera control
