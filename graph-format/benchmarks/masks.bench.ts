/**
 * Mask benchmarks: makeMask, the five word-wise ops (maskAnd, maskOr, maskAndNot, maskXor, maskNot)
 * and maskCount over 100k and 1M indices; the induced edge mask (both endpoints in a node mask) and
 * inducedSubgraph({ mask }) at 50% and 10% of the nodes over the 100k-node / 1M-edge random graph,
 * with the bytes the derived graph retains in the row name. Timings are recorded, never asserted.
 */

import { fromEdgeArrays } from "../src/populate/from-edge-arrays.js";
import { type DerivedGraph, type U32 } from "../src/types/index.js";
import { makeMask, maskAnd, maskAndNot, maskCount, maskNot, maskOr, maskSet, maskTest, maskXor } from "../src/util/mask.js";
import { randomEdges } from "./datasets.js";
import { bench, type BenchResult, makeRandom } from "./harness.js";

const GRAPH_NODES = 100_000;
const GRAPH_EDGES = 1_000_000;

/**
 * A mask over `length` indices with each index set with probability `fraction`.
 * @param length - the number of indices
 * @param fraction - the chance an index is included
 * @param seed - the random seed
 * @returns the mask
 */
function randomMask(length: number, fraction: number, seed: number): U32 {
    const mask = makeMask(length);
    const random = makeRandom(seed);
    for (let i = 0; i < length; i++) {
        if (random() < fraction) {
            maskSet(mask, i, true);
        }
    }
    return mask;
}

/**
 * The bytes a derived graph keeps alive: its snapshot's arrays plus the origin maps.
 * @param derived - the derived graph
 * @returns the byte count
 */
function retainedBytes(derived: DerivedGraph): number {
    return (
        derived.snapshot.byteLength() + (derived.nodeOrigin?.byteLength ?? 0) + (derived.edgeOrigin?.byteLength ?? 0)
    );
}

/**
 * Run the mask benchmarks.
 * @returns the results
 */
export function runMaskBenchmarks(): BenchResult[] {
    const results: BenchResult[] = [];
    for (const n of [100_000, 1_000_000]) {
        const label = n === 100_000 ? "100k" : "1M";
        const a = randomMask(n, 0.5, 11);
        const b = randomMask(n, 0.5, 12);
        const opts = { items: n, unit: "indices" };
        results.push(bench("masks", `makeMask(${label})`, { setup: () => n, run: (len) => makeMask(len) }, opts));
        const ops: [string, () => unknown][] = [
            ["maskAnd", () => maskAnd(a, b, n)],
            ["maskOr", () => maskOr(a, b, n)],
            ["maskAndNot", () => maskAndNot(a, b, n)],
            ["maskXor", () => maskXor(a, b, n)],
            ["maskNot", () => maskNot(a, n)],
            ["maskCount", () => maskCount(a, n)],
        ];
        for (const [name, run] of ops) {
            results.push(bench("masks", `${name}(${label})`, { setup: () => null, run }, opts));
        }
    }

    const edges = randomEdges(GRAPH_NODES, GRAPH_EDGES);
    const snapshot = fromEdgeArrays({
        directed: true,
        nodeCount: edges.nodeCount,
        src: edges.src,
        dst: edges.dst,
        weights: edges.weights,
    });
    const list = snapshot.edgeList();
    for (const fraction of [0.5, 0.1]) {
        const pct = `${Math.round(fraction * 100)}%`;
        const nodes = randomMask(GRAPH_NODES, fraction, 21);
        results.push(
            bench(
                "masks",
                `induced edge mask (${pct} of 100k nodes, 1M edges)`,
                {
                    setup: () => null,
                    run: () => {
                        const edgeMask = makeMask(GRAPH_EDGES);
                        for (let e = 0; e < GRAPH_EDGES; e++) {
                            if (maskTest(nodes, list.src[e]) && maskTest(nodes, list.dst[e])) {
                                maskSet(edgeMask, e, true);
                            }
                        }
                        return edgeMask;
                    },
                },
                { items: GRAPH_EDGES, unit: "edges" },
            ),
        );
        const retained = retainedBytes(snapshot.inducedSubgraph({ mask: nodes }));
        results.push(
            bench(
                "masks",
                `inducedSubgraph({ mask }) ${pct} (retains ${(retained / (1024 * 1024)).toFixed(1)} MB)`,
                { setup: () => snapshot, run: (s) => s.inducedSubgraph({ mask: nodes }) },
                { items: GRAPH_EDGES, unit: "edges" },
            ),
        );
    }
    return results;
}
