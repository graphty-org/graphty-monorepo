import { importGraph } from "@graphty/graph-io";

// A spreadsheet saved in a locale that writes 2,5 for two and a half
const text = "source;target;weight\nAnna;Ben;2,5\nBen;Cleo;1,25\n";

const { snapshot, report } = await importGraph(text, { format: "csv", decimal: "," });
console.log(snapshot.edgeList().weights, report.errorCount);
