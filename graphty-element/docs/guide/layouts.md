# Layouts

Guide to available layout algorithms and configuration.

## Overview

Layout algorithms determine how nodes are positioned in the visualization. Choose the right layout based on your graph's structure and what you want to communicate.

## Available Layouts

| Layout              | Type           | Best For                                  | Dimensions |
| ------------------- | -------------- | ----------------------------------------- | ---------- |
| `ngraph`            | Force-directed | General graphs                            | 2D/3D      |
| `d3-force`          | Force-directed | Web-standard                              | 2D         |
| `circular`          | Geometric      | Cycles, small graphs                      | 2D/3D      |
| `grid`              | Geometric      | Regular structures                        | 2D/3D      |
| `hierarchical`      | Layered        | Trees, DAGs                               | 2D/3D      |
| `random`            | Random         | Testing, initial state                    | 2D/3D      |
| `fixed`             | Manual         | Pre-computed positions                    | 2D/3D      |
| `forceatlas2`       | Force-directed | Clusters and communities                  | 2D/3D      |
| `spring`            | Force-directed | General graphs                            | 2D/3D      |
| `spring-electrical` | Force-directed | Large graphs, with a hardware accelerator | 2D/3D      |

The last three are live simulations: they keep stepping until the arrangement comes to rest
rather than computing one arrangement and stopping, so `element.setRunning(false)` pauses one and
`element.setRunning(true)` sets it going again. They are also the three that run on a hardware
accelerator when there is one -- and `spring-electrical` only runs on one. It has no CPU
implementation at all, so `setLayout("spring-electrical")` without an accelerator that implements
it throws `E_NO_ACCELERATOR` rather than quietly arranging the graph some other way. See the
[acceleration guide](./acceleration).

## Setting a Layout

### Via HTML Attribute

```html
<graphty-element layout="ngraph"></graphty-element> <graphty-element layout="circular"></graphty-element>
```

### Via JavaScript

```typescript
// Simple layout change
graph.setLayout("circular");

// With configuration options
graph.setLayout("ngraph", {
    springLength: 100,
    springCoefficient: 0.0008,
    gravity: -1.2,
    dimensions: 3,
});
```

## Layout Descriptions

### ngraph (Force-Directed)

The default layout. Uses physics simulation where:

- Edges act like springs pulling connected nodes together
- Nodes repel each other to prevent overlap
- Works well for most general graphs

```typescript
graph.setLayout("ngraph", {
    springLength: 100, // Ideal edge length
    springCoefficient: 0.0008, // Spring stiffness
    gravity: -1.2, // Global attraction/repulsion
    dimensions: 3, // 2 or 3
    dragCoefficient: 0.02, // Damping
    theta: 0.8, // Barnes-Hut approximation
});
```

### d3-force (Force-Directed)

D3's force simulation. Industry-standard for web visualizations:

```typescript
graph.setLayout("d3-force", {
    strength: -30, // Node repulsion
    distance: 50, // Link distance
    iterations: 300, // Simulation steps
});
```

### circular

Arranges nodes in a circle. Good for:

- Small graphs
- Cycle detection
- Ring topologies

```typescript
graph.setLayout("circular", {
    radius: 100, // Circle radius
    startAngle: 0, // Starting angle (radians)
    endAngle: Math.PI * 2, // Ending angle
});
```

### grid

Arranges nodes in a regular grid:

```typescript
graph.setLayout("grid", {
    columns: 5, // Number of columns
    spacing: 10, // Space between nodes
});
```

### hierarchical

Tree-like layout for directed graphs:

```typescript
graph.setLayout("hierarchical", {
    direction: "TB", // TB, BT, LR, RL
    levelSeparation: 100, // Vertical spacing
    nodeSeparation: 50, // Horizontal spacing
});
```

### random

Random positions. Useful for:

- Testing
- Initial state before force layout
- Deliberate chaos visualization

```typescript
graph.setLayout("random", {
    seed: 42, // For reproducible layouts
    dimensions: 3,
});
```

### fixed

Use pre-computed positions from node data:

```typescript
// Node data includes positions
const nodes = [
    { id: "a", x: 0, y: 0, z: 0 },
    { id: "b", x: 100, y: 0, z: 0 },
    { id: "c", x: 50, y: 100, z: 0 },
];

await graph.addNodes(nodes);
graph.setLayout("fixed");
```

### forceatlas2 (Force-Directed, live)

Gephi's ForceAtlas2, kept running rather than solved once. Good for pulling communities apart:

```typescript
graph.setLayout("forceatlas2", {
    seed: 42, // Same seed, same settled shape
    scalingRatio: 2.0, // Node repulsion
    gravity: 1.0, // Pull towards the centre
    linlog: false, // Log attraction: tighter clusters
    dissuadeHubs: false, // Push high-degree nodes outwards
});
```

Runs on a hardware accelerator when one is attached. See the [acceleration guide](./acceleration).

### spring (Force-Directed, live)

Fruchterman-Reingold, also a live simulation. Pick it when the arrangement has to be reproducible
from a seed:

```typescript
graph.setLayout("spring", {
    seed: 42, // Same seed, same settled shape
    k: null, // Ideal node distance; null auto-calculates it
    iterations: 50, // Simulation steps per settle
    scale: 1, // Multiplies the radius the arrangement is drawn at
});
```

Runs on a hardware accelerator when one is attached.

### spring-electrical (Force-Directed, live, accelerator only)

ngraph's spring-electrical model at a size ngraph itself cannot reach. It has no CPU
implementation: without an accelerator that implements it, `setLayout("spring-electrical")`
throws `E_NO_ACCELERATOR` rather than quietly arranging the graph some other way.

```typescript
graph.setLayout("spring-electrical", {
    seed: 42,
    springLength: 10, // The distance an edge pulls its nodes towards
    springCoefficient: 0.8, // How hard an edge pulls
    gravity: -12, // Node repulsion; negative repels
    dragCoefficient: 0.9, // How quickly motion bleeds away
});
```

See the [acceleration guide](./acceleration) for how to attach one.

## Layout Transitions

Animate between layouts for smooth visual transitions:

```typescript
// Current layout
graph.setLayout("random");
await graph.waitForSettled();

// Transition to new layout
graph.setLayout(
    "circular",
    {},
    {
        animate: true,
        duration: 1000,
    },
);
```

## Waiting for Settled

Force-directed layouts converge over time. Wait for stabilization:

```typescript
graph.setLayout("ngraph");

// Wait for physics to settle
await graph.waitForSettled();

// Now safe to zoom to fit
graph.zoomToFit();
```

You can also listen to the event:

```typescript
graph.on("graph-settled", () => {
    console.log("Layout complete");
    graph.zoomToFit();
});
```

## 2D vs 3D

Most layouts support both dimensions:

```typescript
// 3D layout (default)
graph.setLayout("ngraph", { dimensions: 3 });

// 2D layout
graph.setLayout("ngraph", { dimensions: 2 });
```

For 2D layouts, also set the view mode:

```html
<graphty-element layout="d3-force" view-mode="2d"></graphty-element>
```

## Edge weights

Two layouts read edge weights: `kamada-kawai` and `forceatlas2`. Both are on by default on a graph
whose edges carry weights, and both read the number the same way: **a larger weight means a
stronger connection**, drawn shorter.

```typescript
// Weights are read by default. This says so explicitly.
graph.setLayout("forceatlas2", { weighted: true });

// Arrange this graph as though its weights were not there.
graph.setLayout("forceatlas2", { weighted: false });
```

A graph whose weights are all 1 -- which is every unweighted graph -- is arranged exactly as it
was before weights existed, by construction: with no information in the weight column the element
hands the layout no weight callback at all.

Where a weight comes from is `data.knownFields.edgeWeightPath`, which defaults to `weight`.
Parallel edges are summed into one weight per ordered pair, because the layout functions read a
weight by endpoint pair and have nowhere to put a second one.

Ask the catalogue rather than hard-coding the list of two:

```typescript
for (const layout of element.session.catalog.layouts()) {
    layout.honoursWeights; // whether a "use edge weights" control belongs in your UI
}
```

`weighted` replaces 1.x's `weightProperty` and `weightPath`. Both are gone, and a stored layout
configuration carrying either is refused at parse rather than ignored.

## Pinned nodes

A node the reader drags is pinned where they dropped it, and it stays there through a layout
change, a 2D/3D switch and a template apply. That is true under every layout, including the
fourteen with no physics of their own and including a layout you wrote yourself.

```typescript
element.pin("alice");
element.unpin("alice");
element.pinnedNodes; // a Set of the pinned node ids
```

Turn the drag behaviour off with `pinOnDrag: false` in the graph's behaviour configuration; the
verbs above still work.

## Performance Tips

1. **Large graphs**: Use Barnes-Hut approximation (ngraph with default theta)
2. **Initial state**: Start with random layout, then switch to force-directed
3. **Fixed data**: Pre-compute positions and use `fixed` layout
4. **Incremental updates**: Add nodes in batches, not one at a time

## Custom Layouts

Create your own layout algorithms. See [Custom Layouts](./extending/custom-layouts) for details.

## Interactive Examples

- [3D Layouts](https://graphty.app/storybook/element/?path=/story/layout-3d--circular)
- [2D Layouts](https://graphty.app/storybook/element/?path=/story/layout-2d--circular)
