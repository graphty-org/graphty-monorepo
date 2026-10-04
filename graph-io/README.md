# @graphty/graph-io

[![CI](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/graphty-org/graphty-monorepo/badge.svg?branch=master)](https://coveralls.io/github/graphty-org/graphty-monorepo?branch=master)
[![npm version](https://img.shields.io/npm/v/@graphty/graph-io.svg)](https://www.npmjs.com/package/@graphty/graph-io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Read and write 13 graph file formats, from GraphML and GEXF to CSV, JSON and Cytoscape sessions, as
[@graphty/graph-format](https://www.npmjs.com/package/@graphty/graph-format) snapshots. graph-io
streams large files, runs in browsers and Node with no other dependencies, and tells you what it
could not read or could not save instead of dropping it.

```bash
npm install @graphty/graph-io
```

<!-- generated:begin example:quick-start/readme -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot, format, report } = await importGraph(await readFile("lesmiserables.gexf"), {
    filename: "lesmiserables.gexf",
});
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
for (const issue of report.issues) {
    console.warn(`${issue.code} line ${issue.line ?? "-"}: ${issue.message}`);
}
await writeFile("lesmiserables.graphml", await exportGraphToBytes(snapshot, "graphml"));
```

<!-- generated:end -->

**Read the [Quick start](https://graphty.app/docs/graph-io/guide/quick-start)**
([docs/guide/quick-start.md](./docs/guide/quick-start.md) in the repository) to load files from URLs
and file pickers, check what a save would lose, and handle errors. The full documentation is at
[graphty.app/docs/graph-io](https://graphty.app/docs/graph-io/).

Formats: [JSON](https://graphty.app/docs/graph-io/guide/formats/json) (NetworkX, d3, JGF,
Cytoscape.js, graphology, vis.js, OBO Graphs),
[GraphML](https://graphty.app/docs/graph-io/guide/formats/graphml),
[GEXF](https://graphty.app/docs/graph-io/guide/formats/gexf),
[CSV and TSV](https://graphty.app/docs/graph-io/guide/formats/csv),
[GML](https://graphty.app/docs/graph-io/guide/formats/gml),
[DOT](https://graphty.app/docs/graph-io/guide/formats/dot),
[Pajek](https://graphty.app/docs/graph-io/guide/formats/pajek),
[Neo4j CSV](https://graphty.app/docs/graph-io/guide/formats/neo4j),
[XGMML](https://graphty.app/docs/graph-io/guide/formats/xgmml),
[CX2](https://graphty.app/docs/graph-io/guide/formats/cx2),
[CX](https://graphty.app/docs/graph-io/guide/formats/cx),
[OBO](https://graphty.app/docs/graph-io/guide/formats/obo) and
[Cytoscape sessions](https://graphty.app/docs/graph-io/guide/formats/cys). Each one is read and
written.

## License

MIT
