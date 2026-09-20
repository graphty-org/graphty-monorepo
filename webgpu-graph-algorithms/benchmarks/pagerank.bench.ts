/**
 * PageRank benchmarks (spec 10.4 T-8; contract 6.3): 100 iterations of `pageRank` at 10k / 100k, 100k / 1M and
 * 1M / 10M, wall end to end INCLUDING the upload. The snapshot is built once per tier outside the case; `teardown`
 * releases it after every run, so the next run re-uploads the core and the median is what T-8 defines (a resident core
 * would time only the dispatches). `tolerance: 0` because the row measures 100 ITERATIONS: on the seeded G(n, m)
 * input the uniform start is within NetworkX's `n * tolerance` of the fixed point after one to four iterations at
 * 1e-6 (tmp/m8b/pr-iterations.ts: 1 iteration at 1M / 10M), which would time the upload plus one pull and call it
 * a hundred. Targets: <= 150 ms at 100k / 1M, <= 1.5 s at 1M / 10M.
 */

import { pageRank } from "../src/algorithms/pagerank.js";
import { type GpuContext } from "../src/context.js";
import { randomEdges, snapshotOf, TIERS } from "./datasets.js";
import { bench, type BenchResult } from "./harness.js";

/**
 * Run the PageRank benchmarks.
 * @param ctx - the context (a hardware adapter; run.ts refuses software ones)
 * @returns the results
 */
export async function runPagerankBenchmarks(ctx: GpuContext): Promise<BenchResult[]> {
    const results: BenchResult[] = [];
    for (const tier of TIERS) {
        const s = snapshotOf(randomEdges(tier.nodes, tier.edges, 12345), { label: `pagerank/${tier.name}` });
        results.push(
            await bench(
                "pagerank",
                `pagerank 100 iterations at ${tier.name}`,
                {
                    setup: () => s,
                    run: (input) => pageRank(ctx, input, { maxIterations: 100, tolerance: 0 }),
                    teardown: (input) => {
                        ctx.release(input);
                    },
                },
                { device: ctx.device, items: tier.nodes, unit: "nodes" },
            ),
        );
    }
    return results;
}
