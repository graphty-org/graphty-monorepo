import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

// Pajek numbers vertices 1..N; with sanitizeIds: "mangle" the file also keeps the original ids ("Aemon", ...)
const { snapshot } = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });
const options = { sanitizeIds: "mangle" } as const;
for (const note of checkExport(snapshot, "pajek", options)) {
    console.log(`${note.code}: ${note.message}`);
}
const bytes = await exportGraphToBytes(snapshot, "pajek", options);
await writeFile("got-mangled.net", bytes);

// Reading the file back restores the original ids
const back = await importGraph(bytes, { filename: "got-mangled.net" });
console.log(`first id after the round trip: ${String(back.snapshot.ids.idOf(0))}`);

// got.net was saved without "mangle": its ids are the numbers 1..107 and the names are labels
const plain = await importGraph(await readFile("got.net"), { filename: "got.net" });
console.log(
    `got.net: id ${String(plain.snapshot.ids.idOf(0))}, label ${String(plain.snapshot.nodes.value("label", 0))}`,
);
