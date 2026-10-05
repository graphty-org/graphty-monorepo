import { readFile } from "node:fs/promises";

import { importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("got-network.graphml"), {
    filename: "got-network.graphml",
});
const label = snapshot.nodes.byRole("label");
const degree = snapshot.degree(); // edges at each node, by node index

const top = Array.from(degree.keys())
    .sort((a, b) => degree[b] - degree[a])
    .slice(0, 5);
for (const i of top) {
    const name = label ? snapshot.nodes.value(label.meta.name, i) : snapshot.ids.idOf(i);
    console.log(`${String(name)}: ${degree[i]} edges`);
}
