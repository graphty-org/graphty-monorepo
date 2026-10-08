import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("proteins.xgmml"), {
    filename: "proteins.xgmml",
});
console.log(`${snapshot.nodeCount} nodes; node columns: ${snapshot.nodes.names().join(", ")}`);

console.log(checkExport(snapshot, "xgmml").map((n) => n.code));
await writeFile("network.xgmml", await exportGraphToBytes(snapshot, "xgmml"));
