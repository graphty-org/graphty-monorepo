import { readFile } from "node:fs/promises";

import { importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-nodes.csv"), { filename: "got-nodes.csv" });

console.log(snapshot.nodes.names()); // the node attributes, by name
console.log(snapshot.nodes.value("Label", 0)); // one value: attribute name, node index
console.log(snapshot.nodes.byRole("label")?.meta.name); // the attribute that labels the nodes
console.log(snapshot.ids.requireIndex("Arya")); // a node's index from its id
