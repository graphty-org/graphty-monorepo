# Generators

<<< ../examples/generators.ts

## Any generator by name

`GENERATOR_CATALOG` lists every generator as plain data: its name, a default display name, one
sentence about it, its main parameters with defaults that build a readable graph of a few hundred
nodes at most, and a `thumbnail`: the file name of a picture of that default graph, published
beside the datasets' files. `generateGraph(name, params)` runs one; a parameter left out takes its
default. This is how a menu of generators is built without listing them by hand.

## Same seed, same graph, everywhere

A random generator takes an optional `seed` (an integer from 0 to 2^53 - 1; default 0, never the
clock, so an unseeded call is reproducible too). The same options and seed give the identical graph -- same node order, same edge order -- in every browser, in Node, on
every platform, and in every future version of this package. Changing a seeded graph is a breaking
change. The random numbers come from Threefry-2x32-20, a counter-based generator (Salmon et al.,
SC11) computed with exact 32-bit integer arithmetic, and the one logarithm the samplers need is a
port of fdlibm's (as are the exponential and the sine and cosine some models need), so no
engine-specific floating point enters a decision.

## The generators

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

## Weights

Every generator takes a `weights` option (`uniform`, `integer`, `exponential`, `euclidean` from the
position columns, or `column` from a node column), and `withWeights(graph, spec, seed?)` weights
any graph, datasets included:

<<< ../examples/weights.ts

Self-loops and parallel edges load as they are: graph-format keeps both by default. A graph is
either directed or undirected; graph-format has no mixed graphs.

All generators run in time linear in the size of the graph they make, so a 100,000-node graph
takes milliseconds.
