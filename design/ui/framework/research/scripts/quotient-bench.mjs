// Run from the repository root after building algorithms: node design/ui/framework/research/scripts/quotient-bench.mjs
// Sizes the "collapse" / quotient-graph step on the Cliff and Huge fixtures.
// Fixture: seeded preferential attachment, each new node attaches m edges (state-matrix.md 5.2).
import { Graph, connectedComponents, louvain } from "../../../../../algorithms/dist/algorithms.js";

function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function generate(n, m, seed = 1) {
    const r = rng(seed);
    const src = new Int32Array(n * m), dst = new Int32Array(n * m);
    const ends = new Int32Array(2 * n * m);
    let e = 0, ne = 0;
    for (let i = 1; i < n; i++) {
        const k = Math.min(m, i);
        const picked = new Set();
        while (picked.size < k) picked.add(ne === 0 ? 0 : ends[Math.floor(r() * ne)]);
        for (const t of picked) {
            src[e] = i; dst[e] = t; e++;
            ends[ne++] = i; ends[ne++] = t;
        }
    }
    return { n, e, src, dst };
}

// Quotient over a label array: one meta-node per label, one meta-edge per distinct label pair.
function quotient(fx, label) {
    const pairs = new Set();
    let internal = 0;
    for (let i = 0; i < fx.e; i++) {
        const a = label[fx.src[i]], b = label[fx.dst[i]];
        if (a === b) { internal++; continue; }
        pairs.add(a < b ? a * 4294967296 + b : b * 4294967296 + a);
    }
    return { metaEdges: pairs.size, internal };
}

function t(fn) { const s = performance.now(); const v = fn(); return [v, performance.now() - s]; }

const fixtures = [["Cliff", 25_000, 4], ["Huge", 250_000, 10]];
const runLouvainOnHuge = process.argv.includes("--louvain-huge");

for (const [name, n, m] of fixtures) {
    const [fx, tGen] = t(() => generate(n, m));
    const [g, tBuild] = t(() => {
        const g = new Graph({ directed: false });
        for (let i = 0; i < fx.n; i++) g.addNode(i);
        for (let i = 0; i < fx.e; i++) g.addEdge(fx.src[i], fx.dst[i]);
        return g;
    });
    const [cc, tCC] = t(() => connectedComponents(g));
    const ccLabel = new Int32Array(n);
    cc.forEach((c, k) => { for (const id of c) ccLabel[id] = k; });
    const [ccQ, tCCQ] = t(() => quotient(fx, ccLabel));
    console.log(JSON.stringify({ fixture: name, nodes: n, edges: fx.e, genMs: tGen | 0, buildGraphMs: tBuild | 0,
        components: cc.length, componentsMs: tCC | 0, componentQuotient: { nodes: cc.length, ...ccQ, ms: +tCCQ.toFixed(1) } }));

    if (name === "Huge" && !runLouvainOnHuge) continue;
    const [lv, tLv] = t(() => louvain(g));
    const lvLabel = new Int32Array(n);
    lv.communities.forEach((c, k) => { for (const id of c) lvLabel[id] = k; });
    const [lvQ, tLvQ] = t(() => quotient(fx, lvLabel));
    const sizes = lv.communities.map((c) => c.length).sort((a, b) => b - a);
    console.log(JSON.stringify({ fixture: name, louvainMs: tLv | 0, communities: lv.communities.length,
        largest: sizes.slice(0, 5), singletons: sizes.filter((s) => s === 1).length, modularity: +lv.modularity.toFixed(3),
        communityQuotient: { nodes: lv.communities.length, ...lvQ, ms: +tLvQ.toFixed(1) } }));
}
console.log(JSON.stringify({ heapMB: Math.round(process.memoryUsage().heapUsed / 1e6) }));
