/* Before/after for the indexed ports: the shipped Map-of-Maps implementation against the indexed one,
 * on the same graph, minimum of N runs. Undirected, ten edges per node, as the GPU cost record's
 * graphs are. Run from algorithms/ with: npx tsx benchmarks/port-bench.ts */
import { loadavg } from "node:os";

import { hits as legacyHits } from "../src/algorithms/centrality/hits.js";
import { katzCentrality as legacyKatz } from "../src/algorithms/centrality/katz.js";
import { labelPropagation as legacyLabelPropagation } from "../src/algorithms/community/label-propagation.js";
import { louvain as legacyLouvain } from "../src/algorithms/community/louvain.js";
import { kCoreDecomposition as legacyKCore } from "../src/clustering/k-core.js";
import { Graph } from "../src/core/graph.js";
import { hits } from "../src/indexed/hits.js";
import { kCoreDecomposition } from "../src/indexed/k-core.js";
import { katzCentrality } from "../src/indexed/katz.js";
import { labelPropagation } from "../src/indexed/label-propagation.js";
import { louvain } from "../src/indexed/louvain.js";
import { toSnapshot } from "../src/indexed/to-snapshot.js";

function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function build(n: number, directed: boolean): Graph {
    const g = new Graph({ directed });
    for (let i = 0; i < n; i++) {
        g.addNode(`n${i}`);
    }
    const random = seeded(99);
    let added = 0;
    const target = n * 10;
    while (added < target) {
        const u = Math.floor(random() * n);
        const v = Math.floor(random() * n);
        if (u === v) {
            continue;
        }
        if (g.hasEdge(`n${u}`, `n${v}`)) {
            continue;
        }
        g.addEdge(`n${u}`, `n${v}`);
        added++;
    }
    return g;
}

function best(reps: number, run: () => void): number {
    let ms = Infinity;
    for (let i = 0; i < reps; i++) {
        const t0 = performance.now();
        run();
        ms = Math.min(ms, performance.now() - t0);
    }
    return ms;
}

const sizes = [1000, 10000, 100000];
const budgetMs = 120000;
console.log(
    "load average at start:",
    loadavg()
        .map((l) => l.toFixed(2))
        .join(" "),
);
for (const n of sizes) {
    const reps = n <= 10000 ? 3 : 1;
    const undirected = build(n, false);
    const directed = build(n, true);
    const su = toSnapshot(undirected);
    const sd = toSnapshot(directed);
    const rows: [string, number, number | null][] = [];
    // A null legacy side is a port-only row, printed with "--".
    const pairs: [string, (() => void) | null, () => void][] = [
        ["k-core", () => void legacyKCore(undirected), () => void kCoreDecomposition(su)],
        [
            "Katz, 100 iterations",
            () => void legacyKatz(directed, { maxIterations: 100, tolerance: 0 }),
            () => void katzCentrality(sd, { maxIterations: 100, tolerance: 0 }),
        ],
        [
            "HITS, 100 iterations",
            () => void legacyHits(directed, { maxIterations: 100, tolerance: 0 }),
            () => void hits(sd, { maxIterations: 100, tolerance: 0 }),
        ],
        ["Louvain", () => void legacyLouvain(undirected), () => void louvain(su)],
        ["label propagation", () => void legacyLabelPropagation(undirected), () => void labelPropagation(su)],
        // Exactly n visits: the whole shuffled initial queue, one full-sweep equivalent.
        ["LP, one sweep", null, () => void labelPropagation(su, { maxIterations: 1 })],
    ];
    for (const [name, legacy, ported] of pairs) {
        const portedMs = best(reps, ported);
        let legacyMs: number | null = null;
        if (legacy !== null) {
            const probe = performance.now();
            legacy();
            const first = performance.now() - probe;
            if (first < budgetMs) {
                legacyMs = Math.min(first, reps > 1 ? best(reps - 1, legacy) : Infinity);
            }
        }
        rows.push([name, portedMs, legacyMs]);
    }
    console.log(`\nn = ${n}, ${n * 10} edges, minimum of ${reps}`);
    for (const [name, portedMs, legacyMs] of rows) {
        let speedup = legacyMs === null ? "legacy over budget" : `${(legacyMs / portedMs).toFixed(1)}x`;
        if (legacyMs === null && name === "LP, one sweep") {
            speedup = "--";
        }
        console.log(
            `  ${name.padEnd(22)} indexed ${portedMs.toFixed(1).padStart(9)} ms   shipped ${
                legacyMs === null ? "    --     " : `${legacyMs.toFixed(1).padStart(9)} ms`
            }   ${speedup}`,
        );
    }
}
console.log(
    "\nload average at end:",
    loadavg()
        .map((l) => l.toFixed(2))
        .join(" "),
);
