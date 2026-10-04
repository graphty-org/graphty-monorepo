import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("cluster.gv"), { filename: "cluster.gv" });
console.log(`${snapshot.nodeCount} nodes (the two clusters are nodes too), ${snapshot.edgeCount} edges`);
// A node's cluster is in the column with the "parent" role, as the cluster's node index
const parent = snapshot.nodes.byRole("parent");
const a0 = snapshot.ids.requireIndex("a0");
console.log(`a0 is inside ${String(snapshot.ids.idOf(Number(parent?.value(a0))))}`);

const dot = await exportGraphToString(snapshot, "dot");
console.log(dot.split("\n").slice(0, 6).join("\n"));
await writeFile("cluster-copy.gv", dot);
