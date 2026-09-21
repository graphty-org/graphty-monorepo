# JavaScript API Reference

Complete API reference for the `Graph` class.

## Overview

The `Graph` class is the core orchestrator for programmatic graph manipulation. Access it via the `.graph` property on the Web Component:

```typescript
const element = document.querySelector("graphty-element");
const graph = element.graph;
```

::: tip
For usage patterns and examples, see the [JavaScript API Guide](/guide/javascript-api).
:::

## Core Methods

### Data Management

| Method                 | Parameters     | Returns             | Description            |
| ---------------------- | -------------- | ------------------- | ---------------------- |
| `addNodes(nodes)`      | `NodeData[]`   | `Promise<void>`     | Add nodes to the graph |
| `addEdges(edges, options?)` | `EdgeData[]`, `{source?, target?, repeated?}` | `Promise<void>` | Add edges to the graph |
| `setEdges(edges, options?)` | `EdgeData[]`, `{source?, target?, repeated?}` | `Promise<void>` | Replace every edge with these |
| `removeNodes(ids)`     | `string[]`     | `Promise<void>`     | Remove nodes and their incident edges |
| `updateNodes(updates)` | `NodeUpdate[]` | `Promise<void>`     | Update node properties |
| `getNode(id)`          | `string`       | `Node \| undefined` | Get node by ID         |
| `getNodes()`           | -              | `Node[]`            | Get all nodes          |
| `clear()`              | -              | `Promise<void>`     | Remove all data        |

Edge records are read through the session, by edge id -- `session.data.edge(id)` -- because an
edge's identity is the element's own counter rather than a pair of endpoints. Every edge running
between two nodes is `graph.getDataManager().getEdgesBetween(a, b)`, which answers a list because
a graph may hold more than one.

`addEdges`' options are the endpoint expressions to read this batch with and the repeat policy for
this call. Assigning the `edge-data` property, or calling `setEdges`, REPLACES the edge set;
`addEdges` appends.

### Selection

| Method              | Parameters | Returns        | Description       |
| ------------------- | ---------- | -------------- | ----------------- |
| `selectNode(id)`    | `string`   | `void`         | Select a node     |
| `deselectNode()`    | -          | `void`         | Clear selection   |
| `getSelectedNode()` | -          | `Node \| null` | Get selected node |

### Layout

| Method                      | Parameters         | Returns         | Description                  |
| --------------------------- | ------------------ | --------------- | ---------------------------- |
| `setLayout(type, options?)` | `string`, `object` | `void`          | Set layout algorithm         |
| `waitForSettled()`          | -                  | `Promise<void>` | Wait for layout to stabilize |
| `isSettled()`               | -                  | `boolean`       | Check if layout is stable    |

### Algorithms

| Method                          | Parameters         | Returns                    | Description                   |
| ------------------------------- | ------------------ | -------------------------- | ----------------------------- |
| `runAlgorithm(namespace, type)` | `string`, `string` | `Promise<AlgorithmResult>` | Run an algorithm              |
| `applySuggestedStyles(id)`      | `string`           | `void`                     | Apply algorithm visualization |

### Camera Control

| Method                            | Parameters                              | Returns         | Description           |
| --------------------------------- | --------------------------------------- | --------------- | --------------------- |
| `zoomToFit()`                     | -                                       | `void`          | Fit all nodes in view |
| `getCameraState()`                | -                                       | `CameraState`   | Get camera state      |
| `setCameraState(state, options?)` | `CameraState`, `CameraAnimationOptions` | `Promise<void>` | Set camera state      |
| `setCameraPosition(pos)`          | `{x, y, z}`                             | `void`          | Set camera position   |
| `setCameraTarget(target)`         | `{x, y, z}`                             | `void`          | Set camera target     |

### Styling

Styling is the session's, not the graph's. Every verb is on `graph.getSession().styles`, and
every one of them addresses a layer by the id the element minted for it:

| Method                      | Returns                   | Description                             |
| --------------------------- | ------------------------- | --------------------------------------- |
| `list()`                    | `readonly Layer[]`        | Every layer, bottom first               |
| `get(id)`                   | `Layer \| undefined`      | One layer                               |
| `validate(spec)`            | `ValidationResult`        | Check a spec, committing nothing        |
| `add(spec, at?)`            | `Run<Layer>`              | Add a layer and repaint                 |
| `update(id, patch)`         | `Run<Layer>`              | Change one and repaint                  |
| `remove(id)`                | `Run<void>`               | Take one out and repaint                |
| `move(id, before)`          | `Run<void>`               | Restack it; `null` means the top        |
| `removeBySource(predicate)` | `Run<readonly LayerId[]>` | Sweep every layer from one source       |
| `encode(spec)`              | `Run<Layer>`              | Paint a channel from a finished run     |
| `highlight(spec)`           | `Run<readonly Layer[]>`   | Paint the elements a run chose          |
| `legend()`                  | `readonly LegendBlock[]`  | What a reader needs to read the picture |
| `explain(target)`           | `StyleExplanation`        | Which layer decided each channel        |

A write verb returns a `Run` rather than resolving to a value, so a layer edit on a large graph
can report progress and be cancelled. The stack moves only once the repaint has succeeded.

### Events

| Method                | Parameters           | Returns | Description             |
| --------------------- | -------------------- | ------- | ----------------------- |
| `on(event, handler)`  | `string`, `Function` | `void`  | Subscribe to events     |
| `off(event, handler)` | `string`, `Function` | `void`  | Unsubscribe from events |

### Batch Operations

| Method                | Parameters       | Returns         | Description               |
| --------------------- | ---------------- | --------------- | ------------------------- |
| `batchOperations(fn)` | `async Function` | `Promise<void>` | Batch multiple operations |

## Manager Classes

The Graph class exposes manager instances for advanced control:

### DataManager

```typescript
await graph.dataManager.loadFromUrl(url);
await graph.dataManager.addNodes(nodes);
await graph.dataManager.clear();
```

### LayoutManager

```typescript
graph.layoutManager.setLayout("ngraph", options);
await graph.layoutManager.waitForSettled();
```

### AlgorithmManager

```typescript
await graph.algorithmManager.run("graphty", "degree");
graph.algorithmManager.applySuggestedStyles("graphty:degree");
```

## Data Types

### NodeData

```typescript
interface NodeData {
    id: string;
    label?: string;
    [key: string]: unknown;
}
```

### EdgeData

```typescript
interface EdgeData {
    source: string;
    target: string;
    weight?: number;
    [key: string]: unknown;
}
```

### CameraState

```typescript
interface CameraState {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    up: { x: number; y: number; z: number };
}
```

### LayerSpec

```typescript
interface LayerSpec {
    name: string;
    target?: "node" | "edge";
    kind?: "base" | "encoding" | "highlight" | "custom";
    selector: Selector;
    set?: StaticStyle; // literal channel values
    encode?: Encoding; // channel values bound to the data
    enabled?: boolean;
}
```

The channels a layer can write, the selector language and the scales an encoding reads through
are all in the [styling guide](/guide/styling).

## Generated Reference

For complete type definitions and detailed API documentation:

- [Graph Class](/api/generated/index/classes/Graph.md) - Full TypeDoc reference
- [Node Class](/api/generated/index/classes/Node.md) - Node type reference
- [Edge Class](/api/generated/index/classes/Edge.md) - Edge type reference
- [Managers](/api/generated/index/) - Manager class references

## Extension Classes

For creating custom extensions:

- [LayoutEngine](/api/generated/index/classes/LayoutEngine.md) - Custom layout base class
- [Algorithm](/api/generated/index/classes/Algorithm.md) - Custom algorithm base class
- [DataSource](/api/generated/index/classes/DataSource.md) - Custom data source base class

## Related

- [JavaScript API Guide](/guide/javascript-api) - Usage patterns and examples
- [Web Component API Reference](/api/web-component) - Declarative Web Component API
