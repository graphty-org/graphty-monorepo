# Events

Guide to subscribing to graph events.

## Overview

Graphty uses an event-driven architecture. Subscribe to events for user interactions, data changes, and state updates.

## Available Events

| Event                  | Trigger                  | Event Data                 |
| ---------------------- | ------------------------ | -------------------------- |
| `graph-settled`        | Layout finished          | `{ settled: boolean }`     |
| `graph-frame-stable`   | The picture is final: layout converged, camera framed, frame drawn | `{ frames }` |
| `zoom-to-fit-complete` | Auto-framing moved the camera around the whole graph | `{ boundingBoxMin, boundingBoxMax }` |
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
| `data-loading-complete` | A load finished          | `{ nodesLoaded, edgesLoaded, report, loadId, ... }` |
| `data-loading-error`   | A load failed            | `{ error, format, loadId, ... }` |
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

### Every load has an id

`addDataFromSource`, `loadFromFile` and `loadFromUrl` resolve to `{ loadId }`, and every event
about that load -- `data-loading-progress`, `data-loading-complete`, `data-loading-error` and
`data-loaded` (in `details.loadId`) -- carries the same `loadId`. A load started by assigning the
`dataSource` / `dataSourceConfig` pair has an id too, on its events. When two loads overlap, the id
says which one a report is about.

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

### Three more the element mirrors on its own account

Beside the node events, `<graphty-element>` publishes three facts about itself. All three carry
ids, counts and words -- never a node, an edge or a layer -- for the same reason the node events
do: a `CustomEvent` detail crosses to listeners that may structure-clone it or post it to a
worker, and a live render object either throws on the way out or hands a listener something the
renderer is about to dispose.

```javascript
// A run started, made progress, or finished. This is what a progress bar hangs off.
element.addEventListener("graphty-run-change", (e) => {
    const { run, phase } = e.detail; // phase: "start" | "progress" | "end" | "error"
    console.log(run.label, phase, run.progress);
});

// Elements joined or left the selection. Only a real movement arrives -- selecting what is
// already selected publishes nothing.
element.addEventListener("graphty-selection-change", (e) => {
    const { added, removed, nodes, edges } = e.detail;
    // `added` and `removed` are the ids that moved; `nodes` and `edges` are how many the
    // selection holds NOW.
    console.log(`${nodes} nodes and ${edges} edges selected`, added, removed);
});

// A filter, the time window or the context flag changed what is showing. Every producer arrives
// here, because a status bar has to update for all three.
element.addEventListener("graphty-visibility-change", (e) => {
    const { visible, total, filterKind } = e.detail;
    console.log(`showing ${visible.nodes} of ${total.nodes} nodes`, `(${filterKind})`);
});
```

### style-changed

A layer was added, changed, removed or moved. One event per EDIT rather than one per layer,
because an edit is what a consumer undoes, records and mirrors. The detail says which verb
produced it, how many layers it touched, how much of the picture was repainted, and any paths the
changed layers read that nothing in the session answers yet:

```typescript
graph.on("style-changed", (e) => {
    console.log(e.reason, `${e.layers} layer(s)`, e.painted);
    // The stack itself is read back with graph.getSession().styles.list()
});
```

## Event Timing

Some events fire asynchronously. Understand the order:

```typescript
// Data loading sequence
graph.on("data-loaded", () => console.log("1. Data loaded"));
graph.on("graph-settled", () => console.log("2. Layout stopped moving"));
graph.on("graph-frame-stable", () => console.log("3. The picture is final"));

// When you add data
await graph.addNodes(nodes); // 'data-loaded' or 'data-added' fires
await graph.addEdges(edges);
await graph.waitForSettled(); // the operation queue is empty
await graph.waitForStableFrame(); // 'graph-frame-stable' has fired
```

`graph-settled` is NOT the finished picture. It fires the instant the layout engine converges, in
the same update pass that only ASKS for the final framing: the camera moves a pass later and is
drawn a pass after that. Anything that photographs, records or measures the view -- a screenshot,
a thumbnail, a visual regression snapshot -- should wait for `waitForStableFrame()`, which
resolves after all four of those have happened, and rejects, naming what was still moving, rather
than handing back a picture that is still changing.

## Removing Listeners

Clean up event listeners when done:

```typescript
// JavaScript API
const stop = graph.on("graph-settled", () => console.log("Settled"));

// Later, remove it
stop();
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

        const stop = graph.on("node-click", handleClick);

        return stop;
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

    cleanup = graph.on("node-click", ({ node }) => emit("nodeClick", node));
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

- [Selection Events](https://graphty.app/storybook/graphty-element/?path=/story/selection--mode-3-d)
