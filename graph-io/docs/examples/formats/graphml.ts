import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });
console.log(`${snapshot.nodeCount} nodes; edge columns: ${snapshot.edges.names().join(", ")}`);

// Two node ids hold characters a GraphML id cannot; "mangle" rewrites them and keeps the originals
const options = { sanitizeIds: "mangle" } as const;
console.log(checkExport(snapshot, "graphml", options).map((n) => n.code));
await writeFile("got.graphml", await exportGraphToBytes(snapshot, "graphml", options));
