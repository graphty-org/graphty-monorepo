import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToBytes, importGraph } from "@graphty/graph-io";

// Node files first, then relationship files, as neo4j-admin import takes them
const { snapshot, report } = await importGraph(await readFile("movies-nodes.csv"), {
    format: "neo4j",
    relationships: await readFile("movies-rels.csv"),
});
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} relationships, ${report.warningCount} warnings`);
console.log(`node columns: ${snapshot.nodes.names().join(", ")}`);

await writeFile("movies-nodes-out.csv", await exportGraphToBytes(snapshot, "neo4j", { part: "nodes" }));
await writeFile("movies-rels-out.csv", await exportGraphToBytes(snapshot, "neo4j", { part: "relationships" }));
