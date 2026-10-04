# Layouts

Every graphty layout is a normal Cytoscape layout. Register the package once with `cytoscape.use()`, then pass `"graphty-<name>"` to `cy.layout()` or `eles.layout()` and call `run()`.

This example places Zachary's karate club graph with Kamada-Kawai inside an 800 x 600 box and tweens the nodes there over 800 ms:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ container: document.getElementById("cy") });

async function draw() {
    await cy.graphtyDataset("karate");
    cy.layout({
        name: "graphty-kamada-kawai",
        boundingBox: { x1: 0, y1: 0, w: 800, h: 600 },
        animate: "end",
        animationDuration: 800,
    }).run();
}
draw();
```

## Laying out part of the graph

`eles.layout()` reads only the nodes and edges in the collection and leaves every other node where it is. A selector such as `cy.$(".group")` returns nodes only, so add the edges among them, or the layout places the nodes as if they were unconnected:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
cy.add([
    { data: { id: "a" }, classes: "group" },
    { data: { id: "b" }, classes: "group" },
    { data: { id: "c" }, classes: "group" },
    { data: { id: "x" } },
    { data: { source: "a", target: "b" } },
    { data: { source: "b", target: "c" } },
    { data: { source: "c", target: "x" } },
]);

const group = cy.$(".group");
group
    .union(group.edgesWith(group))
    .layout({ name: "graphty-kamada-kawai", boundingBox: { x1: 0, y1: 0, w: 200, h: 200 } })
    .run();
console.log(cy.nodes().map((node) => node.position()));
```

It places `a`, `b` and `c` on a line, the chain their two edges form, and leaves `x` at 0, 0.

## The layouts

There are 16 layouts. The exported array `LAYOUT_NAMES` lists their names without the `graphty-` prefix.

Start with `graphty-forceatlas2` for most networks. Use `graphty-bfs` or `graphty-radial` for trees and hierarchies, `graphty-bipartite` for a graph with two sides, and `graphty-circular` or `graphty-shell` for a small graph where every node must stay visible. Above a few thousand nodes, avoid `graphty-kamada-kawai` ([Limits](./limits#memory-on-large-graphs) says why).

A static layout computes the positions once, on the CPU, and then places the nodes. There are 13:

| Name                   | Places the nodes                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `graphty-random`       | at random points in the box                                                            |
| `graphty-circular`     | evenly on one circle                                                                   |
| `graphty-spiral`       | along a spiral                                                                         |
| `graphty-grid`         | in rows and columns                                                                    |
| `graphty-spectral`     | so that tightly linked groups sit close together                                       |
| `graphty-planar`       | one cycle on a circle, the rest near their neighbors; edges can cross                  |
| `graphty-arf`          | by attractive and repulsive forces (ARF): linked nodes pulled together, the rest apart |
| `graphty-kamada-kawai` | so that drawn distances match shortest-path distances                                  |
| `graphty-shell`        | one ring per entry of `nlist`, an array of selectors or collections, innermost first   |
| `graphty-multipartite` | in one column per layer, read from a node data field (default `"subset"`)              |
| `graphty-bipartite`    | on two lines; `top`, a selector or collection, fills the first                         |
| `graphty-bfs`          | in layers by distance from `root`, a selector or node (connected graphs only)          |
| `graphty-radial`       | on rings by distance from `root`, a selector or node                                   |

Without `nlist`, `graphty-shell` puts every node on one circle. Without `top`, `graphty-bipartite` puts the first, third, fifth and so on of the nodes on the first line. `root` defaults to the first node for `graphty-bfs` and to the node with the most neighbors for `graphty-radial`. For example, `{ name: "graphty-shell", nlist: ["#hub", ".inner", ".outer"] }` draws three rings.

A simulation steps a force model iteration by iteration, and can run on the GPU through WebGPU. There are 3:

| Name                           | Model                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `graphty-forceatlas2`          | ForceAtlas2, as in Gephi; 100 iterations at most by default (`maxIter`)           |
| `graphty-fruchterman-reingold` | Fruchterman-Reingold; 50 iterations by default (`iterations`)                     |
| `graphty-spring-electrical`    | springs on edges and charge between nodes; GPU only, it has no CPU implementation |

Each layout's own options, such as `columns` for the grid or `gravity` for ForceAtlas2, are listed with their defaults in the [layout reference](../reference/layouts). Any other option goes to the matching @graphty/layout function unchanged, except `scale` and `center`, which the package sets from `boundingBox`.

## Animating a simulation

With `animate: true` a simulation draws the graph after every frame, so you watch it settle. `refresh` sets how many iterations run between two frames. The `layoutstop` handler runs once the simulation settles, reaches its iteration cap or is stopped, and `layout.backend` then says whether it ran on the GPU or the CPU:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ container: document.getElementById("cy") });

async function draw() {
    await cy.graphtyGenerate("barabasi-albert", { n: 300, m: 2, seed: 1 });
    const layout = cy.layout({
        name: "graphty-forceatlas2",
        animate: true,
        refresh: 5,
        maxIter: 400,
        seed: 42,
    });
    layout.on("layoutstop", () => {
        const { ran, reason } = layout.backend;
        console.log(`ForceAtlas2 ran on the ${ran}`, reason ?? "");
    });
    layout.run();
}
draw();
```

Call `layout.stop()` to end a running simulation early; it leaves the nodes where the last frame put them and emits `layoutstop`. Run the layout again with `randomize: false` to continue from the current positions ([Animate a force layout](./recipes/animate-force-layout) shows both).

## Synchronous and asynchronous runs

With `animate: false`, a static layout finishes inside `run()`. So does a simulation with `gpu: "off"` (or `accelerator: null`), or in a browser where `navigator.gpu` is undefined.

Every other simulation run is asynchronous. With the default `gpu: "auto"`, in Node or in a browser that has `navigator.gpu`, `run()` returns before any node moves: the package first asks for a WebGPU adapter, then starts the simulation on the GPU or the CPU. Put your follow-up work in a `layoutstop` handler, or create `layout.promiseOn("layoutstop")` before calling `run()` and await it.

With `animate: "end"` or `true`, `layoutstop` fires when the animation ends: about `animationDuration` milliseconds later for a tween. Read positions in `layoutstop`; reads taken during a tween return intermediate values.

This Node script works for both kinds of run. With `gpu: "off"` the run is synchronous, so a promise created after `run()` misses the event and never resolves:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({ headless: true });
await cy.graphtyGenerate("barabasi-albert", { n: 200, m: 2, seed: 1 });

const layout = cy.layout({
    name: "graphty-fruchterman-reingold",
    // a headless core's viewport is 1 x 1 pixel, so give the layout a real box
    boundingBox: { x1: 0, y1: 0, w: 1000, h: 1000 },
    gpu: "off",
    seed: 7,
});
const stopped = layout.promiseOn("layoutstop");
layout.run();
await stopped;

console.log(cy.$id("0").position(), layout.backend.reason);
```

It prints the first node's position and `gpu: "off" was requested`. The [WebGPU guide](./webgpu) covers how the package finds a device and what each `reason` means.

## Common options

Every layout also takes Cytoscape's common layout options ([full list](../reference/layouts#options-every-layout-takes)). `animate` and `boundingBox` work differently here. `animate` depends on the kind of layout:

| Value   | Static layout                  | Simulation                        |
| ------- | ------------------------------ | --------------------------------- |
| `false` | nodes jump to their positions  | runs to the end, then nodes jump  |
| `"end"` | nodes tween to their positions | runs to the end, then nodes tween |
| `true`  | same as `"end"`                | draws every frame while it runs   |

`animationDuration`, `animationEasing`, `animateFilter`, `spacingFactor` and `transform` act on the final jump or tween, so a simulation with `animate: true` ignores them. It applies `fit` and `padding` after every frame. A tween on a headless core throws "animate needs a core that renders" unless the core was created with `styleEnabled: true` ([Troubleshooting](./troubleshooting#animate-needs-a-core-that-renders) has the fix).

`boundingBox` defaults to the viewport, from 0, 0 to `cy.width()`, `cy.height()`. A headless core's viewport is 1 x 1 pixel, so headless code always passes a box. The layout centers its result in the box and scales it so the node farthest from the middle is half the box's shorter side away.

`weight` takes the name of a numeric edge data field, such as `weight: "w"`, or a function of the edge, such as `weight: (edge) => edge.data("w")`; the TypeScript type accepts only the field name. An edge without a numeric weight counts as 1. `graphty-forceatlas2` reads it as attraction: a higher weight pulls two nodes closer. `graphty-kamada-kawai` reads it as edge length: a higher weight pushes them apart. The other layouts ignore it.

## Events

A layout that runs emits `layoutstart`, `layoutready` and `layoutstop`, in that order, and calls your `ready` and `stop` options on the matching events. Each event fires on the layout and then on the core, so `cy.on("layoutstop", handler)` sees every layout that finishes.

When a simulation fails after `run()` has returned, for example `gpu: "require"` with no usable GPU, or `graphty-spring-electrical` (which has no CPU version) with no GPU for any reason, it emits `layouterror` with the error as the handler's second argument, then `layoutstop`. Your `ready` and `stop` options are not called, so do your cleanup in a `layoutstop` handler. Calling `stop()` before a simulation has started also emits `layoutstop` alone. The [WebGPU guide](./webgpu#requiring-or-refusing-the-gpu) has a `layouterror` handler example.

A failure the package can detect before anything starts throws from `run()` instead, and emits no events:

- `graphty-planar` throws `G is not planar.` for K5, K3,3 and a connected graph with more than 3n - 6 distinct edges (n nodes). Other non-planar graphs are drawn with crossing edges.
- `graphty-bfs` on a disconnected graph throws `bfs_layout didn't include all nodes. Graph may be disconnected.`
- `graphty-bfs` or `graphty-radial` with a `root` that matches no node throws `graphty layout: root matches no node of the collection`.

## Locked nodes and compound nodes

Locked nodes never move. A static layout computes as if every node were free and then leaves locked nodes where they stand. A simulation treats them as fixed points while it computes, so the rest of the graph arranges itself around them. It then scales the free nodes about the locked nodes' center, so with one node locked near a corner of `boundingBox`, the free nodes gather in that corner.

Compound parent nodes are not laid out. The layout places their children, and Cytoscape positions each parent around them. On a headless core that happens only when the core was created with `styleEnabled: true`; without it, `parent.position()` stays where it was.

## Try it

- [Static layouts demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-layouts--static-layouts): switch between the 13 static layouts on one graph.
- [Force simulations demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-layouts--force-simulations): run, stop and restart the simulations and see which backend ran.

## Next

- [Layout reference](../reference/layouts): every layout's own options and defaults.
- [Animate a force layout](./recipes/animate-force-layout): watch ForceAtlas2 settle, stop it and continue.
- [WebGPU](./webgpu): what runs on the GPU and how to require or refuse it.
