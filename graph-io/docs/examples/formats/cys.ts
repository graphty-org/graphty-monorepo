import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph, listGraphs } from "@graphty/graph-io";

// A session is a zip file: always pass bytes, never text
const session = await readFile("authored-3x.cys");
for (const g of (await listGraphs(session, { filename: "authored-3x.cys" })) ?? []) {
    console.log(`network ${g.index}: ${g.name}`);
}
const { snapshot } = await importGraph(session, { filename: "authored-3x.cys", graphName: "Alpha" });
console.log(`Alpha: ${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);

// Write any graph as a session Cytoscape Desktop can open
const karate = await importGraph(await readFile("karate.gml"), { filename: "karate.gml" });
console.log(checkExport(karate.snapshot, "cys").map((n) => n.code));
await writeFile("karate.cys", await exportGraphToBytes(karate.snapshot, "cys"));
