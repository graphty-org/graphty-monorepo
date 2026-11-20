#!/usr/bin/env node
/**
 * Writes the small files the demo video's clips drop into the app, from the app's own Les Miserables
 * sample (graphty/public/samples/les-miserables.gml) with the repository's graph-io, so they re-make
 * themselves when the sample changes:
 *
 *   les-miserables.gexf / .graphml / .dot / .cys   the same graph as Gephi, GraphML, Graphviz, Cytoscape
 *   les-miserables-links.csv                       its edges: two name columns and shared_chapters
 *
 *   node tools/demo-video/data/make-data.mjs
 *
 * les-miserables-characters.csv (the join clip's first_volume column) is written by hand, not here.
 * The styled Cytoscape session the plan wants is made in Cytoscape itself; graph-io writes no visual
 * style into a .cys, so that file is not made here.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { exportGraphToBytes, importGraph } from "@graphty/graph-io";

const here = dirname(fileURLToPath(import.meta.url));
const gml = join(here, "../../../graphty/public/samples/les-miserables.gml");
const { snapshot, report } = await importGraph(readFileSync(gml), { filename: "les-miserables.gml" });
for (const issue of report.issues) console.warn(`${issue.code}: ${issue.message}`);

for (const format of ["gexf", "graphml", "dot", "cys"]) {
    writeFileSync(
        join(here, `les-miserables.${format}`),
        await exportGraphToBytes(snapshot, format, format === "cys" ? { sanitizeIds: "mangle" } : {}),
    );
}

// The links as a person would keep them in a spreadsheet: names, not ids.
const name = (i) => String(snapshot.nodes.value("name", i));
const quote = (s) => (/[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s);
const rows = ["character,linked_to,shared_chapters"];
for (let e = 0; e < snapshot.edgeCount; e++) {
    const w = snapshot.edges.value("shared_chapters", e) ?? snapshot.weights?.[snapshot.edgeToArc[e]];
    rows.push([name(snapshot.edgeSource(e)), name(snapshot.edgeTarget(e)), w].map((v) => quote(String(v))).join(","));
}
writeFileSync(join(here, "les-miserables-links.csv"), rows.join("\n") + "\n");
console.log(`${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges -> ${here}`);
