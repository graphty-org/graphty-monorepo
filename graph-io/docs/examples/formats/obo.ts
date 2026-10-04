import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("basic.obo"), { filename: "basic.obo" });
for (let i = 0; i < snapshot.nodeCount; i++) {
    console.log(`${String(snapshot.ids.idOf(i))} ${String(snapshot.nodes.value("name", i))}`);
}
for (let e = 0; e < snapshot.edgeCount; e++) {
    const from = snapshot.ids.idOf(snapshot.edgeSource(e));
    const to = snapshot.ids.idOf(snapshot.edgeTarget(e));
    console.log(`${String(from)} ${String(snapshot.edges.value("relation", e))} ${String(to)}`);
}

// Write it back as OBO, or as OBO Graphs JSON
await writeFile("basic-copy.obo", await exportGraphToString(snapshot, "obo"));
await writeFile("basic.json", await exportGraphToString(snapshot, "json", { dialect: "obographs" }));
