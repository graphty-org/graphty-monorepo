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

Edge records are read through the session, by the edge's own id. Ask for the ids first:

```typescript
const session = element.session;

for (const id of (await session.scope.resolve("graph")).edges) {
    const record = session.data.edge(id); // { id, source, target, ...the file's own keys }
}
```

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

For bulk updates, use batch operations to prevent intermediate renders:

```typescript
await graph.batchOperations(async () => {
    await graph.addNodes(manyNodes);
    await graph.addEdges(manyEdges);
    // Layout runs once at the end
});
```

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
