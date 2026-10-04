import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-edges.csv"), {
    filename: "got-edges.csv",
    defaultDirected: false, // the table has no Type column; these edges are undirected
    nodes: await readFile("got-nodes.csv"),
});

// Without options: two ids ("Jon Arryn", "Robert Arryn") contain a space, which a GraphML id cannot
for (const note of checkExport(snapshot, "graphml")) {
    console.log(`${note.code}: ${note.message}`);
}

// sanitizeIds: "mangle" rewrites those ids and keeps the originals in the file
const options = { sanitizeIds: "mangle" } as const;
const notes = checkExport(snapshot, "graphml", options);
console.log(notes.map((n) => n.code));
if (notes.some((n) => n.code.startsWith("E_"))) {
    throw new Error("still cannot write this graph as GraphML");
}
await writeFile("got.graphml", await exportGraphToBytes(snapshot, "graphml", options));
