import { readFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-nodes.csv"), { filename: "got-nodes.csv" });

// vis.js shows a node's `label`; this file calls it `Label`
snapshot.nodes.rename("Label", "label");
const json = await exportGraphToString(snapshot, "json", { dialect: "vis", indent: 2 });
console.log(json.slice(0, json.indexOf("},") + 2));
