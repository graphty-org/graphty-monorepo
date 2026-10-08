import { readFile } from "node:fs/promises";

import { FormatRegistry } from "@graphty/graph-io";
import { csvExporter, csvImporter } from "@graphty/graph-io/csv";
import { graphmlImporter } from "@graphty/graph-io/graphml";

// Only the formats you register end up in your bundle
const io = new FormatRegistry()
    .registerImporter(graphmlImporter)
    .registerImporter(csvImporter)
    .registerExporter(csvExporter);

const { snapshot, format } = await io.importGraph(await readFile("got-network.graphml"), {
    filename: "got-network.graphml",
});
const csv = await io.exportGraphToString(snapshot, "csv");
console.log(`${format} -> csv: ${csv.split("\n")[0]}`);
