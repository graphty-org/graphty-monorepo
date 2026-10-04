import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot, format, report } = await importGraph(await readFile("lesmiserables.gexf"), {
    filename: "lesmiserables.gexf",
});
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
for (const issue of report.issues) {
    console.warn(`${issue.code} line ${issue.line ?? "-"}: ${issue.message}`);
}
await writeFile("lesmiserables.graphml", await exportGraphToBytes(snapshot, "graphml"));
