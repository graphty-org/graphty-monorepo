// prim-ties.mjs <2.x algorithms.js> <3.0 algorithms.js> <graph-format.js> [cat.json]
// Runs the 2.x primMST and the 3.0 port on the cat network the algorithm stories load, once with
// every edge weighing 1 and once weighing its `value`, and counts the edge flags that differ.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const [legacyPath, portPath, formatPath, catPath = "graphty-element/test/helpers/cat-social-network-2.json"] =
    process.argv.slice(2);
const legacy = await import(resolve(legacyPath));
const port = await import(resolve(portPath));
const { GraphBuilder } = await import(resolve(formatPath));
const cat = JSON.parse(readFileSync(catPath, "utf8"));
const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
for (const [label, weightOf] of [
    ["every edge weighing 1", () => 1],
    ["edges weighing their value", (e) => e.value],
]) {
    const g = new legacy.Graph({ directed: false });
    const b = new GraphBuilder({ directed: false });
    for (const n of cat.nodes) {
        g.addNode(n.id);
        b.addNode(n.id);
    }
    for (const e of cat.edges) {
        g.addEdge(e.src, e.dst, weightOf(e));
        b.addEdge(e.src, e.dst, weightOf(e));
    }
    const old = legacy.primMST(g);
    const now = port.primMST(b.freeze());
    const before = new Set(old.edges.map((e) => key(e.source, e.target)));
    // The builder numbers edges in insertion order, so edge index i is cat.edges[i].
    const after = new Set(Array.from(now.edges, (i) => key(cat.edges[i].src, cat.edges[i].dst)));
    const differ = cat.edges.filter((e) => before.has(key(e.src, e.dst)) !== after.has(key(e.src, e.dst))).length;
    console.log(
        `${label}: tree weight ${old.totalWeight} -> ${now.totalWeight}; ${differ} of ${cat.edges.length} edge flags differ`,
    );
}
