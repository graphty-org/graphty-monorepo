import { importGraph } from "@graphty/graph-io";

import "./netscope.js";

const file = [
    "Exported by NetScope 4.2",
    "Instrument: bench-3",
    "",
    "source,target,weight",
    "A,B,0.5",
    "B,C,0.25",
    "C,D", // a row with a missing cell, on line 7 of the file
].join("\n");
const { format, snapshot, report } = await importGraph(file, { filename: "run-12.nsc" });
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(report.issues.map((i) => `${i.code} (line ${i.line ?? "-"}): ${i.message}`));
