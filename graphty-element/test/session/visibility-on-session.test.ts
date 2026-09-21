import { assert, describe, it } from "vitest";

import type { Filter, TimeWindow, VisibilityChange } from "../../src/session/visibility";
import { type Harness, makeSession } from "./helpers";

/** Three hosts and two services, on a timeline, joined in a line. */
function harnessOf(): Harness {
    const harness = makeSession();
    harness.add(
        [
            { id: "a", type: "host", seen: 1 },
            { id: "b", type: "host", seen: 2 },
            { id: "c", type: "host", seen: 3 },
            { id: "d", type: "service", seen: 4 },
            { id: "e", type: "service", seen: 5 },
        ],
        [
            { src: "a", dst: "b", seen: 2 },
            { src: "b", dst: "c", seen: 3 },
            { src: "c", dst: "d", seen: 4 },
            { src: "d", dst: "e", seen: 5 },
        ],
    );

    return harness;
}

/** Only the hosts. */
const HOSTS: Filter = { kind: "categories", attribute: "data.type", values: ["host"] };

/** The first three moments of the timeline. A window is half-open, so `to` is one past. */
const EARLY: TimeWindow = { attribute: "data.seen", from: 1, to: 4 };

/** Every visibility change the session published, in order. */
function watchVisibility(harness: Harness): VisibilityChange[] {
    const seen: VisibilityChange[] = [];
    harness.session.on("visibility:changed", (change) => {
        seen.push(change);
    });

    return seen;
}

describe("session.visibility", () => {
    it("shows everything until something hides it", () => {
        const harness = harnessOf();

        assert.deepStrictEqual(harness.session.visibility.summary, {
            visibleNodes: 5,
            totalNodes: 5,
            visibleEdges: 4,
            totalEdges: 4,
        });
        assert.isNull(harness.session.visibility.filter);
        assert.isNull(harness.session.visibility.window);
        assert.isTrue(harness.session.visibility.isVisible("a"));
        harness.session.dispose();
    });

    it("publishes the four counts a status bar reads, beside the totals", async () => {
        // A status bar writing "showing 3 of 5" needs all four numbers together. Reading two
        // objects to write one sentence is how they end up a frame apart.
        const harness = harnessOf();

        assert.deepStrictEqual(harness.session.status.counts, {
            nodes: 5,
            edges: 4,
            visibleNodes: 5,
            visibleEdges: 4,
        });

        await harness.session.visibility.set(HOSTS);

        assert.deepStrictEqual(harness.session.status.counts, {
            nodes: 5,
            edges: 4,
            visibleNodes: 3,
            visibleEdges: 2,
        });
        harness.session.dispose();
    });

    it("hides through a mask, so the data is still there and nothing was re-laid-out", async () => {
        const harness = harnessOf();

        const result = await harness.session.visibility.set(HOSTS);

        assert.deepStrictEqual(result.visible, { nodes: 3, edges: 2 });
        assert.deepStrictEqual(result.total, { nodes: 5, edges: 4 });
        assert.deepStrictEqual([...harness.session.visibility.nodes].sort(), ["a", "b", "c"]);
        assert.isFalse(harness.session.visibility.isVisible("d"));
        assert.strictEqual(harness.session.data.node("d")?.id, "d", "hidden is not deleted");
        assert.strictEqual(harness.session.snapshot().nodeCount, 5);
        harness.session.dispose();
    });

    it("carries a change a listener can serialise, naming what produced it", async () => {
        const harness = harnessOf();
        const seen = watchVisibility(harness);

        await harness.session.visibility.set(HOSTS);

        assert.lengthOf(seen, 1);
        const [change] = seen;
        assert.strictEqual(change?.filterKind, "categories");
        assert.deepStrictEqual(change?.visible, { nodes: 3, edges: 2 });
        assert.deepStrictEqual(change?.unresolvedPaths, []);
        assert.deepStrictEqual(structuredClone(change), change, "the detail has to survive a structured clone");
        harness.session.dispose();
    });

    it("composes a time window with the filter in force", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set(HOSTS);

        await harness.session.visibility.setWindow(EARLY);

        assert.deepStrictEqual([...harness.session.visibility.nodes].sort(), ["a", "b", "c"]);
        assert.strictEqual(harness.session.visibility.filter, HOSTS, "the window did not take the filter away");

        await harness.session.visibility.set(null);

        assert.deepStrictEqual([...harness.session.visibility.nodes].sort(), ["a", "b", "c"], "the window still holds");
        assert.strictEqual(harness.session.status.counts.visibleNodes, 3);
        harness.session.dispose();
    });

    it("announces the context flag through the same door as a filter", () => {
        const harness = harnessOf();
        const seen = watchVisibility(harness);

        harness.session.visibility.showContext = true;

        assert.lengthOf(seen, 1);
        assert.strictEqual(seen[0]?.filterKind, "context");
        assert.strictEqual(harness.session.visibility.summary.visibleNodes, 5, "drawing a hidden node is not showing it");

        harness.session.visibility.showContext = true;

        assert.lengthOf(seen, 1, "setting it to what it already is is not a change");
        harness.session.dispose();
    });

    it("stops hiding when the filter is cleared", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set(HOSTS);

        await harness.session.visibility.set(null);

        assert.strictEqual(harness.session.status.counts.visibleNodes, 5);
        assert.isNull(harness.session.visibility.filter);
        harness.session.dispose();
    });

    it("answers zero for every count once the session is disposed", async () => {
        const harness = harnessOf();
        await harness.session.visibility.set(HOSTS);

        harness.session.dispose();

        assert.deepStrictEqual(harness.session.status.counts, {
            nodes: 0,
            edges: 0,
            visibleNodes: 0,
            visibleEdges: 0,
        });
        assert.isFalse(harness.session.status.ready);
    });
});
