import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";
import { type JsonShapeMeta } from "@graphty/graph-io/json";

// The dialect is detected from the document; a re-export writes the same dialect back
const { snapshot } = await importGraph(await readFile("miserables.json"), { filename: "miserables.json" });
const { dialect } = snapshot.meta.extra.json as JsonShapeMeta;
console.log(`${dialect}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);

// Pick another dialect with the dialect option
const cytoscape = await exportGraphToString(snapshot, "json", { dialect: "cytoscape", indent: 2 });
console.log(cytoscape.split("\n").slice(0, 8).join("\n"));
await writeFile("miserables.cyjs", cytoscape);
