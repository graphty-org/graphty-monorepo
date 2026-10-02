# @graphty/cytoscape

Every layout in [@graphty/layout](https://graphty.app/docs/layout/api/generated/) as a
[Cytoscape.js](https://js.cytoscape.org/) 3.x layout extension: thirteen static layouts and the
ForceAtlas2, Fruchterman-Reingold and spring-electrical force simulations.

Not published yet (the package is private while its API settles).

## Example

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape";

cytoscape.use(graphtyCytoscape); // registers every "graphty-<name>" layout

const cy = cytoscape({
    container: document.getElementById("cy"),
    elements: [
        { data: { id: "a" } },
        { data: { id: "b" } },
        { data: { id: "c" } },
        { data: { source: "a", target: "b", w: 2 } },
        { data: { source: "b", target: "c", w: 1 } },
    ],
});

cy.layout({ name: "graphty-forceatlas2", animate: true, weight: "w" }).run();
```

## Layouts

| Name                           | Kind       | Options of its own                                                                                                                  |
| ------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `graphty-random`               | static     | `seed`                                                                                                                              |
| `graphty-circular`             | static     |                                                                                                                                     |
| `graphty-spiral`               | static     | `resolution`, `equidistant`                                                                                                         |
| `graphty-grid`                 | static     | `columns`                                                                                                                           |
| `graphty-shell`                | static     | `nlist`: the shells, innermost first, each a selector or a collection                                                               |
| `graphty-bipartite`            | static     | `top`: selector or collection of the first line (default: every other node); `align`, `aspectRatio`                                 |
| `graphty-multipartite`         | static     | `subsets`: a node data field naming each node's layer (default `"subset"`), or the layers as selectors or collections; `align`      |
| `graphty-bfs`                  | static     | `start`: selector or collection of the start node (default the first node); `align`. Throws on a disconnected graph                 |
| `graphty-radial`               | static     | `root`: selector or collection of the centre node (default the node with the most neighbours)                                       |
| `graphty-planar`               | static     | Throws when the graph is not planar                                                                                                 |
| `graphty-spectral`             | static     | `seed`                                                                                                                              |
| `graphty-kamada-kawai`         | static     | `weight`. Memory grows with the square of the node count                                                                            |
| `graphty-arf`                  | static     | `seed`, `scaling`, `a`, `maxIter`                                                                                                   |
| `graphty-forceatlas2`          | simulation | `weight`, `maxIter` (100), `scalingRatio`, `gravity`, `strongGravity`, `linlog`, `distributedAction`, `jitterTolerance`             |
| `graphty-fruchterman-reingold` | simulation | `weight`, `iterations` (50), `k`                                                                                                    |
| `graphty-spring-electrical`    | simulation | Needs `accelerator` (there is no CPU implementation): `springLength`, `springCoefficient`, `gravity`, `dragCoefficient`, `timeStep` |

Any option not listed in the next section is passed to the @graphty/layout function of the same
name unchanged.

## Options every layout takes

| Option                                                                                | Default      | Meaning                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `boundingBox`                                                                         | the viewport | `{ x1, y1, w, h }` or `{ x1, y1, x2, y2 }`. The result is scaled so the node farthest from the centre sits half the box's shorter side away. A headless core's viewport is 1 x 1, so pass a box there |
| `fit`, `padding`                                                                      | `true`, `30` | Fit the viewport to the result                                                                                                                                                                        |
| `animate`                                                                             | `false`      | Static layouts: any truthy value tweens to the result. Simulations: `true` draws every frame; `"end"` computes, then tweens                                                                           |
| `animationDuration`, `animationEasing`, `animateFilter`, `spacingFactor`, `transform` |              | As in Cytoscape's built-in layouts                                                                                                                                                                    |
| `ready`, `stop`                                                                       |              | Called on `layoutready` and `layoutstop`                                                                                                                                                              |
| `weight`                                                                              | none         | Edge data field holding the weight; a missing or non-numeric value counts as 1                                                                                                                        |
| `seed`                                                                                | random       | Seed of every random draw, for repeatable results                                                                                                                                                     |
| `dim`                                                                                 | `2`          | `3` runs the layout in 3D and projects the result onto the x-y plane                                                                                                                                  |
| `randomize`                                                                           | `true`       | Simulations: start from random positions in the box, or (`false`) from the current ones                                                                                                               |
| `refresh`                                                                             | `1`          | Simulations with `animate: true`: iterations per frame                                                                                                                                                |
| `accelerator`                                                                         | none (CPU)   | Simulations: a WebGPU accelerator from `createAccelerator` in @graphty/webgpu-graph-algorithms                                                                                                        |

Locked nodes never move. The simulations also treat them as fixed while computing, so the rest of
the graph arranges itself around them; with a locked node present the simulation keeps the
locked node's pixel frame instead of rescaling into the box. Static layouts compute as if every
node were free and then leave locked nodes where they are.

Compound parent nodes are not laid out; Cytoscape sizes them from their children.

## Events

`layoutstart`, `layoutready` and `layoutstop`, in that order, on the layout and on the core. An
asynchronous run (a simulation with an `accelerator`) that fails emits `layouterror`, whose
handler receives the error as its second argument, followed by `layoutstop`. A synchronous
failure (a non-planar graph for `graphty-planar`, a selector that matches nothing) throws from
`run()`.

## Using the graph-format snapshot directly

`toSnapshot(eles, { directed, weight })` returns `{ snapshot, nodes, edges }`: a
[@graphty/graph-format](https://github.com/graphty-org/graphty-monorepo/tree/master/graph-format) snapshot of a collection, where node index `i` is
`nodes[i]` and edge index `e` is `edges[e]`. It is cached per core and rebuilt after an element is
added, removed, moved or has its data changed. `writeData(nodes, values, field)` writes one value
per element into its data. Together they run any @graphty/algorithms function over a Cytoscape
graph:

```js
import { pageRank } from "@graphty/algorithms";
import { toSnapshot, writeData } from "@graphty/cytoscape";

const { snapshot, nodes } = toSnapshot(cy.elements());
writeData(nodes, pageRank(snapshot).scores, "rank");
```
