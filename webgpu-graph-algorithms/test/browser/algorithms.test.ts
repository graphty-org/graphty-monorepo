/**
 * The browser leg of the P7 algorithms (spec 11.6 item 4, M8b-T10): on karate in Chromium -- SwiftShader on the
 * default lane, the NVIDIA card on the GPU lane -- PageRank after exactly 8 iterations within 1e-5 relative of the
 * f64 oracle, and the Afforest labels identical to the union-find oracle's. Item 4's third case (BFS) is P8's and is
 * deliberately absent.
 */

import { connectedComponents } from "../../src/algorithms/components.js";
import { pageRank } from "../../src/algorithms/pagerank.js";
import { KARATE_EDGES, snapshotOf } from "../helpers/graphs.js";
import { expectAllClose } from "../helpers/matchers.js";
import { componentsOracle } from "../oracle/components.js";
import { pageRankOracleTo } from "../oracle/pagerank.js";
import { acquireBrowser, requireBrowserGpu } from "../setup/browser.js";

describe("PageRank and connected components in the browser (spec 11.6 item 4)", () => {
    it("pageRank on karate matches the oracle after 8 iterations within 1e-5 relative", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser({ label: "browser-algorithms/pagerank" });
        const karate = snapshotOf(KARATE_EDGES, { label: "browser-algorithms/karate" });
        const result = await pageRank(ctx, karate, { maxIterations: 8 });
        expect(result.precision).toBe("f32");
        expect(result.scores.length).toBe(karate.nodeCount);
        const expected = pageRankOracleTo(karate, { alpha: 0.85, tolerance: 1e-6, maxIterations: 100, weighted: true }, 8);
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
});
