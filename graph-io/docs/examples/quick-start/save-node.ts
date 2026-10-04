import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });

for (const note of checkExport(snapshot, "csv")) {
    console.warn(`${note.code}: ${note.message}`);
}
await writeFile("got-edges-out.csv", await exportGraphToBytes(snapshot, "csv"));
