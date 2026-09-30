/**
 * @file Browser timing rows for load completion (design/sets/sets-design.md 6.5, 12.3). Recorded,
 * never asserted: each row prints beside its projection and the `bench-browser` project appends it
 * to `benchmarks/results/browser-<host>.jsonl`.
 *
 * The load is ingested into the `GraphStore` a `DataManager` owns, through the same `ingestNode`
 * and `ingestEdge` it calls, bracketed as one load. `DataManager` itself is not used because it
 * refuses a load above the render ceiling (`DEFAULT_LIMITS.edgesDrawn`, 100,000 edges), far below
 * the sizes these rows measure; the completion pass and the freeze are the store's alone.
 *
 * 100k nodes by default; GRAPHTY_BENCH_SCALE=large adds 1M nodes / 5M edges and 1M / 10M.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";
import { assert, it } from "vitest";

import { createEdgeCounter, identityColumnsOf } from "../../src/data/edgeIdentity";
import { GraphStore } from "../../src/data/GraphStore";
import { ingestEdge, ingestNode } from "../helpers/rawIngest";

const LARGE = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BENCH_SCALE === "large";
const SIZES: readonly { label: string; n: number; m: number; projection: string }[] = [
    { label: "100k / 500k", n: 100_000, m: 5, projection: "none stated" },
    ...(LARGE
        ? [
              { label: "1M / 5M", n: 1_000_000, m: 5, projection: "none stated" },
              { label: "1M / 10M", n: 1_000_000, m: 10, projection: "none stated" },
          ]
        : []),
];

/**
 * Ingest a generated graph into a fresh store as one load, untimed.
 * @param graph - the generated graph
 * @param graph.nodeCount - its node count
 * @param graph.src - edge sources
 * @param graph.dst - edge targets
 * @returns the store, with the load still open: closing it runs the completion pass, which the
 * timed body must include
 */
function loadInto(graph: { nodeCount: number; src: Uint32Array; dst: Uint32Array }): GraphStore {
    const store = new GraphStore({
        directed: "auto",
        positionScale: () => 1,
        onNodeRemap: () => undefined,
        onEdgeRemap: () => undefined,
        onReplaced: () => undefined,
        edgeCounter: createEdgeCounter(),
    });
    store.openLoad();
    for (let i = 0; i < graph.nodeCount; i++) {
        ingestNode(store, i, {});
    }

    for (let e = 0; e < graph.src.length; e++) {
        ingestEdge(store, graph.src[e], graph.dst[e], 1);
    }

    return store;
}

/**
 * Print one row and hand it to the project's appender.
 * @param name - the row
 * @param ms - the median milliseconds
 * @param projection - the design's projection
 */
function record(name: string, ms: number, projection: string): void {
    console.log(`${name}: ${ms.toFixed(1)} ms (projection: ${projection})`);
    console.log(
        `bench-row ${JSON.stringify({ date: new Date().toISOString(), runner: "browser", agent: navigator.userAgent, name, medianMs: ms, projection })}`,
    );
}

/**
 * The median of three timed runs, each on fresh input.
 * @param setup - builds the input, untimed
 * @param run - the timed body
 * @returns the median milliseconds
 */
function median3<T>(setup: () => T, run: (input: T) => unknown): number {
    const times: number[] = [];
    for (let i = 0; i < 3; i++) {
        const input = setup();
        const start = performance.now();
        run(input);
        times.push(performance.now() - start);
    }

    return times.sort((a, b) => a - b)[1];
}

for (const size of SIZES) {
    it(`load completion at ${size.label}`, () => {
        const graph = barabasiAlbertGraph({ n: size.n, m: size.m, seed: 1 });
        record(
            `load completion and first freeze, ${size.label}`,
            median3(
                () => loadInto(graph),
                (store) => {
                    store.closeLoad();
                    return store.getSnapshot();
                },
            ),
            size.projection,
        );

        // The pass's own share: the same computation over a snapshot that carries no columns.
        const bare = (): GraphSnapshot => {
            const builder = new GraphBuilder({ directed: false });
            for (let i = 0; i < graph.nodeCount; i++) {
                builder.addNode(i);
            }

            builder.addEdgesByIds(graph.src, graph.dst);
            return builder.freeze();
        };
        record(
            `completion pass alone (lazy identity), ${size.label}`,
            median3(bare, identityColumnsOf),
            size.projection,
        );
        assert.isAbove(graph.src.length, 0);
    });
}
