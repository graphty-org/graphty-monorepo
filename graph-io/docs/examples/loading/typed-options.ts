import { importGraph } from "@graphty/graph-io";
import { type CsvImportOptions } from "@graphty/graph-io/csv";

// `satisfies` checks the names: a typo such as `delimeter` does not compile
const csv = { delimiter: ";", header: true } satisfies CsvImportOptions;

const { snapshot } = await importGraph("from;to\nA;B\n", { format: "csv", ...csv });
console.log(`${snapshot.nodeCount} nodes`);
