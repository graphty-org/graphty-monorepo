# @graphty/cytoscape-extensions

Graph layouts, graph algorithms, graph generators, sample datasets and file import and export for
[Cytoscape.js](https://js.cytoscape.org/) 3.x, with WebGPU acceleration where the browser (or Node) has it:

- **Layouts**, registered as `graphty-<name>`: the ForceAtlas2, Fruchterman-Reingold and spring-electrical
  force simulations, and every static layout of @graphty/layout (circular, shell, spectral, Kamada-Kawai,
  radial, ...).
- **Algorithms** as methods on every collection and on the core, named `graphty<Name>`: every algorithm of
  @graphty/algorithms (PageRank, betweenness, Louvain, Leiden, Dijkstra, max flow, link prediction, ...).
  The ones that have a GPU implementation also have an `...Async` twin that uses it.
- **Graphs in and out**: seeded graph generators, sample datasets, and import and export of GraphML, GEXF,
  GML, DOT, Pajek, CSV, JSON, Neo4j and CX2 files.

Not published yet (the package is private while its API settles).

Try every layout and algorithm in the [demo](https://graphty.app/storybook/cytoscape-extensions/). This
page is also published at [graphty.app/docs/cytoscape-extensions](https://graphty.app/docs/cytoscape-extensions/),
next to the generated API documentation.

## Install

```sh
npm install cytoscape @graphty/cytoscape-extensions @graphty/algorithms @graphty/layout @graphty/graph-format
```

That is all, WebGPU included: there is no GPU package to import or set up (see [WebGPU](#webgpu)).

## Quick start

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({
    container: document.getElementById("cy"),
    style: [{ selector: "node", style: { width: "mapData(rank, 0, 0.04, 10, 60)" } }],
});
await cy.graphtyGenerate("barabasi-albert", { n: 300, m: 2, seed: 1 }); // or cy.add() your own elements
cy.elements().graphtyPageRank({ field: "rank" }); // writes data("rank"), which the style maps to a size
cy.layout({ name: "graphty-forceatlas2", animate: true }).run();
```

Every layout and algorithm, with its options, their types and their defaults, is in the
[Reference](#reference).

## Loading

### ES modules

The package is ES modules only, as is every graphty package it loads. A bundler (Vite, webpack,
esbuild, Rollup) or Node's `import` loads it as in the example above, and the WebGPU code, the
generators, the datasets and the file formats each land in a chunk of their own that is fetched
only when first used.

There is no CommonJS build: it would still have to load the graphty packages as ES modules. On
Node 20.19 or later (22.12 or later on the 22 line), CommonJS code loads the package with a plain
`require`:

```js
const cytoscape = require("cytoscape");
cytoscape.use(require("@graphty/cytoscape-extensions").default);
```

On an older Node, use `await import("@graphty/cytoscape-extensions")`.

### Script tag

For a page with no build step, `dist/cytoscape-extensions.bundle.js` is one classic script holding
the extension and everything it needs, including WebGPU detection: on a browser with WebGPU the
asynchronous methods and the simulations use the GPU exactly as they do in a bundled application.
Loaded after Cytoscape, it registers itself onto the global `cytoscape`, so there is no `use()`
call. It also sets the global `graphtyCytoscape`, for a page that loads Cytoscape afterwards and
calls `cytoscape.use(graphtyCytoscape)` itself.

```html
<script src="https://cdn.jsdelivr.net/npm/cytoscape@3/dist/cytoscape.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions/dist/cytoscape-extensions.bundle.js"></script>
<script>
    const cy = cytoscape({
        container: document.getElementById("cy"),
        elements: [
            /* ... */
        ],
    });
    cy.layout({ name: "graphty-forceatlas2" }).run();
</script>
```

Because nothing in it can be loaded later, it carries every generator, every bundled dataset and
every file format: about 2.3 MB, 0.7 MB compressed. A bundled application pays only for what it
calls.

### TypeScript

The typings come with the package. Importing it adds every `graphty...` method to Cytoscape's
`Collection` and `Core` types by module augmentation, and `GraphtyLayoutOptions` types the options
of the `graphty-*` layouts:

```ts
import cytoscape from "cytoscape";
import graphtyCytoscape, { type GraphtyLayoutOptions } from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);
const cy = cytoscape({ headless: true });
const options: GraphtyLayoutOptions = { name: "graphty-forceatlas2", maxIter: 200, gpu: "off" };
cy.layout(options).run();
const r = await cy.elements().graphtyPageRankAsync(); // r.backend.ran is "gpu" or "cpu"
```

CI compiles a consumer like this one with `strict` on and `skipLibCheck` off, against both
Cytoscape versions above. Cytoscape's own typings reference `HTMLElement` and `MouseEvent`, so
include the `DOM` lib even in a Node project. Use `"moduleResolution": "bundler"`: under `node16`
or `nodenext`, @graphty/layout's typings do not yet resolve (its declaration files import
relative paths without a file extension), which with `skipLibCheck` off is a compile error.

### Supported Cytoscape versions

Cytoscape.js 3.31.0 or later is required: 3.31.0 is the first release that ships its own TypeScript
typings, which this package's typings extend. CI runs the whole test suite against 3.31.0 and against
the newest 3.x on npm.

## Layouts

```js
cy.layout({ name: "graphty-kamada-kawai", boundingBox: { x1: 0, y1: 0, w: 800, h: 600 } }).run();
cy.layout({ name: "graphty-forceatlas2", maxIter: 300, weight: "w", animate: true }).run();
```

Each layout takes the options every layout takes (the box, `fit`, `animate`, `seed`, `weight`, `gpu`, ...)
and options of its own; the [Reference](#reference) lists both. An option not listed there is passed to the
@graphty/layout function of the same name unchanged.

Locked nodes never move. The simulations also treat them as fixed while computing, so the rest of
the graph arranges itself around them; with a locked node present the simulation keeps the
locked node's pixel frame instead of rescaling into the box. Static layouts compute as if every
node were free and then leave locked nodes where they are.

Compound parent nodes are not laid out; Cytoscape sizes them from their children.

## Events

`layoutstart`, `layoutready` and `layoutstop`, in that order, on the layout and on the core. An
asynchronous run (a simulation on a GPU) that fails emits `layouterror`, whose
handler receives the error as its second argument, followed by `layoutstop`. A synchronous
failure (a non-planar graph for `graphty-planar`, a selector that matches nothing) throws from
`run()`.

## Algorithms

`cytoscape.use(graphtyCytoscape)` adds 63 methods, each named `graphty` plus the @graphty/algorithms
function name (`graphtyPageRank`, `graphtyLouvain`, ...), to every collection and to the core. The
prefix keeps them apart from Cytoscape's built-ins of the same name. `ALGORITHM_NAMES` lists them,
and importing the package adds their types to Cytoscape's `Collection` and `Core`.

They follow Cytoscape's built-in algorithms:

- **Scope** is the calling collection: its nodes, and its edges whose two ends are in it.
  `cy.graphtyX(o)` is `cy.elements().graphtyX(o)`.
- **Synchronous**, one options object, the result returned.
- **`directed`** (default `false`) reads edges as source to target. Algorithms defined only for
  directed graphs (`graphtyTopologicalSort`, `graphtyStronglyConnectedComponents`,
  `graphtyCondensation`, `graphtyDeltaPageRank`) default to `true`.
- **`weight`** is an edge data field or a function of the edge (`edge => number`), as the
  built-ins take it; a missing or non-numeric value counts as 1. Without it every edge weighs 1.
  An algorithm that reads no weights throws when given one, rather than ignoring it.
- **Nodes** are named by a selector or a collection: `root` (where a walk or path starts), `goal`
  (where it should end), `source` and `sink` (a flow), `source` and `target` (a node pair),
  `left`, `right`, `candidates`, `sources`. Sets of nodes (`personalization`) take a selection or
  a function of the node; clusters (`clusters`, `seeds`) take a list of selections, a partition
  result, or a node data field.
- **Results are keyed by element**: accessors that take a node (or edge) or a selector, and
  collections. Nothing comes back as an index array.
- **`field`** writes each element's value (what `score` or `cluster` returns) into
  `data(field)`, in one batch, so a stylesheet can map it: `width: "mapData(rank, 0, 1, 10, 60)"`.
- **Other options** go to the @graphty/algorithms function unchanged (`dampingFactor`, `resolution`,
  `maxIterations`, `randomSeed`, ...), over this package's [Defaults](#defaults).
- **Errors throw**: a required node option missing or matching nothing, a weight given to an
  algorithm that ignores weights, and the algorithm's own errors (an undirected-only algorithm on
  `directed: true`, a negative cycle).

### Result shapes

| Shape             | Methods                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | What it holds                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scores            | `graphtyPageRank`, `graphtyPersonalizedPageRank`, `graphtyDeltaPageRank` (`rank`), `graphtyDegreeCentrality` (`degree`), `graphtyEigenvectorCentrality`, `graphtyKatzCentrality`, `graphtyHits` (`hub`, `authority`), `graphtyClosenessCentrality` (`closeness`), `graphtyBetweennessCentrality` (`betweenness`, `betweennessNormalized`), `graphtyEdgeBetweennessCentrality` (per edge), `graphtyKCoreDecomposition` (`core(k)`), `graphtyTriangleCount` (`coefficient`)                                       | `score(ele)`, the Cytoscape-named accessor in brackets, and the run's `iterations` / `converged` where it has them                                                                       |
| Partition         | `graphtyConnectedComponents`, `graphtyWeaklyConnectedComponents`, `graphtyStronglyConnectedComponents`, `graphtyCondensation`, `graphtyLouvain`, `graphtyLeiden`, `graphtyLabelPropagation`, `graphtyLabelPropagationSynchronous`, `graphtyLabelPropagationSemiSupervised`, `graphtyGirvanNewman`, `graphtyMarkovClustering`, `graphtySpectralClustering`, `graphtyTeraHAC`, `graphtyGrsbm`, `graphtySyncClustering`                                                                                            | An array of node collections, one per cluster, as Cytoscape's `components()` and `markovClustering()` return, plus `cluster(node)` and the run's `modularity`, `iterations`, `converged` |
| Paths from a root | `graphtyDijkstra`, `graphtyBellmanFord`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `distanceTo(node)`, `pathTo(node)` (node, edge, node, ...), as Cytoscape's `dijkstra`                                                                                                    |
| One path          | `graphtyAStar`, `graphtyBidirectionalDijkstra`                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `{ found, distance, path }`, as Cytoscape's `aStar`                                                                                                                                      |
| All pairs         | `graphtyAllPairsShortestPath`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `distance(from, to)`, `path(from, to)`, as Cytoscape's `floydWarshall`                                                                                                                   |
| Walk              | `graphtyBreadthFirstSearch`, `graphtyDepthFirstSearch`, `graphtyDirectionOptimizedBfs`                                                                                                                                                                                                                                                                                                                                                                                                                          | `{ path, found }` as Cytoscape's `bfs` / `dfs`, plus `depth(node)` and `parent(node)`                                                                                                    |
| Tree              | `graphtyKruskalMST`, `graphtyPrimMST`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | The tree's nodes and edges as one collection, as Cytoscape's `kruskal`, with `totalWeight`                                                                                               |
| Cut               | `graphtyMaxFlow` (`value` is the maximum flow; `flow(edge)`), `graphtyMinSTCut`, `graphtyStoerWagner`, `graphtyKargerMinCut`                                                                                                                                                                                                                                                                                                                                                                                    | `{ value, cut, partitionFirst, partitionSecond }`, as Cytoscape's `kargerStein`                                                                                                          |
| Other             | `graphtyHasCycle` (boolean), `graphtyTopologicalSort` (node collection, or null when cyclic), `graphtyIsBipartite`, `graphtyIsGraphIsomorphic` / `graphtyFindAllIsomorphisms` (`other`: the collection to compare with; `mapping(node)`), `graphtyModularity` (number), `graphtyHierarchicalClustering` (`cut(height)`), `graphtyMaximumBipartiteMatching` / `graphtyGreedyBipartiteMatching` (`mate(node)`, `size`), `graphtyDegrees` (`indegree`, `outdegree`), `graphtyNodeClosenessCentrality` (number)     |                                                                                                                                                                                          |
| Link prediction   | `graphtyCommonNeighborsScore`, `graphtyAdamicAdarScore` (`source`, `target`: a number), `graphtyCommonNeighborsPrediction`, `graphtyAdamicAdarPrediction`, `graphtyTopCandidatesForNode`, `graphtyTopAdamicAdarCandidatesForNode` (`[{ source, target, score }]`), `graphtyCommonNeighborsForPairs`, `graphtyAdamicAdarForPairs` (`pairs: [[a, b], ...]`: numbers), `graphtyEvaluateCommonNeighbors`, `graphtyEvaluateAdamicAdar`, `graphtyCompareAdamicAdarWithCommonNeighbors` (`edges`, `nonEdges`: metrics) |                                                                                                                                                                                          |

### Where the numbers differ from Cytoscape's built-ins

- **PageRank:** Cytoscape's `pageRank` adds the teleport `(1 - d) / n` without scaling the links
  by `d`, so its `dampingFactor: d` is the standard damping `1 / (2 - d)`; `graphtyPageRank` uses
  the standard one (default 0.85, Cytoscape's default is 0.8). Pass `directed: true` to rank along
  edge direction as Cytoscape does; the default reads every edge both ways.
- **Betweenness:** `betweenness(node)` and `betweennessNormalized(node)` equal Cytoscape's
  (ordered pairs; normalized by the maximum). `score(node)` is the NetworkX convention, half of
  that on an undirected graph, and honours `normalized`.
- **Closeness** is `1 / sum(distance)`; `normalized: true` scales by the fraction of other nodes
  reached, not NetworkX's `(n - 1) / sum`. Cytoscape's `closenessCentralityNormalized` divides by
  the maximum.
- **Degree** is the plain degree unless `normalized: true` (divide by `n - 1`).
- **Depth-first order** tries neighbours in edge order; Cytoscape's tries the last one first, so
  the two visit orders differ when a node has more than one unvisited neighbour.
- **Link prediction** on an undirected graph lists each candidate pair twice, once per
  orientation (`topK` counts both).

Not exposed: `bipartiteFlowNetwork` (it builds a graph from id lists, not from a collection),
`walkPredArcs` / `walkPredEdges` (helpers over an index result; `pathTo` covers them), and the
`update()` of the incremental `DeltaPageRank` engines (a changed Cytoscape graph is a new
snapshot, so only the one-shot run is offered, as `graphtyDeltaPageRank`, with `priority: true`
for `PriorityDeltaPageRank`).

## WebGPU

WebGPU needs no setup. `@graphty/webgpu-graph-algorithms` is a dependency of this package, so
installing this package installs it, and there is nothing more to import:

```ts
const r = await cy.elements().graphtyPageRankAsync();
r.rank("#a");
r.backend; // { ran: "gpu", reason: null, device: "nvidia nvidia-geforce-rtx-4070-super" }
cy.layout({ name: "graphty-forceatlas2" }).run(); // on the GPU when there is one; listen for layoutstop
```

The GPU code is loaded on demand. The first `...Async` call or simulation in a runtime that has
WebGPU loads it with a dynamic import, so a bundler (Vite, webpack, esbuild, Rollup) puts it in a
chunk of its own, and a page that never makes such a call never downloads it. In a browser without
WebGPU it is never loaded at all. Each core then acquires one device the first time it needs one,
reuses it for every later call, acquires a new one after the device is lost, and releases it on
`cy.destroy()`.

**Node.** Install the optional `webgpu` package (Dawn) next to this one to use the GPU under Node:
`npm install webgpu`. Without it every run is on the CPU, and `backend.reason` says so.

**A warning when it matters.** When a graph of `GPU_SIZE_FLOOR` (5,000) nodes or more runs on the
CPU for a reason you could fix (Node without the `webgpu` package, a software adapter refused, the
GPU chunk failing to load), the console gets one warning naming the reason and the fix. Smaller
graphs never warn, and `gpu: "off"` silences it.

**Settings.** `configureWebGpu(options)`, exported from the main entry, applies to every core (each
one disposes its device and decides again on its next call):

| Option           | Default | Meaning                                                                                                                        |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `acceptSoftware` | `false` | Use a software adapter (SwiftShader, llvmpipe, WARP). Refused by default, as it is usually slower than the CPU implementation. |
| `adapter`        | none    | Node only: a substring of the Dawn adapter name to pick, such as `"llvmpipe"` or `"4070"`.                                     |

**Which methods.** Seventeen algorithms have an asynchronous twin, `graphty<Name>Async`
(`ASYNC_ALGORITHM_NAMES` lists them): breadth-first search, Dijkstra, Bellman-Ford, all-pairs
shortest paths, PageRank, personalized PageRank, eigenvector, Katz, HITS, closeness, betweenness
and edge betweenness centrality, connected and weakly connected components, triangle count, and
both label propagations. They take the same options and return the same result as the plain
method, plus `backend`. The plain methods stay synchronous and always run on the CPU. Of the
layouts, the three simulations use the GPU; the static layouts have no GPU implementation.

**Which ran, and why.** `backend` is `{ ran: "gpu" | "cpu", reason, device }` on an `...Async`
result, and on the layout object (`layout.backend`, typed by the exported `GraphtyLayouts`) once a simulation has started. `reason` says why
the CPU ran:

- `gpu: "off"` was passed.
- No usable device: no WebGPU in this runtime (under Node: the `webgpu` package is not installed),
  no adapter, a software-only adapter (refused by default; `configureWebGpu({ acceptSoftware: true })`
  accepts it), or a device that fails the GPU package's correctness check.
- The options or the graph need the CPU implementation. @graphty/algorithms' dispatcher decides this
  per call: for example PageRank with `initialRanks`, personalized PageRank on a graph with a node
  that has no out-edges, eigenvector centrality on a directed or bipartite graph, all-pairs shortest
  paths with `paths: true` (the default; pass `paths: false` to let the GPU answer, and `path()`
  then throws), breadth-first search with a `goal`.

**Modes.** Every `...Async` method and every simulation takes `gpu`: `"auto"` (default) as above;
`"off"` for the CPU; `"require"` to throw (or emit `layouterror`) instead of running on the CPU
when no device is available. A plain method rejects `"require"`.

**Errors are never hidden.** The GPU-or-CPU decision is made before any work starts. A failure
after that, such as a device lost in the middle of a run, rejects the call (or emits
`layouterror`); it is never finished quietly on the CPU. The next call acquires a new device.

**Precision.** GPU results are single precision. Against the CPU they agree to the tolerances the
GPU package documents: about 1e-5 relative for PageRank (after the same number of iterations),
paths, closeness and weighted all-pairs distances; 1e-4 for betweenness; exactly for components,
breadth-first depths, triangle counts and unweighted distances. Label propagation breaks ties
differently on the two, so partitions can differ; the GPU result has no `iterations` or
`converged`. The power-iteration methods stop at their own convergence on each side, and the two
packages read `tolerance` differently for PageRank (the GPU stops at an L1 change below
`tolerance` times the node count, the CPU below `tolerance`), so at the same options the GPU
usually stops sooner.

### Defaults

The package passes its own defaults to @graphty/algorithms and @graphty/layout explicitly on every call,
so a later change of a library default does not change your results. They are the values in code font in
the Default column of the [Reference](#reference): for example PageRank's `dampingFactor` of `0.85` and
ForceAtlas2's `maxIter` of `100`. Every edge weighs 1 unless you pass `weight`. Pass an option to override
its default. The value of `tolerance` is fixed here, but the CPU and the GPU do not yet read it the same
way (see "Precision" under [WebGPU](#webgpu)).

## Graphs in and out

Four core methods put graphs into a Cytoscape instance and take them out. Each returns a promise:
the generators, the datasets and the file parsers are loaded on the first call, so a page that only
uses the layouts never downloads them.

```js
await cy.graphtyGenerate("barabasi-albert", { n: 500, m: 2, seed: 1 }); // a seeded random graph
await cy.graphtyDataset("karate"); // Zachary's karate club
const { report } = await cy.graphtyImport(fileText, "graphml"); // or "auto" to detect the format
const gexf = await cy.graphtyExport("gexf"); // the whole graph; a collection has graphtyExport too
cy.layout({ name: "graphty-forceatlas2" }).run(); // generated and imported graphs start at the origin
```

| Method                                       | Returns                                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cy.graphtyGenerate(name, options)`          | `{ elements, directed }`                 | `name` is a generator of [@graphty/graph-samples](https://github.com/graphty-org/graphty-monorepo/tree/master/graph-samples) in kebab case without "Graph" (`barabasiAlbertGraph` is `"barabasi-albert"`; the list is `GENERATORS` in `@graphty/cytoscape-extensions/samples`), and `options` that function's options, typed per name. The random ones take `seed` (default 0) and give the same graph on every platform. `"named"` takes `{ name: "frucht" }` and the other named graphs |
| `cy.graphtyDataset(name, options?)`          | `{ elements, directed }`                 | A sample dataset (`"karate"`, `"les-miserables"`, `"football"`, `"openflights"`, ...). The twelve small ones ship with graph-samples; `"road-ny"`, `"ogbn-arxiv"` and `"com-dblp"` are downloaded from graphty.app, and `options` (`baseUrl`, `fetch`, `signal`) controls that download                                                                                                                                                                                                   |
| `cy.graphtyImport(input, format?, options?)` | `{ elements, directed, format, report }` | `input` is text, bytes or a stream; `format` is `"graphml"`, `"gexf"`, `"gml"`, `"dot"`, `"pajek"`, `"csv"`, `"json"`, `"neo4j"`, `"cx2"`, `"cx"`, `"obo"` or `"auto"` (the default: detected from the content, and from `options.filename` when given). `options` are [@graphty/graph-io](https://github.com/graphty-org/graphty-monorepo/tree/master/graph-io)'s import options. A file that cannot be read rejects with graph-io's `ImportError` and adds nothing                      |
| `eles.graphtyExport(format, options?)`       | the file's text                          | `cy.graphtyExport` writes the whole graph; on a collection, its nodes and those of its edges whose two ends are among them. Every format of graphtyImport except `"cx"` and `"obo"`. `options.directed` (default false) writes a directed graph; the rest are graph-io's export options for the format                                                                                                                                                                                    |

`elements` is the collection that was added, and `directed` says whether the graph is directed: pass
it on as the algorithms' `directed` option, since a Cytoscape graph has no direction of its own.

The three methods add a graph next to what the core already holds, and refuse (adding nothing) when
one of the new node ids is already in use: Cytoscape would otherwise skip that node and attach the
new edges to the old one, merging two graphs into one that is neither. Generated graphs number their
nodes "0", "1", ..., and many files number theirs `n0`, `n1`, ..., so to replace a graph remove the
old one first (`cy.elements().remove()`) or use an empty core.

How the data maps:

- **Node ids** are the file's or dataset's ids as strings, and `"0"`, `"1"`, ... for a generated
  graph. Adding a node whose id is already in the core throws, as `cy.add` does: clear the core
  (`cy.elements().remove()`) or use a fresh one before loading a second graph.
- **Attributes** become data fields of the same name: a generator's ground truth (`community`,
  `side`, `layer`), a dataset's columns (`club`, `label`, `latitude`, ...), a file's attributes. Edge
  weights become `data.weight`, also when only some edges have one. A plain attribute named `id`,
  `source`, `target` or `parent` is not copied, because Cytoscape gives those fields a meaning of its
  own.
- **Edge ids** in the file (GraphML, GEXF, GML, DOT, CSV, Cytoscape JSON) become the edges' ids. An
  edge whose id is a node id, repeats an earlier edge's, or is already in the core gets an id from
  Cytoscape instead, so importing never fails on an edge id.
- **Compound nodes**: a node's parent (Cytoscape JSON `parent`, GraphML nested graphs, DOT
  clusters) becomes `data.parent`, so the compound comes back as a compound.
- **Positions** in a file (GEXF, GML, DOT, Pajek, CX2, Cytoscape JSON) become node positions; a z
  coordinate is dropped. A node the file gives no position stays where Cytoscape puts it (the
  origin).
- **Parallel and reversed edges** stay separate edges, each with its own source and target, also
  in an undirected export.

On export:

- **What is written**: every data field of every node and edge, each node's position, each edge's
  id, and each node's parent when the parent is exported too (a node whose parent is left out is
  written as a top-level node). A numeric edge field `weight` becomes the edge weight. A string
  field `label` goes to the format's own label (GEXF, Pajek and DOT have one), so it reads back as
  `label`.
- **Hidden elements** are written like any other. Export `cy.elements(":visible")` to leave them
  out.
- **What a format cannot hold** (positions in GraphML, lists and objects in DOT and Pajek, booleans
  in GML, ...) is left out or converted, and nothing says so unless you ask: pass
  `onLoss: (notes) => console.warn(notes)` and it is called with one note per column and kind of
  loss before the file is written. Lists and objects survive Cytoscape JSON and GML; GraphML, GEXF,
  Neo4j and CX2 write them as JSON text, which reads back as a string.
- **Integer-id formats**: GML and CX2 take only integer ids. Export numbers the nodes and keeps
  each original id in an attribute that graphtyImport restores, so a round trip keeps the ids. Pass
  `sanitizeIds: "error"` to refuse instead.
- **JSON** is written as Cytoscape JSON, the shape `cy.json()` and `cy.add()` use, which keeps edge
  ids, parents and positions. It has no direction flag, so it reads back as directed. Pass
  `dialect: "node-link"` for NetworkX's node-link JSON, which keeps the direction but not parents
  or edge ids, and whose positions read back as a `position` data field.

Every generator, dataset and format is listed in the [Reference](#reference). Each dataset is the work of
its authors and is not under this package's MIT license: the Reference gives each one's license and
source, and graph-samples' `DATASETS` (fields `citation`, `source`, `license`) and its
[NOTICE file](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-samples/NOTICE) hold the
full citations. Cite the source when you publish results from one, and check its license before you
redistribute it.

## Using the graph-format snapshot directly

`toSnapshot(eles, { directed, weight })` returns `{ snapshot, nodes, edges }`: a
[@graphty/graph-format](https://github.com/graphty-org/graphty-monorepo/tree/master/graph-format) snapshot of a collection, where node index `i` is
`nodes[i]` and edge index `e` is `edges[e]`. It is cached per core and rebuilt after an element is
added, removed, moved or has its data changed. `writeData(nodes, values, field)` writes one value
per element into its data. Together they run any @graphty/algorithms function over a Cytoscape
graph:

```js
import { pageRank } from "@graphty/algorithms";
import { toSnapshot, writeData } from "@graphty/cytoscape-extensions";

const { snapshot, nodes } = toSnapshot(cy.elements());
writeData(nodes, pageRank(snapshot).scores, "rank");
```

## Limits

- **Memory.** `graphty-kamada-kawai` and `graphtyAllPairsShortestPath` hold a distance for every pair of
  nodes, so their memory grows with the square of the node count: about 800 MB at 10,000 nodes.
- **Graphs some layouts refuse.** `graphty-planar` throws on a graph that is not planar, and `graphty-bfs`
  on a disconnected one. `graphty-spring-electrical` has no CPU implementation: without a GPU it emits
  `layouterror`.
- **Positions are 2D.** `dim: 3` runs a layout in 3D and keeps x and y.
- **Compound nodes** are not laid out; Cytoscape sizes each parent from its children.
- **One graph at a time.** Loading a graph whose node ids are already in the core throws, as `cy.add` does.
- **GPU results are single precision.** They can differ from the CPU's in the last digits, and label
  propagation can break ties differently (see "Precision" under [WebGPU](#webgpu)).
- **The script-tag file is large.** It carries every generator, dataset and format, so it is several times
  what a bundled application loads (see [Script tag](#script-tag)).

## Naming

| Question                       | Decision                                                                                                                                                                                                    | Why                                                                                                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prefix of methods and layouts  | `graphty` on methods (`graphtyPageRank`), `graphty-` on layouts (`graphty-forceatlas2`)                                                                                                                     | Cytoscape silently replaces a layout registered twice and refuses a method whose name exists; the prefix avoids both, and keeps `graphtyPageRank` apart from the built-in `pageRank`                                                               |
| Method name after the prefix   | The @graphty/algorithms function name, with a capital: `graphtyKruskalMST`, `graphtyTeraHAC`                                                                                                                | One name to look up in the algorithms documentation. Two exceptions: `graphtyAStar` (Cytoscape's spelling of `astar`) and `graphtyTopCandidatesForNode` / `graphtyTopAdamicAdarCandidatesForNode` (without the `get` of `getTopCandidatesForNode`) |
| Layout name after the prefix   | The @graphty/layout name in kebab case: `graphty-kamada-kawai`, `graphty-fruchterman-reingold`                                                                                                              | Cytoscape's own layout names are lower case (`breadthfirst`, `cose`); kebab case keeps the words readable                                                                                                                                          |
| GPU methods                    | A second method with the suffix `Async` (`graphtyPageRankAsync`), returning a promise of the same result plus `backend`                                                                                     | Cytoscape's algorithms are synchronous and return their result. A GPU run cannot be, and an option that changes the return type to a promise would break every caller that reads the result directly                                               |
| Node options                   | `root` where a walk, path or layout starts; `goal` where a walk or path should end; `source` / `sink` for a flow; `source` / `target` for a node pair                                                       | `root` and `goal` are Cytoscape's names in `bfs`, `dijkstra` and `aStar`; `source` / `target` are Cytoscape's names for the two ends of an edge                                                                                                    |
| Graph options                  | `directed`, `weight` (a data field or `edge => number`)                                                                                                                                                     | As Cytoscape's built-in algorithms take them                                                                                                                                                                                                       |
| Writing results into the graph | `field`: the data field each element's value is written to                                                                                                                                                  | Cytoscape has no equivalent; a stylesheet maps data fields, so this is the one step between a result and a style                                                                                                                                   |
| Result accessors               | Cytoscape's accessor names where Cytoscape has the algorithm (`rank`, `degree`, `closeness`, `betweenness`, `betweennessNormalized`, `distanceTo`, `pathTo`), plus `score(ele)` on every per-element result | Code written for the built-in can switch to the `graphty` method without changing how it reads the result; `score` reads any of them the same way                                                                                                  |
| Result fields                  | `found`, `distance`, `path` (one path); `path`, `found` (a walk); `value`, `cut`, `partitionFirst`, `partitionSecond` (a cut); `hasNegativeWeightCycle` (Bellman-Ford and all pairs)                        | Cytoscape's names in `aStar`, `bfs`, `kargerStein` and `bellmanFord`; one name for each value, even where Cytoscape has no such algorithm                                                                                                          |
| Clusters                       | An array of node collections, plus `cluster(node)`                                                                                                                                                          | What Cytoscape's `components()` and `markovClustering()` return                                                                                                                                                                                    |
| Algorithm-specific options     | The @graphty/algorithms or @graphty/layout name, passed through unchanged (`dampingFactor`, `maxIterations`, `maxIter`, `iterations`)                                                                       | Renaming them here would make two names for each option; where the libraries disagree (`maxIter` against `iterations`), they are fixed there, not here                                                                                             |
| GPU control                    | `gpu: "auto" \| "off" \| "require"` on every call, `configureWebGpu()` for settings that apply to every core                                                                                                | One option, the same on algorithms and layouts; the result's `backend` (`ran`, `reason`) says what happened                                                                                                                                        |

<!-- reference:begin (generated by scripts/reference.ts: run `npm run docs:reference`) -->

## Reference

Every option below is read from the package's TypeScript types and their doc comments, and each default from
the value this package passes or, where it passes none, from the doc comment of the library that applies it.
So this section always matches the code of the version you installed.

### Options every layout takes

| Option              | Type                                                   | Default      | Meaning                                                                                                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `animate`           | `boolean \| "end"`                                     | `false`      | false: jump; "end" or any truthy value on a static layout: tween to the result; true on a simulation: draw every frame.                                                                                                                                                                                               |
| `animationDuration` | `number`                                               | `500`        | Length of the tween, in milliseconds.                                                                                                                                                                                                                                                                                 |
| `animationEasing`   | `string`                                               |              | Easing of the tween, as Cytoscape's built-in layouts take it (for example "ease-out").                                                                                                                                                                                                                                |
| `animateFilter`     | `(node: NodeSingular, i: number) => boolean`           |              | Tween only the nodes for which this returns true; the others jump to their positions.                                                                                                                                                                                                                                 |
| `fit`               | `boolean`                                              | `true`       | Fit the viewport to the result. Default true.                                                                                                                                                                                                                                                                         |
| `padding`           | `number`                                               | `30`         | Space around the result when `fit` is true, in pixels.                                                                                                                                                                                                                                                                |
| `boundingBox`       | `BoundingBox12 \| BoundingBoxWH`                       | the viewport | Where to place the result; default the viewport, which is 1 x 1 when headless.                                                                                                                                                                                                                                        |
| `spacingFactor`     | `number`                                               |              | Expands (above 1) or compresses (below 1) the area the result takes up.                                                                                                                                                                                                                                               |
| `transform`         | `(node: NodeSingular, position: Position) => Position` |              | Changes each final position: called with the node and its computed position, returns the position to use.                                                                                                                                                                                                             |
| `ready`             | `LayoutHandler`                                        |              | Called on layoutready.                                                                                                                                                                                                                                                                                                |
| `stop`              | `LayoutHandler`                                        |              | Called on layoutstop.                                                                                                                                                                                                                                                                                                 |
| `dim`               | `2 \| 3`                                               | 2            | 2 (default) or 3; a 3D result is projected onto x-y.                                                                                                                                                                                                                                                                  |
| `seed`              | `number`                                               |              | Seed of the layouts that draw random numbers; random when absent.                                                                                                                                                                                                                                                     |
| `weight`            | `string`                                               | unweighted   | Edge data field holding the weight (forceatlas2, kamada-kawai, the simulations). Default: unweighted.                                                                                                                                                                                                                 |
| `randomize`         | `boolean`                                              | `true`       | Simulations: start from random positions (true, default) or from the current ones. Locked nodes never move.                                                                                                                                                                                                           |
| `refresh`           | `number`                                               | `1`          | Simulations with `animate: true`: iterations per frame. Default 1.                                                                                                                                                                                                                                                    |
| `gpu`               | `GpuMode`                                              | "auto"       | Simulations: "auto" (default) runs on the core's GPU when the runtime has a usable WebGPU device (the run may then be asynchronous: listen for layoutstop); "off" runs on the CPU, synchronously when `animate` is false; "require" emits layouterror instead of running on the CPU. `layout.backend` says which ran. |
| `accelerator`       | `LayoutAccelerator`                                    |              | Simulations: an accelerator the caller built and owns (for example the `createAccelerator` of `@graphty/webgpu-graph-algorithms`); overrides `gpu`. null forces the CPU.                                                                                                                                              |

### Every layout

Pass the name to `cy.layout({ name, ... })`. A **simulation** steps a force model and can run on the GPU; a
**static** layout computes once on the CPU. An option that takes per-node arrays or a node column name is
the @graphty/layout function's own and reads the graph-format snapshot of the laid-out nodes, in the node
order of `toSnapshot(cy.nodes().not(":parent"))` (see [Using the graph-format snapshot
directly](#using-the-graph-format-snapshot-directly)).

#### `graphty-random` (static)

No options of its own.

#### `graphty-circular` (static)

No options of its own.

#### `graphty-spiral` (static)

| Option        | Type      | Default | Meaning                                                                                            |
| ------------- | --------- | ------- | -------------------------------------------------------------------------------------------------- |
| `resolution`  | `number`  | 0.35    | Angle between consecutive nodes, in radians, or the start angle when equidistant; default 0.35.    |
| `equidistant` | `boolean` | false   | Space consecutive nodes one unit apart along the spiral instead of by equal angles; default false. |

#### `graphty-grid` (static)

| Option    | Type     | Default         | Meaning                                                                        |
| --------- | -------- | --------------- | ------------------------------------------------------------------------------ |
| `columns` | `number` | `ceil(sqrt(n))` | Number of columns, a positive integer; default `ceil(sqrt(n))`, a square grid. |

#### `graphty-spectral` (static)

No options of its own.

#### `graphty-planar` (static)

No options of its own.

#### `graphty-arf` (static)

| Option    | Type     | Default                               | Meaning                                                                                     |
| --------- | -------- | ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `scaling` | `number` | 1                                     | The repulsion scale; default 1.                                                             |
| `a`       | `number` | 1.1 (every other pair has strength 1) | The spring strength between neighbours, > 1; default 1.1 (every other pair has strength 1). |
| `maxIter` | `number` | 1000                                  | The iteration cap; default 1000. The run also stops once the summed force falls to 1e-6.    |

#### `graphty-kamada-kawai` (static)

| Option | Type                                                             | Default | Meaning                                                                                                                                                                                                                                                                                  |
| ------ | ---------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dist` | `Float64Array<ArrayBufferLike> \| Float32Array<ArrayBufferLike>` |         | The ideal distance of every pair, `n * n` values row by row (for example `allPairsShortestPath(s).dist` from `@graphty/algorithms`). The diagonal is read as 0 and a non-finite entry as unreachable (1e6). Absent: the shortest paths of the graph, with its weights read as distances. |

#### `graphty-shell` (static)

| Option  | Type                       | Default | Meaning                             |
| ------- | -------------------------- | ------- | ----------------------------------- |
| `nlist` | `readonly NodeSelection[]` |         | shell: the shells, innermost first. |

#### `graphty-multipartite` (static)

| Option    | Type                                 | Default    | Meaning                                                                                                 |
| --------- | ------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------- |
| `subsets` | `string \| readonly NodeSelection[]` | "subset"   | multipartite: a node data field whose value names the layer (default "subset"), or the layers in order. |
| `align`   | `LayerAlign`                         | `vertical` | Default `vertical`.                                                                                     |

#### `graphty-bipartite` (static)

| Option        | Type            | Default    | Meaning                                                  |
| ------------- | --------------- | ---------- | -------------------------------------------------------- |
| `top`         | `NodeSelection` |            | bipartite: the nodes of the first line.                  |
| `align`       | `LayerAlign`    | `vertical` | Default `vertical`.                                      |
| `aspectRatio` | `number`        | 4 / 3      | Width over height of the unscaled layout; default 4 / 3. |

#### `graphty-bfs` (static)

| Option  | Type            | Default    | Meaning                                       |
| ------- | --------------- | ---------- | --------------------------------------------- |
| `root`  | `NodeSelection` |            | bfs: the start node; radial: the centre node. |
| `align` | `LayerAlign`    | `vertical` | Default `vertical`.                           |

#### `graphty-radial` (static)

| Option | Type            | Default | Meaning                                       |
| ------ | --------------- | ------- | --------------------------------------------- |
| `root` | `NodeSelection` |         | bfs: the start node; radial: the centre node. |

#### `graphty-forceatlas2` (simulation)

| Option              | Type                                                | Default | Meaning                                                                                                                                      |
| ------------------- | --------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxIter`           | `number`                                            | `100`   | Iteration cap; default 100. The run also ends once it settles (see `settleThreshold`).                                                       |
| `jitterTolerance`   | `number`                                            | 1       | How much swinging a node may show before its speed is cut; higher is faster and less precise. Default 1.                                     |
| `scalingRatio`      | `number`                                            | 2       | Strength of the repulsion between every pair of nodes; higher spreads the graph out. Default 2.                                              |
| `gravity`           | `number`                                            | 1       | Pull toward the centre, which keeps disconnected parts from drifting apart. Default 1.                                                       |
| `strongGravity`     | `boolean`                                           | false   | Gravity that grows with the distance from the centre instead of staying constant. Default false.                                             |
| `distributedAction` | `boolean`                                           | false   | Divide each node's attraction by its mass, so well-connected nodes move less. Default false.                                                 |
| `linlog`            | `boolean`                                           | false   | Logarithmic attraction (LinLog mode), which draws clusters tighter. Default false.                                                           |
| `nodeMass`          | `string \| F32 \| Readonly<Record<NodeId, number>>` |         | A per-node mass (n values), the name of a numeric node column, the legacy id-keyed record, or null (role-`mass` column, else outDegree + 1). |
| `nodeSize`          | `string \| F32 \| Readonly<Record<NodeId, number>>` |         | Accepted for compatibility with Gephi's options and not used yet: nodes are treated as points.                                               |
| `dissuadeHubs`      | `boolean`                                           |         | Accepted for compatibility with Gephi's options and not used yet.                                                                            |
| `settleThreshold`   | `number`                                            | 0.001   | Settle when the mean per-node displacement stays below settleThreshold \* rmsRadius for settleWindow iterations. Default 0.001.              |
| `settleWindow`      | `number`                                            | 10      | How many quiet iterations in a row (see `settleThreshold`) count as settled. Default 10.                                                     |
| `maxInFlight`       | `number`                                            | 2       | GPU simulations only; default 2.                                                                                                             |

#### `graphty-fruchterman-reingold` (simulation)

| Option            | Type                     | Default  | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `k`               | `number`                 |          | The ideal distance between neighbours; null or absent: `1 / sqrt(n)` of the unit square.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `iterations`      | `number`                 | `50`     | Iteration budget; default 50.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `cooling`         | `"linear" \| "adaptive"` | "linear" | The cooling schedule (default "linear"). "linear": the temperature falls from 0.1 to 0 over `iterations` steps, so the run always lasts the whole budget. "adaptive": Yifan Hu's step control -- the temperature grows by 1 / 0.9 after five consecutive iterations whose total force energy fell and shrinks by 0.9 whenever it rose, so the run settles on its own, usually in a few hundred iterations whatever the graph size; `iterations` is then only a cap. GPU simulations only; the CPU simulation ignores it. |
| `settleThreshold` | `number`                 | 0.001    | Settle when the mean per-node displacement stays below settleThreshold \* rmsRadius for settleWindow iterations. Default 0.001.                                                                                                                                                                                                                                                                                                                                                                                          |
| `settleWindow`    | `number`                 | 10       | How many quiet iterations in a row (see `settleThreshold`) count as settled. Default 10.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `maxInFlight`     | `number`                 | 2        | GPU simulations only; default 2.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

#### `graphty-spring-electrical` (simulation)

| Option              | Type     | Default | Meaning                                                                                                                         |
| ------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `springLength`      | `number` | 10      | The rest length of every edge's spring; default 10.                                                                             |
| `springCoefficient` | `number` |         | Hooke's constant; null or absent: ngraph's 0.8 scaled down on graphs over a few hundred nodes (the GPU simulation's size rule). |
| `gravity`           | `number` |         | ngraph's Coulomb constant (negative repels); null or absent: ngraph's -12 scaled down the same way.                             |
| `dragCoefficient`   | `number` | 0.9     | Friction: the share of its velocity a node loses each iteration; default 0.9.                                                   |
| `timeStep`          | `number` | 0.5     | Integration step; larger moves faster and less stably. Default 0.5.                                                             |
| `settleThreshold`   | `number` | 0.001   | Settle when the mean per-node displacement stays below settleThreshold \* rmsRadius for settleWindow iterations. Default 0.001. |
| `settleWindow`      | `number` | 10      | How many quiet iterations in a row (see `settleThreshold`) count as settled. Default 10.                                        |
| `maxInFlight`       | `number` | 2       | GPU simulations only; default 2.                                                                                                |

### Options every algorithm takes

| Option     | Type                                         | Default             | Meaning                                                                                                                                                                                                                                                                           |
| ---------- | -------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `directed` | `boolean`                                    | false               | Read the edges as directed (source to target). Default false, except where an algorithm says otherwise.                                                                                                                                                                           |
| `weight`   | `string \| ((edge: EdgeSingular) => number)` | every edge weighs 1 | Edge data field holding the weight, or a function of the edge. Default: every edge weighs 1.                                                                                                                                                                                      |
| `field`    | `string`                                     |                     | Write each element's value (what `score` or `cluster` returns) into `data(field)`.                                                                                                                                                                                                |
| `gpu`      | `GpuMode`                                    | "auto"              | The `...Async` methods only: "auto" (default) runs on the GPU when the runtime has a usable WebGPU device, "off" runs on the CPU, "require" throws instead of running on the CPU when no device is available. The synchronous methods always run on the CPU and reject "require". |

The algorithms defined only for directed graphs (`graphtyTopologicalSort`, `graphtyStronglyConnectedComponents`, `graphtyCondensation`, `graphtyDeltaPageRank`) default `directed` to `true`.

### Every algorithm

Each method below exists on every collection and on the core. A method marked **GPU** also has an
`...Async` twin that takes the same options and may run on the GPU (see [WebGPU](#webgpu)).

#### `graphtyAStar`

| Option      | Type                             | Default  | Meaning                                                                                          |
| ----------- | -------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `goal`      | `NodeSelection`                  | required | The node to reach.                                                                               |
| `root`      | `NodeSelection`                  | required | The start node: a selector or a collection (its first node).                                     |
| `heuristic` | `(node: NodeSingular) => number` | 0        | An estimate of the distance left from a node to `goal`, never more than the real one. Default 0. |

#### `graphtyAdamicAdarForPairs`

| Option  | Type                  | Default  | Meaning                                                             |
| ------- | --------------------- | -------- | ------------------------------------------------------------------- |
| `pairs` | `readonly NodePair[]` | required | The node pairs to score, each `[a, b]` of selectors or collections. |

#### `graphtyAdamicAdarPrediction`

| Option            | Type      | Default | Meaning                                                                                                                                                                                                                                  |
| ----------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `includeExisting` | `boolean` | false   | Also score pairs already joined by an arc u -> v. Default false.                                                                                                                                                                         |
| `topK`            | `number`  | 10      | Keep only the first `topK` ranked pairs. For the whole-graph predictions a value that is not positive keeps them all; for a node's candidates the default is 10 and the value is a slice end, so 0 keeps none and -2 drops the last two. |

#### `graphtyAdamicAdarScore`

| Option   | Type            | Default  | Meaning                     |
| -------- | --------------- | -------- | --------------------------- |
| `source` | `NodeSelection` | required | One node of the pair.       |
| `target` | `NodeSelection` | required | The other node of the pair. |

#### `graphtyAllPairsShortestPath` (**GPU**)

| Option     | Type                                         | Default | Meaning                                                                                                                                                                                                                                                                                 |
| ---------- | -------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `method`   | `"auto" \| "floyd-warshall" \| "per-source"` |         | Strategy override. `"auto"` (the default): BFS rows on unit weights, Floyd-Warshall on any negative weight, Dijkstra rows below arcCount n^2 / 3, Floyd-Warshall otherwise. `"floyd-warshall"` always sweeps; `"per-source"` runs BFS or Dijkstra rows and throws on a negative weight. |
| `paths`    | `boolean`                                    | false   | Record `predArc` so `pathTo` / `pathEdges` work; adds 4 n^2 bytes. Default false.                                                                                                                                                                                                       |
| `maxNodes` | `number`                                     | 5,792   | Refuse larger graphs before allocating. Default 5,792.                                                                                                                                                                                                                                  |

#### `graphtyBellmanFord` (**GPU**)

| Option   | Type            | Default  | Meaning                                                                                              |
| -------- | --------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `root`   | `NodeSelection` | required | The start node: a selector or a collection (its first node).                                         |
| `cutoff` | `number`        |          | Stop relaxing beyond this distance; a node farther away reads as unreachable. Unbounded when absent. |

#### `graphtyBetweennessCentrality` (**GPU**)

| Option       | Type            | Default    | Meaning                                                                                                                                                                                                                                                                                                          |
| ------------ | --------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `normalized` | `boolean`       | false      | Divide by the number of ordered pairs a node can sit between: `(n - 1)(n - 2)` directed, half that undirected; with `endpoints`, `n (n - 1)` and half that. Default false.                                                                                                                                       |
| `k`          | `number`        |            | Sampled betweenness: how many distinct sources to draw when `sources` is not given. The draw is deterministic -- the same `(n, k)` draws the same sources every time, and the dispatcher hands an accelerator the drawn sources, so both paths run the same ones. With `sources` it must equal `sources.length`. |
| `endpoints`  | `boolean`       | false      | Count a path's two ends as lying on it, as NetworkX's `endpoints=True` does. Default false. The legacy `betweennessCentrality` accepts this option and ignores it.                                                                                                                                               |
| `sources`    | `NodeSelection` | every node | Sampled: the nodes to run from, a selector or a collection; default every node.                                                                                                                                                                                                                                  |

#### `graphtyBidirectionalDijkstra`

| Option | Type            | Default  | Meaning                                                      |
| ------ | --------------- | -------- | ------------------------------------------------------------ |
| `goal` | `NodeSelection` | required | The node to reach.                                           |
| `root` | `NodeSelection` | required | The start node: a selector or a collection (its first node). |

#### `graphtyBreadthFirstSearch` (**GPU**)

| Option     | Type            | Default  | Meaning                                                                |
| ---------- | --------------- | -------- | ---------------------------------------------------------------------- |
| `goal`     | `NodeSelection` |          | Stop when this node is reached; it is then `found`.                    |
| `maxDepth` | `number`        |          | Stop expanding at this many hops from the root; unbounded when absent. |
| `root`     | `NodeSelection` | required | The start node: a selector or a collection (its first node).           |

#### `graphtyClosenessCentrality` (**GPU**)

| Option       | Type            | Default              | Meaning                                                                                                                                                                                                                                                                                                                              |
| ------------ | --------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `normalized` | `boolean`       | false                | Scale by the fraction of other nodes reached (Wasserman and Faust), or with `harmonic` divide by `n - 1`. Default false.                                                                                                                                                                                                             |
| `harmonic`   | `boolean`       | false                | Sum `1 / distance` instead of taking `1 / sum(distance)`; better on disconnected graphs. Default false.                                                                                                                                                                                                                              |
| `cutoff`     | `number`        | every reachable node | Stop searching from nodes this far away or farther. A node past the cutoff is still counted when an edge reaches it from a node closer than the cutoff, as in the legacy functions. Default: every reachable node.                                                                                                                   |
| `k`          | `number`        |                      | Sampled closeness: how many distinct sources to draw when `sources` is not given, by the same deterministic draw betweenness uses -- the same `(n, k)` draws the same sources every time, and the dispatcher hands an accelerator the drawn sources, so both paths run the same ones. With `sources` it must equal `sources.length`. |
| `sources`    | `NodeSelection` | every node           | Sampled: the nodes to run from, a selector or a collection; default every node.                                                                                                                                                                                                                                                      |

#### `graphtyCommonNeighborsForPairs`

| Option  | Type                  | Default  | Meaning                                                             |
| ------- | --------------------- | -------- | ------------------------------------------------------------------- |
| `pairs` | `readonly NodePair[]` | required | The node pairs to score, each `[a, b]` of selectors or collections. |

#### `graphtyCommonNeighborsPrediction`

| Option            | Type      | Default | Meaning                                                                                                                                                                                                                                  |
| ----------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `includeExisting` | `boolean` | false   | Also score pairs already joined by an arc u -> v. Default false.                                                                                                                                                                         |
| `topK`            | `number`  | 10      | Keep only the first `topK` ranked pairs. For the whole-graph predictions a value that is not positive keeps them all; for a node's candidates the default is 10 and the value is a slice end, so 0 keeps none and -2 drops the last two. |

#### `graphtyCommonNeighborsScore`

| Option   | Type            | Default  | Meaning                     |
| -------- | --------------- | -------- | --------------------------- |
| `source` | `NodeSelection` | required | One node of the pair.       |
| `target` | `NodeSelection` | required | The other node of the pair. |

#### `graphtyCompareAdamicAdarWithCommonNeighbors`

| Option     | Type                  | Default  | Meaning                                                                           |
| ---------- | --------------------- | -------- | --------------------------------------------------------------------------------- |
| `edges`    | `readonly NodePair[]` | required | Node pairs that are edges (held out of the graph), which a good score ranks high. |
| `nonEdges` | `readonly NodePair[]` | required | Node pairs that are not edges, which a good score ranks low.                      |

#### `graphtyCondensation`

No options of its own.

#### `graphtyConnectedComponents` (**GPU**)

No options of its own.

#### `graphtyDegreeCentrality`

| Option       | Type                       | Default   | Meaning                                                                                        |
| ------------ | -------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `mode`       | `"in" \| "out" \| "total"` | `"total"` | On a directed snapshot, which neighbours to count; ignored when undirected. Default `"total"`. |
| `normalized` | `boolean`                  | false     | Divide by `n - 1`, the most neighbours a node can have. Default false.                         |

#### `graphtyDegrees`

No options of its own.

#### `graphtyDeltaPageRank`

| Option            | Type                                                | Default        | Meaning                                                                                             |
| ----------------- | --------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------- |
| `dampingFactor`   | `number`                                            | `0.85`         | Probability of following a link; default 0.85.                                                      |
| `maxIterations`   | `number`                                            | `100`          | Rounds (DeltaPageRank) or processed nodes (PriorityDeltaPageRank); default 100.                     |
| `tolerance`       | `number`                                            | `0.000001`     | Stop when every pending delta is below this; default 1e-6.                                          |
| `deltaThreshold`  | `number`                                            | tolerance / 10 | A delta below this is dropped rather than propagated; default tolerance / 10.                       |
| `priority`        | `boolean`                                           |                | Process the largest pending delta first (`PriorityDeltaPageRank`, which ignores `personalization`). |
| `personalization` | `NodeSelection \| ((node: NodeSingular) => number)` |                | The teleport set: a selection (uniform over it) or a weight per node.                               |

#### `graphtyDepthFirstSearch`

| Option  | Type              | Default  | Meaning                                                                                             |
| ------- | ----------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `goal`  | `NodeSelection`   |          | Stop when this node is reached; it is then `found`.                                                 |
| `root`  | `NodeSelection`   | required | The start node: a selector or a collection (its first node).                                        |
| `order` | `"pre" \| "post"` | "pre"    | "pre" (default) lists a node when it is first reached, "post" when everything below it is finished. |

#### `graphtyDijkstra` (**GPU**)

| Option   | Type            | Default  | Meaning                                                                                              |
| -------- | --------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `root`   | `NodeSelection` | required | The start node: a selector or a collection (its first node).                                         |
| `cutoff` | `number`        |          | Stop relaxing beyond this distance; a node farther away reads as unreachable. Unbounded when absent. |

#### `graphtyDirectionOptimizedBfs`

| Option  | Type            | Default  | Meaning                                                                                                                             |
| ------- | --------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `root`  | `NodeSelection` | required | The start node: a selector or a collection (its first node).                                                                        |
| `alpha` | `number`        | 15       | Switch from top-down to bottom-up once the frontier's out-arcs exceed the unvisited nodes' out-arcs divided by `alpha`. Default 15. |
| `beta`  | `number`        | 18       | Switch back to top-down once the frontier shrinks below `nodeCount / beta` nodes. Default 18.                                       |

#### `graphtyEdgeBetweennessCentrality` (**GPU**)

| Option       | Type            | Default    | Meaning                                                                                        |
| ------------ | --------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| `sources`    | `NodeSelection` | every node | Sampled: the nodes to run from, a selector or a collection; default every node.                |
| `normalized` | `boolean`       | false      | Divide by `(n - 1)(n - 2)` on a directed graph, half that on an undirected one. Default false. |
| `k`          | `number`        |            | Sampled: how many source nodes to draw (the same count draws the same nodes every time).       |

#### `graphtyEigenvectorCentrality` (**GPU**)

| Option          | Type                             | Default    | Meaning                                                                                                                                                                                    |
| --------------- | -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `maxIterations` | `number`                         | `100`      | Iteration cap; default 100.                                                                                                                                                                |
| `tolerance`     | `number`                         | `0.000001` | Per-node tolerance: the run stops when the L1 change is below `n * tolerance`; default 1e-6.                                                                                               |
| `normalized`    | `boolean`                        | true       | Rescale the unit-length vector to [0, 1] by min-max, as the legacy function does; default true.                                                                                            |
| `mode`          | `"in" \| "out" \| "total"`       |            | On a directed snapshot, which arcs feed a node: `"in"` (default, as networkx) the nodes pointing at it, `"out"` the nodes it points at, `"total"` both. Ignored on an undirected snapshot. |
| `startVector`   | `(node: NodeSingular) => number` | uniform    | Starting value of each node; default uniform.                                                                                                                                              |

#### `graphtyEvaluateAdamicAdar`

| Option     | Type                  | Default  | Meaning                                                                           |
| ---------- | --------------------- | -------- | --------------------------------------------------------------------------------- |
| `edges`    | `readonly NodePair[]` | required | Node pairs that are edges (held out of the graph), which a good score ranks high. |
| `nonEdges` | `readonly NodePair[]` | required | Node pairs that are not edges, which a good score ranks low.                      |

#### `graphtyEvaluateCommonNeighbors`

| Option     | Type                  | Default  | Meaning                                                                           |
| ---------- | --------------------- | -------- | --------------------------------------------------------------------------------- |
| `edges`    | `readonly NodePair[]` | required | Node pairs that are edges (held out of the graph), which a good score ranks high. |
| `nonEdges` | `readonly NodePair[]` | required | Node pairs that are not edges, which a good score ranks low.                      |

#### `graphtyFindAllIsomorphisms`

| Option      | Type                                                              | Default     | Meaning                                                                      |
| ----------- | ----------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `other`     | `Collection<SingularElementReturnValue, SingularElementArgument>` |             | The collection to compare with, read with the same `directed`.               |
| `nodeMatch` | `(a: NodeSingular, b: NodeSingular) => boolean`                   | any two may | Two nodes may be paired only when this returns true; by default any two may. |
| `edgeMatch` | `(a: EdgeSingular, b: EdgeSingular) => boolean`                   | any two may | Two edges may be paired only when this returns true; by default any two may. |

#### `graphtyGirvanNewman`

| Option             | Type     | Default | Meaning                                                                                   |
| ------------------ | -------- | ------- | ----------------------------------------------------------------------------------------- |
| `maxCommunities`   | `number` |         | Stop once a level has at least this many communities of `minCommunitySize` or more nodes. |
| `minCommunitySize` | `number` | 1       | Communities smaller than this do not count towards `maxCommunities`; default 1.           |
| `maxIterations`    | `number` | 100     | Cap on rounds of edge removal; default 100.                                               |

#### `graphtyGreedyBipartiteMatching`

| Option  | Type              | Default | Meaning                                                                                                  |
| ------- | ----------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `left`  | `NodeSelection`   |         | One side of the bipartite graph; inferred when absent.                                                   |
| `right` | `NodeSelection`   |         | The other side; inferred when absent.                                                                    |
| `arcs`  | `"out" \| "both"` | "both"  | With `directed`: "both" (default) ignores direction; "out" joins a left node only to its out-neighbours. |

#### `graphtyGrsbm`

| Option           | Type     | Default | Meaning                                                                          |
| ---------------- | -------- | ------- | -------------------------------------------------------------------------------- |
| `maxDepth`       | `number` | 10      | Clusters at this depth are not split; default 10.                                |
| `maxIterations`  | `number` | 100     | Iteration cap of the Fiedler-vector iteration; default 100.                      |
| `tolerance`      | `number` | 1e-6    | Convergence tolerance of the Fiedler-vector iteration; default 1e-6.             |
| `seed`           | `number` | 42      | Seed of the iteration's start vectors; default 42.                               |
| `minClusterSize` | `number` | 2       | A cluster is split only when it has at least twice this many members; default 2. |

#### `graphtyHasCycle`

No options of its own.

#### `graphtyHierarchicalClustering`

| Option    | Type      | Default | Meaning                                                                                                |
| --------- | --------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `linkage` | `Linkage` | single  | Cluster distance: the minimum, maximum or mean member distance, or Ward's scaled mean; default single. |

#### `graphtyHits` (**GPU**)

| Option          | Type      | Default    | Meaning                                                                                                                                                                                                                                                          |
| --------------- | --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxIterations` | `number`  | `100`      | Iteration cap; default 100.                                                                                                                                                                                                                                      |
| `tolerance`     | `number`  | `0.000001` | Convergence tolerance on the largest single-node change; default 1e-6.                                                                                                                                                                                           |
| `normalized`    | `boolean` | true       | `false` rescales both vectors so their largest entry is 1, which is what the legacy function does when normalization is switched OFF -- the iteration itself always divides by the L2 norm. Default true, i.e. the L2-normalized vectors are returned unchanged. |

#### `graphtyIsBipartite`

| Option | Type              | Default | Meaning                                                                                                                                                                                                                                                                                                                                                                                              |
| ------ | ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arcs` | `"out" \| "both"` | "both"  | Which arcs of a directed snapshot to colour along. "both" (default) follows out- and in-arcs, which answers for the graph with direction ignored. "out" follows out-arcs only, as the legacy `bipartitePartition` does: roots are taken in index order and a node first reached through an in-arc is coloured as a new root, so the answer depends on node order. Ignored on an undirected snapshot. |

#### `graphtyIsGraphIsomorphic`

| Option      | Type                                                              | Default     | Meaning                                                                      |
| ----------- | ----------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| `other`     | `Collection<SingularElementReturnValue, SingularElementArgument>` |             | The collection to compare with, read with the same `directed`.               |
| `nodeMatch` | `(a: NodeSingular, b: NodeSingular) => boolean`                   | any two may | Two nodes may be paired only when this returns true; by default any two may. |
| `edgeMatch` | `(a: EdgeSingular, b: EdgeSingular) => boolean`                   | any two may | Two edges may be paired only when this returns true; by default any two may. |

#### `graphtyKCoreDecomposition`

No options of its own.

#### `graphtyKargerMinCut`

| Option       | Type     | Default | Meaning                                                                      |
| ------------ | -------- | ------- | ---------------------------------------------------------------------------- |
| `randomSeed` | `number` | 42      | Seed of the edge orders; one seed gives one result, bit for bit. Default 42. |
| `iterations` | `number` | 100     | Independent contraction trials; the lightest cut found wins. Default 100.    |

#### `graphtyKatzCentrality` (**GPU**)

| Option          | Type      | Default    | Meaning                                                                             |
| --------------- | --------- | ---------- | ----------------------------------------------------------------------------------- |
| `maxIterations` | `number`  | `100`      | Iteration cap; default 100.                                                         |
| `tolerance`     | `number`  | `0.000001` | Convergence tolerance on the largest single-node change; default 1e-6.              |
| `normalized`    | `boolean` | true       | Rescale the scores to [0, 1] by min-max, as the legacy function does; default true. |
| `alpha`         | `number`  | `0.1`      | Attenuation factor applied to a neighbour's score; default 0.1.                     |
| `beta`          | `number`  | `1`        | Base score every node starts with and keeps; default 1.                             |

#### `graphtyKruskalMST`

No options of its own.

#### `graphtyLabelPropagation` (**GPU**)

| Option          | Type     | Default | Meaning                                                                  |
| --------------- | -------- | ------- | ------------------------------------------------------------------------ |
| `maxIterations` | `number` | `100`   | Work cap, in node visits per node (full-sweep equivalents); default 100. |
| `randomSeed`    | `number` | 42      | Seed of the visit order and of the tie draws; default 42.                |

#### `graphtyLabelPropagationSemiSupervised`

| Option          | Type                                 | Default  | Meaning                                                                                                |
| --------------- | ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------ |
| `maxIterations` | `number`                             | `100`    | Work cap, in node visits per node (full-sweep equivalents); default 100.                               |
| `randomSeed`    | `number`                             | 42       | Seed of the visit order and of the tie draws; default 42.                                              |
| `seeds`         | `string \| readonly NodeSelection[]` | required | Seed labels: the node data field holding them (nodes without it are free), or one selection per label. |

#### `graphtyLabelPropagationSynchronous` (**GPU**)

| Option          | Type     | Default | Meaning        |
| --------------- | -------- | ------- | -------------- |
| `maxIterations` | `number` | `100`   | Iteration cap. |

#### `graphtyLeiden`

| Option          | Type     | Default | Meaning                                                                                                                                                                                                                                                  |
| --------------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolution`    | `number` | 1       | Resolution gamma: above 1 favours smaller communities; default 1.                                                                                                                                                                                        |
| `randomSeed`    | `number` | 42      | Seed of the visit orders; default 42.                                                                                                                                                                                                                    |
| `maxIterations` | `number` | 100     | Cap on whole passes over the original graph, each running as many levels as it needs; default 100. The legacy `leiden` caps levels instead, so its `maxIterations: 1` is one level where this is one full pass. The result's `iterations` counts levels. |
| `threshold`     | `number` | 1e-7    | Stop once a pass improves modularity by no more than this; default 1e-7.                                                                                                                                                                                 |

#### `graphtyLouvain`

| Option          | Type     | Default | Meaning                                                                             |
| --------------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `resolution`    | `number` | 1       | Resolution gamma: above 1 favours smaller communities; default 1.                   |
| `maxIterations` | `number` | 100     | Cap on aggregation levels, and on node visits per node within a level; default 100. |
| `tolerance`     | `number` | 1e-6    | Stop when a level improves modularity by less than this; default 1e-6.              |

#### `graphtyMarkovClustering`

| Option             | Type      | Default | Meaning                                                                       |
| ------------------ | --------- | ------- | ----------------------------------------------------------------------------- |
| `maxIterations`    | `number`  | 100     | Cap on expansion-inflation rounds; default 100.                               |
| `tolerance`        | `number`  | 1e-6    | Stop when no matrix entry moved by more than this in a round; default 1e-6.   |
| `expansion`        | `number`  | 2       | Matrix power of each expansion step, an integer of at least 1; default 2.     |
| `inflation`        | `number`  | 2       | Element-wise power of each inflation step, above 0; default 2.                |
| `pruningThreshold` | `number`  | 1e-5    | Entries below this are dropped after each inflation; default 1e-5.            |
| `selfLoops`        | `boolean` | true    | Give every node a self-loop of weight 1 before the first round; default true. |

#### `graphtyMaxFlow`

| Option      | Type                                 | Default                        | Meaning                                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | ------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`    | `NodeSelection`                      | required                       | The node the flow leaves.                                                                                                                                                                                                                                                                                                                                                             |
| `sink`      | `NodeSelection`                      | required                       | The node the flow arrives at.                                                                                                                                                                                                                                                                                                                                                         |
| `algorithm` | `"edmonds-karp" \| "ford-fulkerson"` | `"edmonds-karp"` for `maxFlow` | How augmenting paths are found: `"edmonds-karp"` (breadth-first, shortest paths first, O(V E^2)) or `"ford-fulkerson"` (depth-first, O(E f)). Default `"edmonds-karp"` for `maxFlow` and `"ford-fulkerson"` for `minSTCut`. Both give the same source side and the same flow value up to floating-point rounding; the per-edge flows can differ where the maximum flow is not unique. |

#### `graphtyMaximumBipartiteMatching`

| Option  | Type              | Default | Meaning                                                                                                  |
| ------- | ----------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `left`  | `NodeSelection`   |         | One side of the bipartite graph; inferred when absent.                                                   |
| `right` | `NodeSelection`   |         | The other side; inferred when absent.                                                                    |
| `arcs`  | `"out" \| "both"` | "both"  | With `directed`: "both" (default) ignores direction; "out" joins a left node only to its out-neighbours. |

#### `graphtyMinSTCut`

| Option      | Type                                 | Default                        | Meaning                                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | ------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`    | `NodeSelection`                      | required                       | The node the flow leaves.                                                                                                                                                                                                                                                                                                                                                             |
| `sink`      | `NodeSelection`                      | required                       | The node the flow arrives at.                                                                                                                                                                                                                                                                                                                                                         |
| `algorithm` | `"edmonds-karp" \| "ford-fulkerson"` | `"edmonds-karp"` for `maxFlow` | How augmenting paths are found: `"edmonds-karp"` (breadth-first, shortest paths first, O(V E^2)) or `"ford-fulkerson"` (depth-first, O(E f)). Default `"edmonds-karp"` for `maxFlow` and `"ford-fulkerson"` for `minSTCut`. Both give the same source side and the same flow value up to floating-point rounding; the per-edge flows can differ where the maximum flow is not unique. |

#### `graphtyModularity`

| Option       | Type                                 | Default  | Meaning                                                                                               |
| ------------ | ------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `resolution` | `number`                             | 1        | Resolution gamma: above 1 favours smaller communities; default 1.                                     |
| `clusters`   | `string \| readonly NodeSelection[]` | required | The clusters (a partition result, or selections), or the node data field holding each node's cluster. |

#### `graphtyNodeClosenessCentrality`

| Option       | Type            | Default              | Meaning                                                                                                                                                                                                            |
| ------------ | --------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `root`       | `NodeSelection` | required             | The start node: a selector or a collection (its first node).                                                                                                                                                       |
| `normalized` | `boolean`       | false                | Scale by the fraction of other nodes reached (Wasserman and Faust), or with `harmonic` divide by `n - 1`. Default false.                                                                                           |
| `harmonic`   | `boolean`       | false                | Sum `1 / distance` instead of taking `1 / sum(distance)`; better on disconnected graphs. Default false.                                                                                                            |
| `cutoff`     | `number`        | every reachable node | Stop searching from nodes this far away or farther. A node past the cutoff is still counted when an edge reaches it from a node closer than the cutoff, as in the legacy functions. Default: every reachable node. |

#### `graphtyPageRank` (**GPU**)

| Option            | Type                             | Default    | Meaning                                                                                                                                                                          |
| ----------------- | -------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dampingFactor`   | `number`                         | `0.85`     | Probability of following a link; default 0.85.                                                                                                                                   |
| `maxIterations`   | `number`                         | `100`      | Iteration cap; default 100.                                                                                                                                                      |
| `tolerance`       | `number`                         | `0.000001` | Convergence tolerance on the per-iteration change; default 1e-6.                                                                                                                 |
| `convergenceNorm` | `"l1" \| "max"`                  | `"l1"`     | How the per-iteration change is measured against `tolerance`: `"l1"` (default) sums it over all nodes, `"max"` takes the largest single-node change, the legacy `pageRank` rule. |
| `initialRanks`    | `(node: NodeSingular) => number` |            | Starting rank of each node.                                                                                                                                                      |

#### `graphtyPersonalizedPageRank` (**GPU**)

| Option            | Type                                                | Default    | Meaning                                                                                                                                                                          |
| ----------------- | --------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dampingFactor`   | `number`                                            | `0.85`     | Probability of following a link; default 0.85.                                                                                                                                   |
| `maxIterations`   | `number`                                            | `100`      | Iteration cap; default 100.                                                                                                                                                      |
| `tolerance`       | `number`                                            | `0.000001` | Convergence tolerance on the per-iteration change; default 1e-6.                                                                                                                 |
| `convergenceNorm` | `"l1" \| "max"`                                     | `"l1"`     | How the per-iteration change is measured against `tolerance`: `"l1"` (default) sums it over all nodes, `"max"` takes the largest single-node change, the legacy `pageRank` rule. |
| `personalization` | `NodeSelection \| ((node: NodeSingular) => number)` | required   | The teleport set: a selection (uniform over it) or a weight per node.                                                                                                            |
| `initialRanks`    | `(node: NodeSingular) => number`                    |            | Starting rank of each node.                                                                                                                                                      |

#### `graphtyPrimMST`

| Option   | Type            | Default        | Meaning                                                                                    |
| -------- | --------------- | -------------- | ------------------------------------------------------------------------------------------ |
| `root`   | `NodeSelection` | the first node | The node the tree grows from; default the first node.                                      |
| `forest` | `boolean`       | false          | Grow a tree in every component instead of throwing on a disconnected graph. Default false. |

#### `graphtySpectralClustering`

| Option          | Type            | Default    | Meaning                                                                                                           |
| --------------- | --------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `maxIterations` | `number`        | 100        | Cap on k-means rounds; default 100.                                                                               |
| `tolerance`     | `number`        | 1e-4       | k-means stops when no centroid moves further than this; default 1e-4.                                             |
| `k`             | `number`        | required   | Number of clusters, a positive integer.                                                                           |
| `laplacianType` | `LaplacianType` | normalized | `D - A`, `I - D^-1/2 A D^-1/2` (rows of the embedding scaled to unit length) or `I - D^-1 A`; default normalized. |
| `seed`          | `number`        | 42         | Seed of the starting block and of the k-means seeding; default 42.                                                |

#### `graphtyStoerWagner`

No options of its own.

#### `graphtyStronglyConnectedComponents`

No options of its own.

#### `graphtySyncClustering`

| Option          | Type     | Default  | Meaning                                                                                                   |
| --------------- | -------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `numClusters`   | `number` | required | Number of cluster centres: an integer in `[1, nodeCount]` (legacy rounds a fraction up; the port throws). |
| `maxIterations` | `number` | 100      | Iteration cap; default 100.                                                                               |
| `tolerance`     | `number` | 1e-6     | Stop when the loss changes by less than this between iterations; default 1e-6.                            |
| `seed`          | `number` | 42       | Seed of the embedding initialisation and the centre draws; default 42.                                    |
| `learningRate`  | `number` | 0.01     | Gradient step; default 0.01.                                                                              |
| `lambda`        | `number` | 0.1      | Weight of the neighbour-reconstruction and regularisation terms; default 0.1.                             |

#### `graphtyTeraHAC`

| Option              | Type                                            | Default                 | Meaning                                                                                                                                                                               |
| ------------------- | ----------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `linkage`           | `"single" \| "complete" \| "average" \| "ward"` | `"average"`             | How the distance between two clusters is read from their members' pairwise distances: the minimum, the maximum, the mean, or (`"ward"`) the mean of the squares; default `"average"`. |
| `numClusters`       | `number`                                        | merge until one is left | Stop merging at this many clusters; a positive integer. Default: merge until one is left.                                                                                             |
| `distanceThreshold` | `number`                                        | no threshold            | Stop at the first merge whose linkage distance is above this. Default: no threshold.                                                                                                  |
| `useGraphDistance`  | `boolean`                                       |                         | Pairwise distance: hop count along out-arcs (true, the default), or 1 for an arc from the lower to the higher node index and 2 for none (false).                                      |

#### `graphtyTopAdamicAdarCandidatesForNode`

| Option            | Type            | Default    | Meaning                                                                                                                                                                                                                                  |
| ----------------- | --------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`            | `NodeSelection` | required   | The start node: a selector or a collection (its first node).                                                                                                                                                                             |
| `includeExisting` | `boolean`       | false      | Also score pairs already joined by an arc u -> v. Default false.                                                                                                                                                                         |
| `topK`            | `number`        | 10         | Keep only the first `topK` ranked pairs. For the whole-graph predictions a value that is not positive keeps them all; for a node's candidates the default is 10 and the value is a slice end, so 0 keeps none and -2 drops the last two. |
| `candidates`      | `NodeSelection` | every node | The nodes to consider linking to `root`; default every node.                                                                                                                                                                             |

#### `graphtyTopCandidatesForNode`

| Option            | Type            | Default    | Meaning                                                                                                                                                                                                                                  |
| ----------------- | --------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`            | `NodeSelection` | required   | The start node: a selector or a collection (its first node).                                                                                                                                                                             |
| `includeExisting` | `boolean`       | false      | Also score pairs already joined by an arc u -> v. Default false.                                                                                                                                                                         |
| `topK`            | `number`        | 10         | Keep only the first `topK` ranked pairs. For the whole-graph predictions a value that is not positive keeps them all; for a node's candidates the default is 10 and the value is a slice end, so 0 keeps none and -2 drops the last two. |
| `candidates`      | `NodeSelection` | every node | The nodes to consider linking to `root`; default every node.                                                                                                                                                                             |

#### `graphtyTopologicalSort`

No options of its own.

#### `graphtyTriangleCount` (**GPU**)

No options of its own.

#### `graphtyWeaklyConnectedComponents` (**GPU**)

No options of its own.

### Generators

`cy.graphtyGenerate(name, options)`. The options marked `?` are optional; a random generator's `seed`
defaults to 0, and the same options give the same graph on every platform.

| Name                            | Options                                                                                                                             | What it makes                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `ak`                            | `k`                                                                                                                                 | The AK network of B. V. Cherkassky and A. V. Goldberg                                                 |
| `balanced-tree`                 | `branching`, `height`, `weights?`, `seed?`                                                                                          | The balanced r-ary tree of height h, numbered breadth first                                           |
| `barabasi-albert`               | `n`, `m`, `triadProbability?`, `seed?`, `weights?`                                                                                  | Barabasi-Albert preferential attachment                                                               |
| `barbell`                       | `cliqueSize`, `pathLength`, `weights?`, `seed?`                                                                                     | The barbell                                                                                           |
| `bianconi-barabasi`             | `n`, `m`, `fitness?`, `seed?`, `weights?`                                                                                           | The Bianconi-Barabasi fitness model                                                                   |
| `bipartite-configuration-model` | `leftDegrees`, `rightDegrees`, `multiEdges?`, `seed?`, `weights?`                                                                   | The bipartite configuration model                                                                     |
| `caveman`                       | `cliques`, `size`, `weights?`, `seed?`                                                                                              | The caveman graph                                                                                     |
| `chung-lu`                      | `expectedDegrees`, `seed?`, `weights?`                                                                                              | The Chung-Lu expected-degree graph                                                                    |
| `circular-ladder`               | `n`, `weights?`, `seed?`                                                                                                            | The circular ladder CL_n (the n-prism)                                                                |
| `complete`                      | `n`, `weights?`, `seed?`                                                                                                            | The complete graph K_n                                                                                |
| `complete-bipartite`            | `a`, `b`, `weights?`, `seed?`                                                                                                       | The complete bipartite graph K\_{a,b}                                                                 |
| `complete-multipartite`         | `sizes`, `weights?`, `seed?`                                                                                                        | The complete multipartite graph K\_{s0, s1, ...}                                                      |
| `configuration-model`           | `degrees`, `selfLoops?`, `multiEdges?`, `seed?`, `weights?`                                                                         | The configuration model                                                                               |
| `connected-caveman`             | `cliques`, `size`, `weights?`, `seed?`                                                                                              | The connected caveman graph                                                                           |
| `cycle`                         | `n`, `weights?`, `seed?`                                                                                                            | The cycle C_n                                                                                         |
| `degree-corrected-sbm`          | `sizes`, `expectedDegrees`, `mixing`, `seed?`, `weights?`                                                                           | The degree-corrected stochastic block model                                                           |
| `directed-configuration-model`  | `outDegrees`, `inDegrees`, `selfLoops?`, `multiEdges?`, `seed?`, `weights?`                                                         | The directed configuration model                                                                      |
| `duplication-divergence`        | `n`, `retention`, `seed?`, `weights?`                                                                                               | The duplication-divergence model                                                                      |
| `empty`                         | `n`, `weights?`, `seed?`                                                                                                            | The empty graph                                                                                       |
| `erdos-renyi`                   | `n`, `p`, `directed?`, `seed?`, `weights?`                                                                                          | Gilbert's G(n, p) in O(n + m) by geometric skipping                                                   |
| `erdos-renyi-gnm`               | `n`, `m`, `seed?`, `weights?`                                                                                                       | Erdos-Renyi's G(n, m)                                                                                 |
| `forest-fire`                   | `n`, `forward`, `backward`, `maxBurn?`, `seed?`, `weights?`                                                                         | The forest fire model                                                                                 |
| `genrmf`                        | `a`, `b`, `c1`, `c2`, `seed?`                                                                                                       | GENRMF, the max-flow family of D. Goldfarb and M. D. Grigoriadis                                      |
| `grid`                          | `directed?`, `weights?`, `seed?`, `rows`, `cols`, `periodic?`, `diagonals?`, `obstacles?`, `positions?`                             | The rows x cols grid                                                                                  |
| `grid-3d`                       | `rows`, `cols`, `layers`, `periodic?`, `diagonals?`, `directed?`, `obstacles?`, `positions?`, `weights?`, `seed?`                   | The rows x cols x layers grid                                                                         |
| `grid-flow-network`             | `rows`, `cols`, `minCapacity?`, `maxCapacity?`, `seed?`                                                                             | A grid flow network, the shape of graph-cut image segmentation                                        |
| `hexagonal-lattice`             | `rows`, `cols`, `positions?`, `weights?`, `seed?`                                                                                   | The hexagonal (honeycomb) lattice in its brick-wall form                                              |
| `hyperbolic`                    | `n`, `averageDegree`, `exponent`, `temperature?`, `seed?`, `weights?`                                                               | A random hyperbolic graph                                                                             |
| `hypercube`                     | `dimension`, `weights?`, `seed?`                                                                                                    | The hypercube Q_d                                                                                     |
| `knn`                           | `n`, `k`, `dimension?`, `directed?`, `clusters?`, `spread?`, `seed?`, `weights?`                                                    | The k-nearest-neighbour graph of random points, the standard input of spectral clustering             |
| `kronecker`                     | `initiator`, `power`, `edges?`, `selfLoops?`, `multiEdges?`, `permute?`, `directed?`, `seed?`, `weights?`                           | A stochastic Kronecker graph                                                                          |
| `ladder`                        | `n`, `weights?`, `seed?`                                                                                                            | The ladder L_n                                                                                        |
| `layered-flow-network`          | `layers`, `p`, `minCapacity?`, `maxCapacity?`, `seed?`                                                                              | A random layered flow network                                                                         |
| `lfr`                           | `n`, `minDegree`, `maxDegree`, `degreeExponent`, `minCommunity`, `maxCommunity`, `communityExponent`, `mixing`, `seed?`, `weights?` | The LFR benchmark                                                                                     |
| `lollipop`                      | `cliqueSize`, `pathLength`, `weights?`, `seed?`                                                                                     | The lollipop                                                                                          |
| `mobius-ladder`                 | `n`, `weights?`, `seed?`                                                                                                            | The Moebius ladder M\_{2n}                                                                            |
| `named`                         | `name`, `weights?`, `seed?`                                                                                                         | A named graph from the literature, by `name`.                                                         |
| `newman-watts`                  | `n`, `k`, `p`, `seed?`, `weights?`                                                                                                  | The Newman-Watts small world                                                                          |
| `path`                          | `n`, `weights?`, `seed?`                                                                                                            | The path P_n                                                                                          |
| `petersen`                      | `weights?`, `seed?`                                                                                                                 | The Petersen graph                                                                                    |
| `planted-partition`             | `groups`, `groupSize`, `pIn`, `pOut`, `seed?`, `weights?`                                                                           | The planted partition model                                                                           |
| `price`                         | `n`, `citations`, `attractiveness?`, `seed?`, `weights?`                                                                            | Price's citation network                                                                              |
| `random-apollonian`             | `n`, `seed?`, `weights?`                                                                                                            | The random Apollonian network                                                                         |
| `random-bipartite`              | `n1`, `n2`, `p`, `perfectMatching?`, `seed?`, `weights?`                                                                            | The random bipartite graph G(n1, n2, p) in O(n + m)                                                   |
| `random-dag`                    | `layers`, `p`, `seed?`, `weights?`                                                                                                  | A random layered DAG                                                                                  |
| `random-geometric`              | `n`, `radius`, `dimension?`, `periodic?`, `seed?`, `weights?`                                                                       | The random geometric graph                                                                            |
| `random-order-dag`              | `n`, `p`, `seed?`, `weights?`                                                                                                       | The random-order DAG                                                                                  |
| `random-recursive-tree`         | `n`, `seed?`, `weights?`                                                                                                            | The random recursive tree                                                                             |
| `random-regular`                | `n`, `d`, `seed?`, `weights?`                                                                                                       | A uniformly-ish random d-regular simple graph by the pairing algorithm of A. Steger and N. C. Wormald |
| `random-tree`                   | `n`, `seed?`, `weights?`                                                                                                            | A uniformly random labelled tree                                                                      |
| `ring-of-cliques`               | `cliques`, `size`, `weights?`, `seed?`                                                                                              | The ring of cliques, as networkx's `ring_of_cliques`                                                  |
| `rmat`                          | `scale`, `edgeFactor?`, `a?`, `b?`, `c?`, `d?`, `selfLoops?`, `multiEdges?`, `permute?`, `directed?`, `seed?`, `weights?`           | R-MAT                                                                                                 |
| `star`                          | `n`, `weights?`, `seed?`                                                                                                            | The star                                                                                              |
| `stochastic-block-model`        | `sizes`, `probabilities`, `seed?`, `weights?`                                                                                       | The stochastic block model in O(n B + m)                                                              |
| `triangular-lattice`            | `rows`, `cols`, `positions?`, `weights?`, `seed?`                                                                                   | The triangular lattice as a triangulated rows x cols grid                                             |
| `watts-strogatz`                | `n`, `k`, `beta`, `seed?`, `weights?`                                                                                               | The Watts-Strogatz small world                                                                        |
| `waxman`                        | `n`, `alpha`, `beta`, `seed?`, `weights?`                                                                                           | The Waxman graph                                                                                      |
| `wheel`                         | `n`, `weights?`, `seed?`                                                                                                            | The wheel W_n                                                                                         |
| `wilson-maze`                   | `rows`, `cols`, `seed?`, `weights?`                                                                                                 | A uniform spanning tree of the rows x cols grid, a perfect maze, by Wilson's algorithm                |

### Datasets

`cy.graphtyDataset(name)`. The bundled ones ship inside the package and load without a network; the hosted
ones are downloaded from graphty.app. Each is the work of its authors, under its own license, not this
package's: cite the source when you publish results from one, and check the license before you redistribute it.

| Name                   | Nodes  | Edges   | Directed | Where   | License                                                                                                                                                                                                                                                                               | Source                                                                                                             |
| ---------------------- | ------ | ------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `karate`               | 34     | 78      | no       | bundled | Facts published in a 1977 journal article; converted from the networkx 3.1 copy (BSD-3-Clause).                                                                                                                                                                                       | <https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py>                   |
| `florentine-families`  | 15     | 20      | no       | bundled | Facts published in the cited articles; converted from the networkx 3.1 copy (BSD-3-Clause).                                                                                                                                                                                           | <https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py>                   |
| `davis-southern-women` | 32     | 89      | no       | bundled | Facts published in a 1941 book; converted from the networkx 3.1 copy (BSD-3-Clause).                                                                                                                                                                                                  | <https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py>                   |
| `les-miserables`       | 77     | 254     | no       | bundled | Derived from the Stanford GraphBase file jean.dat (copyright D. E. Knuth; may be freely copied and distributed, and a changed file must be renamed and identified as not part of the Stanford GraphBase -- this is such a changed file) through the networkx 3.1 copy (BSD-3-Clause). | <https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py>                   |
| `football`             | 115    | 613     | no       | bundled | CC BY 4.0 (the figshare record of T. S. Evans).                                                                                                                                                                                                                                       | <https://figshare.com/articles/dataset/American_College_Football_Network_Files/93179>                              |
| `political-books`      | 105    | 441     | no       | bundled | unclear: Mark Newman's data page says only "free for scientific use to the best of my knowledge"; the SuiteSparse Matrix Collection republishes the graph under CC BY 4.0.                                                                                                            | <https://web.archive.org/web/20240730210010id_/https://public.websites.umich.edu/~mejn/netdata/polbooks.zip>       |
| `dolphins`             | 62     | 159     | no       | bundled | unclear: posted on Mark Newman's data page with the permission of D. Lusseau, "free for scientific use"; the SuiteSparse Matrix Collection republishes the graph under CC BY 4.0.                                                                                                     | <https://web.archive.org/web/20231115052843id_/https://www-personal.umich.edu/~mejn/netdata/dolphins.zip>          |
| `contiguous-usa`       | 49     | 107     | no       | bundled | Public domain: works of the US federal government (17 U.S.C. 105). Borders derived from the Census county adjacency file; centres of population from https://www2.census.gov/geo/docs/reference/cenpop2020/CenPop2020_Mean_ST.txt                                                     | <https://www2.census.gov/geo/docs/reference/county_adjacency/county_adjacency2024.txt>                             |
| `knuth-miles`          | 128    | 8128    | no       | bundled | Derived from the Stanford GraphBase file miles.dat (copyright 1992 Stanford University; "may be freely copied but please do not change it in any way") -- this is a changed file, converted to a graph, and is not part of the Stanford GraphBase.                                    | <https://mirrors.ctan.org/support/graphbase/miles.dat>                                                             |
| `celegans-neural`      | 297    | 2345    | yes      | bundled | unclear: Mark Newman's data page says only "free for scientific use to the best of my knowledge"; the SuiteSparse Matrix Collection republishes the graph under CC BY 4.0.                                                                                                            | <https://web.archive.org/web/20231227004245id_/https://public.websites.umich.edu/~mejn/netdata/celegansneural.zip> |
| `political-blogs`      | 1490   | 19022   | yes      | bundled | unclear: posted on Mark Newman's data page with the authors' permission, "free for scientific use"; the SuiteSparse Matrix Collection republishes the graph under CC BY 4.0.                                                                                                          | <https://web.archive.org/web/20240730122800id_/https://public.websites.umich.edu/~mejn/netdata/polblogs.zip>       |
| `openflights`          | 3214   | 36906   | yes      | bundled | Open Database License (ODbL) 1.0, contents under the Database Contents License 1.0. This converted database is a derived database and is itself available under the ODbL 1.0.                                                                                                         | <https://github.com/jpatokal/openflights/tree/e3bc6dedbcceb8b7b74248a00dcd6207254da6bd/data>                       |
| `road-ny`              | 264346 | 733846  | yes      | hosted  | Public domain: derived from the US Census Bureau TIGER/Line files, a work of the US federal government; the challenge page states no further terms.                                                                                                                                   | <http://www.diag.uniroma1.it/challenge9/data/USA-road-d/USA-road-d.NY.gr.gz>                                       |
| `ogbn-arxiv`           | 169343 | 1166243 | yes      | hosted  | ODC-BY 1.0 (Open Data Commons Attribution License), as stated by the Open Graph Benchmark.                                                                                                                                                                                            | <http://snap.stanford.edu/ogb/data/nodeproppred/arxiv.zip>                                                         |
| `com-dblp`             | 317080 | 1049866 | no       | hosted  | unclear: SNAP states no license for its files; the underlying dblp data is CC0 1.0 (https://dblp.org/db/about/copyright.html).                                                                                                                                                        | <https://snap.stanford.edu/data/bigdata/communities/com-dblp.ungraph.txt.gz>                                       |

### File formats

| Format    | Import | Export |
| --------- | ------ | ------ |
| `gexf`    | yes    | yes    |
| `graphml` | yes    | yes    |
| `gml`     | yes    | yes    |
| `dot`     | yes    | yes    |
| `pajek`   | yes    | yes    |
| `csv`     | yes    | yes    |
| `json`    | yes    | yes    |
| `neo4j`   | yes    | yes    |
| `cx2`     | yes    | yes    |
| `cx`      | yes    | no     |
| `obo`     | yes    | no     |

Import also takes `"auto"`, the default, which detects the format from the content.

<!-- reference:end -->
