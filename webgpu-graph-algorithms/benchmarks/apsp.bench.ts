/**
 * All-pairs shortest-path benchmarks (design 8.7): `allPairsShortestPath`, the weighted blocked Floyd-Warshall sweep,
 * on a seeded weighted G(n, 4n) at the rungs of APSP_RUNGS, wall end to end INCLUDING the upload and the `4 n^2`-byte
 * readback of the matrix (the snapshot is built once per rung outside the case; `teardown` releases it after every
 * run, as `wcc.bench.ts` does). Beside every rung a second row times the readback ALONE -- `ctx.readback.read` of a
 * resident `4 n^2`-byte buffer -- because at the default ceiling the matrix is 134 MB, and the pair of rows shows how
 * much of the call its transfer takes instead of hiding it in a total. Rows:
 *
 *   apsp at n=<n>            the whole call
 *   apsp readback n=<n>      the matrix readback alone
 *
 * The top rung, 5,760, is one 32-node tile under the 5,792-node ceiling of a 128 MiB binding (lavapipe's, and the
 * spec default), so every adapter runs the whole ladder; a rung
 * above the device's ceiling is skipped with a printed reason. No profiler row: the sweep is recorded as ONE compute
 * pass per submit and the driver never resolves the profiler's query set, so there is no per-kernel GPU time to
 * report. The design sets no T-target for all-pairs: the rows arm the regression check.
 */

import { allPairsCeiling, allPairsShortestPath } from "../src/algorithms/all-pairs.js";
import { type GpuContext } from "../src/context.js";
import { randomEdges, snapshotOf } from "./datasets.js";
import { bench, type BenchResult } from "./harness.js";

/** The group name. */
export const APSP_GROUP = "apsp";

/** The node counts of the ladder (edges = 4 n). */
export const APSP_RUNGS: readonly number[] = [512, 1024, 2048, 4096, 5760];

/** The generator seed of every rung. */
const SEED = 12345;

/**
 * The name of a rung's whole-call row.
 * @param n - the node count
 * @returns the row name
 */
export function apspRowName(n: number): string {
    return `apsp at n=${n}`;
}

/**
 * The name of a rung's readback row.
 * @param n - the node count
 * @returns the row name
 */
export function apspReadbackRowName(n: number): string {
    return `apsp readback n=${n}`;
}

/**
 * Run the all-pairs benchmarks.
 * @param ctx - the context (a hardware adapter; run.ts refuses software ones)
 * @returns the results
 */
export async function runApspBenchmarks(ctx: GpuContext): Promise<BenchResult[]> {
    const results: BenchResult[] = [];
    const { maxNodes, limitName, limit } = allPairsCeiling(ctx.caps.limits);
    for (const n of APSP_RUNGS) {
        if (n > maxNodes) {
            console.warn(`[apsp] n=${n} skipped: this device's ${limitName} of ${limit} bytes holds ${maxNodes} nodes`);
            continue;
        }
        const s = snapshotOf(randomEdges(n, 4 * n, SEED), { label: `apsp/${n}` });
        results.push(
            await bench(
                APSP_GROUP,
                apspRowName(n),
                {
                    setup: () => s,
                    run: (input) => allPairsShortestPath(ctx, input),
                    teardown: (input) => {
                        ctx.release(input);
                    },
                },
                { device: ctx.device, items: n * n, unit: "pairs" },
            ),
        );
        const bytes = 4 * n * n;
        const lease = ctx.pool.lease();
        try {
            const buffer = lease.storage(bytes, `apsp/readback/${n}`);
            const dest = new Float32Array(n * n);
            results.push(
                await bench(
                    APSP_GROUP,
                    apspReadbackRowName(n),
                    { setup: () => buffer, run: (input) => ctx.readback.read(input, bytes, dest) },
                    { device: ctx.device, items: bytes, unit: "bytes" },
                ),
            );
        } finally {
            lease.release();
        }
    }
    return results;
}
