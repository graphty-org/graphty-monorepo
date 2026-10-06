import { writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, loadFromUrl } from "@graphty/graph-io";

const { snapshot } = await loadFromUrl(
    "https://raw.githubusercontent.com/melaniewalsh/sample-social-network-datasets/master/sample-datasets/game-of-thrones/got-network.graphml",
);

for (const note of checkExport(snapshot, "csv")) {
    // `column` names the attribute a note is about (null for the graph as a whole)
    console.warn(`${note.code} (${note.column ?? "graph"}): ${note.message}`);
}
await writeFile("got-edges-out.csv", await exportGraphToBytes(snapshot, "csv"));
