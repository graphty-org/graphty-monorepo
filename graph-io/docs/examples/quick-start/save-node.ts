import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("lesmiserables.gexf"), { filename: "lesmiserables.gexf" });

for (const note of checkExport(snapshot, "csv")) {
    console.warn(`${note.code}: ${note.message}`);
}
await writeFile("lesmiserables.csv", await exportGraphToBytes(snapshot, "csv"));
