/**
 * @file What a second data source costs at 100,000 nodes and 1,000,000 edges, on a headless
 * session (the per-source bookkeeping is the same on both render paths): the first load, a second
 * source merged in, `data.sources()` after an edit, and `data.sourcesOf`. Each step's time and the
 * heap it kept are printed as `[multi-source]` lines, never asserted; what is asserted is the
 * counts each load reports, so a run that measured the wrong graph fails.
 *
 * Run with: NODE_OPTIONS="--expose-gc --max-old-space-size=16000" npx vitest run --project=bench
 * test/session/multi-source-scale.bench.test.ts (MULTI_SOURCE_NODES and MULTI_SOURCE_EDGES scale it).
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";

// Timings are taken with strict state off, as a published build runs.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;

const NODES = Number(process.env.MULTI_SOURCE_NODES ?? 100_000);
const EDGES = Number(process.env.MULTI_SOURCE_EDGES ?? 1_000_000);
/** A safety limit for the whole file, not a budget: the 1M-edge CSV parse alone takes 10-15 s. */
const TIMEOUT_MS = 600_000;

/**
 * A CSV edge list.
 * @param nodes - How many nodes.
 * @param edges - How many edges.
 * @param first - The first node's number.
 * @returns The text.
 */
function edgeList(nodes: number, edges: number, first: number): string {
    const lines = ["source,target"];
    for (let at = 0; at < edges; at++) {
        lines.push(`n${String((at % nodes) + first)},n${String(((at * 7 + 1) % nodes) + first)}`);
    }

    return lines.join("\n");
}

/**
 * The heap now, after a collection when the page exposes one.
 * @returns Megabytes.
 */
function heapMb(): number {
    (globalThis as { gc?: () => void }).gc?.();
    return Math.round(process.memoryUsage().heapUsed / 2 ** 20);
}

/**
 * Time some work and print it with the heap it kept.
 * @param what - What is timed.
 * @param work - The work.
 * @returns What the work returned.
 */
async function timed<T>(what: string, work: () => Promise<T> | T): Promise<T> {
    const before = heapMb();
    const start = performance.now();
    const result = await work();
    const ms = performance.now() - start;
    console.log(`[multi-source] ${what}: ${ms.toFixed(0)} ms, heap kept ${String(heapMb() - before)} MB`);
    return result;
}

describe(`two data sources at ${String(NODES)} nodes and ${String(EDGES)} edges`, { timeout: TIMEOUT_MS }, () => {
    it("loads, merges a second source, and lists the sources after an edit", async () => {
        const session = createGraphSession({ limits: { renderCeiling: 4 * NODES, edgesDrawn: 4 * EDGES } });
        const first = edgeList(NODES, EDGES, 0);
        // One percent of the graph again, half of its nodes shared with the first source.
        const second = edgeList(NODES / 100, EDGES / 100, NODES - NODES / 200);
        await timed("first source", () => session.data.import({ type: "csv", config: { data: first }, name: "a.csv" }));
        await timed("second source merged", () =>
            session.data.import({ type: "csv", config: { data: second }, name: "b.csv" }, { mode: "merge" }),
        );
        await session.data.removeNodes(["n0"]);
        const listed = await timed("sources() after an edit", () => session.data.sources());
        const edgeId = session.data.edges()[0].id;
        await timed("sourcesOf one edge", () => session.data.sourcesOf(edgeId, { kind: "edge" }));
        assert.deepStrictEqual(
            listed.map((each) => each.added),
            [
                { nodes: NODES, edges: EDGES },
                { nodes: NODES / 200, edges: EDGES / 100 },
            ],
        );
        session.dispose();
    });
});
