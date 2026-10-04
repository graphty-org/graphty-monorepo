import { importGraph } from "@graphty/graph-io";

import "./netscope.js";

const file = "Exported by NetScope 4.2\nInstrument: bench-3\n\nsource,target,weight\nA,B,0.5\nB,C,0.25\n";
const { format, snapshot, report } = await importGraph(file, { filename: "run-12.nsc" });
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(report.issues.map((i) => `${i.code}: ${i.message}`));
