import { readFile } from "node:fs/promises";

import { importGraph } from "@graphty/graph-io";

const bytes = await readFile("airlines-sample.gexf");

const { snapshot } = await importGraph(bytes, {
    filename: "airlines-sample.gexf",
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
const loading = importGraph(bytes, { filename: "airlines-sample.gexf", signal: controller.signal });
controller.abort();
try {
    await loading;
} catch (err) {
    console.log(`stopped: ${(err as Error).name}`);
}
