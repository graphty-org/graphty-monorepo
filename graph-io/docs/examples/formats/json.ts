import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";
import { jsonShapeOf } from "@graphty/graph-io/json";

// got.json is a d3 file whose link strengths are in "value"; weightFrom reads them as the edge weights
const { snapshot } = await importGraph(await readFile("got.json"), { filename: "got.json", weightFrom: "value" });
console.log(`${jsonShapeOf(snapshot)?.dialect}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(`first weight: ${String(snapshot.edgeList().weights?.[0])}`);

// Pick another dialect with the dialect option
const cytoscape = await exportGraphToString(snapshot, "json", { dialect: "cytoscape", indent: 2 });
console.log(cytoscape.split("\n").slice(0, 8).join("\n"));
await writeFile("got.cyjs", cytoscape);
