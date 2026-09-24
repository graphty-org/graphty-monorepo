# CLAUDE.md

This file provides guidance to Claude Code when working with the @graphty/graph-samples package.

## Project Overview

@graphty/graph-samples produces graphs to demonstrate and test the rest of the monorepo: seeded
random-graph generators, the deterministic classic families, and small real datasets with ground
truth. Every graph is a `SampleGraph` (typed arrays, structurally a graph-format `EdgeArraysInput`),
so `fromEdgeArrays()` loads it in one call.

The design, the determinism contract and the roadmap are in
`design/graph-samples/graph-samples-design.md` in the monorepo.

## Package Structure

```
graph-samples/
+-- package.json             # exports ".", "./generators", "./datasets/*"; graph-format is a dependency and a peer
+-- project.json             # Nx project "graph-samples"
+-- NOTICE                   # every dataset's source, citation and license (a test keeps it in sync)
+-- scripts/entries.js       # bundle entries: root, generators, one per src/datasets/<name>/index.ts
+-- scripts/build-bundle.js  # multi-entry vite build -> dist/graph-samples.js, dist/generators.js, dist/datasets/<name>.js
+-- scripts/bundle-types.js  # the matching dist/*.d.ts shims
+-- scripts/convert-datasets.mjs  # sources (URL + SHA-256) -> src/datasets/<name>/data.ts
+-- scripts/build-hosted.mjs     # sources (URL + SHA-256) -> public-data/v1/<name>.gsnp.gz, index.json, src/datasets/hosted.ts
+-- public-data/             # build output of build-hosted.mjs (gitignored), published by deploy-pages.yml
+-- src/
|   +-- index.ts             # root: SampleGraph, DatasetMeta, DATASETS, fetchDataset, toElementData
|   +-- types.ts             # SampleGraph
|   +-- element.ts           # toElementData (graphty-element nodeData / edgeData records)
|   +-- random/              # threefry.ts (block function), log.ts / exp.ts / trig.ts (fdlibm ports), stream.ts (RandomStream, DEFAULT_SEED)
|   +-- generators/          # index.ts (the subpath barrel), util.ts (checks, EdgeBuffer, bernoulliSegment), one file per family
|   +-- datasets/            # build.ts (types + buildDataset), catalog.ts, remote.ts, hosted.ts (generated), <name>/{index,meta,data}.ts
+-- test/                    # mirrors src/; helpers/graph.ts has naive reference checks
```

## Commands

```bash
npm run build:all        # tsc, then the vite bundle and the d.ts shims
npm run test:run         # all tests once (Node, a few seconds)
npm run coverage         # thresholds 80/80/75/80
npm run lint             # eslint + tsc --noEmit
npm run datasets:convert # re-create src/datasets/*/data.ts from the recorded sources (needs unzip)
npm run datasets:hosted  # build public-data/v1/ and src/datasets/hosted.ts (needs unzip and graph-format/dist)
```

## The determinism contract (do not break it)

- Every random draw comes from `RandomStream(seed, domain, block)` in `src/random/stream.ts`.
  Never `Math.random`, never `Math.log` / `Math.exp` / `Math.pow` / `Math.sin` / `Math.cos` in a path
  that decides an edge (use `detLog`, `detExp`, `detPow`, `detCosSinTurn`), never iteration over a
  hash container whose order is not insertion order. `Math.sqrt` is allowed (IEEE 754 requires it
  correctly rounded); compare squared distances in decisions where possible.
- `seed` is optional: `resolveSeed(options.seed)` gives `DEFAULT_SEED` (0) when it is absent. Never
  default to the clock or `Math.random`.
- `domain` strings are frozen (the full list is in the design, sections 3.3 and 2.6). A new
  generator gets a new domain whose FNV-1a hash differs from every existing one.
- `block` is a unit of work the algorithm defines (a row, a node), never a worker or chunk index.
  Row-parallel generators expose an internal `...Rows(options, start, end, out)` function; the
  tests check that any chunking reproduces the whole graph.
- `test/random/*.test.ts` holds known-answer vectors and golden values, and
  `test/generators/random.test.ts` a golden hash per generator. A failing golden value means every
  seeded graph changed: that is a breaking change, never a test to update. Changing a generator's
  algorithm, draw order, edge order or node order is the same breaking change.

## Adding a generator

1. Write the tests first in `test/generators/`: structure (against `test/helpers/graph.ts`),
   argument errors, a 100k-node size test when cheap, determinism, and a golden hash.
2. Implement it in `src/generators/<family>.ts` with an options object extending `WeightOptions`
   (an optional `seed` resolved with `resolveSeed`, and the common `weights` option applied last with
   `applyWeights`), `checkInt` / `checkProbability` on every option, a new frozen stream domain, and
   a JSDoc stating the node order, the edge order, the draw order, the paper and the cost.
3. Emit ground truth as a node column (`community` u32, `side` u8, `layer` u32) and geometry as
   Float64 `x`, `y`, `z` columns (the `euclidean` weights read them). Golden-hash with
   `fullGraphHash` when weights or columns are part of the output.
4. Export it from `src/generators/index.ts` and list it in README.md.

## Adding a bundled dataset (under about 5,000 nodes)

1. Add its source (URL, SHA-256, file) and a converter to `scripts/convert-datasets.mjs`; run
   `npm run datasets:convert`. `data.ts` is generated: never edit it by hand.
2. Write `src/datasets/<name>/meta.ts` (the `DatasetMeta`) and `index.ts` (re-export the meta, and a
   loader calling `buildDataset(DATA)`), add the meta to `src/datasets/catalog.ts`, and add the
   dataset to `NOTICE` and README.md. `test/datasets/datasets.test.ts` checks counts, columns, NOTICE
   and the catalogue; add a content test for what the dataset is known for.
3. The `./datasets/*` export pattern and `scripts/entries.js` pick the new directory up by themselves.

Removing a dataset: delete its directory and its lines in `catalog.ts`, `NOTICE` and README.md.

## Adding a hosted dataset (over about 5,000 nodes)

Hosted datasets are published at `https://graphty.app/data/graph-samples/v1/<name>.gsnp.gz`
(graph-format wire bytes, gzipped) and loaded with `fetchDataset(name)`.

1. Add its sources (URL, SHA-256, file) to `SOURCES` in `scripts/build-hosted.mjs`, and an entry to
   its `DATASETS`: the meta prose (title, description, citation, source, license, attributes,
   groundTruth, showcases) and a `build(files)` returning `fromEdgeArrays` input with its node
   columns. Counts, direction, weights, `bytes` and `sha256` come from the built file.
2. Run `npm run datasets:hosted`. It rewrites `src/datasets/hosted.ts` (generated: never edit it by
   hand), which `catalog.ts` spreads into `DATASETS` with `hosting: "remote"`. Add the dataset to
   `NOTICE` as `(hosted: <name>)` and to README.md's hosted table.
3. Commit the script, `hosted.ts`, `NOTICE` and README.md, never `public-data/`. The deploy workflow
   (`.github/workflows/deploy-pages.yml`) reruns the script, with the sources cached by the script's
   hash, and publishes `public-data/v1/`. `test/datasets/hosted.test.ts` round-trips every built
   file through `fetchDataset` where the files exist, and checks it against `hosted.ts`.
4. Keep each file under GitHub Pages' 100 MB per-file limit (the site limit is 1 GB). The output is
   deterministic for a Node.js major version; the workflow and CI use Node 22.

Removing one: delete its `DATASETS` entry in the script, rerun it, and drop its NOTICE and README
lines.

## House Style

Same as graph-format and graph-io: JSDoc on every exported function, explicit return types,
`import { type X, y }` inline type qualifiers, `.js` suffixes, `curly`, no default exports, no
`console.log` in `src/`, no `eslint-disable`, and plain ASCII in every file
(`test/build-output.test.ts` enforces it).
