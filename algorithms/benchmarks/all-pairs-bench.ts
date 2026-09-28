/* All-pairs shortest paths: the floydWarshall facade (which runs the port and rebuilds its
 * Map-of-Maps, so its ratio is the conversion cost) against indexed.allPairsShortestPath, per
 * strategy. Seeded undirected graphs with 10 n unique edges and
 * integer weights 1-100 (the GPU cost record's generator), plus an unweighted copy.
 *
 * The machine is shared, so: load average printed before and after; one discarded warm-up per arm;
 * the arms run INTERLEAVED inside each pass so background load hits them alike; median and minimum
 * of N passes, never a mean. Every arm's matrix is checked cell by cell before anything is timed.
 *
 * Run from algorithms/ with: npx tsx benchmarks/all-pairs-bench.ts [--sizes 64,128] [--passes 3]
 * The density sweep at 512 nodes runs when 512 is among the sizes. */
import { execSync } from "node:child_process";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";

import { floydWarshall } from "../src/algorithms/shortest-path/floyd-warshall.js";
import { Graph } from "../src/core/graph.js";
import { allPairsShortestPath, type ApspOptions, type ApspResult } from "../src/indexed/all-pairs.js";
import { toSnapshot } from "../src/indexed/to-snapshot.js";

function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

/** `edges` unique undirected edges over n nodes, no self-loop, weights 1-100. */
function edgeList(n: number, edges: number, seed: number): [number, number, number][] {
    const random = seeded(seed);
    const seen = new Set<number>();
    const out: [number, number, number][] = [];
    while (out.length < edges) {
        const u = Math.floor(random() * n);
        const v = Math.floor(random() * n);
        const key = Math.min(u, v) * n + Math.max(u, v);
        if (u === v || seen.has(key)) {
            continue;
        }
        seen.add(key);
        out.push([u, v, 1 + Math.floor(random() * 100)]);
    }
    return out;
}

function legacyGraph(n: number, edges: [number, number, number][], weighted: boolean): Graph {
    const g = new Graph({ directed: false });
    for (let i = 0; i < n; i++) {
        g.addNode(`n${i}`);
    }
    for (const [u, v, w] of edges) {
        g.addEdge(`n${u}`, `n${v}`, weighted ? w : 1);
    }
    return g;
}

function snapshotOf(n: number, edges: [number, number, number][]): GraphSnapshot {
    const b = new GraphBuilder({ directed: false });
    for (let i = 0; i < n; i++) {
        b.addNode(i);
    }
    for (const [u, v, w] of edges) {
        b.addEdge(u, v, w);
    }
    return b.freeze();
}

function arg(name: string): string | undefined {
    const at = process.argv.indexOf(name);
    return at === -1 ? undefined : process.argv[at + 1];
}

function uptime(label: string): void {
    console.log(`${label}: ${execSync("uptime").toString().trim()}`);
}

function median(xs: number[]): number {
    const s = [...xs].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function sameMatrix(a: ArrayLike<number>, b: ArrayLike<number>, label: string): void {
    if (a.length !== b.length) {
        throw new Error(`${label}: lengths ${String(a.length)} and ${String(b.length)}`);
    }
    for (let c = 0; c < a.length; c++) {
        if (!Object.is(a[c], b[c])) {
            throw new Error(`${label}: cell ${String(c)} is ${String(a[c])} and ${String(b[c])}`);
        }
    }
}

interface Arm {
    readonly name: string;
    readonly run: () => unknown;
}

let sink = 0;

/** Warm up each arm once, then time `passes` interleaved passes. */
function timeArms(arms: Arm[], passes: number): Map<string, number[]> {
    const times = new Map<string, number[]>(arms.map((a) => [a.name, []]));
    for (const a of arms) {
        a.run();
    }
    for (let p = 0; p < passes; p++) {
        for (const a of arms) {
            const t0 = performance.now();
            const r = a.run();
            times.get(a.name)?.push(performance.now() - t0);
            sink += r === undefined ? 0 : 1;
        }
    }
    return times;
}

function fmt(ms: number): string {
    // three significant figures, near enough
    return ms.toFixed(Math.max(0, 2 - Math.floor(Math.log10(Math.max(ms, 1)))));
}

const sizes = (arg("--sizes") ?? "64,128,256,512,1024,2048,4096,5792").split(",").map(Number);
const passesOverride = arg("--passes");
function passesFor(n: number): number {
    if (passesOverride !== undefined) {
        return Number(passesOverride);
    }
    if (n <= 256) {
        return 15;
    }
    return n <= 1024 ? 5 : 3;
}

console.log(`node ${process.version}`);
uptime("load before");
console.log("");
console.log("| nodes | arm | strategy | median ms | min ms | median vs facade | passes |");
console.log("| ----: | --- | --- | ----: | ----: | ----: | ----: |");

for (const n of sizes) {
    const edges = edgeList(n, 10 * n, 99 + n);
    const g = legacyGraph(n, edges, true);
    const s = toSnapshot(g);
    const su = toSnapshot(legacyGraph(n, edges, false));
    const withShipped = n <= 512;
    const withFw = n <= 2048;

    // ---- correctness, before any timing
    const auto = allPairsShortestPath(s);
    const methods = new Map<string, string>([
        ["port auto (weighted)", auto.method],
        ["port auto (unweighted)", "bfs"],
        ["port floyd-warshall", "floyd-warshall"],
    ]);
    if (withFw) {
        sameMatrix(allPairsShortestPath(s, { method: "floyd-warshall" }).dist, auto.dist, `${String(n)} fw vs auto`);
    }
    if (withShipped) {
        const legacy = floydWarshall(g);
        for (let i = 0; i < n; i++) {
            const row = legacy.distances.get(`n${String(i)}`);
            for (let j = 0; j < n; j++) {
                const expected = row?.get(`n${String(j)}`);
                if (!Object.is(auto.dist[i * n + j], expected)) {
                    throw new Error(`${String(n)}: facade and port disagree at ${String(i)}->${String(j)}`);
                }
            }
        }
    }
    const hops = allPairsShortestPath(su);
    if (hops.method !== "bfs") {
        throw new Error(`${String(n)}: the unweighted arm ran ${hops.method}`);
    }
    const twos = allPairsShortestPath(su, { weights: new Float64Array(su.arcCount).fill(2) });
    sameMatrix(
        hops.dist,
        twos.dist.map((x) => x / 2),
        `${String(n)} bfs vs dijkstra/2`,
    );

    // ---- timing
    const arms: Arm[] = [];
    if (withShipped) {
        arms.push({ name: "floydWarshall facade", run: () => floydWarshall(g) });
    }
    if (withFw) {
        arms.push({ name: "port floyd-warshall", run: () => allPairsShortestPath(s, { method: "floyd-warshall" }) });
    }
    arms.push({ name: "port auto (weighted)", run: () => allPairsShortestPath(s) });
    arms.push({ name: "port auto (unweighted)", run: () => allPairsShortestPath(su) });
    const passes = passesFor(n);
    const times = timeArms(arms, passes);
    const shippedMedian = withShipped ? median(times.get("floydWarshall facade") ?? []) : NaN;
    for (const a of arms) {
        const t = times.get(a.name) ?? [];
        const m = median(t);
        const ratio = withShipped && a.name !== "floydWarshall facade" ? `${(shippedMedian / m).toFixed(1)}x` : "";
        console.log(
            `| ${String(n)} | ${a.name} | ${methods.get(a.name) ?? ""} | ${fmt(m)} | ${fmt(Math.min(...t))} | ${ratio} | ${String(passes)} |`,
        );
    }
}

if (sizes.includes(512)) {
    const n = 512;
    const passes = passesOverride !== undefined ? Number(passesOverride) : 5;
    console.log("");
    console.log("Density at 512 nodes, weights 1-100: forced floyd-warshall against forced per-source (Dijkstra).");
    console.log("");
    console.log(
        "| average degree | arcs / n^2 | auto picks | floyd-warshall median ms | min | per-source median ms | min | per-source / fw |",
    );
    console.log("| ----: | ----: | --- | ----: | ----: | ----: | ----: | ----: |");
    for (const degree of [20, 64, 128, 170, 200, 256, 480]) {
        const s = snapshotOf(n, edgeList(n, (degree * n) / 2, 7 + degree));
        const fwOpts: ApspOptions = { method: "floyd-warshall" };
        const psOpts: ApspOptions = { method: "per-source" };
        const fw: ApspResult = allPairsShortestPath(s, fwOpts);
        sameMatrix(allPairsShortestPath(s, psOpts).dist, fw.dist, `density ${String(degree)}`);
        const times = timeArms(
            [
                { name: "fw", run: () => allPairsShortestPath(s, fwOpts) },
                { name: "ps", run: () => allPairsShortestPath(s, psOpts) },
            ],
            passes,
        );
        const f = times.get("fw") ?? [];
        const p = times.get("ps") ?? [];
        console.log(
            `| ${String(degree)} | ${(s.arcCount / (n * n)).toFixed(3)} | ${allPairsShortestPath(s).method} | ${fmt(median(f))} | ${fmt(Math.min(...f))} | ${fmt(median(p))} | ${fmt(Math.min(...p))} | ${(median(p) / median(f)).toFixed(2)} |`,
        );
    }
}

console.log("");
uptime("load after");
if (sink < 0) {
    console.log(sink);
}
