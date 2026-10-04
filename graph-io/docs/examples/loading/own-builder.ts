import { readFile } from "node:fs/promises";

import { GraphBuilder } from "@graphty/graph-format";
import { csvImporter } from "@graphty/graph-io/csv";

// The importer sets the direction from the file; weightDtype "f32" halves the memory weights take
const builder = new GraphBuilder({ directed: true, weightDtype: "f32" });

// Two files into one graph: the node table with the labels, then the edge table
const nodes = await csvImporter.import(await readFile("got-nodes.csv"), builder, { table: "nodes" });
const edges = await csvImporter.import(await readFile("got-edges.csv"), builder);

const snapshot = builder.freeze();
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(`warnings: ${nodes.warningCount + edges.warningCount}`);
console.log(`node columns: ${snapshot.nodes.names().join(", ")}`);
