import { readFile, writeFile } from "node:fs/promises";

import { exportGraphToString, importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("teams.gv"), { filename: "teams.gv" });
console.log(`${snapshot.nodeCount} nodes (the two clusters are nodes too), ${snapshot.edgeCount} edges`);
// A node's cluster is in the attribute with the "parent" role, as the cluster's node index
const parent = snapshot.nodes.byRole("parent");
const ana = snapshot.ids.requireIndex("ana");
console.log(`ana is inside ${String(snapshot.ids.idOf(Number(parent?.value(ana))))}`);

const dot = await exportGraphToString(snapshot, "dot");
console.log(dot.split("\n").slice(0, 6).join("\n"));
await writeFile("teams-copy.gv", dot);
