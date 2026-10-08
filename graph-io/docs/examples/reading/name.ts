import { readFile } from "node:fs/promises";

import { exportGraphToString, GraphBuilder, importGraph } from "@graphty/graph-io";

// A CSV file has no graph name
const { snapshot } = await importGraph(await readFile("got-edges.csv"), { filename: "got-edges.csv" });
console.log(snapshot.meta.name);

// meta is fixed: copy the graph into a builder, set the name, and freeze a new snapshot
const builder = GraphBuilder.from(snapshot);
builder.setMeta({ name: "got" });
const named = builder.freeze();
console.log(named.meta.name);

// Formats that write a graph name now use it; Pajek writes it on its *Network line
const pajek = await exportGraphToString(named, "pajek", { networkHeader: true });
console.log(pajek.split("\n")[0]);
