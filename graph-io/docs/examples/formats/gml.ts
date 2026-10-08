import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

// got.gml was saved with sanitizeIds: "mangle": its ids are numbers, and the names are restored on reading
const { snapshot } = await importGraph(await readFile("got.gml"), { filename: "got.gml" });
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);
console.log(`node 0: id ${JSON.stringify(snapshot.ids.idOf(0))}, label ${String(snapshot.nodes.value("label", 0))}`);

// Saving it again needs the same option, because the ids are text once more
const options = { sanitizeIds: "mangle" } as const;
console.log(checkExport(snapshot, "gml", options).map((n) => n.code));
await writeFile("got-copy.gml", await exportGraphToBytes(snapshot, "gml", options));
