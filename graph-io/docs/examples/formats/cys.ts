import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph, listGraphs } from "@graphty/graph-io";

// A session is a zip file: always pass bytes, never text
const session = await readFile("networks.cys");
for (const g of (await listGraphs(session, { filename: "networks.cys" })) ?? []) {
    console.log(`network ${g.index}: ${g.name}`);
}
const { snapshot } = await importGraph(session, { filename: "networks.cys", graphName: "Alpha" });
console.log(`Alpha: ${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);

// Write any graph as a session Cytoscape Desktop can open; session node ids are integers
const got = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });
const options = { sanitizeIds: "mangle" } as const;
console.log(checkExport(got.snapshot, "cys", options).map((n) => n.code));
await writeFile("got.cys", await exportGraphToBytes(got.snapshot, "cys", options));
