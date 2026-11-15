/**
 * @file `styles.counts()` walks the stack once per distinct set of layers that apply when no binding
 * reads data (issue #7966), and answers exactly what a walk of every element answers.
 *
 * The oracle is the same session with one more layer, over every node, that encodes a channel from
 * a field no node carries: it paints nothing, so no count moves, but a binding that reads data
 * makes `counts` walk every element again.
 */

import { assert, beforeAll, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { setDefaultFeatures } from "../../../src/features/resolve";
import type { StyleCounts } from "../../../src/session/styles";
import { countCounters } from "../../../src/session/styles/explain";

beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

const NODES = 60;

/**
 * A session with the starting rows, a time window ghosting part of the graph, a selection, two
 * category layers and a shader-free edge layer: several looks among the nodes and the edges.
 * @returns The session.
 */
async function looks(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.config.set({ startingRows: true, editableBase: true });
    const nodes = Array.from({ length: NODES }, (_unused, i) => ({
        id: `n${String(i)}`,
        kind: `k${String(i % 4)}`,
        t: i,
        w: i % 7,
    }));
    const edges = Array.from({ length: NODES * 2 }, (_unused, i) => ({
        source: `n${String(i % NODES)}`,
        target: `n${String((i * 7 + 3) % NODES)}`,
        arrowHeadText: i % 3 === 0 ? "x" : undefined,
    }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ directed: true, nodes, edges }) } });
    await session.time.setField({ nodes: { start: "t", unit: "ordinal" } });
    await session.time.setSettings({ outside: "ghost" });
    await session.time.window({ from: 10, to: 40 });
    await session.styles.add({
        name: "Kind one",
        target: "node",
        selector: { match: "rule", where: { kind: "categories", attribute: "data.kind", values: ["k1"] } },
        set: { "node.color": "#d55e00", "node.size": 2 },
    });
    await session.styles.add({
        name: "Kind one and two",
        target: "node",
        selector: { match: "rule", where: { kind: "categories", attribute: "data.kind", values: ["k1", "k2"] } },
        set: { "node.color": "#0072b2" },
    });
    await session.styles.add({
        name: "Edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#009e73", "edge.arrowHeadText": "x" },
    });
    await session.selection.apply({ ids: ["n12", "n13", "n20"] });
    await session.styles.settled();
    return session;
}

/**
 * Every layer's counts, without the revision a new layer moves.
 * @param session - The session.
 * @param ids - The layers.
 * @returns The counts by layer.
 */
function countsOf(session: GraphSession, ids: readonly string[]): Record<string, Omit<StyleCounts, "revision">> {
    return Object.fromEntries(
        ids.map((id) => {
            const { revision: _revision, ...rest } = session.styles.counts(id);
            return [id, rest];
        }),
    );
}

describe("styles.counts grouped by look", () => {
    it("answers what a walk of every element answers, in fewer walks", async () => {
        const session = await looks();
        const ids = session.styles.list().map((layer) => layer.id);

        const before = countCounters.walks;
        const grouped = countsOf(session, ids);
        const groupedWalks = countCounters.walks - before;

        // A layer that reads a field no node carries: it paints nothing, and makes every element walk again.
        await session.styles.add({
            name: "Reads data",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.absent", scale: "linear", range: [1, 3] } },
        });
        await session.styles.settled();
        const start = countCounters.walks;
        const walked = countsOf(session, ids);
        const everyWalk = countCounters.walks - start;

        assert.deepEqual(grouped, walked);
        assert.isAbove(
            Object.values(grouped).reduce((sum, each) => sum + each.matched, 0),
            0,
            "something matched",
        );
        assert.isBelow(groupedWalks, everyWalk / 4, "grouped elements walk once per look");
        session.dispose();
    });
});

describe("styles.counts kept between reads", () => {
    it("follows a filter, a window slide and a selection, and is read once while nothing moves", async () => {
        const session = await looks();
        const everything = session.styles
            .list()
            .find((layer) => layer.name === "Everything" && layer.target === "node");
        assert.isDefined(everything);
        const id = everything?.id ?? "";
        const drawn = (): number => session.visibility.summary.visibleNodes;

        const first = session.styles.counts(id);
        const { walks } = countCounters;
        assert.strictEqual(session.styles.counts(id), first, "a second read while nothing moved is the kept answer");
        assert.strictEqual(countCounters.walks, walks, "and walks nothing");

        await session.time.window({ from: 11, to: 50 });
        assert.notStrictEqual(drawn(), first.visible?.matched, "the slide changed what is visible");
        assert.strictEqual(session.styles.counts(id).visible?.matched, drawn(), "a slide moves it");

        await session.visibility.set({ kind: "member", of: { nodes: ["n12", "n13", "n14"] } });
        assert.strictEqual(session.styles.counts(id).visible?.matched, drawn(), "a filter moves it");

        const selected = session.styles.list().find((layer) => layer.name === "Selected" && layer.target === "node");
        const before = session.styles.counts(selected?.id ?? "").matched;
        await session.selection.apply({ ids: ["n12"] });
        assert.notStrictEqual(session.styles.counts(selected?.id ?? "").matched, before, "a selection moves it");

        // With nothing ghosted, a dragged window hides and shows: that moves it too.
        await session.visibility.set(null);
        await session.time.setSettings({ outside: "hide" });
        const hidden = session.styles.counts(id).visible?.matched;
        await session.time.seek(45, { commit: false });
        assert.notStrictEqual(drawn(), hidden, "the step changed what is visible");
        assert.strictEqual(session.styles.counts(id).visible?.matched, drawn(), "a step moves it");

        // With nothing ghosted, a filter changes no ghost: it moves it all the same.
        await session.visibility.set({ kind: "member", of: { nodes: ["n40", "n41"] } });
        assert.strictEqual(session.styles.counts(id).visible?.matched, drawn(), "a filter alone moves it");
        session.dispose();
    });
});
