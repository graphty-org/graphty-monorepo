import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("SimpleNetwork.cx"), { filename: "SimpleNetwork.cx" });
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);

// Every CX edge is directed, so an undirected graph is written with a warning
const karate = await importGraph(await readFile("karate.gml"), { filename: "karate.gml" });
console.log(checkExport(karate.snapshot, "cx").map((n) => n.code));
await writeFile("karate.cx", await exportGraphToBytes(karate.snapshot, "cx"));
