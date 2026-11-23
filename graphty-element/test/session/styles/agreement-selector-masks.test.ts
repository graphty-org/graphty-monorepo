/**
 * @file The readings a style panel takes after one filter change share their selector answers:
 * each layer's selector is tested on each element once for the change, not once per reading
 * (issue #7966: at 50,000 nodes every reading retested every layer, about 0.7 s a filter change).
 * Counted work, never timing.
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { pageDefaultFeatures, setDefaultFeatures } from "../../../src/features/resolve";
import { agreementCounters } from "../../../src/session/styles/explain";
import type { AgreementOptions } from "../../../src/session/styles/index";

const NODES = 300;
const EDGES = 600;

/**
 * A session over a seeded graph under the starting rows, with a time window ghosting some nodes.
 * @returns The session.
 */
async function windowed(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.config.set({ startingRows: true, editableBase: true });
    let seed = 7;
    const next = (): number => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const nodes = Array.from({ length: NODES }, (_unused, i) => ({ id: `n${String(i)}`, t: i }));
    const edges = Array.from({ length: EDGES }, () => ({
        source: `n${String(Math.floor(next() * NODES))}`,
        target: `n${String(Math.floor(next() * NODES))}`,
    }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges }) } });
    await session.time.setField({ nodes: { start: "t", unit: "ordinal" } });
    await session.time.setSettings({ outside: "ghost" });
    await session.time.window({ from: 0, to: 200 });
    await session.styles.settled();
    return session;
}

/**
 * The readings a style panel takes for every row, as the graphty app's Style tab does.
 * @param session - The session.
 * @returns One reading's arguments per entry.
 */
function panelReadings(session: GraphSession): readonly AgreementOptions[] {
    const rows = session.styles.tree().filter((row) => row.kind === "layer");
    return [{}, ...rows.flatMap((row) => [{ below: row.id, over: row.id }, { over: row.id }])];
}

describe("styles.agreement after a filter change", () => {
    let before: readonly string[];
    let shared: GraphSession;
    let fresh: GraphSession;

    beforeAll(async () => {
        before = pageDefaultFeatures();
        setDefaultFeatures(["timeline"]);
        shared = await windowed();
        fresh = await windowed();
    });

    afterAll(() => {
        shared.dispose();
        fresh.dispose();
        setDefaultFeatures(before);
    });

    it("tests each selector on each element once for the change, not once per reading", async () => {
        const readings = panelReadings(shared);
        assert.isAtLeast(readings.length, 5, "the starting rows are drawn");

        // What the readings cost before they shared answers: each one taken after its own change.
        let alone = 0;
        for (const options of readings) {
            await fresh.time.window({ from: 0, to: 1 });
            await fresh.time.window({ from: 10, to: 210 });
            const start = agreementCounters.selectorTests;
            fresh.styles.agreement("graph", undefined, options);
            alone += agreementCounters.selectorTests - start;
        }

        await shared.time.window({ from: 10, to: 210 });
        let start = agreementCounters.selectorTests;
        for (const options of readings) {
            shared.styles.agreement("graph", undefined, options);
        }
        const together = agreementCounters.selectorTests - start;

        start = agreementCounters.selectorTests;
        for (const options of readings) {
            shared.styles.agreement("graph", "node.color", options);
        }
        const again = agreementCounters.selectorTests - start;

        console.log(
            `[agreement-selector-masks] ${String(readings.length)} readings: ${String(alone)} selector tests ` +
                `taken alone, ${String(together)} taken together, ${String(again)} for a second round`,
        );
        const layers = shared.styles.list().length;
        assert.isAbove(together, 0, "the readings tested the selectors");
        assert.isAtMost(together, layers * (NODES + EDGES), "once per layer per element");
        assert.isBelow(together, alone, "not once per reading");
        assert.strictEqual(again, 0, "a selector tested once is never tested again for the same change");
    });

    it("answers each reading as a reading taken alone after its own change does", async () => {
        const readings = panelReadings(shared);
        await shared.time.window({ from: 30, to: 230 });
        const together = readings.map((options) => shared.styles.agreement("graph", undefined, options));

        const alone = [];
        for (const options of readings) {
            // Away and back: a change of its own, so nothing is kept from the reading before.
            await fresh.time.window({ from: 0, to: 1 });
            await fresh.time.window({ from: 30, to: 230 });
            alone.push(fresh.styles.agreement("graph", undefined, options));
        }

        assert.deepStrictEqual(
            together.map((each) => JSON.stringify(each)),
            alone.map((each) => JSON.stringify(each)),
        );
    });
});
