import { checkExport, exportGraphToString, importGraph, listFormats, registry } from "@graphty/graph-io";

import { pairsExporter, pairsImporter, type PairsOptions } from "./pairs-format.js";

registry.registerImporter(pairsImporter).registerExporter(pairsExporter);

// The new format now works everywhere a built-in one does
const info = listFormats().find((f) => f.format === "pairs");
console.log(`${info?.format} ${info?.extensions.join(" ")}: read ${info?.canImport}, write ${info?.canExport}`);

const text = "# undirected\nalice = Alice Liddell\nalice bob 2.5\nbob carol\ncarol dave x\n";
const { snapshot, format, report } = await importGraph(text);
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(report.issues.map((i) => `${i.code} line ${i.line}`));

// The plugin's own options go in the same object; `satisfies` checks their names
const csvStyle = { separator: "," } satisfies PairsOptions;
console.log(await exportGraphToString(snapshot, "pairs", csvStyle));

// Convert another format to pairs, checking first
const gml = await importGraph(
    'graph [ node [ id 1 label "one" ] node [ id 2 color "red" ] edge [ source 1 target 2 ] ]',
);
console.log(checkExport(gml.snapshot, "pairs").map((n) => `${n.code}: ${n.message}`));
