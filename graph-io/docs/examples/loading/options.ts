import { readFile } from "node:fs/promises";

import { importGraph } from "@graphty/graph-io";

const text = "from;to;weight\nA;B;2.5\nB;C;1\n";

const { snapshot, report } = await importGraph(text, {
    format: "csv", // skip detection
    delimiter: ";", // a CSV option, passed through to the CSV importer
    defaultDirected: false, // the file does not say, so choose
});
console.log(`${snapshot.directed ? "directed" : "undirected"}, ${snapshot.edgeCount} edges`);
console.log(`ids: ${[0, 1, 2].map((i) => snapshot.ids.idOf(i)).join(", ")}`);
console.log(`warnings: ${report.warningCount}`);

// ids: "string" keeps every id as text, so "1" stays "1" instead of becoming the number 1
const pajek = await importGraph(await readFile("got.net"), { filename: "got.net", ids: "string" });
console.log(`first id: ${JSON.stringify(pajek.snapshot.ids.idOf(0))}`);
