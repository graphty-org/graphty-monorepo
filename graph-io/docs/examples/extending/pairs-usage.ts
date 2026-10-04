import { checkExport, exportGraphToString, importGraph, listFormats, registry } from "@graphty/graph-io";

import { pairsExporter, pairsImporter } from "./pairs-format.js";

registry.registerImporter(pairsImporter).registerExporter(pairsExporter);

// The new format now works everywhere a built-in one does
const info = listFormats().find((f) => f.format === "pairs");
console.log(`${info?.format} ${info?.extensions.join(" ")}: read ${info?.canImport}, write ${info?.canExport}`);

const { snapshot, format, report } = await importGraph("# undirected\nalice\nalice bob 2.5\nbob carol\ncarol dave x\n");
console.log(`${format}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges`);
console.log(report.issues.map((i) => `${i.code} line ${i.line}`));

// Convert another format to pairs, checking first
const gml = await importGraph('graph [ node [ id 1 label "one" ] node [ id 2 ] edge [ source 1 target 2 ] ]');
console.log(checkExport(gml.snapshot, "pairs"));
console.log(await exportGraphToString(gml.snapshot, "pairs"));
