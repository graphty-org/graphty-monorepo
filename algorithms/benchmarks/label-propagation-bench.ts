/* The shipped labelPropagation against indexed.labelPropagation on the same graphs, for a shared
 * machine: the two sides alternate (shipped, port, shipped, port, ...) so background load hits both
 * alike, and every row reports medians and minima, never means. Each side's iterations and
 * converged flag are printed too: the port visits only what changed, so a wall-time ratio alone
 * would hide where the time went.
 *
 * Tiers (design/algorithms/label-propagation-indexed-port-design.md section 9):
 * - size ladder: 1k, 10k, 100k and 1M nodes, undirected, ten edges per node, from the same seeded
 *   generator as benchmarks/port-bench.ts (the GPU cost record's graphs);
 * - tie-heavy: a 100,000-node path, where the shipped function runs to its cap;
 * - structured: a planted partition of 100 groups of 1,000 nodes, average degree about 10.
 *
 * Run from algorithms/ with: npx tsx benchmarks/label-propagation-bench.ts [sizes]
 * The shipped function's times on the path and the planted partition swing by up to 4.6x between
 * processes while the port's barely move, so quote those rows as a range over fresh processes. */
import { execSync } from "node:child_process";

import { type SampleGraph } from "@graphty/graph-samples";
import { pathGraph, plantedPartitionGraph } from "@graphty/graph-samples/generators";

import { labelPropagation as shippedLabelPropagation } from "../src/algorithms/community/label-propagation.js";
import { Graph } from "../src/core/graph.js";
import { labelPropagation } from "../src/indexed/label-propagation.js";
import { toSnapshot } from "../src/indexed/to-snapshot.js";

// The LCG and the graph shape of benchmarks/port-bench.ts, copied as port-bench and port-fixtures
// each carry their own copy.
function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function randomGraph(n: number): Graph {
    const g = new Graph({ directed: false });
    for (let i = 0; i < n; i++) {
        g.addNode(`n${i}`);
    }
    const random = seeded(99);
    let added = 0;
    const target = n * 10;
    while (added < target) {
        const u = Math.floor(random() * n);
        const v = Math.floor(random() * n);
        if (u === v || g.hasEdge(`n${u}`, `n${v}`)) {
            continue;
        }
        g.addEdge(`n${u}`, `n${v}`);
        added++;
    }
    return g;
}

function fromSample(sample: SampleGraph): Graph {
    const g = new Graph({ directed: false });
    for (let i = 0; i < sample.nodeCount; i++) {
        g.addNode(`n${i}`);
    }
    for (let e = 0; e < sample.src.length; e++) {
        g.addEdge(`n${sample.src[e]}`, `n${sample.dst[e]}`);
    }
    return g;
}

interface Side {
    readonly ms: number[];
    iterations: number;
    converged: boolean;
}

function median(xs: readonly number[]): number {
    const sorted = [...xs].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fmt(ms: number): string {
    return ms >= 10000 ? `${(ms / 1000).toFixed(1)} s` : `${ms.toFixed(1)} ms`;
}

function uptime(): string {
    return execSync("uptime").toString().trim();
}

function minimum(xs: readonly number[]): number {
    return Math.min(...xs);
}

const budgetMs = 600000;
let shipped100kMedian: number | null = null;

function row(name: string, g: Graph, pairs: number, runShipped: boolean): void {
    const s = toSnapshot(g);
    const shipped: Side = { ms: [], iterations: 0, converged: false };
    const port: Side = { ms: [], iterations: 0, converged: false };
    for (let p = 0; p < pairs; p++) {
        if (runShipped) {
            const t0 = performance.now();
            const r = shippedLabelPropagation(g);
            shipped.ms.push(performance.now() - t0);
            shipped.iterations = r.iterations;
            shipped.converged = r.converged;
        }
        const t1 = performance.now();
        const r = labelPropagation(s);
        port.ms.push(performance.now() - t1);
        port.iterations = r.iterations;
        port.converged = r.converged;
    }
    const shippedCell = runShipped
        ? `${fmt(median(shipped.ms)).padStart(9)} ${fmt(minimum(shipped.ms)).padStart(9)} ${String(shipped.iterations).padStart(4)} ${String(shipped.converged).padEnd(5)}`
        : `${"--".padStart(9)} ${"--".padStart(9)} ${"--".padStart(4)} ${"--".padEnd(5)}`;
    const ratio = runShipped ? `${(median(shipped.ms) / median(port.ms)).toFixed(1)}x` : "--";
    console.log(
        `| ${name.padEnd(30)} | ${String(pairs).padStart(5)} | ${shippedCell} | ${fmt(median(port.ms)).padStart(9)} ${fmt(minimum(port.ms)).padStart(9)} ${String(port.iterations).padStart(4)} ${String(port.converged).padEnd(5)} | ${ratio.padStart(7)} |`,
    );
    if (name.startsWith("random 100,000") && runShipped) {
        shipped100kMedian = median(shipped.ms);
    }
}

console.log(`start: ${uptime()}`);
console.log("defaults on both sides: maxIterations 100, randomSeed 42, weighted");
console.log(
    "columns: pairs | shipped median, min, iterations, converged | port median, min, iterations, converged | ratio of medians",
);
// Optional first argument: the ladder sizes, comma separated (default 1000,10000,100000,1000000).
for (const n of (process.argv[2] ?? "1000,10000,100000,1000000").split(",").map(Number)) {
    let pairs = 1;
    if (n <= 10000) {
        pairs = 7;
    } else if (n === 100000) {
        pairs = 3;
    }
    const runShipped = n < 1000000 || shipped100kMedian === null || shipped100kMedian * 10 <= budgetMs;
    row(`random ${n.toLocaleString("en-US")}, ${n * 10} edges`, randomGraph(n), pairs, runShipped);
}
row("path of 100,000 (tie-heavy)", fromSample(pathGraph({ n: 100000 })), 3, true);
row(
    "planted 100 x 1,000 (structured)",
    fromSample(plantedPartitionGraph({ groups: 100, groupSize: 1000, pIn: 0.008, pOut: 0.00001, seed: 1 })),
    3,
    true,
);
console.log(`end: ${uptime()}`);
