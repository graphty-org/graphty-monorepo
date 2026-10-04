# Generators, datasets and formats

`cytoscape.use(graphtyCytoscape)` adds four core methods for getting graphs in and out of Cytoscape:
`cy.graphtyGenerate(name, options)` builds a graph from one of 59 seeded generators, `cy.graphtyDataset(name, options)` adds
one of 15 sample datasets, `cy.graphtyImport(input)` reads a graph file and `cy.graphtyExport(format)` writes one.

The example below generates four planted communities, loads the karate club dataset, and sends that dataset through
GraphML and back.

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

// the same seed gives the same graph on every platform
const cy = cytoscape({ headless: true });
const generated = await cy.graphtyGenerate("planted-partition", {
    groups: 4,
    groupSize: 25,
    pIn: 0.3,
    pOut: 0.01,
    seed: 1,
});
console.log(generated.elements.nodes().length, generated.directed); // 100 false
console.log(cy.$id("0").data("community")); // 0

// karate comes with the package: it loads from where the package is served, not from graphty.app
const karate = cytoscape({ headless: true });
await karate.graphtyDataset("karate");
console.log(karate.nodes().length, karate.edges().length); // 34 78

const graphml = await karate.graphtyExport("graphml");
const copy = cytoscape({ headless: true });
const imported = await copy.graphtyImport(graphml); // the format defaults to "auto"
console.log(imported.format, copy.nodes().length); // graphml 34
```

## What the methods return

`graphtyGenerate` and `graphtyDataset` resolve to `{ elements, directed }`: the added nodes and edges as a
Cytoscape collection, and whether the graph is directed. `graphtyImport` adds `format` and `report`, and
`graphtyExport` resolves to the file's text. [Graphs in and out](../guide/graphs-in-and-out) explains each field,
how generated and imported data maps onto elements, and what each format keeps.

## Generators

`cy.graphtyGenerate(name, options)` builds the graph that `name` names, from the options in its table. Most
generators also take the two options in the first table. `weights` is one of `{ kind: "uniform", min, max }`
(a real number from `min` up to `max`, default 0 to 1), `{ kind: "integer", min, max }` (both ends included),
`{ kind: "exponential", mean }` (default mean 1), `{ kind: "euclidean" }` (the distance between the two ends, for the
generators that place nodes) or `{ kind: "column", column, combine }` (from a numeric node field of the generator).
`integer` needs both `min` and `max`. `combine` turns the two ends' values into the weight: `"sum"` (the default),
`"mean"`, `"product"`, `"min"`, `"max"`, `"difference"` (the absolute difference), `"source"` or `"target"`.
The weights land in each edge's `data("weight")`.

Each node's id is `"0"`, `"1"`, ..., and edge k's id is `"e<k>"`, so the same options and seed give the same
elements. A generator's grouping (`community`, `side`, `part`, ...) becomes a node data field. The geometric
generators, and the lattices with `positions: true`, give each node a position in the generator's own units, which are
small (a lattice's neighbors are 1 apart). Spread them with `cy.layout({ name: "preset", spacingFactor: 50 }).run()`,
or run another layout.

<!-- generated:generators:begin (by scripts/reference.ts; run npm run docs:reference) -->

| Option    | Type         | Default | Meaning                                                                                                                                                                                      |
| --------- | ------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `weights` | `WeightSpec` |         | Give every edge a weight from this distribution; absent means unweighted.                                                                                                                    |
| `seed`    | `number`     | `0`     | The seed of the weight draws, an integer in [0, 2^53). Random generators share it with their structure (the weights use their own stream domain, so adding weights never changes the edges). |

### `ak`

The AK network of B. V. Cherkassky and A. V. Goldberg, a max-flow test graph.

| Option | Type     | Default  | Meaning                                                           |
| ------ | -------- | -------- | ----------------------------------------------------------------- |
| `k`    | `number` | required | The size parameter, in [1, 499998]: 4k + 6 nodes and 6k + 7 arcs. |

### `balanced-tree`

A tree in which every node above the bottom level has `branching` children, `height` levels below the root. Also takes `seed` and `weights`.

| Option      | Type     | Default  | Meaning                |
| ----------- | -------- | -------- | ---------------------- |
| `branching` | `number` | required | Children per node.     |
| `height`    | `number` | required | Levels below the root. |

### `barabasi-albert`

A scale-free graph grown one node at a time: each new node links to `m` existing nodes, preferring those of high degree. Also takes `seed` and `weights`.

| Option             | Type     | Default  | Meaning                                                                                                                                                                                                 |
| ------------------ | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `n`                | `number` | required | The node count, > m.                                                                                                                                                                                    |
| `m`                | `number` | required | The number of edges each new node brings, >= 1.                                                                                                                                                         |
| `triadProbability` | `number` |          | Holme-Kim: after each preferential edge, the probability that the next of the node's m edges closes a triangle with a neighbor of that edge's target instead. 0 (the default) is plain Barabasi-Albert. |

### `barbell`

Two cliques of `cliqueSize` nodes joined by a path of `pathLength` nodes. Also takes `seed` and `weights`.

| Option       | Type     | Default  | Meaning                                |
| ------------ | -------- | -------- | -------------------------------------- |
| `cliqueSize` | `number` | required | Nodes in each of the two cliques.      |
| `pathLength` | `number` | required | Nodes on the path between the cliques. |

### `bianconi-barabasi`

Like `barabasi-albert`, but a new node prefers existing nodes of high degree times `fitness`, so a fit late node can overtake early ones. Also takes `seed` and `weights`.

| Option    | Type                | Default                                    | Meaning                                         |
| --------- | ------------------- | ------------------------------------------ | ----------------------------------------------- |
| `n`       | `number`            | required                                   | The node count, > m.                            |
| `m`       | `number`            | required                                   | The number of edges each new node brings, >= 1. |
| `fitness` | `ArrayLike<number>` | random, uniform in (0, 1], fixed by `seed` | Each node's fitness, n finite positive values.  |

### `bipartite-configuration-model`

A random bipartite graph whose two sides have the degrees in `leftDegrees` and `rightDegrees`. Also takes `seed` and `weights`.

| Option         | Type                | Default   | Meaning                                                                         |
| -------------- | ------------------- | --------- | ------------------------------------------------------------------------------- |
| `leftDegrees`  | `ArrayLike<number>` | required  | The degree of every left node (nodes 0 .. L - 1).                               |
| `rightDegrees` | `ArrayLike<number>` | required  | The degree of every right node (nodes L .. L + R - 1); same sum as leftDegrees. |
| `multiEdges`   | `"keep" \| "erase"` | `"erase"` | Keep or erase repeated pairs (the first occurrence stays).                      |

### `caveman`

`cliques` separate cliques of `size` nodes, with no edges between them. Also takes `seed` and `weights`.

| Option    | Type     | Default  | Meaning                                    |
| --------- | -------- | -------- | ------------------------------------------ |
| `cliques` | `number` | required | Number of cliques, none joined to another. |
| `size`    | `number` | required | Nodes per clique.                          |

### `chung-lu`

A random graph in which each node's expected degree is its entry in `expectedDegrees`. Also takes `seed` and `weights`.

| Option            | Type                | Default  | Meaning                                                      |
| ----------------- | ------------------- | -------- | ------------------------------------------------------------ |
| `expectedDegrees` | `ArrayLike<number>` | required | The expected degree (weight) of every node, finite and >= 0. |

### `circular-ladder`

The circular ladder CL_n (the n-prism). Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning                        |
| ------ | -------- | -------- | ------------------------------ |
| `n`    | `number` | required | Rungs; the graph has 2n nodes. |

### `complete`

The complete graph K_n. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning |
| ------ | -------- | -------- | ------- |
| `n`    | `number` | required | Nodes.  |

### `complete-bipartite`

The complete bipartite graph K\_{a,b}. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning                                            |
| ------ | -------- | -------- | -------------------------------------------------- |
| `a`    | `number` | required | Nodes on the first side; their `side` field is 0.  |
| `b`    | `number` | required | Nodes on the second side; their `side` field is 1. |

### `complete-multipartite`

The complete multipartite graph K\_{s0, s1, ...}. Also takes `seed` and `weights`.

| Option  | Type                | Default  | Meaning                                                 |
| ------- | ------------------- | -------- | ------------------------------------------------------- |
| `sizes` | `readonly number[]` | required | Nodes in each part; the `part` field numbers the parts. |

### `configuration-model`

A random graph whose nodes have the degrees in `degrees`, before any self-loops and repeated edges are erased. Also takes `seed` and `weights`.

| Option       | Type                | Default   | Meaning                                                                  |
| ------------ | ------------------- | --------- | ------------------------------------------------------------------------ |
| `degrees`    | `ArrayLike<number>` | required  | The degree of every node; the sum must be even.                          |
| `selfLoops`  | `"keep" \| "erase"` | `"erase"` | Keep or erase self-loops.                                                |
| `multiEdges` | `"keep" \| "erase"` | `"erase"` | Keep or erase repeated pairs (the first occurrence in edge order stays). |

### `connected-caveman`

`cliques` cliques of `size` nodes joined into a ring: in each clique one edge is moved to reach the previous clique. Also takes `seed` and `weights`.

| Option    | Type     | Default  | Meaning                              |
| --------- | -------- | -------- | ------------------------------------ |
| `cliques` | `number` | required | Number of cliques, joined in a ring. |
| `size`    | `number` | required | Nodes per clique.                    |

### `cycle`

The cycle C_n. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning |
| ------ | -------- | -------- | ------- |
| `n`    | `number` | required | Nodes.  |

### `degree-corrected-sbm`

Blocks of nodes (`sizes`) whose degrees follow `expectedDegrees`, with a `mixing` share of each node's edges leaving its block. Also takes `seed` and `weights`.

| Option            | Type                | Default  | Meaning                                                                                 |
| ----------------- | ------------------- | -------- | --------------------------------------------------------------------------------------- |
| `sizes`           | `readonly number[]` | required | The size of every block; block b holds the next `sizes[b]` node indices.                |
| `expectedDegrees` | `ArrayLike<number>` | required | The target degree of every node, finite and >= 0; length = the sum of sizes.            |
| `mixing`          | `number`            | required | The mixing parameter mu in [0, 1]: the share of each node's edges that leave its block. |

### `directed-configuration-model`

A random directed graph whose nodes have the out- and in-degrees in `outDegrees` and `inDegrees`. Also takes `seed` and `weights`.

| Option       | Type                | Default   | Meaning                                                              |
| ------------ | ------------------- | --------- | -------------------------------------------------------------------- |
| `outDegrees` | `ArrayLike<number>` | required  | The out-degree of every node.                                        |
| `inDegrees`  | `ArrayLike<number>` | required  | The in-degree of every node; same length and same sum as outDegrees. |
| `selfLoops`  | `"keep" \| "erase"` | `"erase"` | Keep or erase self-loops.                                            |
| `multiEdges` | `"keep" \| "erase"` | `"erase"` | Keep or erase repeated ordered pairs (the first occurrence stays).   |

### `duplication-divergence`

A graph grown by copying a random node and keeping each of its edges with probability `retention`, a model of protein interaction networks. Also takes `seed` and `weights`.

| Option      | Type     | Default  | Meaning                                                                         |
| ----------- | -------- | -------- | ------------------------------------------------------------------------------- |
| `n`         | `number` | required | The node count, >= 2.                                                           |
| `retention` | `number` | required | The probability that a duplicate keeps each of the original's edges, in (0, 1]. |

### `empty`

`n` nodes and no edges. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning |
| ------ | -------- | -------- | ------- |
| `n`    | `number` | required | Nodes.  |

### `erdos-renyi`

`n` nodes, each of the possible edges present with probability `p`, independently. Also takes `seed` and `weights`.

| Option     | Type      | Default                 | Meaning                                                                                  |
| ---------- | --------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| `n`        | `number`  | required                | The node count, >= 0.                                                                    |
| `p`        | `number`  | required                | The probability of each pair, in [0, 1].                                                 |
| `directed` | `boolean` | false (unordered pairs) | Directed: every ordered pair (u, v), u != v, is an arc independently with probability p. |

### `erdos-renyi-gnm`

`n` nodes and exactly `m` edges, chosen uniformly at random. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning                                |
| ------ | -------- | -------- | -------------------------------------- |
| `n`    | `number` | required | The node count, >= 0.                  |
| `m`    | `number` | required | The edge count, in [0, n (n - 1) / 2]. |

### `forest-fire`

A directed graph grown one node at a time: each new node picks a random node, spreads from it through its neighbors as a fire would, and links to every node reached. Also takes `seed` and `weights`.

| Option     | Type     | Default  | Meaning                                                                                  |
| ---------- | -------- | -------- | ---------------------------------------------------------------------------------------- |
| `n`        | `number` | required | The node count, >= 1.                                                                    |
| `forward`  | `number` | required | The forward burning probability p, in [0, 1).                                            |
| `backward` | `number` | required | The backward burning ratio r >= 0; the backward burning probability r p must be below 1. |
| `maxBurn`  | `number` | `1000`   | The most nodes one new node may burn (and link to), >= 1.                                |

### `genrmf`

GENRMF, the max-flow family of D. Goldfarb and M. D. Grigoriadis. Also takes `seed`.

| Option | Type     | Default  | Meaning                                                                                  |
| ------ | -------- | -------- | ---------------------------------------------------------------------------------------- |
| `a`    | `number` | required | The side of every frame (an a x a grid), >= 1.                                           |
| `b`    | `number` | required | The number of frames, >= 1.                                                              |
| `c1`   | `number` | required | The smallest capacity between frames, an integer >= 0.                                   |
| `c2`   | `number` | required | The largest capacity between frames, an integer >= c1; arcs inside a frame carry c2 a^2. |

### `grid`

The rows x cols grid. Also takes `seed` and `weights`.

| Option      | Type      | Default  | Meaning                                                                                                                                                                        |
| ----------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `directed`  | `boolean` |          | Emit each edge once as an arc from the lower index to the higher: a DAG whose only source is node 0 and only sink node n - 1. Not with `periodic`.                             |
| `rows`      | `number`  | required | The number of rows, >= 1.                                                                                                                                                      |
| `cols`      | `number`  | required | The number of columns, >= 1.                                                                                                                                                   |
| `periodic`  | `boolean` |          | Wrap around (a torus): the last node of each row, column and layer is joined to the first. A dimension shorter than 3 does not wrap, so the graph stays simple.                |
| `diagonals` | `boolean` |          | Join diagonal neighbors too: the king's graph (8 neighbors) in 2D, the 26-neighbor lattice in 3D.                                                                              |
| `obstacles` | `number`  |          | Block each node independently with this probability, in [0, 1): a blocked node keeps its index (and position) but has no edges, and the u8 node column `blocked` marks it (1). |
| `positions` | `boolean` |          | Give each node its place on the lattice, in lattice units: x and y become the node's position, and on `grid-3d` z becomes a data field.                                        |

### `grid-3d`

The rows x cols x layers grid. Also takes `seed` and `weights`.

| Option      | Type      | Default  | Meaning                                                                                                                                                                        |
| ----------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rows`      | `number`  | required | The number of rows, >= 1.                                                                                                                                                      |
| `cols`      | `number`  | required | The number of columns, >= 1.                                                                                                                                                   |
| `layers`    | `number`  | required | The number of layers, >= 1.                                                                                                                                                    |
| `periodic`  | `boolean` |          | Wrap around (a torus): the last node of each row, column and layer is joined to the first. A dimension shorter than 3 does not wrap, so the graph stays simple.                |
| `diagonals` | `boolean` |          | Join diagonal neighbors too: the king's graph (8 neighbors) in 2D, the 26-neighbor lattice in 3D.                                                                              |
| `directed`  | `boolean` |          | Emit each edge once as an arc from the lower index to the higher: a DAG whose only source is node 0 and only sink node n - 1. Not with `periodic`.                             |
| `obstacles` | `number`  |          | Block each node independently with this probability, in [0, 1): a blocked node keeps its index (and position) but has no edges, and the u8 node column `blocked` marks it (1). |
| `positions` | `boolean` |          | Give each node its place on the lattice, in lattice units: x and y become the node's position, and on `grid-3d` z becomes a data field.                                        |

### `grid-flow-network`

A grid flow network, the shape of graph-cut image segmentation. Also takes `seed`.

| Option        | Type     | Default  | Meaning                                              |
| ------------- | -------- | -------- | ---------------------------------------------------- |
| `rows`        | `number` | required | The grid's row count, >= 1.                          |
| `cols`        | `number` | required | The grid's column count, >= 2.                       |
| `minCapacity` | `number` | `1`      | The smallest arc capacity, an integer >= 0.          |
| `maxCapacity` | `number` | `10`     | The largest arc capacity, an integer >= minCapacity. |

### `hexagonal-lattice`

The hexagonal (honeycomb) lattice in its brick-wall form. Also takes `seed` and `weights`.

| Option      | Type      | Default  | Meaning                                                                                                                                 |
| ----------- | --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `rows`      | `number`  | required | The number of rows, >= 1.                                                                                                               |
| `cols`      | `number`  | required | The number of columns, >= 1.                                                                                                            |
| `positions` | `boolean` |          | Give each node its place on the lattice, in lattice units: x and y become the node's position, and on `grid-3d` z becomes a data field. |

### `hyperbolic`

Random points in a hyperbolic disk, joined when close: degrees follow a power law (`exponent`) and neighbors share many neighbors. Also takes `seed` and `weights`.

| Option          | Type     | Default  | Meaning                                                                                         |
| --------------- | -------- | -------- | ----------------------------------------------------------------------------------------------- |
| `n`             | `number` | required | The node count, in [0, 20000].                                                                  |
| `averageDegree` | `number` | required | The target mean degree, a finite number > 0; the mean degree you get is close to it, not equal. |
| `exponent`      | `number` | required | The power-law exponent gamma of the degree distribution, a finite number > 2.                   |
| `temperature`   | `number` | `0`      | The temperature T in [0, 1); 0 (default) is the threshold model, higher T lowers clustering.    |

### `hypercube`

The hypercube Q_d. Also takes `seed` and `weights`.

| Option      | Type     | Default  | Meaning                                   |
| ----------- | -------- | -------- | ----------------------------------------- |
| `dimension` | `number` | required | The dimension d; the graph has 2^d nodes. |

### `knn`

The k-nearest-neighbor graph of random points, the standard input of spectral clustering. Also takes `seed` and `weights`.

| Option      | Type      | Default        | Meaning                                                                                       |
| ----------- | --------- | -------------- | --------------------------------------------------------------------------------------------- |
| `n`         | `number`  | required       | The node count, >= 0.                                                                         |
| `k`         | `number`  | required       | The neighbors per node, in [0, n - 1].                                                        |
| `dimension` | `2 \| 3`  | `2`            | 2 (default) or 3.                                                                             |
| `directed`  | `boolean` | `true`         | Arcs u -> each of u's k nearest, or with false the undirected union without duplicates.       |
| `clusters`  | `number`  | uniform points | Draw the points from a mixture of this many Gaussian clusters, >= 1.                          |
| `spread`    | `number`  | `0.05`         | The standard deviation of every cluster on each axis, a finite number >= 0. Needs `clusters`. |

### `kronecker`

A random graph of k^`power` nodes drawn by nesting the k x k `initiator` matrix inside itself, with heavy-tailed degrees. Also takes `seed` and `weights`.

| Option       | Type                             | Default                             | Meaning                                                                                                                                                  |
| ------------ | -------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `initiator`  | `readonly (readonly number[])[]` | required                            | The k x k initiator matrix, k >= 1, entries in [0, 1].                                                                                                   |
| `power`      | `number`                         | required                            | The Kronecker power, in [1, 64]; the graph has k^power nodes.                                                                                            |
| `edges`      | `number`                         | round((sum of the initiator)^power) | The number of edges to sample.                                                                                                                           |
| `selfLoops`  | `"keep" \| "erase"`              |                                     | Self-loops: "keep" (the default) or "erase" them.                                                                                                        |
| `multiEdges` | `"keep" \| "erase"`              |                                     | Repeated pairs: "keep" (the default) or "erase" all but the first occurrence in edge order. For an undirected graph (u, v) and (v, u) are the same pair. |
| `permute`    | `boolean`                        | `false`                             | Relabel the nodes by a uniformly random permutation, as Graph500 does.                                                                                   |
| `directed`   | `boolean`                        | `true`                              | Whether the graph is directed.                                                                                                                           |

### `ladder`

The ladder L_n. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning                        |
| ------ | -------- | -------- | ------------------------------ |
| `n`    | `number` | required | Rungs; the graph has 2n nodes. |

### `layered-flow-network`

A random layered flow network. Also takes `seed`.

| Option        | Type                | Default  | Meaning                                                                                     |
| ------------- | ------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `layers`      | `readonly number[]` | required | The width of every inner layer, >= 1 each; layer i holds the next `layers[i]` node indices. |
| `p`           | `number`            | required | The probability of each arc from a node to a node of the next layer.                        |
| `minCapacity` | `number`            | `1`      | The smallest arc capacity, an integer >= 0.                                                 |
| `maxCapacity` | `number`            | `10`     | The largest arc capacity, an integer >= minCapacity.                                        |

### `lfr`

A graph with planted communities whose degrees and community sizes follow power laws, used to test community detection; `mixing` is the share of each node's edges that leave its community. Also takes `seed` and `weights`.

| Option              | Type     | Default  | Meaning                                                                                     |
| ------------------- | -------- | -------- | ------------------------------------------------------------------------------------------- |
| `n`                 | `number` | required | The node count, in [1, 1,000,000].                                                          |
| `minDegree`         | `number` | required | The smallest degree, >= 1.                                                                  |
| `maxDegree`         | `number` | required | The largest degree, in [minDegree, n - 1].                                                  |
| `degreeExponent`    | `number` | required | The degree power-law exponent (tau1), a finite number >= 0, typically 2 to 3.               |
| `minCommunity`      | `number` | required | The smallest community, >= 1.                                                               |
| `maxCommunity`      | `number` | required | The largest community, in [minCommunity, n].                                                |
| `communityExponent` | `number` | required | The community-size power-law exponent (tau2), a finite number >= 0, typically 1 to 2.       |
| `mixing`            | `number` | required | The mixing parameter mu in [0, 1]: the share of each node's edges that leave its community. |

### `lollipop`

A clique of `cliqueSize` nodes with a path of `pathLength` nodes hanging off it. Also takes `seed` and `weights`.

| Option       | Type     | Default  | Meaning              |
| ------------ | -------- | -------- | -------------------- |
| `cliqueSize` | `number` | required | Nodes in the clique. |
| `pathLength` | `number` | required | Nodes on the tail.   |

### `mobius-ladder`

The Moebius ladder M\_{2n}. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning                        |
| ------ | -------- | -------- | ------------------------------ |
| `n`    | `number` | required | Rungs; the graph has 2n nodes. |

### `named`

A named graph from the literature, chosen by `name`. Also takes `seed` and `weights`.

| Option | Type                                                                                                                                                                                                                                                                                                                                          | Default  | Meaning      |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| `name` | `"bull" \| "chvatal" \| "cubical" \| "desargues" \| "diamond" \| "dodecahedral" \| "frucht" \| "heawood" \| "hoffman-singleton" \| "house" \| "house-x" \| "icosahedral" \| "krackhardt-kite" \| "moebius-kantor" \| "octahedral" \| "pappus" \| "sedgewick-maze" \| "tetrahedral" \| "truncated-cube" \| "truncated-tetrahedron" \| "tutte"` | required | Which graph. |

### `newman-watts`

A ring in which each node links to its `k` nearest neighbors, plus random shortcuts, one per ring edge with probability `p`. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning                                                 |
| ------ | -------- | -------- | ------------------------------------------------------- |
| `n`    | `number` | required | The node count, > k.                                    |
| `k`    | `number` | required | Each node's ring neighbors, even, >= 2.                 |
| `p`    | `number` | required | The probability of a shortcut per ring edge, in [0, 1]. |

### `path`

The path P_n. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning |
| ------ | -------- | -------- | ------- |
| `n`    | `number` | required | Nodes.  |

### `petersen`

The Petersen graph: 10 nodes and 15 edges, every node of degree 3. Also takes `seed` and `weights`.

No options of its own.

### `planted-partition`

`groups` groups of `groupSize` nodes: two nodes are joined with probability `pIn` inside a group and `pOut` across groups. Also takes `seed` and `weights`.

| Option      | Type     | Default  | Meaning                              |
| ----------- | -------- | -------- | ------------------------------------ |
| `groups`    | `number` | required | The number of groups, >= 1.          |
| `groupSize` | `number` | required | The size of every group, >= 1.       |
| `pIn`       | `number` | required | The edge probability inside a group. |
| `pOut`      | `number` | required | The edge probability between groups. |

### `price`

A directed citation network: each new node cites `citations` earlier nodes, preferring those already cited often. Also takes `seed` and `weights`.

| Option           | Type     | Default  | Meaning                                                                          |
| ---------------- | -------- | -------- | -------------------------------------------------------------------------------- |
| `n`              | `number` | required | The node count, >= 1.                                                            |
| `citations`      | `number` | required | The number of earlier nodes each new node cites, >= 1 (fewer while fewer exist). |
| `attractiveness` | `number` | `1`      | The attractiveness a > 0 added to every in-degree.                               |

### `random-apollonian`

A planar graph built by placing each new node inside a random triangle and joining it to the triangle's three corners. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning               |
| ------ | -------- | -------- | --------------------- |
| `n`    | `number` | required | The node count, >= 3. |

### `random-bipartite`

Two sides of `n1` and `n2` nodes, each pair across the sides joined with probability `p`. Also takes `seed` and `weights`.

| Option            | Type      | Default  | Meaning                                                                                                                                                                     |
| ----------------- | --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `n1`              | `number`  | required | The left side's size, >= 0.                                                                                                                                                 |
| `n2`              | `number`  | required | The right side's size, >= 0.                                                                                                                                                |
| `p`               | `number`  | required | The probability of each left-right pair, in [0, 1].                                                                                                                         |
| `perfectMatching` | `boolean` |          | Plant a perfect matching: left node i is always joined to right node `matching[i]` of a uniformly random permutation, so a perfect matching is guaranteed. Needs n1 === n2. |

### `random-dag`

A directed acyclic graph in `layers`: each node links to each node of the next layer with probability `p`. Also takes `seed` and `weights`.

| Option   | Type                | Default  | Meaning                                                                                   |
| -------- | ------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `layers` | `readonly number[]` | required | The width of every layer, top to bottom; layer i holds the next `layers[i]` node indices. |
| `p`      | `number`            | required | The probability of each arc from a node to a node of the next layer.                      |

### `random-geometric`

`n` random points in the unit square (or cube), joined when they are at most `radius` apart. Also takes `seed` and `weights`.

| Option      | Type      | Default  | Meaning                                                                                          |
| ----------- | --------- | -------- | ------------------------------------------------------------------------------------------------ |
| `n`         | `number`  | required | The node count, >= 0.                                                                            |
| `radius`    | `number`  | required | The connection radius, a finite number >= 0: u and v are joined iff their distance is <= radius. |
| `dimension` | `2 \| 3`  |          | 2 (the unit square, default) or 3 (the unit cube).                                               |
| `periodic`  | `boolean` | `false`  | Measure distance on the torus (each axis wraps around), removing the boundary effect.            |

### `random-order-dag`

A directed acyclic graph on `n` nodes: each arc i -> j with i < j is present with probability `p`. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning                                               |
| ------ | -------- | -------- | ----------------------------------------------------- |
| `n`    | `number` | required | The node count, >= 0.                                 |
| `p`    | `number` | required | The probability of each arc i -> j, i < j, in [0, 1]. |

### `random-recursive-tree`

A tree grown one node at a time, each new node joined to an earlier node chosen at random. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning               |
| ------ | -------- | -------- | --------------------- |
| `n`    | `number` | required | The node count, >= 1. |

### `random-regular`

A uniformly-ish random d-regular simple graph by the pairing algorithm of A. Steger and N. C. Wormald. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning                                                    |
| ------ | -------- | -------- | ---------------------------------------------------------- |
| `n`    | `number` | required | The node count, >= 0.                                      |
| `d`    | `number` | required | The degree of every node, in [0, n - 1]; n d must be even. |

### `random-tree`

A uniformly random labelled tree. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning               |
| ------ | -------- | -------- | --------------------- |
| `n`    | `number` | required | The node count, >= 1. |

### `ring-of-cliques`

`cliques` cliques of `size` nodes joined in a ring, one edge between each clique and the next. Also takes `seed` and `weights`.

| Option    | Type     | Default  | Meaning                                               |
| --------- | -------- | -------- | ----------------------------------------------------- |
| `cliques` | `number` | required | Number of cliques, joined in a ring by one edge each. |
| `size`    | `number` | required | Nodes per clique.                                     |

### `rmat`

A random directed graph of 2^`scale` nodes with heavy-tailed degrees, the Graph500 benchmark generator. Also takes `seed` and `weights`.

| Option       | Type                | Default         | Meaning                                                                                                                                                  |
| ------------ | ------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scale`      | `number`            | required        | log2 of the node count, in [0, 31].                                                                                                                      |
| `edgeFactor` | `number`            | 16 (Graph500)   | Edges per node, an integer >= 0.                                                                                                                         |
| `a`          | `number`            | 0.57 (Graph500) | The top-left quadrant probability.                                                                                                                       |
| `b`          | `number`            | `0.19`          | The top-right quadrant probability.                                                                                                                      |
| `c`          | `number`            | `0.19`          | The bottom-left quadrant probability.                                                                                                                    |
| `d`          | `number`            | `0.05`          | The bottom-right quadrant probability. a + b + c + d must be 1.                                                                                          |
| `selfLoops`  | `"keep" \| "erase"` |                 | Self-loops: "keep" (the default) or "erase" them.                                                                                                        |
| `multiEdges` | `"keep" \| "erase"` |                 | Repeated pairs: "keep" (the default) or "erase" all but the first occurrence in edge order. For an undirected graph (u, v) and (v, u) are the same pair. |
| `permute`    | `boolean`           | `false`         | Relabel the nodes by a uniformly random permutation, as Graph500 does.                                                                                   |
| `directed`   | `boolean`           | `true`          | Whether the graph is directed.                                                                                                                           |

### `star`

A hub joined to `n - 1` leaves. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning                  |
| ------ | -------- | -------- | ------------------------ |
| `n`    | `number` | required | Nodes, the hub included. |

### `stochastic-block-model`

Blocks of nodes (`sizes`): two nodes are joined with the probability `probabilities` gives for their two blocks. Also takes `seed` and `weights`.

| Option          | Type                             | Default  | Meaning                                                                  |
| --------------- | -------------------------------- | -------- | ------------------------------------------------------------------------ |
| `sizes`         | `readonly number[]`              | required | The size of every block; block b holds the next `sizes[b]` node indices. |
| `probabilities` | `readonly (readonly number[])[]` | required | The symmetric B x B matrix of edge probabilities between blocks.         |

### `triangular-lattice`

The triangular lattice as a triangulated rows x cols grid. Also takes `seed` and `weights`.

| Option      | Type      | Default  | Meaning                                                                                                                                 |
| ----------- | --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `rows`      | `number`  | required | The number of rows, >= 1.                                                                                                               |
| `cols`      | `number`  | required | The number of columns, >= 1.                                                                                                            |
| `positions` | `boolean` |          | Give each node its place on the lattice, in lattice units: x and y become the node's position, and on `grid-3d` z becomes a data field. |

### `watts-strogatz`

A small world: a ring in which each node links to its `k` nearest neighbors, each edge then moved to a random node with probability `beta`. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning                                                 |
| ------ | -------- | -------- | ------------------------------------------------------- |
| `n`    | `number` | required | The node count, > k.                                    |
| `k`    | `number` | required | Each node's ring neighbors before rewiring, even, >= 2. |
| `beta` | `number` | required | The rewiring probability of each edge, in [0, 1].       |

### `waxman`

`n` random points in the unit square, each pair joined with probability `beta` at distance 0, falling as they get farther apart. Also takes `seed` and `weights`.

| Option  | Type     | Default  | Meaning                                                                          |
| ------- | -------- | -------- | -------------------------------------------------------------------------------- |
| `n`     | `number` | required | The node count, >= 0; beta n^2 / 2 must stay below 5e8.                          |
| `alpha` | `number` | required | The distance scale, a finite number > 0: larger alpha makes long edges likelier. |
| `beta`  | `number` | required | The edge probability at distance 0, in [0, 1].                                   |

### `wheel`

A cycle of `n - 1` nodes, each also joined to a hub. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning                  |
| ------ | -------- | -------- | ------------------------ |
| `n`    | `number` | required | Nodes, the hub included. |

### `wilson-maze`

A uniform spanning tree of the rows x cols grid, a perfect maze, by Wilson's algorithm. Also takes `seed` and `weights`.

| Option | Type     | Default  | Meaning                      |
| ------ | -------- | -------- | ---------------------------- |
| `rows` | `number` | required | The number of rows, >= 1.    |
| `cols` | `number` | required | The number of columns, >= 1. |

<!-- generated:generators:end -->

## Datasets

`cy.graphtyDataset(name, options)` adds one of these. A bundled dataset comes with the package as a file of its own. In
Node it is read from disk. In a browser it is fetched on first use from the same place as the package (your server,
your bundle or the CDN). With the package from a CDN, a page opened from `file://` works; with the package on your
own disk, serve the page over HTTP. A hosted dataset is downloaded from `<baseUrl>/<name>.gsnp.gz` on first use.
When the server answers with an error status, the call rejects with a plain `Error` (no `name` or `code` of its
own) whose message is `fetching <url> failed: HTTP <status>`, for example `HTTP 404`. A network failure rejects with
the error `fetch` threw.

| Option    | Type           | Default                                        | Meaning                                                                                                                                                                                                                                                      |
| --------- | -------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `baseUrl` | `string`       | `"https://graphty.app/data/graph-samples/v1/"` | Where hosted datasets are fetched from, for a mirror of your own. A trailing slash is optional. Without a `baseUrl` of your own, a name that is not in the list below rejects with a `RangeError` naming the closest dataset; with one, any name is fetched. |
| `fetch`   | `typeof fetch` | the global `fetch`                             | The fetch function hosted datasets are downloaded with.                                                                                                                                                                                                      |
| `signal`  | `AbortSignal`  |                                                | Cancels the load: once it is aborted the call rejects with an `AbortError` and adds nothing, for a bundled dataset too.                                                                                                                                      |

Each dataset's fields are node data fields, and `weight` is an edge data field. Nodes have no position: the
latitude and longitude of the geographic datasets are data fields, so place the nodes with a `preset` layout or run
another layout.

Each dataset is the work of its authors and carries its own license, not this package's. Cite the source when you
publish results from one, and check the license before you redistribute it.

<!-- generated:datasets:begin (by scripts/reference.ts; run npm run docs:reference) -->

| Name                   | Nodes  | Edges   | Directed | Data fields                                                                 | Where   | License                                                                                                                                                                                                                                                                               | Source                                                                                                             |
| ---------------------- | ------ | ------- | -------- | --------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `karate`               | 34     | 78      | no       | nodes: `club`; edges: `weight`                                              | bundled | Facts published in a 1977 journal article; converted from the networkx 3.1 copy (BSD-3-Clause).                                                                                                                                                                                       | <https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py>                   |
| `florentine-families`  | 15     | 20      | no       | none                                                                        | bundled | Facts published in the cited articles; converted from the networkx 3.1 copy (BSD-3-Clause).                                                                                                                                                                                           | <https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py>                   |
| `davis-southern-women` | 32     | 89      | no       | nodes: `side`                                                               | bundled | Facts published in a 1941 book; converted from the networkx 3.1 copy (BSD-3-Clause).                                                                                                                                                                                                  | <https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py>                   |
| `les-miserables`       | 77     | 254     | no       | edges: `weight`                                                             | bundled | Derived from the Stanford GraphBase file jean.dat (copyright D. E. Knuth; may be freely copied and distributed, and a changed file must be renamed and identified as not part of the Stanford GraphBase -- this is such a changed file) through the networkx 3.1 copy (BSD-3-Clause). | <https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py>                   |
| `football`             | 115    | 613     | no       | nodes: `label`, `conference`                                                | bundled | CC BY 4.0 (the figshare record of T. S. Evans).                                                                                                                                                                                                                                       | <https://figshare.com/articles/dataset/American_College_Football_Network_Files/93179>                              |
| `political-books`      | 105    | 441     | no       | nodes: `label`, `lean`                                                      | bundled | unclear: Mark Newman's data page says only "free for scientific use to the best of my knowledge"; the SuiteSparse Matrix Collection republishes the graph under CC BY 4.0.                                                                                                            | <https://web.archive.org/web/20240730210010id_/https://public.websites.umich.edu/~mejn/netdata/polbooks.zip>       |
| `dolphins`             | 62     | 159     | no       | nodes: `label`                                                              | bundled | unclear: posted on Mark Newman's data page with the permission of D. Lusseau, "free for scientific use"; the SuiteSparse Matrix Collection republishes the graph under CC BY 4.0.                                                                                                     | <https://web.archive.org/web/20231115052843id_/https://www-personal.umich.edu/~mejn/netdata/dolphins.zip>          |
| `contiguous-usa`       | 49     | 107     | no       | nodes: `label`, `latitude`, `longitude`, `population`                       | bundled | Public domain: works of the US federal government (17 U.S.C. 105). Borders derived from the Census county adjacency file; centers of population from https://www2.census.gov/geo/docs/reference/cenpop2020/CenPop2020_Mean_ST.txt                                                     | <https://www2.census.gov/geo/docs/reference/county_adjacency/county_adjacency2024.txt>                             |
| `knuth-miles`          | 128    | 8128    | no       | nodes: `latitude`, `longitude`, `population`; edges: `weight`               | bundled | Derived from the Stanford GraphBase file miles.dat (copyright 1992 Stanford University; "may be freely copied but please do not change it in any way") -- this is a changed file, converted to a graph, and is not part of the Stanford GraphBase.                                    | <https://mirrors.ctan.org/support/graphbase/miles.dat>                                                             |
| `celegans-neural`      | 297    | 2345    | yes      | nodes: `label`; edges: `weight`                                             | bundled | unclear: Mark Newman's data page says only "free for scientific use to the best of my knowledge"; the SuiteSparse Matrix Collection republishes the graph under CC BY 4.0.                                                                                                            | <https://web.archive.org/web/20231227004245id_/https://public.websites.umich.edu/~mejn/netdata/celegansneural.zip> |
| `political-blogs`      | 1490   | 19022   | yes      | nodes: `label`, `lean`, `directory`                                         | bundled | unclear: posted on Mark Newman's data page with the authors' permission, "free for scientific use"; the SuiteSparse Matrix Collection republishes the graph under CC BY 4.0.                                                                                                          | <https://web.archive.org/web/20240730122800id_/https://public.websites.umich.edu/~mejn/netdata/polblogs.zip>       |
| `openflights`          | 3214   | 36906   | yes      | nodes: `label`, `city`, `country`, `latitude`, `longitude`; edges: `weight` | bundled | Open Database License (ODbL) 1.0, contents under the Database Contents License 1.0. This converted database is a derived database and is itself available under the ODbL 1.0.                                                                                                         | <https://github.com/jpatokal/openflights/tree/e3bc6dedbcceb8b7b74248a00dcd6207254da6bd/data>                       |
| `road-ny`              | 264346 | 733846  | yes      | nodes: `longitude`, `latitude`; edges: `weight`                             | hosted  | Public domain: derived from the US Census Bureau TIGER/Line files, a work of the US federal government; the challenge page states no further terms.                                                                                                                                   | <http://www.diag.uniroma1.it/challenge9/data/USA-road-d/USA-road-d.NY.gr.gz>                                       |
| `ogbn-arxiv`           | 169343 | 1166243 | yes      | nodes: `year`, `subject`                                                    | hosted  | ODC-BY 1.0 (Open Data Commons Attribution License), as stated by the Open Graph Benchmark.                                                                                                                                                                                            | <http://snap.stanford.edu/ogb/data/nodeproppred/arxiv.zip>                                                         |
| `com-dblp`             | 317080 | 1049866 | no       | none                                                                        | hosted  | unclear: SNAP states no license for its files; the underlying dblp data is CC0 1.0 (https://dblp.org/db/about/copyright.html).                                                                                                                                                        | <https://snap.stanford.edu/data/bigdata/communities/com-dblp.ungraph.txt.gz>                                       |

<!-- generated:datasets:end -->

## File formats

`cy.graphtyImport(input, format, options)` reads every format below; `format` defaults to `"auto"`, which detects
it from the content. `cy.graphtyExport(format, options)` writes the ones marked for export. Each format's own
options follow the table. `graphtyExport` also takes `directed`, `onLoss` and `sanitizeIds` (default `"mangle"`),
and `graphtyImport` takes `weightFrom`, `signal` and `onProgress`; [Graphs in and out](../guide/graphs-in-and-out)
explains them.

<!-- generated:formats:begin (by scripts/reference.ts; run npm run docs:reference) -->

| Format    | Import | Export | What it is                                                                                                                                                                                                                                                                                             |
| --------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gexf`    | yes    | yes    | Gephi's XML format, with node and edge attributes and positions.                                                                                                                                                                                                                                       |
| `graphml` | yes    | yes    | The XML format of yEd and NetworkX, with typed node and edge attributes.                                                                                                                                                                                                                               |
| `gml`     | yes    | yes    | Graph Modelling Language text, as NetworkX and igraph write it.                                                                                                                                                                                                                                        |
| `dot`     | yes    | yes    | Graphviz DOT text.                                                                                                                                                                                                                                                                                     |
| `pajek`   | yes    | yes    | Pajek `.net` text: a `*Vertices` list, then `*Edges` or `*Arcs` lists.                                                                                                                                                                                                                                 |
| `csv`     | yes    | yes    | Delimited text. By default an edge table with a header row naming the source and target columns; its other columns become edge data. `table: "nodes"` reads a node table, and `nodes` takes a node table to read with the edges.                                                                       |
| `json`    | yes    | yes    | JSON graphs: Cytoscape JSON (what `cy.json()` writes, and the export default), NetworkX node-link, d3, JSON Graph Format, graphology and vis.js. An import detects the dialect.                                                                                                                        |
| `neo4j`   | yes    | yes    | The CSV files of `neo4j-admin import`: a node file with an `:ID` column as the input, and relationship files with `:START_ID` and `:END_ID` columns in `relationships`. The text `graphtyExport` writes holds both, and one `graphtyImport` call reads it back; `relationships` is for separate files. |
| `xgmml`   | yes    | yes    | The XML network format of Cytoscape desktop (2.x and 3.x). Cytoscape desktop opens the XGMML `graphtyExport` writes, so it is the way back into Cytoscape desktop.                                                                                                                                     |
| `cx2`     | yes    | yes    | Cytoscape Exchange 2 JSON, what Cytoscape desktop and NDEx write.                                                                                                                                                                                                                                      |
| `cx`      | yes    | no     | Cytoscape Exchange version 1 JSON.                                                                                                                                                                                                                                                                     |
| `obo`     | yes    | no     | An ontology in OBO flat file form, such as the Gene Ontology: each `[Term]` is a node, and its `is_a` and `relationship` lines are edges.                                                                                                                                                              |
| `cys`     | yes    | no     | A Cytoscape desktop session file (`.cys`), passed as bytes (an `ArrayBuffer` or `Uint8Array`), not text. It reads the session's first network; `graphIndex` or `graphName` picks another.                                                                                                              |

### `gexf`

`graphtyImport` options:

| Option | Type      | Default | Meaning                                                                                                      |
| ------ | --------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `viz`  | `boolean` | `true`  | Read the `viz` elements: color, position, size, shape and thickness. `false` ignores them, with one warning. |

`graphtyExport` options:

| Option    | Type             | Default | Meaning                                              |
| --------- | ---------------- | ------- | ---------------------------------------------------- |
| `version` | `"1.2" \| "1.3"` | `"1.3"` | The GEXF version to write: "1.3" (default) or "1.2". |

### `graphml`

`graphtyImport` options:

| Option   | Type               | Default  | Meaning                                                                                                           |
| -------- | ------------------ | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `yfiles` | `"json" \| "skip"` | `"json"` | `"json"` keeps the yEd graphics of each element as a JSON data field; `"skip"` leaves them out, with one warning. |

`graphtyExport` options:

| Option        | Type                         | Default               | Meaning                                                                                    |
| ------------- | ---------------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `pretty`      | `boolean`                    | `true`                | Indent nested elements; false writes one element per line without indentation.             |
| `edgedefault` | `"directed" \| "undirected"` | the graph's direction | The top-level `edgedefault`: `directed` when you pass `directed: true`, else `undirected`. |

### `gml`

`graphtyImport` options:

| Option         | Type      | Default | Meaning                                                                                                        |
| -------------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `positions`    | `boolean` | `true`  | Read a node's `graphics [ x y ]` as its position; `false` keeps the whole record as the data field `graphics`. |
| `dictionaries` | `boolean` | `true`  | Store repeated text values compactly while reading; the data you get is the same.                              |

`graphtyExport` options:

| Option         | Type                  | Default   | Meaning                                                                                                                                                                                                                                                                                          |
| -------------- | --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `weightKey`    | `string`              | `"value"` | The edge key the edge weights are written under.                                                                                                                                                                                                                                                 |
| `sanitizeKeys` | `"error" \| "mangle"` | `"error"` | "error" (default): a column name or record key that is not a GML key (`[A-Za-z][0-9A-Za-z_]*`) or collides with a structural key makes graphtyExport throw; "mangle": such keys are rewritten (`.` and other characters become `_`, collisions get a `_2` suffix) and `onLoss` hears about them. |

### `dot`

`graphtyImport` options:

| Option                   | Type                                | Default      | Meaning                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | ----------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mismatchedEdgeOperator` | `"error" \| "operator" \| "header"` | `"operator"` | What an edge operator that contradicts the graph keyword means (`--` in a digraph, `->` in a graph; a syntax error for Graphviz): "operator" (default) reads the edge with the operator's direction and resolves it per onMixedDirection, with a warning; "header" reads it with the graph's direction, with a warning; "error" aborts the import as Graphviz does. |
| `positions`              | `boolean`                           | `true`       | Read a node's `pos` attribute as its position; `false` keeps `pos` as the text the file wrote.                                                                                                                                                                                                                                                                      |

`graphtyExport` options:

| Option   | Type      | Default     | Meaning                               |
| -------- | --------- | ----------- | ------------------------------------- |
| `indent` | `string`  | four spaces | The indentation of one nesting level. |
| `name`   | `string`  | none        | The graph name to write.              |
| `strict` | `boolean` | `false`     | Write the `strict` keyword.           |

### `pajek`

`graphtyImport` options:

| Option        | Type               | Default  | Meaning                                                                                                                                                                  |
| ------------- | ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `firstVertex` | `0 \| "auto" \| 1` | `"auto"` | The number of the first vertex: 1 (Pajek's rule), 0 (files written by zero-based scripts), or "auto" (default): 0 when the first vertex line is numbered 0, 1 otherwise. |

`graphtyExport` options:

| Option          | Type      | Default | Meaning                                                                                                          |
| --------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `networkHeader` | `boolean` | `false` | Has no effect from Cytoscape: the `*Network` line carries the graph's name, and an exported collection has none. |

### `csv`

`graphtyImport` options:

| Option         | Type                                          | Default                                                                        | Meaning                                                                                                                                                                                                                                                                                                                                                                            |
| -------------- | --------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `delimiter`    | `string`                                      |                                                                                | The field delimiter; sniffed from the first rows when omitted (`,`, tab, `;`, `\|`, space).                                                                                                                                                                                                                                                                                        |
| `header`       | `boolean \| "auto"`                           | `"auto"`                                                                       | Whether the first row is a header; "auto" (default) decides from its content.                                                                                                                                                                                                                                                                                                      |
| `table`        | `"auto" \| "edges" \| "nodes" \| "adjacency"` | `"auto"`                                                                       | What the input is: an edge table, a node table, an adjacency table (`node,neighbor[:weight],...` per row, no header by default), or "auto" (default): an edge table when source and target columns resolve, a node table when only an id column does. An adjacency table is never guessed: nothing in its rows tells it from an edge list.                                         |
| `sourceColumn` | `CsvColumnRef`                                |                                                                                | The source column, by name or 0-based position; resolved from the header by default.                                                                                                                                                                                                                                                                                               |
| `targetColumn` | `CsvColumnRef`                                |                                                                                | The target column, by name or 0-based position; resolved from the header by default.                                                                                                                                                                                                                                                                                               |
| `typeColumn`   | `CsvColumnRef`                                | the exact `Type` column of a Gephi table (exact `Source` and `Target` headers) | The per-row direction column (Directed / Undirected / Mutual); by default the exact `Type` column of a Gephi table (exact `Source` and `Target` headers); null reads no such column.                                                                                                                                                                                               |
| `idColumn`     | `CsvColumnRef`                                |                                                                                | The id column of a node table, by name or position; resolved from the header by default.                                                                                                                                                                                                                                                                                           |
| `nodes`        | `ImportInput`                                 |                                                                                | A node table read before the edges: its ids become nodes and its other columns node attributes.                                                                                                                                                                                                                                                                                    |
| `rowNumberIds` | `boolean`                                     | `false`                                                                        | A node table whose header has no id column gets its ids from the row numbers (0 for the first data row), coerced by `ids`, instead of failing with E_CSV_NO_ID_COLUMN. The node table is the `nodes` input when one is given (the edge table is then read as without this option), else the input itself; its first row is a header even under `header: "auto"`. False by default. |

`graphtyExport` options:

| Option      | Type                                | Default   | Meaning                                                                                                                                                                        |
| ----------- | ----------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dialect`   | `"gephi" \| "generic"`              | `"gephi"` | The header spelling: "gephi" (default) writes `Source,Target,Type,...,Weight` with the per-row direction; "generic" writes `source,target,...,weight` and no direction column. |
| `table`     | `"edges" \| "nodes" \| "adjacency"` | `"edges"` | Which table to write: the edge table, the node table, or an adjacency table (a node and its neighbors per row; read it back with `table: "adjacency"`).                        |
| `delimiter` | `string`                            | `","`     | The field delimiter.                                                                                                                                                           |
| `newline`   | `"\n" \| "\r\n"`                    | `"\n"`    | The line terminator.                                                                                                                                                           |
| `header`    | `boolean`                           | `true`    | Write the header row; an adjacency table never has one.                                                                                                                        |

### `json`

`graphtyImport` options:

| Option       | Type                                                                                                                     | Default                                                | Meaning                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dialect`    | `"auto" \| "adjacency" \| "node-link" \| "d3" \| "jgf" \| "cytoscape" \| "graphology" \| "vis" \| "tree" \| "obographs"` | `"auto"`                                               | The dialect to read; "auto" (default) sniffs the parsed document.                                                                                                                                                                                                                                                                                            |
| `nodeIdKey`  | `string`                                                                                                                 |                                                        | node-link / d3 / vis / adjacency / tree: the node key holding the id; auto: "id" (node-link / d3: "id" when any node has it, else "name").                                                                                                                                                                                                                   |
| `edgesKey`   | `string`                                                                                                                 |                                                        | node-link / d3: the top-level key holding the edges; auto: "edges" when present, else "links".                                                                                                                                                                                                                                                               |
| `sourceKey`  | `string`                                                                                                                 |                                                        | node-link / d3 / vis: the edge key holding the source; auto: "source", "src" or "from" (vis: "from").                                                                                                                                                                                                                                                        |
| `targetKey`  | `string`                                                                                                                 |                                                        | node-link / d3 / vis: the edge key holding the target; auto: "target", "dst" or "to" (vis: "to").                                                                                                                                                                                                                                                            |
| `indexLinks` | `boolean \| "auto"`                                                                                                      | `"auto"`                                               | node-link / d3: whether edge endpoints are node array positions; "auto" (default) says yes when every endpoint is an integer below the node count and no node id is a number.                                                                                                                                                                                |
| `oboIds`     | `"curie" \| "iri"`                                                                                                       | `"curie"`                                              | obographs: "curie" (default) reads `http://purl.obolibrary.org/obo/GO_0008150` as `GO:0008150` and `.../obo/go#regulates` as `regulates`, the identifiers the `.obo` file of the same ontology writes; "iri" keeps every IRI as written.                                                                                                                     |
| `typedefs`   | `"nodes" \| "metadata"`                                                                                                  | `"metadata"`                                           | obographs: "metadata" (default) keeps PROPERTY nodes and their subPropertyOf / inverseOf edges in `meta.extra.obographs`, as the OBO importer keeps `[Typedef]` frames; "nodes" makes them nodes and edges.                                                                                                                                                  |
| `nodesPath`  | `string`                                                                                                                 |                                                        | node-link / d3 / vis / graphology: where the node array is, as a dotted path of object keys from the document root (`"data.nodes"`); the object holding it is read as the graph record (its `directed`, `multigraph`, `graph` and edge keys). "nodes" by default. A path that names nothing is an E_MISSING_SECTION issue and the graph has no node records. |
| `edgesPath`  | `string`                                                                                                                 | the edges or links key of the object holding the nodes | node-link / d3 / vis / graphology: where the edge array is, as a dotted path of object keys from the document root (`"data.links"`); by default the edges or links key of the object holding the nodes. A path that names nothing is an E_MISSING_SECTION issue and the graph has no edge records.                                                           |
| `graphIndex` | `number`                                                                                                                 |                                                        | Which graph of the file to read, 0-based in file order. When a file holds more than one graph, `report.issues` has a `W_MULTIPLE_GRAPHS` issue whose message gives the count.                                                                                                                                                                                |
| `graphName`  | `string`                                                                                                                 |                                                        | Which graph of the file to read, by the name the file gives it; a name two graphs share is refused.                                                                                                                                                                                                                                                          |

`graphtyExport` options:

| Option       | Type                                                                   | Default       | Meaning                                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dialect`    | `"node-link" \| "d3" \| "jgf" \| "cytoscape" \| "graphology" \| "vis"` | `"cytoscape"` | The dialect to write. `"cytoscape"` is what `cy.json()` and `cy.add()` use and keeps edge ids, compound parents and positions; `"node-link"` is the NetworkX shape. |
| `indent`     | `number`                                                               | `0`           | Spaces per indentation level; 0 (default) writes compact JSON.                                                                                                      |
| `edgesKey`   | `string`                                                               | `"edges"`     | node-link and d3: the key of the edge array (d3: `"links"`).                                                                                                        |
| `nodeIdKey`  | `string`                                                               | `"id"`        | node-link, d3 and vis: the node id key.                                                                                                                             |
| `indexLinks` | `boolean`                                                              | `false`       | node-link and d3: write endpoints as node array positions.                                                                                                          |
| `sourceKey`  | `string`                                                               | `"source"`    | node-link, d3 and vis: the source key (vis: `"from"`).                                                                                                              |
| `targetKey`  | `string`                                                               | `"target"`    | node-link, d3 and vis: the target key (vis: `"to"`).                                                                                                                |
| `weightKey`  | `string`                                                               | `"weight"`    | The key the edge weight is written under.                                                                                                                           |

### `neo4j`

`graphtyImport` options:

| Option           | Type                                    | Default        | Meaning                                                                                                                                                                |
| ---------------- | --------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodes`          | `ImportInput \| readonly ImportInput[]` |                | Further node files, each with its own header row(s); read after the primary input.                                                                                     |
| `relationships`  | `ImportInput \| readonly ImportInput[]` |                | Relationship files, each with its own header row(s); read after the node files.                                                                                        |
| `delimiter`      | `string`                                |                | The field delimiter (neo4j-admin `--delimiter`); one character. When absent it is sniffed from the first rows between "," and a tab, so a `.tsv` file needs no option. |
| `arrayDelimiter` | `";" \| "," \| "\|"`                    | `";"`          | The array delimiter of list values and `:LABEL` cells (neo4j-admin `--array-delimiter`); ";" by default.                                                               |
| `quote`          | `string`                                | a double quote | The quote character (neo4j-admin `--quote`); one character; a double quote by default.                                                                                 |

`graphtyExport` options:

| Option           | Type                                  | Default        | Meaning                                                                                                                                       |
| ---------------- | ------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `part`           | `"nodes" \| "all" \| "relationships"` | `"all"`        | `"all"` writes the node sections, then the relationship sections; `"nodes"` or `"relationships"` writes one kind.                             |
| `delimiter`      | `string`                              | `","`          | The field delimiter; one character.                                                                                                           |
| `arrayDelimiter` | `";" \| "," \| "\|"`                  | `";"`          | The array delimiter of list values and `:LABEL` cells.                                                                                        |
| `quote`          | `string`                              | a double quote | The quote character; one character.                                                                                                           |
| `weightColumn`   | `string`                              | `"weight"`     | The property that receives the edge weights (`<name>:double`); null writes no weights.                                                        |
| `idColumn`       | `string`                              | `null`         | The property name of the `:ID` column for nodes that have no stored-id column of their own (`<name>:ID`); null (default) writes a bare `:ID`. |

### `xgmml`

`graphtyImport` options:

| Option                    | Type                     | Default                                              | Meaning                                                                                                                                                                                                                                         |
| ------------------------- | ------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `labelAliases`            | `boolean`                | on for files that use the Cytoscape (`cy`) namespace | Resolve an edge endpoint that is missing or names no node through Cytoscape's `"source (interaction) target"` edge label, and fill a missing interaction from it. Default: on for files that use the Cytoscape (`cy`) namespace, off otherwise. |
| `cytoscapeEscapes`        | `boolean`                | on for files that use the Cytoscape namespace        | Decode Cytoscape's two-character `\n` and `\t` escapes in string values. Default: on for files that use the Cytoscape namespace, off otherwise.                                                                                                 |
| `repairBareAmpersands`    | `boolean`                | `false`                                              | Read an `&` not followed by `;` within 7 characters as `&amp;` (warned per occurrence).                                                                                                                                                         |
| `pairSurrogateReferences` | `boolean`                | `false`                                              | Join two surrogate character references into one character (warned per pair).                                                                                                                                                                   |
| `zAs`                     | `"column" \| "position"` | `"column"`                                           | Where Cytoscape's z (a stacking order) goes: the `z` column (default) or the position.                                                                                                                                                          |
| `graphIndex`              | `number`                 |                                                      | Which graph of the file to read, 0-based in file order. When a file holds more than one graph, `report.issues` has a `W_MULTIPLE_GRAPHS` issue whose message gives the count.                                                                   |
| `graphName`               | `string`                 |                                                      | Which graph of the file to read, by the name the file gives it; a name two graphs share is refused.                                                                                                                                             |

`graphtyExport` options:

| Option             | Type      | Default | Meaning                                                                                                                                                                              |
| ------------------ | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cytoscapeEscapes` | `boolean` | `false` | Write newline and tab in string values as Cytoscape's two-character `\n` and `\t` (what the Cytoscape writer does) instead of the character references `&#10;` and `&#9;` (default). |

### `cx2`

`graphtyImport` options:

| Option | Type                     | Default    | Meaning                                                                                                                                                                                                            |
| ------ | ------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `zAs`  | `"column" \| "position"` | `"column"` | `"column"` keeps a node's `z` as the data field `z`, where Cytoscape stores a stacking order. `"position"` reads it as a third coordinate, and since a Cytoscape position has no z, it is dropped with no warning. |

`graphtyExport` options:

None of its own.

### `cx`

`graphtyImport` options:

| Option       | Type                     | Default    | Meaning                                                                                                                                                                                                            |
| ------------ | ------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `zAs`        | `"column" \| "position"` | `"column"` | `"column"` keeps a node's `z` as the data field `z`, where Cytoscape stores a stacking order. `"position"` reads it as a third coordinate, and since a Cytoscape position has no z, it is dropped with no warning. |
| `graphIndex` | `number`                 |            | Which graph of the file to read, 0-based in file order. When a file holds more than one graph, `report.issues` has a `W_MULTIPLE_GRAPHS` issue whose message gives the count.                                      |
| `graphName`  | `string`                 |            | Which graph of the file to read, by the name the file gives it; a name two graphs share is refused.                                                                                                                |

### `obo`

`graphtyImport` options:

| Option     | Type                    | Default      | Meaning                                                                                                                         |
| ---------- | ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `obsolete` | `"keep" \| "drop"`      | `"keep"`     | "keep" (default): obsolete terms are nodes with `is_obsolete` true; "drop": they and their edges are left out.                  |
| `typedefs` | `"nodes" \| "metadata"` | `"metadata"` | "metadata" (default): `[Typedef]` frames go to `meta.extra.obo.typedefs`; "nodes": they are nodes too, with their `is_a` edges. |

### `cys`

`graphtyImport` options:

| Option                 | Type                     | Default    | Meaning                                                                                                                                                                       |
| ---------------------- | ------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zAs`                  | `"column" \| "position"` | `"column"` | Where Cytoscape's z (a stacking order) goes: the `z` column (default) or the position.                                                                                        |
| `maxUncompressedBytes` | `number`                 | 2 GiB      | The most bytes one import may inflate, in total; an entry beyond it, or one whose compression ratio is above 1000:1, is E_TOO_LARGE.                                          |
| `graphIndex`           | `number`                 |            | Which graph of the file to read, 0-based in file order. When a file holds more than one graph, `report.issues` has a `W_MULTIPLE_GRAPHS` issue whose message gives the count. |
| `graphName`            | `string`                 |            | Which graph of the file to read, by the name the file gives it; a name two graphs share is refused.                                                                           |

<!-- generated:formats:end -->

## Try it

- [Generators gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--generators) draws a graph from every generator.
- [Datasets gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--datasets) draws every dataset.
- [Formats gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--formats) shows one graph in every format.

## See also

- [Graphs in and out](../guide/graphs-in-and-out) shows these methods at work with layouts and algorithms.
- [Load a GraphML file](../guide/recipes/load-graphml-file) lets a user pick a file, view it and save it back.
