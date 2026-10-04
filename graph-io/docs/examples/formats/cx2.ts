import { readFile, writeFile } from "node:fs/promises";

import { checkExport, exportGraphToBytes, importGraph } from "@graphty/graph-io";

const { snapshot, report } = await importGraph(await readFile("glypican2.cx2"), { filename: "glypican2.cx2" });
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(report.issues.map((i) => i.code));

console.log(checkExport(snapshot, "cx2").map((n) => n.code));
await writeFile("glypican2-copy.cx2", await exportGraphToBytes(snapshot, "cx2"));
