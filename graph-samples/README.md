<img src="https://raw.githubusercontent.com/graphty-org/brand/main/guide/on-white/png/graphty-graph-samples-lockup-color-on-light-800w.png" alt="graphty graph-samples" width="403">

# @graphty/graph-samples

Graphs to try things on: seeded random-graph generators that produce the same graph on every
machine, the classic deterministic families, and a handful of well-known real networks with their
ground truth. The generators produce typed arrays that
[`@graphty/graph-format`](../graph-format) loads in one call, and that a Web Worker can transfer;
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

## Publishing the datasets

The small datasets are converted into the repository (`data/<name>.ts`, by
`npm run datasets:convert`), and graph-samples' build packs them into `dist/data/v1/<name>.gsnp.gz`
(`scripts/pack-datasets.mjs`; `npm run datasets:pack` also rewrites their sizes and checksums in
`src/datasets/packed.ts`). Its pictures are drawn by graphty-element with
`node tools/render-sample-thumbnails.mjs` (from the monorepo root, after a build) into `thumbnails/`,
committed, and copied beside each file by the same step, with the large datasets' and the
generators' pictures (`generator-<name>.webp`). Neither `data/` nor `dist/data/` is
published to npm.

`npm run datasets:hosted` (`scripts/build-hosted.mjs`) downloads each large dataset's source,
checks it against the SHA-256 recorded in the script, and writes `public-data/v1/<name>.gsnp.gz`
and `src/datasets/hosted.ts` (the catalogue entries); it copies the small datasets' files from
`dist/data/v1/` beside them and writes `index.json` for all of them. The `.gsnp.gz` files are not
committed: every deploy of graphty.app (`.github/workflows/deploy-pages.yml`) runs the script and
publishes `public-data/v1/` at `/data/graph-samples/v1/`. The build is deterministic for a given
Node.js major version (the workflow uses 22), so the committed checksums match the published
files. To add, change or remove a large dataset, edit the script, run it, commit the script and
`src/datasets/hosted.ts` together with `NOTICE`, and merge to master.

## Draw one with graphty-element

```ts
import { toElementData } from "@graphty/graph-samples";
import { football } from "@graphty/graph-samples/datasets/football";

const { nodes, edges } = toElementData(await football());
element.nodeData = nodes; // { id, label, conference }
element.edgeData = edges; // { source, target }
```

graphty-element also loads them itself: `session.data.loadDataset("football")` and
`session.data.generate("barabasi-albert", { n: 500 })`, with `session.catalog.datasets()` and
`session.catalog.generators()` listing what it can load.

## Licenses

The code is MIT. The datasets are the work of their authors: `NOTICE` lists each one's source,
citation and license as known. Some are marked "unclear" -- their publishers state no license.
If you are a rights holder and want a dataset removed, open an issue.
