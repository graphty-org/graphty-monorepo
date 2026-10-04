import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });

for (const note of checkExport(snapshot, "csv")) {
    // `column` names the attribute a note is about (null for the graph as a whole)
    console.warn(`${note.code} (${note.column ?? "graph"}): ${note.message}`);
}
await writeFile("got-edges-out.csv", await exportGraphToBytes(snapshot, "csv"));
