# Events

Guide to subscribing to graph events.

## Overview

Graphty uses an event-driven architecture. Subscribe to events for user interactions, data changes, and state updates.

## Available Events

| Event                  | Trigger                  | Event Data                 |
| ---------------------- | ------------------------ | -------------------------- |
| `graph-settled`        | Layout finished          | `{ settled: boolean }`     |
| `data-loaded`          | Initial data loaded      | `{ nodeCount, edgeCount }` |
| `data-added`           | Incremental data added   | `{ nodes, edges }`         |
| `selection-changed`    | Node selected/deselected | `{ node, previousNode }`   |
| `camera-state-changed` | Camera moved             | `{ state }`                |
| `style-changed`        | Styles updated           | `{ layers }`               |
| `node-click`           | User clicked node        | `{ node, data, event }`    |
| `node-hover`           | Mouse entered node       | `{ node, data }`           |
| `node-drag-start`      | Started dragging node    | `{ node, position, pinned }` |
| `node-drag-end`        | Finished dragging node   | `{ node, position, pinned }` |
| `elements-removed`     | Nodes and their edges removed | `{ nodes, edges }`    |
| `data-loading-progress` | A chunk of a load arrived | `{ nodeRecordsLoaded, edgeRecordsLoaded, chunksProcessed, ... }` |
| `data-loading-complete` | A load finished          | `{ nodesLoaded, edgesLoaded, report, ... }` |
| `error`                | Error occurred           | `{ error, context }`       |

There is no edge-click event. Edge meshes are not pickable, so nothing could emit one; it returns,
with a serialisable detail, when edge picking lands.

### The two load events count different things, and say so in their field names

`data-loading-progress` counts RECORDS: how many node and edge records the source has handed over
so far. Mid-load is the wrong moment to ask how many edges the graph holds, because a record that
repeats a pair may still be merged away and a record whose endpoints do not resolve may still be
rejected.

`data-loading-complete` counts what the graph HOLDS. Its `nodesLoaded` and `edgesLoaded` are the
same numbers `session.status.counts` answers with, which means they can legitimately differ from
the record counts in both directions: an edge naming a node the file never declared creates that
node, and a repeated edge under a merging policy becomes no edge of its own.

Both sets of numbers reach you on the finished load, through `event.report`:

```typescript
graph.on("data-loading-complete", ({ nodesLoaded, edgesLoaded, report }) => {
    console.log(`${nodesLoaded} nodes and ${edgesLoaded} edges are in the graph`);
    console.log(`from ${report.counts.nodeRecords} node and ${report.counts.edgeRecords} edge records`);
    console.log(`endpoints read as ${report.endpoints.source}/${report.endpoints.target}`);
});
```

The same report is available afterwards, without keeping the event, as
`element.session.data.lastImport()`.

## JavaScript API

Subscribe using the `on()` method on the Graph instance:

```typescript
const graph = element.graph;

// Layout complete
graph.on("graph-settled", () => {
    console.log("Layout complete!");
    graph.zoomToFit();
});

// Node clicked
graph.on("node-click", ({ node }) => {
    console.log("Clicked:", node.id);
    graph.selectNode(node.id);
});

// Node hover
graph.on("node-hover", ({ node }) => {
    console.log("Hovering:", node.id);
});

// Node drag events
graph.on("node-drag-start", ({ node, position }) => {
    console.log("Started dragging:", node.id, "at", position);
});

graph.on("node-drag-end", ({ node, position }) => {
    console.log("Finished dragging:", node.id, "at", position);
});

// Selection changed
graph.on("selection-changed", ({ node, previousNode }) => {
    if (node) {
        console.log("Selected:", node.id);
    } else {
        console.log("Deselected");
    }
});

// Data loaded
graph.on("data-loaded", ({ nodeCount, edgeCount }) => {
    console.log(`Loaded ${nodeCount} nodes, ${edgeCount} edges`);
});

// Error handling
graph.on("error", ({ error, context }) => {
    console.error("Graph error:", error, "in", context);
});
```

## DOM Events

Listen via standard `addEventListener` on the Web Component:

```javascript
const element = document.querySelector("graphty-element");

element.addEventListener("graph-settled", (e) => {
    console.log("Settled!", e.detail);
});

element.addEventListener("data-loading-complete", (e) => {
    console.log(`${e.detail.nodesLoaded} nodes, ${e.detail.edgesLoaded} edges`);
});
```

### Node events are prefixed on the DOM, and carry ids rather than objects

The four pointer events on a node reach the DOM under a `graphty-` prefix:
`graphty-node-click`, `graphty-node-hover`, `graphty-node-drag-start` and
`graphty-node-drag-end`.

Their detail is not the internal event. The internal one carries a live node object holding a
Babylon mesh, a material and a scene, which cannot be structure-cloned and which the renderer may
dispose while a listener still holds it. So the DOM detail carries the node's id and the plain
values that go with it, and you look the record up if you want it:

```javascript
element.addEventListener("graphty-node-click", (e) => {
    const { nodeId, data, button, modifiers } = e.detail;
    console.log("Clicked node:", nodeId, data);
});

element.addEventListener("graphty-node-drag-end", (e) => {
    const { nodeId, position, pinned } = e.detail;
    // `pinned` is the pin AFTER the drop, so with the default `pinOnDrag` it is true here.
    console.log(nodeId, "dropped at", position, pinned ? "and pinned" : "and left free");
});
```

Everything else the element emits reaches the DOM under its own unprefixed name, with the internal
event as the detail:

```javascript
element.addEventListener("selection-changed", (e) => {
    const { node, previousNode } = e.detail;
    console.log("Selection:", node?.id, "Previous:", previousNode?.id);
});
```

## Event Timing

Some events fire asynchronously. Understand the order:

```typescript
// Data loading sequence
graph.on("data-loaded", () => console.log("1. Data loaded"));
graph.on("graph-settled", () => console.log("2. Layout settled"));

// When you add data
await graph.addNodes(nodes); // 'data-loaded' or 'data-added' fires
await graph.addEdges(edges);
await graph.waitForSettled(); // 'graph-settled' fires
```

## Removing Listeners

Clean up event listeners when done:

```typescript
// JavaScript API
const handler = () => console.log("Settled");
graph.on("graph-settled", handler);

// Later, remove it
graph.off("graph-settled", handler);
```

```javascript
// DOM API
const handler = (e) => console.log("Settled", e.detail);
element.addEventListener("graph-settled", handler);

// Later, remove it
element.removeEventListener("graph-settled", handler);
```

## Common Patterns

### Zoom After Layout

```typescript
graph.on("graph-settled", () => {
    graph.zoomToFit();
});
```

### Show Node Details

```typescript
graph.on("node-click", ({ node }) => {
    showDetailsPanel(node);
    graph.selectNode(node.id);
});

graph.on("selection-changed", ({ node }) => {
    if (!node) {
        hideDetailsPanel();
    }
});
```

### Track Node Dragging

```typescript
graph.on("node-drag-start", ({ node, position, pinned }) => {
    console.log(`Started dragging ${node.id} at`, position, pinned ? "(pinned)" : "");
});

graph.on("node-drag-end", ({ node, position, pinned }) => {
    console.log(`Dropped ${node.id} at`, position);
    // A drop pins the node by default, so it stays where the reader put it through the next
    // layout change. `pinned` is that fact after `pinOnDrag` has acted -- draw a badge off it,
    // or call `element.unpin(node.id)` to hand the node back to the layout.
});
```

### React to a removal

Removing a node removes the edges attached to it, and both go out on one event:

```typescript
graph.on("elements-removed", ({ nodes, edges }) => {
    console.log(`${nodes.length} nodes and ${edges.length} edges left the graph`);
});
```

The detail is ids only, and it names every edge that went -- including edges you never mentioned,
because they were attached to a node you did.

### Loading Indicator

```typescript
let isLoading = false;

graph.on("data-added", () => {
    isLoading = true;
    showLoadingSpinner();
});

graph.on("graph-settled", () => {
    if (isLoading) {
        isLoading = false;
        hideLoadingSpinner();
    }
});
```

### Error Handling

```typescript
graph.on("error", ({ error, context }) => {
    if (context === "data-loading") {
        showError("Failed to load data");
    } else if (context === "algorithm") {
        showError("Algorithm failed");
    } else {
        showError("An error occurred");
    }
    console.error(error);
});
```

### Camera Tracking

```typescript
graph.on("camera-state-changed", ({ state }) => {
    // Save camera state for later restoration
    localStorage.setItem("camera-state", JSON.stringify(state));
});

// Restore on load
const savedState = localStorage.getItem("camera-state");
if (savedState) {
    graph.setCameraState(JSON.parse(savedState));
}
```

## React Integration

```tsx
import { useEffect, useRef } from "react";
import "@graphty/graphty-element";

function GraphComponent({ onNodeClick }) {
    const graphRef = useRef(null);

    useEffect(() => {
        const element = graphRef.current;
        if (!element) return;

        const graph = element.graph;

        const handleClick = ({ node }) => {
            onNodeClick(node);
        };

        graph.on("node-click", handleClick);

        return () => {
            graph.off("node-click", handleClick);
        };
    }, [onNodeClick]);

    return <graphty-element ref={graphRef} />;
}
```

## Vue Integration

```vue
<script setup>
import "@graphty/graphty-element";
import { ref, onMounted, onUnmounted } from "vue";

const graphRef = ref(null);
const emit = defineEmits(["nodeClick"]);

let cleanup = null;

onMounted(() => {
    const graph = graphRef.value.graph;

    const handler = ({ node }) => emit("nodeClick", node);
    graph.on("node-click", handler);

    cleanup = () => graph.off("node-click", handler);
});

onUnmounted(() => {
    if (cleanup) cleanup();
});
</script>

<template>
    <graphty-element ref="graphRef" />
</template>
```

## Interactive Examples

- [Selection Events](https://graphty.app/storybook/element/?path=/story/selection--mode-3-d)
