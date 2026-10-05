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
