import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("polbooks.gml"), { filename: "polbooks.gml" });
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);
console.log(`node 0: ${String(snapshot.nodes.value("label", 0))}, ${String(snapshot.nodes.value("value", 0))}`);

console.log(checkExport(snapshot, "gml"));
await writeFile("polbooks-copy.gml", await exportGraphToBytes(snapshot, "gml"));
