import { checkExport, exportGraphToString, importGraph } from "@graphty/graph-io";

// Four people, declared in this order; Cleo knows Ana and Ben, and Dev knows nobody
const { snapshot } = await importGraph("graph { Ana; Ben; Cleo; Dev; Cleo -- Ana; Cleo -- Ben }", { format: "dot" });

// An adjacency table: each line is a node and its neighbors
const options = { table: "adjacency" } as const;
console.log(checkExport(snapshot, "csv", options).map((n) => n.code));
const text = await exportGraphToString(snapshot, "csv", options);
console.log(text);

// The file says neither that it is an adjacency table nor that it is undirected: pass both
const back = await importGraph(text, { format: "csv", table: "adjacency", defaultDirected: false });
console.log(back.snapshot.ids.toArray(), `${back.snapshot.edgeCount} edges, directed: ${back.snapshot.directed}`);
