# Results and Options

Every layout has the same signature: a graph snapshot first, an options object second, and a `LayoutResult` back.
This page covers what the layouts share: the options every one of them takes, how to name nodes in options, and how to
turn a result into the form your renderer wants.

## The Graph

A layout reads a `GraphSnapshot` from [`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format).
Build one with `GraphBuilder` (ids are strings or numbers, numbered in the order they first appear), freeze arrays you
already hold with `fromEdgeArrays`, or read a file with [`@graphty/graph-io`](https://graphty.app/docs/graph-io/).

A layout treats a directed snapshot as undirected: edge direction never changes a position. Layouts that can read edge
weights take them from the snapshot (`weight: true`) or from a numeric edge column named in the options.

## Common Options

Every layout accepts these options besides its own:

| Option   | Type             | Default    | Meaning                                                           |
| -------- | ---------------- | ---------- | ----------------------------------------------------------------- |
| `dim`    | `2` or `3`       | `2`        | numbers per node; see [2D and 3D](./dimensions.md)                |
| `scale`  | number           | `1`        | the size of the layout around its center                          |
| `center` | array of numbers | the origin | the center; missing components are 0                              |
| `seed`   | number           | none       | the seed of a layout that draws random numbers, for repeatability |

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { cycleGraph } from "@graphty/graph-samples/generators";
import { circular, fruchtermanReingold } from "@graphty/layout";

const graph = fromEdgeArrays(cycleGraph({ n: 6 }));

// a circle of radius 10 around (100, 50)
const ring = circular(graph, { scale: 10, center: [100, 50] });
console.log(ring.positions[0], ring.positions[1]); // 110 50

// the same seed gives the same drawing on every run
const first = fruchtermanReingold(graph, { seed: 7 });
const again = fruchtermanReingold(graph, { seed: 7 });
console.log(first.positions.every((v, i) => v === again.positions[i])); // true
```

Without a `seed`, a layout that draws random numbers (`random`, `fruchtermanReingold`, `forceAtlas2` and `arf` for
their start, `spectral` for its start vectors) can give a different drawing on every run. Pass a seed whenever the drawing must not change between
page loads.

## Naming Nodes in Options

Options that point at one node (`radial`'s `root`, `bfs`'s `start`) take a node number or `{ id }`. Options that name a
group of nodes (`shell`'s `nlist`, `multipartite`'s `subsets`, `bipartite`'s `top`) take, for each group, an array of
node numbers, `{ ids: [...] }`, or the name of a node column whose values define the groups. An id that is not in the
graph throws.

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { radial, shell } from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
for (const leaf of ["a", "b", "c", "d"]) {
    builder.addEdge("hub", leaf);
}
const graph = builder.freeze();

const rings = radial(graph, { root: { id: "hub" } });
const shells = shell(graph, { nlist: [{ ids: ["hub"] }, { ids: ["a", "b", "c", "d"] }] });
console.log(rings.n, shells.n); // 5 5

try {
    radial(graph, { root: { id: "nobody" } });
} catch {
    console.log("unknown id"); // unknown id
}
```

## Converting Results

A `LayoutResult` holds `positions` (a `Float32Array`, `dim` numbers per node in node order), `dim` and `n`. These helpers
convert it to and from the other forms a renderer needs:

| Helper               | Converts                                                                       |
| -------------------- | ------------------------------------------------------------------------------ |
| `toPositionMap`      | a result to an object keyed by node id, each value `[x, y]` or `[x, y, z]`     |
| `fromPositionMap`    | an id-keyed object back to a flat array, filling nodes it does not mention     |
| `fitToBox`           | a result into a rectangle, such as a canvas in pixels, keeping its proportions |
| `toPositionColumn`   | a result to three numbers per node in scene units (`value * scale + center`)   |
| `fromPositionColumn` | the inverse of `toPositionColumn`                                              |
| `rescaleInPlace`     | rescales and recenters a flat array in place                                   |

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { circular, fitToBox, fromPositionMap, toPositionColumn, toPositionMap } from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
const graph = builder.freeze();
const result = circular(graph);

// an object keyed by id
const byId = toPositionMap(result, graph.ids);
console.log(Object.keys(byId)); // ["a", "b", "c"]

// back to a flat array; the callback writes the row of every node the object leaves out
const flat = fromPositionMap({ a: [1, 2] }, graph.ids, 2, (i, out) => out.set([0, 0], 2 * i));
console.log(flat); // [1, 2, 0, 0, 0, 0]

// into an 800 x 600 canvas, in pixels
const pixels = fitToBox(result, { x: 0, y: 0, w: 800, h: 600 });
console.log(pixels.positions.every((v, i) => v >= 0 && v <= (i % 2 === 0 ? 800 : 600))); // true

// three numbers per node, for a 3D scene where one layout unit is 100 scene units
const column = toPositionColumn(result, 100, [0, 0, 0]);
console.log(column.length); // 9
```

## Nodes a Layout Leaves Out

`shell` and `multipartite` place only the nodes their groups name. A node in no group gets `NaN` coordinates, and
`toPositionMap` leaves it out of the object:

<!-- doc-check -->

```typescript
import { GraphBuilder } from "@graphty/graph-format";
import { shell, toPositionMap } from "@graphty/layout";

const builder = new GraphBuilder({ directed: false });
builder.addEdge("a", "b");
builder.addEdge("b", "c");
const graph = builder.freeze();

const result = shell(graph, { nlist: [{ ids: ["a", "b"] }] });
console.log(Number.isNaN(result.positions[4])); // true
console.log(Object.keys(toPositionMap(result, graph.ids))); // ["a", "b"]
```

## Starting Positions

The force-directed layouts and `kamadaKawai` take start positions as `pos`: a `Float32Array` of `dim` numbers per node
in node order. A good start makes the layout converge sooner, and keeps a new drawing close to the one the reader
already saw. In `forceAtlas2`, `fruchtermanReingold` and `arf`, a `NaN` coordinate is drawn from `seed` and the others
are kept:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { gridGraph } from "@graphty/graph-samples/generators";
import { forceAtlas2, grid } from "@graphty/layout";

const graph = fromEdgeArrays(gridGraph({ rows: 10, cols: 10 }));
const start = grid(graph); // a cheap, sensible start
const result = forceAtlas2(graph, { pos: start.positions, maxIter: 50 });
console.log(result.n); // 100
```

## Errors

Invalid input throws an `Error` whose message names the problem:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { completeGraph } from "@graphty/graph-samples/generators";
import { arf } from "@graphty/layout";

const graph = fromEdgeArrays(completeGraph({ n: 5 }));
try {
    arf(graph, { a: 0.5 });
} catch (error) {
    console.log((error as Error).message); // "The parameter a should be larger than 1"
}
```

## Graphs from Layout 1.x

Layout 1.x took an object with `nodes()` and `edges()` methods. `toLayoutSnapshot` converts one, or a plain array of
node ids, into a snapshot:

<!-- doc-check -->

```typescript
import { spectral, toLayoutSnapshot, toPositionMap } from "@graphty/layout";

const graph = {
    nodes: () => ["a", "b", "c", "d"],
    edges: (): [string, string][] => [
        ["a", "b"],
        ["b", "c"],
        ["c", "d"],
        ["d", "a"],
    ],
};
const snapshot = toLayoutSnapshot(graph);
const byId = toPositionMap(spectral(snapshot), snapshot.ids);
console.log(Object.keys(byId)); // ["a", "b", "c", "d"]
```

The [README's migration table](https://github.com/graphty-org/graphty-monorepo/tree/master/layout#migrating-from-1x)
lists the replacement for every 1.x layout function.
