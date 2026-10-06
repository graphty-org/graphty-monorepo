import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot, report } = await importGraph(await readFile("got.cx2"), { filename: "got.cx2" });
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, first id ${String(snapshot.ids.idOf(0))}`);
console.log(report.issues.map((i) => i.code));

// The ids were restored to the names, which CX2 cannot hold as ids, so saving needs "mangle" again
const options = { sanitizeIds: "mangle" } as const;
console.log(checkExport(snapshot, "cx2", options).map((n) => n.code));
await writeFile("got-copy.cx2", await exportGraphToBytes(snapshot, "cx2", options));
