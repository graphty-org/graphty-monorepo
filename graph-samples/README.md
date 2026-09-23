# @graphty/graph-samples

Graphs to try things on: seeded random-graph generators that produce the same graph on every
machine, the classic deterministic families, and a handful of well-known real networks with their
ground truth. Everything comes out as typed arrays that
[`@graphty/graph-format`](../graph-format) loads in one call, and that a Web Worker can transfer.

```bash
npm install @graphty/graph-samples @graphty/graph-format
```

## Generate a graph

```ts
import { fromEdgeArrays } from "@graphty/graph-format";
import { barabasiAlbertGraph, plantedPartitionGraph } from "@graphty/graph-samples/generators";

const hubs = barabasiAlbertGraph({ n: 10_000, m: 3, seed: 42 });
const snapshot = fromEdgeArrays(hubs); // a frozen CSR snapshot

const communities = plantedPartitionGraph({ groups: 4, groupSize: 50, pIn: 0.3, pOut: 0.01, seed: 7 });
communities.nodeColumns?.community; // Uint32Array: the planted group of every node
```

Every generator returns a `SampleGraph`:

| Field         | Type            | Meaning                                              |
| ------------- | --------------- | ---------------------------------------------------- |
| `directed`    | `boolean`       | whether edge `e` runs from `src[e]` to `dst[e]`      |
| `nodeCount`   | `number`        | isolated nodes included                              |
| `src`, `dst`  | `Uint32Array`   | the edge endpoints, node indices in `[0, nodeCount)` |
| `weights`     | `Float32Array?` | per-edge weights, when weighted                      |
| `ids`         | `string[]?`     | external node ids, when the nodes have names         |
| `nodeColumns` | record?         | per-node columns, including the ground truth         |

### Same seed, same graph, everywhere

A random generator takes an optional `seed` (an integer from 0 to 2^53 - 1; default 0, never the
clock, so an unseeded call is reproducible too). The same options and seed give the identical graph -- same node order, same edge order -- in every browser, in Node, on
every platform, and in every future version of this package. Changing a seeded graph is a breaking
change. The random numbers come from Threefry-2x32-20, a counter-based generator (Salmon et al.,
SC11) computed with exact 32-bit integer arithmetic, and the one logarithm the samplers need is a
port of fdlibm's (as are the exponential and the sine and cosine some models need), so no
engine-specific floating point enters a decision. See
`design/graph-samples/graph-samples-design.md` in the repository for the full contract.

### Generators

| Function                                                              | Model                                           | Ground truth      |
| --------------------------------------------------------------------- | ----------------------------------------------- | ----------------- |
| `pathGraph`, `cycleGraph`, `starGraph`, `wheelGraph`, `completeGraph` | classic families                                |                   |
| `completeBipartiteGraph({ a, b })`                                    | K\_{a,b}                                        | `side` (u8)       |
| `gridGraph({ rows, cols })`, `grid3dGraph({ rows, cols, layers })`    | 4- and 6-neighbour lattices; options below      | `blocked` (u8)    |
| `hypercubeGraph({ dimension })`, `ladderGraph({ n })`                 | Q_d, ladder                                     |                   |
| `barbellGraph`, `lollipopGraph`                                       | cliques joined by paths                         |                   |
| `cavemanGraph`, `connectedCavemanGraph`                               | cliques, and a ring of cliques                  | `community` (u32) |
| `balancedTreeGraph({ branching, height })`, `petersenGraph()`         | r-ary tree, Petersen graph                      |                   |
| `erdosRenyiGraph({ n, p, seed })`                                     | G(n, p), O(n + m) by geometric skipping         |                   |
| `erdosRenyiGnmGraph({ n, m, seed })`                                  | G(n, m), exactly m edges                        |                   |
| `barabasiAlbertGraph({ n, m, triadProbability?, seed })`              | preferential attachment, Holme-Kim triads       |                   |
| `wattsStrogatzGraph({ n, k, beta, seed })`                            | small world                                     |                   |
| `stochasticBlockModelGraph({ sizes, probabilities, seed })`           | stochastic block model                          | `community` (u32) |
| `plantedPartitionGraph({ groups, groupSize, pIn, pOut, seed })`       | planted partition                               | `community` (u32) |
| `randomBipartiteGraph({ n1, n2, p, perfectMatching?, seed })`         | G(n1, n2, p), optional planted perfect matching | `side` (u8)       |
| `randomTreeGraph({ n, seed })`                                        | uniform random labelled tree (Pruefer)          |                   |
| `randomDagGraph({ layers, p, seed })`                                 | layered DAG, arcs from each layer to the next   | `layer` (u32)     |

`gridGraph` and `grid3dGraph` also take `periodic` (a torus), `diagonals` (8 or 26 neighbours),
`directed` (forward arcs only: a DAG), `obstacles` (a probability of blocking each node) and
`positions` (`x`, `y`, `z` columns).

More families:

| Function                                                                                                                                                             | Model                                                                                                   | Output extras              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------- |
| `emptyGraph`, `completeMultipartiteGraph({ sizes })`                                                                                                                 | no edges; K\_{a,b,c,...}                                                                                | `part`                     |
| `circularLadderGraph`, `mobiusLadderGraph`, `ringOfCliquesGraph`                                                                                                     | prism, Moebius ladder, cliques in a ring                                                                | `community`                |
| `triangularLatticeGraph`, `hexagonalLatticeGraph`                                                                                                                    | triangular and honeycomb lattices                                                                       | `x`, `y` with `positions`  |
| `namedGraph(name)`, `NAMED_GRAPH_NAMES`                                                                                                                              | 21 named graphs: Krackhardt kite, Frucht, Tutte, Heawood, Hoffman-Singleton, the platonic solids, ...   |                            |
| `powerLawDegreeSequence`                                                                                                                                             | a discrete power-law degree sequence (a `Uint32Array`)                                                  |                            |
| `configurationModelGraph`, `directedConfigurationModelGraph`, `bipartiteConfigurationModelGraph`                                                                     | exact degree sequences; keep or erase self-loops and multi-edges                                        | `side`                     |
| `chungLuGraph({ expectedDegrees })`                                                                                                                                  | expected degrees (Chung-Lu), linear time (Miller-Hagberg)                                               |                            |
| `degreeCorrectedSbmGraph({ sizes, expectedDegrees, mixing })`                                                                                                        | communities with hubs (Karrer-Newman)                                                                   | `community`                |
| `randomRegularGraph({ n, d })`                                                                                                                                       | uniform-ish d-regular graph (Steger-Wormald)                                                            |                            |
| `lfrGraph(...)`                                                                                                                                                      | LFR community benchmark (Lancichinetti-Fortunato-Radicchi)                                              | `community`                |
| `randomGeometricGraph`, `waxmanGraph`, `knnGraph`                                                                                                                    | points in the unit square or cube; `knnGraph` can draw Gaussian clusters                                | `x`, `y`, `z`, `community` |
| `hyperbolicGraph`                                                                                                                                                    | hyperbolic random graph (Krioukov et al.), up to 20,000 nodes                                           | `x`, `y`, `radius`         |
| `rmatGraph`, `kroneckerGraph`                                                                                                                                        | R-MAT (Graph500 defaults) and stochastic Kronecker graphs, directed                                     |                            |
| `priceGraph`, `randomOrderDagGraph`, `erdosRenyiGraph({ directed: true })`                                                                                           | citation DAG, random-order DAG, directed G(n, p)                                                        |                            |
| `gridFlowNetwork`, `layeredFlowNetwork`, `genrmfGraph`, `akGraph`                                                                                                    | max-flow instances with integer capacities as weights, plus `source` and `sink`                         | `role`                     |
| `randomRecursiveTreeGraph`, `forestFireGraph`, `duplicationDivergenceGraph`, `newmanWattsGraph`, `bianconiBarabasiGraph`, `randomApollonianGraph`, `wilsonMazeGraph` | growth models and a perfect maze                                                                        | `fitness`, `x`, `y`        |
| `randomMultigraph`, `addPathologicalEdges(graph, ...)`                                                                                                               | multigraphs; add self-loops, parallel and anti-parallel edges to any graph                              |                            |
| `edgeCaseGraph(name)`, `EDGE_CASE_NAMES`                                                                                                                             | 14 fixtures for parsers and consumers: empty, isolated nodes, negative cycles, a 100,000-leaf star, ... |                            |

Every generator takes a `weights` option (`uniform`, `integer`, `exponential`, `euclidean` from the
position columns, or `column` from a node column), and `withWeights(graph, spec, seed?)` weights
any graph, datasets included:

```ts
const roads = gridGraph({
    rows: 50,
    cols: 50,
    obstacles: 0.2,
    positions: true,
    weights: { kind: "integer", min: 1, max: 9 },
});
```

Self-loops and parallel edges load as they are: graph-format keeps both by default. A graph is
either directed or undirected; graph-format has no mixed graphs.

All run in linear time in the size of the output, so 100,000-node graphs take milliseconds.

## Load a dataset

Each bundled dataset is its own subpath, so an application bundles only the ones it imports:

```ts
import { karate, karateMeta } from "@graphty/graph-samples/datasets/karate";

const club = karate(); // 34 nodes, 78 weighted edges, node column `club`
karateMeta.citation; // what to cite
```

| Subpath                         | Graph                                              | Nodes / edges  | Ground truth |
| ------------------------------- | -------------------------------------------------- | -------------- | ------------ |
| `datasets/karate`               | Zachary's karate club (weighted)                   | 34 / 78        | `club`       |
| `datasets/florentine-families`  | Florentine marriages                               | 15 / 20        |              |
| `datasets/davis-southern-women` | Davis Southern Women (bipartite)                   | 32 / 89        | `side`       |
| `datasets/les-miserables`       | Les Miserables co-appearances (weighted)           | 77 / 254       |              |
| `datasets/football`             | US college football 2000, Evans' corrected version | 115 / 613      | `conference` |
| `datasets/political-books`      | Books about US politics                            | 105 / 441      | `lean`       |
| `datasets/dolphins`             | Doubtful Sound dolphins                            | 62 / 159       |              |
| `datasets/contiguous-usa`       | Contiguous US states and DC, land borders          | 49 / 107       |              |
| `datasets/knuth-miles`          | Knuth's 128 cities, 1949 road miles (complete)     | 128 / 8,128    |              |
| `datasets/celegans-neural`      | C. elegans neurons (directed, weighted)            | 297 / 2,345    |              |
| `datasets/political-blogs`      | US political blogs, 2004 (directed)                | 1,490 / 19,022 | `lean`       |
| `datasets/openflights`          | OpenFlights airports and routes (directed)         | 3,214 / 36,906 |              |

The root entry exports `DATASETS`, the metadata of every dataset (title, description, citation,
source, license, counts, columns, what it showcases) without any of the graph data. The
geographic datasets carry `latitude` and `longitude` node columns in degrees.

### Hosted datasets

Datasets too large to bundle are published at
`https://graphty.app/data/graph-samples/v1/<name>.gsnp.gz` as gzipped graph-format wire files and
fetched on demand. They are in `DATASETS` too, with `hosting: "remote"`, the file size (`bytes`)
and its SHA-256:

```ts
import { fetchDataset } from "@graphty/graph-samples";

const roads = await fetchDataset("road-ny"); // a GraphSnapshot, with its node columns
const mine = await fetchDataset("road-ny", { baseUrl: "https://my.cdn/graphs/" });
```

| Name         | Graph                                                    | Nodes / edges       | Download | Ground truth |
| ------------ | -------------------------------------------------------- | ------------------- | -------- | ------------ |
| `road-ny`    | New York City roads, DIMACS (directed, lengths, lon/lat) | 264,346 / 733,846   | 9.4 MB   |              |
| `ogbn-arxiv` | arXiv CS citations, OGB (directed, `year`)               | 169,343 / 1,166,243 | 10.6 MB  | `subject`    |
| `com-dblp`   | DBLP co-authorship, SNAP                                 | 317,080 / 1,049,866 | 15.6 MB  |              |

`https://graphty.app/data/graph-samples/v1/index.json` lists the same metadata with each file's URL.

### Publishing the hosted datasets

`npm run datasets:hosted` (`scripts/build-hosted.mjs`) downloads each source, checks it against the
SHA-256 recorded in the script, and writes `public-data/v1/<name>.gsnp.gz`, `index.json` and
`src/datasets/hosted.ts` (the catalogue entries). The `.gsnp.gz` files are not committed: every
deploy of graphty.app (`.github/workflows/deploy-pages.yml`) runs the script and publishes
`public-data/v1/` at `/data/graph-samples/v1/`. The build is deterministic for a given Node.js major
version (the workflow uses 22), so the checksums in the committed `hosted.ts` match the published
files. To add, change or remove a hosted dataset, edit the script, run it, commit the script and
`src/datasets/hosted.ts` together with `NOTICE`, and merge to master.

## Draw one with graphty-element

```ts
import { toElementData } from "@graphty/graph-samples";
import { football } from "@graphty/graph-samples/datasets/football";

const { nodes, edges } = toElementData(football());
element.nodeData = nodes; // { id, label, conference }
element.edgeData = edges; // { source, target }
```

## Licenses

The code is MIT. The datasets are the work of their authors: `NOTICE` lists each one's source,
citation and license as known. Some are marked "unclear" -- their publishers state no license.
If you are a rights holder and want a dataset removed, open an issue.
