import { readFile } from "node:fs/promises";

import { importAllGraphs, importGraph, listGraphs } from "@graphty/graph-io";

// A Cytoscape session holds several networks: list them, then read one by name
const session = await readFile("authored-3x.cys");
const graphs = await listGraphs(session, { filename: "authored-3x.cys" });
for (const g of graphs ?? []) {
    console.log(`#${g.index} ${g.name}: ${g.nodes ?? "?"} nodes, ${g.edges ?? "?"} edges`);
}
const alpha = await importGraph(session, { filename: "authored-3x.cys", graphName: "Alpha" });
console.log(`Alpha: ${alpha.snapshot.nodeCount} nodes`);

// DOT cannot list its graphs, but graphIndex and graphName still choose one
const dot = "digraph first { a -> b }\ndigraph second { x -> y; y -> z }";
const second = await importGraph(dot, { format: "dot", graphIndex: 1 });
console.log(`${second.snapshot.meta.name}: ${second.snapshot.edgeCount} edges`);

// Or read every graph of a file at once
for (const { snapshot } of await importAllGraphs(dot, { format: "dot" })) {
    console.log(`${snapshot.meta.name}: ${snapshot.edgeCount} edges`);
}
