import { readFile } from "node:fs/promises";

import { importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-edges.csv"), { filename: "got-edges.csv" });
const weights = snapshot.edgeList().weights; // one per edge; null when the graph has no weights

for (let e = 0; e < 3; e++) {
    const source = snapshot.ids.idOf(snapshot.edgeSource(e));
    const target = snapshot.ids.idOf(snapshot.edgeTarget(e));
    console.log(`${String(source)} - ${String(target)}: ${weights ? weights[e] : 1}`);
}
console.log(snapshot.directed ? "directed" : "undirected", snapshot.edges.names());
