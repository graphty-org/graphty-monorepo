import { readFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-nodes.csv"), { filename: "got-nodes.csv" });

// A copy with its own attribute tables; it shares the nodes, edges and ids, so it is cheap.
// Code that holds `snapshot` still sees "Label".
const forVis = snapshot.withColumns();

// vis.js shows a node's `label`; this file calls it `Label`
forVis.nodes.rename("Label", "label");
console.log(snapshot.nodes.names(), forVis.nodes.names());

const json = await exportGraphToString(forVis, "json", { dialect: "vis", indent: 2 });
console.log(json.slice(0, json.indexOf("},") + 2));
