#!/usr/bin/env node
/**
 * Writes les-miserables-gephi.gexf: the Les Miserables graph as Gephi saves it after a session --
 * nodes colored by Louvain group, sized by degree and placed by ForceAtlas2, in GEXF's viz:color,
 * viz:size and viz:position. Chapter 1 drops it to show a file opening with the look it had.
 *
 *   node tools/demo-video/data/ch1/make-styled.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { louvain } from "@graphty/algorithms";
import { importGraph } from "@graphty/graph-io";
import { forceAtlas2 } from "@graphty/layout";

const here = dirname(fileURLToPath(import.meta.url));
const { snapshot: s } = await importGraph(readFileSync(join(here, "../les-miserables.gexf")), {
    filename: "les-miserables.gexf",
});
const groups = louvain(s).labels;
const { positions } = forceAtlas2(s, { seed: 7, dim: 2, maxIter: 400 });
// a bright, distinct palette, biggest groups first
const PALETTE = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#9a6324", "#808000"];
const sizes = new Map();
for (const g of groups) sizes.set(g, (sizes.get(g) ?? 0) + 1);
const rank = new Map([...sizes].sort((a, b) => b[1] - a[1]).map(([g], i) => [g, i]));
const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
const esc = (v) => String(v).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const xs = [...new Array(s.nodeCount).keys()].map((i) => positions[i * 2]);
const ys = [...new Array(s.nodeCount).keys()].map((i) => positions[i * 2 + 1]);
const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
const k = 1000 / span; // Gephi-like coordinates, about 1000 across

const out = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">',
    '  <graph defaultedgetype="undirected" mode="static">',
    '    <attributes class="node" mode="static">',
    '      <attribute id="modularity_class" title="Modularity Class" type="integer"/>',
    "    </attributes>",
    '    <attributes class="edge" mode="static">',
    '      <attribute id="shared_chapters" title="shared_chapters" type="double"/>',
    "    </attributes>",
    `    <nodes count="${s.nodeCount}">`,
];
for (let i = 0; i < s.nodeCount; i++) {
    const [r, g, b] = rgb(PALETTE[rank.get(groups[i]) % PALETTE.length]);
    out.push(
        `      <node id="${esc(s.ids.idOf(i))}" label="${esc(s.nodes.value("name", i))}">`,
        `        <attvalues><attvalue for="modularity_class" value="${rank.get(groups[i])}"/></attvalues>`,
        `        <viz:color r="${r}" g="${g}" b="${b}"/>`,
        `        <viz:size value="${(10 + s.outDegreeOf(i)).toFixed(1)}"/>`,
        `        <viz:position x="${(xs[i] * k).toFixed(2)}" y="${(ys[i] * k).toFixed(2)}" z="0"/>`,
        "      </node>",
    );
}
out.push("    </nodes>", `    <edges count="${s.edgeCount}">`);
for (let e = 0; e < s.edgeCount; e++) {
    const w = s.edges.value("shared_chapters", e);
    out.push(
        `      <edge id="${e}" source="${esc(s.ids.idOf(s.edgeSource(e)))}" target="${esc(s.ids.idOf(s.edgeTarget(e)))}" weight="${w}">`,
        `        <attvalues><attvalue for="shared_chapters" value="${w}"/></attvalues>`,
        "      </edge>",
    );
}
out.push("    </edges>", "  </graph>", "</gexf>", "");
writeFileSync(join(here, "les-miserables-gephi.gexf"), out.join("\n"));
console.log(`${s.nodeCount} nodes in ${sizes.size} groups -> ${join(here, "les-miserables-gephi.gexf")}`);
