/**
 * The browser leg of the P7 and P8 algorithms (spec 11.6 item 4, M8b-T10, P8-T15): on karate in Chromium --
 * SwiftShader on the default lane, the NVIDIA card on the GPU lane -- PageRank after exactly 8 iterations within
 * 1e-5 relative of the f64 oracle, the Afforest labels identical to the union-find oracle's, item 4's third case
 * `breadthFirstSearch` from vertex 0 with `depth` (the depth buffer) identical to the FIFO oracle's, `order` grouped
 * by level and no direction switch, and one `sssp` on the weighted karate with `dist` (the dist buffer) bitwise the
 * f32 oracle's.
 */

import { breadthFirstSearch } from "../../src/algorithms/bfs.js";
import { connectedComponents } from "../../src/algorithms/components.js";
import { pageRank } from "../../src/algorithms/pagerank.js";
import { sssp } from "../../src/algorithms/sssp.js";
import { type EdgeSpec, KARATE_EDGES, snapshotOf, xorshift } from "../helpers/graphs.js";
import { expectAllClose, expectBitwiseEqual } from "../helpers/matchers.js";
import { expectOrderGroupedByLevel } from "../helpers/traversal-check.js";
import { componentsOracle } from "../oracle/components.js";
import { pageRankOracleTo } from "../oracle/pagerank.js";
import { bfsOracle, dijkstraOracle } from "../oracle/traversal.js";
import { acquireBrowser, requireBrowserGpu } from "../setup/browser.js";

/** Karate with one weight per edge drawn uniformly from [0.1, 10) (test/helpers/sssp.ts's "uniform" kind, spelled here because that helper reads the noise-floor file through node:fs). */
function weightedKarate(): EdgeSpec[] {
    const random = xorshift(1);
    return KARATE_EDGES.map(([u, v]) => [u, v, 0.1 + 9.9 * random()]);
}

describe("PageRank, connected components, BFS and sssp in the browser (spec 11.6 item 4)", () => {
    it("pageRank on karate matches the oracle after 8 iterations within 1e-5 relative", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser({ label: "browser-algorithms/pagerank" });
        const karate = snapshotOf(KARATE_EDGES, { label: "browser-algorithms/karate" });
        const result = await pageRank(ctx, karate, { maxIterations: 8 });
        expect(result.precision).toBe("f32");
        expect(result.scores.length).toBe(karate.nodeCount);
        const expected = pageRankOracleTo(
            karate,
            { alpha: 0.85, tolerance: 1e-6, maxIterations: 100, weighted: true },
            8,
        );
        expectAllClose(result.scores, expected, { rel: 1e-5, abs: 0 }, "karate pageRank");
        ctx.release(karate);
    });

    it("connectedComponents on karate is identical to the union-find oracle", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser({ label: "browser-algorithms/wcc" });
        const karate = snapshotOf(KARATE_EDGES, { label: "browser-algorithms/karate-wcc" });
        const result = await connectedComponents(ctx, karate);
        const expected = componentsOracle(karate);
        expect(result.count).toBe(expected.count);
        expect(Array.from(result.labels)).toEqual(Array.from(expected.labels));
        ctx.release(karate);
    });

    it("breadthFirstSearch on karate from vertex 0: depth identical to the FIFO oracle's, order grouped by level, no switch", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser({ label: "browser-algorithms/bfs" });
        const karate = snapshotOf(KARATE_EDGES, { label: "browser-algorithms/karate-bfs" });
        const result = await breadthFirstSearch(ctx, karate, 0);
        const expected = bfsOracle(karate, 0);
        expectBitwiseEqual(result.depth, expected.depth, "karate depth (the depth buffer) vs the oracle");
        expect(result.visitedCount).toBe(expected.visitedCount);
        expectOrderGroupedByLevel(result);
        expect(result.switches).toBe(0);
        ctx.release(karate);
    });

    it("sssp on the weighted karate from vertex 0: dist bitwise equal to the f32 oracle's", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser({ label: "browser-algorithms/sssp" });
        const karate = snapshotOf(weightedKarate(), { label: "browser-algorithms/karate-sssp" });
        expect(karate.flags.allWeightsOne).toBe(false);
        const result = await sssp(ctx, karate, 0);
        const expected = dijkstraOracle(karate, 0, "f32");
        expectBitwiseEqual(
            new Uint32Array(result.dist.buffer, result.dist.byteOffset, result.dist.length),
            new Uint32Array(Float32Array.from(expected.dist).buffer),
            "karate dist (the dist buffer) vs the f32 oracle, as bit patterns",
        );
        expect(result.reachedCount).toBe(expected.reachedCount);
        ctx.release(karate);
    });
});
