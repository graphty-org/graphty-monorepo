import { readFile } from "node:fs/promises";

import { importGraph, isAbortError } from "@graphty/graph-io";

const bytes = await readFile("got.gexf");

const { snapshot } = await importGraph(bytes, {
    filename: "got.gexf",
    signal: AbortSignal.timeout(10_000), // give up after 10 seconds
    onProgress: (done, total) => {
        if (done === total) {
            console.log(`read ${done} bytes`);
        }
    },
});
console.log(`${snapshot.nodeCount} nodes`);

// Cancel a load yourself
const controller = new AbortController();
const loading = importGraph(bytes, { filename: "got.gexf", signal: controller.signal });
controller.abort();
try {
    await loading;
} catch (err) {
    // a cancelled load is not an error to show the user
    console.log(isAbortError(err) ? "cancelled" : `failed: ${String(err)}`);
}
