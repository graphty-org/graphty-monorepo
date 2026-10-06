import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

import { exportGraph, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-network.graphml"), {
    filename: "got-network.graphml",
});

// The file is written chunk by chunk; the whole document is never held in memory
await pipeline(exportGraph(snapshot, "gexf"), createWriteStream("got-copy.gexf"));
