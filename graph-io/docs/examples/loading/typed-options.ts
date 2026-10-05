import { importGraph } from "@graphty/graph-io";
import { type CsvImportOptions } from "@graphty/graph-io/csv";

// The type checks the names, the CSV options and the ones every importer takes:
// a typo such as `delimeter` does not compile
const csv: CsvImportOptions = { delimiter: ";", header: true, defaultDirected: false };

const { snapshot } = await importGraph("from;to\nA;B\n", csv);
console.log(`${snapshot.nodeCount} nodes, ${snapshot.directed ? "directed" : "undirected"}`);
