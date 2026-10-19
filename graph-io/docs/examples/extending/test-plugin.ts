import { readFile } from "node:fs/promises";

import {
    checkExport,
    compareSnapshots,
    describeDiffs,
    exportGraphToString,
    importGraph,
    registry,
} from "@graphty/graph-io";

import { pairsExporter, pairsImporter } from "./pairs-format.js";

registry.registerImporter(pairsImporter).registerExporter(pairsExporter);

// Read a sample, save it as pairs, read the saved file back, and compare the two graphs
for (const file of ["teams.gv", "proteins.xgmml"]) {
    const { snapshot } = await importGraph(await readFile(file), { filename: file });
    const notes = checkExport(snapshot, "pairs");
    const saved = await exportGraphToString(snapshot, "pairs");
    const back = await importGraph(saved, { format: "pairs" });
    console.log(`${file}: notes ${[...new Set(notes.map((n) => n.code))].join(", ") || "none"}`);
    console.log(describeDiffs(compareSnapshots(snapshot, back.snapshot, { limit: 3 })));
}
