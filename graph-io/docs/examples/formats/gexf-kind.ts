import { readFile } from "node:fs/promises";

import { checkExport, exportGraphToString, importGraph } from "@graphty/graph-io";

// An OBO ontology: each edge's relation (is_a, part_of) is in the "relation" column, marked as the edge kind
const { snapshot } = await importGraph(await readFile("vehicles.obo"), { filename: "vehicles.obo" });

// GEXF 1.3 writes it as the edge kind, which reads back as a column named "kind"
const v13 = await importGraph(await exportGraphToString(snapshot, "gexf"), { format: "gexf" });
console.log(v13.snapshot.edges.names());

// GEXF 1.2 has no edge kind, so the column is dropped
console.log(checkExport(snapshot, "gexf", { version: "1.2" }).map((n) => n.code));

// To keep it in a 1.2 file, make it a plain column first, in a copy
const copy = snapshot.withColumns();
const relation = copy.edges.get("relation");
copy.edges.set(
    "relation",
    Array.from({ length: copy.edgeCount }, (_, e) => relation?.value(e)),
);
const v12 = await importGraph(await exportGraphToString(copy, "gexf", { version: "1.2" }), { format: "gexf" });
console.log(v12.snapshot.edges.names());
