# Layouts

Guide to available layout algorithms and configuration.

## Overview

Layout algorithms determine how nodes are positioned in the visualization. Choose the right layout based on your graph's structure and what you want to communicate.

## Available Layouts

`setLayout` takes either an engine name from the table below or a layout id from
`catalog.layouts()`. An id runs that layout's default engine, so `setLayout("force")` runs
`ngraph`, `"hierarchical"` runs `bfs` and `"layers"` runs `multipartite`.

`"force-2d"` is deprecated and is removed at the next major release. It still works, as the
`force` layout drawn by its flat `arf` engine: `setLayout("force-2d")` is
`element.session.layout.set("force", { engine: "arf" })`. For a flat force layout use
`{ dim: 2 }` instead, or the 2D view.

| Layout               | Type                      | Best For                                  | Dimensions |
| -------------------- | ------------------------- | ----------------------------------------- | ---------- |
| `ngraph`             | Force-directed            | General graphs                            | 2D/3D      |
| `d3`                 | Force-directed            | Web-standard                              | 2D/3D      |
| `arf`                | Force-directed            | Even spread over a flat disc              | 2D         |
| `circular`           | Geometric                 | Cycles, small graphs                      | 2D/3D      |
| `grid`               | Geometric                 | Regular structures                        | 2D         |
| `radial`             | Geometric                 | Distance from one node                    | 2D         |
| `hierarchical`       | Layered                   | Trees, DAGs                               | 2D         |
| `random`             | Random                    | Testing, initial state                    | 2D/3D      |
| `fixed`              | Manual                    | Pre-computed positions                    | 2D/3D      |
| `forceatlas2`        | Force-directed            | Clusters and communities                  | 2D/3D      |
| `spring`             | Force-directed            | General graphs                            | 2D/3D      |
| `spring-electrical`  | Force-directed            | Large graphs, with a hardware accelerator | 2D/3D      |
| `graphviz-dot`       | Layered (Graphviz)        | Directed graphs, flow charts              | 2D         |
| `graphviz-neato`     | Stress (Graphviz)         | Distances that match graph distances      | 2D         |
| `graphviz-fdp`       | Force-directed (Graphviz) | Undirected graphs                         | 2D         |
| `graphviz-sfdp`      | Force-directed (Graphviz) | Large undirected graphs                   | 2D         |
| `graphviz-circo`     | Circular (Graphviz)       | Rings of tightly connected parts          | 2D         |
| `graphviz-twopi`     | Radial (Graphviz)         | Rings around a root                       | 2D         |
| `graphviz-osage`     | Packed array (Graphviz)   | Many small parts                          | 2D         |
| `graphviz-patchwork` | Treemap (Graphviz)        | Tiling every node into one rectangle      | 2D         |

The eight `graphviz-*` layouts are Graphviz itself, compiled to WebAssembly, and need the optional
package `@hpcc-js/wasm-graphviz`. See [Graphviz layouts](./graphviz-layouts).

`forceatlas2`, `spring` and `spring-electrical` are live simulations: they keep stepping until the arrangement comes to rest
rather than computing one arrangement and stopping, so `element.setRunning(false)` pauses one and
`element.setRunning(true)` sets it going again. The pause holds until you resume it: loading more
nodes, setting another layout, an accelerator attaching or dragging a node places and moves nodes
but never restarts the simulation. `getLayoutManager().isPaused` is true for a layout stopped
before it came to rest, and `isSettled` is true only once it has. They are also the three that run on a hardware
accelerator when there is one -- and `spring-electrical` only runs on one. It has no CPU
implementation at all, so `setLayout("spring-electrical")` without an accelerator that implements
it throws `E_NO_ACCELERATOR` rather than quietly arranging the graph some other way. See the
[acceleration guide](./acceleration).

The default layout runs on an accelerator too, without being asked to and without being named
differently. `ngraph` and `spring-electrical` are one force model with two implementations, so on a
graph of two thousand nodes or more, with an accelerator attached that computes it, the element
draws `ngraph`'s arrangement on the accelerator; below that size, and on any machine with no
accelerator, ngraph itself draws it. `getLayoutManager().layoutType` says `ngraph` either way --
it is the same arrangement -- and nothing you write chooses between them. Two thousand is where
ngraph's own step stops fitting inside a frame, measured: 2.6 ms at a thousand nodes, 12 ms at two
thousand and 1.8 seconds at a hundred thousand. `acceleration="required"` uses the accelerator at
any size, and `acceleration="off"` never does.

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
    dim: 3,
});
```

## Layout Descriptions

### ngraph (Force-Directed)

The default layout. Uses physics simulation where:

- Edges act like springs pulling connected nodes together
- Nodes repel each other to prevent overlap
- Works well for most general graphs
- Runs on a hardware accelerator, as `spring-electrical`, from two thousand nodes upwards when one
  is attached; see the note at the top of this page

```typescript
graph.setLayout("ngraph", {
    springLength: 100, // Ideal edge length
    springCoefficient: 0.0008, // Spring stiffness
    gravity: -1.2, // Global attraction/repulsion
    dim: 3, // 2 or 3
    dragCoefficient: 0.02, // Damping
    theta: 0.8, // Barnes-Hut approximation
    seed: 7, // Starting positions; unset, they differ on every load
    nodeGap: 2, // Space kept between nodes' drawn surfaces; unset, nodes may overlap
    nodeGapFront: false, // In 3D, measure that space as seen from the front
});
```

### Keeping nodes from being drawn inside each other

The force layout treats every node as a point, so two nodes drawn large -- a size bound to a
ranking, say -- can land inside each other. Set `nodeGap` and the layout keeps every two nodes at
least their drawn radii plus `nodeGap` apart, in the same units as `springLength`. It reads each
node's size as it is drawn, so a style that makes nodes larger after the layout came to rest starts
the layout again until no two of them overlap. `0` lets nodes touch; unset (`null`, the default)
keeps the layout as it always was.

```typescript
element.layoutConfig = { nodeGap: 2 };
```

In 3D, two nodes kept apart in space still cover each other on screen when one is behind the
other. Add `nodeGapFront: true` to measure the gap across x and y only, as the starting view sees
the graph from the front, so no node is drawn over another until the camera is turned:

```typescript
element.layoutConfig = { nodeGap: 2, nodeGapFront: true };
```

`nodeGap` is honored by the `ngraph` engine; from two thousand nodes, with a hardware accelerator
attached, the element draws the default arrangement with `spring-electrical`, which does not read it.

### The same drawing every time

The default layout is unseeded, so the same data can settle in a different place each time it is
loaded. To have one file draw the same way on every load, pass a seed. A seeded layout settles in
the same place however its nodes and edges arrive -- in one write, or split across several writes
with frames between them:

```typescript
const element = document.querySelector("graphty-element");

// Seed the default layout before the data arrives.
element.layoutConfig = { seed: 7 };
element.nodeData = nodes;
element.edgeData = edges;

// Or seed it by name. A different seed gives a different, equally repeatable drawing.
await element.setLayout("force", { seed: 7 });
```

### d3 (Force-Directed)

D3's force simulation (`d3-force-3d`). Industry-standard for web visualizations. It runs until its
"alpha" cools from 1 down to `alphaMin`:

```typescript
graph.setLayout("d3", {
    alphaMin: 0.1, // Stop once alpha cools below this
    alphaTarget: 0, // The alpha the simulation cools towards
    alphaDecay: 0.0228, // How fast alpha cools each tick
    velocityDecay: 0.4, // Friction: how much speed each node loses each tick
    dim: 3, // 2 or 3
});
```

### circular

Arranges nodes in a circle. Good for:

- Small graphs
- Cycle detection
- Ring topologies

```typescript
graph.setLayout("circular", {
    scale: 1, // Radius of the circle, before scalingFactor
    scalingFactor: 80, // Multiplies every position; the drawn radius is scale * scalingFactor
    dim: 2, // 2 or 3
});
```

### grid

Arranges nodes in evenly spaced rows and columns, in the order they were loaded:

```typescript
graph.setLayout("grid", {
    columns: 5, // Number of columns (default: as close to square as possible)
    scale: 1, // Half the length of the grid's longer side
});
```

### radial

Puts one node at the center and every other node on a ring by its hop distance from it. Nodes the
root cannot reach share one extra outer ring:

```typescript
graph.setLayout("radial", {
    root: "node-1", // The node at the center (default: the node with the most edges)
    scale: 1, // Radius of the outermost ring
});
```

### hierarchical

Puts nodes in rows by how many steps they are from a starting node, so the graph reads as a tree
growing away from it. It runs the `bfs` engine, and `start` is required: without it the layout is
refused with `E_OPTION_RANGE`.

```typescript
graph.setLayout("hierarchical", {
    start: "root", // The node the tree grows from (required)
    align: "vertical", // "vertical" or "horizontal"
    scale: 1, // Size of the layout, before scalingFactor
    scalingFactor: 20, // Multiplies every position
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
    dim: 3,
});
```

### fixed

Use pre-computed positions from node data. Each node carries its center in a `position` field,
either `{ x, y, z }` or `[x, y, z]` (`z` may be left out and is then 0), with y growing upward.
Top-level `x`, `y` and `z` fields are ordinary attributes, not a position:

```typescript
const nodes = [
    { id: "a", position: { x: 0, y: 0, z: 0 } },
    { id: "b", position: { x: 100, y: 0, z: 0 } },
    { id: "c", position: { x: 50, y: 100, z: 0 } },
];

await graph.addNodes(nodes);
await graph.setLayout("fixed");
```

The coordinates are multiplied by the element's `positionScale` (default 1). A node with no usable
`position` is put at the origin (or stays where an earlier layout put it), and the element emits a
`layout-warning` event with code `W_NO_POSITION` and `params: { missing, total }`, the number of
nodes without one and the number placed:

```typescript
graph.addListener("layout-warning", (event) => {
    if (event.code === "W_NO_POSITION") {
        console.warn(`${event.params.missing} of ${event.params.total} nodes have no position`);
    }
});
```

To draw a file (GEXF, yEd GraphML, GML, Pajek, DOT, a Cytoscape session) where it was saved,
load it with `layout: "recommended"`: see
[Drawing a file where it was saved](./data-sources.md#drawing-a-file-where-it-was-saved).

### location-map

Puts every node at the place its data names, on a map drawn under the graph. With no options it
finds `latitude` and `longitude` attributes (also `lat`, `lon`, `lng`, `long`) by name, or one
attribute whose values are locations:

```html
<graphty-element id="g"></graphty-element>
<script type="module">
    import "@graphty/graphty-element";

    const g = document.getElementById("g");
    g.nodeData = [
        { id: "SFO", where: "37.619, -122.375" },
        { id: "JFK", where: "40 38 23 N, 73 46 44 W" },
        { id: "LHR", where: "POINT(-0.45 51.47)" },
    ];
    g.edgeData = [
        { source: "SFO", target: "JFK" },
        { source: "JFK", target: "LHR" },
    ];
    g.layout = "location-map";
    g.layoutConfig = { location: "where" };
</script>
```

A location is one attribute (`location`) or two (`latitude` and `longitude`). One attribute can be
a decimal pair (latitude first, or longitude first when only that fits), GeoJSON, WKT, ISO 6709,
degrees-minutes-seconds, a geohash, a plus code, MGRS or UTM; `format` names one when `auto`
should not decide.

To name the location once for the whole project instead of in the layout's options, designate it
in the data settings; the layout reads it whenever its own `location`, `latitude` and `longitude`
are unset, and `session.layout.locationColumns()` says which columns it will read:

```ts
await session.data.setRole({ kind: "node", name: "town" }, "city");
await session.data.setRole({ kind: "node", name: "nation" }, "country");
const { kinds, using, unused } = session.layout.locationColumns();
// kinds: { city: "town", country: "nation" }, using: "city", unused: []
```

Each kind of location is a role of its own, one column each: `latitude`, `longitude`,
`coordinates` (one column of whole locations), `country`, `region` and `city`. The layout reads a
full latitude and longitude pair first, else the coordinates, else the finest place kind given,
narrowed by the next coarser one (a city by its region, else its country). A kind given but not
read is listed in `unused` as `{ code: "location.unused", params: { kind, using } }`. Taking the
last kind away (`setRole(column, null)`) turns the search off. Before any kind is given,
`kinds` lists what the layout found by itself. The single `nodeLocationPath` form below still works.

- **Place names.** A column of country, region or city names works too. A `city` column (or `town`)
  with a `country` column (or `iso2`, `iso3`, `state`, `province`, `region`) beside it is found and
  placed with no settings; a column of names under any other heading is found by its values. The
  names are looked up in a gazetteer (Natural Earth countries and regions, GeoNames cities of 15,000
  people or more) fetched from graphty.app on first use, with accents and case ignored; when several
  places share a name, the narrowing column decides, then the most populous wins. "Lyon, FR" in one
  column is split at its last comma. `nodeLocationRole` (`auto`, `coords`, `country`, `region`,
  `city`, `none`) says how the designated column is read, `nodeLocationWithinPath` names the narrowing
  column and `nodeLocationWithin` a fixed country code; `none` turns the search off. The layout's
  `gazetteer` option is the address the files are fetched from, or `false` to read no place names.
  Names nothing matches are listed by `session.data.issues()` as `location-unmatched`, and names
  several places match as `location-ambiguous`. The map credits GeoNames while city names are placed.

    ```ts
    await session.config.set({
        data: { knownFields: { nodeLocationPath: "city", nodeLocationRole: "city", nodeLocationWithin: "US" } },
    });
    ```

- **Surface.** The 2D view always draws a flat map with straight edges. In 3D, `surface: "flat"`
  (the default) raises each edge as an arc over the map, and `surface: "globe"` draws a globe
  with great-circle arcs. The edge style `line.route` (`straight`, `arc`, `great-circle`) and
  `line.arcHeight` override the arcs per edge.
- **Extent.** `extent: "data"` (the default) fits the map to the located nodes; `"world"` shows
  the whole world. `size` is the map's width (or the globe's radius) in scene units.
- **No location.** A node with no usable location goes to a row below the map (`unplaced: "tray"`)
  or stays where it was (`"leave"`), never to latitude 0, longitude 0, and the element emits a
  `layout-warning` with code `W_LOCATION_UNPARSED` and `params: { missing, unparsed, total, samples }`.
- **The map.** The layout's `map` option picks the picture, on the flat map and wrapped onto the
  globe alike: unset (`null`), the bundled Natural Earth world image (no network);
  `{ source: "openstreetmap" }` or another named keyless source (`BASEMAP_SOURCE_DESCRIPTORS` in
  `@graphty/graphty-element/catalog` lists them); `{ tiles, attribution }` for any XYZ tile service;
  `{ image, bounds }` for one picture; `{ source: "none" }` for none. Zooming in loads finer tiles.
  Setting a new `map` on the applied layout swaps the picture without moving a node:

    ```javascript
    g.layoutConfig = { location: "where", surface: "globe", map: { source: "nasa-gibs-blue-marble" } };
    ```

    The map's credits are drawn in the canvas's corner and are on `element.basemapStatus.attribution`.
    The map is saved with the layout in the project.

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

ngraph's spring-electrical model at a size ngraph itself cannot reach, and what the default layout
is drawn by on a big enough graph when an accelerator is attached. Asked for by name it has no CPU
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

## Switching Layouts

Set another layout at any time; the new one starts from where the nodes are:

```typescript
graph.setLayout("random");
await graph.waitForSettled();

graph.setLayout("circular");
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

## When a layout refuses the graph

Some layouts only arrange certain graphs: `planar` needs a graph that can be drawn without crossing
edges, and `bfs` needs every node reachable from its start. Given another graph, the layout places
nothing -- every node stays where it was -- and the element reports the refusal on its `error`
event as a `GraphtyError` with a code to switch on: `E_NOT_PLANAR` or `E_NOT_CONNECTED`, with the
graph's size in `details`. The layout stays the chosen one and runs again when the graph changes.

A layout refused for its options places nothing either, and the refusal carries the option's name
in `details.option`:

| Code                  | When                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------- |
| `E_UNKNOWN_ELEMENT`   | an option names a node the graph does not hold (a `bfs` start, a `radial` root)        |
| `E_OPTION_RANGE`      | an option is missing (`bfs` with no `start`) or has a value the layout does not accept |
| `E_UNKNOWN_OPTION`    | the layout has no option of that name                                                  |
| `E_UNKNOWN_ATTRIBUTE` | an option names a node attribute the graph does not hold                               |
| `E_ATTRIBUTE_TYPE`    | an option names a node attribute whose values the layout cannot read                   |
| `E_BAD_WEIGHT`        | an edge weight the layout cannot use, such as a negative `kamada-kawai` distance       |

`ngraph`, `forceatlas2`, `spring` and `spring-electrical` do not refuse an option they do not take:
they run without it and emit a `layout-warning` event with code `W_UNKNOWN_OPTION`, whose
`params.options` lists the names they ignored and `params.available` the names they take:

```typescript
graph.addListener("layout-warning", (event) => {
    if (event.code === "W_UNKNOWN_OPTION") {
        console.warn(`${event.layoutType} ignored ${String(event.params.options)}`);
    }
});
```

What to do about a refusal is the application's choice, such as picking another layout:

```typescript
element.addEventListener("error", (event) => {
    const { error } = event.detail;
    if (isGraphtyError(error) && error.code === "E_NOT_PLANAR") {
        element.layout = "spring";
    }
});
```

## 2D vs 3D

Switching the view between 2D and 3D runs the layout again for that view. In the 2D view every
layout is drawn flat, whatever `dim` it was given. In the 3D view a layout with a `dim` option can
still be drawn flat:

```typescript
// 3D (the default in the 3D view)
graph.setLayout("ngraph", { dim: 3 });

// Flat, in the 3D view
graph.setLayout("ngraph", { dim: 2 });
```

```html
<graphty-element layout="d3" view-mode="2d"></graphty-element>
```

The layout follows the view mode when `dim` is not set. In 3D mode a `dim: 2` is kept, so a 3D
view can show a flat layout. In 2D mode the layout is always computed in 2D: a `dim: 3` is
replaced by `dim: 2`, and a `layout-warning` event with code `W_DIMENSION_OVERRIDDEN` reports it,
with the options as given in `params.requested` and the values used in `params.used`. Switching
back to 3D builds the layout with the `dim` it was given again.

`element.session.layout.arrangedDimension` says how many dimensions the current layout places
nodes in -- `"2d"` or `"3d"` -- which `session.layout.dimension`, the view's dimension, cannot.

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

## Laying out part of the graph

`setLayout` takes a `scope` as its third argument. The layout moves only the scope's nodes and
holds every other node exactly where it is -- useful for tidying one community or a kept
[set](./sets) without disturbing the rest:

```typescript
const cluster = element.session.sets.create({ kind: "fixed", nodes: ["a", "b", "c", "d"], reading: "induced" });

await element.setLayout("ngraph", { seed: 7 }, { scope: { set: cluster } });

// The scope is kept: changing an option lays out the same nodes again
element.layoutConfig = { seed: 8 };

// Back to the whole graph
await element.setLayout("ngraph", {}, { scope: "graph" });
```

The same scope is the `layoutScope` property and the `layout-scope` attribute (JSON), which read
`undefined` for the whole graph.

- **The members are captured when the layout starts.** A click, a filter change or an attribute
  edit does not move the hold, and a node added later is held too.
- **The physics layouts accept a scope**: `ngraph`, `d3`, `forceatlas2`, `spring` and
  `spring-electrical`. Any other refuses one with `E_UNSUPPORTED`; `session.catalog.layouts()`
  says which as `scoped`.
- **A hold is not a pin.** It is never saved as a pin, and unpinning a held node does not release
  it.
- **Removing the set releases the hold**: the layout runs over the whole graph, and nothing throws.
- Held nodes still push and pull on the members, so a scoped layout costs the same per step as a
  whole-graph one, and a small scope is spread over the whole layout's extent.

## Performance Tips

1. **Large graphs**: Use Barnes-Hut approximation (ngraph with default theta)
2. **Initial state**: Start with random layout, then switch to force-directed
3. **Fixed data**: Pre-compute positions and use `fixed` layout
4. **Incremental updates**: Add nodes in batches, not one at a time

## Custom Layouts

Create your own layout algorithms. See [Custom Layouts](./extending/custom-layouts) for details.

## Interactive Examples

- [3D Layouts](https://graphty.app/storybook/graphty-element/?path=/story/layout-3d--circular)
- [2D Layouts](https://graphty.app/storybook/graphty-element/?path=/story/layout-2d--circular)
