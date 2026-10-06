import { importAllGraphs, importGraph, listGraphs, registry } from "@graphty/graph-io";

import { sectionsImporter } from "./sections-format.js";

registry.registerImporter(sectionsImporter);

const file = "== first\na b\nb c\n== second\nx y\ny z\nz x\n";
const options = { filename: "two.sections" };

console.log(await listGraphs(file, options));

const second = await importGraph(file, { ...options, graphName: "second" });
console.log(`${second.snapshot.meta.name}: ${second.snapshot.edgeCount} edges`);

for (const { snapshot, report } of await importAllGraphs(file, options)) {
    console.log(`${snapshot.meta.name}: ${snapshot.edgeCount} edges, ${report.warningCount} warnings`);
}
