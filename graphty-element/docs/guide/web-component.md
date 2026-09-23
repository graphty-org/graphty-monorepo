# Web Component API

Complete reference for using `<graphty-element>` declaratively via HTML attributes and properties.

## Overview

The `<graphty-element>` Web Component provides a declarative way to add graph visualizations to your page using HTML attributes and element properties.

**When to use the Web Component API:**

- Declarative HTML-based configuration
- Framework integration (React, Vue, Angular, Svelte)
- Simple graphs configured via attributes
- Reactive property binding

**When to use the [JavaScript API](./javascript-api) instead:**

- Programmatic graph manipulation (add/remove nodes dynamically)
- Running graph algorithms
- Camera control and animation
- Advanced styling with style layers
- Screenshot and video capture

## Properties and Attributes

All configuration is done through HTML attributes or their corresponding JavaScript properties:

| Property                 | Attribute                  | Type                           | Default     | Description                    |
| ------------------------ | -------------------------- | ------------------------------ | ----------- | ------------------------------ |
| `nodeData`               | `node-data`                | `Array<object>`                | `[]`        | Array of node objects          |
| `edgeData`               | `edge-data`                | `Array<object>`                | `[]`        | Array of edge objects          |
| `layout`                 | `layout`                   | `string`                       | `'ngraph'`  | Layout algorithm name          |
| `layoutConfig`           | `layout-config`            | `object`                       | `{}`        | Layout algorithm options       |
| `viewMode`               | `view-mode`                | `'2d' \| '3d' \| 'vr' \| 'ar'` | `'3d'`      | Rendering mode                 |
| `background`             | `background`               | `object`                       | whitesmoke  | A colour, or a skybox image    |
| `startingCameraDistance` | `starting-camera-distance` | `number`                       | `30`        | How far the camera starts out  |
| `dataSource`             | `data-source`              | `string`                       | `undefined` | Data source type               |
| `dataSourceConfig`       | `data-source-config`       | `object`                       | `{}`        | Data source configuration      |
| `nodeIdPath`             | `node-id-path`             | `string`                       | `'id'`      | Path to node ID in data        |
| `edgeSrcIdPath`          | `edge-src-id-path`         | `string`                       | unset       | Path to source ID in edge data; unset means probe |
| `edgeDstIdPath`          | `edge-dst-id-path`         | `string`                       | unset       | Path to target ID in edge data; unset means probe |
| `edgeIdPath`             | `edge-id-path`             | `string`                       | unset       | Path to an edge's own identifier, for data that carries one |
| `repeatedEdges`          | `repeated-edges`           | `'keep' \| 'first' \| 'last' \| 'sum' \| 'min' \| 'max' \| 'error'` | `'keep'` | What a second edge between one pair does |
| `nodeLabelPath`          | `node-label-path`          | `string`                       | unset       | Path to what to CALL a node, as distinct from its id |
| `edgeWeightPath`         | `edge-weight-path`         | `string`                       | `'weight'`  | Path to an edge's weight, which every weighted algorithm reads |
| `positionScale`          | `position-scale`           | `number`                       | `1`         | Multiplier from a record's own coordinates into scene units |
| `directed`               | `directed`                 | `boolean \| 'auto'`            | `'auto'`    | Overrules a file header's direction; `'auto'` lets the file decide |
| `selectionStyle`         | property only              | `{ color?, scale?, opacity? }` | gold halo   | What a selected node looks like |
| `layoutBehavior`         | property only              | `object`                       | `{}`        | How the element drives the layout, and the two on-demand expansion functions |
| `debug`                  | `debug`                    | `boolean`                      | `false`     | Enable debug overlay           |

### How the element finds an edge's endpoints

Leave `edge-src-id-path` and `edge-dst-id-path` unset and the element works out which keys name the
endpoints. It tries `source` and `target` first, then `src` and `dst`, then `from` and `to`, and it
decides once for a whole batch of records rather than once per record -- so a file cannot spell one
edge one way and the next edge another and have both silently accepted.

A batch that answers none of the three fails the load with `E_EDGE_ENDPOINTS_UNRESOLVED`, naming
the columns the records do carry. It never loads a graph with nodes and no edges in silence, which
is what 1.x did to every file spelled the way the guides teach.

Setting either attribute settles the question and turns the probe off. A record that then does not
answer the column you named is rejected and counted rather than guessed at again.

### Read-only Properties

| Property | Type     | Description                                           |
| -------- | -------- | ----------------------------------------------------- |
| `graph`  | `Graph`  | The underlying Graph instance for advanced operations |
| `styles` | `Styles` | Access to the style manager                           |

### Methods

The Web Component exposes many methods directly. See [Direct Methods](#direct-methods-on-the-web-component) below for the complete list.

### What a selected node looks like

The highlight is a gold halo around the selected node, and it is configuration rather than a style
layer -- a selection is what a reader is pointing at, not a property of the data, so a layer
drawing it would be reorderable, persistable and lost at a dataset boundary along with every other
layer.

```javascript
element.selectionStyle = {
    color: "#00BCD4", // any colour the element understands
    scale: 1.8, // how far past the node it stands, as a multiple of the node's size
    opacity: 0.55, // 0 to 1
};
```

Merged over what is already set, so naming one field leaves the others alone, and it takes effect
on a selection that is already on screen.

### Expanding a node's neighbourhood on demand

Double-clicking a node asks you for that node's neighbours and adds what comes back, so a graph
too large to load at once can be explored a step at a time. Hand over the two functions through
`layoutBehavior`:

```javascript
element.layoutBehavior = {
    fetchEdges: (node) => fetchEdgesFor(node.id), // an iterable of edge records
    fetchNodes: (nodeIds) => fetchNodesFor([...nodeIds]), // an iterable of node records
};
```

Both are called on the double-click, so switching expansion on after the graph is drawn reaches
the nodes already on screen. An edge record may spell its endpoints `source`/`target`, `src`/`dst`
or `from`/`to`; the element decides once per batch. An edge the graph already holds is not
duplicated.

### Pacing the layout

`layoutBehavior.layout` carries the four settings that decide how hard the element drives the
layout engine:

```javascript
element.layoutBehavior = {
    layout: {
        preSteps: 500, // run this many steps before the first frame is drawn
        stepMultiplier: 2, // steps per rendered frame
        minDelta: 0.001, // stop once a whole frame moves every node less than this
        zoomStepInterval: 5, // re-frame the camera every N steps while the layout runs
    },
    node: { pinOnDrag: true }, // a dropped node stays where the reader put it
};
```

`preSteps` is what makes a screenshot of a physics layout the same picture twice. `minDelta` at
its default of `0` leaves the engine to decide when it has finished.

## Basic Usage

### Minimal Example

```html
<graphty-element
    node-data='[{"id": "a"}, {"id": "b"}, {"id": "c"}]'
    edge-data='[{"source": "a", "target": "b"}, {"source": "b", "target": "c"}]'
>
</graphty-element>
```

### With Layout and Styling

```html
<graphty-element
    layout="circular"
    background='{"backgroundType":"color","color":"#101014"}'
    node-data='[{"id": "a"}, {"id": "b"}, {"id": "c"}]'
    edge-data='[{"source": "a", "target": "b"}, {"source": "b", "target": "c"}]'
>
</graphty-element>
```

## Data Format

### Node Data

Each node object must have an `id` property. Additional properties are available for styling:

```html
<graphty-element
    node-data='[
  {"id": "node1", "label": "First Node", "category": "type-a"},
  {"id": "node2", "label": "Second Node", "category": "type-b"},
  {"id": "node3", "label": "Third Node", "size": 2.0}
]'
></graphty-element>
```

Common node properties:

- `id` (required) - Unique identifier
- `label` - Display text
- `category` / `type` / `group` - For style selectors
- `size` - Node size multiplier
- `color` - Node color (hex or named)

### Edge Data

Each edge object must have `source` and `target` properties referencing node IDs:

```html
<graphty-element
    edge-data='[
  {"source": "node1", "target": "node2"},
  {"source": "node2", "target": "node3", "weight": 1.5},
  {"source": "node3", "target": "node1", "label": "connects"}
]'
></graphty-element>
```

Common edge properties:

- `source` (required) - Source node ID
- `target` (required) - Target node ID
- `weight` - Edge weight for layouts
- `label` - Display text
- `type` / `category` - For style selectors

## Attribute vs Property

### Attributes (HTML strings)

Set via HTML markup or `setAttribute()`. Always strings, require JSON serialization for objects:

```html
<graphty-element layout="ngraph" node-data='[{"id": "a"}, {"id": "b"}]'> </graphty-element>
```

```javascript
element.setAttribute("node-data", JSON.stringify(nodes));
element.setAttribute("layout", "circular");
```

### Properties (JavaScript values)

Set via JavaScript. Typed values, no JSON serialization needed:

```javascript
const element = document.querySelector("graphty-element");

element.nodeData = [{ id: "a" }, { id: "b" }];
element.edgeData = [{ source: "a", target: "b" }];
element.layout = "circular";
element.viewMode = "2d";
```

**Properties are preferred** when working with JavaScript as they:

- Avoid JSON serialization overhead
- Preserve object types
- Enable reactive updates

## Layout Algorithms

Set the layout algorithm via the `layout` attribute:

```html
<graphty-element layout="ngraph"></graphty-element>
<graphty-element layout="circular"></graphty-element>
<graphty-element layout="hierarchical"></graphty-element>
<graphty-element layout="grid"></graphty-element>
<graphty-element layout="random"></graphty-element>
```

Available layouts:

- `ngraph` - Force-directed (default, 2D/3D)
- `d3-force` - D3's force simulation (2D)
- `circular` - Nodes arranged in a circle
- `hierarchical` - Tree-like structure
- `grid` - Regular grid pattern
- `random` - Random positions

Configure layout options:

```html
<graphty-element layout="ngraph" layout-config='{"springLength": 100, "gravity": -1.2}'> </graphty-element>
```

```javascript
element.layoutConfig = {
    springLength: 100,
    springCoefficient: 0.0008,
    gravity: -1.2,
};
```

## Styling

The background is a property of the element. What the nodes and edges look like is a stack of
style layers, which is reached through the session:

```html
<graphty-element id="graph" background='{"backgroundType":"color","color":"#101014"}'></graphty-element>
```

```javascript
await document.querySelector("#graph").session.styles.add({
    name: "Nodes",
    target: "node",
    selector: { match: "everything" },
    set: { "node.color": "#E5E7EB" },
});
```

See the [styling guide](/guide/styling) for selectors, channels and the rest of the vocabulary.

## View Modes

Switch between rendering modes:

```html
<graphty-element view-mode="3d"></graphty-element> <graphty-element view-mode="2d"></graphty-element>
```

```javascript
element.viewMode = "3d";
element.viewMode = "2d";
```

For VR/AR modes, see the [VR/AR Guide](./vr-ar).

## CSS Styling

The component **must have dimensions** to render. Set via CSS:

```css
graphty-element {
    display: block;
    width: 100%;
    height: 500px;
}
```

Or inline styles:

```html
<graphty-element style="display: block; width: 800px; height: 600px;"> </graphty-element>
```

## Events

Listen to graph events via standard DOM event handling:

```javascript
const element = document.querySelector("graphty-element");

element.addEventListener("graph-settled", (e) => {
    console.log("Layout complete");
});

element.addEventListener("node-click", (e) => {
    console.log("Clicked node:", e.detail.node.id);
});

element.addEventListener("data-loaded", (e) => {
    console.log(`Loaded ${e.detail.nodeCount} nodes`);
});
```

Common events:

- `graph-settled` - Layout has stabilized
- `data-loaded` - Data loading complete
- `node-click` - Node was clicked
- `node-hover` - Mouse entered a node
- `selection-changed` - Selected node changed

See [Events](./events) for the complete event reference.

## Framework Integration

### React

```tsx
function GraphComponent({ nodes, edges, layout = "ngraph" }) {
    return (
        <graphty-element
            node-data={JSON.stringify(nodes)}
            edge-data={JSON.stringify(edges)}
            layout={layout}
            style={{ width: "100%", height: "500px", display: "block" }}
        />
    );
}
```

### Vue

```vue
<template>
    <graphty-element
        :node-data="JSON.stringify(nodes)"
        :edge-data="JSON.stringify(edges)"
        :layout="layout"
        style="display: block; width: 100%; height: 500px;"
    />
</template>
```

### Angular

```typescript
@Component({
    template: `
        <graphty-element [attr.node-data]="nodesJson" [attr.edge-data]="edgesJson" [attr.layout]="layout">
        </graphty-element>
    `,
})
export class GraphComponent {
    nodes = [{ id: "a" }, { id: "b" }];
    edges = [{ source: "a", target: "b" }];
    layout = "ngraph";

    get nodesJson() {
        return JSON.stringify(this.nodes);
    }
    get edgesJson() {
        return JSON.stringify(this.edges);
    }
}
```

### Svelte

```svelte
<script>
  export let nodes = [];
  export let edges = [];
  export let layout = 'ngraph';
</script>

<graphty-element
  node-data={JSON.stringify(nodes)}
  edge-data={JSON.stringify(edges)}
  {layout}
  style="display: block; width: 100%; height: 500px;"
/>
```

## Data Sources

Load data from external sources:

```html
<!-- Load from URL -->
<graphty-element data-source="url" data-source-config='{"url": "https://example.com/graph.json"}'> </graphty-element>
```

```javascript
element.dataSource = "url";
element.dataSourceConfig = { url: "https://example.com/graph.json" };
```

See [Data Sources](./data-sources) for available data source types.

## Direct Methods on the Web Component

Many methods from the `Graph` class are available directly on the `<graphty-element>` for convenience. This eliminates the need to access `.graph` for common operations.

### Data Methods

```javascript
const element = document.querySelector("graphty-element");

// Bulk data loading
element.setData({
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [{ source: "a", target: "b" }],
});

// Add nodes/edges
await element.addNode({ id: "c", label: "Node C" });
await element.addEdge({ source: "b", target: "c" });

// Get data
const node = element.getNode("a");
const allNodes = element.getNodes();
const nodeCount = element.getNodeCount();
```

### Selection and Layout

```javascript
// Selection
element.selectNode("node1");
element.deselectNode();
const selected = element.getSelectedNode();

// Layout control
element.setLayout("circular");
await element.waitForSettled(); // the queued operations are done
await element.waitForStableFrame(); // the picture has stopped changing
```

### Camera Control

```javascript
// Fit view
element.zoomToFit();

// Camera state
const state = element.getCameraState();
element.setCameraPosition({ x: 0, y: 0, z: 100 });
element.setCameraTarget({ x: 0, y: 0, z: 0 });

// Camera mode
await element.setCameraMode("arc-rotate", { target: { x: 0, y: 0, z: 0 } });
const controller = element.getCameraController();
```

### Manager Access

```javascript
// Access internal managers
const dataManager = element.getDataManager();
const layoutManager = element.getLayoutManager();
const selectionManager = element.getSelectionManager();
const eventManager = element.getEventManager();
const statsManager = element.getStatsManager();
```

### AI Control

```javascript
// Enable AI commands
await element.enableAiControl({
    provider: "anthropic",
    apiKey: "your-api-key",
});

// Execute commands
const result = await element.aiCommand("Find the central node");

// Status tracking
element.onAiStatusChange((status) => {
    console.log("AI:", status.stage);
});

// Voice input
element.startVoiceInput();
if (element.isVoiceActive()) {
    console.log("Listening...");
}
element.stopVoiceInput();

// Cleanup
element.disableAiControl();
```

### Screenshot and Capture

```javascript
// Take screenshot
const result = await element.captureScreenshot({
    width: 1920,
    height: 1080,
});

// Check capabilities before asking for a large one
const capability = await element.canCaptureScreenshot({ multiplier: 4 });
if (!capability.supported) {
    console.warn(capability.reason);
}
```

### Algorithms

```javascript
// Run algorithm
await element.runAlgorithm("graphty", "degree");

// Apply styling from results
element.applySuggestedStyles("graphty:degree");
```

## Need More Control?

While many methods are now available directly on the Web Component, some advanced operations still require accessing the underlying `Graph` instance:

- Custom layout engine implementations
- Direct Babylon.js scene access (`element.graph.getScene()`)
- Mesh cache access (`element.graph.getMeshCache()`)
- Advanced XR session management

See the **[JavaScript API Guide](./javascript-api)** for the complete `Graph` class reference.

## Interactive Examples

- [Default Graph](https://graphty.app/storybook/element/?path=/story/graphty--graphty) - Basic configuration
- [View Modes](https://graphty.app/storybook/element/?path=/story/viewmode--switch-view-modes) - 2D/3D switching
- [Layouts](https://graphty.app/storybook/element/?path=/story/layout-3d--circular) - Different layout algorithms
