import { importGraph } from "@graphty/graph-io";

// A spreadsheet saved in a locale that writes 2,5 for two and a half
const text = "source;target;weight\nAnna;Ben;2,5\nBen;Cleo;1,25\n";

// graph-io reads numbers with a decimal point only: turn each decimal comma between digits into a point
const fixed = text.replace(/(\d),(\d)/g, "$1.$2");

const { snapshot, report } = await importGraph(fixed, { format: "csv", delimiter: ";" });
console.log(snapshot.edgeList().weights, report.errorCount);
