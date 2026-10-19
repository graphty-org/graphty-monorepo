import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

// An edge table, with the node table passed alongside it
const { snapshot } = await importGraph(await readFile("got-edges.csv"), {
    filename: "got-edges.csv",
    defaultDirected: false, // the table has no Type column; these edges are undirected
    nodes: await readFile("got-nodes.csv"),
});
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);

// One CSV file holds one table: write the edges and the nodes separately
console.log(checkExport(snapshot, "csv").map((n) => n.code));
await writeFile("edges.csv", await exportGraphToBytes(snapshot, "csv"));
await writeFile("nodes.csv", await exportGraphToBytes(snapshot, "csv", { table: "nodes" }));
