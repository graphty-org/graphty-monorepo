import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got.gexf"), { filename: "got.gexf" });
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);

// GEXF 1.3 is written by default; ask for 1.2 when an older tool needs it
const options = { version: "1.2" } as const;
console.log(checkExport(snapshot, "gexf", options));
await writeFile("got-1.2.gexf", await exportGraphToBytes(snapshot, "gexf", options));
