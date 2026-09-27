/**
 * Node benchmark runner for graphty-element's Node-safe sets modules. Prints one table per group
 * and appends the session to `benchmarks/results/<host>-<node>.json`. Timings are recorded beside
 * the design's projections (design/sets/sets-design.md section 6.5), never asserted.
 *
 * Inputs are seeded Barabasi-Albert graphs (m = 5) from @graphty/graph-samples at 100k nodes, or
 * 1M with GRAPHTY_BENCH_SCALE=large.
 *
 * Usage (from the package directory):
 *
 *   npm run benchmark                                  # every group
 *   npx tsx benchmarks/run.ts sets                     # selected groups
 *   GRAPHTY_BENCH_SCALE=large npm run benchmark        # the 1M rows
 *   node --expose-gc --import tsx benchmarks/run.ts    # GC before every run for exact memory deltas
 *   npx tsx benchmarks/run.ts --no-save                # do not append to benchmarks/results
 */

import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";

import { revisionOf } from "../src/catalog/sets/hash";
import type { EdgeMember, SetDefinition } from "../src/catalog/types";
import { appendSession, bench, type BenchResult, printTable } from "./harness";

const LARGE = process.env.GRAPHTY_BENCH_SCALE === "large";
const NODES = LARGE ? 1_000_000 : 100_000;
const LABEL = LARGE ? "1M" : "100k";

/**
 * The sets rows: the revision of a fixed set of every node, and of as many listed edges.
 * @returns The results.
 */
function runSetsBenchmarks(): BenchResult[] {
    const graph = barabasiAlbertGraph({ n: NODES, m: 5, seed: 1 });
    const nodes = Array.from({ length: NODES }, (_, i) => i);
    const edges: EdgeMember[] = Array.from({ length: NODES }, (_, i) => ({
        source: graph.src[i],
        target: graph.dst[i],
        id: `e${i}`,
    }));
    const byNodes: SetDefinition = { kind: "fixed", nodes, reading: "induced" };
    const byEdges: SetDefinition = { kind: "fixed", nodes: [], edges, reading: "listed" };
    const opts = { items: NODES, unit: "members" };

    return [
        bench("sets", `revisionOf(fixed, ${LABEL} nodes)`, { setup: () => byNodes, run: revisionOf }, opts),
        bench("sets", `revisionOf(fixed, ${LABEL} listed edges)`, { setup: () => byEdges, run: revisionOf }, opts),
    ];
}

const GROUPS: Readonly<Record<string, () => BenchResult[]>> = {
    sets: runSetsBenchmarks,
};

const args = process.argv.slice(2);
const save = !args.includes("--no-save");
const selected = args.filter((a) => !a.startsWith("--"));
const names = selected.length === 0 ? Object.keys(GROUPS) : selected;

const all: BenchResult[] = [];
for (const name of names) {
    const group = GROUPS[name] as (() => BenchResult[]) | undefined;
    if (group === undefined) {
        console.error(`unknown benchmark group "${name}"; known: ${Object.keys(GROUPS).join(", ")}`);
        process.exitCode = 1;
        break;
    }
    console.log(`\n== ${name} (${process.version}, median of 5 runs, ${LABEL} scale)\n`);
    const results = group();
    printTable(results);
    all.push(...results);
}
if (save && all.length > 0) {
    console.log(`\nresults appended to ${appendSession(all)}`);
}
