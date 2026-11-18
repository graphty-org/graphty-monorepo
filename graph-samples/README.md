<img src="https://raw.githubusercontent.com/graphty-org/brand/main/guide/on-white/png/graphty-graph-samples-lockup-color-on-light-800w.png" alt="graphty graph-samples" width="403">

# @graphty/graph-samples

Graphs to try things on: seeded random-graph generators that produce the same graph on every
machine, the classic deterministic families, and a handful of well-known real networks with their
ground truth. The generators produce typed arrays that
[`@graphty/graph-format`](https://www.npmjs.com/package/@graphty/graph-format) loads in one call, and that a Web Worker can transfer;
the real networks download from graphty.app as graph-format snapshots when you ask for them.

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

## Documentation

The full documentation is at **https://graphty.app/docs/graph-samples/**: a getting-started
guide, every generator and its options, every dataset with its size, source and license, and the
API reference.

```ts
import { fetchDataset } from "@graphty/graph-samples";

const club = await fetchDataset("karate"); // 34 nodes, 78 weighted edges, node column `club`
```

## Draw one with graphty-element

```ts
import { toElementData } from "@graphty/graph-samples";
import { football } from "@graphty/graph-samples/datasets/football";

const { nodes, edges } = toElementData(await football());
element.nodeData = nodes; // { id, label, conference }
element.edgeData = edges; // { source, target }
```

graphty-element also loads them itself, from the address you give it:
`session.data.loadDataset("football", { baseUrl: DEFAULT_DATASET_BASE_URL })` and
`session.data.generate("barabasi-albert", { n: 500 })`, with `session.catalog.datasets()` and
`session.catalog.generators()` listing what it can load.

## Licenses

The code is MIT. The datasets are the work of their authors: `NOTICE` lists each one's source,
citation and license as known. Some are marked "unclear" -- their publishers state no license.
If you are a rights holder and want a dataset removed, open an issue.
