/**
 * @file `styles.showBranches`: while a reader picks, every layer is suspended (kept, listed, no
 * undo step), each branch's members are drawn in its color, and ending the view brings the
 * stack's picture back. Read through `styles.explain`, `styles.list` and `history`.
 */

import { assert, describe, it } from "vitest";

import type { UnionLeaf } from "../../../src/catalog/types";
import { createGraphSession, type GraphSession } from "../../../src/session";
import { lesMiserables } from "../../helpers/les-miserables";

const LES_MISERABLES = await lesMiserables();
const IDS = (LES_MISERABLES.ids ?? []).map(String);

/**
 * Les Miserables, every node painted red by one layer.
 * @returns The session and the layer's id.
 */
async function painted(): Promise<{ session: GraphSession; red: string }> {
    const session = createGraphSession();
    await session.data.addNodes(IDS.map((id) => ({ id })));
    await session.data.addEdges(
        [...LES_MISERABLES.src].map((src, e) => ({ source: IDS[src], target: IDS[LES_MISERABLES.dst[e]] })),
    );
    const { id } = await session.styles.add({
        name: "Red",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#FF0000" },
    });
    await session.styles.settled();
    return { session, red: id };
}

const NEAR_VALJEAN: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            start: "none",
            color: "#009E73",
            steps: [{ op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 1 } }],
        },
    ],
};

/**
 * The color a node is drawn with, and the layer that wrote it.
 * @param session - The session.
 * @param node - The node.
 * @returns The color and its layer.
 */
function colorOf(session: GraphSession, node: string): { value: string; layerId: string | undefined } {
    const explained = session.styles.explain({ node });
    const entry = explained.channels.find((each) => each.channel === "node.color");
    const { r, g, b } = (explained.merged as Record<string, { r: number; g: number; b: number }>)["node.color"];
    const hex = `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
    return { value: hex, layerId: entry?.layerId };
}

describe("styles.showBranches", () => {
    it("draws each branch's members in its color over a suspended stack, then restores it", async () => {
        const { session, red } = await painted();
        const layers = session.styles.list();
        const steps = session.history.steps.length;
        const shown: boolean[] = [];
        session.on("style:branches-shown-changed", ({ shown: now }) => shown.push(now));

        const view = session.styles.showBranches({ rule: NEAR_VALJEAN, rest: "faint" });
        await session.styles.settled();
        assert.isTrue(session.styles.showingBranches);
        assert.strictEqual(colorOf(session, "Valjean").value, "#009E73");
        assert.notStrictEqual(colorOf(session, "Napoleon").layerId, red, "a suspended layer paints nothing");
        assert.strictEqual(session.styles.list(), layers, "the layer list is unchanged");
        assert.strictEqual(session.history.steps.length, steps, "no undo step");

        view.end();
        await session.styles.settled();
        assert.isFalse(session.styles.showingBranches);
        assert.deepEqual(colorOf(session, "Valjean"), { value: "#FF0000", layerId: red });
        assert.deepEqual(shown, [true, false]);
    });

    it("one view at a time: a second view replaces the first, whose end does nothing", async () => {
        const { session, red } = await painted();
        const first = session.styles.showBranches({ rule: NEAR_VALJEAN });
        const second = session.styles.showBranches({
            rule: { ...NEAR_VALJEAN, branches: [{ ...NEAR_VALJEAN.branches[0], color: "#D55E00" }] },
        });
        first.end();
        await session.styles.settled();
        assert.isTrue(session.styles.showingBranches);
        assert.strictEqual(colorOf(session, "Valjean").value, "#D55E00");
        second.end();
        await session.styles.settled();
        assert.strictEqual(colorOf(session, "Valjean").layerId, red);
    });
});

describe("a branches view and the key", () => {
    it("the legend and a layer's counts keep describing the stack while a view is drawn", async () => {
        const { session, red } = await painted();
        const before = session.styles.legend();
        const counted = session.styles.counts(red);
        const view = session.styles.showBranches({ rule: NEAR_VALJEAN, rest: "faint" });
        await session.styles.settled();
        const during = session.styles.legend();
        const countedDuring = session.styles.counts(red);
        view.end();
        assert.deepEqual({ ...countedDuring, revision: "" }, { ...counted, revision: "" });
        assert.deepEqual(
            during.map((block) => block.layerId),
            before.map((block) => block.layerId),
        );
        assert.include(
            during.map((block) => block.layerId),
            red,
        );
    });
});

describe("the cost of a branches view", () => {
    it("grows with the graph, not faster", async () => {
        const { assertScalesLinearly, visitsDuring } = await import("../../helpers/cost");
        await assertScalesLinearly(
            async (size) => {
                const session = createGraphSession();
                const ids = Array.from({ length: size }, (_, at) => `n${String(at)}`);
                await session.data.addNodes(ids.map((id) => ({ id })));
                await session.data.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
                const rule: UnionLeaf = {
                    ...NEAR_VALJEAN,
                    branches: [
                        {
                            ...NEAR_VALJEAN.branches[0],
                            steps: [{ op: "add", rule: { kind: "hops", of: { nodes: ["n0"] }, max: 2 } }],
                        },
                    ],
                };
                const visits = await visitsDuring(async () => {
                    const view = session.styles.showBranches({ rule, rest: "faint" });
                    await session.styles.settled();
                    view.end();
                    await session.styles.settled();
                });
                session.dispose();
                return visits;
            },
            { sizes: [200, 800], growth: "linear", counter: "elements visited by StylesApi.showBranches" },
        );
    });
});
