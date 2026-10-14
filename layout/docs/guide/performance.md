# Performance

Layouts run over graph snapshots: compact typed arrays with no object per node or edge. Results are typed arrays too,
with `dim` numbers per node, so a layout of a million nodes allocates a few megabytes, not a million objects. What
decides the running time is the layout you choose and how many iterations you give it.

## Cost by Layout

`V` is the number of nodes, `E` the number of edges, and `k` the number of iterations.

| Layout                                          | Time                                                  | Extra memory |
| ----------------------------------------------- | ----------------------------------------------------- | ------------ |
| `circular`, `random`, `grid`, `spiral`, `shell` | O(V)                                                  | O(V)         |
| `bfs`, `radial`, `bipartite`, `multipartite`    | O(V + E)                                              | O(V)         |
| `planar`                                        | O(V + E)                                              | O(V + E)     |
| `spectral`                                      | O(k x (V + E)) per axis                               | O(V)         |
| `forceAtlas2`, `fruchtermanReingold`, `arf`     | O(k x V^2)                                            | O(V)         |
| `kamadaKawai`                                   | O(V^3) for the distances, then O(V^2) per solver step | O(V^2)       |

## Measured Times

One run of each layout on one core of a desktop CPU (Intel i9-14900), with default options, gives a sense of scale.
Your times will differ; the ratios between rows will not change much.

| Layout                                                       | Graph                         | Time        |
| ------------------------------------------------------------ | ----------------------------- | ----------- |
| `circular`, `random`, `grid`, `spiral`, `shell`, `bipartite` | 200,000 nodes                 | under 20 ms |
| `bfs`                                                        | 200,000 nodes                 | 25 ms       |
| `radial`                                                     | 200,000 nodes                 | 150 ms      |
| `planar`                                                     | 90,000-node grid              | 2 s         |
| `planar`                                                     | 200,000-node tree             | 5 s         |
| `spectral`                                                   | 2,000-node random graph       | 70 ms       |
| `spectral`                                                   | 2,500-node grid               | 0.5 s       |
| `spectral`                                                   | 100,000-node scale-free graph | 100 s       |
| `fruchtermanReingold` (50 iterations)                        | 1,000 nodes                   | 0.3 s       |
| `fruchtermanReingold` (50 iterations)                        | 3,000 nodes                   | 3 s         |
| `forceAtlas2` (100 iterations)                               | 1,000 nodes                   | 0.6 s       |
| `forceAtlas2` (100 iterations)                               | 3,000 nodes                   | 3.7 s       |
| `forceAtlas2` (100 iterations)                               | 10,000 nodes                  | 37 s        |
| `kamadaKawai`                                                | 100 nodes                     | 1.2 s       |
| `kamadaKawai`                                                | 400 nodes                     | 16 s        |

In short: the geometric and structural layouts are instant at any size you can draw. The force-directed layouts compare
every pair of nodes on every iteration, so their cost grows with the square of the node count; on the CPU they suit
graphs of up to a few thousand nodes. `spectral` is fast on small and medium graphs and slows down sharply on very
large ones and on long, thin graphs such as grids and paths. `kamadaKawai` is for small graphs only: beyond a few
hundred nodes, use `forceAtlas2` or `fruchtermanReingold`. It also keeps a matrix of every pair's distance, about 24
bytes per pair: 240 MB at 3,000 nodes.

## Start From a Cheap Layout

A force-directed layout starting from random positions spends its first iterations untangling them. Starting from a
cheap layout through `pos` gets to a good drawing in fewer iterations:

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { erdosRenyiGraph } from "@graphty/graph-samples/generators";
import { fruchtermanReingold, spectral } from "@graphty/layout";

const graph = fromEdgeArrays(erdosRenyiGraph({ n: 2000, p: 0.002, seed: 3 }));
const start = spectral(graph, { seed: 3 });
const refined = fruchtermanReingold(graph, { pos: start.positions, iterations: 20 });
console.log(refined.n); // 2000
```

## Animate Instead of Waiting

A [steppable simulation](./simulations.md) shows a drawing after the first frame and improves it while the reader
watches, instead of blocking until the last iteration. Stop as soon as `settled` is true, or after a time budget of
your own: the position array always holds the latest drawing.

<!-- doc-check -->

```typescript
import { fromEdgeArrays } from "@graphty/graph-format";
import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";
import { createSimulation } from "@graphty/layout";

const graph = fromEdgeArrays(barabasiAlbertGraph({ n: 500, m: 2, seed: 1 }));
const positions = new Float32Array(3 * graph.nodeCount).fill(NaN);
const sim = createSimulation("forceatlas2", { maxIter: 1000, seed: 1 });
sim.load(graph, positions);

const budget = performance.now() + 50; // at most 50 ms of layout
while (!sim.settled && performance.now() < budget) {
    sim.step(5);
}
sim.dispose();
console.log(Number.isFinite(positions[0])); // true
```

## Kamada-Kawai on Large Graphs

Pass `maxNodes` so a graph too big for the distance matrix is refused before the allocation, with a `RangeError` whose
`code` is `E_TOO_LARGE`, and choose another layout for it. See
[Force-Directed and Spectral](./force-directed.md#kamada-kawai).

## Web Workers

A snapshot and a `LayoutResult` are typed arrays, so both move to and from a Web Worker without copying. Run a long
layout in a worker to keep the page responsive: send the snapshot in, and post `result.positions` back with its buffer
in the transfer list.

## GPU Acceleration

For force-directed layouts of tens of thousands of nodes and more, the CPU is the bottleneck.
[`@graphty/webgpu-graph-algorithms`](https://www.npmjs.com/package/@graphty/webgpu-graph-algorithms) runs ForceAtlas2,
Fruchterman-Reingold and a spring-electrical layout on the GPU with WebGPU, through the same `createSimulation` call
(see [GPU Acceleration](./simulations.md#gpu-acceleration)). On small graphs the CPU is usually faster, because a GPU
step has a fixed cost of its own.
