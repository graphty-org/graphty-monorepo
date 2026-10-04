# @graphty/graph-io

[![npm version](https://img.shields.io/npm/v/@graphty/graph-io.svg)](https://www.npmjs.com/package/@graphty/graph-io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Read and write 13 graph file formats, from GraphML and GEXF to CSV, JSON and Cytoscape sessions, as
[@graphty/graph-format](https://www.npmjs.com/package/@graphty/graph-format) snapshots. graph-io
streams large files, runs in browsers and Node with no other dependencies, and tells you what it
could not read or could not save instead of dropping it.

```bash
npm install @graphty/graph-io
```

This reads
[got-network.graphml](https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-network.graphml),
a public-domain Game of Thrones network; download it to run the example as it is.

<!-- generated:begin example:quick-start/readme -->

```ts
import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot, format, report } = await importGraph(await readFile("got-network.graphml"), {
    filename: "got-network.graphml",
});
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
for (const issue of report.issues) {
    console.warn(`${issue.code} line ${issue.line ?? "-"}: ${issue.message}`);
}
await writeFile("got-network.gexf", await exportGraphToBytes(snapshot, "gexf"));
```

<!-- generated:end -->

**Start with the
[Quick start](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/quick-start.md)**:
load files from URLs and file pickers, use the graph data, check what a save would lose, and
handle errors. The rest of the guide, including how to add a format of your own, is in the same
[docs/guide](https://github.com/graphty-org/graphty-monorepo/tree/master/graph-io/docs/guide)
directory, and the sample files its examples read are in
[docs/samples](https://github.com/graphty-org/graphty-monorepo/tree/master/graph-io/docs/samples).
The guide and the API reference are also published at
[graphty.app/docs/graph-io](https://graphty.app/docs/graph-io/).

Formats: [JSON](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/json.md) (NetworkX, d3, JGF,
Cytoscape.js, graphology, vis.js, OBO Graphs),
[GraphML](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/graphml.md),
[GEXF](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/gexf.md),
[CSV and TSV](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/csv.md),
[GML](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/gml.md),
[DOT](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/dot.md),
[Pajek](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/pajek.md),
[Neo4j CSV](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/neo4j.md),
[XGMML](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/xgmml.md),
[CX2](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/cx2.md),
[CX](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/cx.md),
[OBO](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/obo.md) and
[Cytoscape sessions](https://github.com/graphty-org/graphty-monorepo/blob/master/graph-io/docs/guide/formats/cys.md). Each one is read and
written.

## License

MIT
