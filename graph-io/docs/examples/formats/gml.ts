import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

// got.gml's ids are numbers, and the names kept beside them are restored on reading
const { snapshot } = await importGraph(await readFile("got.gml"), { filename: "got.gml" });
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);
console.log(`node 0: id ${JSON.stringify(snapshot.ids.idOf(0))}, label ${String(snapshot.nodes.value("label", 0))}`);

// Saving it again numbers the nodes and keeps the names the same way
console.log(checkExport(snapshot, "gml").map((n) => n.code));
await writeFile("got-copy.gml", await exportGraphToBytes(snapshot, "gml"));
