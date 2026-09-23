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

A random generator takes a required `seed` (an integer from 0 to 2^53 - 1). The same options and
seed give the identical graph -- same node order, same edge order -- in every browser, in Node, on
every platform, and in every future version of this package. Changing a seeded graph is a breaking
change. The random numbers come from Threefry-2x32-20, a counter-based generator (Salmon et al.,
SC11) computed with exact 32-bit integer arithmetic, and the one logarithm the samplers need is a
port of fdlibm's, so no engine-specific floating point enters a decision. See
`design/graph-samples/graph-samples-design.md` in the repository for the full contract.

### Generators

| Function                                                              | Model                                           | Ground truth      |
| --------------------------------------------------------------------- | ----------------------------------------------- | ----------------- |
| `pathGraph`, `cycleGraph`, `starGraph`, `wheelGraph`, `completeGraph` | classic families                                |                   |
| `completeBipartiteGraph({ a, b })`                                    | K\_{a,b}                                        | `side` (u8)       |
| `gridGraph({ rows, cols })`, `grid3dGraph({ rows, cols, layers })`    | 4- and 6-neighbour lattices                     |                   |
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

All run in linear time in the size of the output, so 100,000-node graphs take milliseconds.

## Load a dataset

Each bundled dataset is its own subpath, so an application bundles only the ones it imports:

```ts
import { karate, karateMeta } from "@graphty/graph-samples/datasets/karate";

const club = karate(); // 34 nodes, 78 weighted edges, node column `club`
karateMeta.citation; // what to cite
```

| Subpath                         | Graph                                              | Nodes / edges | Ground truth |
| ------------------------------- | -------------------------------------------------- | ------------- | ------------ |
| `datasets/karate`               | Zachary's karate club (weighted)                   | 34 / 78       | `club`       |
| `datasets/florentine-families`  | Florentine marriages                               | 15 / 20       |              |
| `datasets/davis-southern-women` | Davis Southern Women (bipartite)                   | 32 / 89       | `side`       |
| `datasets/les-miserables`       | Les Miserables co-appearances (weighted)           | 77 / 254      |              |
| `datasets/football`             | US college football 2000, Evans' corrected version | 115 / 613     | `conference` |
| `datasets/political-books`      | Books about US politics                            | 105 / 441     | `lean`       |
| `datasets/dolphins`             | Doubtful Sound dolphins                            | 62 / 159      |              |

The root entry exports `DATASETS`, the metadata of every dataset (title, description, citation,
source, license, counts, columns, what it showcases) without any of the graph data.

Datasets too large to bundle are hosted as graph-format wire files and fetched on demand:

```ts
import { fetchDataset } from "@graphty/graph-samples";

const roads = await fetchDataset("some-large-graph"); // a GraphSnapshot
const mine = await fetchDataset("some-large-graph", { baseUrl: "https://my.cdn/graphs/" });
```

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
