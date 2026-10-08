import { checkExport, exportGraphToString, importGraph, registry } from "@graphty/graph-io";

import { numbersExporter, numbersImporter } from "./numbers-format.js";

registry.registerImporter(numbersImporter).registerExporter(numbersExporter);

const { snapshot } = await importGraph("graph { alice -- bob; bob -- 7 }", { format: "dot" });

// "alice" and "bob" are not integers: refused by default, renumbered under "mangle"
console.log(checkExport(snapshot, "numbers").map((n) => n.code));
const text = await exportGraphToString(snapshot, "numbers", { sanitizeIds: "mangle" });
console.log(text);

// reading the file back gives the original ids again
const back = await importGraph(text, { format: "numbers" });
console.log([0, 1, 2].map((i) => back.snapshot.ids.idOf(i)));
