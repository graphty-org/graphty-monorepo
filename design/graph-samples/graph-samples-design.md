# @graphty/graph-samples: design

Status: phase 1 implemented (2026-09-23). Package: `graph-samples/`.

@graphty/graph-samples produces graphs to demonstrate, test and benchmark the rest of the
monorepo: random-graph generators whose output is fixed by their seed, the deterministic classic
families, and real sample datasets with their ground truth. Every graph comes out as typed arrays
that @graphty/graph-format's `fromEdgeArrays()` loads in one call.

The research behind the choices here -- the catalogue of generation models with papers and
complexity, and the survey of redistributable datasets with their licenses and file quirks -- was
done on 2026-09-23 and lives outside the repository, in the owner's `tmp/graph-gen/`
(`generators.md`, `datasets.md`, `datasets.json`).

---------------------------------------------------------------------------------------------------

## 1. Goals

1. **One place for sample graphs.** Today five generator implementations with three PRNGs live in
   layout, the algorithms stories and webgpu-graph-algorithms' tests and benchmarks (section 9).
   They move here, behind one PRNG.
2. **Same seed, same graph, everywhere.** A generator called with the same options and seed yields
   the identical graph -- node order and edge order included -- on every engine, platform, worker
   count and future package version (section 3).
3. **Scale.** Linear-time algorithms, typed-array output, no per-edge JavaScript objects: a
   million nodes in well under a second on one core (section 5).
4. **Ground truth.** Where a model has a planted answer (communities, bipartite sides, DAG layers),
   it is emitted as a node column so an algorithm's output can be scored and a layout coloured.
5. **Bundle only what is used.** Generators are one subpath, each dataset its own subpath; large
   datasets are not in the npm package at all but fetched from graphty.app (section 6).
6. **Removable data.** Every dataset records its source, citation and license, so taking one out on
   request is a small, obvious change (section 7).

Non-goals: graph algorithms or layouts (they belong to algorithms, layout and graphty-element);
file-format parsing (graph-io); rendering.

---------------------------------------------------------------------------------------------------

## 2. API

### 2.1 Entry points

| Import | Contents |
| --- | --- |
| `@graphty/graph-samples` | `SampleGraph`, `DatasetMeta`, `DATASETS` (metadata only), `fetchDataset`, `DEFAULT_DATASET_BASE_URL`, `toElementData` |
| `@graphty/graph-samples/generators` | every generator and its options type |
| `@graphty/graph-samples/datasets/<name>` | one bundled dataset: `<name>()` and `<name>Meta` |

`package.json` maps `./datasets/*` with a subpath pattern, so adding a dataset directory needs no
edit to `package.json`; `scripts/entries.js` lists the directories for the bundle.

### 2.2 The output: `SampleGraph`

```ts
interface SampleGraph {
    readonly directed: boolean;
    readonly nodeCount: number;
    readonly src: Uint32Array;              // U32 of graph-format
    readonly dst: Uint32Array;
    readonly weights?: Float32Array;
    readonly ids?: readonly string[];       // external ids, datasets only
    readonly nodeColumns?: Readonly<Record<string, TypedArrayData | ColumnInput>>;
}
```

It is structurally a graph-format `EdgeArraysInput`, so `fromEdgeArrays(graph)` builds a snapshot
with no adapter, and every array is a plain `ArrayBuffer`-backed typed array that a worker can
transfer. Node columns are typed arrays for generated ground truth (`community` u32, `side` u8,
`layer` u32) and graph-format `ColumnInput`s for dataset text (`label` string, categorical `dict`
columns such as `club` or `conference`).

`toElementData(graph)` turns a `SampleGraph` into the `{ id, ...columns }` node records and
`{ source, target, weight? }` edge records graphty-element's `nodeData` / `edgeData` take. It builds
one object per node and edge, so it is for graphs a browser draws, not for the million-edge path.

### 2.3 Generators

Every generator takes one options object and returns a `SampleGraph`. Random generators take a
**required** `seed`, an integer in [0, 2^53). A required seed can later become optional without a
breaking change; the reverse is breaking, so required is the reversible choice.

Phase 1 generators (all undirected and simple unless noted):

| Function | Options | Algorithm, cost | Ground truth |
| --- | --- | --- | --- |
| `pathGraph`, `cycleGraph`, `starGraph`, `wheelGraph`, `completeGraph` | `n` | closed form, O(n + m) | |
| `completeBipartiteGraph` | `a, b` | closed form | `side` |
| `gridGraph`, `grid3dGraph` | `rows, cols[, layers]` | 4- / 6-neighbour lattice | |
| `hypercubeGraph` | `dimension` (0..26) | bit flips | |
| `ladderGraph` | `n` rungs | | |
| `barbellGraph`, `lollipopGraph` | `cliqueSize, pathLength` | | |
| `cavemanGraph`, `connectedCavemanGraph` | `cliques, size` | Watts 1999, networkx's rewiring | `community` |
| `balancedTreeGraph` | `branching, height` | breadth-first numbering | |
| `petersenGraph` | none | | |
| `erdosRenyiGraph` | `n, p, seed` | G(n, p) by geometric skipping (Batagelj and Brandes 2005), O(n + m) | |
| `erdosRenyiGnmGraph` | `n, m, seed` | G(n, m) by Floyd's sampling over pair indices, O(m log m) | |
| `barabasiAlbertGraph` | `n, m, triadProbability?, seed` | repeated-endpoint list, O(n m); Holme-Kim triad step | |
| `wattsStrogatzGraph` | `n, k, beta, seed` | networkx's rewiring, O(n k) | |
| `stochasticBlockModelGraph` | `sizes, probabilities, seed` | per-row geometric skipping per block, O(n B + m) | `community` |
| `plantedPartitionGraph` | `groups, groupSize, pIn, pOut, seed` | the block model with that matrix (same graph) | `community` |
| `randomBipartiteGraph` | `n1, n2, p, perfectMatching?, seed` | G(n1, n2, p) by skipping; optional planted permutation | `side` |
| `randomTreeGraph` | `n, seed` | uniform Pruefer sequence, linear decoding | |
| `randomDagGraph` (directed) | `layers, p, seed` | arcs from layer i to i + 1 by skipping | `layer` |

Every generator's JSDoc states its node order, edge order and draw order; they are part of the
contract (section 3.5). Invalid options throw `RangeError` naming the option.

### 2.4 Datasets

A bundled dataset directory holds three files:

- `data.ts` -- GENERATED by `scripts/convert-datasets.mjs`: a compact literal (flat edge list,
  weights, ids, columns as codes plus category names).
- `meta.ts` -- the `DatasetMeta`: name, title, description, citation, source URL, license as known
  (or "unclear: ..."), counts, direction, weights, columns with descriptions, the ground-truth
  column, and what it showcases.
- `index.ts` -- re-exports the meta and defines the loader, `buildDataset(DATA)`, which returns a
  fresh copy on every call.

`DATASETS` in the root lists every meta without importing any `data.ts`, so a picker UI costs a
few kilobytes. Phase 1 datasets:

| Subpath | Nodes / edges | Source | License | Ground truth |
| --- | --- | --- | --- | --- |
| `karate` | 34 / 78, weighted | networkx 3.1 `social.py` | published facts; networkx BSD-3 | `club` |
| `florentine-families` | 15 / 20 | networkx 3.1 | published facts; networkx BSD-3 | |
| `davis-southern-women` | 32 / 89, bipartite | networkx 3.1 | published facts; networkx BSD-3 | `side` |
| `les-miserables` | 77 / 254, weighted | networkx 3.1 (from the Stanford GraphBase) | SGB terms: changed file, renamed | |
| `football` | 115 / 613 | Evans' corrected files, figshare | CC BY 4.0 | `conference` |
| `political-books` | 105 / 441 | Newman's page (archived) | unclear | `lean` |
| `dolphins` | 62 / 159 | Newman's page (archived) | unclear | |

The karate weights follow networkx exactly: its matrix is not symmetric (entry [0][12] is 2,
[12][0] is 1) and networkx keeps the later row's entry. The conversion was cross-checked edge by
edge against networkx and against the raw GML files.

---------------------------------------------------------------------------------------------------

## 3. The PRNG and the determinism contract

### 3.1 Requirements

- Identical output on V8, SpiderMonkey and JavaScriptCore, on x86 and ARM, in Node and browsers.
- Independent streams for units of work, so a generator split across workers produces the same
  graph as one call, whatever the split.
- Integer-exact arithmetic; no `Math.random`; no floating-point operation whose last bit may differ
  between engines on a path that decides an edge.
- A frozen, testable definition: known-answer vectors for the core, golden values for everything
  derived from it.

### 3.2 Choice: Threefry-2x32 with 20 rounds

Threefry (J. K. Salmon, M. A. Moraes, R. O. Dror and D. E. Shaw, "Parallel random numbers: as easy
as 1, 2, 3", SC11, 2011, doi:10.1145/2063384.2063405) is a counter-based generator: a keyed bijection
from a counter to random bits, so any position of any stream is computed directly, with no state
to split or jump. Threefry-2x32-20 maps a 64-bit key and a 64-bit counter to 64 bits using only
32-bit addition, rotation and xor. It passes BigCrush from 13 rounds; 20 is Random123's default.
JAX uses the same function for its splittable keys.

Alternatives considered:

| Candidate | Why not |
| --- | --- |
| Philox-4x32 (same paper, cuRAND, NumPy) | needs the high half of a 32 x 32 -> 64 multiply, which JavaScript lacks; emulating it with 16-bit limbs is slower and more code than Threefry's add-rotate-xor |
| PCG with stream selection, SplitMix64 streams, xoshiro with jumps | 64-bit multiplies (BigInt: an order of magnitude slower) or 128-bit jump polynomials; sequential by design, so a block's stream needs a derivation step anyway |
| Mulberry32, xorshift32, the layout LCG | no independent streams, weak statistics; the layout LCG's period is 233,280 (section 9) |

Threefry-2x32 in JavaScript is exact by construction (`(a + b) | 0`, `<<`, `>>>`, `^`), about 30 ns
per call (two words) in Node 22 on one core.

### 3.3 Streams

A stream is named by `(seed, domain, block)`:

- `seed`: the caller's integer in [0, 2^53).
- `domain`: a fixed ASCII name per generator and purpose, hashed with 32-bit FNV-1a.
- `block`: an integer in [0, 2^32) naming a unit of work the ALGORITHM defines -- a row of the
  adjacency matrix, a node -- never a worker or chunk index.

```
streamKey = Threefry2x32_20(key = (seed mod 2^32, floor(seed / 2^32)),
                            counter = (FNV1a32(domain), block))
word(2i), word(2i + 1) = Threefry2x32_20(key = streamKey,
                                         counter = (i mod 2^32, floor(i / 2^32)))
```

Derived draws, each defined only in terms of the words:

| Draw | Definition |
| --- | --- |
| `nextU32()` | the next word |
| `nextFloat()` | `((a >>> 5) * 2^26 + (b >>> 6)) / 2^53` for the next two words: a double in [0, 1) with 53 random bits, exact |
| `nextBelow(n)` | masked rejection: keep the low `ceil(log2 n)` bits of a word, retry while >= n (for n > 2^32 one extra high word first); exact and unbiased |
| `nextSkip(logQ)` | `floor(detLog(1 - nextFloat()) / logQ)`, the geometric number of failures before a Bernoulli(p) success, `logQ = detLog(1 - p)` |

Domains frozen so far: `gnp`, `gnm`, `sbm`, `bipartite`, `bipartite-matching`, `layered-dag`,
`prufer`, `barabasi-albert`, `watts-strogatz`.

### 3.4 The one logarithm

Geometric skipping needs a logarithm, and ECMAScript leaves `Math.log` implementation-approximated:
two engines may differ in the last bit, and a quotient that lands on an integer boundary would then
choose a different edge. `detLog` in `src/random/log.ts` is a port of fdlibm's `__ieee754_log`
(e_log.c): it reads exponent and mantissa through a little-endian `DataView` and otherwise uses
only double addition, subtraction, multiplication and division, which ECMAScript requires to be
correctly rounded and forbids from fusing. Its result is therefore a pure function of the input's
bits. It returned the same bits as V8's `Math.log` (itself fdlibm) on all of 1,000,000 sampled
inputs across (1e-200, 1e6), and its error stays below 1 ulp. `Math.floor` and comparisons are exact. No other transcendental function is used; a future
generator that needs `exp` or `pow` ports fdlibm's too, or uses an integer method.

### 3.5 What is frozen

- The stream definition above, pinned by known-answer vectors from Random123
  (`test/random/threefry.test.ts`) and golden words, floats, bounded integers and skips
  (`test/random/stream.test.ts`).
- Each generator's algorithm, draw order, node order and edge order, pinned by a golden hash of one
  graph per generator (`test/generators/random.test.ts`).
- Changing any of them changes seeded graphs and is a MAJOR version bump. A new generator, a new
  option whose default preserves the old output, or a faster implementation with identical output
  is not.

### 3.6 Parallel generation

Row-parallel generators (G(n, p), the block models, random bipartite, the layered DAG) draw each row
from its own `(seed, domain, row)` stream and expose an internal `...Rows(options, start, end, out)`
function. Concatenating any split of the rows into consecutive ranges reproduces the whole edge
list; the tests check splits of 1, 7, 333 and all rows. Sequential models (Barabasi-Albert,
Watts-Strogatz, G(n, m), the Pruefer tree) draw from block 0 of one stream and run in one worker.

---------------------------------------------------------------------------------------------------

## 4. Output format and graph-format

- `src` / `dst` are `Uint32Array`, `weights` `Float32Array`: exactly what `fromEdgeArrays` and
  `GraphBuilder.addEdges` take, and what graph-format stores (it limits counts to `MAX_COUNT`,
  which the generators check before allocating).
- Buffers are sized from the expected edge count plus six standard deviations and grow by doubling
  if needed; the result is trimmed to exact length. Nothing allocates per edge.
- The generators import only types and `MAX_COUNT` from graph-format, so the generators subpath
  pulls in no graph-format code beyond a constant; `fetchDataset` imports `fromBytes`.

---------------------------------------------------------------------------------------------------

## 5. Scaling

| Generator | Cost | Measured (Node 22, one core) |
| --- | --- | --- |
| deterministic families | O(n + m) | 100k-node grid: 30 ms |
| G(n, p) | O(n + m), one stream derivation per row | 1M nodes, 5M edges: 0.46 s |
| G(n, m) | O(m log m) (sort of pair indices), open-addressing Float64 set | 100k nodes, 500k edges: 0.11 s |
| Barabasi-Albert | O(n m) | 1M nodes, 5M edges: 0.47 s |
| Holme-Kim | O(n m) plus the target's neighbour list per triad step | hubs make the step O(degree); per-node JS arrays, fine to about 1M |
| Watts-Strogatz | O(n k), a `Set` of pair keys | 100k nodes, k = 6: 0.05 s |
| block models | O(n B + m) | the n B term matters above about 1e8; iterate non-zero blocks then |
| Pruefer tree, layered DAG, bipartite | O(n + m) | |

Limits: G(n, m) needs n <= 2^27 so pair indices stay exact doubles; everything checks
`MAX_COUNT` edges. `complete*` graphs are capped by their edge count, not their node count.

---------------------------------------------------------------------------------------------------

## 6. Dataset hosting

### 6.1 Bundled or hosted

Datasets under about 5,000 nodes are bundled as `data.ts` modules (the seven of phase 1 total
33 KB of source, 45 KB bundled). Larger ones are never in the npm tarball: they are published to
graphty.app and fetched on demand.

### 6.2 Hosted layout

- URL: `https://graphty.app/data/graph-samples/v1/<name>.gsnp.gz`. `v1` is the hosting layout's
  version, independent of the npm version, so a later layout change can live beside the old one.
- Format: graph-format's wire container (`snapshot.toBytes()`, the GSNP format), gzipped. Loading
  is `fetch` -> `DecompressionStream("gzip")` -> `fromBytes()`: no parsing, the snapshot comes out
  frozen with its columns. GitHub Pages does not gzip `application/octet-stream`, hence the
  explicit `.gz`.
- `fetchDataset(name, { baseUrl, fetch, signal })` implements it; `baseUrl` points it at a mirror or
  a self-hosted copy, `fetch` is injectable. Names are restricted to `[a-z0-9-]` so a name can never
  escape the base URL.
- GitHub Pages limits: 1 GB per site, 100 MB per file, and it sends
  `Access-Control-Allow-Origin: *`, so browsers on any origin can fetch the files.

### 6.3 Publishing (phase 2)

- `graph-samples/scripts/build-hosted.mjs` converts each large source (URL + SHA-256 recorded, as in
  `convert-datasets.mjs`) into `graph-samples/public-data/v1/<name>.gsnp.gz` and a
  `graph-samples/public-data/v1/index.json` of their metas and checksums. The binaries are build
  output, not committed; the sources are cached in the CI cache keyed by their checksums.
- `ci.yml` uploads `graph-samples/public-data/` as an artifact; `deploy-pages.yml` downloads it and
  copies it to `public/data/graph-samples/` next to the app, docs and storybooks.
- Each hosted dataset still gets a `DatasetMeta` (with `hosting: "remote"`, added then) in
  `DATASETS`, so a picker lists bundled and hosted datasets together.
- Candidates from the research: New York road network (DIMACS, public domain, 264k nodes with
  coordinates), ogbn-arxiv (ODC-BY, 169k, subjects as ground truth), DBLP co-authorship rebuilt
  from the CC0 dblp dump, OpenFlights (ODbL, coordinates), Luxembourg OSM roads.

---------------------------------------------------------------------------------------------------

## 7. Licensing and NOTICE

- Any graph may be included; the owner removes one on request.
- Every dataset records, in its `DatasetMeta` and in `graph-samples/NOTICE`: source URL, citation,
  and the license as known -- or "unclear: " with what is known (Newman's "free for scientific use",
  SuiteSparse's CC BY 4.0 republication).
- The converted files are changed files (node order, encoding, corrections) and NOTICE says so;
  this also satisfies the Stanford GraphBase condition that a changed file be renamed and
  identified as not part of the GraphBase (Les Miserables).
- `test/datasets/datasets.test.ts` fails when NOTICE does not contain a dataset's source, citation
  and license, or when the catalogue and the dataset directories disagree.
- Removing a dataset: delete `src/datasets/<name>/`, its line in `catalog.ts`, its NOTICE entry and
  its README row. The export pattern and the bundle entries follow the directories by themselves.
- Excluded from the start, per the research: non-commercial and no-redistribution sources (Pajek's
  CC BY-NC-SA sets, the Game of Thrones networks, IMDb, MovieLens, CAIDA, Amazon product graphs).

---------------------------------------------------------------------------------------------------

## 8. Workers (phase 2, API already compatible)

Planned: `generateInWorker(generator, options, { workers? })` in a `@graphty/graph-samples/worker`
subpath. For a row-parallel generator it splits the rows into `workers` consecutive ranges, runs
the internal `...Rows` function in each worker, transfers the partial `src` / `dst` buffers back
and concatenates them in range order -- identical to the single call by section 3.6. Sequential
generators run whole in one worker and transfer the result. Ground-truth columns are computed on
the main thread (they depend only on the options). Nothing in the phase 1 API changes.

---------------------------------------------------------------------------------------------------

## 9. Consolidating the existing generators

| Where | What | Plan |
| --- | --- | --- |
| `layout/src/generators/*` (public API of @graphty/layout) | `completeGraph`, `cycleGraph`, `starGraph`, `wheelGraph`, `gridGraph`, `randomGraph`, `scaleFreeGraph`, `bipartiteGraph` | keep the exports; re-implement each as a thin alias that calls graph-samples and adapts to layout's `Graph` shape; deprecate in JSDoc; remove at layout's next major. Their seeded output WILL change (the old LCG has period 233,280 and `randomGraph` / `scaleFreeGraph` are quadratic), so that step is a layout minor with a changelog note. Not in phase 1. |
| `algorithms/stories/utils/graph-generators.ts` | story graphs (Mulberry32) | import from graph-samples |
| `webgpu-graph-algorithms/test/helpers/graphs.ts`, `benchmarks/datasets.ts`, `demo/main.ts` | karate, grids, paths, G(n, m), R-MAT (xorshift32) | import from graph-samples once R-MAT lands (phase 2); fixtures pinned to old outputs are regenerated deliberately |
| `graphty/src/data/sampleGraphs.ts`, `sampleManifest.ts` | the app's sample library | read `DATASETS` and the dataset subpaths through graphty-element's data loading, per the architectural principles (the app does not compute graphs) |

---------------------------------------------------------------------------------------------------

## 10. Roadmap

**Phase 1 (done):** package scaffold and monorepo wiring; the PRNG with known-answer and golden
tests; the deterministic pack, Erdos-Renyi G(n, p) and G(n, m), Barabasi-Albert with Holme-Kim,
Watts-Strogatz, the stochastic block model and planted partition, random bipartite with a planted
matching, Pruefer trees and layered DAGs; seven bundled datasets with NOTICE; `fetchDataset`;
`toElementData`.

**Phase 2:** the rest of the research's first set -- complete multipartite, circular and Mobius
ladders, torus and triangular/hexagonal lattices with optional obstacles, random recursive trees,
more named graphs (Krackhardt kite, Frucht, Tutte, the platonic solids), Chung-Lu with power-law
weights (Miller and Hagberg 2011) and the configuration model, degree-corrected SBM, random
geometric graphs with coordinate columns, R-MAT / Kronecker (replacing the two copies in
webgpu-graph-algorithms), random-order DAG and the Price model, flow networks (grid flow, GENRMF,
AK) with integer capacities, a common `weights` option, position columns for grids; the worker
helper (section 8); hosted large datasets and their publishing (section 6.3); the layout aliases
(section 9).

**Phase 3:** the second wave -- LFR benchmark, hyperbolic random graphs, Delaunay / Gabriel /
relative-neighbourhood graphs and Apollonian networks, forest fire, duplication-divergence, random
regular graphs, Wilson mazes, Gaussian-mixture k-NN clouds, Waxman, Bianconi-Ginestra fitness.

---------------------------------------------------------------------------------------------------

## 11. Decisions made without the owner (all reversible)

- Seeds are required, not defaulted (section 2.3).
- Generator names end in `Graph` (`erdosRenyiGraph`), matching layout's existing names so the
  aliases in section 9 read naturally; options objects everywhere.
- Barabasi-Albert starts from m isolated nodes (networkx's `powerlaw_cluster_graph`), so plain BA
  and Holme-Kim are one algorithm and the edge count is exactly (n - m) m. When a triad step has
  already used every planned target, it draws a fresh preferential target instead of dropping the
  edge (networkx silently merges the duplicate).
- Watts-Strogatz skips a saturated node before drawing, rather than networkx's draw-then-break.
- The package's own build follows graph-format and graph-io (tsc plus a multi-entry vite library
  build, a standalone Node vitest config) rather than `vite.shared.config.ts` and
  `vitest.shared.config.ts`, which build UMD and test under happy-dom.
