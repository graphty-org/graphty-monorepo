import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

// Pajek numbers vertices 1..N; with sanitizeIds: "mangle" the file also keeps the original ids ("Myriel", ...)
const { snapshot } = await importGraph(await readFile("miserables.json"), { filename: "miserables.json" });
const options = { sanitizeIds: "mangle" } as const;
for (const note of checkExport(snapshot, "pajek", options)) {
    console.log(`${note.code}: ${note.message}`);
}
const bytes = await exportGraphToBytes(snapshot, "pajek", options);
await writeFile("miserables.net", bytes);

// Reading the file back restores the original ids
const back = await importGraph(bytes, { filename: "miserables.net" });
console.log(`first id after the round trip: ${String(back.snapshot.ids.idOf(0))}`);
