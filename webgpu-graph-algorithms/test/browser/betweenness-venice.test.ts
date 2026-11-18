/**
 * Exact betweenness on the Venice public transport graph (graph-samples' venice-transit data: 1,874 nodes, 2,702
 * edges) in the browser, judged against the Brandes reference. Karate (the other browser betweenness case) runs one
 * source batch in one forward and one backward submit; Venice's deep breadth-first searches take the path a real
 * sample takes -- several source batches, and more levels than one submit holds, so the forward and the backward
 * passes each run several submits (issue #8215: this graph never produced a result in Safari).
 */

import { fromEdgeArrays } from "@graphty/graph-format";

import { DATA as VENICE } from "../../../graph-samples/data/venice-transit.js";
import { betweennessCentrality } from "../../src/algorithms/betweenness.js";
import { MAX_LEVELS_PER_SUBMIT } from "../../src/constants.js";
import { scoreError, vertexConvention } from "../helpers/centrality-check.js";
import { brandesOracle } from "../oracle/betweenness.js";
import { acquireBrowser, requireBrowserGpu } from "../setup/browser.js";

describe("betweenness on the Venice public transport graph in the browser", () => {
    it("runs several batches and several submits per pass, within 1e-4 of the Brandes reference", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser({ label: "browser-betweenness-venice" });
        const venice = fromEdgeArrays(
            {
                directed: VENICE.directed,
                nodeCount: VENICE.nodeCount,
                src: Uint32Array.from(VENICE.edges.filter((_, i) => i % 2 === 0)),
                dst: Uint32Array.from(VENICE.edges.filter((_, i) => i % 2 === 1)),
            },
            { label: "browser-betweenness-venice/graph" },
        );
        const raw = brandesOracle(venice);
        // The graph must reach the multi-submit path, or this case tests nothing karate does not: the forward pass
        // splits past MAX_LEVELS_PER_SUBMIT levels and the backward pass past twice that.
        const levels = Math.max(...raw.perSource.map((source) => Math.max(...source.depth)));
        expect(levels).toBeGreaterThan(2 * MAX_LEVELS_PER_SUBMIT);
        const result = await betweennessCentrality(ctx, venice);
        // `iterations` is the number of source batches run.
        expect(result.iterations).toBeGreaterThan(1);
        expect(result.sigmaOverflow).toBe(false);
        expect(scoreError(result.scores, vertexConvention(venice, raw.vertex))).toBeLessThanOrEqual(1e-4);
        ctx.release(venice);
    });
});
