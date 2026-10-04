import { readFile } from "node:fs/promises";

import { GraphBuilder } from "@graphty/graph-format";
import { csvImporter } from "@graphty/graph-io/csv";

// `directed` is only a starting value: the first file read into the empty builder sets the direction.
// weightDtype "f32" halves the memory the weights take.
const builder = new GraphBuilder({ directed: true, weightDtype: "f32" });

// Two files into one graph: the node table with the labels, then the edge table
const nodes = await csvImporter.import(await readFile("got-nodes.csv"), builder, { table: "nodes" });
// the edge table has no Type column, so say the edges are undirected
const edges = await csvImporter.import(await readFile("got-edges.csv"), builder, { defaultDirected: false });

const snapshot = builder.freeze();
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, directed: ${snapshot.directed}`);
console.log(`warnings: ${nodes.warningCount + edges.warningCount}`);
console.log(`node columns: ${snapshot.nodes.names().join(", ")}`);
