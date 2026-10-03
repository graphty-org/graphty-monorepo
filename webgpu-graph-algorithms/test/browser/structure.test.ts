/**
 * The browser leg of triangle counting and label propagation (the P11 plan's P11-T14 Step 5): on karate in Chromium --
 * SwiftShader on the default lane, the NVIDIA card on the GPU lane -- the per-node triangle counts identical to the
 * reference's with the published total of 45 and the coefficient bitwise the reference's, and label propagation's
 * labels identical to the reference's (the result is bitwise reproducible, so the runtime must not change it), and
 * Boruvka's minimum spanning forest the edge set of `kruskalMST` on weighted graphs with ties, negative weights and
 * more rounds than one submit holds.
 */

import { labelPropagation } from "../../src/algorithms/label-propagation.js";
import { minimumSpanningTree } from "../../src/algorithms/mst.js";
import { triangleCount } from "../../src/algorithms/triangles.js";
import { KARATE_EDGES, snapshotOf } from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { deepPathEdges, distinctWeightEdges, drawnWeightEdges, mstAgreement } from "../helpers/mst.js";
import { labelPropagationOracle } from "../oracle/community.js";
import { simpleSymmetricOracle } from "../oracle/coo.js";
import { triangleOracle } from "../oracle/structure.js";
import { acquireBrowser, requireBrowserGpu } from "../setup/browser.js";

describe("triangle counting and label propagation in the browser (P11)", () => {
    it("triangleCount on karate: 45 triangles, per-node counts and coefficients identical to the reference's", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser({ label: "browser-structure/triangles" });
        const karate = snapshotOf(KARATE_EDGES, { label: "browser-structure/karate-triangles" });
        const result = await triangleCount(ctx, karate);
        const expected = triangleOracle(simpleSymmetricOracle(karate));
        expect(result.total).toBe(45);
        expectBitwiseEqual(result.perNode, expected.perNode, "karate perNode");
        expectBitwiseEqual(result.coefficient, Float32Array.from(expected.coefficient), "karate coefficient");
        expect(result.transitivity).toBe(expected.transitivity);
        ctx.release(karate);
    });

    it("labelPropagation on karate: labels identical to the reference's", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser({ label: "browser-structure/lpa" });
        const karate = snapshotOf(KARATE_EDGES, { label: "browser-structure/karate-lpa" });
        const result = await labelPropagation(ctx, karate);
        const expected = labelPropagationOracle(simpleSymmetricOracle(karate), { maxIterations: 100, weighted: true });
        expectBitwiseEqual(result.labels, expected.labels, "karate labels");
        expect(result.count).toBe(expected.count);
        ctx.release(karate);
    });

    it("minimumSpanningTree: the edge set of kruskalMST on ties, negative weights and a deep path", async (t) => {
        await requireBrowserGpu(t);
        const ctx = await acquireBrowser({ label: "browser-structure/mst" });
        for (const [label, edges] of [
            ["ties", drawnWeightEdges(300, 1500, 31, [-1, 0, 2])],
            ["distinct", distinctWeightEdges(300, 1500, 32)],
            ["deep", deepPathEdges(10)],
        ] as const) {
            const s = snapshotOf(edges, { label: `browser-structure/mst-${label}` });
            const result = await minimumSpanningTree(ctx, s);
            const report = mstAgreement(label, s, result);
            expect(report.worst, report.worstLabel).toBeLessThanOrEqual(1);
            ctx.release(s);
        }
    });
});
