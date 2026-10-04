import { readFile } from "node:fs/promises";

import { exportGraphToBytes, importGraph, listFormats } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-network.graphml"), { filename: "got-network.graphml" });

// one object for saves to every format
const options = { sanitizeIds: "mangle", sanitizeKeys: "mangle", onMixedDirection: "directed" } as const;

const counts: string[] = [];
for (const { format } of listFormats().filter((f) => f.canExport)) {
    const back = await importGraph(await exportGraphToBytes(snapshot, format, options), { format });
    counts.push(`${format} ${back.snapshot.nodeCount}/${back.snapshot.edgeCount}`);
}
console.log(counts.join(", "));
