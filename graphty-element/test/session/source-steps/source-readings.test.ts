/**
 * @file Histograms, value counts and statistics of one source or one type under the source-steps
 * experiment (design 3.8, 8.1 and section 9): a source's section reads that source's own values and
 * counts only its elements.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";
import { clashing, full, refused } from "./scenario";

describe("source-steps: readings of one source or one type", () => {
    it("bank B's amount counts only its two edges", async () => {
        const { session, b } = await full();
        const counts = session.data.valueCounts("data.amount", { kind: "edge", source: b });
        assert.strictEqual(counts.total, 2);
        assert.deepStrictEqual(counts.values.map((v) => v.value).sort(), [4, 6]);
        const histogram = session.data.histogram({ kind: "edge", name: "amount" }, { source: b });
        assert.strictEqual(histogram.kind, "numeric");
        if (histogram.kind === "numeric") {
            assert.strictEqual(histogram.min, 4);
            assert.strictEqual(histogram.max, 6);
        }
        const stats = session.data.statistics({ source: b });
        assert.strictEqual(stats.edgeCount, 2);
        assert.strictEqual(stats.nodeCount, 4);
        const devices = session.data.valueCounts("graphty.type", { kind: "node", type: "device" });
        assert.deepStrictEqual(
            devices.values.map((v) => [v.value, v.count]),
            [["device", 2]],
        );
        session.dispose();
    });

    it("a source's histogram reads that source's own value, its clash column included", async () => {
        const { session, b } = await clashing();
        const own = session.data.histogram({ kind: "node", name: "amt (erp.csv)" }, { source: b });
        assert.strictEqual(own.kind, "numeric");
        if (own.kind === "numeric") {
            assert.deepStrictEqual([own.min, own.max], [30, 40]);
        }
        const kept = session.data.valueCounts("data.amt", { kind: "node", source: b });
        assert.deepStrictEqual(kept.values.map((v) => v.value).sort(), [30, 40], "B's own amt, not the kept 10 and 20");
        session.dispose();
    });

    it("naming a source with the experiment off throws E_FEATURE_OFF", async () => {
        const session = createGraphSession({ features: [] });
        await session.data.addNodes([{ id: "a", n: 1 }]);
        await refused(
            () => Promise.resolve().then(() => session.data.valueCounts("data.n", { source: "x" })),
            "E_FEATURE_OFF",
        );
        await refused(
            () => Promise.resolve().then(() => session.data.histogram({ kind: "node", name: "n" }, { source: "x" })),
            "E_FEATURE_OFF",
        );
        await refused(() => Promise.resolve().then(() => session.data.statistics({ type: "x" })), "E_FEATURE_OFF");
        session.dispose();
    });
});
