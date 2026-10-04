import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got.cx"), { filename: "got.cx" });
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);

// CX node ids are integers, so a graph with text ids needs sanitizeIds: "mangle"
const got = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });
console.log(checkExport(got.snapshot, "cx").map((n) => n.code));
const options = { sanitizeIds: "mangle" } as const;
console.log(checkExport(got.snapshot, "cx", options).map((n) => n.code));
await writeFile("got-copy.cx", await exportGraphToBytes(got.snapshot, "cx", options));
