import { readFile } from "node:fs/promises";

import { importGraph } from "@graphty/graph-io";

const { snapshot } = await importGraph(await readFile("teams.gv"), { filename: "teams.gv" });

// Columns whose names start with "graphty." were added by graph-io, not by the file
const own = snapshot.nodes.names().filter((name) => !name.startsWith("graphty."));
console.log(own);

// Each DOT cluster is a node too, marked in graphty.cluster
const people = Array.from({ length: snapshot.nodeCount }, (_, i) => i).filter(
    (i) => snapshot.nodes.value("graphty.cluster", i) !== true,
);
console.log(`${snapshot.nodeCount} nodes, ${people.length} of them not clusters`);
